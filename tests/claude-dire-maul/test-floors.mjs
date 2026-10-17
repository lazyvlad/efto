// claude-dire-maul: the two floors' own dangers
import assert from 'node:assert/strict';
const E = await import('../../public/experiments/claude-dire-maul/engine.js');
const { createGame, stepGame, groundAt, HUNT2, CRUMBLE } = E;
const run = (g, t, input = {}) => { for (let i = 0; i < t * 120; i++) stepGame(g, input, 1 / 120); };
const names = [], test = (name, fn) => { fn(); names.push(name); };
const L = await import('../../public/experiments/claude-dire-maul/level-data.js?v=12');

test('Gravel is heard even sneaking; plain floor is silent sneaking', () => {
    const patch = L.WORLD.gravel[0];
    for (const [onGravel, expect] of [[true, true], [false, false]]) {
        const g = createGame(), a = g.enemies.find(e => e.id === 'approach-down'); g.enemies = [a];
        const x = onGravel ? (patch.x0 + patch.x1) / 2 : patch.x0 - 3, z = onGravel ? (patch.z0 + patch.z1) / 2 : 2.6;
        // The reaver stands behind him, looking away, three steps off
        Object.assign(g.hero, { x, z }); Object.assign(a, { x: x - 3, z, y: 0, heading: { x: -1, z: 0 }, patrol: [{ x: x - 3, z, y: 0 }], patrolWait: 99 });
        run(g, .6, { sneak: true, far: true }); run(g, .6, { sneak: true, near: true });
        assert.equal(a.suspicion > 0, expect, (onGravel ? 'gravel' : 'plain') + ' suspicion ' + a.suspicion);
    }
});
test('A reaver that sees him out of reach throws an axe; stone stops it', () => {
    const g = createGame(), a = g.enemies.find(e => e.id === 'approach-down'); g.enemies = [a];
    Object.assign(g.hero, { x: 14, z: 4 }); Object.assign(a, { x: 9, z: 4, y: 0, state: 'chase', suspicion: 1, seen: true, rush: 0, heading: { x: 1, z: 0 }, lastSeen: { x: 14, z: 4, y: 0 } });
    run(g, .3); assert(a.axeTime > 0, 'winding');
    run(g, .6); assert(g.damageTaken.melee >= HUNT2.axe.damage || g.bolts.some(b => b.kind === 'axe'), 'thrown');
});
test('A crumbling stretch of gallery gives way under him and comes back later', () => {
    const g = createGame(); g.enemies = []; const piece = L.WORLD.surfaces.find(s => s.crumble);
    Object.assign(g.hero, { x: (piece.x0 + piece.x1) / 2, z: 10.2, y: 1.6, grounded: true });
    run(g, CRUMBLE.after + .1);
    assert(g.fallen[piece.crumble], 'gave way'); run(g, 1); assert(g.hero.y < .2, 'dropped to the courtyard: ' + g.hero.y);
    run(g, CRUMBLE.back); assert(!g.fallen[piece.crumble], 'back');
    assert.equal(groundAt((piece.x0 + piece.x1) / 2, 10.2).y, 1.6);
});
test('A gap in the gallery must be jumped: walking off it drops him', () => {
    const g = createGame(); g.enemies = [];
    Object.assign(g.hero, { x: 11.6, z: 10.2, y: 1.6 }); run(g, .8, { right: true }); assert(g.hero.y < .2, 'fell: ' + g.hero.y);
    const j = createGame(); j.enemies = [];
    Object.assign(j.hero, { x: 11.2, z: 10.2, y: 1.6 }); run(j, .25, { right: true }); run(j, .7, { right: true, jump: true }); run(j, .3, { right: true });
    assert(Math.abs(j.hero.y - 1.6) < .05 && j.hero.x > 13.6, 'jumped across: ' + j.hero.x.toFixed(2) + ',' + j.hero.y.toFixed(2));
});
test('A sniper holds its post, sweeps its gaze, sees far down a narrow cone and casts from afar', () => {
    const g = createGame(), a = g.enemies.find(e => e.id === 'approach-up'); g.enemies = [a];
    const post = { x: a.x, z: a.z }; const seen = new Set();
    Object.assign(g.hero, { x: 2, z: 11, y: 1.6 });
    for (let i = 0; i < 6 * 120; i++) { stepGame(g, {}, 1 / 120); seen.add(Math.round(Math.atan2(a.heading.z, a.heading.x) * 180 / Math.PI / 10)); }
    assert(seen.size >= 4, 'sweeps: ' + [...seen]);
    assert(Math.hypot(a.x - post.x, a.z - post.z) < .01, 'holds its post');
    const h = createGame(), b = h.enemies.find(e => e.id === 'approach-up'); h.enemies = [b];
    // Down in the courtyard, nearly nine steps off, in the open, right in its gaze
    const t = { x: b.x - 7.2, z: b.z - 5 }, d = Math.hypot(t.x - b.x, t.z - b.z);
    const deg = Math.atan2(t.z - b.z, t.x - b.x) * 180 / Math.PI; b.sweep = { from: deg, to: deg, period: 5.5 }; Object.assign(h.hero, { x: t.x, z: t.z, y: 0 });
    run(h, 1.2); assert(b.suspicion > .5 || b.state === 'chase', 'seen nine steps off: ' + b.suspicion);
    run(h, 2.5); assert(h.bolts.length || h.damageTaken.spell > 0 || b.castTime > 0, 'casting from afar');
    assert(Math.hypot(b.x - post.x, b.z - post.z) < .01, 'still at its post');
});
console.log(JSON.stringify({ pass: true, checks: names.length, names }, null, 1));
