// The zone's creatures in play: when they come, what arrows do to them, their bite, and the
// loot they leave. The rules are under "creatures" in config/gameConfig.js, the creatures and
// where they live in data/creatures.js, and how one moves in classes/Creature.js.
//
// Only in normal play. None come during a boss fight, but those about when it begins stay and
// fight on. A zone with none painted yet has none.

import { gameConfig } from '../config/gameConfig.js';
import { GAME_VERSION, BUILD_TIMESTAMP } from '../config/gameVersion.js';
import { Creature } from '../classes/Creature.js';
import { CombatText } from '../classes/CombatText.js';
import { Particle } from '../classes/Particle.js';
import { creatures, zoneCreatures, creatureImage } from '../data/creatures.js';
import { currentZone } from './backgroundSystem.js';
import { arrowDamage, armorReduction, damageAfterArmor } from '../utils/stats.js';
import { shieldBlocks } from '../utils/shield.js';
import { getCurrentTotalCritRating } from './statEffectsSystem.js';
import { trackActivity, responsiveScaler } from '../utils/gameUtils.js';
import { playFireballImpactSound } from './audioSystem.js';
import { updateFrostTraps } from './frostTrapSystem.js';
import { readyImage } from '../utils/readyImage.js';

let living = [];
// Zone gear the site gave the game for creatures to carry, waiting for a creature to carry
// it: { item (as it falls), dropId }
let carried = [];
let zoneId = null;
let nextIn = 0;              // Steps until the next one comes
const sheets = new Map();    // Their pictures, loaded when their zone is reached

function sheetOf(id) {
    if (!sheets.has(id)) {
        // With the game's build, so a sheet painted again is fetched anew (as the hunter's
        // clothes); decoded before it is first drawn (utils/readyImage.js)
        sheets.set(id, readyImage(`${creatureImage(id)}?v=${GAME_VERSION}.${BUILD_TIMESTAMP}`));
    }
    return sheets.get(id);
}

// A new game: none about
export function resetCreatures() {
    living = [];
    carried = [];
    zoneId = null;
    nextIn = 0;
}

/**
 * A piece of the zone's gear the site handed out for a creature to carry: the next creature to
 * come carries it, as well as its own loot. Caught, it is reported with its drop's id.
 */
export function carryForCreatures(item, dropId) {
    carried.push({ item, dropId });
}

/** Whether the zone being played has creatures of its own (Frost Traps fall only where it does) */
export function zoneHasCreatures() {
    const zone = currentZone();
    return Boolean(zone && zoneCreatures[zone.id]);
}

export function creaturesAbout() {
    return living;
}

// Seconds, somewhere in a [low, high] range
function between([low, high]) {
    return low + Math.random() * (high - low);
}

function pickCreature(weights) {
    const ids = Object.keys(weights).filter(id => creatures[id]);
    const total = ids.reduce((sum, id) => sum + weights[id], 0);
    let roll = Math.random() * total;
    for (const id of ids) {
        roll -= weights[id];
        if (roll <= 0) return id;
    }
    return ids[ids.length - 1];
}

function zoneNumber() {
    const zone = currentZone();
    return zone ? zone.number : 1;
}

function spawn(zone, context) {
    const { player, canvas, pickLoot } = context;
    const rules = gameConfig.creatures;
    const id = pickCreature(zone.creatures);
    const data = creatures[id];
    const width = canvas.logicalWidth;

    const loot = [];
    for (let i = 0; i < (rules.loot[data.grade] || 1); i++) {
        const item = pickLoot();
        if (item) loot.push({ item, dropId: null });
    }
    // And a piece of the zone's gear, if one is waiting
    if (carried.length) loot.push(carried.shift());

    sheetOf(id);
    // As big as against the hunter at his full size: he is drawn smaller on a wide field, they are not
    const size = player.figureHeight() / (responsiveScaler.objectScale || 1) * data.cell;
    living.push(new Creature(id, data, {
        // Comes in anywhere a little in from the sides
        x: size * 0.4 + Math.random() * Math.max(0, width - size * 0.8),
        size,
        health: Math.round(data.health * (1 + rules.healthPerZone * (zoneNumber() - 1))),
        approachSteps: between(zone.approach) * 60,
        moveSpeed: rules.moveSpeed * width / 60 * (data.pace || 1),
        biteEvery: rules.biteEvery.map(seconds => seconds * 60),
        loot,
    }));
}

