// Import all modules
import { gameConfig, GAME_VERSION } from './config/gameConfig.js';
import { gameItems } from './data/gameItems.js';
import { damageProjectiles } from './data/damageProjectiles.js';
import { powerUpItems } from './data/powerUpItems.js';

import { Player } from './classes/Player.js';
import { FallingItem } from './classes/FallingItem.js';
import { DamageProjectile } from './classes/DamageProjectile.js';
import { PowerUpItem } from './classes/PowerUpItem.js';
import { Arrow } from './classes/Arrow.js';

import { tryAutoInitAudio, startBackgroundMusic, playUffSound, playScreamSound, playTotalSound, playFireballImpactSound, audioInitialized, sounds } from './systems/audioSystem.js';
import { initializeVisibilitySystem, getVisibilitySystemStatus, updateVisibilityConfig } from './systems/visibilitySystem.js';
import { initializeSettings, loadSettings, saveSettings, resetSettings, getSettings, updateSetting, areSoundEffectsEnabled, isBackgroundMusicEnabled, getVolume, getVolumeDecimal, getMasterVolume, getMusicVolume, getEffectsVolume, getMasterVolumeDecimal, getMusicVolumeDecimal, getEffectsVolumeDecimal, getPlayerPanelStyle, getDragonstalkerPanelStyle, getPanelOpacity, refreshPanelStyles } from './systems/settingsSystem.js';
import { loadHighScores, addHighScore, isHighScore, displayHighScores, displayHighScoresSync } from './systems/highScoreSystem.js';
import { initializeInputSystem, updatePlayerPosition, resetInputState } from './systems/inputSystem.js';
// drawSettings removed - now using HTML+CSS guide

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateDeltaTimeMultiplier, calculateUniversalMultiplier, updateGameStateTimers, addNotification, updateNotifications, responsiveScaler, trackActivity, getLevelProgress, checkGameVersion, clearGameCache } from './utils/gameUtils.js';
import { selectRandomItem, selectRandomProjectile, selectRandomPowerUp, shouldSpawnPowerUp, calculateProjectileProbability } from './utils/spawning.js';
import { spellSystem } from './systems/spellSystem.js';
import { notificationSystem } from './systems/notificationSystem.js';
import { assetManager } from './utils/AssetManager.js';
import { getAssetsByLevel, assetRegistry } from './data/assetRegistry.js';
import { handleIOSAudioSettings } from './utils/platform.js';
import { showLoadingScreen, updateLoadingProgress, hideLoadingScreen } from './ui/loadingScreen.js';
import { generateDynamicHelpContent as renderDynamicHelpContent } from './ui/helpContent.js';
import { updateSpellBar, updateHealthBar } from './ui/statusBars.js';
import { updateCanvasOverlayVisibility } from './ui/canvasOverlay.js';
import { getDragonstalkerItemIconData, getShortenedDragonstalkerName } from './utils/dragonstalkerDisplay.js';
import { addBuff, removeBuff, updateBuffTracker, clearAllBuffs } from './systems/buffTrackerSystem.js';
import { shouldCrit as calculateShouldCrit, shouldDodge as calculateShouldDodge, showDodgeText as createDodgeText, trackDodge as recordDodge, applyItemStatBonuses as applyItemStatBonusesToState, updateTemporaryStatEffects as updateTemporaryStatEffectsState, getCurrentTotalCritRating as calculateCurrentTotalCritRating, getCurrentTotalDodgeRating as calculateCurrentTotalDodgeRating, getTemporaryStatEffects, clearTemporaryStatEffects } from './systems/statEffectsSystem.js';
import { updateBulletTime as updateBulletTimeState, renderBulletTimeEffects as renderBulletTimeVisuals } from './systems/bulletTimeSystem.js';
import { renderFrame, setupHighDPICanvas as setupHighDPICanvasSystem } from './systems/renderSystem.js';
import { checkCollisions as checkCollisionSystem } from './systems/collisionSystem.js';
import { clearHudNotifications } from './systems/hudNotificationSystem.js';

// Make AssetManager globally available for quality assessment
window.assetManager = assetManager;

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
    
    // Crit system
    critRating: 0.10, // 10% base crit chance
    baseCritRating: 0.10, // Store base crit rating for resets
    critMultiplier: 2.0, // Double points on crit
    critRatingCap: 0.35, // 35% maximum crit chance
    
    // Dodge system
    dodgeRating: 0.10, // 10% base dodge chance
    baseDodgeRating: 0.10, // Store base dodge rating for resets
    dodgeRatingCap: 0.25, // 25% maximum dodge chance
    temporaryDodgeBoost: 0, // Temporary dodge boost from power-ups
    dodgeBoostTimer: 0, // Timer for temporary dodge boost
    
    // Dodge statistics
    totalDodges: 0, // Total number of successful dodges
    healthSavedFromDodges: 0, // Total health points saved from dodges
    dodgeAreaExpansion: 0, // Additional movable area height from dodges (pixels)
    
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

    
    // UI state
    showingPauseMenu: false,
    menuButtonBounds: null,
    pauseMenuBounds: null,
    howToPlaySource: 'menu', // Track where howToPlay was accessed from
    highScoresSource: 'menu', // Track where highScores was accessed from
    
    // Notifications now handled by HTML+CSS notification system
    
    // Player reference
    player: null,

    // Arrow ammunition system
    arrowCount: 20, // Current number of arrows available (start with 20)
    
    // Bullet Time system
    bulletTimeActive: false,            // Whether bullet time is currently active
    bulletTimeMultiplier: 1.0,          // Time dilation multiplier (applied to deltaTime)
    bulletTimeVisualTimer: 0,           // Timer for visual effects animations
};

// Game objects
let player;
let fallingItems = [];
let fireballs = [];
let powerUps = [];
let arrows = []; // Player arrows
let particles = [];
let combatTexts = []; // For crit damage numbers and other combat feedback
let images = { items: [], spells: {} };
let recentDropYPositions = [];

// Make arrows array globally available for spell system
window.arrows = arrows;

// Background is handled by CSS

// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Get canvas overlay for preventing mouse interaction when game is not active
const canvasOverlay = document.getElementById('canvasOverlay');

// Initialize the game
async function init() {
    // Set canvas size with device pixel ratio support for high-DPI displays
    setupHighDPICanvas();
    
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
    
    // Initialize player with logical canvas dimensions (supports portrait mode)
    // Get correct canvas dimensions with device-specific fallback
    const canvasWidth = canvas.logicalWidth || 
                       (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                        canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                        gameConfig.canvas.desktop.width);
    const canvasHeight = canvas.logicalHeight || 
                        (canvas.deviceType === 'mobile' ? (responsiveScaler ? responsiveScaler.canvasDimensions.height : 600) :
                         canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.height :
                         gameConfig.canvas.desktop.height);
    
    player = new Player(canvasWidth, canvasHeight);
    gameState.player = player;
    updateLoadingProgress(0.8);
    
    // Initialize settings system
    const settings = initializeSettings();
    
    // Make settings globally available
    window.gameSettings = {
        areSoundEffectsEnabled,
        isBackgroundMusicEnabled,
        getVolume,
        getVolumeDecimal,
        getMasterVolume,
        getMusicVolume,
        getEffectsVolume,
        getMasterVolumeDecimal,
        getMusicVolumeDecimal,
        getEffectsVolumeDecimal,
        updateSetting,
        resetSettings,
        getSettings
    };
    
    // Make sounds globally available for settings system
    window.sounds = sounds;
    
    // Audio initialization is now handled by AssetManager during Tier 2 loading
    // Initialize audio system with settings support
    tryAutoInitAudio();
    
    // Update audio volumes from settings after initialization
    setTimeout(() => {
        if (window.updateVolumeFromSettings) {
            window.updateVolumeFromSettings();
        }
    }, 200);
    
    // Initialize visibility system for auto-pause/resume of background music
    // This ensures music pauses when browser loses focus (minimize, tab switch, phone lock)
    initializeVisibilitySystem();
    updateLoadingProgress(0.85);
    
    // Initialize input system
    initializeInputSystem(canvas, gameState, player, restartGame, startGame, null, showPauseMenu, () => {
        gameState.currentScreen = 'highScores';
        safeDisplayHighScores();
    }, updateCanvasOverlay);
    updateLoadingProgress(0.9);
    
    // Initialize notification system
    if (!notificationSystem.initialize()) {
        console.warn('Failed to initialize notification system');
    }
    
    // Expose notification system globally for use by other systems
    window.notificationSystem = notificationSystem;
    
    // Expose visibility system functions for debugging and configuration
    window.getVisibilitySystemStatus = getVisibilitySystemStatus;
    window.updateVisibilityConfig = updateVisibilityConfig;
    
    // Expose mobile pause button visibility function for responsive scaling
    window.updateMobilePauseButtonVisibility = updateMobilePauseButtonVisibility;
    
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
    
    // Check for game version updates and prompt refresh if needed
    checkGameVersion();
    
    // Handle iOS-specific audio settings UI
    handleIOSAudioSettings();
    
    // Enable performance monitoring for development (toggle with Ctrl+Shift+P)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log('Development mode: Press Ctrl+Shift+P to toggle asset performance monitor');
    }
}

// Helper function to hide all UI elements during loading
function hideAllUIElements() {
    const elements = [
        'pauseMenu',
        'highScores'
        // Note: settingsScreen, howToPlay, highScoresScreen, gameOver are now inside pauseMenu
        // so they don't need to be hidden here - they're controlled by pauseMenu visibility
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.style.display = 'none';
        }
    });
}

// Handle window resize to maintain fullscreen and reposition all game objects
window.addEventListener('resize', () => {
    // Use high-DPI canvas setup instead of simple width/height assignment
    setupHighDPICanvas();
    
    // Update responsive scaling
    responsiveScaler.updateScaling();
    
    // Reposition player if needed - use logical canvas dimensions (supports portrait mode)
    if (player && player.repositionOnResize) {
        player.repositionOnResize(canvas.logicalWidth, canvas.logicalHeight);
    }
    
    // Update sizes for all game objects
    if (fallingItems) {
        fallingItems.forEach(item => {
            if (item.repositionOnResize) {
                item.repositionOnResize();
            }
        });
    }
    
    if (fireballs) {
        fireballs.forEach(projectile => {
            if (projectile.repositionOnResize) {
                projectile.repositionOnResize();
            }
        });
    }
    
    if (powerUps) {
        powerUps.forEach(powerUp => {
            if (powerUp.repositionOnResize) {
                powerUp.repositionOnResize();
            }
        });
    }
    
    if (window.arrows) {
        window.arrows.forEach(arrow => {
            if (arrow.repositionOnResize) {
                arrow.repositionOnResize();
            }
        });
    }
});

// Update canvas overlay visibility based on game state
function updateCanvasOverlay() {
    updateCanvasOverlayVisibility({
        gameState,
        onGameVisible: () => {
            updateSpellBar(spellSystem);
            updateHealthBar(gameState);
        }
    });
}

// Main game loop
function gameLoop() {
    const deltaTimeMultiplier = calculateDeltaTimeMultiplier();
    const universalMultiplier = calculateUniversalMultiplier(canvas);
    
    // Update
    if (gameState.gameRunning && !gameState.showingPauseMenu) {
        update(deltaTimeMultiplier, universalMultiplier);
    } else if (gameState.gameRunning) {
        // Update player position even when paused/in settings
        updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig, gameState);
    }
    
    // Update canvas overlay visibility
    updateCanvasOverlay();
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

