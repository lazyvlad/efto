// Import all modules
import { gameConfig } from './config/gameConfig.js';
import { gameItems } from './data/gameItems.js';
import { damageProjectiles } from './data/damageProjectiles.js';
import { powerUpItems } from './data/powerUpItems.js';

import { Player } from './classes/Player.js';
import { FallingItem } from './classes/FallingItem.js';
import { DamageProjectile, Fireball } from './classes/DamageProjectile.js';
import { PowerUpItem } from './classes/PowerUpItem.js';
import { Particle } from './classes/Particle.js';

import { tryAutoInitAudio, startBackgroundMusic, playVoiceSound, playUffSound, playScreamSound, playTotalSound, playFireballImpactSound, playDragonstalkerSound, playThunderSound, playItemSound, toggleAudio, audioInitialized, audioState, volumeSettings } from './systems/audioSystem.js';
import { loadHighScores, addHighScore, isHighScore, displayHighScores, displayHighScoresSync } from './systems/highScoreSystem.js';
import { initializeInputSystem, updatePlayerPosition } from './systems/inputSystem.js';
// drawSettings removed - now using HTML+CSS guide

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateDeltaTimeMultiplier, updateGameStateTimers, addNotification, updateNotifications, drawNotifications, responsiveScaler, trackActivity, getLevelProgress, checkDragonstalkerCompletion } from './utils/gameUtils.js';
import { selectRandomItem, selectRandomProjectile, selectRandomPowerUp, shouldSpawnPowerUp, createCollectionParticles, createImpactParticles, createShadowParticles, calculateProjectileProbability } from './utils/spawning.js';
import { spellSystem } from './systems/spellSystem.js';
import { assetManager } from './utils/AssetManager.js';
import { getAssetsByLevel, assetRegistry } from './data/assetRegistry.js';

// === GLOBAL GAME STATE ===
let gameState = {
    // Core game state
    score: 0,
    health: 100,
    maxHealth: 100,
    gameRunning: false,
    gamePaused: false,
    currentScreen: 'menu', // 'menu', 'game', 'gameOver', 'victory', 'highScores'
    playerName: '',
    
    // Level and speed
    currentLevel: 0, // 0-based internal level (displays as Level 1 to user)
    levelSpeedMultiplier: 1.0,
    baseDropSpeed: gameConfig.gameplay.baseDropSpeed,
    permanentSpeedReduction: 0.0,
    
    // Hybrid progression tracking
    levelStartTime: 0,              // When current level started (in seconds)
    timeRequiredForNextLevel: 45,   // Time needed for next level (adjusted by activity)
    levelActivity: {                // Activity counters for current level
        collections: 0,
        misses: 0,
        powerUpsCollected: 0,
        damageReceived: 0
    },
    horizontalSpeedReduction: 0.15, // Dynamic parameter for horizontal speed reduction (0.0 to 1.0) - can be modified by power-ups
    
    // Fall angle configuration - can be modified by power-ups
    fallAngleMin: gameConfig.gameplay.fallAngles.minAngle,     // Minimum fall angle in degrees
    fallAngleMax: gameConfig.gameplay.fallAngles.maxAngle,     // Maximum fall angle in degrees
    allowUpwardMovement: gameConfig.gameplay.fallAngles.allowUpwardMovement, // Allow upward movement
    upwardAngleMin: gameConfig.gameplay.fallAngles.upwardAngleMin, // Min upward angle
    upwardAngleMax: gameConfig.gameplay.fallAngles.upwardAngleMax, // Max upward angle
    
    // Power-up effects
    timeSlowActive: false,
    timeSlowTimer: 0,
    timeSlowMultiplier: 1.0,
    freezeTimeActive: false,
    freezeTimeTimer: 0,
    speedIncreaseActive: false,
    speedIncreaseTimer: 0,
    speedIncreaseMultiplier: 1.0,
    currentSpeedIncreasePercent: 0,
    shieldActive: false,
    shieldTimer: 0,
    
    // Horizontal speed modification effects
    horizontalSpeedModActive: false,
    horizontalSpeedModTimer: 0,
    originalHorizontalSpeedReduction: 0.15, // Store original value for restoration
    
    // Fall angle modification effects
    fallAngleModActive: false,
    fallAngleModTimer: 0,
    originalFallAngleMin: gameConfig.gameplay.fallAngles.minAngle,
    originalFallAngleMax: gameConfig.gameplay.fallAngles.maxAngle,
    originalAllowUpwardMovement: gameConfig.gameplay.fallAngles.allowUpwardMovement,
    
    // Damage-over-time effects
    shadowboltDots: [],         // Array of active shadowbolt DOT effects
    shadowboltTimer: 0,         // Timer until next damage tick
    shadowboltTickRate: 60,     // Frames between damage ticks (1 second at 60fps)
    shadowboltDamagePerTick: 2, // Damage per tick per stack
    
    // Heal-over-time effects
    chickenFoodHots: [],        // Array of active chicken food HOT effects
    chickenFoodTimer: 0,        // Timer until next heal tick
    chickenFoodTickRate: 60,    // Frames between heal ticks (1 second at 60fps)
    chickenFoodHealPerTick: 1,  // Heal per tick per stack
    
    // Reverse Gravity state
    reverseGravityActive: false, // Whether reverse gravity is active
    reverseGravityTimer: 0,      // Duration timer for reverse gravity effect
    
    // Counters
    perfectCollections: 0,
    missedItems: 0,
    tierSetCollected: 0,
    tierSetMissed: 0,
    dragonstalkerCompletions: 0,     // Number of complete sets collected
    permanentSpeedReductionFromSets: 0,  // Accumulated permanent speed reduction from sets

    powerUpsSpawned: 0,
    cutTimeSpawned: 0,
    lastPowerUpScore: 0,
    
    // UI state
    showingPauseMenu: false,
    menuButtonBounds: null,
    pauseMenuBounds: null,
    howToPlaySource: 'menu', // Track where howToPlay was accessed from
    
    // Notifications
    notifications: [],
    
    // Player reference
    player: null
};

// Game objects
let player;
let fallingItems = [];
let fireballs = [];
let powerUps = [];
let particles = [];
let images = { items: [], spells: {} };
let recentDropYPositions = [];

// Background is handled by CSS

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get canvas overlay for preventing mouse interaction when game is not active
const canvasOverlay = document.getElementById('canvasOverlay');

// Initialize the game
async function init() {
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Hide all UI elements initially - nothing should be visible during loading
    hideAllUIElements();
    
    // Show loading screen
    showLoadingScreen();
    
    // Start asset loading with enhanced progress tracking
    console.log('Starting asset preloading...');
    assetManager.onProgress((progress) => {
        updateLoadingProgress(progress * 0.7); // Reserve 30% for other initialization
    });
    
    // Set up additional asset manager callbacks
    assetManager.onTier2Ready(() => {
        console.log('Tier 2 assets ready - starting background loading');
    });
    
    assetManager.onTier3Ready(() => {
        console.log('All assets loaded - optimal performance achieved');
    });
    
    // Start loading assets
    assetManager.startLoading();
    
    // Wait for critical assets (Tier 1) before continuing
    await new Promise(resolve => {
        assetManager.onTier1Ready(resolve);
    });
    
    console.log('Critical assets loaded, initializing game systems...');
    updateLoadingProgress(0.75);
    
    // Initialize player
    player = new Player(canvas.width, canvas.height);
    gameState.player = player;
    updateLoadingProgress(0.8);
    
    // Audio initialization is now handled by AssetManager during Tier 2 loading
    // Just set up the UI button
    tryAutoInitAudio();
    updateLoadingProgress(0.85);
    
    // Initialize input system
    initializeInputSystem(canvas, gameState, player, restartGame, startGame, null, showPauseMenu, () => {
        gameState.currentScreen = 'highScores';
        safeDisplayHighScores();
    }, updateCanvasOverlay);
    updateLoadingProgress(0.9);
    
    // Set up spell system notification callback
    spellSystem.setNotificationCallback((message, duration, color) => {
        addNotification(gameState, message, duration, color);
    });
    
    // Set up spell system game state callback
    spellSystem.setGameStateCallback(() => gameState);
    
    // Expose gameItems to window for spell system access
    window.gameItems = gameItems;
    
    // Load spell icons
    loadSpellIcons();
    updateLoadingProgress(0.93);
    
    // Set up UI event handlers with asset manager debugging
    setupUIEventHandlers();
    updateLoadingProgress(0.95);
    
    // Initialize audio status message
    updateAudioStatusMessage();
    
    // Warmup cache with common assets
    await assetManager.warmupCache(1);
    updateLoadingProgress(0.98);
    
    // Load high scores on initialization (prepare data)
    safeDisplayHighScores();
    
    // Initialize canvas overlay
    updateCanvasOverlay();
    
    // Final initialization steps
    updateLoadingProgress(1.0);
    
    // Small delay to ensure smooth transition
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // NOW we can hide loading screen and show the welcome screen
    hideLoadingScreen();
    showNameEntry();
    
    console.log('Game initialization complete - ready for player interaction');
    
    // Start game loop
    gameLoop();
    
    // Enable performance monitoring for development (toggle with Ctrl+Shift+P)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Development mode: Press Ctrl+Shift+P to toggle asset performance monitor');
    }
}

// Helper function to hide all UI elements during loading
function hideAllUIElements() {
    const elements = [
        'nameEntry',
        'highScores', 
        'howToPlay',
        'gameOver'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// Handle window resize to maintain fullscreen and reposition player
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Update responsive scaling
    responsiveScaler.updateScaling();
    
    // Reposition player if needed
    if (player && player.repositionOnResize) {
        player.repositionOnResize(canvas.width, canvas.height);
    }
});

