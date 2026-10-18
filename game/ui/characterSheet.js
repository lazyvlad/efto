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
import { quiverText } from '../utils/quiver.js';
import { playerCharacters } from '../data/playerCharacters.js';
import { SLOTS, itemsForSlot, itemStats, byPower, betterFor } from '../utils/gear.js';
import { bonusText } from '../utils/sets.js';
import { keyName } from '../utils/keybindings.js';
import { askConfirm, askText } from './gameDialog.js';
import { hasLooks } from '../utils/hunterLooks.js';
import { getSettings, updateSetting } from '../systems/settingsSystem.js';
import { petFor } from '../data/pets.js';
import { formatCoins } from '../utils/coins.js';

// What the pet does in each of its stances ("petStance" in Settings, Your pet)
const PET_STANCES = {
    defensive: 'Stays by him: fetches what he would miss and bites what is thrown at him.',
    aggressive: 'Goes for the creatures on the field first. With none about, it fetches and guards as before.'
};

// The keys that wear the saved sets in play, in order (utils/keybindings.js)
const OUTFIT_KEYS = ['set_1', 'set_2', 'set_3', 'set_4'];

let game = null;            // What the game gave when it set the sheet up
let selectedSlot = 'head';

// The cards beside the hunter that are folded up to their titles, kept in this browser: the
// pet's starts folded (its stance is in its title, and P changes it in a game)
const FOLDS_KEY = 'input_sheet_folds';
let folds = (() => {
    try {
        return { pet: true, ...(JSON.parse(localStorage.getItem(FOLDS_KEY)) || {}) };
    } catch (e) {
        return { pet: true };
    }
})();

function setFold(name, folded) {
    folds = { ...folds, [name]: folded };
    try {
        localStorage.setItem(FOLDS_KEY, JSON.stringify(folds));
    } catch (e) {
        // Storage unavailable: folded for this visit
    }
}

// Each card folded or open as kept, its title saying which and opening or folding it
function showFolds() {
    document.querySelectorAll('#characterSheet .sheet-fold').forEach(card => {
        const folded = Boolean(folds[card.dataset.fold]);
        card.classList.toggle('is-folded', folded);
        const head = card.querySelector('.fold-head');
        if (head) {
            head.setAttribute('role', 'button');
            head.tabIndex = 0;
            head.setAttribute('aria-expanded', String(!folded));
        }
    });
}
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
 * @param {Function} options.onHide - (itemId, hide) leave a piece worn out of the hunter's
 *        picture, or draw it again (the state's hidden is a Set of the ids not drawn)
 * @param {Function} options.onOpenInventory - (tab) open the inventory in its place, on that tab
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
    // The bar's other tabs are the inventory's
    sheet.querySelectorAll('[data-hunter-tab]').forEach(button => {
        if (button.dataset.hunterTab !== 'character') button.addEventListener('click', () => game.onOpenInventory(button.dataset.hunterTab));
    });
    element('characterSheetCloseAll').addEventListener('click', () => game.onCloseAll());
    // The pet's stance: kept in Settings, and taken up by the pet as soon as the game goes on
    sheet.querySelectorAll('.sheet-pet-stances [data-stance]').forEach(button => {
        button.addEventListener('click', () => {
            updateSetting('gameplay', 'petStance', button.dataset.stance);
            render();
        });
    });
    // A card's title folds it up, or opens it (the sets' title is drawn again with them, so
    // the presses are heard on the sheet)
    const toggleFold = event => {
        const head = event.target.closest('.fold-head');
        const card = head && head.closest('.sheet-fold');
        if (!card || event.target.closest('button, a, input, select')) return;
        if (event.type === 'keydown') {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
        }
        setFold(card.dataset.fold, !folds[card.dataset.fold]);
        render();
    };
    sheet.addEventListener('click', toggleFold);
    sheet.addEventListener('keydown', toggleFold);
    element('sheetItems').addEventListener('scroll', showMoreBelow, { passive: true });
    window.addEventListener('resize', () => { if (isCharacterSheetOpen()) showMoreBelow(); });
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
    renderPet(state);
    renderOutfits(state);
    renderSlotItems(state);
    showFolds();

    items.scrollTop = scrolled[0];
    if (sheetBody) sheetBody.scrollTop = scrolled[1];
    showMoreBelow();
}

