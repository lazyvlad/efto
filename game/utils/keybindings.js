// Which key does what, and the player's own choices.
//
// Keys are told apart by where they are on the keyboard ("KeyE", "Digit1": the browser's
// event.code), not by the letter they type. So the keys stay where they are whatever the
// keyboard is set to: on a Cyrillic layout the key in E's place still shoots.
//
// The actions and their usual keys are listed here; a player's changes are kept in the
// browser. Esc (pause) is not in the list: the browser itself uses it to let the mouse go.

export const ACTIONS = [
    { id: 'autoshot', name: 'Autoshot', key: 'KeyE' },
    { id: 'multishot', name: 'Multishot', key: 'KeyR' },
    { id: 'arcane_shot', name: 'Arcane Shot', key: 'KeyT' },
    { id: 'dragon_cry', name: 'Dragon Cry', key: 'KeyQ' },
    { id: 'zandalari', name: 'Zandalari', key: 'KeyW' },
    { id: 'set_1', name: 'Wear the first set', key: 'Digit1' },
    { id: 'set_2', name: 'Wear the second set', key: 'Digit2' },
    { id: 'set_3', name: 'Wear the third set', key: 'Digit3' },
    { id: 'settings', name: 'Open and close Settings', key: 'KeyS' }
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

// The keys in use, { action: code }: the usual ones with the player's changes over them.
// Changes naming a key that cannot be bound, or an action that is no more, are left out.
export function mergeBindings(changes = {}) {
    const keys = {};
    for (const action of ACTIONS) {
        const chosen = changes ? changes[action.id] : null;
        keys[action.id] = canBind(chosen) ? chosen : action.key;
    }
    return keys;
}

// Give an action a key. If another action had that key, the two change places, so no key
// ever does two things and no action is left without one.
export function assignKey(keys, actionId, code) {
    if (!canBind(code) || !(actionId in keys)) return keys;

    const next = { ...keys };
    const holder = Object.keys(next).find(id => next[id] === code);
    if (holder && holder !== actionId) next[holder] = next[actionId];
    next[actionId] = code;
    return next;
}

// ----- The bindings in use -----

function stored() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
        return {};
    }
}

let current = typeof localStorage === 'undefined' ? mergeBindings() : mergeBindings(stored());
const listeners = new Set();

function changed() {
    try {
        // Only what differs from the usual keys is kept
        const changes = {};
        for (const action of ACTIONS) {
            if (current[action.id] !== action.key) changes[action.id] = current[action.id];
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(changes));
    } catch (e) {
        // Storage unavailable: the change lasts for this visit
    }
    listeners.forEach(listener => listener());
}

// The action a pressed key stands for (from a keyboard event's code), or null
export function actionFor(code) {
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

export function resetKeys() {
    current = mergeBindings();
    changed();
}

// Call back whenever the bindings change (to redraw the keys shown on screen)
export function onKeysChanged(listener) {
    listeners.add(listener);
}
