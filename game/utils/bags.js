// The hunter's bags: where everything caught in a game goes.
//
// Bags have slots. A slot holds a stack of one kind of thing, up to so many; a full stack
// starts another in the next free slot. Everyone has a backpack, and up to four bags can be
// added to it, bought with coins. The numbers are under "bags" in config/gameConfig.js.
//
// While there is room, what is caught is carried at its full worth. Once every slot is taken
// and no stack of that kind has room, there is nowhere to put it: it is sold on the spot for
// less (the "fullPenalty"), and a material sold that way is not kept.
//
// What is in the bags is kept as { itemId: count }: the stacks follow from the counts.

// How many slots the bags have: the backpack and the bags added to it
export function bagCapacity(rules, bags = []) {
    return rules.backpack + bags.slice(0, rules.bagSlots).reduce((total, size) => total + size, 0);
}

// How many slots these things take
export function slotsUsed(contents, stack) {
    return Object.values(contents).reduce((slots, count) => slots + Math.ceil(count / stack), 0);
}

// Whether one more of this kind fits: on a stack of it that has room, or in a free slot
export function fitsInBags(contents, itemId, capacity, stack) {
    const count = contents[itemId] || 0;

    return (count > 0 && count % stack !== 0) || slotsUsed(contents, stack) < capacity;
}

/**
 * Put something caught in the bags.
 * @param {Object} bags - { contents: { itemId: count }, overflow: { itemId: count } }: changed
 * @returns {boolean} true if it is carried, false if there was no room and it was sold short
 */
export function addToBags(bags, itemId, capacity, stack) {
    if (fitsInBags(bags.contents, itemId, capacity, stack)) {
        bags.contents[itemId] = (bags.contents[itemId] || 0) + 1;
        return true;
    }

    bags.overflow[itemId] = (bags.overflow[itemId] || 0) + 1;
    return false;
}

// What something is sold for when there was no room for it, against its full worth
export function soldShort(value, rules, carrying = 0) {
    const penalty = Math.max(0, rules.fullPenalty - carrying);

    return Math.round(value * (1 - penalty));
}

// The stacks in the bags, for showing them: [{ itemId, count }], full stacks first
export function stacksOf(contents, stack) {
    const stacks = [];

    for (const [itemId, count] of Object.entries(contents)) {
        for (let left = count; left > 0; left -= stack) {
            stacks.push({ itemId, count: Math.min(stack, left) });
        }
    }
    return stacks;
}
