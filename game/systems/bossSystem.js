// Boss fights (who the bosses are, and the rules of a fight, are described in data/bosses.js).
//
// A fight has three parts: the boss comes in ("intro"), the fight proper ("fight") and the boss
// going down ("dying"). While one is on, the game holds back its normal drops and the level
// stays where it is. Arrow bundles and the odd health potion drop during the fight so the
// player is never left with nothing to shoot.
//
// In the fight proper the boss is always doing one of these:
//   moving   - sweeping along the top, drawn towards the player, sidestepping arrows
//   winding  - standing to wind up its next attack: it cannot sidestep, so this is the opening
//   acting   - carrying out an attack that takes time (a charge, being vanished)
// Its attacks come round in the order its behaviour lists them.

import { gameConfig } from '../config/gameConfig.js';
import { bosses, behaviours, bossForZone, bossStats, levelCap, zoneForLevel, weakenedMultiplier, enrageMultiplier } from '../data/bosses.js';
import { levelProgress } from '../utils/progression.js';
import { powerUpItems } from '../data/powerUpItems.js';
import { BossProjectile } from '../classes/BossProjectile.js';
import { PowerUpItem } from '../classes/PowerUpItem.js';
import { CombatText } from '../classes/CombatText.js';
import { Particle } from '../classes/Particle.js';
import { addNotification, trackActivity } from '../utils/gameUtils.js';
import { playTotalSound, playScreamSound, playFireballImpactSound } from './audioSystem.js';
import { areMessagesAboveField } from './hudNotificationSystem.js';
import { keyName } from '../utils/keybindings.js';

const INTRO_STEPS = 120;
const DYING_STEPS = 90;
const HIT_FLASH_STEPS = 6;
const ATTACK_SPEED = { min: 1.2, max: 2.0 };  // How fast a boss's attack falls, as the game's other projectiles

// How long the first boss stands to wind up each attack, in steps (60 = 1 second); later
// bosses are quicker. The charge and the stomp show the player where the danger will be for
// the whole of theirs.
const WIND_UP = { throw: 24, row: 36, fan: 24, vanish: 18, charge: 54, bolt: 24, curse: 36, bomb: 24, stomp: 66, swipe: 30 };
const VANISHED_STEPS = 60;
const CHARGE_STEPS = 48;
const BOMB_FLIGHT_STEPS = 40;
const BOMB_FUSE_STEPS = 66;

let fight = null;           // The fight in progress, or null
let faction = null;         // The side being played
let passed = [];            // Ids of the bosses no longer in the way: defeated, or skipped by a later starting level
let defeated = [];          // Ids of the bosses defeated in this game
const pictures = new Map();

function load(path) {
    if (!pictures.has(path)) {
        const image = new Image();
        image.src = path;
        pictures.set(path, image);
    }
    return pictures.get(path);
}

const picture = boss => load(boss.image);
const attackPicture = boss => load(boss.attack.image);

// The HUD panels are page elements drawn over the canvas. On a phone they reach across the
// middle of the screen, where the boss stands, so the boss and its health bar start below them.
// On a desktop they sit in the top corners, so the boss keeps to the space between them.
const HUD_PANEL_IDS = ['itemsCollectionPanel', 'dragonstalkerProgressPanel'];
let clearOfPanels = { top: 0, left: 0, right: Infinity, measuredAt: -Infinity };

// The part of the canvas, in its own units, that no panel covers at the height of the boss
function spaceClearOfPanels(canvas) {
    const now = performance.now();
    if (now - clearOfPanels.measuredAt < 500) return clearOfPanels;

    const area = canvas.getBoundingClientRect();
    const middleLeft = area.left + area.width * 0.35;
    const middleRight = area.left + area.width * 0.65;
    let top = area.top;
    let left = area.left;
    let right = area.right;

    for (const id of HUD_PANEL_IDS) {
        const panel = document.getElementById(id);
        if (!panel) continue;

        // A hidden panel has an empty box
        const box = panel.getBoundingClientRect();
        if (box.height === 0) continue;

        if (box.right > middleLeft && box.left < middleRight) {
            top = Math.max(top, box.bottom);
        } else if (box.right <= middleLeft) {
            left = Math.max(left, box.right);
        } else {
            right = Math.min(right, box.left);
        }
    }

    // From page pixels to the canvas's own units
    const scaleX = area.width ? canvas.logicalWidth / area.width : 1;
    const scaleY = area.height ? canvas.logicalHeight / area.height : 1;
    clearOfPanels = {
        top: (top - area.top) * scaleY,
        left: (left - area.left) * scaleX,
        right: (right - area.left) * scaleX,
        measuredAt: now
    };
    return clearOfPanels;
}

// Where the boss stands and how big it is drawn, for the current canvas
function layout(canvas, boss) {
    const image = picture(boss);
    const aspect = image.naturalWidth ? image.naturalWidth / image.naturalHeight : 1;
    // Right at the top of the field when the messages are shown above it; otherwise under them
    const underMessages = canvas.logicalHeight * (areMessagesAboveField() ? 0.012 : 0.085);
    const barTop = Math.max(underMessages, spaceClearOfPanels(canvas).top + 8);
    const barHeight = Math.max(14, canvas.logicalHeight * 0.022);
    const height = Math.min(canvas.logicalHeight * 0.3, canvas.logicalWidth * 0.6 / aspect);
    const width = height * aspect;

    return { barTop, barHeight, width, height, top: barTop + barHeight + 8 };
}

// The part of the picture arrows can hit: the body, not the empty corners around it
function hitBox(canvas) {
    const { width, height, top } = layout(canvas, fight.boss);

    return {
        x: fight.x - width * 0.3,
        y: top + fight.drop + height * 0.1,
        width: width * 0.6,
        height: height * 0.8
    };
}

function levelsPerZone() {
    return gameConfig.backgrounds.levelsPerBackground;
}

