// The inventory: what the hunter carries and what the player keeps.
//
//   Bags       the slots of the backpack and the bags added to it, and during a game the
//              stacks in them. Bags are bought here, with coins, when no game is on.
//   Materials  the crafting materials kept on the account, with what this game has caught
//   Gear       what is worn: the character sheet has it
//
// Like the character sheet it opens over the starting window or over the paused game. The
// rules of the bags are in utils/bags.js; this file draws them and passes on what the player
// asks for.

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
 *        For that the state has owned (ids), carried (ids), carryLimit and playing.
 * @param {Function} options.onOpenGear - () open the character sheet
 */
export function initializeInventory(options) {
    game = options;

    const layer = element('inventory');
    if (!layer) return;

    element('inventoryClose').addEventListener('click', closeInventory);
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
        button.classList.toggle('is-shown', shown);
        button.setAttribute('aria-selected', String(shown));
    });

    const body = element('inventoryBody');
    body.textContent = '';

    if (tab === 'bags') renderBags(body, state);
    if (tab === 'materials') renderMaterials(body, state);
    if (tab === 'gear') renderGear(body, state);
}

// One slot of a bag, holding a stack or nothing
function slotOf(stack) {
    const slot = make('div', 'inventory-slot');
    if (!stack) return slot;

    const item = itemById(stack.itemId);
    const kind = categoryOf(item);
    slot.classList.add(`is-${kind}`);
    slot.title = `${item ? item.name : stack.itemId}${stack.count > 1 ? ` (${stack.count})` : ''} · ${kind === 'material' ? 'crafting material, kept' : 'sold when the game ends'}`;

    if (item) {
        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        slot.append(picture);
    }
    if (stack.count > 1) slot.append(make('span', 'inventory-count', String(stack.count)));
    return slot;
}

function renderBags(body, state) {
    const stack = gameConfig.bags.stack;
    const stacks = stacksOf(state.contents, stack);
    const used = slotsUsed(state.contents, stack);
    // Less is lost with gear that helps carrying
    const share = Math.round((1 - state.fullBagLoss) * 100);

    const summary = make('p', 'inventory-summary');
    summary.append(
        make('strong', used >= state.capacity ? 'is-full' : '', `${used} of ${state.capacity} slots taken`),
        document.createTextNode(state.playing
            ? ` · a slot holds ${stack} of one kind. ${used >= state.capacity ? `The bags are full: what does not fit sells for ${share}%.` : `Once they are full, what does not fit sells for ${share}%.`}`
            : ` · a slot holds ${stack} of one kind. Everything a game catches goes in here; once they are full, what does not fit sells for ${share}%.`)
    );
    body.append(summary);

    const grid = make('div', 'inventory-grid');
    for (let index = 0; index < state.capacity; index++) {
        grid.append(slotOf(stacks[index] || null));
    }
    body.append(grid);

    const short = Object.values(state.overflow).reduce((total, count) => total + count, 0);
    if (short > 0) {
        body.append(make('p', 'inventory-note', `${short} ${short === 1 ? 'thing' : 'things'} did not fit this game and ${short === 1 ? 'was' : 'were'} sold short.`));
    }

    renderBagShop(body, state);
}

// The bags themselves: the backpack, the ones bought, and the ones for sale
function renderBagShop(body, state) {
    body.append(make('h3', 'inventory-subheading', 'Your bags'));

    const owned = make('div', 'inventory-bags');
    owned.append(make('span', 'inventory-bag', `Backpack · ${gameConfig.bags.backpack} slots`));
    for (let index = 0; index < state.bagSlots; index++) {
        const size = state.bags[index];
        owned.append(make('span', size ? 'inventory-bag' : 'inventory-bag is-empty', size ? `Bag · ${size} slots` : 'Empty bag slot'));
    }
    body.append(owned);

    if (!state.forSale) {
        body.append(make('p', 'inventory-note', 'Bags are bought with coins, which an account keeps. Log in to buy one.'));
        return;
    }
    if (state.playing) {
        body.append(make('p', 'inventory-note', 'Bags are bought between games.'));
        return;
    }

    const smallest = state.bags.length >= state.bagSlots ? Math.min(...state.bags) : 0;
    const shop = make('div', 'inventory-shop');

    for (const [size, price] of Object.entries(state.forSale)) {
        const tooSmall = Number(size) <= smallest;
        const button = make('button', 'inventory-buy');
        button.type = 'button';
        button.disabled = !state.canSpend || tooSmall || state.coins < price;
        button.append(make('span', '', `${size} slots`), make('span', 'inventory-price', formatCoins(price)));
        button.title = tooSmall
            ? 'Every bag you have is at least that big'
            : state.coins < price ? 'Not enough coins' : smallest ? `Replaces your ${smallest}-slot bag` : 'Adds to your backpack';
        button.addEventListener('click', async () => {
            button.disabled = true;
            notice = await game.onBuyBag(Number(size));
            render();
        });
        shop.append(button);
    }
    body.append(shop);

    const purse = state.canSpend
        ? `Purse: ${formatCoins(state.coins)}.${smallest ? ` Every slot has a bag: a bigger one replaces the smallest.` : ''}`
        : 'Activate your account to spend coins.';
    body.append(make('p', 'inventory-note', notice || purse));
}

