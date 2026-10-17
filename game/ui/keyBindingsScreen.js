// Changing which key does what (Settings, Controls), and showing the keys in use wherever
// the page names one.
//
// Anything in the page marked data-key-of="<action>" has its text kept as that action's key:
// the buttons of the spell bar, the keys named in How to Play. The bindings themselves are
// utils/keybindings.js.

import { ACTIONS, LAYOUTS, keyName, setKey, resetKeys, canBind, onKeysChanged, currentLayout } from '../utils/keybindings.js';

let waitingFor = null;      // The action a key is being chosen for: { id, button }

// Write the keys in use wherever the page names one
function showKeys() {
    document.querySelectorAll('[data-key-of]').forEach(element => {
        // In the list of keys an action with none says so; elsewhere it shows nothing
        element.textContent = keyName(element.dataset.keyOf) || (element.classList.contains('key-binding-key') ? 'None' : '');
    });
    document.querySelectorAll('#keyLayouts [data-layout]').forEach(button => {
        const on = button.dataset.layout === currentLayout();
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', String(on));
    });
}

function stopWaiting() {
    if (!waitingFor) return;

    waitingFor.button.classList.remove('key-binding-waiting');
    waitingFor = null;
    showKeys();
}

// The next key pressed is the one. Listened for ahead of everything else on the page, so the
// key does only this: it does not also cast a spell or close the settings.
function onKeyDown(event) {
    if (!waitingFor) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.code === 'Escape') {
        stopWaiting();
        return;
    }
    // A key that cannot be bound (Shift on its own, Tab, F5): keep waiting for another
    if (!canBind(event.code)) return;

    const action = waitingFor.id;
    stopWaiting();
    setKey(action, event.code);
}

export function initializeKeyBindings() {
    // The layouts to start from: picking one puts its keys in place of all the others
    const layouts = document.getElementById('keyLayouts');
    if (layouts) {
        for (const layout of LAYOUTS) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'game-btn';
            button.dataset.layout = layout.id;
            button.textContent = layout.name;
            button.addEventListener('click', () => {
                stopWaiting();
                resetKeys(layout.id);
            });
            layouts.append(button);
        }
    }

    const list = document.getElementById('keyBindingsList');
    if (list) {
        for (const action of ACTIONS) {
            const row = document.createElement('div');
            row.className = 'key-binding';

            const name = document.createElement('span');
            name.className = 'key-binding-name';
            name.textContent = action.name;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'key-binding-key';
            button.dataset.keyOf = action.id;
            button.title = `Change the key for ${action.name}`;
            button.addEventListener('click', () => {
                const again = waitingFor && waitingFor.id === action.id;
                stopWaiting();
                if (again) return;

                waitingFor = { id: action.id, button };
                button.classList.add('key-binding-waiting');
                button.textContent = 'Press a key';
            });

            row.append(name, button);
            list.append(row);
        }
    }

    const reset = document.getElementById('resetKeysBtn');
    if (reset) {
        reset.addEventListener('click', () => {
            stopWaiting();
            resetKeys();
        });
    }

    document.addEventListener('keydown', onKeyDown, true);
    // Clicking anywhere else gives up the choice
    document.addEventListener('click', event => {
        if (waitingFor && !waitingFor.button.contains(event.target)) stopWaiting();
    });

    onKeysChanged(showKeys);
    showKeys();
}
