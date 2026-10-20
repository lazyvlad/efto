// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';

import { actionInterval, damageRoll, distance, reachable, pathToward } from '../dungeon/rules.js';
import {
    createBattle as makeBattle, step, living, hunterOf, moveHunter, multiShot, arcaneShot, drinkPotion, switchPet, nextToAct,
    moveUnit, follow, castSpell, revivePet, setAuto, autoState, turnDefend,
} from '../dungeon/battle.js';
import { FOES, COMPANION_SPELLS, hunterStats } from '../dungeon/stockade.js';
import { cellAt, cellFoot } from '../dungeon/stage.js';
import { poseFrame } from '../dungeon/actors.js';

// A steady dice: always the middle
const even = () => 0.5;
// The tests have everyone act by his script and cast spells only when a test does (makeBattle is
// the game's own: all on Auto, spells cast by themselves)
const createBattle = options => { const battle = makeBattle(options); battle.autoSpells = false; return battle; };
const play = (battle, seconds) => { for (let t = 0; t < seconds; t += 1 / 30) step(battle, 1 / 30); return battle; };
const unit = (battle, kind) => battle.units.find(u => u.kind === kind);
// The wave brought within the hunter's reach (columns 5-7), each to a cell of its own
const bringClose = battle => living(battle, 'foe').forEach((foe, i) => { foe.col = 5 + (i % 3); foe.row = Math.floor(i / 3) % 3; foe.path = []; });

test('speed is how often a turn comes', () => {
    assert.equal(actionInterval(5), 1.5);
    assert.equal(actionInterval(3), 2.5);
    assert.ok(actionInterval(7) < actionInterval(6));
});

test('damage is Heroes 3 damage: attack above defense raises it, below lowers it, within limits', () => {
    const hit = (attack, defense) => damageRoll({ attack, damage: [100, 100] }, { defense }, even);
    assert.equal(hit(10, 10), 100);
    assert.equal(hit(14, 10), 120);           // +5% a point
    assert.equal(hit(10, 14), 90);            // -2.5% a point
    assert.equal(hit(200, 0), 400);           // four times at most
    assert.equal(hit(0, 200), 30);            // 30% at least
    assert.equal(damageRoll({ attack: 5, damage: [100, 100] }, { defense: 50 }, even, { ignoresDefense: true }), 100);
});

test('a fighter walks around others, never through them', () => {
    const blocked = (col, row) => col === 2 && row === 1;
    const cells = reachable({ col: 1, row: 1 }, 1, blocked).map(path => path.at(-1)).filter(Boolean);
    assert.ok(!cells.some(c => c.col === 2 && c.row === 1));
    const path = pathToward({ col: 0, row: 1 }, { col: 4, row: 1 }, 6, blocked);
    assert.equal(distance(path.at(-1), { col: 4, row: 1 }), 1, 'ends beside the target');
    assert.ok(!path.some(c => c.col === 2 && c.row === 1));
});

test('his numbers come from his gear', () => {
    const bare = hunterStats({});
    const geared = hunterStats({ health: 40, armor: 40, attackPower: 30, crit: 0.05 });
    assert.ok(geared.maxHp > bare.maxHp && geared.defense > bare.defense && geared.attack > bare.attack && geared.crit > bare.crit);
});

test('the waves come one after another, and the last is Targorr', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    assert.equal(battle.wave, 0);
    assert.equal(living(battle, 'foe').length, 4);
    // Clear the wave: the next comes after the breather
    for (const foe of living(battle, 'foe')) battle.hits.push({ at: battle.time, from: 0, to: foe.id, amount: foe.maxHp });
    play(battle, 6);
    assert.equal(battle.wave, 1);
    assert.equal(battle.dungeon.waves.at(-1)[0], 'targorr');
});

