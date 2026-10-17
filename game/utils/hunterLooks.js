// The hunter's picture, put together from what he wears.
//
// Each hunter is a body in plain clothes, and every wearable item has a picture of itself on
// that body (data/hunterArt.js), all the same size and drawn at the same place: stacked in
// their order (below zero behind the body, the rest over it) they dress him. Then his face is
// put back as the body has it, so no helmet or collar ever covers it: the tauren's whole head
// (his cap and horns are his own, and nothing is drawn on it), the dwarf's face from a picture
// of his own. Based on the compositor that came with the art.
//
// A picture is made when what is worn changes, never while playing, and kept: the same outfit
// is not drawn twice. hunterPicture resolves to a canvas; the newest asked for wins, so an
// older one that finishes late never replaces it.

import { hunterArt } from '../data/hunterArt.js';
import { GAME_VERSION, BUILD_TIMESTAMP } from '../config/gameVersion.js';
import { ownerOf } from './locomotion.js';

const images = new Map();       // path -> Promise of a loaded image
const made = new Map();         // "side|item,item" -> Promise of a canvas
const MOST_KEPT = 12;

function load(path) {
    if (!images.has(path)) {
        images.set(path, new Promise((resolve, reject) => {
            const image = new Image();
            image.decoding = 'async';
            image.onload = () => resolve(image);
            image.onerror = () => {
                images.delete(path);
                reject(new Error(`No picture at ${path}`));
            };
            // With the game's build: a picture redrawn under the same name is fetched anew with
            // the next build, not taken from the browser's cache (the version alone stays the
            // same through the builds of a release, and the server says nothing of how long
            // to keep these pictures)
            image.src = `${path}?v=${GAME_VERSION}.${BUILD_TIMESTAMP}`;
        }));
    }
    return images.get(path);
}

// Draw "image" over the canvas, but only inside the shapes (and outside "except")
function restore(context, image, shapes, except = []) {
    if (!shapes || shapes.length === 0) return;
    const size = hunterArt.canvas;

    context.save();
    context.beginPath();
    for (const shape of shapes) {
        shape.forEach(([x, y], index) => (index ? context.lineTo(x * size, y * size) : context.moveTo(x * size, y * size)));
        context.closePath();
    }
    context.clip();
    if (except.length) {
        context.beginPath();
        context.rect(0, 0, size, size);
        for (const shape of except) {
            shape.forEach(([x, y], index) => (index ? context.lineTo(x * size, y * size) : context.moveTo(x * size, y * size)));
            context.closePath();
        }
        context.clip('evenodd');
    }
    context.globalCompositeOperation = 'copy';
    context.drawImage(image, 0, 0, size, size);
    context.restore();
}

// What is drawn for an outfit, in the order it is drawn; each part says how it moves as he
// steps (utils/locomotion.js ownerOf), by the slot it is worn in
function layersFor(side, equipment) {
    const owners = new Map();
    for (const [slot, id] of Object.entries(equipment || {})) if (id) owners.set(hunterArt.aliases[id] || id, ownerOf(slot));
    const ids = [...owners.keys()];
    return ids.flatMap(itemId => ((hunterArt.items[itemId] && hunterArt.items[itemId][side]) || []).map(part => ({ ...part, owner: owners.get(itemId) })))
        .sort((a, b) => a.order - b.order || (a.stack || 0) - (b.stack || 0) || a.layer.localeCompare(b.layer));
}

async function compose(side, layers) {
    const body = hunterArt.characters[side];
    const [base, facePicture, ...pictures] = await Promise.all([
        load(body.base),
        load(body.faceSource),
        // A picture that will not load is left out rather than leaving him undressed
        ...layers.map(part => load(part.layer).catch(() => null)),
    ]);

    const size = hunterArt.canvas;
    const blank = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        return canvas;
    };

    // In the order drawn: behind him, his body, over him. Next to each other, what moves alike
    // is drawn on one picture (a "run"), for him to step in (classes/CharacterAnimator.js)
    const drawn = [
        ...layers.map((part, index) => ({ part, picture: pictures[index] })).filter(({ part, picture }) => part.order < 0 && picture),
        { part: { owner: 'body' }, picture: base },
        ...layers.map((part, index) => ({ part, picture: pictures[index] })).filter(({ part, picture }) => part.order >= 0 && picture),
    ];
    const runs = [];
    for (const { part, picture } of drawn) {
        if (!runs.length || runs[runs.length - 1].owner !== part.owner) runs.push({ owner: part.owner, canvas: blank() });
        runs[runs.length - 1].canvas.getContext('2d').drawImage(picture, 0, 0, size, size);
    }

    // The face as the body has it: over everything, on the top run, and nothing of any run
    // below it showing through
    const face = context => {
        if (body.headClear) {
            restore(context, base, body.headClear);
        } else if (layers.length) {
            restore(context, base, body.earProtection);
            restore(context, facePicture, [body.faceLock], body.earProtection || []);
        }
    };
    const head = body.headClear || (layers.length ? [...(body.earProtection || []), body.faceLock] : []);
    runs.slice(0, -1).forEach(run => clear(run.canvas.getContext('2d'), head));
    face(runs[runs.length - 1].canvas.getContext('2d'));

    // And the whole of him on one picture, for what shows him standing still
    const canvas = blank();
    const context = canvas.getContext('2d');
    for (const run of runs) context.drawImage(run.canvas, 0, 0);
    canvas.runs = runs;
    return canvas;
}

// Clear what is inside the shapes
function clear(context, shapes) {
    if (!shapes || !shapes.length) return;
    const size = hunterArt.canvas;
    context.save();
    context.beginPath();
    for (const shape of shapes) {
        shape.forEach(([x, y], index) => (index ? context.lineTo(x * size, y * size) : context.moveTo(x * size, y * size)));
        context.closePath();
    }
    context.clip();
    context.clearRect(0, 0, size, size);
    context.restore();
}