// Update game state
function update(deltaTimeMultiplier, universalMultiplier) {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    // Store universal multiplier and logical canvas dimensions in game state for use by other systems
    gameState.universalMultiplier = universalMultiplier;
    gameState.canvasWidth = canvas.logicalWidth;
    gameState.canvasHeight = canvas.logicalHeight;
    
    // Update spell system first
    spellSystem.update(Date.now(), player, canvas, gameConfig);
    
    // Update game state timers
    updateGameStateTimers(gameState, deltaTimeMultiplier);
    
    // Update notification system with current game state
    if (window.notificationSystem) {
        window.notificationSystem.updatePersistentNotifications(gameState);
    }
    
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
        const effectiveSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - (gameState.permanentSpeedReduction || 0));
        console.log(`🔍 LEVEL SPEED DEBUG: Score ${gameState.score}, Level ${gameState.currentLevel + 1}, Level Speed: ${gameState.levelSpeedMultiplier.toFixed(2)}x, Effective Speed: ${effectiveSpeed.toFixed(2)}x, DS Reduction: ${gameState.permanentSpeedReductionFromSets.toFixed(1)}x, CT Reduction: ${(gameState.permanentSpeedReduction || 0).toFixed(1)}x`);
    }
    
    // === BULLET TIME SYSTEM ===
    updateBulletTime(deltaTimeMultiplier);
    
    // Apply bullet time to delta time multiplier for all game objects
    const bulletTimeAdjustedDelta = deltaTimeMultiplier * gameState.bulletTimeMultiplier;
    
    // Update player position (not affected by bullet time - player should still be responsive)
    updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig, gameState);
    
    // Spawn new items, projectiles, and power-ups (affected by bullet time)
    spawnItems(bulletTimeAdjustedDelta);
    spawnProjectiles(bulletTimeAdjustedDelta);
    spawnPowerUps(bulletTimeAdjustedDelta);
    
    // Update all game objects (affected by bullet time)
    updateFallingItems(bulletTimeAdjustedDelta);
    updateProjectiles(bulletTimeAdjustedDelta);
    updatePowerUps(bulletTimeAdjustedDelta);
    updateArrows(bulletTimeAdjustedDelta);
    updateParticles(bulletTimeAdjustedDelta);
    updateCombatTexts(bulletTimeAdjustedDelta);
    updateBuffTracker(deltaTimeMultiplier); // Buff timers not affected by bullet time
    updateTemporaryStatEffects(deltaTimeMultiplier); // Update temporary stat effects
    
    // Check collisions
    checkCollisions();
    
    // Check end conditions
    checkGameEndConditions();
    
    // Update notifications
    updateNotifications(gameState);
}

// Render everything
function render() {
    renderFrame({
        ctx,
        canvas,
        gameState,
        responsiveScaler,
        player,
        particles,
        fallingItems,
        fireballs,
        powerUps,
        combatTexts,
        gameItems,
        gameVersion: GAME_VERSION,
        updateDOMItemsPanel,
        renderBulletTimeEffects
    });
}

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
    
        // Flask of Titans spell icon
    const flaskOfTitansIcon = new Image();
    flaskOfTitansIcon.onload = () => {
        images.spells.flask_of_titans = flaskOfTitansIcon;
    };
    flaskOfTitansIcon.src = assetRegistry.buffs.flaskOfTitans;
}

// Game functions (simplified - these would contain the full logic)
function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.health = gameState.maxHealth;
    gameState.gameRunning = true;
    gameState.gamePaused = false;
    gameState.currentScreen = 'game';
    
    // Reset caches for performance
    resetDragonstalkerCache();
    resetItemsListCache();
    clearTemporaryStatEffects();
    
    // Apply starting level configuration for testing
    const startingLevel = Math.max(0, (gameConfig.levels.startingLevel || 1) - 1); // Convert 1-based to 0-based
    gameState.currentLevel = startingLevel;
    
    // Calculate appropriate speed for starting level using the speed formula
    let initialSpeed = gameConfig.levels.formulaBase; // Base speed (1.2x)
    
    if (startingLevel > 0) {
        // Apply tier-based speed calculation for starting level
        const tierIncrements = [
            { maxLevel: 5,  increment: 0.5 },   // Levels 1-5:  Fast start (+0.5x per level)
            { maxLevel: 10, increment: 0.4 },   // Levels 6-10:  Steady ramp (+0.4x per level)
            { maxLevel: 15, increment: 0.5 },   // Levels 11-15: Accelerating (+0.5x per level)
            { maxLevel: 20, increment: 0.4 },   // Levels 16-20: Strong ramp (+0.4x per level) → ~10x at level 20
            { maxLevel: 25, increment: 0.6 },   // Levels 21-25: Very aggressive (+0.6x per level)
            { maxLevel: 30, increment: 0.6 },   // Levels 26-30: Maximum aggression (+0.6x per level) → ~20x at level 30
            { maxLevel: 999, increment: 0.3 }   // Levels 31+:   Moderate late-game (+0.3x per level)
        ];
        
        let currentLevel = 0;
        for (const tier of tierIncrements) {
            const levelsInThisTier = Math.min(startingLevel - currentLevel, tier.maxLevel - currentLevel);
            if (levelsInThisTier <= 0) break;
            
            initialSpeed += levelsInThisTier * tier.increment;
            currentLevel += levelsInThisTier;
            
            if (currentLevel >= startingLevel) break;
        }
        
        // Apply precision adjustments for early levels
        const precisionAdjustments = {
            1: 0.0,   // Level 1: 1.7x (1.2 + 0.5 + 0.0)
            2: 0.1,   // Level 2: 2.3x (1.2 + 1.0 + 0.1) 
            3: 0.0,   // Level 3: 2.7x (1.2 + 1.5 + 0.0)
            4: 0.1,   // Level 4: 3.3x (1.2 + 2.0 + 0.1)
            5: 0.0,   // Level 5: 3.7x (1.2 + 2.5 + 0.0)
            10: 0.1,  // Level 10: 5.9x fine-tuning
            15: 0.0,  // Level 15: 8.2x fine-tuning
            20: 0.0   // Level 20: 10.2x fine-tuning
        };
        
        if (precisionAdjustments[startingLevel] !== undefined) {
            initialSpeed += precisionAdjustments[startingLevel];
        }
        
        // Apply safety cap
        initialSpeed = Math.min(initialSpeed, gameConfig.levels.safetyCap);
    }
    
    gameState.levelSpeedMultiplier = Math.round(initialSpeed * 10) / 10;
    
    // For points-based progression, set appropriate starting score
    if (gameConfig.levels.progressionType === "points" && startingLevel > 0) {
        // Set score to the threshold for the starting level
        const thresholds = gameConfig.levels.thresholds;
        if (startingLevel < thresholds.length) {
            gameState.score = thresholds[startingLevel];
        } else {
            // For levels beyond thresholds, calculate score
            const lastThreshold = thresholds[thresholds.length - 1];
            const additionalLevels = startingLevel - (thresholds.length - 1);
            gameState.score = lastThreshold + (additionalLevels * 100); // 100 points per additional level
        }
    }
    
    console.log(`🚀 Starting at Level ${startingLevel + 1} with speed ${gameState.levelSpeedMultiplier}x${gameState.score > 0 ? ` (Score: ${gameState.score})` : ''}`);
    
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
    
    // Reset crit rating to base value
    gameState.critRating = gameState.baseCritRating;
    
    // Reset dodge rating
    gameState.dodgeRating = gameState.baseDodgeRating;
    
    // Reset dodge boost timers
    gameState.temporaryDodgeBoost = 0;
    gameState.dodgeBoostTimer = 0;
    
    // Reset dodge statistics
    gameState.totalDodges = 0;
    gameState.healthSavedFromDodges = 0;
    gameState.dodgeAreaExpansion = 0;
    
    // Reset arrow ammunition - start with 20 arrows
    gameState.arrowCount = 20;
    
    // Reset bullet time system
    gameState.bulletTimeActive = false;
    gameState.bulletTimeMultiplier = 1.0;
    gameState.bulletTimeVisualTimer = 0;
    
    // Clear buffs and arrays
    clearAllBuffs();
    clearHudNotifications();
    fallingItems = [];
    fireballs = [];
    powerUps = [];
    arrows = [];
    window.arrows = [];
    particles = [];
    combatTexts = [];
    
    // Reset recent drop positions
    recentDropYPositions = [];
    
    // Reset player state
    player.reset();
    
    // Reset input state for new game (mobile touch position handling)
    resetInputState();
    
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
    
    // Update mobile pause button visibility (show on mobile during gameplay)
    updateMobilePauseButtonVisibility();
    
    console.log('Game started');
}

function restartGame() {
    // Reset caches for performance
    resetDragonstalkerCache();
    resetItemsListCache();
    clearTemporaryStatEffects();
    
    // Reset all game state
    gameState.score = 0;
    gameState.health = 100;
    
    // Apply starting level configuration for testing
    const startingLevel = Math.max(0, (gameConfig.levels.startingLevel || 1) - 1); // Convert 1-based to 0-based
    gameState.currentLevel = startingLevel;
    
    // Calculate appropriate speed for starting level using the speed formula
    let initialSpeed = gameConfig.levels.formulaBase; // Base speed (1.2x)
    
    if (startingLevel > 0) {
        // Apply tier-based speed calculation for starting level
        const tierIncrements = [
            { maxLevel: 5,  increment: 0.5 },   // Levels 1-5:  Fast start (+0.5x per level)
            { maxLevel: 10, increment: 0.4 },   // Levels 6-10:  Steady ramp (+0.4x per level)
            { maxLevel: 15, increment: 0.5 },   // Levels 11-15: Accelerating (+0.5x per level)
            { maxLevel: 20, increment: 0.4 },   // Levels 16-20: Strong ramp (+0.4x per level) → ~10x at level 20
            { maxLevel: 25, increment: 0.6 },   // Levels 21-25: Very aggressive (+0.6x per level)
            { maxLevel: 30, increment: 0.6 },   // Levels 26-30: Maximum aggression (+0.6x per level) → ~20x at level 30
            { maxLevel: 999, increment: 0.3 }   // Levels 31+:   Moderate late-game (+0.3x per level)
        ];
        
        let currentLevel = 0;
        for (const tier of tierIncrements) {
            const levelsInThisTier = Math.min(startingLevel - currentLevel, tier.maxLevel - currentLevel);
            if (levelsInThisTier <= 0) break;
            
            initialSpeed += levelsInThisTier * tier.increment;
            currentLevel += levelsInThisTier;
            
            if (currentLevel >= startingLevel) break;
        }
        
        // Apply precision adjustments for early levels
        const precisionAdjustments = {
            1: 0.0,   // Level 1: 1.7x (1.2 + 0.5 + 0.0)
            2: 0.1,   // Level 2: 2.3x (1.2 + 1.0 + 0.1) 
            3: 0.0,   // Level 3: 2.7x (1.2 + 1.5 + 0.0)
            4: 0.1,   // Level 4: 3.3x (1.2 + 2.0 + 0.1)
            5: 0.0,   // Level 5: 3.7x (1.2 + 2.5 + 0.0)
            10: 0.1,  // Level 10: 5.9x fine-tuning
            15: 0.0,  // Level 15: 8.2x fine-tuning
            20: 0.0   // Level 20: 10.2x fine-tuning
        };
        
        if (precisionAdjustments[startingLevel] !== undefined) {
            initialSpeed += precisionAdjustments[startingLevel];
        }
        
        // Apply safety cap
        initialSpeed = Math.min(initialSpeed, gameConfig.levels.safetyCap);
    }
    
    gameState.levelSpeedMultiplier = Math.round(initialSpeed * 10) / 10;
    
    // For points-based progression, set appropriate starting score
    if (gameConfig.levels.progressionType === "points" && startingLevel > 0) {
        // Set score to the threshold for the starting level
        const thresholds = gameConfig.levels.thresholds;
        if (startingLevel < thresholds.length) {
            gameState.score = thresholds[startingLevel];
        } else {
            // For levels beyond thresholds, calculate score
            const lastThreshold = thresholds[thresholds.length - 1];
            const additionalLevels = startingLevel - (thresholds.length - 1);
            gameState.score = lastThreshold + (additionalLevels * 100); // 100 points per additional level
        }
    }
    
    console.log(`🔄 Restarting at Level ${startingLevel + 1} with speed ${gameState.levelSpeedMultiplier}x${gameState.score > 0 ? ` (Score: ${gameState.score})` : ''}`);
    
    gameState.missedItems = 0;
    gameState.perfectCollections = 0;
    gameState.tierSetCollected = 0;
    gameState.tierSetMissed = 0;
    gameState.dragonstalkerCompletions = 0;
    gameState.permanentSpeedReductionFromSets = 0;
    gameState.gameWon = false;
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
    gameState.elapsedTime = 0;
    gameState.nextPowerUpTime = undefined; // Reset power-up timer
    // Notifications now handled by HTML+CSS notification system
    
    // Reset UI state
    gameState.showingPauseMenu = false;
    gameState.howToPlaySource = 'menu';
    
    // Reset damage-over-time effects
    gameState.shadowboltDots = [];
    gameState.shadowboltTimer = 0;
    
    // Reset heal-over-time effects
    gameState.chickenFoodHots = [];
    gameState.chickenFoodTimer = 0;
    
    // Reset crit rating to base value
    gameState.critRating = gameState.baseCritRating;
    
    // Reset dodge rating
    gameState.dodgeRating = gameState.baseDodgeRating;
    
    // Reset dodge boost timers
    gameState.temporaryDodgeBoost = 0;
    gameState.dodgeBoostTimer = 0;
    
    // Reset dodge statistics
    gameState.totalDodges = 0;
    gameState.healthSavedFromDodges = 0;
    gameState.dodgeAreaExpansion = 0;
    
    // Reset arrow ammunition - start with 20 arrows
    gameState.arrowCount = 20;
    
    // Reset bullet time system
    gameState.bulletTimeActive = false;
    gameState.bulletTimeMultiplier = 1.0;
    gameState.bulletTimeVisualTimer = 0;
    
    // Clear buffs and all game objects
    clearAllBuffs();
    clearHudNotifications();
    fallingItems = [];
    fireballs = [];
    powerUps = [];
    arrows = [];
    window.arrows = [];
    particles = [];
    combatTexts = [];
    recentDropYPositions = [];
    
    // Reset player
    if (player && player.reset) {
        player.reset();
    }
    
    // Reset input state for new game (mobile touch position handling)
    resetInputState();
    
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
    gameState.gamePaused = true;
    
    // Show HTML pause menu instead of canvas-based one
    document.getElementById('pauseMenu').style.display = 'flex';
    
    // Update pause menu content to show appropriate view
    updatePauseMenuContent();
    
    // Enable cursor interaction with pause menu
    canvas.classList.add('show-cursor');
    
    // Hide mobile pause button when pause menu is shown
    updateMobilePauseButtonVisibility();
    
    updateCanvasOverlay();
}

