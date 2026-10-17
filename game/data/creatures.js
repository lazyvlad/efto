// The creatures of each zone: they come down at the hunter during play (systems/creatureSystem.js;
// the rules they all share are under "creatures" in config/gameConfig.js).
//
// Each is painted as one sheet, assets/creatures/<id>.webp: 1024 x 768, four columns by three
// rows of 256 x 256 cells, the same for every creature:
//
//     row 0: travel 0, travel 1, travel 2, hit
//     row 1: wind-up 0, wind-up 1, attack 0, attack 1
//     row 2: death 0, death 1, death 2, (empty)
//
// "cell" is how tall a cell is drawn, against the hunter's figure; "core" is the body inside a
// cell that arrows hit and that bites (x, y, width, height as shares of the cell), from the art
// agent's sheets (art-workbench/zone-creatures).
//
// Every zone has its own two: a common one and a bruiser (art-workbench/zone-creatures/
// roster.json). Health and armor follow the grade (commons 40 and none, bruisers 50 and their
// own armor); pace is quicker for beasts and fliers, slower for the heavy ones.

export const CREATURE_SHEET = { columns: 4, cell: 256 };

export const CREATURE_FRAMES = {
    travel: { frames: [0, 1, 2], ms: [167, 167, 166], loop: true },
    windup: { frames: [4, 5], ms: [150, 150] },
    attack: { frames: [6, 7], ms: [90, 90] },      // Bites on the second
    hit: { frames: [3], ms: [100] },               // Shown over whatever it is doing
    death: { frames: [8, 9, 10], ms: [90, 90, 90], fade: [1, 0.75, 0.3] },
};