test('a foe in the druid\'s taunt fights the druid', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const druid = unit(battle, 'druid');
    const foe = living(battle, 'foe')[0];
    foe.goes = 'healer';
    foe.col = druid.col + 1; foe.row = druid.row;
    foe.bar = 0.999;
    step(battle, 0.05);
    assert.equal(foe.targetId, druid.id, 'even one that goes for the healer');
});

test('a hit breaks the paladin\'s healing', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const paladin = unit(battle, 'paladin');
    const druid = unit(battle, 'druid');
    druid.hp = druid.maxHp / 2;
    paladin.bar = 0.999;
    step(battle, 0.05);
    assert.ok(paladin.cast, 'he starts to heal the druid');
    battle.hits.push({ at: battle.time, from: 0, to: paladin.id, amount: 5 });
    step(battle, 0.02);
    assert.equal(paladin.cast, null);
    assert.ok(battle.events.some(e => e.type === 'interrupted'));
});

test('the hunter walks where he is sent on his next turn, instead of shooting', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const hunter = hunterOf(battle);
    battle.events.length = 0;
    assert.ok(moveHunter(battle, 0, 0));
    hunter.bar = 0.999;
    step(battle, 0.05);
    assert.ok(hunter.path.length > 0);
    assert.ok(!battle.events.some(e => e.type === 'shot' && e.from === hunter.id));
    play(battle, 2);
    assert.deepEqual([hunter.col, hunter.row], [0, 0]);
});

test('his spells wait for their cooldowns; potions run out', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    bringClose(battle);
    assert.ok(multiShot(battle));
    assert.ok(!multiShot(battle), 'not again at once');
    assert.equal(battle.events.filter(e => e.type === 'shot' && e.kind === 'multi').length, 3, 'three foes');
    assert.ok(arcaneShot(battle));
    assert.ok(!arcaneShot(battle));
    const hunter = hunterOf(battle);
    hunter.hp = 10;
    assert.ok(drinkPotion(battle));
    play(battle, 3);
    hunter.hp = 10;
    assert.ok(drinkPotion(battle));
    play(battle, 3);
    hunter.hp = 10;
    assert.ok(!drinkPotion(battle), 'two to a run');
    assert.equal(switchPet(battle), 'defensive');
});

test('Targorr roars once, below half his health', () => {
    const battle = createBattle({ rng: even });
    battle.dungeon = { ...battle.dungeon, waves: [['targorr']] };
    play(battle, 2);
    const targorr = unit(battle, 'targorr');
    battle.hits.push({ at: battle.time, from: 0, to: targorr.id, amount: Math.ceil(targorr.maxHp * 0.55) });
    step(battle, 0.02);
    const fast = targorr.interval;
    battle.hits.push({ at: battle.time, from: 0, to: targorr.id, amount: 10 });
    step(battle, 0.02);
    assert.equal(battle.events.filter(e => e.type === 'roar').length, 1);
    assert.ok(fast < 7.5 / FOES.targorr.speed);
    assert.equal(targorr.interval, fast);
});

test('the run is lost when he falls, and won when Targorr does', () => {
    const lost = createBattle({ rng: even });
    play(lost, 2);
    hunterOf(lost).hp = 1;
    lost.hits.push({ at: lost.time, from: 0, to: hunterOf(lost).id, amount: 50 });
    step(lost, 0.02);
    assert.equal(lost.result, 'lost');

    const won = createBattle({ rng: even });
    won.dungeon = { ...won.dungeon, waves: [['prisoner']] };
    play(won, 2);
    living(won, 'foe')[0].hp = 1;
    play(won, 4);
    assert.equal(won.result, 'won');
});

test('a hunter who only stands and Auto Shoots does not get through', () => {
    let rng = 7;
    const dice = () => ((rng = (rng * 16807) % 2147483647) / 2147483647);
    const battle = createBattle({ rng: dice });
    play(battle, 600);
    assert.equal(battle.result, 'lost');
});

test('who acts next is the one whose turn is nearest', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const next = nextToAct(battle, 3);
    assert.equal(next.length, 3);
    assert.ok(next[0].seconds <= next[1].seconds && next[1].seconds <= next[2].seconds);
});

