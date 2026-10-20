// A dungeon fight, played out without drawing anything (dungeon/dungeonGame.js draws it, and the
// tests and the lab play it headless). Real time, Heroes 3 rules: each fighter's bar fills at its
// speed, and when full it acts: walks up to its speed in cells, then strikes if it stands beside
// its target, or shoots.
//
// The druid and the paladin are scripted; so are the foes and the hunter's pet. The player moves
// the hunter (moveHunter: he walks there on his next turn instead of shooting) and casts his
// spells (multiShot, arcaneShot, drinkPotion, switchPet). His Auto Shot fires by itself. He can
// also send the druid or the paladin to a cell (moveUnit: they hold it until released with
// follow) and cast their spells (castSpell); what he does not cast they cast themselves when
// it helps. Each of the three has an auto mode of his own (setAuto): on, he casts all his spells
// as soon as each is ready and would do something; setAuto without a name sets all three.
//
// One NOT on auto is played turn by turn: when his bar fills the fight stops (battle.awaiting) until
// the player gives him one order (turnAttack, turnMove, turnHeal, a spell, turnWait, turnDefend).
//
// What happens is told in battle.events (read and cleared by whoever draws it): strikes, shots,
// hits, heals, deaths, waves.

import { COLS, ROWS, actionInterval, distance, damageRoll, pathToward, pathToAny, bestStep } from './rules.js';
import { STOCKADE, PARTY, FOES, SPELLS, COMPANION_SPELLS, hunterStats } from './stockade.js';

const WALK = 4;            // cells a second, walking
const ARROW = 18;          // cells a second, an arrow or a thrown rock
const STRIKE_DELAY = 0.26; // seconds from a blow starting to it landing: the art's contact frame
// ... each one's own (dungeon/motion.js contactAtMs): the insurgent quick, the convict heavy
const CONTACT = { druid: 0.245, prisoner: 0.215, convict: 0.3, paladin: 0.255, insurgent: 0.19, targorr: 0.275, pet: 0.215 };
const CLEAVE_CONTACT = 0.325;
const HOLD_LINE = 6;       // the column the druid holds when nobody has slipped past him
const BEAT = 0.25;         // seconds between one's action ending and the next turn, turn by turn
const AUTO_SLOWER = 2;     // how much longer a spell they cast themselves takes to come back

export function createBattle({ gear = {}, rng = Math.random, dungeon = STOCKADE } = {}) {
    const battle = {
        dungeon, rng, time: 0, clock: 0, nextId: 1,
        units: [], hits: [], events: [],
        wave: -1, phase: 'between', phaseTime: 1.5,
        cooldowns: { multiShot: 0, arcaneShot: 0, potion: 0, revivePet: 0 },
        spellCooldowns: { druid: {}, paladin: {}, pet: {}, mage: {} },
        potions: SPELLS.potion.count,
        petStance: 'aggressive',
        // Each one's auto mode: all his spells cast for him as they come ready. On from the start:
        // the player turns off whom he wants to play himself
        auto: { hunter: true, druid: true, paladin: true, pet: true, mage: true },
        // The one whose turn it is, waiting for the player's order (his id), or null
        awaiting: null,
        // Those on auto cast their spells themselves (off only in the tests, to test spells alone)
        autoSpells: true,
        // How the paladin chooses whom to heal when he chooses himself (setHealPlan)
        healPlan: defaultHealPlan(),
        result: null,
    };
    add(battle, 'druid', 'party', PARTY.druid, 3, 1);
    add(battle, 'paladin', 'party', PARTY.paladin, 1, 0);
    add(battle, 'hunter', 'party', hunterStats(gear), 1, 2);
    add(battle, 'pet', 'party', PARTY.pet, 2, 2);
    add(battle, 'mage', 'party', PARTY.mage, 0, 1);
    return battle;
}

// The paladin's heal plan: Holy Light to the lowest of the party, or to the first in "order" who
// needs it; and who may be given each of his spells ("allow"). The player's own casts (the + on a
// card, a spell aimed at someone) are not bound by it.
export const HEALED = ['druid', 'hunter', 'paladin', 'mage', 'pet'];
export function defaultHealPlan() {
    const all = () => Object.fromEntries(HEALED.map(kind => [kind, true]));
    return { mode: 'lowest', order: [...HEALED], allow: { holyLight: all(), protection: all(), layOnHands: { ...all(), pet: false } } };
}

export function setHealPlan(battle, plan) {
    const base = defaultHealPlan();
    const order = Array.isArray(plan?.order) && HEALED.every(kind => plan.order.includes(kind)) ? plan.order.filter(kind => HEALED.includes(kind)) : base.order;
    const allow = {};
    for (const spell of Object.keys(base.allow)) {
        allow[spell] = Object.fromEntries(HEALED.map(kind => [kind, plan?.allow?.[spell]?.[kind] ?? base.allow[spell][kind]]));
    }
    battle.healPlan = { mode: plan?.mode === 'order' ? 'order' : 'lowest', order, allow };
    return battle.healPlan;
}

const allowed = (battle, spell, unit) => battle.healPlan.allow[spell][unit.kind] !== false;

// Whom the paladin's plan gives a spell to now: Holy Light by its mode, his blessings to the
// lowest allowed. Null: nobody he may give it to needs it.
export function planTarget(battle, spell, { need = null } = {}) {
    const share = u => u.hp / u.maxHp;
    // Only those within his reach
    const paladin = of(battle, 'paladin');
    const party = living(battle, 'party').filter(u => allowed(battle, spell, u) && (!paladin || distance(paladin, u) <= paladin.range));
    if (spell === 'holyLight') {
        const wounded = party.filter(u => share(u) < (need ?? (u.kind === 'druid' ? 0.9 : 0.8)));
        if (!wounded.length) return null;
        if (battle.healPlan.mode === 'order') return battle.healPlan.order.map(kind => wounded.find(u => u.kind === kind)).find(Boolean);
        return wounded.reduce((a, b) => (share(b) - (b.kind === 'druid' ? 0.1 : 0)) < (share(a) - (a.kind === 'druid' ? 0.1 : 0)) ? b : a);
    }
    const hurt = party.filter(u => u.hp < u.maxHp && (need === null || share(u) < need) && (spell !== 'protection' || u.immuneUntil <= battle.clock));
    return hurt.sort((a, b) => share(a) - share(b))[0] || null;
}

function add(battle, kind, side, stats, col, row) {
    const unit = {
        id: battle.nextId++, kind, side, ...stats,
        hp: stats.maxHp, col, row,
        bar: battle.rng() * 0.5, interval: actionInterval(stats.speed),
        path: [], walked: 0, cast: null, targetId: null, blows: 0, enraged: false,
        hold: null, stunnedUntil: 0, immuneUntil: 0, barkUntil: 0, growledBy: null, growlUntil: 0,
        facing: side === 'party' ? 1 : -1, alive: true,
    };
    battle.units.push(unit);
    return unit;
}

export const living = (battle, side) => battle.units.filter(u => u.alive && (!side || u.side === side));
export const unitById = (battle, id) => battle.units.find(u => u.id === id);
export const hunterOf = battle => battle.units.find(u => u.kind === 'hunter');
const of = (battle, kind) => battle.units.find(u => u.kind === kind && u.alive);

function say(battle, type, data) {
    battle.events.push({ type, time: battle.time, ...data });
}

function blocked(battle, mover) {
    return (col, row) => battle.units.some(u => u.alive && u !== mover && u.col === col && u.row === row
        // A cell someone is walking into is taken already
        || (u.alive && u !== mover && u.path.length && u.path[u.path.length - 1].col === col && u.path[u.path.length - 1].row === row));
}

// ---- The waves ----

