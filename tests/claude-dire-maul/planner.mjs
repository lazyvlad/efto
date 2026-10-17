// The best route through claude-dire-maul: for each stretch, upstairs or down; played as a
// careful player who looks ahead and moves only when no ogre would notice him.
const E = await import('../../public/experiments/claude-dire-maul/engine.js');
const L = await import('../../public/experiments/claude-dire-maul/level-data.js?v=15');
const { createGame, stepGame } = E, { WORLD, TRIBUTE } = L;
// The gallery's gaps (to jump) and crumbling stretches (never to stand on)
const pieces = WORLD.surfaces.filter(s => s.id === 'gallery').sort((a, b) => a.x0 - b.x0);
const GAPS = pieces.slice(1).map((s, i) => [pieces[i].x1, s.x0]).filter(([a, b]) => b - a > .01);
const CRUMBLES = pieces.filter(s => s.crumble);
const SENTRIES = createGame().enemies.filter(a => a.sweep && a.y > 1);
const onGravel = h => h.y < .1 && (WORLD.gravel || []).some(p => h.x > p.x0 - .3 && h.x < p.x1 + .3 && h.z > p.z0 - .3 && h.z < p.z1 + .3);
const upstairs = h => Math.abs(h.y - 1.6) < .1;
const onCrumble = h => upstairs(h) && CRUMBLES.some(c => h.x > c.x0 - .5 && h.x < c.x1 + .5);
const DT = 1 / 120, TICK = 30, LOOK = 1.2, LONGEST = 5, MOST = Number(process.env.MOST || 200);
const STRETCHES = [0, 28, 56];
const pillarsOf = start => WORLD.blocks.filter(b => b.cover && b.top - b.bottom >= 2 && b.bottom === 0 && b.x0 >= start && b.x1 <= start + 28 && b.z0 < 2.5).map(b => (b.x0 + b.x1) / 2).sort((a, b) => a - b);
const columnsOf = start => WORLD.blocks.filter(b => b.id.includes('gallery-column') && b.x0 >= start && b.x1 <= start + 28).sort((a, b) => a.x0 - b.x0);
// The points of a stretch, by floor; "cover" marks a point to wait at
function legs(start, floor, next) {
    const pts = [];
    if (floor === 'down') {
        // Where the reaver walks the front, hide behind the pillars (the pillar between you);
        // in Mol'dar's courtyard, in front of them (he keeps to the middle). Round the safe
        // perches and the stone screens on the way.
        const behind = start < 56, z = behind ? 2.45 : 1.02, lane = behind ? 2.45 : .5;
        if (start > 0) pts.push({ x: start - 2.5, z: .5 }, { x: start + 4.2, z: .5 }, { x: start + 4.2, z: lane });
        for (const x of pillarsOf(start)) pts.push({ x: x - .8, z: lane }, { x, z, cover: true }, { x: x + .8, z: lane });
        if (start === 0) pts.push({ x: 21.8, z: 2.95 }, { x: 25.5, z: 2.95 }, { x: 25.5, z: .5 });
        else if (start === 28) pts.push({ x: start + 21.8, z: lane }, { x: start + 25.5, z: lane }, { x: start + 25.5, z: .5 });
        else pts.push({ x: TRIBUTE.x, z: TRIBUTE.z, tribute: true });
    } else {
        // Up the west stairs, along the gallery between its columns, down the east stairs
        // In front of the stone screen between stretches, then up the stairs
        if (start > 0) pts.push({ x: start - 2.4, z: 1.7 }, { x: start + .2, z: 1.7 }, { x: start + .2, z: 3 });
        pts.push({ x: start + 4.5, z: 3.6 }, { x: start + 4.5, z: 10.25 });
        for (const b of columnsOf(start)) { const x = (b.x0 + b.x1) / 2, z = b.z0 > 10.2 ? b.z0 - .3 : b.z1 + .3; pts.push({ x, z, cover: true }); }
        pts.push({ x: start + 23.5, z: 10.25 }, { x: start + 23.5, z: 3.6 });
        if (start < 56) pts.push({ x: start + 25.6, z: 3.6 }, { x: start + 25.6, z: 1.7 });
        // Behind each sentry, along the back wall: close by, he senses you whichever way he faces
        for (const a of SENTRIES.filter(a => a.x > start && a.x < start + 28)) {
            const from = pts.findIndex(p => p.z > 8 && p.x > a.x - 1.3), to = pts.findIndex(p => p.z > 8 && p.x > a.x + 1.3);
            pts.splice(from, to - from, { x: a.x - 1.3, z: 10.2 }, { x: a.x - 1.3, z: 11.6 }, { x: a.x + 1.3, z: 11.6 }, { x: a.x + 1.3, z: 10.25 });
        }
        if (start === 56) pts.push({ x: TRIBUTE.x + .4, z: 3 }, { x: TRIBUTE.x, z: TRIBUTE.z, tribute: true });
    }
    return pts;
}
function play(plan, record = false) {
    // The limit is what this works out: lifted while it plays
    const limit = L.RUN.limit; L.RUN.limit = 1e9;
    try { return playOnce(plan, record); } finally { L.RUN.limit = limit; }
}
function playOnce(plan, record) {
    const g = createGame('alliance');
    const pts = [{ x: 2.6, z: 1.2 }];
    STRETCHES.forEach((s, i) => pts.push(...legs(s, plan[i])));
    pts.push({ x: 79.5, z: 3.5 }, { x: 82.8, z: 3.5 });
    let i = 0, back = null; const inputs = [];
    const toward = (game, p) => {
        const h = game.hero, dx = p.x - h.x, dz = p.z - h.z, near = game.enemies.some(a => Math.hypot(a.x - h.x, a.z - h.z) < 4.5);
        // A gap just ahead on the gallery: jump it, at full stride
        const jump = h.grounded && upstairs(h) && GAPS.some(([a, b]) => dx > 0 ? h.x > a - .32 && h.x < a - .02 && p.x > b : h.x < b + .32 && h.x > b + .02 && p.x < a);
        // Running for the arch: jump each shockwave as it comes
        const wave = game.finale && h.grounded && game.waves.some(w => { const d = Math.hypot(h.x - w.x, h.z - w.z) - w.r; return d > 0 && d < 1.1; });
        return { right: dx > .035, left: dx < -.035, far: dz > .035, near: dz < -.035, sneak: near && !jump && !onCrumble(h) && !game.finale && !(process.env.GRAVEL_RUN && onGravel(h)), jump: jump || wave };
    };
    const reached = (game, p) => Math.hypot(p.x - game.hero.x, p.z - game.hero.z) < .08;
    const safe = (from, idx) => {
        // Nobody near: no need to look ahead
        if (!from.enemies.some(a => Math.hypot(a.x - from.hero.x, a.z - from.hero.z) < 12)) return true;
        const c = structuredClone(from); let j = idx;
        for (let k = 0; k < LONGEST / DT; k++) {
            if (k >= LOOK / DT && !onGravel(c.hero) && !onCrumble(c.hero) && (c.cover || !c.enemies.some(a => Math.hypot(a.x - c.hero.x, a.z - c.hero.z) < 9))) break;
            if (j < pts.length && reached(c, pts[j])) j++;
            stepGame(c, j < pts.length ? toward(c, pts[j]) : {}, DT);
            if (c.mode !== 'playing') return c.mode === 'victory';
            if (c.finale) return true;     // the tribute taken: from here it is a run
            if (c.enemies.some(a => a.suspicion > .2 || a.state === 'chase') || c.hp < from.hp || c.hero.y < from.hero.y - .5 && upstairs(from.hero) && pts[j]?.z > 8.4) return false;
        }
        return true;
    };
    while (g.mode === 'playing' && g.time < MOST) {
        while (i < pts.length && reached(g, pts[i])) i++;
        if (i >= pts.length) break;
        // The finale: no waiting now, only running and jumping, a step at a time
        if (g.finale) { const step = toward(g, pts[i]); stepGame(g, step, DT); if (record) inputs.push(step); continue; }
        let input; const t0 = performance.now(); const ok = onCrumble(g.hero) || safe(g, i);
        if (process.env.TRACE) console.log('t', g.time.toFixed(2), 'hero', g.hero.x.toFixed(2), g.hero.z.toFixed(2), 'next', i, JSON.stringify(pts[i]), 'safe', ok, 'cover', g.cover, (performance.now() - t0).toFixed(0) + 'ms');
        // Unsafe and in the open: back along the way he came, waypoint by waypoint, to the
        // nearest cover (the next one, if he is all but there). Safe again: on from there.
        if (!ok && !g.cover) { if (back === null) back = pts[i].cover && Math.hypot(pts[i].x - g.hero.x, pts[i].z - g.hero.z) < 1.5 ? i : Math.max(0, i - 1); else if (reached(g, pts[back]) && !pts[back].cover && back > 0) back--; }
        if (ok && back !== null) { i = Math.min(i, back + 1); back = null; while (i < pts.length && reached(g, pts[i])) i++; if (i >= pts.length) break; }
        if (ok) input = toward(g, pts[i]);
        else if (g.cover) input = {};
        else input = back !== null ? toward(g, pts[back]) : {};
        // Committed for a moment, or until he gets where he was going
        const goal = ok ? pts[i] : !g.cover && back !== null ? pts[back] : null;
        for (let k = 0; k < TICK && g.mode === 'playing'; k++) { const there = goal && reached(g, goal); if (there && ok) break; const step = goal && !there ? toward(g, goal) : {}; stepGame(g, step, DT); if (record) inputs.push(step); }
    }
    return { plan: plan.join('/'), mode: g.mode, time: +g.time.toFixed(1), alerts: g.alerts, hp: g.hp, inputs };
}
export { play };
if (process.argv[1] && process.argv[1].endsWith('planner.mjs')) {
const plans = [];
for (const a of ['down', 'up']) for (const b of ['down', 'up']) for (const c of ['down', 'up']) plans.push([a, b, c]);
const only = process.argv[2] ? [process.argv[2].split('/')] : plans;
const results = [];
for (const p of only) { const t = Date.now(); const r = play(p); results.push(r); console.log(r.plan.padEnd(16), r.mode.padEnd(8), 'time', r.time, 'alerts', r.alerts, 'hp', r.hp, '(' + ((Date.now() - t) / 1000).toFixed(0) + 's)'); }
const best = results.filter(r => r.mode === 'victory' && r.alerts === 0).sort((a, b) => a.time - b.time)[0];
console.log('BEST', best ? best.plan + ' ' + best.time + 's' : 'none');


}
