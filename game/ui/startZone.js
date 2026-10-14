// Skipping ahead, on the main menu.
//
// A logged-in player may start a game in any zone whose earlier bosses they have defeated
// before, for a price in coins per zone skipped. The site says what is open and what it costs
// (INPUT_BOOT.skip: { costPerZone, unlocked: { alliance, horde } }) and takes the coins when
// the game opens. Guests, and players who have not beaten a boss yet, do not see the choice.

import { siteBoot } from './accountBar.js';
import { backgrounds } from '../data/backgrounds.js';
import { bossForZone } from '../data/bosses.js';
import { formatCoins } from '../utils/coins.js';

function skip() {
    return siteBoot && siteBoot.user && siteBoot.skip ? siteBoot.skip : null;
}

// The furthest zone the player may start in on this side
export function unlockedZone(faction) {
    const rules = skip();
    return rules && faction ? Math.max(1, rules.unlocked[faction] || 1) : 1;
}

// What starting in this zone costs, in copper
export function skipCost(zone) {
    const rules = skip();
    return rules ? Math.max(0, zone - 1) * rules.costPerZone : 0;
}

function canAfford(zone) {
    return skipCost(zone) <= (siteBoot.user.coins || 0);
}

// Fill the choice of starting zone for the side that is picked
export function renderStartZonePicker(faction) {
    const picker = document.getElementById('startZonePicker');
    const select = document.getElementById('startZone');
    if (!picker || !select) return;

    const furthest = unlockedZone(faction);
    picker.hidden = furthest < 2;
    select.textContent = '';
    if (furthest < 2) return;

    const zones = backgrounds[faction] || [];
    for (let zone = 1; zone <= furthest; zone++) {
        const option = document.createElement('option');
        const name = zones[zone - 1] ? zones[zone - 1].name : `Zone ${zone}`;
        option.value = String(zone);
        option.textContent = zone === 1 ? `${name} (the start)` : `${name} - ${formatCoins(skipCost(zone))}`;
        option.disabled = !canAfford(zone);
        select.append(option);
    }
    select.value = '1';
}

// The zone chosen to start in: the first, unless a later one is open and can be paid for
export function getStartZone(faction) {
    const select = document.getElementById('startZone');
    const zone = select ? parseInt(select.value, 10) || 1 : 1;

    return zone > 1 && zone <= unlockedZone(faction) && canAfford(zone) ? zone : 1;
}

// ----- Boss Rush -----
// A game of nothing but the bosses, for logged-in players, who pay coins to enter
// (INPUT_BOOT.rush: { fee }). It always starts with the first boss.

function rushFee() {
    return siteBoot && siteBoot.user && siteBoot.rush ? siteBoot.rush.fee : null;
}

// ----- Boss fight -----
// The boss of the chosen zone and nothing else: no zone to play through first. Only a boss
// the logged-in player has beaten before (INPUT_BOOT.user.bosses), and paid for as starting
// in its zone is. It is for going back to a boss, not a way past the zones.

// Whether the player has beaten the boss of this zone before
export function hasBeaten(faction, zone) {
    const boss = faction ? bossForZone(faction, zone) : null;
    const beaten = siteBoot && siteBoot.user && siteBoot.user.bosses;

    return Boolean(boss && beaten && beaten.includes(boss.id));
}

// The player beat a boss: it may be fought on its own from now on
export function rememberBeaten(bossId) {
    if (siteBoot && siteBoot.user && siteBoot.user.bosses && !siteBoot.user.bosses.includes(bossId)) {
        siteBoot.user.bosses.push(bossId);
    }
}

// The side and zone the choice of mode was last filled for
let pickedFor = { faction: null, zone: 1 };