function spawnWave(battle) {
    battle.wave++;
    const kinds = battle.dungeon.waves[battle.wave];
    const free = (col, row) => !battle.units.some(u => u.alive && u.col === col && u.row === row);
    let placed = 0;
    for (const kind of kinds) {
        // In from the right, filling the last columns row by row (the boss in the middle)
        for (let i = 0; i < COLS * ROWS; i++) {
            const col = COLS - 1 - Math.floor(i / ROWS), row = FOES[kind].boss ? 1 : (placed + i) % ROWS;
            if (free(col, row)) {
                const foe = add(battle, kind, 'foe', FOES[kind], col, row);
                foe.bar = battle.rng() * 0.3;
                placed++;
                break;
            }
        }
    }
    say(battle, 'wave', { wave: battle.wave, waves: battle.dungeon.waves.length, boss: kinds.some(k => FOES[k].boss) });
}

// Between waves the paladin, if he stands, raises the fallen (a third of their health) and the
// party gets its breath
function betweenWaves(battle) {
    const paladin = of(battle, 'paladin');
    for (const unit of battle.units.filter(u => u.side === 'party')) {
        if (!unit.alive && paladin && unit.kind !== 'hunter') {
            unit.alive = true;
            unit.hp = Math.round(unit.maxHp / 3);
            say(battle, 'raised', { to: unit.id, from: paladin.id });
        }
        unit.cast = null;
    }
    // The fallen foes are cleared away
    battle.units = battle.units.filter(u => u.side === 'party' || u.alive);
}

// ---- One moment of the fight ----

export function step(battle, dt) {
    if (battle.result) return battle;
    // Waiting for the player's order: nothing moves (unless he was put on Auto, or fell)
    if (battle.awaiting) {
        const waiting = unitById(battle, battle.awaiting);
        if (waiting && waiting.alive && !battle.auto[waiting.kind]) return battle;
        battle.awaiting = null;
        if (waiting && waiting.alive) { waiting.bar = 0; act(battle, waiting); }
    }
    battle.time += dt;

    if (battle.phase === 'between') {
        battle.phaseTime -= dt;
        if (battle.phaseTime <= 0) {
            spawnWave(battle);
            battle.phase = 'fight';
        }
    }

    // Blows and shots landing
    for (const hit of battle.hits.filter(h => h.at <= battle.time)) land(battle, hit);
    battle.hits = battle.hits.filter(h => h.at > battle.time);

    // Anyone played turn by turn: the fight goes one at a time (each action finished before the next)
    battle.sequential = PLAYED.some(kind => !battle.auto[kind]);
    if (battle.phase === 'fight' && battle.autoSpells && !battle.sequential) everyoneCasts(battle);
    if (battle.sequential) return stepInTurns(battle, dt);
    tick(battle, dt);

    for (const unit of battle.units) {
        if (!unit.alive) continue;
        // Stunned: no walking, no turn coming
        if (unit.stunnedUntil > battle.clock) continue;
        if (unit.path.length) {
            walk(battle, unit, dt);
            continue;
        }
        if (unit.cast) {
            unit.cast.time += dt;
            if (unit.cast.time >= unit.cast.duration) finishCast(battle, unit);
            continue;
        }
        refreshSpeed(battle, unit);
        if (battle.phase !== 'fight') continue;
        unit.bar += dt / unit.interval;
        if (unit.bar >= 1) {
            // His turn, and the player plays him: everything waits for the order
            if (played(battle, unit)) {
                startTurn(battle, unit);
                return battle;
            }
            unit.bar = 0;
            act(battle, unit);
        }
    }

    finishWave(battle);
    return battle;
}

// How often his turn comes, from his speed and what is on him now: Dash, Frostbolt's slow,
// Targorr's roar. Spent effects are cleared.
function refreshSpeed(battle, unit) {
    if (unit.dashUntil && unit.dashUntil <= battle.clock) unit.dashUntil = 0;
    if (unit.slowUntil && unit.slowUntil <= battle.clock) unit.slowUntil = 0;
    if (unit.shieldUntil && (unit.shieldUntil <= battle.clock || unit.shield <= 0)) {
        if (unit.shield > 0) say(battle, 'shieldGone', { from: unit.id });
        unit.shieldUntil = 0; unit.shield = 0;
    }
    let speed = unit.speed;
    if (unit.dashUntil) speed *= COMPANION_SPELLS.pet.dash.speed;
    if (unit.slowUntil) speed /= COMPANION_SPELLS.mage.frostbolt.slow;
    if (unit.enraged) speed *= unit.enrage.speed;
    unit.interval = actionInterval(speed);
}

// The fight's own clock, by which cooldowns and spells' effects run: in real time it is the time;
// turn by turn it moves only while the bars fill, never while an action plays out, so between two
// of his turns a fighter's cooldowns go down by exactly one of his turns, however many acted between
function tick(battle, d) {
    battle.clock += d;
    for (const kind of Object.keys(battle.cooldowns)) battle.cooldowns[kind] = Math.max(0, battle.cooldowns[kind] - d);
    for (const who of Object.values(battle.spellCooldowns)) for (const id of Object.keys(who)) who[id] = Math.max(0, who[id] - d);
}

// A wave cleared (the next, or the run won), or the hunter fallen (the run lost)
function finishWave(battle) {
    if (battle.phase === 'fight' && !living(battle, 'foe').length && !battle.hits.length) {
        if (battle.wave >= battle.dungeon.waves.length - 1) {
            battle.result = 'won';
            say(battle, 'won', {});
        } else {
            betweenWaves(battle);
            battle.phase = 'between';
            battle.phaseTime = battle.dungeon.breather;
            say(battle, 'cleared', { wave: battle.wave });
        }
    }
    const hunter = hunterOf(battle);
    if (!hunter.alive && !battle.result) {
        battle.result = 'lost';
        say(battle, 'lost', {});
    }
}

// One at a time: walks, casts and blows in flight play out; while any does, nobody's bar fills.
// Then the bars fill to the next one's turn, and only he acts.
function stepInTurns(battle, dt) {
    for (const unit of battle.units) {
        if (!unit.alive || unit.stunnedUntil > battle.clock) continue;
        if (unit.path.length) walk(battle, unit, dt);
        else if (unit.cast) {
            unit.cast.time += dt;
            if (unit.cast.time >= unit.cast.duration) finishCast(battle, unit);
        }
        refreshSpeed(battle, unit);
    }
    const busy = battle.hits.length || battle.units.some(u => u.alive && (u.path.length || u.cast));
    // A short beat after each action, so one can be told from the next
    if (busy || battle.calmSince === undefined) battle.calmSince = battle.time;
    if (battle.phase === 'fight' && !busy && battle.time - battle.calmSince >= BEAT) {
        const ready = living(battle).filter(u => u.stunnedUntil <= battle.clock);
        if (ready.length) {
            const next = ready.reduce((a, b) => ((1 - b.bar) * b.interval < (1 - a.bar) * a.interval ? b : a));
            const wait = Math.max(0, (1 - next.bar) * next.interval);
            const advance = Math.min(dt, wait);
            tick(battle, advance);
            for (const unit of ready) unit.bar = Math.min(1, unit.bar + advance / unit.interval);
            if (wait <= dt) {
                if (played(battle, next)) startTurn(battle, next);
                else { next.bar = 0; act(battle, next); }
            }
        }
    }
    finishWave(battle);
    return battle;
}

function walk(battle, unit, dt) {
    unit.walked += dt * WALK;
    while (unit.walked >= 1 && unit.path.length) {
        const next = unit.path.shift();
        unit.facing = next.col > unit.col ? 1 : next.col < unit.col ? -1 : unit.facing;
        unit.col = next.col;
        unit.row = next.row;
        unit.walked -= 1;
    }
    if (!unit.path.length) {
        unit.walked = 0;
        // Arrived: a blow at once if the target is beside him (move and strike in one turn)
        if (unit.strikeAfterWalk) {
            const target = unitById(battle, unit.strikeAfterWalk);
            unit.strikeAfterWalk = null;
            if (target && target.alive && distance(unit, target) === 1) {
                if (unit.kind === 'hunter') hunterMelee(battle, unit, target);
                else strike(battle, unit, target);
            }
        }
        // Walked into reach for a spell he was told to cast: cast it
        if (unit.pending) castPending(battle, unit);
    }
}

// ---- Acting ----

