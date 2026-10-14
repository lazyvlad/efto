// The character sheet: the hunter, what he wears in each slot, and what it gives him.
//
// It opens over whatever is on the screen: over the starting window before a game, and over
// the game itself, which is paused while it is open. Pressing a slot shows the items the
// player owns that fit it; pressing one of those puts it on. The player's own sets ("Your
// sets") are each put on in one press, and what he wears can be saved into one, or as a new one.
//
// The rules of wearing things are in utils/gear.js. This file only draws the sheet and passes
// what the player asks for back to the game (game-modular.js), which keeps what is worn.

import { wearables, wearableById } from '../data/wearables.js';
import { gameConfig } from '../config/gameConfig.js';
import { playerCharacters } from '../data/playerCharacters.js';
import { SLOTS, itemsForSlot, itemStats } from '../utils/gear.js';
import { bonusText } from '../utils/sets.js';
import { keyName } from '../utils/keybindings.js';
import { askConfirm, askText } from './gameDialog.js';

// The keys that wear the saved sets in play, in order (utils/keybindings.js)
const OUTFIT_KEYS = ['set_1', 'set_2', 'set_3', 'set_4'];

let game = null;            // What the game gave when it set the sheet up
let selectedSlot = 'head';
let whenClosed = null;
// What became of the last thing pressed, shown under it: { itemId, text, kind ('info' or
// 'warning'), chooseLeave (a way to the inventory to make room) }, or null
let notice = null;

const element = id => document.getElementById(id);

function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

const itemById = id => wearableById(id);

// "+3 health, +4 armor, +2 attack power, +1% crit, carrying +2%"
function statsText(stats) {
    return [
        stats.health ? `+${stats.health} health` : '',
        stats.armor ? `+${stats.armor} armor` : '',
        stats.attackPower ? `+${stats.attackPower} attack power` : '',
        stats.crit ? `+${stats.crit}% crit` : '',
        stats.dodge ? `+${stats.dodge}% dodge` : '',
        stats.carrying ? `carrying +${stats.carrying}%` : '',
    ].filter(Boolean).join(', ');
}

export function isCharacterSheetOpen() {
    const sheet = element('characterSheet');
    return Boolean(sheet) && !sheet.hidden;
}

/**
 * Set the sheet up.
 * @param {Object} options
 * @param {Function} options.getState - () => { equipment, owned (Set), faction, name, level,
 *        totals, maxHealth, armorReduction (0-1), crit (0-1), dodge (0-1), playing, scene (the
 *        zone picture the hunter is shown in), carried (Set, or null for a guest), carryLimit }
 * @param {Function} options.onEquip - (slotId, item or null) put an item on, or take one off.
 *        Returns why it could not be, in words, or ''.
 * @param {Function} options.onOpenInventory - () open the inventory in its place
 * @param {Function} options.onShowSide - (side) between games: dress and play that side's hunter
 * @param {Function} options.onCloseAll - () close the sheet and every menu, and go on with the
 *        game if one is under way (Back, the sheet's other way out, goes to where it was opened)
 * @param {Function} options.onWearOutfit - (index) put on a saved set; returns why not, or ''
 * @param {Function} options.onSaveOutfit - (name) save what is worn as a new set; the same
 * @param {Function} options.onUpdateOutfit - (index) save what is worn into a saved set
 * @param {Function} options.onRenameOutfit - (index, name) give a saved set another name
 * @param {Function} options.onDeleteOutfit - (index) forget a saved set
 *        For these the state has outfits: [{ name, pieces, isOn, isSaved (it keeps just what
 *        is worn now) }] and mostOutfits.
 */
