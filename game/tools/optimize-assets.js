#!/usr/bin/env node
/**
 * Asset optimizer
 *
 * Resizes sprite images that are much larger than the game ever shows them. Several source
 * images are 500-1000px paintings that end up on screen at 40-200px; shipping them at full size
 * only costs download time and memory.
 *
 * How big each image needs to be is worked out from the game's own data: the base size of its
 * category (item / power-up / projectile / player), its rarity or size_multiplier, and the highest pixel
 * density the canvas renders at. The visible artwork (ignoring transparent padding) is scaled to
 * that size; the file keeps its name, format and proportions, so nothing else has to change.
 *
 * Images the game data doesn't size (UI icons, spares that aren't wired in yet) are capped at
 * 512px on their longest side instead. Backgrounds and share images are never resized.
 *
 * Usage:
 *   node tools/optimize-assets.js                      Report what would change (writes nothing)
 *   node tools/optimize-assets.js --dir dist --write   Optimize the images in a build output folder
 *   node tools/optimize-assets.js --in-place --write   Overwrite the source images themselves
 *
 * Options:
 *   --dir <path>      Folder containing assets/ to process (default: project root)
 *   --write           Actually write files (without it, only a report is printed)
 *   --in-place        Required together with --write to overwrite the project's source images
 *   --density <n>     Pixel density to keep detail for (default: 2, the canvas maximum)
 *   --quiet           Only print the summary
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// Largest on-screen size of each sprite category, in game units, before any size multiplier.
// These mirror calculateElementSizes() in utils/gameUtils.js at a uniform scale of 1.0, which is
// above what any current device layout produces.
const BASE_SIZES = {
    item: 70,
    powerUp: 80,
    projectile: 60,
    player: 125
};

const ALPHA_THRESHOLD = 8;      // Same as utils/spriteFit.js: fainter pixels count as empty
const MIN_TARGET = 64;          // Never shrink artwork below this many pixels
const UNSIZED_MAX = 512;        // Longest side allowed for images the game data doesn't size
const NEVER_RESIZE = /^assets\/ui\/|^assets\/bosses\/|^assets\/attacks\/|^assets\/player\/(pajama-hunter|horde-tauren)|background|social/i; // Full-screen and share images, and the boss, attack and player-figure pictures (already sized when added)
const WORTHWHILE_SCALE = 0.9;   // Leave images alone unless they'd shrink by at least 10%
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const ASSET_FOLDER = 'assets';
const REFERENCE_SOURCES = ['index.html', 'test-mobile.html', 'game-modular.js', 'site.webmanifest',
    'classes', 'systems', 'ui', 'utils', 'data', 'config', 'styles'];

function parseArgs(argv) {
    const options = { dir: PROJECT_ROOT, write: false, inPlace: false, density: 2, quiet: false };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--write') options.write = true;
        else if (arg === '--in-place') options.inPlace = true;
        else if (arg === '--quiet') options.quiet = true;
        else if (arg === '--dir') options.dir = path.resolve(argv[++i] || '');
        else if (arg === '--density') options.density = Number(argv[++i]);
        else if (arg === '--help' || arg === '-h') options.help = true;
        else throw new Error(`Unknown option: ${arg}`);
    }
    if (!(options.density > 0)) throw new Error('--density must be a positive number');
    return options;
}

// The game's data files are browser ES modules. Copy them somewhere Node will treat them as
// modules and import them, so sizes always come from the real game data rather than a copy here.
async function loadGameData() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'efto-assets-'));
    // The config works out its base path from the page URL when it loads
    const hadWindow = 'window' in globalThis;
    if (!hadWindow) globalThis.window = { location: { pathname: '/', hostname: 'localhost', origin: 'http://localhost' } };
    try {
        for (const folder of ['data', 'config']) {
            fs.cpSync(path.join(PROJECT_ROOT, folder), path.join(tempDir, folder), { recursive: true });
        }
        // serverConfig.js is generated per deployment and may not exist in a fresh checkout
        const serverConfig = path.join(tempDir, 'config', 'serverConfig.js');
        if (!fs.existsSync(serverConfig)) {
            fs.copyFileSync(path.join(tempDir, 'config', 'serverConfig.example.js'), serverConfig);
        }
        fs.writeFileSync(path.join(tempDir, 'package.json'), '{"type":"module"}');

        const load = file => import(pathToFileURL(path.join(tempDir, file)).href);
        const [{ assetRegistry }, { gameConfig }, { gameItems }, { powerUpItems }, { damageProjectiles }] = await Promise.all([
            load('data/assetRegistry.js'), load('config/gameConfig.js'), load('data/gameItems.js'),
            load('data/powerUpItems.js'), load('data/damageProjectiles.js')
        ]);
        return { assetRegistry, gameConfig, gameItems, powerUpItems, damageProjectiles };
    } finally {
        if (!hadWindow) delete globalThis.window;
        fs.rmSync(tempDir, { recursive: true, force: true });
    }
}

// Map of image path -> { size: largest on-screen size in game units, usedBy: [names] }
function collectSpriteSizes({ assetRegistry, gameConfig, gameItems, powerUpItems, damageProjectiles }) {
    const sprites = new Map();
    const add = (image, size, usedBy) => {
        if (typeof image !== 'string' || !image) return;
        const entry = sprites.get(image) || { size: 0, usedBy: [] };
        entry.size = Math.max(entry.size, size);
        entry.usedBy.push(usedBy);
        sprites.set(image, entry);
    };

    // Items are sized by rarity; thin artwork is drawn larger, so allow for that boost everywhere
    const { sizeByType, thinArtBoost = 1 } = gameConfig.items;
    for (const item of gameItems) add(item.image, BASE_SIZES.item * (sizeByType[item.type] || 1) * thinArtBoost, item.id);
    for (const powerUp of powerUpItems) add(powerUp.image, BASE_SIZES.powerUp * (gameConfig.items.powerUpSize || 1), powerUp.id);
    for (const projectile of damageProjectiles) add(projectile.image, BASE_SIZES.projectile * (projectile.size_multiplier || 1), projectile.id);
    for (const [state, image] of Object.entries(assetRegistry.player || {})) add(image, BASE_SIZES.player, `player ${state}`);

    return sprites;
}

// Bounding box of the visible pixels, as a fraction of the image's longest visible side
async function measureContent(sharp, file) {
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height, channels } = info;

    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (data[(y * width + x) * channels + 3] > ALPHA_THRESHOLD) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }

    const contentWidth = maxX < 0 ? width : maxX - minX + 1;
    const contentHeight = maxY < 0 ? height : maxY - minY + 1;
    return { width, height, contentWidth, contentHeight };
}

function encode(pipeline, extension) {
    switch (extension) {
        case '.png': return pipeline.png({ compressionLevel: 9, effort: 10 });
        // effort 4: effort 6 takes about 70 times longer on a picture with transparency for files 5% smaller
        case '.webp': return pipeline.webp({ quality: 90, alphaQuality: 100, effort: 4 });
        default: return pipeline.jpeg({ quality: 88, mozjpeg: true });
    }
}

// Every image under assets/, as paths relative to dir (e.g. "assets/items/gold.png")
function listImages(dir) {
    const files = [];
    const walk = relative => {
        const folderPath = path.join(dir, relative);
        if (!fs.existsSync(folderPath)) return;
        for (const entry of fs.readdirSync(folderPath, { withFileTypes: true })) {
            const entryPath = `${relative}/${entry.name}`;
            if (entry.isDirectory()) walk(entryPath);
            else if (IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
        }
    };
    walk(ASSET_FOLDER);
    return files;
}

// Images that no source file mentions yet. Reported only - this tool never deletes anything.
function findUnreferencedImages() {
    let haystack = '';
    const read = target => {
        if (!fs.existsSync(target)) return;
        if (fs.statSync(target).isDirectory()) {
            for (const name of fs.readdirSync(target)) read(path.join(target, name));
        } else if (/\.(js|html|css|json|webmanifest)$/.test(target)) {
            haystack += fs.readFileSync(target, 'utf8');
        }
    };
    REFERENCE_SOURCES.forEach(source => read(path.join(PROJECT_ROOT, source)));

    return listImages(PROJECT_ROOT)
        .filter(image => !haystack.includes(image))
        .map(image => ({ image, bytes: fs.statSync(path.join(PROJECT_ROOT, image)).size }))
        .sort((a, b) => b.bytes - a.bytes);
}

function formatBytes(bytes) {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)}MB` : `${Math.round(bytes / 1024)}KB`;
}

/**
 * Optimize (or just report on) the sprite images under options.dir.
 * Returns { results, savedBytes, unreferenced }.
 */
