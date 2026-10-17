// The inventory: what the hunter carries and what the player keeps.
//
//   Bags      his 36 (the gear he takes into fights) on the left; the slots of the backpack and
//             the bags added to it in the middle, with what is in them (what a game catches,
//             and materials and potions, which stay in them between games); the bank's
//             materials on the right, moved into the bags and back between games. The bag
//             vendor is behind its button, bags bought with coins when no game is on.
//   Gear      everything owned that can be worn, as what the hunter takes into a game and what
//             stays in the bank, with the way to sell what is spare
//   Crafting  the recipes, made between games from what is in the bags, into the bags
//
// It is one of the game's windows (styles/game-window.css), and like the character sheet it
// opens over the starting window or over the paused game. The rules of the bags are in
// utils/bags.js; this file draws them and passes on what the player asks for.

import { askConfirm, askText } from './gameDialog.js';
import { gameItems } from '../data/gameItems.js';
import { gameConfig } from '../config/gameConfig.js';
import { quiverText } from '../utils/quiver.js';
import { MATERIALS, categoryOf } from '../data/materials.js';
import { stacksOf, stackOf, slotsUsed, roomFor as roomInBags } from '../utils/bags.js';
import { craftedById, canMake } from '../data/crafting.js';
import { formatCoins } from '../utils/coins.js';
import { wearableById } from '../data/wearables.js';
import { itemStats, groupByKind, slotsFor } from '../utils/gear.js';

let game = null;        // What the game gave when it set the inventory up
let tab = 'bags';
let whenClosed = null;
let notice = '';
// Gear picked in one of the two lists of the Gear tab, to move to the other in one go:
// { list: 'carried' or 'bank', ids: Set, last: the id pressed last, for a range with Shift }
let picked = { list: null, ids: new Set(), last: null };
let drawnTab = null;     // The tab drawn last, to keep where its lists were scrolled to
let dragging = null;    // { list, ids } while gear is dragged from one list towards the other
let pickedStack = null; // The kind of thing picked in the bags, to move or craft with
let sideShows = 'bank'; // What the Bags tab shows beside the bags: 'bank' or 'vendor'
let recipeId = null;    // The recipe open on the Crafting tab
let makeCount = 1;      // How many of it to make
let busy = false;       // A move or a craft on its way to the site
// A piece of gear picked on the Bags tab, on him, in his 36 or in his bags: { id, from }
let gearPick = null;
let switching = null;   // A worn piece, while what goes on in its place is picked

function clearPicked() {
    picked = { list: null, ids: new Set(), last: null };
    gearPick = null;
    switching = null;
}

const element = id => document.getElementById(id);

function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// Anything that can be in the bags or the bank: an item of the game, or something crafted
const itemById = id => gameItems.find(item => item.id === id) || craftedById(id) || null;

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
 *        For the bags and crafting: contents (what is in the bags), recipes ([{ id, item,
 *        needs }]), potion ({ id, heal, cooldown, key }), carried and worn (for his 36).
 * @param {Function} options.onBuyBag - (size) => Promise resolving to an error message or ''
 * @param {Function} options.onMove - (itemId, count, 'bags' or 'bank') between games, a stack
 *        between the bank and the bags => Promise resolving to an error message or ''
 * @param {Function} options.onCraft - (recipeId, count) => the same
 * @param {Function} options.onSell - (itemId, count) => Promise resolving to an error message or ''
 * @param {Function} options.onCarry - (itemIds, take) take things into the game or leave them
 *        in the bank, as many as there is room for; returns an error message or ''
 *        For that the state has owned (ids, what the hunter of the side, faction, can wear),
 *        carried (ids), carryLimit and playing, and scene
 *        and figure: the pictures of the place and the hunter for the gear tab.
 * @param {Function} options.onShowSide - (side) between games: show (and play) that side's
 *        hunter. The state's faction, name and level say whose inventory it is.
 * @param {Function} options.onOpenGear - () open the character sheet
 * @param {Function} options.onCloseAll - () close the inventory and every menu, and go on with
 *        the game if one is under way (Back goes to where it was opened from)
 */
