// Pre-rendered sprites for the game canvas.
//
// Source images are anything from 56px icons to 1024px paintings, and they end up on screen at
// roughly 40-200px. Instead of trimming and rescaling the source on every frame, getSprite renders
// each image once at exactly the size it is shown at (in device pixels) and hands back that small
// canvas, so drawing an entity is a plain copy. Big sources are reduced in steps, which looks
// cleaner than one large downscale.

import { getContentBounds } from './spriteFit.js';

const SPRITE_CACHE_LIMIT = 200;

const spriteCache = new Map();

// The image trimmed of transparent padding and fitted, undistorted, inside a boxWidth x boxHeight
// box. Returns { canvas, width, height }: draw `canvas` at width x height (game units), centred
// wherever the box is centred. Sizes that animate (pulsing) should ask for the resting size and
// scale the result when drawing, so they share one cached sprite.
export function getSprite(ctx, image, boxWidth, boxHeight) {
    const pixelRatio = ctx.canvas.dpr || 1;
    const bounds = getContentBounds(image);
    const scale = Math.min(boxWidth / bounds.width, boxHeight / bounds.height);
    const width = bounds.width * scale;
    const height = bounds.height * scale;
    const pixelWidth = Math.max(1, Math.round(width * pixelRatio));
    const pixelHeight = Math.max(1, Math.round(height * pixelRatio));

    const key = `${image.src}|${pixelWidth}x${pixelHeight}`;
    let canvas = spriteCache.get(key);
    if (canvas) {
        // Refresh position so the least recently used sprites are the ones evicted
        spriteCache.delete(key);
    } else {
        canvas = renderSprite(image, bounds, pixelWidth, pixelHeight);
        canvas.spriteKey = key; // Lets the glow cache tell sprites apart
        if (spriteCache.size >= SPRITE_CACHE_LIMIT) {
            spriteCache.delete(spriteCache.keys().next().value);
        }
    }
    spriteCache.set(key, canvas);

    return { canvas, width, height };
}

function createCanvas(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    return { canvas, ctx };
}

function renderSprite(image, bounds, pixelWidth, pixelHeight) {
    let source = image;
    let sx = bounds.x, sy = bounds.y, sw = bounds.width, sh = bounds.height;

    // Halve repeatedly until within 2x of the target; each step averages neighbouring pixels,
    // which avoids the shimmer of shrinking a large image in one go
    while (sw > pixelWidth * 2 && sh > pixelHeight * 2) {
        const halfWidth = Math.ceil(sw / 2);
        const halfHeight = Math.ceil(sh / 2);
        const step = createCanvas(halfWidth, halfHeight);
        step.ctx.drawImage(source, sx, sy, sw, sh, 0, 0, halfWidth, halfHeight);
        source = step.canvas;
        sx = 0; sy = 0; sw = halfWidth; sh = halfHeight;
    }

    const sprite = createCanvas(pixelWidth, pixelHeight);
    sprite.ctx.drawImage(source, sx, sy, sw, sh, 0, 0, pixelWidth, pixelHeight);
    return sprite.canvas;
}