// Update canvas overlay visibility based on game state
function updateCanvasOverlay() {
    const overlay = document.getElementById('canvasOverlay');
    const gameUI = document.getElementById('gameUI');
    
    if (gameState.gameRunning && !gameState.showingPauseMenu) {
        // Game is running - hide overlay, show game UI
        overlay.style.display = 'none';
        if (gameUI) gameUI.style.display = 'block';
        
        // Update spell bar and health bar
        updateSpellBarHTML();
        updateHealthBarHTML();
    } else {
        // Game is paused or not running - show overlay, hide game UI
        overlay.style.display = 'block';
        if (gameUI) gameUI.style.display = 'none';
    }
}

// Main game loop
function gameLoop() {
    const deltaTimeMultiplier = calculateDeltaTimeMultiplier();
    
    // Update
    if (gameState.gameRunning && !gameState.showingPauseMenu) {
        update(deltaTimeMultiplier);
    } else if (gameState.gameRunning) {
        // Update player position even when paused/in settings
        updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig);
    }
    
    // Update canvas overlay visibility
    updateCanvasOverlay();
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTimeMultiplier) {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    // Update spell system first
    spellSystem.update(Date.now(), player, canvas, gameConfig);
    
    // Update game state timers
    updateGameStateTimers(gameState, deltaTimeMultiplier);
    
    // Update level progression and speed using threshold-based system
    const oldLevel = gameState.currentLevel;
    const oldSpeedMultiplier = gameState.levelSpeedMultiplier;
    
    // Calculate new level and speed multiplier based on current score
    calculateLevelSpeedMultiplier(gameState);
    
    // Check if level increased
    if (gameState.currentLevel > oldLevel) {
        // Preload assets for higher levels (async to avoid blocking)
        setTimeout(() => preloadLevelAssets(gameState.currentLevel), 0);
        
        console.log(`Level up! Now level ${gameState.currentLevel + 1} (Speed: ${gameState.levelSpeedMultiplier.toFixed(2)}x) at score ${gameState.score}`);
        addNotification(gameState, `Level ${gameState.currentLevel + 1}!`, 2000, '#FFD700');
    }
    
    // Debug: Log current score and level every 60 frames (1 second) for testing
    if (typeof gameState.debugFrameCounter === 'undefined') gameState.debugFrameCounter = 0;
    // Speed monitor removed - no longer needed
    gameState.debugFrameCounter++;
    // Reduce debug logging frequency to every 10 seconds for better performance
    if (gameState.debugFrameCounter % 600 === 0) { // Every 10 seconds instead of 5
        console.log(`🔍 LEVEL SPEED DEBUG: Score ${gameState.score}, Level ${gameState.currentLevel + 1}, Level Speed Multiplier: ${gameState.levelSpeedMultiplier.toFixed(2)}x, Base Drop Speed: ${gameState.baseDropSpeed}, Permanent Reduction: ${gameState.permanentSpeedReduction.toFixed(2)}x`);
    }
    
    // Update player position
    updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig);
    
    // Spawn new items, projectiles, and power-ups
    spawnItems(deltaTimeMultiplier);
    spawnProjectiles(deltaTimeMultiplier);
    spawnPowerUps(deltaTimeMultiplier);
    
    // Update all game objects
    updateFallingItems(deltaTimeMultiplier);
    updateProjectiles(deltaTimeMultiplier);
    updatePowerUps(deltaTimeMultiplier);
    updateParticles(deltaTimeMultiplier);
    
    // Check collisions
    checkCollisions();
    
    // Check end conditions
    checkGameEndConditions();
    
    // Update notifications
    updateNotifications(gameState);
}

// Render everything
function render() {
    // Clear canvas (background is handled by CSS)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.currentScreen === 'menu') {
        // Menu screen (no canvas-based overlays needed)
    } else if (gameState.currentScreen === 'game' || gameState.gameRunning) {
        renderGame();
        // Note: Pause menu is now HTML-based, not canvas-based
    } else if (gameState.currentScreen === 'gameOver') {
        renderGameOver();
    } else if (gameState.currentScreen === 'victory') {
        renderVictory();
    } else if (gameState.currentScreen === 'highScores') {
        renderHighScores();
    }
}

// Simple implementations for now - these would be expanded

function renderGame() {
    // Draw movable area border if enabled (now responsive)
    const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
    if (movableAreaConfig.enabled && movableAreaConfig.showBorder) {
        const movableHeight = canvas.height * movableAreaConfig.heightPercent;
        const borderY = canvas.height - movableHeight;
        
        ctx.save();
        ctx.strokeStyle = movableAreaConfig.borderColor;
        ctx.globalAlpha = movableAreaConfig.borderOpacity;
        ctx.lineWidth = movableAreaConfig.borderWidth;
        
        // Draw horizontal line at the top of movable area
        ctx.beginPath();
        ctx.moveTo(0, borderY);
        ctx.lineTo(canvas.width, borderY);
        ctx.stroke();
        
        // Optional: Draw subtle side borders
        ctx.beginPath();
        ctx.moveTo(0, borderY);
        ctx.lineTo(0, canvas.height);
        ctx.moveTo(canvas.width, borderY);
        ctx.lineTo(canvas.width, canvas.height);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render game elements
    particles.forEach(particle => particle.draw(ctx));
    fallingItems.forEach(item => item.draw(ctx, gameConfig));
    fireballs.forEach(projectile => projectile.draw(ctx));
    powerUps.forEach(powerUp => powerUp.draw(ctx));
    player.draw(ctx, gameState.shieldActive);
    
    // Render power-up status indicators
    renderPowerUpStatus();
    
    // Update DOM-based items panel (throttled for performance)
    // Only update every 10 frames to reduce DOM manipulation overhead
    if (!gameState.domUpdateCounter) gameState.domUpdateCounter = 0;
    gameState.domUpdateCounter++;
    if (gameState.domUpdateCounter % 10 === 0) {
        updateDOMItemsPanel(gameState, gameItems);
    }
    
    // Draw notifications (top center)
    drawNotifications(ctx, canvas, gameState);
    
    // Health bar now rendered via HTML/CSS
    
    // Old speed panel removed - replaced by superior Speed Analysis Monitor
    
    // Spell UI now rendered via HTML/CSS
}

function renderGameOver() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width/2, canvas.height/2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('Press SPACE to restart', canvas.width/2, canvas.height/2 + 60);
}

function renderVictory() {
    ctx.fillStyle = 'gold';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VICTORY!', canvas.width/2, canvas.height/2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.width/2, canvas.height/2 + 20);
    ctx.fillText('You collected all Dragonstalker pieces!', canvas.width/2, canvas.height/2 + 60);
}

function renderHighScores() {
    ctx.fillStyle = 'white';
    ctx.font = '36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('HIGH SCORES', canvas.width/2, 100);
    
    ctx.font = '16px Arial';
    ctx.fillText('Press ESC to return', canvas.width/2, canvas.height - 50);
}

function renderPowerUpStatus() {
    let yOffset = canvas.height - 100;
    
    if (gameState.timeSlowActive) {
        ctx.fillStyle = 'rgba(0, 0, 255, 0.8)';
        ctx.fillRect(10, yOffset, 200, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('TIME SLOW ACTIVE', 15, yOffset + 20);
        yOffset -= 35;
    }
    
    if (gameState.freezeTimeActive) {
        ctx.fillStyle = 'rgba(135, 206, 235, 0.8)';
        ctx.fillRect(10, yOffset, 200, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('PROJECTILES FROZEN', 15, yOffset + 20);
        yOffset -= 35;
    }
    
    if (gameState.speedIncreaseActive) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.fillRect(10, yOffset, 250, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.fillText(`SPEED BOOST: +${gameState.currentSpeedIncreasePercent}%`, 15, yOffset + 20);
        yOffset -= 35;
    }
    
    if (gameState.shieldActive) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.fillRect(10, yOffset, 250, 30);
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        const shieldSecondsLeft = Math.ceil(gameState.shieldTimer / 60);
        ctx.fillText(`🛡️ SHIELD ACTIVE: ${shieldSecondsLeft}s`, 15, yOffset + 20);
        yOffset -= 35;
    }
    
    if (gameState.shadowboltDots && gameState.shadowboltDots.length > 0) {
        ctx.fillStyle = 'rgba(75, 0, 130, 0.8)'; // Dark purple background
        ctx.fillRect(10, yOffset, 280, 30);
        ctx.fillStyle = '#8A2BE2'; // Brighter purple text
        ctx.font = 'bold 16px Arial';
        const nextTickIn = Math.ceil(gameState.shadowboltTimer / 60);
        ctx.fillText(`🌑 SHADOW DOT: ${gameState.shadowboltDots.length} stacks (${nextTickIn}s)`, 15, yOffset + 20);
        yOffset -= 35;
    }
    
    if (gameState.chickenFoodHots && gameState.chickenFoodHots.length > 0) {
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)'; // Golden background
        ctx.fillRect(10, yOffset, 280, 30);
        ctx.fillStyle = '#FFD700'; // Golden text
        ctx.font = 'bold 16px Arial';
        const nextHealIn = Math.ceil(gameState.chickenFoodTimer / 60);
        ctx.fillText(`🐔 CHICKEN FOOD: ${gameState.chickenFoodHots.length} stacks (${nextHealIn}s)`, 15, yOffset + 20);
    }
}

// renderSpellUI function removed - spells now rendered via HTML/CSS

// renderSpeedAnalysisMonitor function removed - no longer needed

// createSpeedMonitor function removed - no longer needed

// updateSpeedMonitor function removed - no longer needed

// hideSpeedMonitor function removed - no longer needed

