// Boss lab: plays the boss fights in the real game, in a hidden Chrome, to see what they take.
//
//   npm run boss-lab                              every boss of both sides
//   npm run boss-lab -- --boss alliance-1,horde-3 just these (side-zone)
//   npm run boss-lab -- --parallel 2 --limit 120 --out results.json --autoshot
//   npm run boss-lab -- --boss horde-3 --shots shots/   a picture of the fight every half second
//   npm run boss-lab -- --casual   no Dragon Cry, and he keeps to the bottom of his band, out
//                                  of the boss's reach: more like most players, and a longer
//                                  fight in which the boss gets through its whole round. In an
//                                  Upheaval he stands in each wave's clear column; "upheaval
//                                  hits" counts what reached him then (it should be none)
//
// The hunter is a fresh one, with nothing on: the game is served without the site, which is
// what hands over the gear catalog, so not even the clothes he starts in (+1 attack power, a
// few points of armor: next to nothing). He is played the way a
// player out for the most damage plays him: Dragon Cry whenever it is ready, right up under the
// boss while it lasts and at the top of the area he may move in otherwise, Multishot on
// cooldown (and Autoshot with --autoshot), Arcane Shot to break a shield, and a detour for an
// arrow bundle when the quiver runs low, or for a mana potion (endless arrows). Spells are cast as a key press casts them, so the
// cooldowns and arrow costs are the game's own; everything the boss does is the game's own.
//
// What it is not: it follows the boss perfectly and fires the moment a spell is ready, so its
// times are the best a player could do; it never sidesteps anything and is kept alive, so the
// damage it takes is the worst a player could take (passive dodge still applies).
//
// The game is served from this folder (the source, not the build), and a few lines are added
// to two of its files in the lab's browser only, to reach what the game keeps to itself. Needs
// Chrome: /usr/bin/google-chrome, or CHROME_PATH.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const GAME_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function option(name, fallback) {
    const at = process.argv.indexOf(`--${name}`);
    if (at === -1) return fallback;
    const value = process.argv[at + 1];
    return value === undefined || value.startsWith('--') ? true : value;
}

const only = option('boss', '') ? String(option('boss')).split(',') : null;
const parallel = Number(option('parallel', 4));
const limitSeconds = Number(option('limit', 200));
const autoshot = Boolean(option('autoshot', false));
const outFile = option('out', null);
const shotsDir = option('shots', null);
const casual = Boolean(option('casual', false));

// ----- The game, served from this folder -----

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
    '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

