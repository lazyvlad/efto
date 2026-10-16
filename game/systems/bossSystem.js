// Boss fights (who the bosses are, and the rules of a fight, are described in data/bosses.js).
//
// A fight has three parts: the boss comes in ("intro"), the fight proper ("fight") and the boss
// going down ("dying"). While one is on, the game holds back its normal drops and the level
// stays where it is. Arrow bundles and the odd health potion drop during the fight so the
// player is never left with nothing to shoot.
//
// In the fight proper the boss is always doing one of these:
//   moving   - sweeping along the top, drawn towards the player, sidestepping arrows
//   winding  - standing to wind up its next attack: it cannot sidestep, so this is the opening
//   acting   - carrying out an attack that takes time (a charge, being vanished)
// Its attacks come round in the order its behaviour lists them.

import { movementBounds } from '../utils/movement.js';
import { gameConfig } from '../config/gameConfig.js';
import { bosses, behaviours, bossForZone, bossStats, levelCap, zoneForLevel, weakenedMultiplier, enrageMultiplier, speedBonus } from '../data/bosses.js';
import { levelProgress } from '../utils/progression.js';
import { powerUpItems } from '../data/powerUpItems.js';
import { BossProjectile } from '../classes/BossProjectile.js';
import { PowerUpItem } from '../classes/PowerUpItem.js';
import { DamageProjectile } from '../classes/DamageProjectile.js';
import { damageProjectiles } from '../data/damageProjectiles.js';
import { CombatText } from '../classes/CombatText.js';
import { Particle } from '../classes/Particle.js';
import { addNotification, trackActivity, responsiveScaler } from '../utils/gameUtils.js';
import { FIGURE_HEIGHT_TO_WIDTH } from '../classes/Player.js';
import { playTotalSound, playScreamSound, playFireballImpactSound } from './audioSystem.js';
import { areMessagesAboveField } from './hudNotificationSystem.js';
import { keyName } from '../utils/keybindings.js';
import { planUpheaval } from '../utils/upheaval.js';
import { arrowDamage, damageAfterArmor, armorReduction } from '../utils/stats.js';
import { shieldBlocks } from '../utils/shield.js';
import { getCurrentTotalCritRating } from './statEffectsSystem.js';

const INTRO_STEPS = 120;
// In a boss fight (the one boss and nothing else) it is there almost at once
const SHORT_INTRO_STEPS = 30;
const DYING_STEPS = 90;
const HIT_FLASH_STEPS = 6;
const ATTACK_SPEED = { min: 1.2, max: 2.0 };  // How fast a boss's attack falls, as the game's other projectiles

// How long the first boss stands to wind up each attack, in steps (60 = 1 second); later
// bosses are quicker. The charge and the stomp show the player where the danger will be for
// the whole of theirs.
const WIND_UP = { throw: 24, row: 36, fan: 24, vanish: 18, charge: 54, bolt: 24, curse: 36, bomb: 24, stomp: 66, hex: 66, swipe: 30, riot: 48, upheaval: 60, ambush: 18, sidecharge: 72, hook: 30 };

// The rogue's ambush and the side charge (gameConfig.bosses.ambush, .sideCharge): their parts,
// in steps. The marks (where it will strike) are shorter for the later bosses, as wind-ups are.
//   Ambush: it vanishes, the hunter's room opens up, the ground where he stands is marked and it
//           comes up out of it; then it marks where he is now and backstabs him there; then home.
//   Side charge: the ground is marked across the field from one side, the room opens up, and it
//           dashes over it; then it marks where he is and strikes there; then home.
const AMBUSH = { vanish: 30, mark: 72, strike: 12, backMark: 48, back: 12, home: 30 };
const SIDE = { dash: 36, mark: 48, strike: 12, home: 30 };
// The hook going back to the boss when it caught nothing
const HOOK_REEL_STEPS = 10;

// The attacks that strike all of the ground but one safe patch, and what each looks like: the
// colour the ground to be struck is marked in (as "r, g, b") and the colour of what rises
// from it. A stomp shakes it; a hex (Vile Priestess Hexx) curses it. They hit alike.
const GROUND_STRIKES = {
    stomp: { marked: '255, 60, 30', rises: '#C8A46A' },
    hex: { marked: '170, 70, 255', rises: '#B45CFF' }
};
const VANISHED_STEPS = 60;
const CHARGE_STEPS = 48;
const BOMB_FLIGHT_STEPS = 40;
const BOMB_FUSE_STEPS = 66;

let fight = null;           // The fight in progress, or null
let faction = null;         // The side being played
let passed = [];            // Ids of the bosses no longer in the way: defeated, or skipped by a later starting level
let defeated = [];          // Ids of the bosses defeated in this game
const pictures = new Map();

function load(path) {
    if (!pictures.has(path)) {
        const image = new Image();
        image.src = path;
        pictures.set(path, image);
    }
    return pictures.get(path);
}

const picture = boss => load(boss.image);
const attackPicture = boss => load(boss.attack.image);
// Stitches' hook (art-workbench/stitches-hook): the hook and its chain, Stitches without the
// hook painted in his hand (shown while he throws it), and his fingers, drawn over the chain
const HOOK_ART = {
    hook: 'assets/attacks/alliance/06-stitches-hook.webp',
    chain: 'assets/attacks/alliance/06-stitches-chain.webp',
    grip: 'assets/attacks/alliance/06-stitches-hook-grip.webp',
    boss: 'assets/bosses/alliance/06-stitches-hook.webp',
    hand: [630 / 688, 365 / 640],   // His hand on the boss picture, as shares of it
    eye: [52.98, 46.601],           // Where the chain meets the hook, on its 192 × 320 picture
    hookSize: 0.32,                 // The hook picture's height, against the boss's width
    chainWidth: 0.022,              // The chain's width, against the boss's width
    dangle: 0.13                    // How far the hook hangs below his hand before he throws it
};
const stillMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// The HUD panels are page elements drawn over the canvas. On a phone they reach across the
// middle of the screen, where the boss stands, so the boss and its health bar start below them.
// On a desktop they sit in the top corners, so the boss keeps to the space between them.
const HUD_PANEL_IDS = ['itemsCollectionPanel', 'dragonstalkerProgressPanel'];
let clearOfPanels = { top: 0, left: 0, right: Infinity, measuredAt: -Infinity };

// The part of the canvas, in its own units, that no panel covers at the height of the boss
function spaceClearOfPanels(canvas) {
    const now = performance.now();
    if (now - clearOfPanels.measuredAt < 500) return clearOfPanels;

    const area = canvas.getBoundingClientRect();
    const middleLeft = area.left + area.width * 0.35;
    const middleRight = area.left + area.width * 0.65;
    let top = area.top;
    let left = area.left;
    let right = area.right;

    for (const id of HUD_PANEL_IDS) {
        const panel = document.getElementById(id);
        if (!panel) continue;

        // A hidden panel has an empty box
        const box = panel.getBoundingClientRect();
        if (box.height === 0) continue;

        if (box.right > middleLeft && box.left < middleRight) {
            top = Math.max(top, box.bottom);
        } else if (box.right <= middleLeft) {
            left = Math.max(left, box.right);
        } else {
            right = Math.min(right, box.left);
        }
    }

    // From page pixels to the canvas's own units
    const scaleX = area.width ? canvas.logicalWidth / area.width : 1;
    const scaleY = area.height ? canvas.logicalHeight / area.height : 1;
    clearOfPanels = {
        top: (top - area.top) * scaleY,
        left: (left - area.left) * scaleX,
        right: (right - area.left) * scaleX,
        measuredAt: now
    };
    return clearOfPanels;
}

// Where the boss stands and how big it is drawn, for the current canvas
function layout(canvas, boss) {
    const image = picture(boss);
    const aspect = image.naturalWidth ? image.naturalWidth / image.naturalHeight : 1;
    // Right at the top of the field when the messages are shown above it; otherwise under them
    const underMessages = canvas.logicalHeight * (areMessagesAboveField() ? 0.012 : 0.085);
    const barTop = Math.max(underMessages, spaceClearOfPanels(canvas).top + 8);
    const barHeight = Math.max(14, canvas.logicalHeight * 0.022);
    const size = gameConfig.bosses.size;
    // On a field taller than it is wide (a phone held upright) the boss is the hunter's size:
    // anything bigger fills the width and leaves it nowhere to go
    const narrow = canvas.logicalHeight > canvas.logicalWidth;
    const tallest = narrow
        ? responsiveScaler.getSize('player').width * FIGURE_HEIGHT_TO_WIDTH * size.vsHunterOnNarrowField
        : canvas.logicalHeight * size.height * (responsiveScaler.objectScale || 1);
    const height = Math.min(tallest, canvas.logicalWidth * size.width * (responsiveScaler.objectScale || 1) / aspect);
    const width = height * aspect;

    return { barTop, barHeight, width, height, top: barTop + barHeight + 8 };
}

// The part of the picture arrows can hit: the body, not the empty corners around it
function hitBox(canvas) {
    const { width, height, top } = layout(canvas, fight.boss);

    // A boss drawn wider than most has a narrower share of it to hit ("body" in data/bosses.js)
    const body = fight.boss.body || 0.6;
    return {
        x: fight.x - width * body / 2,
        y: top + fight.drop + height * 0.1,
        width: width * body,
        height: height * 0.8
    };
}

function levelsPerZone() {
    return gameConfig.backgrounds.levelsPerBackground;
}

// The fight settings, with the length of a zone alongside them
function rules() {
    return { ...gameConfig.bosses, levelsPerZone: levelsPerZone() };
}

/**
 * A new game: no fight, every boss of the side standing.
 * @param {number} startingLevel  The level the game starts at (above 1 only when testing):
 *                                the bosses of the zones before it are passed over
 */
export function resetBosses(side, startingLevel = 1) {
    fight = null;
    curse = null;
    faction = side;
    defeated = [];
    passed = bosses
        .filter(boss => boss.faction === side && boss.zone * levelsPerZone() < startingLevel)
        .map(boss => boss.id);

    // Have the first pictures ready
    const first = bosses.find(boss => boss.faction === side && !passed.includes(boss.id));
    if (first) picture(first);
}

export function isBossFightActive() {
    return fight !== null;
}

// Ids of the bosses defeated in this game
export function bossesDefeated() {
    return defeated;
}

// The fight in progress, in brief (null when there is none)
export function bossFightState() {
    if (!fight) return null;

    return { name: fight.boss.name, behaviour: fight.boss.behaviour, phase: fight.phase, doing: fight.doing, x: fight.x, health: fight.health, maxHealth: fight.stats.health, shielded: fight.shielded, enraged: fight.enraged, dazed: (fight.dazedSteps || 0) > 0, upheaval: Boolean(fight.upheaval), seconds: Math.round(fightSeconds() * 10) / 10, dealt: fight.dealt ? { ...fight.dealt } : null };
}

/**
 * Thunderfury's lightning strikes the boss: damage, unless its shield takes it, and a daze that
 * slows its attacks for a while. Where it was struck ({ x, y }), for the lightning to be
 * drawn to, or null when there is no boss to strike.
 */
