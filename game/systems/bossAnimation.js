// Which of a boss's painted poses to draw (data/bossAnimations.js), from what its fight is doing
// (systems/bossSystem.js). It only reads the fight: no pose starts an attack, times one or
// hurts anyone. A boss without painted poses, or whose sheets are not loaded yet, is drawn as
// its one picture.
//
// While it moves it idles; winding up, it goes through its wind-up poses in step with the
// wind-up's real length (shorter for later bosses and once enraged); acting (a charge, an
// ambush), it loops the act; just after an attack, it holds the release and recovers; a hit
// makes it flinch; dying, it collapses over the fight's dying steps.

import { bossAnimations, BOSS_CELL } from '../data/bossAnimations.js';

const STEP_MS = 1000 / 60;
const ACT_STEPS = 6;            // Each drawing of an act held this long: about ten a second
const RELEASE_STEPS = 10;       // The release of an attack done in the instant, held after it
const RECOVERY_STEPS = 10;      // Then the recovery, before it idles again
const FLINCH_STEPS = 6;         // A hit's flinch, at most once in FLINCH_EVERY: under steady
const BRIEF_STEPS = 30;         // A guard or enrage pose, as the shield goes up or it enrages
const STORM_CAST_STEPS = 45;    // Calling down a storm: wind-up, then the cast, then it carries on
const FLINCH_EVERY = 40;        // fire it would otherwise never be anything but flinching

// What each fight was last seen doing, and since when (drawing only)
const seen = new WeakMap();

export function bossAnimation(boss) {
    return bossAnimations[boss.id] || null;
}

// Stitches' hook, phase by phase: the mark, the throw, the haul, holding him, and reeling in
// an empty hook (its recovery, in step with the reel)
const HOOK_POSES = { mark: 0, fly: 1, pull: 2, hold: 3 };

// A pose from frames that last so many milliseconds each, at a time into them
function byTime(frames, ms, at, loop) {
    const total = ms.reduce((sum, each) => sum + each, 0);
    let t = loop ? at % total : Math.min(at, total - 1);
    for (let i = 0; i < frames.length; i++) {
        if (t < ms[i]) return frames[i];
        t -= ms[i];
    }
    return frames[frames.length - 1];
}

// When the fight last changed what it was doing: the attack ending is when its release shows
function note(fight) {
    let last = seen.get(fight);
    if (!last) {
        last = { doing: fight.doing, attack: fight.attack, ended: null, flinchAt: -Infinity, shielded: fight.shielded, shieldAt: -Infinity, enraged: fight.enraged, enragedAt: -Infinity };
        seen.set(fight, last);
    }
    if (last.doing !== fight.doing) {
        if (fight.doing === 'moving' && last.doing !== 'moving') {
            last.ended = { from: last.doing, attack: last.attack, at: fight.steps };
        }
        last.doing = fight.doing;
    }
    last.attack = fight.attack;
    if (fight.shielded && !last.shielded) last.shieldAt = fight.steps;
    if (fight.enraged && !last.enraged) last.enragedAt = fight.steps;
    last.shielded = fight.shielded;
    last.enraged = fight.enraged;
    return last;
}

/**
 * The pose to draw now, or null for the boss's one picture.
 * @param {object} fight          The fight (bossSystem.js)
 * @param {number} windUpSteps    How long the wind-up under way lasts, in steps
 * @returns {{sheet: 'core'|'special', frame: number, mirror?: boolean}|null}
 */
