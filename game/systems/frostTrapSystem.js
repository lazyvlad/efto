// Frost Traps (the art agent's design, art-workbench/frost-trap): caught as a power-up, three traps
// are set across the field, one in each third of it, where the creatures come down at the
// hunter. A trap waits, armed, until a creature's body touches its rune circle; then it opens
// into a patch of frost for a few seconds, and every creature in it moves at half speed (its
// stalking, its closing in and its pounce; not its warning or its bite's timing) or, as set
// now, is held where it is: for as long as the patch lasts, and a moment longer. Nothing else triggers one: not the hunter, a boss or what falls.
//
// Untriggered traps stay for the rest of the game, through the zones and the boss fights. There
// are never more than so many on the field: a pickup that cannot set all three is not used up.
// Positions are kept as shares of the field, so they stay put when the window is resized.

import { gameConfig } from '../config/gameConfig.js';
import { readyImage } from '../utils/readyImage.js';

const STEP_MS = 1000 / 60;
const ATLAS = 'assets/effects/frost-trap.webp';
const CELL = 256;
const COLUMNS = 4;
// The atlas's frames: the device arming, waiting, bursting; the frost patch, and it fading
const FRAMES = {
    arming: { frames: [0, 1, 2], ms: [84, 83, 83] },
    armed: { frames: [3, 4, 5, 6], ms: [300, 300, 300, 300], loop: true },
    burst: { frames: [7, 8, 9, 10], ms: [40, 40, 40, 40] },
    field: { frames: [11, 12, 13, 14], ms: [200, 200, 200, 200], loop: true },
    fade: { frames: [15, 16, 17], ms: [80, 80, 80] },
};
// The patch's painted frost fills 224 of its 256 pixels
const FIELD_CONTENT = 224 / 256;

let traps = [];
let atlas = null;

function rules() {
    return gameConfig.frostTrap;
}

function frameOf(state, ms) {
    const { frames, ms: durations, loop } = FRAMES[state];
    const total = durations.reduce((a, b) => a + b, 0);
    let at = loop ? ms % total : Math.min(ms, total - 1);
    for (let i = 0; i < frames.length; i++) {
        if (at < durations[i]) return frames[i];
        at -= durations[i];
    }
    return frames[frames.length - 1];
}

// Whether a rectangle { x, y, width, height } touches a circle
function touches(box, cx, cy, radius) {
    const nearX = Math.max(box.x, Math.min(cx, box.x + box.width));
    const nearY = Math.max(box.y, Math.min(cy, box.y + box.height));
    return (nearX - cx) ** 2 + (nearY - cy) ** 2 <= radius * radius;
}

/** A new game: no traps. Their picture is made ready now, before the first is set. */
export function resetFrostTraps() {
    traps = [];
    if (!atlas) atlas = readyImage(ATLAS);
}

/** How many are on the field: waiting, or frosting. */
export function frostTrapsOut() {
    return traps.length;
}

/**
 * Set three traps, one in each third of the field, in the band where the creatures come down
 * at him. All three or none: false (and nothing set) if there is no room for three.
 * @param {object} field  { width, height, player: his body { x, y, width, height } }
 */
export function deployFrostTraps(field) {
    const r = rules();
    if (traps.length + r.perPickup > r.most) return false;

    const hunter = field.player.height;
    const radius = r.trigger * hunter;
    const top = field.height * 0.1;
    const bottom = Math.max(top + radius, field.player.y - radius);
    const placed = [];
    const lane = field.width / r.perPickup;

    for (let i = 0; i < r.perPickup; i++) {
        let spot = null;
        for (let tries = 0; tries < 12 && !spot; tries++) {
            const x = lane * i + radius + Math.random() * Math.max(0, lane - radius * 2);
            // Between 40% and 70% of the way down from where they come in to his head
            const y = top + (bottom - top) * (0.4 + Math.random() * 0.3);
            const clear = [...traps.map(trap => ({ x: trap.fx * field.width, y: trap.fy * field.height })), ...placed]
                .every(other => Math.hypot(other.x - x, other.y - y) > radius * 1.2);
            if (clear) spot = { x, y };
        }
        if (!spot) return false;
        placed.push(spot);
    }

    for (const spot of placed) {
        traps.push({ fx: spot.x / field.width, fy: spot.y / field.height, state: 'arming', ms: 0, fieldMs: 0 });
    }
    return true;
}

