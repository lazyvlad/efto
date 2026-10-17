// The hunter's melee: when he takes his weapon in hand, what his swing hits, and how he is
// drawn meanwhile. The rules are under "melee" in config/gameConfig.js, the art and how it
// hangs together in data/melee.js, the swing's own clock in utils/meleeMotion.js.
//
// It is all on its own: when something to hit comes into reach (a creature that has closed
// in, a boss that has come down at him) he takes the weapon off his back and swings, and
// after each swing he must wait (melee.cooldown). With nothing in reach for a moment he puts
// it away. Arrows go on as ever meanwhile.
//
// Only with a main-hand weapon that has a whole picture to swing, in the clothes his melee
// body is painted in (or nothing in their slots); else he keeps to his bow and none of this
// happens.

import { gameConfig } from '../config/gameConfig.js';
import { CombatText } from '../classes/CombatText.js';
import { Particle } from '../classes/Particle.js';
import { meleeRigs, meleeWeapons, meleeBodies, meleeArmor, meleeAliases, meleeArtPath, meleeWeaponImage, meleeRest, meleeOffhands, meleeRanged } from '../data/melee.js';
import { hunterArt } from '../data/hunterArt.js';
import { MeleeState, armsFor, offhandArm, rangedArms } from '../utils/meleeMotion.js';
import { CharacterAnimator } from '../classes/CharacterAnimator.js';
import { characterFor } from '../data/playerCharacters.js';
import { STRIDE } from '../utils/locomotion.js';
import { meleePlates, loadLook } from '../utils/hunterLooks.js';
import { bossMeleeBox, meleeStrikeBoss } from './bossSystem.js';
import { getCurrentTotalCritRating } from './statEffectsSystem.js';
import { playFireballImpactSound } from './audioSystem.js';

const STEP_MS = 1000 / 60;
const melee = new MeleeState();
// The slots whose pieces are on his arms: each needs melee art of its own (data/melee.js)
const ARM_SLOTS = ['chest', 'shirt', 'shoulder', 'wrist', 'hands'];

let swingAt = null;         // What his swing under way was aimed at
let outfitKey = '';         // What the pictures below were made for
let look = null;            // { side, weaponId, plates, limbs, hands, cuffs, weapon } once all have loaded
const pieces = new Map();   // path + area -> Promise of a cut-out part
const weaponPictures = new Map();

// A part's painted area cut out of its canvas, with where it was: drawn far faster than the
// whole canvas every frame
function piece([file, [left, top, right, bottom]]) {
    const key = `${file}|${left},${top}`;
    if (!pieces.has(key)) {
        pieces.set(key, loadLook(meleeArtPath(file)).then(image => {
            const canvas = document.createElement('canvas');
            canvas.width = right - left;
            canvas.height = bottom - top;
            canvas.getContext('2d').drawImage(image, -left, -top);
            return { canvas, left, top };
        }));
    }
    return pieces.get(key);
}

function weaponPicture(id) {
    if (!weaponPictures.has(id)) weaponPictures.set(id, loadLook(meleeWeaponImage(id)));
    return weaponPictures.get(id);
}

const resolve = itemId => meleeAliases[itemId] || hunterArt.aliases[itemId] || itemId;

// What of an item is seen on this side's hunter at all
function seenOn(side, itemId) {
    const looks = hunterArt.items[resolve(itemId)];
    return Boolean(looks && looks[side] && looks[side].length);
}

/**
 * Whether he can fight hand to hand dressed as he is, and with what: the weapon's id, or null.
 * Only with a weapon there is a whole picture of, and nothing on his arms without melee art.
 * @param {string} side
 * @param {Object} equipment  { slotId: itemId }, what is drawn (hidden gear left out)
 */
export function meleeWeaponFor(side, equipment) {
    const weaponId = equipment && equipment.mainhand;
    if (!weaponId || !meleeWeapons[weaponId] || !armsMove(side, equipment)) return null;
    return weaponId;
}

// Whether his arms can be drawn moving, dressed as he is: nothing on them without melee art
function armsMove(side, equipment) {
    if (!meleeRigs[side] || !meleeBodies[side]) return false;
    for (const slot of ARM_SLOTS) {
        const itemId = equipment && equipment[slot];
        if (itemId && seenOn(side, itemId) && !(meleeArmor[resolve(itemId)] && meleeArmor[resolve(itemId)][side])) return false;
    }
    return true;
}

