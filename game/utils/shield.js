// Power Word: Shield. It lasts its time or until its charges are spent, whichever comes first:
// each thing it blocks uses one, and a creature's bite more (gameConfig.creatures.shieldCost).

/**
 * The shield goes up (again): its full time and all of its charges.
 * @param {object} gameState
 * @param {number} steps    How long it lasts (60 = 1 second)
 * @param {number} charges  How many hits it can take
 */
export function raiseShield(gameState, steps, charges) {
    gameState.shieldActive = true;
    gameState.shieldTimer = steps;
    gameState.shieldCharges = charges;
    gameState.shieldMaxCharges = charges;
}

/**
 * Something would hurt the hunter: whether the shield takes it. If it does, it uses the
 * charges it costs, and the shield breaks when they are gone.
 * @param {object} gameState
 * @param {number} [cost=1]  Charges the hit uses
 * @returns {boolean} Blocked
 */
export function shieldBlocks(gameState, cost = 1) {
    if (!gameState.shieldActive) return false;

    gameState.shieldCharges = Math.max(0, (gameState.shieldCharges ?? 1) - cost);
    if (gameState.shieldCharges <= 0) dropShield(gameState);
    return true;
}

export function dropShield(gameState) {
    const wasUp = gameState.shieldActive;
    gameState.shieldActive = false;
    gameState.shieldTimer = 0;
    gameState.shieldCharges = 0;
    // Gone from the buffs as soon as it breaks, not when its time would have run out
    if (wasUp && typeof window !== 'undefined' && typeof window.removeBuff === 'function') window.removeBuff('shield');
}