// Load spell icons
function loadSpellIcons() {
    // Dragon Cry spell icon
    const dragonCryIcon = new Image();
    dragonCryIcon.onload = () => {
        images.spells.dragon_cry = dragonCryIcon;
    };
            dragonCryIcon.src = assetRegistry.buffs.onyxia;
    
    // Zandalari spell icon
    const zandalariIcon = new Image();
    zandalariIcon.onload = () => {
        images.spells.zandalari = zandalariIcon;
    };
            zandalariIcon.src = assetRegistry.buffs.zgBuff1;
    
    // Songflower spell icon
    const songflowerIcon = new Image();
    songflowerIcon.onload = () => {
        images.spells.songflower = songflowerIcon;
    };
            songflowerIcon.src = assetRegistry.buffs.songflower;
}

// Game functions (simplified - these would contain the full logic)
function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.health = gameState.maxHealth;
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    gameState.currentScreen = 'game';
    gameState.currentLevel = 0; // Reset to Level 0 (displays as Level 1)
    gameState.levelSpeedMultiplier = 1.0;
    gameState.baseDropSpeed = gameConfig.gameplay.baseDropSpeed;
    gameState.permanentSpeedReduction = 0.0;
    
    // Reset hybrid progression tracking
    gameState.levelStartTime = Date.now() / 1000;
    gameState.timeRequiredForNextLevel = gameConfig.levels.baseTimePerLevel;
    gameState.levelActivity = {
        collections: 0,
        misses: 0,
        powerUpsCollected: 0,
        damageReceived: 0
    };
    gameState.horizontalSpeedReduction = 0.15; // Reset to default horizontal speed reduction
    gameState.perfectCollections = 0;
    gameState.missedItems = 0;
    gameState.tierSetCollected = 0;
    gameState.tierSetMissed = 0;
    gameState.dragonstalkerCompletions = 0;
    gameState.permanentSpeedReductionFromSets = 0;
    gameState.powerUpsSpawned = 0;
    gameState.cutTimeSpawned = 0;
    gameState.lastPowerUpScore = 0;
    
    // Clear power-up effects
    gameState.timeSlowActive = false;
    gameState.timeSlowTimer = 0;
    gameState.timeSlowMultiplier = 1.0;
    gameState.freezeTimeActive = false;
    gameState.freezeTimeTimer = 0;
    gameState.speedIncreaseActive = false;
    gameState.speedIncreaseTimer = 0;
    gameState.speedIncreaseMultiplier = 1.0;
    gameState.currentSpeedIncreasePercent = 0;
    gameState.shieldActive = false;
    gameState.shieldTimer = 0;
    
    // Clear horizontal speed modification effects
    gameState.horizontalSpeedModActive = false;
    gameState.horizontalSpeedModTimer = 0;
    gameState.originalHorizontalSpeedReduction = 0.15;
    
    // Clear fall angle modification effects
    gameState.fallAngleModActive = false;
    gameState.fallAngleModTimer = 0;
    gameState.originalFallAngleMin = gameConfig.gameplay.fallAngles.minAngle;
    gameState.originalFallAngleMax = gameConfig.gameplay.fallAngles.maxAngle;
    gameState.originalAllowUpwardMovement = gameConfig.gameplay.fallAngles.allowUpwardMovement;
    gameState.fallAngleMin = gameConfig.gameplay.fallAngles.minAngle;
    gameState.fallAngleMax = gameConfig.gameplay.fallAngles.maxAngle;
    gameState.allowUpwardMovement = gameConfig.gameplay.fallAngles.allowUpwardMovement;
    gameState.upwardAngleMin = gameConfig.gameplay.fallAngles.upwardAngleMin;
    gameState.upwardAngleMax = gameConfig.gameplay.fallAngles.upwardAngleMax;
    
    // Clear shadowbolt effects
    gameState.shadowboltDots = [];
    gameState.shadowboltTimer = 0;
    
    // Clear chicken food effects
    gameState.chickenFoodHots = [];
    gameState.chickenFoodTimer = 0;
    
    // Clear arrays
    fallingItems = [];
    fireballs = [];
    powerUps = [];
    particles = [];
    
    // Reset recent drop positions
    recentDropYPositions = [];
    
    // Reset player state
    player.reset();
    
    // Reset items collected count for new game
    gameItems.forEach(item => {
        item.collected = 0;
        item.missed = 0;
        item.spawned = 0;
    });
    
    // Reset canvas overlay
    updateCanvasOverlay();
    
    // Start background music
    startBackgroundMusic();
    
    // Warmup assets for level 1
    assetManager.warmupCache(1);
    
    console.log('Game started');
}

function restartGame() {
    // Reset all game state
    gameState.score = 0;
    gameState.health = 100;
    gameState.currentLevel = 0; // Reset to Level 0 (displays as Level 1)
    gameState.missedItems = 0;
    gameState.perfectCollections = 0;
    gameState.tierSetCollected = 0;
    gameState.tierSetMissed = 0;
    gameState.dragonstalkerCompletions = 0;
    gameState.permanentSpeedReductionFromSets = 0;
    gameState.gameWon = false;
    gameState.levelSpeedMultiplier = 1.0;
    gameState.permanentSpeedReduction = 0;
    
    // Reset hybrid progression tracking
    gameState.levelStartTime = Date.now() / 1000;
    gameState.timeRequiredForNextLevel = gameConfig.levels.baseTimePerLevel;
    gameState.levelActivity = {
        collections: 0,
        misses: 0,
        powerUpsCollected: 0,
        damageReceived: 0
    };
    gameState.horizontalSpeedReduction = 0.15; // Reset to default horizontal speed reduction
    gameState.speedIncreaseActive = false;
    gameState.speedIncreaseTimer = 0;
    gameState.speedIncreaseMultiplier = 1.0;
    gameState.currentSpeedIncreasePercent = 0;
    gameState.timeSlowActive = false;
    gameState.timeSlowTimer = 0;
    gameState.timeSlowMultiplier = 1.0;
    gameState.freezeTimeActive = false;
    gameState.freezeTimeTimer = 0;
    gameState.shieldActive = false;
    gameState.shieldTimer = 0;
    gameState.horizontalSpeedModActive = false;
    gameState.horizontalSpeedModTimer = 0;
    gameState.originalHorizontalSpeedReduction = 0.15;
    gameState.fallAngleModActive = false;
    gameState.fallAngleModTimer = 0;
    gameState.originalFallAngleMin = gameConfig.gameplay.fallAngles.minAngle;
    gameState.originalFallAngleMax = gameConfig.gameplay.fallAngles.maxAngle;
    gameState.originalAllowUpwardMovement = gameConfig.gameplay.fallAngles.allowUpwardMovement;
    gameState.fallAngleMin = gameConfig.gameplay.fallAngles.minAngle;
    gameState.fallAngleMax = gameConfig.gameplay.fallAngles.maxAngle;
    gameState.allowUpwardMovement = gameConfig.gameplay.fallAngles.allowUpwardMovement;
    gameState.upwardAngleMin = gameConfig.gameplay.fallAngles.upwardAngleMin;
    gameState.upwardAngleMax = gameConfig.gameplay.fallAngles.upwardAngleMax;
    gameState.cutTimeSpawned = 0;
    gameState.lastPowerUpScore = 0;
    gameState.notifications = []; // Reset notifications
    
    // Reset UI state
    gameState.showingPauseMenu = false;
    gameState.howToPlaySource = 'menu';
    
    // Reset damage-over-time effects
    gameState.shadowboltDots = [];
    gameState.shadowboltTimer = 0;
    
    // Reset heal-over-time effects
    gameState.chickenFoodHots = [];
    gameState.chickenFoodTimer = 0;
    
    // Clear all game objects
    fallingItems = [];
    fireballs = [];
    powerUps = [];
    particles = [];
    recentDropYPositions = [];
    
    // Reset player
    if (player && player.reset) {
        player.reset();
    }
    
    // Reset items collected count for new game
    gameItems.forEach(item => {
        item.collected = 0;
        item.missed = 0;
        item.spawned = 0;
    });
    
    // Reset canvas overlay
    updateCanvasOverlay();
}

// showInGameSettings function removed - canvas-based guide replaced with HTML+CSS

function showPauseMenu() {
    gameState.showingPauseMenu = true;
    gameState.gameRunning = false;
    
    // Show HTML pause menu instead of canvas-based one
    document.getElementById('pauseMenu').style.display = 'flex';
    
    // Enable cursor interaction with pause menu
    canvas.classList.add('show-cursor');
    
    updateCanvasOverlay();
}

function hidePauseMenu() {
    gameState.showingPauseMenu = false;
    
    // Hide HTML pause menu
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Disable cursor when returning to game
    canvas.classList.remove('show-cursor');
    
    updateCanvasOverlay();
}

// Main game mechanics implementations
function spawnItems(deltaTimeMultiplier) {
    if (fallingItems.length < gameConfig.gameplay.maxFallingItems) {
        if (Math.random() < gameConfig.gameplay.itemSpawnChance * deltaTimeMultiplier) {
            const newItem = new FallingItem(selectRandomItem, isValidYPosition, recentDropYPositions, gameState, images, canvas);
            if (newItem) {
                fallingItems.push(newItem);
            }
        }
    }
}

function spawnProjectiles(deltaTimeMultiplier) {
    if (fireballs.length < gameConfig.gameplay.maxFireballs) {
        const selectedProjectile = selectRandomProjectile(gameState);
        const projectileProbability = calculateProjectileProbability ? 
            calculateProjectileProbability(selectedProjectile, gameState) : 
            selectedProjectile.baseProbability;
        
        if (Math.random() < projectileProbability * deltaTimeMultiplier) {
            const newProjectile = new DamageProjectile(selectedProjectile, isValidYPosition, recentDropYPositions, gameState, canvas);
            if (newProjectile) {
                fireballs.push(newProjectile);
            }
        }
    }
}

