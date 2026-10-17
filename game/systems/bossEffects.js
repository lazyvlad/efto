// The painted spells and blows of the boss fights (data/bossEffects.js): bolts that flicker
// as they fly, bursts where they land, dust where a stomp falls, a boss's shield, rage and
// daze, the smoke of vanishing. Drawing only: what is shown is told by the fight and the
// projectiles (systems/bossSystem.js, classes/BossProjectile.js), and nothing here hurts,
// times or moves anything. A sheet not loaded yet shows nothing (or what was drawn before).
//
// Bursts play once on the clock of the display, a tenth of a second a frame; held effects
// (a bolt in flight, the shield) loop.

import { bossEffects, bossEffectSheets, BOSS_EFFECT_CELL, BOSS_EFFECT_MS } from '../data/bossEffects.js';

const sheets = new Map();
let bursts = [];
let lastDrawn = null;
const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function sheet(name) {
    const id = name.split(':')[0];
    if (!sheets.has(id)) {
        const image = new Image();
        image.src = bossEffectSheets[id];
        sheets.set(id, image);
    }
    const image = sheets.get(id);
    return image.complete && image.naturalWidth ? image : null;
}

/** Load an effect's sheet now, to have it when it is wanted */
export function readyEffect(name) {
    if (bossEffects[name]) sheet(name);
}

/**
 * Draw a frame of an effect.
 * @param {string} name    "sheet:effect" (data/bossEffects.js)
 * @param {number} ms      How far into it; looped, or held on its last frame
 * @param {number} size    How wide (and tall) its cell is drawn
 * @returns {boolean}      Whether it was drawn (false while its sheet loads)
 */
export function drawEffect(ctx, name, ms, x, y, size, { rotation = 0, alpha = 1, loop = true } = {}) {
    const frames = bossEffects[name];
    const image = frames && sheet(name);
    if (!image) return false;
    const step = reducedMotion() ? 0 : Math.floor(ms / BOSS_EFFECT_MS);
    const frame = frames[loop ? step % frames.length : Math.min(frames.length - 1, step)];
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    if (rotation) ctx.rotate(rotation);
    ctx.drawImage(image, (frame % 4) * BOSS_EFFECT_CELL, Math.floor(frame / 4) * BOSS_EFFECT_CELL, BOSS_EFFECT_CELL, BOSS_EFFECT_CELL, -size / 2, -size / 2, size, size);
    ctx.restore();
    return true;
}

/** A burst, played once where something landed */
export function burst(name, x, y, size, { rotation = 0 } = {}) {
    if (!bossEffects[name]) return;
    sheet(name);
    bursts.push({ name, x, y, size, rotation, ms: 0 });
    // A storm or a volley must not pile up more than can be seen
    if (bursts.length > 40) bursts.shift();
}

/** The bursts under way, drawn and moved on (once each display frame) */
export function drawBursts(ctx) {
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const passed = lastDrawn === null ? 0 : Math.min(100, now - lastDrawn);
    lastDrawn = now;
    const length = BOSS_EFFECT_MS * 4;
    bursts = bursts.filter(each => {
        each.ms += passed;
        if (each.ms >= length) return false;
        drawEffect(ctx, each.name, each.ms, each.x, each.y, each.size, { rotation: each.rotation, loop: false, alpha: 1 - Math.max(0, each.ms - length * 0.75) / (length * 0.25) });
        return true;
    });
}

export function resetBursts() {
    bursts = [];
}