// The fight settings, with the length of a zone alongside them
function rules() {
    return { ...gameConfig.bosses, levelsPerZone: levelsPerZone() };
}

/**
 * A new game: no fight, every boss of the side standing.
 * @param {number} startingLevel  The level the game starts at (above 1 only when testing):
 *                                the bosses of the zones before it are passed over
 */
export function resetBosses(side, startingLevel = 1) {
    fight = null;
    curse = null;
    faction = side;
    defeated = [];
    passed = bosses
        .filter(boss => boss.faction === side && boss.zone * levelsPerZone() < startingLevel)
        .map(boss => boss.id);

    // Have the first pictures ready
    const first = bosses.find(boss => boss.faction === side && !passed.includes(boss.id));
    if (first) picture(first);
}

export function isBossFightActive() {
    return fight !== null;
}

// Ids of the bosses defeated in this game
export function bossesDefeated() {
    return defeated;
}

// The fight in progress, in brief (null when there is none)
export function bossFightState() {
    if (!fight) return null;

    return { name: fight.boss.name, behaviour: fight.boss.behaviour, phase: fight.phase, doing: fight.doing, x: fight.x, health: fight.health, maxHealth: fight.stats.health, shielded: fight.shielded, enraged: fight.enraged };
}

// The attacks of all the bosses, of both sides, also fall as hazards all through the game,
// whether or not their boss has been met. This picks one at random. It hits as hard as the
// boss of the zone the player is in, so a late boss's attack is no worse than the rest on the
// early levels.
export function randomBossAttack(level) {
    const here = bossForZone(faction, zoneForLevel(level, levelsPerZone()));
    if (!here) return null;

    const { attack } = bosses[Math.floor(Math.random() * bosses.length)];
    return { ...attack, damage: bossStats(here, rules()).damage, speed: ATTACK_SPEED };
}

/**
 * Call every step outside a fight. Keeps the level from passing a boss that still stands, and
 * brings that boss in once the player has the experience to move on.
 * @returns {boolean} Whether a fight started
 */
export function guardZone(gameState, canvas) {
    if (fight) return false;

    const cap = levelCap(faction, passed, levelsPerZone());
    gameState.levelCap = cap;
    if (levelProgress(gameState.xp || 0, gameConfig.progression).level <= cap) return false;

    const boss = bossForZone(faction, cap / levelsPerZone());
    const stats = bossStats(boss, rules());
    // Its storm's picture is fetched now, to be there when the storm is called
    if (boss.storm) load(boss.storm.image);

    fight = {
        boss,
        stats,
        phase: 'intro',
        steps: 0,               // Steps spent in the current phase
        health: stats.health,
        x: canvas.logicalWidth / 2,
        prevX: canvas.logicalWidth / 2,
        drop: 0,                // How far below its usual place the boss is (during a charge)
        prevDrop: 0,
        hidden: 0,              // 0 in plain sight .. 1 vanished
        hitFlash: 0,
        shielded: false,
        // Seconds until the next shield goes up (never, for bosses without one)
        shieldIn: stats.shieldAfter === null ? Infinity : stats.shieldAfter,
        enraged: false,
        absorbedTextAt: -Infinity,

        // What it is doing: 'moving', 'winding' or 'acting'
        doing: 'moving',
        doingSteps: 0,
        attack: null,           // The attack being wound up or carried out
        attackData: null,       // What that attack needs to remember (a lane, a safe patch)
        nextAttack: 0,          // Place in the behaviour's round of attacks
        sinceAttack: 0,
        closeFor: 0,            // Steps the player has stayed within the boss's reach
        sinceVolley: 0,         // Steps since the last row it sent down outside its round
        storm: null,            // The storm coming down: { left, right, steps }
        sinceStorm: Infinity,   // Steps since the last storm ended (the first comes at once)
        sweep: Math.random() * Math.PI * 2,     // Where it is in its sweep along the top

        // Sidestepping arrows
        dodgeIn: 0,             // Steps until it may sidestep again
        reactingFor: -1,        // Steps left before a sidestep it has decided on begins (-1: none)
        dodgeDirection: 0,
        dodgeSteps: 0,          // Steps left of the sidestep under way

        bombs: [],              // Things lobbed at the player that have yet to burst
        sinceArrows: 0,
        sincePotion: 0
    };

    picture(boss);
    addNotification(gameState, `${boss.name} appears! Bring it down with your arrows`, 300, '#FF6B35');
    playScreamSound();
    return true;
}

// Seconds the fight proper has lasted
function fightSeconds() {
    return fight.phase === 'fight' ? fight.steps / 60 : 0;
}

function enrage() {
    return enrageMultiplier(fightSeconds(), fight.stats.enrageAfter, gameConfig.bosses);
}

// What the boss throws right now: its attack, hitting harder once it has enraged
function currentAttack(extra = {}) {
    return {
        ...fight.boss.attack,
        damage: Math.round(fight.stats.damage * enrage()),
        speed: ATTACK_SPEED,
        attackerLevel: fight.stats.level,
        ...extra
    };
}

function throwProjectile(context, x, extra = {}, speed = null) {
    const { gameState, canvas, fireballs, isValidYPosition, recentDropYPositions } = context;
    const projectile = new BossProjectile(currentAttack(extra), isValidYPosition, recentDropYPositions, gameState, canvas);
    const { top, height } = layout(canvas, fight.boss);
    projectile.x = Math.max(0, Math.min(canvas.logicalWidth - projectile.width, x - projectile.width / 2));
    projectile.y = top + height * 0.7;
    if (speed !== null) {
        projectile.baseSpeed = speed;
        projectile.speed = speed;
    }

    fireballs.push(projectile);
    return projectile;
}