function hidePauseMenu() {
    gameState.showingPauseMenu = false;
    gameState.gameRunning = true; // Resume the game when hiding pause menu
    gameState.gamePaused = false;
    
    // Hide HTML pause menu
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Disable cursor when returning to game
    canvas.classList.remove('show-cursor');
    
    // Update mobile pause button visibility when resuming
    updateMobilePauseButtonVisibility();
    
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
    // Check if we're at the power-up limit
    if (powerUps.length >= gameConfig.powerUps.maxPowerUps) {
        return; // Don't spawn if at limit
    }
    
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
                
                // Frame-based spawning doesn't need score tracking
            }
        }
    }
}

function updateFallingItems(deltaTimeMultiplier) {
    fallingItems = fallingItems.filter(item => {
        if (gameState.freezeTimeActive) {
            return true; // Don't update when time is frozen - freeze ALL items
        }
        
        // Apply spell speed effects to falling items
        const spellSpeedMultiplier = spellSystem.getItemSpeedMultiplier();
        const adjustedDeltaTime = deltaTimeMultiplier * spellSpeedMultiplier;
        
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
                // Check dodge first, then shield
                if (shouldDodge()) {
                    // Player dodged the missed item penalty
                    showDodgeText(player.x + player.width/2, player.y);
                    trackDodge(gameConfig.gameplay.healthLossOnMiss); // Track HP saved from dodging missed item
                    addNotification(gameState, `💨 Dodged Item Miss!`, 120, '#00FF00');
                    playUffSound(); // Still play the sound for feedback
                } else if (gameState.shieldActive) {
                    // Shield blocks the damage from missed items (only if dodge failed)
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
        
        const stillActive = projectile.update(adjustedDeltaTime, canvas, gameState);
        return stillActive;
    });
}

function updatePowerUps(deltaTimeMultiplier) {
    powerUps = powerUps.filter(powerUp => {
        if (gameState.freezeTimeActive) {
            return true; // Don't update when time is frozen - freeze ALL power-ups
        }
        
        const stillActive = powerUp.update(gameState, deltaTimeMultiplier, canvas);
        return stillActive && !powerUp.missed;
    });
}

function updateArrows(deltaTimeMultiplier) {
    window.arrows = window.arrows.filter(arrow => {
        return arrow.update(deltaTimeMultiplier, canvas, gameState);
    });
    // Keep local arrows array synchronized
    arrows = window.arrows;
}

function updateParticles(deltaTimeMultiplier) {
    particles = particles.filter(particle => particle.update(deltaTimeMultiplier));
}

function updateCombatTexts(deltaTimeMultiplier) {
    combatTexts = combatTexts.filter(text => text.update(deltaTimeMultiplier));
}

function checkCollisions() {
    checkCollisionSystem({
        gameState,
        player,
        fallingItems,
        fireballs,
        powerUps,
        particles,
        combatTexts,
        gameItems,
        spellSystem,
        onItemCollected,
        applyItemStatBonuses,
        shouldDodge,
        showDodgeText,
        trackDodge
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

// Show main menu (unified pause menu with name entry content)
function showNameEntry() {
    console.log('Showing main menu - game is ready for player interaction');
    hideAllUIElements();
    
    // Ensure proper game state for main menu
    gameState.showingPauseMenu = false;
    gameState.gameRunning = false;
    gameState.currentScreen = 'menu';
    
    // Show the pause menu container with name entry content
    document.getElementById('pauseMenu').style.display = 'flex';
    
    // Explicitly ensure pause menu content is visible and other screens are hidden
    document.getElementById('pauseMenuContent').style.display = 'block';
    document.getElementById('settingsScreen').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('highScoresScreen').style.display = 'none';
    
    updatePauseMenuContent();
    
    // Update button visibility based on game state
    updateMenuButtons();
    
    // Load saved player name from localStorage and populate input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        const savedName = localStorage.getItem('efto_playerName');
        if (savedName) {
            nameInput.value = savedName;
            console.log('Loaded saved player name:', savedName);
        }
        nameInput.focus();
        nameInput.select();
    }
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Dynamic function to update pause menu content based on game state
function updatePauseMenuContent() {
    const nameEntryContent = document.getElementById('nameEntryContent');
    const pauseGameContent = document.getElementById('pauseGameContent');
    
    // Check if there's a game in progress (running or paused) similar to updateMenuButtons logic
    const gameInProgress = gameState.gameRunning || gameState.showingPauseMenu || 
                          (gameState.currentScreen === 'game' && gameState.health > 0);
    
    if (gameInProgress) {
        // Show pause content - there's an active game
        nameEntryContent.style.display = 'none';
        pauseGameContent.style.display = 'block';
    } else {
        // Show name entry content - no active game
        nameEntryContent.style.display = 'block';
        pauseGameContent.style.display = 'none';
    }
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
function showHighScores(fromPause = false, fromGameOver = false) {
    console.log('Showing high scores screen');
    
    if (fromPause || fromGameOver) {
        // Coming from pause menu or game over - hide pause content, show highScores within pause menu
        document.getElementById('pauseMenuContent').style.display = 'none';
        if (fromGameOver) {
            document.getElementById('gameOver').style.display = 'none';
        }
        document.getElementById('highScoresScreen').style.display = 'block';
    } else {
        // Coming from main menu - show high scores in pause menu
        hideAllUIElements();
        document.getElementById('pauseMenu').style.display = 'flex';
        document.getElementById('pauseMenuContent').style.display = 'none';
        document.getElementById('highScoresScreen').style.display = 'block';
    }
    
    gameState.currentScreen = 'highScores';
    
    // Store where we came from for the back button
    if (fromGameOver) {
        gameState.highScoresSource = 'gameOver';
    } else {
        gameState.highScoresSource = fromPause ? 'pause' : 'menu';
    }
    
    // Update back button text based on source
    const backBtn = document.getElementById('highScoresBackBtn');
    if (backBtn) {
        if (gameState.highScoresSource === 'gameOver') {
            backBtn.textContent = 'Back to Game Over';
        } else if (gameState.highScoresSource === 'pause') {
            backBtn.textContent = 'Back to Pause Menu';
        } else {
            backBtn.textContent = 'Back to Menu';
        }
    }
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show how to play screen
function showHowToPlay(fromPause = false) {
    console.log('Showing how to play screen');
    
    if (fromPause) {
        // Coming from pause menu - hide pause content, show howToPlay within pause menu
        document.getElementById('pauseMenuContent').style.display = 'none';
        document.getElementById('howToPlay').style.display = 'block';
    } else {
        // Coming from main menu - hide all UI elements and show howToPlay in pause menu
        hideAllUIElements();
        document.getElementById('pauseMenu').style.display = 'flex';
        document.getElementById('pauseMenuContent').style.display = 'none';
        document.getElementById('howToPlay').style.display = 'block';
    }
    
    gameState.currentScreen = 'howToPlay';
    
    // Store where we came from for the back button
    gameState.howToPlaySource = fromPause ? 'pause' : 'menu';
    
    // Generate dynamic help content based on current game configuration
    generateDynamicHelpContent();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// ===== DYNAMIC HELP CONTENT GENERATION =====

// Generate dynamic help content based on actual game data and config
function generateDynamicHelpContent() {
    renderDynamicHelpContent(gameState, gameItems);
}

// Show items/settings screen from menu
function showItemsFromMenu() {
    // Hide all UI screens using safe access
    hideAllUIElements();
    
    // Ensure we're on the menu screen
    gameState.currentScreen = 'menu';
    
    // Update canvas overlay
    updateCanvasOverlay();
}

function showSettings(source = null) {
    console.log('showSettings() called with source:', source);
    // Store where we came from for the back button
    if (source) {
        gameState.settingsSource = source;
    } else {
        gameState.settingsSource = gameState.gameRunning ? 'game' : 'menu';
    }
    
    // If coming from game, pause it
    if (gameState.gameRunning) {
        gameState.gamePaused = true;
    }
    
    if (gameState.settingsSource === 'pause') {
        // Coming from pause menu - hide pause content, show settings within pause menu
        document.getElementById('pauseMenuContent').style.display = 'none';
        document.getElementById('settingsScreen').style.display = 'block';
    } else {
        // Coming from main menu - show settings in pause menu
        hideAllUIElements();
        document.getElementById('pauseMenu').style.display = 'flex';
        document.getElementById('pauseMenuContent').style.display = 'none';
        document.getElementById('settingsScreen').style.display = 'block';
    }
    
    gameState.currentScreen = 'settings';
    
    console.log('Settings screen displayed');
    
    // Update back button text based on source
    const backBtn = document.getElementById('settingsBackBtn');
    if (backBtn) {
        if (gameState.settingsSource === 'game') {
            backBtn.textContent = 'Continue Game';
        } else if (gameState.settingsSource === 'pause') {
            backBtn.textContent = 'Back to Pause Menu';
        } else {
            backBtn.textContent = 'Back to Menu';
        }
    }
    
    // Update UI elements with current settings
    console.log('Updating settings UI...');
    updateSettingsUI();
    
    // Set up event handlers for settings controls (do this each time settings opens)
    console.log('Setting up event handlers...');
    setupSettingsEventHandlers();
    console.log('showSettings() complete');
}

function closeSettings() {
    document.getElementById('settingsScreen').style.display = 'none';
    
    if (gameState.settingsSource === 'game') {
        // Return to game
        gameState.gamePaused = false;
        gameState.currentScreen = 'game';
        updateCanvasOverlay();
    } else if (gameState.settingsSource === 'pause') {
        // Return to pause menu - show pause content, keep pause menu visible
        document.getElementById('pauseMenuContent').style.display = 'block';
    } else {
        // Return to main menu - ensure proper state clearing
        gameState.showingPauseMenu = false;
        gameState.gameRunning = false;
        showNameEntry();
    }
}

function showMainMenu() {
    hideAllUIElements();
    showNameEntry();
}

function updateSettingsUI() {
    const settings = getSettings();
    
    // Update audio toggles
    document.getElementById('soundEffectsToggle').checked = settings.audio.soundEffects;
    document.getElementById('backgroundMusicToggle').checked = settings.audio.backgroundMusic;
    
    // Update volume sliders
    document.getElementById('masterVolumeSlider').value = settings.audio.masterVolume || settings.audio.volume || 70;
    document.getElementById('masterVolumeValue').textContent = (settings.audio.masterVolume || settings.audio.volume || 70) + '%';
    
    document.getElementById('musicVolumeSlider').value = settings.audio.musicVolume || 50;
    document.getElementById('musicVolumeValue').textContent = (settings.audio.musicVolume || 50) + '%';
    
    document.getElementById('effectsVolumeSlider').value = settings.audio.effectsVolume || 80;
    document.getElementById('effectsVolumeValue').textContent = (settings.audio.effectsVolume || 80) + '%';
    
    // Update game mode radio buttons
    const gameModeValue = settings.gameplay?.gameMode || 'normal';
    const gameModeRadio = document.querySelector(`input[name="gameMode"][value="${gameModeValue}"]`);
    if (gameModeRadio) {
        gameModeRadio.checked = true;
    }
    
    // Update panel style dropdowns
    const playerPanelStyle = settings.ui?.playerPanelStyle || 'auto';
    const playerPanelSelect = document.getElementById('playerPanelStyle');
    if (playerPanelSelect) {
        playerPanelSelect.value = playerPanelStyle;
    }
    
    const dragonstalkerPanelStyle = settings.ui?.dragonstalkerPanelStyle || 'auto';
    const dragonstalkerPanelSelect = document.getElementById('dragonstalkerPanelStyle');
    if (dragonstalkerPanelSelect) {
        dragonstalkerPanelSelect.value = dragonstalkerPanelStyle;
    }
    
    // Update panel opacity slider
    const panelOpacity = settings.ui?.panelOpacity || 80;
    const panelOpacitySlider = document.getElementById('panelOpacity');
    const panelOpacityValue = document.getElementById('panelOpacityValue');
    if (panelOpacitySlider) {
        panelOpacitySlider.value = panelOpacity;
    }
    if (panelOpacityValue) {
        panelOpacityValue.textContent = panelOpacity + '%';
    }
}

function resetSettingsUI() {
    const defaultSettings = resetSettings();
    updateSettingsUI();
    
    // Show confirmation
    alert('Settings have been reset to defaults!');
}

function setupSettingsEventHandlers() {
    console.log('Setting up settings event handlers...');
    // Settings screen event handlers
    const soundEffectsToggle = document.getElementById('soundEffectsToggle');
    const backgroundMusicToggle = document.getElementById('backgroundMusicToggle');
    
    console.log('Toggle elements found:', {
        soundEffectsToggle: !!soundEffectsToggle,
        backgroundMusicToggle: !!backgroundMusicToggle
    });
    
    if (soundEffectsToggle) {
        console.log('Setting up sound effects toggle event handler');
        // Remove existing listeners to avoid duplicates
        soundEffectsToggle.replaceWith(soundEffectsToggle.cloneNode(true));
        const newSoundEffectsToggle = document.getElementById('soundEffectsToggle');
        
        console.log('New sound effects toggle element:', newSoundEffectsToggle);
        
        // Get the toggle slider (the visible part)
        const toggleSlider = newSoundEffectsToggle.parentElement.querySelector('.toggle-slider');
        console.log('Toggle slider element:', toggleSlider);
        
        // Add click listener to the visible slider
        if (toggleSlider) {
            toggleSlider.addEventListener('click', function() {
                console.log('Sound effects slider CLICKED!');
                // Toggle the checkbox state
                newSoundEffectsToggle.checked = !newSoundEffectsToggle.checked;
                // Trigger change event manually
                newSoundEffectsToggle.dispatchEvent(new Event('change'));
            });
        }
        
        // Add both click and change event listeners for debugging
        newSoundEffectsToggle.addEventListener('click', function() {
            console.log('Sound effects toggle CLICKED!');
        });
        
        newSoundEffectsToggle.addEventListener('change', function() {
            console.log('Sound effects toggle changed to:', this.checked);
            console.log('Current settings before update:', getSettings());
            updateSetting('audio', 'soundEffects', this.checked);
            console.log('Current settings after update:', getSettings());
        });
        
        console.log('Sound effects toggle event handler attached');
    } else {
        console.warn('Sound effects toggle element not found!');
    }
    
    if (backgroundMusicToggle) {
        console.log('Setting up background music toggle event handler');
        // Remove existing listeners to avoid duplicates
        backgroundMusicToggle.replaceWith(backgroundMusicToggle.cloneNode(true));
        const newBackgroundMusicToggle = document.getElementById('backgroundMusicToggle');
        
        console.log('New background music toggle element:', newBackgroundMusicToggle);
        
        // Get the toggle slider (the visible part)
        const toggleSlider = newBackgroundMusicToggle.parentElement.querySelector('.toggle-slider');
        console.log('Background music toggle slider element:', toggleSlider);
        
        // Add click listener to the visible slider
        if (toggleSlider) {
            toggleSlider.addEventListener('click', function() {
                console.log('Background music slider CLICKED!');
                // Toggle the checkbox state
                newBackgroundMusicToggle.checked = !newBackgroundMusicToggle.checked;
                // Trigger change event manually
                newBackgroundMusicToggle.dispatchEvent(new Event('change'));
            });
        }
        
        // Add both click and change event listeners for debugging
        newBackgroundMusicToggle.addEventListener('click', function() {
            console.log('Background music toggle CLICKED!');
        });
        
        newBackgroundMusicToggle.addEventListener('change', function() {
            console.log('Background music toggle changed to:', this.checked);
            console.log('Current settings before update:', getSettings());
            updateSetting('audio', 'backgroundMusic', this.checked);
            console.log('Current settings after update:', getSettings());
        });
        
        console.log('Background music toggle event handler attached');
    } else {
        console.warn('Background music toggle element not found!');
    }
    
    // Master Volume Slider
    const masterVolumeSlider = document.getElementById('masterVolumeSlider');
    if (masterVolumeSlider) {
        masterVolumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);
            document.getElementById('masterVolumeValue').textContent = volume + '%';
            updateSetting('audio', 'masterVolume', volume);
        });
    }
    
    // Music Volume Slider
    const musicVolumeSlider = document.getElementById('musicVolumeSlider');
    if (musicVolumeSlider) {
        musicVolumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);
            document.getElementById('musicVolumeValue').textContent = volume + '%';
            updateSetting('audio', 'musicVolume', volume);
        });
    }
    
    // Effects Volume Slider
    const effectsVolumeSlider = document.getElementById('effectsVolumeSlider');
    if (effectsVolumeSlider) {
        effectsVolumeSlider.addEventListener('input', function() {
            const volume = parseInt(this.value);
            document.getElementById('effectsVolumeValue').textContent = volume + '%';
            updateSetting('audio', 'effectsVolume', volume);
        });
    }

    // Game Mode Settings
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            if (this.checked) {
                console.log('Game mode changed to:', this.value);
                updateSetting('gameplay', 'gameMode', this.value);
            }
        });
    });

    // Panel Style Settings
    const playerPanelStyleSelect = document.getElementById('playerPanelStyle');
    if (playerPanelStyleSelect) {
        playerPanelStyleSelect.addEventListener('change', function() {
            console.log('Player panel style changed to:', this.value);
            updateSetting('ui', 'playerPanelStyle', this.value);
        });
    }

    const dragonstalkerPanelStyleSelect = document.getElementById('dragonstalkerPanelStyle');
    if (dragonstalkerPanelStyleSelect) {
        dragonstalkerPanelStyleSelect.addEventListener('change', function() {
            console.log('Dragonstalker panel style changed to:', this.value);
            updateSetting('ui', 'dragonstalkerPanelStyle', this.value);
        });
    }

    // Panel Opacity Setting
    const panelOpacitySlider = document.getElementById('panelOpacity');
    if (panelOpacitySlider) {
        panelOpacitySlider.addEventListener('input', function() {
            const opacity = parseInt(this.value);
            document.getElementById('panelOpacityValue').textContent = opacity + '%';
            updateSetting('ui', 'panelOpacity', opacity);
        });
    }
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
    
    // Save player name to localStorage for future sessions
    localStorage.setItem('efto_playerName', playerName);
    console.log('Saved player name to localStorage:', playerName);
    
    // Hide the pause menu (which contains the name entry content)
    document.getElementById('pauseMenu').style.display = 'none';
    
    // Start the actual game
    startGame();
}

