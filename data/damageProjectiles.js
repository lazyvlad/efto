// Damage projectiles database with structured data
import { assetRegistry } from './assetRegistry.js';

export const damageProjectiles = [
    // Common damage projectiles - Higher probability, less damage
    { 
        id: "fireball", 
        name: "Fireball", 
        image: assetRegistry.projectiles.fireball, 
        damage: 8, // 5% HP damage
        type: "common", 
        baseProbability: 0.035, 
        sound: assetRegistry.audio.fireballimpact,
        speed: { min: 1.2, max: 2.0 }, // Reduced from 2.0-3.5 for better balance
        size_multiplier: 0.8, // Reduced to compensate for larger base size
        color: "#FF4500",
        effects: "burn"
    },
    
    // Speed boost projectile - Common type, increases game speed on hit
    { 
        id: "speedboost", 
        name: "Speed Boost", 
        image: assetRegistry.powerups.sprint, 
        damage: 0, // 3% HP damage (less than fireball)
        type: "common", 
        baseProbability: 0.015, // Same spawn rate as power_word_shield
        sound: assetRegistry.audio.speedboost,
        speed: { min: 1.5, max: 2.3 }, // Reduced from 2.0-4.0 for better balance
        size_multiplier: 1.2, // Reduced to compensate for larger base size
        color: "#FF0000",
        effects: "speed_increase",
        speedIncreaseOptions: [10, 20, 30] // Possible percentage increases
    },
    
    // Power Word Shield projectile - Same spawn rate as speedboost
    { 
        id: "power_word_shield_projectile", 
        name: "Power Word Shield", 
        image: assetRegistry.powerups.powerWordShield, 
        damage: 0, // No damage - beneficial effect
        type: "common", 
        baseProbability: 0.01, // Same spawn rate as speedboost
        sound: assetRegistry.audio.shieldCast,
        speed: { min: 1.0, max: 2.0 }, // Slower speed for easier collection
        size_multiplier: 1.3, // Reduced to compensate for larger base size
        color: "#87CEEB",
        effects: "shield",
        shieldDurationOptions: [180, 300, 600] // 3, 5, or 10 seconds at 60fps
    },
    
    // Frost Nova projectile - Same effects as Power Word Shield but with damage
    { 
        id: "frost_nova", 
        name: "Frost Nova", 
        image: assetRegistry.powerups.frostNova, 
        damage: 2, // 2 HP damage despite beneficial effect
        type: "common", 
        baseProbability: 0.015, // Same spawn rate as power word shield
        sound: assetRegistry.audio.shieldCast,
        speed: { min: 1.0, max: 2.0 }, // Slower speed for easier collection
        size_multiplier: 1.0, // Reduced to compensate for larger base size
        color: "#87CEEB",
        effects: "freeze_time",
        freezeDurationOptions: [60, 180, 300] // 1, 3, or 5 seconds at 60fps
    },
    
    // Rare damage projectiles - Lower probability, more damage
    { 
        id: "frostbolt", 
        name: "Frostbolt", 
        image: assetRegistry.projectiles.frostbolt, 
        damage: 15, // 15 HP damage
        type: "rare", 
        baseProbability: 0.025, 
        sound: assetRegistry.audio.frostbolt,
        speed: { min: 0.8, max: 1.8 }, // Reduced from 1.0-3.0 for better balance
        size_multiplier: 1.0, // Reduced to compensate for larger base size
        color: "#00BFFF",
        effects: "freeze"
    },
    
    // Rare damage-over-time projectile - Very scary!
    { 
        id: "shadowbolt", 
        name: "Shadowbolt", 
        image: assetRegistry.projectiles.shadowbolt, 
        damage: 10, // 10 HP total damage over time (2 HP per second for 5 seconds)
        type: "rare", 
        baseProbability: 0.01, 
        sound: assetRegistry.audio.shadowImpact,
        speed: { min: 0.6, max: 1.2 }, // Slower than other projectiles
        size_multiplier: 1.1, // Reduced to compensate for larger base size
        color: "#4B0082", // Dark purple/indigo
        effects: "damage_over_time",
        dotDuration: 300, // 5 seconds at 60fps
        dotTickRate: 60, // Damage every 60 frames (1 second)
        dotDamagePerTick: 2 // 2 HP damage per second
    }
]; 