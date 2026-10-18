// The hunter's bags: where everything caught in a game goes.
//
// Bags have slots. A slot holds a stack of one kind of thing, up to so many; a full stack
// starts another in the next free slot. Everyone has a backpack, and up to four bags can be
// added to it, bought with coins. The numbers are under "bags" in config/gameConfig.js.
//
// While there is room, what is caught is carried at its full worth. Once every slot is taken
// and no stack of that kind has room, there is nowhere to put it: it is sold on the spot for
// less (the "fullPenalty"), and a material sold that way is not kept. A material caught then
// first pushes out a slot of junk, which is as good as sold already (makeRoomFor).
//
// What is in the bags is kept as { itemId: count }: the stacks follow from the counts. A slot
// holds "stack" of one kind, except for the kinds with a stack of their own (arrows: hundreds to
// a slot; setItemStacks, from bags.itemStacks in config/gameConfig.js).

let itemStacks = {};

// The kinds that stack differently from the rest: { itemId: how many to a slot }
export function setItemStacks(stacks) {
    itemStacks = stacks || {};
}

// How many of a kind a slot holds
export function stackOf(itemId, stack) {
    return itemStacks[itemId] || stack;
}

// How many slots the bags have: the backpack and the bags added to it
export function bagCapacity(rules, bags = []) {
    return rules.backpack + bags.slice(0, rules.bagSlots).reduce((total, size) => total + size, 0);
}

// How many slots these things take
export function slotsUsed(contents, stack) {
    return Object.entries(contents).reduce((slots, [itemId, count]) => slots + Math.ceil(count / stackOf(itemId, stack)), 0);
}

// Whether one more of this kind fits: on a stack of it that has room, or in a free slot
export function fitsInBags(contents, itemId, capacity, stack) {
    const count = contents[itemId] || 0;

    return (count > 0 && count % stackOf(itemId, stack) !== 0) || slotsUsed(contents, stack) < capacity;
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

/**
 * Make a slot for something kept (a material) when the bags are full: one slot's worth of junk
 * goes, the kind with the fewest in its last stack first, so the least is given up. Junk is
 * worth its coins as soon as it is caught, so nothing is lost by it.
 * @param {Object} contents - { itemId: count }: changed
 * @param {Function} isJunk - (itemId) => whether it is only worth selling
 * @returns {{itemId: string, count: number}|null} What went, or null (it fits, or no junk)
 */
export function makeRoomFor(contents, itemId, capacity, stack, isJunk) {
    if (fitsInBags(contents, itemId, capacity, stack)) return null;
    let best = null;
    for (const [other, count] of Object.entries(contents)) {
        if (count <= 0 || other === itemId || !isJunk(other)) continue;
        const size = stackOf(other, stack);
        // What is in its last slot: taking that frees the slot
        const last = count % size || size;
        if (!best || last < best.count) best = { itemId: other, count: last };
    }
    if (!best) return null;
    contents[best.itemId] -= best.count;
    if (contents[best.itemId] <= 0) delete contents[best.itemId];
    return best;
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
        const size = stackOf(itemId, stack);
        for (let left = count; left > 0; left -= size) {
            stacks.push({ itemId, count: Math.min(size, left) });
        }
    }
    return stacks;
}

// How many more of a kind fit: on its last stack, and in the free slots
export function roomFor(contents, itemId, capacity, stack) {
    const size = stackOf(itemId, stack);
    const count = contents[itemId] || 0;
    const onStack = count % size ? size - (count % size) : 0;
    return onStack + Math.max(0, capacity - slotsUsed(contents, stack)) * size;
}

// Put up to so many of a kind in the bags, as far as there is room: how many went in
export function stowInBags(contents, itemId, count, capacity, stack) {
    const put = Math.max(0, Math.min(count, roomFor(contents, itemId, capacity, stack)));
    if (put > 0) contents[itemId] = (contents[itemId] || 0) + put;
    return put;
}