test('a point on the floor is the cell drawn there', () => {
    for (const [col, row] of [[0, 0], [5, 1], [11, 2]]) {
        const foot = cellFoot(col, row);
        assert.deepEqual(cellAt(foot.x, foot.y), { col, row });
    }
    assert.equal(cellAt(720, 50), null);
});

test('the druid or the paladin, sent somewhere, holds it until told to follow', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const paladin = unit(battle, 'paladin');
    assert.ok(moveUnit(battle, 'paladin', 0, 2));
    play(battle, 4);
    assert.deepEqual([paladin.col, paladin.row], [0, 2]);
    play(battle, 4);
    assert.deepEqual([paladin.col, paladin.row], [0, 2], 'still there');
    assert.ok(follow(battle, 'paladin'));
    assert.equal(paladin.hold, null);
});

test('Growl makes the foes near the druid fight him, whoever they went for', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const druid = unit(battle, 'druid');
    const foe = living(battle, 'foe')[0];
    foe.goes = 'healer';
    foe.col = druid.col + 3; foe.row = druid.row;
    assert.ok(castSpell(battle, 'druid', 'growl'));
    foe.bar = 0.999;
    step(battle, 0.05);
    assert.equal(foe.targetId, druid.id);
    assert.ok(!castSpell(battle, 'druid', 'growl'), 'then it waits for its cooldown');
});

test('Hammer of Justice stuns; Blessing of Protection stops all damage; Barkskin softens it', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const paladin = unit(battle, 'paladin'), druid = unit(battle, 'druid');
    const foe = living(battle, 'foe')[0];
    foe.col = paladin.col + 1; foe.row = paladin.row;
    assert.ok(castSpell(battle, 'paladin', 'hammer'));
    assert.ok(living(battle, 'foe').some(f => f.stunnedUntil > battle.clock));

    druid.hp = druid.maxHp / 4;
    assert.ok(castSpell(battle, 'paladin', 'protection'));
    const before = druid.hp;
    battle.hits.push({ at: battle.time, from: 0, to: druid.id, amount: 100 });
    step(battle, 0.02);
    assert.equal(druid.hp >= before, true, 'no damage while protected');

    // (Below half his health he may have cast it himself in that moment: start it afresh)
    druid.immuneUntil = 0;
    battle.spellCooldowns.druid.barkskin = 0;
    assert.ok(castSpell(battle, 'druid', 'barkskin'));
    const now = druid.hp;
    battle.hits.push({ at: battle.time, from: 0, to: druid.id, amount: 100 });
    step(battle, 0.02);
    assert.equal(now - druid.hp, 100 * COMPANION_SPELLS.druid.barkskin.taken);
});

test('a spell they cast themselves takes twice as long to come back', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    assert.ok(castSpell(battle, 'druid', 'barkskin', { auto: true }));
    assert.equal(battle.spellCooldowns.druid.barkskin, COMPANION_SPELLS.druid.barkskin.cooldown * 2);
});

test('set to defensive, the pet leaves the fight and runs back to the hunter', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const pet = unit(battle, 'pet'), hunter = hunterOf(battle);
    pet.col = 9; pet.row = 1;
    switchPet(battle);
    assert.equal(battle.petStance, 'defensive');
    assert.ok(pet.path.length > 0, 'it sets off at once');
    play(battle, 6);
    assert.ok(distance(pet, hunter) <= 1);
});

