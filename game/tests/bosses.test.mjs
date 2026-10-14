// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../data/bosses.js', import.meta.url));
const { bosses, behaviours, ZONES_PER_SIDE, zoneForLevel, bossForZone, levelCap, bossStats, weakenedMultiplier, enrageMultiplier, speedBonus } =
    await import(`data:text/javascript;base64,${source.toString('base64')}`);
const backgroundSource = await readFile(new URL('../data/backgrounds.js', import.meta.url));
const { backgrounds } = await import(`data:text/javascript;base64,${backgroundSource.toString('base64')}`);

// The "bosses" settings of config/gameConfig.js
const rules = {
    health: { base: 240, perZone: 257 },
    armor: { base: 30, perZone: 6 },
    damage: { base: 8, perZone: 0.8 },
    throwEvery: { base: 75, perZone: 5, fastest: 45 },
    volleyEvery: { base: 450, perZone: 15, fastest: 300 },
    weakenPerSecond: 0.02,
    maxWeakened: 2,
    frenzy: { base: 0.6, perZone: 0.15, most: 2 },
    shield: { fromZone: 2, firstAfter: 12, every: 30, perZone: 1.5, shortest: 15 },
    enrage: { after: 100, perZone: 5, soonest: 50, atStart: 1.5, perSecond: 0.03, most: 4 },
    reward: { score: 100, scorePerZone: 50, health: 10 },
    dodge: { reaction: { base: 20, perZone: 1.5, fastest: 6 }, cooldown: { base: 100, perZone: 8, shortest: 28 }, chance: { base: 0.05, perZone: 0.01 } },
    windUp: { perZone: 0.05, least: 0.5, leastForHeavy: 0.7 },
    movement: { sweep: { base: 15, perZone: 0.8, fastest: 8 } },
    levelsPerZone: 2
};

test('every zone of each side has one boss, in the order of the backgrounds', () => {
    for (const side of ['alliance', 'horde']) {
        assert.equal(backgrounds[side].length, ZONES_PER_SIDE);
        for (let zone = 1; zone <= ZONES_PER_SIDE; zone++) {
            assert.ok(bossForZone(side, zone), `${side} zone ${zone} has no boss`);
        }
    }

    assert.equal(bosses.length, ZONES_PER_SIDE * 2);
    assert.equal(new Set(bosses.map(boss => boss.id)).size, bosses.length);
    // Hogger belongs to Elwynn Forest, the Alliance's second zone
    assert.equal(bossForZone('alliance', 2).id, 'hogger');
    assert.equal(backgrounds.alliance[1].id, 'elwynn-eastvale');
});

test('levels belong to zones, two to a zone, and come round again after the last', () => {
    assert.deepEqual([1, 2, 3, 4, 5, 20].map(level => zoneForLevel(level, 2)), [1, 1, 2, 2, 3, 10]);
    assert.equal(zoneForLevel(21, 2), 1);
});

test('a boss that still stands holds the level at the end of its zone', () => {
    assert.equal(levelCap('alliance', [], 2), 2);
    assert.equal(levelCap('alliance', ['garrick-padfoot'], 2), 4);
    // Stormwind (level 5) cannot be reached while Hogger is alive
    assert.equal(levelCap('alliance', ['garrick-padfoot', 'hogger'], 2), 6);
    assert.equal(levelCap('horde', ['garrick-padfoot', 'hogger'], 2), 2);
    assert.equal(levelCap('alliance', bosses.map(boss => boss.id), 2), Infinity);
});

test('every boss is harder than the one before, and the first has no shield', () => {
    const stats = Array.from({ length: ZONES_PER_SIDE }, (_, index) => bossStats(bossForZone('horde', index + 1), rules));

    for (let zone = 1; zone < ZONES_PER_SIDE; zone++) {
        assert.ok(stats[zone].health > stats[zone - 1].health);
        assert.ok(stats[zone].damage > stats[zone - 1].damage);
        assert.ok(stats[zone].throwEvery <= stats[zone - 1].throwEvery);
        assert.ok(stats[zone].enrageAfter <= stats[zone - 1].enrageAfter);
        // ...and sharper at getting out of the way of arrows
        assert.ok(stats[zone].dodgeReaction <= stats[zone - 1].dodgeReaction);
        assert.ok(stats[zone].dodgeCooldown <= stats[zone - 1].dodgeCooldown);
        assert.ok(stats[zone].sweepSeconds <= stats[zone - 1].sweepSeconds);
        assert.ok(stats[zone].windUp <= stats[zone - 1].windUp);
        assert.ok(stats[zone].heavyWindUp >= stats[zone].windUp);
    }

    // A boss is three levels above the last level of its zone
    assert.equal(stats[0].level, 5);
    assert.equal(stats[9].level, 23);

    assert.equal(stats[0].shieldAfter, null);
    assert.equal(stats[1].shieldAfter, 12);
    assert.equal(bossStats(bossForZone('alliance', 2), rules).health, 497);
});

test('a boss takes more damage the longer the fight lasts, but only up to a limit', () => {
    assert.equal(weakenedMultiplier(0, rules), 1);
    assert.equal(weakenedMultiplier(25, rules), 1.5);
    assert.equal(weakenedMultiplier(50, rules), 2);
    assert.equal(weakenedMultiplier(100000, rules), 2);
});

