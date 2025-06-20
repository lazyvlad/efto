// Player spells database
export const playerSpells = [
    {
        id: "dragon_cry",
        name: "Dragon Cry",
        key: "Q",
        description: "Allows movement across the entire canvas area",
        cooldown: 60000, // 1 minute in milliseconds
        duration: 10000, // 10 seconds in milliseconds
        effects: {
            unrestricted_movement: true
        },
        color: "#FF4500", // Orange-red color
        icon: "assets/onyxia-buff.png", // Onyxia buff icon
        type: "movement"
    },
    {
        id: "zandalari",
        name: "Zandalari",
        key: "W",
        description: "20% more points and slows damage projectiles",
        cooldown: 45000, // 45 seconds in milliseconds
        duration: 15000, // 15 seconds in milliseconds
        effects: {
            point_multiplier: 1.2, // 20% more points
            slow_projectiles: 0.3 // Slow projectiles to 30% speed
        },
        color: "#FFD700", // Gold color
        icon: "assets/zg-buff.png", // Zandalari buff icon
        type: "buff"
    },
    {
        id: "songflower",
        name: "Songflower",
        key: "E",
        description: "Removes one missed dragonstalker item counter",
        cooldown: 120000, // 2 minutes in milliseconds
        duration: 0, // Instant effect
        effects: {
            remove_missed_item: true
        },
        color: "#FF69B4", // Pink color
        icon: "assets/songflower-buff.png", // Songflower buff icon
        type: "utility"
    }
]; 