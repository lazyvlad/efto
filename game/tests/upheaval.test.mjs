// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/upheaval.js', import.meta.url));
const { planUpheaval, spanInBand, flyStep } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const rules = { waves: 5, warn: 45, rise: 1 / 150, train: 3 };

// Fields as the game has them: a desktop window, a small laptop, a phone on its side, a phone
// held upright. The hunter's band is the bottom 30%; a thing sent is about 84 px across at
// full size, the hunter about 94 px wide in his box at the same scale (both scale together).
const fields = [
    { width: 1920, height: 1080, floorTop: 756, size: 84, hunter: 94 },
    { width: 1280, height: 800, floorTop: 560, size: 66, hunter: 74 },
    { width: 900, height: 420, floorTop: 294, size: 44, hunter: 50 },
    { width: 390, height: 760, floorTop: 532, size: 50, hunter: 56 },
];

test('an Upheaval is the ground, one side, the other, the ground, then both sides', () => {
    const waves = planUpheaval(fields[0], 84, rules, null, () => 0.3);
    assert.deepEqual(waves.map(wave => wave.kind), ['floor', 'side', 'side', 'floor', 'both']);

    const [, first, second, , both] = waves;
    assert.ok(first.entries.every(entry => entry.from === first.entries[0].from));
    assert.notEqual(first.entries[0].from, second.entries[0].from, 'the two sides take turns');
    assert.deepEqual(new Set(both.entries.map(entry => entry.from)), new Set(['left', 'right']));
    // From the sides, things are hurled in from outside the field, high up
    for (const entry of [...first.entries, ...second.entries, ...both.entries]) {
        assert.ok(entry.x < 0 || entry.x > fields[0].width);
        assert.ok(entry.y < fields[0].floorTop - 84);
    }
});

test('every wave leaves a clear column the hunter fits in, that nothing comes through', () => {
    for (const field of fields) {
        for (let run = 0; run < 40; run++) {
            for (const wave of planUpheaval(field, field.size, rules)) {
                const clear = wave.gap.right - wave.gap.left;
                // Room to stand in: wider than the hunter, with some to spare
                assert.ok(clear >= field.hunter * 1.4, `${field.width}×${field.height}: a clear column of ${clear} for a hunter of ${field.hunter}`);

                for (const entry of wave.entries) {
                    const span = spanInBand(entry, field, field.size);
                    assert.ok(span, 'everything comes through his band');
                    // Nothing crosses into the clear column while it is in his band
                    assert.ok(span.right <= wave.gap.left + 1 || span.left >= wave.gap.right - 1,
                        `${field.width}×${field.height} ${wave.kind}: ${Math.round(span.left)}–${Math.round(span.right)} against the clear ${Math.round(wave.gap.left)}–${Math.round(wave.gap.right)}`);
                }
            }
        }
    }
});

test('a thing comes through the column it is marked for', () => {
    for (const field of fields) {
        for (const wave of planUpheaval(field, field.size, rules)) {
            for (const entry of wave.entries) {
                const span = spanInBand(entry, field, field.size);
                const middle = (span.left + span.right) / 2;
                assert.ok(Math.abs(middle - entry.lane) <= wave.slotWidth / 2, `${wave.kind} lands in its column`);
            }
        }
    }
});

test('the clear column moves from one wave to the next', () => {
    const waves = planUpheaval(fields[0], 84, rules, null, () => 0.5);
    for (let index = 1; index < waves.length; index++) {
        assert.notEqual(waves[index].gap.left, waves[index - 1].gap.left);
    }
});

test('one wave at a time: the next is marked only once the one before has gone through', () => {
    for (const field of fields) {
        const waves = planUpheaval(field, field.size, rules);
        assert.equal(waves[0].markAt, 0);
        for (const [index, wave] of waves.entries()) {
            assert.equal(wave.sendAt, wave.markAt + rules.warn, 'marked before it is sent');
            assert.ok(wave.clearAt > wave.sendAt);
            if (index > 0) assert.ok(wave.markAt >= waves[index - 1].clearAt);
            // And everything in it has truly gone through by then
            for (const entry of wave.entries) {
                const flight = { ...entry };
                for (let step = 0; step < wave.clearAt - wave.sendAt; step++) flyStep(flight, 1);
                const inBand = flight.y + field.size / 2 >= field.floorTop && flight.y - field.size / 2 <= field.height;
                assert.ok(!inBand, `${field.width}×${field.height} ${wave.kind} is through its band by clearAt`);
            }
        }
        // The whole Upheaval, in seconds (60 steps a second)
        const seconds = waves[waves.length - 1].clearAt / 60;
        assert.ok(seconds > 5 && seconds < 13, `${field.width}×${field.height}: ${seconds.toFixed(1)}s`);
    }
});

test('each clear column is within reach of the hunter, from where he stands and then from the one before', () => {
    for (const field of fields) {
        // As far as he runs while a wave is marked: 45 steps at his speed (12 a step at full size)
        const reach = 45 * 12 * field.size / 84;
        for (let run = 0; run < 40; run++) {
            const startX = Math.random() * field.width;
            let at = startX;
            for (const wave of planUpheaval(field, field.size, rules, { x: startX, reach })) {
                const middle = (wave.gap.left + wave.gap.right) / 2;
                const nearestOther = Math.min(...Array.from({ length: Math.round(field.width / wave.slotWidth) }, (_, slot) => wave.slotWidth * (slot + 0.5))
                    .filter(other => Math.abs(other - at) > wave.slotWidth / 2).map(other => Math.abs(other - at)));
                assert.ok(Math.abs(middle - at) <= Math.max(reach, nearestOther) + 0.01,
                    `${field.width}×${field.height}: from ${Math.round(at)} to ${Math.round(middle)}, reach ${Math.round(reach)}`);
                // And he has to move
                assert.ok(Math.abs(middle - at) > 1 || run < 0, 'not where he already is');
                at = middle;
            }
        }
    }
});