/** The ranged weapon he can be drawn holding up as he shoots, dressed as he is; or null */
export function rangedFor(side, equipment) {
    const id = equipment && equipment.ranged && resolve(equipment.ranged);
    return id && meleeRanged[id] && armsMove(side, equipment) ? id : null;
}

// The moving parts of an outfit: per bone, the sleeve (a chest's, or the bare one) and what is
// worn over it, in order; the fists, the relaxed hand and the cuffs over them; and for the
// still pictures, the torso parts and the shoulder pieces
function partsFor(side, equipment) {
    const bare = meleeBodies[side];
    const worn = [...new Set(Object.values(equipment).filter(Boolean).map(resolve))]
        .map(itemId => {
            const entry = meleeArmor[itemId] && meleeArmor[itemId][side];
            // Thick Bear Fur under a chest: the chest's sleeves cover its caps, only the fur's torso shows
            if (itemId === 'thick-bear-fur' && entry && equipment.chest && seenOn(side, equipment.chest)) {
                return { ...entry, parts: entry.parts.filter(part => part[1] === 'torso') };
            }
            return entry;
        })
        .filter(Boolean);
    const sleeves = Object.assign({}, ...worn.map(art => art.sleeves || {}));
    const all = worn.flatMap(art => art.parts).sort((a, b) => a[3] - b[3]);
    const on = (owner, ...passes) => all.filter(part => part[1] === owner && (!passes.length || passes.includes(part[2])));
    const bones = ['left-upper', 'right-upper', 'left-forearm', 'right-forearm'];

    return {
        limbs: Object.fromEntries(bones.map(bone => [bone, [sleeves[bone] || bare[bone], ...on(bone).map(part => [part[0], part[4]])]])),
        hands: { 'left-grip': bare['left-grip'], 'right-grip': bare['right-grip'], 'left-hand-relaxed': bare['left-hand-relaxed'] },
        cuffs: { left: on('left-hand').map(part => [part[0], part[4]]), right: on('right-hand').map(part => [part[0], part[4]]) },
        torso: on('torso').map(part => ({ path: meleeArtPath(part[0]), order: part[3] })),
        front: on('static-shoulder').map(part => ({ path: meleeArtPath(part[0]), order: part[3] })),
        moving: itemId => Boolean(meleeArmor[itemId] && meleeArmor[itemId][side]),
    };
}

/**
 * What he wears changed (or a game began): the pictures to fight in, made now, not mid-swing.
 */
export function dressForMelee(side, equipment) {
    dressForRanged(side, equipment);
    const weaponId = meleeWeaponFor(side, equipment);
    const key = weaponId ? `${side}|${JSON.stringify(equipment)}` : '';
    if (key === outfitKey) return;
    outfitKey = key;
    look = null;
    melee.cancel();
    if (!weaponId) return;

    const parts = partsFor(side, equipment);
    const all = list => Promise.all(list.map(piece));
    Promise.all([
        meleePlates(side, equipment, { body: meleeArtPath(meleeBodies[side].body[0]), torso: parts.torso, front: parts.front, moving: parts.moving }),
        Promise.all(Object.entries(parts.limbs).map(([bone, list]) => all(list).then(cut => [bone, cut]))).then(Object.fromEntries),
        Promise.all(Object.entries(parts.hands).map(([hand, art]) => piece(art).then(cut => [hand, cut]))).then(Object.fromEntries),
        all(parts.cuffs.left),
        all(parts.cuffs.right),
        weaponPicture(meleeWeapons[weaponId].art || weaponId),
        // What is in his off hand, held as a guard: only beside a one-handed weapon, and if its
        // picture will not load he fights without it
        offhandFor(weaponId, equipment) ? weaponPicture(offhandFor(weaponId, equipment)).catch(() => null) : null,
    ]).then(([plates, limbs, hands, leftCuffs, rightCuffs, weapon, offhand]) => {
        if (outfitKey === key) look = { side, weaponId, plates, limbs, hands, cuffs: { left: leftCuffs, right: rightCuffs }, weapon,
            offhand: offhand ? { id: offhandFor(weaponId, equipment), picture: offhand } : null };
    }).catch(() => {
        // A picture missing: he keeps to his bow
    });
}

