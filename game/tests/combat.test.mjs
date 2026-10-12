// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/combat.js', import.meta.url));
const { dodgeChance } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} is not ${expected}`);

test('against an attacker of the same level the chance to dodge is the dodge rating', () => {
    near(dodgeChance(0.10, 5, 5), 0.10);
    near(dodgeChance(0.10, 5), 0.10);
});

test('each level the attacker is above the defender costs 0.2% dodge, as in Classic', () => {
    // A boss is three levels up: 15 points of weapon skill over the defender's Defense, 0.04% each
    near(dodgeChance(0.10, 4, 7), 0.094);
    near(dodgeChance(0.10, 10, 11), 0.098);
    // ...and an attacker below the defender is easier to dodge
    near(dodgeChance(0.10, 10, 7), 0.106);
});

test('the chance never goes below nothing or above its cap', () => {
    assert.equal(dodgeChance(0.001, 1, 60), 0);
    assert.equal(dodgeChance(0.9, 60, 1, 0.25), 0.25);
    near(dodgeChance(0.30, 5, 8, 0.25), 0.25);
});