// A row of projectiles across the screen, all at one speed, with one gap to stand in
function throwRow(context) {
    const { canvas } = context;
    const first = throwProjectile(context, 0);

    const slots = Math.max(3, Math.min(8, Math.floor(canvas.logicalWidth / (first.width * 1.7))));
    const gap = Math.floor(Math.random() * slots);
    const slotWidth = canvas.logicalWidth / slots;
    const speed = first.baseSpeed;

    context.fireballs.pop();
    for (let slot = 0; slot < slots; slot++) {
        if (slot === gap) continue;
        const projectile = throwProjectile(context, slotWidth * (slot + 0.5), {}, speed);
        projectile.y = layout(canvas, fight.boss).top;
    }
}

// Five at once, spreading out as they fall
function throwFan(context) {
    const first = throwProjectile(context, fight.x);
    const speed = first.baseSpeed;
    context.fireballs.pop();

    for (const lean of [-0.5, -0.25, 0, 0.25, 0.5]) {
        throwProjectile(context, fight.x, { vx: speed * lean }, speed);
    }
}

/**
 * Drop power-ups for the player to catch, outside a fight (Boss Rush restocks between bosses).
 * @param {object}   context  { gameState, powerUps, isValidYPosition, recentDropYPositions }
 * @param {string[]} ids      Power-ups from data/powerUpItems.js
 */
export function dropSupplies(context, ids) {
    ids.forEach(id => dropPowerUp(context, id));
}

function dropPowerUp(context, id) {
    const { gameState, powerUps, isValidYPosition, recentDropYPositions } = context;
    const data = powerUpItems.find(powerUp => powerUp.id === id);
    if (!data) return;

    powerUps.push(new PowerUpItem(data, isValidYPosition, recentDropYPositions, gameState));
}

/**
 * Something other than a thrown thing reaches the player: a charge, a blast, a stomp. The
 * player may dodge it or be shielded from it, as with anything else.
 */
function hurtPlayer(context, damage) {
    const { gameState, player, combatTexts } = context;
    const x = player.x + player.width / 2;

    if (context.shouldDodge(fight.stats.level)) {
        context.showDodgeText(x, player.y);
        context.trackDodge(damage);
    } else if (gameState.shieldActive) {
        combatTexts.push(new CombatText(x, player.y, 'BLOCKED', '#FFD700', false));
    } else {
        trackActivity(gameState, 'damage', damage);
        gameState.health = Math.max(0, gameState.health - damage);
        combatTexts.push(new CombatText(x, player.y, `-${damage}`, '#FF4500', false));
        if (player.onHit) player.onHit();
    }
    playFireballImpactSound();
}

function heavyDamage() {
    return Math.round(fight.stats.damage * gameConfig.bosses.heavyDamage * enrage());
}

// Where the player's body is: what a charge, a blast or a stomp has to reach
function playerBody(player) {
    const box = player.getCollisionBounds();
    return { ...box, centerX: box.x + box.width / 2, centerY: box.y + box.height / 2 };
}

// ----- The curse -----
// It outlasts the bolt that brought it, and the fight if need be: it eats at the player's health
// until it runs out or Dragon Cry lifts it. Nothing dodges or blocks it.

let curse = null;   // { stepsLeft, damage } while the player is cursed

function castCurse(context) {
    const { gameState } = context;
    const share = gameConfig.bosses.curse.share;
    const damage = Math.max(1, Math.round(fight.stats.damage * share));
    const name = fight.boss.name;

    throwProjectile(context, fight.x, {
        follows: true,
        onPlayerHit: () => {
            curse = { stepsLeft: gameConfig.bosses.curse.seconds * 60, damage };
            addNotification(gameState, `${name} has cursed you! Dragon Cry (${keyName('dragon_cry')}) lifts it`, 300, '#B048F8');
        }
    });
}

// The curse on the player, for showing it by their health bar: { secondsLeft, damage }, or null
export function curseState() {
    return curse ? { secondsLeft: Math.ceil(curse.stepsLeft / 60), damage: curse.damage } : null;
}

// Call every step, in a fight or not
export function updateCurse(context) {
    if (!curse) return;

    const { gameState, player, combatTexts, spellSystem } = context;
    if (spellSystem.isSpellActive('dragon_cry')) {
        curse = null;
        combatTexts.push(new CombatText(player.x + player.width / 2, player.y, 'Curse lifted', '#D9A8FF', false));
        return;
    }

    curse.stepsLeft--;
    if (curse.stepsLeft % 60 === 0) {
        gameState.health = Math.max(0, gameState.health - curse.damage);
        combatTexts.push(new CombatText(player.x + player.width / 2, player.y, `-${curse.damage}`, '#B048F8', false));
    }
    if (curse.stepsLeft <= 0) curse = null;
}

// ----- Arrows -----