function act(battle, unit) {
    // One at a time: his spell, when his Auto has a useful one, is his turn
    if (battle.sequential && PLAYED.includes(unit.kind) && battle.auto[unit.kind] && battle.autoSpells && autoSpells(battle, unit.kind, { one: true })) return;
    if (unit.kind === 'hunter') return hunterActs(battle, unit);
    if (unit.kind === 'druid') return druidActs(battle, unit);
    if (unit.kind === 'paladin') return paladinActs(battle, unit);
    if (unit.kind === 'pet') return petActs(battle, unit);
    if (unit.kind === 'mage') return mageActs(battle, unit);
    return foeActs(battle, unit);
}

// Walk toward a target and strike it if he gets beside it; strike at once if he is there
function closeAndStrike(battle, unit, target) {
    if (distance(unit, target) === 1) return strike(battle, unit, target);
    const path = pathToward(unit, target, unit.speed, blocked(battle, unit));
    if (path.length) {
        unit.path = path;
        unit.strikeAfterWalk = target.id;
        say(battle, 'walk', { from: unit.id });
    }
}

function strike(battle, unit, target, { times = 1, kind = 'strike' } = {}) {
    unit.facing = target.col >= unit.col ? 1 : -1;
    unit.blows++;
    say(battle, kind, { from: unit.id, to: target.id });
    battle.hits.push({ at: battle.time + (CONTACT[unit.kind] ?? STRIKE_DELAY), from: unit.id, to: target.id, amount: damageRoll(unit, target, battle.rng, { times }) });
}

// Seconds from a shot or throw starting to the arrow or rock leaving: the art's release frame
const RELEASE = { hunter: 0.36, agitator: 0.26, mage: 0.32 };

function shoot(battle, unit, target, { times = 1, kind = 'arrow', ignoresDefense = false, delay = 0 } = {}) {
    unit.facing = target.col >= unit.col ? 1 : -1;
    const release = (RELEASE[unit.kind] || 0) + delay;
    const flight = 0.12 + Math.hypot(target.col - unit.col, (target.row - unit.row) * 0.6) / ARROW;
    let amount = damageRoll(unit, target, battle.rng, { times, ignoresDefense });
    const crit = unit.crit && battle.rng() < unit.crit;
    if (crit) amount *= 2;
    say(battle, 'shot', { from: unit.id, to: target.id, kind, flight, release });
    battle.hits.push({ at: battle.time + release + flight, from: unit.id, to: target.id, amount, crit, kind });
}

function land(battle, hit) {
    const target = unitById(battle, hit.to);
    if (!target || !target.alive) return;
    if (target.dodge && battle.rng() < target.dodge) {
        say(battle, 'dodged', { to: target.id });
        return;
    }
    if (target.immuneUntil > battle.clock) {
        say(battle, 'immune', { to: target.id });
        return;
    }
    let amount = target.barkUntil > battle.clock ? Math.max(1, Math.round(hit.amount * COMPANION_SPELLS.druid.barkskin.taken)) : hit.amount;
    // Ice Barrier takes what it can
    if (target.shield > 0 && target.shieldUntil > battle.clock) {
        const absorbed = Math.min(target.shield, amount);
        target.shield -= absorbed;
        amount -= absorbed;
        if (target.shield <= 0) say(battle, 'shieldGone', { from: target.id, broken: true });
        if (!amount) return say(battle, 'absorbed', { to: target.id, amount: absorbed });
    }
    target.hp = Math.max(0, target.hp - amount);
    say(battle, 'hit', { from: hit.from, to: target.id, amount, crit: !!hit.crit, kind: hit.kind || 'strike' });
    // A hit breaks the paladin's casting
    if (target.cast) {
        target.cast = null;
        say(battle, 'interrupted', { from: target.id });
    }
    if (target.hp <= 0) {
        target.alive = false;
        target.path = [];
        say(battle, 'died', { to: target.id, side: target.side });
        return;
    }
    // Targorr's roar, once, below half his health
    if (target.enrageAt && !target.enraged && target.hp <= target.maxHp * target.enrageAt) {
        target.enraged = true;
        target.damage = target.damage.map(d => Math.round(d * target.enrage.damage));
        refreshSpeed(battle, target);
        say(battle, 'roar', { from: target.id });
    }
}

// The druid: goes for whoever is at the paladin or the hunter, else the foe nearest him
function druidActs(battle, druid) {
    const foes = living(battle, 'foe');
    if (!foes.length) return;
    if (holding(battle, druid)) return;
    const guarded = living(battle, 'party').filter(u => u.kind === 'paladin' || u.kind === 'hunter');
    const threats = foes.filter(f => guarded.some(g => distance(f, g) <= 1));
    const pool = threats.length ? threats : foes;
    const target = nearest(druid, pool);
    druid.targetId = target.id;
    // He holds a line in the middle of the room and lets them come to him, unless one is at the
    // paladin or the hunter
    // (Only while foes that fight hand to hand are still coming: throwers left alone, out of the
    // hunter's reach, would never come to him)
    if (!threats.length && distance(druid, target) > 1 && foes.some(f => !f.range)) {
        const path = pathToward(druid, target, druid.speed, blocked(battle, druid));
        const held = path.findIndex(cell => cell.col > HOLD_LINE);
        const walk = held < 0 ? path : path.slice(0, held);
        if (walk.length) {
            druid.path = walk;
            if (walk.length === path.length) druid.strikeAfterWalk = target.id;
            say(battle, 'walk', { from: druid.id });
        }
        return;
    }
    closeAndStrike(battle, druid, target);
}

// The paladin: heals whoever is lowest (the druid first when he is under nine tenths, the others
// under four fifths); else hammers a foe beside him, or keeps two cells behind the druid
function paladinActs(battle, paladin) {
    const target = planTarget(battle, 'holyLight');
    if (target) {
        paladin.cast = { to: target.id, time: 0, duration: paladin.castTime };
        paladin.facing = target.col >= paladin.col ? 1 : -1;
        say(battle, 'cast', { from: paladin.id, to: target.id });
        return;
    }
    const foes = living(battle, 'foe');
    const beside = foes.filter(f => distance(f, paladin) === 1);
    if (beside.length) return strike(battle, paladin, beside[0]);
    if (holding(battle, paladin)) return;
    const druid = of(battle, 'druid');
    if (!druid) return;
    const want = { col: Math.max(0, druid.col - 2), row: paladin.row };
    const path = bestStep(paladin, paladin.speed, blocked(battle, paladin), (col, row) =>
        Math.abs(col - want.col) + Math.abs(row - want.row) * 0.5 - Math.min(3, ...foes.map(f => distance({ col, row }, f))) * 0.6);
    if (path.length) paladin.path = path;
}

function finishCast(battle, caster) {
    if (caster.cast.kind === 'revive') return finishRevive(battle, caster);
    const paladin = caster;
    const target = unitById(battle, paladin.cast.to);
    paladin.cast = null;
    if (!target || !target.alive) return;
    const [low, high] = paladin.heal;
    const amount = Math.min(target.maxHp - target.hp, low + Math.floor(battle.rng() * (high - low + 1)));
    target.hp += amount;
    say(battle, 'heal', { from: paladin.id, to: target.id, amount });
}

// The pet: at the hunter's target when aggressive; when defensive, only at what comes beside him
function petActs(battle, pet) {
    const hunter = hunterOf(battle);
    const foes = living(battle, 'foe');
    if (!foes.length) return;
    // Attacked itself, it stands and fights back (whatever its mode), rather than going round
    const attacker = foes.find(f => f.targetId === pet.id && distance(f, pet) === 1);
    if (attacker) return strike(battle, pet, attacker);
    if (battle.petStance === 'defensive') {
        // Beside the hunter, and only at what comes at him
        if (distance(pet, hunter) > 1) return petComesBack(battle, pet, hunter);
        const near = foes.filter(f => distance(f, hunter) <= 1 && distance(f, pet) === 1);
        if (near.length) strike(battle, pet, nearest(pet, near));
        return;
    }
    flankAndStrike(battle, pet, hunterTarget(battle) || nearest(pet, foes));
}

