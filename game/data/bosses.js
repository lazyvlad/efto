// The bosses: one for every zone of each side.
//
// A zone is a stretch of levels played on one background (data/backgrounds.js lists the zones
// in the same order). Its boss stands at the end of it: when the player has the experience
// for the first level of the next zone, the boss comes in, and the game does not move on to
// that level, or to the next background, until the boss is defeated.
//
// In a fight a boss throws only its own attack. Arrows bring it down. From time to time it
// shields itself; while shielded only an Arcane Shot hurts it, and that also breaks the shield.
// The longer the fight lasts the weaker the boss gets, up to a limit, but after its time is
// up it enrages: it throws faster and hits harder, more so every second, until someone loses.
//
// The attacks of all the bosses, of both sides, also fall as ordinary hazards all through the
// game, any of them at any point, whether or not the boss itself has been met.
//
// Bosses do not all fight alike. Each has a "behaviour", which is the round of attacks it
// works through (see "behaviours" below, and systems/bossSystem.js for what each attack does):
//   thrower  - throws at the player, and now and then a whole row with one gap to stand in
//   assassin - throws fans of blades, and vanishes to come back somewhere else
//   charger  - marks a lane down the field and rushes along it
//   caster   - sends bolts that follow the player, and a curse that eats at their health
//   bomber   - lobs things that land near the player and burst a moment later
//   pounder  - stomps: the ground hurts everywhere but one safe patch
//   warlord  - a fan of axes, a rush down the field, a throw and a row, one after the other
//
// Every boss keeps on the move along the top of the field and sidesteps arrows it sees coming,
// the later bosses more sharply. It cannot sidestep while it winds up an attack.
//
// How strong a boss is comes from its zone and the "bosses" settings in config/gameConfig.js
// (see bossStats below), so the first bosses are easy and each one after is harder. An entry
// here only says who the boss is and what it throws:
//   image   - its picture, in assets/bosses/<side>/
//   attack  - name and picture (assets/attacks/<side>/) of what it throws; "size" is how big
//             it is (1 = the standard projectile); "spin" makes a thrown weapon tumble (turn
//             per step) - leave it out for bolts and slashes, which keep pointing down