// Fill the choice between a normal game, one boss fight and Boss Rush, for the place picked:
// kept in the select, and shown as a button with a picture for each
export function renderGameModePicker(faction = pickedFor.faction, zone = pickedFor.zone) {
    const picker = document.getElementById('gameModePicker');
    const select = document.getElementById('gameMode');
    if (!picker || !select) return;

    pickedFor = { faction, zone };

    const chosen = select.value;
    const fee = rushFee();
    // Guests have nothing but the normal game to choose
    picker.hidden = !(siteBoot && siteBoot.user);
    select.textContent = '';
    if (picker.hidden) return;

    const normal = document.createElement('option');
    normal.value = 'normal';
    normal.textContent = 'Normal game';
    const fight = document.createElement('option');
    fight.value = 'boss_fight';
    fight.disabled = !hasBeaten(faction, zone);
    fight.textContent = fight.disabled
        ? 'Boss fight: beat this zone\'s boss in a game first'
        : 'Boss fight: only this zone\'s boss';
    select.append(normal, fight);

    if (fee !== null) {
        const rush = document.createElement('option');
        rush.value = 'boss_rush';
        rush.textContent = `Boss Rush: every boss in turn - ${formatCoins(fee)}`;
        rush.disabled = fee > (siteBoot.user.coins || 0);
        select.append(rush);
    }

    // Kept when the list is filled again (another place picked on the map)
    select.value = [...select.options].some(option => option.value === chosen && !option.disabled) ? chosen : 'normal';
    renderModeButtons(faction, zone, select);
}

// The modes as buttons: the place for a normal game, its boss for a fight, a fan of the side's
// bosses for Boss Rush. Pressing one chooses it in the select, as if picked there.
function renderModeButtons(faction, zone, select) {
    const box = document.getElementById('gameModeChoices');
    if (!box) return;

    const place = faction && backgrounds[faction] ? backgrounds[faction][zone - 1] || backgrounds[faction][0] : null;
    const boss = faction ? bossForZone(faction, zone) : null;
    const rushBosses = faction ? [1, 5, 10].map(at => bossForZone(faction, at)).filter(Boolean) : [];
    const fee = rushFee();
    const about = {
        normal: { title: 'Normal game', line: place ? `From ${place.name.split(',')[0]}` : 'Through the zones', pictures: place ? [place.image] : [] },
        boss_fight: {
            title: 'Boss fight',
            line: !boss ? 'Pick a place first' : hasBeaten(faction, zone) ? `Only ${boss.name}` : `Beat ${boss.name} first`,
            pictures: boss ? [boss.image] : [],
        },
        boss_rush: { title: 'Boss Rush', line: fee !== null && fee > (siteBoot.user.coins || 0) ? 'Not enough coins' : 'Every boss in turn', price: fee !== null ? formatCoins(fee) : '', pictures: rushBosses.map(each => each.image) },
    };

    box.textContent = '';
    for (const option of select.options) {
        const mode = about[option.value];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `game-mode is-${option.value.replace('_', '-')}`;
        button.setAttribute('role', 'radio');
        button.setAttribute('aria-checked', String(select.value === option.value));
        button.disabled = option.disabled;
        // The whole of what the select said, for a pointer resting on it and for those who hear the page
        button.title = option.textContent;
        button.setAttribute('aria-label', option.textContent);

        const picture = document.createElement('span');
        picture.className = 'game-mode-picture';
        for (const src of mode.pictures) {
            const image = document.createElement('img');
            image.src = src;
            image.alt = '';
            image.loading = 'lazy';
            picture.append(image);
        }
        if (mode.price) {
            const price = document.createElement('span');
            price.className = 'game-mode-price';
            price.textContent = mode.price;
            picture.append(price);
        }
        const title = document.createElement('strong');
        title.textContent = mode.title;
        const line = document.createElement('small');
        line.textContent = mode.line;
        button.append(picture, title, line);

        button.addEventListener('click', () => {
            if (select.value === option.value) return;
            select.value = option.value;
            select.dispatchEvent(new Event('change'));
            for (const other of box.children) other.setAttribute('aria-checked', String(other === button));
        });
        box.append(button);
    }
}

// The mode chosen: Boss Rush only if it can be paid for
export function getGameMode() {
    const select = document.getElementById('gameMode');
    const fee = rushFee();

    if (select && select.value === 'boss_fight' && hasBeaten(pickedFor.faction, pickedFor.zone)) return 'boss_fight';

    return select && select.value === 'boss_rush' && fee !== null && fee <= (siteBoot.user.coins || 0) ? 'boss_rush' : 'normal';
}

export function gameModeCost(mode) {
    return mode === 'boss_rush' ? rushFee() || 0 : 0;
}

// The player defeated a boss: the site says how far they may now skip on that side
export function setUnlockedZone(faction, zone) {
    const rules = skip();
    if (rules && faction && zone) rules.unlocked[faction] = zone;
}