// The pet fights from behind its target, as a hunter's pet does: from a cell on the far side of
// it (the foes face the party, on the left), else beside it above or below, else wherever it can
// reach. It bites from where it stands if it is already there. (Attacked itself, it stands: petActs.)
function flankAndStrike(battle, pet, target) {
    const taken = blocked(battle, pet);
    const free = cell => cell.col >= 0 && cell.col < COLS && cell.row >= 0 && cell.row < ROWS
        && ((cell.col === pet.col && cell.row === pet.row) || !taken(cell.col, cell.row));
    const ring = (dc, rows) => rows.map(dr => ({ col: target.col + dc, row: target.row + dr }));
    const behind = ring(1, [0, -1, 1]).filter(free);
    const sides = ring(0, [-1, 1]).filter(free);
    const goals = behind.length ? behind : sides.length ? sides : null;
    if (!goals) return closeAndStrike(battle, pet, target);
    if (goals.some(c => c.col === pet.col && c.row === pet.row)) return strike(battle, pet, target);
    const path = pathToAny(pet, goals, pet.speed, taken);
    if (!path.length) return distance(pet, target) === 1 ? strike(battle, pet, target) : closeAndStrike(battle, pet, target);
    pet.path = path;
    const end = path[path.length - 1];
    if (distance(end, target) === 1) pet.strikeAfterWalk = target.id;
    say(battle, 'walk', { from: pet.id });
}

// A foe: the druid if it stands in his taunt; else the healer for those that go for him, else
// the nearest of the party. Throwers keep their distance and throw.
function foeActs(battle, foe) {
    const party = living(battle, 'party');
    if (!party.length) return;
    const druid = of(battle, 'druid');
    let target;
    const growler = foe.growlUntil > battle.clock ? unitById(battle, foe.growledBy) : null;
    if (growler && growler.alive) target = growler;
    else if (druid && distance(foe, druid) <= druid.taunt) target = druid;
    else if (foe.goes === 'healer' && of(battle, 'paladin')) target = of(battle, 'paladin');
    else target = nearest(foe, party);
    foe.targetId = target.id;

    // Frozen by Frost Nova: no step anywhere; a blow at one beside it, a throw from where it stands
    if (foe.rootedUntil > battle.clock) {
        if (foe.range && distance(foe, target) <= foe.range && distance(foe, target) > 1) return shoot(battle, foe, target, { kind: 'rock' });
        const beside = party.find(u => distance(u, foe) === 1);
        if (beside) return strike(battle, foe, beside);
        return say(battle, 'frozen', { from: foe.id });
    }

    if (foe.range) {
        if (distance(foe, target) <= foe.range && distance(foe, target) > 1) return shoot(battle, foe, target, { kind: 'rock' });
        const path = bestStep(foe, foe.speed, blocked(battle, foe), (col, row) => {
            const d = Math.max(Math.abs(col - target.col), Math.abs(row - target.row));
            return d > foe.range ? d : d < 3 ? 10 - d : 0;
        });
        if (path.length) return void (foe.path = path);
        return strike(battle, foe, target);
    }
    if (foe.cleaveEvery && distance(foe, target) === 1 && (foe.blows + 1) % foe.cleaveEvery === 0) {
        foe.blows++;
        say(battle, 'cleave', { from: foe.id });
        for (const victim of party.filter(u => distance(u, foe) === 1)) {
            battle.hits.push({ at: battle.time + CLEAVE_CONTACT, from: foe.id, to: victim.id, amount: damageRoll(foe, victim, battle.rng, { times: foe.cleave }) });
        }
        return;
    }
    closeAndStrike(battle, foe, target);
}

// ---- The mage ----

// Whom his spells reach: within his range (no foe too near to cast at)
export const inSpellRange = (mage, foe) => distance(mage, foe) <= mage.range;

// His Fireball (his plain ranged attack)
function fireball(battle, mage, foe) {
    shoot(battle, mage, foe, { kind: 'fireball', times: COMPANION_SPELLS.mage.fireball.damage });
}

// The mage by himself: the staff at a foe beside him when it is his only choice, else he keeps
// out of their reach behind the druid and casts Fireball at the druid's target (or the nearest
// within his range); out of range of all, he steps up (never past the druid)
function mageActs(battle, mage) {
    const foes = living(battle, 'foe');
    if (!foes.length) return;
    if (holding(battle, mage)) return;
    const reach = foes.filter(f => inSpellRange(mage, f));
    const wanted = hunterTarget(battle);
    const target = wanted && reach.includes(wanted) ? wanted : reach.length ? nearest(of(battle, 'druid') || mage, reach) : null;
    const beside = foes.filter(f => distance(f, mage) === 1);
    if (beside.length && !target) return strike(battle, mage, beside[0]);
    if (target) return fireball(battle, mage, target);
    const druid = of(battle, 'druid');
    const path = bestStep(mage, mage.speed, blocked(battle, mage), (col, row) => {
        const d = Math.min(...foes.map(f => Math.max(Math.abs(f.col - col), Math.abs(f.row - row))));
        const ahead = druid ? Math.max(0, col - (druid.col - 1)) : 0;
        return Math.max(0, d - mage.range) * 10 + Math.max(0, 3 - d) * 20 + ahead * 15 + col * 0.01;
    });
    if (path.length) { mage.path = path; say(battle, 'walk', { from: mage.id }); }
}

// ---- The druid and the paladin, sent and cast by the player ----

// Sent somewhere by the player, a companion holds it: walks there, then fights only what comes
// beside him (the druid) or heals from there (the paladin). True while he is held.
function holding(battle, unit) {
    if (!unit.hold) return false;
    const goal = unit.hold;
    if (unit.col !== goal.col || unit.row !== goal.row) {
        const path = bestStep(unit, unit.speed, blocked(battle, unit), (col, row) => Math.max(Math.abs(col - goal.col), Math.abs(row - goal.row)));
        if (path.length) {
            unit.path = path;
            say(battle, 'walk', { from: unit.id });
            return true;
        }
    }
    if (unit.kind === 'druid') {
        const beside = living(battle, 'foe').filter(f => distance(f, unit) === 1);
        if (beside.length) {
            const target = beside.find(f => f.id === unit.targetId) || beside[0];
            unit.targetId = target.id;
            strike(battle, unit, target);
        }
    }
    return true;
}

// Send the druid or the paladin (or the hunter) to a cell. They hold it until follow().
export function moveUnit(battle, kind, col, row) {
    const own = battle.units.find(u => u.kind === kind);
    if (own && !battle.auto[kind]) return battle.awaiting === own.id ? turnMove(battle, col, row) : false;
    if (kind === 'hunter') return moveHunter(battle, col, row);
    const unit = of(battle, kind);
    if (!unit || battle.result) return false;
    unit.hold = { col: Math.max(0, Math.min(COLS - 1, col)), row: Math.max(0, Math.min(ROWS - 1, row)) };
    // He goes at once, not at his next turn: the bar he had is kept for when he gets there
    if (!unit.path.length && !unit.cast) {
        const goal = unit.hold;
        const path = bestStep(unit, unit.speed, blocked(battle, unit), (c, r) => Math.max(Math.abs(c - goal.col), Math.abs(r - goal.row)));
        if (path.length) {
            unit.path = path;
            say(battle, 'walk', { from: unit.id });
        }
    }
    say(battle, 'sent', { from: unit.id });
    return true;
}

export function follow(battle, kind) {
    const unit = of(battle, kind);
    if (!unit || !unit.hold) return false;
    unit.hold = null;
    say(battle, 'follow', { from: unit.id });
    return true;
}

export function spellReady(battle, kind, spellId, chosen = null) {
    const unit = of(battle, kind);
    return !!unit && battle.phase === 'fight' && !battle.result && unit.stunnedUntil <= battle.clock
        && !(battle.spellCooldowns[kind][spellId] > 0) && !!spellTarget(battle, kind, spellId, chosen);
}

