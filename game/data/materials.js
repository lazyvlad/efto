// Which of the things that fall are crafting materials.
//
// Everything caught goes into the hunter's bags (utils/bags.js). When the game ends, what is
// only worth selling is sold for its coins there and then; a material is kept instead, on the
// player's account, to be made into something later. So a material pays no coins when it is
// caught: it is worth more kept.
//
// The site has the same list ("materials" in config/loot.php; a test keeps the two the same).

export const MATERIALS = new Set([
    // Cloth, leather and herbs
    'runecloth', 'rugged-leather', 'light-feather', 'kingsblood', 'fadeleaf', 'black-lotuses',
    // Metal and gems
    'mithril-bar', 'thorium-bar', 'arcane-crystal', 'sapphire-gem', 'pearl-gem',
    // Reagents from the dungeons and the elements
    'essence-of-water', 'dark-rune', 'righteous-orb', 'fiery-core', 'lava-core',
]);

// The zone each material falls in (1 the first), both sides alike: the higher, the stronger.
// When the bags are full, a material caught may push out a slot of a weaker one (utils/bags.js,
// makeRoomFor), as the player chooses in Settings ("Your bags"). The zones' own new materials
// join this list as they are painted (art-workbench/zone-materials/REQUEST.md).
export const MATERIAL_ZONE = {
    'light-feather': 2,
    'mithril-bar': 5,
    'fadeleaf': 6, 'dark-rune': 6,
    'essence-of-water': 7, 'pearl-gem': 7,
    'kingsblood': 8, 'sapphire-gem': 8, 'thorium-bar': 8,
    'runecloth': 9, 'rugged-leather': 9, 'arcane-crystal': 9,
    'black-lotuses': 10, 'righteous-orb': 10, 'fiery-core': 10, 'lava-core': 10,
};

// How strong a material is: its zone (0 for one not placed in a zone)
export function materialZone(itemId) {
    return MATERIAL_ZONE[itemId] || 0;
}

// What kind of thing an item is, for the bags and the inventory:
//   'gear'      worn (a piece of a hunter set): it goes to the account, and takes no bag room
//   'material'  kept for crafting
//   'junk'      sold for its coins when the game ends
export function categoryOf(item) {
    if (!item) return 'junk';
    if (item.type === 'set_piece') return 'gear';
    return MATERIALS.has(item.id) ? 'material' : 'junk';
}
