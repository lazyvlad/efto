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
        speedScaling: true // Increases probability based on game speed
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
        healthScaling: true // Increases probability when health is low
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
        baseProbability: 0.10 // 10% base chance (very rare)
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
        stackable: true // Multiple chicken foods can be active at once
    },
    {
        id: "reverse_gravity",
        name: "Reverse Gravity",
        image: assetRegistry.powerups.reverseGravity,
        effect: "reverse_gravity",
        value: 5, // Duration in seconds
        duration: 300, // 5 seconds at 60fps
        type: "legendary",
        color: "#8B00FF",
        sound: assetRegistry.audio.ohoo, // Using existing sound effect
        description: "Makes all items on screen move upward for 5 seconds",
        baseProbability: 0.1, // 10%
        speedScaling: false
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