// Arrows that reach the boss are spent on it. A shield absorbs ordinary arrows; an Arcane Shot
// goes through it and breaks it. A vanished boss cannot be hit.
function takeArrowHits(context) {
    if (fight.hidden > 0.5) return;

    const { gameState, canvas, particles, combatTexts } = context;
    const box = hitBox(canvas);
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);

    for (let index = window.arrows.length - 1; index >= 0; index--) {
        const arrow = window.arrows[index];
        if (!arrow.checkCollision(box)) continue;

        arrow.createImpactParticles(particles);
        window.arrows.splice(index, 1);

        if (fight.shielded && !arrow.arcane) {
            // Said once a second at most, however many arrows bounce off
            if (fight.steps - fight.absorbedTextAt >= 60) {
                fight.absorbedTextAt = fight.steps;
                combatTexts.push(new CombatText(arrow.x, box.y + box.height, 'Absorbed', '#9CC0FF', false));
            }
            continue;
        }

        if (fight.shielded) {
            fight.shielded = false;
            fight.shieldIn = fight.stats.shieldEvery;
            combatTexts.push(new CombatText(fight.x, box.y + box.height * 0.5, 'Shield broken!', '#D9A8FF', true));
            for (let i = 0; i < 24; i++) {
                particles.push(new Particle(fight.x + (Math.random() - 0.5) * box.width * 1.4, box.y + Math.random() * box.height, '#B048F8'));
            }
        }

        const critChance = Math.min(gameState.critRating + (arrow.critBonus || 0), gameState.critRatingCap);
        const isCrit = Math.random() < critChance;
        const arrowDamage = gameConfig.bosses.arrowDamage * (arrow.arcane ? gameConfig.bosses.arcaneDamage : 1);
        // The set being worn may add to what arrows do to a boss (utils/sets.js)
        const fromSet = 1 + (gameState.setBonus ? gameState.setBonus.bossDamage : 0);
        const damage = Math.round(arrowDamage * weakened * fromSet * (isCrit ? gameState.critMultiplier : 1));

        fight.health = Math.max(0, fight.health - damage);
        fight.hitFlash = HIT_FLASH_STEPS;
        combatTexts.push(new CombatText(arrow.x, box.y + box.height, isCrit ? `${damage} CRIT!` : `${damage}`, isCrit ? '#FF6B00' : arrow.arcane ? '#D9A8FF' : '#FFFFFF', isCrit));
    }
}

// An arrow that will land on the boss within the time it can see ahead, if there is one.
// Returns where across the boss it would land (-1 its left edge .. 1 its right edge).
function incomingArrow(canvas) {
    const box = hitBox(canvas);
    const bottom = box.y + box.height;
    const margin = box.width * 0.15;

    for (const arrow of window.arrows) {
        if (arrow.velocityY >= 0 || arrow.y < bottom) continue;

        const steps = (arrow.y - bottom) / -arrow.velocityY;
        if (steps > gameConfig.bosses.dodge.seesAhead) continue;

        const landsAt = arrow.x + arrow.velocityX * steps;
        if (landsAt > box.x - margin && landsAt < box.x + box.width + margin) {
            return (landsAt - (box.x + box.width / 2)) / (box.width / 2);
        }
    }
    return null;
}

// ----- Movement -----

// The furthest the boss may go to either side: on the field, and never under a HUD panel
function reach(canvas) {
    const { width } = layout(canvas, fight.boss);
    const clear = spaceClearOfPanels(canvas);
    const left = Math.max(width * 0.35, clear.left + width * 0.4);
    const right = Math.min(canvas.logicalWidth - width * 0.35, clear.right - width * 0.4);

    return left < right ? { left, right } : { left: canvas.logicalWidth / 2, right: canvas.logicalWidth / 2 };
}

function moveTowards(canvas, target, fastest) {
    const { left, right } = reach(canvas);
    const goal = Math.max(left, Math.min(right, target));
    fight.x += Math.max(-fastest, Math.min(fastest, goal - fight.x));
}

// On the move: a sweep along the top, drawn towards the player, with sidesteps out of the way
// of arrows it sees coming
function move(context) {
    const { canvas, player } = context;
    const { movement, dodge } = gameConfig.bosses;
    const { left, right } = reach(canvas);
    const body = hitBox(canvas).width;

    if (fight.dodgeIn > 0) fight.dodgeIn--;

    // A sidestep under way
    if (fight.dodgeSteps > 0) {
        fight.dodgeSteps--;
        fight.x = Math.max(left, Math.min(right, fight.x + fight.dodgeDirection * body * dodge.distance / dodge.steps));
        return;
    }

    // One decided on, after the moment it takes to react
    if (fight.reactingFor >= 0) {
        if (fight.reactingFor-- === 0) {
            fight.dodgeSteps = dodge.steps;
            fight.dodgeIn = fight.stats.dodgeCooldown;
        }
    } else if (fight.dodgeIn <= 0 && !fight.shielded) {
        // Nothing to fear from ordinary arrows behind a shield, so it does not bother
        const landsAt = incomingArrow(canvas);
        if (landsAt !== null) {
            // Away from where the arrow will land; from dead centre, to the side with more room
            const away = Math.abs(landsAt) > 0.2 ? -Math.sign(landsAt) : (fight.x - left > right - fight.x ? -1 : 1);
            const room = away < 0 ? fight.x - left : right - fight.x;
            fight.dodgeDirection = room > body * dodge.distance * 0.5 ? away : -away;
            fight.reactingFor = Math.round(fight.stats.dodgeReaction);
        }
    }

    fight.sweep += Math.PI * 2 / (fight.stats.sweepSeconds * 60);
    const sweepX = (left + right) / 2 + Math.sin(fight.sweep) * (right - left) / 2;
    const target = sweepX + (player.x + player.width / 2 - sweepX) * movement.towardsPlayer;
    moveTowards(canvas, target, canvas.logicalWidth * movement.speed);
}

// ----- Attacks -----

// Whether the player is right under the boss, where a swipe reaches
function withinReach(context) {
    const body = playerBody(context.player);
    const box = hitBox(context.canvas);
    const reach = box.height * gameConfig.bosses.melee.reach;

    return body.y < box.y + box.height + reach
        && body.x + body.width > box.x - box.width * 0.4
        && body.x < box.x + box.width * 1.4;
}

// ----- The storm -----
// The last boss of each side calls a storm down over half the field once it is below half
// health: the ground is marked, then it comes down. It goes on beside the boss's own attacks.

