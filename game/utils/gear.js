// What the hunter wears: one item in each slot of the character sheet.
//
// The slots are the nineteen of the sheet (ui/characterSheet.js draws them). An item says
// where it is worn with its own word ("slot" in data/gameItems.js); WORN_IN says which of the
// sheet's slots that is. A ring fits either finger.
//
// What is worn is kept as { slotId: itemId }. Only an item the player owns can be worn, and
// only once. What wearing it all gives is added up here (gearTotals): every item gives its
// stats, and each set gives the step of its bonus that the pieces of it being worn reach.
// The numbers themselves are the sets' in config/gameConfig.js.

export const SLOTS = [
    { id: 'head', label: 'Head', column: 'left' },
    { id: 'neck', label: 'Neck', column: 'left' },
    { id: 'shoulder', label: 'Shoulders', column: 'left' },
    { id: 'back', label: 'Back', column: 'left' },
    { id: 'chest', label: 'Chest', column: 'left' },
    { id: 'shirt', label: 'Shirt', column: 'left' },
    { id: 'tabard', label: 'Tabard', column: 'left' },
    { id: 'wrist', label: 'Wrist', column: 'left' },
    { id: 'hands', label: 'Hands', column: 'right' },
    { id: 'waist', label: 'Waist', column: 'right' },
    { id: 'legs', label: 'Legs', column: 'right' },
    { id: 'feet', label: 'Feet', column: 'right' },
    { id: 'finger1', label: 'Ring 1', column: 'right' },
    { id: 'finger2', label: 'Ring 2', column: 'right' },
    { id: 'trinket1', label: 'Trinket 1', column: 'right' },
    { id: 'trinket2', label: 'Trinket 2', column: 'right' },
    { id: 'mainhand', label: 'Main Hand', column: 'bottom' },
    { id: 'offhand', label: 'Off Hand', column: 'bottom' },
    { id: 'ranged', label: 'Ranged', column: 'bottom' },
];

// An item's own word for where it is worn, and the sheet's slots it fits
const WORN_IN = {
    head: ['head'],
    neck: ['neck'],
    shoulders: ['shoulder'],
    back: ['back'],
    chest: ['chest'],
    shirt: ['shirt'],
    tabard: ['tabard'],
    bracers: ['wrist'],
    hands: ['hands'],
    belt: ['waist'],
    legs: ['legs'],
    boots: ['feet'],
    ring: ['finger1', 'finger2'],
    trinket: ['trinket1', 'trinket2'],
    mainhand: ['mainhand'],
    offhand: ['offhand'],
    ranged: ['ranged'],
};

// The slots an item can be worn in (none for something that is not worn)
export function slotsFor(item) {
    return (item && WORN_IN[item.slot]) || [];
}

// Whether the item fits the slot
export function fits(item, slotId) {
    return slotsFor(item).includes(slotId);
}

// The items the player owns that fit a slot. "owned" is a Set of item ids.
export function itemsForSlot(slotId, items, owned) {
    return items.filter(item => owned.has(item.id) && fits(item, slotId));
}

/**
 * What is worn with everything taken out that cannot be: items not owned, items in a slot
 * they do not fit, slots that do not exist, and second copies of the same item.
 * @param {Object} equipment - { slotId: itemId }
 * @param {Object[]} items - The game's items
 * @param {Set<string>} owned - Ids of the items the player owns
 * @returns {Object} A new { slotId: itemId }
 */
export function validEquipment(equipment, items, owned) {
    const byId = new Map(items.map(item => [item.id, item]));
    const worn = new Set();
    const valid = {};

    for (const slot of SLOTS) {
        const itemId = equipment ? equipment[slot.id] : null;
        const item = byId.get(itemId);

        if (item && owned.has(itemId) && fits(item, slot.id) && !worn.has(itemId)) {
            valid[slot.id] = itemId;
            worn.add(itemId);
        }
    }
    return valid;
}

/**
 * Put an item on in a slot (or take off what is there, with no item). The item leaves any
 * other slot it was in. Nothing changes if it does not fit.
 * @returns {Object} A new { slotId: itemId }
 */
