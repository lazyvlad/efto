// The side the player chose (Alliance or Horde) and the background behind the game.
//
// The canvas is transparent; the background is a pair of full-screen layers behind it that
// fade from one picture to the next. The pictures come from data/backgrounds.js, and the level
// decides which one of the chosen side's list is showing (see "backgrounds" in gameConfig).
// With no side chosen, or no pictures listed for it, the page's standard background shows.

import { gameConfig } from '../config/gameConfig.js';
import { FACTIONS, backgrounds, backgroundIndexForLevel } from '../data/backgrounds.js';

const FACTION_KEY = 'input_faction';

let faction = null;
let current = null;         // The background showing now (an entry of data/backgrounds.js), or null
let frontLayer = 0;         // Which of the two layers is showing
const preloaded = new Map();

try {
    const saved = localStorage.getItem(FACTION_KEY);
    if (FACTIONS[saved]) faction = saved;
} catch (e) {
    // Storage unavailable: the player picks a side each visit
}

function layers() {
    return [document.getElementById('backgroundLayerA'), document.getElementById('backgroundLayerB')];
}

// Load a picture ahead of time. Resolves to whether it can be shown.
function preload(entry) {
    if (!preloaded.has(entry.image)) {
        preloaded.set(entry.image, new Promise(resolve => {
            const image = new Image();
            image.onload = () => resolve(true);
            image.onerror = () => resolve(false);
            image.src = entry.image;
        }));
    }
    return preloaded.get(entry.image);
}

// Fades from the picture showing to the next one. With "instant" it is swapped in place: used
// on the menu, and whenever there is no picture to fade from.
async function show(entry, instant = false) {
    if (entry === current) return;
    instant = instant || !current;
    current = entry;

    const [a, b] = layers();
    if (!a || !b) return;

    if (!entry) {
        // Back to the page's standard background
        a.classList.remove('visible');
        b.classList.remove('visible');
        return;
    }

    // A picture that is missing leaves the background as it is
    const usable = await preload(entry);
    if (!usable || current !== entry) return;

    const [front, back] = frontLayer === 0 ? [a, b] : [b, a];
    back.style.backgroundImage = `url("${entry.image}")`;
    [front, back].forEach(layer => layer.classList.toggle('instant', instant));
    back.classList.add('visible');
    front.classList.remove('visible');
    frontLayer = 1 - frontLayer;
}

// The side the player is on: 'alliance', 'horde', or null before they have chosen
export function getFaction() {
    return faction;
}

export function setFaction(id) {
    if (!FACTIONS[id]) return;

    faction = id;
    try {
        localStorage.setItem(FACTION_KEY, id);
    } catch (e) {
        // Storage unavailable: the choice lasts for this visit
    }
}

// The picture showing now (its path), for the windows that show the hunter in his place
export function currentBackgroundImage() {
    return current ? current.image : null;
}

// The name of the place showing now ("Westfall"), or null
export function currentBackgroundName() {
    return current ? current.name : null;
}

// Where the game is now: the background's id ("westfall") and which zone of the side's it
// is (1 for the first), or null
export function currentZone() {
    if (!current) return null;
    const index = factionBackgrounds().indexOf(current);
    return { id: current.id, number: index + 1 };
}

// The backgrounds of the chosen side, in order
export function factionBackgrounds() {
    return faction ? backgrounds[faction] : [];
}

/**
 * Show the background a level is played on.
 * @param {number}  level    The current level, counted from 0
 * @param {boolean} instant  Swap it in place instead of fading to it
 * @returns {object|null} The background, if this call changed it (so the caller can announce it)
 */
export function showBackgroundForLevel(level, instant = false) {
    const list = factionBackgrounds();
    const index = backgroundIndexForLevel(level, list.length, gameConfig.backgrounds);
    const entry = index >= 0 ? list[index] : null;
    const changed = entry !== current;

    show(entry, instant);

    // Have the one after it ready before the game gets there
    if (entry) {
        const next = backgroundIndexForLevel(level + gameConfig.backgrounds.levelsPerBackground, list.length, gameConfig.backgrounds);
        if (next >= 0 && next !== index) preload(list[next]);
    }

    return changed ? entry : null;
}

// The menu and the start of a game show where the chosen side starts, straight away
export function showStartingBackground() {
    showBackgroundForLevel(0, true);
}

// Both sides' starting pictures are fetched up front, so choosing a side shows it at once; a
// side chosen on an earlier visit is on screen as soon as its picture has loaded.
Object.values(backgrounds).forEach(list => {
    if (list.length > 0) preload(list[0]);
});
showStartingBackground();
