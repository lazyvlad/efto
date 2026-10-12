// The loot screen (pause menu, "Loot"): what this game has collected so far, and what the
// account has collected over all its games.
//
// "This game" is built from the game's own state. "All time" is asked of the site
// (INPUT_BOOT.urls.collection): { coins, items: [{ id, name, image, times }],
// bosses: { alliance: [{ name, image, loot: [{ id, name, rarity, times }] }], horde: [...] } }.

import { siteBoot } from './accountBar.js';
import { formatCoins } from '../utils/coins.js';

// Rarest first
const ITEM_ORDER = ['zee_zgnan', 'legendary', 'tier_set', 'special', 'epic', 'green', 'regular'];
const ITEM_TYPE_NAMES = {
    zee_zgnan: 'Zee Zgnan', legendary: 'Legendary', tier_set: 'Tier set', special: 'Special',
    epic: 'Epic', green: 'Uncommon', regular: 'Common'
};
const BOSS_RARITY_NAMES = { uncommon: 'Uncommon', rare: 'Rare', epic: 'Epic' };

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

function heading(text, note) {
    const title = element('h3', 'loot-section-title', text);
    if (note) title.append(element('span', 'loot-section-note', note));
    return title;
}

function emptyRow(title, description) {
    const row = element('div', 'bonus-item no-bonuses');
    const info = element('div', 'bonus-info');
    info.append(element('div', 'bonus-item-name', title), element('div', 'bonus-description', description));
    row.append(info);
    return row;
}

// One line of loot: picture, name, a line under it, and something on the right
function lootRow({ image, name, nameClass, description, right, missing }) {
    const row = element('div', `bonus-item loot-row${missing ? ' loot-missing' : ''}`);

    if (image) {
        const picture = element('img', 'loot-icon');
        picture.src = image;
        picture.alt = '';
        picture.loading = 'lazy';
        row.append(picture);
    }

    const info = element('div', 'bonus-info');
    info.append(element('div', `bonus-item-name ${nameClass || ''}`.trim(), name));
    if (description) info.append(element('div', 'bonus-description', description));
    row.append(info);

    if (right) row.append(element('div', 'bonus-values loot-count', right));
    return row;
}

function bonusText(item) {
    const parts = [];
    if (item.crit_rating_bonus > 0) parts.push(`+${Math.round(item.crit_rating_bonus * 100)}% crit`);
    if (item.dodge_rating_bonus > 0) parts.push(`+${Math.round(item.dodge_rating_bonus * 100)}% dodge`);
    if (parts.length === 0) return '';
    return ` • ${parts.join(', ')}${item.effect_type === 'permanent' ? '' : ' for a while'}`;
}

/**
 * What the game being played has collected so far.
 * @param {HTMLElement} container
 * @param {object} game  { items: the game's items with their "collected" counts,
 *                         bossLoot: [{ boss, item: { name, rarity }, kept }], coins }
 */
export function renderThisGame(container, { items, bossLoot, coins }) {
    container.textContent = '';

    const caught = items
        .filter(item => item.collected > 0)
        .sort((a, b) => ITEM_ORDER.indexOf(a.type) - ITEM_ORDER.indexOf(b.type) || b.collected - a.collected || a.name.localeCompare(b.name));
    const total = caught.reduce((sum, item) => sum + item.collected, 0);

    container.append(element('div', 'loot-summary', `Coins earned this game: ${formatCoins(coins)}`));

    container.append(heading('Boss loot', bossLoot.length > 0 ? `${bossLoot.length} dropped` : ''));
    if (bossLoot.length === 0) {
        container.append(emptyRow('No boss loot yet', 'Every boss you defeat drops one of its three items'));
    }
    for (const drop of bossLoot) {
        container.append(lootRow({
            image: drop.boss.image,
            name: drop.item.name,
            nameClass: `loot-${drop.item.rarity}`,
            description: `${BOSS_RARITY_NAMES[drop.item.rarity] || ''} • dropped by ${drop.boss.name}${drop.kept ? '' : ' • not kept: log in to keep boss loot'}`
        }));
    }

    container.append(heading('Items', total > 0 ? `${total} caught` : ''));
    if (caught.length === 0) {
        container.append(emptyRow('Nothing caught yet', 'The items you catch in this game are listed here'));
    }
    for (const item of caught) {
        container.append(lootRow({
            image: item.image,
            name: item.name,
            nameClass: `loot-type-${item.type}`,
            description: `${ITEM_TYPE_NAMES[item.type] || item.type}${bonusText(item)}`,
            right: `×${item.collected}`
        }));
    }
}

let collection = null;      // The last answer from the site
let asking = null;

// Ask the site for the account's collection and draw it; what was fetched before shows meanwhile
function loadCollection(container) {
    if (asking) return;

    asking = fetch(siteBoot.urls.collection, { headers: { 'Accept': 'application/json' }, credentials: 'same-origin' })
        .then(response => {
            if (!response.ok) throw new Error(`Server answered ${response.status}`);
            return response.json();
        })
        .then(data => {
            collection = data;
            drawCollection(container, data);
        })
        .catch(() => {
            if (!collection) {
                container.textContent = '';
                container.append(emptyRow('Could not load your collection', 'Check your connection and open this tab again'));
            }
        })
        .finally(() => {
            asking = null;
        });
}

function drawCollection(container, data) {
    container.textContent = '';
    container.append(element('div', 'loot-summary', `Your purse: ${formatCoins(data.coins)}`));

    const bossItems = Object.values(data.bosses).flat().flatMap(boss => boss.loot);
    container.append(heading('Boss loot', `${bossItems.filter(item => item.times > 0).length} of ${bossItems.length} found`));

    for (const [side, bosses] of Object.entries(data.bosses)) {
        container.append(element('div', 'loot-side', side === 'alliance' ? 'Alliance' : 'Horde'));

        for (const boss of bosses) {
            for (const item of boss.loot) {
                container.append(lootRow({
                    image: boss.image,
                    name: item.name,
                    nameClass: item.times > 0 ? `loot-${item.rarity}` : '',
                    description: `${BOSS_RARITY_NAMES[item.rarity] || ''} • ${boss.name}`,
                    right: item.times > 0 ? `×${item.times}` : '',
                    missing: item.times === 0
                }));
            }
        }
    }

    container.append(heading('Rare items', `${data.items.filter(item => item.times > 0).length} of ${data.items.length} found`));
    for (const item of data.items) {
        container.append(lootRow({
            image: item.image,
            name: item.name,
            nameClass: item.times > 0 ? 'loot-found' : '',
            description: item.times > 0 ? '' : 'Not found yet',
            right: item.times > 0 ? `×${item.times}` : '',
            missing: item.times === 0
        }));
    }
}

/**
 * What the account has collected over all its games. Guests are told how to get one.
 */
export function renderAllTime(container) {
    if (!siteBoot || !siteBoot.user || !siteBoot.urls.collection) {
        container.textContent = '';
        container.append(emptyRow('Log in to keep a collection', 'Boss loot, rare items and coins are kept on your account from game to game'));
        return;
    }

    if (collection) {
        drawCollection(container, collection);
    } else {
        container.textContent = '';
        container.append(emptyRow('Loading your collection...', ''));
    }
    loadCollection(container);
}