export function initializeCharacterSheet(options) {
    game = options;

    const sheet = element('characterSheet');
    if (!sheet) return;

    element('characterSheetClose').addEventListener('click', closeCharacterSheet);
    element('sheetInventory').addEventListener('click', () => game.onOpenInventory());
    element('characterSheetCloseAll').addEventListener('click', () => game.onCloseAll());
    sheet.querySelectorAll('.sheet-side-btn').forEach(button => {
        button.addEventListener('click', () => {
            game.onShowSide(button.dataset.side);
            render();
        });
    });
    // A press on the dark around the sheet closes it too
    sheet.addEventListener('click', event => {
        if (event.target === sheet) closeCharacterSheet();
    });
    // Esc closes the sheet and nothing else: the game's own Esc is not to hear it
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isCharacterSheetOpen()) {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeCharacterSheet();
        }
    }, true);
}

/**
 * Open the sheet.
 * @param {Function} [onClose] - Called when it is closed again
 */
export function openCharacterSheet(onClose = null) {
    notice = null;
    const sheet = element('characterSheet');
    if (!sheet || !game) return;

    whenClosed = onClose;
    sheet.hidden = false;
    document.body.classList.add('character-sheet-open');
    render();
    element('characterSheetClose').focus({ preventScroll: true });
}

export function closeCharacterSheet() {
    const sheet = element('characterSheet');
    if (!sheet || sheet.hidden) return;

    sheet.hidden = true;
    document.body.classList.remove('character-sheet-open');

    const done = whenClosed;
    whenClosed = null;
    if (done) done();
}

// What is worn changed: draw it again if the sheet is on the screen
export function refreshCharacterSheet() {
    if (isCharacterSheetOpen()) render();
}

function render() {
    const state = game.getState();
    // Drawn again after a press: the item list (and on a phone the whole sheet) stays where
    // it was scrolled to
    const items = element('sheetItems');
    const sheetBody = document.querySelector('#characterSheet .sheet-body');
    const scrolled = [items.scrollTop, sheetBody ? sheetBody.scrollTop : 0];

    renderHeading(state);
    renderSlots(state);
    renderStats(state);
    renderOutfits(state);
    renderSlotItems(state);

    items.scrollTop = scrolled[0];
    if (sheetBody) sheetBody.scrollTop = scrolled[1];
}

function renderHeading(state) {
    // The hunter being played, or dressed: each side's has his own outfit
    const faction = state.faction || 'alliance';
    const side = faction[0].toUpperCase() + faction.slice(1);

    element('sheetSides').hidden = state.playing;
    document.querySelectorAll('#sheetSides .sheet-side-btn').forEach(button => {
        const shown = button.dataset.side === faction;
        button.classList.toggle('is-on', shown);
        button.setAttribute('aria-pressed', String(shown));
    });

    element('sheetName').textContent = state.name || 'Hunter';
    element('sheetSubtitle').textContent = state.playing ? `Level ${state.level} \u00b7 ${side}` : `${side} \u00b7 Hunter`;

    // The hunter stands in the place picked on the map, or the one the game is in
    // (made whole first: a url() in a style is read against the stylesheet, not the page)
    if (state.scene) element('sheetStage').style.setProperty('--sheet-scene', `url("${new URL(state.scene, document.baseURI).href}")`);

    // Dressed in what he wears (utils/hunterLooks.js), or his own drawing until that is ready
    const picture = state.figure || (playerCharacters[faction] || playerCharacters.alliance).image;
    const figure = element('sheetFigure');
    if (figure.getAttribute('src') !== picture) figure.src = picture;
}

