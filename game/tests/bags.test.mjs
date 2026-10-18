// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through data: URLs, as in gameClock.test.mjs
const load = async file => import(`data:text/javascript;base64,${(await readFile(new URL(file, import.meta.url))).toString('base64')}`);
const { bagCapacity, slotsUsed, fitsInBags, addToBags, soldShort, stacksOf, makeRoomFor } = await load('../utils/bags.js');
const { MATERIALS, categoryOf } = await load('../data/materials.js');

const rules = { backpack: 16, bagSlots: 4, stack: 20, fullPenalty: 0.1 };

test('the bags are the backpack and up to four bags added to it', () => {
    assert.equal(bagCapacity(rules), 16);
    assert.equal(bagCapacity(rules, [6, 8]), 30);
    assert.equal(bagCapacity(rules, [14, 14, 14, 14]), 72);
    // A fifth bag has nowhere to hang
    assert.equal(bagCapacity(rules, [14, 14, 14, 14, 14]), 72);
});

test('a slot holds a stack of one kind, and a full stack starts another', () => {
    assert.equal(slotsUsed({}, 20), 0);
    assert.equal(slotsUsed({ bread: 1, fish: 20 }, 20), 2);
    assert.equal(slotsUsed({ bread: 21, fish: 40 }, 20), 4);
    assert.deepEqual(stacksOf({ bread: 45, fish: 3 }, 20), [
        { itemId: 'bread', count: 20 }, { itemId: 'bread', count: 20 }, { itemId: 'bread', count: 5 }, { itemId: 'fish', count: 3 }
    ]);
});

test('more of a kind already carried fits while its stack has room', () => {
    const full = { bread: 19, fish: 5 };

    // Two slots, both taken: bread still has room on its stack, a new kind does not
    assert.equal(fitsInBags(full, 'bread', 2, 20), true);
    assert.equal(fitsInBags(full, 'cheese', 2, 20), false);
    // The twentieth filled the stack: the next bread needs a slot of its own
    assert.equal(fitsInBags({ bread: 20, fish: 5 }, 'bread', 2, 20), false);
    assert.equal(fitsInBags({ bread: 20, fish: 5 }, 'bread', 3, 20), true);
});

test('what does not fit is counted as sold short, not carried', () => {
    const bags = { contents: {}, overflow: {} };

    assert.equal(addToBags(bags, 'bread', 1, 20), true);
    assert.equal(addToBags(bags, 'bread', 1, 20), true);
    assert.equal(addToBags(bags, 'fish', 1, 20), false);
    assert.equal(addToBags(bags, 'fish', 1, 20), false);

    assert.deepEqual(bags, { contents: { bread: 2 }, overflow: { fish: 2 } });
});

test('sold short is sold for a tenth less, and gear that helps carrying eases it', () => {
    assert.equal(soldShort(500, rules), 450);
    assert.equal(soldShort(10, rules), 9);
    assert.equal(soldShort(500, rules, 0.04), 470);
    // Never more than its full worth
    assert.equal(soldShort(500, rules, 0.5), 500);
});

test('things are gear, materials or junk', () => {
    assert.equal(categoryOf({ id: 'ds_helm', type: 'set_piece' }), 'gear');
    assert.equal(categoryOf({ id: 'thorium-bar', type: 'green' }), 'material');
    assert.equal(categoryOf({ id: 'bread', type: 'regular' }), 'junk');
    assert.equal(categoryOf(null), 'junk');
});

test('every material is an item of the game, and none is a piece of a set', async () => {
    const data = await readFile(new URL('../data/gameItems.js', import.meta.url), 'utf8');
    const types = Object.fromEntries([...data.matchAll(/\{ id: "([^"]+)".*?type: "([^"]+)"/g)].map(match => [match[1], match[2]]));

    assert.equal(MATERIALS.size, 16);
    for (const id of MATERIALS) {
        assert.ok(types[id], `"${id}" is not an item of the game`);
        assert.notEqual(types[id], 'set_piece');
    }
});

test('a material caught with the bags full pushes out a slot of junk, the least of it', () => {
    const junk = id => id.startsWith('junk');
    // Two slots, both taken: junk-a fills one (20), junk-b has 3 in the other
    const contents = { 'junk-a': 20, 'junk-b': 3 };
    assert.deepEqual(makeRoomFor(contents, 'peacebloom', 2, 20, junk), { itemId: 'junk-b', count: 3 });
    assert.deepEqual(contents, { 'junk-a': 20 });
    // Room already: nothing goes
    assert.equal(makeRoomFor(contents, 'peacebloom', 2, 20, junk), null);
    // Full of kept things: nothing to push out
    const kept = { peacebloom: 20, silverleaf: 20 };
    assert.equal(makeRoomFor(kept, 'copper-ore', 2, 20, junk), null);
    assert.deepEqual(kept, { peacebloom: 20, silverleaf: 20 });
    // A stack of the same kind with room: it fits, nothing goes
    assert.equal(makeRoomFor({ peacebloom: 5, 'junk-a': 20 }, 'peacebloom', 2, 20, junk), null);
});
