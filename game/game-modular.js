// Import all modules
import { gameConfig } from './config/gameConfig.js';
import { GAME_VERSION } from './config/gameVersion.js';
import { CombatText } from './classes/CombatText.js';
import { measureAhead } from './utils/spriteFit.js';
import { Particle } from './classes/Particle.js';
import { gameItems } from './data/gameItems.js';
import { damageProjectiles, isHarmfulProjectile } from './data/damageProjectiles.js';
import { powerUpItems } from './data/powerUpItems.js';

import { Player } from './classes/Player.js';
import { FallingItem } from './classes/FallingItem.js';
import { DamageProjectile } from './classes/DamageProjectile.js';
import { PowerUpItem } from './classes/PowerUpItem.js';
import { Arrow } from './classes/Arrow.js';

import { tryAutoInitAudio, startBackgroundMusic, playUffSound, playScreamSound, playTotalSound, playFireballImpactSound, playSoundEffect, playSnapSound, sounds } from './systems/audioSystem.js';
import { initializeVisibilitySystem, getVisibilitySystemStatus, updateVisibilityConfig } from './systems/visibilitySystem.js';
import { initializeSettings, loadSettings, saveSettings, resetSettings, getSettings, updateSetting, areSoundEffectsEnabled, isBackgroundMusicEnabled, getVolume, getVolumeDecimal, getMasterVolume, getMusicVolume, getEffectsVolume, getMasterVolumeDecimal, getMusicVolumeDecimal, getEffectsVolumeDecimal, getPlayerPanelStyle, getDragonstalkerPanelStyle, getPanelOpacity, refreshPanelStyles } from './systems/settingsSystem.js';
import { loadHighScores, addHighScore, cacheHighScores, isHighScore, displayHighScores, displayHighScoresSync } from './systems/highScoreSystem.js';
import * as lootSystem from './systems/lootSystem.js';
import { totalXpAtLevel } from './utils/progression.js';
import { coinsForItem, coinsForBoss, formatCoins } from './utils/coins.js';
import { quiverCapacity, startingArrows } from './utils/quiver.js';
import { setById, piecesOf, ownedCount, setBonus, nextStep, bonusText } from './utils/sets.js';
import { Pet } from './classes/Pet.js';
import { getStartZone, renderStartZonePicker, setUnlockedZone, skipCost, renderGameModePicker, getGameMode, gameModeCost } from './ui/startZone.js';
import { renderThisGame, renderAllTime } from './ui/lootScreen.js';
import { showTravelMap } from './ui/travelMap.js';
import { initializeKeyBindings } from './ui/keyBindingsScreen.js';
import { initializeMusicButton } from './ui/musicButton.js';
import { enterFullscreen, leaveFullscreen } from './ui/fullscreen.js';
import { actionFor, keyName, resetKeys } from './utils/keybindings.js';
import { say, preloadVoiceLines, resetVoiceLines, updateBanter, watchHealth, forgetHealth } from './systems/voiceSystem.js';
import { resetBosses, isBossFightActive, guardZone, randomBossAttack, updateBoss, updateCurse, curseState, dropSupplies } from './systems/bossSystem.js';
import { BossProjectile } from './classes/BossProjectile.js';
import { getFaction, setFaction, showBackgroundForLevel, showStartingBackground } from './systems/backgroundSystem.js';
import { initializeInputSystem, updatePlayerPosition, resetInputState, updateMouseLock } from './systems/inputSystem.js';
// drawSettings removed - now using HTML+CSS guide

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateUniversalMultiplier, getLogicalCanvasWidth, getLogicalCanvasHeight, updateGameStateTimers, addNotification, updateNotifications, responsiveScaler, trackActivity, getLevelProgress, checkGameVersion, clearGameCache } from './utils/gameUtils.js';
import { selectRandomItem, calculateItemProbability, selectRandomProjectile, selectRandomPowerUp, shouldSpawnPowerUp, calculateProjectileProbability } from './utils/spawning.js';
import { spellSystem } from './systems/spellSystem.js';
import { gameClock } from './utils/gameClock.js';
import { notificationSystem } from './systems/notificationSystem.js';
import { assetManager } from './utils/AssetManager.js';
import { getAssetsByLevel, assetRegistry } from './data/assetRegistry.js';
import { handleIOSAudioSettings } from './utils/platform.js';
import { showLoadingScreen, updateLoadingProgress, hideLoadingScreen } from './ui/loadingScreen.js';
import { generateDynamicHelpContent as renderDynamicHelpContent } from './ui/helpContent.js';
import { updateSpellBar, updateHealthBar } from './ui/statusBars.js';
import { updateCanvasOverlayVisibility } from './ui/canvasOverlay.js';
import { menuScreenManager } from './ui/menuScreenManager.js';
import { applyPortrait, getAccountName, getGuestName, getPortraitUrl, renderAccountBar, siteBoot } from './ui/accountBar.js';
import { initializeScreenNavigation, updateScreenNavigation } from './ui/screenNavigation.js';
import { bindSettingsScreen, resetSettingsScreen, setSettingsBackLabel, updateSettingsScreen } from './ui/settingsScreen.js';
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
    arrowCount: 100, // Arrows in the quiver; a game starts with some of its slots filled (utils/quiver.js)
    quiverCapacity: 200, // The most arrows the quiver holds; more for a player with the large quiver
    coins: 0, // Coins earned in this game, in copper (utils/coins.js)
    bossLoot: [], // What the bosses defeated in this game dropped: { boss, item: { id, name, rarity }, kept }
    wornSet: 'giantstalker', // The hunter set being worn (utils/sets.js); the player may change it at any time
    setBonus: { crit: 0, dodge: 0, bossDamage: 0 }, // What wearing it gives with the pieces owned
    victory: false, // The last boss of the side is down: the game is won
    mode: 'normal', // 'normal', or 'boss_rush': nothing but the bosses, back to back
    rushPause: 0, // Boss Rush: steps left of the breather before the next boss comes in
    rushComplete: false, // Boss Rush: every boss of the side is down
    startZone: 1, // The zone the game starts in: above 1 when the player paid to skip ahead (ui/startZone.js)
    
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
let heldDrops = []; // Rare items from the server waiting for a boss fight to end
let heldDropWait = 0; // Steps until the next of them may drop
let particles = [];
let combatTexts = []; // For crit damage numbers and other combat feedback
let images = { items: [], spells: {} };
let recentDropYPositions = [];