test('a dead pet is revived beside the hunter; a hit breaks the reviving', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const pet = unit(battle, 'pet'), hunter = hunterOf(battle);
    pet.alive = false; pet.hp = 0;
    assert.ok(revivePet(battle));
    battle.hits.push({ at: battle.time, from: 0, to: hunter.id, amount: 1 });
    step(battle, 0.02);
    assert.equal(hunter.cast, null, 'interrupted');
    assert.ok(!pet.alive);
    assert.ok(revivePet(battle));
    hunter.dodge = 0;
    battle.hits = battle.hits.filter(h => h.to !== hunter.id);
    for (const foe of living(battle, 'foe')) foe.stunnedUntil = battle.clock + 10;
    play(battle, 2.5);
    assert.ok(pet.alive);
    assert.equal(pet.hp, Math.round(pet.maxHp / 2));
    assert.ok(distance(pet, hunter) <= 1);
    assert.ok(!revivePet(battle), 'not while it lives');
    // And not again at once when it falls again: the cooldown
    pet.alive = false; pet.hp = 0;
    assert.ok(!revivePet(battle), 'Revive Pet waits for its cooldown');
    play(battle, 30);
    if (!pet.alive) assert.ok(revivePet(battle) || hunterOf(battle).cast, 'then it can be revived again');
});

test('in auto mode everyone casts what is ready, at its own cooldown', () => {
    const battle = makeBattle({ rng: even });
    play(battle, 1.5);
    bringClose(battle);
    play(battle, 0.6);
    assert.ok(battle.cooldowns.multiShot > 0 && battle.cooldowns.arcaneShot > 0, 'his shots went');
    const druid = unit(battle, 'druid');
    living(battle, 'foe')[0].col = druid.col + 1; living(battle, 'foe')[0].row = druid.row;
    step(battle, 0.02);
    assert.ok(battle.spellCooldowns.druid.swipe <= 6 && battle.spellCooldowns.druid.swipe > 0, 'swipe, at its own cooldown (not twice)');
});

test('a pose or effect played once ends; a looping one goes round', () => {
    const once = { frames: [0, 1, 2, 3], durations: [100, 100, 100, 100] };
    assert.deepEqual(poseFrame(once, 150), { frame: 1, index: 1, done: false });
    assert.equal(poseFrame(once, 399).done, false);
    assert.equal(poseFrame(once, 400).done, true, 'then it is over: an effect is taken away, a pose moves on');
    assert.equal(poseFrame(once, 5000).frame, 3);
    const loop = { ...once, loop: true };
    assert.equal(poseFrame(loop, 450).frame, 0);
    assert.equal(poseFrame(loop, 5000).done, false);
});

test('the player has the paladin heal whom he chooses, and aims his blessings', async () => {
    const { holyLight } = await import('../dungeon/battle.js');
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const paladin = unit(battle, 'paladin'), hunter = hunterOf(battle), druid = unit(battle, 'druid');
    for (const foe of living(battle, 'foe')) foe.stunnedUntil = battle.clock + 20;
    hunter.hp = hunter.maxHp - 50;
    druid.hp = druid.maxHp / 3;
    assert.ok(holyLight(battle, hunter.id));
    assert.equal(paladin.cast.to, hunter.id, 'the hunter, though the druid is lower');
    play(battle, 1.5);
    assert.equal(hunter.hp, hunter.maxHp);

    assert.ok(castSpell(battle, 'paladin', 'protection', { target: hunter.id }));
    assert.ok(hunter.immuneUntil > battle.clock);
    assert.ok(!castSpell(battle, 'paladin', 'layOnHands', { target: hunter.id }), 'nothing to heal on him');
    assert.ok(castSpell(battle, 'paladin', 'layOnHands', { target: druid.id }));
    assert.equal(druid.hp, druid.maxHp);
});

test('each one has his own auto mode; the general one sets them all', () => {
    const battle = makeBattle({ rng: even });
    assert.equal(autoState(battle), 'all');
    setAuto(battle, false, 'druid');
    assert.equal(autoState(battle), 'some');
    setAuto(battle, false);
    assert.equal(autoState(battle), 'none');
    setAuto(battle, true);
    assert.deepEqual(battle.auto, { hunter: true, druid: true, paladin: true, pet: true, mage: true });
});

