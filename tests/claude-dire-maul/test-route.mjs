// The best route known clears the level unseen within its time; running or sneaking straight does not
import assert from 'node:assert/strict';
const { play } = await import('./planner.mjs');
const L = await import('../../public/experiments/claude-dire-maul/level-data.js?v=15');
const best = play(['up', 'up', 'down']);
console.log('best route', best.mode, best.time + ' s', 'alerts', best.alerts, 'hp', best.hp, '| limit', L.RUN.limit, 'recorded best', L.RUN.best);
assert.equal(best.mode, 'victory'); assert.equal(best.alerts, 0); assert.equal(best.hp, 100);
assert(best.time <= L.RUN.best + .5, 'the recorded best is still right');
assert(L.RUN.limit >= best.time * 2, 'room to spare');
