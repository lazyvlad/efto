// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through data: URLs, as in gameClock.test.mjs; the creature's own import of its data
// is pointed at the data's
const asUrl = source => `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
const dataUrl = asUrl(await readFile(new URL('../data/creatures.js', import.meta.url)));
const creatureSource = (await readFile(new URL('../classes/Creature.js', import.meta.url), 'utf8'))
    .replace("'../data/creatures.js'", `'${dataUrl}'`);
const { Creature } = await import(asUrl(creatureSource));
const { creatures, zoneCreatures } = await import(dataUrl);
const { raiseShield, shieldBlocks } = await import(asUrl(await readFile(new URL('../utils/shield.js', import.meta.url))));
// gameConfig.creatures (the config itself loads the site's settings, so is not imported here)
const INTO = 0.5;
const BRUISER_SHIELD_COST = 3;

// A field as a desktop window has it: the hunter at the bottom, 120 wide and 300 tall
const field = (hunterX = 900, more = {}) => ({
    player: { x: hunterX, y: 740, width: 120, height: 300 },
    width: 1920,
    height: 1080,
    frozen: false,
    reversed: false,
    ...more,
});

// 20 seconds to close in, a pounce every 1.6 to 2.4 seconds once on him
function make(id = 'timber-wolf', x = 900) {
    const data = creatures[id];
    return new Creature(id, data, {
        x, size: 300 * data.cell, health: data.health, approachSteps: 20 * 60,
        moveSpeed: 0.09 * 1920 / 60 * data.pace, biteEvery: [1.6 * 60, 2.4 * 60], loot: ['loot'],
    });
}

// Steps until it bites or is gone, and what it did on the way; the hunter may move
function play(creature, { start = 900, until = 4000, moveWhen = null, moveTo = 0 } = {}) {
    let place = field(start);
    const done = { bites: 0, bit: false, steps: 0, firstBite: null };
    for (let step = 0; step < until; step++) {
        if (moveWhen && moveWhen(creature)) place = field(moveTo);
        const what = creature.update(1, place);
        done.steps = step;
        if (what === 'bite') {
            done.bites++;
            done.bit = true;
            if (done.firstBite === null) done.firstBite = step;
        }
        if (creature.state === 'gone') break;
    }
    return done;
}

test('every zone with creatures lists painted ones, each with a body to hit and an attack', () => {
    for (const [zone, rules] of Object.entries(zoneCreatures)) {
        assert.ok(rules.every[0] <= rules.every[1] && rules.approach[0] <= rules.approach[1], zone);
        for (const id of Object.keys(rules.creatures)) {
            const data = creatures[id];
            assert.ok(data, `${zone}: ${id}`);
            assert.ok(['common', 'bruiser'].includes(data.grade));
            assert.ok(data.core.x + data.core.width <= 1 && data.core.y + data.core.height <= 1);
        }
    }
});

test('it closes in, then stays on a hunter who stands still and bites him again and again', () => {
    for (const id of Object.keys(creatures)) {
        const creature = make(id, 300);
        const { bites, firstBite } = play(creature, { until: 40 * 60 });
        // About 20 seconds of closing in, then a bite every 2 seconds or so
        assert.ok(firstBite > 19 * 60 && firstBite < 23 * 60, `${id}: first bite at ${firstBite}`);
        assert.ok(bites >= 5, `${id} bit ${bites} times`);
        assert.ok(creature.alive, `${id} is still there: biting does not use it up`);
    }
});

test('a pounce is seen coming: a step aside while it gathers itself, and it misses, and stays on him', () => {
    const creature = make('timber-wolf', 900);
    let place = field(900);
    let bit = false;
    let lunged = false;
    for (let step = 0; step < 30 * 60 && !(lunged && creature.state === 'close'); step++) {
        if (creature.state === 'pounce' && creature.stateMs > 100) place = field(1400);
        if (creature.state === 'lunge') lunged = true;
        if (creature.update(1, place) === 'bite') bit = true;
    }
    assert.equal(bit, false);
    assert.equal(creature.state, 'close', 'back on him, for the next');
    assert.ok(creature.alive);
});

test('arrows drive it off him, and it comes again', () => {
    const creature = make('timber-wolf', 900);
    play(creature, { until: 21 * 60 });
    assert.equal(creature.state, 'close');
    assert.equal(creature.takeHit(10, 0.05, 30), false);
    assert.equal(creature.state, 'stalk');
    assert.ok(creature.approach < 1);
    const { bit } = play(creature, { until: 10 * 60 });
    assert.ok(bit, 'back on him, it bites again');
});

test('arrows push it back and hold it a moment; enough of them bring it down, once', () => {
    const creature = make('timber-wolf', 900);
    play(creature, { until: 10 * 60 });
    const before = creature.approach;
    assert.ok(before > 0.3);
    assert.equal(creature.takeHit(10, 0.05, 30), false);
    assert.ok(Math.abs(creature.approach - (before - 0.05)) < 1e-9);
    const held = creature.approach;
    for (let step = 0; step < 20; step++) creature.update(1, field(900));
    assert.equal(creature.approach, held, 'it does not close in while it is held');

    assert.equal(creature.takeHit(100, 0.05, 30), true);
    assert.equal(creature.alive, false);
    assert.equal(creature.takeHit(10), false, 'it dies once');
    for (let step = 0; step < 60; step++) assert.equal(creature.update(1, field(900)), null);
    assert.equal(creature.state, 'gone');
});

test('reverse gravity throws it about and back up, and it bites no one meanwhile', () => {
    const creature = make('scorpid-worker', 900);
    play(creature, { until: 12 * 60 });
    const before = creature.approach;
    const thrown = field(900, { reversed: true });
    let bites = 0;
    for (let step = 0; step < 5 * 60; step++) if (creature.update(1, thrown)) bites++;
    assert.equal(bites, 0);
    assert.ok(creature.approach < before - 0.3, 'it lost much of its approach');
    assert.ok(creature.alive);
});

test('Frost Nova holds it where it is', () => {
    const creature = make('timber-wolf', 300);
    play(creature, { until: 120 });
    const place = field(900, { frozen: true });
    const before = { x: creature.x, y: creature.y, approach: creature.approach };
    for (let step = 0; step < 30; step++) creature.update(1, place);
    assert.deepEqual({ x: creature.x, y: creature.y, approach: creature.approach }, before);
});

test('the shield takes a hit a charge, and a creature can take it all at once', () => {
    const state = {};
    raiseShield(state, 300, 3);
    assert.equal(shieldBlocks(state), true);
    assert.equal(state.shieldCharges, 2);
    assert.equal(shieldBlocks(state, 1), true);
    assert.equal(shieldBlocks(state, 1), true, 'the last charge still blocks');
    assert.equal(state.shieldActive, false, 'and the shield is gone');
    assert.equal(shieldBlocks(state), false);

    raiseShield(state, 300, 3);
    assert.equal(shieldBlocks(state, BRUISER_SHIELD_COST), true);
    assert.equal(state.shieldActive, false, 'a bruiser breaks it');
});

test('every zone has creatures, and from the fourth on more than one kind', async () => {
    const { backgrounds } = await import(asUrl(await readFile(new URL('../data/backgrounds.js', import.meta.url))));
    for (const side of ['alliance', 'horde']) {
        backgrounds[side].forEach((zone, i) => {
            const here = zoneCreatures[zone.id];
            assert.ok(here, `${side} zone ${i + 1} (${zone.name}) has creatures`);
            for (const id of Object.keys(here.creatures)) assert.ok(creatures[id], `${zone.name}: ${id} is a painted creature`);
            if (i >= 3) assert.ok(Object.keys(here.creatures).length >= 2, `${zone.name} has more than one kind`);
        });
    }
});