const roster = {
    alliance: [
        { id: 'garrick-padfoot', behaviour: 'thrower', name: 'Garrick Padfoot', image: '01-garrick-padfoot', attack: { name: 'Throwing Dagger', image: '01-garrick-dagger', size: 1.2, spin: 0.22 } },
        { id: 'hogger', behaviour: 'thrower', name: 'Hogger', image: '02-hogger', attack: { name: 'Thrown Axe', image: '02-hogger-axe', size: 1.5, spin: 0.12 } },
        { id: 'bazil-thredd', behaviour: 'assassin', name: 'Bazil Thredd', image: '03-bazil-thredd', attack: { name: 'Prison Shiv', image: '03-bazil-shiv', size: 1.2, spin: 0.22 } },
        { id: 'edwin-vancleef', behaviour: 'assassin', name: 'Edwin VanCleef', image: '04-edwin-vancleef', attack: { name: 'Defias Throwing Knife', image: '04-vancleef-knife', size: 1.2, spin: 0.22 } },
        { id: 'gath-ilzogg', behaviour: 'warlord', name: "Gath'Ilzogg", image: '05-gath-ilzogg', attack: { name: 'Blackrock War Axe', image: '05-gath-war-axe', size: 1.6, spin: 0.12 } },
        { id: 'stitches', behaviour: 'thrower', name: 'Stitches', image: '06-stitches', attack: { name: 'Thrown Cleaver', image: '06-stitches-cleaver', size: 1.6, spin: 0.12 } },
        { id: 'chieftain-nekrosh', behaviour: 'thrower', name: "Chieftain Nek'rosh", image: '07-chieftain-nekrosh', attack: { name: 'Spiked Mace', image: '07-nekrosh-mace', size: 1.6, spin: 0.1 } },
        { id: 'fozruk', behaviour: 'bomber', name: 'Fozruk', image: '08-fozruk', attack: { name: 'Thrown Boulder', image: '08-fozruk-boulder', size: 1.9, spin: 0.05 } },
        { id: 'king-bangalash', behaviour: 'charger', name: 'King Bangalash', image: '09-king-bangalash', attack: { name: 'Tiger Claw Slash', image: '09-bangalash-claws', size: 2.2 } },
        { id: 'vile-priestess-hexx', behaviour: 'caster', name: 'Vile Priestess Hexx', image: '10-vile-priestess-hexx', attack: { name: 'Violet Curse Bolt', image: '10-hexx-curse', size: 1.4 } }
    ],
    horde: [
        { id: 'sarkoth', behaviour: 'caster', name: 'Sarkoth', image: '01-sarkoth', attack: { name: 'Venom Sting', image: '01-sarkoth-venom', size: 1.3 } },
        { id: 'zalazane', behaviour: 'caster', name: 'Zalazane', image: '02-zalazane', attack: { name: 'Voodoo Spirit Bolt', image: '02-zalazane-voodoo', size: 1.4 } },
        { id: 'taragaman', behaviour: 'caster', name: 'Taragaman the Hungerer', image: '03-taragaman', attack: { name: 'Demon Flame Bolt', image: '03-taragaman-flame', size: 1.4 } },
        { id: 'echeyakee', behaviour: 'charger', name: 'Echeyakee', image: '04-echeyakee', attack: { name: 'Lion Claw Rake', image: '04-echeyakee-claws', size: 2.2 } },
        { id: 'gerenzo-wrenchwhistle', behaviour: 'bomber', name: 'Gerenzo Wrenchwhistle', image: '05-gerenzo-wrenchwhistle', attack: { name: 'Clockwork Bomb', image: '05-gerenzo-bomb', size: 1.5, spin: 0.06 } },
        { id: 'shadumbra', behaviour: 'charger', name: 'Shadumbra', image: '06-shadumbra', attack: { name: 'Shadow Claw Slash', image: '06-shadumbra-claws', size: 2.2 } },
        { id: 'arnak-grimtotem', behaviour: 'pounder', name: 'Arnak Grimtotem', image: '07-arnak-grimtotem', attack: { name: 'War Stomp Shockwave', image: '07-arnak-shockwave', size: 2.4 } },
        { id: 'big-samras', behaviour: 'charger', name: 'Big Samras', image: '08-big-samras', attack: { name: 'Heavy Bear Swipe', image: '08-samras-swipe', size: 2.2 } },
        { id: 'khan-dezhepah', behaviour: 'pounder', name: "Khan Dez'hepah", image: '09-khan-dezhepah', attack: { name: 'Thrown Centaur Spear', image: '09-khan-spear', size: 1.5 } },
        { id: 'chief-ukorz-sandscalp', behaviour: 'pounder', name: 'Chief Ukorz Sandscalp', image: '10-chief-ukorz-sandscalp', attack: { name: 'Sand Cleave', image: '10-ukorz-sand-cleave', size: 2.2 } }
    ]
};

// The round of attacks each behaviour works through, over and over
export const behaviours = {
    thrower: ['throw', 'throw', 'throw', 'row'],
    assassin: ['fan', 'fan', 'vanish'],
    charger: ['throw', 'charge', 'throw', 'charge'],
    caster: ['bolt', 'bolt', 'curse'],
    bomber: ['bomb', 'throw', 'bomb', 'row'],
    pounder: ['throw', 'stomp', 'throw', 'stomp'],
    warlord: ['fan', 'charge', 'throw', 'row']
};

// Every boss, with its side, its zone (1 is the first) and the full paths of its pictures
export const bosses = Object.entries(roster).flatMap(([faction, list]) => list.map((boss, index) => ({
    ...boss,
    faction,
    zone: index + 1,
    image: `assets/bosses/${faction}/${boss.image}.webp`,
    attack: {
        ...boss.attack,
        id: `${boss.id}-attack`,
        image: `assets/attacks/${faction}/${boss.attack.image}.webp`,
        sound: 'assets/audio/sfx/fireballimpact.mp3'
    }
})));

