// Account awareness for the main menu.
//
// When the game is served by the site, the page sets window.INPUT_BOOT with who is playing:
//   { user: { name, avatar, coins } | null, skip: { costPerZone, unlocked } | null, guestName, csrfToken, embedded, urls: { scores, login, register, logout, profile } }
// "embedded" means the site shows the game under its own header, which has the account links.
// Opened on its own (no site around it) there is no INPUT_BOOT and the game behaves as before.

import { formatCoins } from '../utils/coins.js';

export const siteBoot = window.INPUT_BOOT || null;

// The logged-in player's account name, or null for guests
export function getAccountName() {
    return siteBoot && siteBoot.user ? siteBoot.user.name : null;
}

const DEFAULT_PORTRAIT = 'assets/player/efto.png';

// Picture for the player panel: the account's profile image when it has one
export function getPortraitUrl() {
    return (siteBoot && siteBoot.user && siteBoot.user.avatar) || DEFAULT_PORTRAIT;
}

// Point the player panel's portrait at that picture; back to the stock one if it fails to load.
// A player's own picture is marked, so the compact panel (which drops the stock portrait) keeps it.
export function applyPortrait(root = document) {
    const url = getPortraitUrl();

    root.querySelectorAll('.player-portrait img').forEach((img) => {
        const frame = img.parentElement;

        img.onerror = () => {
            img.onerror = null;
            img.src = DEFAULT_PORTRAIT;
            frame.classList.remove('is-profile-image');
        };
        img.src = url;
        frame.classList.toggle('is-profile-image', url !== DEFAULT_PORTRAIT);
    });
}

// Name to offer a guest who hasn't typed one
export function getGuestName() {
    return siteBoot ? siteBoot.guestName || null : null;
}

function link(text, href) {
    const anchor = document.createElement('a');
    anchor.textContent = text;
    anchor.href = href;
    return anchor;
}

// Fill the line under the name box: who you are playing as, and the way in or out
export function renderAccountBar() {
    const bar = document.getElementById('accountBar');
    if (!bar) return;

    bar.textContent = '';
    if (!siteBoot || siteBoot.embedded) {
        bar.hidden = true;
        return;
    }
    bar.hidden = false;

    const accountName = getAccountName();
    const label = document.createElement('span');
    label.className = 'account-bar-label';

    if (accountName) {
        label.textContent = `Logged in as ${accountName} · ${formatCoins(siteBoot.user.coins)}`;

        // Logging out is a POST, so it needs a real form with the session token
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = siteBoot.urls.logout;
        const token = document.createElement('input');
        token.type = 'hidden';
        token.name = '_token';
        token.value = siteBoot.csrfToken;
        const button = document.createElement('button');
        button.type = 'submit';
        button.className = 'account-bar-link';
        button.textContent = 'Log out';
        form.append(token, button);

        bar.append(label, link('Profile', siteBoot.urls.profile), form);
    } else {
        label.textContent = 'Playing as a guest';
        bar.append(label, link('Log in', siteBoot.urls.login), link('Register', siteBoot.urls.register));
    }
}