export function strikeBoss({ damage, slow, slowSeconds, combatTexts, canvas }) {
    if (!fight || fight.phase !== 'fight' || fight.hidden > 0.5) return null;

    const box = hitBox(canvas);
    const at = { x: box.x + box.width / 2, y: box.y + box.height * 0.45 };
    fight.dazedSteps = Math.round(slowSeconds * 60);
    fight.daze = slow;
    if (!fight.shielded) {
        fight.health -= damage;
        fight.dealt.thunderfury += damage;
        fight.hitFlash = HIT_FLASH_STEPS;
        if (combatTexts) combatTexts.push(new CombatText(at.x, at.y - 20, `⚡ ${damage}`, '#9fd8ff', false));
    }
    return at;
}

/**
 * Where a boss can be struck hand to hand: its body, while it fights and is not vanished.
 * Null when there is none.
 */
export function bossMeleeBox(canvas) {
    if (!fight || fight.phase !== 'fight' || fight.hidden > 0.5) return null;
    return hitBox(canvas);
}

/**
 * The hunter's weapon lands on the boss: its armor takes its share, as of any arrow; its
 * shield takes all of it.
 */
export function meleeStrikeBoss({ damage, isCrit, combatTexts, canvas }) {
    if (!fight || fight.phase !== 'fight') return;
    const box = hitBox(canvas);
    const x = box.x + box.width / 2;
    const y = box.y + box.height * 0.7;
    if (fight.shielded) {
        combatTexts.push(new CombatText(x, y, 'Absorbed', '#9CC0FF', false));
        return;
    }
    const taken = Math.max(1, Math.round(damage * (1 - armorReduction(fight.stats.armor || 0, gameConfig.stats))));
    fight.health = Math.max(0, fight.health - taken);
    fight.dealt.melee = (fight.dealt.melee || 0) + taken;
    fight.hitFlash = HIT_FLASH_STEPS;
    combatTexts.push(new CombatText(x, y, isCrit ? `${taken} CRIT!` : `${taken}`, isCrit ? '#FF6B00' : '#FFE4B5', isCrit));
}

/**
 * A boss fight still going on (not won): how it stands, for the game's record when the game
 * ends in it, the hunter fallen or the game left. Null when there is none.
 * @returns {{ boss: string, seconds: number, bossHealth: number, arrows: number, damage: number, hits: number } | null}
 */
export function fightInProgress() {
    if (!fight || fight.phase === 'dying' || fight.health <= 0) return null;

    return {
        boss: fight.boss.id,
        seconds: Math.round(fightSeconds() * 10) / 10,
        // What it had left, as a share of its health (1 = untouched)
        bossHealth: Math.round(Math.max(0, fight.health) / fight.stats.health * 1000) / 1000,
        arrows: fight.tally.arrows,
        damage: Math.round(fight.tally.damage),
        hits: fight.tally.hits,
    };
}

// The attacks of all the bosses, of both sides, also fall as hazards all through the game,
// whether or not their boss has been met. This picks one at random. It hits as hard as the
// boss of the zone the player is in, so a late boss's attack is no worse than the rest on the
// early levels.
export function randomBossAttack(level) {
    const here = bossForZone(faction, zoneForLevel(level, levelsPerZone()));
    if (!here) return null;

    const { attack } = bosses[Math.floor(Math.random() * bosses.length)];
    return { ...attack, damage: bossStats(here, rules()).damage, speed: ATTACK_SPEED };
}

/**
 * Call every step outside a fight. Keeps the level from passing a boss that still stands, and
 * brings that boss in once the player has the experience to move on.
 * @returns {boolean} Whether a fight started
 */
export function guardZone(gameState, canvas) {
    if (fight) return false;

    const cap = levelCap(faction, passed, levelsPerZone());
    gameState.levelCap = cap;
    if (levelProgress(gameState.xp || 0, gameConfig.progression).level <= cap) return false;

    const boss = bossForZone(faction, cap / levelsPerZone());
    const stats = bossStats(boss, rules());
    // Its storm's picture is fetched now, to be there when the storm is called
    if (boss.storm) load(boss.storm.image);
    if (behaviours[boss.behaviour].includes('riot')) load(gameConfig.bosses.riot.image);

    fight = {
        boss,
        stats,
        phase: 'intro',
        introSteps: gameState.mode === 'boss_fight' ? SHORT_INTRO_STEPS : INTRO_STEPS,
        steps: 0,               // Steps spent in the current phase
        health: stats.health,
        x: canvas.logicalWidth / 2,
        prevX: canvas.logicalWidth / 2,
        drop: 0,                // How far below its usual place the boss is (during a charge)
        prevDrop: 0,
        hidden: 0,              // 0 in plain sight .. 1 vanished
        hitFlash: 0,
        shielded: false,
        // Seconds until the next shield goes up (never, for bosses without one)
        shieldIn: stats.shieldAfter === null ? Infinity : stats.shieldAfter,
        // Seconds until help falls (gameConfig.bosses.help)
        helpIn: helpAfter(),
        enraged: false,
        absorbedTextAt: -Infinity,

        // What it is doing: 'moving', 'winding' or 'acting'
        doing: 'moving',
        doingSteps: 0,
        attack: null,           // The attack being wound up or carried out
        attackData: null,       // What that attack needs to remember (a lane, a safe patch)
        nextAttack: 0,          // Place in the behaviour's round of attacks
        sinceAttack: 0,
        closeFor: 0,            // Steps the player has stayed within the boss's reach
        sinceVolley: 0,         // Steps since the last row it sent down outside its round
        storm: null,            // The storm coming down: { left, right, steps }
        sinceStorm: Infinity,   // Steps since the last storm ended (the first comes at once)
        sweep: Math.random() * Math.PI * 2,     // Where it is in its sweep along the top

        // Sidestepping arrows
        dodgeIn: 0,             // Steps until it may sidestep again
        reactingFor: -1,        // Steps left before a sidestep it has decided on begins (-1: none)
        dodgeDirection: 0,
        dodgeSteps: 0,          // Steps left of the sidestep under way

        bombs: [],              // Things lobbed at the player that have yet to burst
        upheaval: null,         // An Upheaval under way: { waves, steps } (utils/upheaval.js)
        // How the player did in the fight proper, for its record (My Games on the site)
        tally: { arrows: 0, damage: 0, hits: 0, lastArrows: null, lastHealth: null },
        // Where the damage it took came from, for debug mode (utils/perfProbe.js): by kind of
        // shot, and what landed while it charged; arrows that missed it or bounced off
        dealt: { arrow: 0, multishot: 0, arcane: 0, crit: 0, thunderfury: 0, charging: 0, hits: 0, dodged: 0, absorbed: 0 },
        dodgedTextAt: -Infinity, // When "Dodge" was last shown
        sinceArrows: 0,
        sincePotion: 0
    };

    picture(boss);
    addNotification(gameState, stats.armor
        ? `${boss.name} appears in armor: arrows -${Math.round(armorReduction(stats.armor, gameConfig.stats) * 100)}%, Arcane Shot goes through`
        : stats.dodgeChance
            ? `${boss.name} appears: dodges ${Math.round(stats.dodgeChance * 100)}% of arrows, never an Arcane Shot`
            : `${boss.name} appears! Bring it down with your arrows`, 300, '#FF6B35');
    playScreamSound();
    return true;
}

// The fight's record, step by step: arrows that left the quiver, and the health lost (what
// heals or is caught does not count against it)
function keepTally(gameState) {
    const tally = fight.tally;
    if (tally.lastArrows !== null && gameState.arrowCount < tally.lastArrows) tally.arrows += tally.lastArrows - gameState.arrowCount;
    if (tally.lastHealth !== null && gameState.health < tally.lastHealth) {
        tally.damage += tally.lastHealth - gameState.health;
        tally.hits++;
    }
    tally.lastArrows = gameState.arrowCount;
    tally.lastHealth = gameState.health;
}

// Seconds the fight proper has lasted
function fightSeconds() {
    return fight.phase === 'fight' ? fight.steps / 60 : 0;
}

function enrage() {
    return enrageMultiplier(fightSeconds(), fight.stats.enrageAfter, gameConfig.bosses);
}

// What the boss throws right now: its attack, hitting harder once it has enraged
function currentAttack(extra = {}) {
    return {
        ...fight.boss.attack,
        damage: Math.round(fight.stats.damage * enrage()),
        speed: ATTACK_SPEED,
        attackerLevel: fight.stats.level,
        ...extra
    };
}

function throwProjectile(context, x, extra = {}, speed = null) {
    const { gameState, canvas, fireballs, isValidYPosition, recentDropYPositions } = context;
    const projectile = new BossProjectile(currentAttack(extra), isValidYPosition, recentDropYPositions, gameState, canvas);
    const { top, height } = layout(canvas, fight.boss);
    projectile.x = Math.max(0, Math.min(canvas.logicalWidth - projectile.width, x - projectile.width / 2));
    projectile.y = top + height * 0.7;
    if (speed !== null) {
        projectile.baseSpeed = speed;
        projectile.speed = speed;
    }

    fireballs.push(projectile);
    return projectile;
}

// A riot in progress: one stone after another comes in from the sides of the field, by turns,
// flying inwards as it falls. The boss carries on with its own round meanwhile.
function updateRiot(context) {
    const riot = fight.riot;
    if (!riot) return;

    const { canvas } = context;
    const settings = gameConfig.bosses.riot;

    if (riot.steps++ % settings.every !== 0) return;

    const stone = throwProjectile(context, 0, {
        id: 'riot-stone',
        name: 'Thrown Stone',
        image: settings.image,
        size: settings.size,
        spin: settings.spin,
        damage: Math.round(fight.stats.damage * settings.damage * enrage()),
    });

    stone.x = riot.fromLeft ? 0 : canvas.logicalWidth - stone.width;
    stone.y = canvas.logicalHeight * (settings.from.top + Math.random() * (settings.from.bottom - settings.from.top));
    stone.vx = stone.speed * settings.lean * (riot.fromLeft ? 1 : -1);

    riot.fromLeft = !riot.fromLeft;
    if (++riot.thrown >= settings.stones) fight.riot = null;
}

// The top of the band the hunter moves in
function floorTop(canvas) {
    return canvas.logicalHeight * (1 - gameConfig.player.movableArea.heightPercent);
}

// Turn gravity over: plan the waves of an Upheaval, each to be marked and then sent
function startUpheaval(context) {
    const { canvas } = context;
    // How big one is: the boss's own attack, as thrown
    const probe = throwProjectile(context, 0);
    context.fireballs.pop();

    const settings = gameConfig.bosses.upheaval;
    const field = { width: canvas.logicalWidth, height: canvas.logicalHeight, floorTop: floorTop(canvas) };
    fight.upheaval = {
        steps: 0,
        // One wave after another: each marked, sent, and through before the next is marked
        // Each clear column within the hunter's reach of the last, at his speed while it is marked
        waves: planUpheaval(field, probe.width, settings, {
            x: context.player.x + context.player.width / 2,
            reach: context.player.speed * settings.warn,
        }).map(wave => ({ ...wave, sent: false })),
    };
}

