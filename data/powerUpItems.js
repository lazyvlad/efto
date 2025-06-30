// Helpful power-up items database
import { assetRegistry } from './assetRegistry.js';

export const powerUpItems = [
    {
        id: "mana_potion",
        name: "Mana Potion",
        image: assetRegistry.powerups.manaPotion,
        effect: "slow_time",
        value: 0.5, // Slow down to 50% speed for duration
        duration: 600, // 10 seconds at 60fps
        type: "utility",
        color: "#4169E1",
        sound: assetRegistry.audio.manaDrink,
        description: "Slows down time",
        baseProbability: 0.25, // 25% base chance
        speedScaling: true, // Increases probability based on game speed
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "health_potion",
        name: "Health Potion",
        image: assetRegistry.powerups.healthPotion,
        effect: "heal",
        value: 20, // Heal 20 HP
        duration: 0, // Instant effect
        type: "heal",
        color: "#FF69B4",
        sound: assetRegistry.audio.healDrink,
        description: "Restores 20 HP",
        baseProbability: 0.30, // 30% base chance
        healthScaling: true, // Increases probability when health is low
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "time_cutter",
        name: "Time Cutter",
        image: assetRegistry.powerups.alchemy,
        effect: "cut_time",
        value: 0.3, // Reduce speed by 30% (configurable)
        duration: 0, // Permanent effect
        type: "legendary",
        color: "#8A2BE2",
        sound: assetRegistry.audio.timeCut,
        description: "Permanently reduces game speed",
        maxSpawns: 2, // Maximum times this can spawn in a game
        spawnChance: 0.1, // 10% chance when conditions are met (very rare)
        baseProbability: 0.10, // 10% base chance (very rare)
        size_multiplier: 1.2 // Consistent size for legendary items
    },
    {
        id: "chicken_food",
        name: "Chicken Food",
        image: assetRegistry.powerups.chickenFood,
        effect: "heal_over_time",
        value: 1, // 1 HP per second
        duration: 600, // 10 seconds at 60fps
        type: "heal",
        color: "#FFD700",
        sound: assetRegistry.audio.chickenEat,
        description: "Restores 1 HP per second for 10 seconds",
        baseProbability: 0.20, // 20% base chance
        healthScaling: true, // Increases probability when health is low
        stackable: true, // Multiple chicken foods can be active at once
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "reverse_gravity",
        name: "Reverse Gravity",
        image: assetRegistry.powerups.reverseGravity,
        effect: "reverse_gravity",
        value: 10, // Duration in seconds (increased from 5)
        duration: 600, // 10 seconds at 60fps (increased from 300)
        type: "legendary",
        color: "#8B00FF",
        sound: assetRegistry.audio.reverseGravity, // Using dedicated reverse gravity sound
        description: "Makes all items on screen move upward with dramatic angles for 10 seconds",
        baseProbability: 0.8, // 30% - INCREASED TO 300% FOR TESTING
        speedScaling: false,
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "swift_reflexes",
        name: "Aspect of the Monkey",
        image: assetRegistry.powerups.aspectOfTheMonkey,
        effect: "dodge_boost",
        value: 0.03, // +3% dodge rating for duration
        duration: 900, // 15 seconds at 60fps
        type: "utility",
        color: "#00FF00",
        sound: assetRegistry.audio.speedBoost,
        description: "Temporarily increases dodge chance by 3% for 15 seconds",
        baseProbability: 0.20, // 20% base chance
        speedScaling: true, // Increases probability based on game speed
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "master_evasion",
        name: "Evasion",
        image: assetRegistry.powerups.evasion,
        effect: "permanent_dodge",
        value: 0.01, // +1% permanent dodge rating
        duration: 0, // Permanent effect
        type: "epic",
        color: "#00FFFF",
        sound: assetRegistry.audio.onyxiaRoar,
        description: "Permanently increases dodge chance by 1%",
        maxSpawns: 5, // Maximum times this can spawn in a game (5% max dodge from this source)
        spawnChance: 0.05, // 5% chance when conditions are met (rare)
        baseProbability: 0.05, // 5% base chance (rare)
        size_multiplier: 1.2 // Standardized size
    },
    {
        id: "thorium_arrows",
        name: "Thorium Headed Arrows",
        image: assetRegistry.powerups.thoriumArrows, // New thorium arrows asset
        effect: "arrow_ammo",
        value: 1000, // 1000 arrows per bundle
        duration: 0, // Instant effect (adds to inventory)
        type: "utility",
        color: "#FFD700",
        sound: assetRegistry.audio.manaDrink, // Temporary - will need dedicated sound
        description: "Adds 1000 arrows to your ammunition",
        baseProbability: 0.25, // 25% base chance (same as mana potion)
        speedScaling: true, // Increases probability based on game speed
        size_multiplier: 1.2 // Appropriate size for arrow bundles
    }
    
    // Example power-up that modifies horizontal speed reduction (commented out)
    /*
    {
        id: "trajectory_modifier",
        name: "Trajectory Modifier",
        image: assetRegistry.powerups.someImage,
        effect: "modify_horizontal_speed",
        value: 0.30, // Set horizontal speed reduction to 30% (more pronounced angles)
        duration: 1200, // 20 seconds at 60fps
        type: "utility",
        color: "#00FFFF",
        sound: assetRegistry.audio.someSound,
        description: "Makes items fall at more pronounced angles",
        baseProbability: 0.15, // 15% base chance
        speedScaling: false
    }
    */
    
    // Example power-ups that modify fall angles (commented out)
    /*
    {
        id: "straight_drop",
        name: "Straight Drop",
        image: assetRegistry.powerups.someImage,
        effect: "modify_fall_angle",
        angleMin: 0,    // No angle variation
        angleMax: 0,    // All items fall straight down
        allowUpward: false, // Disable upward movement
        duration: 900,  // 15 seconds at 60fps
        type: "utility",
        color: "#00FF00",
        sound: assetRegistry.audio.someSound,
        description: "Makes all items fall straight down",
        baseProbability: 0.12,
        speedScaling: false
    },
    {
        id: "chaos_angles",
        name: "Chaos Angles",
        image: assetRegistry.powerups.someImage,
        effect: "modify_fall_angle",
        angleMin: -89,  // Almost horizontal left
        angleMax: 89,   // Almost horizontal right
        allowUpward: true,
        upwardMin: 91,  // Just past vertical
        upwardMax: 269, // Almost full circle
        duration: 600,  // 10 seconds at 60fps
        type: "utility",
        color: "#FF4500",
        sound: assetRegistry.audio.someSound,
        description: "Items fall at extreme angles, some even upward!",
        baseProbability: 0.08,
        speedScaling: false
    },
    {
        id: "reverse_gravity",
        name: "Reverse Gravity",
        image: assetRegistry.powerups.someImage,
        effect: "modify_fall_angle",
        angleMin: 135,  // Upward-left
        angleMax: 225,  // Upward-right
        allowUpward: true,
        duration: 480,  // 8 seconds at 60fps
        type: "legendary",
        color: "#8B00FF",
        sound: assetRegistry.audio.someSound,
        description: "All items fall upward instead of down!",
        baseProbability: 0.05,
        speedScaling: false
    }
    */
]; 