export function bossPose(fight, windUpSteps) {
    const anim = bossAnimation(fight.boss);
    if (!anim) return null;
    const idle = () => ({ sheet: 'core', frame: byTime(anim.idle.frames, anim.idle.ms, fight.steps * STEP_MS, true) });

    if (fight.phase === 'intro') return idle();
    if (fight.phase === 'dying') return { sheet: 'core', frame: byTime(anim.death.frames, anim.death.ms, fight.steps * STEP_MS, false) };

    const last = note(fight);
    const trackOf = attack => anim.tracks[attack] || anim.tracks.throw;

    if (fight.doing === 'winding') {
        const track = trackOf(fight.attack);
        const share = Math.min(0.999, Math.max(0, fight.doingSteps / Math.max(1, windUpSteps)));
        return { sheet: track.sheet, frame: track.windup[Math.floor(share * track.windup.length)] };
    }
    if (fight.doing === 'acting' && fight.attack === 'hook' && fight.attackData) {
        const track = trackOf('hook'), phase = fight.attackData.phase;
        if (phase in HOOK_POSES) return { sheet: track.sheet, frame: track.active[HOOK_POSES[phase]] };
        return { sheet: track.sheet, frame: track.recovery[Math.min(track.recovery.length - 1, Math.floor(fight.doingSteps / 5))] };
    }
    if (fight.doing === 'acting') {
        const track = trackOf(fight.attack);
        // A side charge is painted dashing to the right: turned round for one from the right
        const mirror = fight.attack === 'sidecharge' && fight.attackData && fight.attackData.phase === 'dash' && fight.attackData.side > 0;
        return { sheet: track.sheet, frame: track.active[Math.floor(fight.doingSteps / ACT_STEPS) % track.active.length], mirror };
    }

    // Just after an attack: done in the instant, its release, then recovery; after an act, recovery
    if (last.ended) {
        const track = trackOf(last.ended.attack);
        const since = fight.steps - last.ended.at;
        const releasing = last.ended.from === 'winding' ? RELEASE_STEPS : 0;
        if (since < releasing) {
            return { sheet: track.sheet, frame: track.active[Math.min(track.active.length - 1, Math.floor(since / releasing * track.active.length))] };
        }
        if (since < releasing + RECOVERY_STEPS) {
            return { sheet: track.sheet, frame: track.recovery[Math.min(track.recovery.length - 1, Math.floor((since - releasing) / RECOVERY_STEPS * track.recovery.length))] };
        }
    }
    // Calling down a storm (Hexx, Ukorz): only at its start, never for the whole storm
    const storm = anim.tracks.storm;
    if (storm && fight.storm && fight.storm.steps < STORM_CAST_STEPS) {
        const third = STORM_CAST_STEPS / 3;
        return fight.storm.steps < third
            ? { sheet: storm.sheet, frame: storm.windup[Math.min(storm.windup.length - 1, Math.floor(fight.storm.steps / third * storm.windup.length))] }
            : { sheet: storm.sheet, frame: storm.active[Math.floor((fight.storm.steps - third) / ACT_STEPS) % storm.active.length] };
    }
    // The shield going up, or enraging: a moment's pose
    if (fight.steps - last.enragedAt < BRIEF_STEPS) return { sheet: 'core', frame: anim.enrage };
    if (fight.steps - last.shieldAt < BRIEF_STEPS) return { sheet: 'core', frame: anim.guard };
    if (fight.hitFlash > 0 && fight.steps - last.flinchAt >= FLINCH_EVERY) last.flinchAt = fight.steps;
    if (fight.steps - last.flinchAt < FLINCH_STEPS) return { sheet: 'core', frame: anim.hit };
    return idle();
}

/**
 * Where a pose's cell is drawn: the size and place that put the painted boss where its one
 * picture stands (place: the picture's box, as bossSystem.js lays it out).
 */
export function cellPlace(anim, place) {
    const size = place.h * anim.scale;
    const cx = place.x + place.w * anim.center[0];
    const cy = place.y + place.h * anim.center[1];
    return { x: cx - anim.pivot[0] * size, y: cy - anim.pivot[1] * size, size };
}

/** Stitches' hand on a pose that holds his hook, where it is drawn; or null */
export function hookHandOn(anim, pose, cell) {
    const hand = anim.hook && anim.hook.hand[`${pose.sheet}:${pose.frame}`];
    if (!hand) return null;
    const scale = cell.size / BOSS_CELL;
    return {
        x: cell.x + hand.x * cell.size,
        y: cell.y + hand.y * cell.size,
        // His fingers: their square on the grip sheet, and where it goes
        cap: { sx: (pose.frame % 4) * BOSS_CELL + hand.cap[0], sy: Math.floor(pose.frame / 4) * BOSS_CELL + hand.cap[1], sw: hand.cap[2], sh: hand.cap[3],
            x: cell.x + hand.cap[0] * scale, y: cell.y + hand.cap[1] * scale, w: hand.cap[2] * scale, h: hand.cap[3] * scale },
    };
}

/** The source rectangle of a frame on its sheet */
export function cellSource(frame) {
    return { sx: (frame % 4) * BOSS_CELL, sy: Math.floor(frame / 4) * BOSS_CELL, size: BOSS_CELL };
}