// An Upheaval under way: each wave goes out when its mark has been up long enough
function updateUpheaval(context) {
    const upheaval = fight.upheaval;
    if (!upheaval) return;

    const settings = gameConfig.bosses.upheaval;
    // Its clock runs as fast as what it sends moves: held by Frost Nova, slowed with time
    // itself, so one wave is never sent before the one before has gone through
    const { gameState, spellSystem } = context;
    upheaval.steps += gameState.freezeTimeActive ? 0 : (spellSystem ? spellSystem.getProjectileSpeedMultiplier() : 1);

    for (const wave of upheaval.waves) {
        if (wave.sent || upheaval.steps < wave.sendAt) continue;
        wave.sent = true;
        for (const entry of wave.entries) {
            const sent = throwProjectile(context, 0, {
                flight: { vx: entry.vx, vy: entry.vy, gravity: entry.gravity, stopX: entry.stopX },
                damage: Math.round(fight.stats.damage * settings.damage * enrage()),
            });
            sent.x = entry.x - sent.width / 2;
            sent.y = entry.y - sent.height / 2;
            sent.prevX = sent.x;
            sent.prevY = sent.y;
        }
    }

    if (upheaval.steps >= upheaval.waves[upheaval.waves.length - 1].clearAt) {
        fight.upheaval = null;
        // Its round picks up again a moment later
        fight.sinceAttack = 0;
    }
}