test('off auto, his turn stops the fight until the player orders him; one order a turn', async () => {
    const { awaitingUnit, turnAttack, turnMove, turnWait, turnDefend } = await import('../dungeon/battle.js');
    const battle = makeBattle({ rng: even });
    setAuto(battle, false, 'druid');
    let waiting = null;
    for (let t = 0; t < 90 && !waiting; t += 1 / 30) { step(battle, 1 / 30); waiting = awaitingUnit(battle); }
    const druid = unit(battle, 'druid');
    assert.equal(waiting, druid, 'his turn came');
    const time = battle.time;
    play(battle, 2);
    assert.equal(battle.time, time, 'nothing moves while he waits for an order');
    assert.ok(!castSpell(battle, 'paladin', 'hammer') || battle.auto.paladin, 'the others act by themselves');

    // Defend: more defense until his next turn
    const defense = druid.defense;
    assert.ok(turnDefend(battle));
    assert.ok(druid.defense > defense);
    assert.equal(awaitingUnit(battle), null);
    for (let t = 0; t < 90 && !awaitingUnit(battle); t += 1 / 30) step(battle, 1 / 30);
    assert.equal(druid.defense, defense, 'it ends at his next turn');

    // Wait: his turn goes after everyone else's, and only once
    assert.ok(turnWait(battle));
    assert.ok(druid.bar < 1 && awaitingUnit(battle) === null);
    for (let t = 0; t < 90 && !awaitingUnit(battle); t += 1 / 30) step(battle, 1 / 30);
    assert.equal(awaitingUnit(battle), druid);
    assert.ok(!turnWait(battle), 'not twice in a row');

    // A foe out of reach: he goes toward it, and that is his turn
    const foe = living(battle, 'foe').sort((a, b) => distance(b, druid) - distance(a, druid))[0];
    // (No way to it, every cell around it taken: refused, his turn still his)
    if (distance(foe, druid) > 1 && turnAttack(battle, foe.id)) {
        assert.ok(druid.path.length > 0);
        assert.equal(awaitingUnit(battle), null);
    } else {
        assert.equal(awaitingUnit(battle), druid);
        assert.ok(turnMove(battle, 0, 0));
    }
});

test('the pet is played too: its own turns and its Claw', async () => {
    const { awaitingUnit, turnAttack } = await import('../dungeon/battle.js');
    const battle = makeBattle({ rng: even });
    setAuto(battle, false, 'pet');
    let waiting = null;
    for (let t = 0; t < 90 && !waiting; t += 1 / 30) { step(battle, 1 / 30); waiting = awaitingUnit(battle); }
    const pet = unit(battle, 'pet');
    assert.equal(waiting, pet);
    const foe = living(battle, 'foe')[0];
    foe.col = pet.col + 1; foe.row = pet.row;
    assert.ok(castSpell(battle, 'pet', 'claw'), 'Claw on the foe beside it, as its turn');
    assert.equal(awaitingUnit(battle), null);
    assert.ok(battle.spellCooldowns.pet.claw > 0);
    assert.ok(!turnAttack(battle, foe.id), 'no second order this turn');
});

test('the heal plan: the druid always first, and never Lay on Hands on the pet', async () => {
    const { setHealPlan, planTarget, defaultHealPlan } = await import('../dungeon/battle.js');
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const druid = unit(battle, 'druid'), pet = unit(battle, 'pet'), hunter = hunterOf(battle);
    assert.equal(defaultHealPlan().allow.layOnHands.pet, false, 'by default the pet gets no Lay on Hands');
    druid.hp = druid.maxHp * 0.85;
    hunter.hp = hunter.maxHp * 0.3;
    assert.equal(planTarget(battle, 'holyLight').kind, 'hunter', 'lowest first: the hunter');
    setHealPlan(battle, { mode: 'order', order: ['druid', 'hunter', 'paladin', 'pet'] });
    assert.equal(planTarget(battle, 'holyLight').kind, 'druid', 'in order: the druid, though the hunter is lower');

    pet.hp = 5;
    hunter.hp = hunter.maxHp;
    druid.hp = druid.maxHp;
    assert.equal(planTarget(battle, 'layOnHands'), null, 'the pet is never given Lay on Hands');
    assert.ok(!castSpell(battle, 'paladin', 'layOnHands'), 'nor by his own choice');
    assert.ok(castSpell(battle, 'paladin', 'layOnHands', { target: pet.id }), 'the player may still choose to');

    setHealPlan(battle, { mode: 'order', order: ['druid', 'hunter', 'paladin', 'pet'], allow: { holyLight: { pet: false } } });
    assert.equal(planTarget(battle, 'holyLight'), null, 'nobody else needs it, the pet is left out');
});

