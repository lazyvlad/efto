// The dungeon's spell bar: the selected fighter's spells (the hunter's, the druid's or the
// paladin's), with the three of them to choose between at its left. Each one's first button is
// what he does by himself (AUTO): the hunter's Auto Shot, the druid's taunt, the paladin's Holy
// Light. The druid's and paladin's spells are on the keys of Dragon Cry, Zandalari and Auto Shot
// (unused in the dungeon), so they follow the player's own key layout.

import { multiShot, arcaneShot, drinkPotion, switchPet, revivePet, castSpell, follow, spellReady } from './battle.js';
import { SPELLS, COMPANION_SPELLS } from './stockade.js';
import { SPELL_ICONS, versioned } from './actors.js';
import { keyName } from '../utils/keybindings.js';

// Line drawings for what has no painted icon (Follow)
const GLYPHS = {
    claw: '<path d="M6 4c1 6 3 11 7 16M11 3c1 6 3 10 7 14M16 3c1 4 2 7 5 10"/>',
    dash: '<path d="M3 12h11M3 7h7M3 17h7M14 6l7 6-7 6"/>',
    bite: '<path d="M4 9c3-4 13-4 16 0M4 15c3 4 13 4 16 0"/><path d="M7 9l1 3 1-3M11 9l1 3 1-3M15 9l1 3 1-3M8 15l1-3 1 3M14 15l1-3 1 3"/>',
    plan: '<path d="M8 6h12M8 12h12M8 18h12"/><path d="M3 6l1 1 2-2M3 12l1 1 2-2M3 18l1 1 2-2"/>',
    follow: '<path d="M7 17l-4-4 4-4"/><path d="M3 13h11a6 6 0 0 0 0-12"/>',
};

const picture = file => `<img alt="" src="${versioned(file)}">`;
const petAlive = battle => battle.units.some(u => u.kind === 'pet' && u.alive);
const painted = id => picture(`assets/dungeon/spells/icons/${SPELL_ICONS[id]}.webp`);
const glyph = (name, tone) => `<span class="dg-glyph ${tone}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPHS[name]}</svg></span>`;

const companion = (kind, id, slotKey) => ({
    id, key: slotKey, icon: SPELL_ICONS[id] ? painted(id) : glyph(id, 'plain'), name: COMPANION_SPELLS[kind][id].name,
    cast: battle => castSpell(battle, kind, id),
    cooldown: battle => [battle.spellCooldowns[kind][id] || 0, COMPANION_SPELLS[kind][id].cooldown],
    ready: battle => spellReady(battle, kind, id),
});

export const BARS = {
    mage: [
        // Fireball: what clicking a foe in his reach does, and a spell of its own (no cooldown)
        { ...companion('mage', 'fireball', 'autoshot'), auto: false },
        companion('mage', 'frostbolt', 'multishot'),
        companion('mage', 'arcaneMissiles', 'arcane_shot'),
        companion('mage', 'frostNova', 'dragon_cry'),
        companion('mage', 'blink', 'zandalari'),
        companion('mage', 'iceBarrier', 'potion'),
    ],
    pet: [
        { id: 'bite', auto: true, icon: glyph('bite', 'plain'), name: 'Bite', title: 'It bites what it fights (click a foe on its turn)' },
        companion('pet', 'claw', 'dragon_cry'),
        companion('pet', 'dash', 'zandalari'),
        { divider: true },
        {
            id: 'stance', key: 'pet_stance', icon: picture('assets/dungeon/nightsaber/icon.webp'), stanceOnly: true,
            name: b => (b.petStance === 'aggressive' ? 'Aggressive' : 'Defensive'), cast: switchPet, title: 'How it fights on Auto',
        },
    ],
    hunter: [
        { id: 'auto', auto: true, icon: picture('assets/spells/autoshot.webp'), name: 'Auto Shot', title: 'Auto Shot fires by itself at Smokva\'s target' },
        { id: 'multi', key: 'multishot', icon: picture('assets/spells/multishot.webp'), name: 'Multi-Shot', cast: multiShot, cooldown: b => [b.cooldowns.multiShot, SPELLS.multiShot.cooldown] },
        { id: 'arcane', key: 'arcane_shot', icon: picture('assets/spells/arcane_shot.webp'), name: 'Arcane Shot', cast: arcaneShot, cooldown: b => [b.cooldowns.arcaneShot, SPELLS.arcaneShot.cooldown] },
        // Revive Pet, while it lies dead (its mode is on its own bar)
        {
            id: 'revive', key: 'pet_stance', icon: picture('assets/dungeon/nightsaber/icon.webp'), pet: true,
            name: 'Revive Pet', cast: b => revivePet(b), empty: b => petAlive(b),
            // While he revives it: the cast; after: Revive Pet's cooldown
            cooldown: b => {
                const h = b.units.find(u => u.kind === 'hunter');
                if (h.cast && h.cast.kind === 'revive') return [h.cast.duration - h.cast.time, h.cast.duration];
                return [b.cooldowns.revivePet, SPELLS.revivePet.cooldown];
            },
        },
        { divider: true },
        { id: 'potion', key: 'potion', small: true, icon: picture('assets/powerups/health-potion.webp'), name: b => `Health ×${b.potions}`, cast: drinkPotion, cooldown: b => [b.cooldowns.potion, SPELLS.potion.cooldown], empty: b => b.potions <= 0 },
    ],
    druid: [
        { id: 'taunt', auto: true, icon: painted('taunt'), name: 'Taunt', title: 'Foes in the green cells around him must fight him' },
        companion('druid', 'growl', 'dragon_cry'),
        companion('druid', 'swipe', 'zandalari'),
        companion('druid', 'barkskin', 'autoshot'),
        { divider: true, held: true },
        { id: 'follow', held: true, small: true, icon: glyph('follow', 'plain'), name: 'Follow', title: 'Back to holding the line', cast: b => follow(b, 'druid') },
    ],
    paladin: [
        // He heals by himself (AUTO); pressed, it asks whom to heal (as his blessings do)
        { id: 'holyLight', auto: true, aim: 'holyLight', key: 'set_1', icon: painted('holyLight'), name: 'Holy Light', title: 'Heal whom you choose (he also heals by himself)' },
        companion('paladin', 'hammer', 'dragon_cry'),
        { ...companion('paladin', 'protection', 'zandalari'), aim: 'protection' },
        { ...companion('paladin', 'layOnHands', 'autoshot'), aim: 'layOnHands' },
        { divider: true },
        // Whom he heals, and who may have which spell, when he chooses himself
        { id: 'plan', open: 'plan', small: true, icon: glyph('plan', 'holy'), name: 'Heal plan', title: 'Whom Pumba heals first, and who may have which spell' },
        { divider: true, held: true },
        { id: 'follow', held: true, small: true, icon: glyph('follow', 'plain'), name: 'Follow', title: 'Back behind Smokva', cast: b => follow(b, 'paladin') },
    ],
};

