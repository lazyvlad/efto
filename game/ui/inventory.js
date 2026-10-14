// The inventory: what the hunter carries and what the player keeps.
//
//   Bags   the slots of the backpack and the bags added to it, and during a game the stacks
//          in them; the crafting materials kept on the account under them; and the bag vendor
//          beside them. Bags are bought here, with coins, when no game is on.
//   Gear   everything owned that can be worn, as what the hunter takes into a game and what
//          stays in the bank, with the way to sell what is spare
//
// It is one of the game's windows (styles/game-window.css), and like the character sheet it
// opens over the starting window or over the paused game. The rules of the bags are in
// utils/bags.js; this file draws them and passes on what the player asks for.

import { gameItems } from '../data/gameItems.js';
import { gameConfig } from '../config/gameConfig.js';
import { MATERIALS, categoryOf } from '../data/materials.js';
import { stacksOf, slotsUsed } from '../utils/bags.js';
import { formatCoins } from '../utils/coins.js';
import { wearableById } from '../data/wearables.js';
import { itemStats } from '../utils/gear.js';

let game = null;        // What the game gave when it set the inventory up
let tab = 'bags';
let whenClosed = null;
let notice = '';

const element = id => document.getElementById(id);

function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const itemById = id => gameItems.find(item => item.id === id) || null;

export function isInventoryOpen() {
    const layer = element('inventory');
    return Boolean(layer) && !layer.hidden;
}

/**
 * Set the inventory up.
 * @param {Object} options
 * @param {Function} options.getState - () => { playing, contents, overflow, capacity, bags (sizes
 *        owned), bagSlots, forSale ({ size: price } or null), coins (or null for a guest),
 *        canSpend, bank ({ itemId: count }), loggedIn }
 *        Also gear ({ itemId: count }), worn (item ids) and fullBagLoss (0-1).
 * @param {Function} options.onBuyBag - (size) => Promise resolving to an error message or ''
 * @param {Function} options.onSell - (itemId, count) => Promise resolving to an error message or ''
 * @param {Function} options.onCarry - (itemId, take) take a thing into the game or leave it in
 *        the bank; returns an error message or ''
 *        For that the state has owned (ids), carried (ids), carryLimit and playing, and scene
 *        and figure: the pictures of the place and the hunter for the gear tab.
 * @param {Function} options.onOpenGear - () open the character sheet
 */
export function initializeInventory(options) {
    game = options;

    const layer = element('inventory');
    if (!layer) return;

    element('inventoryClose').addEventListener('click', closeInventory);
    element('inventoryCharacter').addEventListener('click', () => game.onOpenGear());
    layer.addEventListener('click', event => {
        if (event.target === layer) closeInventory();
    });
    layer.querySelectorAll('.inventory-tab').forEach(button => {
        button.addEventListener('click', () => {
            tab = button.dataset.tab;
            notice = '';
            render();
        });
    });
    // Esc closes the inventory and nothing else
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isInventoryOpen()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeInventory();
        }
    }, true);
}

export function openInventory(onClose = null) {
    const layer = element('inventory');
    if (!layer || !game) return;

    whenClosed = onClose;
    notice = '';
    layer.hidden = false;
    render();
    element('inventoryClose').focus({ preventScroll: true });
}

export function closeInventory() {
    const layer = element('inventory');
    if (!layer || layer.hidden) return;

    layer.hidden = true;
    const done = whenClosed;
    whenClosed = null;
    if (done) done();
}

// Something changed: draw it again if the inventory is on the screen
export function refreshInventory() {
    if (isInventoryOpen()) render();
}

