// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through data: URLs, as in gameClock.test.mjs
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const motion = await import(asUrl(await readFile(new URL('../utils/meleeMotion.js', import.meta.url))));
const { meleeRigs, meleeWeapons, meleeBodies, meleeArmor, meleeArtPath, meleeWeaponImage } = await import(asUrl(await readFile(new URL('../data/melee.js', import.meta.url))));
const { MeleeState, SWING, DRAW_MS, CLEAR_MS, armsFor, swingPose, drawPose, readyPose } = motion;

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
