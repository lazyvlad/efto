// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/quiver.js', import.meta.url));
const { quiverCapacity, startingArrows, addArrows } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

// The "quiver" settings of config/gameConfig.js
const rules = { slotSize: 50, slots: 4, startFilled: 1, bossFightFilled: 2, bonusSlots: 4 };

test('a quiver holds four slots of fifty, and the large one twice that', () => {
    assert.equal(quiverCapacity(rules), 200);
    assert.equal(quiverCapacity(rules, true), 400);
});

test('a game starts with one slot filled, a boss fight with two', () => {
    assert.equal(startingArrows(rules), 50);
    assert.equal(startingArrows(rules, true), 100);
});

test('arrows that do not fit are lost', () => {
    assert.deepEqual(addArrows(100, 50, 200), { arrows: 150, added: 50, lost: 0 });
    assert.deepEqual(addArrows(180, 50, 200), { arrows: 200, added: 20, lost: 30 });
    assert.deepEqual(addArrows(200, 25, 200), { arrows: 200, added: 0, lost: 25 });
});

test('the settings in the game match the ones these tests describe', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    assert.match(config.replace(/\s+/g, ' '), /quiver: \{ slotSize: 50, .*?slots: 4, .*?startFilled: 1, .*?bossFightFilled: 2, .*?bonusSlots: 4,/);
});
