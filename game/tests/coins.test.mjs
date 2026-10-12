// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/coins.js', import.meta.url));
const { coinsForItem, coinsForBoss, formatCoins } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const rules = { byType: { regular: 10, epic: 100 }, bossPerZone: 100 };

test('an item is worth what its rarity says, and nothing if the rarity is unknown', () => {
    assert.equal(coinsForItem('regular', rules), 10);
    assert.equal(coinsForItem('epic', rules), 100);
    assert.equal(coinsForItem('made-up', rules), 0);
});

test('a boss pays by the zone it guards', () => {
    assert.equal(coinsForBoss(1, rules), 100);
    assert.equal(coinsForBoss(7, rules), 700);
});

test('amounts read as gold, silver and copper, as the site writes them', () => {
    assert.equal(formatCoins(0), '0c');
    assert.equal(formatCoins(45), '45c');
    assert.equal(formatCoins(100), '1s');
    assert.equal(formatCoins(1205), '12s 5c');
    assert.equal(formatCoins(30000), '3g');
    assert.equal(formatCoins(32005), '3g 20s 5c');
    assert.equal(formatCoins(12340001), '1,234g 1c');
});