// Whom a spell would be cast on (or at): null when it would do nothing now
function spellTarget(battle, kind, spellId, chosen = null) {
    const unit = of(battle, kind);
    // An ally the player chose, for the paladin's spells on an ally
    if (chosen && (spellId === 'protection' || spellId === 'layOnHands')) {
        const ally = unitById(battle, chosen);
        if (!ally || !ally.alive || ally.side !== 'party') return null;
        // Played turn by turn, only within his reach
        if (!battle.auto.paladin && distance(unit, ally) > unit.range) return null;
        if (spellId === 'protection') return ally.immuneUntil <= battle.clock ? ally : null;
        return ally.hp < ally.maxHp ? ally : null;
    }
    // A foe the player chose: Hammer of Justice within its range, Claw beside the pet
    if (chosen && (spellId === 'hammer' || spellId === 'claw')) {
        const foe = unitById(battle, chosen);
        if (!foe || !foe.alive || foe.side !== 'foe') return null;
        if (spellId === 'claw') return distance(foe, unit) === 1 ? foe : null;
        return distance(foe, unit) <= COMPANION_SPELLS.paladin.hammer.range && foe.stunnedUntil <= battle.clock ? foe : null;
    }
    const foes = living(battle, 'foe'), party = living(battle, 'party');
    const share = u => u.hp / u.maxHp;
    switch (spellId) {
        case 'fireball': case 'frostbolt': case 'arcaneMissiles': {
            if (chosen) { const foe = unitById(battle, chosen); return foe && foe.alive && foe.side === 'foe' && inSpellRange(unit, foe) ? foe : null; }
            const reach = foes.filter(f => inSpellRange(unit, f));
            const wanted = hunterTarget(battle);
            return reach.find(f => f === wanted) || (reach.length ? nearest(unit, reach) : null);
        }
        case 'frostNova': return foes.some(f => distance(f, unit) <= COMPANION_SPELLS.mage.frostNova.radius && !(f.rootedUntil > battle.clock)) ? unit : null;
        case 'iceBarrier': return unit.shield > 0 && unit.shieldUntil > battle.clock ? null : unit;
        case 'blink': {
            if (chosen && typeof chosen === 'object') {
                const free = !battle.units.some(u => u.alive && u.col === chosen.col && u.row === chosen.row);
                return free && distance(unit, chosen) <= COMPANION_SPELLS.mage.blink.range && distance(unit, chosen) > 0 ? chosen : null;
            }
            // By himself: away from the foes beside him, back toward the party
            if (!foes.some(f => distance(f, unit) === 1)) return null;
            const cells = [];
            for (let col = Math.max(0, unit.col - 4); col <= unit.col; col++) for (let row = 0; row < ROWS; row++) {
                const cell = { col, row };
                if (distance(unit, cell) > 0 && distance(unit, cell) <= COMPANION_SPELLS.mage.blink.range && !battle.units.some(u => u.alive && u.col === col && u.row === row)) cells.push(cell);
            }
            const far = c => Math.min(...foes.map(f => distance(f, c)));
            return cells.sort((a, b) => far(b) - far(a))[0] || null;
        }
        case 'claw': {
            const beside = foes.filter(f => distance(f, unit) === 1);
            const wanted = unitById(battle, hunterOf(battle).focus) || hunterTarget(battle);
            return beside.find(f => f === wanted) || beside[0] || null;
        }
        case 'dash': return unit.dashUntil > battle.clock ? null : unit;
        case 'growl': return foes.some(f => distance(f, unit) <= COMPANION_SPELLS.druid.growl.radius) ? unit : null;
        case 'swipe': return foes.some(f => distance(f, unit) === 1) ? unit : null;
        case 'barkskin': return unit;
        case 'hammer': {
            const reach = foes.filter(f => distance(f, unit) <= COMPANION_SPELLS.paladin.hammer.range && f.stunnedUntil <= battle.clock);
            if (!reach.length) return null;
            const guarded = party.filter(u => u.kind === 'paladin' || u.kind === 'hunter');
            const danger = f => Math.min(...guarded.map(g => distance(f, g))) - (f.boss ? 2 : 0);
            return reach.sort((a, b) => danger(a) - danger(b))[0];
        }
        case 'protection': return planTarget(battle, 'protection');
        case 'layOnHands': return planTarget(battle, 'layOnHands');
    }
    return null;
}

// Cast one of the druid's or the paladin's spells. False when it is not ready or would do nothing.
export function castSpell(battle, kind, spellId, { auto = false, target: chosen = null } = {}) {
    if (!mayAct(battle, kind)) return false;
    const done = castSpellNow(battle, kind, spellId, { auto, target: chosen });
    if (done) spent(battle, kind);
    return done;
}

function castSpellNow(battle, kind, spellId, { auto = false, target: chosen = null } = {}) {
    // An ally the player chose who is out of the paladin's reach: he walks into reach first
    if (chosen && kind === 'paladin' && (spellId === 'protection' || spellId === 'layOnHands')) {
        const paladin = of(battle, 'paladin'), ally = unitById(battle, chosen);
        if (paladin && ally && ally.alive && distance(paladin, ally) > paladin.range && battle.phase === 'fight' && !battle.result
            && paladin.stunnedUntil <= battle.clock && !(battle.spellCooldowns.paladin[spellId] > 0)) return walkIntoReach(battle, paladin, ally, spellId);
    }
    if (!spellReady(battle, kind, spellId, chosen)) return false;
    const unit = of(battle, kind), target = spellTarget(battle, kind, spellId, chosen);
    const spell = COMPANION_SPELLS[kind][spellId];
    // Cast by themselves, a spell takes twice as long to come back: played by hand, they do better
    battle.spellCooldowns[kind][spellId] = spell.cooldown * (auto ? AUTO_SLOWER : 1);
    const t = battle.clock;
    switch (spellId) {
        case 'growl':
            for (const foe of living(battle, 'foe').filter(f => distance(f, unit) <= spell.radius)) {
                foe.growledBy = unit.id;
                foe.growlUntil = t + spell.seconds;
                foe.targetId = unit.id;
            }
            break;
        case 'swipe':
            for (const foe of living(battle, 'foe').filter(f => distance(f, unit) === 1)) {
                battle.hits.push({ at: battle.time + STRIKE_DELAY, from: unit.id, to: foe.id, amount: damageRoll(unit, foe, battle.rng, { times: spell.damage }) });
            }
            break;
        case 'barkskin':
            unit.barkUntil = t + spell.seconds;
            break;
        case 'fireball':
            fireball(battle, unit, target);
            break;
        case 'frostbolt':
            shoot(battle, unit, target, { kind: 'frostbolt', times: spell.damage });
            target.slowUntil = t + spell.seconds;
            refreshSpeed(battle, target);
            break;
        case 'arcaneMissiles':
            for (let i = 0; i < spell.missiles; i++) shoot(battle, unit, target, { kind: 'arcane-missile', times: spell.damage, delay: i * 0.22 });
            break;
        case 'frostNova':
            for (const foe of living(battle, 'foe').filter(f => distance(f, unit) <= spell.radius)) {
                foe.rootedUntil = t + spell.seconds;
                foe.path = [];
                foe.strikeAfterWalk = null;
            }
            break;
        case 'iceBarrier':
            unit.shield = spell.absorb;
            unit.shieldUntil = t + spell.seconds;
            break;
        case 'blink':
            say(battle, 'blink', { from: unit.id, fromCell: { col: unit.col, row: unit.row }, toCell: { col: target.col, row: target.row } });
            unit.col = target.col; unit.row = target.row; unit.path = []; unit.walked = 0;
            break;
        case 'claw':
            unit.facing = target.col >= unit.col ? 1 : -1;
            battle.hits.push({ at: battle.time + (CONTACT.pet ?? STRIKE_DELAY), from: unit.id, to: target.id, amount: damageRoll(unit, target, battle.rng, { times: spell.damage }) });
            say(battle, 'strike', { from: unit.id, to: target.id });
            break;
        case 'dash':
            unit.dashUntil = t + spell.seconds;
            unit.interval = actionInterval(unit.speed * spell.speed);
            break;
        case 'hammer':
            unit.facing = target.col >= unit.col ? 1 : -1;
            target.stunnedUntil = t + 0.25 + spell.seconds;
            target.path = [];
            target.strikeAfterWalk = null;
            break;
        case 'protection':
            target.immuneUntil = t + spell.seconds;
            break;
        case 'layOnHands': {
            const amount = target.maxHp - target.hp;
            target.hp = target.maxHp;
            say(battle, 'heal', { from: unit.id, to: target.id, amount, big: true });
            break;
        }
    }
    say(battle, 'spell', { from: unit.id, to: target.id ?? null, spell: spellId, name: spell.name, auto });
    return true;
}