function spawnPowerUps(deltaTimeMultiplier) {
    if (shouldSpawnPowerUp(gameState)) {
        // Get all available power-ups
        let availablePowerUps = [...powerUpItems];
        
        // Handle cut_time power-up special logic (matching original)
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
            const selectedPowerUp = selectRandomPowerUp(gameState, availablePowerUps);
            const newPowerUp = new PowerUpItem(selectedPowerUp, isValidYPosition, recentDropYPositions, gameState);
            if (newPowerUp) {
                powerUps.push(newPowerUp);
                
                // Track cut_time spawns
                if (selectedPowerUp.id === "time_cutter") {
                    gameState.cutTimeSpawned++;
                }
                
                // Update lastPowerUpScore to prevent multiple spawns at same score
                const interval = gameConfig.powerUps.spawnInterval;
                const currentMilestone = Math.floor(gameState.score / interval) * interval;
                gameState.lastPowerUpScore = Math.max(currentMilestone, gameState.score);
            }
        }
    }
}

function updateFallingItems(deltaTimeMultiplier) {
    fallingItems = fallingItems.filter(item => {
        // Apply spell speed effects to falling items
        const spellSpeedMultiplier = spellSystem.getItemSpeedMultiplier();
        const adjustedDeltaTime = deltaTimeMultiplier * spellSpeedMultiplier;
        
        // Falling items should continue to fall even when freeze is active
        // Only projectiles should be frozen, not beneficial items
        const stillActive = item.update(adjustedDeltaTime, canvas, gameState);
        
        if (!stillActive && item.missed) {
            gameState.missedItems++;
            
            // Track activity for hybrid progression
            trackActivity(gameState, 'miss', 1);
            
            // Handle tier set items being missed
            if (item.itemData && item.itemData.type === "tier_set") {
                item.itemData.missed++;
                gameState.tierSetMissed++;
                playScreamSound();
            } else {
                // Check if shield is active - if so, block missed item damage
                if (gameState.shieldActive) {
                    // Shield blocks the damage from missed items
                    addNotification(gameState, `🛡️ Shield Protected!`, 120, '#FFD700');
                } else {
                    // Track damage for hybrid progression
                    trackActivity(gameState, 'damage', gameConfig.gameplay.healthLossOnMiss);
                    
                    gameState.health = Math.max(0, gameState.health - gameConfig.gameplay.healthLossOnMiss);
                    playUffSound();
                }
            }
        }
        
        return stillActive && !item.missed;
    });
}

function updateProjectiles(deltaTimeMultiplier) {
    fireballs = fireballs.filter(projectile => {
        if (gameState.freezeTimeActive) {
            return true; // Don't update when time is frozen
        }
        
        // Apply spell speed effects to projectiles
        const spellSpeedMultiplier = spellSystem.getProjectileSpeedMultiplier();
        const adjustedDeltaTime = deltaTimeMultiplier * spellSpeedMultiplier;
        
        const stillActive = projectile.update(adjustedDeltaTime, canvas);
        return stillActive;
    });
}

function updatePowerUps(deltaTimeMultiplier) {
    powerUps = powerUps.filter(powerUp => {
        // Power-ups should continue to fall even when freeze is active
        // Only projectiles should be frozen, not beneficial power-ups
        const stillActive = powerUp.update(gameState, deltaTimeMultiplier, canvas);
        return stillActive && !powerUp.missed;
    });
}

function updateParticles(deltaTimeMultiplier) {
    particles = particles.filter(particle => particle.update(deltaTimeMultiplier));
}

// Special effect for Thunderfury: Auto-collect all falling items on screen
function triggerThunderfuryEffect(thunderfuryX, thunderfuryY) {
    let itemsCollected = 0;
    let totalPoints = 0;
    
    // Create lightning effect particles from Thunderfury position
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle(thunderfuryX, thunderfuryY, '#FFD700')); // Golden lightning particles
    }
    
    // Auto-collect all remaining falling items (but not power-ups or projectiles)
    fallingItems = fallingItems.filter(otherItem => {
        if (otherItem.itemData) {
            // Create lightning bolt effect from Thunderfury to each item
            createLightningEffect(thunderfuryX, thunderfuryY, otherItem.x + otherItem.width/2, otherItem.y + otherItem.height/2);
            
            // Collect the item
            otherItem.itemData.collected++;
            
            // Apply spell point multipliers
            const pointMultiplier = spellSystem.getPointMultiplier();
            const basePoints = otherItem.itemData.value;
            const finalPoints = Math.round(basePoints * pointMultiplier);
            gameState.score += finalPoints;
            totalPoints += finalPoints;
            
            gameState.perfectCollections++;
            itemsCollected++;
            
            // Create collection particles at item location
            createCollectionParticles(otherItem.x + otherItem.width/2, otherItem.y + otherItem.height/2, particles);
            
            // Handle tier set items
            if (otherItem.itemData.type === "tier_set" && otherItem.itemData.collected === 1) {
                gameState.tierSetCollected++;
            }
        }
        
        return false; // Remove all items (they were auto-collected)
    });
    
    // Play special thunder sound and show notification
    playThunderSound();
    if (itemsCollected > 0) {
        addNotification(gameState, `⚡ THUNDERFURY: ${itemsCollected} items collected! (+${totalPoints} pts)`, 300, '#FFD700');
    } else {
        addNotification(gameState, `⚡ THUNDERFURY: Lightning strikes!`, 180, '#FFD700');
    }
}

// Create lightning bolt effect between two points
function createLightningEffect(startX, startY, endX, endY) {
    const steps = 8;
    const stepX = (endX - startX) / steps;
    const stepY = (endY - startY) / steps;
    
    for (let i = 0; i <= steps; i++) {
        const x = startX + (stepX * i) + (Math.random() - 0.5) * 20;
        const y = startY + (stepY * i) + (Math.random() - 0.5) * 20;
        particles.push(new Particle(x, y, '#FFFF00')); // Yellow lightning particles
    }
}

