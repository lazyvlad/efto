import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/hitMask.js', import.meta.url));
const { maskFromAlpha, maskHitsRect, maskHitsCircle } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

// A 4 x 4 picture with only its lower middle drawn (like legs), laid over 400 x 400 pixels:
// cells are 100 pixels, and the drawn ones are the two in the middle of each of the last rows
//   . . . .
//   . . . .
//   . X X .
//   . X X .
const alpha = [
    0, 0, 0, 0,
    0, 0, 0, 0,
    0, 255, 255, 0,
    0, 40, 200, 0,
];
const mask = maskFromAlpha(alpha, 4, 4);
const placed = { left: 0, top: 0, width: 400, height: 400 };

test('a cell is part of him when enough of it is drawn', () => {
    // 40 of 255 is less than a quarter: not him
    assert.deepEqual([...mask.cells], [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0]);
});

test('something that hurts reaches him only where he is drawn', () => {
    // Over the empty top half of his box: a miss, where his box would have been hit
    assert.equal(maskHitsRect(mask, placed, { x: 120, y: 20, width: 60, height: 60 }), false);
    // On his drawn middle
    assert.equal(maskHitsRect(mask, placed, { x: 150, y: 250, width: 20, height: 20 }), true);
    // Beside him, in the empty corner of his picture
    assert.equal(maskHitsRect(mask, placed, { x: 10, y: 310, width: 50, height: 50 }), false);
    // Just touching a drawn cell's edge counts
    assert.equal(maskHitsRect(mask, placed, { x: 50, y: 210, width: 51, height: 10 }), true);
    // Off the picture altogether
    assert.equal(maskHitsRect(mask, placed, { x: 500, y: 500, width: 40, height: 40 }), false);
});

test('the picture is laid where it is drawn', () => {
    const moved = { left: 1000, top: 500, width: 200, height: 200 };
    // Cells are 50 pixels now; the drawn ones start 50 across and 100 down
    assert.equal(maskHitsRect(mask, moved, { x: 1060, y: 610, width: 10, height: 10 }), true);
    assert.equal(maskHitsRect(mask, moved, { x: 60, y: 260, width: 10, height: 10 }), false);
});

test('a burst reaches him if it comes within half a cell of something of him', () => {
    // The drawn cell at column 1, row 2 has its middle at 150, 250
    assert.equal(maskHitsCircle(mask, placed, 150, 150, 60), true);   // 100 off: within 60 + 50
    assert.equal(maskHitsCircle(mask, placed, 150, 50, 60), false);   // 200 off
    assert.equal(maskHitsCircle(mask, placed, 380, 20, 100), false);  // the empty corner
});