// The player has the paladin heal someone: he starts Holy Light on him at once (his turn is spent
// on it), breaking off any heal he had begun. False when he cannot (fallen, stunned, the target
// gone, or nobody fighting).
export function holyLight(battle, targetId) {
    const paladin = of(battle, 'paladin'), target = unitById(battle, targetId);
    if (!paladin || !target || !target.alive || target.side !== 'party' || battle.result) return false;
    if (paladin.stunnedUntil > battle.clock || !mayAct(battle, 'paladin')) return false;
    // Played by the player: in reach, the heal is his turn; out of it, the walk toward him is
    if (!battle.auto.paladin) {
        if (distance(paladin, target) > paladin.range) {
            const path = bestStep(paladin, paladin.speed, blocked(battle, paladin),
                (col, row) => Math.max(0, Math.max(Math.abs(col - target.col), Math.abs(row - target.row)) - paladin.range));
            if (!path.length) return false;
            paladin.path = path;
            say(battle, 'walk', { from: paladin.id });
            say(battle, 'outOfRange', { from: paladin.id, to: target.id, walking: true });
            return endTurn(battle, paladin), true;
        }
        paladin.cast = { to: target.id, time: 0, duration: paladin.castTime, ordered: true };
        paladin.facing = target.col >= paladin.col ? 1 : -1;
        say(battle, 'cast', { from: paladin.id, to: target.id, ordered: true });
        return endTurn(battle, paladin), true;
    }
    if (distance(paladin, target) > paladin.range) return walkIntoReach(battle, paladin, target, 'holyLight');
    paladin.path = [];
    paladin.strikeAfterWalk = null;
    paladin.cast = { to: target.id, time: 0, duration: paladin.castTime, ordered: true };
    paladin.bar = 0;
    paladin.facing = target.col >= paladin.col ? 1 : -1;
    say(battle, 'cast', { from: paladin.id, to: target.id, ordered: true });
    return true;
}

// The paladin walks toward an ally out of his reach, the spell kept for when he is near enough
function walkIntoReach(battle, paladin, target, spell) {
    const path = bestStep(paladin, paladin.speed, blocked(battle, paladin),
        (col, row) => Math.max(0, Math.max(Math.abs(col - target.col), Math.abs(row - target.row)) - paladin.range));
    if (!path.length) return false;
    paladin.cast = null;
    paladin.path = path;
    paladin.pending = { spell, to: target.id };
    say(battle, 'walk', { from: paladin.id });
    say(battle, 'outOfRange', { from: paladin.id, to: target.id, walking: true });
    return true;
}

function castPending(battle, paladin) {
    const { spell, to } = paladin.pending;
    paladin.pending = null;
    const target = unitById(battle, to);
    if (!target || !target.alive) return;
    if (spell === 'holyLight') holyLight(battle, to);
    else castSpell(battle, 'paladin', spell, { target: to });
}

// What they cast themselves when the player leaves it to them
export function companionsHelp(battle, { byHand = false, only = ['druid', 'paladin'] } = {}) {
    const druid = only.includes('druid') && of(battle, 'druid'), paladin = only.includes('paladin') && of(battle, 'paladin');
    const foes = living(battle, 'foe'), party = living(battle, 'party');
    if (!foes.length) return;
    const share = u => u.hp / u.maxHp;
    if (druid) {
        // Growl when something nearby is going for the paladin or the hunter
        if (foes.some(f => distance(f, druid) <= COMPANION_SPELLS.druid.growl.radius && f.targetId && f.targetId !== druid.id && unitById(battle, f.targetId)?.side === 'party')) castSpell(battle, 'druid', 'growl', { auto: !byHand });
        if (foes.filter(f => distance(f, druid) === 1).length >= 2) castSpell(battle, 'druid', 'swipe', { auto: !byHand });
        if (share(druid) < 0.45) castSpell(battle, 'druid', 'barkskin', { auto: !byHand });
    }
    if (paladin) {
        const guarded = party.filter(u => u.kind === 'paladin' || u.kind === 'hunter');
        if (foes.some(f => guarded.some(g => distance(f, g) <= 1))) castSpell(battle, 'paladin', 'hammer', { auto: !byHand });
        if (planTarget(battle, 'protection', { need: 0.25 })) castSpell(battle, 'paladin', 'protection', { auto: !byHand });
        if (planTarget(battle, 'layOnHands', { need: 0.18 }) && !(battle.spellCooldowns.paladin.protection > 20)) castSpell(battle, 'paladin', 'layOnHands', { auto: !byHand });
    }
}

// ---- Turns: one the player plays (not on auto) ----

const PLAYED = ['hunter', 'druid', 'paladin', 'pet', 'mage'];
const played = (battle, unit) => PLAYED.includes(unit.kind) && !battle.auto[unit.kind];

function startTurn(battle, unit) {
    unit.bar = 1;
    // Defending lasts until his next turn
    if (unit.defendBonus) { unit.defense -= unit.defendBonus; unit.defendBonus = 0; }
    battle.awaiting = unit.id;
    say(battle, 'turn', { from: unit.id });
}

function endTurn(battle, unit) {
    unit.bar = 0;
    unit.waited = false;
    if (battle.awaiting === unit.id) battle.awaiting = null;
}

// The one whose turn it is, or null
export const awaitingUnit = battle => (battle.awaiting ? unitById(battle, battle.awaiting) : null);

// Whether "kind" may act now: on auto, always; played by the player, only on his turn
function mayAct(battle, kind) {
    const unit = of(battle, kind);
    if (!unit) return false;
    return battle.auto[kind] || battle.awaiting === unit.id;
}

// After an action of his: his turn is spent (when it was his turn)
function spent(battle, kind) {
    const unit = battle.units.find(u => u.kind === kind);
    if (unit && !battle.auto[kind] && battle.awaiting === unit.id) endTurn(battle, unit);
}

// Click a foe: attack it if he can reach it, else go toward it as far as he can this turn
export function turnAttack(battle, foeId) {
    const unit = awaitingUnit(battle), foe = unitById(battle, foeId);
    if (!unit || !foe || !foe.alive || foe.side !== 'foe') return false;
    const d = distance(unit, foe);
    if (unit.kind === 'hunter' && inBowRange(unit, foe)) { unit.focus = foe.id; shoot(battle, unit, foe); return endTurn(battle, unit), true; }
    // The mage: Fireball at a foe in his reach (the staff beside him)
    if (unit.kind === 'mage' && d > 1 && inSpellRange(unit, foe)) { fireball(battle, unit, foe); return endTurn(battle, unit), true; }
    if (d === 1) {
        if (unit.kind === 'hunter') hunterMelee(battle, unit, foe);
        else strike(battle, unit, foe);
        unit.targetId = foe.id;
        return endTurn(battle, unit), true;
    }
    // Toward it: the hunter to where his bow reaches it (or beside it when it is near), the others
    // beside it
    const taken = blocked(battle, unit);
    const ranged = (unit.kind === 'hunter' && d > unit.minRange) || unit.kind === 'mage';
    const path = ranged
        ? bestStep(unit, unit.speed, taken, (col, row) => {
            const dd = Math.max(Math.abs(foe.col - col), Math.abs(foe.row - row));
            return dd > unit.range ? dd - unit.range : dd <= (unit.minRange || 1) ? 5 : 0;
        })
        : pathToward(unit, foe, unit.speed, taken);
    if (!path.length) return false;
    unit.path = path;
    if (unit.kind === 'hunter') unit.focus = foe.id;
    // Beside it at the end of the walk (hand to hand, as Heroes does): the blow too, this turn
    const end = path[path.length - 1];
    if (distance(end, foe) === 1 && !ranged) { unit.strikeAfterWalk = foe.id; unit.targetId = foe.id; }
    say(battle, 'walk', { from: unit.id });
    return endTurn(battle, unit), true;
}