function updateStorm(context) {
    const { gameState, canvas, player, particles } = context;
    const { boss, stats } = fight;
    const settings = gameConfig.bosses.storm;
    if (!boss.storm) return;

    if (!fight.storm) {
        if (fight.health > stats.health * settings.belowHealth || ++fight.sinceStorm < settings.every) return;

        // The half the player stands in, so they have to cross
        const middle = canvas.logicalWidth / 2;
        const onLeft = playerBody(player).centerX < middle;
        fight.storm = { left: onLeft ? 0 : middle, right: onLeft ? middle : canvas.logicalWidth, steps: 0 };
        addNotification(gameState, `${boss.name} calls down ${boss.storm.name}! Cross to the other side`, 300, '#FF6B35');
        return;
    }

    const storm = fight.storm;
    storm.steps++;
    const falling = storm.steps - settings.warning;

    if (falling >= settings.lasts) {
        fight.storm = null;
        fight.sinceStorm = 0;
        return;
    }
    if (falling < 0) return;

    if (falling % settings.hitEvery === 0) {
        const body = playerBody(player);
        if (body.centerX > storm.left && body.centerX < storm.right) {
            hurtPlayer(context, Math.max(1, Math.round(stats.damage * settings.damage * enrage())));
        }
    }
    // Sparks where it lands
    if (falling % 4 === 0) {
        const floorTop = canvas.logicalHeight * (1 - gameConfig.player.movableArea.heightPercent);
        particles.push(new Particle(
            storm.left + Math.random() * (storm.right - storm.left),
            floorTop + Math.random() * (canvas.logicalHeight - floorTop),
            `rgb(${boss.storm.color})`
        ));
    }
}

// The storm's picture at the size it is drawn at, made once: stamping the big original
// several times a frame would cost more than the rest of the fight together
let stormSprite = null;

function stormPicture(path, width) {
    const image = load(path);
    if (!image.complete || !image.naturalWidth) return null;

    const size = Math.max(32, Math.round(width));
    if (!stormSprite || stormSprite.path !== path || stormSprite.canvas.width !== size) {
        const sprite = document.createElement('canvas');
        sprite.width = size;
        sprite.height = Math.round(size * image.naturalHeight / image.naturalWidth);
        const spriteCtx = sprite.getContext('2d');
        spriteCtx.imageSmoothingQuality = 'high';
        spriteCtx.drawImage(image, 0, 0, sprite.width, sprite.height);
        stormSprite = { path, canvas: sprite };
    }
    return stormSprite.canvas;
}

function drawStorm(ctx, canvas, pulse) {
    const storm = fight.storm;
    const settings = gameConfig.bosses.storm;
    const { color, image } = fight.boss.storm;
    const top = layout(canvas, fight.boss).top;
    const width = storm.right - storm.left;
    const height = canvas.logicalHeight - top;
    const falling = storm.steps - settings.warning;

    // The ground it is called down on: marked first, burning after
    ctx.fillStyle = `rgba(${color}, ${(falling < 0 ? 0.34 : 0.2) * pulse})`;
    ctx.fillRect(storm.left, top, width, height);
    ctx.strokeStyle = `rgba(${color}, ${0.9 * pulse})`;
    ctx.lineWidth = 3;
    ctx.strokeRect(storm.left + 1.5, top, width - 3, height - 1.5);
    if (falling < 0) return;

    // Two columns of the picture falling through the half, one a little behind the other
    const sprite = stormPicture(image, width * 0.48);
    if (!sprite) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(storm.left, top, width, height);
    ctx.clip();
    // Fades in as it starts and out as it ends
    ctx.globalAlpha = Math.min(1, falling / 15, (settings.lasts - falling) / 20);
    const gap = sprite.height * 1.15;
    for (let column = 0; column < 2; column++) {
        const x = storm.left + width * (0.02 + column * 0.5);
        const offset = (falling * canvas.logicalHeight * 0.012 + column * gap * 0.5) % gap;
        for (let y = top - gap + offset; y < canvas.logicalHeight; y += gap) {
            ctx.drawImage(sprite, x, y);
        }
    }
    ctx.restore();
}

// Wind up an attack that is not part of the boss's round: the swipe at a player who stays
// within reach, and the row every boss sends down now and then
function windUpExtra(attack) {
    fight.attack = attack;
    fight.doing = 'winding';
    fight.doingSteps = 0;
    fight.attackData = null;
    fight.reactingFor = -1;
}

// How much faster the boss attacks for being weakened: the price of waiting for it to weaken
function frenzy() {
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);
    const full = gameConfig.bosses.maxWeakened - 1;

    return full > 0 ? 1 + (weakened - 1) / full * fight.stats.frenzy : 1;
}

// Begin winding up the next attack in the boss's round
function windUp(context) {
    const { canvas, player } = context;
    const round = behaviours[fight.boss.behaviour];
    const body = playerBody(player);

    fight.attack = round[fight.nextAttack % round.length];
    fight.nextAttack++;
    fight.doing = 'winding';
    fight.doingSteps = 0;
    fight.attackData = null;
    fight.reactingFor = -1;

    if (fight.attack === 'charge') {
        // The lane it will come down: where the player stands now
        const { left, right } = reach(canvas);
        fight.attackData = { x: Math.max(left, Math.min(right, body.centerX)), hit: false };
    } else if (fight.attack === 'stomp') {
        // The one safe patch of ground: near enough to reach, not where the player already is
        const width = body.width * 2.6;
        const side = body.centerX < canvas.logicalWidth / 2 ? 1 : -1;
        const away = canvas.logicalWidth * (0.18 + Math.random() * 0.14);
        const center = Math.max(width / 2, Math.min(canvas.logicalWidth - width / 2, body.centerX + side * away));
        fight.attackData = { left: center - width / 2, right: center + width / 2 };
    }
}

