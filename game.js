// ===== GAME CONFIGURATION OBJECT =====
// 🎮 Modify these values to customize your game experience!
// 
// QUICK EXAMPLES:
// - Change spawnInterval to 20 for power-ups every 20 points instead of 30
// - Add customSpawnPoints: [15, 45, 87] for bonus power-ups at those exact scores
// - Set spawnChance to 0.5 for 50% chance of power-up spawning
// - Disable power-ups entirely with enabled: false
const gameConfig = {
    // === POWER-UP SETTINGS ===
    powerUps: {
        enabled: true,
        startingScore: 20,          // First power-up spawns at this score
        spawnChance: 1.0,          // Probability of spawning when conditions are met (0.0 to 1.0)
        // Examples:
        spawnInterval: 20,       // Power-ups every 20 points
        customSpawnPoints: [50, 100, 200 ,300], // Extra power-ups at these specific scores
        // spawnChance: 0.8,        // 80% chance to spawn when conditions are met
        
        // Cut Time Power-up Settings
        cutTime: {
            enabled: true,
            speedReduction: 0.3,    // Reduce speed by 30% each use (0.3 = 30%)
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
    },
    
    // === LEVEL PROGRESSION ===
    levels: {
        // Point thresholds for each level
        thresholds: [0, 20, 50, 70, 100, 130], // Level 1-6 thresholds
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

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas to fullscreen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Handle window resize to maintain fullscreen
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reposition player if needed
    if (typeof player !== 'undefined' && player.repositionOnResize) {
        player.repositionOnResize(canvas.width, canvas.height);
    }
});

// Player Class - Encapsulates all player functionality
class Player {
    constructor(canvasWidth, canvasHeight) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight - 180;
        this.width = gameConfig.visuals.playerWidth;
        this.height = gameConfig.visuals.playerHeight;
        this.speed = gameConfig.visuals.playerSpeed;
        
        // Visual state management
        this.impactTimer = 0; // Timer for showing impact reaction
        this.impactDuration = gameConfig.player.impactDuration;
        
        // Image management
        this.normalImage = new Image();
        this.impactImage = new Image();
        this.normalImage.src = 'assets/efto.png';
        this.impactImage.src = 'assets/vano.png';
        
        // State
        this.isReacting = false;
    }
    
    // Handle getting hit by projectiles
    onHit() {
        this.impactTimer = this.impactDuration;
        this.isReacting = true;
    }
    
    // Update player state
    update(targetX, targetY, canvasWidth, canvasHeight) {
        // Smooth mouse following (frame rate normalized)
        const distance = targetX - this.x;
        const normalizedSmoothing = gameConfig.player.moveSmoothing * gameState.deltaTimeMultiplier;
        this.x += distance * Math.min(normalizedSmoothing, 1.0); // Cap at 1.0 to prevent overshooting
        
        // Keep player within bounds
        this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));
        
        // Update impact timer (frame rate normalized)
        if (this.impactTimer > 0) {
            this.impactTimer -= gameState.deltaTimeMultiplier;
            if (this.impactTimer <= 0) {
                this.isReacting = false;
            }
        }
    }
    
    // Draw the player
    draw(ctx) {
        const imageToUse = this.isReacting ? this.impactImage : this.normalImage;
        
        // Check if image is loaded and draw
        if (imageToUse && imageToUse.complete && imageToUse.naturalWidth > 0) {
            ctx.drawImage(imageToUse, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: draw a simple rectangle
            ctx.fillStyle = this.isReacting ? '#FF6B6B' : '#4ECDC4';
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    
    // Get collision bounds
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Handle window resize
    repositionOnResize(canvasWidth, canvasHeight) {
        this.x = Math.min(this.x, canvasWidth - this.width);
        this.y = canvasHeight - 180;
    }
    
    // Check if images are loaded
    areImagesLoaded() {
        return this.normalImage.complete && this.normalImage.naturalWidth > 0 &&
               this.impactImage.complete && this.impactImage.naturalWidth > 0;
    }
}

// Game state
let gameState = {
    score: 0,
    missedItems: 0,
    gameRunning: false,  // Start as false until name is entered
    gamePaused: false,   // Add pause state
    speedMultiplier: gameConfig.levels.initialSpeedMultiplier,
    perfectCollections: 0,
    baseDropSpeed: gameConfig.gameplay.baseDropSpeed,

    health: gameConfig.player.startingHealth,
    maxHealth: gameConfig.player.maxHealth,
    showSettings: false,  // Toggle for settings screen
    gameStartTime: Date.now(),  // Track when game started
    elapsedTime: 0,  // Track elapsed time in seconds
    // Level system
    currentLevel: 1,
    levelSpeedMultiplier: 1, // Fixed speed multiplier for current level
    // Power-up effects
    timeSlowActive: false,
    timeSlowTimer: 0,
    timeSlowMultiplier: 1.0,
    lastPowerUpScore: 0, // Track last score when power-up was spawned
    
    // Freeze time effects
    freezeTimeActive: false,
    freezeTimeTimer: 0,
    
    // Speed increase effects (from speed boost projectiles)
    speedIncreaseActive: false,
    speedIncreaseTimer: 0,
    speedIncreaseMultiplier: 1.0,
    currentSpeedIncreasePercent: 0, // For display purposes
    
    // Cut time tracking
    cutTimeSpawned: 0,  // Track how many cut_time power-ups have spawned
    permanentSpeedReduction: 1.0, // Permanent speed multiplier from cut_time effects
    
    // Tier Set tracking
    tierSetCollected: 0,  // Number of tier set pieces collected
    tierSetMissed: 0,     // Number of tier set pieces missed (makes game unwinnable)
    gameWon: false,       // Track if player has won
    gameUnwinnable: false, // Track if game can no longer be won
    
    // Player info
    playerName: '',
    
    // UI state
    menuButtonBounds: null, // For click detection on settings screen buttons
    pauseMenuBounds: null,  // For click detection on pause menu buttons
    
    // FPS tracking
    fpsCounter: 0,
    fpsLastTime: Date.now(),
    fpsFrameCount: 0,
    
    // Frame rate normalization
    lastFrameTime: Date.now(),
    deltaTimeMultiplier: 1.0, // Multiplier to normalize speed based on actual vs target FPS
};

// High Scores System
const HIGH_SCORES_KEY = 'efto_high_scores';
const MAX_HIGH_SCORES = 100;

// Create player instance
const player = new Player(canvas.width, canvas.height);

// Items database with structured data
const gameItems = [
    
    
    
    { id: "ring1", name: "Ring 1", image: "items/ring1.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "ring2", name: "Ring2", image: "items/ring2.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "ring3", name: "Ring3", image: "items/ring3.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 0.8 },
    { id: "gold", name: "Gold", image: "items/gold.png", value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 1 },
    { id: "cloak", name: "Cloak", image: "items/7.png", value: 2, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "", size_multiplier: 1 },
    { id: "ashjrethul", name: "Ashjrethul", image: "items/4.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 2 },
    { id: "maladath", name: "Maladath", image: "items/maladath.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 2.5 },
    { id: "ashkandi", name: "Ashkandi", image: "items/2.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 2 },
    { id: "ashkandi2", name: "Another Ashkandi", image: "items/ashkandi.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1 },
    { id: "quick-strike-ring", name: "Quick Strike Ring", image: "items/quick-strike-ring.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 0.8 },
    { id: "brutality_blade", name: "Brutality Blade", image: "items/3.png", value: 6, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1.8 },
    { id: "dalrends", name: "Dal Rends", image: "items/dalrends.png", value: 5, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "", size_multiplier: 1.8 },  
    { id: "crulshorukh", name: "Crulshorukh", image: "items/6.png", value: 7, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 2.4 },
    { id: "drakefangtalisman", name: "Drake Fang Talisman", image: "items/dft.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1.7 },
    { id: "onslaught", name: "Onslaught", image: "items/onslaught.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "", size_multiplier: 1},
    { id: "ThunderFury", name: "Thunder Fury", image: "items/tunder.png", value: 5, collected: 0, type: "legendary", baseProbability: gameConfig.itemProbabilities.legendary, sound: "", size_multiplier: 2.8 },
    { id: "zee", name: "Zee Zgnan Tigar", image: "items/zee.png", value: 15, collected: 0, spawned: 0, type: "zee_zgnan", baseProbability: gameConfig.itemProbabilities.zee_zgnan, sound: "", size_multiplier: 2.0 },
    
    // TIER SET ITEMS - Collect all 8 to win the game! (One chance only - missing any piece makes victory impossible)
    { id: "ds_helm", name: "Dragonstalker's Helm", image: "items/dshelm.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 1, size_multiplier: 1 },
    { id: "ds_shoulders", name: "Dragonstalker's Spaulders", image: "items/dsshoulders.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 2, size_multiplier: 1 },
    { id: "ds_chest", name: "Dragonstalker's Breastplate", image: "items/dschest.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 3, size_multiplier: 1 },
    { id: "ds_bracers", name: "Dragonstalker's Bracers", image: "items/dsbracers.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 4, size_multiplier: 1 },
    { id: "ds_gloves", name: "Dragonstalker's Gauntlets", image: "items/dshands.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 5, size_multiplier: 1 },
    { id: "ds_belt", name: "Dragonstalker's Belt", image: "items/dsbelt.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 6, size_multiplier: 1 },
    { id: "ds_legs", name: "Dragonstalker's Legguards", image: "items/dslegs.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 7, size_multiplier: 1 },
    { id: "ds_boots", name: "Dragonstalker's Greaves", image: "items/dsboots.png", value: 6, collected: 0, missed: 0, type: "tier_set", baseProbability: gameConfig.itemProbabilities.tier_set, sound: "", setPosition: 8, size_multiplier: 1 }
];

// Damage projectiles database with structured data
const damageProjectiles = [
    // Common damage projectiles - Higher probability, less damage
    { 
        id: "fireball", 
        name: "Fireball", 
        image: "assets/fireball.png", 
        damage: 5, // 5% HP damage
        type: "common", 
        baseProbability: 0.025, 
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
        baseProbability: 0.020, 
        sound: "assets/speedboost.mp3",
        speed: { min: 1.5, max: 2.5 }, // Reduced from 2.0-4.0 for better balance
        size: { width: 100, height: 100 },
        color: "#FF0000",
        effects: "speed_increase",
        speedIncreaseOptions: [10, 20, 30] // Possible percentage increases
    },
    
    // Rare damage projectiles - Lower probability, more damage
    { 
        id: "frostbolt", 
        name: "Frostbolt", 
        image: "assets/frostbolt.png", 
        damage: 10, // 10% HP damage
        type: "rare", 
        baseProbability: 0.008, 
        sound: "assets/frostimpact.mp3",
        speed: { min: 0.8, max: 1.8 }, // Reduced from 1.0-3.0 for better balance
        size: { width: 90, height: 90 },
        color: "#00BFFF",
        effects: "freeze"
    }
];

// Helpful power-up items database
const powerUpItems = [
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
        id: "power_word_shield",
        name: "Power Word Shield",
        image: "assets/powerwordshield.jpg",
        effect: "freeze_time",
        value: 0, // No direct value, creates protective effect
        duration: 360, // Duration in frames (2 seconds at 60fps) - configurable via gameConfig
        type: "utility",
        color: "#87CEEB",
        sound: "assets/shield_cast.mp3",
        description: "Freezes all projectiles",
        baseProbability: 0.15, // Base 15% chance when conditions are met
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

// Arrays for game objects
let fallingItems = [];
let fireballs = [];
let particles = [];


let activePowerUps = [];  // Active power-up items

// Track recent Y positions for spacing
let recentDropYPositions = [];

// Images (removed player and vano - now handled by Player class)
const images = {
    items: [],
    fireball: new Image()    // Now using fireball.png
};

// Audio
const sounds = {
    voice: new Audio('assets/voice.mp3'),
    scream: new Audio('assets/scream.mp3'),
    uff: new Audio('assets/uff.mp3'),      // New sound for missed items
    total: new Audio('assets/total.mp3'),   // New sound for 20 collections
    background: new Audio('assets/background.mp3'),  // Background music
    smukajte: new Audio('assets/SMUKAJTE.mp3'),     // 33 collections
    ohoo: new Audio('assets/ohoo.mp3'),              // 66 collections
    nakoj: new Audio('assets/nakoj.mp3'),            // 99 collections
    roll: new Audio('assets/roll.mp3'),               // 130 collections
    fireballimpact: new Audio('assets/fireballimpact.mp3'),  // Very loud fireball impact sound
    wegotit2: new Audio('assets/weGotIt2.mp3')       // Dragonstalker item collected sound
};

// Set up background music
sounds.background.loop = true;
sounds.background.volume = 0;  // Start muted

// Volume settings (now using config) - Start muted
let volumeSettings = {
    background: 0,  // Start muted
    effects: 0      // Start muted
};

// Audio state management - Start muted by default
let audioState = {
    isMuted: true,  // Start muted
    previousVolumes: {
        background: gameConfig.audio.volumes.background,
        effects: gameConfig.audio.volumes.effects
    }
};

// Load item images (2.png to 8.png)
for (let i = 2; i <= 8; i++) {
    const img = new Image();
    img.src = `items/${i}.png`;
    images.items.push(img);
}

// Load fireball image
images.fireball.src = 'assets/fireball.png';

// Mouse input handling
let mouseX = canvas.width / 2;
let mouseY = canvas.height / 2;

document.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = e.clientX - rect.left;
    mouseY = e.clientY - rect.top;
});

// Mouse click handling for settings screen buttons
document.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Handle settings screen buttons
    if (gameState.showSettings && !gameState.gameRunning && gameState.menuButtonBounds) {
        // Check if click is on the "Back to Menu" button
        if (clickX >= gameState.menuButtonBounds.x && 
            clickX <= gameState.menuButtonBounds.x + gameState.menuButtonBounds.width &&
            clickY >= gameState.menuButtonBounds.y && 
            clickY <= gameState.menuButtonBounds.y + gameState.menuButtonBounds.height) {
            gameState.showSettings = false;
            showNameEntry();
        }
    }
    
    // Handle pause menu buttons
    if (gameState.gamePaused && gameState.pauseMenuBounds) {
        const continueBtn = gameState.pauseMenuBounds.continue;
        const restartBtn = gameState.pauseMenuBounds.restart;
        
        // Check continue button
        if (clickX >= continueBtn.x && clickX <= continueBtn.x + continueBtn.width &&
            clickY >= continueBtn.y && clickY <= continueBtn.y + continueBtn.height) {
            togglePause(); // Resume game
        }
        
        // Check restart button
        if (clickX >= restartBtn.x && clickX <= restartBtn.x + restartBtn.width &&
            clickY >= restartBtn.y && clickY <= restartBtn.y + restartBtn.height) {
            pauseAndRestart();
        }
    }
});

// Also handle touch for mobile devices
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
});

// Touch handling for settings screen buttons
document.addEventListener('touchend', (e) => {
    const rect = canvas.getBoundingClientRect();
    const touch = e.changedTouches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    // Handle settings screen buttons
    if (gameState.showSettings && !gameState.gameRunning && gameState.menuButtonBounds) {
        e.preventDefault();
        
        // Check if touch is on the "Back to Menu" button
        if (touchX >= gameState.menuButtonBounds.x && 
            touchX <= gameState.menuButtonBounds.x + gameState.menuButtonBounds.width &&
            touchY >= gameState.menuButtonBounds.y && 
            touchY <= gameState.menuButtonBounds.y + gameState.menuButtonBounds.height) {
            gameState.showSettings = false;
            showNameEntry();
        }
    }
    
    // Handle pause menu buttons
    if (gameState.gamePaused && gameState.pauseMenuBounds) {
        e.preventDefault();
        const continueBtn = gameState.pauseMenuBounds.continue;
        const restartBtn = gameState.pauseMenuBounds.restart;
        
        // Check continue button
        if (touchX >= continueBtn.x && touchX <= continueBtn.x + continueBtn.width &&
            touchY >= continueBtn.y && touchY <= continueBtn.y + continueBtn.height) {
            togglePause(); // Resume game
        }
        
        // Check restart button
        if (touchX >= restartBtn.x && touchX <= restartBtn.x + restartBtn.width &&
            touchY >= restartBtn.y && touchY <= restartBtn.y + restartBtn.height) {
            pauseAndRestart();
        }
    }
});

// Keyboard controls for settings
document.addEventListener('keydown', (e) => {
    // Check if name entry screen is visible (disable shortcuts during name input)
    const nameEntryVisible = document.getElementById('nameEntry').style.display !== 'none';
    
    if (!nameEntryVisible && (e.key === 'Tab' || e.key === 'i' || e.key === 'I')) {
        e.preventDefault();
        // Only toggle settings if game is not running or is paused
        if (!gameState.gameRunning || gameState.gamePaused) {
            gameState.showSettings = !gameState.showSettings;
        }
    }
    if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState.showSettings) {
            gameState.showSettings = false;
            // If game isn't running, return to name entry
            if (!gameState.gameRunning) {
                showNameEntry();
            }
        } else if (gameState.gameRunning) {
            // Toggle pause when game is running
            togglePause();
        }
    }
});

// Function to check if Y position is valid (not too close to other items)
function isValidYPosition(y) {
    const MIN_Y_SPACING = gameConfig.visuals.minYSpacing;
    
    // Clean up old positions (items that have fallen past screen)
    recentDropYPositions = recentDropYPositions.filter(pos => pos > -500);
    
    // Check against all recent positions
    for (let pos of recentDropYPositions) {
        if (Math.abs(y - pos) < MIN_Y_SPACING) {
            return false;
        }
    }
    return true;
}

// Calculate dynamic probability based on various game mechanics (not time-based)
function calculateItemProbability(item) {
    // Handle items with 0 base probability (milestone triggers)
    if (item.baseProbability === 0) {
        return 0; // These should only spawn via special logic
    }
    
    let finalProbability = item.baseProbability;
    
    // STREAK MECHANIC: Missing items increases rare drop chance
    if (gameState.missedItems > 0) {
        const missedBonus = Math.min(gameState.missedItems * 0.002, 0.05); // Max 5% bonus
        if (item.baseProbability === 0.01) {
            finalProbability += missedBonus * 3; // Ultra rare items get 3x bonus from missed items
        } else {
            finalProbability += missedBonus;
        }
    }
    
    // COLLECTION DROUGHT MECHANIC: No rare drops recently increases chance
    const recentRareCollections = gameItems
        .filter(gameItem => gameItem.baseProbability === 0.01 && gameItem.collected > 0)
        .reduce((sum, gameItem) => sum + gameItem.collected, 0);
    
    if (recentRareCollections === 0 && gameState.perfectCollections > 10) {
        // No rare items collected yet but player has collected 10+ items
        const droughtBonus = Math.min(gameState.perfectCollections * 0.001, 0.03); // Max 3% bonus
        if (item.baseProbability === 0.01) {
            finalProbability += droughtBonus * 2; // Double bonus for ultra rare
        }
    }
    
    // PERFECT STREAK MECHANIC: Consecutive collections without missing
    const perfectStreakBonus = Math.min(gameState.perfectCollections * 0.0005, 0.02); // Max 2% bonus
    if (item.baseProbability === 0.01) {
        finalProbability += perfectStreakBonus * 1.5; // 1.5x for ultra rare
    } else if (item.baseProbability === 0.1) {
        finalProbability += perfectStreakBonus;
    }
    
    // SCORE MILESTONE MECHANIC: Higher scores unlock better drop rates
    const scoreMilestones = [50, 100, 200, 300, 500];
    let milestoneBonus = 0;
    
    for (let milestone of scoreMilestones) {
        if (gameState.score >= milestone) {
            milestoneBonus += 0.005; // 0.5% per milestone
        }
    }
    
    if (item.baseProbability === 0.01) {
        finalProbability += milestoneBonus * 2; // Double for ultra rare
    } else {
        finalProbability += milestoneBonus;
    }
    
    // RISK/REWARD MECHANIC: Higher game speed increases rare drop chance
    const speedBonus = Math.max(0, (gameState.speedMultiplier - 1) * 0.01); // 1% per speed level above 1
    if (item.baseProbability === 0.01) {
        finalProbability += speedBonus * 1.5;
    } else {
        finalProbability += speedBonus * 0.5;
    }
    
    // PITY SYSTEM: Guarantee rare drops after many collections without one
    if (item.baseProbability === 0.01 && gameState.perfectCollections > 50) {
        const lastRareCollection = Math.max(...gameItems
            .filter(gameItem => gameItem.baseProbability === 0.01)
            .map(gameItem => gameItem.collected));
        
        const collectionsSinceRare = gameState.perfectCollections - lastRareCollection;
        if (collectionsSinceRare > 30) {
            // Pity system kicks in after 30 collections without rare
            const pityBonus = Math.min((collectionsSinceRare - 30) * 0.005, 0.1); // Max 10% pity bonus
            finalProbability += pityBonus;
        }
    }
    
    // Cap probabilities to maintain rarity
    if (item.baseProbability === 0.002) {
        return Math.min(0.08, finalProbability); // Zee Zgnan caps at 8% (ultra ultra rare)
    } else if (item.baseProbability === 0.01) {
        return Math.min(0.12, finalProbability); // Legendary caps at 12%
    } else if (item.baseProbability === 0.1) {
        return Math.min(0.4, finalProbability); // Rare caps at 40%
    } else if (item.baseProbability === 0.4) {
        return Math.min(0.8, finalProbability); // Common caps at 80%
    }
    
    return Math.min(0.6, finalProbability); // Default cap at 60%
}

// Calculate current level and update level-based speed multiplier
function updateGameLevel() {
    const points = gameState.score;
    let newLevel = 1;
    
    // Find the appropriate level based on config thresholds
    for (let i = gameConfig.levels.thresholds.length - 1; i >= 0; i--) {
        if (points >= gameConfig.levels.thresholds[i]) {
            newLevel = i + 1;
            break;
        }
    }
    
    // Handle levels beyond the defined thresholds
    if (newLevel > gameConfig.levels.thresholds.length) {
        const lastThreshold = gameConfig.levels.thresholds[gameConfig.levels.thresholds.length - 1];
        const pointsBeyondLastThreshold = points - lastThreshold;
        const levelsToAdd = Math.floor(pointsBeyondLastThreshold / 10); // Every 10 points beyond last threshold
        newLevel = gameConfig.levels.thresholds.length + levelsToAdd;
    }
    
    // Only update speed multiplier when level changes
    if (newLevel !== gameState.currentLevel) {
        gameState.currentLevel = newLevel;
        
        // Calculate level-based speed multiplier using config
        if (newLevel <= gameConfig.levels.speedMultipliers.length) {
            // Use predefined multiplier from config
            gameState.levelSpeedMultiplier = gameConfig.levels.speedMultipliers[newLevel - 1];
        } else {
            // Calculate for levels beyond predefined multipliers
            const lastMultiplier = gameConfig.levels.speedMultipliers[gameConfig.levels.speedMultipliers.length - 1];
            const levelsAbove = newLevel - gameConfig.levels.speedMultipliers.length;
            gameState.levelSpeedMultiplier = lastMultiplier + (levelsAbove * gameConfig.levels.levelBeyond5Increment);
        }
        
        // Cap at configured maximum
        gameState.levelSpeedMultiplier = Math.min(gameState.levelSpeedMultiplier, gameConfig.levels.maxSpeedMultiplier);
    }
}

// Calculate dynamic probability for damage projectiles
function calculateProjectileProbability(projectile) {
    let finalProbability = projectile.baseProbability;
    
    // LEVEL-BASED DIFFICULTY SCALING: Fixed multiplier per level
    const levelBonus = Math.max(0, (gameState.levelSpeedMultiplier - 1) * 0.008); // 0.8% per level multiplier
    finalProbability += levelBonus;
    
    // SCORE SCALING: Higher scores = more dangerous enemies (reduced impact)
    const scoreMilestones = [200, 500, 1000, 1500, 2500];
    let scoreBonus = 0;
    
    for (let milestone of scoreMilestones) {
        if (gameState.score >= milestone) {
            scoreBonus += 0.002; // 0.2% per milestone (reduced from 0.3%)
        }
    }
    finalProbability += scoreBonus;
    
    // MISSED ITEMS MERCY: If player is struggling, reduce projectile spawn rate
    if (gameState.missedItems > 15) {
        const mercyReduction = Math.min(gameState.missedItems * 0.001, 0.01); // Max 1% reduction
        finalProbability = Math.max(0.001, finalProbability - mercyReduction);
    }
    
    // Cap probabilities to maintain balance
    if (projectile.type === "common") {
        return Math.min(0.08, finalProbability); // Common projectiles cap at 8% (increased)
    } else if (projectile.type === "rare") {
        return Math.min(0.035, finalProbability); // Rare projectiles cap at 3.5% (increased)
    }
    
    return Math.min(0.05, finalProbability); // Default cap at 5%
}

// Select projectile based on probability weights
function selectRandomProjectile() {
    // Calculate probability for each projectile
    const projectilesWithProbability = damageProjectiles.map(projectile => ({
        projectile: projectile,
        probability: calculateProjectileProbability(projectile)
    }));
    
    // Create weighted selection pool
    const weightedPool = [];
    projectilesWithProbability.forEach(({ projectile, probability }) => {
        // Add projectile to pool based on its probability (multiply by 1000 for precision)
        const weight = Math.floor(probability * 1000);
        for (let i = 0; i < weight; i++) {
            weightedPool.push(projectile);
        }
    });
    
    // If no projectiles in pool, fallback to fireball
    if (weightedPool.length === 0) {
        return damageProjectiles.find(p => p.id === "fireball");
    }
    
    // Select random projectile from weighted pool
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

// Select item based on probability weights
function selectRandomItem() {
    const droppableItems = gameItems.filter(item => {
        // Exclude milestone items
        if (item.type === "milestone") return false;
        
        // Exclude tier set items that have already been collected or missed (one chance only)
        if (item.type === "tier_set" && (item.collected > 0 || item.missed > 0)) return false;
        
        // Exclude zee_zgnan items that have already spawned (one chance only)
        if (item.type === "zee_zgnan" && item.spawned > 0) return false;
        
        return true;
    });
    
    // Calculate probability for each item
    const itemsWithProbability = droppableItems.map(item => ({
        item: item,
        probability: calculateItemProbability(item)
    }));
    
    // Create weighted selection pool
    const weightedPool = [];
    itemsWithProbability.forEach(({ item, probability }) => {
        // Add item to pool based on its probability (multiply by 100 for precision)
        const weight = Math.floor(probability * 100);
        for (let i = 0; i < weight; i++) {
            weightedPool.push(item);
        }
    });
    
    // If no items in pool (very early game), fallback to regular items only
    if (weightedPool.length === 0) {
        const regularItems = droppableItems.filter(item => item.type === "regular");
        return regularItems[Math.floor(Math.random() * regularItems.length)];
    }
    
    // Select random item from weighted pool
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
}

// Game objects
class FallingItem {
    constructor() {
        this.x = Math.random() * (canvas.width - 180);
        
        // Find valid Y position with spacing
        let attemptY = -180;
        let attempts = 0;
        while (!isValidYPosition(attemptY) && attempts < 10) {
            attemptY -= 100; // Try higher up
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        // Select item based on probability weights FIRST
        this.itemData = selectRandomItem();
        
        // Mark zee_zgnan items as spawned (one-time only items)
        if (this.itemData.type === "zee_zgnan") {
            this.itemData.spawned++;
        }
        
        // Apply size multiplier from item data
        const sizeMultiplier = this.itemData.size_multiplier || 1;
        this.width = gameConfig.visuals.itemSize * sizeMultiplier;
        this.height = gameConfig.visuals.itemSize * sizeMultiplier;
        
        // Random speed variation: 0.5x to 2.0x of base speed for dynamic gameplay
        const speedVariation = 0.5 + Math.random() * 1.5; // Random between 0.5 and 2.0
        this.speed = gameState.baseDropSpeed * gameState.speedMultiplier * gameState.permanentSpeedReduction * gameState.speedIncreaseMultiplier * speedVariation;
        
        // Create image object for this specific item
        this.itemImage = new Image();
        this.itemImage.src = this.itemData.image;
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Animation properties for borders
        this.borderAnimation = 0;
        this.borderPulseSpeed = 0.15;
    }

    update() {
        this.y += this.speed * gameState.deltaTimeMultiplier;
        this.rotation += this.rotationSpeed * gameState.deltaTimeMultiplier;
        this.borderAnimation += this.borderPulseSpeed * gameState.deltaTimeMultiplier;
        
        // Check if item fell off screen
        if (this.y > canvas.height + 180) {
            this.missed = true;
            return false;
        }
        return true;
    }

    draw() {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the item's actual size (which includes size_multiplier)
        const drawWidth = this.width;
        const drawHeight = gameConfig.visuals.forceItemAspectRatio ? this.width : this.height;
        
        // Use the specific item image if loaded, otherwise use fallback
        if (this.itemImage && this.itemImage.complete && this.itemImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.itemImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Fallback: try to extract number from old naming pattern, otherwise use first available image
            const numberMatch = this.itemData.image.match(/(\d+)\.png/);
            let fallbackIndex = 0;
            
            if (numberMatch && numberMatch[1]) {
                const imageNumber = parseInt(numberMatch[1]);
                if (imageNumber >= 2 && imageNumber <= 8) {
                    fallbackIndex = Math.min(imageNumber - 2, images.items.length - 1);
                }
            }
            
            // Ensure we have a valid image to draw
            if (images.items[fallbackIndex] && images.items[fallbackIndex].complete && images.items[fallbackIndex].naturalWidth > 0) {
                // Force the fallback image to exact size too
                ctx.drawImage(images.items[fallbackIndex], -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
            } else {
                // Final fallback: draw a colored rectangle with consistent size
                ctx.fillStyle = this.itemData.type === 'regular' ? '#00FF00' : 
                               this.itemData.type === 'epic' ? '#9932CC' : 
                               this.itemData.type === 'special' ? '#FF69B4' : 
                               this.itemData.type === 'legendary' ? '#FFD700' :
                               this.itemData.type === 'zee_zgnan' ? '#FF0080' :
                               this.itemData.type === 'tier_set' ? '#00FFFF' : '#FFD700';
                ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
                
                // Add item name text
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.itemData.name, 0, 0);
            }
        }
        
        // Draw custom borders based on item type
        this.drawItemBorder(ctx, drawWidth, drawHeight);
        
        ctx.restore();
    }
    
    drawItemBorder(ctx, itemWidth, itemHeight) {
        const borderRadius = Math.max(itemWidth, itemHeight) / 2;
        const basePadding = 15; // Base padding to ensure borders don't clip items
        
        switch(this.itemData.type) {
            case 'regular':
                // No border for regular items
                break;
                
            case 'epic':
                // Pulsating purple border with padding
                const epicPulse = Math.sin(this.borderAnimation) * 0.3 + 0.7; // 0.4 to 1.0
                ctx.strokeStyle = '#9932CC';
                ctx.lineWidth = 2.5 * epicPulse;
                ctx.shadowColor = '#9932CC';
                ctx.shadowBlur = 15 * epicPulse;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + (8 * epicPulse), 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'special':
                // Hot pink glowing border with padding
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FF69B4';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'legendary':
                // Orange very noticeable animated border with extra padding
                const legendaryPulse = Math.sin(this.borderAnimation * 2) * 0.5 + 0.5; // 0 to 1
                const legendaryGlow = Math.sin(this.borderAnimation * 1.5) * 0.4 + 0.6; // 0.2 to 1
                
                // Outer glow with extra padding
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#FF8C00';
                ctx.shadowBlur = 30 * legendaryGlow;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 20 + (8 * legendaryPulse), 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner border with padding
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'zee_zgnan':
                // Ultra rare deep pink/magenta dramatic animated border
                const zeePulse = Math.sin(this.borderAnimation * 2.5) * 0.6 + 0.4; // 0 to 1
                const zeeGlow = Math.sin(this.borderAnimation * 2) * 0.5 + 0.5; // 0 to 1
                const zeeSparkle = Math.sin(this.borderAnimation * 3) * 0.3 + 0.7; // sparkle effect
                
                // Triple layer ultra-rare border
                // Outer massive glow
                ctx.strokeStyle = '#FF0080';
                ctx.lineWidth = 6 * zeePulse;
                ctx.shadowColor = '#FF0080';
                ctx.shadowBlur = 40 * zeeGlow;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 30 + (12 * zeePulse), 0, Math.PI * 2);
                ctx.stroke();
                
                // Middle layer
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = 4 * zeeSparkle;
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 15, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner core
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'tier_set':
                // Cyan dramatic border for Dragonstalker pieces with padding
                const tierPulse = Math.sin(this.borderAnimation * 1.2) * 0.4 + 0.6; // 0.2 to 1
                
                // Outer border effect with padding
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3 * tierPulse;
                ctx.shadowColor = '#00FFFF';
                ctx.shadowBlur = 25 * tierPulse;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 12, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner cyan border with padding
                ctx.strokeStyle = '#87CEEB';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
        }
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
}





class DamageProjectile {
    constructor(projectileData) {
        this.data = projectileData;
        this.width = projectileData.size.width;
        this.height = projectileData.size.height;
        
        // Gaussian randomized horizontal position (centered with some spread)
        const centerX = canvas.width / 2;
        const gaussianX = gaussianRandom(centerX, canvas.width * 0.25);
        this.x = Math.max(0, Math.min(canvas.width - this.width, gaussianX));
        
        // Find valid Y position with spacing
        let attemptY = -this.height;
        let attempts = 0;
        while (!isValidYPosition(attemptY) && attempts < 10) {
            attemptY -= 100;
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        // Random speed variation based on projectile data
        const speedVariation = projectileData.speed.min + Math.random() * (projectileData.speed.max - projectileData.speed.min);
        
        // Use separate scaling for projectiles with higher base speed but maintained ratios
        const baseProjectileMultiplier = 1.5; // Start projectiles 50% faster than before
        const projectileSpeedMultiplier = Math.min((gameState.levelSpeedMultiplier * 0.6 + baseProjectileMultiplier), 4.5); // Cap at 4.5x total, includes base boost
        const projectileSpeedIncrease = gameState.speedIncreaseActive ? 
            Math.min(gameState.speedIncreaseMultiplier * 0.5, 1.15) : 1.0; // Reduce speed boost impact to max 15%
        
        this.speed = gameState.baseDropSpeed * projectileSpeedMultiplier * gameState.permanentSpeedReduction * projectileSpeedIncrease * speedVariation;
        
        // Visual effects
        this.glowAnimation = 0;
        
        // Speed boost specific properties
        if (this.data.effects === "speed_increase") {
            // Randomly select one of the speed increase options
            const options = this.data.speedIncreaseOptions;
            this.speedIncreasePercent = options[Math.floor(Math.random() * options.length)];
        }
        
        // Create image object for this projectile
        this.projectileImage = new Image();
        this.projectileImage.src = projectileData.image;
    }

    update() {
        this.y += this.speed * gameState.deltaTimeMultiplier;
        this.glowAnimation += 0.2 * gameState.deltaTimeMultiplier;
        
        if (this.y > canvas.height + this.height) {
            return false;
        }
        return true;
    }

    draw() {
        ctx.save();
        
        // Glow effect based on projectile type
        if (this.data.id === "frostbolt") {
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = 25 * glow;
        }
        
        // Force consistent size regardless of source image dimensions
        const drawWidth = this.width;
        const drawHeight = this.height;
        const borderPadding = 8; // Padding for border around projectiles with variable values
        
        // Draw red border for projectiles with variable values (like speed boost)
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - borderPadding, this.y - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        // Check if projectile image is loaded, otherwise draw a placeholder
        if (this.projectileImage && this.projectileImage.complete && this.projectileImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.projectileImage, this.x, this.y, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on projectile type with consistent size
            if (this.data.id === "fireball") {
                // Fireball placeholder
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/3, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.data.id === "speedboost") {
                // Speed boost placeholder - red circle with percentage
                ctx.fillStyle = '#FF0000';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFFFFF';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2.5, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.data.id === "frostbolt") {
                // Frostbolt placeholder
                ctx.fillStyle = '#00BFFF';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#87CEEB';
                ctx.beginPath();
                ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/3, 0, Math.PI * 2);
                ctx.fill();
                // Add frost effect lines
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const startX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/4);
                    const startY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/4);
                    const endX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/2.5);
                    const endY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/2.5);
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
            }
        }
        
        // Draw variable value text underneath for projectiles with special effects
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            // Background for text readability
            const textX = this.x + drawWidth/2;
            const textY = this.y + drawHeight + 20;
            const textWidth = 60;
            const textHeight = 18;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Border around text background
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${this.speedIncreasePercent}%`, textX, textY + 4);
        }
        
        ctx.restore();
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
    
    playImpactSound() {
        if (!audioInitialized || audioState.isMuted) return;
        if (this.data.sound) {
            // Create a new audio instance for the projectile sound
            const projectileAudio = new Audio(this.data.sound);
            projectileAudio.volume = this.data.id === "fireball" ? gameConfig.audio.volumes.fireballImpact : volumeSettings.effects;
            projectileAudio.play().catch(e => console.log(`Projectile sound ${this.data.sound} not available`));
        }
    }
}

// Keep Fireball class for backward compatibility (now extends DamageProjectile)
class Fireball extends DamageProjectile {
    constructor() {
        const fireballData = damageProjectiles.find(p => p.id === "fireball");
        super(fireballData);
    }
}

class PowerUpItem {
    constructor(powerUpData) {
        this.data = powerUpData;
        this.x = Math.random() * (canvas.width - 120);
        
        // Find valid Y position with spacing
        let attemptY = -120;
        let attempts = 0;
        while (!isValidYPosition(attemptY) && attempts < 10) {
            attemptY -= 100;
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        this.width = gameConfig.visuals.powerUpItemSize;
        this.height = gameConfig.visuals.powerUpItemSize;
        
        // Slower speed for power-ups (easier to collect)
        const speedVariation = 0.6 + Math.random() * 0.8; // Slower than regular items
        this.speed = gameState.baseDropSpeed * gameState.speedMultiplier * gameState.permanentSpeedReduction * gameState.speedIncreaseMultiplier * speedVariation;
        
        // Visual effects
        this.rotation = 0;
        this.rotationSpeed = 0.08;
        this.glowAnimation = 0;
        this.pulseAnimation = 0;
        
        // Create image object for this power-up
        this.powerUpImage = new Image();
        this.powerUpImage.src = powerUpData.image;
    }

    update() {
        this.y += this.speed * gameState.timeSlowMultiplier * gameState.deltaTimeMultiplier; // Affected by time slow and frame rate
        this.rotation += this.rotationSpeed * gameState.deltaTimeMultiplier;
        this.glowAnimation += 0.15 * gameState.deltaTimeMultiplier;
        this.pulseAnimation += 0.1 * gameState.deltaTimeMultiplier;
        
        if (this.y > canvas.height + this.height) {
            this.missed = true;
            return false;
        }
        return true;
    }

    draw() {
        ctx.save();
        
        // Glow effect
        const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
        ctx.shadowColor = this.data.color;
        ctx.shadowBlur = 30 * glow;
        
        // Pulse effect
        const pulse = Math.sin(this.pulseAnimation) * 0.1 + 1.0;
        
        // Force consistent size regardless of source image dimensions
        const baseWidth = gameConfig.visuals.powerUpItemSize;
        const baseHeight = gameConfig.visuals.forceItemAspectRatio ? gameConfig.visuals.powerUpItemSize : this.height;
        const drawWidth = baseWidth * pulse;
        const drawHeight = baseHeight * pulse;
        
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the specific power-up image if loaded, otherwise use placeholder
        if (this.powerUpImage && this.powerUpImage.complete && this.powerUpImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.powerUpImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on power-up type with consistent size
            ctx.fillStyle = this.data.color;
            ctx.beginPath();
            ctx.arc(0, 0, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add plus symbol for healing items
            if (this.data.type === "heal") {
                ctx.fillStyle = 'white';
                ctx.fillRect(-drawWidth/6, -drawWidth/3, drawWidth/3, drawWidth*2/3);
                ctx.fillRect(-drawWidth/3, -drawWidth/6, drawWidth*2/3, drawWidth/3);
            } else if (this.data.type === "utility") {
                // Add clock symbol for utility items
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, drawWidth/3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -drawWidth/4);
                ctx.moveTo(0, 0);
                ctx.lineTo(drawWidth/6, 0);
                ctx.stroke();
            }
        }
        
        ctx.restore();
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
    
    applyEffect() {
        if (!audioInitialized || audioState.isMuted) {
            // Still apply the effect even if audio is muted, just skip the sound
            this.applyEffectLogic();
            return;
        }
        
        // Play power-up sound
        if (this.data.sound) {
            const powerUpAudio = new Audio(this.data.sound);
            powerUpAudio.volume = volumeSettings.effects;
            powerUpAudio.play().catch(e => console.log(`Power-up sound ${this.data.sound} not available`));
        }
        
        this.applyEffectLogic();
    }
    
    applyEffectLogic() {
        
        // Apply the effect based on type
        switch(this.data.effect) {
            case "slow_time":
                gameState.timeSlowActive = true;
                gameState.timeSlowTimer = this.data.duration;
                gameState.timeSlowMultiplier = this.data.value;
                break;
                
            case "heal":
                gameState.health = Math.min(gameState.maxHealth, gameState.health + this.data.value);
                break;
                
            case "freeze_time":
                // Freeze all projectiles for the configured duration
                gameState.freezeTimeActive = true;
                gameState.freezeTimeTimer = gameConfig.powerUps.freezeTime.duration;
                break;
                
            case "cut_time":
                // Permanently reduce game speed
                const reductionAmount = gameConfig.powerUps.cutTime.speedReduction;
                gameState.permanentSpeedReduction *= (1 - reductionAmount);
                // Ensure it doesn't go below a minimum threshold
                gameState.permanentSpeedReduction = Math.max(0.1, gameState.permanentSpeedReduction);
                break;
        }
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 30;
        this.maxLife = 30;
        this.color = color;
        this.size = Math.random() * 5 + 2;
    }

    update() {
        this.x += this.vx * gameState.deltaTimeMultiplier;
        this.y += this.vy * gameState.deltaTimeMultiplier;
        this.life -= gameState.deltaTimeMultiplier;
        return this.life > 0;
    }

    draw() {
        const alpha = this.life / this.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }
}

// VanoPopup class removed - now using face replacement instead

// Tier Set Management
function checkTierSetCompletion() {
    const tierSetItems = gameItems.filter(item => item.type === "tier_set");
    const collectedTierItems = tierSetItems.filter(item => item.collected > 0);
    gameState.tierSetCollected = collectedTierItems.length;
    
    // Check if all 8 tier set items are collected
    if (gameState.tierSetCollected >= 8 && !gameState.gameWon) {
        winGame();
    }
}

function winGame() {
    gameState.gameWon = true;
    gameState.gameRunning = false;
    
    // Play victory sound (reuse total sound for now)
    if (audioInitialized && !audioState.isMuted) {
        sounds.total.volume = volumeSettings.effects;
        sounds.total.currentTime = 0;
        sounds.total.play().catch(e => console.log('Victory sound failed to play'));
    }
    
    // Save the high score with special win marker
    const rank = addHighScore(gameState.playerName + " 👑", gameState.score, gameState.perfectCollections, gameState.currentLevel);
    
    // Update final score display
    document.getElementById('finalScore').textContent = 
        `🎉 VICTORY! Complete Dragonstalker Set! 🎉\nFinal Score: ${gameState.score} | Items: ${gameState.perfectCollections} | Level: ${gameState.currentLevel}`;
    
    // Show victory message
    const newHighScoreElement = document.getElementById('newHighScore');
    newHighScoreElement.textContent = `🏆 DRAGONSTALKER SET COMPLETED! YOU WIN! 🏆`;
    newHighScoreElement.style.display = 'block';
    newHighScoreElement.style.color = 'gold';
    
    document.getElementById('gameOver').style.display = 'block';
}

// Game functions
function spawnItem() {
    if (fallingItems.length < gameConfig.gameplay.maxFallingItems) {
        fallingItems.push(new FallingItem());
    }
}

// Gaussian random number generator (Box-Muller transform)
function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

function spawnDamageProjectile() {
    if (fireballs.length < gameConfig.gameplay.maxFireballs) {
        // Select a random projectile based on weighted probabilities
        const selectedProjectile = selectRandomProjectile();
        const projectileProbability = calculateProjectileProbability(selectedProjectile);
        
        if (Math.random() < projectileProbability) {
            fireballs.push(new DamageProjectile(selectedProjectile));
        }
    }
}

// Keep old function name for compatibility
function spawnFireball() {
    spawnDamageProjectile();
}

// Calculate power-up probability based on speed and other factors
function calculatePowerUpProbability(powerUp) {
    // Use base probability if not specified
    let finalProbability = powerUp.baseProbability || 0.33; // Default 33% chance
    
    // Apply speed scaling for power-ups that have this property
    if (powerUp.speedScaling) {
        // Calculate current effective speed multiplier
        const currentSpeed = gameState.levelSpeedMultiplier * gameState.permanentSpeedReduction * gameState.speedIncreaseMultiplier;
        
        // Increase probability based on speed - more speed = more shields needed
        // Base speed 1.0 = no bonus, speed 2.0 = +50% probability, speed 3.0 = +100% probability
        const speedBonus = Math.max(0, (currentSpeed - 1.0) * 0.5); // 50% bonus per speed multiplier above 1.0
        finalProbability += speedBonus;
        
        // Additional bonus based on level (higher levels = more dangerous)
        const levelBonus = Math.max(0, (gameState.currentLevel - 1) * 0.1); // 10% bonus per level above 1
        finalProbability += levelBonus;
        
        // Bonus if player health is low (more shields when struggling)
        if (gameState.health <= 30) {
            finalProbability += 0.3; // 30% bonus when health is low
        } else if (gameState.health <= 50) {
            finalProbability += 0.15; // 15% bonus when health is medium-low
        }
    }
    
    // Apply health scaling for healing items - MORE likely when health is LOW
    if (powerUp.healthScaling) {
        if (gameState.health <= 30) {
            finalProbability += 0.5; // 50% bonus when health is critically low
        } else if (gameState.health <= 50) {
            finalProbability += 0.3; // 30% bonus when health is medium-low
        } else if (gameState.health <= 70) {
            finalProbability += 0.15; // 15% bonus when health is getting low
        }
        // No bonus when health is high (above 70%) - healing not needed
    }
    
    // Cap probability to prevent it from becoming too high
    return Math.min(0.8, finalProbability); // Max 80% chance
}

function spawnPowerUp() {
    // Check if power-ups are enabled
    if (!gameConfig.powerUps.enabled) return;
    
    // Check regular interval spawning
    const interval = gameConfig.powerUps.spawnInterval;
    const currentMilestone = Math.floor(gameState.score / interval) * interval;
    
    let shouldSpawn = false;
    
    // Regular interval spawning
    if (gameState.score >= gameConfig.powerUps.startingScore && 
        gameState.score % interval === 0 && 
        gameState.lastPowerUpScore < currentMilestone) {
        shouldSpawn = true;
    }
    
    // Custom spawn points
    if (gameConfig.powerUps.customSpawnPoints.includes(gameState.score) &&
        gameState.lastPowerUpScore < gameState.score) {
        shouldSpawn = true;
    }
    
    // Spawn if conditions are met and random chance succeeds
    if (shouldSpawn && Math.random() < gameConfig.powerUps.spawnChance) {
        let availablePowerUps = [...powerUpItems];
        
        // Handle cut_time power-up special logic
        const cutTimePowerUp = powerUpItems.find(p => p.id === "time_cutter");
        if (cutTimePowerUp) {
            // Remove cut_time from available options if conditions aren't met
            if (!gameConfig.powerUps.cutTime.enabled ||
                gameState.cutTimeSpawned >= gameConfig.powerUps.cutTime.maxSpawns ||
                gameState.score < gameConfig.powerUps.cutTime.minScoreForSpawn ||
                Math.random() > gameConfig.powerUps.cutTime.spawnChance) {
                availablePowerUps = availablePowerUps.filter(p => p.id !== "time_cutter");
            }
        }
        
        // Select power-up using weighted probability based on game conditions
        if (availablePowerUps.length > 0) {
            // Calculate probabilities for each power-up
            const powerUpsWithProbability = availablePowerUps.map(powerUp => ({
                powerUp: powerUp,
                probability: calculatePowerUpProbability(powerUp)
            }));
            
            // Create weighted selection pool
            const weightedPool = [];
            powerUpsWithProbability.forEach(({ powerUp, probability }) => {
                // Add power-up to pool based on its probability (multiply by 100 for precision)
                const weight = Math.floor(probability * 100);
                for (let i = 0; i < weight; i++) {
                    weightedPool.push(powerUp);
                }
            });
            
            // Select random power-up from weighted pool, fallback to random if pool is empty
            let selectedPowerUp;
            if (weightedPool.length > 0) {
                selectedPowerUp = weightedPool[Math.floor(Math.random() * weightedPool.length)];
            } else {
                selectedPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
            }
            
            activePowerUps.push(new PowerUpItem(selectedPowerUp));
            
            // Track cut_time spawns
            if (selectedPowerUp.id === "time_cutter") {
                gameState.cutTimeSpawned++;
            }
            
            gameState.lastPowerUpScore = Math.max(currentMilestone, gameState.score);
        }
    }
}

function updatePlayer() {
    const targetX = mouseX - player.width / 2;
    player.update(targetX, mouseY, canvas.width, canvas.height);
}

function createCollectionParticles(x, y) {
    const colors = ['#FFD700', '#00FF00', '#FF69B4', '#00BFFF', '#FF6347'];
    for (let i = 0; i < gameConfig.gameplay.particleCount; i++) {
        particles.push(new Particle(x, y, colors[Math.floor(Math.random() * colors.length)]));
    }
}

function playVoiceSound() {
    if (!audioInitialized || audioState.isMuted) return;
    if (gameState.perfectCollections > 0 && gameState.perfectCollections % gameConfig.audio.voiceSoundInterval === 0) {
        if (Math.random() < gameConfig.audio.voiceSoundChance) {
            sounds.voice.volume = volumeSettings.effects;
            sounds.voice.currentTime = 0;
            sounds.voice.play().catch(e => console.log('Voice sound failed to play'));
        }
    }
}

function playUffSound() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.uff.volume = volumeSettings.effects;
    sounds.uff.currentTime = 0;
    sounds.uff.play().catch(e => console.log('Uff sound failed to play'));
}

function playScreamSound() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.scream.volume = volumeSettings.effects;
    sounds.scream.currentTime = 0;
    sounds.scream.play().catch(e => console.log('Scream sound failed to play'));
}

function playTotalSound() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.total.volume = volumeSettings.effects;
    sounds.total.currentTime = 0;
    sounds.total.play().catch(e => console.log('Total sound failed to play'));
}



function playFireballImpactSound() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.fireballimpact.volume = gameConfig.audio.volumes.fireballImpact;
    sounds.fireballimpact.currentTime = 0;
    sounds.fireballimpact.play().catch(e => console.log('Fireball impact sound failed to play'));
}

function playDragonstalkerSound() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.wegotit2.volume = volumeSettings.effects;
    sounds.wegotit2.currentTime = 0;
    sounds.wegotit2.play().catch(e => console.log('Dragonstalker sound failed to play'));
}

function startBackgroundMusic() {
    if (!audioInitialized || audioState.isMuted) return;
    sounds.background.volume = volumeSettings.background;
    sounds.background.play().catch(e => console.log('Background music failed to play'));
}

function updateBackgroundVolume() {
    sounds.background.volume = volumeSettings.background;
}

function toggleAudio() {
    const audioBtn = document.getElementById('audioToggleBtn');
    
    if (audioState.isMuted) {
        // Unmute - restore previous volumes
        volumeSettings.background = audioState.previousVolumes.background;
        volumeSettings.effects = audioState.previousVolumes.effects;
        audioState.isMuted = false;
        
        // Update button appearance
        audioBtn.textContent = '🔊';
        audioBtn.classList.remove('muted');
        audioBtn.title = 'Mute Audio';
        
        // Update background music volume if it's playing
        if (!sounds.background.paused) {
            sounds.background.volume = volumeSettings.background;
        }
    } else {
        // Mute - save current volumes and set to 0
        audioState.previousVolumes.background = volumeSettings.background;
        audioState.previousVolumes.effects = volumeSettings.effects;
        
        volumeSettings.background = 0;
        volumeSettings.effects = 0;
        audioState.isMuted = true;
        
        // Update button appearance
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
        audioBtn.title = 'Unmute Audio';
        
        // Mute background music immediately
        sounds.background.volume = 0;
    }
}

function playItemSound(item) {
    if (!audioInitialized || audioState.isMuted) return;
    if (item.sound) {
        // Create a new audio instance for the item sound
        const itemAudio = new Audio(item.sound);
        itemAudio.volume = volumeSettings.effects;
        itemAudio.play().catch(e => console.log(`Item sound ${item.sound} not available`));
    }
}

function updateGame() {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    // Update elapsed time
    gameState.elapsedTime = (Date.now() - gameState.gameStartTime) / 1000;

    // Update time slow effect (frame rate normalized)
    if (gameState.timeSlowActive) {
        gameState.timeSlowTimer -= gameState.deltaTimeMultiplier;
        if (gameState.timeSlowTimer <= 0) {
            gameState.timeSlowActive = false;
            gameState.timeSlowMultiplier = 1.0;
        }
    }
    
    // Update freeze time effect (frame rate normalized)
    if (gameState.freezeTimeActive) {
        gameState.freezeTimeTimer -= gameState.deltaTimeMultiplier;
        if (gameState.freezeTimeTimer <= 0) {
            gameState.freezeTimeActive = false;
        }
    }
    
    // Update speed increase effect (frame rate normalized)
    if (gameState.speedIncreaseActive) {
        gameState.speedIncreaseTimer -= gameState.deltaTimeMultiplier;
        if (gameState.speedIncreaseTimer <= 0) {
            gameState.speedIncreaseActive = false;
            gameState.speedIncreaseMultiplier = 1.0;
            gameState.currentSpeedIncreasePercent = 0;
        }
    }

    updatePlayer();
    


    // Update falling items
    fallingItems = fallingItems.filter(item => {
        const stillActive = item.update();
        
        if (!stillActive && item.missed) {
            gameState.missedItems++;
            
            // Handle tier set items being missed (makes game unwinnable)
            if (item.itemData.type === "tier_set") {
                item.itemData.missed++;
                gameState.tierSetMissed++;
                gameState.gameUnwinnable = true;
                playScreamSound(); // Play scream for missed tier set items
            } else {
                gameState.health = Math.max(0, gameState.health - gameConfig.gameplay.healthLossOnMiss);
                playUffSound();  // Regular uff sound for other items
                if (gameState.health <= 0) {
                    endGame();
                }
            }
        }
        
        if (stillActive && item.checkCollision(player)) {
            // Update item data and score using new system
            item.itemData.collected++;
            gameState.score += item.itemData.value;
            gameState.perfectCollections++;
            updateGameLevel(); // Update level based on collections
            gameState.speedMultiplier = gameState.levelSpeedMultiplier; // Use level-based speed
            createCollectionParticles(item.x + item.width/2, item.y + item.height/2);
            
            // Play special sound for Dragonstalker items, otherwise play regular item sound
            if (item.itemData.type === "tier_set") {
                playDragonstalkerSound();
                checkTierSetCompletion();
            } else {
                playItemSound(item.itemData);
            }
            
            // Play total sound when reaching configured trigger
            if (gameState.perfectCollections === gameConfig.audio.totalSoundTrigger) {
                playTotalSound();
            }
            
            // Start background music at configured collection count
            if (gameState.perfectCollections === gameConfig.audio.backgroundMusicStart && sounds.background.paused) {
                startBackgroundMusic();
            }
            

            
            return false; // Remove collected item
        }
        
        return stillActive && !item.missed;
    });





    // Update fireballs (freeze them if freeze time is active)
    fireballs = fireballs.filter(fireball => {
        // Only update projectiles if freeze time is not active
        const stillActive = gameState.freezeTimeActive ? true : fireball.update();
        
        if (stillActive && fireball.checkCollision(player)) {
            // Play appropriate impact sound based on projectile type
            fireball.playImpactSound();
            
            // Trigger player impact reaction
            player.onHit();
            
            // Apply special effects based on projectile type
            if (fireball.data && fireball.data.effects === "speed_increase") {
                // Apply cumulative speed increase effect
                const increasePercent = fireball.speedIncreasePercent;
                gameState.speedIncreaseActive = true;
                gameState.speedIncreaseTimer = 600; // 10 seconds at 60fps (reset timer)
                
                // Make speed boosts cumulative
                if (gameState.speedIncreaseActive && gameState.currentSpeedIncreasePercent > 0) {
                    // Add to existing boost
                    gameState.currentSpeedIncreasePercent += increasePercent;
                } else {
                    // First boost
                    gameState.currentSpeedIncreasePercent = increasePercent;
                }
                
                // Update multiplier based on cumulative percentage
                gameState.speedIncreaseMultiplier = 1 + (gameState.currentSpeedIncreasePercent / 100);
                
                // Cap the cumulative boost at 100% to prevent extreme speeds
                if (gameState.currentSpeedIncreasePercent > 100) {
                    gameState.currentSpeedIncreasePercent = 100;
                    gameState.speedIncreaseMultiplier = 2.0; // Max 2x speed
                }
            }
            
            // Reduce health based on projectile damage (percentage-based)
            const damage = fireball.data ? fireball.data.damage : 5; // Default to 5% for old fireballs
            gameState.health = Math.max(0, gameState.health - damage);
            
            // Create particles based on projectile type
            const particleColor = fireball.data ? fireball.data.color : '#FF0000';
            for (let i = 0; i < gameConfig.gameplay.impactParticleCount; i++) {
                particles.push(new Particle(fireball.x + fireball.width/2, fireball.y + fireball.height/2, particleColor));
            }
            
            // Check if all health is lost
            if (gameState.health <= 0) {
                endGame();
            }
            
            return false; // Remove the projectile that hit
        }
        
        return stillActive;
    });

    // Update power-up items
    activePowerUps = activePowerUps.filter(powerUp => {
        const stillActive = powerUp.update();
        
        if (stillActive && powerUp.checkCollision(player)) {
            // Apply power-up effect
            powerUp.applyEffect();
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2);
            return false; // Remove collected power-up
        }
        
        return stillActive && !powerUp.missed;
    });

    // Update particles
    particles = particles.filter(particle => particle.update());

    // Player updates are handled in updatePlayer()

    // Spawn new objects
    if (Math.random() < gameConfig.gameplay.itemSpawnChance * gameState.speedMultiplier) {
        spawnItem();
    }
    spawnFireball();
    spawnPowerUp();

    // No HTML UI updates needed - everything is drawn on canvas
}

function drawSettings() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Settings panel - made larger to fit all content
    const panelWidth = 650;
    const panelHeight = 600;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(30, 30, 30, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME ITEMS', canvas.width/2, panelY + 50);
    
    // Instructions (different for in-game vs menu)
    ctx.fillStyle = '#CCC';
    ctx.font = '16px Arial';
    if (gameState.gameRunning) {
        ctx.fillText('Press TAB or I to toggle • ESC to close', canvas.width/2, panelY + 80);
    } else {
        ctx.fillText('Press ESC to return to menu', canvas.width/2, panelY + 80);
    }
    
    let yPos = panelY + 110;
    ctx.textAlign = 'left';
    ctx.font = 'bold 18px Arial';
    
    // Regular Items Section (4 points)
    ctx.fillStyle = '#00FF00';
    ctx.fillText('REGULAR ITEMS (4 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Rings, Gold', panelX + 50, yPos);
    yPos += 28;
    
    // Epic Items Section (1-3 points)
    ctx.fillStyle = '#9932CC';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('EPIC ITEMS (1-3 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Ashjrethul, Maladath, Ashkandi, Brutality Blade', panelX + 50, yPos);
    yPos += 28;
    
    // Special Items Section (4 points)
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('SPECIAL ITEMS (4 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Crulshorukh, Cloak, Dragonstalker, Onslaught', panelX + 50, yPos);
    yPos += 28;
    
    // Legendary Items Section (5 points)
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('LEGENDARY ITEMS (5 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Tunder (very rare drop)', panelX + 50, yPos);
    yPos += 28;
    
    // Zee Zgnan Items Section (15 points)
    ctx.fillStyle = '#FF0080';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('ZEE ZGNAN ITEMS (15 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#FF0080';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('⚡ ULTRA RARE - ONLY ONE CHANCE! ⚡', panelX + 50, yPos);
    yPos += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Zee Zgnan Tigar (extremely rare, once per game)', panelX + 50, yPos);
    yPos += 28;
    
    // Tier Set Items Section (6 points + WIN CONDITION)
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('TIER SET ITEMS (6 points each):', panelX + 30, yPos);
    yPos += 22;
    ctx.fillStyle = '#00FFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('🏆 COLLECT ALL 8 TO WIN THE GAME! 🏆', panelX + 50, yPos);
    yPos += 18;
    ctx.fillStyle = '#FFF';
    ctx.font = '13px Arial';
    ctx.fillText('Dragonstalker Set: Helm, Spaulders, Breastplate,', panelX + 50, yPos);
    ctx.fillText('Bracers, Gauntlets, Belt, Legguards, Greaves', panelX + 50, yPos + 14);
    yPos += 35;
    
    // Back to Menu button (only when not in game)
    if (!gameState.gameRunning) {
        const buttonY = panelY + panelHeight - 60;
        const buttonWidth = 150;
        const buttonHeight = 40;
        const buttonX = panelX + (panelWidth - buttonWidth) / 2;
        
        // Button background
        ctx.fillStyle = '#4ECDC4';
        ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button border
        ctx.strokeStyle = '#26d0ce';
        ctx.lineWidth = 2;
        ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);
        
        // Button text
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Back to Menu', buttonX + buttonWidth/2, buttonY + 25);
        
        // Store button coordinates for click detection
        gameState.menuButtonBounds = {
            x: buttonX,
            y: buttonY,
            width: buttonWidth,
            height: buttonHeight
        };
    } else {
        gameState.menuButtonBounds = null;
    }
    
    ctx.textAlign = 'left';
}



function drawGame() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw falling items
    fallingItems.forEach(item => item.draw());


    // Draw power-up items
    activePowerUps.forEach(powerUp => powerUp.draw());

    // Draw fireballs
    fireballs.forEach(fireball => fireball.draw());

    // Draw particles
    particles.forEach(particle => particle.draw());

    // Draw player using Player class method
    player.draw(ctx);

    // Draw unified panel with score, level, and collections
    drawUnifiedPanel();
    
    // Draw Dragonstalker progress panel
    drawDragonstalkerProgress();
    
    // Health bar - top right (moved down to avoid HTML element overlap)
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = canvas.width - healthBarWidth - 20;
    const healthBarY = 60; // Moved down from 20 to 60
    
    // Health bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(healthBarX - 5, healthBarY - 5, healthBarWidth + 10, healthBarHeight + 10);
    
    // Health bar border
    ctx.strokeStyle = '#FFF';
    ctx.lineWidth = 2;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    
    // Health bar fill
    const healthPercentage = gameState.health / gameState.maxHealth;
    const healthFillWidth = healthBarWidth * healthPercentage;
    
    // Color based on health level
    if (healthPercentage > 0.6) {
        ctx.fillStyle = '#00FF00'; // Green for high health
    } else if (healthPercentage > 0.3) {
        ctx.fillStyle = '#FFFF00'; // Yellow for medium health
    } else {
        ctx.fillStyle = '#FF0000'; // Red for low health
    }
    
    ctx.fillRect(healthBarX, healthBarY, healthFillWidth, healthBarHeight);
    
    // Health text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(gameState.health)}%`, healthBarX + healthBarWidth/2, healthBarY + 15);
    ctx.textAlign = 'left';
    
    // Game speed and FPS display - bottom left
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 50, 280, 40);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, canvas.height - 50, 280, 40);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Game Speed:', 20, canvas.height - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    const effectiveSpeed = gameState.levelSpeedMultiplier * gameState.permanentSpeedReduction;
    const speedText = `${effectiveSpeed.toFixed(1)}x`;
    ctx.fillText(speedText, 110, canvas.height - 30);
    
    // FPS display
    ctx.fillStyle = '#00FF00';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('FPS:', 180, canvas.height - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    ctx.fillText(`${gameState.fpsCounter}`, 210, canvas.height - 30);
    
    // Show permanent reduction if active
    if (gameState.permanentSpeedReduction < 1.0) {
        ctx.fillStyle = '#8A2BE2';
        ctx.font = '12px Arial';
        ctx.fillText(`(cut: ${(gameState.permanentSpeedReduction * 100).toFixed(0)}%)`, 110, canvas.height - 15);
    }
    
    // Time slow indicator if active
    if (gameState.timeSlowActive) {
        ctx.fillStyle = '#4169E1';
        ctx.font = '14px Arial';
        ctx.fillText(`(${gameState.timeSlowMultiplier.toFixed(1)}x slow)`, 150, canvas.height - 30);
    }
    
    // Freeze time indicator if active
    if (gameState.freezeTimeActive) {
        ctx.fillStyle = '#87CEEB';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ PROJECTILES FROZEN 🛡️', canvas.width / 2, 120);
        
        // Show remaining time
        const remainingSeconds = (gameState.freezeTimeTimer / 60).toFixed(1);
        ctx.font = '14px Arial';
        ctx.fillText(`${remainingSeconds}s remaining`, canvas.width / 2, 140);
        ctx.textAlign = 'left';
    }
    
    // Speed increase indicator if active
    if (gameState.speedIncreaseActive) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        const yPos = gameState.freezeTimeActive ? 170 : 120; // Avoid overlap with freeze indicator
        ctx.fillText(`⚡ SPEED BOOST +${gameState.currentSpeedIncreasePercent}% ⚡`, canvas.width / 2, yPos);
        
        // Show remaining time
        const remainingSeconds = (gameState.speedIncreaseTimer / 60).toFixed(1);
        ctx.font = '14px Arial';
        ctx.fillText(`${remainingSeconds}s remaining`, canvas.width / 2, yPos + 20);
        ctx.textAlign = 'left';
    }

    
    // Draw settings screen if active
    if (gameState.showSettings) {
        drawSettings();
    }
    
    // Draw pause menu if game is paused
    if (gameState.gamePaused) {
        drawPauseMenu();
    }
}

function endGame() {
    gameState.gameRunning = false;
    
    // Only play scream sound if player wasn't just hit by fireball
    // (if player is reacting, fireball impact sound is already playing)
    if (!player.isReacting) {
        playScreamSound();  // Play scream sound when game ends
    }
    
    // Save the high score
    const rank = addHighScore(gameState.playerName, gameState.score, gameState.perfectCollections, gameState.currentLevel);
    
    // Update final score display
    document.getElementById('finalScore').textContent = 
        `Final Score: ${gameState.score} | Items: ${gameState.perfectCollections} | Level: ${gameState.currentLevel}`;
    
    // Show new high score message if it's in top 10
    const newHighScoreElement = document.getElementById('newHighScore');
    if (rank <= 10) {
        newHighScoreElement.textContent = `🎉 NEW HIGH SCORE! Rank #${rank} 🎉`;
        newHighScoreElement.style.display = 'block';
    } else {
        newHighScoreElement.style.display = 'none';
    }
    
    document.getElementById('gameOver').style.display = 'block';
}

function restartGame() {
    // Reset game state but keep player name
    const currentPlayerName = gameState.playerName;
    
    gameState = {
        score: 0,
        missedItems: 0,
        gameRunning: false,  // Will be set to true when game starts
        gamePaused: false,   // Reset pause state
        speedMultiplier: gameConfig.levels.initialSpeedMultiplier,
        perfectCollections: 0,
        baseDropSpeed: gameConfig.gameplay.baseDropSpeed,

        health: gameConfig.player.startingHealth,
        maxHealth: gameConfig.player.maxHealth,
        showSettings: false,
        gameStartTime: Date.now(),  // Reset game start time
        elapsedTime: 0,
        // Reset level system
        currentLevel: 1,
        levelSpeedMultiplier: 1,
        // Reset power-up effects
        timeSlowActive: false,
        timeSlowTimer: 0,
        timeSlowMultiplier: 1.0,
        lastPowerUpScore: 0,
        
        // Reset freeze time effects
        freezeTimeActive: false,
        freezeTimeTimer: 0,
        
        // Reset speed increase effects
        speedIncreaseActive: false,
        speedIncreaseTimer: 0,
        speedIncreaseMultiplier: 1.0,
        currentSpeedIncreasePercent: 0,
        
        // Reset cut time tracking
        cutTimeSpawned: 0,
        permanentSpeedReduction: 1.0,
        
        // Reset tier set tracking
        tierSetCollected: 0,
        tierSetMissed: 0,
        gameWon: false,
        gameUnwinnable: false,
        
        // Keep player name
        playerName: currentPlayerName,
        
        // Reset UI state
        menuButtonBounds: null,
        pauseMenuBounds: null,
        
        // Reset FPS tracking
        fpsCounter: 0,
        fpsLastTime: Date.now(),
        fpsFrameCount: 0,
        
        // Reset frame rate normalization
        lastFrameTime: Date.now(),
        deltaTimeMultiplier: 1.0,
    };
    
    // Reset collection counts and missed counts for all items
    gameItems.forEach(item => {
        item.collected = 0;
        if (item.type === "tier_set") {
            item.missed = 0;
        }
        if (item.type === "zee_zgnan") {
            item.spawned = 0;
        }
    });
    
    fallingItems = [];
    fireballs = [];
    particles = [];
    activePowerUps = [];
    recentDropYPositions = [];
    
    // Reset player to center position
    player.x = canvas.width / 2;
    player.impactTimer = 0;
    player.isReacting = false;
    
    // Hide game over screen and show name entry
    document.getElementById('gameOver').style.display = 'none';
    showNameEntry();
    
    // Pre-fill the name input with the current player name
    document.getElementById('playerNameInput').value = currentPlayerName;
    
    // Stop background music on restart (will start again at 30 collections)
    sounds.background.pause();
    sounds.background.currentTime = 0;
}

// Game loop
function gameLoop() {
    const currentTime = Date.now();
    
    // Calculate delta time multiplier for frame rate normalization
    const deltaTime = currentTime - gameState.lastFrameTime;
    const targetFrameTime = 1000 / gameConfig.gameplay.targetFPS; // Target time per frame in ms
    gameState.deltaTimeMultiplier = deltaTime / targetFrameTime;
    gameState.lastFrameTime = currentTime;
    
    // Calculate FPS
    gameState.fpsFrameCount++;
    if (currentTime - gameState.fpsLastTime >= 1000) { // Update every second
        gameState.fpsCounter = gameState.fpsFrameCount;
        gameState.fpsFrameCount = 0;
        gameState.fpsLastTime = currentTime;
    }
    
    updateGame();
    drawGame();
    requestAnimationFrame(gameLoop);
}

// Initialize the game when essential images are loaded (player + items)
let imagesLoaded = 0;
let gameInitialized = false;
const totalImages = images.items.length + 2; // items + player normal/impact images

// Track player image loading
const checkPlayerImagesLoaded = () => {
    if (player.areImagesLoaded()) {
        imagesLoaded += 2; // Both player images loaded
        if (imagesLoaded >= totalImages && !gameInitialized) {
            gameInitialized = true;
            initializeGame();
        }
    } else {
        // Check again in 100ms
        setTimeout(checkPlayerImagesLoaded, 100);
    }
};

// Initialize game (start game loop and show name entry)
function initializeGame() {
    gameLoop(); // Start the game loop
    showNameEntry(); // Show the name entry screen
}

// Start checking player images
checkPlayerImagesLoaded();

images.items.forEach(img => {
    img.onload = () => {
        imagesLoaded++;
        if (imagesLoaded >= totalImages && !gameInitialized) {
            gameInitialized = true;
            initializeGame();
        }
    };
});



// Volume controls removed - using default settings

// Audio context and initialization
let audioInitialized = false;
let audioInitAttempted = false;

// Initialize audio - now tries immediately and falls back to user interaction
function initializeAudio() {
    if (audioInitialized || audioInitAttempted) return;
    audioInitAttempted = true;
    
    console.log('Initializing audio...');
    
    // Ensure button state matches audio state
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn && audioState.isMuted) {
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
        audioBtn.title = 'Unmute Audio';
    }
    
    // Create a promise chain to initialize all sounds
    const soundPromises = Object.keys(sounds).map(key => {
        return new Promise((resolve) => {
            const audio = sounds[key];
            audio.load(); // Preload audio
            
            // Set initial volumes
            if (key === 'background') {
                audio.volume = volumeSettings.background;
            } else if (key === 'fireballimpact') {
                audio.volume = gameConfig.audio.volumes.fireballImpact;
            } else {
                audio.volume = volumeSettings.effects;
            }
            
            // Test play (this may fail on some browsers without user interaction)
            audio.play().then(() => {
                audio.pause();
                audio.currentTime = 0;
                console.log(`✓ ${key} audio ready`);
                resolve();
            }).catch(e => {
                console.log(`✗ ${key} audio requires user interaction:`, e.message);
                resolve(); // Continue even if one sound fails
            });
        });
    });
    
    // Wait for all sounds to be tested
    Promise.all(soundPromises).then(() => {
        audioInitialized = true;
        console.log('🔊 Audio initialization complete!');
    });
}

// Try to initialize audio immediately when page loads
function tryAutoInitAudio() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Set initial button state to muted
        const audioBtn = document.getElementById('audioToggleBtn');
        if (audioBtn) {
            audioBtn.textContent = '🔇';
            audioBtn.classList.add('muted');
            audioBtn.title = 'Unmute Audio';
        }
        initializeAudio();
    }, 100);
}

// Auto-initialize audio when page loads
document.addEventListener('DOMContentLoaded', tryAutoInitAudio);
// Fallback for when script loads after DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAutoInitAudio);
} else {
    tryAutoInitAudio();
}

// Fallback: Initialize audio on user interaction if auto-init failed
function fallbackAudioInit() {
    if (!audioInitialized) {
        audioInitAttempted = false; // Reset the attempt flag
        initializeAudio();
    }
}

document.addEventListener('click', fallbackAudioInit, { once: true });
document.addEventListener('keydown', fallbackAudioInit, { once: true });
document.addEventListener('touchstart', fallbackAudioInit, { once: true }); 

// ===== HIGH SCORES SYSTEM =====

// Load high scores from localStorage
function loadHighScores() {
    try {
        const scores = localStorage.getItem(HIGH_SCORES_KEY);
        return scores ? JSON.parse(scores) : [];
    } catch (e) {
        console.log('Error loading high scores:', e);
        return [];
    }
}

// Save high scores to localStorage
function saveHighScores(scores) {
    try {
        localStorage.setItem(HIGH_SCORES_KEY, JSON.stringify(scores));
    } catch (e) {
        console.log('Error saving high scores:', e);
    }
}

// Add a new score to the high scores list
function addHighScore(playerName, score, itemsCollected, level) {
    const scores = loadHighScores();
    
    const newScore = {
        name: playerName.trim() || 'Anonymous',
        score: score,
        itemsCollected: itemsCollected,
        level: level,
        date: new Date().toLocaleDateString(),
        timestamp: Date.now()
    };
    
    scores.push(newScore);
    
    // Sort by score (highest first)
    scores.sort((a, b) => b.score - a.score);
    
    // Keep only top 100 scores
    if (scores.length > MAX_HIGH_SCORES) {
        scores.splice(MAX_HIGH_SCORES);
    }
    
    saveHighScores(scores);
    
    // Return the rank of the new score (1-based)
    return scores.findIndex(s => s.timestamp === newScore.timestamp) + 1;
}

// Check if a score qualifies as a high score
function isHighScore(score) {
    const scores = loadHighScores();
    return scores.length < MAX_HIGH_SCORES || score > (scores[scores.length - 1]?.score || 0);
}

// Display high scores in the UI
function displayHighScores() {
    const scores = loadHighScores();
    const scoresList = document.getElementById('scoresList');
    
    if (scores.length === 0) {
        scoresList.innerHTML = '<p style="color: #999; font-style: italic;">No high scores yet. Be the first!</p>';
        return;
    }
    
    let html = '';
    scores.slice(0, 20).forEach((score, index) => {
        const isTop3 = index < 3;
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '';
        
        html += `
            <div class="score-entry ${isTop3 ? 'top3' : ''}">
                <span class="score-rank">${rankEmoji} #${index + 1}</span>
                <span class="score-name">${score.name}</span>
                <span class="score-points">${score.score} pts</span>
                <span class="score-date">${score.date}</span>
            </div>
        `;
    });
    
    if (scores.length > 20) {
        html += `<p style="color: #999; margin-top: 20px; font-style: italic;">...and ${scores.length - 20} more scores</p>`;
    }
    
    scoresList.innerHTML = html;
}

// ===== UI NAVIGATION FUNCTIONS =====

// Show name entry screen
function showNameEntry() {
    document.getElementById('nameEntry').style.display = 'block';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    gameState.showSettings = false; // Hide settings when returning to menu
    
    // Focus on name input
    const nameInput = document.getElementById('playerNameInput');
    nameInput.focus();
    nameInput.select();
}

// Show high scores screen
function showHighScores() {
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    gameState.showSettings = false; // Hide settings when showing high scores
    
    displayHighScores();
}

// Show items/settings screen from menu
function showItemsFromMenu() {
    // Hide all UI screens
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Show settings overlay
    gameState.showSettings = true;
}

// Start the game with the entered name
function startGame() {
    const nameInput = document.getElementById('playerNameInput');
    const playerName = nameInput.value.trim();
    
    if (!playerName) {
        alert('Please enter your name to start the game!');
        nameInput.focus();
        return;
    }
    
    gameState.playerName = playerName;
    
    // Hide name entry screen
    document.getElementById('nameEntry').style.display = 'none';
    
    // Start the actual game
    gameState.gameRunning = true;
    gameState.gameStartTime = Date.now();
}

// Handle Enter key in name input
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGame();
            }
        });
        
        // Auto-enable/disable start button based on input
        nameInput.addEventListener('input', () => {
            const startBtn = document.getElementById('startGameBtn');
            startBtn.disabled = !nameInput.value.trim();
        });
    }
});

