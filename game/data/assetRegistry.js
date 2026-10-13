// assetRegistry.js - Centralized asset path management
// This file defines ALL game assets in one place to avoid path duplication

// Sounds that come in two formats: OGG where the browser plays it, WAV elsewhere (and when
// this file is read outside a browser, by the build tools)
const OGG_OR_WAV = typeof document !== 'undefined'
    && document.createElement('audio').canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'wav';

export const assetRegistry = {
    // Player assets
    player: {
        // The figures the player moves around, one for each side (data/playerCharacters.js)
        hunter: 'assets/player/pajama-hunter.webp',
        tauren: 'assets/player/horde-tauren.webp',
        // The stock portrait in the player panel, and the pictures the player was drawn with
        // before the hunter (no longer loaded by the game)
        normal: 'assets/player/efto.png',
        impact: 'assets/player/vano.png',
        celebration: 'assets/player/efto-win.png',
        sando: 'assets/player/sando.png'  // Special celebration image for Ashkandi items
    },
    
    // Projectile assets
    projectiles: {
        fireball: 'assets/attacks/spells/01-fireball.webp',
        frostbolt: 'assets/attacks/spells/02-frost-ball.webp',
        shadowbolt: 'assets/attacks/spells/03-shadow-ball.webp',
        smite: 'assets/attacks/spells/04-smite.webp',
        holyShock: 'assets/attacks/spells/05-holy-shock.webp',
        thunder: 'assets/projectiles/thunder.png'
    },
    
    // Power-up and consumable assets
    powerups: {
        healthPotion: 'assets/powerups/health-potion.webp',
        manaPotion: 'assets/powerups/mana-potion.webp',
        alchemy: 'assets/powerups/time-cutter.webp',
        speedBoost: 'assets/powerups/speed-boost.png',
        sprint: 'assets/projectiles/sprint.webp',
        aspectOfTheMonkey: 'assets/powerups/swift-reflexes.webp',
        evasion: 'assets/powerups/master-evasion.webp',
        frostNova: 'assets/projectiles/frost-nova.webp',
        powerWordShield: 'assets/projectiles/power-word-shield.webp',
        chickenFood: 'assets/powerups/chicken-food.webp',
        reverseGravity: 'assets/powerups/reverse-gravity.webp',
        bronzeArrows: 'assets/powerups/bronze-arrows.webp',
        silverArrows: 'assets/powerups/silver-arrows.webp',
        thoriumArrows: 'assets/powerups/thorium-arrows.webp'
    },
    
    // Buff and effect assets
    buffs: {
        songflower: 'assets/spells/songflower-buff.png',
        onyxia: 'assets/spells/dragon-cry.webp',
        zgBuff1: 'assets/spells/zandalari.webp',
        zgBuff2: 'assets/spells/zg-buff2.png',
        blackLotuses: 'assets/items/black-lotuses.webp',
        flaskOfTitans: 'assets/spells/flask_of_titans.webp',
        arcaneShot: 'assets/spells/arcane_shot.webp',
        autoshot: 'assets/spells/autoshot.webp',
        multishot: 'assets/spells/multishot.webp'
    },
    
    // Audio assets
    audio: {
        // Background music
        background: 'assets/audio/music/background.mp3',
        
        // Sound effects
        voice: 'assets/audio/sfx/voice.mp3',
        scream: 'assets/audio/sfx/scream.mp3',
        uff: 'assets/audio/sfx/uff.mp3',
        total: 'assets/audio/sfx/total.mp3',
        smukajte: 'assets/audio/sfx/SMUKAJTE.mp3',
        ohoo: 'assets/audio/sfx/ohoo.mp3',
        nakoj: 'assets/audio/sfx/nakoj.mp3',
        roll: 'assets/audio/sfx/roll.mp3',
        fireballimpact: 'assets/audio/sfx/fireballimpact.mp3',
        wegotit2: 'assets/audio/sfx/weGotIt2.mp3',
        
        // Item-specific sounds
        disenchant: 'assets/audio/sfx/disenchant.mp3',
        dft: 'assets/audio/sfx/dft.mp3',
        
        // Power-up and effect sounds
        manaDrink: 'assets/audio/sfx/mana_potion.wav',
        healDrink: 'assets/audio/sfx/health_potion.mp3',
        // A guild voice clip, about a second (OGG, or WAV where the browser cannot play OGG)
        timeCut: `assets/audio/sfx/na-marko.${OGG_OR_WAV}`,
        speedboost: 'assets/audio/sfx/speedboost.wav',
        // A guild voice clip (OGG, or WAV where the browser cannot play OGG). It was one of the
        // idle remarks (data/voiceLines.js) and now belongs to the shield alone.
        shieldCast: `assets/audio/voice/04-follow-up.${OGG_OR_WAV}`,
        frostbolt: 'assets/audio/sfx/frostbolt.mp3',
        shadowImpact: 'assets/audio/sfx/shadow-bolt.mp3',
        chickenEat: 'assets/audio/sfx/neka_krka_peto.mp3',
        reverseGravity: 'assets/audio/sfx/reverse_gravity.mp3',
        
        // The pet bites a projectile out of the air (OGG, or WAV where the browser cannot play OGG)
        petChomp: `assets/audio/sfx/pet-chomp.${OGG_OR_WAV}`
    },

    // Regular items
    items: {
        // Basic items
        gold: 'assets/items/gold.webp',
        ring1: 'assets/items/ring1.webp',
        ring2: 'assets/items/ring2.webp',
        ring3: 'assets/items/arcane-crystal.webp',
        chest: 'assets/items/chest.png',
        
        // Dragonstalker set
        dsHelm: 'assets/items/dragonstalker-helmet.webp',
        dsShoulders: 'assets/items/dragonstalker-shoulders.webp',
        dsChest: 'assets/items/dragonstalker-chest.webp',
        dsBracers: 'assets/items/dragonstalker-bracers.webp',
        dsHands: 'assets/items/dragonstalker-gloves.webp',
        dsBelt: 'assets/items/dragonstalker-belt.webp',
        dsLegs: 'assets/items/dragonstalker-leggings.webp',
        dsBoots: 'assets/items/dragonstalker-boots.webp',
        
        // Giantstalker (tier 1) and Cryptstalker (tier 3) sets
        giantstalkerHelmet: 'assets/items/giantstalker-helmet.webp',
        giantstalkerShoulders: 'assets/items/giantstalker-shoulders.webp',
        giantstalkerChest: 'assets/items/giantstalker-chest.webp',
        giantstalkerBracers: 'assets/items/giantstalker-bracers.webp',
        giantstalkerGloves: 'assets/items/giantstalker-gloves.webp',
        giantstalkerBelt: 'assets/items/giantstalker-belt.webp',
        giantstalkerLeggings: 'assets/items/giantstalker-leggings.webp',
        giantstalkerBoots: 'assets/items/giantstalker-boots.webp',
        cryptstalkerHelmet: 'assets/items/cryptstalker-helmet.webp',
        cryptstalkerShoulders: 'assets/items/cryptstalker-shoulders.webp',
        cryptstalkerChest: 'assets/items/cryptstalker-chest.webp',
        cryptstalkerBracers: 'assets/items/cryptstalker-bracers.webp',
        cryptstalkerGloves: 'assets/items/cryptstalker-gloves.webp',
        cryptstalkerBelt: 'assets/items/cryptstalker-belt.webp',
        cryptstalkerLeggings: 'assets/items/cryptstalker-leggings.webp',
        cryptstalkerBoots: 'assets/items/cryptstalker-boots.webp',
        cryptstalkerRing: 'assets/items/cryptstalker-ring.webp',
        
        // Numbered items
        item33: 'assets/items/33.png',
        item4: 'assets/items/4.png',
        item5: 'assets/items/5.png',
        item6: 'assets/items/6.png',
        item66: 'assets/items/66.png',
        item7: 'assets/items/7.png',
        item8: 'assets/items/8.png',
        item99: 'assets/items/99.png',
        
        // Epic weapons and gear
        ashkandi: 'assets/items/ashkandi.png',
        maladath: 'assets/items/maladath.png',
        dalrends: 'assets/items/dalrends.png',
        brutalityBlade: 'assets/items/3.png',
        perditionsBlade: 'assets/items/perditions-blade.png',
        
        // Accessories and misc
        minersCape: 'assets/items/miners-cape.webp',
        walkingStick: 'assets/items/walking-stick.webp',
        wolfmasterCape: 'assets/items/wolf-master.webp',
        quickStrikeRing: 'assets/items/quick-strike-ring.webp',
        circleOfAppliedForce: 'assets/items/circle-of-applied-force.webp',
        onslaught: 'assets/items/onslaught.webp',
        cts: 'assets/items/cts.png',
        dft: 'assets/items/drakefangtalisman.webp',
        
        // Legendary and ultra rare
        tunder: 'assets/items/tunder.png',
        zee: 'assets/items/zee.png',
        
        // Common loot
        cape21: 'assets/items/cape21.webp',
        cape05: 'assets/items/cape05.webp',
        forkKnife: 'assets/items/fork-knife.webp',
        sapphireGem: 'assets/items/sapphire-gem.webp',
        pearlGem: 'assets/items/pearl-gem.webp',
        hardCheese: 'assets/items/hard-cheese.webp',
        food09: 'assets/items/bread.webp',
        fish31: 'assets/items/fish.webp',
        swissArmy: 'assets/items/swiss-army.webp',
        gizmos29: 'assets/items/gizmos.webp',
        coin04: 'assets/items/copper-coin.webp',
        coin10: 'assets/items/gold-coin.webp',
        coin02: 'assets/items/silver-coin.webp',
        coin01: 'assets/items/bronze-coin.webp',
        
        // Crafting materials and reagents
        lightFeather: 'assets/items/light-feather.webp',
        ruggedLeather: 'assets/items/rugged-leather.webp',
        kingsblood: 'assets/items/kingsblood.webp',
        fadeleaf: 'assets/items/fadeleaf.webp',
        runecloth: 'assets/items/runecloth.webp',
        mithrilBar: 'assets/items/mithril-bar.webp',
        thoriumBar: 'assets/items/thorium-bar.webp',
        essenceOfWater: 'assets/items/essence-of-water.webp',
        darkRune: 'assets/items/dark-rune.webp',
        righteousOrb: 'assets/items/righteous-orb.webp',
        fieryCore: 'assets/items/fiery-core.webp',
        lavaCore: 'assets/items/lava-core.webp'
    }
};

