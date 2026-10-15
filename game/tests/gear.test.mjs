// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/gear.js', import.meta.url));
const { SLOTS, slotsFor, fits, itemsForSlot, validEquipment, equip, equipSet, setsWorn, mainSet, gearTotals, itemStats, carriedOf, fitsCarried, inHis36, gearGroup, groupByKind } =
    await import(`data:text/javascript;base64,${source.toString('base64')}`);

const sets = [
    { id: 'giant', perPiece: { health: 3, armor: 4, attackPower: 2 }, bonuses: [{ pieces: 2, dodge: 0.02 }, { pieces: 3, dodge: 0.05, multishot: 0.4 }] },
    { id: 'crypt', perPiece: { health: 5, armor: 8, attackPower: 6 }, bonuses: [{ pieces: 2, bossDamage: 0.05 }] },
];
const items = [
    { id: 'g-head', set: 'giant', slot: 'head' },
    { id: 'g-chest', set: 'giant', slot: 'chest' },
    { id: 'g-boots', set: 'giant', slot: 'boots' },
    { id: 'c-head', set: 'crypt', slot: 'head' },
    { id: 'c-ring', set: 'crypt', slot: 'ring' },
    { id: 'bread', type: 'regular' },
];
const all = new Set(items.map(item => item.id));

test('the sheet has its twenty slots: eight left, eight right, four below (the quiver beside the ranged weapon)', () => {
    assert.equal(SLOTS.length, 20);
    assert.equal(new Set(SLOTS.map(slot => slot.id)).size, 20);
    assert.deepEqual(['left', 'right', 'bottom'].map(column => SLOTS.filter(slot => slot.column === column).length), [8, 8, 4]);
    assert.deepEqual(SLOTS.filter(slot => slot.column === 'bottom').map(slot => slot.id), ['mainhand', 'offhand', 'ranged', 'quiver']);
});

test('an item fits the slot it is made for, and a ring either finger', () => {
    assert.deepEqual(slotsFor(items[0]), ['head']);
    assert.deepEqual(slotsFor(items[2]), ['feet']);
    assert.deepEqual(slotsFor(items[4]), ['finger1', 'finger2']);
    assert.deepEqual(slotsFor(items[5]), []);
    assert.equal(fits(items[4], 'finger2'), true);
    assert.equal(fits(items[0], 'chest'), false);
});

test('a slot is offered the items owned that fit it', () => {
    assert.deepEqual(itemsForSlot('head', items, all).map(item => item.id), ['g-head', 'c-head']);
    assert.deepEqual(itemsForSlot('head', items, new Set(['c-head', 'g-chest'])).map(item => item.id), ['c-head']);
    assert.deepEqual(itemsForSlot('neck', items, all), []);
});

test('what cannot be worn is taken out', () => {
    const worn = validEquipment({
        head: 'g-head',         // fine
        chest: 'g-boots',       // does not fit
        feet: 'g-boots',        // not owned
        finger1: 'c-ring',      // fine
        finger2: 'c-ring',      // the same ring twice
        nose: 'c-head',         // no such slot
        neck: 'made-up',        // no such item
    }, items, new Set(['g-head', 'c-ring']));

    assert.deepEqual(worn, { head: 'g-head', finger1: 'c-ring' });
    assert.deepEqual(validEquipment(null, items, all), {});
});

test('putting an item on replaces what was there, and it is never in two slots', () => {
    let worn = equip({}, 'head', items[0]);
    worn = equip(worn, 'head', items[3]);
    assert.deepEqual(worn, { head: 'c-head' });

    worn = equip(worn, 'finger1', items[4]);
    worn = equip(worn, 'finger2', items[4]);
    assert.deepEqual(worn, { head: 'c-head', finger2: 'c-ring' });

    // Something that does not fit changes nothing; no item takes off
    assert.deepEqual(equip(worn, 'chest', items[0]), worn);
    assert.deepEqual(equip(worn, 'head', null), { finger2: 'c-ring' });
});

