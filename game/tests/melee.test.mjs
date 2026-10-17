// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through data: URLs, as in gameClock.test.mjs
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const motion = await import(asUrl(await readFile(new URL('../utils/meleeMotion.js', import.meta.url))));
const { meleeRigs, meleeWeapons, meleeBodies, meleeArmor, meleeArtPath, meleeWeaponImage, meleeRest, meleeOffhands, meleeRanged } = await import(asUrl(await readFile(new URL('../data/melee.js', import.meta.url))));
const { MeleeState, SWING, DRAW_MS, CLEAR_MS, armsFor, swingPose, drawPose, readyPose, offhandArm, rangedArms } = motion;

// Steps of game time (60 a second) until something happens
function run(melee, steps, inReach = true) {
    const events = [];
    for (let i = 0; i < steps; i++) events.push(...melee.advance(1000 / 60, inReach));
    return events;
}

test('he takes the weapon in hand, swings, and it lands once', () => {
    const melee = new MeleeState();
    assert.equal(melee.engage('one'), true);
    run(melee, Math.ceil(DRAW_MS / (1000 / 60)));
    assert.equal(melee.state, 'guard');
    assert.equal(melee.attack(2000), true);
    const events = run(melee, Math.ceil(SWING.one.total / (1000 / 60)) + 2);
    assert.deepEqual(events, ['contact']);
    assert.equal(melee.state, 'guard');
});

test('a swing asked for while he takes the weapon in hand goes off as soon as it is in hand', () => {
    const melee = new MeleeState();
    melee.engage('one');
    assert.equal(melee.attack(2000), false);
    const events = run(melee, Math.ceil((DRAW_MS + SWING.one.impact) / (1000 / 60)) + 2);
    assert.deepEqual(events, ['contact']);
});

test('after a swing he must wait: one-handed 2 seconds, two-handed 3', () => {
    for (const [family, seconds] of [['one', 2], ['two', 3]]) {
        const melee = new MeleeState();
        melee.engage(family);
        run(melee, 12);
        assert.equal(melee.attack(seconds * 1000), true);
        run(melee, Math.floor(seconds * 60) - 2);
        assert.equal(melee.attack(seconds * 1000), false, `${family}: still cooling down`);
        run(melee, 3);
        assert.equal(melee.attack(seconds * 1000), true, `${family}: ready again`);
    }
});

test('the swing timer: empty as he swings, full when the next swing is ready', () => {
    const melee = new MeleeState();
    assert.equal(melee.readiness(), 1, 'ready before any swing');
    melee.engage('one');
    run(melee, 12);
    melee.attack(2000);
    assert.ok(melee.readiness() < 0.05);
    run(melee, 60);
    assert.ok(Math.abs(melee.readiness() - 0.5) < 0.02, 'half way after a second of two');
    run(melee, 61);
    assert.equal(melee.readiness(), 1);
});

test('with nothing in reach he puts it away', () => {
    const melee = new MeleeState();
    melee.engage('two');
    run(melee, 12);
    run(melee, Math.ceil(CLEAR_MS / (1000 / 60)) + 1, false);
    assert.equal(melee.state, 'sheathe');
    run(melee, 20, false);
    assert.equal(melee.state, 'ranged');
    assert.equal(melee.pose(), null, 'drawn as ever then');
});

test('a short blade is thrust up at his side: reachable all the way, and clear of his head', () => {
    for (const side of Object.keys(meleeRigs)) {
        const rig = meleeRigs[side];
        const anchor = rig.right.shoulder;
        for (const [id, weapon] of Object.entries(meleeWeapons).filter(([, w]) => w.style === 'short')) {
            const poses = [readyPose('short', anchor), drawPose(0.5, 'short', anchor), drawPose(1, 'short', anchor)];
            for (let ms = 0; ms <= SWING.one.total; ms += 10) poses.push(swingPose(ms, 'one', 'short', anchor));
            for (const pose of poses) {
                const at = armsFor(rig, weapon, pose);
                assert.ok(at.arms.right.short < 2, `${side} ${id}: hand ${at.arms.right.short.toFixed(1)}px short`);
                // The hand stays out at his weapon side, never across his chest
                assert.ok(at.main[0] > anchor[0], `${side} ${id}: hand across his chest at ${at.main[0].toFixed(0)}`);
            }
        }
    }
});

