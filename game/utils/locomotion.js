// How the hunter steps as he moves from side to side: the art agent's lateral-step study
// (art-workbench/hunter-locomotion, DESIGN.md), for classes/CharacterAnimator.js to draw. No
// drawing and no game state here, so it can be tested.
//
// He keeps facing the player, as the game has always drawn him, and shuffles sideways: his
// weight shifts, then each boot lifts in turn, the step advanced by how far he has actually
// come (standing still, nothing ticks on), its pace capped so a dash reads as a braced move
// rather than impossibly quick feet. Every piece of his outfit moves by what it is:
//
//   body   - his legs, trousers and boots step; the soles below his ankles move whole, his
//            head never bends on its own
//   carry  - weapons and the quiver: rigid below the hips, never bent by the legs
//   cloth  - capes and tabards: swing softly with his steps, never split between his legs
//
// Above the hips all three move alike (his lean, his breath, his arms), so they stay joined.

// Two bodies: where the hips and ankles are down the picture, where the legs part across it,
// and how far a boot lifts and travels (shares of the picture). The Alliance hunter lifts his
// boots higher and quicker; the tauren steps wider and lower.
export const STRIDE = {
    alliance: { hips: 0.56, ankles: 0.89, split: 0.54, lift: 0.048, stride: 0.03 },
    horde: { hips: 0.60, ankles: 0.90, split: 0.52, lift: 0.042, stride: 0.034 },
};

const LEAN = 0.04;              // Radians at full speed, into the move
const BOB = 0.007;              // How far he dips as each boot comes down
const CADENCE = 2.25;           // Most steps a second, however fast he goes
const STEP_LENGTH = 0.55;       // A whole cycle per this many picture widths travelled

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
export const smooth = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
};

export function stepState() {
    return { phase: 0, amount: 0, direction: 0 };
}

/**
 * On by a frame.
 * @param {object} state      stepState()
 * @param {number} seconds    Time since the last frame
 * @param {number} moved      How far he moved sideways since then (canvas units; + to the right)
 * @param {number} fullSpeed  The speed that counts as flat out (canvas units a second)
 * @param {number} width      How wide his picture is drawn (canvas units)
 */
export function advanceStep(state, seconds, moved, fullSpeed, width) {
    const dt = clamp(Number.isFinite(seconds) ? seconds : 0, 0, 0.05);
    if (dt <= 0) return state;
    const distance = Number.isFinite(moved) ? moved : 0;
    const speed = clamp(distance / dt / Math.max(1, fullSpeed), -1, 1);
    const ease = 1 - Math.exp(-dt * 16);
    state.amount += (Math.abs(speed) - state.amount) * ease;
    state.direction += (speed - state.direction) * ease;
    // Only travel turns the step over, and no quicker than a brisk shuffle
    state.phase += Math.min(Math.abs(distance) / Math.max(1, width * STEP_LENGTH) * Math.PI * 2, dt * Math.PI * 2 * CADENCE);
    return state;
}

/** What a state looks like now: each boot's lift (0..1), the slide of the legs, the dip and the lean */
export function stepPose(state, reduced = false) {
    if (reduced) return { amount: 0, direction: 0, left: 0, right: 0, slide: 0, bob: 0, lean: 0 };
    const step = Math.sin(state.phase);
    return {
        amount: state.amount,
        direction: state.direction,
        left: Math.max(0, step),
        right: Math.max(0, -step),
        slide: Math.cos(state.phase),
        bob: -Math.abs(step) * state.amount * BOB,
        lean: state.direction * LEAN,
    };
}

/**
 * Where the point (u, v) of a piece is moved by his legs (before the lean, which is the whole
 * figure's): [dx, dy], shares of the picture.
 * @param {string} owner  'body', 'carry' or 'cloth' (see the top of this file)
 */
export function legShift(u, v, pose, stride, owner = 'body') {
    if (owner === 'carry' || !pose.amount) return [0, 0];
    const leg = smooth(stride.hips, stride.ankles, v);
    if (!leg) return [0, 0];
    if (owner === 'cloth') {
        // Lifted a little by both steps at once, and trailing behind the move
        return [-leg * pose.direction * stride.stride * 0.6, -leg * (pose.left + pose.right) * 0.5 * pose.amount * stride.lift * 0.5];
    }
    const left = 1 - smooth(stride.split - 0.045, stride.split + 0.045, u);
    const right = 1 - left;
    return [
        leg * (left - right) * pose.slide * pose.direction * stride.stride,
        -leg * (left * pose.left + right * pose.right) * pose.amount * stride.lift,
    ];
}

/**
 * What a layer is moved as, by the slot it is worn in and the order it is drawn in
 * (data/hunterArt.js): weapons and the quiver are carried, capes and tabards are cloth.
 */
export function ownerOf(slot) {
    if (['mainhand', 'offhand', 'ranged', 'quiver'].includes(slot)) return 'carry';
    if (slot === 'back' || slot === 'tabard') return 'cloth';
    return 'body';
}
