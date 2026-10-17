// Makes data/bossAnimations.js from the art agent's boss animation metadata
// (art-workbench/boss-animations/<id>/animation.json), and copies each boss's two body sheets
// to assets/bosses/animated/<side>/<id>/. Run again after the art is re-exported:
//
//   node tools/boss-animations.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ART = path.join(GAME, '..', 'art-workbench', 'boss-animations');

// Stitches' hand, by "sheet:frame", and his grip sheets copied beside his body sheets
function hookOf(id, dir) {
    const sockets = JSON.parse(fs.readFileSync(path.join(ART, id, 'hook-sockets.json'), 'utf8')).frames;
    const hand = {};
    for (const [key, at] of Object.entries(sockets)) {
        const [sheet, frame] = key.split('-');
        hand[`${sheet}:${frame}`] = { x: at.x, y: at.y, cap: [at.cap.left, at.cap.top, at.cap.width, at.cap.height] };
    }
    for (const sheet of ['core', 'special']) fs.copyFileSync(path.join(ART, id, `${sheet}-grip.webp`), path.join(GAME, dir, `${sheet}-grip.webp`));
    return { hand, grips: { core: `${dir}/core-grip.webp`, special: `${dir}/special-grip.webp` } };
}

const out = {};
for (const id of fs.readdirSync(ART).sort()) {
    const file = path.join(ART, id, 'animation.json');
    if (!fs.existsSync(file)) continue;
    const a = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!a.states || !a.registration) continue;
    const r = a.registration, ref = r.referenceAlphaBounds, size = r.referenceSize;

    // Each attack's track: a core one by name, a special one by its place on the special sheet
    const special = n => Object.keys(a.states).find(k => a.states[k].sheet === 'special' && (a.states[k].windup || [])[0] === n * 8);
    const tracks = {};
    for (const [attack, to] of Object.entries(a.mapping)) {
        const [sheet, which] = to.split(' ')[0].split(':');
        const name = sheet === 'special' ? special(Number(which)) : which;
        const s = a.states[name];
        if (!s || !s.windup) continue;
        tracks[attack] = { sheet: s.sheet, windup: s.windup, active: s.active || s.release, recovery: s.recovery || s.release };
    }
    const dir = `assets/bosses/animated/${a.faction}/${id}`;
    fs.mkdirSync(path.join(GAME, dir), { recursive: true });
    for (const sheet of ['core', 'special']) fs.copyFileSync(path.join(ART, id, `${sheet}.webp`), path.join(GAME, dir, `${sheet}.webp`));

    out[id] = {
        sheets: { core: `${dir}/core.webp`, special: `${dir}/special.webp` },
        // The cell is drawn this many times the old picture's height, its pivot on the middle
        // of what the old picture showed
        scale: r.cellHeightVsOriginalImageDrawHeight,
        pivot: [a.pivot.x, a.pivot.y],
        center: [(ref.left + ref.right + 1) / 2 / size.width, (ref.top + ref.bottom + 1) / 2 / size.height],
        idle: { frames: a.states.idle.frames, ms: a.states.idle.ms },
        hit: a.states.hit.frames[0],
        guard: a.states.guard.frames[0],
        enrage: a.states.enrage.frames[0],
        death: { frames: a.states.death.frames, ms: a.states.death.ms },
        tracks,
        // Stitches: where his hand is on the poses that hold the hook (as shares of the cell), and
        // the square of his fingers on his grip sheets, drawn over the chain (hook-sockets.json)
        ...(a.hook ? { hook: hookOf(id, dir) } : {}),
    };
}

const round = (key, value) => typeof value === 'number' ? Math.round(value * 1e5) / 1e5 : value;
fs.writeFileSync(path.join(GAME, 'data', 'bossAnimations.js'), `// The bosses' painted poses (art-workbench/boss-animations), made by tools/boss-animations.mjs:
// do not edit by hand. Each boss has two 1536 x 1536 sheets of sixteen 384px cells, numbered
// along the rows: "core" (idle, hit, a thrown attack, a blow, guard, enrage, death) and
// "special" (two tracks of eight: wind-up, the act, recovery). systems/bossAnimation.js
// picks the pose from what the fight is doing; the poses never change what the fight does.

export const BOSS_CELL = 384;

export const bossAnimations = {
${Object.entries(out).map(([id, boss]) => `    '${id}': ${JSON.stringify(boss, round)},`).join('\n')}
};
`);
console.log(Object.keys(out).length, 'bosses');