test('both hunters reach their grips all through every swing, without stretching an arm', () => {
    for (const side of Object.keys(meleeRigs)) {
        for (const [id, weapon] of Object.entries(meleeWeapons)) {
            const family = weapon.twoHanded ? 'two' : 'one';
            const poses = [readyPose(), drawPose(0.5), drawPose(1)];
            for (let ms = 0; ms <= SWING[family].total; ms += 10) poses.push(swingPose(ms, family));
            for (const pose of poses) {
                const at = armsFor(meleeRigs[side], weapon, pose);
                assert.ok(at.arms.right.short < 2, `${side} ${id}: weapon hand ${at.arms.right.short.toFixed(1)}px short`);
                if (weapon.twoHanded) assert.ok(at.arms.left.short < 2, `${side} ${id}: helping hand short`);
            }
        }
    }
});

test('every piece of melee art named is there, with its painted area inside the canvas', async () => {
    const { access } = await import('node:fs/promises');
    const files = [];
    for (const body of Object.values(meleeBodies)) files.push(...Object.values(body));
    for (const item of Object.values(meleeArmor)) {
        for (const art of Object.values(item)) {
            files.push(...Object.values(art.sleeves || {}));
            files.push(...art.parts.map(part => [part[0], part[4]]));
        }
    }
    assert.ok(files.length > 100);
    for (const [file, [left, top, right, bottom]] of files) {
        await access(new URL(`../${meleeArtPath(file)}`, import.meta.url));
        assert.ok(left >= 0 && top >= 0 && right <= 800 && bottom <= 800 && right > left && bottom > top, file);
    }
});

test('the three hunter sets have melee art on both hunters', () => {
    for (const set of ['giantstalker', 'ds', 'cryptstalker']) {
        for (const piece of ['chest', 'shoulders', 'bracers', 'gloves']) {
            const id = set === 'ds' ? `ds_${piece}` : `${set}-${piece}`;
            assert.ok(meleeArmor[id] && meleeArmor[id].alliance && meleeArmor[id].horde, id);
        }
    }
});