test('the dungeon art version is that of the art in assets/dungeon (npm run dungeon-art)', async () => {
    const { dungeonArtVersion } = await import('../tools/dungeon-art-version.mjs');
    const { ART_VERSION } = await import('../dungeon/artVersion.js');
    assert.equal(ART_VERSION, dungeonArtVersion(), 'the art changed: run npm run dungeon-art, or browsers keep the old pictures');
});

test('the pet goes round and bites from behind its target', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const pet = unit(battle, 'pet');
    const foes = living(battle, 'foe');
    for (const foe of foes) foe.stunnedUntil = battle.clock + 30;   // they stand still for the test
    const target = foes[0];
    target.col = 6; target.row = 1;
    for (const [i, foe] of foes.slice(1).entries()) { foe.col = 10 + (i % 2); foe.row = i % 3; }
    unit(battle, 'druid').targetId = target.id;
    pet.col = 3; pet.row = 1; pet.path = [];
    for (let i = 0; i < 6 && !(pet.col === 7 && Math.abs(pet.row - 1) <= 1); i++) {
        pet.bar = 0.999;
        play(battle, 2);
    }
    assert.equal(pet.col, 7, 'on the far side of it');
    assert.ok(Math.abs(pet.row - target.row) <= 1);
});

test('attacked itself, the pet stands and fights back', () => {
    const battle = createBattle({ rng: even });
    play(battle, 2);
    const pet = unit(battle, 'pet');
    const foes = living(battle, 'foe');
    for (const foe of foes) foe.stunnedUntil = battle.clock + 30;
    const attacker = foes[0];
    pet.col = 4; pet.row = 2; pet.path = [];
    attacker.col = 3; attacker.row = 2; attacker.targetId = pet.id;
    battle.events.length = 0;
    pet.bar = 0.999;
    step(battle, 0.05);
    assert.deepEqual([pet.col, pet.row], [4, 2], 'it does not go round');
    assert.ok(battle.events.some(e => e.type === 'strike' && e.from === pet.id && e.to === attacker.id));
});

test('his bow reaches seven cells, the paladin\'s heals six', async () => {
    const { shootTarget, holyLight } = await import('../dungeon/battle.js');
    const battle = createBattle({ rng: even });
    play(battle, 1.6);
    const hunter = hunterOf(battle);
    for (const foe of living(battle, 'foe')) { foe.col = 11; foe.stunnedUntil = battle.clock + 30; }
    assert.equal(shootTarget(battle), null, 'nothing at the far end');
    assert.ok(!multiShot(battle) && !arcaneShot(battle));
    living(battle, 'foe')[0].col = hunter.col + 7;
    assert.ok(shootTarget(battle), 'seven cells away is within reach');

    const paladin = unit(battle, 'paladin'), druid = unit(battle, 'druid');
    paladin.col = 0; paladin.row = 0; paladin.path = [];
    druid.col = 10; druid.row = 2; druid.path = []; druid.hp = druid.maxHp / 2;
    assert.ok(holyLight(battle, druid.id), 'told to, he goes');
    assert.equal(paladin.cast, null, 'not from there');
    assert.ok(paladin.path.length > 0 && paladin.pending);
    play(battle, 3);
    assert.ok(distance(paladin, druid) <= paladin.range, 'he walked into reach');
    assert.ok(druid.hp > druid.maxHp / 2, 'and healed him');
});

