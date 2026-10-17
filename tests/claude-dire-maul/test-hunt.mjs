// The hunting rules of claude-dire-maul (HUNT in engine.js)
import assert from 'node:assert/strict';
const { createGame, stepGame, HUNT } = await import('../../public/experiments/claude-dire-maul/engine.js');
const run = (g, t, input = {}) => { for (let i = 0; i < t * 120; i++) stepGame(g, input, 1 / 120); };
const pack = g => g.enemies.filter(a => a.id === 'approach-down');
const names = [], test = (name, fn) => { fn(); names.push(name); };
const chasing = (g, at) => { for (const a of pack(g)) Object.assign(a, { state: 'chase', suspicion: 1, lastSeen: { ...at, y: 0 } }); };

test('Past the edge of its ground, a pack gives up within a second or two and goes back to its patrol', () => {
    const g = createGame(); const edge = pack(g)[0].zone[1] + HUNT.leash;
    Object.assign(g.hero, { x: edge + 1.5, z: 3 }); chasing(g, g.hero);
    run(g, 2);
    assert(pack(g).every(a => a.state !== 'chase'), JSON.stringify(pack(g).map(a => a.state)));
    run(g, 14);
    assert(pack(g).every(a => ['patrol', 'return'].includes(a.state)), JSON.stringify(pack(g).map(a => a.state)));
    assert(pack(g).every(a => a.x < edge), 'they stay on their own ground');
    assert.equal(g.hp, 100);
});
test('Lost from sight, a pack searches where it last saw him, then goes home', () => {
    const g = createGame();
    // Last seen at the pack's west end; the hunter is long gone (out of the level's way, unseen)
    Object.assign(g.hero, { x: 3.5, z: 11, y: 1.6 });
    chasing(g, { x: 9, z: 1.5 });
    for (const a of pack(g)) a.lost = 2;
    run(g, 1);
    assert(pack(g).every(a => a.state === 'search'), JSON.stringify(pack(g).map(a => a.state)));
    run(g, HUNT.searchMost + 1);
    assert(pack(g).every(a => ['return', 'patrol'].includes(a.state)), JSON.stringify(pack(g).map(a => a.state)));
});
test('Three ogres on a hunter who stands still strike one at a time', () => {
    const g = createGame(); g.enemies = pack(g);
    Object.assign(g.hero, { x: 14, z: 3 });
    g.enemies.forEach((a, i) => Object.assign(a, { x: 13 + i * .4, z: 2.2 + i * .8, y: 0, state: 'chase', suspicion: 1, caster: false, lastSeen: { x: 14, z: 3, y: 0 } }));
    run(g, 6);
    // Before: three blows of 12 every 1.9 s, about 110 in 6 s. Now one blow every ~2.1 s
    assert(g.damageTaken.melee <= 40, 'took ' + g.damageTaken.melee);
    assert(g.damageTaken.melee >= 24, 'still dangerous: took ' + g.damageTaken.melee);
});
test('Caught on open ground within their ground, a hunter who just runs is still caught', () => {
    const g = createGame(), a = g.enemies[0]; g.enemies = [a];
    Object.assign(g.hero, { x: 10, z: 3 });
    Object.assign(a, { x: 8, z: 3, y: 0, state: 'chase', suspicion: 1, lastSeen: { x: 10, z: 3, y: 0 } });
    run(g, 6, { right: true });
    assert(g.hp < 100, 'caught: ' + g.hp + ' at x ' + g.hero.x.toFixed(1));
});
test('An alarm stays in its stretch: the next stretch hears no horn', () => {
    const g = createGame(), a = g.enemies.find(e => e.id === 'approach-down'), b = g.enemies.find(e => e.id === 'barracks-down');
    g.enemies = [a, b];
    Object.assign(g.hero, { x: 10, z: 3 });
    Object.assign(a, { x: 13, z: 3, y: 0, heading: { x: -1, z: 0 }, patrol: [{ x: 13, z: 3, y: 0 }], patrolWait: 20 });
    run(g, .8);
    assert.equal(a.state, 'chase'); assert.equal(b.state, 'patrol');
});
console.log(JSON.stringify({ pass: true, checks: names.length, names }, null, 1));