function render() {
    const state = game.getState();

    document.querySelectorAll('#inventory .inventory-tab').forEach(button => {
        const shown = button.dataset.tab === tab;
        button.classList.toggle('is-on', shown);
        button.setAttribute('aria-selected', String(shown));
    });

    // What the player has to spend
    const purse = element('inventoryPurse');
    purse.hidden = state.coins === null;
    purse.textContent = '';
    if (state.coins !== null) purse.append('You have ', make('strong', '', formatCoins(state.coins)));

    const body = element('inventoryBody');
    body.textContent = '';
    const main = make('div', 'inventory-main');
    const side = make('aside', 'inventory-side');
    body.append(main, side);

    if (tab === 'gear') {
        renderGear(main, side, state);
    } else {
        renderBags(main, state);
        renderMaterials(main, state);
        renderBagShop(side, state);
    }
}

// A card with a heading, and small words beside it
function card(title, label, className = '') {
    const box = make('section', `window-card ${className}`.trim());
    const heading = make('div', 'window-card-title');
    heading.append(make('h3', '', title));
    if (label) heading.append(make('span', 'window-label', label));
    box.append(heading);
    return box;
}

// One slot of a bag, holding a stack or nothing
function slotOf(stack) {
    const slot = make('div', 'inventory-slot');
    if (!stack) return slot;

    const item = itemById(stack.itemId);
    const kind = categoryOf(item);
    slot.classList.add(`is-${kind}`);
    slot.title = `${item ? item.name : stack.itemId}${stack.count > 1 ? ` (${stack.count})` : ''} · ${kind === 'material' ? 'crafting material, kept' : kind === 'gear' ? 'gear, kept' : 'sold when the game ends'}`;

    if (item) {
        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        slot.append(picture);
    }
    if (stack.count > 1) slot.append(make('span', 'inventory-count', String(stack.count)));
    return slot;
}

function renderBags(main, state) {
    const stack = gameConfig.bags.stack;
    const stacks = stacksOf(state.contents, stack);
    const used = slotsUsed(state.contents, stack);
    // Less is lost with gear that helps carrying
    const share = Math.round((1 - state.fullBagLoss) * 100);

    const box = card('In your bags', `${used} of ${state.capacity} slots · a slot holds ${stack} of one kind`, 'inventory-bags-card');
    if (!state.playing) box.append(make('p', 'inventory-text', 'Everything a game catches goes in here.'));

    const grid = make('div', 'inventory-grid');
    for (let index = 0; index < state.capacity; index++) {
        grid.append(slotOf(stacks[index] || null));
    }
    box.append(grid);

    // The bags themselves: the backpack and the ones bought
    const bags = make('div', 'inventory-bag-row');
    bags.append(make('span', 'window-label', 'Your bags'), make('span', 'inventory-bag', `Backpack · ${gameConfig.bags.backpack}`));
    for (let index = 0; index < state.bagSlots; index++) {
        const size = state.bags[index];
        bags.append(make('span', size ? 'inventory-bag' : 'inventory-bag is-empty', size ? `Bag · ${size}` : 'Empty'));
    }
    bags.append(make('span', 'inventory-bag-note window-warning', used >= state.capacity
        ? `The bags are full: what does not fit sells for ${share}%`
        : `Once they are full, what does not fit sells for ${share}%`));
    box.append(bags);

    const short = Object.values(state.overflow).reduce((total, count) => total + count, 0);
    if (short > 0) {
        box.append(make('p', 'inventory-text window-warning', `${short} ${short === 1 ? 'thing' : 'things'} did not fit this game and ${short === 1 ? 'was' : 'were'} sold short.`));
    }
    main.append(box);
}