// Handle restart from game over screen
function restartGameFromUI() {
    const currentPlayerName = gameState.playerName;
    
    // Hide game over screen and pause menu container
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseMenu').style.display = 'none';
    // Reset pause menu content visibility for next time
    document.getElementById('pauseMenuContent').style.display = 'block';
    
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
        
        // Save name to localStorage as user types (debounced)
        let saveTimeout;
        nameInput.addEventListener('input', function(e) {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const name = e.target.value.trim();
                if (name) {
                    localStorage.setItem('efto_playerName', name);
                    console.log('Auto-saved player name:', name);
                }
            }, 1000); // Save after 1 second of no typing
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Settings shortcut (S key)
        if (e.key === 's' || e.key === 'S') {
            // Only if not typing in an input field
            if (!e.target.matches('input, textarea')) {
                e.preventDefault();
                if (gameState.currentScreen === 'settings') {
                    closeSettings();
                } else if (gameState.gameRunning || gameState.currentScreen === 'menu') {
                    showSettings();
                } else if (gameState.showingPauseMenu) {
                    showSettings('pause');
                }
            }
        }
        
        // ESC key to close settings
        if (e.key === 'Escape' && gameState.currentScreen === 'settings') {
            e.preventDefault();
            closeSettings();
        }
        
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
    if (startBtn) {
        startBtn.addEventListener('click', startGameFromUI);
    }
    
    if (continueBtn) {
        continueBtn.addEventListener('click', function() {
            // Hide menu and continue the paused game
            document.getElementById('pauseMenu').style.display = 'none';
            gameState.gameRunning = true;
            gameState.gamePaused = false;
            gameState.currentScreen = 'game';
            updateCanvasOverlay();
            updateMobilePauseButtonVisibility();
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
                // Return to pause menu content (howToPlay is now inside pause menu)
                document.getElementById('howToPlay').style.display = 'none';
                document.getElementById('pauseMenuContent').style.display = 'block';
            } else {
                // Return to main menu
                showNameEntry();
            }
        });
    }
    
    // High scores back button
    const highScoresBackBtn = document.getElementById('highScoresBackBtn');
    if (highScoresBackBtn) {
        highScoresBackBtn.addEventListener('click', function() {
            // Check where we came from
            if (gameState.highScoresSource === 'pause') {
                // Return to pause menu content (highScores is now inside pause menu)
                document.getElementById('highScoresScreen').style.display = 'none';
                document.getElementById('pauseMenuContent').style.display = 'block';
            } else if (gameState.highScoresSource === 'gameOver') {
                // Return to game over screen
                document.getElementById('highScoresScreen').style.display = 'none';
                document.getElementById('gameOver').style.display = 'block';
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
        viewScoresBtn2.addEventListener('click', function() {
            showHighScores(false, true); // Pass fromGameOver = true
        });
    }
    

    
    // Settings button (main menu)
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', showSettings);
    }
    
    // In-game settings button
    const gameSettingsBtn = document.getElementById('gameSettingsBtn');
    if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', showSettings);
    }
    
    // Settings screen event handlers are set up in showSettings() function
    
    // Pause menu button handlers
    const continuePauseBtn = document.getElementById('continuePauseBtn');
    const gameInfoPauseBtn = document.getElementById('gameInfoPauseBtn');
    const settingsPauseBtn = document.getElementById('settingsPauseBtn');
    const restartPauseBtn = document.getElementById('restartPauseBtn');
    
    if (continuePauseBtn) {
        continuePauseBtn.addEventListener('click', function() {
            hidePauseMenu();
            gameState.gameRunning = true;
            gameState.gamePaused = false;
            gameState.currentScreen = 'game';
            updateMobilePauseButtonVisibility();
        });
    }
    
    if (gameInfoPauseBtn) {
        gameInfoPauseBtn.addEventListener('click', function() {
            // Hide pause content and show game info (how to play screen) within pause menu
            showHowToPlay(true); // Pass true to indicate it came from pause
        });
    }
    
    if (settingsPauseBtn) {
        settingsPauseBtn.addEventListener('click', function() {
            // Hide pause content and show settings within pause menu
            showSettings('pause'); // Pass 'pause' to indicate we came from pause menu
        });
    }
    
    // Item bonuses button handler
    const itemBonusesPauseBtn = document.getElementById('itemBonusesPauseBtn');
    if (itemBonusesPauseBtn) {
        itemBonusesPauseBtn.addEventListener('click', function() {
            // Hide pause menu and show item bonuses
            hidePauseMenu();
            showItemBonuses('pause');
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
    
    // Desktop item bonuses icon handler
    const itemBonusesDesktopBtn = document.getElementById('itemBonusesDesktopBtn');
    if (itemBonusesDesktopBtn) {
        itemBonusesDesktopBtn.addEventListener('click', function() {
            showItemBonuses('desktop');
        });
    }
    
    // Mobile pause button handler
    const mobilePauseBtn = document.getElementById('mobilePauseBtn');
    if (mobilePauseBtn) {
        mobilePauseBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile pause button clicked');
            if (gameState.gameRunning && !gameState.showingPauseMenu) {
                showPauseMenu();
            }
        });
        
        // Touch event handling for better mobile responsiveness
        mobilePauseBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('Mobile pause button touched');
            if (gameState.gameRunning && !gameState.showingPauseMenu) {
                showPauseMenu();
            }
        }, { passive: false });
    }
}

