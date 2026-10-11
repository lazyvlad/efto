// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// The game's source files are browser ES modules (package.json has no "type": "module"),
// so load the module through a data: URL instead of a plain import.
const source = await readFile(new URL('../utils/gameClock.js', import.meta.url));
const { FixedStepClock, SIM_STEP_MS } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

// Simulate `seconds` of real time at the given display refresh rate and count simulation steps
function simulate(fps, seconds) {
    const clock = new FixedStepClock();
    const frameMs = 1000 / fps;
    let steps = 0;
    for (let frame = 0; frame <= fps * seconds; frame++) {
        const elapsed = clock.beginFrame(frame * frameMs);
        const due = clock.takeSteps(elapsed);
        for (let i = 0; i < due; i++) clock.tick();
        steps += due;
    }
    return { steps, clock };
}

test('simulation runs at 60 steps per second at any refresh rate', () => {
    for (const fps of [30, 60, 75, 120, 144, 240]) {
        const { steps } = simulate(fps, 10);
        assert.ok(Math.abs(steps - 600) <= 1, `${fps}fps ran ${steps} steps in 10s`);
    }
});

test('game time follows the number of steps taken', () => {
    const { steps, clock } = simulate(144, 5);
    assert.ok(Math.abs(clock.now() - steps * SIM_STEP_MS) < 1e-6);
});

test('first frame does not advance the simulation', () => {
    const clock = new FixedStepClock();
    assert.equal(clock.takeSteps(clock.beginFrame(123456)), 0);
});

test('a long stall is capped instead of fast-forwarding the game', () => {
    const clock = new FixedStepClock();
    clock.beginFrame(0);
    const steps = clock.takeSteps(clock.beginFrame(60000)); // tab was hidden for a minute
    assert.ok(steps <= 5, `ran ${steps} steps after a stall`);
    assert.equal(clock.alpha, 0);
});

test('alpha is the leftover fraction of a step', () => {
    const clock = new FixedStepClock();
    clock.beginFrame(0);
    const steps = clock.takeSteps(clock.beginFrame(SIM_STEP_MS * 1.5));
    assert.equal(steps, 1);
    assert.ok(Math.abs(clock.alpha - 0.5) < 1e-9);
});

test('discarding pending time stops catch-up after a pause', () => {
    const clock = new FixedStepClock();
    clock.beginFrame(0);
    clock.takeSteps(clock.beginFrame(10));
    clock.discardPending();
    assert.equal(clock.takeSteps(clock.beginFrame(20)), 0);
});
