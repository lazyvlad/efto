// Upheaval: a boss turns gravity over, and for a few seconds its attack comes at the hunter
// from every side of the field, not only from above. Things rise out of the ground in a row
// of columns, and are hurled in from the left and the right edges high up, each stopping over
// a column of the ground and dropping straight down through it.
//
// He moves along the ground and hardly up or down (his figure fills most of the band he moves
// in), so every wave is dodged by where he stands: each is marked on the ground first, column
// by column, and every wave leaves one column clear, wide enough to stand in, that nothing
// comes through.
//
// This file only plans the waves; systems/bossSystem.js marks them, sends them and draws them.

// The order of the waves: the ground, one side, the other, the ground, both sides at once
const ORDER = ['floor', 'side', 'side', 'floor', 'both'];

// Something hurled from a side: how fast it flies in (a share of the field's width a step), and
// how many steps it takes to drop from where it stops to the middle of the hunter's band
const FLY_IN = 1 / 48;
const DROP_STEPS = 30;

/**
 * Plan an Upheaval.
 * @param {object} field   { width, height, floorTop }: the field, and where the band the
 *                         hunter moves in begins (it runs to the bottom of the field)
 * @param {number} size    How wide one of the things sent is
 * @param {object} rules   { waves, warn, rise, train } (the "upheaval" boss settings): how
 *                         many waves, how many steps each is marked before it is sent, how
 *                         fast things rise (a share of the field's height a step), and how
 *                         many are hurled in from one side
 * @param {object} [hunter]  { x: the middle of where he stands now, reach: how far he can
 *                         run while a wave is marked }: each clear column is within his
 *                         reach of the one before (the first, of where he stands), and never
 *                         the same twice running. Without it, anywhere.
 * @param {Function} random  0..1, for tests
 * @returns {Array<{ kind, slotWidth, gap: { left, right }, entries: Array<{ x, y, vx, vy,
 *          gravity, stopX, from, lane }> }>}  Each wave: where each thing starts (its middle)
 *          and how it moves a step; one hurled from a side flies in at vx until it is over
 *          stopX, then stops there and falls (gravity added to vy every step). "from" is the
 *          edge it comes from, "lane" the middle of the column of ground it comes through.
 *          And when, in steps from the start: markAt (its columns are marked), sendAt (it is
 *          sent) and clearAt (all of it has gone through the hunter's band). One wave is
 *          marked only once the one before has cleared, so two never come through at once,
 *          each with its own clear column.
 */