function renderSlots(state) {
    for (const column of ['left', 'right', 'bottom']) {
        const holder = element(`sheetSlots-${column}`);
        holder.textContent = '';

        // A weapon held in both hands: the off hand shows it greyed, and holds nothing else
        const held = itemById(state.equipment.mainhand);
        const twoHanded = Boolean(held && held.twoHanded);

        for (const slot of SLOTS.filter(candidate => candidate.column === column)) {
            const blocked = slot.id === 'offhand' && twoHanded;
            const item = blocked ? held : itemById(state.equipment[slot.id]);
            // Something that fits is owned and is not being worn anywhere
            const wornIds = Object.values(state.equipment);
            const choices = itemsForSlot(slot.id, wearables(), state.owned).filter(candidate => !wornIds.includes(candidate.id)).length;

            const button = make('button', 'sheet-slot');
            button.type = 'button';
            button.dataset.slot = slot.id;
            button.classList.toggle('is-selected', slot.id === selectedSlot);
            button.classList.toggle('is-filled', Boolean(item));
            button.classList.toggle('is-blocked', blocked);
            // The colour of how rare it is: a piece of a set is epic
            if (item) button.dataset.rarity = item.rarity || 'epic';
            // Something owned could go here and nothing is on
            button.classList.toggle('has-choice', !item && choices > 0);
            button.title = blocked ? `${slot.label}: ${held.name} is held in both hands` : item ? `${slot.label}: ${item.name}` : slot.label;
            button.setAttribute('aria-pressed', String(slot.id === selectedSlot));

            const icon = make('span', 'sheet-slot-icon');
            if (item) {
                const picture = make('img');
                picture.src = item.image;
                picture.alt = '';
                icon.append(picture);
            }
            button.append(icon, make('span', 'sheet-slot-label', slot.label));

            button.addEventListener('click', () => {
                selectedSlot = slot.id;
                notice = null;
                // Another slot's things: from the top of the list
                element('sheetItems').scrollTop = 0;
                render();
            });
            holder.append(button);
        }
    }
}

function renderStats(state) {
    const percent = share => `${Math.round(share * 100)}%`;
    const cells = [
        ['Health', String(state.maxHealth), state.totals.health ? `+${state.totals.health} from gear` : '', 'is-health'],
        ['Armor', String(state.totals.armor), state.totals.armor ? `hits do ${percent(state.armorReduction)} less` : '', ''],
        ['Attack power', String(state.totals.attackPower), state.totals.attackPower ? `arrows do ${state.totals.attackPower}% more` : '', 'is-attack'],
        ['Crit · Dodge', `${percent(state.crit)} · ${percent(state.dodge)}`, '', ''],
    ];

    const grid = element('sheetStats');
    grid.textContent = '';
    for (const [label, value, note, kind] of cells) {
        const cell = make('div', `sheet-stat ${kind}`.trim());
        cell.append(make('span', 'sheet-stat-name', label), make('span', 'sheet-stat-value', value));
        if (note) cell.append(make('span', 'sheet-stat-note', note));
        grid.append(cell);
    }

    // How much gear the hunter takes into a game (a guest has no bank, so no count)
    element('sheetCarrying').textContent = state.carried ? `Carrying ${state.carried.size} of ${state.carryLimit}` : '';

    // What the sets being worn add of their own, beyond the stats
    const extras = bonusText(state.totals, { stats: false });
    element('sheetBonuses').textContent = extras
        ? `Set bonuses: ${extras}`
        : state.owned.size === 0
            ? 'You own no gear yet. Pieces of the hunter sets fall from level 3 on; with an account they are kept.'
            : 'No set bonus yet';

    // What things caught with the bags full sell for: better with gear that helps carrying
    element('sheetFullBags').textContent = `Full bags: what does not fit sells for ${percent(1 - state.fullBagLoss)}`
        + (state.totals.carrying ? ` (your gear takes ${percent(state.totals.carrying)} off the loss)` : '');
}

