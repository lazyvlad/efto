// The hunter's sets: armour collected piece by piece over many games.
//
// A piece is an item of the "set_piece" rarity that names its set ("set") and where it is worn
// ("slot"). The sets themselves, the level each starts to drop at and what wearing one gives
// are under "sets" in config/gameConfig.js.

// The order the pieces of a set are shown in
const SLOT_ORDER = ['head', 'shoulders', 'chest', 'bracers', 'hands', 'belt', 'legs', 'boots', 'ring'];

export function setById(sets, id) {
    return sets.find(set => set.id === id) || null;
}

// The pieces of a set among the game's items, in the order they are worn
export function piecesOf(items, setId) {
    return items
        .filter(item => item.type === 'set_piece' && item.set === setId)
        .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
}

// How many of these pieces are among the ids owned (a Set of item ids)
export function ownedCount(pieces, owned) {
    return pieces.filter(piece => owned.has(piece.id)).length;
}

// What wearing a set gives with this many pieces owned: the highest step reached
export function setBonus(set, pieces) {
    const bonus = { crit: 0, dodge: 0, bossDamage: 0 };
    if (!set) return bonus;

    for (const step of set.bonuses) {
        if (pieces >= step.pieces) {
            bonus.crit = step.crit || 0;
            bonus.dodge = step.dodge || 0;
            bonus.bossDamage = step.bossDamage || 0;
        }
    }
    return bonus;
}

// The pieces needed for the next step of the bonus, or null when the last is reached
export function nextStep(set, pieces) {
    const next = set ? set.bonuses.find(step => step.pieces > pieces) : null;
    return next ? next.pieces : null;
}

// A bonus in words: "+4% crit", or "" for none
export function bonusText(bonus) {
    const parts = [];
    if (bonus.crit > 0) parts.push(`+${Math.round(bonus.crit * 100)}% crit`);
    if (bonus.dodge > 0) parts.push(`+${Math.round(bonus.dodge * 100)}% dodge`);
    if (bonus.bossDamage > 0) parts.push(`+${Math.round(bonus.bossDamage * 100)}% damage to bosses`);
    return parts.join(', ');
}

// Whether a piece drops at this level (levels as the player sees them): its set has to have begun
export function pieceUnlocked(item, level, sets) {
    const set = setById(sets, item.set);
    return Boolean(set) && level >= set.fromLevel;
}
