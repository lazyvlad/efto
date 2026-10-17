// How the hunter's melee swing moves, on its own clock: no drawing, no game state, so it can
// be tested. From the art agent's motion study (art-workbench/hunter-melee/motion-core.js and
// body-pilot/pose.js); the times are its, the cooldowns the game's (gameConfig.melee).
//
// The states, in order: ranged (the weapon on his back, as ever) -> draw (he takes it in
// hand) -> guard (held ready) -> attack (wind-up, the cut, recovery; it lands once, at
// "impact") -> guard ... and, with nothing near for a moment, sheathe -> ranged.

export const SWING = {
    one: { windup: 100, active: 80, recovery: 180, impact: 140, total: 360 },
    two: { windup: 150, active: 100, recovery: 230, impact: 200, total: 480 },
};
export const DRAW_MS = 180;
export const SHEATHE_MS = 200;
export const CLEAR_MS = 240;        // Nothing in reach this long, and he puts it away

const clamp = (x, low, high) => Math.max(low, Math.min(high, x));
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
const mix = (a, b, t) => a + (b - a) * t;

// Where his weapon hand is and which way the weapon points (degrees clockwise from blade up),
// in picture pixels: ready, wound up, after the cut, and taken off his back
const READY = { x: 445, y: 365, angle: 72 };
const WOUND = { x: 440, y: 385, angle: 144 };
const FOLLOW = { x: 460, y: 340, angle: 20 };
const ON_BACK = { x: 520, y: 285, angle: -25 };

// A short blade (a dagger, a shortsword; "style: 'short'" in data/melee.js) is held out at his
// side and thrust up at what comes down at him, not swung across his chest as a long weapon
// is. Its places are from his weapon-hand shoulder ("anchor"), so the thrust fits either body.
const SHORT = {
    ready: { x: 60, y: 100, angle: 30 },
    wound: { x: 45, y: 118, angle: 58 },
    thrust: { x: 100, y: 38, angle: 8 },
};

function fromShoulder(place, anchor) {
    return { x: anchor[0] + place.x, y: anchor[1] + place.y, angle: place.angle };
}

/**
 * The swing at a time into it: the weapon hand's place and the weapon's angle. A cut upwards,
 * towards something coming down at him, that ends clear of his face (and the tauren's horns).
 */
export function swingPose(ms, family = 'two', style = null, anchor = null) {
    const p = SWING[family];
    const at = clamp(ms, 0, p.total);
    const short = style === 'short' && anchor;
    const [ready, wound, follow] = short
        ? [fromShoulder(SHORT.ready, anchor), fromShoulder(SHORT.wound, anchor), fromShoulder(SHORT.thrust, anchor)]
        : [READY, WOUND, FOLLOW];
    let a, b, t;
    if (at < p.windup) { a = ready; b = wound; t = smooth(at / p.windup); }
    else if (at < p.windup + p.active) { a = wound; b = follow; t = smooth((at - p.windup) / p.active); }
    else { a = follow; b = ready; t = smooth((at - p.windup - p.active) / p.recovery); }
    const pose = { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t), angle: mix(a.angle, b.angle, t) };
    // A broad weapon's head needs more room than its handle: the follow-through stops short (a
    // short blade thrusts up at his side, clear of his head)
    if (!short && pose.angle < 72) pose.angle = 65 + (pose.angle - 20) * (7 / 52);
    return pose;
}

// Taking the weapon off his back (share 0 -> 1; backwards to put it away): behind him at first.
// "resting": where it rests, for a weapon hung blade down or at his hip (data/melee.js
// meleeRest), behind him for the first half of the way
export function drawPose(share, style = null, anchor = null, resting = null) {
    const t = smooth(share);
    const ready = readyPose(style, anchor);
    const from = resting || ON_BACK;
    const angle = mix(from.angle, ready.angle, t);
    // Behind him until it has turned clear of his face (and the tauren's horns), however broad
    // (a short blade comes out to his side, at a lower angle: behind him until half way)
    const clear = style === 'short' && anchor ? share >= 0.5 : angle >= 65;
    return { x: mix(from.x, ready.x, t), y: mix(from.y, ready.y, t), angle, behind: share < 0.45 || (!resting && !clear), helping: share };
}

// An off-hand held as a guard, in his left fist, while his right swings (the art agent's
// attachment study): low across his body, pointing up and out
const OFFHAND_GUARD = { x: 335, y: 390, angle: -72 };

/**
 * His left arm holding an off-hand as a guard: where the fist is, which way the off-hand
 * points (radians), and the arm, solved as armsFor solves one.
 */
