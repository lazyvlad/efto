// The character sheet: the hunter, what he wears in each slot, and what it gives him.
//
// It opens over whatever is on the screen: over the starting window before a game, and over
// the game itself, which is paused while it is open. Pressing a slot shows the items the
// player owns that fit it; pressing one of those puts it on. The three sets have a button
// each that puts on every piece owned of that set.
//
// The rules of wearing things are in utils/gear.js. This file only draws the sheet and passes
// what the player asks for back to the game (game-modular.js), which keeps what is worn.

import { wearables, wearableById } from '../data/wearables.js';
import { gameConfig } from '../config/gameConfig.js';
import { playerCharacters } from '../data/playerCharacters.js';
import { SLOTS, itemsForSlot, itemStats, setsWorn } from '../utils/gear.js';
import { piecesOf, bonusText, nextStep } from '../utils/sets.js';

let game = null;            // What the game gave when it set the sheet up
let selectedSlot = 'head';
let whenClosed = null;
// The character shown, when the player picked the other one to look at. Both wear the same
// things; in a game it is always the one being played.
let shownSide = null;
let notice = '';        // Why the last thing pressed could not be put on

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
 * @param {Function} options.onWearSet - (setId) put on every piece owned of a set. Returns
 *        the same.
 * @param {Function} options.onOpenInventory - () open the inventory in its place
 */
export function initializeCharacterSheet(options) {
    game = options;

    const sheet = element('characterSheet');
    if (!sheet) return;

    element('characterSheetClose').addEventListener('click', closeCharacterSheet);
    element('sheetInventory').addEventListener('click', () => game.onOpenInventory());
    sheet.querySelectorAll('.sheet-side-btn').forEach(button => {
        button.addEventListener('click', () => {
            shownSide = button.dataset.side;
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
    notice = '';
    const sheet = element('characterSheet');
    if (!sheet || !game) return;

    whenClosed = onClose;
    shownSide = null;
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

    renderHeading(state);
    renderSlots(state);
    renderStats(state);
    renderSets(state);
    renderSlotItems(state);
}

function renderHeading(state) {
    // In a game the hunter is the one being played; before one, either can be looked at
    const faction = (!state.playing && shownSide) || state.faction || 'alliance';
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

    const character = playerCharacters[faction] || playerCharacters.alliance;
    const figure = element('sheetFigure');
    if (figure.getAttribute('src') !== character.image) figure.src = character.image;
}

function renderSlots(state) {
    for (const column of ['left', 'right', 'bottom']) {
        const holder = element(`sheetSlots-${column}`);
        holder.textContent = '';

        for (const slot of SLOTS.filter(candidate => candidate.column === column)) {
            const item = itemById(state.equipment[slot.id]);
            // Something that fits is owned and is not being worn anywhere
            const wornIds = Object.values(state.equipment);
            const choices = itemsForSlot(slot.id, wearables(), state.owned).filter(candidate => !wornIds.includes(candidate.id)).length;

            const button = make('button', 'sheet-slot');
            button.type = 'button';
            button.dataset.slot = slot.id;
            button.classList.toggle('is-selected', slot.id === selectedSlot);
            button.classList.toggle('is-filled', Boolean(item));
            // The colour of how rare it is: a piece of a set is epic
            if (item) button.dataset.rarity = item.rarity || 'epic';
            // Something owned could go here and nothing is on
            button.classList.toggle('has-choice', !item && choices > 0);
            button.title = item ? `${slot.label}: ${item.name}` : slot.label;
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

function renderSets(state) {
    const worn = setsWorn(state.equipment, wearables());
    const holder = element('sheetSets');
    holder.textContent = '';

    for (const set of gameConfig.sets) {
        const pieces = piecesOf(wearables(), set.id);
        const owned = pieces.filter(piece => state.owned.has(piece.id)).length;
        const on = worn[set.id] || 0;
        const next = nextStep(set, on);

        const button = make('button', 'game-btn sheet-set');
        button.type = 'button';
        button.disabled = owned === 0;
        // Every piece owned of it is on
        button.classList.toggle('is-on', on > 0 && on === owned);
        button.append(
            make('span', 'sheet-set-name', set.name.split(' ')[0]),
            make('span', 'sheet-set-count', owned === 0 ? 'none owned' : `${on}/${owned} on`)
        );
        button.title = owned === 0
            ? `You own no piece of ${set.name} yet`
            : `Put on the ${owned} ${owned === 1 ? 'piece' : 'pieces'} you own of ${set.name}${next ? ` (its next bonus is at ${next})` : ''}`;
        button.addEventListener('click', () => {
            notice = game.onWearSet(set.id) || '';
            render();
        });
        holder.append(button);
    }
}

function renderSlotItems(state) {
    const slot = SLOTS.find(candidate => candidate.id === selectedSlot) || SLOTS[0];
    const wornId = state.equipment[slot.id];
    const choices = itemsForSlot(slot.id, wearables(), state.owned);

    element('sheetSlotName').textContent = slot.label;

    const list = element('sheetItems');
    list.textContent = '';

    // Why the last thing pressed could not be put on
    if (notice) list.append(make('p', 'sheet-empty window-warning', notice));
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
        // Not among what the hunter takes into a game: putting it on takes it along
        const banked = Boolean(state.carried) && !state.carried.has(item.id);
        const row = make('button', 'window-item sheet-item');
        row.type = 'button';
        row.classList.toggle('is-worn', worn);

        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        row.dataset.rarity = item.rarity || 'epic';

        const about = [item.from, worn ? 'being worn' : '', banked ? 'in the bank' : ''].filter(Boolean).join(' \u00b7 ');
        const text = make('span', 'window-item-text');
        text.append(
            make('span', 'window-item-name', item.name),
            make('span', 'window-item-stats', statsText(itemStats(item, gameConfig.sets)) || 'No stats'),
            ...(about ? [make('span', 'window-item-note', about)] : [])
        );

        // Looks like a button; the whole row is the one that is pressed
        row.append(picture, text, make('span', worn ? 'game-btn sheet-item-action' : 'game-btn is-primary sheet-item-action', worn ? 'Take off' : 'Put on'));
        row.addEventListener('click', () => {
            notice = game.onEquip(slot.id, worn ? null : item) || '';
            render();
        });
        list.append(row);
    }
}
