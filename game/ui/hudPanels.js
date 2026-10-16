// The in-game panels as redesigned (the INPUT Screens canvas, "The in-game panels"): slim, and
// out of the field's way.
//
//   Top left    who he is, his level and the score; under it small chips: the coins, a warning
//               when the bags are full, and the key that opens his stats (closed in play)
//   Top right   the set he wears most of and how far along it is; what he wears opens with its key
//   Found       the last few things worth finding, under the top-left strip, fading out
//   Timers      everything with a timer, once, in a row: above the spell bar when there is room
//               under the field for it, else in the field's bottom-left corner
//
// Only where the interface is scaled with the field (a keyboard, or a phone held sideways:
// body.hud-v2, ui/hudLayout.js); a phone held upright keeps its own layout. The panels' own
// figures are filled by game-modular.js as ever; this adds to them and decides what shows.

import { getActiveBuffs, colorOfBuff } from '../systems/hudNotificationSystem.js';

const FOUND_SHOWN = 3;
const FOUND_MS = 8000;

let found = [];             // { name, color, at }
let built = false;
let buffRow = null;
let buffShown = '';
let placedAt = -Infinity;

function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function setText(node, text) {
    if (node && node.textContent !== text) node.textContent = text;
}

function active() {
    return document.body.classList.contains('hud-v2');
}

// The new parts, made once, inside the panels the page already has
function build() {
    if (built) return;
    const panel = document.getElementById('itemsCollectionPanel');
    const sets = document.getElementById('dragonstalkerProgressPanel');
    if (!panel || !sets) return;
    built = true;

    const identity = panel.querySelector('.player-identity');
    if (identity) {
        const bar = make('div', 'hud-level-bar');
        bar.append(make('div', 'hud-level-fill'));
        identity.append(bar);
    }
    const chips = make('div', 'hud-chips');
    chips.id = 'hudChips';
    chips.append(make('span', 'hud-chip hud-chip-coins'), make('span', 'hud-chip hud-chip-warning'), make('span', 'hud-chip hud-chip-key'));
    panel.querySelector('.panel-header')?.after(chips);

    const header = sets.querySelector('.dragonstalker-panel-header');
    if (header) {
        const chip = make('div', 'hud-set-chip');
        chip.id = 'setPanelChip';
        chip.append(make('div', 'hud-set-pips'), make('div', 'hud-set-text'));
        chip.querySelector('.hud-set-text').append(make('div', 'hud-set-name'), make('div', 'hud-set-more'));
        header.append(chip);
    }

    const feed = make('div', 'hud-found');
    feed.id = 'hudFound';
    feed.setAttribute('aria-live', 'polite');
    document.body.append(feed);

    buffRow = make('div', 'hud-buffs');
    buffRow.id = 'hudBuffs';
    document.body.append(buffRow);
}

/** The stats (its key, I unless changed) open and close; closed again in a new game */
export function toggleStats(force) {
    document.body.classList.toggle('hud-stats-open', force);
}

/** What he wears (G unless changed) opens and closes */
export function toggleGear(force) {
    document.body.classList.toggle('hud-gear-open', force);
}

/** Both close: a boss coming in, a new game */
export function closePanels() {
    document.body.classList.remove('hud-stats-open', 'hud-gear-open');
}

/** Something worth seeing was found: it shows under the top-left strip for a while */
export function noteFound(name, color = '#f4ecd8') {
    if (!name) return;
    found.push({ name, color, at: performance.now() });
    found = found.slice(-FOUND_SHOWN);
    drawFound();
}

/** A new game: nothing found yet, the panels closed */
export function resetHudPanels() {
    found = [];
    closePanels();
    drawFound();
}

// Under the top-left panel, wherever it is now (measured twice a second at most)
let feedPlacedAt = -Infinity;
function placeFound() {
    const now = performance.now();
    if (now - feedPlacedAt < 500) return;
    feedPlacedAt = now;
    const panel = document.getElementById('itemsCollectionPanel');
    if (!panel) return;
    const box = panel.getBoundingClientRect();
    const field = document.getElementById('gameCanvas')?.getBoundingClientRect();
    const root = document.documentElement.style;
    // Under the panel, and inside the field (never across its frame)
    root.setProperty('--hud-found-top', `${Math.max(box.bottom, field ? field.top : 0) + 6}px`);
    root.setProperty('--hud-found-left', `${box.left + 4}px`);
}

function drawFound() {
    const feed = document.getElementById('hudFound');
    if (!feed) return;
    if (found.length) placeFound();
    const now = performance.now();
    found = found.filter(entry => now - entry.at < FOUND_MS);
    feed.replaceChildren(...(found.length ? [make('div', 'hud-found-label', 'Found')] : []), ...found.map(entry => {
        const line = make('div', 'hud-found-line', entry.name);
        line.style.color = entry.color;
        // The newest bright, the older fading
        line.style.opacity = String(Math.max(0.25, 1 - (now - entry.at) / FOUND_MS));
        return line;
    }));
    feed.hidden = found.length === 0;
}