// Asset categories for tiered loading
export const assetCategories = {
    // Critical assets - must load before game starts
    critical: [
        assetRegistry.player.normal,
        assetRegistry.player.impact,
        assetRegistry.player.celebration,
        assetRegistry.player.sando,
        assetRegistry.projectiles.fireball,
        assetRegistry.projectiles.frostbolt,
        
        
        // All regular items - first to appear in game
        assetRegistry.items.ring1,
        assetRegistry.items.ring2,
        assetRegistry.items.ring3,
        assetRegistry.items.minersCape,
        assetRegistry.items.walkingStick,
        assetRegistry.items.gold,
        assetRegistry.items.wolfmasterCape,
        
        // More regular items
        assetRegistry.items.cape21,
        assetRegistry.items.cape05,
        assetRegistry.items.forkKnife,
        assetRegistry.items.sapphireGem,
        assetRegistry.items.pearlGem,
        assetRegistry.items.hardCheese,
        assetRegistry.items.food09,
        assetRegistry.items.fish31,
        assetRegistry.items.swissArmy,
        assetRegistry.items.gizmos29,
        assetRegistry.items.coin04,
        assetRegistry.items.coin10,
        assetRegistry.items.coin02,
        assetRegistry.items.coin01,
        
        // Crafting materials: the common ones fall from the first level
        assetRegistry.items.lightFeather,
        assetRegistry.items.ruggedLeather,
        assetRegistry.items.kingsblood,
        assetRegistry.items.fadeleaf,
        assetRegistry.items.runecloth
    ],
    
    // Important assets - load during startup
    important: [
        // Essential audio - background music and common sounds
        assetRegistry.audio.background,
        assetRegistry.audio.voice,
        assetRegistry.audio.uff,
        assetRegistry.audio.total,
        assetRegistry.audio.fireballimpact,
        assetRegistry.audio.chickenEat,
        
        // Dragonstalker set
        assetRegistry.items.dsHelm,
        assetRegistry.items.dsShoulders,
        assetRegistry.items.dsChest,
        assetRegistry.items.dsBracers,
        assetRegistry.items.dsHands,
        assetRegistry.items.dsBelt,
        assetRegistry.items.dsLegs,
        assetRegistry.items.dsBoots,
        
        // Tier set items
        assetRegistry.items.item4,
        assetRegistry.items.ashkandi,
        
        // Power-ups and effects
        assetRegistry.powerups.frostNova,
        assetRegistry.powerups.sprint,
        assetRegistry.powerups.aspectOfTheMonkey,
        assetRegistry.powerups.evasion,
        assetRegistry.powerups.healthPotion,
        assetRegistry.powerups.manaPotion,
        assetRegistry.powerups.alchemy,
        assetRegistry.powerups.chickenFood,
        assetRegistry.powerups.reverseGravity,
        assetRegistry.powerups.bronzeArrows,
        assetRegistry.powerups.silverArrows,
        assetRegistry.powerups.thoriumArrows,
        
        // Important special buffs and spell icons
        assetRegistry.buffs.arcaneShot,
        assetRegistry.buffs.autoshot,
        assetRegistry.buffs.multishot
    ],
    
    // Optional assets - load on demand or in background
    optional: [
        // Additional audio effects
        assetRegistry.audio.scream,
        assetRegistry.audio.smukajte,
        assetRegistry.audio.ohoo,
        assetRegistry.audio.nakoj,
        assetRegistry.audio.roll,
        assetRegistry.audio.wegotit2,
        assetRegistry.audio.disenchant,
        assetRegistry.audio.dft,
        
        // Ultra rare items
        assetRegistry.items.zee,
        assetRegistry.items.tunder,
        
        // Epic gear
        assetRegistry.items.maladath,
        assetRegistry.items.dalrends,
        assetRegistry.items.brutalityBlade,
        assetRegistry.items.quickStrikeRing,
        assetRegistry.items.onslaught,
        assetRegistry.items.circleOfAppliedForce,
        assetRegistry.items.dft,
        assetRegistry.items.perditionsBlade,
        assetRegistry.items.item6,
        
        // The other hunter sets
        assetRegistry.items.giantstalkerHelmet,
        assetRegistry.items.giantstalkerShoulders,
        assetRegistry.items.giantstalkerChest,
        assetRegistry.items.giantstalkerBracers,
        assetRegistry.items.giantstalkerGloves,
        assetRegistry.items.giantstalkerBelt,
        assetRegistry.items.giantstalkerLeggings,
        assetRegistry.items.giantstalkerBoots,
        assetRegistry.items.cryptstalkerHelmet,
        assetRegistry.items.cryptstalkerShoulders,
        assetRegistry.items.cryptstalkerChest,
        assetRegistry.items.cryptstalkerBracers,
        assetRegistry.items.cryptstalkerGloves,
        assetRegistry.items.cryptstalkerBelt,
        assetRegistry.items.cryptstalkerLeggings,
        assetRegistry.items.cryptstalkerBoots,
        assetRegistry.items.cryptstalkerRing,
        
        // The rarer crafting materials
        assetRegistry.items.mithrilBar,
        assetRegistry.items.thoriumBar,
        assetRegistry.items.essenceOfWater,
        assetRegistry.items.darkRune,
        assetRegistry.items.righteousOrb,
        assetRegistry.items.fieryCore,
        assetRegistry.items.lavaCore,
        
        // Additional projectiles and effects
        assetRegistry.projectiles.shadowbolt,
        assetRegistry.projectiles.thunder,
        assetRegistry.powerups.powerWordShield,
        
        // Buffs
        assetRegistry.buffs.blackLotuses,
        assetRegistry.buffs.songflower,
        assetRegistry.buffs.onyxia,
        assetRegistry.buffs.zgBuff1,
        assetRegistry.buffs.zgBuff2
    ]
};

