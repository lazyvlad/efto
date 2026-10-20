import { MOTION } from './motion.js';
import { ART_VERSION } from './artVersion.js';

// A picture of the dungeon's, asked for with the art's version (so changed art is fetched afresh)
export const versioned = file => (file.startsWith('assets/dungeon/') ? `${file}?v=${ART_VERSION}` : file);

// How each fighter in the dungeon is drawn: which pictures, which frames for each pose.
//
// The druid and the paladin are the painted dungeon actors (assets/dungeon/<id>/animations.json:
// four 512px cells to a strip, standing on (256, 464), facing right), and so are the hunter, his
// cat and the Stockade's foes (art-workbench/dungeon-run/stockade).

const DRUID = 'assets/dungeon/druid-tank/';
const PALADIN = 'assets/dungeon/paladin-healer/';
const HUNTER = 'assets/dungeon/alliance-hunter/atlases/';
const PET = 'assets/dungeon/nightsaber/atlases/';

// A strip of the painted actors: frames in 512px cells along one row
const strip = (file, durations, extra = {}) => ({ file, cell: 512, columns: 4, pivot: [256, 464], frames: [0, 1, 2, 3], durations, ...extra });

// "height": how tall he stands on the nearest row, in the stage's pixels (1440 x 900)
export const ACTORS = {
    druid: {
        height: 195,
        poses: {
            idle: strip(DRUID + 'atlases/human-idle.webp', [300, 300, 300, 300], { loop: true }),
            step: strip(DRUID + 'atlases/human-step.webp', [120, 120, 120, 120], { loop: true }),
            // In a fight he is the bear (he changes as the wave comes in, and back after it)
            change: strip(DRUID + 'atlases/transform-start.webp', [65, 65, 65, 65], { then: 'changeFinish' }),
            changeFinish: strip(DRUID + 'atlases/transform-finish.webp', [65, 65, 65, 65], { then: 'bearIdle' }),
            unchange: strip(DRUID + 'atlases/transform-finish.webp', [55, 55, 55, 55], { frames: [3, 2, 1, 0], then: 'unchangeFinish' }),
            unchangeFinish: strip(DRUID + 'atlases/transform-start.webp', [55, 55, 55, 55], { frames: [3, 2, 1, 0], then: 'idle' }),
            bearIdle: strip(DRUID + 'atlases/bear-idle.webp', [260, 260, 260, 260], { loop: true, bear: true }),
            bearStep: strip(DRUID + 'atlases/bear-step.webp', [110, 110, 110, 110], { loop: true, bear: true }),
            bearStrike: strip(DRUID + 'atlases/bear-attack.webp', [140, 90, 110, 160], { then: 'bearIdle', bear: true }),
            bearHurt: strip(DRUID + 'atlases/bear-hurt.webp', [70, 90, 110, 120], { then: 'bearIdle', bear: true }),
            bearRoar: strip(DRUID + 'atlases/bear-roar.webp', [120, 140, 160, 160], { then: 'bearIdle', bear: true }),
            death: strip(DRUID + 'atlases/bear-death.webp', [140, 160, 180, 200], { hold: true, bear: true }),
        },
    },
    paladin: {
        height: 168,
        poses: {
            idle: strip(PALADIN + 'atlases/idle.webp', [320, 320, 320, 320], { loop: true }),
            step: strip(PALADIN + 'atlases/step.webp', [120, 120, 120, 120], { loop: true }),
            cast: strip(PALADIN + 'atlases/heal.webp', [260, 300, 380, 360], { hold: true }),
            strike: strip(PALADIN + 'atlases/attack.webp', [120, 100, 120, 160], { then: 'idle' }),
            hurt: strip(PALADIN + 'atlases/hurt.webp', [70, 90, 110, 120], { then: 'idle' }),
            raise: strip(PALADIN + 'atlases/blessing.webp', [160, 180, 190, 180], { then: 'idle' }),
            victory: strip(PALADIN + 'atlases/victory.webp', [200, 200, 200, 300], { hold: true }),
            death: strip(PALADIN + 'atlases/death.webp', [140, 160, 180, 200], { hold: true }),
        },
    },
    // The holy light the paladin lands on whoever he heals
    holy: strip(PALADIN + 'atlases/holy-impact.webp', [85, 95, 110, 120]),

    // The hunter and his Nightsaber, side on (the Stockade delivery): standing figures of 328px
    // and 337px in their 512px cells
    hunter: {
        height: 179, figure: 328,
        poses: {
            idle: strip(HUNTER + 'idle.webp', [240, 240, 240, 240], { loop: true }),
            step: strip(HUNTER + 'step.webp', [140, 140, 140, 140], { loop: true }),
            shoot: strip(HUNTER + 'shoot.webp', [180, 180, 110, 190], { then: 'idle' }),
            multi: strip(HUNTER + 'multi-shot.webp', [180, 180, 120, 200], { then: 'idle' }),
            drink: strip(HUNTER + 'drink.webp', [180, 180, 240, 180], { then: 'idle' }),
            hurt: strip(HUNTER + 'hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: strip(HUNTER + 'death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
    pet: {
        height: 78, figure: 337,
        poses: {
            idle: strip(PET + 'idle.webp', [240, 240, 240, 240], { loop: true }),
            step: strip(PET + 'run.webp', [100, 100, 100, 100], { loop: true }),
            strike: strip(PET + 'bite.webp', [130, 110, 100, 160], { then: 'idle' }),
            hurt: strip(PET + 'hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: strip(PET + 'death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
};

// The Stockade's own foes (art-workbench/dungeon-run/stockade): painted like the druid and the
// paladin, facing right, standing on (256, 464); their standing figure is 348px of the 512px
// cell ("figure"), and Targorr stands 1.3 times as tall as a convict. Frame times are theirs.
const D = 'assets/dungeon/';
const painted = (file, durations, extra = {}) => strip(file, durations, extra);

Object.assign(ACTORS, {
    prisoner: {
        height: 160, figure: 348,
        poses: {
            idle: painted(D + 'defias-prisoner/atlases/idle.webp', [240, 240, 240, 240], { loop: true }),
            step: painted(D + 'defias-prisoner/atlases/step.webp', [140, 140, 140, 140], { loop: true }),
            strike: painted(D + 'defias-prisoner/atlases/attack.webp', [140, 120, 110, 190], { then: 'idle' }),
            hurt: painted(D + 'defias-prisoner/atlases/hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: painted(D + 'defias-prisoner/atlases/death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
    convict: {
        height: 183, figure: 348,
        poses: {
            idle: painted(D + 'defias-convict/atlases/idle.webp', [240, 240, 240, 240], { loop: true }),
            step: painted(D + 'defias-convict/atlases/step.webp', [140, 140, 140, 140], { loop: true }),
            strike: painted(D + 'defias-convict/atlases/attack.webp', [140, 120, 110, 190], { then: 'idle' }),
            hurt: painted(D + 'defias-convict/atlases/hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: painted(D + 'defias-convict/atlases/death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
    insurgent: {
        height: 164, figure: 348,
        poses: {
            idle: painted(D + 'defias-insurgent/atlases/idle.webp', [240, 240, 240, 240], { loop: true }),
            step: painted(D + 'defias-insurgent/atlases/step.webp', [140, 140, 140, 140], { loop: true }),
            strike: painted(D + 'defias-insurgent/atlases/attack.webp', [140, 120, 110, 190], { then: 'idle' }),
            hurt: painted(D + 'defias-insurgent/atlases/hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: painted(D + 'defias-insurgent/atlases/death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
    agitator: {
        height: 156, figure: 348,
        poses: {
            idle: painted(D + 'defias-agitator/atlases/idle.webp', [240, 240, 240, 240], { loop: true }),
            step: painted(D + 'defias-agitator/atlases/step.webp', [140, 140, 140, 140], { loop: true }),
            strike: painted(D + 'defias-agitator/atlases/attack.webp', [140, 120, 110, 190], { then: 'idle' }),
            hurt: painted(D + 'defias-agitator/atlases/hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: painted(D + 'defias-agitator/atlases/death.webp', [170, 190, 220, 1000], { hold: true }),
        },
    },
    targorr: {
        height: 238, figure: 348,
        poses: {
            idle: painted(D + 'targorr/atlases/idle.webp', [240, 240, 240, 240], { loop: true }),
            step: painted(D + 'targorr/atlases/step.webp', [140, 140, 140, 140], { loop: true }),
            strike: painted(D + 'targorr/atlases/attack.webp', [140, 120, 110, 190], { then: 'idle' }),
            hurt: painted(D + 'targorr/atlases/hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
            death: painted(D + 'targorr/atlases/death.webp', [170, 190, 220, 1000], { hold: true }),
            cleave: painted(D + 'targorr/atlases/cleave.webp', [180, 180, 150, 260], { then: 'idle' }),
            roar: painted(D + 'targorr/atlases/roar.webp', [170, 180, 200, 220], { then: 'idle' }),
        },
    },
});

// What flies: [file, displayed width, pivot] (assets/dungeon/projectiles)
export const ROCK = 'assets/dungeon/projectiles/rock.webp';
export const PROJECTILES = {
    rock: { file: ROCK, width: 24 },
    arrow: { file: 'assets/dungeon/projectiles/arrow.webp', width: 80 },
    multi: { file: 'assets/dungeon/projectiles/arrow.webp', width: 80 },
    arcane: { file: 'assets/dungeon/projectiles/arcane-shot.webp', width: 100 },
    hammer: { file: 'assets/dungeon/spells/effects/hammer-of-justice.webp', width: 56 },
};

// The spells' effects (assets/dungeon/spells/animations.json): four 512px cells each, each frame on
// its own pivot; "height" is how tall the whole cell is drawn on the nearest row; "loop" ones last
// as long as the spell, the others play once
const FX = 'assets/dungeon/spells/effects/';
export const SPELL_FX = {
    growl: { file: FX + 'growl-ring.webp', durations: [80, 100, 120, 140], pivots: [[256, 440], [256, 440], [256, 440], [256, 440]], height: 620 },
    swipe: { file: FX + 'swipe-arc.webp', durations: [80, 100, 120, 140], pivots: [[256, 256], [256, 256], [256, 256], [256, 256]], height: 310 },
    barkskin: { file: FX + 'barkskin-shell.webp', durations: [150, 150, 150, 150], pivots: [[256, 464], [256, 464], [256, 464], [256, 464]], height: 510, loop: true, behind: true },
    stun: { file: FX + 'stun-stars.webp', durations: [150, 150, 150, 150], pivots: [[256, 256], [256, 256], [256, 256], [256, 256]], height: 180, loop: true },
    protection: { file: FX + 'protection-bubble.webp', durations: [150, 150, 150, 150], pivots: [[256, 432], [256, 432], [256, 432], [256, 432]], height: 510, loop: true },
    layOnHands: { file: FX + 'lay-on-hands-column.webp', durations: [80, 100, 120, 140], pivots: [[256, 438], [256, 432], [256, 432], [256, 438]], height: 510 },
};

// The spell bar's painted icons (assets/dungeon/spells/icons)
export const SPELL_ICONS = {
    fireball: '../../gnome-mage/spells/icons/fireball', frostbolt: '../../gnome-mage/spells/icons/frostbolt', arcaneMissiles: '../../gnome-mage/spells/icons/arcane-missiles',
    frostNova: '../../gnome-mage/spells/icons/frost-nova', blink: '../../gnome-mage/spells/icons/blink', iceBarrier: '../../gnome-mage/spells/icons/ice-barrier',
    taunt: 'taunt', growl: 'growl', swipe: 'swipe', barkskin: 'barkskin', holyLight: 'holy-light',
    hammer: 'hammer-of-justice', protection: 'blessing-of-protection', layOnHands: 'lay-on-hands',
};


// The gnome mage (art-workbench/dungeon-run/gnome-mage): a standing figure of 328px in the cell,
// drawn 122 tall on the nearest row; his staff swing stands on (172, 464)
const MAGE = 'assets/dungeon/gnome-mage/atlases/';
ACTORS.mage = {
    height: 122, figure: 328,
    poses: {
        idle: strip(MAGE + 'idle.webp', [260, 260, 260, 260], { loop: true }),
        step: { file: MAGE + 'step.webp', cell: 512, columns: 4, pivot: [256, 464], frames: [0, 1, 2, 3, 4, 5, 6, 7], durations: [85, 85, 85, 85, 85, 85, 85, 85], loop: true, stride: 160 },
        cast: strip(MAGE + 'cast.webp', [140, 180, 100, 180], { then: 'idle' }),
        channel: strip(MAGE + 'channel.webp', [180, 220, 220, 180], { loop: true }),
        barrier: strip(MAGE + 'barrier.webp', [130, 170, 180, 180], { then: 'idle' }),
        drink: strip(MAGE + 'drink.webp', [180, 180, 240, 180], { then: 'idle' }),
        strike: { file: MAGE + 'strike.webp', cell: 512, columns: 4, pivot: [172, 464], frames: [0, 1, 2, 3, 4, 5], durations: [100, 90, 70, 90, 100, 150], contactAtMs: 190, then: 'idle' },
        hurt: strip(MAGE + 'hurt.webp', [70, 100, 110, 120], { then: 'idle' }),
        death: strip(MAGE + 'death.webp', [170, 190, 220, 1000], { hold: true }),
        victory: strip(MAGE + 'victory.webp', [180, 180, 240, 280], { hold: true }),
    },
};

// The hunter's knife (hunter-melee-v6): six frames, the blow on the fourth
ACTORS.hunter.poses.strike = { file: HUNTER + 'strike.webp', cell: 512, columns: 4, pivot: [256, 464], frames: [0, 1, 2, 3, 4, 5], durations: [100, 90, 70, 90, 100, 150], contactAtMs: 260, then: 'idle' };

// The mage's spell effects (gnome-mage/spells-v1): four 512px cells each on their own pivots,
// "height" the whole cell drawn on the nearest row
const MAGE_FX_DIR = 'assets/dungeon/gnome-mage/spells/effects/';
export const MAGE_FX = {
    'fireball-flight': { file: MAGE_FX_DIR + 'fireball-flight.webp', durations: [90, 90, 90, 90], pivots: [[368, 256], [368, 256], [368, 256], [368, 256]], height: 66, loop: true },
    'fireball-impact': { file: MAGE_FX_DIR + 'fireball-impact.webp', durations: [70, 90, 100, 140], pivots: [[256, 256], [256, 256], [256, 256], [256, 256]], height: 125, loop: false },
    'frostbolt-flight': { file: MAGE_FX_DIR + 'frostbolt-flight.webp', durations: [100, 100, 100, 100], pivots: [[368, 256], [368, 256], [368, 256], [368, 256]], height: 58, loop: true },
    'frostbolt-impact': { file: MAGE_FX_DIR + 'frostbolt-impact.webp', durations: [70, 90, 110, 150], pivots: [[256, 256], [256, 256], [256, 256], [256, 256]], height: 112, loop: false },
    'arcane-missile-flight': { file: MAGE_FX_DIR + 'arcane-missile-flight.webp', durations: [80, 80, 80, 80], pivots: [[368, 256], [368, 256], [368, 256], [368, 256]], height: 54, loop: true },
    'arcane-missile-impact': { file: MAGE_FX_DIR + 'arcane-missile-impact.webp', durations: [60, 70, 90, 120], pivots: [[256, 256], [256, 256], [256, 256], [256, 256]], height: 92, loop: false },
    'frost-nova-ring': { file: MAGE_FX_DIR + 'frost-nova-ring.webp', durations: [70, 90, 110, 170], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 235, loop: false },
    'frost-nova-bind': { file: MAGE_FX_DIR + 'frost-nova-bind.webp', durations: [180, 180, 180, 180], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 105, loop: true },
    'blink-out': { file: MAGE_FX_DIR + 'blink-out.webp', durations: [60, 70, 80, 110], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 220, loop: false },
    'blink-in': { file: MAGE_FX_DIR + 'blink-in.webp', durations: [70, 80, 100, 130], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 220, loop: false },
    'ice-barrier-loop': { file: MAGE_FX_DIR + 'ice-barrier-loop.webp', durations: [180, 180, 180, 180], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 240, loop: true },
    'ice-barrier-break': { file: MAGE_FX_DIR + 'ice-barrier-break.webp', durations: [70, 90, 120, 160], pivots: [[256, 420], [256, 420], [256, 420], [256, 420]], height: 240, loop: false },
};

// The eight-frame walks and six-frame blows over the four-frame ones (the druid's bear poses keep
// being the bear's)
for (const { actor, pose, ...def } of MOTION) {
    const old = ACTORS[actor].poses[pose] || {};
    ACTORS[actor].poses[pose] = { ...def, bear: old.bear, then: def.then || old.then };
}

// Every picture the dungeon draws, to load before it starts
export function actorFiles() {
    const files = new Set();
    for (const flying of Object.values(PROJECTILES)) files.add(flying.file);
    for (const effect of Object.values(SPELL_FX)) files.add(effect.file);
    for (const effect of Object.values(MAGE_FX)) files.add(effect.file);
    for (const actor of Object.values(ACTORS)) {
        if (actor.file) files.add(actor.file);
        for (const pose of Object.values(actor.poses || {})) files.add(pose.file);
    }
    return [...files];
}

// The frame a pose shows "ms" after it began: { frame, done }
export function poseFrame(pose, ms) {
    const durations = pose.durations || [400];
    const frames = pose.frames || [0];
    const total = durations.reduce((a, b) => a + b, 0);
    // Played through (not looping): its last frame, and done
    if (!pose.loop && ms >= total) return { frame: frames[frames.length - 1], index: frames.length - 1, done: true };
    let t = pose.loop ? ms % total : ms;
    for (let i = 0; i < frames.length; i++) {
        if (t < durations[i]) return { frame: frames[i], index: i, done: false };
        t -= durations[i];
    }
    return { frame: frames[frames.length - 1], index: frames.length - 1, done: false };
}