export function planUpheaval(field, size, rules, hunter = null, random = Math.random) {
    const { width, height, floorTop } = field;
    const rise = height * rules.rise;
    // The ground in columns, as many as fit with room around each; one is left clear
    const slots = Math.max(3, Math.min(8, Math.floor(width / (size * 1.7))));
    const slotWidth = width / slots;
    let lastSide = random() < 0.5 ? 'left' : 'right';
    const middleOf = slot => slotWidth * (slot + 0.5);
    // Where he will be: where he stands, then each clear column in turn
    let from = hunter ? Math.max(0, Math.min(width, hunter.x)) : null;
    let lastGap = from === null ? -1 : Math.min(slots - 1, Math.floor(from / slotWidth));

    // The clear column: one he can reach in time, and not the one he is in (he has to move)
    const pickGap = () => {
        let choices = Array.from({ length: slots }, (_, slot) => slot).filter(slot => slot !== lastGap);
        if (from !== null) {
            const reachable = choices.filter(slot => Math.abs(middleOf(slot) - from) <= hunter.reach);
            // Too slow for any: the nearest
            choices = reachable.length ? reachable : [choices.reduce((best, slot) => Math.abs(middleOf(slot) - from) < Math.abs(middleOf(best) - from) ? slot : best)];
        }
        const gap = choices[Math.floor(random() * choices.length)];
        lastGap = gap;
        if (from !== null) from = middleOf(gap);
        return gap;
    };
    const columnsBut = gap => Array.from({ length: slots }, (_, slot) => slot).filter(slot => slot !== gap);

    // Hurled from a side's edge, high up: it flies in over the field, stops over its column,
    // and drops straight down through the ground he moves on (and on, off the field). Those
    // that start further out come in a little after the others.
    const lob = (from, slot, behind) => {
        const startX = (from === 'left' ? -size / 2 : width + size / 2) + (from === 'left' ? -behind : behind);
        const startY = height * 0.3 + random() * height * 0.08;
        const laneX = slotWidth * (slot + 0.5);
        const drop = floorTop + (height - floorTop) / 2 - startY;
        return {
            x: startX, y: startY, vx: (from === 'left' ? 1 : -1) * width * FLY_IN, vy: 0,
            gravity: 2 * drop / (DROP_STEPS * DROP_STEPS), stopX: laneX, from, lane: laneX,
        };
    };

    return ORDER.slice(0, rules.waves).map(kind => {
        const gap = pickGap();
        const wave = { kind, slotWidth, gap: { left: slotWidth * gap, right: slotWidth * (gap + 1) } };

        if (kind === 'floor') {
            // A column rising in every slot but the clear one
            wave.entries = columnsBut(gap).map(slot => ({
                x: slotWidth * (slot + 0.5), y: height + size / 2, vx: 0, vy: -rise, gravity: 0, stopX: null, from: 'bottom', lane: slotWidth * (slot + 0.5),
            }));
            return wave;
        }

        // From the sides: into some of the columns from one side, or into all but the clear
        // one from both. Those further across take a little longer, so they arrive in a run.
        const open = columnsBut(gap);
        if (kind === 'both') {
            wave.entries = open.map((slot, index) => lob(slot < slots / 2 ? 'left' : 'right', slot, index % 2 * size));
            return wave;
        }
        const from = lastSide === 'left' ? 'right' : 'left';
        lastSide = from;
        // The columns nearest the edge it comes from, as many as one throw holds
        const nearest = [...open].sort((a, b) => from === 'left' ? a - b : b - a).slice(0, rules.train);
        wave.entries = nearest.map((slot, index) => lob(from, slot, index * size * 0.8));
        return wave;
    }).reduce((timed, wave) => {
        // Marked once the wave before has gone through, sent when the mark has been up long enough
        const markAt = timed.length ? timed[timed.length - 1].clearAt : 0;
        const sendAt = markAt + rules.warn;
        const through = Math.max(...wave.entries.map(entry => stepsThrough(entry, field, size)));
        timed.push({ ...wave, markAt, sendAt, clearAt: sendAt + through });
        return timed;
    }, []);
}

// Steps until a thing sent has gone all the way through the hunter's band
function stepsThrough(entry, field, size) {
    const flight = { ...entry };
    for (let step = 1; step < 2000; step++) {
        flyStep(flight, 1);
        const past = flight.vy < 0 ? flight.y + size / 2 < field.floorTop : flight.y - size / 2 > field.height;
        if ((flight.vy !== 0 || flight.gravity === 0) && past && flight.vx === 0) return step;
    }
    return 2000;
}

/**
 * Where a thing sent in an Upheaval is, step by step, while it is within the hunter's band:
 * the span of the ground it covers there. For tests and for marking.
 * @returns {{ left: number, right: number } | null}  null if it never comes through the band
 */
export function spanInBand(entry, field, size, steps = 600) {
    const flight = { ...entry };
    let left = Infinity;
    let right = -Infinity;
    for (let step = 0; step < steps; step++) {
        flyStep(flight, 1);
        const { x, y } = flight;
        // Its box overlaps the band
        if (y + size / 2 >= field.floorTop && y - size / 2 <= field.height) {
            left = Math.min(left, x - size / 2);
            right = Math.max(right, x + size / 2);
        }
        if ((entry.vy < 0 && entry.gravity === 0 && y < -size) || y > field.height + size) break;
    }
    return left === Infinity ? null : { left, right };
}

/**
 * One step of the way of a thing sent in an Upheaval ({ x, y, vx, vy, gravity, stopX }, its
 * middle; changed in place). Flying in from a side it keeps on until it is over stopX; there
 * it stops and falls. Rising from the ground it goes straight up. BossProjectile moves the
 * same way.
 * @param {number} delta  Steps (a fraction of one when the game runs slow or fast)
 */
export function flyStep(flight, delta) {
    if (flight.stopX !== null && flight.stopX !== undefined && flight.vx !== 0) {
        flight.x += flight.vx * delta;
        // Over its column: it stops there, and from now on falls
        if ((flight.vx > 0 && flight.x >= flight.stopX) || (flight.vx < 0 && flight.x <= flight.stopX)) {
            flight.x = flight.stopX;
            flight.vx = 0;
        }
        return;
    }
    flight.vy += flight.gravity * delta;
    flight.y += flight.vy * delta;
}