// The marks of the waves about to come: the columns of the ground things will come through
// (rising, or dropping from where they stop), the one column left clear, and for those hurled
// from a side, the edge they come in at
function drawUpheaval(ctx, canvas, pulse) {
    const top = floorTop(canvas);
    const band = canvas.logicalHeight - top;
    const { steps, waves } = fight.upheaval;

    for (const wave of waves) {
        // Marked from before it is sent until all of it has gone through
        if (steps < wave.markAt || steps >= wave.clearAt) continue;
        // Brighter as it comes nearer, full while it comes through
        const near = Math.min(1, (steps - wave.markAt) / Math.max(1, wave.sendAt - wave.markAt));
        const strength = (0.25 + 0.45 * near) * pulse;
        const slotWidth = wave.slotWidth;
        // Rising from the ground, brightest at the bottom; dropping from above, at the top
        const rising = wave.kind === 'floor';

        for (const entry of wave.entries) {
            const left = entry.lane - slotWidth / 2;
            const glow = ctx.createLinearGradient(0, rising ? canvas.logicalHeight : top, 0, rising ? top : canvas.logicalHeight);
            glow.addColorStop(0, `rgba(190, 80, 255, ${strength})`);
            glow.addColorStop(1, `rgba(190, 80, 255, ${strength * 0.15})`);
            ctx.fillStyle = glow;
            ctx.fillRect(left + 3, top, slotWidth - 6, band);
        }

        // The column that stays clear
        ctx.fillStyle = `rgba(90, 230, 120, ${0.18 + 0.12 * near})`;
        ctx.fillRect(wave.gap.left, top, slotWidth, band);
        ctx.strokeStyle = `rgba(190, 255, 200, ${0.5 + 0.4 * near})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(wave.gap.left, top, slotWidth, band);

        if (rising) continue;

        // Chevrons at the edges they come in at, high up, pointing the way they will fly
        const size = band * 0.12;
        ctx.strokeStyle = `rgba(235, 200, 255, ${0.5 + 0.5 * near})`;
        ctx.lineWidth = 3;
        for (const from of new Set(wave.entries.map(entry => entry.from))) {
            const edge = from === 'left' ? 0 : canvas.logicalWidth;
            const direction = from === 'left' ? 1 : -1;
            const middle = wave.entries.find(entry => entry.from === from).y;
            for (let chevron = 0; chevron < 2; chevron++) {
                const x = edge + direction * (size * 0.8 + chevron * size * 0.9);
                ctx.beginPath();
                ctx.moveTo(x - direction * size / 2, middle - size / 2);
                ctx.lineTo(x, middle);
                ctx.lineTo(x - direction * size / 2, middle + size / 2);
                ctx.stroke();
            }
        }
    }
}

// A row of projectiles across the screen, all at one speed, with one gap to stand in
function throwRow(context) {
    const { canvas } = context;
    const first = throwProjectile(context, 0);

    const slots = Math.max(3, Math.min(8, Math.floor(canvas.logicalWidth / (first.width * 1.7))));
    const gap = Math.floor(Math.random() * slots);
    const slotWidth = canvas.logicalWidth / slots;
    const speed = first.baseSpeed;

    context.fireballs.pop();
    for (let slot = 0; slot < slots; slot++) {
        if (slot === gap) continue;
        const projectile = throwProjectile(context, slotWidth * (slot + 0.5), {}, speed);
        projectile.y = layout(canvas, fight.boss).top;
        projectile.fromRow = true;
    }

    // Where the way through is, for a stomp that comes while the row is still falling
    fight.rowGap = slotWidth * (gap + 0.5);
}

// Five at once, spreading out as they fall
function throwFan(context) {
    const first = throwProjectile(context, fight.x);
    const speed = first.baseSpeed;
    context.fireballs.pop();

    for (const lean of [-0.5, -0.25, 0, 0.25, 0.5]) {
        throwProjectile(context, fight.x, { vx: speed * lean }, speed);
    }
}

/**
 * Drop power-ups for the player to catch, outside a fight (Boss Rush restocks between bosses).
 * @param {object}   context  { gameState, powerUps, isValidYPosition, recentDropYPositions }
 * @param {string[]} ids      Power-ups from data/powerUpItems.js
 */
export function dropSupplies(context, ids) {
    ids.forEach(id => dropPowerUp(context, id));
}

// Seconds until the next help falls in a fight
function helpAfter() {
    const [low, high] = gameConfig.bosses.help.every;
    return low + Math.random() * (high - low);
}

// One of the help a fight drops, by weight: a falling spell (Haste, Power Word: Shield) or a
// power-up (Reverse Gravity)
function dropHelp(context) {
    const drops = Object.entries(gameConfig.bosses.help.drops);
    let at = Math.random() * drops.reduce((total, [, weight]) => total + weight, 0);
    const [id] = drops.find(([, weight]) => (at -= weight) < 0) || drops[drops.length - 1];

    const spell = damageProjectiles.find(projectile => projectile.id === id);
    if (spell) {
        const { gameState, fireballs, canvas, isValidYPosition, recentDropYPositions } = context;
        const projectile = new DamageProjectile(spell, isValidYPosition, recentDropYPositions, gameState, canvas);
        if (spell.effects === 'shield') {
            projectile.shieldDuration = gameConfig.bosses.help.shield.steps;
            projectile.shieldCharges = gameConfig.bosses.help.shield.charges;
        }
        fireballs.push(projectile);
    } else {
        dropPowerUp(context, id);
    }
}

function dropPowerUp(context, id) {
    const { gameState, powerUps, isValidYPosition, recentDropYPositions } = context;
    const data = powerUpItems.find(powerUp => powerUp.id === id);
    if (!data) return;

    powerUps.push(new PowerUpItem(data, isValidYPosition, recentDropYPositions, gameState));
}

/**
 * Something other than a thrown thing reaches the player: a charge, a blast, a stomp. The
 * player may dodge it or be shielded from it, as with anything else. Quiet: no hit sound (a
 * storm's every tick, which would sound twice a second).
 */
function hurtPlayer(context, damage, { quiet = false } = {}) {
    const { gameState, player, combatTexts } = context;
    const x = player.x + player.width / 2;

    if (context.shouldDodge(fight.stats.level)) {
        context.showDodgeText(x, player.y);
        context.trackDodge(damage);
    } else if (shieldBlocks(gameState)) {
        combatTexts.push(new CombatText(x, player.y, 'BLOCKED', '#FFD700', false));
    } else {
        // His armor takes its share off the hit
        const taken = damageAfterArmor(damage, gameState.armor || 0, gameConfig.stats);
        trackActivity(gameState, 'damage', taken);
        gameState.health = Math.max(0, gameState.health - taken);
        combatTexts.push(new CombatText(x, player.y, `-${taken}`, '#FF4500', false));
        if (player.onHit) player.onHit();
    }
    if (!quiet) playFireballImpactSound();
}

function heavyDamage() {
    return Math.round(fight.stats.damage * gameConfig.bosses.heavyDamage * enrage());
}

// Where the player's body is, head to feet: where a storm or a stomp finds him, and how close
// he is. A charge and a burst hit only where he is drawn (Player.isHitBy).
function playerBody(player) {
    const box = player.getBodyBounds();
    return { ...box, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2 };
}

// ----- The curse -----
// It outlasts the bolt that brought it, and the fight if need be: it eats at the player's health
// until it runs out or Dragon Cry lifts it. Nothing dodges or blocks it.

let curse = null;   // { stepsLeft, damage } while the player is cursed

function castCurse(context) {
    const { gameState } = context;
    const share = gameConfig.bosses.curse.share;
    const damage = Math.max(1, Math.round(fight.stats.damage * share));
    const name = fight.boss.name;

    throwProjectile(context, fight.x, {
        follows: true,
        onPlayerHit: () => {
            curse = { stepsLeft: gameConfig.bosses.curse.seconds * 60, damage };
            addNotification(gameState, `${name} has cursed you! Dragon Cry (${keyName('dragon_cry')}) lifts it`, 300, '#B048F8');
        }
    });
}

// The curse on the player, for showing it by their health bar: { secondsLeft, damage }, or null
export function curseState() {
    return curse ? { secondsLeft: Math.ceil(curse.stepsLeft / 60), damage: curse.damage } : null;
}

// Call every step, in a fight or not
export function updateCurse(context) {
    if (!curse) return;

    const { gameState, player, combatTexts, spellSystem } = context;
    if (spellSystem.isSpellActive('dragon_cry')) {
        curse = null;
        combatTexts.push(new CombatText(player.x + player.width / 2, player.y, 'Curse lifted', '#D9A8FF', false));
        return;
    }

    curse.stepsLeft--;
    if (curse.stepsLeft % 60 === 0) {
        gameState.health = Math.max(0, gameState.health - curse.damage);
        combatTexts.push(new CombatText(player.x + player.width / 2, player.y, `-${curse.damage}`, '#B048F8', false));
    }
    if (curse.stepsLeft <= 0) curse = null;
}

// ----- Arrows -----

// Arrows that reach the boss are spent on it. A shield absorbs ordinary arrows; an Arcane Shot
// goes through it and breaks it. A vanished boss cannot be hit. A boss charging, from the
// moment it marks its lane until it is back at the top, cannot be hurt by an Arcane Shot: it
// stands still on its lane while it lines up, and that was an easy target for the strongest
// shot. Ordinary arrows still hit it. A nimble boss may dodge an arrow, any but an Arcane
// Shot: the arrow is spent and does nothing.
function takeArrowHits(context) {
    if (fight.hidden > 0.5) return;

    const { gameState, canvas, particles, combatTexts } = context;
    const box = hitBox(canvas);
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);
    const charging = fight.attack === 'charge' && fight.doing !== 'moving';

    for (let index = window.arrows.length - 1; index >= 0; index--) {
        const arrow = window.arrows[index];
        if (!arrow.checkCollision(box)) continue;

        arrow.createImpactParticles(particles);
        window.arrows.splice(index, 1);

        if (charging && arrow.arcane) {
            // Said once a second at most
            if (fight.steps - fight.absorbedTextAt >= 60) {
                fight.absorbedTextAt = fight.steps;
                combatTexts.push(new CombatText(arrow.x, box.y + box.height, 'Immune', '#D9A8FF', false));
            }
            continue;
        }

        if (!arrow.arcane && fight.stats.dodgeChance && Math.random() < fight.stats.dodgeChance) {
            // Said a few times a second at most, however many arrows of a Multishot miss
            if (fight.steps - fight.dodgedTextAt >= 20) {
                fight.dodgedTextAt = fight.steps;
                combatTexts.push(new CombatText(arrow.x, box.y + box.height, 'Dodge', '#C8C8C8', false));
            }
            fight.dealt.dodged++;
            continue;
        }

        if (fight.shielded && !arrow.arcane) {
            fight.dealt.absorbed++;
            // Said once a second at most, however many arrows bounce off
            if (fight.steps - fight.absorbedTextAt >= 60) {
                fight.absorbedTextAt = fight.steps;
                combatTexts.push(new CombatText(arrow.x, box.y + box.height, 'Absorbed', '#9CC0FF', false));
            }
            continue;
        }

        if (fight.shielded) {
            fight.shielded = false;
            fight.shieldIn = fight.stats.shieldEvery;
            combatTexts.push(new CombatText(fight.x, box.y + box.height * 0.5, 'Shield broken!', '#D9A8FF', true));
            for (let i = 0; i < 24; i++) {
                particles.push(new Particle(fight.x + (Math.random() - 0.5) * box.width * 1.4, box.y + Math.random() * box.height, '#B048F8'));
            }
        }

        // The hunter's crit with what his set and the things he caught add, and the shot's own
        const critChance = Math.min(getCurrentTotalCritRating(gameState) + (arrow.critBonus || 0), gameState.critRatingCap);
        const isCrit = Math.random() < critChance;
        // What the arrow does: the hunter's attack power, what his set adds to this kind of
        // shot and against bosses, the boss's armor (which an Arcane Shot goes through), how
        // weakened the boss is, and the crit (utils/stats.js)
        const set = gameState.setBonus || {};
        // The arrows of one Multishot that land on it: the first three in full, then less and
        // less (bosses.multishotFalloff), so from right under it all five are not five times one
        let worth = arrow.arcane ? gameConfig.bosses.arcaneDamage : 1;
        if (arrow.volley) {
            const falloff = gameConfig.bosses.multishotFalloff;
            worth *= falloff[arrow.volley.bossHits] ?? 0;
            arrow.volley.bossHits++;
        }
        const damage = arrowDamage({
            base: gameConfig.bosses.arrowDamage,
            attackPower: gameState.attackPower || 0,
            worth,
            shotBonus: arrow.arcane ? set.arcane || 0 : arrow.multishot ? set.multishot || 0 : 0,
            // (what its armor takes off, as a share)
            bossArmor: armorReduction(fight.stats.armor || 0, gameConfig.stats),
            ignoresArmor: Boolean(arrow.arcane),
            weakened,
            bossDamage: set.bossDamage || 0,
            crit: isCrit ? gameState.critMultiplier : 1,
        });

        fight.health = Math.max(0, fight.health - damage);
        const dealt = fight.dealt;
        dealt[arrow.arcane ? 'arcane' : arrow.multishot ? 'multishot' : 'arrow'] += damage;
        if (isCrit) dealt.crit += damage;
        if (charging) dealt.charging += damage;
        dealt.hits++;
        fight.hitFlash = HIT_FLASH_STEPS;
        combatTexts.push(new CombatText(arrow.x, box.y + box.height, isCrit ? `${damage} CRIT!` : `${damage}`, isCrit ? '#FF6B00' : arrow.arcane ? '#D9A8FF' : '#FFFFFF', isCrit));
    }
}

// An arrow that will land on the boss within the time it can see ahead, if there is one.
// Returns where across the boss it would land (-1 its left edge .. 1 its right edge).
function incomingArrow(canvas) {
    const box = hitBox(canvas);
    const bottom = box.y + box.height;
    const margin = box.width * 0.15;

    for (const arrow of window.arrows) {
        if (arrow.velocityY >= 0 || arrow.y < bottom) continue;

        const steps = (arrow.y - bottom) / -arrow.velocityY;
        if (steps > gameConfig.bosses.dodge.seesAhead) continue;

        const landsAt = arrow.x + arrow.velocityX * steps;
        if (landsAt > box.x - margin && landsAt < box.x + box.width + margin) {
            return (landsAt - (box.x + box.width / 2)) / (box.width / 2);
        }
    }
    return null;
}

// ----- Movement -----

// The furthest the boss may go to either side: on the field, and never under a HUD panel
function reach(canvas) {
    const { width } = layout(canvas, fight.boss);
    const clear = spaceClearOfPanels(canvas);
    const left = Math.max(width * 0.35, clear.left + width * 0.4);
    const right = Math.min(canvas.logicalWidth - width * 0.35, clear.right - width * 0.4);

    return left < right ? { left, right } : { left: canvas.logicalWidth / 2, right: canvas.logicalWidth / 2 };
}

function moveTowards(canvas, target, fastest) {
    const { left, right } = reach(canvas);
    const goal = Math.max(left, Math.min(right, target));
    fight.x += Math.max(-fastest, Math.min(fastest, goal - fight.x));
}

// On the move: a sweep along the top, drawn towards the player, with sidesteps out of the way
// of arrows it sees coming
function move(context) {
    const { canvas, player } = context;
    const { movement, dodge } = gameConfig.bosses;
    const { left, right } = reach(canvas);
    const body = hitBox(canvas).width;

    if (fight.dodgeIn > 0) fight.dodgeIn--;

    // A sidestep under way
    if (fight.dodgeSteps > 0) {
        fight.dodgeSteps--;
        fight.x = Math.max(left, Math.min(right, fight.x + fight.dodgeDirection * body * dodge.distance / dodge.steps));
        return;
    }

    // One decided on, after the moment it takes to react
    if (fight.reactingFor >= 0) {
        if (fight.reactingFor-- === 0) {
            fight.dodgeSteps = dodge.steps;
            fight.dodgeIn = fight.stats.dodgeCooldown;
        }
    } else if (fight.dodgeIn <= 0 && !fight.shielded) {
        // Nothing to fear from ordinary arrows behind a shield, so it does not bother
        const landsAt = incomingArrow(canvas);
        if (landsAt !== null) {
            // Away from where the arrow will land; from dead centre, to the side with more room
            const away = Math.abs(landsAt) > 0.2 ? -Math.sign(landsAt) : (fight.x - left > right - fight.x ? -1 : 1);
            const room = away < 0 ? fight.x - left : right - fight.x;
            fight.dodgeDirection = room > body * dodge.distance * 0.5 ? away : -away;
            fight.reactingFor = Math.round(fight.stats.dodgeReaction);
        }
    }

    fight.sweep += Math.PI * 2 / (fight.stats.sweepSeconds * 60);
    const sweepX = (left + right) / 2 + Math.sin(fight.sweep) * (right - left) / 2;
    const target = sweepX + (player.x + player.width / 2 - sweepX) * movement.towardsPlayer;
    moveTowards(canvas, target, canvas.logicalWidth * movement.speed);
}

// ----- Attacks -----

// Whether the player is right under the boss, where a swipe reaches
function withinReach(context) {
    const body = playerBody(context.player);
    const box = hitBox(context.canvas);
    const reach = box.height * gameConfig.bosses.melee.reach;

    return body.y < box.y + box.height + reach
        && body.x + body.width > box.x - box.width * 0.4
        && body.x < box.x + box.width * 1.4;
}

// ----- The storm -----
// The last boss of each side calls a storm down over half the field once it is below half
// health: the ground is marked, then it comes down. It goes on beside the boss's own attacks.

function updateStorm(context) {
    const { gameState, canvas, player, particles } = context;
    const { boss, stats } = fight;
    const settings = gameConfig.bosses.storm;
    if (!boss.storm) return;

    if (!fight.storm) {
        if (fight.health > stats.health * settings.belowHealth || ++fight.sinceStorm < settings.every) return;

        // The half the player stands in, so they have to cross
        const middle = canvas.logicalWidth / 2;
        const onLeft = playerBody(player).centerX < middle;
        fight.storm = { left: onLeft ? 0 : middle, right: onLeft ? middle : canvas.logicalWidth, steps: 0 };
        addNotification(gameState, `${boss.name} calls down ${boss.storm.name}! Cross to the other side`, 300, '#FF6B35');
        return;
    }

    const storm = fight.storm;
    storm.steps++;
    const falling = storm.steps - settings.warning;

    if (falling >= settings.lasts) {
        fight.storm = null;
        fight.sinceStorm = 0;
        return;
    }
    if (falling < 0) return;

    if (falling % settings.hitEvery === 0) {
        const body = playerBody(player);
        if (body.centerX > storm.left && body.centerX < storm.right) {
            // Only its first hit is heard: the storm itself is plain to see
            hurtPlayer(context, Math.max(1, Math.round(stats.damage * settings.damage * enrage())), { quiet: falling > 0 });
        }
    }
    // Sparks where it lands
    if (falling % 4 === 0) {
        const floorTop = canvas.logicalHeight * (1 - gameConfig.player.movableArea.heightPercent);
        particles.push(new Particle(
            storm.left + Math.random() * (storm.right - storm.left),
            floorTop + Math.random() * (canvas.logicalHeight - floorTop),
            `rgb(${boss.storm.color})`
        ));
    }
}

// The storm's picture at the size it is drawn at, made once: stamping the big original
// several times a frame would cost more than the rest of the fight together
let stormSprite = null;

function stormPicture(path, width) {
    const image = load(path);
    if (!image.complete || !image.naturalWidth) return null;

    const size = Math.max(32, Math.round(width));
    if (!stormSprite || stormSprite.path !== path || stormSprite.canvas.width !== size) {
        const sprite = document.createElement('canvas');
        sprite.width = size;
        sprite.height = Math.round(size * image.naturalHeight / image.naturalWidth);
        const spriteCtx = sprite.getContext('2d');
        spriteCtx.imageSmoothingQuality = 'high';
        spriteCtx.drawImage(image, 0, 0, sprite.width, sprite.height);
        stormSprite = { path, canvas: sprite };
    }
    return stormSprite.canvas;
}

function drawStorm(ctx, canvas, pulse) {
    const storm = fight.storm;
    const settings = gameConfig.bosses.storm;
    const { color, image } = fight.boss.storm;
    const top = layout(canvas, fight.boss).top;
    const width = storm.right - storm.left;
    const height = canvas.logicalHeight - top;
    const falling = storm.steps - settings.warning;

    // The ground it is called down on: marked first, burning after
    ctx.fillStyle = `rgba(${color}, ${(falling < 0 ? 0.34 : 0.2) * pulse})`;
    ctx.fillRect(storm.left, top, width, height);
    ctx.strokeStyle = `rgba(${color}, ${0.9 * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(storm.left + 1.5, top, width - 3, height - 1.5);
    if (falling < 0) return;

    // Two columns of the picture falling through the half, one a little behind the other
    const sprite = stormPicture(image, width * 0.48);
    if (!sprite) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(storm.left, top, width, height);
    ctx.clip();
    // Fades in as it starts and out as it ends
    ctx.globalAlpha = Math.min(1, falling / 15, (settings.lasts - falling) / 20);
    const gap = sprite.height * 1.15;
    for (let column = 0; column < 2; column++) {
        const x = storm.left + width * (0.02 + column * 0.5);
        const offset = (falling * canvas.logicalHeight * 0.012 + column * gap * 0.5) % gap;
        for (let y = top - gap + offset; y < canvas.logicalHeight; y += gap) {
            ctx.drawImage(sprite, x, y);
        }
    }
    ctx.restore();
}

// Wind up an attack that is not part of the boss's round: the swipe at a player who stays
// within reach, and the row every boss sends down now and then
function windUpExtra(attack) {
    fight.attack = attack;
    fight.doing = 'winding';
    fight.doingSteps = 0;
    fight.attackData = null;
    fight.reactingFor = -1;
}

// How much faster the boss attacks for being weakened: the price of waiting for it to weaken
function frenzy() {
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);
    const full = gameConfig.bosses.maxWeakened - 1;

    return full > 0 ? 1 + (weakened - 1) / full * fight.stats.frenzy : 1;
}

// Begin winding up the next attack in the boss's round
function windUp(context) {
    const { canvas, player } = context;
    const round = behaviours[fight.boss.behaviour];
    const body = playerBody(player);

    fight.attack = round[fight.nextAttack % round.length];
    fight.nextAttack++;
    fight.doing = 'winding';
    fight.doingSteps = 0;
    fight.attackData = null;
    fight.reactingFor = -1;

    if (fight.attack === 'charge') {
        // The lane it will come down: where the player stands now
        const { left, right } = reach(canvas);
        fight.attackData = { x: Math.max(left, Math.min(right, body.centerX)), hit: false };
    } else if (fight.attack === 'sidecharge') {
        // From the side he is further from, so the dash crosses the field to reach him; the room
        // to get out of its way opens up as it winds up
        fight.attackData = { side: body.centerX > canvas.logicalWidth / 2 ? -1 : 1, lane: groundStrip(context) };
        context.gameState.moveRaise = 1;
    } else if (GROUND_STRIKES[fight.attack]) {
        // The one safe patch of ground: near enough to reach, not where the player already is
        const width = body.width * 2.6;
        const side = body.centerX < canvas.logicalWidth / 2 ? 1 : -1;
        const away = canvas.logicalWidth * (0.18 + Math.random() * 0.14);
        // With a row still coming down, the safe patch is under the gap in it: the two can be
        // lived through by moving, without having to shoot a way out
        const rowFalling = fight.rowGap !== undefined && (context.fireballs || []).some(projectile => projectile.fromRow);
        const wanted = rowFalling ? fight.rowGap : body.centerX + side * away;
        const center = Math.max(width / 2, Math.min(canvas.logicalWidth - width / 2, wanted));
        fight.attackData = { left: center - width / 2, right: center + width / 2 };
    }
}

// The wind-up is over: carry the attack out. Most are done in the instant; a charge and a
// vanishing take time ("acting").
function strike(context) {
    const { canvas, player, particles } = context;
    const body = playerBody(player);
    const { width } = layout(canvas, fight.boss);

    fight.doing = 'moving';
    fight.sinceAttack = 0;

    switch (fight.attack) {
        case 'throw':
            // Where it stands, or at the player when they are out where it cannot follow
            throwProjectile(context, Math.abs(body.centerX - fight.x) > width * 0.5 ? body.centerX : fight.x);
            break;
        case 'row':
            throwRow(context);
            break;
        case 'upheaval':
            startUpheaval(context);
            addNotification(context.gameState, `${fight.boss.name} ${fight.boss.upheaval || 'turns gravity over'}! Danger from every side`, 300, '#C77DFF');
            playScreamSound();
            break;
        case 'riot':
            fight.riot = { steps: 0, thrown: 0, fromLeft: Math.random() < 0.5 };
            addNotification(context.gameState, `${fight.boss.name} starts a riot! Watch the sides`, 240, '#FF6B35');
            break;
        case 'swipe':
            if (withinReach(context)) {
                hurtPlayer(context, Math.round(fight.stats.damage * gameConfig.bosses.melee.damage * enrage()));
                for (let i = 0; i < 24; i++) {
                    particles.push(new Particle(body.centerX + (Math.random() - 0.5) * body.width * 2, body.centerY + (Math.random() - 0.5) * body.height, '#FF4500'));
                }
            }
            // The round of attacks carries on from where it was
            fight.sinceAttack = Math.round(fight.stats.throwEvery / 2);
            fight.closeFor = 0;
            break;
        case 'fan':
            throwFan(context);
            break;
        case 'bolt':
            throwProjectile(context, fight.x, { follows: true });
            break;
        case 'curse':
            castCurse(context);
            break;
        case 'bomb':
            fight.bombs.push({
                fromX: fight.x,
                fromY: layout(canvas, fight.boss).top + layout(canvas, fight.boss).height * 0.6,
                x: body.centerX,
                y: body.centerY,
                radius: body.width * 1.5,
                steps: 0
            });
            break;
        case 'stomp':
        case 'hex': {
            const safe = body.centerX > fight.attackData.left && body.centerX < fight.attackData.right;
            if (!safe) hurtPlayer(context, heavyDamage());
            // Dust along the ground that was struck
            for (let i = 0; i < 40; i++) {
                const x = Math.random() * canvas.logicalWidth;
                if (x > fight.attackData.left && x < fight.attackData.right) continue;
                particles.push(new Particle(x, body.y + body.height + Math.random() * body.height, GROUND_STRIKES[fight.attack].rises));
            }
            break;
        }
        case 'vanish':
        case 'charge':
            fight.doing = 'acting';
            fight.doingSteps = 0;
            break;
        case 'ambush':
            fight.doing = 'acting';
            fight.doingSteps = 0;
            fight.attackData = { phase: 'vanish', hit: false };
            break;
        case 'sidecharge':
            fight.doing = 'acting';
            fight.doingSteps = 0;
            fight.attackData = { ...fight.attackData, phase: 'dash', hit: false };
            break;
        case 'hook':
            // Where he stands now is marked; the hook follows in half a second
            fight.doing = 'acting';
            fight.doingSteps = 0;
            fight.attackData = { phase: 'mark', zone: markWhereHeIs(context, gameConfig.bosses.hook.width), head: null };
            break;
    }
}

// ----- The ambush and the side charge -----

// Where he usually is: from just under the highest he can usually rise to the bottom of the
// field. Anywhere in his usual room he is in it; only up in the room these attacks open up (a
// row of his own height more) is he clear of it.
function groundStrip(context) {
    const { canvas, player } = context;
    const usual = gameConfig.player.movableArea.rise;
    const top = canvas.logicalHeight - player.height - player.figureHeight() * (usual - 0.1);
    return { top, bottom: canvas.logicalHeight };
}

// Whether the hunter's body is in a marked patch { x, y, w, h }
function bodyIn(player, patch) {
    const body = player.getBodyBounds();
    return body.x < patch.x + patch.w && body.x + body.width > patch.x && body.y < patch.y + patch.h && body.y + body.height > patch.y;
}

// A mark where he is now, from as high as he can go (or he is) to the bottom, to strike there next
function markWhereHeIs(context, share) {
    const { canvas, player, gameState } = context;
    const body = playerBody(player);
    const w = player.width * share;
    const x = Math.max(0, Math.min(canvas.logicalWidth - w, body.centerX - w / 2));
    // Up to him, wherever he is: Dragon Cry's free flight is no way out of it
    const top = Math.min(movementBounds(canvas.logicalHeight, player, gameState).minY, player.y);
    return { x, y: top, w, h: canvas.logicalHeight - top };
}

// How long a mark stays before the strike: shorter for the later bosses and when enraged
function markSteps(steps) {
    return Math.round(steps * fight.stats.heavyWindUp / Math.sqrt(enrage()));
}

// Down on the ground, at a place: the boss drawn standing on the field's bottom
function standOnGround(canvas, x) {
    const place = layout(canvas, fight.boss);
    fight.x = x;
    fight.prevX = x;
    fight.drop = canvas.logicalHeight - place.top - place.height;
    fight.prevDrop = fight.drop;
}

// The strike on a marked patch: hits if he is in it
function strikePatch(context, patch, share) {
    const { player, particles, gameState } = context;
    if (bodyIn(player, patch)) {
        // Counted (for the boss lab: tools/boss-lab.mjs), then dealt as any heavy blow
        gameState.specialHits = gameState.specialHits || {};
        gameState.specialHits[`${fight.attack}:${fight.attackData.phase}`] = (gameState.specialHits[`${fight.attack}:${fight.attackData.phase}`] || 0) + 1;
        hurtPlayer(context, Math.round(heavyDamage() * share));
    }
    for (let i = 0; i < 24; i++) {
        particles.push(new Particle(patch.x + Math.random() * patch.w, patch.y + patch.h * (0.4 + Math.random() * 0.6), '#B48CFF'));
    }
}

// Back to its place at the top: it fades out where it is and in again up there, and the room
// it opened up closes over the same time, so the hunter is eased down, not dropped
function goHome(context, steps) {
    const { gameState } = context;
    const half = steps / 2;
    const s = fight.doingSteps;
    gameState.moveRaise = Math.max(0, 1 - s / steps);
    if (s < half) {
        fight.hidden = Math.min(1, s / half);
    } else {
        if (fight.drop) {
            fight.drop = 0;
            fight.prevDrop = 0;
        }
        fight.hidden = Math.max(0, 1 - (s - half) / half);
    }
    if (s >= steps) {
        fight.hidden = 0;
        fight.drop = 0;
        gameState.moveRaise = 0;
        fight.doing = 'moving';
        fight.sinceAttack = 0;
        fight.attackData = null;
    }
}

function nextPhase(phase) {
    fight.attackData.phase = phase;
    fight.doingSteps = 0;
}

function actAmbush(context) {
    const { canvas, player, gameState } = context;
    const settings = gameConfig.bosses.ambush;
    const data = fight.attackData;
    const s = fight.doingSteps;
    gameState.moveRaise = data.phase === 'home' ? gameState.moveRaise : 1;

    if (data.phase === 'vanish') {
        fight.hidden = Math.min(1, s / 12);
        if (s >= AMBUSH.vanish) {
            // The ground where he stands, wide: up is the way out
            const ground = groundStrip(context);
            const w = player.width * settings.width;
            const x = Math.max(0, Math.min(canvas.logicalWidth - w, playerBody(player).centerX - w / 2));
            data.zone = { x, y: ground.top, w, h: ground.bottom - ground.top };
            nextPhase('mark');
        }
    } else if (data.phase === 'mark') {
        if (s >= markSteps(AMBUSH.mark)) {
            standOnGround(canvas, data.zone.x + data.zone.w / 2);
            fight.hidden = 0;
            strikePatch(context, data.zone, settings.damage);
            nextPhase('strike');
        }
    } else if (data.phase === 'strike') {
        if (s >= AMBUSH.strike) {
            // Gone again, and behind him: where he is now
            fight.hidden = 1;
            data.zone = markWhereHeIs(context, settings.backstabWidth);
            nextPhase('backMark');
        }
    } else if (data.phase === 'backMark') {
        if (s >= markSteps(AMBUSH.backMark)) {
            standOnGround(canvas, data.zone.x + data.zone.w / 2);
            fight.hidden = 0;
            strikePatch(context, data.zone, settings.damage);
            nextPhase('back');
        }
    } else if (data.phase === 'back') {
        if (s >= AMBUSH.back) nextPhase('home');
    } else {
        goHome(context, AMBUSH.home);
    }
}

function actSideCharge(context) {
    const { canvas, player, gameState } = context;
    const settings = gameConfig.bosses.sideCharge;
    const data = fight.attackData;
    const s = fight.doingSteps;
    if (data.phase !== 'home') gameState.moveRaise = 1;

    if (data.phase === 'dash') {
        // From one edge of the field to the other, along the ground, quickly
        const { width } = layout(canvas, fight.boss);
        const from = data.side < 0 ? -width / 2 : canvas.logicalWidth + width / 2;
        const to = data.side < 0 ? canvas.logicalWidth + width / 2 : -width / 2;
        standOnGround(canvas, from + (to - from) * Math.min(1, s / SIDE.dash));
        if (s === 0) fight.prevX = from;
        fight.hidden = 0;
        const ground = groundStrip(context);
        const body = hitBox(canvas).width;
        if (!data.hit && bodyIn(player, { x: fight.x - body / 2, y: ground.top, w: body, h: ground.bottom - ground.top })) {
            data.hit = true;
            gameState.specialHits = gameState.specialHits || {};
            gameState.specialHits['sidecharge:dash'] = (gameState.specialHits['sidecharge:dash'] || 0) + 1;
            hurtPlayer(context, Math.round(heavyDamage() * settings.damage));
        }
        if (s >= SIDE.dash) {
            fight.hidden = 1;
            data.zone = markWhereHeIs(context, gameConfig.bosses.ambush.backstabWidth);
            nextPhase('mark');
        }
    } else if (data.phase === 'mark') {
        if (s >= markSteps(SIDE.mark)) {
            standOnGround(canvas, data.zone.x + data.zone.w / 2);
            fight.hidden = 0;
            strikePatch(context, data.zone, settings.strikeDamage);
            nextPhase('strike');
        }
    } else if (data.phase === 'strike') {
        if (s >= SIDE.strike) nextPhase('home');
    } else {
        goHome(context, SIDE.home);
    }
}

// ----- Stitches' hook -----

// Where the hook leaves the boss: his hand
function hookHand(canvas) {
    const place = layout(canvas, fight.boss);
    return { x: fight.x - place.width / 2 + place.width * HOOK_ART.hand[0], y: place.top + fight.drop + place.height * HOOK_ART.hand[1] };
}

// Where he is dragged to: under the boss, as close as he can be held (utils/movement.js)
function pulledTo(context) {
    const { canvas, player, gameState } = context;
    const top = gameState.moveCeiling !== null && gameState.moveCeiling !== undefined ? gameState.moveCeiling : movementBounds(canvas.logicalHeight, player, gameState).minY;
    const x = Math.max(0, Math.min(canvas.logicalWidth - player.width, fight.x - player.width / 2));
    return { x, y: Math.min(canvas.logicalHeight - player.height, top) };
}

function letGo(context) {
    context.gameState.hooked = null;
    fight.doing = 'moving';
    fight.sinceAttack = 0;
    fight.attackData = null;
}

function actHook(context) {
    const { player, particles, gameState, canvas } = context;
    const settings = gameConfig.bosses.hook;
    const data = fight.attackData;
    const s = fight.doingSteps;
    const hand = hookHand(canvas);
    const target = { x: data.zone.x + data.zone.w / 2, y: player.y + player.height * 0.4 };

    if (data.phase === 'mark') {
        // Half a second, however far into the fight: the time to get out of the mark
        if (s >= Math.round(settings.markSeconds * 60)) {
            data.to = target;
            nextPhase('fly');
        }
    } else if (data.phase === 'fly') {
        // Very fast, straight at the mark
        const t = Math.min(1, s / settings.flySteps);
        data.head = { x: hand.x + (data.to.x - hand.x) * t, y: hand.y + (data.to.y - hand.y) * t };
        if (s >= settings.flySteps) {
            if (bodyIn(player, data.zone)) {
                gameState.specialHits = gameState.specialHits || {};
                gameState.specialHits['hook:fly'] = (gameState.specialHits['hook:fly'] || 0) + 1;
                data.from = { x: player.x, y: player.y };
                gameState.hooked = true;
                nextPhase('pull');
            } else {
                data.from = { ...data.head };
                nextPhase('reel');
            }
        }
    } else if (data.phase === 'reel') {
        // Caught nothing: back to his hand
        const t = Math.min(1, s / HOOK_REEL_STEPS);
        data.head = { x: data.from.x + (hand.x - data.from.x) * t, y: data.from.y + (hand.y - data.from.y) * t };
        if (s >= HOOK_REEL_STEPS) letGo(context);
    } else if (data.phase === 'pull') {
        // Dragged in, whatever he does (systems/inputSystem.js leaves him be while hooked)
        const to = pulledTo(context);
        const t = Math.min(1, s / settings.pullSteps);
        const eased = 1 - (1 - t) * (1 - t);
        player.x = data.from.x + (to.x - data.from.x) * eased;
        player.y = data.from.y + (to.y - data.from.y) * eased;
        data.head = { x: player.x + player.width / 2, y: player.y + player.height * 0.4 };
        if (s >= settings.pullSteps) {
            hurtPlayer(context, Math.round(heavyDamage() * settings.damage));
            const body = playerBody(player);
            for (let i = 0; i < 24; i++) {
                particles.push(new Particle(body.centerX + (Math.random() - 0.5) * body.width, body.centerY + (Math.random() - 0.5) * body.height, '#9BC53D'));
            }
            nextPhase('hold');
        }
    } else {
        // Held a moment under him, then let go
        const to = pulledTo(context);
        player.x = to.x;
        player.y = to.y;
        data.head = { x: player.x + player.width / 2, y: player.y + player.height * 0.4 };
        if (s >= settings.holdSteps) letGo(context);
    }
}

// Whether Stitches is busy with his hook: drawn without the one painted in his hand
function hooking() {
    return fight && fight.phase === 'fight' && fight.attack === 'hook' && fight.doing !== 'moving';
}

// How far along the phase of the hook he is in, 0 to 1
function hookProgress() {
    const settings = gameConfig.bosses.hook;
    if (fight.doing === 'winding') return Math.min(1, fight.doingSteps / WIND_UP.hook);
    const phase = fight.attackData && fight.attackData.phase;
    const steps = { mark: settings.markSeconds * 60, fly: settings.flySteps, pull: settings.pullSteps, hold: settings.holdSteps, reel: HOOK_REEL_STEPS }[phase] || 1;
    return Math.min(1, fight.doingSteps / steps);
}

// How he leans as he throws and hauls: small, rigid, for the look only (the art's bossPose)
function hookPose(place) {
    const phase = fight.doing === 'winding' ? 'windup' : fight.attackData && fight.attackData.phase;
    const p = stillMotion() ? 0 : Math.sin(Math.PI * hookProgress());
    let angle = 0, dx = 0, sx = 1, sy = 1;
    if (phase === 'windup' || phase === 'mark') { angle = -0.012 * p; sx = 1 + 0.012 * p; sy = 1 - 0.008 * p; }
    if (phase === 'fly') { angle = 0.027 * p; dx = place.w * 0.013 * p; }
    if (phase === 'pull') { angle = -0.026 * p; dx = -place.w * 0.02 * p; sx = 1 - 0.009 * p; }
    if (phase === 'reel') angle = -0.012 * p;
    const pivot = { x: place.x + place.w * 0.5, y: place.y + place.h * 0.94 };
    const a = Math.cos(angle) * sx, b = Math.sin(angle) * sx, c = -Math.sin(angle) * sy, d = Math.cos(angle) * sy;
    const e = pivot.x + dx - a * pivot.x - c * pivot.y, f = pivot.y - b * pivot.x - d * pivot.y;
    const x = place.x + place.w * HOOK_ART.hand[0], y = place.y + place.h * HOOK_ART.hand[1];
    return { matrix: [a, b, c, d, e, f], hand: { x: a * x + c * y + e, y: b * x + d * y + f } };
}

// Where the boss picture is drawn this frame
function drawnPlace(canvas, alpha) {
    const place = layout(canvas, fight.boss);
    const x = fight.prevX + (fight.x - fight.prevX) * alpha;
    const y = place.top + fight.prevDrop + (fight.drop - fight.prevDrop) * alpha;
    return { x: x - place.width / 2, y, w: place.width, h: place.height };
}

// The hook's mark: exactly where it will land, red as every place not to stand, hatched, with a
// dark-backed amber edge that reads on any ground
function drawHookMark(ctx, zone) {
    const { x, y, w, h } = zone;
    const pulse = stillMotion() ? 1 : 0.88 + 0.12 * Math.sin(Math.PI * 2 * hookProgress());
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = `rgba(241, 43, 29, ${0.22 * pulse})`;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255, 90, 55, 0.3)';
    ctx.lineWidth = 1;
    for (let k = -h; k < w + h; k += 34) {
        ctx.beginPath();
        ctx.moveTo(x + k, y + h);
        ctx.lineTo(x + k + h, y);
        ctx.stroke();
    }
    ctx.restore();
    ctx.save();
    ctx.lineJoin = 'round';
    for (const [color, width] of [['rgba(35, 11, 7, 0.9)', 6], ['#FFAF6B', 2.5]]) {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.strokeRect(x, y, w, h);
    }
    // Brackets in its lower corners, and the hook in it
    const arm = Math.min(18, w * 0.16);
    const lower = y + h - 12;
    ctx.strokeStyle = '#FFD0A0';
    ctx.lineWidth = 4;
    for (const edge of [x, x + w]) {
        const dir = edge === x ? 1 : -1;
        ctx.beginPath();
        ctx.moveTo(edge + dir * arm, lower);
        ctx.lineTo(edge, lower);
        ctx.lineTo(edge, lower - arm);
        ctx.stroke();
    }
    const hook = load(HOOK_ART.hook);
    if (hook.complete && hook.naturalWidth) {
        const ih = Math.min(44, h * 0.15);
        const iw = ih * 192 / 320;
        ctx.globalAlpha = 0.85;
        ctx.drawImage(hook, x + w / 2 - iw / 2, y + h - ih - 10, iw, ih);
    }
    ctx.restore();
}

// The chain from his hand to the hook, the hook, and his fingers over the chain. Drawn over the
// hunter (systems/renderSystem.js), so a caught hunter has the hook in him, not behind him.
export function drawBossHook(ctx, canvas, alpha = 1) {
    if (!hooking() || fight.hidden > 0.5) return;
    const chain = load(HOOK_ART.chain), hook = load(HOOK_ART.hook), grip = load(HOOK_ART.grip);
    if (!chain.complete || !chain.naturalWidth || !hook.complete || !hook.naturalWidth) return;
    const place = drawnPlace(canvas, alpha);
    const pose = hookPose(place);
    const hand = pose.hand;
    const data = fight.attackData;
    const head = data && data.head ? data.head : { x: hand.x, y: hand.y + place.w * HOOK_ART.dangle };
    const dx = head.x - hand.x, dy = head.y - hand.y;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    const width = Math.max(3, place.w * HOOK_ART.chainWidth);

    ctx.save();
    // The chain: its links repeated along it, never stretched
    if (length > 0.5) {
        const period = width * 160 / 64;
        ctx.save();
        ctx.translate(hand.x, hand.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(-width / 2, 0, width, length);
        ctx.clip();
        for (let y = 0; y < length; y += period) ctx.drawImage(chain, -width / 2, y, width, period);
        ctx.restore();
    }
    // The hook, hung from its eye
    const scale = place.w * HOOK_ART.hookSize / 320;
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    ctx.drawImage(hook, -HOOK_ART.eye[0] * scale, -HOOK_ART.eye[1] * scale, 192 * scale, 320 * scale);
    if (!stillMotion() && data && data.phase === 'fly') {
        // A streak behind it, as it flies
        ctx.strokeStyle = 'rgba(255, 214, 164, 0.55)';
        ctx.lineWidth = Math.max(1, width * 0.16);
        ctx.beginPath();
        ctx.moveTo(-width, 14 * scale);
        ctx.lineTo(-width, -Math.min(26, length * 0.2));
        ctx.stroke();
    }
    ctx.restore();
    // His fingers, closed over the chain
    if (grip.complete && grip.naturalWidth) {
        ctx.globalAlpha = 1 - fight.hidden;
        ctx.transform(...pose.matrix);
        ctx.drawImage(grip, place.x, place.y, place.w, place.h);
    }
    ctx.restore();
}

// Carrying out an attack that takes time
function act(context) {
    const { canvas, player } = context;
    const { left, right } = reach(canvas);

    if (fight.attack === 'ambush') return actAmbush(context);
    if (fight.attack === 'sidecharge') return actSideCharge(context);
    if (fight.attack === 'hook') return actHook(context);

    if (fight.attack === 'vanish') {
        // Gone, then back on the far side of the player with a fan of blades
        const fade = 12;
        fight.hidden = Math.min(1, fight.doingSteps / fade, (VANISHED_STEPS - fight.doingSteps) / fade);

        if (fight.doingSteps === Math.floor(VANISHED_STEPS / 2)) {
            const playerX = player.x + player.width / 2;
            fight.x = playerX < (left + right) / 2 ? right - Math.random() * (right - left) * 0.25 : left + Math.random() * (right - left) * 0.25;
            fight.prevX = fight.x;
        }
        if (fight.doingSteps >= VANISHED_STEPS) {
            fight.hidden = 0;
            fight.doing = 'moving';
            fight.sinceAttack = 0;
            throwFan(context);
        }
        return;
    }

    if (fight.attack === 'charge') {
        // Down the lane to the bottom of the field and back up
        const place = layout(canvas, fight.boss);
        const depth = canvas.logicalHeight - place.top - place.height;
        fight.drop = Math.sin(Math.PI * fight.doingSteps / CHARGE_STEPS) * depth;

        const box = hitBox(canvas);
        const touching = player.isHitBy(box);
        if (touching && !fight.attackData.hit) {
            fight.attackData.hit = true;
            hurtPlayer(context, heavyDamage());
        }

        if (fight.doingSteps >= CHARGE_STEPS) {
            fight.drop = 0;
            fight.doing = 'moving';
            fight.sinceAttack = 0;
        }
    }
}

// Things lobbed at the player fly to where they stood, lie there a moment, and burst
function updateBombs(context) {
    const { player, particles } = context;

    fight.bombs = fight.bombs.filter(bomb => {
        bomb.steps++;
        if (bomb.steps < BOMB_FLIGHT_STEPS + BOMB_FUSE_STEPS) return true;

        if (player.isHitBy({ x: bomb.x, y: bomb.y, radius: bomb.radius })) {
            hurtPlayer(context, heavyDamage());
        } else {
            // A burst that missed: softer than a hit
            playFireballImpactSound({ volume: 0.35 });
        }
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(bomb.x + (Math.random() - 0.5) * bomb.radius, bomb.y + (Math.random() - 0.5) * bomb.radius, '#FF6B35'));
        }
        return false;
    });
}