// Click a cell: go there (as far as his speed takes him this turn)
export function turnMove(battle, col, row) {
    const unit = awaitingUnit(battle);
    if (!unit) return false;
    const goal = { col: Math.max(0, Math.min(COLS - 1, col)), row: Math.max(0, Math.min(ROWS - 1, row)) };
    const path = bestStep(unit, unit.speed, blocked(battle, unit), (c, r) => Math.max(Math.abs(c - goal.col), Math.abs(r - goal.row)));
    if (!path.length) return false;
    unit.path = path;
    unit.hold = null;
    say(battle, 'walk', { from: unit.id });
    return endTurn(battle, unit), true;
}

// The paladin on his turn, an ally clicked: Holy Light on him (in reach), else toward him
export function turnHeal(battle, allyId) {
    const unit = awaitingUnit(battle);
    if (!unit || unit.kind !== 'paladin') return false;
    return holyLight(battle, allyId);
}

// Wait: his turn goes to the back, after the slowest of the others (once a turn)
export function turnWait(battle) {
    const unit = awaitingUnit(battle);
    if (!unit || unit.waited) return false;
    const last = Math.max(0, ...living(battle).filter(u => u !== unit && !u.path.length && !u.cast).map(u => (1 - u.bar) * u.interval));
    unit.bar = Math.min(0.99, 1 - (last + 0.05) / unit.interval);
    unit.waited = true;
    battle.awaiting = null;
    say(battle, 'wait', { from: unit.id });
    return true;
}

// Defend: half as much defense again (2 at least) until his next turn
export function turnDefend(battle) {
    const unit = awaitingUnit(battle);
    if (!unit) return false;
    unit.defendBonus = Math.max(2, Math.round(unit.defense * 0.5));
    unit.defense += unit.defendBonus;
    say(battle, 'defend', { from: unit.id });
    return endTurn(battle, unit), true;
}

// For the dungeon lab and "do it for me": what his Auto would do with this turn
export function autoTurn(battle) {
    const unit = awaitingUnit(battle);
    if (!unit) return false;
    endTurn(battle, unit);
    act(battle, unit);
    return true;
}

// ---- The hunter ----

// Whom he shoots: the druid's target while it stands, else the foe nearest the druid (or him)
export function hunterTarget(battle) {
    const foes = living(battle, 'foe');
    if (!foes.length) return null;
    const druid = of(battle, 'druid');
    const held = druid && unitById(battle, druid.targetId);
    if (held && held.alive) return held;
    return nearest(druid || hunterOf(battle), foes);
}

// Can his bow hit him: farther than "minRange" (closer is too near to shoot), within "range"
export const inBowRange = (hunter, foe) => distance(foe, hunter) > hunter.minRange && distance(foe, hunter) <= hunter.range;

// Whom his bow can reach: the one he chose (clicked) or the druid's target if within his bow's
// reach, else the foe nearest the druid (or him) that is; null when none is
export function shootTarget(battle) {
    const hunter = hunterOf(battle);
    const reach = living(battle, 'foe').filter(f => inBowRange(hunter, f));
    if (!reach.length) return null;
    const chosen = unitById(battle, hunter.focus);
    if (chosen && reach.includes(chosen)) return chosen;
    const wanted = hunterTarget(battle);
    if (wanted && reach.includes(wanted)) return wanted;
    return nearest(of(battle, 'druid') || hunter, reach);
}

// A foe the player chose for a shot: it, if his bow reaches it
function chosenShot(battle, foeId) {
    const hunter = hunterOf(battle), foe = unitById(battle, foeId);
    return foe && foe.alive && foe.side === 'foe' && inBowRange(hunter, foe) ? foe : null;
}

// The player points him at a foe: shot if it is within his bow's reach, else fought hand to hand
// (he closes in if it is near but not beside him)
export function attackFoe(battle, foeId) {
    const hunter = hunterOf(battle), foe = unitById(battle, foeId);
    if (!hunter.alive || !foe || !foe.alive || foe.side !== 'foe' || battle.result) return false;
    hunter.focus = foe.id;
    hunter.moveTo = null;
    say(battle, 'focus', { from: hunter.id, to: foe.id });
    return true;
}

// His blow (a knife, hand to hand)
function hunterMelee(battle, hunter, foe) {
    strike(battle, hunter, foe, { times: hunter.melee });
}

function hunterActs(battle, hunter) {
    if (hunter.moveTo) {
        const goal = hunter.moveTo;
        hunter.moveTo = null;
        const path = bestStep(hunter, hunter.speed, blocked(battle, hunter), (col, row) => Math.max(Math.abs(col - goal.col), Math.abs(row - goal.row)));
        if (path.length) {
            hunter.path = path;
            say(battle, 'walk', { from: hunter.id });
            return;
        }
    }
    // The foe he was pointed at: shot from range, struck beside him, closed in on in between
    const chosen = unitById(battle, hunter.focus);
    if (chosen && !chosen.alive) hunter.focus = null;
    else if (chosen && !inBowRange(hunter, chosen)) {
        if (distance(hunter, chosen) === 1) return hunterMelee(battle, hunter, chosen);
        if (distance(hunter, chosen) <= hunter.minRange) {
            const path = pathToward(hunter, chosen, hunter.speed, blocked(battle, hunter));
            if (path.length) { hunter.path = path; hunter.strikeAfterWalk = chosen.id; say(battle, 'walk', { from: hunter.id }); return; }
        }
    }
    const target = shootTarget(battle);
    if (target) return shoot(battle, hunter, target);
    if (!living(battle, 'foe').length) return;
    // Nothing to shoot, a foe beside him: a blow
    const beside = living(battle, 'foe').filter(f => distance(f, hunter) === 1);
    if (beside.length) return hunterMelee(battle, hunter, beside.find(f => f.targetId === hunter.id) || beside[0]);
    // Only foes too near to shoot (not beside him): on Auto he steps back to shooting distance
    const tooNear = living(battle, 'foe').some(f => distance(f, hunter) <= hunter.minRange);
    if (tooNear && battle.auto.hunter) {
        const foes = living(battle, 'foe');
        const path = bestStep(hunter, hunter.speed, blocked(battle, hunter), (col, row) => {
            const d = Math.min(...foes.map(f => Math.max(Math.abs(f.col - col), Math.abs(f.row - row))));
            return d > hunter.minRange ? 0 : 10 - d;
        });
        if (path.length) { hunter.path = path; say(battle, 'walk', { from: hunter.id }); return; }
    }
    if (tooNear) return say(battle, 'tooClose', { from: hunter.id });
    // Nothing within his range: on Auto he steps up until something is; else he says so
    if (battle.auto.hunter) {
        const foes = living(battle, 'foe');
        const druid = of(battle, 'druid');
        // As far forward as his bow needs, never past the druid's line nor near a foe
        const path = bestStep(hunter, hunter.speed, blocked(battle, hunter), (col, row) => {
            const d = Math.min(...foes.map(f => Math.max(Math.abs(f.col - col), Math.abs(f.row - row))));
            const far = Math.max(0, d - hunter.range), near = Math.max(0, hunter.minRange + 1 - d);
            const ahead = druid ? Math.max(0, col - (druid.col - 1)) : 0;
            return far * 10 + near * 20 + ahead * 15 + col * 0.01;
        });
        if (path.length) {
            hunter.path = path;
            say(battle, 'walk', { from: hunter.id });
            return;
        }
    }
    say(battle, 'outOfRange', { from: hunter.id });
}

// The player: walk there on his next turn (in place of that Auto Shot)
export function moveHunter(battle, col, row) {
    const hunter = hunterOf(battle);
    if (!hunter.alive || battle.result) return false;
    hunter.moveTo = { col: Math.max(0, Math.min(COLS - 1, col)), row: Math.max(0, Math.min(ROWS - 1, row)) };
    return true;
}

