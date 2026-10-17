// claude-dire-maul: alarms that spread, Feign Death that can fail, the finale
import assert from 'node:assert/strict';
const E = await import('../../public/experiments/claude-dire-maul/engine.js');
const { createGame, stepGame, INSPECT, FINALE } = E;
const L = await import('../../public/experiments/claude-dire-maul/level-data.js?v=12');
const run = (g, t, input = {}) => { for (let i = 0; i < t * 120; i++) stepGame(g, input, 1 / 120); };
const names = [], test = (name, fn) => { fn(); names.push(name); };
const id = (g, n) => g.enemies.find(e => e.id === n);

test('A horn: one alarm sets the whole stretch searching, both floors, and no other stretch', () => {
    const g = createGame(), a = id(g, 'approach-down'), up = id(g, 'approach-up'), far = id(g, 'barracks-down');
    Object.assign(g.hero, { x: 10, z: 3.5 }); Object.assign(a, { x: 13, z: 3.5, heading: { x: -1, z: 0 }, patrol: [{ x: 13, z: 3.5, y: 0 }], patrolWait: 99 });
    run(g, .9);
    assert.equal(a.state, 'chase'); assert(['search', 'chase'].includes(up.state), 'the sniper upstairs: ' + up.state);
    assert.equal(far.state, 'patrol', 'the next stretch is not roused');
});
test('Feign Death under an ogre’s nose: it comes to look; up too soon and he is caught', () => {
    const g = createGame(), a = id(g, 'approach-down'); g.enemies = [a];
    Object.assign(g.hero, { x: 10, z: 3.5 }); Object.assign(a, { x: 11.8, z: 3.5, state: 'chase', suspicion: 1, lastSeen: { x: 10, z: 3.5, y: 0 } });
    run(g, .05, { feign: true }); assert.equal(a.state, 'inspect');
    run(g, 1.2); assert(Math.hypot(a.x - g.hero.x, a.z - g.hero.z) < INSPECT.caught, 'standing over the body');
    run(g, .1, { left: true }); assert.equal(a.state, 'chase', 'caught getting up');
});
test('Feign Death under an ogre’s nose: lie still until it leaves, and it works', () => {
    const g = createGame(), a = id(g, 'approach-down'); g.enemies = [a];
    Object.assign(g.hero, { x: 10, z: 3.5 }); Object.assign(a, { x: 11.8, z: 3.5, state: 'chase', suspicion: 1, lastSeen: { x: 10, z: 3.5, y: 0 } });
    run(g, .05, { feign: true }); run(g, 5.2);
    assert(['return', 'patrol'].includes(a.state), a.state); assert(Math.hypot(a.x - g.hero.x, a.z - g.hero.z) > INSPECT.caught, 'walked off');
    run(g, .5, { left: true }); assert(!['chase', 'notice'].includes(a.state), 'unseen as he gets up: ' + a.state);
});
test('Feign Death from a distance works as ever', () => {
    const g = createGame(), a = id(g, 'approach-down'); g.enemies = [a];
    Object.assign(g.hero, { x: 10, z: 3.5 }); Object.assign(a, { x: 15, z: 3.5, state: 'chase', suspicion: 1, lastSeen: { x: 10, z: 3.5, y: 0 } });
    run(g, .05, { feign: true }); assert(['return', 'patrol'].includes(a.state), a.state);
});
test('The finale: the tribute sets Mol’dar after him; a shockwave hurts on the ground, not in the air', () => {
    for (const jump of [false, true]) {
        const g = createGame(), m = g.guard; g.enemies = [m];
        Object.assign(g.hero, { x: L.TRIBUTE.x - .3, z: L.TRIBUTE.z });
        run(g, .2); assert(g.tribute && g.finale, 'taken');
        // Mol'dar close, about to slam
        Object.assign(m, { x: g.hero.x - 3.5, z: g.hero.z + .3, slamIn: 0 });
        const hp = g.hp; let jumped = false;
        for (let i = 0; i < 1.6 * 120; i++) { const w = g.waves[0]; const near = w && Math.abs(Math.hypot(g.hero.x - w.x, g.hero.z - w.z) - w.r) < 1.0; stepGame(g, jump && near && !jumped ? (jumped = true, { jump: true }) : {}, 1 / 120); }
        if (jump) assert.equal(g.hp, hp, 'jumped it'); else assert(g.hp <= hp - FINALE.damage, 'hit on the ground: ' + g.hp);
    }
});
test('The finale: the gate closes in time; without the tribute the arch does not let him out', () => {
    const g = createGame(); g.enemies = [];
    Object.assign(g.hero, { x: L.WORLD.exit.x + .2, z: 3.5 }); run(g, .3); assert.equal(g.mode, 'playing', 'no tribute, no way out');
    const h = createGame(), m = h.guard; h.enemies = [m]; Object.assign(h.hero, { x: L.TRIBUTE.x - .3, z: L.TRIBUTE.z }); run(h, .1);
    h.enemies = []; h.hero.x = 60.5; run(h, FINALE.gate + .1); assert.equal(h.mode, 'defeat'); assert.match(h.message, /gate/);
});
console.log(JSON.stringify({ pass: true, checks: names.length, names }, null, 1));