// ===== ITEM BONUSES WINDOW FUNCTIONS =====

// Show the Item Bonuses window
function showItemBonuses(source = null) {
    const itemBonusesWindow = document.getElementById('itemBonusesWindow');
    if (!itemBonusesWindow) return;
    
    // Show the window
    itemBonusesWindow.style.display = 'flex';
    
    // Store source for back navigation
    gameState.itemBonusesSource = source;
    
    // Populate with current data
    updateItemBonusesWindow();
    
    // Set up event handlers if not already done
    setupItemBonusesEventHandlers();
    
    console.log('Item Bonuses window opened from:', source);
}

// Hide the Item Bonuses window
function hideItemBonuses() {
    const itemBonusesWindow = document.getElementById('itemBonusesWindow');
    if (!itemBonusesWindow) return;
    
    itemBonusesWindow.style.display = 'none';
    
    // Handle back navigation
    const source = gameState.itemBonusesSource;
    if (source === 'pause') {
        // Return to pause menu
        showPauseMenu();
    }
    // If from desktop, just close and return to game
    
    console.log('Item Bonuses window closed, returning to:', source || 'game');
}

// Mobile pause button visibility management
function updateMobilePauseButtonVisibility() {
    const mobilePauseBtn = document.getElementById('mobilePauseBtn');
    if (!mobilePauseBtn) return;
    
    // Show button only on mobile devices during active gameplay
    const shouldShow = responsiveScaler.deviceType === 'mobile' && 
                      gameState.gameRunning && 
                      !gameState.showingPauseMenu &&
                      gameState.currentScreen === 'game';
    
    mobilePauseBtn.style.display = shouldShow ? 'flex' : 'none';
    
    if (shouldShow) {
        console.log('🎮 Mobile pause button shown');
    }
}

// Update the Item Bonuses window with current data
function updateItemBonusesWindow() {
    // Update summary stats
    const totalCrit = getCurrentTotalCritRating();
    const totalDodge = getCurrentTotalDodgeRating();
    
    document.getElementById('totalCritRating').textContent = `${Math.round(totalCrit * 100)}%`;
    document.getElementById('totalDodgeRating').textContent = `${Math.round(totalDodge * 100)}%`;
    
    // Update tabs content
    updatePermanentBonusesTab();
    updateTemporaryBonusesTab();
    updateAllItemsTab();
}

// Update permanent bonuses tab
function updatePermanentBonusesTab() {
    const container = document.getElementById('permanentBonusesList');
    const noItemsMsg = document.getElementById('noPermanentBonuses');
    
    // Get items with permanent bonuses that have been collected
    const permanentBonusItems = gameItems.filter(item => 
        item.collected > 0 && 
        item.effect_type === 'permanent' && 
        (item.crit_rating_bonus > 0 || item.dodge_rating_bonus > 0)
    );
    
    if (permanentBonusItems.length === 0) {
        noItemsMsg.style.display = 'block';
        // Hide any existing bonus items
        container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
        return;
    }
    
    noItemsMsg.style.display = 'none';
    
    // Clear existing bonus items (but keep the no-bonuses message)
    container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
    
    // Add permanent bonus items
    permanentBonusItems.forEach(item => {
        const bonusElement = createBonusItemElement(item, 'permanent');
        container.appendChild(bonusElement);
    });
}

// Update temporary bonuses tab
function updateTemporaryBonusesTab() {
    const container = document.getElementById('temporaryBonusesList');
    const noItemsMsg = document.getElementById('noTemporaryBonuses');
    const temporaryStatEffects = getTemporaryStatEffects();
    
    // Get active temporary effects
    const hasTempEffects = temporaryStatEffects.critRatingEffects.length > 0 || 
                          temporaryStatEffects.dodgeRatingEffects.length > 0;
    
    if (!hasTempEffects) {
        noItemsMsg.style.display = 'block';
        container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
        return;
    }
    
    noItemsMsg.style.display = 'none';
    
    // Clear existing bonus items
    container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
    
    // Add temporary crit effects
    temporaryStatEffects.critRatingEffects.forEach(effect => {
        const bonusElement = createTemporaryEffectElement(effect, 'crit');
        container.appendChild(bonusElement);
    });
    
    // Add temporary dodge effects
    temporaryStatEffects.dodgeRatingEffects.forEach(effect => {
        const bonusElement = createTemporaryEffectElement(effect, 'dodge');
        container.appendChild(bonusElement);
    });
}

// Update all items tab
function updateAllItemsTab() {
    const container = document.getElementById('allItemsList');
    const noItemsMsg = document.getElementById('noItems');
    
    // Get all items with stat bonuses (regardless of collection status)
    const allBonusItems = gameItems.filter(item => 
        item.crit_rating_bonus > 0 || item.dodge_rating_bonus > 0
    );
    
    if (allBonusItems.length === 0) {
        noItemsMsg.querySelector('.bonus-item-name').textContent = 'No items with stat bonuses found';
        noItemsMsg.querySelector('.bonus-description').textContent = 'No items are configured with crit or dodge bonuses';
        noItemsMsg.style.display = 'block';
        container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
        return;
    }
    
    noItemsMsg.style.display = 'none';
    
    // Clear existing bonus items
    container.querySelectorAll('.bonus-item:not(.no-bonuses)').forEach(item => item.remove());
    
    // Sort items by type priority
    const sortedItems = allBonusItems.sort((a, b) => {
        const priorityOrder = { zee_zgnan: 5, legendary: 4, special: 3, epic: 2, tier_set: 1, regular: 0 };
        const aPriority = priorityOrder[a.type] || 0;
        const bPriority = priorityOrder[b.type] || 0;
        
        if (aPriority !== bPriority) return bPriority - aPriority;
        return a.name.localeCompare(b.name);
    });
    
    // Add all bonus items
    sortedItems.forEach(item => {
        const bonusElement = createBonusItemElement(item, 'all');
        container.appendChild(bonusElement);
    });
}

// Create a bonus item element
function createBonusItemElement(item, tabType) {
    const bonusElement = document.createElement('div');
    bonusElement.className = 'bonus-item';
    
    const isCollected = item.collected > 0;
    const collectionText = tabType === 'all' ? 
        (isCollected ? ` (Collected ${item.collected}x)` : ' (Not collected)') : 
        ` (${item.collected}x)`;
    
    const critBonus = item.crit_rating_bonus || 0;
    const dodgeBonus = item.dodge_rating_bonus || 0;
    
    let bonusValues = '';
    if (critBonus > 0) {
        bonusValues += `<span class="bonus-value crit">+${Math.round(critBonus * 100)}% Crit</span>`;
    }
    if (dodgeBonus > 0) {
        bonusValues += `<span class="bonus-value dodge">+${Math.round(dodgeBonus * 100)}% Dodge</span>`;
    }
    
    const effectTypeText = item.effect_type === 'permanent' ? 'Permanent' : 
        `Temporary (${Math.round((item.effect_duration || 600) / 60)}s)`;
    
    bonusElement.innerHTML = `
        <div class="bonus-info">
            <div class="bonus-item-name">${item.name}${collectionText}</div>
            <div class="bonus-description">${effectTypeText} • ${item.type}</div>
        </div>
        <div class="bonus-values">
            ${bonusValues}
        </div>
    `;
    
    // Add visual indicators for collection status
    if (tabType === 'all') {
        if (!isCollected) {
            bonusElement.style.opacity = '0.6';
            bonusElement.style.borderStyle = 'dashed';
        }
    }
    
    return bonusElement;
}

// Create a temporary effect element
function createTemporaryEffectElement(effect, type) {
    const bonusElement = document.createElement('div');
    bonusElement.className = 'bonus-item';
    
    const remainingSeconds = Math.ceil(effect.remainingFrames / 60);
    const bonusPercent = Math.round(effect.bonus * 100);
    const bonusType = type === 'crit' ? 'Crit' : 'Dodge';
    const colorClass = type === 'crit' ? 'crit' : 'dodge';
    
    bonusElement.innerHTML = `
        <div class="bonus-info">
            <div class="bonus-item-name">${effect.itemName}</div>
            <div class="bonus-description">Active temporary effect • ${remainingSeconds}s remaining</div>
        </div>
        <div class="bonus-values">
            <span class="bonus-value ${colorClass} temporary">+${bonusPercent}% ${bonusType}</span>
        </div>
    `;
    
    return bonusElement;
}

// Set up event handlers for the Item Bonuses window
function setupItemBonusesEventHandlers() {
    // Close button
    const closeBonusesBtn = document.getElementById('closeBonusesBtn');
    if (closeBonusesBtn && !closeBonusesBtn.hasEventListener) {
        closeBonusesBtn.addEventListener('click', hideItemBonuses);
        closeBonusesBtn.hasEventListener = true;
    }
    
    // Tab switching
    const permanentTab = document.getElementById('permanentBonusesTab');
    const temporaryTab = document.getElementById('temporaryBonusesTab');
    const allItemsTab = document.getElementById('allItemsTab');
    
    if (permanentTab && !permanentTab.hasEventListener) {
        permanentTab.addEventListener('click', () => switchBonusTab('permanent'));
        permanentTab.hasEventListener = true;
    }
    
    if (temporaryTab && !temporaryTab.hasEventListener) {
        temporaryTab.addEventListener('click', () => switchBonusTab('temporary'));
        temporaryTab.hasEventListener = true;
    }
    
    if (allItemsTab && !allItemsTab.hasEventListener) {
        allItemsTab.addEventListener('click', () => switchBonusTab('all'));
        allItemsTab.hasEventListener = true;
    }
}

// Switch between bonus tabs
function switchBonusTab(tabName) {
    // Remove active class from all tabs and lists
    document.querySelectorAll('.bonus-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.bonuses-list').forEach(list => list.classList.remove('active'));
    
    // Activate selected tab and list (handle different naming conventions)
    let tabButton, tabList;
    
    if (tabName === 'permanent') {
        tabButton = document.getElementById('permanentBonusesTab');
        tabList = document.getElementById('permanentBonusesList');
    } else if (tabName === 'temporary') {
        tabButton = document.getElementById('temporaryBonusesTab');
        tabList = document.getElementById('temporaryBonusesList');
    } else if (tabName === 'all') {
        tabButton = document.getElementById('allItemsTab');
        tabList = document.getElementById('allItemsList');
    }
    
    if (tabButton) tabButton.classList.add('active');
    if (tabList) tabList.classList.add('active');
    
    console.log('Switched to bonus tab:', tabName);
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
            panel.classList.add('paused'); // Add paused class for mobile responsive behavior
        } else {
            panel.classList.remove('interactive');
            panel.classList.remove('paused'); // Remove paused class during gameplay
        }
        
        // Check if mobile portrait mode and restructure HTML accordingly
        // createMobileIntegratedLayout(gameState, gameItems); // Temporarily disabled
    } else {
        panel.classList.add('hidden');
        panel.classList.remove('interactive');
        panel.classList.remove('paused');
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
    
    // Update items list only when needed (event-based updates)
    // Note: updateItemsList will skip updates if no items were collected
    if (itemsListCache.needsUpdate || gameState.showingPauseMenu) {
        updateItemsList(sortedItems);
    }
    
    // Update dedicated dragonstalker progress panel
    updateDragonstalkerProgressPanel(gameState, gameItems);
}