// The bag vendor
function renderBagShop(side, state) {
    const box = make('section', 'window-card inventory-side-card');
    box.append(make('p', 'window-label', 'The bag vendor'), make('h3', 'inventory-side-title', 'More room'));
    box.append(make('p', 'inventory-text', `A bag adds its slots to your backpack. You can hang ${state.bagSlots}; once every place has one, a bigger bag takes the place of your smallest.`));
    side.append(box);

    if (!state.forSale) {
        box.append(make('p', 'inventory-text', 'Bags are bought with coins, which an account keeps. Log in to buy one.'));
        return;
    }
    if (state.playing) {
        box.append(make('p', 'inventory-text', 'Bags are bought between games.'));
        return;
    }

    const smallest = state.bags.length >= state.bagSlots ? Math.min(...state.bags) : 0;
    const total = gameConfig.bags.backpack + state.bags.reduce((sum, size) => sum + size, 0);
    const list = make('div', 'inventory-list');

    for (const [size, price] of Object.entries(state.forSale)) {
        const tooSmall = Number(size) <= smallest;
        const after = smallest ? total - smallest + Number(size) : total + Number(size);
        const row = make('div', 'window-item inventory-vendor-row');
        const text = make('span', 'window-item-text');
        text.append(
            make('span', 'window-item-name', `${size}-slot bag`),
            make('span', 'window-item-note', tooSmall
                ? 'You have one this size or bigger'
                : `${after} slots in all${smallest ? `, in place of your ${smallest}-slot bag` : ''}`)
        );

        const button = make('button', 'game-btn is-primary is-figures', formatCoins(price));
        button.type = 'button';
        button.disabled = !state.canSpend || tooSmall || state.coins < price;
        button.title = tooSmall ? 'Every bag you have is at least that big' : state.coins < price ? 'Not enough coins' : `Buy the ${size}-slot bag`;
        button.addEventListener('click', async () => {
            button.disabled = true;
            notice = await game.onBuyBag(Number(size));
            render();
        });
        row.append(text, button);
        list.append(row);
    }
    box.append(list);

    if (notice) box.append(make('p', 'inventory-text window-warning', notice));
    if (!state.canSpend) box.append(make('p', 'inventory-text', 'Activate your account to spend coins.'));
    box.append(make('p', 'inventory-text inventory-fine', 'Junk is sold for coins as a game ends. Materials go to the bank. Gear is kept.'));
}

function renderMaterials(main, state) {
    // What is kept, with what this game has in its bags on top
    const counts = { ...state.bank };
    const caught = {};
    for (const [itemId, count] of Object.entries(state.contents)) {
        if (MATERIALS.has(itemId)) caught[itemId] = count;
    }

    const box = card('Materials kept', state.loggedIn ? 'Brought back from your games, for crafting' : 'Kept on an account', 'inventory-materials-card');
    main.append(box);

    const ids = [...MATERIALS].filter(itemId => counts[itemId] || caught[itemId]);
    if (!state.loggedIn) {
        box.append(make('p', 'inventory-text', 'Crafting materials are kept on an account, not sold. As a guest, what you catch is gone when the game ends.'));
    }
    if (ids.length === 0) {
        box.append(make('p', 'inventory-text', 'None yet. Cloth, leather, herbs, bars, gems and the like are materials; they will be made into things that help in a game.'));
        return;
    }

    const grid = make('div', 'inventory-materials');
    for (const itemId of ids) {
        const item = itemById(itemId);
        const row = make('div', 'window-item');
        row.dataset.rarity = 'rare';
        const picture = make('img');
        picture.src = item ? item.image : '';
        picture.alt = '';

        const text = make('span', 'window-item-text');
        text.append(make('span', 'window-item-name inventory-plain-name', item ? item.name : itemId));
        if (caught[itemId]) text.append(make('span', 'window-item-note', `+${caught[itemId]} in your bags this game`));

        row.append(picture, text, make('span', 'inventory-row-count', String(counts[itemId] || 0)));
        grid.append(row);
    }
    box.append(grid);
}

// "+7 armor, +5 health, carrying +2%"
function statsText(stats = {}) {
    return [
        stats.attackPower ? `+${stats.attackPower} attack power` : '',
        stats.armor ? `+${stats.armor} armor` : '',
        stats.health ? `+${stats.health} health` : '',
        stats.crit ? `+${stats.crit}% crit` : '',
        stats.dodge ? `+${stats.dodge}% dodge` : '',
        stats.carrying ? `carrying +${stats.carrying}%` : '',
    ].filter(Boolean).join(', ');
}

// Sell, then say what happened and draw the list again
async function sell(itemId, count) {
    notice = (await game.onSell(itemId, count)) || '';
    render();
}