function defeat(context) {
    const { gameState, canvas, particles } = context;
    const { boss } = fight;
    const { top, height } = layout(canvas, boss);
    const { reward } = fight.stats;
    // How long the fight took, before the dying starts its own clock
    const seconds = fightSeconds();

    fight.phase = 'dying';
    gameState.hooked = null;
    fight.steps = 0;
    fight.shielded = false;
    fight.hidden = 0;
    fight.drop = 0;
    fight.bombs = [];
    fight.storm = null;
    fight.upheaval = null;
    fight.doing = 'moving';
    defeated.push(boss.id);
    passed.push(boss.id);

    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(fight.x + (Math.random() - 0.5) * height * 0.6, top + Math.random() * height, '#FFD700'));
    }

    // More for bringing it down under its par time
    const fast = speedBonus(boss.zone, seconds, reward.score, gameConfig.bosses);
    gameState.score += reward.score + fast.score;
    gameState.health = Math.min(gameState.maxHealth, gameState.health + reward.health);
    addNotification(gameState, `${boss.name} is defeated! +${reward.score} points`, 360, '#FFD700');
    addNotification(gameState, fast.score > 0
        ? `Down in ${Math.round(seconds)}s, par ${fast.par}s: +${fast.score} for speed`
        : `Down in ${Math.round(seconds)}s (par ${fast.par}s)`, 360, '#FFE9A8');
    playTotalSound();
    if (context.onBossDefeated) {
        context.onBossDefeated(boss, {
            seconds: Math.round(seconds * 10) / 10,
            points: reward.score,
            speedPoints: fast.score,
            par: fast.par,
            arrows: fight.tally.arrows,
            damage: Math.round(fight.tally.damage),
            hits: fight.tally.hits,
        }, { x: fight.x, y: top + height * 0.5 });
    }
}