export function offhandArm(rig) {
    const arm = rig.left;
    const angle = OFFHAND_GUARD.angle * Math.PI / 180;
    const grip = [OFFHAND_GUARD.x + rig.offset[0], OFFHAND_GUARD.y + rig.offset[1]];
    const toWrist = rotate([arm.wrist[0] - arm.grip[0], arm.wrist[1] - arm.grip[1]], angle);
    const wrist = [grip[0] + toWrist[0], grip[1] + toWrist[1]];
    const solved = solveArm(arm.shoulder, wrist, length(arm.shoulder, arm.elbow), length(arm.elbow, arm.wrist), arm.bend);
    return { ...solved, grip, holds: true, angle };
}

// His ranged weapon held up to shoot (the art agent's ready studies): a bow out at his left,
// a crossbow levelled across him, a spear, harpoon, totem or knife up in his right hand
const RANGED_READY = {
    bow: { x: 315, y: 330, angle: -12 },
    crossbow: { x: 490, y: 395, angle: -8 },
    other: { x: 470, y: 320, angle: 25 },
};
// With a bow in his left fist, his right hand is at the string, this far behind the grip
const STRING_PULL = 70;

/**
 * His arms holding his ranged weapon up: where its grip is, which way it points, and each arm,
 * solved as armsFor solves them. The hand the weapon is in holds it at its grip; the other
 * steadies it at "support" if it has one, is at the string of a bow, or rests.
 * @param {object} held   data/melee.js meleeRanged entry
 * @param {number} width  How wide the weapon's picture is drawn (its height is held.height)
 */
export function rangedArms(rig, held, width) {
    const ready = RANGED_READY[held.kind] || RANGED_READY.other;
    const angle = ready.angle * Math.PI / 180;
    const main = [ready.x + rig.offset[0], ready.y + rig.offset[1]];
    const offset = support => rotate([(support[0] - held.grip[0]) * width, (support[1] - held.grip[1]) * held.height], angle);
    let other = null;
    if (held.support) {
        const d = offset(held.support);
        other = [main[0] + d[0], main[1] + d[1]];
    } else if (held.kind === 'bow') {
        // Back from the bow towards him, square to it: drawing the string
        const d = rotate([STRING_PULL, 0], angle);
        other = [main[0] + d[0], main[1] + d[1]];
    }
    const arms = {};
    for (const side of ['left', 'right']) {
        const arm = rig[side];
        const grip = side === held.hand ? main : other;
        const holds = Boolean(grip);
        const toWrist = rotate([arm.wrist[0] - arm.grip[0], arm.wrist[1] - arm.grip[1]], angle);
        const wrist = holds ? [grip[0] + toWrist[0], grip[1] + toWrist[1]] : arm.wrist.slice();
        arms[side] = { ...solveArm(arm.shoulder, wrist, length(arm.shoulder, arm.elbow), length(arm.elbow, arm.wrist), arm.bend), grip, holds, angle };
    }
    return { angle, main, arms, behind: false };
}

export function readyPose(style = null, anchor = null) {
    return style === 'short' && anchor ? fromShoulder(SHORT.ready, anchor) : { ...READY };
}

/**
 * An elbow for an arm whose hand must be at "target", without stretching either bone: an
 * unreachable target leaves the hand as near as the arm reaches.
 */
export function solveArm(shoulder, target, upper, lower, bend) {
    const dx = target[0] - shoulder[0];
    const dy = target[1] - shoulder[1];
    const wanted = Math.hypot(dx, dy);
    const distance = clamp(wanted, Math.abs(upper - lower) + 0.001, upper + lower - 0.001);
    const heading = Math.atan2(dy, dx);
    const offset = Math.acos(clamp((upper * upper + distance * distance - lower * lower) / (2 * upper * distance), -1, 1));
    return {
        elbow: [shoulder[0] + upper * Math.cos(heading + bend * offset), shoulder[1] + upper * Math.sin(heading + bend * offset)],
        end: [shoulder[0] + Math.cos(heading) * distance, shoulder[1] + Math.sin(heading) * distance],
        short: wanted - distance,
    };
}

const rotate = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const length = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * Where everything is for a pose: the weapon's grip and angle, the second grip of a two-hander,
 * and each arm's elbow and wrist. A fist sits on its grip turned with the weapon, and the arm
 * reaches for that fist's wrist, so the hand never slides along the handle.
 * @param {object} rig     The hunter's (data/melee.js)
 * @param {object} weapon  The weapon's (data/melee.js)
 * @param {object} pose    swingPose / drawPose / readyPose
 */