function checkCollisions() {
    // Check item collisions
    fallingItems.forEach((item, itemIndex) => {
        if (item.checkCollision && item.checkCollision(player)) {
            // Update item data and score
            if (item.itemData) {
                item.itemData.collected++;
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                const basePoints = item.itemData.value;
                const finalPoints = Math.round(basePoints * pointMultiplier);
                gameState.score += finalPoints;
                
                // Show bonus points notification if multiplier is active
                if (pointMultiplier > 1.0) {
                    const bonusPercent = Math.round((pointMultiplier - 1.0) * 100);
                    addNotification(gameState, `💰 +${bonusPercent}% Points (${finalPoints})`, 120, '#FFD700');
                }
                
                gameState.perfectCollections++;
                
                // Track activity for hybrid progression
                trackActivity(gameState, 'collection', 1);
                
                // Create particles
                createCollectionParticles(item.x + item.width/2, item.y + item.height/2, particles);
                
                // Special effect for Thunderfury: Auto-collect all falling items
                if (item.itemData.id === "ThunderFury") {
                    triggerThunderfuryEffect(item.x + item.width/2, item.y + item.height/2);
                }
                
                // Play sounds and handle tier set collection
                if (item.itemData.type === "tier_set") {
                    playDragonstalkerSound();
                    
                    // Debug logging for tier set collection
                    console.log(`Tier set item collected: ${item.itemData.name} (${item.itemData.id})`);
                    console.log(`Player celebration method exists:`, !!player.onTierSetCollected);
                    
                    // Only increment if this is the first time collecting this specific piece
                    if (item.itemData.collected === 1) { // collected was incremented above, so 1 means first time
                        gameState.tierSetCollected++;
                    }
                    
                    // Check if this is an Ashkandi item for special celebration
                    if (item.itemData.id === "ashjrethul" || item.itemData.id === "ashkandi2") {
                        // Trigger special sando celebration for Ashkandi items
                        if (player.onAshkandiCollected) {
                            console.log(`Triggering sando celebration for: ${item.itemData.name}`);
                            player.onAshkandiCollected();
                        }
                    } else {
                        // Trigger regular player celebration for other tier set items
                        if (player.onTierSetCollected) {
                            console.log(`Triggering celebration for: ${item.itemData.name}`);
                            player.onTierSetCollected();
                        }
                    }
                    
                    // Add notification for tier set collection
                    // Use actual unique count for display
                    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                    addNotification(gameState, `🏆 ${item.itemData.name} (${uniquePiecesCollected}/10)`, 240, '#FFD700');
                    
                    // Check if Dragonstalker set is complete
                    checkDragonstalkerCompletion(gameState, gameItems);
                } else {
                    playItemSound(item.itemData);
                }
                
                // Play voice sound periodically
                playVoiceSound(gameState);
                
                // Special sounds at milestones
                if (gameState.perfectCollections === gameConfig.audio.totalSoundTrigger) {
                    playTotalSound();
                }
                
                // Start background music
                if (gameState.perfectCollections === gameConfig.audio.backgroundMusicStart) {
                    startBackgroundMusic();
                }
            }
            
            // Remove collected item
            fallingItems.splice(itemIndex, 1);
        }
    });
    
    // Check projectile collisions
    fireballs.forEach((projectile, projectileIndex) => {
        if (projectile.checkCollision && projectile.checkCollision(player)) {
            // Apply projectile effects
            if (projectile.data) {
                if (projectile.data.effects === "speed_increase") {
                    // Apply speed boost
                    const increasePercent = projectile.speedIncreasePercent || 20;
                    gameState.speedIncreaseActive = true;
                    gameState.speedIncreaseTimer = 600; // 10 seconds
                    gameState.currentSpeedIncreasePercent += increasePercent;
                    gameState.speedIncreaseMultiplier = 1 + (gameState.currentSpeedIncreasePercent / 100);
                    
                    // Cap at 100%
                    if (gameState.currentSpeedIncreasePercent > 100) {
                        gameState.currentSpeedIncreasePercent = 100;
                        gameState.speedIncreaseMultiplier = 2.0;
                    }
                    
                    // UPDATE EXISTING ITEMS' SPEED - Apply speed boost to all items currently on screen
                    fallingItems.forEach(item => {
                        if (item.speed && item.baseSpeed) {
                            // If item has stored base speed, recalculate from base
                            item.speed = item.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            // Otherwise, multiply current speed by the boost ratio
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            item.speed *= boostRatio;
                        }
                    });
                    
                    // Update power-up items too
                    powerUps.forEach(powerUp => {
                        if (powerUp.speed && powerUp.baseSpeed) {
                            powerUp.speed = powerUp.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            powerUp.speed *= boostRatio;
                        }
                    });
                    
                    // Update projectiles too (they should also be affected by speed boost)
                    fireballs.forEach(projectile => {
                        if (projectile.speed && projectile.baseSpeed) {
                            projectile.speed = projectile.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            projectile.speed *= boostRatio;
                        }
                    });
                    
                    // Add notification for speed boost
                    const totalSpeedPercent = Math.round(gameState.currentSpeedIncreasePercent);
                    addNotification(gameState, `⚡ Speed Boost +${increasePercent}% (Total: ${totalSpeedPercent}%)`, 180, '#FF0000');
                } else if (projectile.data.effects === "freeze_time") {
                    // Apply freeze effect
                    gameState.freezeTimeActive = true;
                    gameState.freezeTimeTimer = projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration;
                    
                    // Add notification for freeze/shield effect
                    const freezeSeconds = Math.round((projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration) / 60);
                    addNotification(gameState, `❄️ Projectiles Frozen ${freezeSeconds}s`, 120, '#87CEEB');
                    
                    // Special case: Frost Nova damages player despite beneficial effect
                    if (projectile.data.id === "frost_nova" && projectile.data.damage > 0) {
                        // Check if shield is active - if so, block the damage
                        if (gameState.shieldActive) {
                            addNotification(gameState, `🛡️ Damage Blocked!`, 120, '#FFD700');
                        } else {
                            // Track damage for hybrid progression
                            trackActivity(gameState, 'damage', projectile.data.damage);
                            
                            gameState.health = Math.max(0, gameState.health - projectile.data.damage);
                            addNotification(gameState, `❄️ Frost Nova -${projectile.data.damage} HP`, 120, '#00BFFF');
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                        }
                    }
                    
                    createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    fireballs.splice(projectileIndex, 1);
                    return;
                } else if (projectile.data.effects === "shield") {
                    // Apply shield effect
                    gameState.shieldActive = true;
                    gameState.shieldTimer = projectile.shieldDuration || 300; // Default 5 seconds
                    
                    // Add notification for shield effect
                    const shieldSeconds = Math.round((projectile.shieldDuration || 300) / 60);
                    addNotification(gameState, `🛡️ Shield Active ${shieldSeconds}s`, 120, '#FFD700');
                    
                    // Don't damage player for beneficial projectiles
                    createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    fireballs.splice(projectileIndex, 1);
                    return;
                } else {
                    // Handle different types of harmful projectiles
                    if (projectile.data.effects === "damage_over_time") {
                        // Shadowbolt - damage over time effect
                        if (gameState.shieldActive) {
                            // Shield blocks shadowbolt application
                            addNotification(gameState, `🛡️ Shadow Effect Blocked!`, 120, '#FFD700');
                        } else {
                            // Add a new shadowbolt DOT using projectile data
                            if (!gameState.shadowboltDots) {
                                gameState.shadowboltDots = [];
                            }
                            gameState.shadowboltDots.push({
                                remainingDuration: projectile.data.dotDuration || 300, // Use data or fallback to 5 seconds
                                appliedAt: Date.now()
                            });
                            
                            // Reset timer to start ticking immediately if this is the first DOT
                            if (gameState.shadowboltDots.length === 1) {
                                gameState.shadowboltTimer = gameState.shadowboltTickRate;
                            }
                            
                            // Show shadowbolt application notification
                            addNotification(gameState, `🌑 Shadowbolt Applied! (${gameState.shadowboltDots.length} stacks)`, 120, '#4B0082');
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                        }
                        
                        // Create dark shadow particles for shadowbolt
                        createShadowParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    } else {
                        // Regular harmful projectiles (fireball, frostbolt, etc.)
                        if (gameState.shieldActive) {
                            // Shield blocks the damage
                            addNotification(gameState, `🛡️ Damage Blocked!`, 120, '#FFD700');
                            
                            // Still create particles and play sound for feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#FFD700');
                        } else {
                            // Apply immediate damage for harmful projectiles
                            const damage = projectile.data.damage || 5;
                            
                            // Track damage for hybrid progression
                            trackActivity(gameState, 'damage', damage);
                            
                            gameState.health = Math.max(0, gameState.health - damage);
                            
                            // Add damage notification
                            let damageIcon = '💥';
                            let damageColor = '#FF4500';
                            if (projectile.data.id === 'frostbolt') {
                                damageIcon = '❄️';
                                damageColor = '#00BFFF';
                            }
                            addNotification(gameState, `${damageIcon} ${projectile.data.name || 'Damage'} -${damage} HP`, 120, damageColor);
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                            
                            // Create menacing impact particles for harmful projectiles
                            createImpactParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, projectile.data);
                        }
                    }
                }
            }
            
            // Play impact sound
            if (projectile.playImpactSound) {
                projectile.playImpactSound();
            }
            
            // For beneficial projectiles, still use gentle collection particles
            if (projectile.data && (projectile.data.effects === "speed_increase" || projectile.data.effects === "freeze_time" || projectile.data.effects === "shield")) {
                const particleColor = projectile.data.color || '#FFD700';
                createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, particleColor);
            }
            
            // Remove projectile
            fireballs.splice(projectileIndex, 1);
        }
    });
    
    // Check power-up collisions
    powerUps.forEach((powerUp, powerUpIndex) => {
        if (powerUp.checkCollision && powerUp.checkCollision(player)) {
            // Track activity for hybrid progression
            trackActivity(gameState, 'powerUp', 1);
            
            // Apply power-up effect
            if (powerUp.applyEffect) {
                powerUp.applyEffect(audioInitialized, audioState, volumeSettings, gameState, {
                    fallingItems: fallingItems,
                    powerUps: powerUps,
                    fireballs: fireballs
                });
            }
            
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, particles);
            powerUps.splice(powerUpIndex, 1);
        }
    });
}

