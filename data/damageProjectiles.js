// Damage projectiles database with structured data
export const damageProjectiles = [
    // Common damage projectiles - Higher probability, less damage
    { 
        id: "fireball", 
        name: "Fireball", 
        image: "assets/fireball.png", 
        damage: 8, // 5% HP damage
        type: "common", 
        baseProbability: 0.03, 
        sound: "assets/fireballimpact.mp3",
        speed: { min: 1.2, max: 2.0 }, // Reduced from 2.0-3.5 for better balance
        size: { width: 120, height: 120 },
        color: "#FF4500",
        effects: "burn"
    },
    
    // Speed boost projectile - Common type, increases game speed on hit
    { 
        id: "speedboost", 
        name: "Speed Boost", 
        image: "assets/speed-boost.png", 
        damage: 0, // 3% HP damage (less than fireball)
        type: "common", 
        baseProbability: 0.015, // Same spawn rate as power_word_shield
        sound: "assets/speedboost.mp3",
        speed: { min: 1.5, max: 2.5 }, // Reduced from 2.0-4.0 for better balance
        size: { width: 90, height: 90 },
        color: "#FF0000",
        effects: "speed_increase",
        speedIncreaseOptions: [10, 20, 30] // Possible percentage increases
    },
    
    // Power Word Shield projectile - Same spawn rate as speedboost
    { 
        id: "power_word_shield_projectile", 
        name: "Power Word Shield", 
        image: "assets/powerwordshield.jpg", 
        damage: 0, // No damage - beneficial effect
        type: "common", 
        baseProbability: 0.01, // Same spawn rate as speedboost
        sound: "assets/shield_cast.mp3",
        speed: { min: 1.0, max: 2.0 }, // Slower speed for easier collection
        size: { width: 90, height: 90 },
        color: "#87CEEB",
        effects: "shield",
        shieldDurationOptions: [180, 300, 600] // 3, 5, or 10 seconds at 60fps
    },
    
    // Frost Nova projectile - Same effects as Power Word Shield but with damage
    { 
        id: "frost_nova", 
        name: "Frost Nova", 
        image: "assets/frost-nova.jpg", 
        damage: 2, // 2 HP damage despite beneficial effect
        type: "common", 
        baseProbability: 0.015, // Same spawn rate as power word shield
        sound: "assets/shield_cast.mp3",
        speed: { min: 1.0, max: 2.0 }, // Slower speed for easier collection
        size: { width: 90, height: 90 },
        color: "#87CEEB",
        effects: "freeze_time",
        freezeDurationOptions: [60, 180, 300] // 1, 3, or 5 seconds at 60fps
    },
    
    // Rare damage projectiles - Lower probability, more damage
    { 
        id: "frostbolt", 
        name: "Frostbolt", 
        image: "assets/frostbolt.png", 
        damage: 15, // 10% HP damage
        type: "rare", 
        baseProbability: 0.025, 
        sound: "assets/frostimpact.mp3",
        speed: { min: 0.8, max: 1.8 }, // Reduced from 1.0-3.0 for better balance
        size: { width: 100, height: 100 },
        color: "#00BFFF",
        effects: "freeze"
    }
]; 