const NAVIGABLE_SCREENS = new Set(['settings', 'howToPlay', 'highScores', 'gameOver', 'itemBonuses']);
const screenNavigationHistory = [];
let isScreenNavigationRestore = false;

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
    // As each tier of pictures arrives, measure them ahead of their first use (utils/spriteFit.js)
    const measureLoaded = () => measureAhead([...assetManager.assets.values()].filter(asset => asset instanceof HTMLImageElement));
    assetManager.onTier1Ready(measureLoaded);
    
    assetManager.onTier2Ready(() => {
        console.log('Tier 2 assets ready - starting background loading');
        measureLoaded();
    });
    
    assetManager.onTier3Ready(() => {
        console.log('All assets loaded - optimal performance achieved');
        measureLoaded();
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
    const canvasWidth = getLogicalCanvasWidth(canvas);
    const canvasHeight = getLogicalCanvasHeight(canvas);
    
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

    // For the page around the game (the site header): is a game underway, and a way to pause
    // it, so a click on a menu link can ask before the game is thrown away
    let leaveAllowed = false;
    window.INPUT_GAME = {
        inProgress: () => gameState.health > 0 && (gameState.gameRunning || gameState.showingPauseMenu) && gameState.currentScreen !== 'menu',
        pause: () => {
            if (gameState.gameRunning && !gameState.showingPauseMenu) showPauseMenu();
        },
        allowLeave: () => {
            leaveAllowed = true;
        },
    };

    // Closing the tab, reloading or going back mid-game: let the browser ask first
    window.addEventListener('beforeunload', (event) => {
        if (!leaveAllowed && window.INPUT_GAME.inProgress()) {
            event.preventDefault();
            event.returnValue = '';
        }
    });
    
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
    initializeScreenNavigation({
        onBack: navigateBackFromScreen,
        onNavigate: navigateToOverlayScreen,
        onClose: closeActiveOverlayScreen
    });
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
    menuScreenManager.hideAll();
}

// Handle window resize to maintain fullscreen and reposition all game objects
window.addEventListener('resize', () => {
    // The size of the field is worked out afresh first, then the canvas is laid out to it
    responsiveScaler.updateScaling();
    
    // Use high-DPI canvas setup instead of simple width/height assignment
    setupHighDPICanvas();
    
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

// Fraction of a simulation step the display is ahead by, used to interpolate rendering
let renderAlpha = 1;

// Main game loop
function gameLoop(now = performance.now()) {
    const frameMs = gameClock.beginFrame(now);
    // Real elapsed time expressed in 60fps frames, for things that follow input rather than the simulation
    const frameDelta = frameMs / (1000 / 60);
    
    if (gameState.gameRunning && !gameState.showingPauseMenu && !gameState.gamePaused) {
        // Player follows input every display frame (not affected by bullet time - player should still be responsive)
        updatePlayerPosition(player, canvas, frameDelta, gameConfig, gameState);
        
        const universalMultiplier = calculateUniversalMultiplier(canvas);
        const steps = gameClock.takeSteps(frameMs);
        for (let i = 0; i < steps; i++) {
            update(1, universalMultiplier);
        }
        renderAlpha = gameClock.alpha;
    } else {
        gameClock.discardPending();
        renderAlpha = 1;
        if (gameState.gameRunning && gameState.showingPauseMenu) {
            // Update player position even when paused/in settings
            updatePlayerPosition(player, canvas, frameDelta, gameConfig, gameState);
        }
    }
    
    // Update canvas overlay visibility
    updateCanvasOverlay();
    
    // The mouse is only held while a game is being played
    updateMouseLock(canvas, gameState);
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

// Remember where everything was before a simulation step so rendering can interpolate
function storePreviousPositions() {
    const lists = [fallingItems, fireballs, powerUps, window.arrows, particles, combatTexts];
    for (const list of lists) {
        for (const entity of list) {
            entity.prevX = entity.x;
            entity.prevY = entity.y;
        }
    }
}

// Update game state
function update(deltaTimeMultiplier, universalMultiplier) {
    if (!gameState.gameRunning || gameState.gamePaused) return;
    
    gameClock.tick();
    storePreviousPositions();
    
    // Store universal multiplier and logical canvas dimensions in game state for use by other systems
    gameState.universalMultiplier = universalMultiplier;
    gameState.canvasWidth = canvas.logicalWidth;
    gameState.canvasHeight = canvas.logicalHeight;
    
    // Update spell system first
    spellSystem.update(gameClock.now(), player, canvas, gameConfig);
    
    // Update game state timers
    updateGameStateTimers(gameState, deltaTimeMultiplier);
    
    // Update notification system with current game state
    if (window.notificationSystem) {
        window.notificationSystem.updatePersistentNotifications(gameState);
    }
    
    // Update level progression and speed using threshold-based system
    const oldLevel = gameState.currentLevel;
    const oldSpeedMultiplier = gameState.levelSpeedMultiplier;
    
    // Boss Rush brings the next boss in itself
    if (gameState.mode === 'boss_rush' && !isBossFightActive()) updateBossRush();
    
    // The goal of the game: with the last boss of the side down, it is won
    if (gameState.mode !== 'boss_rush' && !isBossFightActive() && gameState.levelCap === Infinity && !gameState.victory && lastBossIsDown()) {
        gameState.victory = true;
        endGame();
        return;
    }
    
    // A zone's boss stands between the player and the next zone: the level stops at the end of
    // the zone until the boss, who comes in when the player has the experience to move on, is
    // defeated.
    if (guardZone(gameState, canvas)) say('bossAppears');
    
    // Calculate new level and speed multiplier from the experience earned
    if (!isBossFightActive()) {
        calculateLevelSpeedMultiplier(gameState);
    }
    
    // Check if level increased
    if (gameState.currentLevel > oldLevel) {
        // Preload assets for higher levels (async to avoid blocking)
        setTimeout(() => preloadLevelAssets(gameState.currentLevel), 0);
        
        console.log(`Level up! Now level ${gameState.currentLevel + 1} (Speed: ${gameState.levelSpeedMultiplier.toFixed(2)}x) at score ${gameState.score}`);
        addNotification(gameState, `Level ${gameState.currentLevel + 1}!`, 2000, '#FFD700');
        say('levelUp');
        
        // Move on to the next background when this level is played somewhere new
        const arrivedAt = showBackgroundForLevel(gameState.currentLevel);
        if (arrivedAt) {
            addNotification(gameState, `Entering ${arrivedAt.name}`, 240, '#FFD700');
        }

    }
    
    // === BULLET TIME SYSTEM ===
    updateBulletTime(deltaTimeMultiplier);
    
    // Apply bullet time to delta time multiplier for all game objects
    const bulletTimeAdjustedDelta = deltaTimeMultiplier * gameState.bulletTimeMultiplier;
    
    // Spawn new items, projectiles, and power-ups (affected by bullet time).
    // During a boss fight the boss does the throwing; the game's own drops wait.
    // Boss Rush has nothing but the bosses.
    const onlyBosses = gameState.mode === 'boss_rush';
    if (!onlyBosses) spawnItems(bulletTimeAdjustedDelta);
    if (isBossFightActive()) {
        updateBoss({ gameState, canvas, player, fireballs, powerUps, particles, combatTexts, spellSystem, isValidYPosition, recentDropYPositions, shouldDodge, showDodgeText, trackDodge, onBossDefeated });
    } else if (!onlyBosses) {
        spawnProjectiles(bulletTimeAdjustedDelta);
        spawnPowerUps(bulletTimeAdjustedDelta);
    }
    
    // A boss's curse keeps eating at the player, in the fight or after it
    updateCurse({ gameState, player, combatTexts, spellSystem });
    player.debuffs = activeDebuffs();
    
    // Update all game objects (affected by bullet time)
    updateFallingItems(bulletTimeAdjustedDelta);
    updateProjectiles(bulletTimeAdjustedDelta);
    // The pet keeps at the hunter's side and goes after an item now and then. After the items
    // and projectiles have moved, so it can see how fast each one is falling.
    if (player.pet) {
        player.pet.update(player, fallingItems, fireballs, canvas, gameConfig.pet);
        
        // What it bit is gone from the air
        const bitten = player.pet.takeBitten();
        const at = bitten ? fireballs.indexOf(bitten) : -1;
        if (at >= 0) {
            fireballs.splice(at, 1);
            for (let i = 0; i < 12; i++) {
                particles.push(new Particle(bitten.x + bitten.width / 2 + (Math.random() - 0.5) * bitten.width, bitten.y + bitten.height / 2 + (Math.random() - 0.5) * bitten.height, '#FF8C42'));
            }
            combatTexts.push(new CombatText(bitten.x + bitten.width / 2, bitten.y, 'Chomp!', '#9FE870', false));
            // Every third bite is the voiced one; the others are a plain snap of jaws
            if (player.pet.bites % gameConfig.pet.voicedBiteEvery === 0) {
                playSoundEffect(assetRegistry.audio.petChomp);
            } else {
                playSnapSound();
            }
        }
    }
    updatePowerUps(bulletTimeAdjustedDelta);
    updateArrows(bulletTimeAdjustedDelta);
    updateParticles(bulletTimeAdjustedDelta);
    updateCombatTexts(bulletTimeAdjustedDelta);
    updateBuffTracker(deltaTimeMultiplier); // Buff timers not affected by bullet time
    updateTemporaryStatEffects(deltaTimeMultiplier); // Update temporary stat effects
    
    // Check collisions
    checkCollisions();
    
    // The guild has something to say: about his health, or about nothing at all
    watchHealth(gameState.health, gameState.maxHealth);
    updateBanter(isBossFightActive());
    
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
        renderBulletTimeEffects,
        alpha: renderAlpha
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
    
        // Arcane Shot spell icon
    const arcaneShotIcon = new Image();
    arcaneShotIcon.onload = () => {
        images.spells.arcane_shot = arcaneShotIcon;
    };
    arcaneShotIcon.src = assetRegistry.buffs.arcaneShot;
}

// Game functions (simplified - these would contain the full logic)
// The level a game starts at: the first of the zone the player skipped to, if they did
function firstLevel() {
    if (gameState.startZone > 1) {
        return (gameState.startZone - 1) * gameConfig.backgrounds.levelsPerBackground + 1;
    }
    return gameConfig.levels.startingLevel || 1;
}

// With no boss left standing the game is over, but not at once: a few seconds pass first, so
// what the last boss dropped is seen and recorded. Call once a step; true when they are up.
const AFTER_LAST_BOSS_STEPS = 180;

function lastBossIsDown() {
    gameState.afterLastBoss = (gameState.afterLastBoss || 0) + 1;
    return gameState.afterLastBoss >= AFTER_LAST_BOSS_STEPS;
}

// Boss Rush, between fights: a breather with something to restock, then the experience the
// next boss waits for, so it comes in at once. With no boss left standing the run is won.
function updateBossRush() {
    if (gameState.levelCap === undefined) return;   // The first step: not yet known who stands
    
    if (gameState.levelCap === Infinity) {
        if (!lastBossIsDown()) return;
        gameState.rushComplete = true;
        endGame();
        return;
    }
    
    if (gameState.rushPause > 0) {
        gameState.rushPause--;
        if (gameState.rushPause === gameConfig.bossRush.breather - 60) {
            dropSupplies({ gameState, powerUps, isValidYPosition, recentDropYPositions }, gameConfig.bossRush.supplies);
        }
        return;
    }
    
    gameState.xp = Math.max(gameState.xp || 0, totalXpAtLevel(gameState.levelCap + 1, gameConfig.progression));
}

// What is hurting the player over time, to be named under the hunter's health bar
function activeDebuffs() {
    const debuffs = [];
    
    const curse = curseState();
    if (curse) debuffs.push({ label: `Curse -${curse.damage}/s (${curse.secondsLeft}s)`, color: '#D9A8FF' });
    
    const dots = gameState.shadowboltDots || [];
    if (dots.length > 0) {
        const seconds = Math.ceil(Math.max(...dots.map(dot => dot.remainingDuration)) / 60);
        const damage = dots.length * gameState.shadowboltDamagePerTick;
        debuffs.push({ label: `Shadow burn -${damage}/s (${seconds}s)`, color: '#B9A0FF' });
    }
    
    return debuffs;
}

// The player ends the game from the pause menu: it is handed in as it stands, like any game
// that ran to its end
function finishGameNow() {
    if (!window.confirm('Finish this game now? It is recorded with the score you have.')) return;
    
    gameState.showingPauseMenu = false;
    gameState.gamePaused = false;
    endGame();
}

// ----- Hunter sets -----
// Pieces are collected over many games: a logged-in player's are on their account (the site
// hands them over as INPUT_BOOT.user.pieces), and what this game catches counts at once. A
// guest has only what this game gave them.

const WORN_SET_KEY = 'input_worn_set';

function ownedPieces() {
    const owned = new Set(siteBoot && siteBoot.user && siteBoot.user.pieces ? siteBoot.user.pieces : []);
    gameItems.forEach(item => {
        if (item.type === 'set_piece' && item.collected > 0) owned.add(item.id);
    });
    return owned;
}

function rememberedSet() {
    let id = null;
    try {
        id = localStorage.getItem(WORN_SET_KEY);
    } catch (e) {
        // Storage unavailable: the first set
    }
    return setById(gameConfig.sets, id) ? id : gameConfig.sets[0].id;
}

// What the set being worn gives with the pieces owned now
function refreshSetBonus() {
    const set = setById(gameConfig.sets, gameState.wornSet);
    gameState.setBonus = setBonus(set, ownedCount(piecesOf(gameItems, gameState.wornSet), ownedPieces()));
    dragonstalkerCache.lastUpdate = 0;  // The panel shows it at once
}

// Put a set on. It can be changed at any time, in a fight too.
function wearSet(setId, announce = true) {
    const set = setById(gameConfig.sets, setId);
    if (!set) return;
    
    gameState.wornSet = set.id;
    refreshSetBonus();
    try {
        localStorage.setItem(WORN_SET_KEY, set.id);
    } catch (e) {
        // Storage unavailable: worn for this game
    }
    
    if (announce) {
        const pieces = piecesOf(gameItems, set.id);
        const owned = ownedCount(pieces, ownedPieces());
        const gives = bonusText(gameState.setBonus) || `no bonus yet (${nextStep(set, owned)} pieces for the first)`;
        addNotification(gameState, `Wearing ${set.name} (${owned}/${pieces.length}): ${gives}`, 240, '#C77DFF');
    }
}

// The next set in order, for the tap on the panel
function wearNextSet() {
    const index = gameConfig.sets.findIndex(set => set.id === gameState.wornSet);
    wearSet(gameConfig.sets[(index + 1) % gameConfig.sets.length].id);
}

// The starting window is the world map: what is picked there is the side and the zone the game
// starts in. Each pick is set where the rest of the code looks for it (the side, the starting
// zone), shown behind the menu, and decides whether "Start here" may be pressed.
function showStartMap() {
    showTravelMap({
        faction: getFaction(),
        onSelect: ({ faction, zone, open }) => {
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn) startBtn.disabled = !open;
            if (!faction) return;   // A place that is not in the game yet
            
            setFaction(faction);
            document.querySelectorAll('#factionPicker input[name="faction"]').forEach(option => {
                option.checked = option.value === faction;
            });
            renderStartZonePicker(faction);
            const startZone = document.getElementById('startZone');
            if (startZone) startZone.value = open && zone > 1 ? String(zone) : '1';
            
            // The picture of the place, behind the menu
            showBackgroundForLevel((zone - 1) * gameConfig.backgrounds.levelsPerBackground, true);
        }
    });
}

// Whether the logged-in player has found the large quiver (a boss drop, kept on the account)
function hasLargeQuiver() {
    return Boolean(siteBoot && siteBoot.user && siteBoot.user.quiver);
}

function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.health = gameState.maxHealth;
    gameState.gameRunning = true;
    menuScreenManager.gameStarted();
    // A phone gives the game its whole screen while it is played (ui/fullscreen.js)
    enterFullscreen();
    gameState.gamePaused = false;
    gameState.currentScreen = 'game';
    
    // Reset caches for performance
    resetDragonstalkerCache();
    resetItemsListCache();
    clearTemporaryStatEffects();
    
    // Apply starting level configuration for testing
    const startingLevel = Math.max(0, firstLevel() - 1); // Convert 1-based to 0-based
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
    
    // Experience starts at what the starting level needs (none, unless a later level is set for testing)
    gameState.xp = totalXpAtLevel(startingLevel + 1, gameConfig.progression);
    
    console.log(`🚀 Starting at Level ${startingLevel + 1} with speed ${gameState.levelSpeedMultiplier}x${gameState.score > 0 ? ` (Score: ${gameState.score})` : ''}`);
    
    gameState.baseDropSpeed = gameConfig.gameplay.baseDropSpeed;
    gameState.permanentSpeedReduction = 0.0;
    
    // Reset hybrid progression tracking
    gameState.levelStartTime = gameClock.now() / 1000;
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
    
    // The quiver: some of its slots filled, and bigger for a player who has found the large one
    gameState.quiverCapacity = quiverCapacity(gameConfig.quiver, hasLargeQuiver());
    gameState.arrowCount = startingArrows(gameConfig.quiver);
    
    // Boss Rush: the first boss comes in after a moment
    gameState.rushPause = 60;
    gameState.rushComplete = false;
    gameState.victory = false;
    gameState.afterLastBoss = 0;
    gameState.levelCap = undefined;
    
    // The set worn last time is worn again, with what its owned pieces give
    wearSet(rememberedSet(), false);
    gameState.coins = 0;
    gameState.bossLoot = [];
    
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
    
    // Play time starts from zero; the server opens a record of the game and decides its rare loot
    gameState.elapsedTime = 0;
    gameState.nextPowerUpTime = undefined;
    showBackgroundForLevel(gameState.currentLevel, true);
    player.setCharacter(gameState.faction);
    
    // The guild's voices: fetched now, quiet for a while
    preloadVoiceLines();
    resetVoiceLines();
    forgetHealth();
    
    // His pet: the one of his side, at his side
    if (!player.pet) player.pet = new Pet();
    player.pet.setKind(gameState.faction);
    player.pet.reset(gameConfig.pet);
    resetBosses(gameState.faction, gameState.currentLevel + 1);
    heldDrops = [];
    heldDropWait = 0;
    lootSystem.beginGame({
        playerName: gameState.playerName,
        faction: gameState.faction,
        startZone: gameState.startZone,
        mode: gameState.mode,
        getSummary: getGameSummary,
        onOffline: () => addNotification(gameState, `⚠️ Connection lost - this game is offline and will not count`, 360, '#FF6B6B')
    });
    
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
    const startingLevel = Math.max(0, firstLevel() - 1); // Convert 1-based to 0-based
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
    
    gameState.xp = totalXpAtLevel(startingLevel + 1, gameConfig.progression);
    
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
    gameState.levelStartTime = gameClock.now() / 1000;
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
    
    // The quiver: some of its slots filled, and bigger for a player who has found the large one
    gameState.quiverCapacity = quiverCapacity(gameConfig.quiver, hasLargeQuiver());
    gameState.arrowCount = startingArrows(gameConfig.quiver);
    
    // Boss Rush: the first boss comes in after a moment
    gameState.rushPause = 60;
    gameState.rushComplete = false;
    gameState.victory = false;
    gameState.afterLastBoss = 0;
    gameState.levelCap = undefined;
    
    // The set worn last time is worn again, with what its owned pieces give
    wearSet(rememberedSet(), false);
    gameState.coins = 0;
    gameState.bossLoot = [];
    
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
    leaveFullscreen();
    
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
    enterFullscreen();
    
    // Hide HTML pause menu
    menuScreenManager.hideShell();
    
    // Disable cursor when returning to game
    canvas.classList.remove('show-cursor');
    
    // Update mobile pause button visibility when resuming
    updateMobilePauseButtonVisibility();
    
    updateCanvasOverlay();
}

// Main game mechanics implementations
function spawnItems(deltaTimeMultiplier) {
    // Rare items the server scheduled for this moment. The usual rules still apply: a set piece
    // already collected or missed, or a second Zee Zgnan, does not drop.
    heldDrops.push(...lootSystem.update(gameState.elapsedTime));
    
    // Nothing drops during a boss fight; rare items due in that time come once it is over
    if (isBossFightActive()) return;
    
    // One at a time, a second apart: after a fight several may be waiting, and they should not
    // all come down at once
    heldDropWait -= deltaTimeMultiplier;
    if (heldDrops.length > 0 && heldDropWait <= 0) {
        const drop = heldDrops.shift();
        const itemData = gameItems.find(item => item.id === drop.item);
        
        if (itemData && calculateItemProbability(itemData, gameState) > 0) {
            const rareItem = new FallingItem(() => itemData, isValidYPosition, recentDropYPositions, gameState, images, canvas);
            rareItem.dropId = drop.id;
            fallingItems.push(rareItem);
            heldDropWait = 60;
        }
    }

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
    
    // The bosses' attacks also fall as hazards of their own, any of them at any point in the game
    if (fireballs.length < gameConfig.gameplay.maxFireballs && Math.random() < gameConfig.bosses.bossAttackChance * deltaTimeMultiplier) {
        const attack = randomBossAttack(gameState.currentLevel + 1);
        if (attack) {
            fireballs.push(new BossProjectile(attack, isValidYPosition, recentDropYPositions, gameState, canvas));
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
        // Frost Nova does not stop items: only the things that hurt (see updateProjectiles)
        
        // Apply spell speed effects to falling items
        const spellSpeedMultiplier = spellSystem.getItemSpeedMultiplier();
        const adjustedDeltaTime = deltaTimeMultiplier * spellSpeedMultiplier;
        
        const stillActive = item.update(adjustedDeltaTime, canvas, gameState);
        
        if (!stillActive && item.missed) {
            gameState.missedItems++;
            
            // Track activity for hybrid progression
            trackActivity(gameState, 'miss', 1);
            
            // A missed item costs a little health, whatever it was: a piece of a hunter set
            // too (it will come again in another game). Check dodge first, then shield
            if (shouldDodge()) {
                // Player dodged the missed item penalty
                showDodgeText(player.x + player.width/2, player.y);
                trackDodge(gameConfig.gameplay.healthLossOnMiss); // Track HP saved from dodging missed item
                playUffSound(); // Still play the sound for feedback
            } else if (gameState.shieldActive) {
                // Shield blocks the damage from missed items (only if dodge failed)
                combatTexts.push(new CombatText(player.x + player.width/2, player.y, 'BLOCKED', '#FFD700', false));
            } else {
                // Track damage for hybrid progression
                trackActivity(gameState, 'damage', gameConfig.gameplay.healthLossOnMiss);
                
                gameState.health = Math.max(0, gameState.health - gameConfig.gameplay.healthLossOnMiss);
                playUffSound();
            }
        }
        
        return stillActive && !item.missed;
    });
}

function updateProjectiles(deltaTimeMultiplier) {
    fireballs = fireballs.filter(projectile => {
        // Frost Nova freezes what would hurt the player where it hangs; the helpful spells
        // (and items and power-ups) keep falling
        if (gameState.freezeTimeActive && isHarmfulProjectile(projectile.data)) {
            return true;
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
    
    // Say so when the pet fetched something
    const fetched = player.pet ? player.pet.takeFetched() : null;
    if (fetched) {
        combatTexts.push(new CombatText(player.pet.x, player.groundY() - player.figureHeight() * 0.7, 'Fetched!', '#9FE870', false));
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

function getCurrentScreenNavigationState() {
    if (NAVIGABLE_SCREENS.has(gameState.currentScreen)) {
        return {
            screen: gameState.currentScreen,
            settingsSource: gameState.settingsSource || 'menu',
            howToPlaySource: gameState.howToPlaySource || 'menu',
            highScoresSource: gameState.highScoresSource || 'menu',
            itemBonusesSource: gameState.itemBonusesSource || 'pause'
        };
    }

    if (gameState.showingPauseMenu) {
        return { screen: 'pause' };
    }

    return { screen: gameState.currentScreen === 'game' ? 'game' : 'menu' };
}

function getBackLabelForSource() {
    return 'Back';
}

function rememberCurrentScreenForNavigation(fromScreen = null) {
    if (isScreenNavigationRestore) {
        return;
    }

    const sourceState = fromScreen && NAVIGABLE_SCREENS.has(fromScreen)
        ? {
            screen: fromScreen,
            settingsSource: gameState.settingsSource || 'menu',
            howToPlaySource: gameState.howToPlaySource || 'menu',
            highScoresSource: gameState.highScoresSource || 'menu',
            itemBonusesSource: gameState.itemBonusesSource || 'pause'
        }
        : getCurrentScreenNavigationState();

    if (sourceState.screen !== gameState.currentScreen || NAVIGABLE_SCREENS.has(sourceState.screen)) {
        screenNavigationHistory.push(sourceState);
    }
}

function restoreScreenNavigationState(state) {
    const target = typeof state === 'string' ? { screen: state } : (state || { screen: 'menu' });
    isScreenNavigationRestore = true;

    try {
        switch (target.screen) {
            case 'settings':
                showSettings(target.settingsSource || 'menu');
                break;
            case 'howToPlay':
                showHowToPlay(target.howToPlaySource === 'pause', { source: target.howToPlaySource || 'menu' });
                break;
            case 'highScores':
                showHighScores(target.highScoresSource === 'pause', target.highScoresSource === 'gameOver', { source: target.highScoresSource || 'menu' });
                break;
            case 'itemBonuses':
                showItemBonuses(target.itemBonusesSource || 'pause');
                break;
            case 'gameOver':
                menuScreenManager.backToGameOver();
                gameState.currentScreen = 'gameOver';
                updateScreenNavigation('gameOver', { backLabel: getBackLabelForSource('menu') });
                break;
            case 'pause':
                menuScreenManager.backToPauseMenu();
                gameState.currentScreen = 'menu';
                gameState.showingPauseMenu = true;
                break;
            case 'game':
                hidePauseMenu();
                gameState.currentScreen = 'game';
                break;
            case 'menu':
            default:
                showNameEntry();
                break;
        }
    } finally {
        isScreenNavigationRestore = false;
    }
}

function navigateBackFromScreen() {
    const fallbackSource = gameState.currentScreen === 'settings'
        ? gameState.settingsSource
        : gameState.currentScreen === 'howToPlay'
            ? gameState.howToPlaySource
            : gameState.currentScreen === 'highScores'
                ? gameState.highScoresSource
                : gameState.currentScreen === 'itemBonuses'
                    ? gameState.itemBonusesSource
                    : 'menu';

    restoreScreenNavigationState(screenNavigationHistory.pop() || fallbackSource || 'menu');
    updateCanvasOverlay();
}

function navigateToOverlayScreen(targetScreen, fromScreen = null) {
    rememberCurrentScreenForNavigation(fromScreen);

    switch (targetScreen) {
        case 'settings':
            showSettings(fromScreen || getCurrentScreenNavigationState().screen);
            break;
        case 'howToPlay':
            showHowToPlay(false, { source: fromScreen || getCurrentScreenNavigationState().screen });
            break;
        case 'highScores':
            showHighScores(false, false, { source: fromScreen || getCurrentScreenNavigationState().screen });
            break;
        case 'itemBonuses':
            showItemBonuses(fromScreen || getCurrentScreenNavigationState().screen);
            break;
        default:
            break;
    }
}

function closeActiveOverlayScreen() {
    screenNavigationHistory.length = 0;

    const source = gameState.currentScreen === 'settings'
        ? gameState.settingsSource
        : gameState.currentScreen === 'howToPlay'
            ? gameState.howToPlaySource
            : gameState.currentScreen === 'highScores'
                ? gameState.highScoresSource
                : gameState.currentScreen === 'itemBonuses'
                    ? gameState.itemBonusesSource
                    : null;

    const canResumeGame = gameState.health > 0 && (gameState.showingPauseMenu || source === 'pause' || source === 'game');

    if (canResumeGame) {
        hidePauseMenu();
        menuScreenManager.hideAll();
        gameState.currentScreen = 'game';
        updateMobilePauseButtonVisibility();
    } else {
        gameState.showingPauseMenu = false;
        gameState.gameRunning = false;
        gameState.gamePaused = false;
        showNameEntry();
    }

    updateCanvasOverlay();
}

// Show main menu (unified pause menu with name entry content)
function showNameEntry() {
    console.log('Showing main menu - game is ready for player interaction');
    hideAllUIElements();
    
    // Ensure proper game state for main menu
    gameState.showingPauseMenu = false;
    gameState.gameRunning = false;
    gameState.currentScreen = 'menu';
    
    // Show the pause menu container with name entry content
    menuScreenManager.showNameEntry();
    
    updatePauseMenuContent();
    
    // Update button visibility based on game state
    updateMenuButtons();
    
    // Who is playing: the account name when logged in (fixed), otherwise the name saved from a
    // previous visit, otherwise a random guest name the player is free to change
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        const accountName = getAccountName();
        if (accountName) {
            nameInput.value = accountName;
            nameInput.readOnly = true;
        } else {
            const savedName = localStorage.getItem('efto_playerName');
            nameInput.value = savedName || getGuestName() || '';
            nameInput.focus();
            nameInput.select();
        }
    }
    renderAccountBar();
    
    // The side chosen last time is still chosen; the menu shows where that side starts
    document.querySelectorAll('#factionPicker input[name="faction"]').forEach(option => {
        option.checked = option.value === getFaction();
    });
    renderGameModePicker();
    showStartMap();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Dynamic function to update pause menu content based on game state
function updatePauseMenuContent() {
    // Check if there's a game in progress (running or paused) similar to updateMenuButtons logic
    const gameInProgress = gameState.gameRunning || gameState.showingPauseMenu || 
                          (gameState.currentScreen === 'game' && gameState.health > 0);
    
    if (gameInProgress) {
        menuScreenManager.showPauseMenu();
    } else {
        menuScreenManager.showNameEntry();
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
    
    menuScreenManager.setMenuButtonsForGameProgress(gameInProgress);
}

// Show high scores screen
function showHighScores(fromPause = false, fromGameOver = false, options = {}) {
    console.log('Showing high scores screen');
    
    if (!fromPause && !fromGameOver) {
        hideAllUIElements();
    }
    menuScreenManager.showHighScores({ fromGameOver });
    
    gameState.currentScreen = 'highScores';
    
    // Store where we came from for the back button
    if (options.source) {
        gameState.highScoresSource = options.source;
    } else if (fromGameOver) {
        gameState.highScoresSource = 'gameOver';
    } else {
        gameState.highScoresSource = fromPause ? 'pause' : 'menu';
    }
    
    // Update back button text based on source
    const backBtn = document.getElementById('highScoresBackBtn');
    if (backBtn) {
        backBtn.textContent = getBackLabelForSource(gameState.highScoresSource);
    }
    updateScreenNavigation('highScores', { backLabel: getBackLabelForSource(gameState.highScoresSource) });
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show how to play screen
function showHowToPlay(fromPause = false, options = {}) {
    console.log('Showing how to play screen');
    
    if (!fromPause) {
        hideAllUIElements();
    }
    menuScreenManager.showHowToPlay();
    
    gameState.currentScreen = 'howToPlay';
    
    // Store where we came from for the back button
    gameState.howToPlaySource = options.source || (fromPause ? 'pause' : 'menu');
    updateScreenNavigation('howToPlay', { backLabel: getBackLabelForSource(gameState.howToPlaySource) });
    
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
    
    if (gameState.settingsSource !== 'pause') {
        hideAllUIElements();
    }
    menuScreenManager.showSettings();
    
    gameState.currentScreen = 'settings';
    
    console.log('Settings screen displayed');
    
    setSettingsBackLabel(gameState.settingsSource);
    updateScreenNavigation('settings', { backLabel: getBackLabelForSource(gameState.settingsSource) });
    
    // Update UI elements with current settings
    console.log('Updating settings UI...');
    updateSettingsScreen();
    
    // Set up event handlers for settings controls (do this each time settings opens)
    console.log('Setting up event handlers...');
    bindSettingsScreen();
    console.log('showSettings() complete');
}

function closeSettings() {
    navigateBackFromScreen();
}

function showMainMenu() {
    hideAllUIElements();
    showNameEntry();
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
    
    // A place on the map that cannot be started at yet
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn && startBtn.disabled) return;
    
    // The side decides which backgrounds the game moves through
    if (!getFaction()) {
        const picker = document.getElementById('factionPicker');
        picker.classList.add('needs-choice');
        picker.querySelector('input').focus();
        return;
    }
    
    gameState.playerName = playerName;
    gameState.faction = getFaction();
    
    // Boss Rush and skipping ahead are paid for as the game opens; the site has the last word
    // on the purse. Boss Rush always starts with the first boss.
    gameState.mode = getGameMode();
    gameState.startZone = gameState.mode === 'boss_rush' ? 1 : getStartZone(gameState.faction);
    if (gameState.mode === 'boss_rush') {
        siteBoot.user.coins -= gameModeCost(gameState.mode);
    } else if (gameState.startZone > 1) {
        siteBoot.user.coins -= skipCost(gameState.startZone);
    }
    
    // Remember a guest's chosen name for future sessions (accounts carry their own)
    if (!getAccountName()) {
        localStorage.setItem('efto_playerName', playerName);
    }
    
    // Hide the pause menu (which contains the name entry content)
    menuScreenManager.hideShell();
    
    // Start the actual game
    startGame();
}

// Handle restart from game over screen
function restartGameFromUI() {
    const currentPlayerName = gameState.playerName;
    
    // Hide game over screen and pause menu container
    menuScreenManager.hideAll();
    
    // Pre-fill the name input with the current player name
    document.getElementById('playerNameInput').value = currentPlayerName;
    
    showNameEntry();
}

// ===== UI EVENT HANDLERS =====

// Set up UI event handlers
function setupUIEventHandlers() {
    console.log('Setting up UI event handlers...');
    
    // Which key does what can be changed under Settings (ui/keyBindingsScreen.js)
    initializeKeyBindings();
    initializeMusicButton();
    
    // Wearing another hunter set: its key while playing (1, 2 and 3 unless the player changed
    // them), or a tap on the set panel (it only takes taps while the game is paused)
    document.addEventListener('keydown', event => {
        const index = ['set_1', 'set_2', 'set_3'].indexOf(actionFor(event.code));
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (index < 0 || typing || !gameState.gameRunning || !gameConfig.sets[index]) return;
        
        wearSet(gameConfig.sets[index].id);
    });
    const setPanelHeader = document.querySelector('#dragonstalkerProgressPanel .dragonstalker-panel-header');
    if (setPanelHeader) {
        setPanelHeader.addEventListener('click', () => {
            if (gameState.currentScreen === 'game') wearNextSet();
        });
    }
    
    // The "Game" menu on the starting window: the game's other screens, under one button
    const gameMenuBtn = document.getElementById('gameMenuBtn');
    const gameMenuList = document.getElementById('gameMenuList');
    if (gameMenuBtn && gameMenuList) {
        const toggleGameMenu = open => {
            gameMenuList.hidden = !open;
            gameMenuBtn.setAttribute('aria-expanded', String(open));
        };
        gameMenuBtn.addEventListener('click', event => {
            event.stopPropagation();
            toggleGameMenu(gameMenuList.hidden);
        });
        // Picking something from it, or clicking anywhere else, closes it
        document.addEventListener('click', () => toggleGameMenu(false));
    }
    
    // Boss Rush always starts with the first boss, so the choice of starting zone goes away
    const gameModeSelect = document.getElementById('gameMode');
    if (gameModeSelect) {
        gameModeSelect.addEventListener('change', () => {
            if (gameModeSelect.value === 'boss_rush') {
                document.getElementById('startZonePicker').hidden = true;
            } else {
                renderStartZonePicker(getFaction());
            }
        });
    }
    
    // Choosing a side remembers it and shows where that side starts
    document.querySelectorAll('#factionPicker input[name="faction"]').forEach(option => {
        option.addEventListener('change', () => {
            setFaction(option.value);
            renderStartZonePicker(option.value);
            document.getElementById('factionPicker').classList.remove('needs-choice');
            showStartingBackground();
        });
    });
    
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
        // The key for Settings (S, unless the player changed it)
        if (actionFor(e.code) === 'settings' && !e.ctrlKey && !e.altKey && !e.metaKey) {
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
            menuScreenManager.hideShell();
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
    
    // A logged-in player's profile image replaces the stock portrait in the player panel
    applyPortrait();

    if (viewScoresBtn) {
        console.log('Setting up High Scores button handler');
        viewScoresBtn.addEventListener('click', () => showHighScores());

        // Under the site's header the high scores have a page of their own, linked from there
        if (siteBoot && siteBoot.embedded) viewScoresBtn.style.display = 'none';
        // Under the site's header, which carries the logo already (styles/wow-theme.css)
        document.body.classList.toggle('site-framed', Boolean(siteBoot && siteBoot.embedded));
    } else {
        console.warn('viewScoresBtn not found!');
    }
    
    if (howToPlayBtn) {
        console.log('Setting up How to Play button handler');
        howToPlayBtn.addEventListener('click', () => showHowToPlay());
    } else {
        console.warn('howToPlayBtn not found!');
    }
    
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', function() {
            navigateBackFromScreen();
        });
    }
    
    if (backToMenuBtn2) {
        backToMenuBtn2.addEventListener('click', function() {
            navigateBackFromScreen();
        });
    }
    
    // High scores back button
    const highScoresBackBtn = document.getElementById('highScoresBackBtn');
    if (highScoresBackBtn) {
        highScoresBackBtn.addEventListener('click', function() {
            navigateBackFromScreen();
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
        settingsBtn.addEventListener('click', () => showSettings('menu'));
    }
    
    // In-game settings button
    const gameSettingsBtn = document.getElementById('gameSettingsBtn');
    if (gameSettingsBtn) {
        gameSettingsBtn.addEventListener('click', () => showSettings('game'));
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
            showItemBonuses('pause');
        });
    }

    const itemBonusesMenuBtn = document.getElementById('itemBonusesMenuBtn');
    if (itemBonusesMenuBtn) {
        itemBonusesMenuBtn.addEventListener('click', function() {
            showItemBonuses('menu');
        });
    }
    
    const finishPauseBtn = document.getElementById('finishPauseBtn');
    if (finishPauseBtn) finishPauseBtn.addEventListener('click', finishGameNow);
    
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

// Show the Item Bonuses screen
function showItemBonuses(source = null) {
    const resolvedSource = source === 'pause' || source === 'menu' || source === 'game'
        ? source
        : (gameState.showingPauseMenu || gameState.settingsSource === 'pause' || gameState.howToPlaySource === 'pause'
            ? 'pause'
            : (gameState.gameRunning && gameState.health > 0 ? 'game' : 'menu'));
    gameState.itemBonusesSource = resolvedSource;

    if (gameState.gameRunning) {
        gameState.gamePaused = true;
    }

    if (resolvedSource !== 'pause') {
        hideAllUIElements();
    }

    menuScreenManager.showItemBonuses();
    gameState.currentScreen = 'itemBonuses';
    gameState.showingPauseMenu = resolvedSource === 'pause';

    canvas.classList.add('show-cursor');
    updateScreenNavigation('itemBonuses', { backLabel: getBackLabelForSource() });
    updateItemBonusesWindow();
    setupItemBonusesEventHandlers();
    updateMobilePauseButtonVisibility();
    updateCanvasOverlay();

    console.log('Item Bonuses screen opened from:', resolvedSource);
}

// Hide the Item Bonuses screen (delegates to unified back navigation)
function hideItemBonuses() {
    navigateBackFromScreen();
}

// Mobile pause button visibility management
function updateMobilePauseButtonVisibility() {
    const mobilePauseBtn = document.getElementById('mobilePauseBtn');
    if (!mobilePauseBtn) return;
    
    // Show button only on mobile devices during active gameplay
    // On a phone or tablet however it is held: there is no Esc key to press
    const touchFirst = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    const shouldShow = (responsiveScaler.deviceType === 'mobile' || touchFirst) && 
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
    renderThisGame(document.getElementById('thisGameList'), { items: gameItems, bossLoot: gameState.bossLoot, coins: gameState.coins });
    updatePermanentBonusesTab();
    updateTemporaryBonusesTab();
    // The account's collection is only asked for when its tab is looked at
    if (document.getElementById('allTimeList').classList.contains('active')) {
        renderAllTime(document.getElementById('allTimeList'));
    }
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
    // Tab switching
    const permanentTab = document.getElementById('permanentBonusesTab');
    const temporaryTab = document.getElementById('temporaryBonusesTab');
    const thisGameTab = document.getElementById('thisGameTab');
    const allTimeTab = document.getElementById('allTimeTab');
    
    if (permanentTab && !permanentTab.hasEventListener) {
        permanentTab.addEventListener('click', () => switchBonusTab('permanent'));
        permanentTab.hasEventListener = true;
    }
    
    if (temporaryTab && !temporaryTab.hasEventListener) {
        temporaryTab.addEventListener('click', () => switchBonusTab('temporary'));
        temporaryTab.hasEventListener = true;
    }
    
    if (thisGameTab && !thisGameTab.hasEventListener) {
        thisGameTab.addEventListener('click', () => switchBonusTab('thisGame'));
        thisGameTab.hasEventListener = true;
    }
    
    if (allTimeTab && !allTimeTab.hasEventListener) {
        allTimeTab.addEventListener('click', () => switchBonusTab('allTime'));
        allTimeTab.hasEventListener = true;
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
    } else if (tabName === 'thisGame') {
        tabButton = document.getElementById('thisGameTab');
        tabList = document.getElementById('thisGameList');
    } else if (tabName === 'allTime') {
        tabButton = document.getElementById('allTimeTab');
        tabList = document.getElementById('allTimeList');
        renderAllTime(tabList);
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
        const priorityOrder = { zee_zgnan: 5, legendary: 4, special: 3, epic: 2, set_piece: 1, regular: 0 };
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
        item.type === 'set_piece'
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
                        <img src="${getPortraitUrl()}" alt="Player Portrait" onerror="this.onerror=null;this.src='assets/player/efto.png'">
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
            <div class="stat-row">
                <span class="stat-label">Coins:</span>
                <span class="stat-value" id="coinCount">0c</span>
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
    if (playerLevelDisplay) playerLevelDisplay.textContent = levelLabel();
    
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
        item.type === 'set_piece'
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
        playerNameDisplay.textContent = gameState.playerName || 'Unknown';
    }
    
    // Update score with formatting (large and prominent)
    if (playerScoreDisplay) {
        playerScoreDisplay.textContent = gameState.score.toLocaleString();
    }
    
    // Update level (add 1 to 0-based internal level for 1-based UI display)
    if (playerLevelDisplay) {
        playerLevelDisplay.textContent = levelLabel();
    }
    
    // Update health bar in player section
    const playerHealthFill = document.getElementById('playerHealthFill');
    const playerHealthText = document.getElementById('playerHealthText');
    
    if (playerHealthFill && playerHealthText && gameState.health !== undefined && gameState.maxHealth !== undefined) {
        const healthPercentage = Math.max(0, gameState.health / gameState.maxHealth);
        const healthPercent = Math.ceil(healthPercentage * 100);
        
        // Update health fill width and color
        playerHealthFill.style.width = `${healthPercentage * 100}%`;
        
        // Colour comes from the stylesheet: green, then amber, then red as health drops
        const healthLevel = healthPercentage <= 0.25 ? 'low' : healthPercentage <= 0.6 ? 'medium' : 'high';
        playerHealthFill.className = `player-health-fill ${healthLevel}`;
        
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
        arrowCountElement.textContent = `${gameState.arrowCount || 0}/${gameState.quiverCapacity}`;
        // Grey when empty, green when the quiver is full, gold in between
        if ((gameState.arrowCount || 0) === 0) {
            arrowCountElement.style.color = '#CCCCCC';
        } else if (gameState.arrowCount < gameState.quiverCapacity) {
            arrowCountElement.style.color = '#FFD700';
        } else {
            arrowCountElement.style.color = '#00FF00';
        }
    }
    
    // Coins earned so far in this game
    const coinCountElement = document.getElementById('coinCount');
    if (coinCountElement) {
        coinCountElement.textContent = formatCoins(gameState.coins);
        coinCountElement.style.color = '#FFD700';
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
        item.type === 'set_piece'
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
    
    // Boss loot first: there are few of them and they are the rarest things in a game
    gameState.bossLoot.forEach(drop => {
        const entry = document.createElement('div');
        entry.className = `item-entry boss-loot boss-loot-${drop.item.rarity}`;
        
        const icon = document.createElement('span');
        icon.className = 'item-icon';
        icon.textContent = '☠';
        const name = document.createElement('span');
        name.className = 'item-name';
        name.textContent = drop.item.name;
        const from = document.createElement('span');
        from.className = 'item-points';
        from.textContent = drop.boss.name;
        
        entry.append(icon, name, from);
        itemsList.appendChild(entry);
    });
    
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
        else if (item.type === 'set_piece') icon = '🛡';
        
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
function onItemCollected(itemData, fallingItem = null) {
    // Mark that we need to update the items list
    itemsListCache.needsUpdate = true;
    
    const dropId = fallingItem ? fallingItem.dropId : null;
    lootSystem.recordPickup(itemData.id, dropId);
    if (lootSystem.earnsCoins(itemData, dropId)) {
        gameState.coins += coinsForItem(itemData.type, gameConfig.coins);
    }
    
    // A rare catch may draw a remark, Thunder Fury always its own
    if (itemData.id === 'ThunderFury') {
        say('thunderfury');
    } else if (['epic', 'special', 'set_piece', 'legendary', 'zee_zgnan'].includes(itemData.type)) {
        say('rareCaught');
    }
    
    // A piece of a hunter set: it counts towards what the worn set gives from this moment, and
    // a logged-in player keeps it (the site records the pickup)
    if (itemData.type === 'set_piece') {
        if (siteBoot && siteBoot.user && dropId !== null && dropId !== undefined) {
            siteBoot.user.pieces = siteBoot.user.pieces || [];
            if (!siteBoot.user.pieces.includes(itemData.id)) siteBoot.user.pieces.push(itemData.id);
        }
        refreshSetBonus();
        
        const set = setById(gameConfig.sets, itemData.set);
        const pieces = piecesOf(gameItems, itemData.set);
        addNotification(gameState, `${itemData.name}: ${set.name} ${ownedCount(pieces, ownedPieces())}/${pieces.length}`, 240, '#C77DFF');
    }
    
    // The hunter reaches for it
    player.onCollect();
}

// The level as the player sees it, with how far along it they are
function levelLabel() {
    const level = (gameState.currentLevel || 0) + 1;
    if (gameConfig.levels.progressionType !== 'xp') return `Level ${level}`;
    
    return `Level ${level} · ${Math.floor(getLevelProgress(gameState).progress * 100)}%`;
}

// The game's result so far, as the server records it
function getGameSummary() {
    return {
        score: gameState.score,
        level: gameState.currentLevel,
        gameTime: Math.round(gameState.elapsedTime || 0),
        dragonstalkerCompletions: gameState.dragonstalkerCompletions,
        // Ratings as percentages with one decimal
        finalCritRating: Math.round(getCurrentTotalCritRating() * 1000) / 10,
        finalDodgeRating: Math.round(getCurrentTotalDodgeRating() * 1000) / 10
    };
}

// Update dedicated Dragonstalker progress panel
function updateDragonstalkerProgressPanel(gameState, gameItems) {
    const panel = document.getElementById('dragonstalkerProgressPanel');
    if (!panel) return;
    
    // The panel shows the set being worn: its pieces, lit when owned (on the account or caught
    // in this game), and what wearing it gives
    const set = setById(gameConfig.sets, gameState.wornSet);
    const pieces = piecesOf(gameItems, gameState.wornSet);
    const owned = ownedPieces();
    const piecesOwned = ownedCount(pieces, owned);
    
    // Throttle updates - only update every 1 second unless something changed
    const currentTime = Date.now();
    const stateKey = `${gameState.wornSet}:${piecesOwned}`;
    const hasChanged = stateKey !== dragonstalkerCache.lastCollectedCount || dragonstalkerCache.lastUpdate === 0;
    if (!hasChanged && currentTime - dragonstalkerCache.lastUpdate < 1000) {
        return;
    }
    
    dragonstalkerCache.lastUpdate = currentTime;
    dragonstalkerCache.lastCollectedCount = stateKey;
    
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
    
    // The set's name: its first word, and "Armor" where there is room
    const nameElement = document.getElementById('setPanelName');
    if (nameElement && set && nameElement.dataset.set !== set.id) {
        const [first, ...rest] = set.name.split(' ');
        nameElement.textContent = first;
        const suffix = document.createElement('span');
        suffix.className = 'dragonstalker-set-suffix';
        suffix.textContent = ` ${rest.join(' ')}`;
        nameElement.append(suffix);
        nameElement.dataset.set = set.id;
    }
    panel.title = `Press ${keyName('set_1')}, ${keyName('set_2')} or ${keyName('set_3')} to wear another set`;
    
    // Update progress bar
    const progressFill = document.getElementById('dragonstalkerProgressFill');
    const progressText = document.getElementById('dragonstalkerProgressText');
    if (progressFill && progressText) {
        progressFill.style.width = `${pieces.length > 0 ? (piecesOwned / pieces.length) * 100 : 0}%`;
        
        // Pieces owned, and what wearing the set gives with them (in short on phones)
        const gives = bonusText(gameState.setBonus);
        const isMobile = responsiveScaler.deviceType === 'mobile';
        progressText.textContent = gives && !isMobile
            ? `${piecesOwned}/${pieces.length} \u00b7 ${gives.replace(' damage to bosses', ' boss dmg')}`
            : `${piecesOwned}/${pieces.length}`;
    }
    
    // Update items list
    const itemsList = document.getElementById('dragonstalkerItemsList');
    if (itemsList) {
        // Another set: build its slots anew
        if (itemsList.dataset.set !== gameState.wornSet) {
            itemsList.innerHTML = '';
            itemsList.dataset.set = gameState.wornSet;
            dragonstalkerCache.itemStates.clear();
            
            pieces.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'dragonstalker-item';
                itemDiv.setAttribute('data-item-id', item.id);
                itemsList.appendChild(itemDiv);
            });
        }
        
        // Update only items that have changed
        pieces.forEach(item => {
            const itemDiv = itemsList.querySelector(`[data-item-id="${item.id}"]`);
            if (!itemDiv) return;
            
            const statusClass = owned.has(item.id) ? 'collected' : 'pending';
            const cachedState = dragonstalkerCache.itemStates.get(item.id) || { status: '' };
            
            // Only touch the DOM when the slot's state changed or on first render
            if (cachedState.status !== statusClass || !itemDiv.innerHTML) {
                itemDiv.className = `dragonstalker-item ${statusClass}`;
                itemDiv.title = item.name;
                itemDiv.innerHTML = `
                    <div class="dragonstalker-item-icon">
                        <img src="${item.image}" alt="">
                    </div>
                    <div class="dragonstalker-item-name">${item.slot.charAt(0).toUpperCase()}${item.slot.slice(1)}</div>
                `;
                
                dragonstalkerCache.itemStates.set(item.id, { status: statusClass });
            }
        });
    }
}

// ===== GAME END FUNCTIONS =====

// Boss loot, by rarity: the colour its name is written in
const BOSS_LOOT_COLORS = { uncommon: '#1EFF00', rare: '#4D9BFF', epic: '#C77DFF' };

// A boss went down: it pays coins, and the site decides what it dropped. A logged-in player
// keeps the item on their account; a guest is only shown it.
function onBossDefeated(boss) {
    say('bossDefeated');
    gameState.coins += coinsForBoss(boss.zone, gameConfig.coins);
    if (gameState.mode === 'boss_rush') gameState.rushPause = gameConfig.bossRush.breather;
    
    lootSystem.reportBoss(boss.id).then(drop => {
        if (!drop) return;
        setUnlockedZone(boss.faction, drop.unlockedZone);
        
        // The large quiver, found once in an account's life: it holds more from this moment on
        if (drop.quiver && siteBoot && siteBoot.user) {
            siteBoot.user.quiver = true;
            gameState.quiverCapacity = quiverCapacity(gameConfig.quiver, true);
            addNotification(gameState, `${drop.quiver}! Your quiver now holds ${gameState.quiverCapacity} arrows`, 480, '#FF8000');
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 90, 'Large quiver!', '#FF8000', true));
        }
        if (!drop.item) return;
        
        // Listed with the game's loot, in the panel and on the loot screen
        gameState.bossLoot.push({ boss, item: drop.item, kept: drop.kept });
        itemsListCache.needsUpdate = true;
        if (!gameState.gameRunning) return;
        
        const color = BOSS_LOOT_COLORS[drop.item.rarity] || '#FFD700';
        // Kept short: the message bar cuts long lines off
        const message = drop.kept ? `${boss.name} dropped ${drop.item.name}` : `Loot: ${drop.item.name} - log in to keep it`;
        addNotification(gameState, message, 420, color);
        // Floating text as well: phones do not show the message bar
        combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 40, drop.item.name, color, true));
    }).catch(console.error);
}

// What the game earned, on the game over screen. "banked" is the server's answer once it has
// recorded the game: { earned, balance }, balance being null for guests.
function showCoinsEarned(banked = null) {
    const element = document.getElementById('coinsEarned');
    if (!element) return;
    
    const earned = banked ? banked.earned : gameState.coins;
    let text = `Coins earned: ${formatCoins(earned)}`;
    
    if (banked && banked.balance !== null && banked.balance !== undefined) {
        text += ` | Purse: ${formatCoins(banked.balance)}`;
        if (siteBoot && siteBoot.user) {
            siteBoot.user.coins = banked.balance;
            renderAccountBar();
        }
    } else if (siteBoot && !siteBoot.user) {
        text += ' | Log in to keep your coins and boss loot';
    }
    
    element.textContent = text;
}

// End game function
function endGame() {
    gameState.gameRunning = false;
    
    const newHighScoreElement = document.getElementById('newHighScore');
    if (newHighScoreElement) newHighScoreElement.style.display = 'none';
    
    const showRank = rank => {
        // Show new high score message if it's in top 10
        if (newHighScoreElement && rank > 0 && rank <= 10) {
            newHighScoreElement.textContent = `New High Score! Rank #${rank}`;
            newHighScoreElement.style.display = 'block';
        }
    };
    
    try {
        // Under the site the server records the game, and a game that counts goes on the leaderboard
        const recorded = lootSystem.finishGame();
        
        if (recorded) {
            recorded.then(result => {
                if (result.scores) cacheHighScores(result.scores);
                if (result.coins) showCoinsEarned(result.coins);
                
                if (result.mode === 'boss_rush') {
                    if (newHighScoreElement) {
                        newHighScoreElement.textContent = 'Boss Rush is not played for the leaderboard';
                        newHighScoreElement.style.display = 'block';
                    }
                } else if (result.legal) {
                    showRank(result.rank);
                } else if (newHighScoreElement) {
                    newHighScoreElement.textContent = 'Offline game - not on the leaderboard';
                    newHighScoreElement.style.display = 'block';
                }
            }).catch(console.error);
        } else {
            // Opened on its own: the game keeps its own high scores
            const finalCritRating = getCurrentTotalCritRating();
            const finalDodgeRating = getCurrentTotalDodgeRating();
            
            addHighScore(
                gameState.playerName, 
                gameState.score, 
                gameState.perfectCollections, 
                gameState.currentLevel,
                Math.round(gameState.elapsedTime || 0),
                gameState.dragonstalkerCompletions,
                finalCritRating,
                finalDodgeRating
            ).then(showRank).catch(console.error);
        }
    } catch (error) {
        console.error('Error saving high score:', error);
    }
    
    showCoinsEarned();
    say(gameState.victory || gameState.rushComplete ? 'victory' : 'gameOver');
    
    const gameOverTitle = document.getElementById('gameOverTitle');
    if (gameOverTitle) {
        gameOverTitle.textContent = gameState.rushComplete ? 'Boss Rush complete!' : gameState.victory ? 'Victory!' : 'Game Over!';
    }
    
    // Update final score display
    const finalScoreElement = document.getElementById('finalScore');
    if (finalScoreElement) {
        finalScoreElement.textContent = 
            `Final Score: ${gameState.score} | Items: ${gameState.perfectCollections} | Level: ${gameState.currentLevel}`;
    }
    
    // Show pause menu container and hide pause content to display game over screen
    leaveFullscreen();
    menuScreenManager.showGameOver();
    gameState.currentScreen = 'gameOver';
    updateScreenNavigation('gameOver', { backLabel: getBackLabelForSource('menu') });
    
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
    leaveFullscreen();
    menuScreenManager.showGameOver();
    gameState.currentScreen = 'gameOver';
    updateScreenNavigation('gameOver', { backLabel: getBackLabelForSource('menu') });
    
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
window.resetSettings = resetSettingsScreen;

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

function shouldDodge(attackerLevel) {
    return calculateShouldDodge(gameState, spellSystem, attackerLevel);
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