// Create integrated mobile layout
function createMobileIntegratedLayout(gameState, gameItems) {
    // Check if device is mobile portrait
    const isMobilePortrait = (responsiveScaler.deviceType === 'mobile' || window.innerWidth <= 1024) && 
                           window.matchMedia('(orientation: portrait)').matches;
    
    if (!isMobilePortrait) {
        return; // Use standard layout for desktop/landscape
    }
    
    const panel = document.getElementById('itemsCollectionPanel');
    const dragonstalkerPanel = document.getElementById('dragonstalkerProgressPanel');
    
    // Check if we already have the mobile layout (avoid recreating every frame)
    if (panel.querySelector('.mobile-player-info')) {
        // Just update the values, don't recreate HTML
        updateMobileIntegratedValues(gameState, gameItems);
        return;
    }
    
    // Get dragonstalker data
    const dragonstalkerItems = gameItems.filter(item => 
        item.type === 'tier_set'
    );
    const collectedCount = dragonstalkerItems.reduce((sum, item) => sum + item.collected, 0);
    const totalPieces = dragonstalkerItems.length;
    const progressPercent = totalPieces > 0 ? (collectedCount / totalPieces) * 100 : 0;
    
    // Create integrated layout HTML
    const integratedHTML = `
        <div class="panel-header">
            <div class="mobile-player-info">
                <div class="player-name" id="playerNameDisplay">${gameState.playerName || 'Unknown'}</div>
                <div class="player-score" id="playerScoreDisplay">${gameState.score.toLocaleString()}</div>
                <div class="player-level" id="playerLevelDisplay">Level ${(gameState.currentLevel || 0) + 1}</div>
            </div>
            
            <div class="player-health-section">
                <div id="healthBar" class="compact-health-bar">
                    <div class="player-portrait">
                        <img src="assets/efto.png" alt="Player Portrait">
                    </div>
                    <div class="health-bar-container">
                        <div class="health-background">
                            <div class="health-fill" id="healthFill" style="width: ${gameState.player ? (gameState.player.health / gameState.player.maxHealth) * 100 : 100}%"></div>
                        </div>
                        <div class="health-text" id="healthText">${gameState.player ? Math.round(gameState.player.health) : 100}/${gameState.player ? gameState.player.maxHealth : 100}</div>
                    </div>
                </div>
            </div>
            
            <div class="mobile-dragonstalker-progress">
                <div class="mobile-dragonstalker-title">🐉 DRAGONSTALKER</div>
                <div class="mobile-dragonstalker-bar">
                    <div class="mobile-dragonstalker-fill" style="width: ${progressPercent}%"></div>
                    <div class="mobile-dragonstalker-text">${collectedCount}/${totalPieces}</div>
                </div>
            </div>
        </div>
        
        <!-- Compact mobile stats - single column -->
        <div class="player-stats">
            <div class="stat-row">
                <span class="stat-label">Speed:</span>
                <span class="stat-value" id="gameSpeed">1.0x</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Crit:</span>
                <span class="stat-value" id="critRating">10%</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Arrows:</span>
                <span class="stat-value" id="arrowCount">0</span>
            </div>
        </div>
        
        <div class="items-list" id="itemsList" style="display: none;">
            <!-- Items hidden in mobile during gameplay -->
        </div>
        
        <div class="collection-summary" style="display: none;">
            <span id="collectionCount">0 types, 0 total</span>
        </div>
    `;
    
    // Update panel HTML
    panel.innerHTML = integratedHTML;
    
    // Show dragonstalker panel on mobile (side by side layout)
    if (dragonstalkerPanel) {
        dragonstalkerPanel.style.display = 'flex';
    }
    
    // Add hidden elements needed for functionality but not display
    const hiddenElements = `
        <!-- Hidden speed boost row (functionality integrated into main speed display) -->
        <div id="speedBoostRow" style="display: none;">
            <span id="speedBoostValue"></span>
        </div>
        <!-- Hidden dodge stats elements (removed from mobile display as requested) -->
        <div style="display: none;">
            <span id="dodgeRating">0%</span>
            <span id="healthSavedFromDodges">0 HP</span>
            <span id="dodgeAreaExpansion">+0px</span>
        </div>
    `;
    panel.insertAdjacentHTML('beforeend', hiddenElements);
    
    // Update the stats that are still needed but hidden
    updatePlayerStats(gameState);
    
    // Update health bar specifically for integrated layout
    updateHealthBar(gameState);
}

// Update values in existing mobile integrated layout
function updateMobileIntegratedValues(gameState, gameItems) {
    // Update player info
    const playerNameDisplay = document.getElementById('playerNameDisplay');
    const playerScoreDisplay = document.getElementById('playerScoreDisplay');
    const playerLevelDisplay = document.getElementById('playerLevelDisplay');
    
    if (playerNameDisplay) playerNameDisplay.textContent = gameState.playerName || 'Unknown';
    if (playerScoreDisplay) playerScoreDisplay.textContent = gameState.score.toLocaleString();
    if (playerLevelDisplay) playerLevelDisplay.textContent = `Level ${(gameState.currentLevel || 0) + 1}`;
    
    // Update health bar
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');
    
    if (gameState.player && healthFill) {
        const healthPercent = (gameState.player.health / gameState.player.maxHealth) * 100;
        healthFill.style.width = healthPercent + '%';
    }
    
    if (gameState.player && healthText) {
        healthText.textContent = `${Math.round(gameState.player.health)}/${gameState.player.maxHealth}`;
    }
    
    // Update dragonstalker progress
    const dragonstalkerItems = gameItems.filter(item => 
        item.type === 'tier_set'
    );
    const collectedCount = dragonstalkerItems.reduce((sum, item) => sum + item.collected, 0);
    const totalPieces = dragonstalkerItems.length;
    const progressPercent = totalPieces > 0 ? (collectedCount / totalPieces) * 100 : 0;
    
    const dragonstalkerFill = document.querySelector('.mobile-dragonstalker-fill');
    const dragonstalkerText = document.querySelector('.mobile-dragonstalker-text');

    // const dragonstalkerStatus = document.querySelector('.mobile-dragonstalker-status');
    
    if (dragonstalkerFill) dragonstalkerFill.style.width = progressPercent + '%';
    if (dragonstalkerText) dragonstalkerText.textContent = `${collectedCount}/${totalPieces}`;
    // if (dragonstalkerStatus) {
    //     dragonstalkerStatus.textContent = progressPercent === 100 ? 'COMPLETE!' : `Need ${totalPieces - collectedCount} more pieces`;
    // }
    
    // Update hidden stats
    updatePlayerStats(gameState);
}