async function optimizeAssets(options = {}) {
    const { dir = PROJECT_ROOT, write = false, density = 2, quiet = false, log = console.log } = options;

    let sharp;
    try {
        sharp = require('sharp');
    } catch (e) {
        throw new Error('The "sharp" package is required. Run: npm install');
    }
    // Always read files fresh: with --write the same path is read and then replaced
    sharp.cache(false);

    const sprites = collectSpriteSizes(await loadGameData());
    const results = [];

    // Resize one file so its visible artwork's longest side becomes `target` pixels
    const resizeTo = async (image, target, details) => {
        const file = path.join(dir, image);
        const extension = path.extname(image).toLowerCase();
        const originalBytes = fs.statSync(file).size;
        const content = await measureContent(sharp, file);
        const scale = target / Math.max(content.contentWidth, content.contentHeight);
        const result = { image, originalBytes, target, from: `${content.width}x${content.height}`, ...details };

        if (scale >= WORTHWHILE_SCALE) {
            results.push({ ...result, status: 'ok' });
            return;
        }

        const width = Math.max(1, Math.round(content.width * scale));
        const height = Math.max(1, Math.round(content.height * scale));
        const buffer = await encode(sharp(file).resize(width, height, { kernel: 'lanczos3' }), extension).toBuffer();

        if (buffer.length >= originalBytes) {
            results.push({ ...result, status: 'ok' });
            return;
        }

        if (write) fs.writeFileSync(file, buffer);
        results.push({ ...result, status: write ? 'resized' : 'would resize', to: `${width}x${height}`, newBytes: buffer.length });
    };

    // Sprites the game data gives a size to
    for (const [image, { size, usedBy }] of [...sprites].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (!fs.existsSync(path.join(dir, image))) {
            results.push({ image, status: 'missing', usedBy });
            continue;
        }
        if (!IMAGE_EXTENSIONS.has(path.extname(image).toLowerCase())) continue;
        // Pictures sized by hand when they were added stay as they are
        if (NEVER_RESIZE.test(image)) continue;

        await resizeTo(image, Math.max(MIN_TARGET, Math.ceil(size * density)), { usedBy, sized: true });
    }

    // Everything else: just make sure nothing is unreasonably large
    for (const image of listImages(dir).sort()) {
        if (sprites.has(image) || NEVER_RESIZE.test(image)) continue;
        await resizeTo(image, UNSIZED_MAX, { sized: false });
    }

    const changed = results.filter(r => r.newBytes !== undefined);
    const savedBytes = changed.reduce((sum, r) => sum + r.originalBytes - r.newBytes, 0);
    const unreferenced = path.resolve(dir) === PROJECT_ROOT ? findUnreferencedImages() : [];

    if (!quiet) {
        for (const r of changed) {
            const reason = r.sized ? `shown at up to ${r.target}px` : `not sized by game data, capped at ${r.target}px`;
            log(`  ${r.image.padEnd(36)} ${r.from.padStart(9)} -> ${r.to.padEnd(9)} ${formatBytes(r.originalBytes).padStart(7)} -> ${formatBytes(r.newBytes).padEnd(6)} (${reason})`);
        }
        for (const r of results.filter(r => r.status === 'missing')) {
            log(`  ${r.image.padEnd(36)} MISSING (used by ${r.usedBy.join(', ')})`);
        }
        if (unreferenced.length) {
            log('\n  Images that nothing in the source refers to yet (kept, and included in builds):');
            for (const u of unreferenced) log(`    ${u.image.padEnd(36)} ${formatBytes(u.bytes).padStart(7)}`);
        }
    }

    const alreadyFine = results.filter(r => r.status === 'ok').length;
    log(`\n  ${changed.length} image(s) ${write ? 'resized' : 'would be resized'}, saving ${formatBytes(savedBytes)}; ${alreadyFine} already a sensible size.`);
    if (!write && changed.length) log('  Nothing was written. Add --write (with --dir <build folder> or --in-place) to apply.');

    return { results, savedBytes, unreferenced };
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
        console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0].replace(/^#!.*\n\/\*\*\n?/, '').replace(/^ \* ?/gm, ''));
        return;
    }

    const targetsSources = path.resolve(options.dir) === PROJECT_ROOT;
    if (options.write && targetsSources && !options.inPlace) {
        throw new Error('Refusing to overwrite the source images.\n' +
            '  Optimize a build instead:      --dir dist --write\n' +
            '  Or overwrite the originals:    --in-place --write');
    }

    console.log(`Asset optimizer - ${options.write ? 'writing to' : 'report for'} ${path.relative(process.cwd(), options.dir) || '.'} (density ${options.density}x)\n`);
    await optimizeAssets(options);
}

if (require.main === module) {
    main().catch(error => {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    });
}

module.exports = { optimizeAssets };
