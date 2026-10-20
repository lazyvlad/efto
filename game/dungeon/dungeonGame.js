// The dungeon run on screen: the stage, the fighters and what flies between them on a canvas,
// and the panels around it (who acts next, the party, the spell bar) as the INPUT Screens
// design draws them ("The dungeon run", DungeonFight / DungeonFightSide).
//
// The fight itself is dungeon/battle.js; this only shows it and passes on the player's orders.
// He chooses one of the three (a click or tap on him or his card, or Tab); a click or tap on a
// cell sends the chosen one there, the arrow keys step him, and the spell keys
// (utils/keybindings.js, dungeon/spellBar.js) cast. Opened from /play?dungeon=stockade
// (game-modular.js).

import {
    createBattle, step, living, unitById, hunterOf, nextToAct, moveUnit, follow, setAuto, autoState, holyLight, castSpell, attackFoe,
    awaitingUnit, turnAttack, turnMove, turnHeal, turnWait, turnDefend,
    setHealPlan, planTarget, HEALED,
} from './battle.js';
import { COLS, ROWS, distance, reachable } from './rules.js';
import { inBowRange, inSpellRange, multiShot, arcaneShot, drinkPotion, revivePet, spellReady } from './battle.js';
import { STAGE_W, STAGE_H, ROW_SCALE, cellRect, cellFoot, cellAt } from './stage.js';
import { FOES, COMPANION_SPELLS, PARTY } from './stockade.js';
import { renderBar, updateBar, entryForAction } from './spellBar.js';
import { ACTORS, PROJECTILES, SPELL_FX, MAGE_FX, SPELL_ICONS, actorFiles, poseFrame, versioned } from './actors.js';
import { actionFor } from '../utils/keybindings.js';

// The Stockade's cell block (art-workbench/dungeon-run/stockade/stage)
const BACKGROUND = 'assets/dungeon/stockade/stage.webp';
// The height of the stage at which the backdrop's floor meets its walls
const FLOOR_LEVEL = 430;
const KIND_ROLE = { druid: 'tank', paladin: 'healer', hunter: 'damage', pet: 'pet', mage: 'damage' };
const PLAN_KEY = 'input_dungeon_heal_plan';
// The party's names (dungeon/stockade.js), as the screen says them
const NAMES = { hunter: 'You', druid: PARTY.druid.name, paladin: PARTY.paladin.name, mage: PARTY.mage.name, pet: PARTY.pet.name };
const WHO = NAMES;
// Whose, as a word before a noun: "Your turn", "Smokva's turn"
const whose = kind => (kind === 'hunter' ? 'Your' : `${NAMES[kind]}'s`);
// Him in running text: "you", or his name
const him = kind => (kind === 'hunter' ? 'you' : NAMES[kind]);