function drawDragonstalkerProgress() {
    // Get all Dragonstalker items
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    
    // Only show if at least one piece is collected or missed
    if (gameState.tierSetCollected === 0 && gameState.tierSetMissed === 0) return;
    
    // Panel positioning - top right area (made wider to fit item names)
    const panelX = canvas.width - 380;
    const panelY = 100;
    const panelWidth = 360;
    const panelHeight = 240;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    
    // Border with special glow effect (red if unwinnable, cyan if still possible)
    ctx.strokeStyle = gameState.gameUnwinnable ? '#FF0000' : '#00FFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = gameState.gameUnwinnable ? '#FF0000' : '#00FFFF';
    ctx.shadowBlur = 10;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    ctx.shadowBlur = 0; // Reset shadow
    
    // Title
    ctx.fillStyle = gameState.gameUnwinnable ? '#FF0000' : '#00FFFF';
    ctx.font = 'bold 18px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('🐉 DRAGONSTALKER SET 🐉', panelX + panelWidth/2, panelY + 25);
    
    // Status message
    if (gameState.gameUnwinnable) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('❌ VICTORY IMPOSSIBLE ❌', panelX + panelWidth/2, panelY + 45);
    }
    
    // Progress bar
    const progressBarX = panelX + 20;
    const progressBarY = panelY + (gameState.gameUnwinnable ? 55 : 35);
    const progressBarWidth = panelWidth - 40;
    const progressBarHeight = 20;
    
    // Progress bar background
    ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
    ctx.fillRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight);
    
    // Progress bar fill (only show progress if still winnable)
    if (!gameState.gameUnwinnable) {
        const progressPercent = gameState.tierSetCollected / 8;
        const progressFillWidth = progressBarWidth * progressPercent;
        
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(progressBarX, progressBarY, progressFillWidth, progressBarHeight);
    }
    
    // Progress text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${gameState.tierSetCollected}/8 PIECES`, panelX + panelWidth/2, progressBarY + 15);
    
    // Item list
    let yOffset = gameState.gameUnwinnable ? 90 : 70;
    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    
    dragonstalkerItems.forEach(item => {
        const isCollected = item.collected > 0;
        const isMissed = item.missed > 0;
        const x = panelX + 15;
        const y = panelY + yOffset;
        
        // Status indicator
        if (isCollected) {
            ctx.fillStyle = '#00FF00'; // Green checkmark for collected
            ctx.fillText('✓', x, y);
        } else if (isMissed) {
            ctx.fillStyle = '#FF0000'; // Red X for missed
            ctx.fillText('✗', x, y);
        } else {
            ctx.fillStyle = '#666666'; // Gray box for not yet encountered
            ctx.fillText('□', x, y);
        }
        
        // Item name with appropriate color - use shortened names for better fit
        const shortName = item.name.replace("Dragonstalker's ", "");
        if (isCollected) {
            ctx.fillStyle = '#00FF00'; // Green for collected
        } else if (isMissed) {
            ctx.fillStyle = '#FF0000'; // Red for missed
        } else {
            ctx.fillStyle = '#AAAAAA'; // Gray for not encountered
        }
        ctx.fillText(shortName, x + 20, y);
        
        yOffset += 18;
    });
    
    // Bottom message
    if (gameState.gameUnwinnable) {
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('💀 MISSED DRAGONSTALKER PIECES 💀', panelX + panelWidth/2, panelY + panelHeight - 15);
    } else if (gameState.tierSetCollected >= 6) {
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🏆 ALMOST THERE! 🏆', panelX + panelWidth/2, panelY + panelHeight - 15);
    }
    
    ctx.textAlign = 'left'; // Reset text alignment
}

