// The quiver: how many arrows the hunter can carry.
//
// A quiver has slots, each holding so many arrows; a game starts with some of them filled.
// Arrows caught beyond what the quiver holds are lost. A logged-in player who has found the
// large quiver (a drop from the bosses, kept on the account) has more slots. The numbers are
// under "quiver" in config/gameConfig.js.

// The most arrows the quiver holds
export function quiverCapacity(rules, large = false) {
    return (rules.slots + (large ? rules.bonusSlots : 0)) * rules.slotSize;
}

// The arrows a game starts with
export function startingArrows(rules) {
    return rules.startFilled * rules.slotSize;
}

// Put arrows in the quiver: { arrows: what it holds now, added, lost: what did not fit }
export function addArrows(current, amount, capacity) {
    const arrows = Math.min(capacity, Math.max(0, current) + amount);
    const added = Math.max(0, arrows - current);
    return { arrows, added, lost: amount - added };
}
