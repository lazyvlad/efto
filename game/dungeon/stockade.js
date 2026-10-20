// The Stockade: the first dungeon run (Alliance, after Hogger). Who fights in it and how hard.
//
// Every fighter has the four numbers of a Heroes of Might and Magic creature: attack, defense,
// damage (a range) and speed. Speed is both how many cells a fighter can move in one action and
// how often its turn comes (dungeon/rules.js, actionInterval). Health is health.
//
// The party's druid and paladin are scripted (dungeon/battle.js); the hunter's numbers come from
// the gear he wears (hunterStats below), and the player moves him and casts his spells.

export const STOCKADE = {
    id: 'stockade',
    name: 'The Stockade',
    // Seconds between one wave cleared and the next coming in
    breather: 4,
    waves: [
        ['prisoner', 'prisoner', 'prisoner', 'prisoner'],
        ['prisoner', 'prisoner', 'prisoner', 'convict', 'agitator'],
        ['insurgent', 'insurgent', 'prisoner', 'prisoner', 'convict'],
        ['convict', 'convict', 'agitator', 'agitator', 'insurgent', 'prisoner', 'prisoner'],
        // The last: Targorr the Dread and his guard
        ['targorr', 'prisoner', 'prisoner'],
    ],
};

// Tuned with the dungeon lab (tools/dungeon-lab.mjs), with the mage in the party, against Auto (everyone casting everything
// as it comes ready): about two runs in three won bare, nearly nine in ten in zone 2 gear. A
// hunter who only stands and Auto Shoots, leaving the rest to the others, loses. Playing by hand
// (moving them, timing the spells) is how to do better than Auto.

// The party, by name: Smokva the druid, Pumba the paladin, Zee Zgnan the gnome mage and Smrdljak
// the hunter's cat. "taunt": cells around the druid in which a foe must fight him.
export const PARTY = {
    druid: { name: 'Smokva', role: 'tank', maxHp: 900, attack: 6, defense: 14, damage: [18, 26], speed: 3, taunt: 2 },
    // "range": cells his heals and blessings reach
    paladin: { name: 'Pumba', role: 'healer', maxHp: 520, attack: 4, defense: 9, damage: [10, 16], speed: 4, heal: [115, 145], castTime: 1.3, range: 6 },
    pet: { name: 'Smrdljak', role: 'pet', maxHp: 240, attack: 7, defense: 5, damage: [9, 13], speed: 6 },
    // The gnome mage: frail, hits hard from afar ("range" cells for his spells; his staff beside him)
    mage: { name: 'Zee Zgnan', role: 'damage', maxHp: 300, attack: 11, defense: 3, damage: [20, 28], speed: 4, range: 6, crit: 0.05 },
};

// The foes. "goes": who it goes for when no druid's taunt holds it (nearest, or the healer).
// "range": cells it can throw from (none: it fights hand to hand).
export const FOES = {
    prisoner: { name: 'Defias Prisoner', maxHp: 248, attack: 7, defense: 3, damage: [26, 37], speed: 6, goes: 'nearest' },
    convict: { name: 'Defias Convict', maxHp: 623, attack: 9, defense: 7, damage: [55, 77], speed: 3, goes: 'nearest' },
    insurgent: { name: 'Defias Insurgent', maxHp: 285, attack: 10, defense: 4, damage: [40, 55], speed: 7, goes: 'healer' },
    agitator: { name: 'Defias Agitator', maxHp: 218, attack: 8, defense: 3, damage: [30, 41], speed: 4, goes: 'nearest', range: 7 },
    // Every third blow a cleave at everyone beside him; below half his health, once, a roar that
    // makes him hit harder and act sooner
    targorr: {
        name: 'Targorr the Dread', boss: true, maxHp: 5550, attack: 13, defense: 10, damage: [94, 125], speed: 4, goes: 'nearest',
        cleaveEvery: 3, cleave: 0.8, enrageAt: 0.5, enrage: { damage: 1.3, speed: 1.25 },
    },
};

