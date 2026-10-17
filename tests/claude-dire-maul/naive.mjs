const { createGame, stepGame } = await import('../../public/experiments/claude-dire-maul/engine.js');
const g = createGame('alliance');
const go = (x, z, sneak = false) => { let n = 0; while (g.mode === 'playing' && Math.hypot(x - g.hero.x, z - g.hero.z) > .07 && n++ < 6000) { const dx = x - g.hero.x, dz = z - g.hero.z; stepGame(g, { right: dx > .035, left: dx < -.035, far: dz > .035, near: dz < -.035, sneak }, 1 / 120); } };
for (const sneak of [false, true]) {
    const h = createGame('alliance'); Object.assign(g, h);
    go(2.6, .5, sneak);
    for (const x of [10.6, 18.6, 21.5]) go(x, .5, sneak);
    for (const x of [30, 50, 66, 79.5]) go(x, .5, sneak);
    go(79.5, 3.5, sneak); go(82.8, 3.5, sneak);
    console.log(sneak ? 'sneaking straight' : 'running straight', g.mode, 'time', g.time.toFixed(1), 'alerts', g.alerts, 'hp', g.hp);
}
