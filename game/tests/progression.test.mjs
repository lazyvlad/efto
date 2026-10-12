// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/progression.js', import.meta.url));
const { valueMultiplier, itemValueAtLevel, secondsForLevel, xpForLevel, totalXpAtLevel, levelProgress, isUnlocked } =
    await import(`data:text/javascript;base64,${source.toString('base64')}`);

const rules = {
    secondsAtLevel1: 10,
    secondsPerLevel: 3,
    xpPerSecond: 1.2,
    valueGrowthPerLevel: 0.12,
    unlockLevel: { regular: 1, green: 2, epic: 4, special: 6, set_piece: 3, legendary: 10, zee_zgnan: 12 }
};

test('every level needs more experience, and takes longer, than the one before', () => {
    for (let level = 1; level < 40; level++) {
        assert.ok(xpForLevel(level + 1, rules) > xpForLevel(level, rules), `level ${level + 1}`);
        assert.ok(secondsForLevel(level + 1, rules) > secondsForLevel(level, rules));
    }

    assert.equal(xpForLevel(1, rules), 12);
    assert.equal(secondsForLevel(1, rules), 10);
    assert.equal(secondsForLevel(10, rules), 37);
});

test('items are worth more at higher levels, and never less than 1', () => {
    assert.equal(valueMultiplier(1, rules), 1);
    assert.equal(itemValueAtLevel(4, 1, rules), 4);
    assert.equal(itemValueAtLevel(4, 11, rules), 9);
    assert.equal(itemValueAtLevel(1, 1, rules), 1);
    assert.ok(itemValueAtLevel(1, 30, rules) > itemValueAtLevel(1, 10, rules));
});

test('experience turns into a level and the progress through it', () => {
    assert.deepEqual(levelProgress(0, rules), { level: 1, into: 0, needed: 12 });
    assert.deepEqual(levelProgress(11, rules), { level: 1, into: 11, needed: 12 });
    assert.deepEqual(levelProgress(12, rules), { level: 2, into: 0, needed: xpForLevel(2, rules) });

    for (const level of [1, 2, 5, 12, 25]) {
        assert.equal(levelProgress(totalXpAtLevel(level, rules), rules).level, level);
        assert.equal(levelProgress(totalXpAtLevel(level, rules), rules).into, 0);
    }
});

test('rarer items only drop once the player has reached their level', () => {
    assert.ok(isUnlocked('regular', 1, rules));
    assert.ok(!isUnlocked('green', 1, rules));
    assert.ok(!isUnlocked('legendary', 9, rules));
    assert.ok(isUnlocked('legendary', 10, rules));
    assert.ok(!isUnlocked('zee_zgnan', 11, rules));
    assert.ok(isUnlocked('zee_zgnan', 12, rules));
});

test('the settings in the game match the ones these tests describe', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    const section = config.slice(config.indexOf('progression: {'), config.indexOf('// === BOSS FIGHTS ==='));

    for (const [name, value] of Object.entries({ ...rules, ...rules.unlockLevel, unlockLevel: undefined })) {
        if (value === undefined) continue;
        assert.match(section, new RegExp(`\\b${name}:\\s*${String(value).replace('.', '\\.')}\\s*,`), name);
    }
});
