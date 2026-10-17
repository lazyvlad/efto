// What can be crafted, and what potions do.
//
// The site hands over what can be made and from what with the page (INPUT_BOOT.crafting, from
// config/crafting.php there): { items: { itemId: { name, image, rarity } }, recipes: { itemId:
// { materialId: count } } }. Crafting happens between games, from what is in the bags; what is
// made goes into the bags too. What a potion does when it is drunk in a fight is the game's own
// ("potions" in config/gameConfig.js). Opened without the site, nothing can be crafted.

import { siteBoot } from '../ui/accountBar.js';

// The things that can be made: { itemId: { id, name, image, rarity, type: 'crafted' } }
export function craftedItems() {
    const items = (siteBoot && siteBoot.crafting && siteBoot.crafting.items) || {};
    return Object.fromEntries(Object.entries(items).map(([id, item]) => [id, { id, type: 'crafted', ...item }]));
}

export function craftedById(id) {
    return craftedItems()[id] || null;
}

export function isCrafted(id) {
    return craftedById(id) !== null;
}

// Every recipe: [{ id (what it makes), item, needs: { materialId: count }, makes }], "makes"
// being how many one making of it makes (arrows come by the bundle)
export function recipes() {
    const all = (siteBoot && siteBoot.crafting && siteBoot.crafting.recipes) || {};
    const makes = (siteBoot && siteBoot.crafting && siteBoot.crafting.makes) || {};
    return Object.entries(all).map(([id, needs]) => ({ id, item: craftedById(id), needs, makes: makes[id] || 1 }));
}

// How many of a recipe can be made from these contents: the scarcest reagent decides
export function canMake(needs, contents) {
    const counts = Object.entries(needs).map(([itemId, each]) => Math.floor((contents[itemId] || 0) / each));
    return counts.length ? Math.min(...counts) : 0;
}
