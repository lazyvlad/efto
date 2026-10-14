// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/upheaval.js', import.meta.url));
const { planUpheaval } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const field = { width: 1600, height: 900, floorTop: 630 };
const rules = { waves: 5, rise: 1 / 150, cross: 1 / 150, train: 3 };

// Random numbers in turn, for a plan that can be checked
const sequence = values => {
    let at = 0;
    return () => values[at++ % values.length];
};

test('an Upheaval is the ground, one side, the other, the ground, then both sides', () => {
    const waves = planUpheaval(field, 80, rules, sequence([0.2, 0.7, 0.4, 0.9]));
    assert.deepEqual(waves.map(wave => wave.kind), ['floor', 'side', 'side', 'floor', 'both']);

    const [, first, second, , both] = waves;
    assert.notEqual(first.entries[0].from, second.entries[0].from, 'the two sides take turns');
    assert.notEqual(first.lane, second.lane, 'so do the halves of the band');
    assert.deepEqual(new Set(both.entries.map(entry => entry.from)), new Set(['left', 'right']));
});

test('every wave leaves a way through', () => {
    for (let run = 0; run < 50; run++) {
        for (const wave of planUpheaval(field, 80, rules)) {
            if (wave.kind === 'floor') {
                // Nothing rises in the gap, and the gap is wide enough to stand in
                assert.ok(wave.gap.right - wave.gap.left >= 80 * 1.7);
                for (const entry of wave.entries) {
                    assert.ok(entry.x < wave.gap.left || entry.x > wave.gap.right);
                    assert.ok(entry.vy < 0 && entry.vx === 0, 'columns rise straight up');
                    assert.ok(entry.y > field.height, 'from below the field');
                }
            } else {
                // One half of the band only: the other half is free
                const ys = new Set(wave.entries.map(entry => entry.y));
                assert.equal(ys.size, 1);
                const y = [...ys][0];
                const band = field.height - field.floorTop;
                assert.equal(y, field.floorTop + band * (wave.lane === 'high' ? 0.25 : 0.75));
                for (const entry of wave.entries) {
                    assert.equal(entry.vy, 0);
                    // Starting outside the field, flying in from its own edge
                    if (entry.from === 'left') assert.ok(entry.x < 0 && entry.vx > 0);
                    else assert.ok(entry.x > field.width && entry.vx < 0);
                }
            }
        }
    }
});

test('a narrow field still has at least three columns, one of them empty', () => {
    const [floor] = planUpheaval({ width: 360, height: 700, floorTop: 490 }, 80, rules, () => 0);
    assert.equal(floor.entries.length, 2);
});