export async function startDungeon({ gear = {}, onLeave = () => location.reload(), speed = 1 } = {}) {
    const root = document.createElement('div');
    root.id = 'dungeon';
    root.innerHTML = HUD_HTML;
    document.body.appendChild(root);
    document.body.classList.add('in-dungeon');
    const $ = selector => root.querySelector(selector);
    const canvas = $('.dg-stage');
    const g = canvas.getContext('2d');

    $('.dg-loading').hidden = false;
    const images = await loadImages([BACKGROUND, ...actorFiles()]);
    $('.dg-loading').hidden = true;

    let battle, visuals, floaters, flights, effects, banners, paused, hover, lastTime, shake, selected, aiming, armed;
    const reset = () => {
        // Each one's auto mode carries over to the next run
        const wasAuto = battle ? { ...battle.auto } : null;
        battle = createBattle({ gear });
        if (wasAuto) battle.auto = wasAuto;
        // The paladin's heal plan, as the player last set it (kept in this browser)
        try { setHealPlan(battle, JSON.parse(localStorage.getItem(PLAN_KEY))); } catch (error) { /* the plan he starts with */ }
        visuals = new Map();
        floaters = [];
        flights = [];
        effects = [];
        banners = [];
        selected = 'hunter';
        aiming = null;
        armed = null;
        paused = false;
        hover = null;
        lastTime = performance.now();
        shake = 0;
        $('.dg-end').hidden = true;
        $('.dg-pause').hidden = true;
        buildParty();
        fit();
    };

    // ---- Fitting the stage to the screen ----

    // On a phone the floor is wider than the screen: the view keeps the fight in the middle, from
    // the party's rearmost to the nearest foe, gliding rather than jumping
    function followFight(dt) {
        const f = view.follow;
        if (!f) return;
        const party = living(battle, 'party').filter(u => u.kind !== 'pet').map(u => drawnPlace(u).x);
        const foes = living(battle, 'foe').map(u => drawnPlace(u).x);
        const back = party.length ? Math.min(...party) : f.min;
        const front = foes.length ? Math.min(...foes) : Math.max(...party, back) + 300;
        const want = Math.max(f.min, Math.min(f.max, (back + front) / 2));
        f.at = f.at === null ? want : f.at + (want - f.at) * Math.min(1, dt * 2.5);
        view.x = f.left + f.avail / 2 - f.at * view.scale;
    }

    let view = { scale: 1, x: 0, y: 0, dpr: 1 };
    // The dungeon is played sideways. A phone held upright (its rotation locked, or a browser
    // that will not turn) gets the whole dungeon drawn turned a quarter, so held on its side the
    // game stands the right way up; taps are turned back to match (toStage).
    let rotated = false;
    function orient() {
        rotated = window.innerHeight > window.innerWidth && window.innerWidth < 700;
        root.classList.toggle('dg-rotated', rotated);
        root.style.width = rotated ? window.innerHeight + 'px' : '';
        root.style.height = rotated ? window.innerWidth + 'px' : '';
        // Short (a phone either way): the party and the spells go down the sides
        root.classList.toggle('dg-short', (rotated ? window.innerWidth : window.innerHeight) < 560);
    }

    function fit() {
        orient();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = root.clientWidth, h = root.clientHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';
        // The whole floor always in view; the backdrop fills the rest
        let scale = Math.min(w / STAGE_W, h / (STAGE_H * 0.86));
        view = { scale, x: (w - STAGE_W * scale) / 2, y: (h - STAGE_H * scale) / 2 + (h < 500 ? -STAGE_H * scale * 0.08 : 0), dpr };
        // A short screen (a phone on its side): the party down the left, the spells down the right,
        // and the floor, with the fighters standing on it, as big as fits between them under the top
        if (h < 560) {
            const left = (root.querySelector('.dg-party')?.offsetWidth || 120) + 10;
            const right = (root.querySelector('.dg-spells')?.offsetWidth || 70) + 10;
            const top = 46;
            const near = cellRect(0, ROWS - 1), farEnd = cellRect(COLS - 1, ROWS - 1);
            const floorLeft = near.x - near.h * 0.12, floorW = farEnd.x + farEnd.w + near.h * 0.12 - floorLeft;
            // From the heads of the far row to the near row's front edge
            const fromY = 230, toY = near.y + near.h + 6;
            // Sized by its height (the fighters big enough to read), as much of its width as fits:
            // about seven columns, the view following the fight across (followFight)
            scale = Math.min((h - top - 4) / (toY - fromY), (w - left - right) / (floorW * 0.55));
            const avail = w - left - right;
            const follow = floorW * scale > avail;
            view = { scale, x: left + (avail - floorW * scale) / 2 - floorLeft * scale, y: top - fromY * scale, dpr,
                follow: follow ? { left, avail, min: floorLeft + avail / scale / 2, max: floorLeft + floorW - avail / scale / 2, at: null } : null };
        }
    }
    window.addEventListener('resize', fit);
    fit();

    const toStage = (clientX, clientY) => {
        // Turned a quarter clockwise: the screen's down is the dungeon's right
        if (rotated) return { x: (clientY - view.x) / view.scale, y: (window.innerWidth - clientX - view.y) / view.scale };
        const rect = canvas.getBoundingClientRect();
        return { x: (clientX - rect.left - view.x) / view.scale, y: (clientY - rect.top - view.y) / view.scale };
    };

    // On a phone the first touch asks for the whole screen held sideways (Android browsers turn
    // to it even with rotation locked; where it is refused, the turned drawing above serves)
    root.addEventListener('pointerdown', function sideways(event) {
        if (event.pointerType !== 'touch') return;
        root.removeEventListener('pointerdown', sideways, true);
        const ask = document.documentElement.requestFullscreen ? document.documentElement.requestFullscreen({ navigationUI: 'hide' }) : Promise.reject();
        ask.then(() => screen.orientation && screen.orientation.lock ? screen.orientation.lock('landscape') : null).catch(() => {}).finally(fit);
    }, true);
    window.addEventListener('orientationchange', () => setTimeout(fit, 150));

    // ---- The player's orders ----

    canvas.addEventListener('pointerdown', event => {
        if (paused || battle.result) return;
        const p = toStage(event.clientX, event.clientY);
        const cell = cellAt(p.x, p.y);
        if (!cell) return;
        // On one of the three: choose him. Anywhere else: send the chosen one there.
        // A spell armed: the click chooses its target (refused, with a word, when out of reach)
        if (armed) {
            // Blink: a cell
            if (armed.side === 'cell') {
                const spec = armed;
                if (!spec.cellOk(cell)) { const c = awaitingUnit(battle); if (c) floaters.push({ text: 'Out of reach', unit: c.id, start: performance.now(), color: '#ffb4a8', spell: true }); return; }
                arm(null);
                spec.castCell(cell);
                return;
            }
            const there = [...living(battle), ...battle.units.filter(u => !u.alive && u.kind === 'pet')].find(u => u.col === cell.col && u.row === cell.row);
            if (there) confirmTarget(there);
            return;
        }
        // Choosing whom the paladin's spell is for: any of the party, the pet too
        if (aiming) {
            const ally = living(battle, 'party').find(u => u.col === cell.col && u.row === cell.row);
            if (ally) castAimed(ally.id);
            return;
        }
        const foe = living(battle, 'foe').find(u => u.col === cell.col && u.row === cell.row);
        const ally = living(battle, 'party').find(u => u.col === cell.col && u.row === cell.row);
        // Someone's turn: the click is his order (a foe: attack it; an ally: the paladin heals him;
        // a cell: go there)
        const turn = awaitingUnit(battle);
        if (turn) {
            if (foe) {
                if (!turnAttack(battle, foe.id)) floaters.push({ text: 'No way through', unit: turn.id, start: performance.now(), color: '#ffb4a8', spell: true });
                return;
            }
            if (ally && turn.kind === 'paladin') return turnHeal(battle, ally.id);
            if (ally) return;
            return turnMove(battle, cell.col, cell.row);
        }
        const there = ally;
        if (there && there.kind !== selected) return select(there.kind);
        // A foe, with the hunter chosen: he attacks it (shot from range, hand to hand up close)
        if (foe && selected === 'hunter') return attackFoe(battle, foe.id);
        moveUnit(battle, selected, cell.col, cell.row);
    });
    canvas.addEventListener('pointermove', event => {
        const p = toStage(event.clientX, event.clientY);
        hover = cellAt(p.x, p.y);
    });
    canvas.addEventListener('pointerleave', () => { hover = null; });

    function onKey(event) {
        if (!document.body.contains(root)) return;
        if (event.code === 'Escape') {
            event.preventDefault();
            if (armed) return arm(null);
            if (aiming) return aim(null);
            if (!$('.dg-plan').hidden) return closePlan();
            if (!$('.dg-help').hidden) { $('.dg-help').hidden = true; return setPaused(false); }
            if (!battle.result) setPaused(!paused);
            return;
        }
        if (paused || battle.result) return;
        const turn = awaitingUnit(battle);
        if (turn && event.code === 'Space') { event.preventDefault(); turnWait(battle); return; }
        if (turn && event.code === 'KeyD') { event.preventDefault(); turnDefend(battle); return; }
        if (event.code === 'Tab') {
            event.preventDefault();
            if (turn) return;
            const order = ['hunter', 'druid', 'paladin', 'mage', 'pet'].filter(kind => battle.units.some(u => u.kind === kind && u.alive));
            select(order[(order.indexOf(selected) + (event.shiftKey ? order.length - 1 : 1)) % order.length]);
            return;
        }
        const chosen = battle.units.find(u => u.kind === selected);
        const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.code];
        if (steps && turn) {
            event.preventDefault();
            turnMove(battle, turn.col + steps[0], turn.row + steps[1]);
            return;
        }
        if (steps && chosen && chosen.alive) {
            event.preventDefault();
            const from = goalOf(chosen) || chosen;
            moveUnit(battle, selected, from.col + steps[0], from.row + steps[1]);
            return;
        }
        const action = actionFor(event.code);
        const found = action && entryForAction(selected, action);
        if (found) {
            event.preventDefault();
            press(found.entry);
            return;
        }
        if (event.code === 'KeyF' && !action && selected !== 'hunter') {
            event.preventDefault();
            follow(battle, selected);
        }
    }

    // Where a fighter is going: the hunter's next cell, a companion's held cell, or the end of a walk
    function goalOf(unit) {
        if (unit.kind === 'hunter') return unit.moveTo || (unit.path.length ? unit.path[unit.path.length - 1] : null);
        return unit.hold || null;
    }

    // A spell button pressed: cast it, or for the paladin's spells on an ally ask whom (pressed
    // again while asking: the lowest of the party)
    function press(entry) {
        if (entry.open === 'plan') return openPlan();
        // His turn, played by the player: the spell is armed, and cast on the target he then chooses
        const turn = awaitingUnit(battle);
        const spec = turn && turn.kind === selected && targetSpec(turn, entry);
        if (spec) {
            if (armed && armed.id === entry.id) return arm(null);
            return arm(spec);
        }
        if (!entry.aim) return entry.cast(battle);
        if (aiming === entry.aim) return castAimed(null);
        aim(entry.aim);
    }

    function aim(spell) {
        aiming = spell;
        root.classList.toggle('aiming', !!spell);
        const names = { holyLight: 'Holy Light', protection: 'Blessing of Protection', layOnHands: 'Lay on Hands' };
        $('.dg-aim').hidden = !spell;
        if (spell) $('.dg-aim-text').textContent = `${names[spell]}: click whom (a card or a fighter). Again: the lowest. Esc: cancel.`;
        for (const button of root.querySelectorAll('[data-aim]')) button.classList.toggle('aiming', button.dataset.aim === spell);
    }

    // ---- Arming a spell on a played turn: what it may be cast on, and casting it there ----

    // { id, name, side ('foe', 'ally', 'self', 'corpse'), valid(unit), cast(unit) }, or null for
    // what needs no target (the pet's mode, Follow)
    function targetSpec(caster, entry) {
        const b = battle;
        const party = side => u => u.side === 'party' && u.alive;
        const own = u => u === caster;
        const spec = (side, valid, cast) => ({ id: entry.id, name: typeof entry.name === 'function' ? entry.name(b) : entry.name, side, valid, cast });
        switch (`${caster.kind}.${entry.id}`) {
            case 'hunter.multi': return spec('foe', u => u.side === 'foe' && inBowRange(caster, u), u => multiShot(b, u.id));
            case 'hunter.arcane': return spec('foe', u => u.side === 'foe' && inBowRange(caster, u), u => arcaneShot(b, u.id));
            case 'hunter.potion': return spec('self', u => own(u) && u.hp < u.maxHp && b.potions > 0, () => drinkPotion(b));
            case 'hunter.revive': return spec('corpse', u => u.kind === 'pet' && !u.alive, () => revivePet(b));
            // His area spells: confirmed on any foe they reach (or on him); the area shaded
            case 'druid.growl': case 'druid.swipe': {
                const radius = entry.id === 'growl' ? COMPANION_SPELLS.druid.growl.radius : 1;
                const inArea = u => u.side === 'foe' && u.alive && distance(u, caster) <= radius;
                return { ...spec('area', u => (inArea(u) || own(u)) && spellReady(b, 'druid', entry.id), () => castSpell(b, 'druid', entry.id)), center: caster, radius };
            }
            case 'druid.barkskin':
            case 'pet.dash':
                return spec('self', u => own(u) && spellReady(b, caster.kind, entry.id), () => castSpell(b, caster.kind, entry.id));
            case 'mage.fireball': case 'mage.frostbolt': case 'mage.arcaneMissiles':
                return spec('foe', u => u.side === 'foe' && inSpellRange(caster, u) && spellReady(b, 'mage', entry.id, u.id), u => castSpell(b, 'mage', entry.id, { target: u.id }));
            case 'mage.frostNova': {
                const radius = COMPANION_SPELLS.mage.frostNova.radius;
                const inArea = u => u.side === 'foe' && u.alive && distance(u, caster) <= radius;
                return { ...spec('area', u => (inArea(u) || own(u)) && spellReady(b, 'mage', 'frostNova'), () => castSpell(b, 'mage', 'frostNova')), center: caster, radius };
            }
            case 'mage.iceBarrier': return spec('self', u => own(u) && spellReady(b, 'mage', 'iceBarrier'), () => castSpell(b, 'mage', 'iceBarrier'));
            case 'mage.blink': {
                const range = COMPANION_SPELLS.mage.blink.range;
                return { ...spec('cell', () => false, () => false), center: caster, radius: range,
                    cellOk: cell => distance(caster, cell) > 0 && distance(caster, cell) <= range && !b.units.some(u => u.alive && u.col === cell.col && u.row === cell.row),
                    castCell: cell => castSpell(b, 'mage', 'blink', { target: cell }) };
            }
            case 'pet.claw': return spec('foe', u => u.side === 'foe' && distance(u, caster) === 1, u => castSpell(b, 'pet', 'claw', { target: u.id }));
            case 'paladin.hammer': return spec('foe', u => spellReady(b, 'paladin', 'hammer', u.id), u => castSpell(b, 'paladin', 'hammer', { target: u.id }));
            case 'paladin.holyLight': return spec('ally', u => party()(u) && distance(u, caster) <= caster.range, u => turnHeal(b, u.id));
            case 'paladin.protection': case 'paladin.layOnHands':
                return spec('ally', u => party()(u) && spellReady(b, 'paladin', entry.id, u.id), u => castSpell(b, 'paladin', entry.id, { target: u.id }));
        }
        return null;
    }

    function arm(spec) {
        armed = spec;
        root.classList.toggle('aiming', !!spec);
        $('.dg-aim').hidden = !spec;
        if (spec) {
            const whom = { foe: 'click a foe (a red X: out of reach)', ally: 'click an ally (a red X: out of reach)', self: 'click him to confirm', corpse: 'click your fallen pet', area: 'click a foe in the shaded area, or him (a red X: outside it)', cell: 'click a free cell in the shaded area' }[spec.side];
            $('.dg-aim-text').textContent = `${spec.name}: ${whom}. Esc or the spell again: cancel.`;
        }
        for (const button of root.querySelectorAll('.dg-spell')) button.classList.toggle('aiming', !!spec && BARS_ID(button) === spec.id);
    }

    const BARS_ID = button => button.dataset.entry;

    function confirmTarget(unit) {
        const spec = armed;
        if (!spec) return;
        if (!spec.valid(unit)) {
            const caster = awaitingUnit(battle);
            if (caster) floaters.push({ text: unit.side === 'foe' || spec.side === 'ally' ? 'Out of reach' : 'Not a target', unit: caster.id, start: performance.now(), color: '#ffb4a8', spell: true });
            return;
        }
        arm(null);
        spec.cast(unit);
    }

    // Cast the spell being aimed on an ally (null: on the lowest of the party)
    function castAimed(targetId) {
        const spell = aiming;
        aim(null);
        if (!spell) return false;
        if (spell === 'holyLight') {
            // Pressed again: whom his plan would heal, else the lowest
            const planned = planTarget(battle, 'holyLight', { need: 1 });
            const lowest = living(battle, 'party').slice().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
            return holyLight(battle, targetId || (planned || lowest)?.id);
        }
        return castSpell(battle, 'paladin', spell, targetId ? { target: targetId } : {});
    }

    // ---- The paladin's heal plan, and the guide ----

    function openPlan() {
        setPaused(true, false);
        renderPlan();
        $('.dg-plan').hidden = false;
    }

    function closePlan() {
        $('.dg-plan').hidden = true;
        try { localStorage.setItem(PLAN_KEY, JSON.stringify(battle.healPlan)); } catch (error) { /* kept for this run only */ }
        setPaused(false);
    }

    function renderPlan() {
        const plan = battle.healPlan;
        const box = $('.dg-plan-body');
        const spells = [['holyLight', 'Holy Light'], ['protection', 'Blessing of Protection'], ['layOnHands', 'Lay on Hands']];
        box.innerHTML = `
            <fieldset class="dg-plan-mode"><legend>Holy Light goes to</legend>
                <label><input type="radio" name="dg-mode" value="lowest" ${plan.mode === 'lowest' ? 'checked' : ''}> The lowest of them</label>
                <label><input type="radio" name="dg-mode" value="order" ${plan.mode === 'order' ? 'checked' : ''}> The first in this order who needs it</label>
            </fieldset>
            <ol class="dg-plan-order">${plan.order.map((kind, i) => `<li data-kind="${kind}"><span>${WHO[kind]}</span>
                <button type="button" data-move="-1" aria-label="${WHO[kind]} up" ${i === 0 ? 'disabled' : ''}>▲</button>
                <button type="button" data-move="1" aria-label="${WHO[kind]} down" ${i === plan.order.length - 1 ? 'disabled' : ''}>▼</button></li>`).join('')}</ol>
            <table class="dg-plan-allow"><caption>Who may have each spell when he chooses</caption>
                <thead><tr><th></th>${spells.map(([, name]) => `<th scope="col">${name}</th>`).join('')}</tr></thead>
                <tbody>${HEALED.map(kind => `<tr><th scope="row">${WHO[kind]}</th>${spells.map(([spell, name]) => `<td><input type="checkbox" data-spell="${spell}" data-kind="${kind}" aria-label="${name} on ${him(kind)}" ${plan.allow[spell][kind] ? 'checked' : ''}></td>`).join('')}</tr>`).join('')}</tbody>
            </table>
            <p class="dg-plan-note">This is what ${NAMES.paladin} does by himself. A + on a card, or a spell you aim, goes where you choose.</p>`;
        box.querySelectorAll('input[name="dg-mode"]').forEach(input => input.onchange = () => { setHealPlan(battle, { ...battle.healPlan, mode: input.value }); renderPlan(); });
        box.querySelectorAll('[data-move]').forEach(button => button.onclick = () => {
            const order = [...battle.healPlan.order], kind = button.closest('li').dataset.kind, i = order.indexOf(kind), j = i + Number(button.dataset.move);
            [order[i], order[j]] = [order[j], order[i]];
            setHealPlan(battle, { ...battle.healPlan, order, mode: 'order' });
            renderPlan();
        });
        box.querySelectorAll('input[data-spell]').forEach(input => input.onchange = () => {
            const allow = JSON.parse(JSON.stringify(battle.healPlan.allow));
            allow[input.dataset.spell][input.dataset.kind] = input.checked;
            setHealPlan(battle, { ...battle.healPlan, allow });
        });
    }

    function openHelp() {
        setPaused(true, false);
        $('.dg-help').hidden = false;
    }

    function select(kind) {
        const unit = battle.units.find(u => u.kind === kind);
        if (!unit || !unit.alive) return;
        if (kind !== selected) arm(null);
        selected = kind;
        aim(null);
        renderBar($('.dg-bar-spells'), kind, press);
        for (const chip of root.querySelectorAll('[data-select]')) chip.classList.toggle('selected', chip.dataset.select === kind);
    }
    document.addEventListener('keydown', onKey, true);

    $('.dg-pause-button').onclick = () => setPaused(true);
    $('.dg-turn-wait').onclick = () => turnWait(battle);
    $('.dg-turn-defend').onclick = () => turnDefend(battle);
    $('.dg-help-button').onclick = openHelp;
    $('.dg-help-close').onclick = () => { $('.dg-help').hidden = true; setPaused(false); };
    $('.dg-plan-close').onclick = closePlan;
    // All three's auto mode: on for all of them (or, when all are on, off for all)
    $('.dg-auto-button').onclick = () => setAuto(battle, autoState(battle) !== 'all');
    $('.dg-resume').onclick = () => setPaused(false);
    for (const button of root.querySelectorAll('.dg-leave')) button.onclick = leave;
    $('.dg-again').onclick = reset;

    // Paused (showing the pause window, unless another window is the reason)
    function setPaused(on, window = true) {
        paused = on;
        $('.dg-pause').hidden = !on || !window;
        lastTime = performance.now();
    }

    function leave() {
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', fit);
        root.remove();
        document.body.classList.remove('in-dungeon');
        onLeave();
    }

    // ---- What happened, turned into poses, flights, numbers and banners ----

    function visualOf(unit) {
        let v = visuals.get(unit.id);
        if (!v) {
            const at = placeOf(unit);
            // Where he is drawn (x, y, row: following the fight on a spring), how fast, how far he
            // has walked (his step frames follow it), and his own clock for breathing
            v = { pose: 'idle', since: 0, bear: false, flash: 0, fall: 0, x: at.x, y: at.y, row: at.row, vx: 0, vy: 0, dist: 0, walkPhase: 0, phase: Math.random() * 3000 };
            visuals.set(unit.id, v);
        }
        return v;
    }

    function pose(unit, name, now) {
        const actor = ACTORS[unit.kind];
        const v = visualOf(unit);
        if (!actor.poses[name] || v.pose === 'death') return;
        v.pose = name;
        v.since = now;
    }

    function readEvents(now) {
        for (const event of battle.events) {
            const from = unitById(battle, event.from), to = unitById(battle, event.to);
            switch (event.type) {
                case 'strike':
                    if (from) {
                        const name = from.kind === 'druid' ? 'bearStrike' : 'strike';
                        pose(from, name, now);
                        if (to) startLunge(from, to, name, now);
                    }
                    break;
                case 'shot':
                    if (from && from.kind === 'hunter') pose(from, event.kind === 'multi' ? 'multi' : 'shoot', now);
                    else if (from && from.kind === 'mage') { if (event.kind === 'arcane-missile') { if (visualOf(from).pose !== 'channel') { pose(from, 'channel', now); visualOf(from).channelUntil = now + 900; } } else pose(from, 'cast', now); }
                    else if (from) pose(from, 'strike', now);
                    // It leaves the bow (or the hand) on the release frame
                    if (from && to) flights.push({ kind: event.kind, from: from.id, to: to.id, start: now + (event.release || 0) * 1000, flight: event.flight * 1000 });
                    break;
                case 'hit': {
                    if (to && MAGE_FX[`${event.kind}-impact`]) {
                        const at = drawnPlace(to, now), sc = rowScale(at.row);
                        effects.push({ kind: `${event.kind}-impact`, mage: true, x: at.x, y: at.y - ACTORS[to.kind].height * sc * 0.55, scale: sc, start: now });
                    }
                    if (to) {
                        const v = visualOf(to);
                        startKnock(to, from, now, event.kind === 'strike' && event.amount >= 30);
                        // A hit brightens him for a blink, at most twice a second: the tank, hit by
                        // several at once, would otherwise glow all the time
                        if (now - v.flash > 500) v.flash = now;
                        if (to.kind === 'druid') { if (v.pose === 'bearIdle') pose(to, 'bearHurt', now); }
                        else if (to.kind !== 'paladin' || v.pose !== 'cast') { if (['idle', 'bearIdle'].includes(v.pose)) pose(to, 'hurt', now); }
                        // Hits close together on him are one number, not a pile
                        const recent = !event.crit && floaters.find(f => f.unit === to.id && f.damage && !f.crit && now - f.start < 350);
                        if (recent) {
                            recent.damage += event.amount;
                            recent.text = '-' + recent.damage;
                        } else {
                            floaters.push({ text: '-' + event.amount + (event.crit ? '!' : ''), damage: event.amount, crit: event.crit, unit: to.id, start: now, color: to.side === 'party' ? '#ff7a6a' : (event.crit ? '#ffd100' : '#fff3d0'), big: event.crit || event.kind === 'arcane' });
                        }
                    }
                    break;
                }
                case 'spell': {
                    if (!from) break;
                    const at = drawnPlace(from, now);
                    const scale = rowScale(at.row);
                    // The druid's own effects go where he goes
                    if (event.spell === 'growl') { pose(from, 'bearRoar', now); effects.push({ kind: 'growl', on: from.id, dx: 0, dy: 0, start: now }); }
                    if (event.spell === 'swipe') {
                        pose(from, 'bearStrike', now);
                        effects.push({ kind: 'swipe', on: from.id, dx: 85, dy: -110, start: now });
                        const near = living(battle, 'foe').find(f => Math.max(Math.abs(f.col - from.col), Math.abs(f.row - from.row)) === 1);
                        if (near) startLunge(from, near, 'bearStrike', now);
                    }
                    if (event.spell === 'hammer') { pose(from, 'strike', now); effects.push({ kind: 'hammer', x: at.x, y: at.y, to: event.to, start: now, length: 300 }); }
                    if (event.spell === 'frostNova') { pose(from, 'cast', now); effects.push({ kind: 'frost-nova-ring', mage: true, x: at.x, y: at.y, scale, start: now }); }
                    if (event.spell === 'iceBarrier') pose(from, 'barrier', now);
                    if (event.spell === 'protection') pose(from, 'raise', now);
                    if (event.spell === 'layOnHands') {
                        pose(from, 'raise', now);
                        if (to) { const there = drawnPlace(to, now); effects.push({ kind: 'layOnHands', x: there.x, y: there.y, scale: rowScale(there.row), start: now }); }
                    }
                    floaters.push({ text: event.name, unit: from.id, start: now, color: from.kind === 'druid' ? '#b8f08a' : '#ffe9a8', spell: true });
                    break;
                }
                case 'blink': {
                    if (from) {
                        const a = cellFoot(event.fromCell.col, event.fromCell.row), z = cellFoot(event.toCell.col, event.toCell.row);
                        effects.push({ kind: 'blink-out', mage: true, x: a.x, y: a.y, scale: rowScale(event.fromCell.row), start: now });
                        effects.push({ kind: 'blink-in', mage: true, x: z.x, y: z.y, scale: rowScale(event.toCell.row), start: now + 120 });
                        // He is there at once: no walk across
                        const v = visualOf(from); v.x = z.x; v.y = z.y; v.vx = 0; v.vy = 0; v.row = event.toCell.row;
                    }
                    break;
                }
                case 'shieldGone':
                    if (from && event.broken) { const at = drawnPlace(from, now); effects.push({ kind: 'ice-barrier-break', mage: true, x: at.x, y: at.y, scale: rowScale(at.row), start: now }); }
                    break;
                case 'absorbed':
                    if (to) floaters.push({ text: 'Absorbed', unit: to.id, start: now, color: '#b6e3ff' });
                    break;
                case 'frozen':
                    break;
                case 'immune':
                    if (to) floaters.push({ text: 'Immune', unit: to.id, start: now, color: '#ffe9a8' });
                    break;
                case 'turn':
                    if (from) floaters.push({ text: 'Your order?', unit: from.id, start: now, color: '#ffe066', spell: true });
                    break;
                case 'wait':
                    if (from) floaters.push({ text: 'Wait', unit: from.id, start: now, color: '#cfc4ad', spell: true });
                    break;
                case 'defend':
                    if (from) floaters.push({ text: 'Defend', unit: from.id, start: now, color: '#9cc8ff', spell: true });
                    break;
                case 'tooClose':
                    if (from && !(now - (visualOf(from).saidRange || 0) < 2500)) {
                        visualOf(from).saidRange = now;
                        floaters.push({ text: 'Too close to shoot', unit: from.id, start: now, color: '#ffb4a8', spell: true });
                    }
                    break;
                case 'outOfRange':
                    // Said over him, not more than every couple of seconds
                    if (from && !(now - (visualOf(from).saidRange || 0) < 2500)) {
                        visualOf(from).saidRange = now;
                        floaters.push({ text: event.walking ? 'Out of reach: going closer' : 'Out of range', unit: from.id, start: now, color: '#ffb4a8', spell: true });
                    }
                    break;
                case 'dodged':
                    if (to) floaters.push({ text: 'Dodge', unit: to.id, start: now, color: '#cfe3ff' });
                    break;
                case 'cast':
                    if (from && event.revive) floaters.push({ text: 'Revive Pet', unit: from.id, start: now, color: '#b8f08a' });
                    else if (from) pose(from, 'cast', now);
                    break;
                case 'revived':
                    if (to) {
                        const v = visualOf(to);
                        v.pose = 'idle'; v.since = now; v.fall = 0; v.holy = now;
                        floaters.push({ text: 'Revived', unit: to.id, start: now, color: '#7dff8a' });
                    }
                    break;
                case 'heal':
                    if (from && from.kind === 'paladin') pose(from, 'idle', now);
                    if (event.potion && to) pose(to, 'drink', now);
                    if (to) {
                        if (!event.potion) visualOf(to).holy = now;
                        floaters.push({ text: '+' + event.amount, unit: to.id, start: now, color: '#7dff8a' });
                    }
                    break;
                case 'interrupted':
                    if (from) {
                        pose(from, 'hurt', now);
                        floaters.push({ text: 'Interrupted', unit: from.id, start: now, color: '#ffb4a8' });
                    }
                    break;
                case 'died':
                    if (to) {
                        pose(to, 'death', now);
                        visualOf(to).fall = now;
                    }
                    break;
                case 'raised':
                    if (to) {
                        const v = visualOf(to);
                        v.pose = 'idle'; v.since = now; v.fall = 0; v.holy = now; v.bear = false;
                        floaters.push({ text: 'Raised', unit: to.id, start: now, color: '#ffe9a8' });
                    }
                    if (from) pose(from, 'raise', now);
                    break;
                case 'roar':
                    shake = now;
                    if (from && ACTORS[from.kind].poses.roar) pose(from, 'roar', now);
                    banners.push({ text: `${from ? from.name : 'He'} roars!`, sub: 'He hits harder and faster now', start: now, danger: true });
                    break;
                case 'cleave':
                    if (from) {
                        const name = ACTORS[from.kind].poses.cleave ? 'cleave' : 'strike';
                        pose(from, name, now);
                        const victim = living(battle, 'party').find(u => Math.max(Math.abs(u.col - from.col), Math.abs(u.row - from.row)) === 1);
                        if (victim) startLunge(from, victim, name, now);
                    }
                    if (from) floaters.push({ text: 'Cleave', unit: from.id, start: now, color: '#ff8a5c', big: true });
                    break;
                case 'wave':
                    banners.push(event.boss
                        ? { text: FOES.targorr.name, sub: 'The last wave', start: now, danger: true }
                        : { text: `Wave ${event.wave + 1} of ${event.waves}`, sub: event.wave === 0 ? `Click a cell to move. The + on a card has ${NAMES.paladin} heal them. ? explains it all.` : '', start: now });
                    break;
                case 'cleared':
                    banners.push({ text: 'Wave cleared', sub: 'The next one is coming', start: now });
                    break;
                case 'petStance':
                    floaters.push({ text: event.stance === 'aggressive' ? 'Aggressive' : 'Defensive', unit: battle.units.find(u => u.kind === 'pet').id, start: now, color: event.stance === 'aggressive' ? '#ff8a5c' : '#9cc8ff' });
                    break;
                case 'won':
                case 'lost':
                    setTimeout(() => showEnd(event.type), 1400);
                    break;
            }
        }
        battle.events.length = 0;
    }

    // The druid is the bear while foes stand, the man between waves
    function druidForm(now) {
        const druid = battle.units.find(u => u.kind === 'druid');
        if (!druid || !druid.alive) return;
        const v = visualOf(druid);
        const fighting = living(battle, 'foe').length > 0;
        const pose = ACTORS.druid.poses[v.pose];
        const settled = !pose.then;
        if (fighting && !pose.bear && settled && !['change', 'changeFinish'].includes(v.pose)) { v.pose = 'change'; v.since = now; }
        if (!fighting && pose.bear && settled && v.pose !== 'death') { v.pose = 'unchange'; v.since = now; }
    }

    // ---- Where everyone stands, walking between cells ----

    function placeOf(unit) {
        const here = cellFoot(unit.col, unit.row);
        if (unit.path.length) {
            const next = cellFoot(unit.path[0].col, unit.path[0].row);
            const t = Math.min(1, unit.walked);
            return { x: here.x + (next.x - here.x) * t, y: here.y + (next.y - here.y) * t, row: unit.row + (unit.path[0].row - unit.row) * t };
        }
        return { ...here, row: unit.row };
    }

    // Each fighter's drawn place follows where the fight has him on a critically damped spring:
    // he sets off and stops smoothly instead of sliding at one speed and halting dead
    function updateMotion(dt) {
        const k = 90, c = 2 * Math.sqrt(k);
        for (const unit of battle.units) {
            const v = visualOf(unit), at = placeOf(unit);
            const ax = k * (at.x - v.x) - c * v.vx, ay = k * (at.y - v.y) - c * v.vy;
            v.vx += ax * dt; v.vy += ay * dt;
            const mx = v.vx * dt, my = v.vy * dt;
            v.x += mx; v.y += my;
            v.row += (at.row - v.row) * Math.min(1, dt * 10);
            const travelled = Math.hypot(mx, my);
            v.dist += travelled;
            // His walk cycle moves on by each bit of ground covered, at the scale of the row he is
            // on then: a row change never re-reads the steps already taken (which skipped frames)
            const gait = ACTORS[unit.kind].poses[v.pose === 'bearStep' || (ACTORS[unit.kind].poses[v.pose] || {}).bear ? 'bearStep' : 'step'];
            if (gait && travelled > 0) {
                const actor = ACTORS[unit.kind];
                const cycle = (gait.stride || 160 * gait.frames.length / 4) * actor.height * rowScale(v.row) / (actor.figure || 430);
                v.walkPhase = (v.walkPhase + travelled / cycle) % 1;
            }
            v.speed = Math.hypot(v.vx, v.vy);
        }
    }

    // A blow carries him toward his target, there on the contact frame, and back; a blow taken
    // jolts him away. Both as offsets from where he stands.
    function offsetOf(v, now) {
        let dx = 0, dy = 0;
        const l = v.lunge;
        if (l) {
            const t = now - l.start;
            let share = 0;
            if (t < l.contact) { const u = t / l.contact; share = u * u * (3 - 2 * u); }
            else if (t < l.contact + 90) share = 1;
            else if (t < l.contact + 400) { const u = (t - l.contact - 90) / 310; share = 1 - u * u * (3 - 2 * u); }
            else v.lunge = null;
            dx += l.dx * share; dy += l.dy * share;
        }
        const kn = v.knock;
        if (kn) {
            const t = (now - kn.start) / 240;
            if (t >= 1) v.knock = null;
            else { const fall = (1 - t) * (1 - t); dx += kn.dx * fall; dy += kn.dy * fall; }
        }
        return { dx, dy };
    }

    // Where a fighter is drawn this moment
    function drawnPlace(unit, now = performance.now()) {
        const v = visualOf(unit), o = offsetOf(v, now);
        return { x: v.x + o.dx, y: v.y + o.dy, row: v.row };
    }

    // The moment a pose's blow lands, from its frame times (contact on its third frame)
    function contactMs(unit, poseName) {
        const def = ACTORS[unit.kind].poses[poseName];
        if (def && def.contactAtMs) return def.contactAtMs;
        return def && def.durations ? def.durations[0] + def.durations[1] : 260;
    }

    function startLunge(from, to, poseName, now) {
        const a = drawnPlace(from, now), b = drawnPlace(to, now);
        const gap = Math.hypot(b.x - a.x, b.y - a.y);
        if (gap < 1) return;
        // Up to within a body's reach of him: about half the way, never past him
        const reach = Math.min(gap * 0.55, 90 * rowScale(a.row));
        visualOf(from).lunge = { start: now, contact: contactMs(from, poseName), dx: (b.x - a.x) / gap * reach, dy: (b.y - a.y) / gap * reach * 0.5 };
    }

    function startKnock(to, from, now, heavy) {
        const a = from ? drawnPlace(from, now) : null, b = drawnPlace(to, now);
        const dir = a ? Math.sign(b.x - a.x) || 1 : -(to.facing || 1);
        const v = visualOf(to);
        v.knock = { start: now, dx: dir * (heavy ? 16 : 8) * rowScale(b.row), dy: 0 };
        // The impact holds both for a blink
        v.since += 60;
        if (from) visualOf(from).since += 60;
    }

    function rowScale(row) {
        const i = Math.floor(row), f = row - i;
        return i >= ROWS - 1 ? ROW_SCALE[ROWS - 1] : ROW_SCALE[i] + (ROW_SCALE[i + 1] - ROW_SCALE[i]) * f;
    }

    // ---- Drawing ----

    function draw(now) {
        const s = view.scale * view.dpr;
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.fillStyle = '#0a0806';
        g.fillRect(0, 0, canvas.width, canvas.height);
        const shaking = now - shake < 500 ? Math.sin(now / 25) * 6 * (1 - (now - shake) / 500) : 0;

        // The backdrop covers the whole screen, its floor level with the stage's
        const bg = images.get(BACKGROUND);
        if (bg) {
            const cover = Math.max(canvas.width / bg.width, canvas.height / bg.height, (STAGE_H * s) / bg.height);
            const w = bg.width * cover, h = bg.height * cover;
            const floorY = view.y * view.dpr + (FLOOR_LEVEL) * s;
            const y = Math.min(0, Math.max(canvas.height - h, floorY - h * 0.55));
            g.drawImage(bg, (canvas.width - w) / 2 + shaking * s, y, w, h);
            const shade = g.createLinearGradient(0, 0, 0, canvas.height);
            shade.addColorStop(0, 'rgba(10,8,6,0.55)');
            shade.addColorStop(0.35, 'rgba(10,8,6,0.1)');
            shade.addColorStop(1, 'rgba(10,8,6,0.75)');
            g.fillStyle = shade;
            g.fillRect(0, 0, canvas.width, canvas.height);
        }
        g.setTransform(s, 0, 0, s, view.x * view.dpr + shaking * s, view.y * view.dpr);

        drawFloor(now);

        const drawn = battle.units.filter(u => u.alive || visualOf(u).pose === 'death')
            .map(u => ({ unit: u, place: drawnPlace(u, now) }))
            .sort((a, b) => a.place.row - b.place.row || a.place.y - b.place.y);
        for (const { unit, place } of drawn) drawUnit(unit, place, now);
        for (const { unit, place } of drawn) if (unit.alive) drawBars(unit, place);

        drawTargets(now);
        drawFlights(now);
        drawEffects(now);
        drawFloaters(now);
        drawBanners(now);
    }

    function quad(r, inset = 1) {
        const skew = r.h * 0.12;
        g.beginPath();
        g.moveTo(r.x + inset + skew, r.y + inset);
        g.lineTo(r.x + r.w - inset + skew, r.y + inset);
        g.lineTo(r.x + r.w - inset - skew, r.y + r.h - inset);
        g.lineTo(r.x + inset - skew, r.y + r.h - inset);
        g.closePath();
    }

    function drawFloor(now) {
        const druid = battle.units.find(u => u.kind === 'druid' && u.alive);
        const chosen = battle.units.find(u => u.kind === selected);
        const fighting = battle.phase === 'fight' && living(battle, 'foe').length;
        const goal = chosen && chosen.alive ? goalOf(chosen) : null;
        const held = living(battle, 'party').filter(u => u.hold && u !== chosen).map(u => u.hold);
        // Whose turn it is: the cells he can walk to this turn, in blue
        const turnUnit = awaitingUnit(battle);
        const moves = turnUnit ? new Set(reachable(turnUnit, turnUnit.speed, (c, r) => battle.units.some(u => u.alive && u !== turnUnit && u.col === c && u.row === r))
            .filter(p => p.length).map(p => p.at(-1).col * 10 + p.at(-1).row)) : null;
        // The chosen hunter's or paladin's reach: the floor beyond it a shade darker
        const reach = chosen && chosen.alive && chosen.range && (chosen.kind === 'hunter' || chosen.kind === 'paladin') ? chosen : null;
        for (let row = 0; row < ROWS; row++) {
            for (let col = 0; col < COLS; col++) {
                const r = cellRect(col, row);
                let fill = 'rgba(255,230,170,0.035)', line = 'rgba(255,220,150,0.14)';
                if (druid && fighting && distance(druid, { col, row }) <= druid.taunt) { fill = 'rgba(120,200,90,0.13)'; line = 'rgba(150,230,110,0.45)'; }
                if (hover && hover.col === col && hover.row === row && !battle.result) { fill = 'rgba(255,209,0,0.14)'; line = 'rgba(255,209,0,0.6)'; }
                if (held.some(h => h.col === col && h.row === row)) { fill = 'rgba(255,209,0,0.1)'; line = 'rgba(255,209,0,0.55)'; }
                if (goal && goal.col === col && goal.row === row) { fill = 'rgba(255,209,0,0.28)'; line = '#ffd100'; }
                quad(r);
                g.fillStyle = fill;
                g.fill();
                if (armed && armed.side === 'cell') {
                    if (armed.cellOk({ col, row })) {
                        g.fillStyle = hover && hover.col === col && hover.row === row ? 'rgba(125,255,138,0.32)' : 'rgba(125,255,138,0.14)';
                        g.fill();
                    }
                } else if (armed && armed.center && distance(armed.center, { col, row }) <= armed.radius) {
                    g.fillStyle = 'rgba(255,120,60,0.18)';
                    g.fill();
                }
                if (moves && moves.has(col * 10 + row) && !armed) {
                    g.fillStyle = 'rgba(120,180,255,0.16)';
                    g.fill();
                    g.strokeStyle = 'rgba(150,200,255,0.55)';
                    g.stroke();
                }
                if (reach && (distance(reach, { col, row }) > reach.range || (reach.minRange && distance(reach, { col, row }) <= reach.minRange))) {
                    g.fillStyle = 'rgba(0,0,0,0.28)';
                    g.fill();
                }
                g.strokeStyle = line;
                g.lineWidth = 1.2;
                g.stroke();
            }
        }
        // The chosen one's way to where he was sent
        if (goal && (goal.col !== chosen.col || goal.row !== chosen.row)) {
            const a = drawnPlace(chosen, now), b = cellFoot(goal.col, goal.row);
            g.fillStyle = '#ffd100';
            for (let i = 1; i < 5; i++) {
                const t = i / 5;
                g.beginPath();
                g.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 3.5, 0, Math.PI * 2);
                g.fill();
            }
        }
    }

    function drawUnit(unit, place, now) {
        const actor = ACTORS[unit.kind];
        const v = visualOf(unit);
        // Walking (his drawn place on the move) shows the step pose; standing after it, the pose he
        // stands in. A little give either way, so a slow last step does not flicker.
        if (unit.alive) {
            const walking = v.walking ? v.speed > 18 : v.speed > 45;
            v.walking = walking;
            if (unit.kind === 'druid') {
                if (walking && !['change', 'changeFinish', 'unchange', 'unchangeFinish'].includes(v.pose)) {
                    const want = ACTORS.druid.poses[v.pose].bear ? 'bearStep' : 'step';
                    if (v.pose !== want) { v.pose = want; v.since = now; }
                } else if (!walking && (v.pose === 'step' || v.pose === 'bearStep')) {
                    v.pose = v.pose === 'bearStep' ? 'bearIdle' : 'idle'; v.since = now;
                }
            } else if (walking && v.pose !== 'step' && actor.poses.step) { v.pose = 'step'; v.since = now; }
            else if (!walking && v.pose === 'step') { v.pose = 'idle'; v.since = now; }
            if (unit.kind === 'paladin' && v.pose === 'cast' && !unit.cast) { v.pose = 'idle'; v.since = now; }
            if (v.pose === 'channel' && now > (v.channelUntil || 0)) { v.pose = 'idle'; v.since = now; }
        }
        let poseDef = actor.poses[v.pose] || actor.poses.idle;
        // Loops run on his own clock (no two breathe together); the rest from when they began
        let shown = poseFrame(poseDef, now - v.since + (poseDef.loop ? v.phase : 0));
        if (shown.done && poseDef.then) {
            v.pose = poseDef.then; v.since = now;
            poseDef = actor.poses[v.pose];
            shown = poseFrame(poseDef, poseDef.loop ? v.phase : 0);
        }
        // His steps follow the ground he covers: one cycle for every stride he paints (in the cell's
        // pixels, drawn at his scale), so his feet keep to the floor (walkPhase, updateMotion)
        if ((v.pose === 'step' || v.pose === 'bearStep') && poseDef.frames) {
            shown = { frame: poseDef.frames[Math.floor(v.walkPhase * poseDef.frames.length) % poseDef.frames.length] };
        }
        const image = images.get(poseDef.file);
        if (!image) return;

        const scale = rowScale(place.row);
        const height = actor.height * scale;
        const facingRight = unit.facing > 0;

        // A shadow on the floor (the fallen have none)
        if (unit.alive) {
            g.fillStyle = 'rgba(0,0,0,0.38)';
            g.beginPath();
            g.ellipse(place.x, place.y + 2, height * (unit.kind === 'pet' ? 0.5 : 0.24), height * 0.05, 0, 0, Math.PI * 2);
            g.fill();
        }

        // Rings: the hunter gold; a foe pointed at, red; the paladin red while a foe goes for him
        const healing = battle.units.find(u => u.kind === 'paladin' && u.alive && u.cast && u.cast.to === unit.id);
        const hunterNow = hunterOf(battle);
        const focused = unit.side === 'foe' && hunterNow && hunterNow.focus === unit.id;
        const ringColor = healing ? '#7dff8a' : unit.kind === selected ? '#ffd100' : focused ? '#ff3b2a'
            : unit.side === 'foe' && hover && hover.col === unit.col && hover.row === unit.row ? '#ff6a50'
            : unit.kind === 'paladin' && living(battle, 'foe').some(f => f.targetId === unit.id && f.goes === 'healer') ? 'rgba(255,90,70,0.9)' : null;
        if (ringColor && unit.alive) {
            g.strokeStyle = ringColor;
            g.lineWidth = 2.2;
            g.shadowColor = ringColor;
            g.shadowBlur = 10;
            g.beginPath();
            g.ellipse(place.x, place.y + 2, height * 0.3, height * 0.07, 0, 0, Math.PI * 2);
            g.stroke();
            g.shadowBlur = 0;
        }

        // Ice Barrier, behind him
        if (unit.alive && unit.shield > 0 && unit.shieldUntil > battle.clock) drawFx(MAGE_FX['ice-barrier-loop'], now, place.x, place.y, MAGE_FX['ice-barrier-loop'].height * rowScale(place.row));
        // Barkskin's shell, behind him
        if (unit.alive && unit.barkUntil > battle.clock) drawFx(SPELL_FX.barkskin, now, place.x, place.y, SPELL_FX.barkskin.height * rowScale(place.row));

        g.save();
        // A fallen stand-in tips over and fades; the painted ones have their own death
        const fallen = v.fall && (poseDef.fall || actor.standIn) ? Math.min(1, (now - v.fall) / 450) : 0;
        // Fallen foes fade away after a moment; the party's fallen stay, faint, until raised
        const gone = !unit.alive && v.fall ? Math.min(1, Math.max(0, (now - v.fall - 900) / 700)) : 0;
        g.globalAlpha = unit.alive ? 1 : unit.side === 'foe' ? Math.max(0, 0.75 * (1 - gone)) : 0.45;
        if (g.globalAlpha === 0) { g.restore(); return; }
        g.translate(place.x, place.y);
        if (fallen) g.rotate((facingRight ? -1 : 1) * fallen * 1.2);
        const flash = now - v.flash < 80;
        const filters = [];
        if (actor.tint) filters.push(actor.tint);
        if (flash) filters.push('brightness(1.3)');
        if (filters.length) g.filter = filters.join(' ');

        // Painted facing right; mirrored to face left
        if (!facingRight) g.scale(-1, 1);

        const cell = poseDef.cell;
        const sx = (shown.frame % poseDef.columns) * cell, sy = Math.floor(shown.frame / poseDef.columns) * cell;
        // How much of the 512px cell his standing figure fills ("figure"), so he stands "height" tall
        const k = height / (actor.figure || 430);
        const [px, py] = poseDef.pivot;
        const drawn = { image, sx, sy, cell, x: -px * k, y: -py * k, size: cell * k };
        // From one pose to the next, the last frame fades out over a blink rather than snapping
        if (v.drawnPose && v.drawnPose !== v.pose && v.lastDrawn && unit.alive) { v.fadeFrom = v.lastDrawn; v.fadeAt = now; }
        v.drawnPose = v.pose;
        if (v.fadeFrom && now - v.fadeAt < 100) {
            const base = g.globalAlpha, f = v.fadeFrom;
            g.globalAlpha = base * (1 - (now - v.fadeAt) / 100) * 0.85;
            g.drawImage(f.image, f.sx, f.sy, f.cell, f.cell, f.x, f.y, f.size, f.size);
            g.globalAlpha = base;
        }
        g.drawImage(image, sx, sy, cell, cell, drawn.x, drawn.y, drawn.size, drawn.size);
        v.lastDrawn = drawn;
        g.restore();

        // The holy light on whoever the paladin heals
        if (v.holy && now - v.holy < 410) {
            const holy = ACTORS.holy, img = images.get(holy.file);
            const f = poseFrame(holy, now - v.holy).frame;
            const k = (height * 1.05) / 430;
            g.save();
            g.globalCompositeOperation = 'screen';
            g.drawImage(img, f * 512, 0, 512, 512, place.x - 256 * k, place.y - 464 * k, 512 * k, 512 * k);
            g.restore();
        }
        if (unit.alive) drawAuras(unit, place, height, now);
    }

    // What a spell leaves on a fighter while it lasts: the bubble, the stars, a growl's mark (the
    // bark shell is drawn behind him, in drawUnit)
    function drawAuras(unit, place, height, now) {
        const t = battle.clock, scale = rowScale(place.row);
        if (unit.immuneUntil > t) {
            const size = Math.max(0.45, height / 230);
            drawFx(SPELL_FX.protection, now, place.x, place.y, SPELL_FX.protection.height * scale * size);
        }
        if (unit.stunnedUntil > t) drawFx(SPELL_FX.stun, now, place.x, place.y - height * 1.0, SPELL_FX.stun.height * scale);
        if (unit.rootedUntil > t) drawFx(MAGE_FX['frost-nova-bind'], now, place.x, place.y, MAGE_FX['frost-nova-bind'].height * scale * Math.max(0.8, height / 180));
        if (unit.growlUntil > t) {
            g.save();
            g.fillStyle = '#ff6a50';
            g.font = 'bold 24px Georgia, serif';
            g.textAlign = 'center';
            g.lineWidth = 3;
            g.strokeStyle = '#000';
            g.strokeText('!', place.x, place.y - height * 1.08);
            g.fillText('!', place.x, place.y - height * 1.08);
            g.restore();
        }
    }

    // A spell armed: a green ring under each it may be cast on (bright under the pointer), a red ✕
    // over each of its kind it cannot reach
    function drawTargets(now) {
        if (!armed) return;
        const caster = awaitingUnit(battle);
        if (armed.side === 'cell') return;
        const candidates = battle.units.filter(u => (u.alive || (armed.side === 'corpse' && u.kind === 'pet'))
            && (armed.side === 'foe' ? u.side === 'foe' : armed.side === 'area' ? u.side === 'foe' || u === caster : u.side === 'party'));
        for (const unit of candidates) {
            const at = drawnPlace(unit, now), s = rowScale(at.row), h = ACTORS[unit.kind].height * s;
            const ok = armed.valid(unit);
            const hovered = hover && hover.col === unit.col && hover.row === unit.row;
            if (ok) {
                g.save();
                g.strokeStyle = hovered ? '#b6ff9a' : 'rgba(125,255,138,0.75)';
                g.lineWidth = hovered ? 4 : 2.5;
                g.shadowColor = '#7dff8a';
                g.shadowBlur = hovered ? 18 : 8 + Math.sin(now / 160) * 4;
                g.beginPath();
                g.ellipse(at.x, at.y + 2, h * 0.34, h * 0.08, 0, 0, Math.PI * 2);
                g.stroke();
                g.restore();
            } else if ((armed.side !== 'self' || unit === caster) && !(armed.side === 'area' && unit === caster)) {
                const x = at.x, y = at.y - h * 1.08, r = (hovered ? 14 : 10) * s + 2;
                g.save();
                g.lineCap = 'round';
                g.strokeStyle = '#000';
                g.lineWidth = 7;
                g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
                g.strokeStyle = '#ff4a3a';
                g.lineWidth = 4;
                g.stroke();
                g.restore();
            }
        }
    }

    // A painted effect's frame, standing on its own pivot at (x, y), the cell drawn "height" tall
    function drawFx(fx, ms, x, y, height, flip = false) {
        const image = images.get(fx.file);
        if (!image) return false;
        const { frame, index, done } = poseFrame({ frames: [0, 1, 2, 3], durations: fx.durations, loop: fx.loop }, ms);
        if (done && !fx.loop) return false;
        const k = height / 512;
        const [px, py] = fx.pivots[index] || [256, 256];
        g.save();
        g.translate(x, y);
        if (flip) g.scale(-1, 1);
        g.drawImage(image, frame * 512, 0, 512, 512, -px * k, -py * k, 512 * k, 512 * k);
        g.restore();
        return true;
    }

    // A spell's moment: the growl's ring, the swipe's arc, the column of Lay on Hands, the hammer
    function drawEffects(now) {
        effects = effects.filter(e => {
            if (e.kind === 'hammer') {
                const t = (now - e.start) / e.length;
                const target = unitById(battle, e.to);
                if (t >= 1 || !target) return false;
                const to = drawnPlace(target, now), lift = 120 * rowScale(to.row);
                const x = e.x + (to.x - e.x) * t, y = e.y - lift + (to.y - lift - (e.y - lift)) * t - Math.sin(t * Math.PI) * 40;
                const hammer = PROJECTILES.hammer, image = images.get(hammer.file);
                if (image) {
                    g.save();
                    g.translate(x, y);
                    g.rotate(t * 12);
                    g.drawImage(image, -hammer.width / 2, -hammer.width / 2, hammer.width, hammer.width);
                    g.restore();
                }
                return true;
            }
            if (e.on) {
                const unit = unitById(battle, e.on);
                if (!unit) return false;
                const at = drawnPlace(unit, now), scale = rowScale(at.row);
                return drawFx(SPELL_FX[e.kind], now - e.start, at.x + e.dx * scale * unit.facing, at.y + e.dy * scale, SPELL_FX[e.kind].height * scale, unit.facing < 0);
            }
            if (e.mage) return now < e.start || drawFx(MAGE_FX[e.kind], now - e.start, e.x, e.y, MAGE_FX[e.kind].height * e.scale);
            return drawFx(SPELL_FX[e.kind], now - e.start, e.x, e.y, SPELL_FX[e.kind].height * e.scale, e.flip);
        });
    }

    function drawBars(unit, place) {
        const scale = rowScale(place.row);
        const w = 70 * scale, x = place.x - w / 2, y = place.y + 10 * scale;
        const bar = (top, h, share, color) => {
            g.fillStyle = '#000';
            g.fillRect(x - 1, top - 1, w + 2, h + 2);
            g.fillStyle = '#1a1410';
            g.fillRect(x, top, w, h);
            g.fillStyle = color;
            g.fillRect(x, top, w * Math.max(0, Math.min(1, share)), h);
        };
        bar(y, 5 * scale + 1, unit.hp / unit.maxHp, unit.side === 'foe' ? '#d8382c' : '#3fbf4f');
        const turn = unit.path.length || unit.cast ? 1 : unit.bar;
        bar(y + 7 * scale + 2, 3 * scale, turn, unit.cast ? '#ffe9a8' : '#ffd100');
    }

    function drawFlights(now) {
        flights = flights.filter(f => now - f.start < f.flight);
        for (const f of flights) {
            const target = unitById(battle, f.to), shooter = unitById(battle, f.from);
            // Not yet: he is still drawing the bow
            if (!target || now < f.start) continue;
            // Leaving from his bow (or hand) as it was at the release
            if (!f.origin) {
                const at = shooter ? drawnPlace(shooter, now) : drawnPlace(target, now);
                const s = rowScale(at.row), h = shooter ? ACTORS[shooter.kind].height * s : 0;
                f.origin = { x: at.x + (shooter ? shooter.facing : 1) * 34 * s, y: at.y - h * 0.62 };
            }
            const to = drawnPlace(target, now);
            const t = (now - f.start) / f.flight;
            const lift = ACTORS[target.kind].height * rowScale(to.row) * 0.5;
            const ax = f.origin.x, ay = f.origin.y, bx = to.x, by = to.y - lift;
            const x = ax + (bx - ax) * t, y = ay + (by - ay) * t - Math.sin(t * Math.PI) * 30;
            const angle = Math.atan2(by - ay - Math.cos(t * Math.PI) * 30 * Math.PI, bx - ax);
            g.save();
            g.translate(x, y);
            // The mage's bolts: their painted, burning flight, pointed along the way
            const bolt = MAGE_FX[`${f.kind}-flight`];
            if (bolt) {
                g.rotate(angle);
                drawFx(bolt, now - f.start, 0, 0, bolt.height * rowScale(to.row));
                g.restore();
                continue;
            }
            const flying = PROJECTILES[f.kind] || PROJECTILES.arrow, image = images.get(flying.file);
            if (image) {
                if (f.kind === 'rock') g.rotate(t * 9);
                else g.rotate(angle);
                const w = flying.width * rowScale(to.row), h = w * image.height / image.width;
                g.drawImage(image, -w / 2, -h / 2, w, h);
            }
            g.restore();
        }
    }

    function drawFloaters(now) {
        floaters = floaters.filter(f => now - f.start < 1100);
        g.textAlign = 'center';
        for (const f of floaters) {
            const unit = unitById(battle, f.unit);
            if (!unit) continue;
            const p = drawnPlace(unit, now);
            const t = (now - f.start) / 1100;
            const height = (ACTORS[unit.kind].height || 200) * rowScale(p.row);
            // What shows on the same fighter at once stands apart: numbers a little aside, words
            // (spell names) each on a line of their own
            if (f.lane === undefined) {
                const busy = floaters.filter(o => o !== f && o.unit === f.unit && o.lane !== undefined && now - o.start < 500 && !!o.spell === !!f.spell).length;
                f.lane = busy % 4;
            }
            const dx = f.spell ? 0 : [0, -34, 34, 0][f.lane];
            const dy = f.spell ? -30 - f.lane * 28 : [0, 18, 18, 36][f.lane];
            g.globalAlpha = 1 - t * t;
            g.font = `${f.big ? 30 : 22}px Marcellus, Georgia, serif`;
            g.lineWidth = 4;
            g.strokeStyle = '#000';
            const y = p.y - height - 10 - t * 50 + dy;
            g.strokeText(f.text, p.x + dx, y);
            g.fillStyle = f.color;
            g.fillText(f.text, p.x + dx, y);
        }
        g.globalAlpha = 1;
    }

    function drawBanners(now) {
        banners = banners.filter(b => now - b.start < 2600);
        const b = banners[banners.length - 1];
        if (!b) return;
        const t = (now - b.start) / 2600;
        g.globalAlpha = t < 0.12 ? t / 0.12 : t > 0.8 ? (1 - t) / 0.2 : 1;
        g.textAlign = 'center';
        g.font = '54px Marcellus, Georgia, serif';
        g.lineWidth = 6;
        g.strokeStyle = '#000';
        g.strokeText(b.text, STAGE_W / 2, 300);
        g.fillStyle = b.danger ? '#ff8a5c' : '#ffd100';
        g.fillText(b.text, STAGE_W / 2, 300);
        if (b.sub) {
            g.font = '22px "Trebuchet MS", sans-serif';
            g.lineWidth = 4;
            g.strokeText(b.sub, STAGE_W / 2, 340);
            g.fillStyle = '#f4ecd8';
            g.fillText(b.sub, STAGE_W / 2, 340);
        }
        g.globalAlpha = 1;
    }

    // ---- The panels ----

    const portraits = new Map();
    // A fighter's head and shoulders, cut from his idle picture, for the panels
    function portrait(kind) {
        if (portraits.has(kind)) return portraits.get(kind);
        // The pet: its painted icon
        if (kind === 'pet') { portraits.set(kind, versioned('assets/dungeon/nightsaber/icon.webp')); return portraits.get(kind); }
        const actor = ACTORS[kind], idle = actor.poses.idle, image = images.get(idle.file);
        const c = document.createElement('canvas');
        c.width = c.height = 96;
        const x = c.getContext('2d');
        if (image) {
            if (actor.tint) x.filter = actor.tint;
            if (idle.whole) x.drawImage(image, 0, 0, image.width, image.height * 0.7, 0, 0, 96, 96 * 0.7 * image.height / image.width);
            else {
                const cell = idle.cell, f = idle.frames[0];
                const sx = (f % idle.columns) * cell, sy = Math.floor(f / idle.columns) * cell;
                const crop = cell * (kind === 'druid' || kind === 'paladin' ? 0.34 : kind === 'mage' ? 0.26 : 0.4);
                const top = kind === 'paladin' ? cell * 0.2 : kind === 'druid' ? cell * 0.07 : kind === 'mage' ? cell * 0.3 : cell * 0.2;
                x.drawImage(image, sx + cell / 2 - crop / 2 + (idle.faces === 'west' ? -cell * 0.03 : 0), sy + top, crop, crop, 0, 0, 96, 96);
            }
        }
        const url = c.toDataURL();
        portraits.set(kind, url);
        return url;
    }

    // The paladin heals him: the + on his card (the way a healer heals from party frames)
    function healButton(unit, small = false) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'dg-heal' + (small ? ' small' : '');
        button.dataset.heal = unit.id;
        const who = unit.kind === 'paladin' ? 'himself' : him(unit.kind);
        button.title = `Holy Light: ${NAMES.paladin} heals ${who}`;
        button.setAttribute('aria-label', button.title);
        button.innerHTML = `<img alt="" src="${versioned(`assets/dungeon/spells/icons/${SPELL_ICONS.holyLight}.webp`)}"><b>+</b>`;
        button.onclick = event => {
            event.stopPropagation();
            if (armed) return confirmTarget(unit);
            if (aiming) return castAimed(unit.id);
            if (awaitingUnit(battle)?.kind === 'paladin') return turnHeal(battle, unit.id);
            holyLight(battle, unit.id);
        };
        return button;
    }

    function buildParty() {
        const party = $('.dg-party');
        party.replaceChildren();
        // The pet is a line on his hunter's card, not a card of its own
        for (const unit of battle.units.filter(u => u.side === 'party')) {
            const card = document.createElement('div');
            card.className = 'dg-member';
            card.dataset.id = unit.id;
            card.innerHTML = `<img class="dg-face" alt="" src="${portrait(unit.kind)}">
                <div class="dg-member-body"><div class="dg-member-head"><span class="dg-member-name"></span><span class="dg-member-role">${KIND_ROLE[unit.kind]}</span></div>
                <div class="dg-bar dg-hp"><i></i><span></span></div><div class="dg-bar dg-turn"><i></i></div><div class="dg-member-note"></div></div>`;
            card.querySelector('.dg-member-name').textContent = unit.kind === 'hunter' ? 'You' : unit.name;
            card.dataset.select = unit.kind;
            card.dataset.id = unit.id;
            // While asking whom: the card is the answer. Otherwise it chooses him.
            card.onclick = () => (armed ? confirmTarget(unit) : aiming ? castAimed(unit.id) : select(unit.kind));
            card.appendChild(healButton(unit));
            // His own auto mode
            const toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'dg-auto-toggle';
            toggle.dataset.auto = unit.kind;
            toggle.textContent = 'Auto';
            toggle.title = `${unit.kind === 'hunter' ? 'Your' : 'The ' + unit.kind + '\'s'} spells cast by themselves as they come ready`;
            toggle.onclick = event => {
                event.stopPropagation();
                setAuto(battle, !battle.auto[unit.kind], unit.kind);
            };
            card.querySelector('.dg-member-head').insertBefore(toggle, card.querySelector('.dg-member-role'));
            if (unit.kind === 'paladin') {
                const plan = document.createElement('button');
                plan.type = 'button';
                plan.className = 'dg-auto-toggle dg-plan-button';
                plan.textContent = 'Plan';
                plan.title = 'Whom he heals first, and who may have which spell';
                plan.onclick = event => { event.stopPropagation(); openPlan(); };
                card.querySelector('.dg-member-head').insertBefore(plan, card.querySelector('.dg-member-role'));
            }
            party.appendChild(card);
        }
        const hunter = hunterOf(battle);
        $('.dg-you').innerHTML = [['Attack', hunter.attack], ['Defense', hunter.defense], ['Speed', `${hunter.speed} cells`], ['Health', hunter.maxHp]]
            .map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
        $('.dg-title').textContent = battle.dungeon.name;
        // Who the orders and the spell bar are for
        const who = $('.dg-who');
        who.replaceChildren();
        for (const kind of ['hunter', 'druid', 'paladin', 'mage', 'pet']) {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'dg-chip';
            chip.dataset.select = kind;
            chip.title = `${NAMES[kind]} (Tab to change)`;
            chip.innerHTML = `<img alt="" src="${portrait(kind)}"><span>${NAMES[kind]}</span>`;
            chip.onclick = () => select(kind);
            who.appendChild(chip);
        }
        select('hunter');
    }

    const setText = (el, text) => { if (el.textContent !== text) el.textContent = text; };
    const setWidth = (el, share) => { const w = Math.round(Math.max(0, Math.min(1, share)) * 1000) / 10 + '%'; if (el.style.width !== w) el.style.width = w; };

    function updatePanels() {
        // The waves: done gold, the one being fought red
        const pips = $('.dg-waves');
        if (pips.childElementCount !== battle.dungeon.waves.length) {
            pips.innerHTML = battle.dungeon.waves.map(() => '<i></i>').join('');
        }
        [...pips.children].forEach((pip, i) => {
            pip.className = i < battle.wave || (i === battle.wave && battle.phase === 'between') ? 'done' : i === battle.wave ? 'now' : '';
        });
        setText($('.dg-wave-label'), battle.wave < 0 ? 'Get ready' : `Wave ${battle.wave + 1} of ${battle.dungeon.waves.length}`);

        // Who acts next
        const next = nextToAct(battle, 6);
        const strip = $('.dg-next-list');
        const sig = next.map(n => n.unit.id).join(',');
        if (strip.dataset.sig !== sig) {
            strip.dataset.sig = sig;
            strip.innerHTML = next.map((n, i) => `<div class="dg-next ${n.unit.side} ${i === 0 ? 'first' : ''}"><img alt="" src="${portrait(n.unit.kind)}"><span></span></div>`).join('');
        }
        next.forEach((n, i) => setText(strip.children[i].querySelector('span'), `${n.unit.kind === 'hunter' ? 'You' : shortName(n.unit)} · ${n.seconds.toFixed(1)} s`));

        // The party
        for (const card of $('.dg-party').children) {
            const unit = unitById(battle, Number(card.dataset.id));
            card.classList.toggle('fallen', !unit.alive);
            setWidth(card.querySelector('.dg-hp i'), unit.hp / unit.maxHp);
            setText(card.querySelector('.dg-hp span'), `${Math.round(unit.hp)} / ${unit.maxHp}`);
            setWidth(card.querySelector('.dg-turn i'), unit.path.length || unit.cast ? 1 : unit.bar);
            const target = unit.cast && unitById(battle, unit.cast.to);
            setText(card.querySelector('.dg-member-note'), !unit.alive ? 'Fallen' : unit.cast && unit.cast.kind === 'revive' ? `Reviving ${NAMES.pet}…` : target ? `Casting Holy Light on ${target === unit ? 'himself' : him(target.kind)}`
                : unit.stunnedUntil > battle.clock ? 'Stunned' : unit.hold ? 'Holding where you sent him'
                : unit.kind === 'pet' ? (battle.petStance === 'aggressive' ? 'Aggressive' : 'Defensive') : '');
            card.classList.toggle('selected', unit.kind === selected);
        }

        // The auto modes: each one's on his card, all three's at the top
        for (const toggle of root.querySelectorAll('.dg-auto-toggle')) {
            const on = !!battle.auto[toggle.dataset.auto];
            if (toggle.getAttribute('aria-pressed') !== String(on)) toggle.setAttribute('aria-pressed', String(on));
        }
        const all = autoState(battle);
        const top = $('.dg-auto-button');
        setText(top, all === 'all' ? 'Auto: On' : all === 'some' ? 'Auto: Some' : 'Auto: Off');
        if (top.dataset.state !== all) { top.dataset.state = all; top.setAttribute('aria-pressed', String(all === 'all')); }

        // The heal buttons: while the paladin stands; the one he is healing lit
        const paladin = battle.units.find(u => u.kind === 'paladin');
        for (const button of root.querySelectorAll('.dg-heal')) {
            const ally = unitById(battle, Number(button.dataset.heal));
            button.disabled = !paladin.alive || !ally.alive || !!battle.result;
            button.classList.toggle('healing', !!(paladin.cast && paladin.cast.to === ally.id));
        }

        // Someone's turn: he is the one chosen, and the turn panel says so
        const turn = awaitingUnit(battle);
        if (turn && selected !== turn.kind) select(turn.kind);
        if (armed && !turn) arm(null);
        const panel = $('.dg-turn-panel');
        panel.hidden = !turn;
        if (turn) {
            const who = whose(turn.kind);
            setText(panel.querySelector('.dg-turn-who'), `${who} turn`);
            setText(panel.querySelector('.dg-turn-how'), turn.kind === 'paladin'
                ? 'Click a foe to attack it, an ally to heal him, a cell to move — or a spell'
                : 'Click a foe to attack it (or go toward it), a cell to move — or a spell');
            panel.querySelector('.dg-turn-wait').disabled = !!turn.waited;
        }

        // The chosen one's spells
        const chosen = battle.units.find(u => u.kind === selected);
        if (chosen && !chosen.alive && selected !== 'hunter' && !turn) select('hunter');
        updateBar($('.dg-bar-spells'), selected, battle, battle.units.find(u => u.kind === selected));
        for (const chip of root.querySelectorAll('[data-select]')) {
            const unit = battle.units.find(u => u.kind === chip.dataset.select);
            chip.disabled = !unit.alive;
            chip.classList.toggle('held', !!unit.hold);
        }

        // The foe pointed at
        const foe = hover && living(battle, 'foe').find(f => f.col === hover.col && f.row === hover.row);
        const card = $('.dg-foe');
        card.hidden = !foe;
        if (foe) {
            setText(card.querySelector('.dg-foe-name'), foe.name);
            const druid = battle.units.find(u => u.kind === 'druid' && u.alive);
            const target = unitById(battle, foe.targetId);
            setText(card.querySelector('.dg-foe-goes'), !target ? 'Coming in' : druid && target === druid ? `Held by ${NAMES.druid}'s taunt` : `Going for ${him(target.kind)}`);
            card.querySelector('.dg-foe-face').src = portrait(foe.kind);
            card.querySelector('.dg-foe-stats').innerHTML = [['Attack', foe.attack], ['Defense', foe.defense], ['Speed', `${foe.speed} cells`], ['Damage', `${foe.damage[0]}–${foe.damage[1]}`], ['Health', `${Math.round(foe.hp)} / ${foe.maxHp}`]]
                .map(([k, v]) => `<span>${k}</span><b>${v}</b>`).join('');
        }
    }


    function shortName(unit) {
        return unit.side === 'party' ? unit.name : unit.name.replace('Defias ', '').replace(' the Dread', '');
    }

    function showEnd(result) {
        const end = $('.dg-end');
        end.hidden = false;
        end.dataset.result = result;
        setText(end.querySelector('h2'), result === 'won' ? 'The Stockade is quiet' : 'You fell');
        setText(end.querySelector('p'), result === 'won'
            ? `Targorr the Dread is down and the riot is over, in ${Math.round(battle.time)} seconds. Loot from the dungeon comes in a later version.`
            : `The riot was too much this time: you reached wave ${battle.wave + 1} of ${battle.dungeon.waves.length}. Keep ${NAMES.druid} between you and them, and move away from what slips past.`);
        if (result === 'won') {
            const paladin = battle.units.find(u => u.kind === 'paladin' && u.alive);
            if (paladin) pose(paladin, 'victory', performance.now());
        }
    }

    // ---- The loop ----

    reset();
    function frame(now) {
        if (!document.body.contains(root)) return;
        const dt = Math.min(0.1, (now - lastTime) / 1000);
        lastTime = now;
        if (!paused) for (let i = 0; i < speed; i++) step(battle, dt);
        readEvents(now);
        updateMotion(paused ? 0 : dt);
        followFight(dt);
        druidForm(now);
        draw(now);
        updatePanels();
        requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
}