// The sets the player saved (each hunter his own): each put on in one press, or in play by its
// key; what is worn now can be saved into one, in place of what it kept, or as a new one
function renderOutfits(state) {
    const holder = element('sheetOutfits');
    holder.textContent = '';
    if (!state.outfits) return;

    holder.append(make('p', 'window-label sheet-outfits-label', 'Your sets'));
    const row = make('div', 'sheet-outfit-row');
    holder.append(row);
    const wearing = Object.keys(state.equipment).length;

    state.outfits.forEach((outfit, index) => {
        const card = make('div', outfit.isOn ? 'sheet-outfit is-on' : 'sheet-outfit');
        const wear = make('button', outfit.isOn ? 'game-btn is-on sheet-outfit-wear' : 'game-btn sheet-outfit-wear');
        wear.type = 'button';
        const key = keyName(OUTFIT_KEYS[index]);
        wear.append(
            make('span', 'sheet-set-name', outfit.name),
            make('span', 'sheet-set-count', `${outfit.pieces} ${outfit.pieces === 1 ? 'piece' : 'pieces'}${outfit.isOn ? ' · on' : ''}`)
        );
        if (key) wear.append(make('span', 'sheet-outfit-key', key));
        wear.title = `Put on ${outfit.name}${key ? ` (${key} while playing)` : ''}`;
        wear.addEventListener('click', () => {
            const refused = game.onWearOutfit(index);
            notice = refused ? { itemId: null, text: refused, kind: 'warning', chooseLeave: true } : null;
            render();
        });

        const actions = make('div', 'sheet-outfit-actions');
        // What he wears now, kept in this set in place of what it had
        const save = make('button', 'sheet-outfit-action', outfit.isSaved ? 'Saved' : 'Save');
        save.type = 'button';
        save.disabled = outfit.isSaved || wearing === 0;
        save.title = outfit.isSaved ? `${outfit.name} keeps just what he wears` : `Keep what he wears now in ${outfit.name}`;
        save.addEventListener('click', async () => {
            const sure = await askConfirm({
                title: `Save into ${outfit.name}?`,
                text: `What he wears now is kept in ${outfit.name}, in place of what it had.`,
                yes: 'Save',
            });
            if (!sure) return;
            game.onUpdateOutfit(index);
            render();
        });

        const rename = make('button', 'sheet-outfit-action', 'Rename');
        rename.type = 'button';
        rename.title = `Give ${outfit.name} another name`;
        rename.addEventListener('click', async () => {
            const name = await askText({ title: 'Rename this set', value: outfit.name, yes: 'Rename', maxLength: 24 });
            if (!name || name === outfit.name) return;
            game.onRenameOutfit(index, name.slice(0, 24));
            render();
        });

        const forget = make('button', 'sheet-outfit-action is-forget', 'Forget');
        forget.type = 'button';
        forget.title = `Forget ${outfit.name}`;
        forget.addEventListener('click', async () => {
            const sure = await askConfirm({
                title: `Forget ${outfit.name}?`,
                text: 'The set is gone; what you own stays yours.',
                yes: 'Forget it',
                danger: true,
            });
            if (!sure) return;
            game.onDeleteOutfit(index);
            render();
        });

        actions.append(save, rename, forget);
        card.append(wear, actions);
        row.append(card);
    });

    // What is worn now, as a set of its own
    if (wearing > 0 && !state.outfits.some(outfit => outfit.isSaved)) {
        const full = state.outfits.length >= state.mostOutfits;
        const save = make('button', 'game-btn sheet-outfit-save', full ? `You keep ${state.mostOutfits} sets` : '+ Save as a new set');
        save.type = 'button';
        save.disabled = full;
        save.title = full ? 'Forget one, or save into one of yours' : 'Keep what he wears as a set of your own, to put on in one press';
        save.addEventListener('click', async () => {
            const name = await askText({ title: 'Name this set', value: `Set ${state.outfits.length + 1}`, yes: 'Save', maxLength: 24 });
            if (!name) return;
            const refused = game.onSaveOutfit(name.slice(0, 24));
            notice = refused ? { itemId: null, text: refused, kind: 'warning' } : null;
            render();
        });
        row.append(save);
    } else if (state.outfits.length === 0) {
        row.append(make('p', 'sheet-empty', 'Put on the pieces you like, and save them here as a set of your own.'));
    }
}