// Holding his ranged weapon up as he shoots: the plates without it (it is in his hands), his arms
let rangedLook = null;      // { side, id, plates, limbs, hands, cuffs, picture } once all have loaded
let rangedKey = '';
function dressForRanged(side, equipment) {
    const id = rangedFor(side, equipment);
    const key = id ? `${side}|${JSON.stringify(equipment)}` : '';
    if (key === rangedKey) return;
    rangedKey = key;
    rangedLook = null;
    if (!id) return;

    const parts = partsFor(side, equipment);
    const all = list => Promise.all(list.map(piece));
    Promise.all([
        meleePlates(side, equipment, { body: meleeArtPath(meleeBodies[side].body[0]), torso: parts.torso, front: parts.front, moving: parts.moving, held: ['ranged'] }),
        Promise.all(Object.entries(parts.limbs).map(([bone, list]) => all(list).then(cut => [bone, cut]))).then(Object.fromEntries),
        Promise.all(Object.entries(parts.hands).map(([hand, art]) => piece(art).then(cut => [hand, cut]))).then(Object.fromEntries),
        all(parts.cuffs.left),
        all(parts.cuffs.right),
        weaponPicture(id),
    ]).then(([plates, limbs, hands, leftCuffs, rightCuffs, picture]) => {
        if (rangedKey === key) rangedLook = { side, id, plates, limbs, hands, cuffs: { left: leftCuffs, right: rightCuffs }, picture };
    }).catch(() => {
        // A picture missing: he shoots as ever
    });
}

// The off-hand he holds as he fights with a weapon: one there is a whole picture of, beside a
// one-handed weapon; or null
function offhandFor(weaponId, equipment) {
    const offhandId = equipment && equipment.offhand && resolve(equipment.offhand);
    return offhandId && meleeOffhands[offhandId] && !meleeWeapons[weaponId].twoHanded && !meleeWeapons[weaponId].support ? offhandId : null;
}

export function resetMelee() {
    swingAt = null;
    melee.cancel();
}

// Where he swings from: his chest, between his shoulders, on the field
function anchor(player) {
    const bounds = player.pictureBounds();
    const rig = meleeRigs[look.side];
    const scale = bounds.width / 800;
    return {
        x: bounds.left + (rig.left.shoulder[0] + rig.right.shoulder[0]) / 2 * scale,
        y: bounds.top + (rig.left.shoulder[1] + rig.right.shoulder[1]) / 2 * scale,
    };
}

function distanceTo(point, box) {
    const x = Math.max(box.x, Math.min(point.x, box.x + box.width));
    const y = Math.max(box.y, Math.min(point.y, box.y + box.height));
    return Math.hypot(point.x - x, point.y - y);
}

// The nearest thing in reach: a creature, or the boss. { creature } or { boss: box }, or null.
// A creature may be reached from further off than the boss (melee.creatureReach).
function target(context, reach, creatureReach = reach) {
    const { player, canvas, creatures } = context;
    const from = anchor(player);
    let best = null;
    for (const creature of creatures) {
        if (!creature.alive || creature.state === 'enter') continue;
        const distance = distanceTo(from, creature.core());
        if (distance <= creatureReach && (!best || distance < best.distance)) best = { creature, distance };
    }
    const box = bossMeleeBox(canvas);
    if (box) {
        const distance = distanceTo(from, box);
        if (distance <= reach && (!best || distance < best.distance)) best = { boss: box, distance };
    }
    return best;
}