function loadImages(files) {
    return Promise.all(files.map(file => new Promise(resolve => {
        const image = new Image();
        image.onload = () => resolve([file, image]);
        image.onerror = () => resolve([file, null]);
        image.src = versioned(file);
    }))).then(pairs => new Map(pairs.filter(([, image]) => image)));
}

const HUD_HTML = `
<canvas class="dg-stage" aria-label="The dungeon: click or tap a cell to move your hunter there"></canvas>
<div class="dg-top">
    <div class="dg-where"><div class="dg-title"></div><div class="dg-wave"><span class="dg-wave-label"></span><span class="dg-waves"></span><span class="dg-boss-tag">then the boss</span></div></div>
    <div class="dg-next-box"><div class="dg-label">Next to act</div><div class="dg-next-list"></div></div>
    <div class="dg-top-buttons"><button type="button" class="dg-auto-button" aria-pressed="false" title="Every one of the three casts his spells as soon as they are ready (each can be set on his card)">Auto: Off</button><button type="button" class="dg-help-button" aria-label="How to command the party">?</button><button type="button" class="dg-pause-button">Pause</button></div>
</div>
<div class="dg-foe" hidden><div class="dg-foe-head"><img class="dg-foe-face" alt=""><div><div class="dg-foe-name"></div><div class="dg-foe-goes"></div></div></div><div class="dg-foe-stats dg-stats"></div></div>
<div class="dg-bottom">
    <div class="dg-party"></div>
    <div class="dg-spells"><div class="dg-turn-panel" hidden><b class="dg-turn-who"></b><span class="dg-turn-how"></span><button type="button" class="dg-turn-wait dg-btn quiet" title="Space">Wait</button><button type="button" class="dg-turn-defend dg-btn quiet" title="D">Defend</button></div><div class="dg-aim" hidden><span class="dg-aim-text"></span></div><div class="dg-who" role="group" aria-label="Who you give orders to"></div><div class="dg-bar-spells"></div></div>
    <div class="dg-you-box"><div class="dg-label">You, from your gear</div><div class="dg-you dg-stats"></div></div>
</div>
<div class="dg-pause" hidden><div class="dg-window"><h2>Paused</h2><p>The fight waits for you.</p><div class="dg-buttons"><button type="button" class="dg-resume dg-btn">Resume</button><button type="button" class="dg-leave dg-btn quiet">Leave the dungeon</button></div></div></div>
<div class="dg-end" hidden><div class="dg-window"><h2></h2><p></p><div class="dg-buttons"><button type="button" class="dg-again dg-btn">Run it again</button><button type="button" class="dg-leave dg-btn quiet">Back to the map</button></div></div></div>
<div class="dg-plan dg-overlay" hidden><div class="dg-window dg-wide" role="dialog" aria-label="Pumba's heal plan"><h2>How Pumba heals</h2><div class="dg-plan-body"></div><div class="dg-buttons"><button type="button" class="dg-plan-close dg-btn">Done</button></div></div></div>
<div class="dg-help dg-overlay" hidden><div class="dg-window dg-wide" role="dialog" aria-label="How to command the party"><h2>Commanding the party</h2>
<ul class="dg-guide">
<li><b>Choose who you command</b>: click him (or his card, or You / Druid / Paladin by the spells), or press Tab. The chosen one has the gold ring; the spell bar is his.</li>
<li><b>Move</b>: click or tap a cell, or the arrow keys. You walk there on your next turn; Smokva (the druid) and Pumba (the paladin) go at once and <b>hold</b> that cell until <b>Follow</b> (F).</li>
<li><b>Heal</b>: the <b>+</b> on any card has Pumba, the paladin, heal that one now. His Holy Light, Blessing of Protection and Lay on Hands ask whom: click a card or a fighter (press again: the one his plan would choose).</li>
<li><b>His plan</b> (Plan on his card): whom he heals first when he chooses himself — the lowest, or your order (Smokva first) — and who may have which spell (no Lay on Hands on the pet).</li>
<li><b>Auto</b> on a card (the pet's on its line): that one fights and casts by himself. Auto at the top: all four.</li>
<li><b>Off Auto, you play his turns.</b> When his bar fills the fight stops for your order, one a turn: click a foe to attack it (out of reach, he goes toward it), a cell to move, a spell (it is armed: then click its target — green rings show who it can go to, a red X who is out of reach; spells on himself are confirmed by clicking him), an ally to heal (the paladin), <b>Wait</b> (Space: his turn goes after everyone else's) or <b>Defend</b> (D: more defense until his next turn).</li>
<li><b>Your bow</b> reaches 7 cells, but a foe 2 cells away or closer is too near to shoot (the floor near you and beyond your reach is darker). Up close you fight with your knife: click a foe to attack it, from range or hand to hand.</li>
<li><b>Turns</b>: each fighter acts when his gold bar fills; Next to act shows the order. Foes in Smokva's green cells must fight him.</li>
</ul><div class="dg-buttons"><button type="button" class="dg-help-close dg-btn">Back to the fight</button></div></div></div>
<div class="dg-loading" hidden>Opening the Stockade…</div>
`;