/**
 * One step: arming, waiting for a creature, the frost patch and its fading. A creature in a
 * patch is chilled (creature.chill: steps of chill left), and moves at half speed while it is.
 * Before the creatures move, so a pounce crossing a trap is slowed in the step it enters it.
 * @param {number} delta      Steps' worth of game time
 * @param {Array}  creatures  The creatures about (systems/creatureSystem.js)
 * @param {object} field      { width, height, player }
 */
export function updateFrostTraps(delta, creatures, field) {
    const r = rules();
    const ms = delta * STEP_MS;
    const hunter = field.player.height;
    const living = creatures.filter(creature => creature.alive && creature.state !== 'enter' && creature.state !== 'leaving');

    for (const creature of creatures) {
        if (creature.chill > 0) creature.chill = Math.max(0, creature.chill - delta);
    }

    for (const trap of traps) {
        trap.ms += ms;
        const x = trap.fx * field.width;
        const y = trap.fy * field.height;

        if (trap.state === 'arming' && trap.ms >= r.armingMs) {
            trap.state = 'armed';
            trap.ms = 0;
        }
        if (trap.state === 'armed') {
            // A creature already chilled does not spend another trap
            const by = living.find(creature => !(creature.chill > 0) && touches(creature.core(), x, y, r.trigger * hunter));
            if (by) {
                trap.state = 'field';
                trap.ms = 0;
                trap.fieldMs = 0;
            }
        }
        if (trap.state === 'field') {
            trap.fieldMs += ms;
            // Caught in the frost, it stays chilled while the patch lasts (and a moment after),
            // wherever it is pushed
            const left = Math.max(0, r.fieldMs - trap.fieldMs) / STEP_MS + r.lingerSteps;
            for (const creature of living) {
                if (touches(creature.core(), x, y, r.field * hunter)) creature.chill = Math.max(creature.chill || 0, left);
            }
            if (trap.fieldMs >= r.fieldMs) {
                trap.state = 'fade';
                trap.ms = 0;
            }
        }
        if (trap.state === 'fade' && trap.ms >= 240) trap.state = 'gone';
    }
    traps = traps.filter(trap => trap.state !== 'gone');
}

function drawCell(ctx, frame, x, y, size, alpha = 1) {
    if (!atlas || !atlas.source) return;
    const sx = (frame % COLUMNS) * CELL;
    const sy = Math.floor(frame / COLUMNS) * CELL;
    ctx.globalAlpha = alpha;
    ctx.drawImage(atlas.source, sx, sy, CELL, CELL, x - size / 2, y - size / 2, size, size);
}

/**
 * Draw them, under the creatures, the drops and the hunter: the frost patches, their rings,
 * and the small devices.
 * @param {object} field  { width, height, player }
 */
export function drawFrostTraps(ctx, field) {
    if (traps.length === 0) return;

    const r = rules();
    const hunter = field.player.height;
    const device = r.device * hunter;
    const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    ctx.save();
    for (const trap of traps) {
        const x = trap.fx * field.width;
        const y = trap.fy * field.height;

        if (trap.state === 'field' || trap.state === 'fade') {
            const radius = r.field * hunter;
            // The frost, clipped to its circle, faint enough to see through
            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.clip();
            const frame = trap.state === 'fade' ? frameOf('fade', trap.ms) : (still ? 11 : frameOf('field', trap.fieldMs));
            drawCell(ctx, frame, x, y, (2 * radius) / FIELD_CONTENT, trap.state === 'fade' ? 0.18 : 0.25);
            ctx.restore();
            ctx.globalAlpha = trap.state === 'fade' ? 0.25 : 0.55;
            ctx.strokeStyle = '#bfe8ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
            // The device bursting open as the frost spreads
            if (trap.state === 'field' && trap.fieldMs < 160) drawCell(ctx, frameOf('burst', trap.fieldMs), x, y, device);
            continue;
        }

        // Waiting: its rune circle, the size that sets it off, and the device
        ctx.globalAlpha = trap.state === 'arming' ? 0.25 : 0.4;
        ctx.strokeStyle = '#d6f1ff';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.arc(x, y, r.trigger * hunter, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        drawCell(ctx, trap.state === 'arming' ? frameOf('arming', trap.ms) : (still ? 3 : frameOf('armed', trap.ms)), x, y, device);
    }
    ctx.restore();
}