test('a fight starts with everyone on Auto', () => {
    const battle = makeBattle({ rng: even });
    assert.deepEqual(battle.auto, { hunter: true, druid: true, paladin: true, pet: true, mage: true });
});

test('too close to shoot: a foe two cells away or nearer is fought hand to hand', async () => {
    const { shootTarget, attackFoe } = await import('../dungeon/battle.js');
    const battle = createBattle({ rng: even });
    play(battle, 1.6);
    const hunter = hunterOf(battle);
    const foes = living(battle, 'foe');
    for (const foe of foes) { foe.stunnedUntil = battle.clock + 30; foe.col = 11; foe.path = []; }
    hunter.col = 2; hunter.row = 1; hunter.path = [];
    const near = foes[0], far = foes[1];
    near.col = 3; near.row = 1;
    far.col = 6; far.row = 1;
    assert.equal(shootTarget(battle), far, 'he shoots the far one, not the one beside him');
    far.col = 11;
    assert.equal(shootTarget(battle), null, 'the one beside him cannot be shot');
    assert.ok(!multiShot(battle));
    battle.events.length = 0;
    hunter.bar = 0.999;
    step(battle, 0.05);
    assert.ok(battle.events.some(e => e.type === 'strike' && e.from === hunter.id && e.to === near.id), 'a blow instead');

    near.col = 4;   // two cells: neither shot nor beside him
    assert.ok(attackFoe(battle, near.id));
    hunter.bar = 0.999;
    play(battle, 1);
    assert.equal(distance(hunter, near), 1, 'pointed at it, he closes in to strike');
});

test('a spell the player aims goes to the target he chose, if it reaches it', async () => {
    const battle = createBattle({ rng: even });
    play(battle, 1.6);
    const hunter = hunterOf(battle);
    const foes = living(battle, 'foe');
    for (const foe of foes) { foe.stunnedUntil = battle.clock + 30; foe.col = 11; foe.path = []; }
    hunter.col = 1; hunter.row = 1; hunter.path = [];
    const near = foes[0], far = foes[1];
    near.col = 5; near.row = 0;
    assert.ok(!arcaneShot(battle, far.id), 'out of his reach: refused');
    battle.events.length = 0;
    assert.ok(arcaneShot(battle, near.id));
    assert.ok(battle.events.some(e => e.type === 'shot' && e.to === near.id && e.kind === 'arcane'));

    const paladin = unit(battle, 'paladin');
    near.stunnedUntil = 0;
    paladin.col = 2; paladin.row = 0;
    assert.ok(!castSpell(battle, 'paladin', 'hammer', { target: far.id }), 'Hammer: too far');
    assert.ok(castSpell(battle, 'paladin', 'hammer', { target: near.id }));
    assert.ok(near.stunnedUntil > battle.clock);
});

test('turn by turn, one acts at a time: his action plays out before the next one\'s turn', async () => {
    const { awaitingUnit, turnAttack } = await import('../dungeon/battle.js');
    const battle = makeBattle({ rng: even });
    setAuto(battle, false, 'druid');
    // Never two walking or striking at once
    let most = 0;
    for (let t = 0; t < 30; t += 1 / 30) {
        step(battle, 1 / 30);
        const turn = awaitingUnit(battle);
        if (turn) {
            const foe = living(battle, 'foe').sort((a, b) => distance(a, turn) - distance(b, turn))[0];
            if (foe) turnAttack(battle, foe.id);
        }
        most = Math.max(most, battle.units.filter(u => u.alive && (u.path.length || u.cast)).length);
    }
    assert.ok(most <= 1, `at most one acting at a time (saw ${most})`);
});