// The hunter, from what he wears (utils/gear.js gearTotals: health, armor, attackPower, crit and
// dodge in hundredths, multishot and arcane as shares added to those shots)
export function hunterStats(gear = {}) {
    return {
        name: 'You',
        role: 'damage',
        maxHp: 320 + 4 * (gear.health || 0),
        attack: 8 + Math.round((gear.attackPower || 0) / 3),
        defense: 4 + Math.round((gear.armor || 0) / 4),
        damage: [18, 26],
        speed: 5,
        // Cells his bow reaches; foes this close or closer are too near to shoot (fought hand to
        // hand, his blows "melee" of an arrow's damage)
        range: 7,
        minRange: 2,
        melee: 0.7,
        crit: 0.05 + (gear.crit || 0),
        dodge: gear.dodge || 0,
        multishot: gear.multishot || 0,
        arcane: gear.arcane || 0,
    };
}

// His spells and potions in the dungeon (seconds; damage as a share of an arrow's)
export const SPELLS = {
    multiShot: { cooldown: 6, targets: 3, damage: 1 },
    arcaneShot: { cooldown: 8, damage: 2, ignoresDefense: true },
    potion: { cooldown: 2, heal: 0.45, count: 2 },
    // While the pet lies dead: he spends "castTime" bringing it back, with "health" of its own;
    // then not again for "cooldown" (an interrupted revive costs nothing)
    revivePet: { castTime: 2, health: 0.5, cooldown: 30 },
};

// The druid's and the paladin's spells. The player casts them (the selected one's spell bar); when
// he does not, they cast them themselves when it helps ("auto" in dungeon/battle.js). Seconds.
export const COMPANION_SPELLS = {
    druid: {
        // Every foe within "radius" cells must fight him for "seconds"
        growl: { name: 'Growl', cooldown: 10, radius: 3, seconds: 5 },
        // A blow at every foe beside him
        swipe: { name: 'Swipe', cooldown: 6, damage: 0.8 },
        // He takes "taken" of the damage for "seconds"
        barkskin: { name: 'Barkskin', cooldown: 25, taken: 0.6, seconds: 6 },
    },
    paladin: {
        // The foe most dangerous to him or the hunter can do nothing for "seconds"
        hammer: { name: 'Hammer of Justice', cooldown: 15, seconds: 3, range: 5 },
        // The lowest of the party takes no damage for "seconds"
        protection: { name: 'Blessing of Protection', cooldown: 30, seconds: 4 },
        // The lowest of the party back to full health
        layOnHands: { name: 'Lay on Hands', cooldown: 75 },
    },
    // The mage. Fireball is his plain ranged attack (no cooldown); Frostbolt slows ("slow": his
    // turns come that much slower, for "seconds"); Arcane Missiles, three at one foe; Frost Nova
    // freezes the foes within "radius" in place; Blink, to a cell within "range"; Ice Barrier
    // absorbs "absorb" damage for "seconds"
    mage: {
        fireball: { name: 'Fireball', cooldown: 0, damage: 1 },
        frostbolt: { name: 'Frostbolt', cooldown: 6, damage: 1.2, slow: 1.5, seconds: 5 },
        arcaneMissiles: { name: 'Arcane Missiles', cooldown: 8, missiles: 3, damage: 0.6 },
        frostNova: { name: 'Frost Nova', cooldown: 15, radius: 2, seconds: 4 },
        blink: { name: 'Blink', cooldown: 12, range: 4 },
        iceBarrier: { name: 'Ice Barrier', cooldown: 25, absorb: 160, seconds: 12 },
    },
    // The hunter's pet: a heavy blow at a foe beside it; a burst of speed (acts "speed" times as often)
    pet: {
        claw: { name: 'Claw', cooldown: 8, damage: 1.6 },
        dash: { name: 'Dash', cooldown: 20, seconds: 5, speed: 2 },
    },
};