// What an arrow does to it: as to a boss, with its armor, but nothing for a boss fight's
// weakening or the set's bonus against bosses
function arrowAgainst(creature, arrow, gameState) {
    const critChance = Math.min(getCurrentTotalCritRating(gameState) + (arrow.critBonus || 0), gameState.critRatingCap);
    const isCrit = Math.random() < critChance;
    const set = gameState.setBonus || {};
    const damage = arrowDamage({
        base: gameConfig.bosses.arrowDamage,
        attackPower: gameState.attackPower || 0,
        worth: arrow.arcane ? gameConfig.bosses.arcaneDamage : 1,
        shotBonus: arrow.arcane ? set.arcane || 0 : arrow.multishot ? set.multishot || 0 : 0,
        bossArmor: armorReduction(creature.data.armor || 0, gameConfig.stats),
        ignoresArmor: Boolean(arrow.arcane),
        crit: isCrit ? gameState.critMultiplier : 1,
    });
    return { damage, isCrit };
}

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

// Arrows into creatures. An arrow stops in the first it strikes (an Arcane Shot goes on).
function shootAt(context) {
    const { gameState, combatTexts, particles } = context;

    for (let a = window.arrows.length - 1; a >= 0; a--) {
        const arrow = window.arrows[a];
        if (!arrow.active) continue;
        const box = { x: arrow.x, y: arrow.y, width: arrow.width, height: arrow.height };

        for (const creature of living) {
            if (!creature.alive) continue;
            if (arrow.struck && arrow.struck.has(creature)) continue;
            const body = creature.core();
            const wider = gameConfig.creatures.arrowBox;
            const target = {
                x: body.x - body.width * (wider.width - 1) / 2,
                y: body.y - body.height * (wider.height - 1) / 2,
                width: body.width * wider.width,
                height: body.height * wider.height,
            };
            if (!overlaps(box, target)) continue;

            const { damage, isCrit } = arrowAgainst(creature, arrow, gameState);
            // Struck, it is pushed back: it loses some of its approach, and stops closing in a moment
            const push = gameConfig.creatures.pushback;
            const killed = creature.takeHit(damage, arrow.arcane ? push.arcane : push.arrow, push.stagger);
            combatTexts.push(new CombatText(body.x + body.width / 2, body.y, isCrit ? `${damage} CRIT!` : `${damage}`, isCrit ? '#FF6B00' : '#FFFFFF', isCrit));
            arrow.createImpactParticles(particles);
            if (killed) brought(creature, context);

            if (arrow.arcane) {
                (arrow.struck ||= new Set()).add(creature);
                continue;
            }
            window.arrows.splice(a, 1);
            break;
        }
    }
}

// Brought down by arrows: points for it, and its loot
function brought(creature, context) {
    const { gameState, combatTexts } = context;
    const rules = gameConfig.creatures.score;
    const points = Math.round(rules.base + rules.perZone * (zoneNumber() - 1));
    const body = creature.core();

    gameState.score += points;
    gameState.creaturesKilled = (gameState.creaturesKilled || 0) + 1;
    combatTexts.push(new CombatText(body.x + body.width / 2, body.y - body.height * 0.4, `+${points}`, '#FFD700', false));
    dropLoot(creature, context);
}

// Its loot hops out of it
function dropLoot(creature, context) {
    const body = creature.core();
    for (const { item, dropId } of creature.loot) {
        context.popLoot(item, body.x + body.width / 2, body.y + body.height / 2, dropId);
    }
    creature.loot = [];
}

// It is on him, and bit. However hard, it never kills: it leaves him with creatures.neverBelow
// health at the least. Dodged, shielded or not, it stays on him for the next.
function bite(creature, context) {
    const { gameState, player, combatTexts, particles } = context;
    const rules = gameConfig.creatures;
    const x = player.x + player.width / 2;
    const grade = creature.data.grade;

    if (context.shouldDodge()) {
        context.showDodgeText(x, player.y);
        context.trackDodge(0);
    } else if (shieldBlocks(gameState, rules.shieldCost[grade] || 1)) {
        combatTexts.push(new CombatText(x, player.y, gameState.shieldActive ? 'BLOCKED' : 'Shield broken!', '#FFD700', !gameState.shieldActive));
    } else {
        const bite = Math.round((rules.bite[grade] || rules.bite.common) + rules.bite.perZone * (zoneNumber() - 1));
        const afterArmor = damageAfterArmor(bite, gameState.armor || 0, gameConfig.stats);
        const taken = Math.max(0, Math.min(afterArmor, Math.floor(gameState.health - rules.neverBelow)));
        if (taken > 0) {
            trackActivity(gameState, 'damage', taken);
            gameState.health -= taken;
        }
        combatTexts.push(new CombatText(x, player.y, `-${taken}`, '#FF4500', false));
        if (player.onHit) player.onHit();
        playFireballImpactSound({ volume: 0.7 });
        for (let i = 0; i < 6; i++) {
            particles.push(new Particle(x + (Math.random() - 0.5) * player.width * 0.5, player.y + player.figureHeight() * 0.3, '#B22222'));
        }
    }
}