// The wind-up is over: carry the attack out. Most are done in the instant; a charge and a
// vanishing take time ("acting").
function strike(context) {
    const { canvas, player, particles } = context;
    const body = playerBody(player);
    const { width } = layout(canvas, fight.boss);

    fight.doing = 'moving';
    fight.sinceAttack = 0;

    switch (fight.attack) {
        case 'throw':
            // Where it stands, or at the player when they are out where it cannot follow
            throwProjectile(context, Math.abs(body.centerX - fight.x) > width * 0.5 ? body.centerX : fight.x);
            break;
        case 'row':
            throwRow(context);
            break;
        case 'swipe':
            if (withinReach(context)) {
                hurtPlayer(context, Math.round(fight.stats.damage * gameConfig.bosses.melee.damage * enrage()));
                for (let i = 0; i < 24; i++) {
                    particles.push(new Particle(body.centerX + (Math.random() - 0.5) * body.width * 2, body.centerY + (Math.random() - 0.5) * body.height, '#FF4500'));
                }
            }
            // The round of attacks carries on from where it was
            fight.sinceAttack = Math.round(fight.stats.throwEvery / 2);
            fight.closeFor = 0;
            break;
        case 'fan':
            throwFan(context);
            break;
        case 'bolt':
            throwProjectile(context, fight.x, { follows: true });
            break;
        case 'curse':
            castCurse(context);
            break;
        case 'bomb':
            fight.bombs.push({
                fromX: fight.x,
                fromY: layout(canvas, fight.boss).top + layout(canvas, fight.boss).height * 0.6,
                x: body.centerX,
                y: body.centerY,
                radius: body.width * 1.5,
                steps: 0
            });
            break;
        case 'stomp': {
            const safe = body.centerX > fight.attackData.left && body.centerX < fight.attackData.right;
            if (!safe) hurtPlayer(context, heavyDamage());
            // Dust along the ground that was struck
            for (let i = 0; i < 40; i++) {
                const x = Math.random() * canvas.logicalWidth;
                if (x > fight.attackData.left && x < fight.attackData.right) continue;
                particles.push(new Particle(x, body.y + body.height + Math.random() * body.height, '#C8A46A'));
            }
            break;
        }
        case 'vanish':
        case 'charge':
            fight.doing = 'acting';
            fight.doingSteps = 0;
            break;
    }
}

// Carrying out an attack that takes time
function act(context) {
    const { canvas, player } = context;
    const { left, right } = reach(canvas);

    if (fight.attack === 'vanish') {
        // Gone, then back on the far side of the player with a fan of blades
        const fade = 12;
        fight.hidden = Math.min(1, fight.doingSteps / fade, (VANISHED_STEPS - fight.doingSteps) / fade);

        if (fight.doingSteps === Math.floor(VANISHED_STEPS / 2)) {
            const playerX = player.x + player.width / 2;
            fight.x = playerX < (left + right) / 2 ? right - Math.random() * (right - left) * 0.25 : left + Math.random() * (right - left) * 0.25;
            fight.prevX = fight.x;
        }
        if (fight.doingSteps >= VANISHED_STEPS) {
            fight.hidden = 0;
            fight.doing = 'moving';
            fight.sinceAttack = 0;
            throwFan(context);
        }
        return;
    }

    if (fight.attack === 'charge') {
        // Down the lane to the bottom of the field and back up
        const body = playerBody(player);
        const place = layout(canvas, fight.boss);
        const depth = canvas.logicalHeight - place.top - place.height;
        fight.drop = Math.sin(Math.PI * fight.doingSteps / CHARGE_STEPS) * depth;

        const box = hitBox(canvas);
        const touching = box.x < body.x + body.width && box.x + box.width > body.x && box.y < body.y + body.height && box.y + box.height > body.y;
        if (touching && !fight.attackData.hit) {
            fight.attackData.hit = true;
            hurtPlayer(context, heavyDamage());
        }

        if (fight.doingSteps >= CHARGE_STEPS) {
            fight.drop = 0;
            fight.doing = 'moving';
            fight.sinceAttack = 0;
        }
    }
}

// Things lobbed at the player fly to where they stood, lie there a moment, and burst
function updateBombs(context) {
    const { player, particles } = context;

    fight.bombs = fight.bombs.filter(bomb => {
        bomb.steps++;
        if (bomb.steps < BOMB_FLIGHT_STEPS + BOMB_FUSE_STEPS) return true;

        const body = playerBody(player);
        if (Math.hypot(body.centerX - bomb.x, body.centerY - bomb.y) < bomb.radius + body.width / 2) {
            hurtPlayer(context, heavyDamage());
        } else {
            playFireballImpactSound();
        }
        for (let i = 0; i < 30; i++) {
            particles.push(new Particle(bomb.x + (Math.random() - 0.5) * bomb.radius, bomb.y + (Math.random() - 0.5) * bomb.radius, '#FF6B35'));
        }
        return false;
    });
}

function defeat(context) {
    const { gameState, canvas, particles } = context;
    const { boss } = fight;
    const { top, height } = layout(canvas, boss);
    const { reward } = fight.stats;

    fight.phase = 'dying';
    fight.steps = 0;
    fight.shielded = false;
    fight.hidden = 0;
    fight.drop = 0;
    fight.bombs = [];
    fight.storm = null;
    fight.doing = 'moving';
    defeated.push(boss.id);
    passed.push(boss.id);

    for (let i = 0; i < 40; i++) {
        particles.push(new Particle(fight.x + (Math.random() - 0.5) * height * 0.6, top + Math.random() * height, '#FFD700'));
    }

    gameState.score += reward.score;
    gameState.health = Math.min(gameState.maxHealth, gameState.health + reward.health);
    addNotification(gameState, `${boss.name} is defeated! +${reward.score} points`, 360, '#FFD700');
    playTotalSound();
    if (context.onBossDefeated) context.onBossDefeated(boss);
}

/**
 * Advance the fight by one simulation step. Does nothing when there is no fight.
 * @param {object} context  { gameState, canvas, player, fireballs, powerUps, particles, combatTexts,
 *                            spellSystem, isValidYPosition, recentDropYPositions,
 *                            shouldDodge, showDodgeText, trackDodge, onBossDefeated }
 */