/**
 * The panels' new parts, brought up to date (game-modular.js calls this as it fills the panels).
 * @param {object} figures  { level (0-1 of the way through it), coins (text), bagsFull (bool),
 *        bags (text), statsKey, gearKey, set: { pieces, of, name, more } | null, worn }
 */
export function updateHudPanels(figures) {
    build();
    if (!built) return;

    const fill = document.querySelector('#itemsCollectionPanel .hud-level-fill');
    const width = `${Math.round(Math.max(0, Math.min(1, figures.level)) * 100)}%`;
    if (fill && fill.style.width !== width) fill.style.width = width;

    const chips = document.getElementById('hudChips');
    if (chips) {
        setText(chips.querySelector('.hud-chip-coins'), figures.coins);
        const warning = chips.querySelector('.hud-chip-warning');
        setText(warning, figures.bagsFull ? `Bags full · ${figures.bags}` : '');
        warning.hidden = !figures.bagsFull;
        // The keys, only where there is a keyboard
        const keys = document.body.classList.contains('hud-desktop');
        const key = chips.querySelector('.hud-chip-key');
        setText(key, keys ? `Stats · ${figures.statsKey}` : '');
        key.hidden = !keys;
    }

    const chip = document.getElementById('setPanelChip');
    if (chip) {
        const pips = chip.querySelector('.hud-set-pips');
        const set = figures.set;
        const pipsKey = set ? `${set.pieces}/${set.of}` : '';
        if (pips.dataset.shown !== pipsKey) {
            pips.dataset.shown = pipsKey;
            pips.replaceChildren(...(set ? Array.from({ length: set.of }, (_, i) => make('span', i < set.pieces ? 'hud-pip is-on' : 'hud-pip')) : []));
            pips.hidden = !set;
        }
        setText(chip.querySelector('.hud-set-name'), set ? `${set.name} ${set.pieces}/${set.of}` : 'What he wears');
        const keys = document.body.classList.contains('hud-desktop');
        const more = [set && set.more ? `${set.more} for a bonus` : '', `${figures.worn} worn`, keys ? figures.gearKey : ''].filter(Boolean).join(' · ');
        setText(chip.querySelector('.hud-set-more'), more);
    }

    if (found.length) drawFound();
    drawBuffRow();
}

// Where the timers go: just above the spell bar when it is under the field with room to spare,
// else in the field's bottom-left corner. Measured twice a second at most.
function placeBuffRow() {
    const now = performance.now();
    if (now - placedAt < 500) return;
    placedAt = now;
    const canvas = document.getElementById('gameCanvas');
    const bar = document.getElementById('spellBar');
    if (!canvas || !buffRow) return;
    const field = canvas.getBoundingClientRect();
    const barBox = bar ? bar.getBoundingClientRect() : null;
    const rowHeight = buffRow.offsetHeight || 30;
    const below = document.body.classList.contains('spells-below') && barBox && barBox.height > 0
        && barBox.top - field.bottom >= rowHeight + 8;

    buffRow.classList.toggle('is-below', Boolean(below));
    if (below) {
        buffRow.style.left = `${barBox.left + barBox.width / 2}px`;
        buffRow.style.top = `${barBox.top - rowHeight - 6}px`;
    } else {
        buffRow.style.left = `${field.left + 12}px`;
        buffRow.style.top = `${field.bottom - rowHeight - Math.max(80, field.height * 0.12)}px`;
    }
}

function drawBuffRow() {
    if (!buffRow) return;
    const buffs = active() ? getActiveBuffs() : [];
    buffRow.hidden = buffs.length === 0;
    if (buffs.length === 0) {
        buffShown = '';
        return;
    }
    placeBuffRow();

    // Only touch the page when what is shown changes (a second ticking off is a change)
    const shown = buffs.map(buff => `${buff.id}|${Math.ceil(buff.timer / 60)}`).join(',');
    if (shown === buffShown) return;
    buffShown = shown;

    buffRow.replaceChildren(...buffs.map(buff => {
        const seconds = Math.ceil(buff.timer / 60);
        const pill = make('div', 'hud-buff');
        pill.style.borderColor = colorOfBuff(buff.type);
        pill.title = buff.effect;
        if (buff.iconSrc) {
            const icon = make('img', 'hud-buff-icon');
            icon.src = buff.iconSrc;
            icon.alt = '';
            pill.append(icon);
        }
        pill.append(make('span', 'hud-buff-name', buff.name), make('span', seconds <= 3 ? 'hud-buff-time is-ending' : 'hud-buff-time', `${seconds}s`));
        return pill;
    }));
}
