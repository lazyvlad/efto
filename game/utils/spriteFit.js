// Measures the visible artwork inside sprite images.
//
// The source images are inconsistent: some fill their whole canvas, others (weapons, spell
// effects) sit inside a lot of transparent padding, and a few aren't square. Drawing them all
// stretched to the same box makes padded art look much smaller than its neighbours. The sprite
// cache uses these bounds to trim the padding, so every sprite's visible artwork ends up the size
// the game asked for.

const ALPHA_THRESHOLD = 8;   // Pixels fainter than this (out of 255) count as empty
const MAX_SCAN_SIZE = 256;   // Large images are scanned at reduced resolution

const boundsCache = new WeakMap();

// Bounding box of the visible pixels of a loaded image, in source pixels: { x, y, width, height }
export function getContentBounds(image) {
    let entry = boundsCache.get(image);
    // Recompute if the image element has since loaded something else
    if (entry && entry.src === image.src) return entry.bounds;

    const bounds = measureContentBounds(image);
    boundsCache.set(image, { src: image.src, bounds });
    return bounds;
}

function measureContentBounds(image) {
    const sourceWidth = image.naturalWidth;
    const sourceHeight = image.naturalHeight;
    const full = { x: 0, y: 0, width: sourceWidth, height: sourceHeight };

    const scale = Math.min(1, MAX_SCAN_SIZE / Math.max(sourceWidth, sourceHeight));
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    let pixels;
    try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(image, 0, 0, width, height);
        pixels = ctx.getImageData(0, 0, width, height).data;
    } catch (e) {
        return full; // Can't read the pixels - draw the image untrimmed
    }

    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (pixels[(y * width + x) * 4 + 3] > ALPHA_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    if (maxX < 0) return full; // Fully transparent

    // Back to source pixels, widened by one scanned pixel so reduced-resolution scans never clip
    const x = Math.max(0, Math.floor((minX - 1) / scale));
    const y = Math.max(0, Math.floor((minY - 1) / scale));
    const right = Math.min(sourceWidth, Math.ceil((maxX + 2) / scale));
    const bottom = Math.min(sourceHeight, Math.ceil((maxY + 2) / scale));
    return { x, y, width: right - x, height: bottom - y };
}

// Measure pictures ahead of their first use, a few at a time while the browser is idle.
// Measuring reads a picture's pixels back, which can hold a frame up: done ahead, that never
// happens in the middle of the game, the first time an item falls.
export function measureAhead(images) {
    const waiting = images.filter(image => image && image.complete && image.naturalWidth);
    const later = window.requestIdleCallback || (callback => setTimeout(() => callback({ timeRemaining: () => 8 }), 50));

    const work = deadline => {
        while (waiting.length > 0 && deadline.timeRemaining() > 4) {
            getContentBounds(waiting.pop());
        }
        if (waiting.length > 0) later(work);
    };
    later(work);
}
