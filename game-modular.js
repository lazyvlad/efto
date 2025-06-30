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
import { CombatText } from './classes/CombatText.js';
import { Arrow } from './classes/Arrow.js';

import { tryAutoInitAudio, startBackgroundMusic, playUffSound, playScreamSound, playTotalSound, playFireballImpactSound, playDragonstalkerSound, playThunderSound, playItemSound, audioInitialized, sounds } from './systems/audioSystem.js';
import { initializeSettings, loadSettings, saveSettings, resetSettings, getSettings, updateSetting, areSoundEffectsEnabled, isBackgroundMusicEnabled, getVolume, getVolumeDecimal, getMasterVolume, getMusicVolume, getEffectsVolume, getMasterVolumeDecimal, getMusicVolumeDecimal, getEffectsVolumeDecimal, getGameMode, getPlayerPanelStyle, getDragonstalkerPanelStyle, getPanelOpacity, refreshPanelStyles } from './systems/settingsSystem.js';
import { loadHighScores, addHighScore, isHighScore, displayHighScores, displayHighScoresSync } from './systems/highScoreSystem.js';
import { initializeInputSystem, updatePlayerPosition, resetInputState } from './systems/inputSystem.js';
// drawSettings removed - now using HTML+CSS guide

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateDeltaTimeMultiplier, calculateUniversalMultiplier, updateGameStateTimers, addNotification, updateNotifications, responsiveScaler, trackActivity, getLevelProgress, checkDragonstalkerCompletion, checkGameVersion, clearGameCache } from './utils/gameUtils.js';
import { selectRandomItem, selectRandomProjectile, selectRandomPowerUp, shouldSpawnPowerUp, createCollectionParticles, createImpactParticles, createShadowParticles, calculateProjectileProbability } from './utils/spawning.js';
import { spellSystem } from './systems/spellSystem.js';
import { notificationSystem } from './systems/notificationSystem.js';
import { assetManager } from './utils/AssetManager.js';
import { getAssetsByLevel, assetRegistry } from './data/assetRegistry.js';

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
    critRatingCap: 0.25, // 25% maximum crit chance
    
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
                        (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.height :
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
        'highScoresScreen',
        'settingsScreen',
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
    
    // Check collisions
    checkCollisions();
    
    // Check end conditions
    checkGameEndConditions();
    
    // Update notifications
    updateNotifications(gameState);
}

// Render everything
function render() {
    // Ensure consistent image smoothing quality for rotation
    if (canvas.setupImageSmoothing) {
        canvas.setupImageSmoothing();
    }
    
    // Clear canvas using logical dimensions
    ctx.clearRect(0, 0, canvas.logicalWidth, canvas.logicalHeight);
    
    if (gameState.gameRunning) {
        renderGame();
    } else if (gameState.gameWon) {
        renderVictory();
    } else if (gameState.health <= 0) {
        renderGameOver();
    } else {
        // renderHighScores();
    }
}

// Simple implementations for now - these would be expanded

function renderGame() {
    // Draw movable area border if enabled (now responsive)
    const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
    if (movableAreaConfig.enabled && movableAreaConfig.showBorder) {
        const baseMovableHeight = canvas.logicalHeight * movableAreaConfig.heightPercent;
        const dodgeExpansion = gameState.dodgeAreaExpansion || 0;
        const totalMovableHeight = baseMovableHeight + dodgeExpansion;
        
        const baseBorderY = canvas.logicalHeight - baseMovableHeight;
        const expandedBorderY = canvas.logicalHeight - totalMovableHeight;
        
        ctx.save();
        
        // Draw base movable area border (normal color)
        ctx.strokeStyle = movableAreaConfig.borderColor;
        ctx.globalAlpha = movableAreaConfig.borderOpacity;
        ctx.lineWidth = movableAreaConfig.borderWidth;
        
        ctx.beginPath();
        ctx.moveTo(0, baseBorderY);
        ctx.lineTo(canvas.logicalWidth, baseBorderY);
        ctx.stroke();
        
        // Draw dodge-expanded area if present
        if (dodgeExpansion > 0) {
            // Fill the dodge area with a subtle background
            ctx.fillStyle = '#00FF88';
            ctx.globalAlpha = 0.1;
            ctx.fillRect(0, expandedBorderY, canvas.logicalWidth, dodgeExpansion);
            
            // Draw dodge area border (bright green)
            ctx.strokeStyle = '#00FF88';
            ctx.globalAlpha = 0.8;
            ctx.lineWidth = movableAreaConfig.borderWidth + 1;
            
            ctx.beginPath();
            ctx.moveTo(0, expandedBorderY);
            ctx.lineTo(canvas.logicalWidth, expandedBorderY);
            ctx.stroke();
            
            // Add dodge label
            ctx.fillStyle = '#00FF88';
            ctx.globalAlpha = 1.0;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(`💨 Dodge Area: +${Math.round(dodgeExpansion)}px`, 10, expandedBorderY - 5);
        }
        
        // Draw side borders for both areas
        ctx.strokeStyle = movableAreaConfig.borderColor;
        ctx.globalAlpha = movableAreaConfig.borderOpacity;
        ctx.lineWidth = movableAreaConfig.borderWidth;
        
        ctx.beginPath();
        ctx.moveTo(0, expandedBorderY);
        ctx.lineTo(0, canvas.logicalHeight);
        ctx.moveTo(canvas.logicalWidth, expandedBorderY);
        ctx.lineTo(canvas.logicalWidth, canvas.logicalHeight);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Render game elements
    particles.forEach(particle => particle.draw(ctx));
    fallingItems.forEach(item => item.draw(ctx, gameConfig));
    fireballs.forEach(projectile => projectile.draw(ctx));
    powerUps.forEach(powerUp => powerUp.draw(ctx));
    window.arrows.forEach(arrow => arrow.draw(ctx));
    combatTexts.forEach(text => text.draw(ctx));
    player.draw(ctx, gameState.shieldActive);
    
    // Power-up status now handled by HTML+CSS persistent notifications
    
    // Update DOM-based items panel (throttled for performance)
    // Only update every 10 frames to reduce DOM manipulation overhead
    if (!gameState.domUpdateCounter) gameState.domUpdateCounter = 0;
    gameState.domUpdateCounter++;
    if (gameState.domUpdateCounter % 10 === 0) {
        updateDOMItemsPanel(gameState, gameItems);
    }
    
    // Render bullet time visual effects
    renderBulletTimeEffects();
    
    // Notifications now handled by HTML+CSS notification system
    
    // Health bar now rendered via HTML/CSS
    
    // Old speed panel removed - replaced by superior Speed Analysis Monitor
    
    // Spell UI now rendered via HTML/CSS
}

function renderGameOver() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.logicalWidth/2, canvas.logicalHeight/2 - 50);
    
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.logicalWidth/2, canvas.logicalHeight/2 + 20);

}

