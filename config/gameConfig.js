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
    // === CANVAS SETTINGS ===
    canvas: {
        // Device-specific canvas dimensions for consistent gameplay experience
        // All scaling is based on playable area (bottom 30% for player movement)
        
        desktop: {
            width: 1600,            // Desktop canvas width (16:9 aspect ratio)
            height: 900,            // Desktop canvas height (16:9 aspect ratio)
            aspectRatio: 1600/900,  // True 16:9 aspect ratio (1.778)
            playableWidth: 1600,    // Full width is playable
            playableHeight: 900 * 0.3, // Bottom 30% for player movement (270px)
        },
        
        tablet: {
            width: 1024,            // Tablet canvas width
            height: 768,            // Tablet canvas height (4:3 aspect ratio)
            aspectRatio: 4/3,       // Classic 4:3 aspect ratio
            playableWidth: 1024,    // Full width is playable
            playableHeight: 768 * 0.3, // Bottom 30% for player movement (230px)
        },
        
        mobile: {
            width: 720,             // Mobile canvas width (portrait)
            height: 1280,           // Mobile canvas height (portrait)
            aspectRatio: 720/1280,  // Portrait aspect ratio (~0.56)
            playableWidth: 720,     // Full width is playable
            playableHeight: 1280 * 0.3, // Bottom 30% for player movement (384px)
        },
        
        // Device detection thresholds
        deviceDetection: {
            mobileMaxWidth: 768,    // Devices <= 768px width are mobile
            tabletMaxWidth: 1366,   // Devices <= 1366px width are tablet
            // Anything larger is desktop
            
            // Additional mobile detection
            mobileUserAgents: ['Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'IEMobile', 'Opera Mini'],
            tabletMinDiagonal: 7,   // Minimum diagonal inches for tablet classification
        },
        
        // Scaling behavior
        scaling: {
            enabled: true,          // Enable intelligent scaling to fit different screen sizes
            maintainAspectRatio: true, // Always maintain the target aspect ratio
            scaleToFit: true,       // Scale canvas to fit screen while maintaining aspect ratio
            centerCanvas: true,     // Center the canvas on the screen
            
            // Playable area based scaling (THE KING 👑)
            usePlayableAreaScaling: true, // Base all item/UI scaling on playable area dimensions
            basePlayableArea: {     // Reference playable area for scaling calculations
                width: 1600,        // Desktop playable width (reference)
                height: 270,        // Desktop playable height (900 * 0.3)
            },
            
            // Letterboxing/Pillarboxing settings
            letterboxColor: '#000000', // Color for letterbox bars (black)
            showLetterboxInfo: false,  // Show debug info about letterboxing
        },
        
        // High-DPI display support
        highDPI: {
            enabled: true,          // Enable high-DPI support for crisp rendering
            maxPixelRatio: 2,       // Maximum device pixel ratio to use (prevents performance issues)
            autoDetect: true,       // Automatically detect device pixel ratio
        }
    },
    
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
        baseMinSpawnInterval: 12,  // Base minimum seconds between power-up spawns (level 1)
        baseMaxSpawnInterval: 20,  // Base maximum seconds between power-up spawns (level 1)
        levelScaling: 0.90,        // Multiplier per level (0.90 = 10% faster each level)
        minAbsoluteInterval: 3,    // Absolute minimum spawn interval (prevents too frequent spawning)
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
        baseDropSpeed: 2,           // Base falling speed (pixels per frame at 60fps)
        itemSpawnChance: 0.01,      // Base chance per frame to spawn new item (reduced from 0.02)
        maxFireballs: 3,            // Maximum projectiles on screen
        healthLossOnMiss: 2,        // HP lost when missing an item (%)
        particleCount: 15,          // Number of particles per collection
        impactParticleCount: 30,    // Number of particles per fireball impact
        targetFPS: 60,              // Target FPS for speed calculations (normalizes speed across different frame rates)
        
        // Resolution and frame rate independence settings
        independence: {
            enabled: true,              // Enable resolution/frame rate independence
            referenceWidth: 1920,       // Reference screen width for scaling calculations
            referenceHeight: 810,       // Reference screen height for scaling calculations
            scaleWithResolution: true,  // Scale speeds/sizes based on resolution
            minResolutionScale: 0.7,    // Minimum resolution scaling factor (increased from 0.5)
            maxResolutionScale: 1.3,    // Maximum resolution scaling factor (reduced from 2.0 for playability)
            normalizeToReference: true  // Normalize all measurements to reference resolution
        },
        
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
    
    // === GAME MODES ===
    gameModes: {
        easy: {
            name: "Easy Mode",
            description: "Slower progression, more forgiving gameplay",
            modifiers: {
                levelProgressionSpeed: 0.7,     // 30% slower level progression
                itemSpawnRate: 0.8,             // 20% fewer items
                projectileSpawnRate: 0.6,       // 40% fewer projectiles
                projectileSpeed: 0.8,           // 20% slower projectiles
                healthLossReduction: 0.7,       // 30% less health loss
                powerUpSpawnRate: 1.3,          // 30% more power-ups
                critChanceBonus: 0.05           // +5% crit chance
            }
        },
        normal: {
            name: "Normal Mode", 
            description: "Standard difficulty and progression",
            modifiers: {
                levelProgressionSpeed: 1.0,     // Normal progression
                itemSpawnRate: 1.0,             // Normal item spawns
                projectileSpawnRate: 1.0,       // Normal projectiles
                projectileSpeed: 1.0,           // Normal speed
                healthLossReduction: 1.0,       // Normal health loss
                powerUpSpawnRate: 1.0,          // Normal power-ups
                critChanceBonus: 0.0            // No bonus
            }
        },
        hard: {
            name: "Hard Mode",
            description: "Faster progression, more challenging gameplay", 
            modifiers: {
                levelProgressionSpeed: 1.4,     // 40% faster level progression
                itemSpawnRate: 1.3,             // 30% more items
                projectileSpawnRate: 1.5,       // 50% more projectiles
                projectileSpeed: 1.2,           // 20% faster projectiles
                healthLossReduction: 1.3,       // 30% more health loss
                powerUpSpawnRate: 0.7,          // 30% fewer power-ups
                critChanceBonus: -0.02          // -2% crit chance
            }
        }
    },
    
    // === LEVEL PROGRESSION ===
    levels: {
        // === TESTING CONFIGURATION ===
        startingLevel: 1,                  // Starting level for testing (1 = normal 1.6x, 10 = ~4.3x speed, 15 = ~6.3x speed)
        
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
        
        // Mathematical formula for speed progression (balanced)
        formulaBase: 1.2,           // Starting speed at level 0
        maxLevelSpeedMultiplier: 22.0,    // Maximum level speed multiplier (aggressive progression to 22X)
        
        // === UNLIMITED PROGRESSION SETTINGS ===
        enableSafetyCap: true,      // Enable safety cap to prevent extreme performance issues
        safetyCap: 22.0,            // Maximum speed multiplier (22x) - aggressive progression cap
        
        // Formula tuning parameters
        formulaWeights: {
            linear: 0.3,            // Linear component weight (increased for steady growth)
            quadratic: 0.1,         // Quadratic component weight (increased for smoother acceleration)
            exponential: 0.2,       // Exponential component weight (reduced for slower late-game explosion)
            exponentialBase: 1.1    // Base for exponential component (reduced for more gradual growth)
        },
        
        // Points-based level thresholds (more gradual progression)
        thresholds: [0, 30, 80, 150, 240, 350, 480, 630, 800, 1000, 1220, 1460, 1720, 2000, 2300, 2620, 2960, 3320, 3700, 4100],
    },
    
    // === DRAGONSTALKER SET COMPLETION ===
    dragonstalker: {
        speedReductionPercent: 0.15,    // 15% speed reduction per completion (reduced from 30% to preserve bullet time access)
        minSpeedAfterReduction: 0.2,    // Minimum speed multiplier after all reductions
        enableMultipleCompletions: true, // Allow collecting sets multiple times
        maxSpeedReduction: 2.0,         // Cap total speed reduction to preserve bullet time access (22x - 2x = 20x minimum)
        preserveBulletTimeAccess: true  // Ensure players can still reach bullet time trigger speed
    },
    
    // === BULLET TIME SYSTEM ===
    bulletTime: {
        enabled: true,                  // Enable bullet time at high speeds
        triggerSpeed: 20.0,             // Speed at which bullet time activates (20x)
        timeDilation: 0.85,             // Time moves at 85% normal speed during bullet time (less effect)
        visualEffects: {
            enabled: true,              // Enable visual effects during bullet time
            borderGlow: true,           // Add pulsating border glow only
            glowColor: '#4DA6FF',       // Blue border color
            glowIntensity: 0.6,         // Border glow intensity
            pulseSpeed: 0.15,           // How fast the border pulses
            focusIndicator: true,       // Show "FOCUS MODE" indicator
            screenTint: false,          // Disable screen tint
            edgeGlow: false,            // Disable edge glow effects
            particleTrails: false       // Disable enhanced particle trails
        }
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
        itemSize: 80,              // Base size of falling items (multiplied by each item's size_multiplier)
        powerUpItemSize: 120,       // Size of power-up items (width & height)
        playerWidth: 85,
        playerHeight: 165,
        playerSpeed: 12,                // Base player speed (will be scaled by resolution)
        minYSpacing: 250,           // Minimum spacing between falling objects
        forceItemAspectRatio: true, // Force square aspect ratio for all items
        // NOTE: Individual items can have size_multiplier property (default 1.0)
        // Examples: size_multiplier: 1.5 = 50% larger, size_multiplier: 2.0 = double size
    },
    
    // === DEBUG SETTINGS ===
    debug: {
        logScalingConstraints: false,  // Log when images are constrained by AssetManager
        showAssetDimensions: false,    // Show original vs scaled dimensions in console
        logPerformanceMetrics: false,  // Log rendering performance metrics
    },
    
    // === UI POSITIONING & LAYOUT ===
    ui: {
        // Safe area margins to prevent UI elements from touching screen edges
        safeAreaMargin: 20,          // Minimum distance from viewport edges (pixels)
        panelMargin: 30,             // Extra margin for info panels (pixels)
        responsiveMargin: true,      // Scale margins with canvas scale factor
        
        // Panel positioning
        leftPanel: {
            marginLeft: 25,          // Left panel margin from game area edge
            marginTop: 20,           // Top margin for left panel
        },
        
        rightPanel: {
            marginRight: 25,         // Right panel margin from game area edge  
            marginTop: 20,           // Top margin for right panel
        }
    },
    
    // === ITEM RENDERING QUALITY ===
    items: {
        // High-DPI rendering settings
        highDPI: {
            enabled: true,           // Enable high-DPI item rendering
            multiplier: 1.0,         // Conservative scaling (1.0 = no extra scaling, just DPI awareness)
            minPixelSize: 32,        // Reduced minimum item size
            crispRendering: false,   // DISABLED: Pixel-perfect rendering causes tearing during rotation
        },
        
        // Image quality settings optimized for rotation
        imageQuality: {
            smoothing: true,         // Enable image smoothing (essential for rotation)
            quality: 'high',         // Image smoothing quality ('low', 'medium', 'high')
            sharpScaling: false,     // Use smooth scaling for rotation
        },
        
        // Size constraints
        sizing: {
            respectMinimumSize: false, // Don't enforce minimum sizes to avoid over-scaling
            scaleWithDPI: false,      // Disable DPI scaling to keep original sizes
            maintainAspectRatio: true, // Always maintain original aspect ratios
        }
    },
};

// High Scores System Configuration
export const HIGH_SCORES_KEY = 'dmtribut_high_scores';
export const MAX_HIGH_SCORES = 100; 