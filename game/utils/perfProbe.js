// Measuring how the game runs, in the player's own browser, and sending it to the site to look
// at (Admin → Performance). Two ways:
//
//   Debug mode   opening the game with ?debug=perf (kept in this browser; off with ?debug=off):
//                a small badge shows the frame rate, and a summary goes every 5 seconds of play
//   Sampled      for a share of everyone's page loads (INPUT_BOOT.perfShare, 1 in 20 as set),
//                quietly: no badge, a summary every 30 seconds of play. So it is known how the
//                game runs on the machines people really play on.
//
// Every frame the game says how long it took and how much of it went to the game's logic, to
// drawing, and to drawing the hunter; each summary of those frames, with the device and what was
// on screen and happening, goes to the site (INPUT_BOOT.urls.perf). Off, it does nothing but
// answer "off".

const STORAGE_KEY = 'input_debug_perf';
const SAMPLE_SECONDS = { debug: 5, sampled: 30 };

let enabled = false;
let source = null;          // 'debug' or 'sampled'
let frames = [];            // [{ ms, update, render, hunter }] since the last sample
let hunterMs = 0;           // Time spent drawing the hunter in the frame being drawn
let mouseMoves = 0;         // Mouse reports since the last frame, and the time they took
let mouseMs = 0;
let sampleStart = 0;
let session = null;
let device = null;
let send = null;            // (body) => void, from the game
let describe = null;        // () => { what is on screen and happening }, from the game
let badge = null;
let badgeShownAt = 0;

// On or off, from the address (?debug=perf / ?debug=off), else as this browser last had it
function readSwitch() {
    try {
        const asked = new URLSearchParams(window.location.search).get('debug');
        if (asked === 'perf') localStorage.setItem(STORAGE_KEY, '1');
        if (asked === 'off') localStorage.removeItem(STORAGE_KEY);
        return localStorage.getItem(STORAGE_KEY) === '1';
    } catch (e) {
        return false;
    }
}

// The browser and its machine, once: the graphics card as WebGL names it, the screen, its
// pixel density (the canvas's size goes with each sample: it is set after this)
function describeDevice() {
    let gpu = null;
    try {
        const probe = document.createElement('canvas').getContext('webgl');
        const info = probe && probe.getExtension('WEBGL_debug_renderer_info');
        if (info) gpu = probe.getParameter(info.UNMASKED_RENDERER_WEBGL);
    } catch (e) {
        // Not told
    }
    return {
        userAgent: navigator.userAgent.slice(0, 300),
        gpu: gpu ? String(gpu).slice(0, 200) : null,
        dpr: window.devicePixelRatio || 1,
        screen: `${window.screen.width}x${window.screen.height}`,
        window: `${window.innerWidth}x${window.innerHeight}`,
        cores: navigator.hardwareConcurrency || null,
        memory: navigator.deviceMemory || null,
        // A touch screen (a phone or tablet, most often)
        touch: (navigator.maxTouchPoints || 0) > 0,
    };
}

/**
 * Set the probe up. Does nothing (and costs nothing) unless debug mode is on or this page load
 * is one of those sampled.
 * @param {object} options  { canvas, send: (body) => void, describe: () => object,
 *                            share: the part of page loads sampled (0..1) }
 * @returns {boolean} Whether it is on
 */
export function startPerfProbe(options) {
    source = readSwitch() ? 'debug' : (Math.random() < (Number(options.share) || 0) ? 'sampled' : null);
    enabled = source !== null;
    if (!enabled) return false;

    send = options.send;
    describe = options.describe;
    device = describeDevice();
    session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    // Quietly, when sampled: nothing on screen
    if (source === 'sampled') return true;

    badge = document.createElement('div');
    badge.setAttribute('aria-live', 'off');
    badge.style.cssText = 'position:fixed;left:6px;bottom:6px;z-index:99999;padding:3px 8px;font:12px/1.3 monospace;color:#9fe870;background:rgba(0,0,0,0.75);border:1px solid #3d3219;border-radius:4px;pointer-events:none';
    badge.textContent = 'PERF on';
    document.body.appendChild(badge);
    return true;
}

export function perfProbeOn() {
    return enabled;
}

// A mouse report was handled, and how long it took (systems/inputSystem.js)
export function noteMouseMove(ms) {
    if (!enabled) return;
    mouseMoves++;
    mouseMs += ms;
}

// Time spent drawing the hunter, added up over a frame (classes/Player.js)
export function noteHunterDraw(ms) {
    if (enabled) hunterMs += ms;
}

/**
 * A frame has been drawn.
 * @param {object} frame  { ms (since the last), update, render (ms spent), playing }
 */
export function noteFrame(frame) {
    if (!enabled) return;
    const now = performance.now();

    if (frame.playing) {
        if (frames.length === 0) sampleStart = now;
        frames.push({ ms: frame.ms, update: frame.update, render: frame.render, hunter: hunterMs, mouse: mouseMoves, mouseMs });
        if (now - sampleStart >= SAMPLE_SECONDS[source] * 1000) flush(now);
    } else if (frames.length > 0) {
        // Paused or over: what there is goes now
        flush(now);
    }
    hunterMs = 0;
    mouseMoves = 0;
    mouseMs = 0;

    if (now - badgeShownAt > 500 && badge) {
        badgeShownAt = now;
        const recent = frames.slice(-30);
        const average = recent.length ? recent.reduce((sum, f) => sum + f.ms, 0) / recent.length : 0;
        badge.textContent = frame.playing && average > 0
            ? `PERF ${Math.round(1000 / average)} fps · ${average.toFixed(1)} ms · hunter ${(recent.reduce((sum, f) => sum + f.hunter, 0) / recent.length).toFixed(1)} ms`
            : 'PERF on · recording while playing';
    }
}

// A summary of the frames since the last, sent to the site
function flush(now) {
    const list = frames;
    frames = [];
    if (list.length < 5 || !send) return;

    const times = list.map(f => f.ms).sort((a, b) => a - b);
    const at = share => times[Math.min(times.length - 1, Math.floor(share * times.length))];
    const mean = key => list.reduce((sum, f) => sum + f[key], 0) / list.length;
    const total = times.reduce((sum, ms) => sum + ms, 0);
    const round = value => Math.round(value * 10) / 10;

    let state = {};
    try {
        state = describe ? describe() : {};
    } catch (e) {
        state = { error: String(e).slice(0, 200) };
    }

    send({
        session,
        device,
        sample: {
            source,
            seconds: round(total / 1000),
            frames: list.length,
            fps: round(1000 * list.length / total),
            median: round(at(0.5)),
            p95: round(at(0.95)),
            p99: round(at(0.99)),
            worst: round(times[times.length - 1]),
            over33: times.filter(ms => ms > 33.4).length,
            over50: times.filter(ms => ms > 50).length,
            update: round(mean('update')),
            render: round(mean('render')),
            hunter: round(mean('hunter')),
            // The mouse: reports a second, the most in one frame, the time handling them took
            // a frame, and the slow frames (over 2 ms more than the median) that had reports
            mousePerSecond: Math.round(1000 * list.reduce((sum, f) => sum + f.mouse, 0) / total),
            mouseMostInFrame: Math.max(...list.map(f => f.mouse)),
            mouseMs: Math.round(mean('mouseMs') * 100) / 100,
            slowWithMouse: list.filter(f => f.ms > at(0.5) + 2 && f.mouse > 0).length,
            slowWithoutMouse: list.filter(f => f.ms > at(0.5) + 2 && f.mouse === 0).length,
            ...state,
        },
    });
}