test('every main-hand weapon of the site can be swung, one-handed or two as the site says', async () => {
    const { access } = await import('node:fs/promises');
    const gear = await readFile(new URL('../../config/gear.php', import.meta.url), 'utf8');
    const twoHanded = new Set([...gear.match(/'two_handed' => \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1]));
    const mainHand = new Set([...gear.matchAll(/'([a-z0-9_-]+)' => (?:\[[^\[\]]*'slot' => 'mainhand'|'mainhand')/g)].map(m => m[1]));
    // The weapons the hunters start with are named by their "id"; their slot's key is no weapon
    mainHand.delete('mainhand');
    for (const m of gear.matchAll(/'id' => '([^']+)'[^\]]*'slot' => 'mainhand'/g)) mainHand.add(m[1]);
    assert.ok(mainHand.has('starter-alliance-shortsword') && mainHand.has('starter-horde-handaxe'));
    assert.ok(mainHand.size >= 15, `found ${mainHand.size}`);
    for (const id of mainHand) {
        assert.ok(meleeWeapons[id], `${id} has a whole picture`);
        assert.equal(meleeWeapons[id].twoHanded, twoHanded.has(id), `${id} two-handed as on the site`);
        await access(new URL(`../${meleeWeaponImage(meleeWeapons[id].art || id)}`, import.meta.url));
    }
});

test('taking any weapon off his back, it stays behind him until it has turned clear of his face', () => {
    for (let share = 0; share <= 1; share += 0.025) {
        const pose = drawPose(share);
        if (!pose.behind) assert.ok(pose.angle >= 65, `share ${share.toFixed(3)}: in front at ${pose.angle.toFixed(1)}°`);
    }
});

test('every off-hand of the site is held in his left fist as he fights, its whole picture there', async () => {
    const { access } = await import('node:fs/promises');
    const gear = await readFile(new URL('../../config/gear.php', import.meta.url), 'utf8');
    const offhands = new Set([...gear.matchAll(/'([a-z0-9_-]+)' => (?:\[[^\[\]]*'slot' => 'offhand'|'offhand')/g)].map(m => m[1]));
    offhands.delete('offhand');
    assert.ok(offhands.size >= 14, `found ${offhands.size}`);
    for (const id of offhands) {
        const held = meleeOffhands[id];
        assert.ok(held, `${id} can be held`);
        assert.ok(held.grip.every(share => share > 0 && share < 1) && held.height > 100, id);
        await access(new URL(`../${meleeWeaponImage(id)}`, import.meta.url));
    }
    // Both hunters' left hands reach it, without stretching
    for (const [side, rig] of Object.entries(meleeRigs)) assert.ok(offhandArm(rig).short < 2, `${side}: ${offhandArm(rig).short.toFixed(1)}px short`);
});

test('every ranged weapon of the site can be held up as he shoots, both hands reaching it', async () => {
    const { access } = await import('node:fs/promises');
    const gear = await readFile(new URL('../../config/gear.php', import.meta.url), 'utf8');
    const ranged = new Set([...gear.matchAll(/'([a-z0-9_-]+)' => (?:\[[^\[\]]*'slot' => 'ranged'|'ranged')/g)].map(m => m[1]));
    ranged.delete('ranged');
    for (const m of gear.matchAll(/'id' => '([^']+)'[^\]]*'slot' => 'ranged'/g)) ranged.add(m[1]);
    assert.ok(ranged.size >= 13, `found ${ranged.size}`);
    for (const id of ranged) {
        const held = meleeRanged[id];
        assert.ok(held, `${id} can be held`);
        await access(new URL(`../${meleeWeaponImage(id)}`, import.meta.url));
        for (const [side, rig] of Object.entries(meleeRigs)) {
            const at = rangedArms(rig, held, held.height * 0.3);
            assert.ok(at.arms[held.hand].holds, `${side} ${id}: in his ${held.hand} hand`);
            for (const hand of ['left', 'right']) if (at.arms[hand].holds) assert.ok(at.arms[hand].short < 2, `${side} ${id}: ${hand} hand ${at.arms[hand].short.toFixed(1)}px short`);
            // A bow is drawn with his other hand; a crossbow, spear or harpoon steadied with it
            if (held.kind === 'bow' || held.support) assert.ok(at.arms.left.holds && at.arms.right.holds, `${side} ${id}: both hands`);
        }
    }
});

test('a weapon hung blade down or at his hip is taken from where it rests, behind him half the way', () => {
    assert.ok(Object.keys(meleeRest).length >= 9);
    for (const [weaponId, sides] of Object.entries(meleeRest)) {
        assert.ok(meleeWeapons[weaponId], `${weaponId} is fought with`);
        for (const [side, rest] of Object.entries(sides)) {
            assert.ok(meleeRigs[side], side);
            const start = drawPose(0, null, null, rest), end = drawPose(1, null, null, rest);
            assert.deepEqual([start.x, start.y, start.angle], [rest.x, rest.y, rest.angle], weaponId);
            assert.deepEqual([end.x, end.y, end.angle], [readyPose().x, readyPose().y, readyPose().angle], weaponId);
            assert.equal(drawPose(0.4, null, null, rest).behind, true);
            assert.equal(drawPose(0.5, null, null, rest).behind, false);
        }
    }
});

test("Thick Bear Fur has melee art on the Horde hunter, who wears it: it no longer keeps him from fighting", () => {
    const fur = meleeArmor['thick-bear-fur'].horde;
    assert.deepEqual(fur.parts.map(part => part[1]).sort(), ['left-upper', 'right-upper', 'torso']);
});

test('every weapon he fights with has a class with a damage, of its own hand', async () => {
    const config = await readFile(new URL('../config/gameConfig.js', import.meta.url), 'utf8');
    const line = config.match(/damage:\s*\{([^}]*dagger[^}]*)\}/);
    assert.ok(line, 'melee.damage by class in gameConfig.js');
    const damage = Object.fromEntries([...line[1].matchAll(/(\w+):\s*(\d+)/g)].map(([, kind, value]) => [kind, Number(value)]));
    const twoHanded = new Set(['staff', 'polearm', 'greatsword', 'greataxe']);

    for (const [id, weapon] of Object.entries(meleeWeapons)) {
        assert.ok(damage[weapon.kind] > 0, `${id} has a class with a damage`);
        assert.equal(twoHanded.has(weapon.kind), Boolean(weapon.twoHanded), `${id}: a ${weapon.kind} is ${weapon.twoHanded ? 'two' : 'one'}-handed`);
    }
});
