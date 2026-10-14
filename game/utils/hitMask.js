// The hunter's shape, for what hurts him: a coarse grid over his picture, a cell set where
// anything of him is drawn (his gear too: a cape, a bow, a weapon held out). Thrown things,
// a charge and a burst hit him only where he is; catching things still uses his box
// (classes/Player.js).
//
// The grid is made once for each picture (a new outfit is a new picture) and laid over the
// figure where it is drawn. The little the animation moves him (breathing, a lean, a flinch) is
// left out.

const ROWS = 48;            // Cells down the picture (and across, for a square one)
const SOLID = 0.25;         // A cell is him if this much of it is drawn

/**
 * The grid of a picture's see-through-ness.
 * @param {Uint8ClampedArray|number[]} alpha - One value (0-255) per cell, row by row: the
 *        picture drawn small, at one pixel a cell, so each is the average of what it covers
 * @param {number} cols
 * @param {number} rows
 * @returns {{ cols: number, rows: number, cells: Uint8Array }}
 */
export function maskFromAlpha(alpha, cols, rows, solid = SOLID) {
    const cells = new Uint8Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) cells[i] = alpha[i] >= solid * 255 ? 1 : 0;
    return { cols, rows, cells };
}

/**
 * The grid of a picture (an image or a canvas, loaded), or null if it cannot be read.
 */
export function maskOfPicture(picture) {
    const width = picture.naturalWidth || picture.width;
    const height = picture.naturalHeight || picture.height;
    if (!width || !height || typeof document === 'undefined') return null;

    const rows = ROWS;
    const cols = Math.max(1, Math.round(ROWS * width / height));
    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(picture, 0, 0, cols, rows);

    try {
        const pixels = context.getImageData(0, 0, cols, rows).data;
        const alpha = new Uint8ClampedArray(cols * rows);
        for (let i = 0; i < alpha.length; i++) alpha[i] = pixels[i * 4 + 3];
        return maskFromAlpha(alpha, cols, rows);
    } catch (e) {
        return null;    // A picture from elsewhere cannot be read: his box stands in
    }
}

/**
 * Whether a rectangle on the screen touches him.
 * @param {Object} mask - From maskOfPicture
 * @param {Object} placed - Where the picture is drawn: { left, top, width, height }
 * @param {Object} rect - { x, y, width, height }
 */
export function maskHitsRect(mask, placed, rect) {
    const cellWidth = placed.width / mask.cols;
    const cellHeight = placed.height / mask.rows;
    const firstCol = Math.max(0, Math.floor((rect.x - placed.left) / cellWidth));
    const lastCol = Math.min(mask.cols - 1, Math.floor((rect.x + rect.width - placed.left) / cellWidth));
    const firstRow = Math.max(0, Math.floor((rect.y - placed.top) / cellHeight));
    const lastRow = Math.min(mask.rows - 1, Math.floor((rect.y + rect.height - placed.top) / cellHeight));

    for (let row = firstRow; row <= lastRow; row++) {
        for (let col = firstCol; col <= lastCol; col++) {
            if (mask.cells[row * mask.cols + col]) return true;
        }
    }
    return false;
}

/**
 * Whether a circle on the screen (a burst) touches him: any cell of his whose middle is within
 * it, or within half a cell of its edge.
 */
export function maskHitsCircle(mask, placed, x, y, radius) {
    const cellWidth = placed.width / mask.cols;
    const cellHeight = placed.height / mask.rows;
    const reach = radius + Math.max(cellWidth, cellHeight) / 2;
    const firstCol = Math.max(0, Math.floor((x - reach - placed.left) / cellWidth));
    const lastCol = Math.min(mask.cols - 1, Math.floor((x + reach - placed.left) / cellWidth));
    const firstRow = Math.max(0, Math.floor((y - reach - placed.top) / cellHeight));
    const lastRow = Math.min(mask.rows - 1, Math.floor((y + reach - placed.top) / cellHeight));

    for (let row = firstRow; row <= lastRow; row++) {
        for (let col = firstCol; col <= lastCol; col++) {
            if (!mask.cells[row * mask.cols + col]) continue;
            const middleX = placed.left + (col + 0.5) * cellWidth;
            const middleY = placed.top + (row + 0.5) * cellHeight;
            if (Math.hypot(middleX - x, middleY - y) <= reach) return true;
        }
    }
    return false;
}