// The slot's list scrolls in its card: say so while more of it is out of sight below
function showMoreBelow() {
    const items = element('sheetItems');
    const below = items.scrollHeight - items.clientHeight - items.scrollTop > 4;
    items.closest('.sheet-slot-panel').classList.toggle('has-more-below', below);
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

    // Between games the switch says which hunter; in a game his side and level say it
    element('sheetSubtitle').hidden = !state.playing;
    element('sheetBackWhere').textContent = state.backWhere || '';
    // What the player has to spend (one purse, both hunters'); a guest has none
    const purse = element('sheetPurse');
    purse.hidden = state.coins === null || state.coins === undefined;
    purse.textContent = '';
    if (!purse.hidden) purse.append(make('strong', '', formatCoins(state.coins)));
    purse.title = 'One purse for both hunters';

    element('sheetName').textContent = state.name || 'Hunter';
    element('sheetSubtitle').textContent = state.playing ? `${side} hunter \u00b7 Level ${state.level}` : `${side} hunter`;
    element('sheetSubtitle').dataset.side = faction;

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
            // Worn, but not drawn on him
            const unseen = Boolean(item) && !blocked && state.hidden.has(item.id);
            button.classList.toggle('is-unseen', unseen);
            // The colour of how rare it is: a piece of a set is epic
            if (item) button.dataset.rarity = item.rarity || 'epic';
            // Something owned could go here and nothing is on
            button.classList.toggle('has-choice', !item && choices > 0);
            // Something stronger than what is on, owned (in a game: carried) and worn nowhere else
            const better = !blocked && item ? betterFor(slot.id, state.equipment, wearables(), state.owned, gameConfig.sets) : null;
            button.classList.toggle('has-better', Boolean(better));
            button.title = blocked ? `${slot.label}: ${held.name} is held in both hands` : item ? `${slot.label}: ${item.name}${item.itemLevel ? `, item level ${item.itemLevel}` : ''}${unseen ? ' (hidden)' : ''}${better ? `. Stronger: ${better.name}` : ''}` : slot.label;
            button.setAttribute('aria-pressed', String(slot.id === selectedSlot));

            const icon = make('span', 'sheet-slot-icon');
            if (item) {
                const picture = make('img');
                picture.src = item.image;
                picture.alt = '';
                icon.append(picture);
            }
            if (unseen) icon.append(unseenMark());
            if (better) icon.append(betterMark());
            const label = make('span', 'sheet-slot-label');
            label.append(make('span', 'slot-long', slot.label), make('span', 'slot-short', slot.short || slot.label));
            button.append(icon, label);

            button.addEventListener('click', () => {
                selectedSlot = slot.id;
                notice = null;
                // A slot pressed: its list is what is wanted, so its card opens
                setFold('slot', false);
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
    const carrying = element('sheetCarrying');
    carrying.textContent = state.carried ? `Carrying ${state.inHis36} of ${state.carryLimit}` : '';
    carrying.title = state.carried ? 'In his 36, besides what he wears' : '';

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

// His pet: which it is, how it fights, and the switch between the two. On the stage it sits by
// him, or is off at a run when it goes for the creatures.
function renderPet(state) {
    const pet = petFor(state.faction || 'alliance');
    const stance = getSettings().gameplay?.petStance === 'aggressive' ? 'aggressive' : 'defensive';

    // Folded, the title says how it fights too
    element('sheetPetName').textContent = folds.pet ? `${pet.name} \u00b7 ${stance === 'aggressive' ? 'Aggressive' : 'Defensive'}` : pet.name;
    document.querySelectorAll('#characterSheet .sheet-pet-stances [data-stance]').forEach(button => {
        const on = button.dataset.stance === stance;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', String(on));
    });
    element('sheetPetSays').textContent = PET_STANCES[stance];
    const key = keyName('pet_stance');
    element('sheetPetNote').textContent = `${key ? `${key} changes it in a game · ` : ''}also in Settings`;

    const figure = element('sheetPetFigure');
    const picture = stance === 'aggressive' ? pet.run : pet.sit;
    if (figure.getAttribute('src') !== picture) figure.src = picture;
    figure.alt = pet.name;
    figure.classList.toggle('is-running', stance === 'aggressive');
}

// The sets the player saved (each hunter his own): each put on in one press, or in play by its
// key; what is worn now can be saved into one, in place of what it kept, or as a new one
function renderOutfits(state) {
    const holder = element('sheetOutfits');
    holder.textContent = '';
    if (!state.outfits) return;

    holder.append(make('p', 'window-label sheet-outfits-label fold-head', 'Your sets'));
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
    // The strongest first (utils/gear.js, itemPower)
    const choices = itemsForSlot(slot.id, wearables(), state.owned).sort(byPower(gameConfig.sets));

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
    // Whether what is worn here is drawn on him
    const wornItem = itemById(wornId);
    if (wornItem && hasLooks(wornItem.id)) list.append(lookSwitch(wornItem, state.hidden.has(wornItem.id)));
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
        // Not with the hunter: putting it on brings it along (worn, it takes no room in his 36);
        // what the slot holds comes off into his 36, or with his 36 full goes to the bank
        const banked = Boolean(state.carried) && !state.carried.has(item.id);
        const full = Boolean(state.carried) && state.inHis36 >= state.carryLimit;
        const swaps = banked && full && Boolean(wornId);
        // Worn in the other slot of a pair (a ring, a trinket): putting it on here moves it,
        // and leaves that slot empty
        const wornIn = worn ? null : SLOTS.find(other => other.id !== slot.id && state.equipment[other.id] === item.id);
        const action = worn ? 'Take off' : wornIn ? 'Move here' : swaps ? 'Swap in' : 'Put on';
        const row = make('button', 'window-item sheet-item');
        row.type = 'button';
        row.classList.toggle('is-worn', worn);
        row.classList.toggle('is-worn-elsewhere', Boolean(wornIn));

        const picture = make('img');
        picture.src = item.image;
        picture.alt = '';
        row.dataset.rarity = item.rarity || 'epic';

        const about = [item.itemLevel ? `Item level ${item.itemLevel}` : '', item.twoHanded ? 'Two-handed' : '', item.from, worn ? 'being worn' : '', worn && state.hidden.has(item.id) ? 'hidden' : '', banked ? 'in the bank' : ''].filter(Boolean).join(' \u00b7 ');
        const text = make('span', 'window-item-text');
        text.append(
            make('span', 'window-item-name', item.name),
            ...(wornIn ? [make('span', 'sheet-item-worn-in', `Worn in ${wornIn.label}`)] : []),
            make('span', 'window-item-stats', [statsText(itemStats(item, gameConfig.sets)), quiverText(item, gameConfig.quiver)].filter(Boolean).join(' · ') || 'No stats'),
            ...(about ? [make('span', 'window-item-note', about)] : [])
        );

        // Looks like a button; the whole row is the one that is pressed
        row.append(picture, text, make('span', action === 'Put on' || action === 'Swap in' ? 'game-btn is-primary sheet-item-action' : 'game-btn sheet-item-action', action));
        if (swaps) row.title = `Puts it on, and ${itemById(wornId).name} goes to the bank in its place`;
        if (wornIn) row.title = `Already worn in ${wornIn.label}: moving it here leaves ${wornIn.label} empty`;
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

// Shown or hidden on the hunter: the piece worn stays worn and counts either way
function lookSwitch(item, hidden) {
    const line = make('div', `sheet-look${hidden ? ' is-unseen' : ''}`);
    line.append(make('span', '', hidden
        ? `${item.name} is hidden: still worn and counted, just not drawn on him.`
        : `${item.name} is drawn on him.`));
    const button = make('button', 'game-btn sheet-look-btn', hidden ? 'Show it' : 'Hide it');
    button.type = 'button';
    button.setAttribute('aria-pressed', String(hidden));
    button.addEventListener('click', () => {
        game.onHide(item.id, !hidden);
        render();
    });
    line.append(button);
    return line;
}

// A crossed-out eye, on a slot whose piece is not drawn
// Something stronger is owned for this slot: a green arrow up at the square's corner
function betterMark() {
    const mark = make('span', 'sheet-slot-better');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 4 4 13h5v7h6v-7h5z" fill="currentColor"/></svg>';
    return mark;
}

function unseenMark() {
    const mark = make('span', 'sheet-slot-unseen');
    mark.setAttribute('aria-hidden', 'true');
    mark.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="currentColor"/><path d="M4 20 20 4" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>';
    return mark;
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
