// Everything that can be worn.
//
// The pieces of the hunter sets are items of the game (data/gameItems.js). The rest is told
// by the site with the page (INPUT_BOOT.gear, from config/gear.php there): what the bosses
// drop, and the weapons and jewellery that fall in a game, each with where it is worn, what
// it gives and what it sells for. Opened on its own, without the site, the game has only
// the sets.

import { gameItems } from './gameItems.js';
import { siteBoot } from '../ui/accountBar.js';

let all = null;

// The catalogue of gear that is not a piece of a set: { itemId: { name, image, slot, ... } }
export function gearCatalog() {
    return (siteBoot && siteBoot.gear) || {};
}

// Whether something is gear that is kept (to wear or sell) and is not a piece of a set
export function isKeptGear(itemId) {
    return Object.prototype.hasOwnProperty.call(gearCatalog(), itemId);
}

// Every item that can be worn, as the rules of wearing (utils/gear.js) want them:
// { id, name, image, slot, set?, stats?, rarity?, value?, from? }
export function wearables() {
    if (all) return all;

    all = gameItems.filter(item => item.type === 'set_piece');
    for (const [id, item] of Object.entries(gearCatalog())) {
        all.push({ id, ...item });
    }
    return all;
}

export function wearableById(id) {
    return wearables().find(item => item.id === id) || null;
}
