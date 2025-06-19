// Helpful power-up items database
export const powerUpItems = [
    {
        id: "mana_potion",
        name: "Mana Potion",
        image: "assets/manapotion.png",
        effect: "slow_time",
        value: 0.5, // Slow down to 50% speed for duration
        duration: 600, // 10 seconds at 60fps
        type: "utility",
        color: "#4169E1",
        sound: "assets/mana_drink.mp3",
        description: "Slows down time",
        baseProbability: 0.25, // 25% base chance
        speedScaling: true // Increases probability based on game speed
    },
    {
        id: "health_potion",
        name: "Health Potion",
        image: "assets/health_potion.png",
        effect: "heal",
        value: 20, // Heal 20 HP
        duration: 0, // Instant effect
        type: "heal",
        color: "#FF69B4",
        sound: "assets/heal_drink.mp3",
        description: "Restores 20 HP",
        baseProbability: 0.30, // 30% base chance
        healthScaling: true // Increases probability when health is low
    },
    {
        id: "time_cutter",
        name: "Time Cutter",
        image: "assets/alchemy.png",
        effect: "cut_time",
        value: 0.3, // Reduce speed by 30% (configurable)
        duration: 0, // Permanent effect
        type: "legendary",
        color: "#8A2BE2",
        sound: "assets/time_cut.mp3",
        description: "Permanently reduces game speed",
        maxSpawns: 2, // Maximum times this can spawn in a game
        spawnChance: 0.1, // 10% chance when conditions are met (very rare)
        baseProbability: 0.10 // 10% base chance (very rare)
    }
]; 