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
        thresholds: [0, 50, 100, 130, 150, 160], // Level 1-6 thresholds
        // Speed multipliers for each level
        speedMultipliers: [1.0, 1.3, 1.6, 2.0, 2.4], // Level 1-5 multipliers
        levelBeyond5Increment: 0.3, // Each level beyond 5 adds this much speed
        maxSpeedMultiplier: 6.0,    // Cap on speed multiplier
    },
    
    // === ITEM DROP PROBABILITIES ===
    itemProbabilities: {
        regular: 0.4,               // Regular items base probability (40%)
        epic: 0.05,                 // Epic items base probability (5%)
        special: 0.02,              // Special items base probability (2%)
        legendary: 0.01,            // Legendary items base probability (1%)
    },
    
    // === VISUAL SETTINGS ===
    visuals: {
        itemSize: 120,              // Size of falling items (width & height)
        playerWidth: 85,
        playerHeight: 165,
        playerSpeed: 12,
        minYSpacing: 250,           // Minimum spacing between falling objects
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
        // Smooth mouse following
        const distance = targetX - this.x;
        this.x += distance * gameConfig.player.moveSmoothing;
        
        // Keep player within bounds
        this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));
        
        // Update impact timer
        if (this.impactTimer > 0) {
            this.impactTimer--;
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
    speedMultiplier: 1,
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
    
    // Cut time tracking
    cutTimeSpawned: 0,  // Track how many cut_time power-ups have spawned
    permanentSpeedReduction: 1.0, // Permanent speed multiplier from cut_time effects
    
    // Player info
    playerName: '',
};

// High Scores System
const HIGH_SCORES_KEY = 'efto_high_scores';
const MAX_HIGH_SCORES = 100;

// Create player instance
const player = new Player(canvas.width, canvas.height);

