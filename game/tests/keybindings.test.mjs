// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/keybindings.js', import.meta.url));
const { ACTIONS, LAYOUTS, keyLabel, canBind, mergeBindings, assignKey, layoutKeys } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

test('in every layout no key does two things, and the shots and the pet have keys', () => {
    for (const layout of LAYOUTS) {
        const keys = Object.values(layoutKeys(layout.id)).filter(Boolean);
        assert.equal(new Set(keys).size, keys.length, layout.id);
        assert.ok(keys.every(canBind), layout.id);
        for (const action of ['autoshot', 'multishot', 'arcane_shot', 'pet_stance']) assert.ok(layoutKeys(layout.id)[action], `${layout.id} ${action}`);
    }
    assert.equal(mergeBindings().autoshot, 'KeyE');
});

test('the numbers layout: the shots on 1, 2, 3 and T going through the sets', () => {
    const keys = mergeBindings({}, 'numbers');
    assert.deepEqual([keys.autoshot, keys.multishot, keys.arcane_shot, keys.next_set], ['Digit1', 'Digit2', 'Digit3', 'KeyT']);
    assert.equal(keys.set_1, null);
    assert.equal(keys.set_4, 'Digit4');
    // A change goes over it, and a change to no key stays
    const changed = mergeBindings({ set_1: 'KeyE', next_set: null }, 'numbers');
    assert.equal(changed.set_1, 'KeyE');
    assert.equal(changed.next_set, null);
    // A layout that is no more is the usual one
    assert.equal(mergeBindings({}, 'gone').autoshot, 'KeyE');
});

test('a change onto a key the layout gives another action leaves that one without it', () => {
    const keys = mergeBindings({ set_1: 'KeyT' }, 'usual');
    assert.equal(keys.set_1, 'KeyT');
    assert.equal(keys.arcane_shot, null);
});

test('keys read as they are printed on the keyboard', () => {
    assert.equal(keyLabel('KeyE'), 'E');
    assert.equal(keyLabel('Digit3'), '3');
    assert.equal(keyLabel('Space'), 'Space');
    assert.equal(keyLabel('ArrowUp'), '↑');
    assert.equal(keyLabel('Numpad4'), 'Num 4');
});

test('keys with a meaning of their own cannot be bound', () => {
    for (const code of ['Escape', 'Tab', 'Enter', 'ShiftLeft', 'ControlRight', 'F5', 'MetaLeft', '', null]) {
        assert.equal(canBind(code), false, String(code));
    }
    assert.ok(canBind('Space'));
    assert.ok(canBind('KeyF'));
});

test('a player\'s changes go over the usual keys, and nonsense is left out', () => {
    const keys = mergeBindings({ autoshot: 'Space', multishot: 'Escape', nothing: 'KeyZ' });
    assert.equal(keys.autoshot, 'Space');
    assert.equal(keys.multishot, 'KeyR');
    assert.equal('nothing' in keys, false);
});

test('giving an action a key another action has makes the two change places', () => {
    const keys = assignKey(mergeBindings(), 'autoshot', 'KeyR');
    assert.equal(keys.autoshot, 'KeyR');
    assert.equal(keys.multishot, 'KeyE');
    const bound = Object.values(keys).filter(Boolean);
    assert.equal(new Set(bound).size, bound.length);

    // A free key just moves; a reserved one changes nothing
    assert.equal(assignKey(keys, 'dragon_cry', 'KeyF').dragon_cry, 'KeyF');
    assert.deepEqual(assignKey(keys, 'dragon_cry', 'Escape'), keys);
});