export function multiShot(battle, targetId = null) {
    const hunter = hunterOf(battle), target = targetId ? chosenShot(battle, targetId) : shootTarget(battle);
    if (!hunter.alive || !target || battle.cooldowns.multiShot > 0 || !mayAct(battle, 'hunter')) return false;
    const others = living(battle, 'foe').filter(f => f !== target && inBowRange(hunter, f)).sort((a, b) => distance(a, target) - distance(b, target));
    for (const foe of [target, ...others].slice(0, SPELLS.multiShot.targets)) {
        shoot(battle, hunter, foe, { kind: 'multi', times: SPELLS.multiShot.damage * (1 + hunter.multishot) });
    }
    battle.cooldowns.multiShot = SPELLS.multiShot.cooldown;
    spent(battle, 'hunter');
    return true;
}

export function arcaneShot(battle, targetId = null) {
    const hunter = hunterOf(battle), target = targetId ? chosenShot(battle, targetId) : shootTarget(battle);
    if (!hunter.alive || !target || battle.cooldowns.arcaneShot > 0 || !mayAct(battle, 'hunter')) return false;
    shoot(battle, hunter, target, { kind: 'arcane', times: SPELLS.arcaneShot.damage * (1 + hunter.arcane), ignoresDefense: true });
    battle.cooldowns.arcaneShot = SPELLS.arcaneShot.cooldown;
    spent(battle, 'hunter');
    return true;
}

export function drinkPotion(battle) {
    const hunter = hunterOf(battle);
    if (!hunter.alive || battle.potions <= 0 || battle.cooldowns.potion > 0 || hunter.hp >= hunter.maxHp || !mayAct(battle, 'hunter')) return false;
    const amount = Math.min(hunter.maxHp - hunter.hp, Math.round(hunter.maxHp * SPELLS.potion.heal));
    hunter.hp += amount;
    battle.potions--;
    battle.cooldowns.potion = SPELLS.potion.cooldown;
    say(battle, 'heal', { from: hunter.id, to: hunter.id, amount, potion: true });
    spent(battle, 'hunter');
    return true;
}

export function switchPet(battle) {
    battle.petStance = battle.petStance === 'aggressive' ? 'defensive' : 'aggressive';
    say(battle, 'petStance', { stance: battle.petStance });
    // Told to be defensive, it leaves the fight at once and runs back to him
    const pet = of(battle, 'pet'), hunter = hunterOf(battle);
    if (battle.petStance === 'defensive' && pet && hunter.alive) {
        pet.strikeAfterWalk = null;
        pet.path = [];
        pet.walked = 0;
        if (distance(pet, hunter) > 1) petComesBack(battle, pet, hunter);
    }
    return battle.petStance;
}

function petComesBack(battle, pet, hunter) {
    const path = pathToward(pet, hunter, pet.speed + 2, blocked(battle, pet));
    if (path.length) {
        pet.path = path;
        say(battle, 'walk', { from: pet.id });
    }
}

// While the pet lies dead, the hunter can bring it back: a cast a hit breaks
export function revivePet(battle) {
    const hunter = hunterOf(battle), pet = battle.units.find(u => u.kind === 'pet');
    if (!hunter.alive || !pet || pet.alive || hunter.cast || battle.result || battle.cooldowns.revivePet > 0 || !mayAct(battle, 'hunter')) return false;
    hunter.path = [];
    hunter.moveTo = null;
    hunter.cast = { kind: 'revive', to: pet.id, time: 0, duration: SPELLS.revivePet.castTime };
    say(battle, 'cast', { from: hunter.id, to: pet.id, revive: true });
    spent(battle, 'hunter');
    return true;
}

function finishRevive(battle, hunter) {
    const pet = unitById(battle, hunter.cast.to);
    hunter.cast = null;
    if (!pet || pet.alive) return;
    // Beside him, on the first free cell
    const taken = blocked(battle, pet);
    const around = [[1, 0], [0, 1], [0, -1], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]]
        .map(([dc, dr]) => ({ col: hunter.col + dc, row: hunter.row + dr }))
        .find(c => c.col >= 0 && c.col < COLS && c.row >= 0 && c.row < ROWS && !taken(c.col, c.row));
    if (around) { pet.col = around.col; pet.row = around.row; }
    pet.alive = true;
    pet.hp = Math.round(pet.maxHp * SPELLS.revivePet.health);
    pet.bar = 0;
    pet.path = [];
    battle.cooldowns.revivePet = SPELLS.revivePet.cooldown;
    say(battle, 'revived', { to: pet.id, from: hunter.id });
}

// One's auto mode on or off ("kind": hunter, druid, paladin), or all three's (no kind)
export function setAuto(battle, on, kind = null) {
    for (const who of kind ? [kind] : Object.keys(battle.auto)) battle.auto[who] = !!on;
    say(battle, 'auto', { kind, on: !!on });
    return !!on;
}

// All three in auto mode: "all"; none: "none"; else "some"
export function autoState(battle) {
    const all = Object.values(battle.auto), on = all.filter(Boolean).length;
    return on === all.length ? 'all' : on === 0 ? 'none' : 'some';
}

// Auto mode: every spell as soon as it is ready and would do something, first come first served,
// at its own cooldown, for each one whose auto mode is on
function everyoneCasts(battle) {
    for (const kind of PLAYED) if (battle.auto[kind]) autoSpells(battle, kind);
}

// One's spells as his Auto casts them: every one ready and useful, or (one: true) the first such,
// then stop. True when anything was cast.
function autoSpells(battle, kind, { one = false } = {}) {
    const unit = of(battle, kind), foes = living(battle, 'foe');
    if (!unit || !foes.length) return false;
    const share = u => u.hp / u.maxHp;
    const tries = {
        hunter: [
            () => multiShot(battle),
            () => arcaneShot(battle),
            () => share(unit) < 0.4 && drinkPotion(battle),
            () => !battle.units.find(u => u.kind === 'pet').alive && revivePet(battle),
        ],
        druid: [
            () => castSpell(battle, 'druid', 'growl'),
            () => castSpell(battle, 'druid', 'swipe'),
            () => foes.some(f => distance(f, unit) === 1) && castSpell(battle, 'druid', 'barkskin'),
        ],
        pet: [
            () => castSpell(battle, 'pet', 'claw'),
            () => { const target = hunterTarget(battle); return !!target && distance(unit, target) > 3 && battle.petStance === 'aggressive' && castSpell(battle, 'pet', 'dash'); },
        ],
        mage: [
            () => foes.filter(f => distance(f, unit) <= COMPANION_SPELLS.mage.frostNova.radius).length >= 2 && castSpell(battle, 'mage', 'frostNova'),
            () => share(unit) < 0.6 && foes.some(f => distance(f, unit) <= 2) && castSpell(battle, 'mage', 'iceBarrier'),
            () => share(unit) < 0.5 && castSpell(battle, 'mage', 'blink'),
            () => castSpell(battle, 'mage', 'frostbolt'),
            () => castSpell(battle, 'mage', 'arcaneMissiles'),
        ],
        paladin: [
            () => castSpell(battle, 'paladin', 'hammer'),
            () => !!planTarget(battle, 'protection', { need: 0.4 }) && castSpell(battle, 'paladin', 'protection'),
            () => !!planTarget(battle, 'layOnHands', { need: 0.3 }) && castSpell(battle, 'paladin', 'layOnHands'),
        ],
    }[kind] || [];
    let cast = false;
    for (const tryIt of tries) {
        if (tryIt()) { cast = true; if (one) break; }
    }
    return cast;
}

// ---- What the screen shows ----

// Who acts next, soonest first, and in how many seconds
export function nextToAct(battle, count = 6) {
    return living(battle)
        .filter(u => !u.path.length && !u.cast)
        .map(u => ({ unit: u, seconds: (1 - u.bar) * u.interval }))
        .sort((a, b) => a.seconds - b.seconds)
        .slice(0, count);
}

function nearest(from, pool) {
    return pool.reduce((a, b) => (distance(from, b) < distance(from, a) ? b : a));
}