// Level-based asset groups for progressive loading
export const levelAssets = {
    // Level 1-2: Basic gameplay
    early: [
        assetRegistry.projectiles.fireball,
        assetRegistry.projectiles.frostbolt,
        assetRegistry.items.gold,
        assetRegistry.items.ring1,
        assetRegistry.items.ring2
    ],
    
    // Level 3-4: More variety
    mid: [
        assetRegistry.items.maladath,
        assetRegistry.items.dalrends,
        assetRegistry.items.quickStrikeRing,
        assetRegistry.items.minersCape
    ],
    
    // Level 5-7: Rare items appear
    late: [
        assetRegistry.items.tunder,
        assetRegistry.items.zee,
        assetRegistry.items.onslaught,
        assetRegistry.items.circleOfAppliedForce,
        assetRegistry.projectiles.shadowbolt
    ],
    
    // Level 8+: End-game content
    endgame: [
        assetRegistry.items.dft,
        assetRegistry.items.perditionsBlade,
        assetRegistry.buffs.blackLotuses,
        assetRegistry.projectiles.thunder,
        assetRegistry.buffs.songflower,
        assetRegistry.buffs.onyxia,
        assetRegistry.buffs.zgBuff1,
        assetRegistry.buffs.zgBuff2
    ]
};

// Commonly used asset groups for cache warming
export const commonAssets = {
    // Most frequently used in gameplay (items already in critical are loaded first)
    frequent: [
        assetRegistry.projectiles.fireball,
        assetRegistry.projectiles.frostbolt,
        assetRegistry.powerups.healthPotion,
        assetRegistry.powerups.manaPotion
    ],
    
    // Player-related assets
    player: [
        assetRegistry.player.hunter,
        assetRegistry.player.tauren,
        assetRegistry.player.normal
    ],
    
    // Dragonstalker set (win condition items)
    dragonstalker: [
        assetRegistry.items.dsHelm,
        assetRegistry.items.dsShoulders,
        assetRegistry.items.dsChest,
        assetRegistry.items.dsBracers,
        assetRegistry.items.dsHands,
        assetRegistry.items.dsBelt,
        assetRegistry.items.dsLegs,
        assetRegistry.items.dsBoots
    ]
};

// Helper functions to get asset paths
export function getAssetPath(category, key) {
    return assetRegistry[category]?.[key] || null;
}

export function getAllAssetPaths() {
    const paths = [];
    
    function extractPaths(obj) {
        for (const key in obj) {
            if (typeof obj[key] === 'string') {
                paths.push(obj[key]);
            } else if (typeof obj[key] === 'object') {
                extractPaths(obj[key]);
            }
        }
    }
    
    extractPaths(assetRegistry);
    return [...new Set(paths)]; // Remove duplicates
}

export function getAssetsByCategory(category) {
    return assetCategories[category] || [];
}

export function getAssetsByLevel(level) {
    if (level <= 2) return levelAssets.early;
    if (level <= 4) return [...levelAssets.early, ...levelAssets.mid];
    if (level <= 7) return [...levelAssets.early, ...levelAssets.mid, ...levelAssets.late];
    return [...levelAssets.early, ...levelAssets.mid, ...levelAssets.late, ...levelAssets.endgame];
}

export function getCommonAssets(group = 'frequent') {
    return commonAssets[group] || [];
} 