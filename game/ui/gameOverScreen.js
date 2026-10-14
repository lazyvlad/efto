// The end of a game: the hunter in the place the game ended, the score on a plate with where it
// landed on the high scores under it, what the game was, and what it brought home.
//
// The game hands over what it knows the moment the game ends (showGameOverSummary); what the
// site answers a moment later, coins kept and where the score landed, is laid over it
// (showGameOverResult). The screen itself is #gameOver in index.html, inside the menu's layer
// (ui/menuScreenManager.js), styled by styles/screens.css.

import { formatCoins } from '../utils/coins.js';

let shown = null;      // What the game handed over, for drawing again when the site answers

const element = id => document.getElementById(id);

function make(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

/**
 * Draw the end of a game.
 * @param {Object} summary
 * @param {string} summary.title - "Game over", "Victory!", "Boss defeated!", "Boss Rush complete!"
 * @param {string} summary.heading - "Vladimir fell in Westfall"
 * @param {string} summary.label - "Alliance · normal game · version 2.38.0"
 * @param {string} summary.line - "Level 19 · 12 minutes 41 seconds"
 * @param {number} summary.score
 * @param {Array} summary.figures - [{ name, value, kind }]
 * @param {Array} summary.home - [{ image, name, rarity, note, isNew }]
 * @param {Array} summary.notes - [{ text, kind }] under the list: coins for junk, things sold short
 * @param {string} summary.homeLabel - Small words over the list ("Kept on your account")
 * @param {string|null} summary.scene - The picture of the place
 * @param {string|null} summary.figure - The picture of the hunter
 * @param {boolean} summary.fell - Whether the hunter fell (drawn a little greyer)
 */
export function showGameOverSummary(summary) {
    shown = { ...summary };
    render();
}

/**
 * Lay the site's answer over what is shown.
 * @param {Object} result - { rank (words, or ''), earned (copper), balance (copper or null) }
 */
export function showGameOverResult(result) {
    if (!shown) return;
    if (result.rank !== undefined) shown.rank = result.rank;
    if (result.earned !== undefined || result.balance !== undefined) {
        shown.figures = shown.figures.map(figure => {
            if (figure.kind === 'earned' && result.earned !== undefined) return { ...figure, value: formatCoins(result.earned) };
            if (figure.kind === 'purse' && result.balance !== null && result.balance !== undefined) return { ...figure, value: formatCoins(result.balance) };
            return figure;
        });
    }
    if (result.home) shown.home = result.home;
    render();
}

function render() {
    const summary = shown;
    const stage = element('gameOverStage');
    if (!stage || !summary) return;

    element('gameOverLabel').textContent = summary.label;
    element('gameOverWhere').textContent = summary.heading;
    element('gameOverTitle').textContent = summary.title;
    element('gameOverLine').textContent = summary.line;
    element('finalScore').textContent = Math.round(summary.score || 0).toLocaleString('en-US');

    // (made whole first: a url() in a style is read against the stylesheet, not the page)
    if (summary.scene) stage.style.setProperty('--game-over-scene', `url("${new URL(summary.scene, document.baseURI).href}")`);
    stage.classList.toggle('has-fallen', Boolean(summary.fell));
    const figure = element('gameOverFigure');
    if (summary.figure && figure.getAttribute('src') !== summary.figure) figure.src = summary.figure;
    figure.hidden = !summary.figure;

    const rank = element('newHighScore');
    rank.textContent = summary.rank || '';
    rank.hidden = !summary.rank;

    const figures = element('gameOverFigures');
    figures.textContent = '';
    for (const { name, value, kind } of summary.figures) {
        const cell = make('div', `game-over-figure${kind ? ` is-${kind}` : ''}`);
        cell.append(make('span', 'window-label', name), make('span', 'game-over-figure-value', value));
        figures.append(cell);
    }

    element('gameOverHomeLabel').textContent = summary.homeLabel || '';
    const list = element('gameOverHome');
    list.textContent = '';
    if (summary.home.length === 0) {
        list.append(make('p', 'game-over-empty', 'Nothing to keep this time: boss loot, set pieces, the weapons and jewellery that fall, and crafting materials are what is brought home.'));
    }
    for (const thing of summary.home) {
        const row = make('div', 'window-item');
        if (thing.rarity) row.dataset.rarity = thing.rarity;
        const picture = make('img');
        picture.src = thing.image;
        picture.alt = '';
        const text = make('span', 'window-item-text');
        text.append(make('span', thing.rarity ? 'window-item-name' : 'window-item-name game-over-plain', thing.name), make('span', 'window-item-note', thing.note));
        row.append(picture, text);
        if (thing.isNew) row.append(make('span', 'game-over-new', 'New'));
        list.append(row);
    }

    const notes = element('gameOverSold');
    notes.textContent = '';
    for (const note of summary.notes) notes.append(make('p', note.kind === 'warning' ? 'window-warning' : '', note.text));
    notes.hidden = summary.notes.length === 0;
}
