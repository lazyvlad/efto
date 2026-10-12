// Skipping ahead, on the main menu.
//
// A logged-in player may start a game in any zone whose earlier bosses they have defeated
// before, for a price in coins per zone skipped. The site says what is open and what it costs
// (INPUT_BOOT.skip: { costPerZone, unlocked: { alliance, horde } }) and takes the coins when
// the game opens. Guests, and players who have not beaten a boss yet, do not see the choice.

import { siteBoot } from './accountBar.js';
import { backgrounds } from '../data/backgrounds.js';
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

// The player defeated a boss: the site says how far they may now skip on that side
export function setUnlockedZone(faction, zone) {
    const rules = skip();
    if (rules && faction && zone) rules.unlocked[faction] = zone;
}
