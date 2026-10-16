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
// A zone not listed has no creatures yet: the rest are still being painted.

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
};

// By the zone's background (data/backgrounds.js). "every": seconds from one creature to the
// next coming in, once the last is gone (or while it is about, if "most" lets more be);
// "approach": seconds one takes to close in on him, if nothing pushes it back. Bruisers come
// a quarter of the time.
const START = { every: [2, 3.5], most: 3, approach: [10, 14] };
export const zoneCreatures = {
    'northshire-abbey': { ...START, creatures: { 'timber-wolf': 75, 'kobold-worker': 25 } },
    'elwynn-eastvale': { ...START, creatures: { 'prowler': 1 } },
    'westfall': { every: [2, 3.5], most: 4, approach: [9, 12], creatures: { 'harvest-golem': 1 } },
    'valley-of-trials': { ...START, creatures: { 'scorpid-worker': 75, 'mottled-boar': 25 } },
    'durotar-razor-hill': { ...START, creatures: { 'bloodtalon-raptor': 1 } },
};

export function creatureImage(id) {
    return `assets/creatures/${id}.webp`;
}