// "health" is before the zone's share more (creatures.healthPerZone); "pace" how quickly it
// moves about, against the others.
export const creatures = {
    'timber-wolf': { name: 'Timber Wolf', grade: 'common', health: 40, armor: 0, pace: 1.2, cell: 0.6872, core: { x: 0.38, y: 0.39, width: 0.25, height: 0.27 } },
    'kobold-worker': { name: 'Kobold Worker', grade: 'bruiser', health: 50, armor: 10, pace: 0.8, cell: 0.7805, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'prowler': { name: 'Prowler', grade: 'common', health: 40, armor: 0, pace: 1.3, cell: 0.6919, core: { x: 0.38, y: 0.39, width: 0.25, height: 0.27 } },
    'harvest-golem': { name: 'Harvest Golem', grade: 'bruiser', health: 50, armor: 25, pace: 0.7, cell: 0.7619, core: { x: 0.38, y: 0.34, width: 0.24, height: 0.28 } },
    'scorpid-worker': { name: 'Scorpid Worker', grade: 'common', health: 40, armor: 0, pace: 1, cell: 0.644, core: { x: 0.4, y: 0.43, width: 0.22, height: 0.23 } },
    'mottled-boar': { name: 'Mottled Boar', grade: 'bruiser', health: 50, armor: 10, pace: 0.9, cell: 0.7758, core: { x: 0.35, y: 0.36, width: 0.3, height: 0.3 } },
    'bloodtalon-raptor': { name: 'Bloodtalon Raptor', grade: 'common', health: 40, armor: 0, pace: 1.3, cell: 0.64, core: { x: 0.38, y: 0.35, width: 0.25, height: 0.3 } },
    'riverpaw-gnoll': { name: 'Riverpaw Gnoll', grade: 'bruiser', health: 50, armor: 15, pace: 0.85, cell: 0.795, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'defias-captive': { name: 'Defias Captive', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.7642, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'defias-convict': { name: 'Defias Convict', grade: 'bruiser', health: 50, armor: 20, pace: 0.85, cell: 0.8951, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'defias-pillager': { name: 'Defias Pillager', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6132, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'shadowhide-gnoll': { name: 'Shadowhide Gnoll', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.64, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'blackrock-grunt': { name: 'Blackrock Grunt', grade: 'bruiser', health: 50, armor: 30, pace: 0.85, cell: 0.8421, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'raven-hill-ghoul': { name: 'Raven Hill Ghoul', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6564, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'nightbane-worgen': { name: 'Nightbane Worgen', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.9481, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'bluegill-murloc': { name: 'Bluegill Murloc', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6244, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'dragonmaw-raider': { name: 'Dragonmaw Raider', grade: 'bruiser', health: 50, armor: 30, pace: 0.85, cell: 0.8477, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'syndicate-highwayman': { name: 'Syndicate Highwayman', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6059, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'boulderfist-ogre': { name: 'Boulderfist Ogre', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.8533, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'jungle-panther': { name: 'Jungle Panther', grade: 'common', health: 40, armor: 0, pace: 1.25, cell: 0.6481, core: { x: 0.35, y: 0.38, width: 0.3, height: 0.25 } },
    'bloodscalp-troll': { name: 'Bloodscalp Troll', grade: 'bruiser', health: 50, armor: 30, pace: 0.85, cell: 0.8312, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'vilebranch-witch-doctor': { name: 'Vilebranch Witch Doctor', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.7211, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'savage-owlbeast': { name: 'Savage Owlbeast', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.9846, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'razormane-quilboar': { name: 'Razormane Quilboar', grade: 'bruiser', health: 50, armor: 15, pace: 0.85, cell: 0.7853, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'searing-blade-cultist': { name: 'Searing Blade Cultist', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6781, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'ragefire-trogg': { name: 'Ragefire Trogg', grade: 'bruiser', health: 50, armor: 20, pace: 0.8, cell: 0.7805, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'southsea-brigand': { name: 'Southsea Brigand', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6321, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'savannah-lion': { name: 'Savannah Lion', grade: 'bruiser', health: 50, armor: 25, pace: 0.9, cell: 0.8421, core: { x: 0.35, y: 0.38, width: 0.3, height: 0.25 } },
    'bloodfury-harpy': { name: 'Bloodfury Harpy', grade: 'common', health: 40, armor: 0, pace: 1.2, cell: 0.7758, core: { x: 0.4, y: 0.35, width: 0.2, height: 0.3 } },
    'venture-co-operator': { name: 'Venture Co. Operator', grade: 'bruiser', health: 50, armor: 30, pace: 0.85, cell: 0.8205, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'satyr': { name: 'Satyr', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6919, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'thistlefur-furbolg': { name: 'Thistlefur Furbolg', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.8889, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'highperch-wyvern': { name: 'Highperch Wyvern', grade: 'common', health: 40, armor: 0, pace: 1.2, cell: 0.7314, core: { x: 0.4, y: 0.35, width: 0.2, height: 0.3 } },
    'grimtotem-brute': { name: 'Grimtotem Brute', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 1.024, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'syndicate-rogue': { name: 'Syndicate Rogue', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6872, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'cave-yeti': { name: 'Cave Yeti', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.9343, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'slitherblade-naga': { name: 'Slitherblade Naga', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.7062, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'magram-centaur': { name: 'Magram Centaur', grade: 'bruiser', health: 50, armor: 30, pace: 0.9, cell: 0.8707, core: { x: 0.35, y: 0.38, width: 0.3, height: 0.28 } },
    'wastewander-bandit': { name: 'Wastewander Bandit', grade: 'common', health: 40, armor: 0, pace: 1.0, cell: 0.6827, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
    'dunemaul-ogre': { name: 'Dunemaul Ogre', grade: 'bruiser', health: 50, armor: 30, pace: 0.8, cell: 0.7529, core: { x: 0.38, y: 0.34, width: 0.25, height: 0.3 } },
};

// By the zone's background (data/backgrounds.js). "every": seconds from one creature to the
// next coming in, once the last is gone (or while it is about, if "most" lets more be);
// "approach": seconds one takes to close in on him, if nothing pushes it back. Bruisers come
// a quarter of the time.
const START = { every: [2, 3.5], most: 3, approach: [10, 14] };
export const zoneCreatures = {
    'northshire-abbey': { ...START, creatures: { 'timber-wolf': 75, 'kobold-worker': 25 } },
    'elwynn-eastvale': { ...START, creatures: { 'prowler': 75, 'riverpaw-gnoll': 25 } },
    'stormwind': { ...START, creatures: { 'defias-captive': 75, 'defias-convict': 25 } },
    'westfall': { every: [2, 3.5], most: 4, approach: [9, 12], creatures: { 'defias-pillager': 65, 'harvest-golem': 35 } },
    'redridge-lakeshire': { ...START, creatures: { 'shadowhide-gnoll': 75, 'blackrock-grunt': 25 } },
    'duskwood-darkshire': { ...START, creatures: { 'raven-hill-ghoul': 75, 'nightbane-worgen': 25 } },
    'wetlands-menethil': { ...START, creatures: { 'bluegill-murloc': 75, 'dragonmaw-raider': 25 } },
    'arathi-stromgarde': { ...START, creatures: { 'syndicate-highwayman': 75, 'boulderfist-ogre': 25 } },
    'stranglethorn-vale': { ...START, creatures: { 'jungle-panther': 75, 'bloodscalp-troll': 25 } },
    'hinterlands-aerie-peak': { ...START, creatures: { 'vilebranch-witch-doctor': 75, 'savage-owlbeast': 25 } },
    'valley-of-trials': { ...START, creatures: { 'scorpid-worker': 75, 'mottled-boar': 25 } },
    'durotar-razor-hill': { ...START, creatures: { 'bloodtalon-raptor': 75, 'razormane-quilboar': 25 } },
    'orgrimmar-valley-of-strength': { ...START, creatures: { 'searing-blade-cultist': 75, 'ragefire-trogg': 25 } },
    'barrens-ratchet': { ...START, creatures: { 'southsea-brigand': 75, 'savannah-lion': 25 } },
    'stonetalon-sun-rock': { ...START, creatures: { 'bloodfury-harpy': 75, 'venture-co-operator': 25 } },
    'ashenvale-splintertree': { ...START, creatures: { 'satyr': 75, 'thistlefur-furbolg': 25 } },
    'thousand-needles-freewind': { ...START, creatures: { 'highperch-wyvern': 75, 'grimtotem-brute': 25 } },
    'hillsbrad-tarren-mill': { ...START, creatures: { 'syndicate-rogue': 75, 'cave-yeti': 25 } },
    'desolace-shadowprey': { ...START, creatures: { 'slitherblade-naga': 75, 'magram-centaur': 25 } },
    'tanaris-gadgetzan': { ...START, creatures: { 'wastewander-bandit': 75, 'dunemaul-ogre': 25 } },
};

export function creatureImage(id) {
    return `assets/creatures/${id}.webp`;
}
