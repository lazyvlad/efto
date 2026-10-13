// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/keybindings.js', import.meta.url));
const { ACTIONS, keyLabel, canBind, mergeBindings, assignKey } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

test('every action has a key of its own to start with', () => {
    const keys = ACTIONS.map(action => action.key);
    assert.equal(new Set(keys).size, keys.length);
    assert.ok(keys.every(canBind));
    assert.equal(mergeBindings().autoshot, 'KeyE');
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
    assert.equal(new Set(Object.values(keys)).size, ACTIONS.length);

    // A free key just moves; a reserved one changes nothing
    assert.equal(assignKey(keys, 'dragon_cry', 'KeyF').dragon_cry, 'KeyF');
    assert.deepEqual(assignKey(keys, 'dragon_cry', 'Escape'), keys);
});