function renderVictory() {
    ctx.fillStyle = 'gold';
    ctx.textAlign = 'center';
    ctx.font = '24px Arial';
    ctx.fillText(`Score: ${gameState.score}`, canvas.logicalWidth/2, canvas.logicalHeight/2 + 20);

}

// function renderHighScores() {
//     ctx.fillStyle = 'white';
//     ctx.font = '36px Arial';
//     ctx.textAlign = 'center';
//     ctx.fillText('HIGH SCORES', canvas.logicalWidth/2, 100);
    
//     ctx.font = '16px Arial';

// }



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
    
    console.log('Game started');
}

function restartGame() {
    // Reset caches for performance
    resetDragonstalkerCache();
    resetItemsListCache();
    
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
            
            // Trigger items list update
            onItemCollected(otherItem.itemData);
            
            // Apply spell point multipliers
            const pointMultiplier = spellSystem.getPointMultiplier();
            const basePoints = otherItem.itemData.value;
            let finalPoints = Math.round(basePoints * pointMultiplier);
            
            // Check for critical hit (include spell crit rating bonus)
            const critRoll = Math.random();
            const spellCritBonus = spellSystem.getCritRatingBonus();
            const totalCritRating = Math.min(gameState.critRating + spellCritBonus, gameState.critRatingCap);
            const isCrit = critRoll < totalCritRating;
            
            if (isCrit) {
                finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                
                // Create crit combat text for Thunderfury auto-collection
                const critText = new CombatText(
                    otherItem.x + otherItem.width/2, 
                    otherItem.y + otherItem.height/2,
                    `+${finalPoints} CRIT!`,
                    '#FF6B00', // Orange crit color
                    true // is crit
                );
                combatTexts.push(critText);
            } else {
                // Create normal combat text for non-crit
                const normalText = new CombatText(
                    otherItem.x + otherItem.width/2, 
                    otherItem.y + otherItem.height/2,
                    `+${finalPoints}`,
                    '#FFD700', // Gold normal color
                    false // not crit
                );
                combatTexts.push(normalText);
            }
            
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
                
                // Trigger items list update
                onItemCollected(item.itemData);
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                const basePoints = item.itemData.value;
                let finalPoints = Math.round(basePoints * pointMultiplier);
                
                // Check for critical hit (include spell crit rating bonus)
                const critRoll = Math.random();
                const spellCritBonus = spellSystem.getCritRatingBonus();
                const totalCritRating = Math.min(gameState.critRating + spellCritBonus, gameState.critRatingCap);
                const isCrit = critRoll < totalCritRating;
                
                if (isCrit) {
                    finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                    
                    // Create crit combat text
                    const critText = new CombatText(
                        item.x + item.width/2, 
                        item.y + item.height/2,
                        `+${finalPoints} CRIT!`,
                        '#FF6B00', // Orange crit color
                        true // is crit
                    );
                    combatTexts.push(critText);
                    
                    // Add crit notification
                    addNotification(gameState, `💥 CRITICAL HIT! +${finalPoints} points`, 120, '#FF6B00');
                } else {
                    // Create normal combat text for non-crit
                    const normalText = new CombatText(
                        item.x + item.width/2, 
                        item.y + item.height/2,
                        `+${finalPoints}`,
                        '#FFD700', // Gold normal color
                        false // not crit
                    );
                    combatTexts.push(normalText);
                }
                
                gameState.score += finalPoints;
                
                // Show bonus points notification if spell multiplier is active (but not for crits to avoid spam)
                if (pointMultiplier > 1.0 && !isCrit) {
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
                    
                    // Increase crit rating by 1% for collecting Thunderfury
                    const critIncrease = 0.01; // 1%
                    const oldCritRating = gameState.critRating;
                    gameState.critRating = Math.min(gameState.critRating + critIncrease, gameState.critRatingCap);
                    const actualIncrease = gameState.critRating - oldCritRating;
                    
                    if (actualIncrease > 0) {
                        const critPercent = Math.round(actualIncrease * 100);
                        const newCritPercent = Math.round(gameState.critRating * 100);
                        addNotification(gameState, `⚡ THUNDERFURY POWER! Crit +${critPercent}% (Now: ${newCritPercent}%)`, 240, '#FF6B00');
                        console.log(`⚡ Thunderfury increased crit rating by ${critPercent}% to ${newCritPercent}% (${gameState.critRating.toFixed(3)})`);
                    } else {
                        const maxCritPercent = Math.round(gameState.critRatingCap * 100);
                        addNotification(gameState, `⚡ THUNDERFURY! Crit already maxed (${maxCritPercent}%)`, 180, '#FF6B00');
                        console.log(`⚡ Thunderfury collected but crit rating already at maximum: ${maxCritPercent}%`);
                    }
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
                    const setCompleted = checkDragonstalkerCompletion(gameState, gameItems);
                    if (setCompleted) {
                        playTotalSound(); // Play total sound for Dragonstalker completion
                    }
                } else {
                    playItemSound(item.itemData);
                }
                
                // Voice sound now played for specific items only
                
                // Total sound now played when Dragonstalker set is completed
                
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
                    addNotification(gameState, `❄️ All Items Frozen ${freezeSeconds}s`, 120, '#87CEEB');
                    
                    // Special case: Frost Nova damages player despite beneficial effect
                    if (projectile.data.id === "frost_nova" && projectile.data.damage > 0) {
                        // Check dodge first, then shield
                        if (shouldDodge()) {
                            // Player dodged the Frost Nova damage
                            showDodgeText(player.x + player.width/2, player.y);
                            trackDodge(projectile.data.damage); // Track HP saved from dodging Frost Nova
                            addNotification(gameState, `💨 Dodged Frost Nova!`, 120, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks the damage (only if dodge failed)
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
                        if (shouldDodge()) {
                            // Player dodged the shadowbolt
                            showDodgeText(player.x + player.width/2, player.y);
                            trackDodge(0); // Track dodge but no immediate HP saved (prevents DOT application)
                            addNotification(gameState, `💨 Dodged Shadowbolt!`, 120, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks shadowbolt application (only if dodge failed)
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
                        if (shouldDodge()) {
                            // Player dodged the projectile
                            showDodgeText(player.x + player.width/2, player.y);
                            const damage = projectile.data.damage || 5;
                            trackDodge(damage); // Track HP saved from dodging projectile
                            const dodgeMessage = `💨 Dodged ${projectile.data.name || 'Attack'}!`;
                            addNotification(gameState, dodgeMessage, 120, '#00FF00');
                            
                            // Create dodge particles for visual feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks the damage (only if dodge failed)
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
                powerUp.applyEffect(gameState, {
                    fallingItems: fallingItems,
                    powerUps: powerUps,
                    fireballs: fireballs
                });
            }
            
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, particles);
            powerUps.splice(powerUpIndex, 1);
        }
    });
    
    // Check arrow collisions (iterate backwards to safely remove items)
    for (let arrowIndex = window.arrows.length - 1; arrowIndex >= 0; arrowIndex--) {
        const arrow = window.arrows[arrowIndex];
        let arrowRemoved = false;
        
        // Check arrow vs falling items (collectibles)
        for (let itemIndex = fallingItems.length - 1; itemIndex >= 0 && !arrowRemoved; itemIndex--) {
            const item = fallingItems[itemIndex];
            if (arrow.checkCollision(item)) {
                // Collect the item with potential crit bonus from multishot
                if (item.itemData) {
                    item.itemData.collected++;
                    
                    // Trigger items list update
                    onItemCollected(item.itemData);
                    
                    // Apply spell point multipliers
                    const pointMultiplier = spellSystem.getPointMultiplier();
                    const basePoints = item.itemData.value;
                    let finalPoints = Math.round(basePoints * pointMultiplier);
                    
                    // Check for critical hit (include spell crit rating bonus and current multishot bonus if active)
                    const critRoll = Math.random();
                    const spellCritBonus = spellSystem.getCritRatingBonus();
                    const arrowCritBonus = arrow.critBonus || 0; // Multishot arrows have +5% crit
                    const totalCritRating = Math.min(gameState.critRating + spellCritBonus + arrowCritBonus, gameState.critRatingCap);
                    const isCrit = critRoll < totalCritRating;
                    
                    if (isCrit) {
                        finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                        
                        // Create crit combat text
                        const critText = new CombatText(
                            item.x + item.width/2, 
                            item.y + item.height/2,
                            `+${finalPoints} CRIT!`,
                            '#FF6B00', // Orange crit color
                            true // is crit
                        );
                        combatTexts.push(critText);
                    } else {
                        // Create normal combat text for non-crit
                        const normalText = new CombatText(
                            item.x + item.width/2, 
                            item.y + item.height/2,
                            `+${finalPoints}`,
                            '#FFD700', // Gold normal color
                            false // not crit
                        );
                        combatTexts.push(normalText);
                    }
                    
                    gameState.score += finalPoints;
                    gameState.perfectCollections++;
                    
                    // Track activity for hybrid progression
                    trackActivity(gameState, 'collection', 1);
                    
                    // Create collection particles
                    createCollectionParticles(item.x + item.width/2, item.y + item.height/2, particles);
                    
                    // Handle special item effects (Thunderfury, tier sets, etc.)
                    if (item.itemData.id === "ThunderFury") {
                        triggerThunderfuryEffect(item.x + item.width/2, item.y + item.height/2);
                        
                        // Increase crit rating by 1% for collecting Thunderfury
                        const critIncrease = 0.01; // 1%
                        const oldCritRating = gameState.critRating;
                        gameState.critRating = Math.min(gameState.critRating + critIncrease, gameState.critRatingCap);
                        const actualIncrease = gameState.critRating - oldCritRating;
                        
                        if (actualIncrease > 0) {
                            const critPercent = Math.round(actualIncrease * 100);
                            const newCritPercent = Math.round(gameState.critRating * 100);
                            addNotification(gameState, `⚡ THUNDERFURY POWER! Crit +${critPercent}% (Now: ${newCritPercent}%)`, 240, '#FF6B00');
                        }
                    }
                    
                    // Handle tier set items
                    if (item.itemData.type === "tier_set") {
                        playDragonstalkerSound();
                        
                        // Only increment if this is the first time collecting this specific piece
                        if (item.itemData.collected === 1) {
                            gameState.tierSetCollected++;
                        }
                        
                        // Check if this is an Ashkandi item for special celebration
                        if (item.itemData.id === "ashjrethul" || item.itemData.id === "ashkandi2") {
                            if (player.onAshkandiCollected) {
                                player.onAshkandiCollected();
                            }
                        } else {
                            if (player.onTierSetCollected) {
                                player.onTierSetCollected();
                            }
                        }
                        
                        // Add notification for tier set collection
                        const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                        const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                        addNotification(gameState, `🏹 ${item.itemData.name} (${uniquePiecesCollected}/10)`, 240, '#FFD700');
                        
                        // Check if Dragonstalker set is complete
                        const setCompleted = checkDragonstalkerCompletion(gameState, gameItems);
                        if (setCompleted) {
                            playTotalSound();
                        }
                    } else {
                        playItemSound(item.itemData);
                    }
                }
                
                // Create arrow impact particles
                arrow.createImpactParticles(particles);
                
                // Remove both arrow and item
                fallingItems.splice(itemIndex, 1);
                window.arrows.splice(arrowIndex, 1);
                arrowRemoved = true; // Mark arrow as removed
                break; // Exit item loop
            }
        }
        
        // Only check other collisions if arrow still exists
        if (!arrowRemoved && window.arrows[arrowIndex]) {
            // Check arrow vs projectiles (destroy them)
            for (let projectileIndex = fireballs.length - 1; projectileIndex >= 0 && !arrowRemoved; projectileIndex--) {
                const projectile = fireballs[projectileIndex];
                if (arrow.checkCollision(projectile)) {
                    // Create impact particles for destroyed projectile
                    arrow.createImpactParticles(particles);
                    createImpactParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, projectile.data);
                    
                    // If it's a beneficial projectile, apply its effect
                    if (projectile.data && (projectile.data.effects === "speed_increase" || projectile.data.effects === "freeze_time" || projectile.data.effects === "shield")) {
                        // Apply beneficial projectile effects
                        if (projectile.data.effects === "speed_increase") {
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
                            
                            addNotification(gameState, `🏹⚡ Arrow Speed Boost +${increasePercent}%`, 180, '#FFD700');
                        } else if (projectile.data.effects === "freeze_time") {
                            gameState.freezeTimeActive = true;
                            gameState.freezeTimeTimer = 600; // 10 seconds
                            
                            addNotification(gameState, `🏹❄️ Arrow Freeze All Items!`, 180, '#87CEEB');
                        } else if (projectile.data.effects === "shield") {
                            gameState.shieldActive = true;
                            gameState.shieldTimer = 600; // 10 seconds
                            
                            addNotification(gameState, `🏹🛡️ Arrow Shield!`, 180, '#FFD700');
                        }
                    } else {
                        // Add notification for destroying harmful projectile
                        addNotification(gameState, `🏹💥 Projectile Destroyed!`, 120, '#FFD700');
                    }
                    
                    // Remove both arrow and projectile
                    fireballs.splice(projectileIndex, 1);
                    window.arrows.splice(arrowIndex, 1);
                    arrowRemoved = true; // Mark arrow as removed
                    break; // Exit projectile loop
                }
            }
        }
    }
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
    
    // Hide all other screens (using safe access)
    const highScores = document.getElementById('highScores');
    if (highScores) highScores.style.display = 'none';
    
    const highScoresScreen = document.getElementById('highScoresScreen');
    if (highScoresScreen) highScoresScreen.style.display = 'none';
    
    const settingsScreen = document.getElementById('settingsScreen');
    if (settingsScreen) settingsScreen.style.display = 'none';
    
    const howToPlay = document.getElementById('howToPlay');
    if (howToPlay) howToPlay.style.display = 'none';
    
    const gameOver = document.getElementById('gameOver');
    if (gameOver) gameOver.style.display = 'none';
    
    const pauseMenu = document.getElementById('pauseMenu');
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    gameState.currentScreen = 'menu';
    
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
    hideAllUIElements();
    
    // Show the new high scores screen
    const highScoresScreen = document.getElementById('highScoresScreen');
    if (highScoresScreen) {
        highScoresScreen.style.display = 'block';
    } else {
        // Fallback to old element if it exists
        const oldHighScores = document.getElementById('highScores');
        if (oldHighScores) oldHighScores.style.display = 'block';
    }
    
    gameState.currentScreen = 'highScores';
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show how to play screen
function showHowToPlay(fromPause = false) {
    console.log('Showing how to play screen');
    
    // Safe element access to prevent null errors
    const nameEntry = document.getElementById('nameEntry');
    const highScores = document.getElementById('highScores');
    const howToPlay = document.getElementById('howToPlay');
    const gameOver = document.getElementById('gameOver');
    const pauseMenu = document.getElementById('pauseMenu');
    
    if (nameEntry) nameEntry.style.display = 'none';
    if (highScores) highScores.style.display = 'none';
    if (howToPlay) howToPlay.style.display = 'block';
    if (gameOver) gameOver.style.display = 'none';
    if (pauseMenu) pauseMenu.style.display = 'none';
    
    gameState.currentScreen = 'howToPlay';
    
    // Store where we came from for the back button
    gameState.howToPlaySource = fromPause ? 'pause' : 'menu';
    
    // Update canvas overlay
    updateCanvasOverlay();
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
    
    hideAllUIElements();
    document.getElementById('settingsScreen').style.display = 'block';
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
        // Return to pause menu
        showPauseMenu();
    } else {
        // Return to main menu
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
        });
    }
    
    if (gameInfoPauseBtn) {
        gameInfoPauseBtn.addEventListener('click', function() {
            // Hide pause menu and show game info (how to play screen)
            hidePauseMenu();
            showHowToPlay(true); // Pass true to indicate it came from pause
        });
    }
    
    if (settingsPauseBtn) {
        settingsPauseBtn.addEventListener('click', function() {
            // Hide pause menu and show settings
            hidePauseMenu();
            showSettings('pause'); // Pass 'pause' to indicate we came from pause menu
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
        
        <!-- Hidden sections for mobile -->
        <div class="player-stats" style="display: none;">
            <div class="stat-row">
                <span class="stat-label">Speed:</span>
                <span class="stat-value" id="gameSpeed">1.0x</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Crit Chance:</span>
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
    
    // Hide separate dragonstalker panel on mobile
    if (dragonstalkerPanel) {
        dragonstalkerPanel.style.display = 'none';
    }
    
    // Update the stats that are still needed but hidden
    updatePlayerStats(gameState);
    
    // Update health bar specifically for integrated layout
    updateHealthBarHTML();
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
        const baseCritPercent = Math.round(gameState.baseCritRating * 100);
        const permanentCritPercent = Math.round(gameState.critRating * 100);
        const spellCritBonus = spellSystem.getCritRatingBonus();
        const spellCritBonusPercent = Math.round(spellCritBonus * 100);
        const totalCritRating = Math.min(gameState.critRating + spellCritBonus, gameState.critRatingCap);
        const totalCritPercent = Math.round(totalCritRating * 100);
        const maxCritPercent = Math.round(gameState.critRatingCap * 100);
        
        // Determine display based on bonuses
        const hasPermanentBonus = gameState.critRating > gameState.baseCritRating;
        const hasSpellBonus = spellCritBonus > 0;
        
        if (hasSpellBonus) {
            // Show total with spell bonus highlighted
            if (hasPermanentBonus) {
                const permanentBonusPercent = permanentCritPercent - baseCritPercent;
                critRating.textContent = `${totalCritPercent}% (+${permanentBonusPercent}% +${spellCritBonusPercent}%🐲)`;
            } else {
                critRating.textContent = `${totalCritPercent}% (+${spellCritBonusPercent}%🐲)`;
            }
            critRating.style.color = '#FF4500'; // Dragon orange for spell bonus
            critRating.style.fontWeight = 'bold';
            critRating.style.textShadow = '0 0 6px #FF4500';
            
            // Add special glow if at max
            if (totalCritRating >= gameState.critRatingCap) {
                critRating.style.textShadow = '0 0 10px #FF4500';
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
        const baseDodgePercent = Math.round(gameState.baseDodgeRating * 100);
        const permanentDodgePercent = Math.round(gameState.dodgeRating * 100);
        const spellDodgeBonus = spellSystem.getDodgeRatingBonus ? spellSystem.getDodgeRatingBonus() : 0;
        const spellDodgeBonusPercent = Math.round(spellDodgeBonus * 100);
        const tempDodgeBonus = gameState.temporaryDodgeBoost || 0;
        const tempDodgeBonusPercent = Math.round(tempDodgeBonus * 100);
        const totalDodgeRating = Math.min(gameState.dodgeRating + spellDodgeBonus + tempDodgeBonus, gameState.dodgeRatingCap);
        const totalDodgePercent = Math.round(totalDodgeRating * 100);
        const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
        
        // Determine display based on bonuses
        const hasPermanentBonus = gameState.dodgeRating > gameState.baseDodgeRating;
        const hasSpellBonus = spellDodgeBonus > 0;
        const hasTempBonus = tempDodgeBonus > 0;
        
        // Build display text
        let displayText = '';
        let displayColor = '#CCCCCC';
        let fontWeight = 'normal';
        let textShadow = 'none';
        
        if (hasSpellBonus || hasTempBonus) {
            // Show total with active bonuses highlighted
            displayText = `${totalDodgePercent}%`;
            const bonuses = [];
            
            if (hasPermanentBonus) {
                const permanentBonusPercent = permanentDodgePercent - baseDodgePercent;
                bonuses.push(`+${permanentBonusPercent}%`);
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
            
            // Prioritize temp boost color, then spell, then permanent
            if (hasTempBonus) {
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

// Helper function to get Dragonstalker item icons for mobile display
function getDragonstalkerItemIcon(itemId) {
    const iconMap = {
        'ds_helm': '⛑️',      // Helm
        'ds_shoulders': '👔',  // Shoulders/Spaulders
        'ds_chest': '🛡️',     // Chest/Breastplate
        'ds_bracers': '🔗',   // Bracers
        'ds_gloves': '🧤',    // Gloves/Gauntlets
        'ds_belt': '🎀',      // Belt
        'ds_legs': '👖',      // Legs/Legguards
        'ds_boots': '👢',     // Boots/Greaves
        'ashjrethul': '🏹',   // Crossbow
        'ashkandi2': '⚔️'     // Sword
    };
    
    return iconMap[itemId] || '🛡️'; // Default to shield icon
}

// Helper function to get shortened Dragonstalker item names for mobile display
function getShortenedDragonstalkerName(itemId, originalName) {
    const shortNameMap = {
        'ds_helm': 'Head',
        'ds_shoulders': 'Shoulders', 
        'ds_chest': 'Chest',
        'ds_bracers': 'Bracers',
        'ds_gloves': 'Hands',
        'ds_belt': 'Belt',
        'ds_legs': 'Legs',
        'ds_boots': 'Boots',
        'ashjrethul': 'Crossbow',
        'ashkandi2': 'Weapon'
    };
    
    return shortNameMap[itemId] || originalName;
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
                const itemIcon = getDragonstalkerItemIcon(item.id);
                itemDiv.setAttribute('data-icon', itemIcon);
                
                // Create layouts for mobile vs desktop (both show icons now)
                if (isCompactView) {
                    // Mobile: Compact layout with icon and status overlay
                    itemDiv.innerHTML = `
                        <div class="dragonstalker-item-icon">${itemIcon}</div>
                        <div class="dragonstalker-item-status ${statusClass}">${status}</div>
                        <div class="dragonstalker-item-name ${nameClass}">${displayName}</div>
                    `;
                } else {
                    // Desktop: Traditional layout with icons
                    itemDiv.innerHTML = `
                        <div class="dragonstalker-item-icon">${itemIcon}</div>
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
        { id: 'flask_of_titans', elementId: 'spell-flask-of-titans' },
        { id: 'autoshot', elementId: 'spell-autoshot' },
        { id: 'multishot', elementId: 'spell-multishot' }
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

// Make global functions available for HTML onclick handlers
window.showSettings = showSettings;
window.closeSettings = closeSettings;
window.showMainMenu = showMainMenu;
window.resetSettings = resetSettingsUI;
window.getGameMode = getGameMode;

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
    // Get current viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get device-specific canvas dimensions from ResponsiveScaler
    const deviceCanvasDimensions = responsiveScaler.getCanvasDimensionsForDevice();
    const playableArea = responsiveScaler.getPlayableAreaDimensions();
    
    // Select canvas dimensions based on device type
    const targetWidth = deviceCanvasDimensions.width;
    const targetHeight = deviceCanvasDimensions.height;
    const targetAspectRatio = deviceCanvasDimensions.aspectRatio;
    
    console.log(`🎮 Setting up canvas for ${responsiveScaler.deviceType}:
        Canvas: ${targetWidth}x${targetHeight} (${targetAspectRatio.toFixed(2)} aspect ratio)
        Playable Area: ${playableArea.width}x${playableArea.height}
        Viewport: ${viewportWidth}x${viewportHeight}`);
    
    // Store current device type and mode for other systems to access
    canvas.deviceType = responsiveScaler.deviceType;
    canvas.isPortraitMode = responsiveScaler.deviceType === 'mobile'; // Mobile uses portrait-style canvas
    
    // Calculate scaling to fit the canvas in the viewport while maintaining aspect ratio
    // IMPORTANT: Never exceed the target dimensions (1440x810 max)
    let displayWidth, displayHeight;
    let scaleX, scaleY, scale;
    
    if (gameConfig.canvas.scaling.enabled && gameConfig.canvas.scaling.scaleToFit) {
        // Calculate the scale needed to fit the canvas in the viewport
        scaleX = viewportWidth / targetWidth;
        scaleY = viewportHeight / targetHeight;
        
        if (gameConfig.canvas.scaling.maintainAspectRatio) {
            // Use the smaller scale to ensure the entire canvas fits
            scale = Math.min(scaleX, scaleY);
            
            // CRITICAL: Never scale above 1.0 to maintain exact target dimensions
            // This ensures we never exceed 1440x810 pixels
            scale = Math.min(scale, 1.0);
            
            displayWidth = targetWidth * scale;
            displayHeight = targetHeight * scale;
        } else {
            // Stretch to fill (not recommended for games)
            scale = Math.min(scaleX, scaleY, 1.0);
            displayWidth = Math.min(viewportWidth, targetWidth);
            displayHeight = Math.min(viewportHeight, targetHeight);
        }
    } else {
        // Use fixed dimensions without scaling
        displayWidth = targetWidth;
        displayHeight = targetHeight;
        scale = 1;
    }
    
    // Set up high-DPI support
    let pixelRatio = 1;
    if (gameConfig.canvas.highDPI.enabled) {
        pixelRatio = gameConfig.canvas.highDPI.autoDetect ? 
            (window.devicePixelRatio || 1) : 1;
        
        // Limit pixel ratio to prevent performance issues
        if (gameConfig.canvas.highDPI.maxPixelRatio) {
            pixelRatio = Math.min(pixelRatio, gameConfig.canvas.highDPI.maxPixelRatio);
        }
    }
    
    // Set canvas dimensions
    // Internal resolution (what the game logic sees)
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    
    // Display size (how big it appears on screen)
    canvas.style.width = displayWidth + 'px';
    canvas.style.height = displayHeight + 'px';
    
    // Handle positioning - mobile-optimized for touch devices
    if (gameConfig.canvas.scaling.centerCanvas) {
        const deviceDimensions = responsiveScaler.getCanvasDimensionsForDevice();
        const isMobilePortrait = responsiveScaler.deviceType === 'mobile' && 
                                responsiveScaler.orientation === 'portrait' &&
                                deviceDimensions.positioning?.useCustomPositioning;
        
        let leftOffset, topOffset;
        
        if (isMobilePortrait) {
            // Mobile portrait: Horizontal center, positioned between combined panel and spell buttons
            leftOffset = deviceDimensions.positioning.centerHorizontally ? 
                (viewportWidth - displayWidth) / 2 : 0;
            
            // Calculate positioning between top panel and bottom spell buttons
            const topOffset_setting = deviceDimensions.positioning.topOffset || 90; // Below combined panel
            const bottomOffset = deviceDimensions.positioning.bottomOffset || 100; // Above spell buttons
            
            // Calculate available space for canvas
            const availableHeight = viewportHeight - topOffset_setting - bottomOffset;
            
            // Center canvas in available space or position at top offset if it doesn't fit
            if (displayHeight <= availableHeight) {
                // Canvas fits - center it in available space
                const extraSpace = availableHeight - displayHeight;
                topOffset = topOffset_setting + (extraSpace / 2);
            } else {
                // Canvas too tall - position at minimum top offset
                topOffset = topOffset_setting;
            }
            
            // Ensure we don't go above the panel or below the buttons
            topOffset = Math.max(topOffset_setting, Math.min(topOffset, viewportHeight - displayHeight - bottomOffset));
            
            console.log(`📱 Mobile Portrait Canvas Positioning:
                Canvas: ${displayWidth}x${displayHeight}
                Viewport: ${viewportWidth}x${viewportHeight}  
                Position: left=${leftOffset}px, top=${topOffset}px
                Top offset: ${topOffset_setting}px, Bottom offset: ${bottomOffset}px
                Available space: ${availableHeight}px`);
        } else {
            // Desktop/landscape: Standard centering
            leftOffset = (viewportWidth - displayWidth) / 2;
            topOffset = (viewportHeight - displayHeight) / 2;
        }
        
        canvas.style.position = 'fixed';
        canvas.style.left = leftOffset + 'px';
        canvas.style.top = topOffset + 'px';
        
        // Update CSS custom properties for letterboxing
        document.documentElement.style.setProperty('--letterbox-left', leftOffset + 'px');
        document.documentElement.style.setProperty('--letterbox-top', topOffset + 'px');
        document.documentElement.style.setProperty('--letterbox-width', displayWidth + 'px');
        document.documentElement.style.setProperty('--letterbox-height', displayHeight + 'px');
    }
    
    // Apply high-DPI scaling to canvas context
    if (pixelRatio > 1) {
        const actualWidth = canvas.width * pixelRatio;
        const actualHeight = canvas.height * pixelRatio;
        
        // Set the actual canvas size in memory
        canvas.width = actualWidth;
        canvas.height = actualHeight;
        
        // Scale the context back down
        ctx.scale(pixelRatio, pixelRatio);
        
        // Set the display size back to what we want
        canvas.style.width = displayWidth + 'px';
        canvas.style.height = displayHeight + 'px';
    }
    
    // Optimize image rendering quality for rotation and scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Additional settings to prevent visual tearing during rotation
    if (ctx.textRenderingOptimizeSpeed !== undefined) {
        ctx.textRenderingOptimizeSpeed = false; // Prioritize quality over speed
    }
    
    // Store the enhanced image smoothing function for use during rendering
    canvas.setupImageSmoothing = function() {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    };
    
    // Ensure image smoothing is maintained throughout the game loop
    canvas.setupImageSmoothing();
    
    // Store important values for game logic
    canvas.dpr = pixelRatio;
    canvas.logicalWidth = targetWidth;
    canvas.logicalHeight = targetHeight;
    canvas.displayWidth = displayWidth;
    canvas.displayHeight = displayHeight;
    canvas.scale = scale;
    
    // Update body background for letterboxing
    if (gameConfig.canvas.scaling.enabled) {
        document.body.style.backgroundColor = gameConfig.canvas.scaling.letterboxColor;
    }
    
    console.log(`👑 Playable-Area-Based Canvas Setup Complete:
        Device: ${responsiveScaler.deviceType}
        Logical: ${targetWidth}x${targetHeight}
        Display: ${displayWidth}x${displayHeight} 
        Scale: ${scale.toFixed(2)}x
        DPR: ${pixelRatio}
        Viewport: ${viewportWidth}x${viewportHeight}
        Playable Area: ${playableArea.width}x${playableArea.height}
        Item Scale: ${responsiveScaler.uniformScale.toFixed(2)}x
        
`);
    
    // Debug info for letterboxing
    if (gameConfig.canvas.scaling.showLetterboxInfo) {
        const viewportAspectRatio = viewportWidth / viewportHeight;
        console.log(`Letterbox Info:
            Viewport AR: ${viewportAspectRatio.toFixed(2)}
            Target AR: ${targetAspectRatio.toFixed(2)}
            Letterbox: ${Math.abs(viewportAspectRatio - targetAspectRatio) > 0.01 ? 'Yes' : 'No'}
            Device Type: ${responsiveScaler.deviceType}`);
    }
    
    // Refresh panel styles when canvas dimensions change
    // Small delay to ensure canvas properties are fully set
    setTimeout(() => {
        refreshPanelStyles();
    }, 50);
}

// Utility function to check if an action should crit
function shouldCrit() {
    return Math.random() < gameState.critRating;
}

// Utility function to check if the player should dodge an attack
function shouldDodge() {
    const spellDodgeBonus = spellSystem.getDodgeRatingBonus ? spellSystem.getDodgeRatingBonus() : 0;
    const tempDodgeBonus = gameState.temporaryDodgeBoost || 0;
    const totalDodgeRating = Math.min(gameState.dodgeRating + spellDodgeBonus + tempDodgeBonus, gameState.dodgeRatingCap);
    return Math.random() < totalDodgeRating;
}

// Utility function to show combat text with dodge feedback
function showDodgeText(x, y) {
    const dodgeText = new CombatText("DODGE!", x, y, '#00FF00', 24, 120); // Green text, larger size, longer duration
    combatTexts.push(dodgeText);
}

// Utility function to track dodge statistics
function trackDodge(healthSaved = 0) {
    gameState.totalDodges++;
    gameState.healthSavedFromDodges += healthSaved;
    // Expand movable area by 1 pixel per HP saved from dodges
    gameState.dodgeAreaExpansion += healthSaved;
}

// ===== BUFF TRACKER SYSTEM =====

// Active buffs tracking
let activeBuffs = new Map();

// Add or update a buff in the tracker
function addBuff(id, name, effect, timer, type = 'default') {
    const buffContainer = document.getElementById('buffTracker');
    if (!buffContainer) return;
    
    const timeInSeconds = Math.ceil(timer / 60); // Convert frames to seconds
    
    // Check if buff already exists
    let buffElement = document.getElementById(`buff-${id}`);
    
    if (buffElement) {
        // Update existing buff
        const timerElement = buffElement.querySelector('.buff-timer');
        if (timerElement) {
            timerElement.textContent = `${timeInSeconds}s`;
        }
        activeBuffs.set(id, { name, effect, timer, type, element: buffElement });
    } else {
        // Create new buff element
        buffElement = document.createElement('div');
        buffElement.className = `buff-item ${type}`;
        buffElement.id = `buff-${id}`;
        
        buffElement.innerHTML = `
            <div class="buff-info">
                <div class="buff-name">${name}</div>
                <div class="buff-effect">${effect}</div>
            </div>
            <div class="buff-timer">${timeInSeconds}s</div>
        `;
        
        buffContainer.appendChild(buffElement);
        activeBuffs.set(id, { name, effect, timer, type, element: buffElement });
        
        // Trigger slide-in animation
        setTimeout(() => {
            buffElement.style.opacity = '1';
            buffElement.style.transform = 'translateX(0)';
        }, 10);
    }
}

// Remove a buff from the tracker
function removeBuff(id) {
    const buffData = activeBuffs.get(id);
    if (buffData && buffData.element) {
        buffData.element.classList.add('fade-out');
        setTimeout(() => {
            if (buffData.element.parentNode) {
                buffData.element.parentNode.removeChild(buffData.element);
            }
            activeBuffs.delete(id);
        }, 200);
    }
}

// Update all buff timers
function updateBuffTracker(deltaTimeMultiplier) {
    for (const [id, buffData] of activeBuffs) {
        buffData.timer -= deltaTimeMultiplier;
        const timeInSeconds = Math.ceil(buffData.timer / 60);
        
        if (timeInSeconds <= 0) {
            removeBuff(id);
        } else {
            const timerElement = buffData.element.querySelector('.buff-timer');
            if (timerElement) {
                timerElement.textContent = `${timeInSeconds}s`;
                
                // Add visual warning when time is running low
                if (timeInSeconds <= 3) {
                    timerElement.style.color = '#FF6B6B';
                    timerElement.style.animation = 'pulse 0.5s infinite alternate';
                } else {
                    timerElement.style.color = 'white';
                    timerElement.style.animation = 'none';
                }
            }
        }
    }
}

// Clear all buffs (for game restart)
function clearAllBuffs() {
    const buffContainer = document.getElementById('buffTracker');
    if (buffContainer) {
        buffContainer.innerHTML = '';
    }
    activeBuffs.clear();
}

// Make buff functions globally available for other modules
window.addBuff = addBuff;
window.removeBuff = removeBuff;
window.clearAllBuffs = clearAllBuffs;

// === BULLET TIME SYSTEM ===
function updateBulletTime(deltaTimeMultiplier) {
    // Check if bullet time should be active
    const config = gameConfig.bulletTime;
    if (!config.enabled) {
        gameState.bulletTimeActive = false;
        gameState.bulletTimeMultiplier = 1.0;
        return;
    }
    
    // Calculate effective speed (levelSpeedMultiplier includes Dragonstalker reductions, subtract cut_time reductions)
    const effectiveSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - (gameState.permanentSpeedReduction || 0));
    
    // Activate bullet time at trigger speed
    const shouldActivate = effectiveSpeed >= config.triggerSpeed;
    
    if (shouldActivate && !gameState.bulletTimeActive) {
        // Activate bullet time
        gameState.bulletTimeActive = true;
        gameState.bulletTimeMultiplier = config.timeDilation;
        gameState.bulletTimeVisualTimer = 0;
        
        // Add focus mode notification
        if (config.visualEffects.focusIndicator) {
            addNotification(gameState, '🎯 FOCUS MODE', 3000, config.visualEffects.glowColor);
        }
        
        console.log(`🎯 Bullet time activated at ${effectiveSpeed.toFixed(1)}x speed (${Math.round((1 - config.timeDilation) * 100)}% time dilation)`);
    } else if (!shouldActivate && gameState.bulletTimeActive) {
        // Deactivate bullet time
        gameState.bulletTimeActive = false;
        gameState.bulletTimeMultiplier = 1.0;
        
        console.log(`⏰ Bullet time deactivated`);
    }
    
    // Update visual timer
    if (gameState.bulletTimeActive) {
        gameState.bulletTimeVisualTimer += deltaTimeMultiplier;
    }
}

// Render bullet time visual effects
function renderBulletTimeEffects() {
    if (!gameState.bulletTimeActive || !gameConfig.bulletTime.visualEffects.enabled) return;
    
    const config = gameConfig.bulletTime.visualEffects;
    const timer = gameState.bulletTimeVisualTimer;
    
    ctx.save();
    
    // Pulsating blue border glow effect
    if (config.borderGlow && config.glowIntensity > 0) {
        const pulseFactor = 0.5 + 0.5 * Math.sin(timer * config.pulseSpeed); // Smooth pulse from 0.5 to 1.0
        const glowOpacity = config.glowIntensity * pulseFactor;
        const borderWidth = 8 + (4 * pulseFactor); // Border width pulses from 8 to 12px
        
        // Set up glow effect
        ctx.strokeStyle = config.glowColor;
        ctx.lineWidth = borderWidth;
        ctx.globalAlpha = glowOpacity;
        ctx.shadowColor = config.glowColor;
        ctx.shadowBlur = 20 * pulseFactor;
        
        // Draw border around the playable area
        ctx.beginPath();
        ctx.rect(borderWidth / 2, borderWidth / 2, 
                canvas.logicalWidth - borderWidth, 
                canvas.logicalHeight - borderWidth);
        ctx.stroke();
        
        // Add inner glow effect
        ctx.lineWidth = Math.max(2, borderWidth - 4);
        ctx.globalAlpha = glowOpacity * 0.7;
        ctx.shadowBlur = 12 * pulseFactor;
        ctx.beginPath();
        ctx.rect(borderWidth, borderWidth, 
                canvas.logicalWidth - (borderWidth * 2), 
                canvas.logicalHeight - (borderWidth * 2));
        ctx.stroke();
    }
    
    ctx.restore();
}