function checkGameEndConditions() {
    // Check win conditions
    // 1. Zee Zgnan Tigar is collected (ultimate victory)
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    // 2. Multiple Dragonstalker completions (milestone victories)
    const hasCompletions = gameState.dragonstalkerCompletions > 0;
    
    if ((zeeZgnanCollected || hasCompletions) && !gameState.gameWon) {
        // Mark victory achieved but don't end the game
        gameState.gameWon = true;
        
        // Show appropriate victory notification
        if (zeeZgnanCollected) {
            addNotification(gameState, `🎯 ZEE ZGNAN TIGAR! ULTIMATE VICTORY! Game continues... 🎯`, 360, '#FF69B4');
        } else {
            addNotification(gameState, `🏆 VICTORY! ${gameState.dragonstalkerCompletions} Dragonstalker Set${gameState.dragonstalkerCompletions > 1 ? 's' : ''} Complete! Game continues... 🏆`, 360, '#FFD700');
        }
        
        // Play victory sound (reuse total sound)
        playTotalSound();
    }
    
    // Check lose condition
    if (gameState.health <= 0) {
        endGame();
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', init);

// ===== UI NAVIGATION FUNCTIONS =====

// Loading screen functions
function showLoadingScreen() {
    // Create loading screen if it doesn't exist
    let loadingScreen = document.getElementById('loadingScreen');
    if (!loadingScreen) {
        loadingScreen = document.createElement('div');
        loadingScreen.id = 'loadingScreen';
        loadingScreen.innerHTML = `
            <div class="loading-content">
                <h2>Loading DMTribut...</h2>
                <div class="loading-bar">
                    <div class="loading-progress" id="loadingProgress"></div>
                </div>
                <p id="loadingText">Loading critical assets...</p>
            </div>
        `;
        document.body.appendChild(loadingScreen);
        
        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            #loadingScreen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.95);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                color: white;
                font-family: Arial, sans-serif;
            }
            .loading-content {
                text-align: center;
                max-width: 400px;
                padding: 40px;
            }
            .loading-content h2 {
                color: #4ECDC4;
                margin-bottom: 30px;
                font-size: 28px;
            }
            .loading-bar {
                width: 100%;
                height: 8px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 4px;
                overflow: hidden;
                margin: 20px 0;
            }
            .loading-progress {
                height: 100%;
                background: linear-gradient(90deg, #4ECDC4, #26d0ce);
                width: 0%;
                transition: width 0.3s ease;
            }
            #loadingText {
                color: #ccc;
                font-size: 14px;
                margin-top: 15px;
            }
        `;
        document.head.appendChild(style);
    }
    loadingScreen.style.display = 'flex';
}

function updateLoadingProgress(progress) {
    const progressBar = document.getElementById('loadingProgress');
    const loadingText = document.getElementById('loadingText');
    
    if (progressBar) {
        progressBar.style.width = `${progress * 100}%`;
    }
    
    if (loadingText) {
        const percentage = Math.round(progress * 100);
        
        // Show descriptive loading messages based on progress
        if (percentage < 70) {
            loadingText.textContent = `Loading critical assets... ${percentage}%`;
        } else if (percentage < 80) {
            loadingText.textContent = `Initializing player systems... ${percentage}%`;
        } else if (percentage < 90) {
            loadingText.textContent = `Setting up game systems... ${percentage}%`;
        } else if (percentage < 95) {
            loadingText.textContent = `Preparing user interface... ${percentage}%`;
        } else if (percentage < 100) {
            loadingText.textContent = `Finalizing initialization... ${percentage}%`;
        } else {
            loadingText.textContent = 'Ready to play!';
        }
    }
}

function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// Show name entry screen
function showNameEntry() {
    console.log('Showing name entry screen - game is ready for player interaction');
    document.getElementById('nameEntry').style.display = 'block';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    gameState.currentScreen = 'menu';
    
    // Update button visibility based on game state
    updateMenuButtons();
    
    // Focus on name input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.focus();
        nameInput.select();
    }
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Update menu button visibility based on game state
function updateMenuButtons() {
    const startBtn = document.getElementById('startGameBtn');
    const continueBtn = document.getElementById('continueGameBtn');
    const restartGameBtn = document.getElementById('restartGameBtn');
    
    // Check if there's a game in progress (paused or running)
    const gameInProgress = gameState.gameRunning || gameState.showingPauseMenu || 
                          (gameState.currentScreen === 'game' && gameState.health > 0);
    
    if (gameInProgress) {
        // Game is in progress - show continue/restart, hide start
        if (startBtn) startBtn.style.display = 'none';
        if (continueBtn) continueBtn.style.display = 'inline-block';
        if (restartGameBtn) restartGameBtn.style.display = 'inline-block';
    } else {
        // No game in progress - show start, hide continue/restart
        if (startBtn) startBtn.style.display = 'inline-block';
        if (continueBtn) continueBtn.style.display = 'none';
        if (restartGameBtn) restartGameBtn.style.display = 'none';
    }
}

// Show high scores screen
function showHighScores() {
    console.log('Showing high scores screen');
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'block';
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    gameState.currentScreen = 'highScores';
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show how to play screen
function showHowToPlay(fromPause = false) {
    console.log('Showing how to play screen');
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    gameState.currentScreen = 'howToPlay';
    
    // Store where we came from for the back button
    gameState.howToPlaySource = fromPause ? 'pause' : 'menu';
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show items/settings screen from menu
function showItemsFromMenu() {
    // Hide all UI screens
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Ensure we're on the menu screen
    gameState.currentScreen = 'menu';
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Start the game with the entered name
function startGameFromUI() {
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
    startGame();
}

// Handle restart from game over screen
function restartGameFromUI() {
    const currentPlayerName = gameState.playerName;
    
    // Hide game over screen and show name entry
    document.getElementById('gameOver').style.display = 'none';
    
    // Pre-fill the name input with the current player name
    document.getElementById('playerNameInput').value = currentPlayerName;
    
    showNameEntry();
}

// ===== UI EVENT HANDLERS =====

// Set up UI event handlers
function setupUIEventHandlers() {
    console.log('Setting up UI event handlers...');
    
    // Name input field
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                startGameFromUI();
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Development shortcuts
        if (e.ctrlKey && e.shiftKey && e.key === 'P') {
            e.preventDefault();
            assetManager.togglePerformanceMonitor();
        }
        
        // Cache management shortcuts
        if (e.ctrlKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            console.log('Current cache stats:', assetManager.getCacheStats());
        }
        
        // Detailed stats shortcut
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
            console.log('Detailed asset stats:', assetManager.getDetailedStats());
        }
    });

    // Click handlers for UI buttons - using correct IDs from HTML
    const startBtn = document.getElementById('startGameBtn');
    const continueBtn = document.getElementById('continueGameBtn');
    const restartGameBtn = document.getElementById('restartGameBtn');
    const viewScoresBtn = document.getElementById('viewScoresBtn');
    const howToPlayBtn = document.getElementById('howToPlayBtn');
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    const backToMenuBtn2 = document.getElementById('backToMenuBtn2');
    const restartBtn = document.getElementById('restartBtn');
    const viewScoresBtn2 = document.getElementById('viewScoresBtn2');
    const audioBtn = document.getElementById('audioToggleBtn');
    
    if (startBtn) {
        startBtn.addEventListener('click', startGameFromUI);
    }
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            // Hide menu and continue the paused game
            document.getElementById('nameEntry').style.display = 'none';
            gameState.gameRunning = true;
            gameState.currentScreen = 'game';
            updateCanvasOverlay();
        });
    }
    
    if (restartGameBtn) {
        restartGameBtn.addEventListener('click', function() {
            // Restart the current game
            restartGame();
            startGameFromUI();
        });
    }
    
    if (viewScoresBtn) {
        console.log('Setting up High Scores button handler');
        viewScoresBtn.addEventListener('click', showHighScores);
    } else {
        console.warn('viewScoresBtn not found!');
    }
    
    if (howToPlayBtn) {
        console.log('Setting up How to Play button handler');
        howToPlayBtn.addEventListener('click', showHowToPlay);
    } else {
        console.warn('howToPlayBtn not found!');
    }
    
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            showNameEntry();
        });
    }
    
    if (backToMenuBtn2) {
        backToMenuBtn2.addEventListener('click', function() {
            // Check if we came from pause menu
            if (gameState.howToPlaySource === 'pause') {
                // Return to pause menu
                document.getElementById('howToPlay').style.display = 'none';
                showPauseMenu();
            } else {
                // Return to main menu
                showNameEntry();
            }
        });
    }
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGameFromUI);
    }
    
    if (viewScoresBtn2) {
        viewScoresBtn2.addEventListener('click', showHighScores);
    }
    
    if (audioBtn) {
        audioBtn.addEventListener('click', toggleAudioButton);
    }
    
    // Pause menu button handlers
    const continuePauseBtn = document.getElementById('continuePauseBtn');
    const gameInfoPauseBtn = document.getElementById('gameInfoPauseBtn');
    const restartPauseBtn = document.getElementById('restartPauseBtn');
    
    if (continuePauseBtn) {
        continuePauseBtn.addEventListener('click', function() {
            hidePauseMenu();
            gameState.gameRunning = true;
        });
    }
    
    if (gameInfoPauseBtn) {
        gameInfoPauseBtn.addEventListener('click', function() {
            // Hide pause menu and show game info (how to play screen)
            hidePauseMenu();
            showHowToPlay(true); // Pass true to indicate it came from pause
        });
    }
    
    if (restartPauseBtn) {
        restartPauseBtn.addEventListener('click', function() {
            // Hide pause menu and restart to main menu
            hidePauseMenu();
            gameState.gameRunning = false;
            gameState.currentScreen = 'menu';
            
            // Reset game state
            restartGame();
            
            // Show name entry screen
            showNameEntry();
        });
    }
}

// ===== HIGH SCORES FUNCTIONS =====
// displayHighScores is imported from highScoreSystem.js

// Safe wrapper for displaying high scores that works with or without server
function safeDisplayHighScores() {
    try {
        // Try async version first
        const result = displayHighScores();
        // If it returns a Promise, handle it properly
        if (result && typeof result.catch === 'function') {
            result.catch(error => {
                console.log('Async displayHighScores failed, using sync fallback:', error);
                displayHighScoresSync();
            });
        }
    } catch (error) {
        console.log('displayHighScores threw error, using sync fallback:', error);
        displayHighScoresSync();
    }
}

// Audio toggle function
function toggleAudioButton() {
    // Use the imported toggleAudio function from audioSystem
    toggleAudio();
    // Update audio status message
    updateAudioStatusMessage();
}

// Update audio status message
function updateAudioStatusMessage() {
    const audioStatus = document.getElementById('audioStatus');
    if (!audioStatus) return;
    
    const isMuted = !audioState.enabled;
    
    if (isMuted) {
        audioStatus.textContent = '🔇 Audio OFF - Press A to enable';
        audioStatus.className = 'muted';
        audioStatus.style.display = 'block';
    } else {
        // Hide the message when audio is enabled
        audioStatus.style.display = 'none';
    }
}

// Make updateAudioStatusMessage available globally
window.updateAudioStatusMessage = updateAudioStatusMessage;

// DOM-based Items Collection Panel Functions
function updateDOMItemsPanel(gameState, gameItems) {
    const panel = document.getElementById('itemsCollectionPanel');
    if (!panel) return;
    
    // Show/hide panel based on game state
    if (gameState.gameRunning || gameState.showingPauseMenu) {
        panel.classList.remove('hidden');
        
        // Enable interaction when paused, disable during gameplay
        if (gameState.showingPauseMenu) {
            panel.classList.add('interactive');
        } else {
            panel.classList.remove('interactive');
        }
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('interactive');
        return;
    }
    
    // Get items with collections
    const collectedItems = gameItems.filter(item => item.collected > 0);
    
    // Sort items by priority (same as canvas version)
    const sortedItems = collectedItems.sort((a, b) => {
        const priorityOrder = { zee_zgnan: 5, legendary: 4, special: 3, epic: 2, tier_set: 1, regular: 0 };
        const aPriority = priorityOrder[a.type] || 0;
        const bPriority = priorityOrder[b.type] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return b.collected - a.collected;
    });
    
    // Update collection summary
    const collectionCount = document.getElementById('collectionCount');
    const uniqueItemTypes = sortedItems.length;
    const totalItemsCollected = sortedItems.reduce((sum, item) => sum + item.collected, 0);
    collectionCount.textContent = `${uniqueItemTypes} types, ${totalItemsCollected} total`;
    
    // Update player stats
    updatePlayerStats(gameState);
    
    // Update Dragonstalker section
    updateDragonstalkerSection(gameState, gameItems);
    
    // Update items list
    updateItemsList(sortedItems);
    
    // Update dedicated dragonstalker progress panel
    updateDragonstalkerProgressPanel(gameState, gameItems);
}

function updatePlayerStats(gameState) {
    // Update main header elements
    const playerNameDisplay = document.getElementById('playerNameDisplay');
    const playerScoreDisplay = document.getElementById('playerScoreDisplay');
    const playerLevelDisplay = document.getElementById('playerLevelDisplay');
    const gameSpeed = document.getElementById('gameSpeed');
    const speedBoostRow = document.getElementById('speedBoostRow');
    const speedBoostValue = document.getElementById('speedBoostValue');
    const actualItemSpeed = document.getElementById('actualItemSpeed');
    const actualProjectileSpeed = document.getElementById('actualProjectileSpeed');
    
    // Update player name
    if (playerNameDisplay) {
        playerNameDisplay.textContent = `Player: ${gameState.playerName || 'Unknown'}`;
    }
    
    // Update score with formatting (large and prominent)
    if (playerScoreDisplay) {
        playerScoreDisplay.textContent = gameState.score.toLocaleString();
    }
    
    // Update level (add 1 to 0-based internal level for 1-based UI display)
    if (playerLevelDisplay) {
        playerLevelDisplay.textContent = `Level ${(gameState.currentLevel || 0) + 1}`;
    }
    
    // Calculate and update effective game speed (in stats section)
    if (gameSpeed) {
        const baseSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        let speedText = `${baseSpeed.toFixed(1)}x`;
        
        // Show Dragonstalker completion reduction if any
        if (gameState.permanentSpeedReductionFromSets > 0) {
            speedText += ` (-${gameState.permanentSpeedReductionFromSets.toFixed(1)}x DS)`;
        }
        
        gameSpeed.textContent = speedText;
        
        // Add level progress info for hybrid progression
        if (gameConfig.levels.progressionType === "hybrid" || gameConfig.levels.progressionType === "time") {
            const progress = getLevelProgress(gameState);
            const timeRemaining = Math.ceil(progress.timeRemaining);
            const minutes = Math.floor(timeRemaining / 60);
            const seconds = timeRemaining % 60;
            const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
            
            // Show activity bonuses/penalties
            const activity = progress.activity || {};
            let activityStr = '';
            if (activity.collections > 0 || activity.misses > 0 || activity.powerUpsCollected > 0 || activity.damageReceived > 0) {
                const bonuses = [];
                if (activity.collections > 0) bonuses.push(`📦${activity.collections}`);
                if (activity.powerUpsCollected > 0) bonuses.push(`⚡${activity.powerUpsCollected}`);
                if (activity.misses > 0) bonuses.push(`❌${activity.misses}`);
                if (activity.damageReceived > 0) bonuses.push(`💔${Math.round(activity.damageReceived)}`);
                activityStr = ` (${bonuses.join(' ')})`;
            }
            
            speedText += ` | Next: ${timeStr}${activityStr}`;
            gameSpeed.textContent = speedText;
        }
    }
    
    // Update speed boost display
    if (speedBoostRow && speedBoostValue) {
        if (gameState.speedIncreaseActive && gameState.currentSpeedIncreasePercent > 0) {
            speedBoostRow.style.display = 'flex';
            speedBoostValue.textContent = `+${gameState.currentSpeedIncreasePercent}%`;
            speedBoostValue.style.color = '#FF0000'; // Red color for speed boost
        } else {
            speedBoostRow.style.display = 'none';
        }
    }
    
    // Calculate actual speeds from items on screen (minimal performance impact)
    if (actualItemSpeed) {
        if (fallingItems.length > 0) {
            const totalItemSpeed = fallingItems.reduce((sum, item) => sum + (item.speed || 0), 0);
            const avgItemSpeed = totalItemSpeed / fallingItems.length;
            actualItemSpeed.textContent = `${avgItemSpeed.toFixed(1)} px/frame`;
        } else {
            actualItemSpeed.textContent = '-- px/frame';
        }
    }
    
    if (actualProjectileSpeed) {
        if (fireballs.length > 0) {
            const totalProjectileSpeed = fireballs.reduce((sum, projectile) => sum + (projectile.speed || 0), 0);
            const avgProjectileSpeed = totalProjectileSpeed / fireballs.length;
            actualProjectileSpeed.textContent = `${avgProjectileSpeed.toFixed(1)} px/frame`;
        } else {
            actualProjectileSpeed.textContent = '-- px/frame';
        }
    }
}

function updateDragonstalkerSection(gameState, gameItems) {
    const section = document.getElementById('dragonstalkerSection');
    const tierProgress = document.getElementById('tierProgress');
    const tierStatus = document.getElementById('tierStatus');
    
    if (!section || !tierProgress || !tierStatus) return;
    
    // Get Dragonstalker items
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // Check for Zee Zgnan victory
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    // Show section during gameplay or if there's progress/completions
    if (gameState.gameRunning && (uniquePiecesCollected > 0 || gameState.tierSetMissed > 0 || gameState.dragonstalkerCompletions > 0 || zeeZgnanCollected)) {
        section.classList.remove('hidden');
        
        // Update progress - show current set progress and completions
        let progressText = `${uniquePiecesCollected}/10`;
        if (gameState.dragonstalkerCompletions > 0) {
            progressText += ` (${gameState.dragonstalkerCompletions} SET${gameState.dragonstalkerCompletions > 1 ? 'S' : ''})`;
        }
        tierProgress.textContent = progressText;
        
        // Update status
        tierStatus.className = 'tier-status';
        if (gameState.gameWon) {
            if (zeeZgnanCollected) {
                tierStatus.textContent = '🎯 ZEE ZGNAN VICTORY! 🎯';
                tierStatus.classList.add('victory');
            } else {
                tierStatus.textContent = '🏆 VICTORY ACHIEVED! 🏆';
                tierStatus.classList.add('victory');
            }
        } else if (uniquePiecesCollected >= 8) {
            tierStatus.textContent = '🏆 ALMOST THERE! 🏆';
        } else if (gameState.dragonstalkerCompletions > 0) {
            // Show that they're working on another set
            tierStatus.textContent = `Next set: ${10 - uniquePiecesCollected} more pieces`;
        } else {
            tierStatus.textContent = `Collect all 10 pieces to win!`;
        }
    } else {
        section.classList.add('hidden');
    }
}

function updateItemsList(sortedItems) {
    const itemsList = document.getElementById('itemsList');
    const overflowIndicator = document.getElementById('overflowIndicator');
    const overflowText = document.getElementById('overflowText');
    
    if (!itemsList) return;
    
    // Clear existing items
    itemsList.innerHTML = '';
    
    const maxVisibleItems = 20; // Show more items than canvas version
    const visibleItems = sortedItems.slice(0, maxVisibleItems);
    const hiddenItems = sortedItems.slice(maxVisibleItems);
    
    // Create item entries
    visibleItems.forEach(item => {
        const itemEntry = document.createElement('div');
        itemEntry.className = `item-entry ${item.type}`;
        
        // Get icon based on type
        let icon = '';
        if (item.type === 'regular') icon = '○';
        else if (item.type === 'green') icon = '●';
        else if (item.type === 'epic') icon = '◆';
        else if (item.type === 'special') icon = '★';
        else if (item.type === 'legendary') icon = '⚡';
        else if (item.type === 'zee_zgnan') icon = '👑';
        else if (item.type === 'tier_set') icon = '🐉';
        
        const totalPoints = item.collected * item.value;
        
        itemEntry.innerHTML = `
            <span class="item-icon">${icon}</span>
            <span class="item-name">${item.name}</span>
            <span class="item-count">${item.collected}x</span>
            <span class="item-points">(${totalPoints}pts)</span>
        `;
        
        itemsList.appendChild(itemEntry);
    });
    
    // Handle overflow indicator
    if (hiddenItems.length > 0 && overflowIndicator && overflowText) {
        const hiddenCount = hiddenItems.length;
        const hiddenPoints = hiddenItems.reduce((sum, item) => sum + (item.collected * item.value), 0);
        
        overflowText.textContent = `... +${hiddenCount} more items (${hiddenPoints} pts)`;
        overflowIndicator.classList.remove('hidden');
    } else if (overflowIndicator) {
        overflowIndicator.classList.add('hidden');
    }
}

// Update dedicated Dragonstalker progress panel
function updateDragonstalkerProgressPanel(gameState, gameItems) {
    const panel = document.getElementById('dragonstalkerProgressPanel');
    if (!panel) return;
    
    // Get Dragonstalker items
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // DEBUG: Log current state
    console.log('🔍 Dragonstalker Panel Debug:', {
        uniquePiecesCollected,
        dragonstalkerCompletions: gameState.dragonstalkerCompletions,
        permanentSpeedReductionFromSets: gameState.permanentSpeedReductionFromSets,
        gameWon: gameState.gameWon,

        totalDragonstalkerItems: dragonstalkerItems.length
    });
    
    // Check for Zee Zgnan victory
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    // Show/hide panel based on game state (always show during gameplay)
    if (gameState.gameRunning) {
        panel.classList.remove('hidden');
        
        // Enable interaction when paused, disable during gameplay
        if (gameState.showingPauseMenu) {
            panel.classList.add('interactive');
        } else {
            panel.classList.remove('interactive');
        }
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('interactive');
        return;
    }
    
    // Update panel styling based on status
    panel.className = '';
    if (gameState.gameWon) {
        panel.classList.add('victory');
    }
    
    // Update progress bar
    const progressFill = document.getElementById('dragonstalkerProgressFill');
    const progressText = document.getElementById('dragonstalkerProgressText');
    if (progressFill && progressText) {
        const progressPercent = (uniquePiecesCollected / 10) * 100;
        progressFill.style.width = `${progressPercent}%`;
        
        let progressString = `${uniquePiecesCollected}/10 PIECES`;
        if (gameState.dragonstalkerCompletions > 0) {
            progressString += ` | ${gameState.dragonstalkerCompletions} SET${gameState.dragonstalkerCompletions > 1 ? 'S' : ''} COMPLETE`;
        }
        progressText.textContent = progressString;
        
        // DEBUG: Log progress string
        console.log('🔍 Progress String:', progressString);
        
        if (gameState.gameWon) {
            progressFill.classList.add('victory');
        }
    }
    
    // Update status message
    const statusElement = document.getElementById('dragonstalkerStatus');
    if (statusElement) {
        statusElement.className = 'dragonstalker-status';
        if (gameState.gameWon) {
            if (zeeZgnanCollected) {
                statusElement.textContent = '🎯 ZEE ZGNAN VICTORY! 🎯';
                statusElement.classList.add('victory');
            } else {
                statusElement.textContent = '🏆 SET COMPLETE! 🏆';
                statusElement.classList.add('victory');
            }
        } else if (uniquePiecesCollected >= 8) {
            statusElement.textContent = '🏆 ALMOST THERE! 🏆';
        } else {
            statusElement.textContent = `Need ${10 - uniquePiecesCollected} more pieces`;
        }
        
        // Add speed reduction info if any completions
        if (gameState.permanentSpeedReductionFromSets > 0) {
            statusElement.textContent += ` | Speed Reduction: -${gameState.permanentSpeedReductionFromSets.toFixed(1)}x`;
        }
        
        // DEBUG: Log status message
        console.log('🔍 Status Message:', statusElement.textContent);
    }
    
    // Update items list
    const itemsList = document.getElementById('dragonstalkerItemsList');
    if (itemsList) {
        itemsList.innerHTML = '';
        
        // Get all tier set items dynamically and sort by setPosition
        const sortedDragonstalkerItems = [...dragonstalkerItems].sort((a, b) => {
            const aPos = a.setPosition || 999; // Put items without setPosition at the end
            const bPos = b.setPosition || 999;
            return aPos - bPos;
        });
        
        // DEBUG: Log item statuses
        console.log('🔍 Item Statuses:', sortedDragonstalkerItems.map(item => ({
            name: item.name,
            collected: item.collected,
            missed: item.missed
        })));
        
        // Items are sorted by setPosition for display
        
        sortedDragonstalkerItems.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dragonstalker-item';
            
            let status = '○';
            let statusClass = 'pending';
            let nameClass = 'pending';
            
            if (item.collected > 0) {
                status = '✓';
                statusClass = 'collected';
                nameClass = 'collected';
            } else if (item.missed > 0) {
                status = '✗';
                statusClass = 'missed';
                nameClass = 'missed';
            }
            
            itemDiv.innerHTML = `
                <div class="dragonstalker-item-status ${statusClass}">${status}</div>
                <div class="dragonstalker-item-name ${nameClass}">${item.name}</div>
            `;
            
            itemsList.appendChild(itemDiv);
        });
    }
    
    // Update bottom message
    const bottomMessage = document.getElementById('dragonstalkerBottomMessage');
    if (bottomMessage) {
        bottomMessage.className = 'dragonstalker-bottom-message';
        
        if (gameState.gameWon) {
            if (zeeZgnanCollected) {
                bottomMessage.textContent = 'Ultimate Victory Achieved!';
                bottomMessage.classList.add('victory');
            } else {
                bottomMessage.textContent = 'Dragonstalker Set Complete!';
                bottomMessage.classList.add('victory');
            }
        } else if (uniquePiecesCollected >= 8) {
            bottomMessage.textContent = 'So close to victory!';
            bottomMessage.classList.add('almost-there');
        } else {
            bottomMessage.textContent = 'Collect all pieces to win the game!';
        }
        
        // DEBUG: Log bottom message
        console.log('🔍 Bottom Message:', bottomMessage.textContent);
    }
}

// ===== GAME END FUNCTIONS =====

// End game function
function endGame() {
    gameState.gameRunning = false;
    
    // Save the high score
    try {
        const scorePromise = addHighScore(gameState.playerName, gameState.score, gameState.perfectCollections, gameState.currentLevel);
        if (scorePromise && typeof scorePromise.then === 'function') {
            scorePromise.then(rank => {
                // Show new high score message if it's in top 10
                const newHighScoreElement = document.getElementById('newHighScore');
                if (newHighScoreElement) {
                    if (rank <= 10) {
                        newHighScoreElement.textContent = `🎉 NEW HIGH SCORE! Rank #${rank} 🎉`;
                        newHighScoreElement.style.display = 'block';
                    } else {
                        newHighScoreElement.style.display = 'none';
                    }
                }
            }).catch(console.error);
        }
    } catch (error) {
        console.error('Error saving high score:', error);
    }
    
    // Update final score display
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = 
            `Final Score: ${gameState.score} | Items: ${gameState.perfectCollections} | Level: ${gameState.currentLevel}`;
    }
    
    document.getElementById('gameOver').style.display = 'block';
    
    // Update menu buttons since game is now over
    updateMenuButtons();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Win game function