// The swing lands on whatever is in reach now (it may have died to an arrow, or got away)
function land(context) {
    const { gameState, player, combatTexts, particles, canvas } = context;
    const rules = gameConfig.melee;
    let hit = target(context, player.figureHeight() * rules.reach * 1.15, player.figureHeight() * rules.creatureReach * 1.15);
    // What he swung at, if it is gone a little further meanwhile (a boss's charge goes by in a
    // moment): the blow still finds it within his reach to follow it ("follow")
    const aimed = swingAt;
    swingAt = null;
    const follow = player.figureHeight() * rules.follow;
    if (!hit && aimed && aimed.boss) {
        const box = bossMeleeBox(canvas);
        if (box && distanceTo(anchor(player), box) <= follow) hit = { boss: box };
    } else if (!hit && aimed && aimed.creature && aimed.creature.alive && distanceTo(anchor(player), aimed.creature.core()) <= follow) {
        hit = { creature: aimed.creature };
    }
    if (!hit) return;

    const weapon = meleeWeapons[look.weaponId];
    // By its class; one without a class hits as a sword or a greatsword
    const kind = rules.damage[weapon.kind] ? weapon.kind : weapon.twoHanded ? 'greatsword' : 'sword';
    const isCrit = Math.random() < Math.min(getCurrentTotalCritRating(gameState), gameState.critRatingCap);
    const damage = Math.round(rules.damage[kind] * (1 + (gameState.attackPower || 0) / 100) * (isCrit ? gameState.critMultiplier : 1));

    if (hit.creature) {
        const creature = hit.creature;
        const body = creature.core();
        const taken = Math.max(1, Math.round(damage * (1 - Math.min(0.6, (creature.data.armor || 0) / 150))));
        // Its points and loot, if it falls, come with the creatures' next step
        creature.takeMelee(taken, rules.pushback);
        combatTexts.push(new CombatText(body.x + body.width / 2, body.y, isCrit ? `${taken} CRIT!` : `${taken}`, isCrit ? '#FF6B00' : '#FFE4B5', isCrit));
        for (let i = 0; i < 10; i++) particles.push(new Particle(body.x + body.width / 2, body.y + body.height / 2, '#FFE4B5'));
    } else {
        meleeStrikeBoss({ damage, isCrit, combatTexts, canvas });
        const box = hit.boss;
        for (let i = 0; i < 10; i++) particles.push(new Particle(box.x + box.width / 2, box.y + box.height * 0.8, '#FFE4B5'));
    }
    playFireballImpactSound({ volume: 0.6 });
    // A blow may call down what the weapon calls down (Thunderfury's lightning)
    if (context.onBlow) context.onBlow();
}

/**
 * One step of the game.
 * @param {object} context  { gameState, player, canvas, delta, creatures, combatTexts, particles,
 *                          onBlow: called when a blow lands }
 */
export function updateMelee(context) {
    const rules = gameConfig.melee;
    if (!rules.enabled || !look) {
        if (melee.state !== 'ranged') melee.cancel();
        return;
    }

    const { player, delta } = context;
    const reach = player.figureHeight() * rules.reach;
    // He has it in hand before it is needed: when something comes within "ready" of him (a
    // boss's charge is over in a moment), and keeps it while it is a little further off
    const ready = player.figureHeight() * rules.ready;
    const near = target(context, melee.state === 'ranged' ? ready : ready * 1.2);
    const family = meleeWeapons[look.weaponId].twoHanded ? 'two' : 'one';

    if (near && melee.state === 'ranged') melee.engage(family, meleeWeapons[look.weaponId].style || null);
    const strike = near && target(context, reach, player.figureHeight() * rules.creatureReach);
    if (strike) {
        melee.attack(rules.cooldown[family] * 1000);
        // What he swings at: the blow lands on it a moment later, even if it has moved on a little
        if (melee.state === 'attack' || melee.queued) swingAt = swingAt || strike;
    }

    for (const event of melee.advance(delta * STEP_MS, Boolean(near))) {
        if (event === 'contact') land(context);
    }
}

/**
 * For the swing timer under his feet: the weapon he would swing, how ready the next swing is
 * (1 ready), and the seconds until it is. Null when he has nothing he can swing.
 */
export function meleeTimer() {
    if (!look) return null;
    const family = meleeWeapons[look.weaponId].twoHanded ? 'two' : 'one';
    // How ready, the seconds to go, and the weapon's own time between swings
    return { weaponId: look.weaponId, ready: melee.readiness(), seconds: melee.cooldown / 1000, swing: gameConfig.melee.cooldown[family] };
}

// Whether he is fighting hand to hand now (and is drawn as such)
export function meleeShowing() {
    return Boolean(look) && melee.state !== 'ranged';
}

// For debug mode: frames he was drawn fighting since last asked
let framesDrawn = 0;
export function meleeFramesSince() {
    const frames = framesDrawn;
    framesDrawn = 0;
    return frames;
}

