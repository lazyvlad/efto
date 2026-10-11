// Cheap glow effects for the game canvas.
//
// Drawing an image with ctx.shadowBlur set runs a blur filter over it on every single draw, which
// makes glowing sprites the most expensive thing the renderer does per frame. drawImageGlow blurs
// each glow once into a small offscreen canvas and then just blits it, which looks the same and
// costs a fraction.
//
// This is only worth it for images. Shadows on stroked shapes (the circular item borders, the
// shield ring) are cheap for the browser to draw and measured slower when replaced with sprites,
// so those still use shadowBlur directly.
//
// All `blur` arguments use the same units as ctx.shadowBlur on the game canvas (device pixels),
// so values can be carried over unchanged from shadow-based drawing code.

const HALO_CACHE_LIMIT = 160;
const HALO_SIZE_STEP = 8;     // Cached halo sizes are rounded up to this and scaled to fit
const HALO_BLUR_STEP = 4;     // Animated blur values snap to this many pixels

const haloCache = new Map();

function getPixelRatio(ctx) {
    return ctx.canvas.dpr || 1;
}

function snapBlur(blur) {
    return Math.max(HALO_BLUR_STEP, Math.round(blur / HALO_BLUR_STEP) * HALO_BLUR_STEP);
}

// Least-recently-used lookup: returns the cached entry or creates (and stores) a new one
function getCached(cache, limit, key, create) {
    let entry = cache.get(key);
    if (entry) {
        // Refresh position so the least recently used entries are the ones evicted
        cache.delete(key);
        cache.set(key, entry);
        return entry;
    }

    entry = create();
    cache.set(key, entry);
    if (cache.size > limit) {
        cache.delete(cache.keys().next().value);
    }
    return entry;
}

// Soft glow behind a sprite, equivalent to drawing the image with ctx.shadowColor/shadowBlur set.
// Call it right before the matching ctx.drawImage(image, dx, dy, dw, dh).
// `image` is an <img> or a canvas from the sprite cache.
export function drawImageGlow(ctx, image, dx, dy, dw, dh, color, blur) {
    if (!(blur > 0) || !(dw > 0) || !(dh > 0)) return;

    const pixelRatio = getPixelRatio(ctx);
    const cachedWidth = Math.ceil(dw / HALO_SIZE_STEP) * HALO_SIZE_STEP;
    const cachedHeight = Math.ceil(dh / HALO_SIZE_STEP) * HALO_SIZE_STEP;
    const cachedBlur = snapBlur(blur);
    const key = `${image.spriteKey || image.src}|${cachedWidth}|${cachedHeight}|${color}|${cachedBlur}|${pixelRatio}`;
    const halo = getCached(haloCache, HALO_CACHE_LIMIT, key,
        () => renderHalo(image, cachedWidth, cachedHeight, color, cachedBlur / pixelRatio));

    const scaleX = dw / cachedWidth;
    const scaleY = dh / cachedHeight;
    ctx.drawImage(
        halo.canvas,
        dx - halo.padding * scaleX,
        dy - halo.padding * scaleY,
        halo.canvas.width * scaleX,
        halo.canvas.height * scaleY
    );
}

// Render only the shadow of the image (the image itself is drawn off-canvas).
// The halo is rendered at 1x: it is already blurred, so upscaling it on high-DPI screens is invisible.
function renderHalo(image, width, height, color, blur) {
    const padding = Math.ceil(blur * 1.5) + 2;
    const canvas = document.createElement('canvas');
    canvas.width = width + padding * 2;
    canvas.height = height + padding * 2;

    const haloCtx = canvas.getContext('2d');
    const offscreen = canvas.width + 10;
    haloCtx.shadowColor = color;
    haloCtx.shadowBlur = blur;
    haloCtx.shadowOffsetX = offscreen;
    haloCtx.drawImage(image, padding - offscreen, padding, width, height);

    return { canvas, padding };
}

const auraCache = new Map();

// Soft round aura centred on (cx, cy). `color` must be a #rrggbb hex colour.
// One small gradient is rendered per colour and scaled to whatever radius is asked for.
export function drawAura(ctx, cx, cy, radius, color, alpha = 1) {
    if (!(radius > 0) || !(alpha > 0)) return;

    let aura = auraCache.get(color);
    if (!aura) {
        const size = 128;
        aura = document.createElement('canvas');
        aura.width = aura.height = size;
        const auraCtx = aura.getContext('2d');
        const gradient = auraCtx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        // Strongest just outside the object's edge, fading to nothing at the rim
        gradient.addColorStop(0, `${color}59`);
        gradient.addColorStop(0.45, `${color}a6`);
        gradient.addColorStop(0.7, `${color}66`);
        gradient.addColorStop(0.88, `${color}1f`);
        gradient.addColorStop(1, `${color}00`);
        auraCtx.fillStyle = gradient;
        auraCtx.fillRect(0, 0, size, size);
        auraCache.set(color, aura);
    }

    const previousAlpha = ctx.globalAlpha;
    ctx.globalAlpha = previousAlpha * Math.min(1, alpha);
    ctx.drawImage(aura, cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.globalAlpha = previousAlpha;
}
