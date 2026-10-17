// Which key does what, and the player's own choices.
//
// Keys are told apart by where they are on the keyboard ("KeyE", "Digit1": the browser's
// event.code), not by the letter they type. So the keys stay where they are whatever the
// keyboard is set to: on a Cyrillic layout the key in E's place still shoots.
//
// The actions and their usual keys are listed here; a player's changes are kept in the
// browser. Esc (pause) is not in the list: the browser itself uses it to let the mouse go.
//
// There are two layouts to start from (LAYOUTS): the usual keys, and one with the shots on 1, 2
// and 3, where T goes through the first three saved sets in place of their own keys. The
// player's changes are kept over the layout picked. An action may be left with no key.

export const ACTIONS = [
    { id: 'autoshot', name: 'Autoshot', key: 'KeyE' },
    { id: 'multishot', name: 'Multishot', key: 'KeyR' },
    { id: 'arcane_shot', name: 'Arcane Shot', key: 'KeyT' },
    { id: 'dragon_cry', name: 'Dragon Cry', key: 'KeyQ' },
    { id: 'zandalari', name: 'Zandalari', key: 'KeyW' },
    { id: 'set_1', name: 'Wear your first saved set', key: 'Digit1' },
    { id: 'set_2', name: 'Wear your second saved set', key: 'Digit2' },
    { id: 'set_3', name: 'Wear your third saved set', key: 'Digit3' },
    { id: 'set_4', name: 'Wear your fourth saved set', key: 'Digit4' },
    { id: 'next_set', name: 'Wear the next of your first three sets', key: null },
    { id: 'pet_stance', name: 'Your pet: defensive or aggressive', key: 'KeyP' },
    { id: 'potion', name: 'Drink a Health Potion', key: 'KeyH' },
    { id: 'mana_potion', name: 'Drink a Mana Potion', key: 'KeyM' },
    { id: 'haste_potion', name: 'Drink a Haste Potion', key: 'KeyJ' },
    { id: 'settings', name: 'Open and close Settings', key: 'KeyS' },
    { id: 'character', name: 'Open and close the character sheet', key: 'KeyC' },
    { id: 'inventory', name: 'Open and close the inventory', key: 'KeyB' },
    { id: 'stats', name: 'Show and hide his stats in a game', key: 'KeyI' },
    { id: 'gear', name: 'Show and hide what he wears in a game', key: 'KeyG' }
];

// The layouts: each action's key in it, the usual keys where it says nothing
export const LAYOUTS = [
    { id: 'usual', name: 'The usual keys', keys: {} },
    {
        id: 'numbers',
        name: 'Shots on 1, 2, 3 · T changes the set',
        keys: { autoshot: 'Digit1', multishot: 'Digit2', arcane_shot: 'Digit3', next_set: 'KeyT', set_1: null, set_2: null, set_3: null }
    }
];

const STORAGE_KEY = 'input_keybindings';

// Keys that keep their own meaning and cannot be given to an action
const RESERVED = /^(Escape|Tab|Enter|NumpadEnter|CapsLock|ContextMenu|PrintScreen|ScrollLock|Pause|NumLock|F\d+|(Shift|Control|Alt|Meta|OS)(Left|Right)?)$/;

const NAMES = {
    Space: 'Space', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→',
    Backquote: '`', Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Backslash: '\\',
    Semicolon: ';', Quote: "'", Comma: ',', Period: '.', Slash: '/', Backspace: 'Bksp',
    Delete: 'Del', Insert: 'Ins', PageUp: 'PgUp', PageDown: 'PgDn'
};

// A key as it is shown to the player: "E", "1", "Space", "Num 4"
export function keyLabel(code) {
    if (!code) return '';
    if (/^Key[A-Z]$/.test(code)) return code.slice(3);
    if (/^Digit\d$/.test(code)) return code.slice(5);
    if (/^Numpad\d$/.test(code)) return `Num ${code.slice(6)}`;
    return NAMES[code] || code;
}