// Every picture of his, shrunk once to the size it is drawn at, and drawn so from then on:
// shrinking an 800-pixel picture (or a sword 1,500 tall) with care every frame is costly
let shrunkAt = 0;
let shrunk = new Map();

function put(ctx, source, x, y, width, height) {
    let small = shrunk.get(source);
    if (!small) {
        small = document.createElement('canvas');
        small.width = Math.max(1, Math.round(width * shrunkAt));
        small.height = Math.max(1, Math.round(height * shrunkAt));
        const context = small.getContext('2d');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(source, 0, 0, small.width, small.height);
        shrunk.set(source, small);
        // A small canvas may be kept off the graphics card and sent to it again every frame it
        // is drawn; a bitmap of it goes there once and stays
        if (typeof createImageBitmap === 'function') {
            const map = shrunk;
            createImageBitmap(small).then(bitmap => {
                if (shrunk === map) map.set(source, bitmap);
            }).catch(() => {});
        }
    }
    ctx.drawImage(small, x, y, width, height);
}

function segment(ctx, part, fromA, fromB, toA, toB) {
    const turn = Math.atan2(toB[1] - toA[1], toB[0] - toA[0]) - Math.atan2(fromB[1] - fromA[1], fromB[0] - fromA[0]);
    ctx.save();
    ctx.translate(toA[0], toA[1]);
    ctx.rotate(turn);
    put(ctx, part.canvas, part.left - fromA[0], part.top - fromA[1], part.canvas.width, part.canvas.height);
    ctx.restore();
}

/**
 * Draw him fighting, in place of his usual picture. False when he is not.
 * @param {object} bounds  Where his usual picture is drawn (Player.pictureBounds)
 * @param {object} [posed] A pose of utils/meleeMotion.js to draw instead of his own (to look at)
 */
// His legs step as he fights too: the plates behind him and of his body are drawn through these
// (only the legs move; his lean is put on by Player.drawsMelee), kept for the next outfit
const steppers = {};

function plate(ctx, which, picture, side, step) {
    if (!step) {
        put(ctx, picture, 0, 0, 800, 800);
        return;
    }
    const rig = characterFor(side).rig;
    let stepper = steppers[which];
    if (!stepper) stepper = steppers[which] = new CharacterAnimator(picture, rig, STRIDE[side], { legsOnly: true });
    stepper.setPicture(picture);
    stepper.rig = rig;
    stepper.stride = STRIDE[side];
    stepper.setStep(step);
    stepper.draw(ctx, rig.foot.u * 800, rig.foot.v * 800, 800);
}

/**
 * @param {object} [step]  How he is stepping (utils/locomotion.js stepPose), for his legs
 */
export function drawMelee(ctx, bounds, posed = null, step = null) {
    // A pose may be asked for (to look at one), else he is drawn as he is now
    if (!look || (!posed && melee.state === 'ranged')) return false;
    const resting = meleeRest[look.weaponId] && meleeRest[look.weaponId][look.side];
    const pose = posed || melee.pose(meleeRigs[look.side].right.shoulder, resting || null);
    const rig = meleeRigs[look.side];
    const weapon = meleeWeapons[look.weaponId];
    const at = armsFor(rig, weapon, pose);
    const props = [{ picture: look.weapon, grip: weapon.grip, height: weapon.height, place: at.main, angle: at.angle, behind: at.behind }];
    // His left fist holds the off-hand, if he has one in hand: in front of him, under his fist
    if (look.offhand) {
        at.arms.left = offhandArm(rig);
        const held = meleeOffhands[look.offhand.id];
        props.push({ picture: look.offhand.picture, grip: held.grip, height: held.height, place: at.arms.left.grip, angle: at.arms.left.angle, behind: false });
    }
    if (!posed) framesDrawn++;
    drawPosed(ctx, bounds, look, rig, at, props, step, ['rear', 'body']);
    return true;
}

/**
 * Draw him holding his ranged weapon up, as he shoots, in place of his usual picture (his legs
 * stepping, if he is). False when there is no picture of him holding it.
 */