/**
 * The hunter of a side dressed in an outfit.
 * @param {string} side - 'alliance' or 'horde'
 * @param {Object} equipment - { slotId: itemId }
 * @returns {Promise<HTMLCanvasElement>}
 */
export function hunterPicture(side, equipment) {
    if (!hunterArt.characters[side]) return Promise.reject(new Error(`No hunter for ${side}`));

    const layers = layersFor(side, equipment);
    const key = `${side}|${layers.map(part => part.layer).join(',')}`;
    if (!made.has(key)) {
        made.set(key, compose(side, layers).catch(error => {
            made.delete(key);
            throw error;
        }));
        // Keep the last few outfits only
        while (made.size > MOST_KEPT) made.delete(made.keys().next().value);
    }
    return made.get(key);
}

// Whether the art of an item is known (worn without being seen is known too)
export function hasLooks(itemId) {
    return Object.prototype.hasOwnProperty.call(hunterArt.items, hunterArt.aliases[itemId] || itemId);
}

/**
 * The hunter as he is drawn while he fights hand to hand (systems/meleeSystem.js): everything
 * of his outfit that does not move with his arms. Three pictures on the usual canvas: "rear"
 * (his cloak, quiver and bow, behind him, but not the weapon he holds, nor his offhand),
 * "body" (his plain melee body, the torso parts of what he wears on his arms, and everything
 * else he wears, each in its order, his face as ever), and "front" (his shoulder pieces, over
 * the roots of his arms).
 * @param {string} side
 * @param {Object} equipment   { slotId: itemId }
 * @param {object} art         { body: path, torso: [{ path, order }], front: [{ path, order }],
 *                             moving: itemId => true for what is drawn in moving parts instead,
 *                             held: the slots of what he holds (his weapons, unless said) }
 * @returns {Promise<{rear: HTMLCanvasElement, body: HTMLCanvasElement, front: HTMLCanvasElement}>}
 */
export async function meleePlates(side, equipment, art) {
    const character = hunterArt.characters[side];
    const size = hunterArt.canvas;
    // What he holds is drawn in his hands, not on him: his weapons as he fights, his ranged
    // weapon as he shoots ("held": the slots, art.held)
    const holding = art.held || ['mainhand', 'offhand'];
    const held = slot => holding.includes(slot);
    const worn = Object.fromEntries(Object.entries(equipment || {}).filter(([slot, itemId]) => itemId && !held(slot)));
    const rearLayers = layersFor(side, worn).filter(part => part.order < 0);
    const still = Object.fromEntries(Object.entries(worn).filter(([, itemId]) => !art.moving(hunterArt.aliases[itemId] || itemId)));
    // What he wears that does not move, and the torso parts of what does, in their order
    const bodyLayers = [
        // A piece may have a picture of its own for melee, whole under the moving arms (the
        // standing one leaves room for the open hand)
        ...layersFor(side, still).filter(part => part.order >= 0).map(part => ({ path: part.meleeLayer || part.layer, order: part.order, owner: part.owner })),
        ...art.torso.map(part => ({ ...part, owner: 'body' })),
    ].sort((a, b) => a.order - b.order);
    const frontLayers = [...art.front].sort((a, b) => a.order - b.order);

    const paths = [...rearLayers.map(part => part.layer), ...bodyLayers.map(part => part.path), ...frontLayers.map(part => part.path)];
    const [body, base, face, ...pictures] = await Promise.all([
        load(art.body),
        load(character.base),
        load(character.faceSource),
        ...paths.map(path => load(path).catch(() => null)),
    ]);
    const pictureOf = path => pictures[paths.indexOf(path)];
    const plate = draw => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        draw(canvas.getContext('2d'));
        return canvas;
    };
    const stack = (context, list) => list.forEach(path => pictureOf(path) && context.drawImage(pictureOf(path), 0, 0, size, size));

    // Next to each other, what moves alike as he steps on one picture (a "run", as compose
    // makes them), and the plate itself all of them in order
    const runsOf = list => {
        const runs = [];
        for (const { owner, picture } of list) {
            if (!picture) continue;
            if (!runs.length || runs[runs.length - 1].owner !== owner) runs.push({ owner, canvas: plate(() => {}) });
            runs[runs.length - 1].canvas.getContext('2d').drawImage(picture, 0, 0, size, size);
        }
        return runs;
    };
    const flat = runs => {
        const canvas = plate(context => runs.forEach(run => context.drawImage(run.canvas, 0, 0)));
        canvas.runs = runs;
        return canvas;
    };
    const rearRuns = runsOf(rearLayers.map(part => ({ owner: part.owner, picture: pictureOf(part.layer) })));
    const bodyRuns = runsOf([{ owner: 'body', picture: body }, ...bodyLayers.map(part => ({ owner: part.owner, picture: pictureOf(part.path) }))]);
    // His face as ever, on the top run, nothing of a run below showing through
    const head = character.headClear || [...(character.earProtection || []), character.faceLock];
    bodyRuns.slice(0, -1).forEach(run => clear(run.canvas.getContext('2d'), head));
    const top = bodyRuns[bodyRuns.length - 1].canvas.getContext('2d');
    if (character.headClear) {
        restore(top, base, character.headClear);
    } else {
        restore(top, base, character.earProtection);
        restore(top, face, [character.faceLock], character.earProtection || []);
    }

    return {
        rear: flat(rearRuns),
        body: flat(bodyRuns),
        front: plate(context => stack(context, frontLayers.map(part => part.path))),
    };
}

// A picture, loaded once (with the game's version, as every picture of his)
export function loadLook(path) {
    return load(path);
}
