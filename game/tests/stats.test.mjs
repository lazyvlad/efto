// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/stats.js', import.meta.url));
const { armorReduction, damageAfterArmor, arrowDamage, healthAtNewMax } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const rules = { armorHalvesAt: 150, mostArmorReduction: 0.6 };

test('armor takes a share off a hit, each point worth a little less than the last', () => {
    assert.equal(armorReduction(0, rules), 0);
    assert.equal(armorReduction(50, rules), 0.25);
    assert.equal(armorReduction(150, rules), 0.5);
    assert.ok(armorReduction(100, rules) - armorReduction(50, rules) < armorReduction(50, rules));
    // Never more than its limit
    assert.equal(armorReduction(100000, rules), 0.6);
    assert.equal(armorReduction(-5, rules), 0);
});

test('a hit that lands always does something', () => {
    assert.equal(damageAfterArmor(16, 0, rules), 16);
    assert.equal(damageAfterArmor(16, 50, rules), 12);
    assert.equal(damageAfterArmor(1, 100000, rules), 1);
    assert.equal(damageAfterArmor(0, 50, rules), 0);
});

test('an arrow with nothing behind it does what it always did', () => {
    assert.equal(arrowDamage({ base: 10 }), 10);
    assert.equal(arrowDamage({ base: 10, worth: 3 }), 30);
    assert.equal(arrowDamage({ base: 10, weakened: 1.5, bossDamage: 0.2, crit: 2 }), 36);
});

test('attack power adds a hundredth to an arrow for every point', () => {
    assert.equal(arrowDamage({ base: 10, attackPower: 16 }), 12);
    assert.equal(arrowDamage({ base: 10, attackPower: 54 }), 15);
    assert.equal(arrowDamage({ base: 10, attackPower: 32, worth: 3 }), 40);
});

test('what a set adds to a shot applies to that shot', () => {
    assert.equal(arrowDamage({ base: 10, shotBonus: 0.4 }), 14);
    assert.equal(arrowDamage({ base: 10, worth: 3, shotBonus: 0.5 }), 45);
});

test('a boss\'s armor takes its share off arrows, and an Arcane Shot goes through it', () => {
    assert.equal(arrowDamage({ base: 10, bossArmor: 0.3 }), 7);
    assert.equal(arrowDamage({ base: 10, worth: 3, bossArmor: 0.3, ignoresArmor: true }), 30);
    assert.equal(arrowDamage({ base: 10, bossArmor: 5 }), 0);
});

test('health keeps its proportion when the most he can have changes', () => {
    assert.equal(healthAtNewMax(100, 100, 124), 124);
    assert.equal(healthAtNewMax(50, 100, 124), 62);
    assert.equal(healthAtNewMax(62, 124, 100), 50);
    // There and back is where it started
    assert.equal(healthAtNewMax(healthAtNewMax(37, 100, 145), 145, 100), 37);
});

test('the sets in the settings are each better than the one before', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    const perPiece = [...config.matchAll(/perPiece: \{ health: (\d+), armor: (\d+), attackPower: (\d+) \}/g)].map(match => match.slice(1).map(Number));

    assert.equal(perPiece.length, 3);
    for (let tier = 1; tier < perPiece.length; tier++) {
        perPiece[tier].forEach((value, stat) => assert.ok(value > perPiece[tier - 1][stat]));
    }
});