function renderMaterials(body, state) {
    // What is kept, with what this game has in its bags on top
    const counts = { ...state.bank };
    const caught = {};
    for (const [itemId, count] of Object.entries(state.contents)) {
        if (MATERIALS.has(itemId)) caught[itemId] = count;
    }

    body.append(make('p', 'inventory-summary', state.loggedIn
        ? 'Crafting materials are kept on your account, not sold. They will be made into things that help in a game.'
        : 'Crafting materials are kept on an account, not sold. As a guest, what you catch is gone when the game ends.'));

    const ids = [...MATERIALS].filter(itemId => counts[itemId] || caught[itemId]);
    if (ids.length === 0) {
        body.append(make('p', 'inventory-note', 'None yet. Cloth, leather, herbs, bars, gems and the like are materials.'));
        return;
    }

    const list = make('div', 'inventory-list');
    for (const itemId of ids) {
        const item = itemById(itemId);
        const row = make('div', 'inventory-row');
        const picture = make('img');
        picture.src = item ? item.image : '';
        picture.alt = '';

        const text = make('span', 'inventory-row-text');
        text.append(make('span', 'inventory-row-name', item ? item.name : itemId));
        if (caught[itemId]) text.append(make('span', 'inventory-row-note', `+${caught[itemId]} in your bags this game`));

        row.append(picture, text, make('span', 'inventory-row-count', String(counts[itemId] || 0)));
        list.append(row);
    }
    body.append(list);
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
function renderGear(body, state) {
    const open = make('button', 'inventory-buy inventory-open-gear', 'Open the character sheet');
    open.type = 'button';
    open.addEventListener('click', () => game.onOpenGear());

    if (!state.loggedIn) {
        body.append(
            make('p', 'inventory-summary', 'The gear you find in a game is yours for that game.'),
            open,
            make('p', 'inventory-note', 'Gear is kept on an account. Log in to keep what you find.')
        );
        return;
    }

    const carried = new Set(state.carried);
    const full = carried.size >= state.carryLimit;
    const summary = make('p', 'inventory-summary');
    summary.append(
        make('strong', full ? 'is-full' : '', `Carrying ${carried.size} of ${state.carryLimit}`),
        document.createTextNode(state.playing
            ? ' · this is what your hunter took into the game. The rest waits in the bank until it is over.'
            : ' · your hunter takes this much gear into a game, what he wears among it. Only what he carries can be put on while playing; the rest waits in the bank.')
    );
    body.append(summary, open);

    const owned = state.owned.map(itemId => wearableById(itemId)).filter(Boolean)
        .map(item => ({ item, count: state.gear[item.id] || 1, sells: Boolean(state.gear[item.id]) && item.value > 0 }));

    if (owned.length === 0) {
        body.append(make('p', 'inventory-note', 'Nothing yet. Set pieces fall in a game, and every boss drops an item when it falls.'));
        return;
    }

    // Everything spare, in one press
    const spares = owned.filter(entry => entry.sells && entry.count > 1);
    const spareCoins = spares.reduce((total, entry) => total + (entry.count - 1) * entry.item.value, 0);
    if (spares.length > 0 && state.canSpend) {
        const all = make('button', 'inventory-buy inventory-sell-all', `Sell every spare one · ${formatCoins(spareCoins)}`);
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
        body.append(all);
    }
    if (notice) body.append(make('p', 'inventory-note is-warning', notice));
    if (!state.canSpend) body.append(make('p', 'inventory-note', 'Activate your account to sell things.'));

    // What is carried first, then the bank
    for (const [title, entries] of [
        ['With your hunter', owned.filter(entry => carried.has(entry.item.id))],
        ['In the bank', owned.filter(entry => !carried.has(entry.item.id))],
    ]) {
        if (entries.length === 0) continue;

        body.append(make('h3', 'inventory-heading', `${title} (${entries.length})`));
        const list = make('div', 'inventory-list');
        for (const entry of entries) list.append(gearRow(entry, state, carried, full));
        body.append(list);
    }
}

function gearRow({ item, count, sells }, state, carried, full) {
    const worn = state.worn.includes(item.id);
    const taken = carried.has(item.id);
    const row = make('div', 'inventory-row inventory-gear');
    row.dataset.rarity = item.rarity || 'epic';

    const picture = make('img');
    picture.src = item.image;
    picture.alt = '';

    const about = [item.from, worn ? 'being worn' : '', sells ? `sells for ${formatCoins(item.value)}` : ''].filter(Boolean).join(' · ');
    const text = make('span', 'inventory-row-text');
    text.append(
        make('span', 'inventory-row-name', count > 1 ? `${item.name} ×${count}` : item.name),
        make('span', 'inventory-row-note', statsText(itemStats(item, gameConfig.sets)) || 'No stats'),
        ...(about ? [make('span', 'inventory-row-from', about)] : [])
    );

    const buttons = make('span', 'inventory-row-buttons');

    // Take it along, or leave it in the bank: between games only
    if (!state.playing) {
        const carry = make('button', 'inventory-sell inventory-carry', taken ? 'Leave' : 'Take');
        carry.type = 'button';
        carry.classList.toggle('is-last', taken);
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
        const button = make('button', 'inventory-sell');
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