/**
 * One step of the game.
 * @param {object} context  { gameState, player, canvas, delta, bossFight, spellSystem,
 *                           combatTexts, particles, shouldDodge, showDodgeText, trackDodge,
 *                           pickLoot: () => item, popLoot: (item, x, y, dropId) => void }
 */
export function updateCreatures(context) {
    const { gameState, player, canvas, delta, bossFight } = context;
    const rules = gameConfig.creatures;

    // A boss coming in brings no more of them, but those about stay and fight on

    const zone = currentZone();
    const here = zone ? zoneCreatures[zone.id] : null;
    if (!zone || zone.id !== zoneId) {
        zoneId = zone ? zone.id : null;
        nextIn = rules.firstAfter * 60;
        // The zone's pictures, in good time
        if (here) Object.keys(here.creatures).forEach(sheetOf);
    }

    if (rules.enabled && here && !bossFight && gameState.mode === 'normal') {
        // The next one is on its way while there is room for it
        const about = living.filter(creature => creature.alive).length;
        if (about < here.most) nextIn -= delta;
        if (nextIn <= 0 && about < here.most) {
            spawn(here, context);
            nextIn = between(here.every) * 60;
        }
    }

    // Slowed with the things that hurt (the spells that slow them), and held by Frost Nova
    const slowed = context.spellSystem ? context.spellSystem.getProjectileSpeedMultiplier() : 1;
    const field = {
        player: player.getBodyBounds(),
        width: canvas.logicalWidth,
        height: canvas.logicalHeight,
        frozen: Boolean(gameState.freezeTimeActive),
        reversed: Boolean(gameState.reverseGravityActive),
        chillMove: gameConfig.frostTrap.slow,
    };

    // The Frost Traps first: a creature that reaches one this step is slowed in it
    updateFrostTraps(delta, living, field);

    if (living.length === 0) return;

    for (const creature of living) {
        // Struck down by his weapon since the last step: as if by an arrow
        if (creature.felled) {
            creature.felled = false;
            brought(creature, context);
        }
        if (creature.update(delta * slowed, field) === 'bite') bite(creature, context);
    }

    shootAt(context);
    living = living.filter(creature => creature.state !== 'gone');
}

/**
 * Lightning (Thunderfury's) strikes the creatures nearest a point, the most "count" of them:
 * each takes the damage, as from an arrow but without being pushed back. Where each was struck,
 * for the bolts to be drawn to.
 */
export function strikeCreatures({ x, y, count, damage, combatTexts }) {
    const struck = [];
    const near = living
        .filter(creature => creature.alive && creature.state !== 'enter')
        .map(creature => ({ creature, body: creature.core() }))
        .sort((a, b) => Math.hypot(a.body.x - x, a.body.y - y) - Math.hypot(b.body.x - x, b.body.y - y))
        .slice(0, count);
    for (const { creature, body } of near) {
        const at = { x: body.x + body.width / 2, y: body.y + body.height / 2 };
        if (creature.takeHit(damage)) creature.felled = true;     // Its points and loot with the next step
        combatTexts.push(new CombatText(at.x, body.y, `⚡ ${damage}`, '#9fd8ff', false));
        struck.push(at);
    }
    return struck;
}

export function drawCreatures(ctx, alpha = 1) {
    for (const creature of living) {
        const { x, y } = creature;
        if (alpha < 1) {
            creature.x = creature.prevX + (x - creature.prevX) * alpha;
            creature.y = creature.prevY + (y - creature.prevY) * alpha;
        }
        creature.draw(ctx, sheets.get(creature.id)?.source);
        // Chilled by a Frost Trap: a snowflake over it
        if (creature.chill > 0 && creature.alive) {
            const body = creature.core();
            ctx.save();
            ctx.font = `${Math.round(Math.max(14, body.width * 0.35))}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.fillStyle = '#d6f1ff';
            ctx.shadowColor = '#4aa8ff';
            ctx.shadowBlur = 6;
            ctx.fillText('❄', body.x + body.width / 2, body.y - 6);
            ctx.restore();
        }
        creature.x = x;
        creature.y = y;
    }
}
