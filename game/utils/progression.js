// How a player levels up, and what each level changes about the items.
//
// Catching items gives experience. Every level needs more experience than the one before, as in
// World of Warcraft Classic, so the early levels go by quickly and the later ones take longer.
// Items are worth more at higher levels, and the rarer kinds only start dropping once the
// player has reached their level. The numbers live under "progression" in config/gameConfig.js
// and are passed in here as "rules", which keeps these functions easy to test.
//
// Levels here are the ones the player sees: the first level is 1.

// How many times its listed value an item is worth at a level
export function valueMultiplier(level, rules) {
    return 1 + rules.valueGrowthPerLevel * (Math.max(1, level) - 1);
}

// Points and experience for an item with the given listed value, caught at a level
export function itemValueAtLevel(baseValue, level, rules) {
    return Math.max(1, Math.round(baseValue * valueMultiplier(level, rules)));
}

// Seconds a player who catches most things should spend on a level
export function secondsForLevel(level, rules) {
    return rules.secondsAtLevel1 + rules.secondsPerLevel * (Math.max(1, level) - 1);
}

// Experience needed to get from a level to the next one
export function xpForLevel(level, rules) {
    return Math.round(rules.xpPerSecond * valueMultiplier(level, rules) * secondsForLevel(level, rules));
}

// Experience a player has when they first reach a level
export function totalXpAtLevel(level, rules) {
    let total = 0;
    for (let passed = 1; passed < level; passed++) {
        total += xpForLevel(passed, rules);
    }
    return total;
}

/**
 * Where a player stands with this much experience.
 * @returns {{ level: number, into: number, needed: number }} The level, the experience gained
 *          since reaching it, and the experience that level needs in all
 */
export function levelProgress(xp, rules) {
    let level = 1;
    let into = Math.max(0, xp);

    while (into >= xpForLevel(level, rules)) {
        into -= xpForLevel(level, rules);
        level++;
    }

    return { level, into, needed: xpForLevel(level, rules) };
}

// Whether items of a rarity drop yet at a level
export function isUnlocked(type, level, rules) {
    return level >= (rules.unlockLevel[type] || 1);
}
