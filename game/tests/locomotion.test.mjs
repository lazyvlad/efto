// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const { STRIDE, stepState, advanceStep, stepPose, legShift, ownerOf } = await import(asUrl(await readFile(new URL('../utils/locomotion.js', import.meta.url))));

const FRAME = 1 / 60;
// He walks at a speed (canvas units a second) for some seconds, on a field 1600 wide
function walk(state, speed, seconds, width = 300) {
    for (let t = 0; t < seconds; t += FRAME) advanceStep(state, FRAME, speed * FRAME, 800, width);
    return state;
}

test('standing still, nothing steps on; moving, the step turns over with the distance', () => {
    const still = walk(stepState(), 0, 2);
    assert.equal(still.phase, 0);
    assert.ok(stepPose(still).amount < 1e-9);
    const slow = walk(stepState(), 100, 1), quicker = walk(stepState(), 200, 1);
    assert.ok(Math.abs(quicker.phase / slow.phase - 2) < 0.05, 'twice the distance, twice the steps');
    assert.ok(walk(stepState(), 400, 1).amount > 0.4, 'at speed, he leans and lifts');
});

test('a dash does not make his feet impossibly quick', () => {
    const dash = walk(stepState(), 5000, 1);
    assert.ok(dash.phase <= Math.PI * 2 * 2.25 + 1e-9, String(dash.phase));
});

test('he leans into the move, and settles when he stops', () => {
    const right = walk(stepState(), 600, 0.5), left = walk(stepState(), -600, 0.5);
    assert.ok(stepPose(right).lean > 0 && stepPose(left).lean < 0);
    walk(right, 0, 1);
    assert.ok(Math.abs(stepPose(right).lean) < 0.001 && stepPose(right).amount < 0.001);
});

test('asked for less motion, he does not step at all', () => {
    const pose = stepPose(walk(stepState(), 600, 0.4), true);
    assert.deepEqual(Object.values(pose).filter(value => value !== 0), []);
});

test('his legs step, his head and what he carries do not bend, his soles move whole', () => {
    const state = walk(stepState(), 800, 0.35);
    for (const [side, stride] of Object.entries(STRIDE)) {
        const pose = stepPose(state);
        // Above his hips nothing moves with the legs
        assert.deepEqual(legShift(0.4, stride.hips - 0.01, pose, stride), [0, 0], side);
        // A boot below the ankle moves as one piece
        const [, a] = legShift(0.4, stride.ankles + 0.01, pose, stride), [, b] = legShift(0.4, 0.99, pose, stride);
        assert.ok(Math.abs(a - b) < 1e-12, side);
        // Carried, nothing bends
        assert.deepEqual(legShift(0.4, 0.8, pose, stride, 'carry'), [0, 0]);
        // The two legs move differently; a cape does not split between them
        assert.notDeepEqual(legShift(0.35, 0.85, pose, stride), legShift(0.7, 0.85, pose, stride));
        assert.deepEqual(legShift(0.35, 0.85, pose, stride, 'cloth'), legShift(0.7, 0.85, pose, stride, 'cloth'));
    }
});

test('weapons and the quiver are carried, capes and tabards are cloth, the rest is his body', () => {
    assert.deepEqual(['mainhand', 'offhand', 'ranged', 'quiver'].map(ownerOf), ['carry', 'carry', 'carry', 'carry']);
    assert.deepEqual(['back', 'tabard'].map(ownerOf), ['cloth', 'cloth']);
    assert.deepEqual(['head', 'chest', 'legs', 'feet', 'waist', 'hands'].map(ownerOf), Array(6).fill('body'));
});
