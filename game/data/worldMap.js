// The world map on the main menu: where each zone of the game sits on the painted map
// (assets/ui/world-map.webp), for choosing where to start (ui/travelMap.js).
//
// A place is a zone of one side, by its number (the zones and their backgrounds are in
// data/backgrounds.js, the bosses that guard them in data/bosses.js). "x" and "y" are where
// its pin stands, in percent of the picture. A place with no side is not in the game yet and
// is shown locked; it brings its own picture.

export const places = [
    { faction: 'alliance', zone: 1, x: 77, y: 53, description: 'A quiet beginning beneath the abbey walls.' },
    { faction: 'alliance', zone: 2, x: 74, y: 59, description: 'Goldshire woods, winding paths and familiar dangers.' },
    { faction: 'alliance', zone: 3, x: 67, y: 52, description: 'The blue-and-gold heart of the Alliance.' },
    { faction: 'alliance', zone: 4, x: 66, y: 64, description: 'Golden fields and trouble on the frontier.' },
    { faction: 'alliance', zone: 5, x: 85, y: 56, description: 'Lakeshire bridges beneath red mountain cliffs.' },
    { faction: 'alliance', zone: 6, x: 79, y: 67, description: 'Darkshire lanterns and haunted woodland.' },
    { faction: 'alliance', zone: 7, x: 70, y: 37, description: 'Marshland roads leading to Menethil Harbor.' },
    { faction: 'alliance', zone: 8, x: 78, y: 29, description: 'Rolling highlands and the ruins of Stromgarde.' },
    { faction: 'alliance', zone: 9, x: 75, y: 83, description: 'Tropical trails, ancient ruins and jungle hunters.' },
    { faction: 'alliance', zone: 10, x: 81, y: 17, description: 'Wild hills watched over by Aerie Peak.' },
    { faction: 'horde', zone: 1, x: 38, y: 43, description: 'A first test among Durotar’s red rocks.' },
    { faction: 'horde', zone: 2, x: 38, y: 32, description: 'Razor Hill and the sun-baked orc homeland.' },
    { faction: 'horde', zone: 3, x: 39, y: 24, description: 'The iron gates and stronghold of the Horde.' },
    { faction: 'horde', zone: 4, x: 30, y: 38, description: 'Wide savanna and the trading port of Ratchet.' },
    { faction: 'horde', zone: 5, x: 22, y: 28, description: 'Rocky passes around Sun Rock Retreat.' },
    { faction: 'horde', zone: 6, x: 31, y: 18, description: 'Ancient forests near Splintertree Post.' },
    { faction: 'horde', zone: 7, x: 26, y: 60, description: 'Towering stone pillars and Freewind Post.' },
    { faction: 'horde', zone: 8, x: 68, y: 21, description: 'Tarren Mill beneath the northern foothills.' },
    { faction: 'horde', zone: 9, x: 18, y: 48, description: 'Ash-gray wastes and the coast of Shadowprey.' },
    { faction: 'horde', zone: 10, x: 32, y: 73, description: 'Desert sands surrounding bustling Gadgetzan.' },
    // Not in the game yet
    { faction: null, zone: null, name: 'Blackrock Depths', image: 'assets/backgrounds/dungeons/blackrock-depths.webp', x: 85, y: 42, description: 'A fiery descent into the dark iron city.' }
];

export const WORLD_MAP_PICTURE = 'assets/ui/world-map.webp';
