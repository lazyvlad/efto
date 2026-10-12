// Combat rules borrowed from World of Warcraft Classic.

// In Classic every level is worth 5 points of Defense skill to the defender and 5 points of
// weapon skill to the attacker, and each point between the two moves the chance to dodge by
// 0.04%. So an attacker three levels up (a boss) takes 0.6% off the defender's dodge chance,
// and one three levels down adds 0.6%.
const SKILL_PER_LEVEL = 5;
const DODGE_PER_SKILL_POINT = 0.0004;

/**
 * The chance to dodge an attack.
 * @param {number} dodgeRating     The defender's own chance to dodge, from gear and effects (0.1 = 10%)
 * @param {number} defenderLevel   Levels as the player sees them
 * @param {number} attackerLevel   The same level as the defender unless the attack says otherwise
 * @param {number} cap             The most the chance can be
 */
export function dodgeChance(dodgeRating, defenderLevel, attackerLevel = defenderLevel, cap = 1) {
    const skillGap = (defenderLevel - attackerLevel) * SKILL_PER_LEVEL;

    return Math.max(0, Math.min(cap, dodgeRating + skillGap * DODGE_PER_SKILL_POINT));
}