// Everything owned that can be worn. A hunter takes only so much of it into a game, what he
// wears among it: each thing is either taken along or left in the bank, and that is chosen
// here, between games. Gear that is not a piece of a set can also be sold: only one of a
// thing can be worn, so the spare ones are for selling, and the last one can be sold too,
// after a warning: it is then no longer the player's to wear.
function renderGear(main, side, state) {
    const owned = state.loggedIn ? state.owned.map(itemId => wearableById(itemId)).filter(Boolean)
        .map(item => ({ item, count: state.gear[item.id] || 1, sells: Boolean(state.gear[item.id]) && item.value > 0 })) : [];
    const carried = new Set(state.carried);
    const full = carried.size >= state.carryLimit;

    renderCarrySide(side, state, owned, carried, full);

    if (!state.loggedIn) {
        const box = card('Your gear', '');
        box.append(make('p', 'inventory-text', 'The gear you find in a game is yours for that game. Gear is kept on an account: log in to keep what you find, and choose here what your hunter takes along.'));
        main.append(box);
        return;
    }
    if (owned.length === 0) {
        const box = card('Your gear', '');
        box.append(make('p', 'inventory-text', 'Nothing yet. Set pieces fall in a game, and every boss drops an item when it falls.'));
        main.append(box);
        return;
    }

    const columns = make('div', 'inventory-gear-columns');
    const lists = [
        ['With your hunter', `${carried.size} of ${state.carryLimit}`, owned.filter(entry => carried.has(entry.item.id))],
        ['In the bank', '', owned.filter(entry => !carried.has(entry.item.id))],
    ];
    for (const [title, label, entries] of lists) {
        const box = card(title, label || `${entries.length} ${entries.length === 1 ? 'thing' : 'things'}`, 'inventory-gear-card');
        const list = make('div', 'inventory-list');
        if (entries.length === 0) list.append(make('p', 'inventory-text', title === 'In the bank' ? 'Nothing: your hunter carries all you own.' : 'Nothing yet.'));
        for (const entry of entries) list.append(gearRow(entry, state, carried, full));
        box.append(list);
        columns.append(box);
    }
    main.append(columns);
}

// Beside the gear: the hunter, how much he carries, and the way to sell what is spare
function renderCarrySide(side, state, owned, carried, full) {
    const box = make('section', 'window-card inventory-side-card inventory-carry-card');

    const scene = make('div', 'inventory-scene');
    // (made whole first: a url() in a style is read against the stylesheet, not the page)
    if (state.scene) scene.style.setProperty('--inventory-scene', `url("${new URL(state.scene, document.baseURI).href}")`);
    if (state.figure) {
        const hunter = make('img');
        hunter.src = state.figure;
        hunter.alt = '';
        scene.append(hunter);
    }
    box.append(scene);

    const text = make('div', 'inventory-side-text');
    box.append(text);
    side.append(box);

    if (!state.loggedIn) {
        text.append(make('p', 'window-label', 'What he takes into a game'), make('h3', 'inventory-side-title', 'Log in to keep gear'));
        return;
    }

    text.append(make('p', 'window-label', state.playing ? 'What he took into this game' : 'What he takes into a game'));
    text.append(make('h3', 'inventory-side-title', `Carrying ${carried.size} of ${state.carryLimit}`));

    const bar = make('div', 'inventory-bar');
    const fill = make('div', 'inventory-bar-fill');
    fill.style.width = `${Math.min(100, Math.round(carried.size / state.carryLimit * 100))}%`;
    bar.append(fill);
    text.append(bar);

    text.append(make('p', 'inventory-text', state.playing
        ? 'Only what he took along can be put on now. The rest waits in the bank until the game is over.'
        : 'Only what he carries can be put on while playing. The rest waits in the bank until the game is over.'));
    if (!state.playing) text.append(make('p', 'inventory-text window-warning', 'What he wears counts: leaving a thing that is on takes it off.'));
    if (notice) text.append(make('p', 'inventory-text window-warning', notice));

    // Everything spare, in one press
    const spares = owned.filter(entry => entry.sells && entry.count > 1);
    const spareCoins = spares.reduce((total, entry) => total + (entry.count - 1) * entry.item.value, 0);
    const end = make('div', 'inventory-side-end');
    text.append(end);

    if (!state.canSpend) {
        end.append(make('p', 'inventory-text', 'Activate your account to sell things.'));
        return;
    }
    if (spares.length === 0) {
        end.append(make('p', 'inventory-text inventory-fine', 'You have no spare copies. Only one of a thing can be worn: when you find a second, it can be sold here.'));
        return;
    }

    end.append(make('p', 'inventory-text inventory-fine', `You own spare copies of ${spares.length} ${spares.length === 1 ? 'thing' : 'things'}. Only one of each can be worn.`));
    const all = make('button', 'game-btn is-primary is-figures inventory-sell-all', `Sell every spare one · ${formatCoins(spareCoins)}`);
    all.type = 'button';
    all.title = 'Sells all but one of each. Nothing you can wear is lost.';
    all.addEventListener('click', async () => {
        all.disabled = true;
        for (const entry of spares) {
            notice = (await game.onSell(entry.item.id, entry.count - 1)) || '';
            if (notice) break;
        }
        render();
    });
    end.append(all);
}