/**
 * Advance the fight by one simulation step. Does nothing when there is no fight.
 * @param {object} context  { gameState, canvas, player, fireballs, powerUps, particles, combatTexts,
 *                            spellSystem, isValidYPosition, recentDropYPositions,
 *                            shouldDodge, showDodgeText, trackDodge, onBossDefeated }
 */
export function updateBoss(context) {
    if (!fight) return;

    const { gameState, canvas } = context;
    const { boss, stats } = fight;
    const settings = gameConfig.bosses;

    fight.steps++;
    if (fight.dazedSteps > 0) fight.dazedSteps--;

    // He is kept far enough below the boss (utils/movement.js), however the field is sized
    const standing = layout(canvas, boss);
    gameState.moveCeiling = standing.top + standing.height + context.player.figureHeight() * gameConfig.player.movableArea.bossGap;
    fight.prevX = fight.x;
    fight.prevDrop = fight.drop;
    if (fight.hitFlash > 0) fight.hitFlash--;

    if (fight.phase === 'intro') {
        if (fight.steps >= fight.introSteps) {
            fight.phase = 'fight';
            fight.steps = 0;
            // Something to shoot with from the first moment
            if (gameState.arrowCount < 25) dropPowerUp(context, settings.arrowBundle);
        }
        return;
    }

    if (fight.phase === 'dying') {
        if (fight.steps >= DYING_STEPS) {
            // With the boss gone the way to the next zone is open (see guardZone)
            fight = null;
        }
        return;
    }

    // Out of time: the boss enrages, and from then on attacks faster and hits harder
    const rage = enrage();
    if (rage > 1 && !fight.enraged) {
        fight.enraged = true;
        addNotification(gameState, `${boss.name} is enraged!`, 300, '#FF2020');
        playScreamSound();
    }

    // Help falls now and then: Haste, a shield, or Reverse Gravity
    fight.helpIn -= 1 / 60;
    if (fight.helpIn <= 0) {
        fight.helpIn = helpAfter();
        dropHelp(context);
    }

    // The shield goes up when its time comes and stays until an Arcane Shot breaks it
    if (!fight.shielded) {
        fight.shieldIn -= 1 / 60;
        if (fight.shieldIn <= 0) {
            fight.shielded = true;
            addNotification(gameState, `${boss.name} is shielded! Break it with Arcane Shot (${keyName('arcane_shot')})`, 300, '#B048F8');
        }
    }

    fight.doingSteps++;
    if (fight.doing === 'moving') {
        move(context);
        // Too close for too long, and it swipes; stepping back cools it down again
        fight.closeFor = withinReach(context) ? fight.closeFor + 1 : Math.max(0, fight.closeFor - 2);
        // Enraged it attacks faster, and so it does the weaker it gets; dazed by Thunderfury's
        // lightning, slower
        const tempo = rage * frenzy() * (fight.dazedSteps > 0 ? fight.daze : 1);
        fight.sinceVolley++;
        fight.sinceAttack++;
        if (fight.dodgeSteps > 0) {
            // Busy sidestepping
        } else if (fight.closeFor >= settings.melee.patience) {
            windUpExtra('swipe');
        } else if (fight.upheaval) {
            // Its own attacks wait while the field is turned over
            fight.sinceVolley = Math.min(fight.sinceVolley, stats.volleyEvery / 2);
        } else if (fight.sinceVolley >= stats.volleyEvery / tempo) {
            fight.sinceVolley = 0;
            windUpExtra('row');
        } else if (fight.sinceAttack >= stats.throwEvery / tempo) {
            windUp(context);
        }
    } else if (fight.doing === 'winding') {
        // It lines up on the lane it means to charge down; otherwise it stands where it is
        if (fight.attack === 'charge') moveTowards(canvas, fight.attackData.x, canvas.logicalWidth * settings.movement.speed * 2.5);
        // Before a side charge it leaves the top for the edge it will come from: gone from there
        // while he rises into the room it opens, so it is no target for him up close
        if (fight.attack === 'sidecharge') fight.hidden = Math.min(1, fight.doingSteps / 12);
        const share = fight.attack === 'charge' || fight.attack === 'sidecharge' || GROUND_STRIKES[fight.attack] || fight.attack === 'swipe' || fight.attack === 'upheaval' ? stats.heavyWindUp : stats.windUp;
        if (fight.doingSteps >= WIND_UP[fight.attack] * share / Math.sqrt(rage)) strike(context);
    } else {
        act(context);
    }

    updateBombs(context);
    updateStorm(context);
    updateRiot(context);
    updateUpheaval(context);

    if (++fight.sinceArrows >= settings.arrowsEvery) {
        fight.sinceArrows = 0;
        dropPowerUp(context, settings.arrowBundle);
    }
    if (++fight.sincePotion >= settings.potionEvery) {
        fight.sincePotion = 0;
        dropPowerUp(context, 'health_potion');
    }

    takeArrowHits(context);
    keepTally(gameState);
    if (fight.health <= 0) defeat(context);
}

