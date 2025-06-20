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
        baseProbability: 0.80, // 20% base chance
        healthScaling: true, // Increases probability when health is low
        stackable: true // Multiple chicken foods can be active at once
    }
]; 