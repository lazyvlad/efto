// A guest's account (App\Support\GuestHunter on the site): what a guest finds is his in this
// browser, for a week after he last plays, and comes along when he signs up.
//
// Two windows, once a visit, as the game opens:
//   - a guest coming back is told he is continuing his guest session, and what is in it, with
//     the ways on: carry on, sign up to keep it, or start fresh (which lets it all go);
//   - someone logged in with a guest session still in this browser is asked whether to bring
//     what it found to his account, each hunter's to his own.
// The site says which, if either (INPUT_BOOT.welcomeBack, INPUT_BOOT.guestMerge).

import { siteBoot } from './accountBar.js';
import { askConfirm } from './gameDialog.js';
import { formatCoins } from '../utils/coins.js';

const SIDES = { alliance: 'Alliance hunter', horde: 'Horde hunter' };

function make(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
}

function plural(count, one, many = `${one}s`) {
    return `${count} ${count === 1 ? one : many}`;
}

// One hunter's part of a guest session, a line at a time
function hunterLines(hunter) {
    if (!hunter) return ['Not played yet'];
    const lines = [plural(hunter.games, 'game')];
    if (hunter.bosses) lines.push(`${plural(hunter.bosses, 'boss', 'bosses')} beaten`);
    const found = [];
    if (hunter.gear) found.push(plural(hunter.gear, 'piece') + ' of gear');
    if (hunter.pieces) found.push(plural(hunter.pieces, 'set piece'));
    if (found.length) lines.push(found.join(' · '));
    if (hunter.materials) lines.push(`${plural(hunter.materials, 'material')} in his bags and bank`);
    return lines;
}

function hunterCards(summary, heading = side => SIDES[side]) {
    const cards = make('div', 'guest-hunters');
    for (const side of Object.keys(SIDES)) {
        const card = make('div', `guest-hunter is-${side}`);
        card.append(make('h4', 'guest-hunter-name', heading(side)));
        for (const line of hunterLines(summary.hunters[side])) card.append(make('p', 'guest-hunter-line', line));
        cards.append(card);
    }
    return cards;
}

function post(url, body = {}) {
    return fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken },
        body: JSON.stringify(body),
    }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
    });
}

// A window of its own over the menu; every key is its own while it is open
function openPanel(build) {
    const layer = make('div', 'game-dialog-layer');
    const box = make('div', 'game-dialog game-window guest-panel');
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    layer.append(box);

    const stop = event => event.stopPropagation();
    const close = () => {
        window.removeEventListener('keydown', stop, true);
        window.removeEventListener('keyup', stop, true);
        layer.remove();
    };
    build(box, close);
    window.addEventListener('keydown', stop, true);
    window.addEventListener('keyup', stop, true);
    document.body.append(layer);
    const first = box.querySelector('button, a');
    if (first) first.focus();
}

function signUpLink(label, className) {
    const anchor = make('a', className, label);
    anchor.href = siteBoot.urls.register;
    if (siteBoot.embedded) anchor.target = '_top';
    return anchor;
}

function welcomeBack(summary) {
    const since = new Date(summary.since).toLocaleDateString(undefined, { day: 'numeric', month: 'long' });
    openPanel((box, close) => {
        box.append(
            make('h3', 'game-dialog-title', `Welcome back, ${siteBoot.user.name}`),
            make('p', 'game-dialog-text', `You are continuing your guest session from ${since}. Everything you found is still yours, in this browser.`),
            hunterCards(summary),
        );
        if (summary.coins > 0) box.append(make('p', 'guest-coins', `${formatCoins(summary.coins)} earned as a guest · spend it once you sign up`));

        const buttons = make('div', 'game-dialog-buttons guest-buttons');
        const carryOn = make('button', 'game-btn is-primary', 'Continue');
        carryOn.type = 'button';
        carryOn.addEventListener('click', close);
        const fresh = make('button', 'game-btn guest-fresh', 'Start fresh');
        fresh.type = 'button';
        fresh.addEventListener('click', async () => {
            const sure = await askConfirm({
                title: 'Leave this guest session behind?',
                text: 'All your hunters found as a guest, and the coins earned, go with it, for good.',
                yes: 'Start fresh',
                no: 'Keep it',
                danger: true,
            });
            if (!sure) return;
            fresh.disabled = true;
            post(siteBoot.urls.guestForget).then(() => window.location.reload()).catch(() => { fresh.disabled = false; });
        });
        buttons.append(fresh, signUpLink('Sign up to keep it for good', 'game-btn is-on'), carryOn);
        box.append(buttons);
        box.append(make('p', 'guest-fine', 'Not you? Start fresh. A guest session lives in this browser only: clearing it, or a week without playing, loses it. Have an account? Log in, and what you found here can join it.'));
    });
}

function bringOver(summary) {
    openPanel((box, close) => {
        box.append(
            make('h3', 'game-dialog-title', `Bring your guest finds to ${siteBoot.user.name}?`),
            make('p', 'game-dialog-text', 'This browser has a guest session too. What each of its hunters found goes to the same hunter on your account; gear waits in his bank.'),
            hunterCards(summary, side => `${SIDES[side]} gets`),
        );
        if (summary.coins > 0) box.append(make('p', 'guest-coins', `${formatCoins(summary.coins)} into your purse`));

        const buttons = make('div', 'game-dialog-buttons guest-buttons');
        const leave = make('button', 'game-btn', 'Leave them');
        leave.type = 'button';
        const bring = make('button', 'game-btn is-primary', 'Bring them over');
        bring.type = 'button';
        const answer = (yes, button) => {
            button.disabled = true;
            post(siteBoot.urls.guestMerge, { bring: yes })
                .then(() => (yes ? window.location.reload() : close()))
                .catch(() => { button.disabled = false; });
        };
        leave.addEventListener('click', () => answer(false, leave));
        bring.addEventListener('click', () => answer(true, bring));
        buttons.append(leave, bring);
        box.append(buttons);
        box.append(make('p', 'guest-fine', 'Left, the guest session stays in this browser, to go back to after logging out.'));
    });
}

// As the game opens: the one window the site asked for, if any
export function showGuestSession() {
    if (!siteBoot || !siteBoot.urls) return;
    if (siteBoot.welcomeBack && siteBoot.user && siteBoot.user.guest) welcomeBack(siteBoot.welcomeBack);
    else if (siteBoot.guestMerge && siteBoot.user && !siteBoot.user.guest) bringOver(siteBoot.guestMerge);
}
