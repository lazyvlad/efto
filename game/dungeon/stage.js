// Where the board's cells are drawn on the dungeon's stage: a 1440 x 900 frame, scaled to the
// screen (dungeon/dungeonGame.js), the floor's three rows narrower the farther they are.

import { COLS, ROWS } from './rules.js';

// The stage is drawn in a 1440 x 900 frame, scaled to the screen. The floor's three rows, far to
// near: [width, height, top]
export const STAGE_W = 1440, STAGE_H = 900;
// Three rows with room between them, so a crowd at the druid still reads fighter by fighter
const FLOOR_TOP = 392;
const FLOOR_ROWS = [[1100, 82, 0], [1220, 94, 88], [1340, 108, 188]];
export const ROW_SCALE = [0.78, 0.89, 1];

export function cellRect(col, row) {
    const [w, h, top] = FLOOR_ROWS[row];
    const left = (STAGE_W - w) / 2;
    return { x: left + (w / COLS) * col, y: FLOOR_TOP + top, w: w / COLS, h };
}

export function cellFoot(col, row) {
    const r = cellRect(col, row);
    return { x: r.x + r.w / 2, y: r.y + r.h * 0.62 };
}

// The cell under a point of the stage, or null
export function cellAt(x, y) {
    for (let row = ROWS - 1; row >= 0; row--) {
        const r0 = cellRect(0, row);
        if (y < r0.y || y > r0.y + r0.h) continue;
        const col = Math.floor((x - r0.x) / r0.w);
        if (col >= 0 && col < COLS) return { col, row };
    }
    return null;
}

// "speed": how many times faster than real time it runs (for trying it out, ?speed=4)