test('putting a set on puts on the pieces owned and leaves the other slots alone', () => {
    const before = { head: 'c-head', finger1: 'c-ring' };
    const worn = equipSet(before, 'giant', items, new Set(['g-head', 'g-boots', 'c-head', 'c-ring']));

    assert.deepEqual(worn, { head: 'g-head', feet: 'g-boots', finger1: 'c-ring' });
    assert.deepEqual(before, { head: 'c-head', finger1: 'c-ring' });
    assert.deepEqual(setsWorn(worn, items), { giant: 2, crypt: 1 });
    assert.equal(mainSet(worn, items, sets), 'giant');
    assert.equal(mainSet({}, items, sets), null);
});

const none = { health: 0, armor: 0, attackPower: 0, crit: 0, dodge: 0, carrying: 0, bossDamage: 0, multishot: 0, arcane: 0 };

test('every item gives its stats, and each set the step its worn pieces reach', () => {
    assert.deepEqual(gearTotals({}, items, sets), none);

    // One piece: its stats, no step yet
    assert.deepEqual(gearTotals({ head: 'g-head' }, items, sets), { ...none, health: 3, armor: 4, attackPower: 2 });

    // Three of one set: the last step, which says everything it gives
    const giant = gearTotals({ head: 'g-head', chest: 'g-chest', feet: 'g-boots' }, items, sets);
    assert.deepEqual(giant, { ...none, health: 9, armor: 12, attackPower: 6, dodge: 0.05, multishot: 0.4 });

    // Two sets mixed: each counts its own pieces
    const mixed = gearTotals({ head: 'c-head', chest: 'g-chest', feet: 'g-boots', finger1: 'c-ring' }, items, sets);
    assert.deepEqual(mixed, { ...none, health: 16, armor: 24, attackPower: 16, dodge: 0.02, bossDamage: 0.05 });
});

test('gear that is not of a set gives what it says, and its hundredths come out as shares', () => {
    const gear = [
        ...items,
        { id: 'cape', slot: 'back', stats: { armor: 7, health: 5, carrying: 2 } },
        { id: 'axe', slot: 'mainhand', stats: { attackPower: 6, crit: 1 } },
        { id: 'fang', slot: 'trinket', stats: { attackPower: 6, dodge: 1, carrying: 2 } },
    ];

    assert.deepEqual(gearTotals({ back: 'cape', mainhand: 'axe', trinket1: 'fang', head: 'g-head' }, gear, sets),
        { ...none, health: 8, armor: 11, attackPower: 14, crit: 0.01, dodge: 0.01, carrying: 0.04 });
    assert.deepEqual(itemStats(gear[gear.length - 1], sets), { health: 0, armor: 0, attackPower: 6, crit: 0, dodge: 1, carrying: 2 });
    assert.deepEqual(slotsFor(gear[gear.length - 1]), ['trinket1', 'trinket2']);
});

test('an item on its own gives what a piece of its set gives', () => {
    assert.deepEqual(itemStats(items[3], sets), { health: 5, armor: 8, attackPower: 6, crit: 0, dodge: 0, carrying: 0 });
    assert.deepEqual(itemStats(items[5], sets), { health: 0, armor: 0, attackPower: 0, crit: 0, dodge: 0, carrying: 0 });
});

test('every set piece in the game is worn somewhere on the sheet', async () => {
    const data = await readFile(new URL('../data/gameItems.js', import.meta.url), 'utf8');
    const slots = [...data.matchAll(/type: "set_piece", set: "\w+", slot: "(\w+)"/g)].map(match => match[1]);

    assert.equal(slots.length, 25);
    for (const slot of slots) {
        assert.ok(slotsFor({ slot }).length > 0, `nowhere to wear "${slot}"`);
    }
});