function winGame() {
    gameState.gameWon = true;
    gameState.gameRunning = false;
    
    // Save the high score with special win marker
    try {
        const scorePromise = addHighScore(gameState.playerName + " 👑", gameState.score, gameState.perfectCollections, gameState.currentLevel);
        if (scorePromise && typeof scorePromise.catch === 'function') {
            scorePromise.catch(console.error);
        }
    } catch (error) {
        console.error('Error saving win high score:', error);
    }
    
    // Update final score display
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = 
            `🎉 VICTORY! Complete Dragonstalker Set! 🎉\nFinal Score: ${gameState.score} | Items: ${gameState.perfectCollections} | Level: ${gameState.currentLevel}`;
    }
    
    // Show victory message
    const newHighScoreElement = document.getElementById('newHighScore');
    if (newHighScoreElement) {
        newHighScoreElement.textContent = `🏆 DRAGONSTALKER SET COMPLETED! YOU WIN! 🏆`;
        newHighScoreElement.style.display = 'block';
        newHighScoreElement.style.color = 'gold';
    }
    
    document.getElementById('gameOver').style.display = 'block';
    
    // Update menu buttons since game is now over
    updateMenuButtons();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Preload assets based on game level for optimal performance
function preloadLevelAssets(level) {
    const assetsToPreload = getAssetsByLevel(level);
    
    if (assetsToPreload.length > 0) {
        console.log(`Level ${level}: Preloading ${assetsToPreload.length} assets for optimal performance`);
        assetManager.preloadAssets(assetsToPreload, false); // Background loading
        
        // Warmup cache for current level
        assetManager.warmupCache(level);
    }
}