export const ZONES_PER_SIDE = roster.alliance.length;

// The zone a level is played in (levels as the player sees them: the first is 1). After the
// last zone the zones come round again, as the backgrounds do.
export function zoneForLevel(level, levelsPerZone) {
    return Math.floor((Math.max(1, level) - 1) / levelsPerZone) % ZONES_PER_SIDE + 1;
}

export function bossForZone(faction, zone) {
    return bosses.find(boss => boss.faction === faction && boss.zone === zone) || null;
}

/**
 * The highest level a player can be at for now: the last level of the first zone whose boss
 * still stands. No limit once every boss of the side is defeated.
 * @param {string[]} defeated  Ids of the bosses defeated (or passed over) in this game
 */
export function levelCap(faction, defeated, levelsPerZone) {
    const standing = bosses.find(boss => boss.faction === faction && !defeated.includes(boss.id));
    return standing ? standing.zone * levelsPerZone : Infinity;
}

/**
 * How strong a boss is. Everything grows with the zone, within the limits in the rules.
 * @param {object} rules  The "bosses" settings in config/gameConfig.js
 */
export function bossStats(boss, rules) {
    const steps = boss.zone - 1;

    return {
        health: rules.health.base + rules.health.perZone * steps,
        damage: rules.damage.base + rules.damage.perZone * steps,
        // Steps between single throws, and between rows with one gap (60 steps = 1 second)
        throwEvery: Math.max(rules.throwEvery.fastest, rules.throwEvery.base - rules.throwEvery.perZone * steps),
        volleyEvery: Math.max(rules.volleyEvery.fastest, rules.volleyEvery.base - rules.volleyEvery.perZone * steps),
        // Seconds into the fight of the first shield, and between one shield being broken and
        // the next. The first bosses have none.
        shieldAfter: boss.zone >= rules.shield.fromZone ? rules.shield.firstAfter : null,
        shieldEvery: Math.max(rules.shield.shortest, rules.shield.every - rules.shield.perZone * steps),
        // Seconds until the boss enrages
        enrageAfter: Math.max(rules.enrage.soonest, rules.enrage.after - rules.enrage.perZone * steps),
        // Sidestepping arrows: steps it takes to react to one, and steps before it can again
        dodgeReaction: Math.max(rules.dodge.reaction.fastest, rules.dodge.reaction.base - rules.dodge.reaction.perZone * steps),
        dodgeCooldown: Math.max(rules.dodge.cooldown.shortest, rules.dodge.cooldown.base - rules.dodge.cooldown.perZone * steps),
        // How long its wind-ups are, as a share of the usual: plain attacks, and the heavy ones
        windUp: Math.max(rules.windUp.least, 1 - rules.windUp.perZone * steps),
        heavyWindUp: Math.max(rules.windUp.leastForHeavy, 1 - rules.windUp.perZone * steps),
        // Seconds it takes to sweep across the field and back
        sweepSeconds: Math.max(rules.movement.sweep.fastest, rules.movement.sweep.base - rules.movement.sweep.perZone * steps),
        // In the player's eyes a boss is three levels above them, as in World of Warcraft
        level: boss.zone * rules.levelsPerZone + 3,
        reward: {
            score: rules.reward.score + rules.reward.scorePerZone * steps,
            health: rules.reward.health
        }
    };
}

/**
 * How much more damage a boss takes after this long in the fight (1 = normal).
 * @param {number} seconds  Seconds the fight has lasted
 */
export function weakenedMultiplier(seconds, rules) {
    return Math.min(rules.maxWeakened, 1 + Math.max(0, seconds) * rules.weakenPerSecond);
}

/**
 * How much faster a boss throws, and how much harder it hits, once it has enraged (1 = normal).
 * @param {number} seconds      Seconds the fight has lasted
 * @param {number} enrageAfter  The boss's time limit, from bossStats
 */
export function enrageMultiplier(seconds, enrageAfter, rules) {
    if (seconds < enrageAfter) return 1;

    return Math.min(rules.enrage.most, rules.enrage.atStart + (seconds - enrageAfter) * rules.enrage.perSecond);
}