function drawHealthBar(ctx, canvas, place) {
    const { boss } = fight;
    const width = Math.min(canvas.logicalWidth * 0.62, place.barHeight * 22);
    const x = (canvas.logicalWidth - width) / 2;
    const y = place.barTop;
    const fill = fight.health / fight.stats.health;
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);
    const fontSize = Math.max(11, place.barHeight * 0.78);

    ctx.save();

    // Dark well with a gold edge, as on the game's panels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(x, y, width, place.barHeight);
    const red = ctx.createLinearGradient(0, y, 0, y + place.barHeight);
    red.addColorStop(0, '#d32f22');
    red.addColorStop(1, '#6c0a06');
    ctx.fillStyle = red;
    ctx.fillRect(x, y, width * fill, place.barHeight);
    ctx.strokeStyle = '#b9902f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, place.barHeight);

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'left';
    ctx.fillText(boss.name, x + 8, y + place.barHeight / 2 + 1);
    // What matters most right now: shielded, then enraged, then how weakened it is
    const state = fight.shielded ? ['Shielded', '#d9a8ff']
        : fight.enraged ? ['Enraged', '#ffb3a8']
        : weakened > 1.005 ? [`Weakened +${Math.round((weakened - 1) * 100)}%`, '#ffffff']
        : null;
    if (state) {
        ctx.fillStyle = state[1];
        ctx.textAlign = 'right';
        ctx.fillText(state[0], x + width - 8, y + place.barHeight / 2 + 1);
    }

    ctx.restore();
}

