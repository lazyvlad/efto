// The world map on the main menu: choosing where a game starts.
//
// Every zone of both sides has a pin on the painted map (data/worldMap.js). A pin can be
// looked at whatever its state; it can be chosen when the player may start there. The first
// zone of each side is open to everyone. A later zone follows the rules of skipping ahead
// (ui/startZone.js): an activated account, the earlier bosses of that side beaten before, and
// the coins it costs. Choosing a place sets the side and the starting zone and starts the
// game there and then, which is when the coins are taken.

import { siteBoot } from './accountBar.js';
import { unlockedZone, skipCost } from './startZone.js';
import { places, WORLD_MAP_PICTURE } from '../data/worldMap.js';
import { backgrounds, FACTIONS } from '../data/backgrounds.js';
import { bossForZone } from '../data/bosses.js';
import { formatCoins } from '../utils/coins.js';

function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

// A place as the map shows it: its name and picture, who guards it, and whether the player
// may start there (and if not, why not)
function describe(place) {
    if (!place.faction) {
        return { ...place, side: 'Dungeon', open: false, cost: 0, why: 'Not in the game yet' };
    }

    const zone = backgrounds[place.faction][place.zone - 1];
    const boss = bossForZone(place.faction, place.zone);
    const cost = skipCost(place.zone);
    const known = { ...place, name: zone.name, image: zone.image, side: FACTIONS[place.faction].name, boss, cost };

    if (place.zone === 1) return { ...known, open: true, cost: 0, why: 'Where the ' + known.side + ' starts' };
    if (!siteBoot || !siteBoot.user) return { ...known, open: false, why: 'Log in to start past the first zone' };
    if (siteBoot.user.verified === false) return { ...known, open: false, why: 'Activate your account to start past the first zone' };

    const furthest = unlockedZone(place.faction);
    if (place.zone > furthest) {
        const standing = bossForZone(place.faction, furthest);
        return { ...known, open: false, why: `Defeat ${standing.name} first, the boss of zone ${furthest}` };
    }

    const purse = siteBoot.user.coins || 0;
    if (known.cost > purse) {
        return { ...known, open: false, why: `Costs ${formatCoins(known.cost)}: you have ${formatCoins(purse)}` };
    }
    return { ...known, open: true, why: `Costs ${formatCoins(known.cost)}` };
}

/**
 * Open the map.
 * @param {object}   options
 * @param {string}   options.faction   The side chosen on the menu, if any
 * @param {number}   options.zone      The starting zone chosen on the menu
 * @param {Function} options.onChoose  Called with { faction, zone } when a place is chosen
 */
export function openTravelMap({ faction, zone, onChoose }) {
    const root = document.getElementById('travelMap');
    if (!root) return;

    const all = places.map(describe);
    let selected = all.find(place => place.faction === faction && place.zone === (zone || 1)) || all[0];

    root.textContent = '';
    root.hidden = false;

    const close = () => {
        root.hidden = true;
        root.textContent = '';
        document.removeEventListener('keydown', onKey, true);
    };
    // Esc closes the map and nothing else
    const onKey = event => {
        if (event.key !== 'Escape') return;
        event.stopPropagation();
        event.preventDefault();
        close();
    };
    document.addEventListener('keydown', onKey, true);

    const header = element('div', 'travel-map-header');
    const closeButton = element('button', 'travel-map-close', 'Back');
    closeButton.type = 'button';
    closeButton.addEventListener('click', close);
    header.append(element('h2', '', 'World Map'), closeButton);

    // The painted map and its pins
    const atlas = element('div', 'travel-atlas');
    const picture = element('img', 'travel-atlas-art');
    picture.src = WORLD_MAP_PICTURE;
    picture.alt = 'Map of Kalimdor and the Eastern Kingdoms';
    atlas.append(picture, element('span', 'travel-continent travel-kalimdor', 'Kalimdor'), element('span', 'travel-continent travel-eastern', 'Eastern Kingdoms'));

    const pins = new Map();
    for (const place of all) {
        const pin = element('button', `travel-pin travel-${place.faction || 'dungeon'}${place.open ? '' : ' travel-locked'}`, place.zone ? String(place.zone) : '?');
        pin.type = 'button';
        pin.style.left = `${place.x}%`;
        pin.style.top = `${place.y}%`;
        pin.title = place.open ? place.name : `${place.name} - ${place.why}`;
        pin.setAttribute('aria-label', pin.title);
        pin.addEventListener('click', () => select(place));
        atlas.append(pin);
        pins.set(place, pin);
    }
    const scroll = element('div', 'travel-atlas-scroll');
    scroll.append(atlas);

    // The place that is selected
    const card = element('div', 'travel-card');
    const cardPicture = element('img', 'travel-card-picture');
    cardPicture.alt = '';
    const side = element('div', 'travel-card-side');
    const name = element('h3', 'travel-card-name');
    const description = element('p', 'travel-card-description');
    const guard = element('p', 'travel-card-guard');
    const why = element('p', 'travel-card-why');
    const choose = element('button', 'pause-btn continue-btn travel-choose', 'Start here');
    choose.type = 'button';
    choose.addEventListener('click', () => {
        if (!selected.open) return;
        onChoose({ faction: selected.faction, zone: selected.zone });
        close();
    });
    card.append(cardPicture, side, name, description, guard, why, choose);

    const layout = element('div', 'travel-layout');
    layout.append(scroll, card);
    const legend = element('p', 'travel-legend', 'Blue pins are the Alliance\'s zones, red the Horde\'s; the number is the zone. A faded pin cannot be started in yet: select it to see why.');
    root.append(header, layout, legend);

    function select(place) {
        selected = place;
        pins.forEach((pin, of) => pin.classList.toggle('travel-selected', of === place));

        cardPicture.src = place.image;
        side.textContent = place.zone ? `${place.side} \u00b7 zone ${place.zone}` : place.side;
        name.textContent = place.name;
        description.textContent = place.description;
        guard.textContent = place.boss ? `Guarded by ${place.boss.name}` : '';
        guard.hidden = !place.boss;
        why.textContent = place.why;
        why.classList.toggle('travel-why-locked', !place.open);
        choose.disabled = !place.open;
    }

    select(selected);
    closeButton.focus();
}
