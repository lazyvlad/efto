// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/applySettings.js', import.meta.url));
const { applySettings } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const settings = () => ({ bosses: { health: { base: 240, perZone: 257 }, name: 'boss' }, pet: { every: 1200 } });

test('a changed value replaces the game\'s own at its path', () => {
    const config = settings();

    assert.deepEqual(applySettings(config, { 'bosses.health.base': 300, 'pet.every': 600 }), ['bosses.health.base', 'pet.every']);
    assert.equal(config.bosses.health.base, 300);
    assert.equal(config.bosses.health.perZone, 257);
    assert.equal(config.pet.every, 600);
});

test('nothing is added, and nothing changes kind', () => {
    const config = settings();

    assert.deepEqual(applySettings(config, {
        'bosses.health.made_up': 5,
        'nowhere.at.all': 5,
        'bosses.name': 5,
        'bosses.health': 5,
        'pet.every': 'often',
        'bosses.health.base': NaN,
    }), []);
    assert.deepEqual(config, settings());
});

test('no changes is fine', () => {
    assert.deepEqual(applySettings(settings(), undefined), []);
    assert.deepEqual(applySettings(settings(), {}), []);
});