export function armsFor(rig, weapon, pose) {
    const angle = pose.angle * Math.PI / 180;
    const main = [pose.x + rig.offset[0], pose.y + rig.offset[1]];
    const gap = weapon.support ? (weapon.support[1] - weapon.grip[1]) * weapon.height : 0;
    const support = [main[0] - Math.sin(angle) * gap, main[1] + Math.cos(angle) * gap];
    const arms = {};

    for (const side of ['left', 'right']) {
        const arm = rig[side];
        const grip = side === 'right' ? main : support;
        const holds = side === 'right' || Boolean(weapon.support);
        const toWrist = rotate([arm.wrist[0] - arm.grip[0], arm.wrist[1] - arm.grip[1]], angle);
        let wrist = holds ? [grip[0] + toWrist[0], grip[1] + toWrist[1]] : arm.wrist.slice();
        // The helping hand joins a two-hander part way through taking it in hand
        let helping = holds;
        if (side === 'left' && pose.helping !== undefined) {
            const blend = clamp((pose.helping - 0.45) / 0.55, 0, 1);
            wrist = arm.wrist.map((value, i) => value + (wrist[i] - value) * blend);
            helping = holds && pose.helping > 0.9;
        }
        const solved = solveArm(arm.shoulder, wrist, length(arm.shoulder, arm.elbow), length(arm.elbow, arm.wrist), arm.bend);
        arms[side] = { ...solved, grip, holds: helping };
    }
    return { angle, main, support, arms, behind: Boolean(pose.behind) };
}

/**
 * The swing's own state, advanced by game time. It says when a swing lands ("contact"); what
 * that hits is for the game (systems/meleeSystem.js).
 */
export class MeleeState {
    constructor() {
        this.state = 'ranged';      // ranged, draw, guard, attack, sheathe
        this.ms = 0;                // Into the state
        this.family = 'one';
        this.cooldown = 0;          // Ms until he may swing again
        this.clearFor = 0;          // Ms with nothing in reach
        this.landed = false;
        this.swings = 0;
        this.queued = 0;            // A swing asked for while he was taking the weapon in hand
        this.cooldownTotal = 0;
    }

    // How far the next swing is from ready: 1 ready, 0 just swung
    readiness() {
        return this.cooldownTotal > 0 ? 1 - this.cooldown / this.cooldownTotal : 1;
    }

    // Something is in reach: take the weapon in hand (one-handed or two)
    engage(family, style = null) {
        if (this.state !== 'ranged') return false;
        this.family = family;
        this.style = style;
        this.set('draw');
        return true;
    }

    // Swing, if ready and not cooling down; the next no sooner than cooldownMs after this one
    attack(cooldownMs) {
        // Still taking it in hand: it swings the moment it is
        if (this.state === 'draw' && this.cooldown <= 0) {
            this.queued = cooldownMs;
            return false;
        }
        if (this.state !== 'guard' || this.cooldown > 0) return false;
        this.cooldown = cooldownMs;
        this.cooldownTotal = cooldownMs;
        this.set('attack');
        this.landed = false;
        this.swings++;
        return true;
    }

    // Straight back to the bow: the weapon changed, the game ended
    cancel() {
        this.queued = 0;
        this.set('ranged');
        this.landed = true;
    }

    set(state) {
        this.state = state;
        this.ms = 0;
    }

    /**
     * Time passes.
     * @param {number} ms           Game time
     * @param {boolean} inReach     Something to hit is in reach
     * @returns {string[]}          'contact' when a swing lands
     */
    advance(ms, inReach) {
        const events = [];
        if (!(ms > 0)) return events;
        this.cooldown = Math.max(0, this.cooldown - ms);
        this.clearFor = inReach ? 0 : this.clearFor + ms;
        this.ms += ms;

        if (this.state === 'draw' && this.ms >= DRAW_MS) {
            this.set('guard');
            if (this.queued) {
                const cooldownMs = this.queued;
                this.queued = 0;
                this.attack(cooldownMs);
            }
        }
        else if (this.state === 'sheathe' && this.ms >= SHEATHE_MS) this.set('ranged');
        else if (this.state === 'attack') {
            const swing = SWING[this.family];
            if (!this.landed && this.ms >= swing.impact) {
                this.landed = true;
                events.push('contact');
            }
            if (this.ms >= swing.total) this.set('guard');
        }
        if (this.state === 'guard' && this.clearFor >= CLEAR_MS) this.set('sheathe');
        return events;
    }

    // What he looks like now (null: as ever, his bow and all)
    // anchor: his weapon-hand shoulder, for a short blade (see SHORT)
    // resting: where the weapon rests on him, if not on his back pointing up (drawPose)
    pose(anchor = null, resting = null) {
        switch (this.state) {
            case 'draw': return drawPose(this.ms / DRAW_MS, this.style, anchor, resting);
            case 'sheathe': return drawPose(1 - this.ms / SHEATHE_MS, this.style, anchor, resting);
            case 'guard': return readyPose(this.style, anchor);
            case 'attack': return swingPose(this.ms, this.family === 'two' ? 'two' : 'one', this.style, anchor);
            default: return null;
        }
    }
}
