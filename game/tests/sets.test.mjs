// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/sets.js', import.meta.url));
const { setById, piecesOf, ownedCount, setBonus, nextStep, bonusText, pieceUnlocked } =
    await import(`data:text/javascript;base64,${source.toString('base64')}`);

const sets = [
    { id: 'giantstalker', fromLevel: 3, bonuses: [{ pieces: 3, dodge: 0.02 }, { pieces: 5, dodge: 0.04 }, { pieces: 8, dodge: 0.06 }] },
    { id: 'cryptstalker', fromLevel: 15, bonuses: [{ pieces: 2, bossDamage: 0.05 }, { pieces: 4, bossDamage: 0.1 }] }
];
const items = [
    { id: 'g-boots', type: 'set_piece', set: 'giantstalker', slot: 'boots' },
    { id: 'ring1', type: 'regular' },
    { id: 'g-head', type: 'set_piece', set: 'giantstalker', slot: 'head' },
    { id: 'c-ring', type: 'set_piece', set: 'cryptstalker', slot: 'ring' }
];

test('the pieces of a set come in the order they are worn', () => {
    assert.deepEqual(piecesOf(items, 'giantstalker').map(piece => piece.id), ['g-head', 'g-boots']);
    assert.equal(ownedCount(piecesOf(items, 'giantstalker'), new Set(['g-boots', 'c-ring'])), 1);
});

const nothing = { health: 0, armor: 0, attackPower: 0, crit: 0, dodge: 0, bossDamage: 0, multishot: 0, arcane: 0 };

test('wearing a set gives the highest step of its bonus reached', () => {
    const giantstalker = setById(sets, 'giantstalker');

    assert.deepEqual(setBonus(giantstalker, 2), nothing);
    assert.deepEqual(setBonus(giantstalker, 3), { ...nothing, dodge: 0.02 });
    assert.deepEqual(setBonus(giantstalker, 7), { ...nothing, dodge: 0.04 });
    assert.deepEqual(setBonus(giantstalker, 8), { ...nothing, dodge: 0.06 });
    assert.deepEqual(setBonus(null, 8), nothing);

    assert.equal(nextStep(giantstalker, 0), 3);
    assert.equal(nextStep(giantstalker, 5), 8);
    assert.equal(nextStep(giantstalker, 8), null);
});

test('every piece owned of the set gives health, armor and attack power', () => {
    const set = {
        id: 'dragonstalker', perPiece: { health: 4, armor: 6, attackPower: 4 },
        bonuses: [{ pieces: 3, crit: 0.02 }, { pieces: 8, crit: 0.05, arcane: 0.5 }]
    };

    assert.deepEqual(setBonus(set, 0), nothing);
    assert.deepEqual(setBonus(set, 1), { ...nothing, health: 4, armor: 6, attackPower: 4 });
    assert.deepEqual(setBonus(set, 5), { ...nothing, health: 20, armor: 30, attackPower: 20, crit: 0.02 });
    // The last step says everything it gives, the crit of the step before with it
    assert.deepEqual(setBonus(set, 8), { ...nothing, health: 32, armor: 48, attackPower: 32, crit: 0.05, arcane: 0.5 });
});

test('a bonus reads as players expect', () => {
    assert.equal(bonusText({ ...nothing, dodge: 0.04 }), '+4% dodge');
    assert.equal(bonusText({ ...nothing, crit: 0.02, bossDamage: 0.1 }), '+2% crit, +10% damage to bosses');
    assert.equal(bonusText(nothing), '');

    const full = { ...nothing, health: 24, armor: 32, attackPower: 16, dodge: 0.05, multishot: 0.4 };
    assert.equal(bonusText(full), '+24 health, +32 armor, +16 attack power, +5% dodge, Multishot +40%');
    assert.equal(bonusText(full, { stats: false }), '+5% dodge, Multishot +40%');
    assert.equal(bonusText({ ...nothing, arcane: 0.5 }), 'Arcane Shot +50%');
});

test('a piece only drops once its set has begun', () => {
    assert.equal(pieceUnlocked(items[0], 2, sets), false);
    assert.equal(pieceUnlocked(items[0], 3, sets), true);
    assert.equal(pieceUnlocked(items[3], 14, sets), false);
    assert.equal(pieceUnlocked(items[3], 15, sets), true);
});

test('every set piece in the game belongs to a set in the settings and says where it is worn', async () => {
    const data = await readFile(new URL('../data/gameItems.js', import.meta.url), 'utf8');
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    const pieces = [...data.matchAll(/type: "set_piece", set: "(\w+)", slot: "(\w+)"/g)];

    assert.equal(pieces.length, 25);
    assert.equal([...data.matchAll(/type: "set_piece"/g)].length, 25);
    for (const [, set] of pieces) {
        assert.ok(config.includes(`id: '${set}',`), `no set called ${set} in the settings`);
    }
});