test('a foe he can reach this turn: one click walks him to it and strikes it', async () => {
    const { awaitingUnit, turnAttack } = await import('../dungeon/battle.js');
    const battle = makeBattle({ rng: even });
    setAuto(battle, false, 'druid');
    let turn = null;
    for (let t = 0; t < 90 && !turn; t += 1 / 30) { step(battle, 1 / 30); turn = awaitingUnit(battle); }
    const druid = unit(battle, 'druid');
    assert.equal(turn, druid);
    const foe = living(battle, 'foe')[0];
    for (const other of living(battle, 'foe')) if (other !== foe) { other.col = 11; other.stunnedUntil = battle.clock + 30; }
    foe.col = druid.col + 3; foe.row = druid.row; foe.path = [];
    const hp = foe.hp;
    battle.events.length = 0;
    assert.ok(turnAttack(battle, foe.id));
    for (let t = 0; t < 2; t += 1 / 30) step(battle, 1 / 30);
    assert.equal(distance(druid, foe), 1, 'he is beside it');
    assert.ok(foe.hp < hp, 'and struck it, the same turn');
});

test('turn by turn, a cooldown goes down by his own turns, not by what the others do between', async () => {
    const { awaitingUnit } = await import('../dungeon/battle.js');
    const battle = makeBattle({ rng: even });
    setAuto(battle, false, 'hunter');
    const hunter = hunterOf(battle);
    const turn = () => { for (let t = 0; t < 30 && !awaitingUnit(battle); t += 1 / 30) step(battle, 1 / 30); return awaitingUnit(battle); };
    assert.equal(turn(), hunter);
    // Multi-Shot's cooldown as it stands at each of his turns: down by one of his turns each time
    battle.cooldowns.multiShot = 6;
    const seen = [];
    for (let i = 0; i < 3; i++) {
        turnDefend(battle);
        turn();
        seen.push(battle.cooldowns.multiShot);
    }
    const perTurn = hunter.interval;
    assert.ok(Math.abs((6 - seen[0]) - perTurn) < 0.05, `one turn: ${6 - seen[0]} ≈ ${perTurn}`);
    assert.ok(Math.abs((seen[0] - seen[1]) - perTurn) < 0.05, 'and the same the next turn, whatever happened between');
});

test('the mage: Fireball from afar, Frostbolt slows, Frost Nova freezes, Ice Barrier absorbs, Blink', () => {
    const battle = createBattle({ rng: even });
    play(battle, 1.6);
    const mage = unit(battle, 'mage');
    const foes = living(battle, 'foe');
    for (const foe of foes) { foe.col = 11; foe.path = []; }
    mage.col = 2; mage.row = 1; mage.path = [];
    const a = foes[0], b = foes[1];
    a.col = 6; a.row = 1;
    battle.events.length = 0;
    const speed = a.interval;
    assert.ok(castSpell(battle, 'mage', 'frostbolt', { target: a.id }));
    assert.ok(a.interval > speed, 'slowed');
    assert.ok(battle.events.some(e => e.type === 'shot' && e.kind === 'frostbolt'));
    assert.ok(!castSpell(battle, 'mage', 'fireball', { target: foes[2].id }), 'eleven cells away: out of his reach');

    a.col = 3; b.col = 4; b.row = 2;
    assert.ok(castSpell(battle, 'mage', 'frostNova'));
    assert.ok(a.rootedUntil > battle.clock && b.rootedUntil > battle.clock);
    const at = [b.col, b.row];
    b.bar = 0.999;
    play(battle, 0.5);
    assert.deepEqual([b.col, b.row], at, 'a frozen foe does not move');

    assert.ok(castSpell(battle, 'mage', 'iceBarrier'));
    const hp = mage.hp;
    battle.hits.push({ at: battle.time, from: 0, to: mage.id, amount: 100 });
    step(battle, 0.02);
    assert.equal(mage.hp, hp, 'the barrier took it');

    assert.ok(!castSpell(battle, 'mage', 'blink', { target: { col: 10, row: 0 } }), 'too far to blink');
    assert.ok(castSpell(battle, 'mage', 'blink', { target: { col: 0, row: 0 } }));
    assert.deepEqual([mage.col, mage.row], [0, 0]);
});