function gearRow({ item, count, sells }, state, carried, full) {
    const worn = state.worn.includes(item.id);
    const taken = carried.has(item.id);
    const row = make('div', 'window-item inventory-gear');
    row.dataset.rarity = item.rarity || 'epic';

    const picture = make('img');
    picture.src = item.image;
    picture.alt = '';

    const about = [item.from, worn ? 'being worn' : '', sells ? `sells for ${formatCoins(item.value)}${count > 1 ? ' each' : ''}` : ''].filter(Boolean).join(' · ');
    const text = make('span', 'window-item-text');
    text.append(
        make('span', 'window-item-name', count > 1 ? `${item.name} ×${count}` : item.name),
        make('span', 'window-item-stats', statsText(itemStats(item, gameConfig.sets)) || 'No stats'),
        ...(about ? [make('span', 'window-item-note', about)] : [])
    );

    const buttons = make('span', 'inventory-row-buttons');

    // Take it along, or leave it in the bank: between games only
    if (!state.playing) {
        const carry = make('button', taken ? 'game-btn inventory-carry' : 'game-btn is-on inventory-carry', taken ? 'Leave' : 'Take');
        carry.type = 'button';
        carry.disabled = !taken && full;
        carry.title = taken
            ? `Leave it in the bank${worn ? ', which takes it off' : ''}`
            : (full ? `Your hunter already carries ${state.carryLimit} things` : 'Take it into the game');
        carry.addEventListener('click', () => {
            notice = game.onCarry(item.id, !taken) || '';
            render();
        });
        buttons.append(carry);
    }

    if (sells && state.canSpend) {
        const button = make('button', 'game-btn is-figures inventory-sell');
        button.type = 'button';

        if (count > 1) {
            // The default: all but one, so it can still be worn
            button.textContent = `Sell ${count - 1} spare`;
            button.title = `Keeps one to wear. Pays ${formatCoins((count - 1) * item.value)}.`;
            button.addEventListener('click', () => {
                button.disabled = true;
                sell(item.id, count - 1);
            });
        } else {
            button.textContent = 'Sell the last';
            button.classList.add('is-last');
            button.title = `Pays ${formatCoins(item.value)}. You will no longer be able to wear it.`;
            button.addEventListener('click', () => {
                const warning = `This is your only ${item.name}${worn ? ', and you are wearing it' : ''}. Once it is sold you can no longer wear it, until you find another. Sell it for ${formatCoins(item.value)}?`;
                if (!window.confirm(warning)) return;
                button.disabled = true;
                sell(item.id, 1);
            });
        }
        buttons.append(button);
    }

    row.append(picture, text, buttons);
    return row;
}