export function drawRanged(ctx, bounds, step = null) {
    if (!rangedLook) return false;
    const rig = meleeRigs[rangedLook.side];
    const held = meleeRanged[rangedLook.id];
    const picture = rangedLook.picture;
    const width = picture.naturalWidth * held.height / picture.naturalHeight;
    const at = rangedArms(rig, held, width);
    drawPosed(ctx, bounds, rangedLook, rig, at, [{ picture, grip: held.grip, height: held.height, place: at.main, angle: at.angle, behind: false }], step, ['rangedRear', 'rangedBody']);
    return true;
}

// Him in still plates and moving arms, holding what he holds ("props": each a picture, its grip,
// how tall, where its grip is, which way it points, and whether behind him), his legs stepping
// through the plates of "steppers"
function drawPosed(ctx, bounds, dressed, rig, at, props, step, steppers) {
    const { plates, limbs, hands, cuffs } = dressed;
    const drawProp = prop => {
        const scale = prop.height / prop.picture.naturalHeight;
        const width = prop.picture.naturalWidth * scale;
        ctx.save();
        ctx.translate(prop.place[0], prop.place[1]);
        ctx.rotate(prop.angle);
        put(ctx, prop.picture, -prop.grip[0] * width, -prop.grip[1] * prop.height, width, prop.height);
        ctx.restore();
    };

    ctx.save();
    ctx.translate(bounds.left, bounds.top);
    ctx.scale(bounds.width / 800, bounds.height / 800);
    // How big a picture pixel is on the screen: a new size (or outfit) and they are shrunk anew
    const onScreen = Math.round(ctx.getTransform().a * 100) / 100;
    if (onScreen !== shrunkAt || shrunk.look !== dressed) {
        shrunkAt = onScreen;
        shrunk = new Map();
        shrunk.look = dressed;
    }
    ctx.imageSmoothingEnabled = true;

    // His legs step, if he is stepping
    plate(ctx, steppers[0], plates.rear, dressed.side, step);
    props.filter(prop => prop.behind).forEach(drawProp);
    plate(ctx, steppers[1], plates.body, dressed.side, step);
    // The sleeves, upper arms then forearms, and what is worn over each, bracers and all
    const bone = (side, part, layer) => {
        const arm = rig[side];
        const solved = at.arms[side];
        if (part === 'upper') segment(ctx, layer, arm.shoulder, arm.elbow, arm.shoulder, solved.elbow);
        else segment(ctx, layer, arm.elbow, arm.wrist, solved.elbow, solved.end);
    };
    for (const part of ['upper', 'forearm']) {
        for (const side of ['left', 'right']) bone(side, part, limbs[`${side}-${part}`][0]);
    }
    for (const part of ['upper', 'forearm']) {
        for (const side of ['left', 'right']) limbs[`${side}-${part}`].slice(1).forEach(layer => bone(side, part, layer));
    }
    put(ctx, plates.front, 0, 0, 800, 800);
    props.filter(prop => !prop.behind).forEach(drawProp);

    // The fists on what they hold, turned with it; a free left hand relaxed at the end of its
    // arm; and over each hand what is worn on it
    for (const side of ['left', 'right']) {
        const arm = rig[side];
        const solved = at.arms[side];
        const onHand = solved.holds ? [hands[`${side}-grip`], ...cuffs[side]] : [hands['left-hand-relaxed'], ...cuffs[side]];
        if (solved.holds) {
            ctx.save();
            ctx.translate(solved.grip[0], solved.grip[1]);
            ctx.rotate(solved.angle !== undefined ? solved.angle : at.angle);
            for (const layer of onHand) put(ctx, layer.canvas, layer.left - arm.grip[0], layer.top - arm.grip[1], layer.canvas.width, layer.canvas.height);
            ctx.restore();
        } else if (arm.relaxed) {
            const along = [arm.wrist[0] - arm.elbow[0], arm.wrist[1] - arm.elbow[1]];
            const reach = [solved.end[0] - solved.elbow[0], solved.end[1] - solved.elbow[1]];
            for (const layer of onHand) {
                segment(ctx, layer, arm.relaxed, [arm.relaxed[0] + along[0], arm.relaxed[1] + along[1]],
                    solved.end, [solved.end[0] + reach[0], solved.end[1] + reach[1]]);
            }
        }
    }
    ctx.restore();
}