// Fill the bar with one fighter's buttons; "onCast" runs a button's spell
export function renderBar(element, kind, onCast) {
    element.replaceChildren();
    BARS[kind].forEach((entry, index) => {
        if (entry.divider) {
            const line = document.createElement('span');
            line.className = 'dg-divider';
            if (entry.held) line.dataset.held = '';
            element.appendChild(line);
            return;
        }
        const pressable = !entry.auto || entry.aim;
        const button = document.createElement(pressable ? 'button' : 'div');
        if (pressable) button.type = 'button';
        if (entry.aim) button.dataset.aim = entry.aim;
        button.className = 'dg-spell' + (entry.auto ? ' dg-spell-auto' : '') + (entry.pet ? ' dg-spell-pet' : '');
        button.dataset.index = index;
        button.dataset.entry = entry.id;
        if (entry.held) button.dataset.held = '';
        if (entry.title) button.title = entry.title;
        const key = entry.key ? keyName(entry.key) : '';
        button.innerHTML = `<div class="dg-icon${entry.small ? ' small' : ''}">${entry.icon}`
            + (entry.cooldown ? '<i class="dg-cd"></i><span class="dg-cd-text"></span>' : '')
            + (entry.auto ? '<span class="dg-auto">AUTO</span>' : '')
            + (key ? `<kbd>${key}</kbd>` : '')
            + `</div><span class="dg-name"></span>`;
        if (pressable) button.onclick = () => onCast(entry);
        element.appendChild(button);
    });
}

// Cooldowns, names that change, and whether each can be pressed now
export function updateBar(element, kind, battle, unit) {
    const held = !!(unit && unit.hold);
    for (const child of element.children) {
        if (child.dataset.held !== undefined) child.hidden = !held;
        const entry = BARS[kind][child.dataset.index];
        if (!entry) continue;
        const name = typeof entry.name === 'function' ? entry.name(battle) : entry.name;
        const label = child.querySelector('.dg-name');
        if (label.textContent !== name) label.textContent = name;
        if (entry.pet) child.dataset.stance = petAlive(battle) ? battle.petStance : 'dead';
        // In his auto mode everything is cast for him: every button wears the AUTO light
        child.classList.toggle('auto-on', !!battle.auto[kind] && !entry.auto && !entry.held);
        if (entry.cooldown) {
            // The pet's button: its cooldown shows only while there is a pet to revive
            const [left, total] = entry.pet && petAlive(battle) && !battle.units.find(u => u.kind === 'hunter').cast ? [0, 1] : entry.cooldown(battle);
            child.querySelector('.dg-cd').style.height = left > 0 ? Math.round(Math.min(1, left / total) * 100) + '%' : '0%';
            const text = left > 0 ? String(Math.ceil(left)) : '';
            const shown = child.querySelector('.dg-cd-text');
            if (shown.textContent !== text) shown.textContent = text;
        }
        if (entry.open) continue;
        if (!entry.auto || entry.aim) {
            // Played by the player: only on his turn (the pet's mode may change any time)
            const offTurn = !!unit && !battle.auto[unit.kind] && battle.awaiting !== unit.id && !entry.stanceOnly && entry.key !== 'pet_stance';
            const dead = !unit || !unit.alive || offTurn;
            child.disabled = dead || (entry.empty ? entry.empty(battle) : false);
            // A companion's spell that would do nothing now is shown dim, not shut
            child.classList.toggle('idle', !entry.aim && !!entry.ready && !entry.ready(battle) && !(entry.cooldown(battle)[0] > 0));
        }
    }
}

// The entry a key casts for the selected fighter (the hunter's own keys work whoever is chosen)
export function entryForAction(kind, action) {
    // The mage's keys are the hunter's: his own bar comes first when he is chosen
    if (kind === 'mage') {
        const entry = BARS.mage.find(e => e.key === action);
        if (entry) return { entry, kind };
    }
    const own = BARS.hunter.find(e => e.key === action);
    if (own && !['dragon_cry', 'zandalari', 'autoshot'].includes(action)) return { entry: own, kind: 'hunter' };
    if (kind === 'hunter') return null;
    const entry = BARS[kind].find(e => e.key === action);
    return entry ? { entry, kind } : null;
}
