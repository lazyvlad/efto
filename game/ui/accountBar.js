// Account awareness for the main menu.
//
// When the game is served by the site, the page sets window.INPUT_BOOT with who is playing:
//   { user: { name, avatar, coins, verified, quiver, pieces } | null, skip: { costPerZone, unlocked } | null, rush: { fee } | null, guestName, csrfToken, embedded, urls: { scores, games, collection, verify, history, login, register, logout, profile } }
// "embedded" means the site shows the game under its own header, which has the account links.
// Opened on its own (no site around it) there is no INPUT_BOOT and the game behaves as before.

import { formatCoins } from '../utils/coins.js';

export const siteBoot = window.INPUT_BOOT || null;

// The logged-in player's account name, or null for guests
export function getAccountName() {
    return siteBoot && siteBoot.user && !siteBoot.user.guest ? siteBoot.user.name : null;
}

// Playing on a guest account: what he finds is his in this browser, kept by the site, until he
// signs up and it comes along (App\Support\GuestHunter)
export function isGuestAccount() {
    return Boolean(siteBoot && siteBoot.user && siteBoot.user.guest);
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

// Sign up and log in, the guest's way to keep what he found for good
function accountButtons(signUpFirst) {
    const buttons = document.createElement('div');
    buttons.className = 'login-offer-buttons';
    const choices = signUpFirst
        ? [['Sign up', siteBoot.urls.register, 'login-offer-btn login-offer-primary'], ['Log in', siteBoot.urls.login, 'login-offer-btn']]
        : [['Log in', siteBoot.urls.login, 'login-offer-btn login-offer-primary'], ['Register', siteBoot.urls.register, 'login-offer-btn']];
    for (const [label, href, className] of choices) {
        const anchor = link(label, href);
        anchor.className = className;
        if (siteBoot.embedded) anchor.target = '_top';
        buttons.append(anchor);
    }
    return buttons;
}

function link(text, href) {
    const anchor = document.createElement('a');
    anchor.textContent = text;
    anchor.href = href;
    return anchor;
}

// A guest is offered an account before the name box: logging in is what keeps coins, boss
// loot and scores. Under the site's own header the game sits in a frame, so the links open
// in the whole window.
function renderLoginOffer() {
    const offer = document.getElementById('loginOffer');
    const prompt = document.getElementById('nameEntryPrompt');
    if (!offer) return;

    const guest = Boolean(siteBoot) && !siteBoot.user;
    const guestAccount = isGuestAccount();
    // Logged in, but the account has not been activated through the emailed link: the player
    // earns as usual, and is told what activating adds
    const inactive = Boolean(siteBoot) && Boolean(siteBoot.user) && !guestAccount && siteBoot.user.verified === false;
    offer.textContent = '';
    offer.hidden = !guest && !inactive && !guestAccount;

    if (prompt) {
        prompt.textContent = guestAccount
            ? 'Playing as a guest: what you find is yours in this browser. Sign up any time to keep it for good:'
            : guest
            ? 'Log in to keep your coins, boss loot and scores, or play as a guest:'
            : inactive
                ? 'Activate your account to spend coins, wear your sets and carry the large quiver. Until then you keep earning:'
                : (getAccountName() ? 'Playing under your account name' : 'Enter your name to start playing');
    }
    if (inactive) {
        const buttons = document.createElement('div');
        buttons.className = 'login-offer-buttons';
        const anchor = link('Activate my account', siteBoot.urls.verify);
        anchor.className = 'login-offer-btn login-offer-primary';
        if (siteBoot.embedded) anchor.target = '_top';
        buttons.append(anchor);
        offer.append(buttons);
        return;
    }
    if (!guest && !guestAccount) return;

    offer.append(accountButtons(guestAccount));
}

// A logged-in player's coins, at the top of the starting window. Shown under the site's
// header too, which has the account links but not the purse.
function renderPurse() {
    const purse = document.getElementById('startPurse');
    if (!purse) return;

    const user = siteBoot ? siteBoot.user : null;
    purse.hidden = !user;
    purse.textContent = '';
    if (!user) return;

    const amount = document.createElement('strong');
    amount.textContent = formatCoins(user.coins);
    purse.append('Purse: ', amount);
    if (user.guest) purse.append(' · sign up to spend it');
}

// Fill the line under the name box: who you are playing as, and the way in or out
export function renderAccountBar() {
    renderLoginOffer();
    renderPurse();

    const bar = document.getElementById('accountBar');
    if (!bar) return;

    bar.textContent = '';
    // Guests have the offer above; under the site's header the account links are up there
    if (!siteBoot || siteBoot.embedded || !siteBoot.user || siteBoot.user.guest) {
        bar.hidden = true;
        return;
    }
    bar.hidden = false;

    const accountName = getAccountName();
    const label = document.createElement('span');
    label.className = 'account-bar-label';

    if (accountName) {
        label.textContent = `Logged in as ${accountName}`;

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
    }
}
