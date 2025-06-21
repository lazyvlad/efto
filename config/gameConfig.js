import { serverConfig } from './serverConfig.js';

// ===== GAME VERSION & CACHE BUSTING =====
// Update this version number whenever you deploy changes to force cache refresh
export const GAME_VERSION = "1.2.3";
export const BUILD_TIMESTAMP = 1734457800000; // Will be set during build/deployment

// Cache busting configuration
export const cacheConfig = {
    // Enable aggressive cache busting for mobile devices
    enableCacheBusting: true,
    
    // Version-based cache busting (increment version to force refresh)
    useVersionedUrls: true,
    
    // Timestamp-based cache busting (always forces refresh)
    useTimestampUrls: false, // Set to true for development, false for production
    
    // Cache control settings
    cacheControl: {
        // How long browsers should cache assets (in seconds)
        maxAge: 300, // 5 minutes for production
        
        // Force revalidation with server
        mustRevalidate: true,
        
        // Disable caching entirely for HTML files
        noCache: ['html', 'json']
    }
};

// ===== GAME CONFIGURATION OBJECT =====
// 🎮 Modify these values to customize your game experience!
// 
// QUICK EXAMPLES:
// - Change baseMinSpawnInterval to 5 for more frequent base power-ups (every 5-15 seconds at level 1)
// - Change levelScaling to 0.9 for slower scaling (10% faster per level instead of 15%)
// - Change minAbsoluteInterval to 1 for faster high-level spawning (minimum 1 second)
// - Increase maxPowerUps to 3 for more power-ups on screen
// - Disable power-ups entirely with enabled: false
export const gameConfig = {
    // === API SETTINGS ===
    // NOTE: API settings are now loaded from serverConfig.js
    // This allows easy modification on production servers without changing this file
    api: {
        basePath: serverConfig.basePath,
        endpoints: serverConfig.endpoints
    },
    
    // === POWER-UP SETTINGS ===
    powerUps: {
        enabled: true,
        maxPowerUps: 2,            // Maximum power-ups on screen at once
        baseMinSpawnInterval: 8,   // Base minimum seconds between power-up spawns (level 1)
        baseMaxSpawnInterval: 15,  // Base maximum seconds between power-up spawns (level 1)
        levelScaling: 0.85,        // Multiplier per level (0.85 = 15% faster each level)
        minAbsoluteInterval: 2,    // Absolute minimum spawn interval (prevents too frequent spawning)
        spawnChance: 1.0,          // 100% chance when timer triggers (deterministic timing)
        
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
        backgroundMusicStart: 30,   // Start background music at this many collections
        volumes: {
            background: 0.02,       // Background music volume (2%)
            effects: 0.7,           // Sound effects volume (70%)
            fireballImpact: 1.0     // Fireball impact volume (always max)
        }
    },
    
    // === GAMEPLAY SETTINGS ===
    gameplay: {
        maxFallingItems: 6,         // Maximum falling items on screen
        baseDropSpeed: 2,           // Base falling speed
        itemSpawnChance: 0.01,      // Base chance per frame to spawn new item (reduced from 0.02)
        maxFireballs: 3,            // Maximum projectiles on screen
        healthLossOnMiss: 2,        // HP lost when missing an item (%)
        particleCount: 15,          // Number of particles per collection
        impactParticleCount: 30,    // Number of particles per fireball impact
        targetFPS: 60,              // Target FPS for speed calculations (normalizes speed across different frame rates)
        
        // Mobile-specific optimizations for high refresh rate devices
        mobile: {
            maxRefreshRateMultiplier: 1.2,  // Maximum speed boost allowed from high refresh rates
            refreshRateSmoothing: 0.8,      // How much to smooth delta time (0-1, higher = more smoothing)
            minDeltaTime: 8,                // Minimum delta time in ms (prevents too-fast updates)
            maxDeltaTime: 33                // Maximum delta time in ms (prevents stutter)
        },
        
        // === FALL ANGLE SETTINGS ===
        fallAngles: {
            maxAngleVariation: 90,  // Maximum angle variation in degrees (-45 to +45 degrees)
            minAngle: -45,          // Minimum fall angle in degrees (negative = left)
            maxAngle: 45,           // Maximum fall angle in degrees (positive = right)
            allowUpwardMovement: true, // Allow angles > 90 degrees for upward movement
            upwardAngleMin: 135,    // Minimum upward angle (135° = up-left)
            upwardAngleMax: 225,    // Maximum upward angle (225° = up-right)
        },
    },
    
    // === PLAYER SETTINGS ===
    player: {
        startingHealth: 100,
        maxHealth: 100,
        impactDuration: 120,        // Frames to show impact face (120 = ~2 seconds)
        moveSmoothing: 0.15,        // Movement smoothing factor (0.1 = slow, 0.3 = fast)
        celebrationDuration: 120,   // Frames to show celebration for tier set collection (120 = ~2 seconds)
        
        // === MOVABLE AREA SETTINGS ===
        movableArea: {
            enabled: true,          // Enable movement constraints
            heightPercent: 0.3,     // Player can move in bottom 30% of canvas
            showBorder: true,       // Show visual border of movable area
            borderColor: '#4ECDC4', // Border color (cyan)
            borderOpacity: 0.3,     // Border opacity (30%)
            borderWidth: 2,         // Border line thickness
        }
    },
    
    // === LEVEL PROGRESSION ===
    levels: {
        // === HYBRID TIME + ACTIVITY PROGRESSION ===
        progressionType: "hybrid",          // "hybrid", "time", "points", or "events"
        baseTimePerLevel: 35,               // Base time requirement per level (seconds)
        
        // Activity bonuses/penalties
        activityBonus: {
            collectionsReduce: 3,           // Each collection reduces time by 3 seconds (increased from 2)
            missesIncrease: 1,              // Each miss increases time by 1 second
            maxReduction: 20,               // Max time reduction per level (67% faster, increased from 15)
            maxIncrease: 8,                 // Max time increase per level (27% slower, reduced from 10)
            powerUpCollectedReduce: 4,      // Power-up collection reduces time by 4 seconds (increased from 3)
            damageReceivedIncrease: 0.3     // Each damage point increases time by 0.3 seconds (reduced from 0.5)
        },
        
        // Mathematical formula for speed progression (same as before)
        formulaBase: 1.2,           // Starting speed at level 0
        maxLevelSpeedMultiplier: 26.0,    // Maximum level speed multiplier (capped at 26X)
        
        // === UNLIMITED PROGRESSION SETTINGS ===
        enableSafetyCap: true,      // Enable safety cap to prevent extreme performance issues
        safetyCap: 26.0,            // Maximum speed multiplier (26x) - prevents game from becoming unplayable
        
        // Formula tuning parameters
        formulaWeights: {
            linear: 0.25,           // Linear component weight (steady growth)
            quadratic: 0.08,        // Quadratic component weight (accelerating growth)
            exponential: 0.5,       // Exponential component weight (rapid late-game growth)
            exponentialBase: 1.25   // Base for exponential component (higher = faster growth)
        },
        
        // Legacy point-based thresholds (kept for fallback compatibility)
        thresholds: [0, 40, 100, 140, 200, 260, 350, 500, 700, 1000, 1400, 2000],
    },
    
    // === DRAGONSTALKER SET COMPLETION ===
    dragonstalker: {
        speedReductionPercent: 0.3,     // 40% speed reduction per completion (0.0 to 1.0)
        minSpeedAfterReduction: 0.2,    // Minimum speed multiplier after all reductions
        enableMultipleCompletions: true // Allow collecting sets multiple times
    },
    
    // === ITEM DROP PROBABILITIES ===
    itemProbabilities: {
        regular: 0.4,               // Regular items base probability (40%)
        green: 0.2,                // Green items base probability (20%)    
        epic: 0.1,                 // Epic items base probability (10%)
        tier_set: 0.055,            // Tier set items base probability (5.5%) - Win condition items
        special: 0.032,              // Special items base probability (3.2%)
        legendary: 0.02,            // Legendary items base probability (2%)
        zee_zgnan: 0.01,           // Zee Zgnan items base probability (1%) - Ultra rare, one-time only
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
export const HIGH_SCORES_KEY = 'dmtribut_high_scores';
export const MAX_HIGH_SCORES = 100; 