export function updateBoss(context) {
    if (!fight) return;

    const { gameState, canvas } = context;
    const { boss, stats } = fight;
    const settings = gameConfig.bosses;

    fight.steps++;
    fight.prevX = fight.x;
    fight.prevDrop = fight.drop;
    if (fight.hitFlash > 0) fight.hitFlash--;

    if (fight.phase === 'intro') {
        if (fight.steps >= INTRO_STEPS) {
            fight.phase = 'fight';
            fight.steps = 0;
            // Something to shoot with from the first moment
            if (gameState.arrowCount < 25) dropPowerUp(context, settings.arrowBundle);
        }
        return;
    }

    if (fight.phase === 'dying') {
        if (fight.steps >= DYING_STEPS) {
            // With the boss gone the way to the next zone is open (see guardZone)
            fight = null;
        }
        return;
    }

    // Out of time: the boss enrages, and from then on attacks faster and hits harder
    const rage = enrage();
    if (rage > 1 && !fight.enraged) {
        fight.enraged = true;
        addNotification(gameState, `${boss.name} is enraged!`, 300, '#FF2020');
        playScreamSound();
    }

    // The shield goes up when its time comes and stays until an Arcane Shot breaks it
    if (!fight.shielded) {
        fight.shieldIn -= 1 / 60;
        if (fight.shieldIn <= 0) {
            fight.shielded = true;
            addNotification(gameState, `${boss.name} is shielded! Break it with Arcane Shot (${keyName('arcane_shot')})`, 300, '#B048F8');
        }
    }

    fight.doingSteps++;
    if (fight.doing === 'moving') {
        move(context);
        // Too close for too long, and it swipes; stepping back cools it down again
        fight.closeFor = withinReach(context) ? fight.closeFor + 1 : Math.max(0, fight.closeFor - 2);
        // Enraged it attacks faster, and so it does the weaker it gets
        const tempo = rage * frenzy();
        fight.sinceVolley++;
        fight.sinceAttack++;
        if (fight.dodgeSteps > 0) {
            // Busy sidestepping
        } else if (fight.closeFor >= settings.melee.patience) {
            windUpExtra('swipe');
        } else if (fight.sinceVolley >= stats.volleyEvery / tempo) {
            fight.sinceVolley = 0;
            windUpExtra('row');
        } else if (fight.sinceAttack >= stats.throwEvery / tempo) {
            windUp(context);
        }
    } else if (fight.doing === 'winding') {
        // It lines up on the lane it means to charge down; otherwise it stands where it is
        if (fight.attack === 'charge') moveTowards(canvas, fight.attackData.x, canvas.logicalWidth * settings.movement.speed * 2.5);
        const share = fight.attack === 'charge' || fight.attack === 'stomp' || fight.attack === 'swipe' ? stats.heavyWindUp : stats.windUp;
        if (fight.doingSteps >= WIND_UP[fight.attack] * share / Math.sqrt(rage)) strike(context);
    } else {
        act(context);
    }

    updateBombs(context);
    updateStorm(context);

    if (++fight.sinceArrows >= settings.arrowsEvery) {
        fight.sinceArrows = 0;
        dropPowerUp(context, settings.arrowBundle);
    }
    if (++fight.sincePotion >= settings.potionEvery) {
        fight.sincePotion = 0;
        dropPowerUp(context, 'health_potion');
    }

    takeArrowHits(context);
    if (fight.health <= 0) defeat(context);
}

function drawHealthBar(ctx, canvas, place) {
    const { boss } = fight;
    const width = Math.min(canvas.logicalWidth * 0.62, place.barHeight * 22);
    const x = (canvas.logicalWidth - width) / 2;
    const y = place.barTop;
    const fill = fight.health / fight.stats.health;
    const weakened = weakenedMultiplier(fightSeconds(), gameConfig.bosses);
    const fontSize = Math.max(11, place.barHeight * 0.78);

    ctx.save();

    // Dark well with a gold edge, as on the game's panels
    ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
    ctx.fillRect(x, y, width, place.barHeight);
    const red = ctx.createLinearGradient(0, y, 0, y + place.barHeight);
    red.addColorStop(0, '#d32f22');
    red.addColorStop(1, '#6c0a06');
    ctx.fillStyle = red;
    ctx.fillRect(x, y, width * fill, place.barHeight);
    ctx.strokeStyle = '#b9902f';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, place.barHeight);

    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textBaseline = 'middle';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillStyle = '#ffd100';
    ctx.textAlign = 'left';
    ctx.fillText(boss.name, x + 8, y + place.barHeight / 2 + 1);
    // What matters most right now: shielded, then enraged, then how weakened it is
    const state = fight.shielded ? ['Shielded', '#d9a8ff']
        : fight.enraged ? ['Enraged', '#ffb3a8']
        : weakened > 1.005 ? [`Weakened +${Math.round((weakened - 1) * 100)}%`, '#ffffff']
        : null;
    if (state) {
        ctx.fillStyle = state[1];
        ctx.textAlign = 'right';
        ctx.fillText(state[0], x + width - 8, y + place.barHeight / 2 + 1);
    }

    ctx.restore();
}

