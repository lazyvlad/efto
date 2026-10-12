// The backgrounds a game moves through, by the side the player chose at the start.
//
// Each side has its own list of landmarks, shown in the order they are listed here. To add one,
// put the picture in assets/backgrounds/<side>/ and add a line to that side's list:
//
//     { id: 'stormwind', name: "Stormwind", image: 'assets/backgrounds/alliance/03-stormwind.webp' },
//
// "id" is a short name that never changes, "name" is what the player is shown when the game
// arrives there. Pictures are stretched to cover the screen, so use landscape images
// (the current ones are 1672x941 WebP, about 200 KB each). A side with no backgrounds listed keeps the game's standard one.
//
// When the game moves from one background to the next is set under "backgrounds" in
// config/gameConfig.js.

export const FACTIONS = {
    alliance: { id: 'alliance', name: 'Alliance' },
    horde: { id: 'horde', name: 'Horde' }
};

export const backgrounds = {
    alliance: [
        { id: 'northshire-abbey', name: "Northshire Abbey", image: 'assets/backgrounds/alliance/01-northshire-abbey.webp' },
        { id: 'elwynn-eastvale', name: "Eastvale, Elwynn Forest", image: 'assets/backgrounds/alliance/02-elwynn-eastvale.webp' },
        { id: 'stormwind', name: "Stormwind", image: 'assets/backgrounds/alliance/03-stormwind.webp' },
        { id: 'westfall', name: "Westfall", image: 'assets/backgrounds/alliance/04-westfall.webp' },
        { id: 'redridge-lakeshire', name: "Lakeshire, Redridge Mountains", image: 'assets/backgrounds/alliance/05-redridge-lakeshire.webp' },
        { id: 'duskwood-darkshire', name: "Darkshire, Duskwood", image: 'assets/backgrounds/alliance/06-duskwood-darkshire.webp' },
        { id: 'wetlands-menethil', name: "Menethil Harbor, Wetlands", image: 'assets/backgrounds/alliance/07-wetlands-menethil.webp' },
        { id: 'arathi-stromgarde', name: "Stromgarde, Arathi Highlands", image: 'assets/backgrounds/alliance/08-arathi-stromgarde.webp' },
        { id: 'stranglethorn-vale', name: "Stranglethorn Vale", image: 'assets/backgrounds/alliance/09-stranglethorn-vale.webp' },
        { id: 'hinterlands-aerie-peak', name: "Aerie Peak, The Hinterlands", image: 'assets/backgrounds/alliance/10-hinterlands-aerie-peak.webp' },
    ],
    horde: [
        { id: 'valley-of-trials', name: "Valley of Trials", image: 'assets/backgrounds/horde/01-valley-of-trials.webp' },
        { id: 'durotar-razor-hill', name: "Razor Hill, Durotar", image: 'assets/backgrounds/horde/02-durotar-razor-hill.webp' },
        { id: 'orgrimmar-valley-of-strength', name: "Valley of Strength, Orgrimmar", image: 'assets/backgrounds/horde/03-orgrimmar-valley-of-strength.webp' },
        { id: 'barrens-ratchet', name: "Ratchet, The Barrens", image: 'assets/backgrounds/horde/04-barrens-ratchet.webp' },
        { id: 'stonetalon-sun-rock', name: "Sun Rock Retreat, Stonetalon Mountains", image: 'assets/backgrounds/horde/05-stonetalon-sun-rock.webp' },
        { id: 'ashenvale-splintertree', name: "Splintertree Post, Ashenvale", image: 'assets/backgrounds/horde/06-ashenvale-splintertree.webp' },
        { id: 'thousand-needles-freewind', name: "Freewind Post, Thousand Needles", image: 'assets/backgrounds/horde/07-thousand-needles-freewind.webp' },
        { id: 'hillsbrad-tarren-mill', name: "Tarren Mill, Hillsbrad Foothills", image: 'assets/backgrounds/horde/08-hillsbrad-tarren-mill.webp' },
        { id: 'desolace-shadowprey', name: "Shadowprey Village, Desolace", image: 'assets/backgrounds/horde/09-desolace-shadowprey.webp' },
        { id: 'tanaris-gadgetzan', name: "Gadgetzan, Tanaris", image: 'assets/backgrounds/horde/10-tanaris-gadgetzan.webp' },
    ]
};

/**
 * Which background of a side's list a level is played on.
 * @param {number} level  The current level, counted from 0
 * @param {number} count  How many backgrounds the side has
 * @param {object} rules  The "backgrounds" settings: { levelsPerBackground, whenFinished }
 * @returns {number} Index into the side's list, or -1 when the side has none
 */
export function backgroundIndexForLevel(level, count, rules) {
    if (count <= 0) return -1;

    const step = Math.floor(Math.max(0, level) / Math.max(1, rules.levelsPerBackground));

    // Past the last background: start again from the first, or stay on the last
    return rules.whenFinished === 'loop' ? step % count : Math.min(step, count - 1);
}