export function initializeInventory(options) {
    game = options;

    const layer = element('inventory');
    if (!layer) return;

    element('inventoryClose').addEventListener('click', closeInventory);
    element('inventoryCharacter').addEventListener('click', () => game.onOpenGear());
    layer.querySelectorAll('.inventory-side-btn').forEach(button => {
        button.addEventListener('click', () => {
            if (button.dataset.side === game.getState().faction) return;
            game.onShowSide(button.dataset.side);
            notice = '';
            clearPicked();
            drawnTab = null;
            render();
        });
    });
    element('inventoryCloseAll').addEventListener('click', () => game.onCloseAll());
    layer.addEventListener('click', event => {
        if (event.target === layer) closeInventory();
    });
    layer.querySelectorAll('.inventory-tab').forEach(button => {
        button.addEventListener('click', () => {
            tab = button.dataset.tab;
            notice = '';
            clearPicked();
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

export function openInventory(onClose = null, onTab = null) {
    const layer = element('inventory');
    if (!layer || !game) return;

    whenClosed = onClose;
    if (onTab) tab = onTab;
    notice = '';
    clearPicked();
    drawnTab = null;
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

    // Whose it is: the hunter being played, or the one picked between games
    const faction = state.faction === 'horde' ? 'horde' : 'alliance';
    const sideName = faction === 'horde' ? 'Horde' : 'Alliance';
    element('inventory').dataset.side = faction;
    const subtitle = element('inventorySubtitle');
    subtitle.textContent = state.playing ? `${sideName} hunter \u00b7 Level ${state.level}` : `${sideName} hunter`;
    subtitle.dataset.side = faction;
    element('inventoryTitle').textContent = state.name || 'Hunter';
    element('inventorySides').hidden = state.playing;
    element('inventoryPlaying').hidden = !state.playing;
    element('inventoryBackWhere').textContent = state.backWhere || '';
    document.querySelectorAll('#inventorySides .inventory-side-btn').forEach(button => {
        const shown = button.dataset.side === faction;
        button.classList.toggle('is-on', shown);
        button.setAttribute('aria-pressed', String(shown));
    });

    // What the player has to spend (one purse, both hunters')
    const purse = element('inventoryPurse');
    purse.hidden = state.coins === null;
    purse.textContent = '';
    if (state.coins !== null) purse.append('Purse ', make('strong', '', formatCoins(state.coins)));
    purse.title = 'One purse for both hunters';

    const body = element('inventoryBody');
    // Drawn again after a press (Take, Leave, a pick): every list stays where it was scrolled to
    const scrolled = tab === drawnTab ? scrollPositions(body) : null;
    body.textContent = '';
    body.dataset.tab = tab;
    const main = make('div', 'inventory-main');
    const side = make('aside', 'inventory-side');
    body.append(main, side);

    if (tab === 'gear') {
        renderGear(main, side, state);
    } else if (tab === 'crafting') {
        const recipesSide = make('aside', 'inventory-left');
        body.insertBefore(recipesSide, main);
        renderCrafting(recipesSide, main, side, state);
    } else {
        // His 36 on the left, the bags, and the bank (or the bag vendor) beside them
        const carry = make('aside', 'inventory-left');
        body.insertBefore(carry, main);
        renderCarry(carry, state);
        renderBags(main, state);
        if (sideShows === 'vendor') renderBagShop(side, state);
        else renderBank(side, state);
    }

    if (scrolled) restoreScroll(body, scrolled);
    drawnTab = tab;
}

// What scrolls in the inventory, each by a name that stays the same when it is drawn again
function scrollers(body) {
    const found = { body, main: body.querySelector('.inventory-main'), side: body.querySelector('.inventory-side-card') };
    body.querySelectorAll('.inventory-gear-card[data-list]').forEach(box => {
        found[`list-${box.dataset.list}`] = box.querySelector('.inventory-list');
    });
    return found;
}

function scrollPositions(body) {
    const positions = {};
    for (const [name, node] of Object.entries(scrollers(body))) {
        if (node) positions[name] = node.scrollTop;
    }
    return positions;
}

function restoreScroll(body, positions) {
    for (const [name, node] of Object.entries(scrollers(body))) {
        if (node && positions[name]) node.scrollTop = positions[name];
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

// What kind of thing is in a slot: kept for crafting, crafted, gear, or sold when the game ends
function kindOf(itemId) {
    if (craftedById(itemId)) return 'crafted';
    return categoryOf(itemById(itemId));
}

// Whether a thing is kept in the bags and the bank between games
const isKept = itemId => MATERIALS.has(itemId) || Boolean(craftedById(itemId));

// One slot of a bag, holding a stack or nothing. A kept thing's slot can be picked between
// games, to move it or craft with it.
function slotOf(stack, state) {
    if (!stack) return make('div', 'inventory-slot');

    const item = itemById(stack.itemId);
    const kind = kindOf(stack.itemId);
    const pickable = Boolean(state) && state.loggedIn && !state.playing && isKept(stack.itemId);
    const slot = make(pickable ? 'button' : 'div', `inventory-slot is-${kind}`);
    // A legendary thing (a Binding of the Windseeker) in its colour
    if (craftedById(stack.itemId) && craftedById(stack.itemId).rarity === 'legendary') slot.classList.add('is-legendary');
    if (pickable) {
        slot.type = 'button';
        slot.classList.toggle('is-picked', pickedStack === stack.itemId);
        slot.addEventListener('click', () => {
            pickedStack = pickedStack === stack.itemId ? null : stack.itemId;
            notice = '';
            render();
        });
    }
    slot.title = `${item ? item.name : stack.itemId}${stack.count > 1 ? ` (${stack.count})` : ''} · ${{
        material: 'crafting material, kept', crafted: 'crafted, kept', gear: 'gear, kept',
    }[kind] || 'sold when the game ends'}`;

    if (item) {
        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        slot.append(picture);
    }
    if (stack.count > 1) slot.append(make('span', 'inventory-count', String(stack.count)));
    return slot;
}

// How many more of a kind fit in the bags (utils/bags.js)
function roomFor(itemId, contents, capacity) {
    return roomInBags(contents, itemId, capacity, gameConfig.bags.stack);
}

// Move between the bank and the bags, then say what happened and draw it again
async function move(itemId, count, to) {
    if (busy || count < 1) return;
    busy = true;
    notice = (await game.onMove(itemId, count, to)) || '';
    busy = false;
    if (!notice && to === 'bank' && pickedStack === itemId) pickedStack = null;
    render();
}

// All that is in the bags to the bank: each stack, then each piece of gear kept there
async function emptyBags(state) {
    if (busy) return;
    busy = true;
    let problem = '';
    for (const [itemId, count] of Object.entries(state.contents)) {
        if (count > 0) problem = (await game.onMove(itemId, count, 'bank')) || problem;
    }
    for (const itemId of [...(state.bagged || [])]) problem = game.onMoveGear(itemId, 'bank') || problem;
    busy = false;
    pickedStack = null;
    gearPick = null;
    notice = problem || 'Your bags are empty: everything is in the bank.';
    render();
}

// Slots free in the bags between games: what is in them and the gear kept there take the rest
function freeSlots(state) {
    return Math.max(0, state.capacity - slotsUsed(state.contents, gameConfig.bags.stack) - (state.bagged || []).length);
}

// Whether a piece can go on where this worn one is
function fitsWhereWorn(state, wornId, itemId) {
    const slotId = Object.keys(state.equipment || {}).find(slot => state.equipment[slot] === wornId);
    const item = wearableById(itemId);
    return Boolean(slotId && item && itemId !== wornId && slotsFor(item).includes(slotId));
}

// Do a move of gear, then say what happened (the game answers at once)
function gearAction(run) {
    notice = run() || '';
    gearPick = null;
    switching = null;
    render();
}

// A piece of gear in a slot: on him, in his 36 or in his bags. Between games it can be picked,
// and while a worn piece is being switched, what can go on in its place is lit and picked.
function gearSlot(itemId, from, state, className) {
    const item = itemId ? wearableById(itemId) : null;
    const movable = Boolean(item) && state.loggedIn && !state.playing;
    const slot = make(movable ? 'button' : 'div', item ? className : `${className} is-empty`);
    if (!item) return slot;

    slot.dataset.rarity = item.set ? 'epic' : item.rarity || 'epic';
    slot.title = item.name;
    const picture = make('img');
    picture.src = item.image;
    picture.alt = '';
    slot.append(picture);
    if (!movable) return slot;

    slot.type = 'button';
    const candidate = switching && from !== 'worn' && fitsWhereWorn(state, switching, itemId);
    slot.classList.toggle('is-candidate', Boolean(candidate));
    slot.classList.toggle('is-picked', Boolean(gearPick && gearPick.id === itemId && gearPick.from === from));
    slot.addEventListener('click', () => {
        if (candidate) {
            const wornId = switching;
            gearAction(() => game.onSwitchGear(wornId, itemId));
            return;
        }
        switching = null;
        notice = '';
        gearPick = gearPick && gearPick.id === itemId && gearPick.from === from ? null : { id: itemId, from };
        render();
    });
    return slot;
}

// Under what holds it: the piece picked, and where it can go
function gearBar(state) {
    const item = wearableById(gearPick.id);
    const bar = make('div', 'inventory-picked inventory-gear-picked');
    const picture = make('img');
    picture.src = item ? item.image : '';
    picture.alt = '';
    const text = make('span', 'window-item-text');
    const worn = new Set(state.worn);
    const full = state.inHis36 >= state.carryLimit;
    const free = freeSlots(state);

    if (switching) {
        text.append(
            make('span', 'window-item-name', `In place of ${item ? item.name : 'it'}`),
            make('span', 'window-item-note', 'Pick what goes on: what can is lit, in his 36 and in your bags. The two trade places.'),
        );
        bar.append(picture, text, button('Cancel', '', () => { switching = null; render(); }));
        return bar;
    }

    const where = { worn: 'Worn · takes no room', '36': `In his ${state.carryLimit}`, bags: 'In a bag · takes one slot · to wear it, it goes into his 36' }[gearPick.from];
    text.append(make('span', 'window-item-name', item ? item.name : gearPick.id), make('span', 'window-item-note', where));
    bar.append(picture, text);

    const move = to => () => gearAction(() => game.onMoveGear(gearPick.id, to));
    if (gearPick.from !== 'worn') {
        const where = Object.keys(state.equipment || {}).find(slot => slotsFor(item).includes(slot));
        const putOn = button('Put on', 'is-primary', () => gearAction(() => game.onWearGear(gearPick.id)));
        const swaps = slotsFor(item).every(slot => state.equipment && state.equipment[slot]) && where;
        putOn.title = swaps ? `In place of ${(wearableById(state.equipment[where]) || {}).name || 'what is worn there'}, which takes its place` : 'Put it on';
        bar.append(putOn);
    }
    if (gearPick.from !== '36') {
        const into = button(full ? `To his ${state.carryLimit} · full` : `To his ${state.carryLimit}`, gearPick.from === 'bags' ? 'is-on' : '', move('36'));
        into.disabled = full;
        bar.append(into);
    }
    if (gearPick.from !== 'bags') {
        const toBags = button(free ? 'To bags' : 'To bags · full', gearPick.from === '36' ? 'is-on' : '', move('bags'));
        toBags.disabled = free < 1;
        bar.append(toBags);
    }
    if (gearPick.from === 'worn') {
        const others = [...state.carried.filter(id => !worn.has(id)), ...(state.bagged || [])];
        const switchFor = button('Switch for…', full && free < 1 ? 'is-on' : '', () => { switching = gearPick.id; render(); });
        switchFor.disabled = !others.some(id => fitsWhereWorn(state, gearPick.id, id));
        switchFor.title = switchFor.disabled ? 'Nothing in his 36 or your bags goes there' : 'Trade it for a piece in his 36 or your bags';
        bar.append(switchFor);
    }
    bar.append(button('To the bank', '', move('bank')));
    return bar;
}

function button(label, kind, run) {
    const node = make('button', `game-btn ${kind}`.trim(), label);
    node.type = 'button';
    node.addEventListener('click', run);
    return node;
}

// What he wears, then his 36: the gear he carries besides it, a slot each. What he wears takes
// no place in his 36; taken off, a piece goes into it. Between games a piece picked can go into
// his 36, his bags or the bank, a worn one be switched for another, and all he wears go into
// the bags at once.
function renderCarry(column, state) {
    const box = make('section', 'window-card inventory-left-card');
    const worn = new Set(state.worn);
    const carried = state.carried ? [...state.carried] : [...worn];
    const onHim = carried.filter(itemId => worn.has(itemId));
    const inHis36 = carried.filter(itemId => !worn.has(itemId));
    if (gearPick && gearPick.from !== 'bags' && !(gearPick.from === 'worn' ? onHim : inHis36).includes(gearPick.id)) gearPick = null;
    if (switching && !onHim.includes(switching)) switching = null;

    box.append(make('p', 'window-label', 'With your hunter, into every fight'));
    const wornHeading = make('div', 'window-card-title');
    wornHeading.append(make('h3', '', 'On him'), make('span', 'inventory-carry-count', `${onHim.length} worn · no room taken`));
    if (state.loggedIn && !state.playing && onHim.length) {
        const allToBags = button('All to bags', 'is-on inventory-all-to-bags', () => gearAction(() => game.onWornToBags()));
        allToBags.disabled = freeSlots(state) < 1;
        allToBags.title = allToBags.disabled ? 'Your bags are full' : 'Take everything off, into your bags';
        wornHeading.append(allToBags);
    }
    box.append(wornHeading);
    const wornRow = make('div', 'inventory-carry-grid inventory-worn-row');
    for (const itemId of onHim) {
        const slot = gearSlot(itemId, 'worn', state, 'inventory-carry-slot');
        slot.append(make('span', 'inventory-carry-on'));
        wornRow.append(slot);
    }
    box.append(wornRow);
    if (gearPick && gearPick.from !== 'bags') box.append(gearBar(state));

    const heading = make('div', 'window-card-title');
    heading.append(make('h3', '', `His ${state.carryLimit}`), make('span', 'inventory-carry-count', `${inHis36.length} of ${state.carryLimit}`));
    box.append(heading);

    const grid = make('div', 'inventory-carry-grid');
    for (let index = 0; index < state.carryLimit; index++) grid.append(gearSlot(inHis36[index], '36', state, 'inventory-carry-slot'));
    box.append(grid);

    const legend = make('div', 'inventory-carry-legend');
    legend.append(make('span', 'is-room', 'Room for gear he carries but does not wear'));
    box.append(legend);

    const text = make('p', 'inventory-text inventory-fine', state.carried
        ? 'In a game he can put on only what he wears and what is in his 36. Pick a piece to move it; choose many at once under Gear.'
        : 'What he wears. With an account he takes 36 things into a game, chosen under Gear.');
    box.append(text);
    const toGear = make('button', 'game-btn inventory-carry-btn', 'Choose under Gear');
    toGear.type = 'button';
    toGear.addEventListener('click', () => {
        tab = 'gear';
        notice = '';
        render();
    });
    if (state.carried) box.append(toGear);
    column.append(box);
}

function renderBags(main, state) {
    const stack = gameConfig.bags.stack;
    const stacks = stacksOf(state.contents, stack);
    // The gear kept in the bags first, a slot a piece, then the stacks
    const bagged = state.bagged || [];
    const used = slotsUsed(state.contents, stack) + bagged.length;
    if (gearPick && gearPick.from === 'bags' && !bagged.includes(gearPick.id)) gearPick = null;
    // Less is lost with gear that helps carrying
    const share = Math.round((1 - state.fullBagLoss) * 100);
    if (pickedStack && !state.contents[pickedStack]) pickedStack = null;

    const box = card('In your bags', `${used} of ${state.capacity} slots${bagged.length ? ` · ${bagged.length} gear` : ''} · a slot holds ${stack} of one kind`, 'inventory-bags-card');
    const grid = make('div', 'inventory-grid');
    for (const itemId of bagged) {
        const slot = gearSlot(itemId, 'bags', state, 'inventory-slot is-gear-kept');
        slot.append(make('span', 'inventory-gear-badge'));
        grid.append(slot);
    }
    for (let index = 0; index < state.capacity - bagged.length; index++) {
        grid.append(slotOf(stacks[index] || null, state));
    }
    box.append(grid);
    // Everything in them to the bank at once, between games: the stacks and the gear kept there
    if (!state.playing && state.loggedIn && used > 0) {
        const empty = make('button', 'game-btn inventory-empty-bags', 'Everything to the bank');
        empty.type = 'button';
        empty.disabled = busy;
        empty.title = 'Move all that is in your bags to the bank';
        empty.addEventListener('click', () => emptyBags(state));
        box.append(empty);
    }
    if (gearPick && gearPick.from === 'bags') box.append(gearBar(state));

    // A kind picked: what can be done with it
    if (pickedStack) box.append(pickedBar(pickedStack, state));

    // The bags themselves: the backpack and the ones bought, and the vendor
    const bags = make('div', 'inventory-bag-row');
    bags.append(make('span', 'window-label', 'Your bags'), make('span', 'inventory-bag', `Backpack · ${gameConfig.bags.backpack}`));
    for (let index = 0; index < state.bagSlots; index++) {
        const size = state.bags[index];
        bags.append(make('span', size ? 'inventory-bag' : 'inventory-bag is-empty', size ? `Bag · ${size}` : 'Empty'));
    }
    const vendor = make('button', 'inventory-bag inventory-vendor-btn', sideShows === 'vendor' ? 'The bank' : 'Vendor');
    vendor.type = 'button';
    vendor.addEventListener('click', () => {
        sideShows = sideShows === 'vendor' ? 'bank' : 'vendor';
        notice = '';
        render();
    });
    bags.append(vendor);
    box.append(bags);

    box.append(make('p', 'inventory-text inventory-fine', state.playing
        ? `What he picks up goes in here. Once they are full, what does not fit sells for ${share}%.`
        : `What he picks up in a game goes in here, and stays between games. Craft from what is in your bags. Once they are full, what does not fit sells for ${share}%.`));
    if (used >= state.capacity) box.append(make('p', 'inventory-text window-warning', 'The bags are full.'));

    const short = Object.values(state.overflow).reduce((total, count) => total + count, 0);
    if (short > 0) {
        box.append(make('p', 'inventory-text window-warning', `${short} ${short === 1 ? 'thing' : 'things'} did not fit this game and ${short === 1 ? 'was' : 'were'} sold short.`));
    }
    if (notice && !notice.startsWith('Sent ') && sideShows !== 'vendor') box.append(make('p', 'inventory-text window-warning', notice));
    main.append(box);
}

// Under the bags, for the kind picked: its name and count, to the bank, or to crafting
function pickedBar(itemId, state) {
    const item = itemById(itemId);
    const count = state.contents[itemId] || 0;
    const usedIn = (state.recipes || []).filter(recipe => recipe.needs[itemId]);

    const bar = make('div', 'inventory-picked');
    const picture = make('img');
    picture.src = item ? item.image : '';
    picture.alt = '';
    const text = make('span', 'window-item-text');
    text.append(
        make('span', 'window-item-name', `${item ? item.name : itemId} · ${count}`),
        make('span', 'window-item-note', craftedById(itemId)
            ? (itemId === 'arrows' ? 'They fill the quiver as a game starts, and when it runs dry'
                : state.potionKeys && state.potionKeys[itemId] ? `Drink in a fight with ${state.potionKeys[itemId]}` : 'Crafted')
            : usedIn.length ? `Material · for ${usedIn.map(recipe => recipe.item ? `${recipe.item.name}s` : recipe.id).join(', ')}` : 'Material')
    );
    bar.append(picture, text);

    const toBank = make('button', 'game-btn', 'To the bank');
    toBank.type = 'button';
    toBank.disabled = busy;
    toBank.addEventListener('click', () => move(itemId, count, 'bank'));
    bar.append(toBank);

    if (usedIn.length) {
        const craftWith = make('button', 'game-btn is-on', 'Craft with it');
        craftWith.type = 'button';
        craftWith.addEventListener('click', () => {
            tab = 'crafting';
            recipeId = usedIn[0].id;
            makeCount = 1;
            notice = '';
            render();
        });
        bar.append(craftWith);
    }
    return bar;
}

// The bank: the materials (and what is crafted) kept without limit, moved into the bags
function renderBank(side, state) {
    const box = make('section', 'window-card inventory-side-card');
    box.append(make('p', 'window-label', 'The bank · no limit'));
    side.append(box);

    if (!state.loggedIn) {
        box.append(make('h3', 'inventory-side-title', 'Materials'));
        box.append(make('p', 'inventory-text', 'The bank is kept on an account. Log in to keep what you find, and craft with it.'));
        return;
    }
    renderBankGear(box, state);
    box.append(make('h3', 'inventory-side-title', 'Materials'));
    const ids = Object.keys(state.bank).filter(itemId => state.bank[itemId] > 0 && isKept(itemId))
        .sort((a, b) => (itemById(a)?.name || a).localeCompare(itemById(b)?.name || b));
    if (ids.length === 0) {
        box.append(make('p', 'inventory-text', 'Nothing in the bank. Materials you move out of your bags are kept here.'));
    }

    const list = make('div', 'inventory-list');
    for (const itemId of ids) {
        const item = itemById(itemId);
        const count = state.bank[itemId];
        const fits = Math.min(count, roomFor(itemId, state.contents, state.capacity));
        const row = make('div', 'window-item inventory-bank-row');
        row.dataset.rarity = craftedById(itemId) ? craftedById(itemId).rarity || 'uncommon' : 'rare';
        const picture = make('img');
        picture.src = item ? item.image : '';
        picture.alt = '';
        const text = make('span', 'window-item-text');
        text.append(make('span', 'window-item-name inventory-plain-name', item ? item.name : itemId));
        const button = make('button', 'game-btn is-on inventory-bank-btn', fits > 0 ? 'To bags' : 'No room');
        button.type = 'button';
        button.disabled = state.playing || busy || fits === 0;
        button.title = state.playing ? 'Between games' : fits === 0 ? 'Your bags are full' : fits < count ? `${fits} of them fit in your bags` : `All ${count} to your bags`;
        button.addEventListener('click', () => move(itemId, fits, 'bags'));
        // To the other hunter: materials, potions and arrows are not bound
        const other = state.otherSide === 'horde' ? 'Horde' : 'Alliance';
        const send = make('button', 'game-btn inventory-bank-btn', 'Send');
        send.type = 'button';
        send.disabled = state.playing || busy;
        send.title = state.playing ? 'Between games' : `Send to the ${other} hunter's bank`;
        send.addEventListener('click', async () => {
            const name = item ? item.name : itemId;
            const answer = await askText({ title: `Send ${name} to the ${other} hunter`, text: `How many? You have ${count}.`, value: String(count), yes: 'Send', maxLength: 6 });
            const many = Math.floor(Number(answer));
            if (!answer || !(many > 0)) return;
            busy = true;
            notice = (await game.onSend(itemId, Math.min(many, count))) || '';
            busy = false;
            if (!notice) notice = `Sent ${Math.min(many, count)} ${name} to the ${other} hunter.`;
            render();
        });
        // Something bound to him (a Binding of the Windseeker) stays his
        const bound = craftedById(itemId) && craftedById(itemId).bound;
        if (bound) text.append(make('span', 'window-item-note', 'Soulbound'));
        row.append(picture, text, make('span', 'inventory-row-count', String(count)), button, ...(bound ? [] : [send]));
        list.append(row);
    }
    box.append(list);
    if (notice && notice.startsWith('Sent ')) box.append(make('p', 'inventory-text inventory-made', notice));
    box.append(make('p', 'inventory-text inventory-fine', state.playing
        ? 'Things are moved between the bank and your bags between games.'
        : `A stack moved to your bags takes one slot for every ${gameConfig.bags.stack}; a piece of gear, one slot.`));
}

// The gear in the bank: what he owns and has neither on him, in his 36 nor in his bags. Into
// his 36 or his bags from here, between games.
function renderBankGear(box, state) {
    const away = new Set([...(state.carried || []), ...(state.bagged || [])]);
    const ids = [...new Set(state.owned || [])].filter(itemId => !away.has(itemId) && wearableById(itemId))
        .sort((a, b) => wearableById(a).name.localeCompare(wearableById(b).name));
    box.append(make('h3', 'inventory-side-title', 'Gear'));
    if (ids.length === 0) {
        box.append(make('p', 'inventory-text inventory-fine', 'No gear in the bank. What you take off and do not keep with him waits here.'));
        return;
    }
    const full = state.inHis36 >= state.carryLimit;
    const free = freeSlots(state);
    const list = make('div', 'inventory-list inventory-bank-gear');
    for (const itemId of ids) {
        const item = wearableById(itemId);
        const row = make('div', 'window-item inventory-bank-row');
        row.dataset.rarity = item.set ? 'epic' : item.rarity || 'epic';
        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        const text = make('span', 'window-item-text');
        text.append(make('span', 'window-item-name', item.name));
        const into36 = button(`To his ${state.carryLimit}`, 'is-on inventory-bank-btn', () => gearAction(() => game.onMoveGear(itemId, '36')));
        into36.disabled = state.playing || full;
        into36.title = state.playing ? 'Between games' : full ? `His ${state.carryLimit} are full` : 'Take it with him';
        const toBags = button('To bags', 'inventory-bank-btn', () => gearAction(() => game.onMoveGear(itemId, 'bags')));
        toBags.disabled = state.playing || free < 1;
        toBags.title = state.playing ? 'Between games' : free < 1 ? 'Your bags are full' : 'Into your bags: it takes a slot';
        row.append(picture, text, into36, toBags);
        list.append(row);
    }
    box.append(list);
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
    if (!state.canSpend) box.append(make('p', 'inventory-text', state.guest ? 'Sign up to spend coins: what you earn as a guest is kept for you.' : 'Activate your account to spend coins.'));
    box.append(make('p', 'inventory-text inventory-fine', 'Junk is sold for coins as a game ends. Materials stay in your bags. Gear is kept.'));
    renderMaterialShop(side, state);
}

// Materials for coins, into this hunter's bank (from there into the bags, to craft with)
function renderMaterialShop(side, state) {
    const prices = state.materialPrices || {};
    if (!state.forSale || state.playing || !Object.keys(prices).length) return;
    const box = make('section', 'window-card inventory-side-card');
    box.append(make('p', 'window-label', 'The trade goods vendor'), make('h3', 'inventory-side-title', 'Materials'));
    box.append(make('p', 'inventory-text', 'What you buy goes into your bank. Move it into your bags to craft with it.'));
    const list = make('div', 'inventory-list');
    for (const [itemId, price] of Object.entries(prices)) {
        const item = itemById(itemId);
        const row = make('div', 'window-item inventory-vendor-row inventory-material-row');
        const picture = make('img');
        picture.src = item ? item.image : '';
        picture.alt = '';
        const text = make('span', 'window-item-text');
        text.append(make('span', 'window-item-name', item ? item.name : itemId), make('span', 'window-item-note', `${formatCoins(price)} each · ${state.bank[itemId] || 0} in the bank`));
        // How many: one, five or twenty, on a line of their own under its name
        const buttons = make('span', 'inventory-material-buys');
        row.append(picture, text, buttons);
        for (const count of [1, 5, 20]) {
            const buy = make('button', 'game-btn is-figures', count === 1 ? formatCoins(price) : `${count} · ${formatCoins(price * count)}`);
            buy.type = 'button';
            buy.disabled = !state.canSpend || busy || state.coins < price * count;
            buy.title = state.coins < price * count ? 'Not enough coins' : `Buy ${count} ${item ? item.name : itemId}`;
            buy.addEventListener('click', () => buyMaterial(itemId, count));
            buttons.append(buy);
        }
        list.append(row);
    }
    box.append(list);
    side.append(box);
}

// Buy a material, then say so and draw it again
async function buyMaterial(itemId, count) {
    if (busy) return;
    busy = true;
    const item = itemById(itemId);
    notice = (await game.onBuyMaterial(itemId, count)) || `Bought ${count} ${item ? item.name : itemId}: in your bank.`;
    busy = false;
    render();
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
    // (the clothes the hunters start in too: they take up room in his 36 like anything else)
    const owned = state.loggedIn ? state.owned.map(itemId => wearableById(itemId)).filter(Boolean)
        .map(item => ({ item, count: state.gear[item.id] || 1, sells: Boolean(state.gear[item.id]) && item.value > 0 })) : [];
    const carried = new Set(state.carried);
    const full = state.inHis36 >= state.carryLimit;

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

    // Between games gear is picked (pressed, or Shift for a run of it) and moved to the other
    // list in one go, from the bar over the lists or by dragging it across with a mouse
    // Each list grouped by kind (head, chest, rings, weapons...), in the character sheet's order;
    // its entries in that order too, so a run picked with Shift is the run that is seen
    const grouped = entries => groupByKind(entries);
    const lists = [
        { key: 'carried', title: 'With your hunter', label: `${state.inHis36} of ${state.carryLimit} carried, besides what he wears`, groups: grouped(owned.filter(entry => carried.has(entry.item.id))) },
        { key: 'bank', title: 'In the bank', label: '', groups: grouped(owned.filter(entry => !carried.has(entry.item.id))) },
    ];
    for (const list of lists) list.entries = list.groups.flatMap(group => group.entries);
    if (!state.playing) main.append(pickBar(lists, state));

    const columns = make('div', 'inventory-gear-columns');
    for (const list of lists) {
        const box = card(list.title, list.label || `${list.entries.length} ${list.entries.length === 1 ? 'thing' : 'things'}`, 'inventory-gear-card');
        box.dataset.list = list.key;

        if (!state.playing && list.entries.length > 0) {
            const all = make('button', 'inventory-pick-all', list.entries.every(entry => picked.list === list.key && picked.ids.has(entry.item.id)) ? 'Pick none' : 'Pick all');
            all.type = 'button';
            all.addEventListener('click', () => {
                const every = list.entries.every(entry => picked.list === list.key && picked.ids.has(entry.item.id));
                clearPicked();
                if (!every) picked = { list: list.key, ids: new Set(list.entries.map(entry => entry.item.id)), last: null };
                render();
            });
            box.querySelector('.window-card-title').append(all);
            dropTarget(box, list.key);
        }

        const rows = make('div', 'inventory-list');
        if (list.entries.length === 0) rows.append(make('p', 'inventory-text', list.key === 'bank' ? 'Nothing: your hunter carries all you own.' : 'Nothing yet.'));
        for (const group of list.groups) {
            const heading = make('div', 'inventory-group-heading');
            heading.append(make('span', '', group.label), make('span', 'inventory-group-count', String(group.entries.length)));
            rows.append(heading);
            for (const entry of group.entries) rows.append(gearRow(entry, state, carried, full, list));
        }
        box.append(rows);
        columns.append(box);
    }
    main.append(columns);
}

// The bar over the two lists: how much is picked, and the way to move it all across
function pickBar(lists, state) {
    const bar = make('div', 'inventory-pick-bar');
    const from = lists.find(list => list.key === picked.list);
    const count = picked.ids.size;

    if (!from || count === 0) {
        bar.append(make('span', 'inventory-pick-hint', state.carried.length > 0 || lists[1].entries.length > 0
            ? 'Press things to pick them (Shift for a run of them), then move them across in one go. With a mouse you can also drag them.'
            : ''));
        return bar;
    }

    bar.classList.add('has-picked');
    bar.append(make('span', 'inventory-pick-count', `${count} picked ${from.key === 'carried' ? 'with your hunter' : 'in the bank'}`));

    const room = state.carryLimit - state.inHis36;
    const move = make('button', 'game-btn is-on inventory-pick-move', from.key === 'carried'
        ? `Leave ${count} in the bank`
        : `Take ${count} along${count > room ? ` (room for ${Math.max(0, room)})` : ''}`);
    move.type = 'button';
    move.disabled = from.key === 'bank' && room <= 0;
    move.addEventListener('click', () => moveAcross([...picked.ids], from.key === 'bank'));

    const clear = make('button', 'game-btn inventory-pick-clear', 'Clear');
    clear.type = 'button';
    clear.addEventListener('click', () => {
        clearPicked();
        render();
    });

    bar.append(move, clear);
    return bar;
}

function moveAcross(itemIds, take) {
    notice = game.onCarry(itemIds, take) || '';
    clearPicked();
    render();
}

// A list that gear dragged from the other list can be dropped on
function dropTarget(box, key) {
    box.addEventListener('dragover', event => {
        if (!dragging || dragging.list === key) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        box.classList.add('is-drop-target');
    });
    box.addEventListener('dragleave', event => {
        if (!box.contains(event.relatedTarget)) box.classList.remove('is-drop-target');
    });
    box.addEventListener('drop', event => {
        event.preventDefault();
        box.classList.remove('is-drop-target');
        if (!dragging || dragging.list === key) return;
        const { ids } = dragging;
        dragging = null;
        moveAcross(ids, key === 'carried');
    });
}

// Pick a thing, or a run of things with Shift, in one list; picking in the other list starts
// again there
function pick(list, itemId, run) {
    if (picked.list !== list.key) clearPicked();
    picked.list = list.key;

    if (run && picked.last) {
        const order = list.entries.map(entry => entry.item.id);
        const [a, b] = [order.indexOf(picked.last), order.indexOf(itemId)].sort((x, y) => x - y);
        if (a >= 0) order.slice(a, b + 1).forEach(id => picked.ids.add(id));
    } else if (picked.ids.has(itemId)) {
        picked.ids.delete(itemId);
    } else {
        picked.ids.add(itemId);
    }
    picked.last = itemId;
    if (picked.ids.size === 0) clearPicked();
    render();
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

    // Each hunter carries his own: his side's loot, and the gear either can wear
    const hunter = state.faction === 'horde' ? 'The Horde hunter' : 'The Alliance hunter';
    text.append(make('p', 'window-label', state.playing ? `What ${hunter.toLowerCase()} took into this game` : `What ${hunter.toLowerCase()} takes into a game`));
    text.append(make('h3', 'inventory-side-title', `${state.inHis36} of ${state.carryLimit} carried, besides what he wears`));

    const bar = make('div', 'inventory-bar');
    const fill = make('div', 'inventory-bar-fill');
    fill.style.width = `${Math.min(100, Math.round(state.inHis36 / state.carryLimit * 100))}%`;
    bar.append(fill);
    text.append(bar);

    text.append(make('p', 'inventory-text', state.playing
        ? 'Only what he took along can be put on now. The rest waits in the bank until the game is over.'
        : 'Only what he carries can be put on while playing. The rest waits in the bank until the game is over. His own clothes are always with him and do not count.'));
    if (!state.playing) text.append(make('p', 'inventory-text window-warning', 'What he wears counts: leaving a thing that is on takes it off.'));
    if (notice) text.append(make('p', 'inventory-text window-warning', notice));

    // Everything spare, in one press
    const spares = owned.filter(entry => entry.sells && entry.count > 1);
    const spareCoins = spares.reduce((total, entry) => total + (entry.count - 1) * entry.item.value, 0);
    const end = make('div', 'inventory-side-end');
    text.append(end);

    if (!state.canSell) {
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

function gearRow({ item, count, sells }, state, carried, full, list) {
    const worn = state.worn.includes(item.id);
    const taken = carried.has(item.id);
    const row = make('div', 'window-item inventory-gear');
    row.dataset.rarity = item.rarity || 'epic';

    // Between games: pressed to pick it, and dragged (with what else is picked) to the other list
    if (!state.playing) {
        const isPicked = picked.list === list.key && picked.ids.has(item.id);
        row.classList.add('is-pickable');
        row.classList.toggle('is-picked', isPicked);
        row.tabIndex = 0;
        row.setAttribute('role', 'checkbox');
        row.setAttribute('aria-checked', String(isPicked));
        row.addEventListener('click', event => {
            if (event.target.closest('button')) return;
            pick(list, item.id, event.shiftKey);
        });
        row.addEventListener('keydown', event => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            if (event.target !== row) return;
            event.preventDefault();
            pick(list, item.id, event.shiftKey);
        });

        row.draggable = true;
        row.addEventListener('dragstart', event => {
            const ids = isPicked ? [...picked.ids] : [item.id];
            dragging = { list: list.key, ids };
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', ids.join(','));
            row.classList.add('is-dragged');
        });
        row.addEventListener('dragend', () => {
            dragging = null;
            row.classList.remove('is-dragged');
            document.querySelectorAll('#inventory .is-drop-target').forEach(box => box.classList.remove('is-drop-target'));
        });
    }

    const picture = make('img');
    picture.src = item.image;
    picture.alt = '';
    picture.draggable = false;

    // Bound to him when picked up (boss loot, set pieces, his own clothes), or when worn: gear
    // that falls in a game can be sent to the other hunter until then
    const bound = (state.bound && state.bound[item.id]) || 0;
    const sendable = item.binding === 'equip' ? Math.max(0, count - bound) : 0;
    const binding = item.binding === 'equip'
        ? (sendable === 0 ? 'Bound (worn)' : bound > 0 ? `Binds when equipped · ${sendable} not yet bound` : 'Binds when equipped')
        : 'Soulbound';
    const inBags = (state.bagged || []).includes(item.id);
    const about = [item.itemLevel ? `Item level ${item.itemLevel}` : '', binding, item.twoHanded ? 'Two-handed' : '', item.from, worn ? 'being worn' : '', inBags ? 'in your bags' : '', sells ? `sells for ${formatCoins(item.value)}${count > 1 ? ' each' : ''}` : ''].filter(Boolean).join(' · ');
    const text = make('span', 'window-item-text');
    text.append(
        make('span', 'window-item-name', count > 1 ? `${item.name} ×${count}` : item.name),
        make('span', 'window-item-stats', [statsText(itemStats(item, gameConfig.sets)), quiverText(item, gameConfig.quiver)].filter(Boolean).join(' · ') || 'No stats'),
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
        carry.addEventListener('click', () => moveAcross([item.id], !taken));
        buttons.append(carry);
        // Not taken: it can wait in the bags instead of the bank, a slot of them
        if (!taken && state.loggedIn) {
            const free = freeSlots(state);
            const bagIt = make('button', 'game-btn inventory-carry', inBags ? 'To bank' : 'To bags');
            bagIt.type = 'button';
            bagIt.disabled = !inBags && free < 1;
            bagIt.title = inBags ? 'Out of your bags, into the bank' : (free < 1 ? 'Your bags are full' : 'Into your bags: it takes a slot a material could have');
            bagIt.addEventListener('click', () => gearAction(() => game.onMoveGear(item.id, inBags ? 'bank' : 'bags')));
            buttons.append(bagIt);
        }
    }

    // To the other hunter: only copies not yet bound, between games
    if (!state.playing && sendable > 0) {
        const other = state.otherSide === 'horde' ? 'Horde' : 'Alliance';
        const send = make('button', 'game-btn inventory-send', 'Send');
        send.type = 'button';
        send.title = `Send to the ${other} hunter (${sendable} not yet bound)`;
        send.addEventListener('click', async () => {
            let many = 1;
            if (sendable > 1) {
                const answer = await askText({ title: `Send ${item.name} to the ${other} hunter`, text: `How many? ${sendable} are not yet bound.`, value: String(sendable), yes: 'Send', maxLength: 4 });
                many = Math.floor(Number(answer));
                if (!answer || !(many > 0)) return;
            } else if (!(await askConfirm({ title: `Send ${item.name} to the ${other} hunter?`, text: 'It is his then, until one of them wears it.', yes: 'Send' }))) {
                return;
            }
            notice = (await game.onSendGear(item.id, Math.min(many, sendable))) || '';
            render();
        });
        buttons.append(send);
    }

    if (sells && state.canSell) {
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
            button.addEventListener('click', async () => {
                const sure = await askConfirm({
                    title: `Sell your only ${item.name}?`,
                    text: `${worn ? 'You are wearing it. ' : ''}Once it is sold you can no longer wear it, until you find another. It pays ${formatCoins(item.value)}.`,
                    yes: 'Sell it',
                    danger: true,
                });
                if (!sure) return;
                button.disabled = true;
                sell(item.id, 1);
            });
        }
        buttons.append(button);
    }

    row.append(picture, text, buttons);
    return row;
}

// ----- Crafting: the recipes, made between games from what is in the bags, into the bags -----

function renderCrafting(column, main, side, state) {
    const list = state.recipes || [];
    if (!list.some(recipe => recipe.id === recipeId)) recipeId = list.length ? list[0].id : null;

    // The recipes, each with how many can be made from what is in the bags
    const recipesBox = make('section', 'window-card inventory-left-card');
    recipesBox.append(make('p', 'window-label', 'Crafting'), make('h3', 'inventory-side-title', 'Recipes'));
    for (const recipe of list) {
        const button = make('button', recipe.id === recipeId ? 'window-item inventory-recipe is-on' : 'window-item inventory-recipe');
        button.type = 'button';
        button.dataset.rarity = (recipe.item && recipe.item.rarity) || 'uncommon';
        const picture = make('img');
        picture.src = recipe.item ? recipe.item.image : '';
        picture.alt = '';
        const text = make('span', 'window-item-text');
        const can = canMake(recipe.needs, state.contents);
        const made = recipe.item && recipe.item.gear && state.owned.includes(recipe.id);
        text.append(make('span', 'window-item-name', recipe.item ? recipe.item.name : recipe.id),
            make('span', 'window-item-note', made ? 'Made: it is his' : can > 0 ? (recipe.item && recipe.item.gear ? 'You can make it' : `You can make ${can}`) : 'Not enough in your bags'));
        button.append(picture, text);
        button.addEventListener('click', () => {
            recipeId = recipe.id;
            makeCount = 1;
            notice = '';
            render();
        });
        recipesBox.append(button);
    }
    if (list.length === 0) recipesBox.append(make('p', 'inventory-text', state.loggedIn ? 'No recipes yet.' : 'Crafting is for accounts: log in to craft.'));
    recipesBox.append(make('p', 'inventory-text inventory-fine inventory-carry-end', 'More recipes come as the game grows.'));
    column.append(recipesBox);

    renderRecipe(main, state, list.find(recipe => recipe.id === recipeId));
    renderBagsBeside(side, state);
}

// The recipe open: what it makes and does, what it takes, and how many to make
function renderRecipe(main, state, recipe) {
    const box = make('section', 'window-card inventory-recipe-card');
    main.append(box);
    if (!recipe) return;

    const item = recipe.item || { name: recipe.id, image: '' };
    const potion = state.potion && state.potion.id === recipe.id ? state.potion : null;
    const head = make('div', 'inventory-recipe-head');
    head.dataset.rarity = item.rarity || 'uncommon';
    const picture = make('div', 'inventory-recipe-picture');
    const image = make('img');
    image.src = item.image;
    image.alt = item.name;
    picture.append(image);
    const words = make('div', 'inventory-recipe-words');
    words.append(make('h3', 'inventory-recipe-name', item.name));
    if (potion) {
        const does = make('p', 'inventory-text');
        does.append('Drink in a fight: ', make('strong', 'inventory-heal', `+${potion.heal} health`), '. Press ', make('span', 'inventory-key', potion.key), `, one every ${potion.cooldown} seconds.`);
        words.append(does);
    }
    // A piece of gear: what it gives and does; it is his once made, not the bags'
    const gear = item.gear ? wearableById(recipe.id) : null;
    if (gear) {
        words.append(make('p', 'inventory-text', `${gear.twoHanded ? 'Two-handed' : 'One-handed'}, main hand: ${statsText(itemStats(gear, gameConfig.sets)) || 'no stats'}.`));
        if (gear.effect === 'chain-lightning') {
            const lightning = gameConfig.bosses.thunderfury;
            words.append(make('p', 'inventory-text inventory-legendary-effect', `Worn, his arrows may call down its lightning (${Math.round(lightning.chance * 100)}% each time he shoots, at most every ${lightning.cooldown} seconds): it destroys up to ${lightning.targets} harmful things falling near him, and strikes a boss for ${lightning.bossDamage}, dazing it so it attacks slower for ${lightning.slowSeconds} seconds.`));
        }
        words.append(make('p', 'inventory-text inventory-fine', 'His for good once made, bound to him. One to a hunter.'));
    } else {
        const many = recipe.makes > 1 ? `${recipe.makes} a making, into your bags` : 'Goes into your bags';
        words.append(make('p', 'inventory-text inventory-fine', `${many}; ${stackOf(recipe.id, gameConfig.bags.stack)} to a slot.`));
    }
    head.append(picture, words);
    box.append(head);

    // What one takes: what is in the bags, and what more is in the bank
    box.append(make('p', 'window-label inventory-recipe-label', 'Made from, for each one'));
    for (const [itemId, each] of Object.entries(recipe.needs)) {
        const reagent = itemById(itemId);
        const inBags = state.contents[itemId] || 0;
        const inBank = state.bank[itemId] || 0;
        const row = make('div', 'window-item inventory-reagent');
        const reagentPicture = make('img');
        reagentPicture.src = reagent ? reagent.image : '';
        reagentPicture.alt = '';
        const text = make('span', 'window-item-text');
        text.append(
            make('span', 'window-item-name inventory-plain-name', `${each} × ${reagent ? reagent.name : itemId}`),
            make('span', 'window-item-note', inBank ? `${inBank} more in the bank` : 'None in the bank')
        );
        row.append(reagentPicture, text, make('span', inBags >= each ? 'inventory-have is-enough' : 'inventory-have', `${inBags} in your bags`));
        // Short of it, bags and bank together: bought, if it is for sale
        const price = state.materialPrices && state.materialPrices[itemId];
        const short = each * Math.max(1, makeCount) - inBags - inBank;
        if (price && short > 0 && state.forSale && !state.playing) {
            const buy = make('button', 'game-btn is-figures inventory-bank-btn', `Buy ${short} · ${formatCoins(price * short)}`);
            buy.type = 'button';
            buy.disabled = !state.canSpend || busy || state.coins < price * short;
            buy.title = state.coins < price * short ? 'Not enough coins' : `Buy the ${short} you are short of, into your bank`;
            buy.addEventListener('click', () => buyMaterial(itemId, short));
            row.append(buy);
        }
        const fits = Math.min(inBank, roomFor(itemId, state.contents, state.capacity));
        if (state.loggedIn && inBank > 0) {
            const fetch = make('button', 'game-btn inventory-bank-btn', fits > 0 ? 'To bags' : 'No room');
            fetch.type = 'button';
            fetch.disabled = state.playing || busy || fits === 0;
            fetch.title = fits > 0 ? `Move ${fits} from the bank to your bags` : 'Your bags are full';
            fetch.addEventListener('click', () => move(itemId, fits, 'bags'));
            row.append(fetch);
        }
        box.append(row);
    }

    // A piece of gear is made once: Make it, or what became of it
    if (gear) {
        const made = state.owned.includes(recipe.id);
        const can = canMake(recipe.needs, state.contents) > 0;
        const bar = make('div', 'inventory-make');
        const makeIt = make('button', 'game-btn is-primary inventory-make-btn', made ? 'Made' : 'Make it');
        makeIt.type = 'button';
        makeIt.disabled = made || !state.loggedIn || state.playing || busy || !can;
        makeIt.title = made ? 'He has it' : !state.loggedIn ? 'Log in to craft' : state.playing ? 'Crafting is done between games' : !can ? 'Not everything it takes is in your bags' : `Make ${item.name}`;
        makeIt.addEventListener('click', async () => {
            if (busy) return;
            busy = true;
            notice = (await game.onCraft(recipe.id, 1)) || '';
            busy = false;
            if (!notice) notice = `Made ${item.name}: it is his. Put it on in the main hand on the character sheet.`;
            render();
        });
        bar.append(makeIt);
        box.append(bar);
        if (state.playing) box.append(make('p', 'inventory-text window-warning', 'Crafting is done between games.'));
        if (notice) box.append(make('p', notice.startsWith('Made ') ? 'inventory-text inventory-made' : 'inventory-text window-warning', notice));
        return;
    }

    // How many, and make them
    const most = canMake(recipe.needs, state.contents);
    makeCount = Math.max(1, Math.min(makeCount, Math.max(1, most)));
    const bar = make('div', 'inventory-make');
    bar.append(make('span', 'inventory-make-label', 'How many'));
    const stepper = make('div', 'inventory-stepper');
    const fewer = make('button', 'game-btn', '−');
    fewer.type = 'button';
    fewer.setAttribute('aria-label', 'One fewer');
    fewer.disabled = makeCount <= 1;
    fewer.addEventListener('click', () => { makeCount--; render(); });
    const more = make('button', 'game-btn', '+');
    more.type = 'button';
    more.setAttribute('aria-label', 'One more');
    more.disabled = makeCount >= most;
    more.addEventListener('click', () => { makeCount++; render(); });
    stepper.append(fewer, make('span', 'inventory-stepper-value', String(makeCount)), more);
    const all = make('button', 'game-btn', `All · ${most}`);
    all.type = 'button';
    all.disabled = most < 1;
    all.addEventListener('click', () => { makeCount = most; render(); });
    const each = recipe.makes || 1;
    const makeIt = make('button', 'game-btn is-primary inventory-make-btn', each > 1 ? `Make ${makeCount * each}` : `Make ${makeCount}`);
    makeIt.type = 'button';
    makeIt.disabled = !state.loggedIn || state.playing || busy || most < 1;
    makeIt.title = !state.loggedIn ? 'Log in to craft' : state.playing ? 'Crafting is done between games' : most < 1 ? 'Not enough in your bags' : `Make ${makeCount * each} ${item.name}`;
    makeIt.addEventListener('click', async () => {
        if (busy) return;
        busy = true;
        notice = (await game.onCraft(recipe.id, makeCount)) || '';
        busy = false;
        if (!notice) {
            const made = makeCount * each;
            notice = `Made ${made} ${item.name}${made === 1 || item.name.endsWith('s') ? '' : 's'}: in your bags.`;
            makeCount = 1;
        }
        render();
    });
    bar.append(stepper, all, makeIt);
    box.append(bar);

    if (state.playing) box.append(make('p', 'inventory-text window-warning', 'Crafting is done between games.'));
    if (notice) box.append(make('p', notice.startsWith('Made ') ? 'inventory-text inventory-made' : 'inventory-text window-warning', notice));
}

// The bags beside the recipe: what it is made from, and what it makes
function renderBagsBeside(side, state) {
    const stack = gameConfig.bags.stack;
    const stacks = stacksOf(state.contents, stack);
    const box = make('section', 'window-card inventory-side-card');
    box.append(make('p', 'window-label', 'Made from, and into'));
    const heading = make('div', 'window-card-title');
    heading.append(make('h3', 'inventory-side-title', 'Your bags'), make('span', 'inventory-carry-count', `${slotsUsed(state.contents, stack)} of ${state.capacity}`));
    box.append(heading);

    const shown = Math.min(state.capacity, 36);
    const grid = make('div', 'inventory-grid inventory-grid-small');
    for (let index = 0; index < shown; index++) grid.append(slotOf(stacks[index] || null, null));
    box.append(grid);
    if (state.capacity > shown) box.append(make('p', 'inventory-text inventory-fine', `Showing the first ${shown} of ${state.capacity} slots.`));
    box.append(make('p', 'inventory-text inventory-fine inventory-carry-end', 'Only what is in your bags can be used. Move more from the bank under Bags.'));
    side.append(box);
}
