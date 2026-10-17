import assert from 'node:assert/strict';
const E = await import('../../public/experiments/claude-dire-maul/engine.js');
const { createGame, stepGame, FEIGN, PET, clearRay } = E;
const run = (g, t, input = {}) => { for (let i = 0; i < t * 120; i++) stepGame(g, input, 1 / 120); };
const names = [], test = (name, fn) => { fn(); names.push(name); };

test('Feign Death: a chasing pack gives up at once, and he is unseen while down', () => {
    const g = createGame(), pack = g.enemies.filter(a => a.id === 'approach-down');
    Object.assign(g.hero, { x: 14, z: 3 });
    for (const a of pack) Object.assign(a, { state: 'chase', suspicion: 1, lastSeen: { x: 14, z: 3, y: 0 } });
    run(g, 1 / 60, { feign: true });
    assert(g.feign.active);
    assert(pack.every(a => ['return', 'patrol'].includes(a.state)), JSON.stringify(pack.map(a => a.state)));
    const hp = g.hp; run(g, 3);
    assert(pack.every(a => !['chase', 'notice'].includes(a.state)), JSON.stringify(pack.map(a => a.state)));
    assert.equal(g.hp, hp, 'no blows while down');
    assert(g.feign.active, 'still down without moving');
});
test('Feign Death: moving gets him up; it lasts at most its time; the cooldown holds', () => {
    const g = createGame(); g.enemies = [];
    run(g, .1, { feign: true }); assert(g.feign.active);
    run(g, .2, { right: true }); assert(g.feign.active, 'not before the short minimum');
    run(g, .6, { right: true }); assert(!g.feign.active, 'moving ends it');
    run(g, .1); run(g, .1, { feign: true }); assert(!g.feign.active, 'cooldown');
    run(g, FEIGN.cooldown); run(g, .1, { feign: true }); assert(g.feign.active, 'ready again');
    run(g, FEIGN.most + .2); assert(!g.feign.active, 'gets up on his own');
});
test('Distract: the pet dashes to the nearest ogre, which turns on it, loses him, and goes home', () => {
    const g = createGame(), a = g.enemies.find(e => e.id === 'approach-down'); g.enemies = [a];
    Object.assign(g.hero, { x: 9, z: 3 }); Object.assign(g.pet, { x: 8.2, z: 3.3 });
    Object.assign(a, { x: 13, z: 3, y: 0, state: 'chase', suspicion: 1, lastSeen: { x: 9, z: 3, y: 0 } });
    run(g, .05, { distract: true });
    assert.equal(g.pet.mode, 'dash');
    run(g, 1.2);
    assert(a.distracted > 0, 'distracted');
    // He slips behind a pillar while it is busy with the pet, and stays there
    const hp = g.hp; for (let i = 0; i < 600 && Math.hypot(g.hero.x - 18, g.hero.z - 2.45) > .08; i++) { const dx = 18 - g.hero.x, dz = 2.45 - g.hero.z; run(g, 1 / 120, { right: dx > .03, left: dx < -.03, far: dz > .03, near: dz < -.03 }); }
    run(g, .5);
    assert.equal(g.hp, hp, 'it leaves him alone meanwhile');
    run(g, PET.harass);
    assert(['return', 'patrol'].includes(a.state), a.state);
    assert.equal(g.pet.mode, 'follow');
    run(g, .1, { distract: true }); assert.notEqual(g.pet.mode, 'dash', 'cooldown');
});
test('A tall pillar blocks sight across it; standing still against one is cover', () => {
    assert(!clearRay({ x: 10.5, z: 1.75, y: 1.44 }, { x: 13.5, z: 1.75, y: .7 }), 'blocked');
    assert(clearRay({ x: 10.5, z: 3, y: 1.44 }, { x: 13.5, z: 3, y: .7 }), 'clear beside it');
    const g = createGame(), a = g.enemies.find(e => e.id === 'approach-down'); g.enemies = [a];
    Object.assign(a, { x: 13, z: 3.4, y: 0, heading: { x: 0, z: -1 }, patrol: [{ x: 13, z: 3.4, y: 0 }], patrolWait: 99 });
    Object.assign(g.hero, { x: 12, z: 1.05 });          // still, against the pillar's front
    run(g, 1); assert(g.cover, 'in cover'); assert.equal(a.state, 'patrol'); assert.equal(a.suspicion, 0);
    run(g, .7, { left: true }); run(g, 1.2);               // stepped out into the open, in its view
    assert(!g.cover); assert(a.suspicion > 0, 'seen out of cover');
});
test('The pack roams the courtyard, the length of its section, faster than before', () => {
    const g = createGame(), r = g.enemies.find(a => a.id === 'approach-down');
    Object.assign(g.hero, { x: 1, z: 11, y: 1.6 });   // out of the way, unseen
    let most = r.x; for (let s = 0; s < 14; s++) { run(g, 1); most = Math.max(most, r.x); }
    assert(most > 19, 'reached the far end: ' + most.toFixed(1));
    assert(r.patrolSpeed >= 2);
});
console.log(JSON.stringify({ pass: true, checks: names.length, names }, null, 1));