function renderSlotItems(state) {
    const slot = SLOTS.find(candidate => candidate.id === selectedSlot) || SLOTS[0];
    const wornId = state.equipment[slot.id];
    const choices = itemsForSlot(slot.id, wearables(), state.owned);

    element('sheetSlotName').textContent = slot.label;

    const list = element('sheetItems');
    list.textContent = '';

    // What became of a whole set or a saved set pressed
    if (notice && !notice.itemId) list.append(noticeLine(notice));
    // The off hand while a two-handed weapon is held
    const held = itemById(state.equipment.mainhand);
    if (slot.id === 'offhand' && held && held.twoHanded) {
        list.append(make('p', 'sheet-empty', `${held.name} is held in both hands. Putting something in the off hand takes it off.`));
    }
    // In a game only what the hunter took along can be put on
    if (state.playing && state.inBank > 0) {
        list.append(make('p', 'sheet-empty', `${state.inBank} more ${state.inBank === 1 ? 'thing is' : 'things are'} in the bank, out of reach until the game is over.`));
    }

    if (choices.length === 0) {
        list.append(make('p', 'sheet-empty', state.playing ? 'Nothing you carry goes here.' : 'Nothing you own goes here yet.'));
        return;
    }

    for (const item of choices) {
        const worn = item.id === wornId;
        // Not among what the hunter takes into a game: putting it on takes it along, or, with
        // no room, swaps it for what the slot holds (which goes to the bank)
        const banked = Boolean(state.carried) && !item.starter && !state.carried.has(item.id);
        const full = Boolean(state.carried) && state.carried.size >= state.carryLimit;
        const swaps = banked && full && Boolean(wornId) && state.carried.has(wornId);
        const action = worn ? 'Take off' : banked && full ? (swaps ? 'Swap in' : 'No room') : 'Put on';
        const row = make('button', 'window-item sheet-item');
        row.type = 'button';
        row.classList.toggle('is-worn', worn);

        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        row.dataset.rarity = item.rarity || 'epic';

        const about = [item.twoHanded ? 'Two-handed' : '', item.from, worn ? 'being worn' : '', banked ? 'in the bank' : ''].filter(Boolean).join(' \u00b7 ');
        const text = make('span', 'window-item-text');
        text.append(
            make('span', 'window-item-name', item.name),
            make('span', 'window-item-stats', statsText(itemStats(item, gameConfig.sets)) || 'No stats'),
            ...(about ? [make('span', 'window-item-note', about)] : [])
        );

        // Looks like a button; the whole row is the one that is pressed
        row.append(picture, text, make('span', action === 'Put on' || action === 'Swap in' ? 'game-btn is-primary sheet-item-action' : 'game-btn sheet-item-action', action));
        if (swaps) row.title = `Puts it on, and ${itemById(wornId).name} goes to the bank in its place`;
        row.addEventListener('click', () => {
            const result = game.onEquip(slot.id, worn ? null : item);
            notice = result ? { itemId: item.id, ...(typeof result === 'string' ? { text: result, kind: 'warning' } : result) } : null;
            render();
        });
        list.append(row);
        // What became of it, right under it, and in sight
        if (notice && notice.itemId === item.id) {
            const line = noticeLine(notice);
            list.append(line);
            requestAnimationFrame(() => line.scrollIntoView({ block: 'nearest' }));
        }
    }
}

// A line saying what became of something pressed, with a way to make room if there was none
function noticeLine({ text, kind, chooseLeave }) {
    const line = make('div', `sheet-notice is-${kind || 'warning'}`);
    line.setAttribute('role', 'status');
    line.append(make('span', '', text));
    if (chooseLeave) {
        const choose = make('button', 'game-btn sheet-notice-btn', 'Choose what to leave');
        choose.type = 'button';
        choose.addEventListener('click', () => game.onChooseLeave());
        line.append(choose);
    }
    return line;
}