// Items database with structured data
const gameItems = [
    
    
    
    { id: "ring1", name: "Ring 1", image: "items/ring1.png", value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "ring2", name: "Ring2", image: "items/ring2.png", value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "ring3", name: "Ring3", image: "items/ring3.png", value: 4, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    { id: "gold", name: "Gold", image: "items/gold.png", value: 8, collected: 0, type: "regular", baseProbability: gameConfig.itemProbabilities.regular, sound: "" },
    
    { id: "ashjrethul", name: "Ashjrethul", image: "items/4.png", value: 3, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "maladath", name: "Maladath", image: "items/5.png", value: 3, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "ashkandi", name: "Ashkandi", image: "items/2.png", value: 1, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "ashkandi2", name: "Another Ashkandi", image: "items/ashkandi.png", value: 1, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "quick-strike-ring", name: "Quick Strike Ring", image: "items/quick-strike-ring.png", value: 1, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "brutality_blade", name: "Brutality Blade", image: "items/3.png", value: 1, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
    { id: "dalrends", name: "Dal Rends", image: "items/dalrends.png", value: 1, collected: 0, type: "epic", baseProbability: gameConfig.itemProbabilities.epic, sound: "" },
   
    { id: "crulshorukh", name: "Crulshorukh", image: "items/6.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "cloak", name: "Cloak", image: "items/7.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "dragonstalker", name: "Dragon Stalker Set", image: "items/dragonstalker.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "drakefangtalisman", name: "Drake Fang Talisman", image: "items/dft.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "onslaught", name: "Onslaught", image: "items/onslaught.png", value: 4, collected: 0, type: "special", baseProbability: gameConfig.itemProbabilities.special, sound: "" },
    { id: "tunder", name: "Tunder", image: "items/tunder.png", value: 5, collected: 0, type: "legendary", baseProbability: gameConfig.itemProbabilities.legendary, sound: "" }
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
        speed: { min: 2, max: 3.5 },
        size: { width: 120, height: 120 },
        color: "#FF4500",
        effects: "burn"
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
        speed: { min: 1, max: 3 },
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
        description: "Slows down time"
    },
    {
        id: "power_word_shield",
        name: "Power Word Shield",
        image: "assets/powerwordshield.jpg",
        effect: "heal",
        value: 10, // Heal 10 HP
        duration: 0, // Instant effect
        type: "heal",
        color: "#FFD700",
        sound: "assets/shield_cast.mp3",
        description: "Restores 10 HP"
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
        description: "Restores 20 HP"
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
        spawnChance: 0.1 // 10% chance when conditions are met (very rare)
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
    fireballimpact: new Audio('assets/fireballimpact.mp3')  // Very loud fireball impact sound
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

// Also handle touch for mobile devices
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
});

// Keyboard controls for settings
document.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' || e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        gameState.showSettings = !gameState.showSettings;
    }
    if (e.key === 'Escape') {
        gameState.showSettings = false;
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
    if (item.baseProbability === 0.01) {
        return Math.min(0.12, finalProbability); // Ultra rare caps at 12%
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
    const droppableItems = gameItems.filter(item => item.type !== "milestone");
    
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
        
        this.width = gameConfig.visuals.itemSize;
        this.height = gameConfig.visuals.itemSize;
        // Random speed variation: 0.5x to 2.0x of base speed for dynamic gameplay
        const speedVariation = 0.5 + Math.random() * 1.5; // Random between 0.5 and 2.0
        this.speed = gameState.baseDropSpeed * gameState.speedMultiplier * gameState.permanentSpeedReduction * speedVariation;
        
        // Select item based on probability weights
        this.itemData = selectRandomItem();
        
        // Create image object for this specific item
        this.itemImage = new Image();
        this.itemImage.src = this.itemData.image;
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
    }

    update() {
        this.y += this.speed;
        this.rotation += this.rotationSpeed;
        
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
        
        // Use the specific item image if loaded, otherwise use fallback
        if (this.itemImage && this.itemImage.complete && this.itemImage.naturalWidth > 0) {
            ctx.drawImage(this.itemImage, -this.width/2, -this.height/2, this.width, this.height);
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
                ctx.drawImage(images.items[fallbackIndex], -this.width/2, -this.height/2, this.width, this.height);
            } else {
                // Final fallback: draw a colored rectangle
                ctx.fillStyle = this.itemData.type === 'regular' ? '#00FF00' : 
                               this.itemData.type === 'epic' ? '#9932CC' : 
                               this.itemData.type === 'special' ? '#FF69B4' : '#FFD700';
                ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
                
                // Add item name text
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.itemData.name, 0, 0);
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
        this.speed = gameState.baseDropSpeed * gameState.speedMultiplier * gameState.permanentSpeedReduction * speedVariation;
        
        // Visual effects
        this.glowAnimation = 0;
        
        // Create image object for this projectile
        this.projectileImage = new Image();
        this.projectileImage.src = projectileData.image;
    }

    update() {
        this.y += this.speed;
        this.glowAnimation += 0.2;
        
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
        
        // Check if projectile image is loaded, otherwise draw a placeholder
        if (this.projectileImage && this.projectileImage.complete && this.projectileImage.naturalWidth > 0) {
            ctx.drawImage(this.projectileImage, this.x, this.y, this.width, this.height);
        } else {
            // Draw placeholder based on projectile type
            if (this.data.id === "fireball") {
                // Fireball placeholder
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/3, 0, Math.PI * 2);
                ctx.fill();
            } else if (this.data.id === "frostbolt") {
                // Frostbolt placeholder
                ctx.fillStyle = '#00BFFF';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#87CEEB';
                ctx.beginPath();
                ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/3, 0, Math.PI * 2);
                ctx.fill();
                // Add frost effect lines
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                for (let i = 0; i < 6; i++) {
                    const angle = (i * Math.PI) / 3;
                    const startX = this.x + this.width/2 + Math.cos(angle) * (this.width/4);
                    const startY = this.y + this.height/2 + Math.sin(angle) * (this.height/4);
                    const endX = this.x + this.width/2 + Math.cos(angle) * (this.width/2.5);
                    const endY = this.y + this.height/2 + Math.sin(angle) * (this.height/2.5);
                    ctx.beginPath();
                    ctx.moveTo(startX, startY);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();
                }
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
        
        this.width = 120;
        this.height = 120;
        
        // Slower speed for power-ups (easier to collect)
        const speedVariation = 0.6 + Math.random() * 0.8; // Slower than regular items
        this.speed = gameState.baseDropSpeed * gameState.speedMultiplier * gameState.permanentSpeedReduction * speedVariation;
        
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
        this.y += this.speed * gameState.timeSlowMultiplier; // Affected by time slow
        this.rotation += this.rotationSpeed;
        this.glowAnimation += 0.15;
        this.pulseAnimation += 0.1;
        
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
        const drawWidth = this.width * pulse;
        const drawHeight = this.height * pulse;
        
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the specific power-up image if loaded, otherwise use placeholder
        if (this.powerUpImage && this.powerUpImage.complete && this.powerUpImage.naturalWidth > 0) {
            ctx.drawImage(this.powerUpImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on power-up type
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
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
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
        
        // Select random power-up from available options
        if (availablePowerUps.length > 0) {
            const randomPowerUp = availablePowerUps[Math.floor(Math.random() * availablePowerUps.length)];
            activePowerUps.push(new PowerUpItem(randomPowerUp));
            
            // Track cut_time spawns
            if (randomPowerUp.id === "time_cutter") {
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
    if (!gameState.gameRunning) return;
    
    // Update elapsed time
    gameState.elapsedTime = (Date.now() - gameState.gameStartTime) / 1000;

    // Update time slow effect
    if (gameState.timeSlowActive) {
        gameState.timeSlowTimer--;
        if (gameState.timeSlowTimer <= 0) {
            gameState.timeSlowActive = false;
            gameState.timeSlowMultiplier = 1.0;
        }
    }

    updatePlayer();
    


    // Update falling items
    fallingItems = fallingItems.filter(item => {
        const stillActive = item.update();
        
        if (!stillActive && item.missed) {
            gameState.missedItems++;
            gameState.health = Math.max(0, gameState.health - gameConfig.gameplay.healthLossOnMiss);
            playUffSound();  // Changed from playScreamSound to playUffSound
            if (gameState.health <= 0) {
                endGame();
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
            playItemSound(item.itemData);
            
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





    // Update fireballs
    fireballs = fireballs.filter(fireball => {
        const stillActive = fireball.update();
        
        if (stillActive && fireball.checkCollision(player)) {
            // Play appropriate impact sound based on projectile type
            fireball.playImpactSound();
            
            // Trigger player impact reaction
            player.onHit();
            
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
    
    // Settings panel
    const panelWidth = 600;
    const panelHeight = 500;
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
    
    // Instructions
    ctx.fillStyle = '#CCC';
    ctx.font = '16px Arial';
    ctx.fillText('Press TAB or I to toggle • ESC to close', canvas.width/2, panelY + 80);
    
    let yPos = panelY + 120;
    ctx.textAlign = 'left';
    ctx.font = 'bold 20px Arial';
    
    // Regular Items Section (1 point)
    ctx.fillStyle = '#00FF00';
    ctx.fillText('REGULAR ITEMS (1 point each):', panelX + 30, yPos);
    yPos += 25;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText('Ashkandi, Brutality Blade', panelX + 50, yPos);
    yPos += 35;
    
    // Epic Items Section (3 points)
    ctx.fillStyle = '#9932CC';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('EPIC ITEMS (3 points each):', panelX + 30, yPos);
    yPos += 25;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText('Ashjrethul, Maladath', panelX + 50, yPos);
    yPos += 35;
    
    // Special Items Section (4 points)
    ctx.fillStyle = '#FF69B4';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('SPECIAL ITEMS (4 points each):', panelX + 30, yPos);
    yPos += 25;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText('Crulshorukh, Cloak, Ring', panelX + 50, yPos);
    yPos += 35;
    
    // Legendary Items Section (5 points)
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('LEGENDARY ITEMS (5 points each):', panelX + 30, yPos);
    yPos += 25;
    ctx.fillStyle = '#FFF';
    ctx.font = '14px Arial';
    ctx.fillText('Tunder (rare drop)', panelX + 50, yPos);
    yPos += 35;
    

    
    // Other Items Section
    ctx.fillStyle = '#FF4500';
    ctx.font = 'bold 20px Arial';
    ctx.fillText('OTHER ELEMENTS:', panelX + 30, yPos);
    yPos += 30;
    
    ctx.fillStyle = '#FFF';
    ctx.font = '16px Arial';
    ctx.fillText('efto.png - Player character', panelX + 50, yPos);
    ctx.fillText('fireball.png - Dangerous obstacles', panelX + 50, yPos + 25);
    ctx.fillText('vano.png - Impact reaction face', panelX + 50, yPos + 50);
    
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
    
    // Game speed display - bottom left
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, canvas.height - 50, 200, 40);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, canvas.height - 50, 200, 40);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Game Speed:', 20, canvas.height - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    const effectiveSpeed = gameState.levelSpeedMultiplier * gameState.permanentSpeedReduction;
    const speedText = `${effectiveSpeed.toFixed(1)}x`;
    ctx.fillText(speedText, 110, canvas.height - 30);
    
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

    
    // Draw settings screen if active
    if (gameState.showSettings) {
        drawSettings();
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
        speedMultiplier: 1,
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
        
        // Reset cut time tracking
        cutTimeSpawned: 0,
        permanentSpeedReduction: 1.0,
        
        // Keep player name
        playerName: currentPlayerName
    };
    
    // Reset collection counts for all items
    gameItems.forEach(item => {
        item.collected = 0;
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
    
    displayHighScores();
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

function drawUnifiedPanel() {
    const collectedItems = gameItems.filter(item => item.collected > 0);
    
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
    
    // Collections section (if any items collected)
    if (collectedItems.length > 0) {
        let yOffset = headerHeight + 15;
        
        // Collections title
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 14px Arial';
        ctx.fillText('ITEMS COLLECTED:', startX, startY + yOffset);
        yOffset += 20;
        
        // Draw collection items
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