test('when its time is up a boss enrages, more every second, up to a limit', () => {
    assert.equal(enrageMultiplier(94, 95, rules), 1);
    assert.equal(enrageMultiplier(95, 95, rules), 1.5);
    assert.ok(enrageMultiplier(120, 95, rules) > enrageMultiplier(100, 95, rules));
    assert.equal(enrageMultiplier(100000, 95, rules), 4);
});

test('the pictures of every boss and of what it throws exist, in its own side\'s folders', async () => {
    for (const boss of bosses) {
        assert.ok(boss.image.startsWith(`assets/bosses/${boss.faction}/`));
        assert.ok(boss.attack.image.startsWith(`assets/attacks/${boss.faction}/`));
        assert.ok(boss.attack.name && boss.attack.size > 0, `${boss.id} has an incomplete attack`);
        await readFile(new URL(`../${boss.image}`, import.meta.url));
        await readFile(new URL(`../${boss.attack.image}`, import.meta.url));
    }
});

test('every boss fights in one of the known ways, and each way is used', () => {
    const known = Object.keys(behaviours);
    for (const boss of bosses) {
        assert.ok(known.includes(boss.behaviour), `${boss.id} has no known behaviour`);
    }
    for (const behaviour of known) {
        assert.ok(bosses.some(boss => boss.behaviour === behaviour), `no boss is a ${behaviour}`);
        assert.ok(behaviours[behaviour].length > 0);
    }
    // The first bosses are plain throwers
    assert.equal(bossForZone('alliance', 1).behaviour, 'thrower');
    assert.equal(bossForZone('alliance', 2).behaviour, 'brawler');
});

test('the settings in the game match the ones these tests describe', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    const section = config.slice(config.indexOf('    bosses: {'), config.indexOf('// === BACKGROUNDS ==='));
    const flat = text => text.replace(/\s+/g, ' ');

    for (const [name, value] of Object.entries(rules)) {
        if (name === 'dodge' || name === 'movement' || name === 'levelsPerZone') continue;
        const written = typeof value === 'object'
            ? `${name}: { ${Object.entries(value).map(([key, number]) => `${key}: ${number}`).join(', ')}`
            : `${name}: ${value},`;
        const found = typeof value === 'object'
            ? Object.entries(value).every(([key, number]) => new RegExp(`\\b${key}:\\s*${String(number).replace('.', '\\.')}\\s*[,}]`).test(section.slice(section.indexOf(`${name}: {`), section.indexOf('}', section.indexOf(`${name}: {`)) + 1)))
            : flat(section).includes(written);
        assert.ok(found, `bosses.${name} differs from ${written}`);
    }

    assert.match(section, /reaction: \{ base: 20, perZone: 1\.5, fastest: 6 \}/);
    assert.match(section, /cooldown: \{ base: 100, perZone: 8, shortest: 28 \}/);
    assert.match(section, /sweep: \{ base: 15, perZone: 0\.8, fastest: 8 \}/);
    assert.match(config, /levelsPerBackground: 2,/);
});

test('the warriors wear armor, more of it the later they stand, and the others none', () => {
    const warriors = bosses.filter(boss => boss.warrior).map(boss => boss.id);
    assert.deepEqual(warriors, ['hogger', 'gath-ilzogg', 'chieftain-nekrosh', 'arnak-grimtotem', 'khan-dezhepah', 'chief-ukorz-sandscalp']);

    assert.equal(bossStats(bossForZone('alliance', 2), rules).armor, 36);
    assert.equal(bossStats(bossForZone('horde', 10), rules).armor, 84);
    assert.equal(bossStats(bossForZone('alliance', 10), rules).armor, 0);
});

test('the armor rules here are the same as the game\'s', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    assert.match(config, /armor: \{ base: 30, perZone: 6 \}/);
});

test('the nimble bosses dodge some arrows, more the later they stand, and the others none', () => {
    const nimble = bosses.filter(boss => boss.nimble).map(boss => boss.id);
    assert.deepEqual(nimble, ['garrick-padfoot', 'bazil-thredd', 'edwin-vancleef', 'king-bangalash', 'echeyakee', 'shadumbra']);

    assert.equal(bossStats(bossForZone('alliance', 1), rules).dodgeChance, 0.05);
    assert.equal(bossStats(bossForZone('alliance', 9), rules).dodgeChance, 0.13);
    assert.equal(bossStats(bossForZone('alliance', 2), rules).dodgeChance, 0);
    // A boss is nimble or in armor, not both
    assert.ok(bosses.every(boss => !(boss.nimble && boss.warrior)));
});

test('a boss brought down faster earns more, by the damage done to it a second', () => {
    const rules = { speedBonus: { perDps: 3 } };
    assert.deepEqual(speedBonus(500, 20, rules), { dps: 25, score: 75 });
    assert.ok(speedBonus(500, 10, rules).score > speedBonus(500, 20, rules).score);
    // A fight is never counted as under a second
    assert.deepEqual(speedBonus(500, 0, rules), speedBonus(500, 1, rules));
});