function updatePlayerStats(gameState) {
    // Update main header elements
    const playerNameDisplay = document.getElementById('playerNameDisplay');
    const playerScoreDisplay = document.getElementById('playerScoreDisplay');
    const playerLevelDisplay = document.getElementById('playerLevelDisplay');
    const gameSpeed = document.getElementById('gameSpeed');
    const speedBoostRow = document.getElementById('speedBoostRow');
    const speedBoostValue = document.getElementById('speedBoostValue');
    // Removed actualItemSpeed and actualProjectileSpeed - not needed
    const critRating = document.getElementById('critRating');
    const dodgeRating = document.getElementById('dodgeRating');
    
    // Update player name
    if (playerNameDisplay) {
        // Check if device is mobile using ResponsiveScaler
        const isMobile = responsiveScaler.deviceType === 'mobile';
        const nameText = isMobile ? 
            gameState.playerName || 'Unknown' : 
            `Player: ${gameState.playerName || 'Unknown'}`;
        playerNameDisplay.textContent = nameText;
    }
    
    // Update score with formatting (large and prominent)
    if (playerScoreDisplay) {
        playerScoreDisplay.textContent = gameState.score.toLocaleString();
    }
    
    // Update level (add 1 to 0-based internal level for 1-based UI display)
    if (playerLevelDisplay) {
        playerLevelDisplay.textContent = `Level ${(gameState.currentLevel || 0) + 1}`;
    }
    
    // Update health bar in player section
    const playerHealthFill = document.getElementById('playerHealthFill');
    const playerHealthText = document.getElementById('playerHealthText');
    
    if (playerHealthFill && playerHealthText && gameState.health !== undefined && gameState.maxHealth !== undefined) {
        const healthPercentage = Math.max(0, gameState.health / gameState.maxHealth);
        const healthPercent = Math.ceil(healthPercentage * 100);
        
        // Update health fill width and color
        playerHealthFill.style.width = `${healthPercentage * 100}%`;
        
        // Update health fill color based on health level
        playerHealthFill.className = 'player-health-fill';
        if (healthPercentage <= 0.25) {
            playerHealthFill.style.background = 'linear-gradient(90deg, #ff0000, #ff3333)'; // Red for low
        } else if (healthPercentage <= 0.6) {
            playerHealthFill.style.background = 'linear-gradient(90deg, #ff8800, #ffaa00)'; // Orange for medium
        } else {
            playerHealthFill.style.background = 'linear-gradient(90deg, #00ff00, #44ff44)'; // Green for high
        }
        
        // Update health text
        playerHealthText.textContent = `${Math.round(gameState.health)}/${gameState.maxHealth}`;
    }
    
    // Calculate and update effective game speed (in stats section)
    if (gameSpeed) {
        // levelSpeedMultiplier already includes Dragonstalker reductions, but not cut_time reductions
        const baseSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - (gameState.permanentSpeedReduction || 0));
        let speedText = `${baseSpeed.toFixed(1)}x`;
        
        // Add speed boost inline if active (mobile compact view)
        if (gameState.speedIncreaseActive && gameState.currentSpeedIncreasePercent > 0) {
            speedText += ` (+${gameState.currentSpeedIncreasePercent}%🔥)`;
        }
        
        // Show Dragonstalker completion reduction if any (already included in levelSpeedMultiplier)
        if (gameState.permanentSpeedReductionFromSets > 0) {
            speedText += ` (-${gameState.permanentSpeedReductionFromSets.toFixed(1)}x DS)`;
        }
        
        // Show cut_time reduction if any
        if (gameState.permanentSpeedReduction && gameState.permanentSpeedReduction > 0) {
            speedText += ` (-${gameState.permanentSpeedReduction.toFixed(1)}x CT)`;
        }
        
        gameSpeed.textContent = speedText;
        
        // Add level progress info for hybrid progression
        // if (gameConfig.levels.progressionType === "hybrid" || gameConfig.levels.progressionType === "time") {
        //     const progress = getLevelProgress(gameState);
        //     const timeRemaining = Math.ceil(progress.timeRemaining);
        //     const minutes = Math.floor(timeRemaining / 60);
        //     const seconds = timeRemaining % 60;
        //     const timeStr = minutes > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : `${seconds}s`;
            
        //     // Show activity bonuses/penalties
        //     const activity = progress.activity || {};
        //     let activityStr = '';
        //     if (activity.collections > 0 || activity.misses > 0 || activity.powerUpsCollected > 0 || activity.damageReceived > 0) {
        //         const bonuses = [];
        //         if (activity.collections > 0) bonuses.push(`📦${activity.collections}`);
        //         if (activity.powerUpsCollected > 0) bonuses.push(`⚡${activity.powerUpsCollected}`);
        //         if (activity.misses > 0) bonuses.push(`❌${activity.misses}`);
        //         if (activity.damageReceived > 0) bonuses.push(`💔${Math.round(activity.damageReceived)}`);
        //         activityStr = ` (${bonuses.join(' ')})`;
        //     }
            
        //     speedText += ` | Next: ${timeStr}${activityStr}`;
        //     gameSpeed.textContent = speedText;
        // }
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
    
    // Removed actual speed calculations - not needed
    
    // Update crit rating display
    if (critRating) {
        const temporaryStatEffects = getTemporaryStatEffects();
        const baseCritPercent = Math.round(gameState.baseCritRating * 100);
        const permanentCritPercent = Math.round(gameState.critRating * 100);
        const spellCritBonus = spellSystem.getCritRatingBonus();
        const spellCritBonusPercent = Math.round(spellCritBonus * 100);
        
        // Get temporary item crit bonuses
        let tempItemCritBonus = 0;
        temporaryStatEffects.critRatingEffects.forEach(effect => {
            tempItemCritBonus += effect.bonus;
        });
        const tempItemCritBonusPercent = Math.round(tempItemCritBonus * 100);
        
        const totalCritRating = Math.min(gameState.critRating + spellCritBonus + tempItemCritBonus, gameState.critRatingCap);
        const totalCritPercent = Math.round(totalCritRating * 100);
        const maxCritPercent = Math.round(gameState.critRatingCap * 100);
        
        // Determine display based on bonuses
        const hasPermanentBonus = gameState.critRating > gameState.baseCritRating;
        const hasSpellBonus = spellCritBonus > 0;
        const hasTempItemBonus = tempItemCritBonus > 0;
        
        if (hasSpellBonus || hasTempItemBonus) {
            // Show total with active bonuses highlighted
            const bonuses = [];
            
            if (hasPermanentBonus) {
                const permanentBonusPercent = permanentCritPercent - baseCritPercent;
                bonuses.push(`+${permanentBonusPercent}%`);
            }
            if (hasTempItemBonus) {
                bonuses.push(`+${tempItemCritBonusPercent}%🔥`); // Fire emoji for temporary item bonuses
            }
            if (hasSpellBonus) {
                bonuses.push(`+${spellCritBonusPercent}%🐲`); // Dragon emoji for spell bonuses
            }
            
            critRating.textContent = `${totalCritPercent}% (${bonuses.join(' ')})`;
            critRating.style.color = hasTempItemBonus ? '#FFD700' : '#FF4500'; // Gold for temp items, orange for spells
            critRating.style.fontWeight = 'bold';
            critRating.style.textShadow = hasTempItemBonus ? '0 0 6px #FFD700' : '0 0 6px #FF4500';
            
            // Add special glow if at max
            if (totalCritRating >= gameState.critRatingCap) {
                critRating.style.textShadow = '0 0 10px #FFD700';
                critRating.textContent = critRating.textContent.replace(')', ' MAX!)');
            }
        } else if (hasPermanentBonus) {
            // Show permanent bonus only
            const bonusPercent = permanentCritPercent - baseCritPercent;
            critRating.textContent = `${permanentCritPercent}% (+${bonusPercent}%)`;
            critRating.style.color = '#FF6B00'; // Orange for enhanced
            critRating.style.fontWeight = 'bold';
            
            // Add glow effect if at max
            if (gameState.critRating >= gameState.critRatingCap) {
                critRating.style.textShadow = '0 0 8px #FF6B00';
                critRating.textContent = `${permanentCritPercent}% (MAX!)`;
            } else {
                critRating.style.textShadow = 'none';
            }
        } else {
            // Base crit rating
            critRating.textContent = `${baseCritPercent}%`;
            critRating.style.color = '#FFD700'; // Gold for base
            critRating.style.fontWeight = 'normal';
            critRating.style.textShadow = 'none';
        }
    }
    
    // Update dodge rating display
    if (dodgeRating) {
        const temporaryStatEffects = getTemporaryStatEffects();
        const baseDodgePercent = Math.round(gameState.baseDodgeRating * 100);
        const permanentDodgePercent = Math.round(gameState.dodgeRating * 100);
        const spellDodgeBonus = spellSystem.getDodgeRatingBonus ? spellSystem.getDodgeRatingBonus() : 0;
        const spellDodgeBonusPercent = Math.round(spellDodgeBonus * 100);
        const tempDodgeBonus = gameState.temporaryDodgeBoost || 0;
        const tempDodgeBonusPercent = Math.round(tempDodgeBonus * 100);
        
        // Get temporary item dodge bonuses
        let tempItemDodgeBonus = 0;
        temporaryStatEffects.dodgeRatingEffects.forEach(effect => {
            tempItemDodgeBonus += effect.bonus;
        });
        const tempItemDodgeBonusPercent = Math.round(tempItemDodgeBonus * 100);
        
        const totalDodgeRating = Math.min(gameState.dodgeRating + spellDodgeBonus + tempDodgeBonus + tempItemDodgeBonus, gameState.dodgeRatingCap);
        const totalDodgePercent = Math.round(totalDodgeRating * 100);
        const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
        
        // Determine display based on bonuses
        const hasPermanentBonus = gameState.dodgeRating > gameState.baseDodgeRating;
        const hasSpellBonus = spellDodgeBonus > 0;
        const hasTempBonus = tempDodgeBonus > 0;
        const hasTempItemBonus = tempItemDodgeBonus > 0;
        
        // Build display text
        let displayText = '';
        let displayColor = '#CCCCCC';
        let fontWeight = 'normal';
        let textShadow = 'none';
        
        if (hasSpellBonus || hasTempBonus || hasTempItemBonus) {
            // Show total with active bonuses highlighted
            displayText = `${totalDodgePercent}%`;
            const bonuses = [];
            
            if (hasPermanentBonus) {
                const permanentBonusPercent = permanentDodgePercent - baseDodgePercent;
                bonuses.push(`+${permanentBonusPercent}%`);
            }
            if (hasTempItemBonus) {
                bonuses.push(`+${tempItemDodgeBonusPercent}%🔥`); // Fire emoji for temporary item bonuses
            }
            if (hasSpellBonus) {
                bonuses.push(`+${spellDodgeBonusPercent}%🐲`);
            }
            if (hasTempBonus) {
                bonuses.push(`+${tempDodgeBonusPercent}%💨`);
            }
            
            if (bonuses.length > 0) {
                displayText += ` (${bonuses.join(' ')})`;
            }
            
            // Prioritize temp item bonus, then temp boost, then spell, then permanent
            if (hasTempItemBonus) {
                displayColor = '#87CEEB'; // Sky blue for temp item bonuses
                textShadow = '0 0 6px #87CEEB';
            } else if (hasTempBonus) {
                displayColor = '#00FF00'; // Green for temp boost
                textShadow = '0 0 6px #00FF00';
            } else if (hasSpellBonus) {
                displayColor = '#00BFFF'; // Cyan blue for spell bonus
                textShadow = '0 0 6px #00BFFF';
            } else {
                displayColor = '#00FF00'; // Green for permanent
            }
            
            fontWeight = 'bold';
            
            // Add special glow if at max
            if (totalDodgeRating >= gameState.dodgeRatingCap) {
                textShadow = '0 0 10px ' + displayColor;
                displayText = displayText.replace(')', ' MAX!)');
            }
        } else if (hasPermanentBonus) {
            // Show permanent bonus only
            const bonusPercent = permanentDodgePercent - baseDodgePercent;
            displayText = `${permanentDodgePercent}% (+${bonusPercent}%)`;
            displayColor = '#00FF00'; // Green for enhanced
            fontWeight = 'bold';
            
            // Add glow effect if at max
            if (gameState.dodgeRating >= gameState.dodgeRatingCap) {
                textShadow = '0 0 8px #00FF00';
                displayText = `${permanentDodgePercent}% (MAX!)`;
            }
        } else {
            // Base dodge rating (usually 0%)
            displayText = `${baseDodgePercent}%`;
            displayColor = '#CCCCCC'; // Gray for base (since it's 0%)
        }
        
        dodgeRating.textContent = displayText;
        dodgeRating.style.color = displayColor;
        dodgeRating.style.fontWeight = fontWeight;
        dodgeRating.style.textShadow = textShadow;
    }
    
    // Update dodge statistics display (removed totalDodges - not needed)
    const healthSavedElement = document.getElementById('healthSavedFromDodges');
    
    if (healthSavedElement) {
        healthSavedElement.textContent = `${Math.round(gameState.healthSavedFromDodges)} HP`;
        // Color code based on health saved
        if (gameState.healthSavedFromDodges === 0) {
            healthSavedElement.style.color = '#CCCCCC'; // Gray for no health saved
        } else if (gameState.healthSavedFromDodges < 20) {
            healthSavedElement.style.color = '#FFD700'; // Gold for some health saved
        } else {
            healthSavedElement.style.color = '#00FF00'; // Green for significant health saved
        }
    }
    
    // Update dodge area expansion display
    const dodgeAreaElement = document.getElementById('dodgeAreaExpansion');
    if (dodgeAreaElement) {
        const expansion = gameState.dodgeAreaExpansion || 0;
        dodgeAreaElement.textContent = `+${Math.round(expansion)}px`;
        // Color code based on area expansion
        if (expansion === 0) {
            dodgeAreaElement.style.color = '#CCCCCC'; // Gray for no expansion
        } else if (expansion < 50) {
            dodgeAreaElement.style.color = '#FFD700'; // Gold for some expansion
        } else {
            dodgeAreaElement.style.color = '#00FF88'; // Bright green for significant expansion
        }
    }
    
    // Update arrow count display
    const arrowCountElement = document.getElementById('arrowCount');
    if (arrowCountElement) {
        arrowCountElement.textContent = (gameState.arrowCount || 0).toString();
        // Color code based on arrow count
        if ((gameState.arrowCount || 0) === 0) {
            arrowCountElement.style.color = '#CCCCCC'; // Gray for no arrows
        } else if (gameState.arrowCount < 100) {
            arrowCountElement.style.color = '#FFD700'; // Gold for some arrows
        } else {
            arrowCountElement.style.color = '#00FF00'; // Green for many arrows
        }
    }
}

function updateItemsList(sortedItems) {
    const itemsList = document.getElementById('itemsList');
    const overflowIndicator = document.getElementById('overflowIndicator');
    const overflowText = document.getElementById('overflowText');
    
    if (!itemsList) return;
    
    // Check if update is actually needed
    if (!itemsListCache.needsUpdate) {
        return; // Skip update if nothing changed
    }
    
    // Calculate current stats
    const filteredItems = sortedItems.filter(item => 
        item.type === 'epic' || 
        item.type === 'legendary' || 
        item.type === 'zee_zgnan' || 
        item.type === 'tier_set'
    );
    const currentTotalCount = filteredItems.reduce((sum, item) => sum + item.collected, 0);
    const currentUniqueCount = filteredItems.filter(item => item.collected > 0).length;
    
    // Check if we actually need to update
    let hasChanges = false;
    
    // Check if overall counts changed
    if (currentTotalCount !== itemsListCache.lastTotalCount || 
        currentUniqueCount !== itemsListCache.lastUniqueCount) {
        hasChanges = true;
    }
    
    // Check if individual item counts changed
    if (!hasChanges) {
        for (const item of filteredItems) {
            const lastCount = itemsListCache.lastItemCounts.get(item.id) || 0;
            if (item.collected !== lastCount) {
                hasChanges = true;
                break;
            }
        }
    }
    
    // If nothing actually changed, skip the update
    if (!hasChanges && !itemsListCache.needsUpdate) {
        return;
    }
    
    // Update cache
    itemsListCache.lastTotalCount = currentTotalCount;
    itemsListCache.lastUniqueCount = currentUniqueCount;
    for (const item of filteredItems) {
        itemsListCache.lastItemCounts.set(item.id, item.collected);
    }
    itemsListCache.needsUpdate = false;
    
    // Debug: console.log(`🔄 Items list updated: ${currentUniqueCount} unique, ${currentTotalCount} total`);
    
    // Clear existing items
    itemsList.innerHTML = '';
    
    // Check if compact mobile view is active
    const isCompactView = responsiveScaler.deviceType === 'mobile' || 
                         window.innerWidth <= 768 || 
                         document.body.classList.contains('force-mobile-panels');
    
    const maxVisibleItems = isCompactView ? 15 : 20; // Fewer items on mobile
    const visibleItems = filteredItems.slice(0, maxVisibleItems);
    const hiddenItems = filteredItems.slice(maxVisibleItems);
    
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
        
        // Mention that lower rarity items are hidden
        let overflowMessage = `... +${hiddenCount} more items (${hiddenPoints} pts)`;
        if (sortedItems.length > filteredItems.length) {
            const hiddenLowRarity = sortedItems.length - filteredItems.length;
            overflowMessage = `... +${hiddenCount} more, ${hiddenLowRarity} low-rarity hidden (${hiddenPoints} pts)`;
        }
        
        overflowText.textContent = overflowMessage;
        overflowIndicator.classList.remove('hidden');
    } else if (overflowIndicator) {
        overflowIndicator.classList.add('hidden');
    }
}

// Cache for tracking changes to avoid unnecessary DOM updates
let dragonstalkerCache = {
    lastUpdate: 0,
    lastCollectedCount: -1,
    lastCompletionCount: -1,
    lastGameWon: false,
    itemStates: new Map() // Track individual item states
};

// Reset the dragonstalker cache (call when starting new game)
function resetDragonstalkerCache() {
    dragonstalkerCache.lastUpdate = 0;
    dragonstalkerCache.lastCollectedCount = -1;
    dragonstalkerCache.lastCompletionCount = -1;
    dragonstalkerCache.lastGameWon = false;
    dragonstalkerCache.itemStates.clear();
}

// Cache for tracking items list changes to avoid unnecessary DOM updates
let itemsListCache = {
    lastItemCounts: new Map(), // Track collected count for each item
    lastTotalCount: 0,
    lastUniqueCount: 0,
    needsUpdate: true // Force initial update
};