// Where the boss will strike, shown while it winds up: the lane of a charge, the safe patch of
// a stomp. Drawn under everything else.
function drawWarnings(ctx, canvas, place) {
    const floorTop = canvas.logicalHeight * (1 - gameConfig.player.movableArea.heightPercent);
    const pulse = 0.55 + Math.sin(fight.steps * 0.35) * 0.25;

    ctx.save();

    if (fight.storm) drawStorm(ctx, canvas, pulse);

    if (fight.attack === 'charge' && fight.doing !== 'moving') {
        const width = place.width * 0.6;
        const top = place.top + place.height * 0.9;
        const lane = ctx.createLinearGradient(0, top, 0, canvas.logicalHeight);
        lane.addColorStop(0, 'rgba(255, 60, 30, 0)');
        lane.addColorStop(0.25, `rgba(255, 60, 30, ${0.3 * pulse})`);
        lane.addColorStop(1, `rgba(255, 60, 30, ${0.5 * pulse})`);
        ctx.fillStyle = lane;
        ctx.fillRect(fight.attackData.x - width / 2, top, width, canvas.logicalHeight - top);
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.8 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(fight.attackData.x - width / 2, top, width, canvas.logicalHeight - top);
    }

    if (fight.attack === 'swipe' && fight.doing === 'winding') {
        // The ground under the boss that the swipe will reach
        const box = hitBox(canvas);
        const reach = box.height * gameConfig.bosses.melee.reach;
        const left = box.x - box.width * 0.4;
        const width = box.width * 1.8;
        ctx.fillStyle = `rgba(255, 60, 30, ${0.3 * pulse})`;
        ctx.fillRect(left, box.y, width, box.height + reach);
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.85 * pulse})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(left, box.y, width, box.height + reach);
    }

    if (fight.attack === 'stomp' && fight.doing === 'winding') {
        const { left, right } = fight.attackData;
        const height = canvas.logicalHeight - floorTop;
        // The ground that will be struck, and the one patch that will not
        ctx.fillStyle = `rgba(255, 60, 30, ${0.32 * pulse})`;
        ctx.fillRect(0, floorTop, left, height);
        ctx.fillRect(right, floorTop, canvas.logicalWidth - right, height);
        ctx.fillStyle = `rgba(90, 230, 120, ${0.28 + 0.12 * pulse})`;
        ctx.fillRect(left, floorTop, right - left, height);
        ctx.strokeStyle = 'rgba(190, 255, 200, 0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(left, floorTop, right - left, height);
    }

    // Things lobbed at the player: in the air, then lying where they will burst
    const picture = attackPicture(fight.boss);
    for (const bomb of fight.bombs) {
        const flight = Math.min(1, bomb.steps / BOMB_FLIGHT_STEPS);
        const fuse = Math.max(0, (bomb.steps - BOMB_FLIGHT_STEPS) / BOMB_FUSE_STEPS);
        const x = bomb.fromX + (bomb.x - bomb.fromX) * flight;
        // An arc: up a little, then down onto the spot
        const y = bomb.fromY + (bomb.y - bomb.fromY) * flight - Math.sin(flight * Math.PI) * place.height * 0.35;

        // The ground it will take with it, filling as the fuse burns
        ctx.fillStyle = `rgba(255, 60, 30, ${0.14 + 0.3 * fuse})`;
        ctx.beginPath();
        ctx.arc(bomb.x, bomb.y, bomb.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 190, 120, ${0.5 + 0.4 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        if (picture.complete && picture.naturalWidth) {
            const size = bomb.radius * 0.9 * (1 + fuse * 0.15 * Math.sin(bomb.steps * 0.6));
            const scale = size / Math.max(picture.naturalWidth, picture.naturalHeight);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(flight < 1 ? bomb.steps * 0.2 : 0);
            ctx.drawImage(picture, -picture.naturalWidth * scale / 2, -picture.naturalHeight * scale / 2, picture.naturalWidth * scale, picture.naturalHeight * scale);
            ctx.restore();
        }
    }

    ctx.restore();
}

/**
 * Draw the boss, its health bar and the warnings of what it is about to do.
 * @param {number} alpha  How far the display is between two simulation steps (0..1)
 */
export function drawBoss(ctx, canvas, alpha = 1) {
    if (!fight) return;

    const image = picture(fight.boss);
    const place = layout(canvas, fight.boss);
    const x = fight.prevX + (fight.x - fight.prevX) * alpha;
    let y = place.top + fight.prevDrop + (fight.drop - fight.prevDrop) * alpha;
    let opacity = 1 - fight.hidden;

    if (fight.phase === 'intro') {
        // Comes down from above the screen
        const progress = Math.min(1, fight.steps / INTRO_STEPS);
        y = place.top - (1 - progress) * (place.top + place.height);
    } else if (fight.phase === 'dying') {
        // Sinks and fades
        const progress = Math.min(1, fight.steps / DYING_STEPS);
        y = place.top + progress * place.height * 0.25;
        opacity = 1 - progress;
    }

    if (fight.phase === 'fight') drawWarnings(ctx, canvas, place);

    if (image.complete && image.naturalWidth) {
        ctx.save();
        ctx.globalAlpha = opacity;
        // Winding up an attack, it glows: this is when it cannot sidestep
        if (fight.phase === 'fight' && fight.doing === 'winding') {
            ctx.shadowColor = '#FF5A2A';
            ctx.shadowBlur = 18 + Math.sin(fight.steps * 0.5) * 8;
        }
        // A hit knocks it back a little
        const recoil = fight.hitFlash > 0 ? -place.height * 0.015 : 0;
        ctx.drawImage(image, x - place.width / 2, y + recoil, place.width, place.height);
        ctx.restore();
    }

    // The shield: a violet bubble around the boss
    if (fight.shielded && fight.hidden < 0.5) {
        const centerY = y + place.height / 2;
        const pulse = 0.85 + Math.sin(fight.steps * 0.12) * 0.15;
        const bubble = ctx.createRadialGradient(x, centerY, place.height * 0.2, x, centerY, place.height * 0.62);
        bubble.addColorStop(0, 'rgba(176, 72, 248, 0)');
        bubble.addColorStop(0.75, `rgba(176, 72, 248, ${0.22 * pulse})`);
        bubble.addColorStop(1, `rgba(217, 168, 255, ${0.7 * pulse})`);

        ctx.save();
        ctx.fillStyle = bubble;
        ctx.beginPath();
        ctx.ellipse(x, centerY, place.width * 0.56, place.height * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = `rgba(232, 200, 255, ${0.8 * pulse})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }

    if (fight.phase !== 'dying') drawHealthBar(ctx, canvas, place);
}
