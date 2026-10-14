// A question the game asks in a window of its own, over whatever is open (in place of the
// browser's confirm and prompt boxes): a yes or no, or a name to type.
//
//   if (await askConfirm({ title: 'Forget "Boss gear"?', text: '...', yes: 'Forget it' })) ...
//   const name = await askText({ title: 'Name this set', value: 'Set 1', yes: 'Save', maxLength: 24 });
//
// Each resolves when it is answered: true or false, or the text typed (trimmed) or null.
// Enter answers yes, Escape or a click outside no. While it is open every key is its own, so
// typing a name never sets off the game's keys.

let open = null;    // { finish } of the question being asked

function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function ask({ title, text, yes = 'OK', no = 'Cancel', danger = false, input = null }) {
    if (open) open.finish(null);

    return new Promise(resolve => {
        const layer = make('div', 'game-dialog-layer');
        const box = make('div', 'game-dialog game-window');
        box.setAttribute('role', 'dialog');
        box.setAttribute('aria-modal', 'true');
        const heading = make('h3', 'game-dialog-title', title);
        heading.id = `gameDialogTitle${Date.now()}`;
        box.setAttribute('aria-labelledby', heading.id);
        box.append(heading);
        if (text) box.append(make('p', 'game-dialog-text', text));

        let field = null;
        if (input) {
            field = make('input', 'game-dialog-input');
            field.type = 'text';
            field.value = input.value || '';
            field.maxLength = input.maxLength || 40;
            field.setAttribute('aria-label', title);
            field.autocomplete = 'off';
            field.spellcheck = false;
            box.append(field);
        }

        const buttons = make('div', 'game-dialog-buttons');
        const cancel = make('button', 'game-btn', no);
        cancel.type = 'button';
        const confirm = make('button', danger ? 'game-btn is-primary game-dialog-danger' : 'game-btn is-primary', yes);
        confirm.type = 'button';
        buttons.append(cancel, confirm);
        box.append(buttons);
        layer.append(box);

        const before = document.activeElement;
        const answer = () => (field ? (field.value.trim() || null) : true);
        const refresh = () => { if (field) confirm.disabled = !field.value.trim(); };

        function onKey(event) {
            // The dialog's own: nothing behind it hears a key while it is open
            event.stopPropagation();
            if (event.key === 'Escape') {
                event.preventDefault();
                finish(field ? null : false);
            } else if (event.key === 'Enter' && !confirm.disabled) {
                event.preventDefault();
                finish(answer());
            } else if (event.key === 'Tab') {
                // Round the dialog's own things only
                const stops = [field, cancel, confirm].filter(Boolean);
                const at = stops.indexOf(document.activeElement);
                event.preventDefault();
                stops[(at + (event.shiftKey ? stops.length - 1 : 1)) % stops.length].focus();
            }
        }
        const stopKey = event => event.stopPropagation();

        function finish(value) {
            if (!open) return;
            open = null;
            window.removeEventListener('keydown', onKey, true);
            window.removeEventListener('keyup', stopKey, true);
            window.removeEventListener('keypress', stopKey, true);
            layer.remove();
            if (before && document.contains(before) && typeof before.focus === 'function') before.focus();
            resolve(value);
        }

        open = { finish };
        cancel.addEventListener('click', () => finish(field ? null : false));
        confirm.addEventListener('click', () => finish(answer()));
        layer.addEventListener('pointerdown', event => {
            if (event.target === layer) finish(field ? null : false);
        });
        if (field) field.addEventListener('input', refresh);
        window.addEventListener('keydown', onKey, true);
        window.addEventListener('keyup', stopKey, true);
        window.addEventListener('keypress', stopKey, true);

        document.body.append(layer);
        refresh();
        if (field) {
            field.focus();
            field.select();
        } else {
            confirm.focus();
        }
    });
}

/**
 * A yes or no.
 * @param {Object} question - { title, text, yes, no, danger (the yes undoes something) }
 * @returns {Promise<boolean>}
 */
export function askConfirm(question) {
    return ask(question).then(Boolean);
}

/**
 * A name or a few words, typed.
 * @param {Object} question - { title, text, value (to start from), yes, no, maxLength }
 * @returns {Promise<string|null>} What was typed, trimmed, or null if it was let be
 */
export function askText({ value = '', maxLength = 40, ...question }) {
    return ask({ ...question, input: { value, maxLength } });
}

// Whether a question is being asked (the game's keys wait while one is)
export function isDialogOpen() {
    return open !== null;
}
