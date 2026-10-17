// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

// Loaded through data: URLs, as in creatures.test.mjs: the module's import of its data is
// pointed at the data's
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dataUrl = asUrl(await readFile(new URL('../data/bossAnimations.js', import.meta.url)));
const source = (await readFile(new URL('../systems/bossAnimation.js', import.meta.url), 'utf8'))
    .replace("'../data/bossAnimations.js'", `'${dataUrl}'`);
const { bossAnimation, bossPose, cellPlace, hookHandOn } = await import(asUrl(source));
const { bossAnimations } = await import(dataUrl);
const { bosses, behaviours } = await import(asUrl(await readFile(new URL('../data/bosses.js', import.meta.url))));

// A fight as bossSystem.js keeps it, doing nothing in particular
const fightOf = (id, more = {}) => ({ boss: { id }, phase: 'fight', doing: 'moving', attack: 'throw', doingSteps: 0, steps: 100, hitFlash: 0, attackData: null, ...more });

test('every boss has its poses, both sheets on disk and a track for every attack it makes', async () => {
    for (const boss of bosses) {
        const anim = bossAnimations[boss.id];
        assert.ok(anim, boss.id);
        for (const file of Object.values(anim.sheets)) assert.ok((await stat(new URL(`../${file}`, import.meta.url))).size > 0, file);
        // Its own attacks, and the swipe and row any boss may make
        for (const attack of new Set([...behaviours[boss.behaviour], 'swipe', 'row'])) {
            const track = anim.tracks[attack] || anim.tracks.throw;
            assert.ok(track.windup.length && track.active.length && track.recovery.length, `${boss.id} ${attack}`);
        }
    }
});

test('it idles while moving and on its way in, and collapses over the dying steps', () => {
    const anim = bossAnimation({ id: 'hogger' });
    assert.ok(anim.idle.frames.includes(bossPose(fightOf('hogger'), 0).frame));
    assert.ok(anim.idle.frames.includes(bossPose(fightOf('hogger', { phase: 'intro', steps: 30 }), 0).frame));
    const dying = [0, 20, 40, 80].map(steps => bossPose(fightOf('hogger', { phase: 'dying', steps }), 0).frame);
    assert.deepEqual(dying, anim.death.frames);
});

test('a wind-up goes through its poses in step with the wind-up, however long it is', () => {
    const anim = bossAnimation({ id: 'hogger' });
    for (const length of [60, 24]) {
        const at = share => bossPose(fightOf('hogger', { doing: 'winding', attack: 'charge', doingSteps: Math.floor(length * share) }), length);
        assert.equal(at(0).frame, anim.tracks.charge.windup[0]);
        assert.equal(at(0.9).frame, anim.tracks.charge.windup[1]);
        assert.equal(at(0).sheet, 'special');
    }
});

test('an attack done in the instant shows its release, then recovers, then idles', () => {
    const anim = bossAnimation({ id: 'hogger' });
    const fight = fightOf('hogger', { doing: 'winding', attack: 'throw', doingSteps: 10 });
    bossPose(fight, 24);
    Object.assign(fight, { doing: 'moving' });
    assert.equal(bossPose(fight, 0).frame, anim.tracks.throw.active[0]);
    fight.steps += 12;
    assert.equal(bossPose(fight, 0).frame, anim.tracks.throw.recovery[0]);
    fight.steps += 20;
    assert.ok(anim.idle.frames.includes(bossPose(fight, 0).frame));
});

test('under steady fire it flinches now and then, not all the time', () => {
    const anim = bossAnimation({ id: 'hogger' });
    const fight = fightOf('hogger', { hitFlash: 6 });
    let flinching = 0;
    for (let i = 0; i < 120; i++, fight.steps++) if (bossPose(fight, 0).frame === anim.hit) flinching++;
    assert.ok(flinching > 0 && flinching <= 20, String(flinching));
});

test('a side charge from the right is turned round', () => {
    const dash = side => bossPose(fightOf('shadumbra', { doing: 'acting', attack: 'sidecharge', attackData: { phase: 'dash', side } }), 0);
    assert.equal(dash(1).mirror, true);
    assert.equal(dash(-1).mirror, false);
});

test("Stitches' hook: a pose for each of its phases, each with his hand to hang it from", () => {
    const anim = bossAnimation({ id: 'stitches' });
    const cell = cellPlace(anim, { x: 0, y: 0, w: 200, h: 200 });
    const frames = new Set();
    for (const phase of ['mark', 'fly', 'pull', 'hold', 'reel']) {
        const pose = bossPose(fightOf('stitches', { doing: 'acting', attack: 'hook', attackData: { phase } }), 0);
        assert.equal(pose.sheet, 'special', phase);
        assert.ok(hookHandOn(anim, pose, cell), `his hand, ${phase}`);
        frames.add(pose.frame);
    }
    assert.equal(frames.size, 5);
    // Idle he carries it; on a thrown cleaver's release his hand is not on the hook
    assert.ok(hookHandOn(anim, bossPose(fightOf('stitches'), 0), cell));
    assert.equal(hookHandOn(anim, { sheet: 'core', frame: 6 }, cell), null);
});

test('the painted boss stands where its one picture stood, its height the picture\'s', () => {
    const anim = bossAnimation({ id: 'hogger' });
    const cell = cellPlace(anim, { x: 100, y: 50, w: 300, h: 320 });
    // The pivot falls on the middle of the old picture
    assert.ok(Math.abs(cell.x + anim.pivot[0] * cell.size - 250) < 1e-9);
    assert.ok(Math.abs(cell.y + anim.pivot[1] * cell.size - 210) < 1e-9);
    assert.ok(Math.abs(cell.size - 320 * anim.scale) < 1e-9);
});