function serve() {
    const server = http.createServer((request, response) => {
        const wanted = decodeURIComponent(new URL(request.url, 'http://lab').pathname);
        const file = path.join(GAME_DIR, wanted.endsWith('/') ? `${wanted}index.html` : wanted);
        if (!file.startsWith(GAME_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
            response.writeHead(404).end();
            return;
        }
        response.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(response);
    });
    return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ----- What is added to the game in the lab's browser -----

const MODULAR_HOOK = `
;window.__lab = {
    gameState, canvas,
    get player() { return player; },
    get powerUps() { return powerUps; },
    get fireballs() { return fireballs; },
    start(faction, zone) {
        gameState.faction = faction; gameState.mode = 'boss_fight'; gameState.startZone = zone;
        gameState.playerName = 'Lab';
        try { menuScreenManager.hideShell(); } catch (e) {}
        startGame();
    },
};`;
const BOSS_HOOK = `
;window.__boss = { get fight() { return fight; }, hitBox(c) { return fight ? hitBox(c) : null; } };`;

// ----- One fight, played in the page -----

async function playFight({ faction, zone, limitSeconds, autoshot, casual }) {
    const lab = window.__lab;
    const { spellSystem } = await import('./systems/spellSystem.js');
    const { gameClock } = await import('./utils/gameClock.js');
    const { movementBounds } = await import('./utils/movement.js');
    lab.start(faction, zone);

    const gs = lab.gameState;
    const H = lab.canvas.logicalHeight;
    const cast = id => spellSystem.castSpell(id, gameClock.now());
    let taken = 0, hits = 0, lastHealth = null, start = null, end = null, upheavalHits = 0, upheavals = 0, inUpheaval = false;
    let arrowsSpent = 0, caught = 0, lastArrows = null, dcFrames = 0, frames = 0, shieldFrames = 0;
    // Mana potions dropped in the fight, and the seconds of endless arrows they gave
    const manaSeen = new Set();
    let endlessFrames = 0;
    let name = '', maxHealth = 0;
    // The hits each kind of attack landed (casual: the ambush and side charge should land none)
    const hitsBy = {};

    return await new Promise(resolve => {
        const t0 = performance.now();
        let lastClock = null;
        function step() {
            frames++;
            // How many of the game's steps passed since the last frame: the bot walks by game time,
            // as a player does, not by frames (a busy browser draws fewer of them)
            const clockNow = gameClock.now();
            const stepsSince = lastClock === null ? 1 : Math.max(1, Math.min(6, (clockNow - lastClock) / (1000 / 60)));
            lastClock = clockNow;
            const fight = window.__boss.fight;
            const p = lab.player;
            // Kept alive: what he loses is counted, then given back
            if (lastHealth === null) gs.maxHealth = 100000;
            if (lastHealth !== null && gs.health < lastHealth) {
                taken += lastHealth - gs.health;
                hits++;
                const by = fight && fight.attack && fight.doing !== 'moving' ? fight.attack : 'other';
                hitsBy[by] = (hitsBy[by] || 0) + 1;
            }
            // What an Upheaval sent (it flies, it does not fall) that touched him, once each
            for (const thing of lab.fireballs || []) {
                if (thing.flight && !thing.labCounted && thing.checkCollision(lab.player)) {
                    thing.labCounted = true;
                    upheavalHits++;
                }
            }
            if (fight && fight.upheaval && !inUpheaval) upheavals++;
            inUpheaval = Boolean(fight && fight.upheaval);
            gs.health = 100000;
            lastHealth = gs.health;
            if (lastArrows !== null) {
                if (gs.arrowCount < lastArrows) arrowsSpent += lastArrows - gs.arrowCount;
                if (gs.arrowCount > lastArrows) caught += gs.arrowCount - lastArrows;
            }
            lastArrows = gs.arrowCount;
            for (const item of lab.powerUps || []) if (item.data && item.data.id === 'mana_potion') manaSeen.add(item);
            if (gs.endlessArrowsTimer > 0) endlessFrames++;

            if (fight) {
                name = fight.boss.name;
                maxHealth = fight.stats.health;
                if (fight.phase === 'fight') {
                    if (start === null) start = gameClock.now();
                    end = gameClock.now();
                    if (!casual && !spellSystem.hasUnrestrictedMovement()) cast('dragon_cry');
                    if (spellSystem.hasUnrestrictedMovement()) dcFrames++;
                    if (fight.shielded) {
                        shieldFrames++;
                        cast('arcane_shot');
                    } else {
                        cast('multishot');
                        if (autoshot) cast('autoshot');
                    }
                }
                // Where to stand: low on arrows with a bundle about, on it; else under the boss
                const box = window.__boss.hitBox(lab.canvas);
                const bundle = (gs.arrowCount < 40 && lab.powerUps.find(item => /arrow/i.test(item.id || item.data?.id || item.name || '')))
                    // A mana potion (endless arrows) whenever one falls and none is running
                    || (!(gs.endlessArrowsTimer > 0) && lab.powerUps.find(item => item.data && item.data.id === 'mana_potion'));
                // As high as he may go now (utils/movement.js), as a player is held
                const bounds = movementBounds(H, p, gs);
                const top = bounds.minY;
                // The ambush and the side charge, dodged as a player would: up into the room they
                // open while the ground is the danger, aside out of a mark where he is
                const data = fight.attackData;
                const special = (fight.attack === 'ambush' || fight.attack === 'sidecharge') && fight.doing !== 'moving' && data;
                const aside = special && data.zone && (data.phase === 'backMark' || (fight.attack === 'sidecharge' && data.phase === 'mark'));
                // The hook's mark: out of it once he has seen it (a player's reaction, 0.2 s), and
                // kept out of until the hook has gone by
                const hookMark = fight.attack === 'hook' && fight.doing === 'acting' && data && ((data.phase === 'mark' && fight.doingSteps >= 12) || data.phase === 'fly');
                let x, y;
                if (gs.hooked) {
                    // Dragged: nothing he does counts
                    x = p.x;
                    y = p.y;
                } else if (casual && (aside || hookMark)) {
                    // Out of the mark, to the side with more room, at his own speed
                    const zone = data.zone;
                    const leftOut = zone.x - p.width - 8;
                    const rightOut = zone.x + zone.w + 8;
                    const wanted = leftOut >= 0 && (leftOut > lab.canvas.logicalWidth - p.width - rightOut || rightOut > lab.canvas.logicalWidth - p.width) ? leftOut : rightOut;
                    x = p.x + Math.max(-p.speed * stepsSince, Math.min(p.speed * stepsSince, wanted - p.x));
                    y = p.y;
                } else if (casual && special && data.phase !== 'home') {
                    // Up into the room opened for it, at his own speed
                    x = p.x;
                    y = p.y + Math.max(-p.speed * stepsSince, Math.min(p.speed * stepsSince, top - p.y));
                } else if (bundle) {
                    x = bundle.x + (bundle.width || 0) / 2 - p.width / 2;
                    y = Math.max(top, Math.min(H - p.height, bundle.y));
                } else if (casual && fight.upheaval) {
                    // The clear column of the wave being marked or coming through
                    const wave = fight.upheaval.waves.find(each => fight.upheaval.steps >= each.markAt && fight.upheaval.steps < each.clearAt);
                    // Walked to at his own speed, as on a keyboard (with a mouse he is already there)
                    const wanted = wave ? (wave.gap.left + wave.gap.right) / 2 - p.width / 2 : p.x;
                    x = p.x + Math.max(-p.speed * stepsSince, Math.min(p.speed * stepsSince, wanted - p.x));
                    y = H - p.height;
                } else {
                    x = fight.x - p.width / 2;
                    y = casual ? H - p.height : spellSystem.hasUnrestrictedMovement() && box ? box.y + box.height + 6 : top;
                }
                if (!gs.hooked) p.x = Math.max(0, Math.min(lab.canvas.logicalWidth - p.width, x));
                if (!gs.hooked) p.y = spellSystem.hasUnrestrictedMovement() ? Math.max(0, Math.min(H - p.height, y)) : Math.max(bounds.minY, Math.min(bounds.maxY, y));
                if (fight.phase === 'dying' || fight.health <= 0) return finish(true);
            } else if (start !== null) {
                return finish(true);
            }
            if (performance.now() - t0 > limitSeconds * 1000) return finish(false);
            requestAnimationFrame(step);
        }
        function finish(won) {
            const fight = window.__boss.fight;
            resolve({
                faction, zone, name, won,
                seconds: start !== null ? +((end - start) / 1000).toFixed(1) : null,
                health: maxHealth, left: fight ? Math.round(fight.health) : 0,
                arrowsSpent, caught, taken: Math.round(taken), hits,
                dragonCry: +(dcFrames / Math.max(1, frames)).toFixed(2),
                shieldedSeconds: +(shieldFrames / 60).toFixed(1),
                upheavals, upheavalHits, hitsBy, special: gs.specialHits || {},
                manaDrops: manaSeen.size, endlessSeconds: +(endlessFrames / Math.max(1, frames) * (start !== null ? (end - start) / 1000 : 0)).toFixed(1),
            });
        }
        requestAnimationFrame(step);
    });
}

// ----- Every fight asked for, a few at a time -----

const server = await serve();
const base = `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
    args: ['--mute-audio', '--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});

async function runOne(job) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    page.on('pageerror', error => console.error(`  ${job.faction}-${job.zone}: ${error.message}`));
    await page.route(/game-modular\.js/, async route => {
        const response = await route.fetch();
        route.fulfill({ response, body: (await response.text()) + MODULAR_HOOK });
    });
    await page.route(/systems\/bossSystem\.js/, async route => {
        const response = await route.fetch();
        route.fulfill({ response, body: (await response.text()) + BOSS_HOOK });
    });
    await page.goto(base, { waitUntil: 'load' });
    await page.waitForFunction(() => window.__lab && window.__boss, null, { timeout: 30000 });
    await page.waitForTimeout(1500);
    // Pictures of the fight as it goes, to see what a boss does
    let shooting = Boolean(shotsDir);
    const shots = (async () => {
        if (!shooting) return;
        fs.mkdirSync(shotsDir, { recursive: true });
        for (let shot = 0; shooting; shot++) {
            const at = String(shot * 5).padStart(4, '0');
            await page.screenshot({ path: path.join(shotsDir, `${job.faction}-${job.zone}-${at}.png`) }).catch(() => {});
            await page.waitForTimeout(500);
        }
    })();
    const result = await page.evaluate(playFight, { ...job, limitSeconds, autoshot, casual });
    shooting = false;
    await shots;
    await page.close();
    return result;
}

const jobs = [];
for (const faction of ['alliance', 'horde']) {
    for (let zone = 1; zone <= 10; zone++) jobs.push({ faction, zone });
}
const queue = jobs.filter(job => !only || only.includes(`${job.faction}-${job.zone}`));
const results = [];
console.log(`Playing ${queue.length} boss ${queue.length === 1 ? 'fight' : 'fights'}, ${parallel} at a time...`);

async function worker() {
    while (queue.length) {
        const job = queue.shift();
        try {
            const result = await runOne(job);
            results.push(result);
            console.log(`  ${job.faction}-${job.zone} ${result.name}: ${result.won ? `${result.seconds}s` : 'not beaten'}`);
        } catch (error) {
            console.error(`  ${job.faction}-${job.zone}: ${error.message}`);
        }
    }
}
await Promise.all(Array.from({ length: parallel }, worker));
await browser.close();
server.close();

results.sort((a, b) => a.faction.localeCompare(b.faction) || a.zone - b.zone);
console.table(results.map(r => ({
    boss: `${r.faction === 'alliance' ? 'A' : 'H'}${r.zone} ${r.name}`,
    time: r.won ? `${r.seconds}s` : `not beaten (${r.left} left)`,
    health: r.health, arrows: r.arrowsSpent, caught: r.caught, taken: r.taken, hits: r.hits,
    'dragon cry': r.dragonCry, shielded: `${r.shieldedSeconds}s`,
    'mana potions': r.manaDrops, 'endless arrows': `${r.endlessSeconds}s`,
    ...(r.upheavals ? { upheavals: r.upheavals, 'upheaval hits': r.upheavalHits } : {}),
    // What the ambush and the side charge themselves landed, by part (casual: none)
    ...(casual || Object.keys(r.special || {}).length ? { 'special attacks landed': Object.entries(r.special || {}).map(([part, count]) => `${part} ${count}`).join(', ') || 'none' } : {}),
})));
if (outFile) fs.writeFileSync(outFile, JSON.stringify(results, null, 1));