test('the hunter carries what was chosen, as far as it is owned and there is room', () => {
    const owned = ['a', 'b', 'c', 'd', 'e'];

    // Never chosen: what is worn (taking no room), then the rest in order, as room allows
    assert.deepEqual(carriedOf(null, ['d'], owned, 3), ['d', 'a', 'b', 'c']);
    assert.deepEqual(carriedOf(null, [], owned, 36), owned);

    // Chosen: not what is no longer owned, nothing twice, no more than the limit
    assert.deepEqual(carriedOf(['c', 'x', 'c', 'a'], [], owned, 36), ['c', 'a']);
    assert.deepEqual(carriedOf(['c', 'a', 'b'], [], owned, 2), ['c', 'a']);
    assert.deepEqual(carriedOf([], [], owned, 36), []);

    // What is worn is always with him and takes no room in his 36
    assert.deepEqual(carriedOf(['c'], ['e'], owned, 36), ['e', 'c']);
    assert.deepEqual(carriedOf(['c', 'a'], ['e'], owned, 2), ['e', 'c', 'a']);
    assert.equal(inHis36(['e', 'c', 'a'], ['e']), 2);
});

test('putting something on needs room only for what comes off', () => {
    // Worn 'a' and 'c'; carried 'a', 'b': only 'b' is in his 36
    assert.equal(fitsCarried(['a', 'b'], ['a', 'c'], 1), true);
    // 'a' comes off and 'c', 'd' go on: 'a' and 'b' are in his 36
    assert.equal(fitsCarried(['a', 'b'], ['c', 'd'], 2), true);
    assert.equal(fitsCarried(['a', 'b'], ['c', 'd'], 1), false);
});

test('a weapon held in both hands leaves the off hand empty', () => {
    const weapons = [
        { id: 'axe', slot: 'mainhand', twoHanded: true },
        { id: 'sword', slot: 'mainhand' },
        { id: 'shiv', slot: 'offhand' },
    ];
    const all = new Set(['axe', 'sword', 'shiv']);

    // The two-handed weapon takes the off hand's thing off
    assert.deepEqual(equip({ mainhand: 'sword', offhand: 'shiv' }, 'mainhand', weapons[0], weapons), { mainhand: 'axe' });
    // Something put in the off hand takes the two-handed weapon off; a one-handed one stays
    assert.deepEqual(equip({ mainhand: 'axe' }, 'offhand', weapons[2], weapons), { offhand: 'shiv' });
    assert.deepEqual(equip({ mainhand: 'sword' }, 'offhand', weapons[2], weapons), { mainhand: 'sword', offhand: 'shiv' });
    // Saved or sent with both, the off hand goes
    assert.deepEqual(validEquipment({ mainhand: 'axe', offhand: 'shiv' }, weapons, all), { mainhand: 'axe' });
});

test('gear is grouped by kind, in the character sheet\'s order, each kind by name', () => {
    const items = [
        { id: 'axe', name: 'Axe', slot: 'mainhand', twoHanded: true },
        { id: 'ring-b', name: 'Band B', slot: 'ring' },
        { id: 'helm', name: 'Helm', slot: 'head' },
        { id: 'dagger', name: 'Dagger', slot: 'mainhand' },
        { id: 'ring-a', name: 'Band A', slot: 'ring' },
        { id: 'quiver', name: 'Quiver', slot: 'quiver' },
        { id: 'odd', name: 'Odd', slot: 'nose' },
    ].map(item => ({ item }));

    const groups = groupByKind(items);
    assert.deepEqual(groups.map(group => group.label), ['Head', 'Rings', 'Two-handed weapons', 'One-handed weapons', 'Quivers', 'Other']);
    assert.deepEqual(groups[1].entries.map(entry => entry.item.id), ['ring-a', 'ring-b']);
    assert.equal(gearGroup({ slot: 'belt' }).label, 'Waist');
    assert.equal(gearGroup({ slot: 'mainhand', twoHanded: true }).key, 'two-handed');
});
