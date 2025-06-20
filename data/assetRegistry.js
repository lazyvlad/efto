// assetRegistry.js - Centralized asset path management
// This file defines ALL game assets in one place to avoid path duplication

export const assetRegistry = {
    // Player assets
    player: {
        normal: 'assets/efto.png',
        impact: 'assets/vano.png',
        celebration: 'assets/efto-win.png'
    },
    
    // Projectile assets
    projectiles: {
        fireball: 'assets/fireball.png',
        frostbolt: 'assets/frostbolt.png',
        shadowbolt: 'assets/shadowbolt.png',
        thunder: 'assets/thunder.png'
    },
    
    // Power-up and consumable assets
    powerups: {
        healthPotion: 'assets/health_potion.png',
        manaPotion: 'assets/mana_potion.png',
        alchemy: 'assets/alchemy.png',
        speedBoost: 'assets/speed-boost.png',
        frostNova: 'assets/frost-nova.jpg',
        powerWordShield: 'assets/powerwordshield.jpg',
        chickenFood: 'assets/kokoska.png'
    },
    
    // Buff and effect assets
    buffs: {
        songflower: 'assets/songflower-buff.png',
        onyxia: 'assets/onyxia-buff.png',
        zgBuff1: 'assets/zg-buff.png',
        zgBuff2: 'assets/zg-buff2.png',
        blackLotuses: 'assets/black-lotuses.png'
    },
    
    // Audio assets
    audio: {
        // Background music
        background: 'assets/background.mp3',
        
        // Sound effects
        voice: 'assets/voice.mp3',
        scream: 'assets/scream.mp3',
        uff: 'assets/uff.mp3',
        total: 'assets/total.mp3',
        smukajte: 'assets/SMUKAJTE.mp3',
        ohoo: 'assets/ohoo.mp3',
        nakoj: 'assets/nakoj.mp3',
        roll: 'assets/roll.mp3',
        fireballimpact: 'assets/fireballimpact.mp3',
        wegotit2: 'assets/weGotIt2.mp3',
        
        // Item-specific sounds
        disenchant: 'assets/disenchant.mp3',
        dft: 'assets/dft.mp3',
        
        // Power-up and effect sounds
        manaDrink: 'assets/mana_potion.wav',
        healDrink: 'assets/health_potion.mp3',
        timeCut: 'assets/time_cut.mp3',
        speedboost: 'assets/speedboost.mp3',
        shieldCast: 'assets/shield_cast.mp3',
        frostimpact: 'assets/frostimpact.mp3',
        shadowImpact: 'assets/shadow_impact.mp3',
        chickenEat: 'assets/neka_krka_peto.mp3'
    },

    // Regular items
    items: {
        // Basic items
        gold: 'items/gold.png',
        ring1: 'items/ring1.png',
        ring2: 'items/ring2.png',
        ring3: 'items/ring3.png',
        chest: 'items/chest.png',
        
        // Dragonstalker set
        dsHelm: 'items/dshelm.png',
        dsShoulders: 'items/dsshoulders.png',
        dsChest: 'items/dschest.png',
        dsBracers: 'items/dsbracers.png',
        dsHands: 'items/dshands.png',
        dsBelt: 'items/dsbelt.png',
        dsLegs: 'items/dslegs.png',
        dsBoots: 'items/dsboots.png',
        
        // Numbered items
        item2: 'items/2.png',
        item33: 'items/33.png',
        item4: 'items/4.png',
        item5: 'items/5.png',
        item6: 'items/6.png',
        item66: 'items/66.png',
        item7: 'items/7.png',
        item8: 'items/8.png',
        item99: 'items/99.png',
        
        // Epic weapons and gear
        ashkandi: 'items/ashkandi.png',
        maladath: 'items/maladath.png',
        dalrends: 'items/dalrends.png',
        brutalityBlade: 'items/3.png',
        perditionsBlade: 'items/perditions-blade.png',
        
        // Accessories and misc
        minersCape: 'items/miners-cape.png',
        walkingStick: 'items/walking-stick.png',
        wolfmasterCape: 'items/wolfmaster-cape.png',
        quickStrikeRing: 'items/quick-strike-ring.png',
        circleOfAppliedForce: 'items/circle-of-applied-force.png',
        onslaught: 'items/onslaught.png',
        cts: 'items/cts.png',
        dft: 'items/DFT.png',
        
        // Legendary and ultra rare
        tunder: 'items/tunder.png',
        zee: 'items/zee.png',
        
        // WebP items from assets folder
        cape21: 'assets/Inv_misc_cape_21.webp',
        cape05: 'assets/Inv_misc_cape_05.webp',
        forkKnife: 'assets/fork_knife.webp',
        sapphireGem: 'assets/Inv_misc_gem_sapphire_01.webp',
        pearlGem: 'assets/Inv_misc_gem_pearl_04.webp',
        hardCheese: 'assets/Inv_misc_food_100_hardcheese.webp',
        food09: 'assets/Inv_misc_food_09.webp',
        fish31: 'assets/Inv_misc_fish_31.webp',
        swissArmy: 'assets/Inv_misc_enggizmos_swissarmy.webp',
        gizmos29: 'assets/Inv_misc_enggizmos_29.webp',
        coin04: 'assets/Inv_misc_coin_04.webp',
        coin10: 'assets/Inv_misc_coin_10.webp',
        coin02: 'assets/Inv_misc_coin_02.webp',
        coin01: 'assets/Inv_misc_coin_01.webp'
    }
};

// Asset categories for tiered loading
export const assetCategories = {
    // Critical assets - must load before game starts
    critical: [
        assetRegistry.player.normal,
        assetRegistry.player.impact,
        assetRegistry.player.celebration,
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
        assetRegistry.powerups.speedBoost,
        assetRegistry.powerups.healthPotion,
        assetRegistry.powerups.manaPotion,
        assetRegistry.powerups.alchemy,
        assetRegistry.powerups.chickenFood
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
        assetRegistry.player.celebration
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