function drawUnifiedPanel() {
    const collectedItems = gameItems.filter(item => item.collected > 0 && item.type !== "tier_set"); // Exclude tier set items
    
    // Panel positioning
    const startX = 20;
    const startY = 20;
    const panelWidth = 280;
    const lineHeight = 18;
    const maxVisibleItems = 12; // Reduced to fit header info
    
    // Calculate panel height including header
    const headerHeight = 100; // Increased to fit player name
    const visibleItems = Math.min(collectedItems.length, maxVisibleItems);
    const collectionsHeight = collectedItems.length > 0 ? (visibleItems * lineHeight + 35) : 0; // +35 for "ITEMS COLLECTED:" title + bottom padding
    const panelHeight = headerHeight + collectionsHeight;
    
    // Background for unified panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(startX - 10, startY - 10, panelWidth, panelHeight);
    
    // Border
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.strokeRect(startX - 10, startY - 10, panelWidth, panelHeight);
    
    // Player name - at the top
    ctx.fillStyle = '#4ECDC4';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Player: ${gameState.playerName}`, startX, startY + 20);
    
    // Score display - large and prominent
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`${gameState.score}`, startX, startY + 55);
    
    // Level display - below score
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.fillText(`Level ${gameState.currentLevel}`, startX, startY + 75);
    
    // Items count - below level
    ctx.fillStyle = '#CCC';
    ctx.font = '12px Arial';
    ctx.fillText(`${gameState.perfectCollections} items`, startX, startY + 90);
    
    // Tier Set Progress - special highlight
    if (gameState.tierSetCollected > 0 || gameState.tierSetMissed > 0) {
        if (gameState.gameUnwinnable) {
            ctx.fillStyle = '#FF0000';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`Dragonstalker: ${gameState.tierSetCollected}/8 ❌`, startX + 90, startY + 90);
        } else {
            ctx.fillStyle = '#00FFFF';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(`Dragonstalker: ${gameState.tierSetCollected}/8 🏆`, startX + 90, startY + 90);
        }
    }
    
    // Collections section (if any items collected)
    if (collectedItems.length > 0) {
        let yOffset = headerHeight + 15;
        
        // Collections title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ITEMS COLLECTED:', startX, startY + yOffset);
        yOffset += 20;
        
        // Draw collection items (excluding tier set items)
        ctx.font = '13px Arial';
        
        collectedItems.slice(0, maxVisibleItems).forEach(item => {
            const totalPoints = item.collected * item.value;
            
            // Color code by type
            let color = '#FFFFFF'; // default white
            if (item.type === 'regular') {
                color = '#00FF00'; // green
            } else if (item.type === 'epic') {
                color = '#9932CC'; // purple
            } else if (item.type === 'special') {
                color = '#FF69B4'; // hot pink
            } else if (item.type === 'legendary') {
                color = '#FFD700'; // gold
            } else if (item.type === 'zee_zgnan') {
                color = '#FF0080'; // deep pink/magenta
            }
            
            ctx.fillStyle = color;
            ctx.fillText(`${item.name}: ${item.collected} (${totalPoints}pts)`, startX, startY + yOffset);
            yOffset += lineHeight;
        });
        
        // Show "..." if there are more items
        if (collectedItems.length > maxVisibleItems) {
            ctx.fillStyle = '#CCCCCC';
            ctx.fillText('...', startX, startY + yOffset);
        }
    }
}

// Toggle pause function
function togglePause() {
    if (!gameState.gameRunning) return;
    
    gameState.gamePaused = !gameState.gamePaused;
    
    if (gameState.gamePaused) {
        // Pause background music
        if (!sounds.background.paused) {
            sounds.background.pause();
        }
    } else {
        // Resume background music if it was playing before
        if (gameState.perfectCollections >= gameConfig.audio.backgroundMusicStart && !audioState.isMuted) {
            sounds.background.play().catch(e => console.log('Background music failed to resume'));
        }
    }
}

// Pause from restart function
function pauseAndRestart() {
    restartGame();
}

function drawPauseMenu() {
    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Pause menu panel
    const panelWidth = 400;
    const panelHeight = 300;
    const panelX = (canvas.width - panelWidth) / 2;
    const panelY = (canvas.height - panelHeight) / 2;
    
    ctx.fillStyle = 'rgba(20, 20, 20, 0.95)';
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
    
    // Title
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', canvas.width/2, panelY + 60);
    
    // Instructions
    ctx.fillStyle = '#CCC';
    ctx.font = '18px Arial';
    ctx.fillText('Game is paused', canvas.width/2, panelY + 100);
    ctx.font = '16px Arial';
    ctx.fillText('Press ESC or click Continue to resume', canvas.width/2, panelY + 125);
    
    // Continue button
    const continueButtonWidth = 150;
    const continueButtonHeight = 45;
    const continueButtonX = panelX + (panelWidth / 2) - continueButtonWidth - 10;
    const continueButtonY = panelY + 180;
    
    ctx.fillStyle = '#4ECDC4';
    ctx.fillRect(continueButtonX, continueButtonY, continueButtonWidth, continueButtonHeight);
    ctx.strokeStyle = '#26d0ce';
    ctx.lineWidth = 2;
    ctx.strokeRect(continueButtonX, continueButtonY, continueButtonWidth, continueButtonHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Continue', continueButtonX + continueButtonWidth/2, continueButtonY + 28);
    
    // Restart button
    const restartButtonWidth = 150;
    const restartButtonHeight = 45;
    const restartButtonX = panelX + (panelWidth / 2) + 10;
    const restartButtonY = panelY + 180;
    
    ctx.fillStyle = '#FF6B6B';
    ctx.fillRect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight);
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 2;
    ctx.strokeRect(restartButtonX, restartButtonY, restartButtonWidth, restartButtonHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Arial';
    ctx.fillText('Restart', restartButtonX + restartButtonWidth/2, restartButtonY + 28);
    
    // Store button coordinates for click detection
    gameState.pauseMenuBounds = {
        continue: {
            x: continueButtonX,
            y: continueButtonY,
            width: continueButtonWidth,
            height: continueButtonHeight
        },
        restart: {
            x: restartButtonX,
            y: restartButtonY,
            width: restartButtonWidth,
            height: restartButtonHeight
        }
    };
    
    ctx.textAlign = 'left';
}