// Reset the items list cache (call when starting new game)
function resetItemsListCache() {
    itemsListCache.lastItemCounts.clear();
    itemsListCache.lastTotalCount = 0;
    itemsListCache.lastUniqueCount = 0;
    itemsListCache.needsUpdate = true;
}

// Trigger items list update when an item is collected
function onItemCollected(itemData) {
    // Mark that we need to update the items list
    itemsListCache.needsUpdate = true;
}

// Update dedicated Dragonstalker progress panel
function updateDragonstalkerProgressPanel(gameState, gameItems) {
    const panel = document.getElementById('dragonstalkerProgressPanel');
    if (!panel) return;
    
    // Get Dragonstalker items
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // Check if anything actually changed
    const currentTime = Date.now();
    const hasCollectionChanged = uniquePiecesCollected !== dragonstalkerCache.lastCollectedCount;
    const hasCompletionChanged = gameState.dragonstalkerCompletions !== dragonstalkerCache.lastCompletionCount;
    const hasGameStateChanged = gameState.gameWon !== dragonstalkerCache.lastGameWon;
    
    // Throttle updates - only update every 1 second unless something important changed
    const timeSinceLastUpdate = currentTime - dragonstalkerCache.lastUpdate;
    const shouldForceUpdate = hasCollectionChanged || hasCompletionChanged || hasGameStateChanged;
    
    if (!shouldForceUpdate && timeSinceLastUpdate < 1000) {
        return; // Skip update if nothing changed and throttle time hasn't passed
    }
    
    dragonstalkerCache.lastUpdate = currentTime;
    dragonstalkerCache.lastCollectedCount = uniquePiecesCollected;
    dragonstalkerCache.lastCompletionCount = gameState.dragonstalkerCompletions;
    dragonstalkerCache.lastGameWon = gameState.gameWon;
    

    
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
    
    // Update panel styling based on status without wiping responsive/settings classes.
    panel.classList.toggle('victory', Boolean(gameState.gameWon));
    
    // Update progress bar
    const progressFill = document.getElementById('dragonstalkerProgressFill');
    const progressText = document.getElementById('dragonstalkerProgressText');
    if (progressFill && progressText) {
        const progressPercent = (uniquePiecesCollected / 10) * 100;
        progressFill.style.width = `${progressPercent}%`;
        
        // Check if mobile for compact formatting
        const isMobile = responsiveScaler.deviceType === 'mobile';
        
        let progressString;
        if (isMobile) {
            // Compact format for mobile: "3/10" or "3/10 (2 SETS)"
            progressString = `${uniquePiecesCollected}/10`;
            if (gameState.dragonstalkerCompletions > 0) {
                progressString += ` (${gameState.dragonstalkerCompletions})`;
            }
        } else {
            // Full format for desktop
            progressString = `${uniquePiecesCollected}/10 PIECES`;
            if (gameState.dragonstalkerCompletions > 0) {
                progressString += ` | ${gameState.dragonstalkerCompletions} SET${gameState.dragonstalkerCompletions > 1 ? 'S' : ''} COMPLETE`;
            }
        }
        
        progressText.textContent = progressString;
        
        if (gameState.gameWon) {
            progressFill.classList.add('victory');
        }
    }
    
    // Update status message
    // const statusElement = document.getElementById('dragonstalkerStatus');
    // if (statusElement) {
    //     statusElement.className = 'dragonstalker-status';
    //     if (gameState.gameWon) {
    //         if (zeeZgnanCollected) {
    //             statusElement.textContent = '🎯 ZEE ZGNAN VICTORY! 🎯';
    //             statusElement.classList.add('victory');
    //         } else {
    //             statusElement.textContent = '🏆 SET COMPLETE! 🏆';
    //             statusElement.classList.add('victory');
    //         }
    //     } else if (uniquePiecesCollected >= 8) {
    //         statusElement.textContent = '🏆 ALMOST THERE! 🏆';
    //     } else {
    //         statusElement.textContent = `Need ${10 - uniquePiecesCollected} more pieces`;
    //     }
        
    //     // Add speed reduction info if any completions
    //     if (gameState.permanentSpeedReductionFromSets > 0) {
    //         statusElement.textContent += ` | Speed Reduction: -${gameState.permanentSpeedReductionFromSets.toFixed(1)}x`;
    //     }
    // }
    
    // Update items list
    const itemsList = document.getElementById('dragonstalkerItemsList');
    if (itemsList) {
        // Get all tier set items dynamically and sort by setPosition
        const sortedDragonstalkerItems = [...dragonstalkerItems].sort((a, b) => {
            const aPos = a.setPosition || 999; // Put items without setPosition at the end
            const bPos = b.setPosition || 999;
            return aPos - bPos;
        });
        
        // Check if we need to rebuild the list (first time or after game restart)
        if (itemsList.children.length !== sortedDragonstalkerItems.length) {
            itemsList.innerHTML = '';
            
            // Create all items initially
            sortedDragonstalkerItems.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dragonstalker-item';
                itemDiv.setAttribute('data-item-id', item.id);
                itemsList.appendChild(itemDiv);
                
                // Initialize cache for this item
                dragonstalkerCache.itemStates.set(item.id, {
                    collected: -1,
                    missed: -1,
                    status: '',
                    displayName: ''
                });
            });
        }
        
        // Update only items that have changed
        sortedDragonstalkerItems.forEach(item => {
            const itemDiv = itemsList.querySelector(`[data-item-id="${item.id}"]`);
            if (!itemDiv) return;
            
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
            
            // Check what layout we need
            const isCompactView = responsiveScaler.deviceType === 'mobile' || 
                                 window.innerWidth <= 1024 || 
                                 document.body.classList.contains('force-mobile-panels');
            
            let displayName = item.name;
            if (isCompactView) {
                displayName = getShortenedDragonstalkerName(item.id, item.name);
            }
            
            // Get cached state for this item (provide default if not found)
            const cachedState = dragonstalkerCache.itemStates.get(item.id) || {
                collected: -1,
                missed: -1,
                status: '',
                displayName: ''
            };
            
            // Check if anything changed
            const collectedChanged = cachedState.collected !== item.collected;
            const missedChanged = cachedState.missed !== item.missed;
            const statusChanged = cachedState.status !== status;
            const nameChanged = cachedState.displayName !== displayName;
            
            // Only update if something actually changed or if this is initial load
            if (collectedChanged || missedChanged || statusChanged || nameChanged || !itemDiv.innerHTML) {
                const itemIcon = getDragonstalkerItemIconData(item);
                itemDiv.className = `dragonstalker-item ${statusClass}`;
                
                // Create layouts for mobile vs desktop (both show icons now)
                if (isCompactView) {
                    // Mobile: Compact layout with icon and status overlay
                    itemDiv.innerHTML = `
                        <div class="dragonstalker-item-icon">
                            <img src="${itemIcon.src}" alt="${itemIcon.alt}" title="${itemIcon.alt}">
                        </div>
                        <div class="dragonstalker-item-status ${statusClass}">${status}</div>
                        <div class="dragonstalker-item-name ${nameClass}">${displayName}</div>
                    `;
                } else {
                    // Desktop: Traditional layout with icons
                    itemDiv.innerHTML = `
                        <div class="dragonstalker-item-icon">
                            <img src="${itemIcon.src}" alt="${itemIcon.alt}" title="${itemIcon.alt}">
                        </div>
                        <div class="dragonstalker-item-status ${statusClass}">${status}</div>
                        <div class="dragonstalker-item-name ${nameClass}">${displayName}</div>
                    `;
                }
                
                // Update cache
                dragonstalkerCache.itemStates.set(item.id, {
                    collected: item.collected,
                    missed: item.missed,
                    status: status,
                    displayName: displayName
                });
            }
        });
    }
}

// ===== GAME END FUNCTIONS =====

// End game function
function endGame() {
    gameState.gameRunning = false;
    
    // Save the high score with enhanced stats
    try {
        const finalCritRating = getCurrentTotalCritRating();
        const finalDodgeRating = getCurrentTotalDodgeRating();
        
        const scorePromise = addHighScore(
            gameState.playerName, 
            gameState.score, 
            gameState.perfectCollections, 
            gameState.currentLevel,
            0, // gameTime (placeholder)
            gameState.dragonstalkerCompletions,
            finalCritRating,
            finalDodgeRating
        );
        
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
    
    // Show pause menu container and hide pause content to display game over screen
    document.getElementById('pauseMenu').style.display = 'flex';
    document.getElementById('pauseMenuContent').style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';
    
    // Update menu buttons since game is now over
    updateMenuButtons();
    
    // Hide mobile pause button when game ends
    updateMobilePauseButtonVisibility();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Win game function
function winGame() {
    gameState.gameWon = true;
    gameState.gameRunning = false;
    
    // Save the high score with special win marker and enhanced stats
    try {
        const finalCritRating = getCurrentTotalCritRating();
        const finalDodgeRating = getCurrentTotalDodgeRating();
        
        const scorePromise = addHighScore(
            gameState.playerName + " 👑", 
            gameState.score, 
            gameState.perfectCollections, 
            gameState.currentLevel,
            0, // gameTime (placeholder)
            gameState.dragonstalkerCompletions,
            finalCritRating,
            finalDodgeRating
        );
        
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
    
    // Show pause menu container and hide pause content to display game over screen
    document.getElementById('pauseMenu').style.display = 'flex';
    document.getElementById('pauseMenuContent').style.display = 'none';
    document.getElementById('gameOver').style.display = 'block';
    
    // Update menu buttons since game is now over
    updateMenuButtons();
    
    // Hide mobile pause button when game ends
    updateMobilePauseButtonVisibility();
    
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

// Make global functions available for HTML onclick handlers
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.showMainMenu = showMainMenu;
window.resetSettings = resetSettingsUI;

// Debug function for checking display quality
window.checkDisplayQuality = function() {
    if (window.assetManager) {
        const assessment = window.assetManager.getQualityAssessment();
        if (assessment) {
            console.log(`🖼️ Current Display Quality Assessment:
                Overall Quality: ${assessment.overallQuality}
                Display Scale: ${assessment.displayScale.toFixed(2)}x
                Average Original Image Size: ${assessment.averageOriginalSize}px
                Recommendation: ${assessment.recommendation}
                
                Window Size: ${window.innerWidth}x${window.innerHeight}
                Responsive Scale: ${responsiveScaler.uniformScale.toFixed(2)}x
                Device Type: ${responsiveScaler.deviceType}`);
        } else {
            console.log('🖼️ Display quality assessment not available yet');
        }
    } else {
        console.log('🖼️ AssetManager not available');
    }
};

console.log('💡 Type checkDisplayQuality() in console to check your current display quality');

// High-DPI canvas setup function with device-specific dimensions and playable-area scaling
function setupHighDPICanvas() {
    setupHighDPICanvasSystem({
        canvas,
        ctx,
        responsiveScaler,
        refreshPanelStyles
    });
}

// Make buff functions globally available for other modules
window.addBuff = addBuff;
window.removeBuff = removeBuff;
window.clearAllBuffs = clearAllBuffs;

// ===== CONFIGURABLE STAT BONUS SYSTEM =====
// Thin wrappers keep existing call sites stable while the logic lives in statEffectsSystem.
function shouldCrit() {
    return calculateShouldCrit(gameState);
}

function shouldDodge() {
    return calculateShouldDodge(gameState, spellSystem);
}

function showDodgeText(x, y) {
    createDodgeText(x, y, combatTexts);
}

function trackDodge(healthSaved = 0) {
    recordDodge(gameState, healthSaved);
}

function applyItemStatBonuses(itemData) {
    applyItemStatBonusesToState(itemData, gameState);
}

function updateTemporaryStatEffects(deltaTimeMultiplier) {
    updateTemporaryStatEffectsState(deltaTimeMultiplier, gameState, updateItemBonusesWindow);
}

function getCurrentTotalCritRating() {
    return calculateCurrentTotalCritRating(gameState);
}

function getCurrentTotalDodgeRating() {
    return calculateCurrentTotalDodgeRating(gameState);
}

// === BULLET TIME SYSTEM ===
function updateBulletTime(deltaTimeMultiplier) {
    updateBulletTimeState(gameState, deltaTimeMultiplier);
}

function renderBulletTimeEffects() {
    renderBulletTimeVisuals(ctx, canvas, gameState);
}