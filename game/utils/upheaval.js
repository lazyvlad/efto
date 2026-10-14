// Upheaval: a boss turns gravity over, and for a few seconds its attack comes at the hunter
// from every side of the field, not only from above. Things rise out of the ground in a row
// of columns, and fly in from the left and the right edges along the band he moves in.
//
// It comes in waves, each marked on the edge it will come from before it does, and every wave
// leaves a way through: a column with nothing rising in it, or the other half of his band
// (high or low) from a line flying in from the side. Both sides at once fly in along the
// same half, so there is still room.
//
// This file only plans the waves; systems/bossSystem.js marks them, sends them and draws them.

// The order of the waves: the ground, one side, the other, the ground, both sides at once
const ORDER = ['floor', 'side', 'side', 'floor', 'both'];

/**
 * Plan an Upheaval.
 * @param {object} field   { width, height, floorTop }: the field, and where the band the
 *                         hunter moves in begins (it runs to the bottom of the field)
 * @param {number} size    How wide one of the things sent is
 * @param {object} rules   { waves, rise, cross, train } (the "upheaval" boss settings): how
 *                         many waves, how fast things rise and fly across (shares of the
 *                         field's height or width a step), and how many fly in one line
 * @param {Function} random  0..1, for tests
 * @returns {Array<{ kind, entries: Array<{ x, y, vx, vy, from }>, gap?: { left, right },
 *          lane?: 'high' | 'low' }>}  Each wave, with where each thing starts (its middle)
 *          and how it moves a step; "from" is the edge it comes in at
 */
export function planUpheaval(field, size, rules, random = Math.random) {
    const { width, height, floorTop } = field;
    const band = height - floorTop;
    const rise = height * rules.rise;
    const cross = width * rules.cross;
    let lastSide = random() < 0.5 ? 'left' : 'right';
    let lastLane = random() < 0.5 ? 'high' : 'low';

    const laneY = lane => floorTop + band * (lane === 'high' ? 0.25 : 0.75);
    const other = lane => lane === 'high' ? 'low' : 'high';

    // A line of things flying in from one edge along one half of the band, one after another
    const line = (from, lane) => Array.from({ length: rules.train }, (_, index) => {
        const behind = size / 2 + index * size * 2.2;
        return {
            x: from === 'left' ? -behind : width + behind,
            y: laneY(lane),
            vx: from === 'left' ? cross : -cross,
            vy: 0,
            from,
        };
    });

    return ORDER.slice(0, rules.waves).map(kind => {
        if (kind === 'floor') {
            // Columns across the field, one left empty to stand in
            const slots = Math.max(3, Math.min(8, Math.floor(width / (size * 1.7))));
            const slotWidth = width / slots;
            const gap = Math.floor(random() * slots);
            const entries = [];
            for (let slot = 0; slot < slots; slot++) {
                if (slot === gap) continue;
                entries.push({ x: slotWidth * (slot + 0.5), y: height + size / 2, vx: 0, vy: -rise, from: 'bottom' });
            }
            return { kind, entries, gap: { left: slotWidth * gap, right: slotWidth * (gap + 1) } };
        }

        // From the side not used last time, along the half of the band not used last time
        const lane = other(lastLane);
        lastLane = lane;
        if (kind === 'both') {
            return { kind, lane, entries: [...line('left', lane), ...line('right', lane)] };
        }
        const from = lastSide === 'left' ? 'right' : 'left';
        lastSide = from;
        return { kind, lane, entries: line(from, lane) };
    });
}
