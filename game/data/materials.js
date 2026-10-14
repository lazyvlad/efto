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

// What kind of thing an item is, for the bags and the inventory:
//   'gear'      worn (a piece of a hunter set): it goes to the account, and takes no bag room
//   'material'  kept for crafting
//   'junk'      sold for its coins when the game ends
export function categoryOf(item) {
    if (!item) return 'junk';
    if (item.type === 'set_piece') return 'gear';
    return MATERIALS.has(item.id) ? 'material' : 'junk';
}