// Update HTML-based spell bar
function updateSpellBarHTML() {
    const currentTime = Date.now();
    
    const spells = [
        { id: 'dragon_cry', elementId: 'spell-dragon-cry' },
        { id: 'zandalari', elementId: 'spell-zandalari' },
        { id: 'songflower', elementId: 'spell-songflower' }
    ];
    
    spells.forEach(spell => {
        const element = document.getElementById(spell.elementId);
        const timerElement = document.getElementById(`${spell.elementId}-timer`);
        const cooldownOverlay = document.getElementById(`${spell.elementId}-cooldown`);
        
        if (!element || !timerElement || !cooldownOverlay) return;
        
        const cooldownRemaining = spellSystem.getCooldownRemaining(spell.id, currentTime);
        const durationRemaining = spellSystem.getDurationRemaining(spell.id, currentTime);
        const isActive = spellSystem.isSpellActive(spell.id);
        const isOnCooldown = cooldownRemaining > 0;
        
        // Update spell slot classes
        element.className = 'spell-slot';
        if (isActive) {
            element.classList.add('active');
        } else if (isOnCooldown) {
            element.classList.add('cooldown');
        }
        
        // Update timer display
        if (isActive && durationRemaining > 0) {
            timerElement.textContent = `${durationRemaining}s`;
            timerElement.className = 'spell-timer active';
        } else if (isOnCooldown) {
            timerElement.textContent = `${cooldownRemaining}s`;
            timerElement.className = 'spell-timer cooldown';
        } else {
            timerElement.textContent = '';
            timerElement.className = 'spell-timer';
        }
        
        // Update cooldown overlay
        if (isOnCooldown) {
            cooldownOverlay.classList.add('active');
        } else {
            cooldownOverlay.classList.remove('active');
        }
    });
}

// Update HTML-based health bar
function updateHealthBarHTML() {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');
    
    if (!healthFill || !healthText) return;
    
    const healthPercentage = Math.max(0, gameState.health / gameState.maxHealth);
    const healthPercent = Math.ceil(healthPercentage * 100);
    
    // Update health fill width
    healthFill.style.width = `${healthPercentage * 100}%`;
    
    // Update health fill color based on health level
    healthFill.className = 'health-fill';
    if (healthPercentage <= 0.25) {
        healthFill.classList.add('low');
    } else if (healthPercentage <= 0.6) {
        healthFill.classList.add('medium');
    } else {
        healthFill.classList.add('high');
    }
    
    // Update health text
    healthText.textContent = `${healthPercent}%`;
} 