export function equip(equipment, slotId, item) {
    const next = { ...equipment };

    if (!item) {
        delete next[slotId];
        return next;
    }
    if (!fits(item, slotId)) return next;

    for (const [worn, itemId] of Object.entries(next)) {
        if (itemId === item.id) delete next[worn];
    }
    next[slotId] = item.id;
    return next;
}

/**
 * Put on every piece of a set that is owned, each in its slot. Whatever was in those slots
 * comes off; the other slots are left as they are.
 * @returns {Object} A new { slotId: itemId }
 */
export function equipSet(equipment, setId, items, owned) {
    let next = { ...equipment };

    for (const item of items) {
        if (item.set !== setId || !owned.has(item.id)) continue;

        // The first of its slots that does not already hold a piece of this set
        const slotId = slotsFor(item).find(candidate => {
            const there = items.find(other => other.id === next[candidate]);
            return !there || there.set !== setId;
        });
        if (slotId) next = equip(next, slotId, item);
    }
    return next;
}

// How many pieces of each set are being worn: { setId: count }
export function setsWorn(equipment, items) {
    const byId = new Map(items.map(item => [item.id, item]));
    const counts = {};

    for (const itemId of Object.values(equipment || {})) {
        const item = byId.get(itemId);
        if (item && item.set) counts[item.set] = (counts[item.set] || 0) + 1;
    }
    return counts;
}

// The set most of what is worn belongs to (the earlier one in the settings on a tie), or null
export function mainSet(equipment, items, sets) {
    const counts = setsWorn(equipment, items);
    let best = null;

    for (const set of sets) {
        if ((counts[set.id] || 0) > (best ? counts[best.id] : 0)) best = set;
    }
    return best ? best.id : null;
}

/**
 * Everything that what is worn gives.
 *   health, armor, attackPower   from every item: a piece of a set gives its set's "perPiece",
 *                                anything else what it says itself ("stats")
 *   crit, dodge                  from items that say so, and from the sets' bonuses
 *   carrying                     from items that say so: the share taken off what is lost on
 *                                things caught with the bags full
 *   bossDamage, multishot, arcane   for each set, the highest step of its bonuses that the
 *       pieces of it being worn reach; what different sets give is added together
 * Crit, dodge and carrying are written on items in hundredths ("crit: 1" is one percentage
 * point) and come out here as shares (0.01).
 * @param {Object} equipment - { slotId: itemId }
 * @param {Object[]} items - Everything that can be worn (data/wearables.js)
 * @param {Object[]} sets - gameConfig.sets
 */
export function gearTotals(equipment, items, sets) {
    const totals = { health: 0, armor: 0, attackPower: 0, crit: 0, dodge: 0, carrying: 0, bossDamage: 0, multishot: 0, arcane: 0 };
    const byId = new Map(items.map(item => [item.id, item]));
    const counts = setsWorn(equipment, items);

    for (const itemId of Object.values(equipment || {})) {
        const stats = itemStats(byId.get(itemId), sets);

        totals.health += stats.health;
        totals.armor += stats.armor;
        totals.attackPower += stats.attackPower;
        totals.crit += stats.crit / 100;
        totals.dodge += stats.dodge / 100;
        totals.carrying += stats.carrying / 100;
    }

    for (const set of sets) {
        const reached = set.bonuses.filter(step => (counts[set.id] || 0) >= step.pieces).pop();
        if (reached) {
            for (const kind of ['crit', 'dodge', 'bossDamage', 'multishot', 'arcane']) {
                totals[kind] += reached[kind] || 0;
            }
        }
    }

    // Sums of hundredths, kept clean of the dust that adding them leaves
    for (const kind of ['crit', 'dodge', 'carrying']) {
        totals[kind] = Math.round(totals[kind] * 1000) / 1000;
    }
    return totals;
}

// What one item gives on its own: { health, armor, attackPower, crit, dodge, carrying }, the
// last three in hundredths. A piece of a set gives what its set gives for a piece.
export function itemStats(item, sets) {
    const set = item && item.set ? sets.find(candidate => candidate.id === item.set) : null;
    const given = (item && item.stats) || (set && set.perPiece) || {};

    return {
        health: given.health || 0,
        armor: given.armor || 0,
        attackPower: given.attackPower || 0,
        crit: given.crit || 0,
        dodge: given.dodge || 0,
        carrying: given.carrying || 0,
    };
}