// The side charge's lane across the field, with arrows pointing the way it will come
function drawGroundLane(ctx, canvas, pulse) {
    const { lane, side } = fight.attackData;
    const height = lane.bottom - lane.top;
    ctx.fillStyle = `rgba(255, 60, 30, ${0.3 * pulse})`;
    ctx.fillRect(0, lane.top, canvas.logicalWidth, height);
    ctx.strokeStyle = `rgba(255, 190, 120, ${0.9 * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(0, lane.top, canvas.logicalWidth, height);
    // Chevrons along it, pointing the way of the dash
    const size = Math.min(height * 0.35, 40);
    const y = lane.top + height / 2;
    ctx.fillStyle = `rgba(255, 220, 160, ${0.85 * pulse})`;
    for (let i = 0; i < 6; i++) {
        const x = side < 0 ? 40 + i * size * 2.2 : canvas.logicalWidth - 40 - i * size * 2.2;
        ctx.beginPath();
        ctx.moveTo(x + side * -size * 0.5, y - size);
        ctx.lineTo(x + side * size * 0.5, y);
        ctx.lineTo(x + side * -size * 0.5, y + size);
        ctx.closePath();
        ctx.fill();
    }
}

// Where the boss will strike, shown while it winds up: the lane of a charge, the safe patch of
// a stomp. Drawn under everything else.
function drawWarnings(ctx, canvas, place) {
    const floorTop = canvas.logicalHeight * (1 - gameConfig.player.movableArea.heightPercent);
    const pulse = 0.55 + Math.sin(fight.steps * 0.35) * 0.25;

    ctx.save();

    if (fight.storm) drawStorm(ctx, canvas, pulse);
    if (fight.upheaval) drawUpheaval(ctx, canvas, pulse);

    if (fight.attack === 'charge' && fight.doing !== 'moving') {
        const width = place.width * 0.6;
        const top = place.top + place.height * 0.9;
        const lane = ctx.createLinearGradient(0, top, 0, canvas.logicalHeight);
        lane.addColorStop(0, 'rgba(255, 60, 30, 0)');
        lane.addColorStop(0.25, `rgba(255, 60, 30, ${0.3 * pulse})`);
        lane.addColorStop(1, `rgba(255, 60, 30, ${0.5 * pulse})`);
        ctx.fillStyle = lane;
        ctx.fillRect(fight.attackData.x - width / 2, top, width, canvas.logicalHeight - top);
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.8 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(fight.attackData.x - width / 2, top, width, canvas.logicalHeight - top);
    }

    // The side charge's lane: the ground across the field, its arrow on the side it comes from
    if (fight.attack === 'sidecharge' && fight.doing === 'winding' && fight.attackData && fight.attackData.lane) {
        drawGroundLane(ctx, canvas, pulse);
    }
    // Where the ambush, the backstab or the strike after a side charge will land
    const mark = fight.attackData && fight.attackData.zone && ['mark', 'backMark'].includes(fight.attackData.phase) ? fight.attackData.zone : null;
    if (fight.attack === 'hook' && fight.attackData && fight.attackData.phase === 'mark') drawHookMark(ctx, fight.attackData.zone);
    if (mark && (fight.attack === 'ambush' || fight.attack === 'sidecharge')) {
        const first = fight.attack === 'ambush' && fight.attackData.phase === 'mark';
        ctx.fillStyle = first ? `rgba(150, 70, 255, ${0.32 * pulse})` : `rgba(255, 60, 30, ${0.34 * pulse})`;
        ctx.fillRect(mark.x, mark.y, mark.w, mark.h);
        ctx.strokeStyle = first ? `rgba(210, 170, 255, ${0.9 * pulse})` : `rgba(255, 190, 120, ${0.9 * pulse})`;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 6]);
        ctx.strokeRect(mark.x, mark.y, mark.w, mark.h);
        ctx.setLineDash([]);
    }

    if (fight.attack === 'swipe' && fight.doing === 'winding') {
        // The ground under the boss that the swipe will reach
        const box = hitBox(canvas);
        const reach = box.height * gameConfig.bosses.melee.reach;
        const left = box.x - box.width * 0.4;
        const width = box.width * 1.8;
        ctx.fillStyle = `rgba(255, 60, 30, ${0.3 * pulse})`;
        ctx.fillRect(left, box.y, width, box.height + reach);
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.85 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(left, box.y, width, box.height + reach);
    }

    if ((fight.attack === 'riot' && fight.doing === 'winding') || fight.riot) {
        // Both edges of the field, where the stones will come in from: bright while the riot
        // is being called, fainter once it is under way
        const settings = gameConfig.bosses.riot;
        const top = canvas.logicalHeight * settings.from.top;
        const height = canvas.logicalHeight * (settings.from.bottom - settings.from.top);
        const width = canvas.logicalWidth * 0.06;
        const strength = (fight.riot ? 0.3 : 0.6) * pulse;

        for (const fromLeft of [true, false]) {
            const edge = fromLeft ? 0 : canvas.logicalWidth;
            const glow = ctx.createLinearGradient(edge, 0, edge + (fromLeft ? width : -width), 0);
            glow.addColorStop(0, `rgba(255, 60, 30, ${strength})`);
            glow.addColorStop(1, 'rgba(255, 60, 30, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(fromLeft ? 0 : canvas.logicalWidth - width, top, width, height);
        }
    }

    if (GROUND_STRIKES[fight.attack] && fight.doing === 'winding') {
        const { left, right } = fight.attackData;
        const height = canvas.logicalHeight - floorTop;
        // The ground that will be struck, and the one patch that will not
        ctx.fillStyle = `rgba(${GROUND_STRIKES[fight.attack].marked}, ${0.32 * pulse})`;
        ctx.fillRect(0, floorTop, left, height);
        ctx.fillRect(right, floorTop, canvas.logicalWidth - right, height);
        ctx.fillStyle = `rgba(90, 230, 120, ${0.28 + 0.12 * pulse})`;
        ctx.fillRect(left, floorTop, right - left, height);
        ctx.strokeStyle = 'rgba(190, 255, 200, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, floorTop, right - left, height);
    }

    // Things lobbed at the player: in the air, then lying where they will burst
    const picture = attackPicture(fight.boss);
    for (const bomb of fight.bombs) {
        const flight = Math.min(1, bomb.steps / BOMB_FLIGHT_STEPS);
        const fuse = Math.max(0, (bomb.steps - BOMB_FLIGHT_STEPS) / BOMB_FUSE_STEPS);
        const x = bomb.fromX + (bomb.x - bomb.fromX) * flight;
        // An arc: up a little, then down onto the spot
        const y = bomb.fromY + (bomb.y - bomb.fromY) * flight - Math.sin(flight * Math.PI) * place.height * 0.35;

        // The ground it will take with it, filling as the fuse burns
        ctx.fillStyle = `rgba(255, 60, 30, ${0.14 + 0.3 * fuse})`;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.5 + 0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (picture.complete && picture.naturalWidth) {
            const size = bomb.radius * 0.9 * (1 + fuse * 0.15 * Math.sin(bomb.steps * 0.6));
            const scale = size / Math.max(picture.naturalWidth, picture.naturalHeight);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(flight < 1 ? bomb.steps * 0.2 : 0);
            ctx.drawImage(picture, -picture.naturalWidth * scale / 2, -picture.naturalHeight * scale / 2, picture.naturalWidth * scale, picture.naturalHeight * scale);
            ctx.restore();
        }
    }

    ctx.restore();
}

/**
 * Draw the boss, its health bar and the warnings of what it is about to do.
 * @param {number} alpha  How far the display is between two simulation steps (0..1)
 */
export function drawBoss(ctx, canvas, alpha = 1) {
    if (!fight) return;

    const image = picture(fight.boss);
    const place = layout(canvas, fight.boss);
    const x = fight.prevX + (fight.x - fight.prevX) * alpha;
    let y = place.top + fight.prevDrop + (fight.drop - fight.prevDrop) * alpha;
    let opacity = 1 - fight.hidden;

    if (fight.phase === 'intro') {
        // Comes down from above the screen
        const progress = Math.min(1, fight.steps / fight.introSteps);
        y = place.top - (1 - progress) * (place.top + place.height);
    } else if (fight.phase === 'dying') {
        // Sinks and fades
        const progress = Math.min(1, fight.steps / DYING_STEPS);
        y = place.top + progress * place.height * 0.25;
        opacity = 1 - progress;
    }

    if (fight.phase === 'fight') drawWarnings(ctx, canvas, place);

    // Throwing his hook he is drawn without the one painted in his hand, and leans into it
    const clean = hooking() ? load(HOOK_ART.boss) : null;
    if (clean && clean.complete && clean.naturalWidth && image.complete && image.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = opacity;
        if (fight.doing === 'winding') {
            ctx.shadowColor = '#FF6D35';
            ctx.shadowBlur = 12;
        }
        const placeNow = { x: x - place.width / 2, y, w: place.width, h: place.height };
        ctx.transform(...hookPose(placeNow).matrix);
        ctx.drawImage(clean, placeNow.x, placeNow.y, placeNow.w, placeNow.h);
        ctx.restore();
    } else if (image.complete && image.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = opacity;
        // Winding up an attack, it glows: this is when it cannot sidestep
        if (fight.phase === 'fight' && fight.doing === 'winding') {
            ctx.shadowColor = '#FF5A2A';
            ctx.shadowBlur = 18 + Math.sin(fight.steps * 0.5) * 8;
        }
        // A hit knocks it back a little
        const recoil = fight.hitFlash > 0 ? -place.height * 0.015 : 0;
        ctx.drawImage(image, x - place.width / 2, y + recoil, place.width, place.height);
        ctx.restore();
    }

    // The shield: a violet bubble around the boss
    if (fight.shielded && fight.hidden < 0.5) {
        const centerY = y + place.height / 2;
        const pulse = 0.85 + Math.sin(fight.steps * 0.12) * 0.15;
        const bubble = ctx.createRadialGradient(x, centerY, place.height * 0.2, x, centerY, place.height * 0.62);
        bubble.addColorStop(0, 'rgba(176, 72, 248, 0)');
        bubble.addColorStop(0.75, `rgba(176, 72, 248, ${0.22 * pulse})`);
        bubble.addColorStop(1, `rgba(217, 168, 255, ${0.7 * pulse})`);

        ctx.save();
        ctx.fillStyle = bubble;
        ctx.beginPath();
        ctx.ellipse(x, centerY, place.width * 0.56, place.height * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(232, 200, 255, ${0.8 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    if (fight.phase !== 'dying') drawHealthBar(ctx, canvas, place);
}
