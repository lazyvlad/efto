// The world map: the game's starting window.
//
// Every zone of both sides has a pin on the painted map (data/worldMap.js). A pin can be
// looked at whatever its state; a game can be started at it when the player may start there.
// The first zone of each side is open to everyone. A later zone follows the rules of skipping
// ahead (ui/startZone.js): an activated account, the earlier bosses of that side beaten
// before, and the coins it costs, which are taken when the game starts.
//
// The map only shows and reports what is picked; the game sets the side and the starting zone
// from it and starts the game (game-modular.js).

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
 * Draw the map and the place that is picked. Called every time the starting window comes up,
 * so what is open follows the player's coins and the bosses they have beaten since.
 * @param {object}   options
 * @param {string}   options.faction   The side last played, if any: its first zone is picked
 * @param {Function} options.onSelect  Called with the place picked, now and on every pick:
 *                                     { faction, zone, open, name }
 */
export function showTravelMap({ faction, onSelect }) {
    const atlasRoot = document.getElementById('startAtlas');
    const cardRoot = document.getElementById('startPlace');
    if (!atlasRoot || !cardRoot) return;

    const all = places.map(describe);
    const first = all.find(place => place.faction === (faction || 'alliance') && place.zone === 1) || all[0];

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
    atlasRoot.replaceChildren(atlas);

    // The place that is picked
    const cardPicture = element('img', 'travel-card-picture');
    cardPicture.alt = '';
    const side = element('div', 'travel-card-side');
    const name = element('h3', 'travel-card-name');
    const description = element('p', 'travel-card-description');
    const guard = element('p', 'travel-card-guard');
    const why = element('p', 'travel-card-why');
    cardRoot.replaceChildren(cardPicture, side, name, description, guard, why);

    function select(place) {
        pins.forEach((pin, of) => pin.classList.toggle('travel-selected', of === place));

        cardPicture.src = place.image;
        side.textContent = place.zone ? `${place.side} · zone ${place.zone}` : place.side;
        name.textContent = place.name;
        description.textContent = place.description;
        guard.textContent = place.boss ? `Guarded by ${place.boss.name}` : '';
        guard.hidden = !place.boss;
        why.textContent = place.why;
        why.classList.toggle('travel-why-locked', !place.open);

        // On a narrow screen the map scrolls sideways: bring the place picked into view
        const pin = pins.get(place);
        requestAnimationFrame(() => {
            if (atlasRoot.scrollWidth > atlasRoot.clientWidth) {
                atlasRoot.scrollLeft = pin.offsetLeft - atlasRoot.clientWidth / 2;
            }
        });

        onSelect({ faction: place.faction, zone: place.zone, open: place.open, name: place.name });
    }

    select(first);
}
