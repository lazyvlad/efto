// ===== GAME CONFIGURATION OBJECT =====
// 🎮 Modify these values to customize your game experience!
// 
// QUICK EXAMPLES:
// - Change spawnInterval to 20 for power-ups every 20 points instead of 30
// - Add customSpawnPoints: [15, 45, 87] for bonus power-ups at those exact scores
// - Set spawnChance to 0.5 for 50% chance of power-up spawning
// - Disable power-ups entirely with enabled: false
export const gameConfig = {
    // === POWER-UP SETTINGS ===
    powerUps: {
        enabled: true,
        startingScore: 20,          // First power-up spawns at this score
        spawnChance: 1.0,          // Probability of spawning when conditions are met (0.0 to 1.0)
        // Examples:
        spawnInterval: 10,       // Power-ups every 10 points
        customSpawnPoints: [50, 100, 200 ,300], // Extra power-ups at these specific scores
        
        // Cut Time Power-up Settings
        cutTime: {
            enabled: true,
            speedReduction: 0.3,    // Reduce level speed by 0.3x each use (additive reduction)
            maxSpawns: 2,           // Maximum spawns per game
            minScoreForSpawn: 50,   // Minimum score before it can spawn
            spawnChance: 0.1,       // 10% chance when other conditions are met
        },
        
        // Freeze Time Power-up Settings (Power Word Shield)
        freezeTime: {
            enabled: true,
            duration: 120,          // Freeze duration in frames (120 = 2 seconds at 60fps)
            freezeAllProjectiles: true, // Freeze all damage projectiles
        },
    },
    
    // === NOTIFICATION SETTINGS ===
    notifications: {
        enabled: true,
        defaultDuration: 180,       // Default notification duration in frames (3 seconds at 60fps)
        fontSize: 18,               // Font size for notifications
        fadeOutPercent: 0.3,        // Start fading when 30% of time remains
        yOffset: 50,                // Distance from top of screen
        spacing: 50,                // Space between multiple notifications
    },
    
    // === AUDIO SETTINGS ===
    audio: {
        voiceSoundInterval: 10,     // Play voice sound every X collections
        voiceSoundChance: 0.7,      // Chance to play voice sound (70%)
        totalSoundTrigger: 20,      // Play total sound at exactly this many collections
        backgroundMusicStart: 30,   // Start background music at this many collections
        volumes: {
            background: 0.02,       // Background music volume (2%)
            effects: 0.7,           // Sound effects volume (70%)
            fireballImpact: 1.0     // Fireball impact volume (always max)
        }
    },
    
    // === GAMEPLAY SETTINGS ===
    gameplay: {
        maxFallingItems: 4,         // Maximum falling items on screen
        baseDropSpeed: 2,           // Base falling speed
        itemSpawnChance: 0.02,      // Base chance per frame to spawn new item
        maxFireballs: 3,            // Maximum projectiles on screen
        healthLossOnMiss: 1,        // HP lost when missing an item (%)
        particleCount: 15,          // Number of particles per collection
        impactParticleCount: 30,    // Number of particles per fireball impact
        targetFPS: 60,              // Target FPS for speed calculations (normalizes speed across different frame rates)
    },
    
    // === PLAYER SETTINGS ===
    player: {
        startingHealth: 100,
        maxHealth: 100,
        impactDuration: 120,        // Frames to show impact face (120 = ~2 seconds)
        moveSmoothing: 0.15,        // Movement smoothing factor (0.1 = slow, 0.3 = fast)
        celebrationDuration: 120,   // Frames to show celebration for tier set collection (120 = ~2 seconds)
    },
    
    // === LEVEL PROGRESSION ===
    levels: {
        // Point thresholds for each level (doubled to accommodate increased point values)
        thresholds: [0, 40, 100, 140, 200, 260], // Level 1-6 thresholds (doubled)
        // Speed multipliers for each level (tripled from original)
        speedMultipliers: [1.5, 2.5, 3.5, 5.0, 6.5], // Level 1-5 multipliers
        levelBeyond5Increment: 1.0, // Each level beyond 5 adds this much speed (tripled)
        maxSpeedMultiplier: 9.0,   // Cap on speed multiplier (increased)
        initialSpeedMultiplier: 1.2, // Starting speed multiplier when game begins
    },
    
    // === ITEM DROP PROBABILITIES ===
    itemProbabilities: {
        regular: 0.4,               // Regular items base probability (40%)
        epic: 0.05,                 // Epic items base probability (5%)
        special: 0.02,              // Special items base probability (2%)
        legendary: 0.01,            // Legendary items base probability (1%)
        zee_zgnan: 0.002,           // Zee Zgnan items base probability (0.2%) - Ultra rare, one-time only
        tier_set: 0.005,            // Tier set items base probability (0.5%) - Win condition items
    },
    
    // === VISUAL SETTINGS ===
    visuals: {
        itemSize: 120,              // Base size of falling items (multiplied by each item's size_multiplier)
        powerUpItemSize: 120,       // Size of power-up items (width & height)
        playerWidth: 85,
        playerHeight: 165,
        playerSpeed: 12,
        minYSpacing: 250,           // Minimum spacing between falling objects
        forceItemAspectRatio: true, // Force square aspect ratio for all items
        // NOTE: Individual items can have size_multiplier property (default 1.0)
        // Examples: size_multiplier: 1.5 = 50% larger, size_multiplier: 2.0 = double size
    }
};

// High Scores System Configuration
export const HIGH_SCORES_KEY = 'efto_high_scores';
export const MAX_HIGH_SCORES = 100; 