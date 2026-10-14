// The hunter's three stats, and what they do.
//
//   health        how much he can lose (the base is "player.maxHealth" in gameConfig.js)
//   armor         takes a share off every hit that lands on him
//   attack power  each point adds one hundredth to what an arrow does
//
// They come from the pieces he owns of the set he is wearing (utils/sets.js). The numbers
// behind them are under "stats" in config/gameConfig.js. Bosses have armor too: a share taken
// off arrows, which an Arcane Shot, being magic, goes straight through.

/**
 * The share of a hit that armor takes off: armor / (armor + halvesAt). Every point is worth a
 * little less than the one before, so it never reaches all of it.
 * @param {number} armor
 * @param {Object} rules - gameConfig.stats
 * @returns {number} 0 (nothing taken off) up to rules.mostArmorReduction
 */
export function armorReduction(armor, rules) {
    if (!(armor > 0)) return 0;

    return Math.min(rules.mostArmorReduction, armor / (armor + rules.armorHalvesAt));
}

/**
 * What a hit does to the hunter once his armor has had its share. A hit that lands always
 * does at least 1.
 */
export function damageAfterArmor(damage, armor, rules) {
    if (!(damage > 0)) return 0;

    return Math.max(1, Math.round(damage * (1 - armorReduction(armor, rules))));
}

/**
 * What one arrow does to a boss.
 * @param {Object} shot
 * @param {number} shot.base - An arrow's damage before anything (bosses.arrowDamage)
 * @param {number} [shot.attackPower] - The hunter's
 * @param {number} [shot.worth] - How many arrows' worth the shot is (an Arcane Shot: 3)
 * @param {number} [shot.shotBonus] - What the set adds to this kind of shot (0.4 = +40%)
 * @param {number} [shot.bossArmor] - The share the boss's armor takes off (0 to 1)
 * @param {boolean} [shot.ignoresArmor] - An Arcane Shot does
 * @param {number} [shot.weakened] - 1 at the start of a fight, growing
 * @param {number} [shot.bossDamage] - What the set adds against bosses (0.2 = +20%)
 * @param {number} [shot.crit] - The crit multiplier if it crit, else 1
 * @returns {number} Whole damage
 */
export function arrowDamage({ base, attackPower = 0, worth = 1, shotBonus = 0, bossArmor = 0, ignoresArmor = false, weakened = 1, bossDamage = 0, crit = 1 }) {
    const throughArmor = ignoresArmor ? 1 : 1 - Math.max(0, Math.min(1, bossArmor));

    return Math.round(base * (1 + attackPower / 100) * worth * (1 + shotBonus) * throughArmor * weakened * (1 + bossDamage) * crit);
}

/**
 * Health kept in proportion when the most the hunter can have changes (a set put on, a piece
 * caught): three quarters full stays three quarters full, so swapping sets back and forth
 * neither heals nor hurts.
 */
export function healthAtNewMax(health, oldMax, newMax) {
    if (!(oldMax > 0)) return newMax;

    return Math.min(newMax, health / oldMax * newMax);
}
