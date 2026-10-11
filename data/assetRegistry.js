// assetRegistry.js - Centralized asset path management
// This file defines ALL game assets in one place to avoid path duplication

export const assetRegistry = {
    // Player assets
    player: {
        normal: 'assets/player/efto.png',
        impact: 'assets/player/vano.png',
        celebration: 'assets/player/efto-win.png',
        sando: 'assets/player/sando.png'  // Special celebration image for Ashkandi items
    },
    
    // Projectile assets
    projectiles: {
        fireball: 'assets/projectiles/fireball.png',
        frostbolt: 'assets/projectiles/frostbolt.png',
        shadowbolt: 'assets/projectiles/shadowbolt.png',
        thunder: 'assets/projectiles/thunder.png'
    },
    
    // Power-up and consumable assets
    powerups: {
        healthPotion: 'assets/powerups/health_potion.png',
        manaPotion: 'assets/powerups/mana_potion.png',
        alchemy: 'assets/powerups/alchemy.png',
        speedBoost: 'assets/powerups/speed-boost.png',
        sprint: 'assets/powerups/sprint.webp',
        aspectOfTheMonkey: 'assets/powerups/aspect_of_the_monkey.webp',
        evasion: 'assets/powerups/evasion.jpg',
        frostNova: 'assets/powerups/frost-nova.jpg',
        powerWordShield: 'assets/powerups/powerwordshield.jpg',
        chickenFood: 'assets/powerups/kokoska.png',
        reverseGravity: 'assets/powerups/reverse_gravity.webp',
        thoriumArrows: 'assets/powerups/arrows.webp'
    },
    
    // Buff and effect assets
    buffs: {
        songflower: 'assets/spells/songflower-buff.png',
        onyxia: 'assets/spells/dragon-cry.webp',
        zgBuff1: 'assets/spells/zg-buff.png',
        zgBuff2: 'assets/spells/zg-buff2.png',
        blackLotuses: 'assets/spells/black-lotuses.webp',
        flaskOfTitans: 'assets/spells/flask_of_titans.webp',
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
        timeCut: 'assets/audio/sfx/time_cut.mp3',
        speedboost: 'assets/audio/sfx/speedboost.wav',
        shieldCast: 'assets/audio/sfx/shield_cast.mp3',
        frostbolt: 'assets/audio/sfx/frostbolt.mp3',
        shadowImpact: 'assets/audio/sfx/shadow-bolt.mp3',
        chickenEat: 'assets/audio/sfx/neka_krka_peto.mp3',
        reverseGravity: 'assets/audio/sfx/reverse_gravity.mp3'
    },

    // Regular items
    items: {
        // Basic items
        gold: 'assets/items/gold.png',
        ring1: 'assets/items/ring1.png',
        ring2: 'assets/items/ring2.png',
        ring3: 'assets/items/ring3.png',
        chest: 'assets/items/chest.png',
        
        // Dragonstalker set
        dsHelm: 'assets/items/dshelm.png',
        dsShoulders: 'assets/items/dsshoulders.png',
        dsChest: 'assets/items/dschest.png',
        dsBracers: 'assets/items/dsbracers.png',
        dsHands: 'assets/items/dshands.png',
        dsBelt: 'assets/items/dsbelt.png',
        dsLegs: 'assets/items/dslegs.png',
        dsBoots: 'assets/items/dsboots.png',
        
        // Numbered items
        item2: 'assets/items/2.png',
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
        minersCape: 'assets/items/miners-cape.png',
        walkingStick: 'assets/items/walking-stick.png',
        wolfmasterCape: 'assets/items/wolfmaster-cape.png',
        quickStrikeRing: 'assets/items/quick-strike-ring.png',
        circleOfAppliedForce: 'assets/items/circle-of-applied-force.png',
        onslaught: 'assets/items/onslaught.png',
        cts: 'assets/items/cts.png',
        dft: 'assets/items/DFT.png',
        
        // Legendary and ultra rare
        tunder: 'assets/items/tunder.png',
        zee: 'assets/items/zee.png',
        
        // WebP items
        cape21: 'assets/items/Inv_misc_cape_21.webp',
        cape05: 'assets/items/Inv_misc_cape_05.webp',
        forkKnife: 'assets/items/fork_knife.webp',
        sapphireGem: 'assets/items/Inv_misc_gem_sapphire_01.webp',
        pearlGem: 'assets/items/Inv_misc_gem_pearl_04.webp',
        hardCheese: 'assets/items/Inv_misc_food_100_hardcheese.webp',
        food09: 'assets/items/Inv_misc_food_09.webp',
        fish31: 'assets/items/Inv_misc_fish_31.webp',
        swissArmy: 'assets/items/Inv_misc_enggizmos_swissarmy.webp',
        gizmos29: 'assets/items/Inv_misc_enggizmos_29.webp',
        coin04: 'assets/items/Inv_misc_coin_04.webp',
        coin10: 'assets/items/Inv_misc_coin_10.webp',
        coin02: 'assets/items/Inv_misc_coin_02.webp',
        coin01: 'assets/items/Inv_misc_coin_01.webp'
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
        
        // WebP regular items
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
        assetRegistry.items.coin01
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
        assetRegistry.powerups.thoriumArrows,
        
        // Important special buffs and spell icons
        assetRegistry.buffs.flaskOfTitans,
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
        assetRegistry.player.normal,
        assetRegistry.player.impact,
        assetRegistry.player.celebration,
        assetRegistry.player.sando
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