export function canBind(code) {
    return Boolean(code) && !RESERVED.test(code);
}

const layoutOf = id => LAYOUTS.find(layout => layout.id === id) || LAYOUTS[0];

// The keys of a layout, { action: code or null }
export function layoutKeys(layoutId) {
    const layout = layoutOf(layoutId);
    const keys = {};
    for (const action of ACTIONS) keys[action.id] = action.id in layout.keys ? layout.keys[action.id] : action.key;
    return keys;
}

// The keys in use, { action: code or null }: the layout's with the player's changes over them.
// Changes naming a key that cannot be bound, or an action that is no more, are left out; a
// change to null leaves the action without a key.
export function mergeBindings(changes = {}, layoutId = 'usual') {
    const keys = layoutKeys(layoutId);
    for (const action of ACTIONS) {
        if (!changes || !Object.prototype.hasOwnProperty.call(changes, action.id)) continue;
        const chosen = changes[action.id];
        if (chosen === null || canBind(chosen)) keys[action.id] = chosen;
    }
    // A key given to two actions (a change over a layout that has it too): the change keeps it
    for (const id of Object.keys(keys)) {
        const code = keys[id];
        if (!code || !changes || changes[id] !== code) continue;
        for (const other of Object.keys(keys)) {
            if (other !== id && keys[other] === code && changes[other] !== code) keys[other] = null;
        }
    }
    return keys;
}

// Give an action a key. If another action had that key, the two change places, so no key
// ever does two things (the other is left with no key if this one had none).
export function assignKey(keys, actionId, code) {
    if (!canBind(code) || !(actionId in keys)) return keys;

    const next = { ...keys };
    const holder = Object.keys(next).find(id => next[id] === code);
    if (holder && holder !== actionId) next[holder] = next[actionId];
    next[actionId] = code;
    return next;
}

// ----- The bindings in use -----

// What is kept: { layout, changes }. (Kept before there were layouts: the changes alone, over
// the usual keys.)
function stored() {
    try {
        const kept = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        if (kept && typeof kept.layout === 'string' && kept.changes) return { layout: layoutOf(kept.layout).id, changes: kept.changes };
        return { layout: 'usual', changes: kept };
    } catch (e) {
        return { layout: 'usual', changes: {} };
    }
}

const kept = typeof localStorage === 'undefined' ? { layout: 'usual', changes: {} } : stored();
let layoutId = kept.layout;
let current = mergeBindings(kept.changes, layoutId);
const listeners = new Set();

function changed() {
    try {
        // Only what differs from the layout's keys is kept
        const base = layoutKeys(layoutId);
        const changes = {};
        for (const action of ACTIONS) {
            if (current[action.id] !== base[action.id]) changes[action.id] = current[action.id];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ layout: layoutId, changes }));
    } catch (e) {
        // Storage unavailable: the change lasts for this visit
    }
    listeners.forEach(listener => listener());
}

// The action a pressed key stands for (from a keyboard event's code), or null
export function actionFor(code) {
    if (!code) return null;
    return Object.keys(current).find(id => current[id] === code) || null;
}

export function keyOf(actionId) {
    return current[actionId] || null;
}

// The key of an action as shown to the player
export function keyName(actionId) {
    return keyLabel(keyOf(actionId));
}

export function setKey(actionId, code) {
    current = assignKey(current, actionId, code);
    changed();
}

// Back to the keys of a layout: the one in use, unless another is named
export function resetKeys(layout = layoutId) {
    layoutId = layoutOf(layout).id;
    current = mergeBindings({}, layoutId);
    changed();
}

// The layout the keys started from
export function currentLayout() {
    return layoutId;
}

// Call back whenever the bindings change (to redraw the keys shown on screen)
export function onKeysChanged(listener) {
    listeners.add(listener);
}
