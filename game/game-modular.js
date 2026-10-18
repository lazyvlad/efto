// Import all modules
import { gameConfig } from './config/gameConfig.js';
import { GAME_VERSION } from './config/gameVersion.js';
import { CombatText } from './classes/CombatText.js';
import { measureAhead } from './utils/spriteFit.js';
import { Particle } from './classes/Particle.js';
import { LightningBolt } from './classes/LightningBolt.js';
import { startPerfProbe, perfProbeOn, noteFrame } from './utils/perfProbe.js';
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
import { dropShield, shieldBlocks } from './utils/shield.js';
import { setById, piecesOf, ownedCount, setBonus, nextStep, bonusText } from './utils/sets.js';
import { healthAtNewMax, armorReduction } from './utils/stats.js';
import { SLOTS, validEquipment, equip, equipSet, mainSet, setsWorn, gearTotals, slotsFor, carriedOf, fitsCarried, inHis36 } from './utils/gear.js';
import { bagCapacity, slotsUsed, addToBags, soldShort, setItemStacks, stowInBags } from './utils/bags.js';
import { MATERIALS, categoryOf } from './data/materials.js';
import { wearables, wearableById, isKeptGear, gearCatalog } from './data/wearables.js';
import { initializeInventory, openInventory, closeInventory, isInventoryOpen, refreshInventory } from './ui/inventory.js';
import { refreshPetSlot } from './ui/petSlot.js';
import { initializeCharacterSheet, refreshCharacterSheet, openCharacterSheet, closeCharacterSheet, isCharacterSheetOpen } from './ui/characterSheet.js';
import { Pet } from './classes/Pet.js';
import { playerCharacters, characterFor } from './data/playerCharacters.js';
import { hunterPicture } from './utils/hunterLooks.js';
import { askConfirm } from './ui/gameDialog.js';
import { craftedById, recipes, isCrafted } from './data/crafting.js';
import { getStartZone, renderStartZonePicker, setUnlockedZone, skipCost, renderGameModePicker, getGameMode, gameModeCost, rememberBeaten } from './ui/startZone.js';
import { renderThisGame, renderAllTime } from './ui/lootScreen.js';
import { showGameOverSummary, showGameOverResult } from './ui/gameOverScreen.js';
import { showTravelMap } from './ui/travelMap.js';
import { initializeKeyBindings } from './ui/keyBindingsScreen.js';
import { initializeMusicButton } from './ui/musicButton.js';
import { enterFullscreen, leaveFullscreen } from './ui/fullscreen.js';
import { actionFor, keyName, resetKeys } from './utils/keybindings.js';
import { say, preloadVoiceLines, resetVoiceLines, updateBanter, watchHealth, forgetHealth } from './systems/voiceSystem.js';
import { resetBosses, isBossFightActive, guardZone, randomBossAttack, updateBoss, updateCurse, curseState, dropSupplies, fightInProgress, strikeBoss, bossFightState } from './systems/bossSystem.js';
import { BossProjectile } from './classes/BossProjectile.js';
import { resetCreatures, updateCreatures, creaturesAbout, strikeCreatures, carryForCreatures, zoneHasCreatures } from './systems/creatureSystem.js';
import { resetFrostTraps, deployFrostTraps } from './systems/frostTrapSystem.js';
import { dressForMelee, updateMelee, drawMelee, drawRanged, resetMelee, meleeFramesSince } from './systems/meleeSystem.js';
import { getFaction, setFaction, showBackgroundForLevel, showStartingBackground, currentBackgroundImage, currentBackgroundName } from './systems/backgroundSystem.js';
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
import { showGuestSession } from './ui/guestSession.js';
import { updateHudPanels, toggleStats, toggleGear, closePanels, noteFound, resetHudPanels } from './ui/hudPanels.js';
import { applyPortrait, getAccountName, getGuestName, getPortraitUrl, isGuestAccount, renderAccountBar, siteBoot } from './ui/accountBar.js';
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
    wornSet: 'giantstalker', // The set most of what is worn belongs to: the one the set panel shows
    equipment: {}, // What the hunter wears: { slotId: itemId } (utils/gear.js)
    carried: [], // The gear a player with an account takes into a game (item ids)
    setBonus: { health: 0, armor: 0, attackPower: 0, crit: 0, dodge: 0, carrying: 0, bossDamage: 0, multishot: 0, arcane: 0 }, // What everything being worn gives (gearTotals in utils/gear.js)
    gearUsed: null, // The strongest set worn in this game: { set, pieces, health, armor, attackPower }
    bags: { contents: {}, overflow: {} }, // What the bags hold, and what did not fit: { itemId: count } each (utils/bags.js)
    bagCapacity: 16, // Slots in the bags: the backpack and the bags bought
    armor: 0, // Takes a share off every hit (utils/stats.js)
    attackPower: 0, // Each point adds one hundredth to an arrow's damage
    victory: false, // The last boss of the side is down: the game is won
    mode: 'normal', // 'normal'; 'boss_rush': nothing but the bosses, back to back; 'boss_fight': the starting zone's boss alone
    bossFightWon: false, // Boss fight: the one boss is down
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
    assetManager.onProgress((progress) => {
        updateLoadingProgress(progress * 0.7); // Reserve 30% for other initialization
    });
    
    // Set up additional asset manager callbacks
    // As each tier of pictures arrives, measure them ahead of their first use (utils/spriteFit.js)
    const measureLoaded = () => measureAhead([...assetManager.assets.values()].filter(asset => asset instanceof HTMLImageElement));
    assetManager.onTier1Ready(measureLoaded);
    
    assetManager.onTier2Ready(() => {
        measureLoaded();
    });
    
    assetManager.onTier3Ready(() => {
        measureLoaded();
    });
    
    // Start loading assets
    assetManager.startLoading();
    
    // Wait for critical assets (Tier 1) before continuing
    await new Promise(resolve => {
        assetManager.onTier1Ready(resolve);
    });
    
    updateLoadingProgress(0.75);
    
    // Initialize player with logical canvas dimensions (supports portrait mode)
    // Get correct canvas dimensions with device-specific fallback
    const canvasWidth = getLogicalCanvasWidth(canvas);
    const canvasHeight = getLogicalCanvasHeight(canvas);
    
    player = new Player(canvasWidth, canvasHeight);
    player.drawMelee = drawMelee;
    player.drawRanged = drawRanged;
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
    // What he wears may answer his arrows: Thunderfury's lightning
    spellSystem.onArrowsFired = thunderfuryStrike;
    
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
    // A guest coming back, or a guest session to bring to the account logged in to
    showGuestSession();
    
    
    // Start game loop
    gameLoop();
    
    // Check for game version updates and prompt refresh if needed
    checkGameVersion();
    
    // Handle iOS-specific audio settings UI
    handleIOSAudioSettings();
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
            updatePotionSlot();
            updateHealthBar(gameState);
        }
    });
}

// Fraction of a simulation step the display is ahead by, used to interpolate rendering
let renderAlpha = 1;

// Main game loop
function gameLoop(now = performance.now()) {
    const frameMs = gameClock.beginFrame(now);
    const probing = perfProbeOn();
    const startedAt = probing ? performance.now() : 0;
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
    const updatedAt = probing ? performance.now() : 0;
    render();
    
    // Debug mode (utils/perfProbe.js): how long this frame took, and where
    if (probing) {
        noteFrame({
            ms: frameMs,
            update: updatedAt - startedAt,
            render: performance.now() - updatedAt,
            playing: gameState.gameRunning && !gameState.showingPauseMenu && !gameState.gamePaused,
        });
    }
    
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
    
    // Boss Rush brings the next boss in itself, and a boss fight its one boss
    if (gameState.mode === 'boss_rush' && !isBossFightActive()) updateBossRush();
    if (gameState.mode === 'boss_fight' && !isBossFightActive() && updateBossFight()) return;
    
    // The goal of the game: with the last boss of the side down, it is won
    if (gameState.mode === 'normal' && !isBossFightActive() && gameState.levelCap === Infinity && !gameState.victory && lastBossIsDown()) {
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
    const onlyBosses = gameState.mode !== 'normal';
    if (!onlyBosses) spawnItems(bulletTimeAdjustedDelta);
    if (!isBossFightActive()) {
        // Out of a boss fight nothing holds him down or opens up his room (utils/movement.js)
        gameState.moveCeiling = null;
        gameState.moveRaise = 0;
        gameState.hooked = null;
    }
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
        const petStance = getSettings().gameplay?.petStance || 'defensive';
        player.pet.update(player, fallingItems, fireballs, canvas, gameConfig.pet, creaturesAbout(), petStance);
        refreshPetSlot(player.pet.kind, petStance);
        
        // A creature it went for is bitten: a share of its health, and knocked back
        const mauled = player.pet.takeMauled();
        if (mauled && mauled.alive) {
            const hunt = gameConfig.pet.hunt;
            const damage = Math.max(1, Math.ceil(mauled.maxHealth * hunt.share));
            const body = mauled.core();
            if (mauled.takeHit(damage, hunt.pushback, gameConfig.creatures.pushback.stagger)) mauled.felled = true;   // Its points and loot with the next step
            combatTexts.push(new CombatText(body.x + body.width / 2, body.y, `Chomp! ${damage}`, '#9FE870', false));
            playSnapSound();
        }
        
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
    // The zone's creatures come at him (after the arrows have moved, so they can strike them)
    updateCreatures({
        gameState, player, canvas, delta: bulletTimeAdjustedDelta, bossFight: isBossFightActive(), spellSystem, fireballs,
        combatTexts, particles, shouldDodge, showDodgeText, trackDodge,
        pickLoot: () => selectRandomItem(gameState),
        popLoot: popCreatureLoot
    });
    // Up close, his weapon (after the creatures have moved, so it strikes where they are)
    updateMelee({ gameState, player, canvas, delta: bulletTimeAdjustedDelta, creatures: creaturesAbout(), combatTexts, particles, onBlow: thunderfuryStrike });
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

// A boss fight, outside the fight itself: before it, the experience the zone's boss waits for,
// so it comes in at once; after it, a moment to see what it dropped, and the game is over.
// Returns true once the game has ended.
function updateBossFight() {
    if (gameState.levelCap === undefined) return false;   // The first step: not yet known who stands
    
    if (gameState.bossDownFor === undefined) {
        gameState.xp = Math.max(gameState.xp || 0, totalXpAtLevel(gameState.levelCap + 1, gameConfig.progression));
        return false;
    }
    
    if (++gameState.bossDownFor < AFTER_LAST_BOSS_STEPS) return false;
    
    gameState.bossFightWon = true;
    endGame();
    return true;
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
async function finishGameNow() {
    const sure = await askConfirm({ title: 'Finish this game now?', text: 'It is recorded with the score you have.', yes: 'Finish it', no: 'Keep playing' });
    if (!sure || !gameState.showingPauseMenu) return;
    
    gameState.showingPauseMenu = false;
    gameState.gamePaused = false;
    endGame();
}

// ----- Hunter sets -----
// Pieces are collected over many games: a logged-in player's are on their account (the site
// hands them over as INPUT_BOOT.user.pieces), and what this game catches counts at once. A
// guest has only what this game gave them.

const WORN_SET_KEY = 'input_worn_set';

// Each hunter has his own things: INPUT_BOOT.user.pieces and .gear are { alliance, horde }.
// These give a side's hunter's own, to read and to add to. (A page from before each hunter had
// his own handed over one list: it is taken as the Alliance hunter's.)
function bySide(user, key, side, empty) {
    let value = user[key];
    if (!value || (value.alliance === undefined && value.horde === undefined)) {
        value = { alliance: value || empty(), horde: empty() };
        user[key] = value;
    }
    if (!value[side]) value[side] = empty();
    return value[side];
}

function accountPieces(side = currentSide()) {
    return bySide(siteBoot.user, 'pieces', side, () => []);
}

function accountGear(side = currentSide()) {
    return bySide(siteBoot.user, 'gear', side, () => ({}));
}

// Everything a side's hunter has that can be worn: the pieces of the sets, and the other gear
// (what the bosses dropped, the weapons and jewellery caught), on the account or in this game
function ownedPieces(side = currentSide()) {
    const user = siteBoot && siteBoot.user ? siteBoot.user : null;
    const owned = new Set(user ? accountPieces(side) : []);
    
    for (const [itemId, count] of Object.entries(user ? accountGear(side) : {})) {
        if (count > 0) owned.add(itemId);
    }
    gameItems.forEach(item => {
        if (item.collected > 0 && (item.type === 'set_piece' || isKeptGear(item.id))) owned.add(item.id);
    });
    // Everyone, guests too, has the clothes his hunter starts in
    Object.values(starterLoadout(side)).forEach(itemId => owned.add(itemId));
    return owned;
}

// The clothes the hunters start in (INPUT_BOOT.gear, from config/gear.php): gear like any other,
// but never carried, counted or sold
function starterItems() {
    return Object.entries(gearCatalog()).filter(([, item]) => item.starter).map(([itemId]) => itemId);
}

function isStarter(itemId) {
    const item = gearCatalog()[itemId];
    return Boolean(item && item.starter);
}

// What a side's hunter starts in: { slotId: itemId } (each piece in the first slot it fits)
function starterLoadout(side) {
    const outfit = {};
    for (const [itemId, item] of Object.entries(gearCatalog())) {
        if (item.starter !== side) continue;
        const slotId = slotsFor({ slot: item.slot }).find(candidate => !outfit[candidate]);
        if (slotId) outfit[slotId] = itemId;
    }
    return outfit;
}

// The side whose hunter is being played, or dressed
function currentSide() {
    return (isPlaying() ? gameState.faction : getFaction()) || gameState.faction || 'alliance';
}

// Each hunter has things of his own: a boss's loot is worn only by its side's hunter, and the
// clothes each starts in only by him (gear.side, from Gear::catalog). The rest is either's.
function wornBy(itemId, side = currentSide()) {
    const item = gearCatalog()[itemId];
    return !item || !item.side || item.side === side;
}

// Of these, what a side's hunter can wear
function forSide(itemIds, side = currentSide()) {
    return new Set([...itemIds].filter(itemId => wornBy(itemId, side)));
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

// ----- What the hunter wears (utils/gear.js) -----
// One item in each slot of the character sheet. A logged-in player's is kept on their account
// (INPUT_BOOT.user.equipment) and saved there when it changes; everyone's is kept in this
// browser too. Putting a whole set on (its key, or its button on the set panel) puts on every
// piece of it that is owned.

const EQUIPMENT_KEY = 'input_equipment';
let equipmentSaveTimer = null;

// What was last being worn in this browser by a side's hunter. Before each hunter had his own
// outfit, one was kept for both: it is each side's then, in its own clothes where it left a
// slot empty (they were drawn on him then, as part of him).
function storedEquipment(side) {
    try {
        const own = JSON.parse(localStorage.getItem(`${EQUIPMENT_KEY}_${side}`));
        if (own) return quiverMoved(own);
        const shared = JSON.parse(localStorage.getItem(EQUIPMENT_KEY));
        return shared ? quiverMoved({ ...starterLoadout(side), ...shared }) : null;
    } catch (e) {
        return null;
    }
}

// What a side's hunter was chosen to wear: on the account ({ alliance, horde }, null for one
// never chosen), or in this browser
function chosenEquipment(side) {
    const account = siteBoot && siteBoot.user ? siteBoot.user.equipment : undefined;
    if (account !== undefined && account !== null) {
        // An account answered in the old shape (one outfit for both)
        const perSide = Object.prototype.hasOwnProperty.call(account, 'alliance') || Object.prototype.hasOwnProperty.call(account, 'horde');
        return perSide ? quiverMoved(account[side]) || null : quiverMoved({ ...starterLoadout(side), ...account });
    }
    return account === null ? null : storedEquipment(side);
}

// An outfit kept in this browser from before the hunters had a weapon to start with has an
// empty hand: the starter weapon goes there, once (an account's outfits were seen to on the
// site). After that an empty hand is the player's choice.
const STARTER_WEAPON_KEY = 'input_starter_weapon_given';
function withStarterWeapon(outfit, side) {
    if (!outfit || hasBank()) return outfit;
    let given = {};
    try {
        given = JSON.parse(localStorage.getItem(STARTER_WEAPON_KEY)) || {};
    } catch (e) {
        return outfit;
    }
    if (given[side]) return outfit;
    try {
        localStorage.setItem(STARTER_WEAPON_KEY, JSON.stringify({ ...given, [side]: true }));
    } catch (e) {
        // Not kept: asked again next time, which does no harm
    }
    const weapon = starterLoadout(side).mainhand;
    return outfit.mainhand || !weapon ? outfit : { ...outfit, mainhand: weapon };
}

const GUEST_REDRESSED_KEY = 'input_guest_redressed';
function markGuestRepaired(side) {
    for (const key of [GUEST_REDRESSED_KEY, STARTER_WEAPON_KEY]) {
        try {
            const done = JSON.parse(localStorage.getItem(key)) || {};
            localStorage.setItem(key, JSON.stringify({ ...done, [side]: true }));
        } catch (e) {
            // Storage unavailable: nothing kept, nothing to repair
        }
    }
}
function guestRedressed(side) {
    try {
        const done = JSON.parse(localStorage.getItem(GUEST_REDRESSED_KEY)) || {};
        if (done[side]) return true;
        localStorage.setItem(GUEST_REDRESSED_KEY, JSON.stringify({ ...done, [side]: true }));
    } catch (e) {
        return true;
    }
    return false;
}

// An outfit with pieces that are not this player's (an account's, kept in this browser and
// played as a guest; something sold): each such slot gets the clothes the hunter starts in,
// rather than leaving him bare. A slot left empty on purpose stays empty, for a player with an
// account.
function withStarterFor(outfit, owned, side) {
    const starter = starterLoadout(side);
    // A guest's outfit kept by this browser may have been left bare by an older version: his
    // empty slots get his starter clothes, once. After that an empty slot is his choice (what
    // he took off stays in his 36).
    const fixed = hasBank() || guestRedressed(side) ? { ...outfit } : { ...starter, ...Object.fromEntries(Object.entries(outfit).filter(([, itemId]) => itemId)) };
    for (const [slotId, itemId] of Object.entries(outfit)) {
        if (itemId && !owned.has(itemId) && starter[slotId]) fixed[slotId] = starter[slotId];
    }
    return fixed;
}

// As a game starts, and when the side changes: what the player chose for that side's hunter to
// wear, as far as they still own it. A hunter never dressed starts in his own clothes and the
// pieces owned of the set last worn.
function restoreEquipment() {
    const side = currentSide();
    const owned = forSide(ownedPieces(), side);
    // A guest who has never chosen has nothing old to put right: the one-time repairs below
    // are done for him from the start, so what he takes off later stays off
    if (!hasBank() && !chosenEquipment(side)) markGuestRepaired(side);
    const chosen = withStarterWeapon(chosenEquipment(side), side);
    
    gameState.equipment = chosen
        ? validEquipment(withStarterFor(chosen, owned, side), wearables(), owned)
        : equipSet(starterLoadout(side), rememberedSet(), wearables(), owned);
    // His 36: what he wears first, then what he chose to take (a guest has no bank: everything
    // he has is with him). Only what he carries can be worn.
    gameState.carried = carriedOf(hasBank() ? chosenCarried(side) : null, countedOf(Object.values(gameState.equipment)), countedOf(owned), gameConfig.bags.carry);
    gameState.equipment = validEquipment(gameState.equipment, wearables(), withStarter(gameState.carried));
    // What he keeps in his bags: his, and neither worn nor in his 36
    gameState.bagged = chosenBagGear(side).filter(itemId => owned.has(itemId) && !gameState.carried.includes(itemId));
    gameState.wornSet = mainSet(gameState.equipment, wearables(), gameConfig.sets) || rememberedSet();
    refreshSetBonus();
}

// The gear a side's hunter keeps in his bags besides his 36 (INPUT_BOOT.user.bagGear)
function chosenBagGear(side) {
    const saved = siteBoot && siteBoot.user && siteBoot.user.bagGear ? siteBoot.user.bagGear[side] : null;
    return Array.isArray(saved) ? [...new Set(saved)] : [];
}

// Slots free in the bags between games, after what is in them and the gear kept there
function freeBagSlots() {
    const user = siteBoot && siteBoot.user;
    const capacity = bagCapacity(gameConfig.bags, user && user.bags ? user.bags : []);
    return Math.max(0, capacity - slotsUsed(bagContents(), gameConfig.bags.stack) - (gameState.bagged || []).length);
}

// ----- Where a piece of gear is: on him, in his 36, in his bags, or in the bank -----
// Between games only. What he wears takes no room; his 36 hold what he carries besides it; a
// piece in his bags takes a slot there that a stack of materials could have; the bank holds the
// rest. Each returns what went wrong, in words, or ''.
function gearPlace(itemId) {
    if (Object.values(gameState.equipment).includes(itemId)) return 'worn';
    if (gameState.carried.includes(itemId)) return '36';
    if ((gameState.bagged || []).includes(itemId)) return 'bags';
    return 'bank';
}

function takeOffPiece(equipment, itemId) {
    return Object.fromEntries(Object.entries(equipment).filter(([, worn]) => worn !== itemId));
}

function afterGearMoved() {
    gameState.equipment = validEquipment(gameState.equipment, wearables(), withStarter(gameState.carried));
    gameState.wornSet = mainSet(gameState.equipment, wearables(), gameConfig.sets) || gameState.wornSet;
    refreshSetBonus();
    dressHunter();
    saveEquipment();
}

function moveGear(itemId, to) {
    if (isPlaying()) return 'Gear is moved between games.';
    if (!hasBank()) return 'Log in to keep gear.';
    const from = gearPlace(itemId);
    if (from === to) return '';
    const worn = Object.values(gameState.equipment);
    if (to === '36' && from !== 'worn' && inHis36(gameState.carried, worn) >= gameConfig.bags.carry) {
        return `His ${gameConfig.bags.carry} are full.`;
    }
    if (to === 'bags' && freeBagSlots() < 1) return 'Your bags are full.';

    if (from === 'worn') gameState.equipment = takeOffPiece(gameState.equipment, itemId);
    if (from === 'bags') gameState.bagged = gameState.bagged.filter(id => id !== itemId);
    if (to !== '36' && to !== 'worn') gameState.carried = gameState.carried.filter(id => id !== itemId);
    if (to === '36' && !gameState.carried.includes(itemId)) gameState.carried = [...gameState.carried, itemId];
    if (to === 'bags') gameState.bagged = [...(gameState.bagged || []), itemId];
    afterGearMoved();
    return '';
}

// Put on a piece from his 36 or his bags: into a free slot it fits, else in place of what is
// in its first slot. What it replaces takes its place: in his 36, or its slot in the bags.
function wearGear(itemId) {
    if (isPlaying()) return 'Gear is put on between games, or from the character sheet.';
    const item = wearableById(itemId);
    const slots = item ? slotsFor(item) : [];
    if (!slots.length) return 'That cannot be worn.';
    const from = gearPlace(itemId);
    if (from === 'worn') return '';
    if (from !== '36' && from !== 'bags') return 'Only what is in his 36 or his bags is put on here.';
    const slotId = slots.find(slot => !gameState.equipment[slot]) || slots[0];
    const replaced = gameState.equipment[slotId];
    if (from === 'bags') {
        gameState.bagged = replaced
            ? gameState.bagged.map(id => (id === itemId ? replaced : id))
            : gameState.bagged.filter(id => id !== itemId);
        gameState.carried = [...gameState.carried.filter(id => id !== replaced), itemId];
    }
    gameState.equipment = equip(gameState.equipment, slotId, item, wearables());
    afterGearMoved();
    return '';
}

// Everything he wears into the bags, as much as fits, to undress him quickly
function wornToBags() {
    if (isPlaying()) return 'Gear is moved between games.';
    const worn = [...new Set(Object.values(gameState.equipment))];
    let moved = 0;
    for (const itemId of worn) {
        if (freeBagSlots() < 1) break;
        gameState.equipment = takeOffPiece(gameState.equipment, itemId);
        gameState.carried = gameState.carried.filter(id => id !== itemId);
        gameState.bagged = [...(gameState.bagged || []), itemId];
        moved++;
    }
    afterGearMoved();
    if (moved < worn.length) {
        const left = worn.length - moved;
        return moved === 0 ? 'Your bags are full.' : `${left} ${left === 1 ? 'piece' : 'pieces'} did not fit in your bags and stayed on him.`;
    }
    return '';
}

// A worn piece and one in his 36 or his bags trade places: that one goes on, this one takes
// its place
function switchGear(wornId, otherId) {
    if (isPlaying()) return 'Gear is moved between games.';
    const slotId = Object.keys(gameState.equipment).find(slot => gameState.equipment[slot] === wornId);
    const other = wearableById(otherId);
    if (!slotId || !other || !slotsFor(other).includes(slotId)) return 'That does not go where it is worn.';
    const from = gearPlace(otherId);
    if (from === 'bags') {
        gameState.bagged = gameState.bagged.map(id => (id === otherId ? wornId : id));
        gameState.carried = [...gameState.carried.filter(id => id !== wornId), otherId];
    } else if (from !== '36') {
        return 'Only what is in his 36 or his bags can be switched in.';
    }
    gameState.equipment = equip(takeOffPiece(gameState.equipment, wornId), slotId, other, wearables());
    afterGearMoved();
    return '';
}

// What a side's hunter was chosen to carry (INPUT_BOOT.user.carried, { alliance, horde }), or
// null if never: a list from before each hunter carried his own is both's
function chosenCarried(side) {
    const saved = siteBoot && siteBoot.user ? siteBoot.user.carried : null;
    if (!saved) return null;
    if (Array.isArray(saved)) return saved;
    return Array.isArray(saved[side]) ? saved[side] : null;
}

// What counts towards what a hunter carries: all his gear, the clothes he starts in too
function countedOf(itemIds) {
    return [...itemIds];
}

// What this side's hunter can wear of what he carries (only what he carries can be worn)
function withStarter(carried) {
    return forSide([...carried]);
}

// ----- What the hunter carries (carriedOf in utils/gear.js) -----
// A player with an account owns more than a hunter can take into a game: gameConfig.bags.carry
// pieces go with him, what he wears among them, and the rest stays in the bank. Between games
// anything owned can be put on, if there is room to carry it, and the inventory says what is
// taken and what is left. In a game only what was taken can be put on, and what is caught in
// that game. A guest owns only what the game they are playing gave them, so none of this
// applies.
function hasBank() {
    return Boolean(siteBoot && siteBoot.user);
}

function isPlaying() {
    return Boolean(gameState.gameRunning || gameState.showingPauseMenu);
}

// What was caught in this game and can be worn
function caughtGear() {
    return gameItems.filter(item => item.collected > 0 && (item.type === 'set_piece' || isKeptGear(item.id))).map(item => item.id);
}

// What can be put on right now, by this side's hunter
function availablePieces() {
    const owned = ownedPieces();
    if (!hasBank() || !isPlaying()) return forSide(owned);
    
    return forSide([...gameState.carried.filter(itemId => owned.has(itemId)), ...caughtGear()]);
}

// Why this cannot be worn now, in words, or '' when it can: between games there must be room
// to carry what is put on
function noRoomFor(equipment) {
    if (!hasBank() || isPlaying()) return '';
    
    const worn = countedOf(Object.values(validEquipment(equipment, wearables(), ownedPieces())));
    return fitsCarried(gameState.carried, worn, gameConfig.bags.carry)
        ? ''
        : `Your hunter already carries ${gameConfig.bags.carry} things. Leave something in the bank to make room.`;
}

// Take things along, or leave them in the bank (which takes them off), several at once: what
// is taken goes in while there is room. Returns what went wrong, in words, or ''.
function carryMany(itemIds, take) {
    if (isPlaying()) return 'What the hunter carries is chosen between games.';
    
    const limit = gameConfig.bags.carry;
    let carried = [...gameState.carried];
    let moved = 0;
    let keptOn = 0;
    
    if (take) {
        const owned = forSide(ownedPieces());
        const worn = Object.values(gameState.equipment);
        for (const itemId of itemIds) {
            if (inHis36(carried, worn) >= limit) break;
            if (owned.has(itemId) && !carried.includes(itemId)) {
                carried.push(itemId);
                moved++;
            }
        }
    } else {
        // What he wears stays on him: it is taken off on its own, never by leaving things in the
        // bank (picking all of "with your hunter" picks what he wears too)
        const worn = new Set(Object.values(gameState.equipment));
        const leaving = new Set(itemIds.filter(itemId => !worn.has(itemId)));
        keptOn = itemIds.length - leaving.size;
        moved = carried.filter(itemId => leaving.has(itemId)).length;
        carried = carried.filter(itemId => !leaving.has(itemId));
    }
    
    gameState.carried = carried;
    gameState.equipment = validEquipment(gameState.equipment, wearables(), withStarter(gameState.carried));
    gameState.wornSet = mainSet(gameState.equipment, wearables(), gameConfig.sets) || gameState.wornSet;
    refreshSetBonus();
    saveEquipment();
    
    if (!take && keptOn > 0) {
        return `${keptOn === 1 ? 'What he wears stays' : `The ${keptOn} pieces he wears stay`} on him: take ${keptOn === 1 ? 'it' : 'them'} off first to leave ${keptOn === 1 ? 'it' : 'them'} in the bank.`;
    }
    if (take && moved < itemIds.length) {
        return moved === 0
            ? `Your hunter already carries ${limit} things. Leave something first.`
            : `Took ${moved} of ${itemIds.length}: your hunter carries ${limit} things at most.`;
    }
    return '';
}

// Keep what is worn: in this browser at once, on the account a moment later (so a string of
// changes on the sheet is one request)
function saveEquipment() {
    const side = currentSide();
    // What binds when worn is his now (the site does the same when it is saved)
    if (siteBoot && siteBoot.user) {
        const bound = { ...sideOf(siteBoot.user.bound, side) };
        for (const itemId of Object.values(gameState.equipment)) {
            const item = gearCatalog()[itemId];
            if (item && item.binding === 'equip') bound[itemId] = Math.max(bound[itemId] || 0, 1);
        }
        setSideOf('bound', side, bound);
    }
    try {
        // A guest's outfit is kept in this browser; an account's on the site only
        if (!(siteBoot && siteBoot.user)) localStorage.setItem(`${EQUIPMENT_KEY}_${side}`, JSON.stringify(gameState.equipment));
        localStorage.setItem(WORN_SET_KEY, gameState.wornSet);
    } catch (e) {
        // Storage unavailable: worn for this game
    }
    
    if (!(siteBoot && siteBoot.user && siteBoot.urls && siteBoot.urls.equipment)) return;
    
    const outfits = siteBoot.user.equipment && (siteBoot.user.equipment.alliance !== undefined || siteBoot.user.equipment.horde !== undefined)
        ? siteBoot.user.equipment
        : { alliance: chosenEquipment('alliance'), horde: chosenEquipment('horde') };
    siteBoot.user.equipment = { ...outfits, [side]: { ...gameState.equipment } };
    siteBoot.user.carried = {
        alliance: chosenCarried('alliance'),
        horde: chosenCarried('horde'),
        [side]: [...gameState.carried],
    };
    siteBoot.user.bagGear = { alliance: chosenBagGear('alliance'), horde: chosenBagGear('horde'), [side]: [...(gameState.bagged || [])] };
    clearTimeout(equipmentSaveTimer);
    equipmentSaveTimer = setTimeout(() => {
        fetch(siteBoot.urls.equipment, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            keepalive: true,
            body: JSON.stringify({ equipment: gameState.equipment, side, carried: gameState.carried, hidden: [...hiddenGear(side)], bagged: gameState.bagged || [] })
        }).catch(() => { /* Kept in this browser; saved with the next change */ });
    }, 600);
}

// ----- Gear worn but not seen -----
// Any piece can be hidden from the hunter's picture on the character sheet: he still wears it
// and it still counts, it is only not drawn on him. Each hunter has his own, kept on the
// account (INPUT_BOOT.user.hidden) and in this browser, by item, so a hidden piece stays
// hidden when it is put on again.
const HIDDEN_KEY = 'input_hidden_gear';

// What a guest wears and hides is kept in this browser. Older versions kept an account's
// there too, and a guest playing in the same browser afterwards was dressed and hidden as the
// account was: logged in, those copies are forgotten.
function forgetGuestLooks() {
    if (!(siteBoot && siteBoot.user)) return;
    try {
        for (const side of ['alliance', 'horde']) {
            localStorage.removeItem(`${EQUIPMENT_KEY}_${side}`);
            localStorage.removeItem(`${HIDDEN_KEY}_${side}`);
        }
        localStorage.removeItem(EQUIPMENT_KEY);
    } catch (e) {
        // Storage unavailable: nothing kept to forget
    }
}
forgetGuestLooks();

function hiddenGear(side = currentSide()) {
    const account = siteBoot && siteBoot.user && siteBoot.user.hidden;
    if (account) return new Set(account[side] || []);
    try {
        return new Set(JSON.parse(localStorage.getItem(`${HIDDEN_KEY}_${side}`)) || []);
    } catch (e) {
        return new Set();
    }
}

function setHidden(itemId, hide) {
    const side = currentSide();
    const hidden = hiddenGear(side);
    if (hide) hidden.add(itemId); else hidden.delete(itemId);
    if (siteBoot && siteBoot.user) {
        siteBoot.user.hidden = { alliance: [], horde: [], ...(siteBoot.user.hidden || {}), [side]: [...hidden] };
    }
    // A guest's is kept in this browser; an account's on the site only (see forgetGuestLooks)
    if (!(siteBoot && siteBoot.user)) {
        try {
            localStorage.setItem(`${HIDDEN_KEY}_${side}`, JSON.stringify([...hidden]));
        } catch (e) {
            // Storage unavailable: hidden for now
        }
    }
    dressHunter();
    saveEquipment();
}

// Wear this. Anything that cannot be worn (not owned, in the wrong slot) is left out.
function setEquipment(equipment) {
    gameState.equipment = validEquipment(equipment, wearables(), availablePieces());
    // Between games what is put on is taken along (the callers have seen to it that there is
    // room); what is no longer owned is no longer carried
    if (hasBank() && !isPlaying()) {
        gameState.carried = carriedOf(gameState.carried, countedOf(Object.values(gameState.equipment)), countedOf(forSide(ownedPieces())), gameConfig.bags.carry);
        gameState.equipment = validEquipment(gameState.equipment, wearables(), withStarter(gameState.carried));
    }
    gameState.wornSet = mainSet(gameState.equipment, wearables(), gameConfig.sets) || gameState.wornSet;
    refreshSetBonus();
    saveEquipment();
}

// What everything being worn gives now
function refreshSetBonus() {
    gameState.setBonus = gearTotals(gameState.equipment, wearables(), gameConfig.sets);
    // The quiver holds what the one worn holds; arrows it no longer holds go into the bags
    const capacity = quiverCapacity(gameConfig.quiver, hasLargeQuiver());
    if (capacity !== gameState.quiverCapacity) {
        gameState.quiverCapacity = capacity;
        if (gameState.arrowCount > capacity) {
            const over = gameState.arrowCount - capacity;
            gameState.arrowCount = capacity;
            if (gameState.gameRunning && gameState.keepInBags) gameState.keepInBags('arrows', over);
        }
    }
    dragonstalkerCache.lastUpdate = 0;  // The panel shows it at once
    
    // The hunter's stats follow what he wears (utils/stats.js). Health keeps its proportion,
    // so changing gear neither heals nor hurts.
    gameState.armor = gameState.setBonus.armor;
    gameState.attackPower = gameState.setBonus.attackPower;
    
    if (gameState.gameRunning) noteGearUsed();
    const maxHealth = gameConfig.player.maxHealth + gameState.setBonus.health;
    if (maxHealth !== gameState.maxHealth) {
        gameState.health = healthAtNewMax(gameState.health, gameState.maxHealth, maxHealth);
        gameState.maxHealth = maxHealth;
    }
    
    refreshCharacterSheet();
    refreshSetSwitch();
    dressHunter();
}

// ----- The hunter's picture (utils/hunterLooks.js) -----
// Put together from what he wears whenever that changes, and used everywhere he is drawn: in
// play, on the character sheet, in the inventory and at the end of a game. Until it is ready
// the side's own drawing stands in.
let lookUrl = null;         // The picture as an address, for the windows' <img>s
let lookFor = '';           // What it shows: "side|items"

function dressHunter() {
    const side = currentSide();
    // What he wears, less what is not to be seen
    const hidden = hiddenGear(side);
    const seen = Object.fromEntries(Object.entries(gameState.equipment).filter(([, itemId]) => !hidden.has(itemId)));
    const wanted = `${side}|${Object.values(seen).sort().join(',')}`;
    // And as he fights hand to hand, if he can in this (systems/meleeSystem.js)
    dressForMelee(side, seen);
    if (wanted === lookFor) return;
    lookFor = wanted;
    
    hunterPicture(side, seen).then(canvas => {
        // Something else was put on meanwhile: that picture is on its way
        if (lookFor !== wanted) return;
        if (gameState.faction === side || !gameState.gameRunning) {
            player.setCharacter(side);
            player.setPicture(canvas);
        }
        canvas.toBlob(blob => {
            if (!blob || lookFor !== wanted) return;
            if (lookUrl) URL.revokeObjectURL(lookUrl);
            lookUrl = URL.createObjectURL(blob);
            refreshCharacterSheet();
            refreshInventory();
        }, 'image/webp', 0.9);
    }).catch(() => {
        // The art could not be had: he keeps the drawing he has
        lookFor = '';
    });
}

// The hunter as he looks now, for an <img>
function hunterImage() {
    return lookUrl || characterFor(currentSide()).image;
}

// The strongest gear worn in this game is handed in with its score: the leaderboard says how
// a score was made. Strongest, so that changing down at the end does not hide it. It is named
// after the set most of it belongs to.
function noteGearUsed() {
    const strength = gear => gear ? gear.health + gear.armor + gear.attackPower : 0;
    const set = mainSet(gameState.equipment, wearables(), gameConfig.sets);
    const worn = {
        set,
        pieces: set ? setsWorn(gameState.equipment, wearables())[set] : 0,
        health: gameState.setBonus.health,
        armor: gameState.setBonus.armor,
        attackPower: gameState.setBonus.attackPower,
    };
    
    if (worn.pieces > 0 && strength(worn) > strength(gameState.gearUsed)) {
        gameState.gearUsed = worn;
    }
    return gameState.gearUsed;
}

// A piece was just caught: it goes on at once if it belongs to the set being worn, or if
// nothing is in its slot
// Gear caught goes with the hunter (the site does the same as the game ends): put on at once
// if a slot of his is free (worn, it takes no room), else into his 36 while there is room.
// True if he has it with him now; else it waits in the bank (a guest, who has none, leaves it
// behind), and is not put on, since only what he carries can be worn.
function carryCaught(itemId) {
    if (gameState.carried.includes(itemId)) return true;
    const item = wearableById(itemId);
    const goesOn = Boolean(item) && slotsFor(item).some(slotId => !gameState.equipment[slotId]);
    if (!goesOn && inHis36(gameState.carried, Object.values(gameState.equipment)) >= gameConfig.bags.carry) {
        const name = (wearableById(itemId) || {}).name || 'It';
        // His 36 are full: into his bags, a slot of them, while there is one free
        const bagged = gameState.bagged || [];
        const free = isPlaying()
            ? gameState.bagCapacity - slotsUsed(gameState.bags.contents, gameConfig.bags.stack)
            : freeBagSlots();
        if (hasBank() && !bagged.includes(itemId) && free > 0) {
            gameState.bagged = [...bagged, itemId];
            keepCarried();
            if (isPlaying()) gameState.bagCapacity -= 1;
            addNotification(gameState, `${name}: his ${gameConfig.bags.carry} are full, so it went into a bag (one slot)`, 300, '#E6B0FF');
            refreshInventory();
            return false;
        }
        addNotification(gameState, hasBank()
            ? `${name} is in your bank: your hunter carries ${gameConfig.bags.carry} things already`
            : `${name} is left behind: your hunter carries ${gameConfig.bags.carry} things already`, 300, '#FFB347');
        return false;
    }
    gameState.carried = [...gameState.carried, itemId];
    keepCarried();
    refreshInventory();
    return true;
}

// What he carries and keeps in his bags, as the next game starts with it (restoreEquipment reads
// it back): what was caught goes along to the next game, and is not left out of his 36 when it
// is next saved. The site has it already (it puts what is caught in his 36 itself).
function keepCarried() {
    if (!(siteBoot && siteBoot.user)) return;
    const side = currentSide();
    siteBoot.user.carried = { alliance: chosenCarried('alliance'), horde: chosenCarried('horde'), [side]: [...gameState.carried] };
    siteBoot.user.bagGear = { alliance: chosenBagGear('alliance'), horde: chosenBagGear('horde'), [side]: [...(gameState.bagged || [])] };
}

function wearCaughtPiece(item) {
    const emptySlot = slotsFor(item).find(slotId => !gameState.equipment[slotId]);
    const slotId = item.set === gameState.wornSet ? (emptySlot || slotsFor(item)[0]) : emptySlot;
    // Into an empty slot only if nothing else comes off for it: the off hand is empty beside a
    // weapon held in both hands, and an off-hand caught must not take that weapon off him (a
    // piece of the set he wears may take the place of what is in its own slot, as ever)
    const wearing = Object.values(gameState.equipment);
    const after = slotId ? Object.values(equip(gameState.equipment, slotId, item, wearables())) : [];
    const replaced = slotId && slotId !== emptySlot ? gameState.equipment[slotId] : null;
    const takesOff = wearing.some(itemId => itemId !== replaced && !after.includes(itemId));
    
    if (slotId && !takesOff && !wearing.includes(item.id)) {
        setEquipment(equip(gameState.equipment, slotId, item, wearables()));
        // Say so, and where it can be changed
        const sheetKey = keyName('character') || 'C';
        addNotification(gameState, `${item.name} is on: change it on the character sheet (${sheetKey})`, 360, '#9FE870');
    } else {
        refreshSetBonus();
    }
}

// ----- Sets of the player's own -----
// What is worn saved under a name, to put on again in one press: on the character sheet's
// "Your sets", and in play with their keys (1 to 4 unless the player changed them) or the
// buttons on the set panel. Each hunter keeps his own, as he keeps his own loot. On an account
// they are kept there (INPUT_BOOT.user.outfits, { alliance: [...], horde: [...] }); a guest's in
// this browser. A saved set is kept as it was: putting it on takes only what is owned and, in
// a game, carried.
const OUTFITS_KEY = 'input_outfits';
const MOST_OUTFITS = 4;
const OUTFIT_KEYS = ['set_1', 'set_2', 'set_3', 'set_4'];

// A side's sets. (Saved before each hunter had his own, one list was kept: it is the Alliance
// hunter's, as the loot of then is.)
function outfits(side = currentSide()) {
    if (hasBank()) {
        const saved = siteBoot.user.outfits;
        if (Array.isArray(saved)) return side === 'alliance' ? saved : [];
        return saved && Array.isArray(saved[side]) ? saved[side] : [];
    }
    try {
        const own = JSON.parse(localStorage.getItem(`${OUTFITS_KEY}_${side}`) || 'null');
        if (Array.isArray(own)) return own;
        const shared = side === 'alliance' ? JSON.parse(localStorage.getItem(OUTFITS_KEY) || '[]') : [];
        return Array.isArray(shared) ? shared : [];
    } catch (e) {
        return [];
    }
}

function keepOutfits(list, side = currentSide()) {
    if (hasBank()) {
        const saved = siteBoot.user.outfits;
        const both = Array.isArray(saved) ? { alliance: saved, horde: [] } : { alliance: [], horde: [], ...(saved || {}) };
        siteBoot.user.outfits = { ...both, [side]: list };
        if (siteBoot.urls && siteBoot.urls.outfits) {
            fetch(siteBoot.urls.outfits, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
                credentials: 'same-origin',
                body: JSON.stringify({ side, outfits: list })
            }).catch(() => { /* Kept for this visit; saved with the next change */ });
        }
    } else {
        try {
            localStorage.setItem(`${OUTFITS_KEY}_${side}`, JSON.stringify(list));
        } catch (e) {
            // Storage unavailable: kept for this visit
        }
    }
    refreshSetSwitch();
}

// The same things in the same slots
function sameEquipment(a, b) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every(slotId => (a[slotId] || null) === (b[slotId] || null));
}

// What of a saved set can be put on now
function wearableOf(outfit) {
    return validEquipment(quiverMoved(outfit.equipment || {}), wearables(), availablePieces());
}

// For the sheet: each set's name, how many of its pieces can be put on now, whether it is
// on, and whether what is worn now differs from what it keeps (so saving it changes it)
function outfitsForSheet() {
    return outfits().map(outfit => {
        const wearable = wearableOf(outfit);
        return {
            name: outfit.name,
            pieces: Object.keys(wearable).length,
            isOn: sameEquipment(wearable, gameState.equipment) && Object.keys(wearable).length > 0,
            isSaved: sameEquipment(outfit.equipment || {}, gameState.equipment),
        };
    });
}

// Put a saved set on: what of it can be worn, in place of everything worn now
function wearOutfit(index, announce = false) {
    const outfit = outfits()[index];
    if (!outfit) return '';
    
    const wanted = wearableOf(outfit);
    const refused = noRoomFor(wanted);
    if (refused) return refused;
    
    setEquipment(wanted);
    dragonstalkerCache.lastUpdate = 0;
    if (announce) {
        const gives = bonusText(gameState.setBonus);
        addNotification(gameState, `Wearing ${outfit.name}${gives ? `: ${gives}` : ''}`, 240, '#C77DFF');
    }
    return '';
}

// What is worn now, kept as a new set
function saveOutfit(name) {
    const list = outfits();
    if (list.length >= MOST_OUTFITS) return `You keep ${MOST_OUTFITS} sets: forget one to save another.`;
    
    keepOutfits([...list, { name, equipment: { ...gameState.equipment } }]);
    return '';
}

// What is worn now, kept in a set saved before (in place of what it kept)
function updateOutfit(index) {
    const list = outfits();
    if (!list[index]) return '';
    
    keepOutfits(list.map((outfit, at) => (at === index ? { ...outfit, equipment: { ...gameState.equipment } } : outfit)));
    return '';
}

function renameOutfit(index, name) {
    const list = outfits();
    if (!list[index] || !name) return;
    
    keepOutfits(list.map((outfit, at) => (at === index ? { ...outfit, name } : outfit)));
}

function deleteOutfit(index) {
    keepOutfits(outfits().filter((outfit, at) => at !== index));
}

// In play: the next saved set in order, for the tap on the set panel, or the next of the first
// three for its key (T in the layout with the shots on 1, 2, 3)
function wearNextOutfit(among = MOST_OUTFITS) {
    const list = outfitsForSheet().slice(0, among);
    if (list.length === 0) return;
    const on = list.findIndex(outfit => outfit.isOn);
    wearOutfit((on + 1) % list.length, true);
}

// The set panel's buttons: one for each saved set, with its key; the one on is lit. Made again
// only when the sets or what is worn change.
let setSwitchShows = '';
function refreshSetSwitch() {
    const holder = document.getElementById('setSwitch');
    if (!holder) return;
    
    const list = outfitsForSheet();
    const shows = JSON.stringify(list.map(outfit => [outfit.name, outfit.isOn])) + OUTFIT_KEYS.map(keyName).join();
    if (shows === setSwitchShows) return;
    setSwitchShows = shows;
    
    holder.textContent = '';
    holder.hidden = list.length === 0;
    list.forEach((outfit, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = outfit.isOn ? 'set-switch-btn is-worn' : 'set-switch-btn';
        button.setAttribute('aria-pressed', String(outfit.isOn));
        button.title = `Wear ${outfit.name}`;
        const key = document.createElement('span');
        key.className = 'set-switch-key';
        key.textContent = keyName(OUTFIT_KEYS[index]);
        const name = document.createElement('span');
        name.className = 'set-switch-name';
        name.textContent = outfit.name;
        button.append(key, name);
        button.addEventListener('click', event => {
            event.stopPropagation();
            if (gameState.currentScreen === 'game') wearOutfit(index, true);
        });
        holder.append(button);
    });
}

// The Close of the character sheet and the inventory, as on the game's other screens: shut
// them and every menu, and go on with the game if one is under way (their Back goes to where
// they were opened from: the pause menu, or the map)
function closeWindowsAndResume() {
    if (isCharacterSheetOpen()) closeCharacterSheet();
    if (isInventoryOpen()) closeInventory();
    
    if (gameState.showingPauseMenu && gameState.health > 0) {
        hidePauseMenu();
        menuScreenManager.hideAll();
        gameState.currentScreen = 'game';
        updateMobilePauseButtonVisibility();
        updateCanvasOverlay();
    }
}

// Open the inventory. In a game the game is paused while it is open, and goes on when it is
// closed, unless it was opened from the pause menu, which it then goes back to.
function showInventory(onTab = null) {
    // Before the first game what is owned has not been put on yet: what is worn is shown
    // in the gear list, and selling must not save an empty hunter over the one chosen
    enterHunterWindow();
    openInventory(leaveHunterWindow, onTab);
    // Opened from the character sheet: in its place
    if (isCharacterSheetOpen()) closeCharacterSheet();
}

// Buy a bag with coins. Resolves to what went wrong, in words, or '' when it is bought.
async function buyBag(size) {
    try {
        const response = await fetch(siteBoot.urls.bags, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            body: JSON.stringify({ size })
        });
        const result = await response.json();
        
        if (!response.ok) return result.message || 'The bag could not be bought.';
        
        siteBoot.user.bags = result.bags;
        siteBoot.user.coins = result.coins;
        renderAccountBar();
        return '';
    } catch (e) {
        return 'The bag could not be bought: no answer from the site.';
    }
}

// Sell gear for coins. Resolves to what went wrong, in words, or '' when it is sold.
async function sellGear(itemId, count) {
    try {
        const response = await fetch(siteBoot.urls.sell, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            body: JSON.stringify({ item: itemId, count, side: currentSide() })
        });
        const result = await response.json();
        
        if (!response.ok) return result.message || 'It could not be sold.';
        
        accountGear(result.side || currentSide());
        siteBoot.user.gear[result.side || currentSide()] = result.gear;
        siteBoot.user.coins = result.coins;
        siteBoot.user.equipment = result.equipment;
        renderAccountBar();
        // The last one sold is no longer worn
        setEquipment(gameState.equipment);
        return '';
    } catch (e) {
        return 'It could not be sold: no answer from the site.';
    }
}

// Open the character sheet. Over the starting window it shows what a game will start in. In
// a game the game is paused while it is open, and goes on when it is closed, unless it was
// opened from the pause menu, which it then goes back to.
// The hunter's window is the character sheet and the inventory: its tabs go from one to the
// other, and its Back goes to where the window was first opened from, whichever tab it is on.
// 'game' (opened in play: the game goes on), 'pause' or 'map'.
let hunterWindowFrom = 'map';

// Opening the hunter's window from outside it: remember where from, and pause a game in play
function enterHunterWindow() {
    if (isCharacterSheetOpen() || isInventoryOpen()) return;
    // Before the first game what is owned has not been put on yet
    if (!gameState.gameRunning && !gameState.showingPauseMenu) restoreEquipment();
    const fromPlay = gameState.gameRunning && !gameState.showingPauseMenu && gameState.currentScreen === 'game';
    hunterWindowFrom = fromPlay ? 'game' : (gameState.showingPauseMenu ? 'pause' : 'map');
    if (fromPlay) showPauseMenu();
}

// Where Back goes, in words, under it
function hunterBackWhere() {
    return { game: 'to the game', pause: 'to the pause menu', map: 'to the map' }[hunterWindowFrom];
}

// Leaving the hunter's window (not for its other tab): back into a game it was opened in
function leaveHunterWindow() {
    if (isCharacterSheetOpen() || isInventoryOpen()) return;
    if (hunterWindowFrom === 'game' && gameState.showingPauseMenu) hidePauseMenu();
}

function showCharacterSheet() {
    enterHunterWindow();
    openCharacterSheet(leaveHunterWindow);
    // The key of the sheet closes the inventory first
    if (isInventoryOpen()) closeInventory();
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
            // Each side's hunter has his own outfit
            if (!isPlaying()) restoreEquipment();
            document.querySelectorAll('#factionPicker input[name="faction"]').forEach(option => {
                option.checked = option.value === faction;
            });
            renderStartZonePicker(faction);
            const startZone = document.getElementById('startZone');
            if (startZone) startZone.value = open && zone > 1 ? String(zone) : '1';
            // A boss fight is offered for a place whose boss the player has beaten
            renderGameModePicker(faction, open ? zone : 1);
            
            // The picture of the place, behind the menu
            showBackgroundForLevel((zone - 1) * gameConfig.backgrounds.levelsPerBackground, true);
        }
    });
}

// The large quiver: an item (a boss drop, found once), worn in the quiver slot. While it is on
// the quiver holds more ("quiverSlots" on the item, quiver.bonusSlots in config/gameConfig.js).
const LARGE_QUIVER = 'ancient-sinew-wrapped-lamina';

function hasLargeQuiver() {
    const item = gameState.equipment && gameState.equipment.quiver ? wearableById(gameState.equipment.quiver) : null;
    return Boolean(item && item.quiverSlots);
}

// An outfit saved when quivers were worn on the back: the quiver there is in the quiver slot
// now, unless that has one already (Gear::quiverMoved on the site)
function quiverMoved(outfit) {
    if (!outfit || !outfit.back) return outfit;
    const item = wearableById(outfit.back);
    if (!item || item.slot !== 'quiver') return outfit;
    const { back, ...rest } = outfit;
    return rest.quiver ? rest : { ...rest, quiver: back };
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
    gameState.hasteTimer = 0;
    gameState.speedIncreaseMultiplier = 1.0;
    gameState.currentSpeedIncreasePercent = 0;
    dropShield(gameState);
    
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
    gameState.specialHits = {};
    gameState.hooked = null;
    
    // The quiver: some of its slots filled, and bigger for a player who has found the large one.
    // A boss fight has no zone before it to gather arrows in, so it starts with the quiver full.
    gameState.quiverCapacity = quiverCapacity(gameConfig.quiver, hasLargeQuiver());
    gameState.arrowCount = Math.min(gameState.quiverCapacity, startingArrows(gameConfig.quiver, gameState.mode === 'boss_fight'));
    
    // Boss Rush: the first boss comes in after a moment
    gameState.rushPause = 60;
    gameState.rushComplete = false;
    gameState.bossFightWon = false;
    gameState.gearUsed = null;
    gameState.bossDownFor = undefined;
    gameState.victory = false;
    gameState.afterLastBoss = 0;
    gameState.levelCap = undefined;
    
    // The set worn last time is worn again, with what its owned pieces give
    restoreEquipment();
    gameState.coins = 0;
    emptyBags();
    // Spare arrows kept in the bags fill the quiver
    topUpQuiver();
    gameState.bossLoot = [];
    
    // Reset bullet time system
    gameState.bulletTimeActive = false;
    gameState.bulletTimeMultiplier = 1.0;
    gameState.bulletTimeVisualTimer = 0;
    
    // Clear buffs and arrays
    clearAllBuffs();
    clearHudNotifications();
    fallingItems = [];
    resetCreatures();
    resetFrostTraps();
    resetHudPanels();
    resetMelee();
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
    // ...dressed as he is
    lookFor = '';
    dressHunter();
    
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
    gameState.hasteTimer = 0;
    gameState.speedIncreaseMultiplier = 1.0;
    gameState.currentSpeedIncreasePercent = 0;
    gameState.timeSlowActive = false;
    gameState.timeSlowTimer = 0;
    gameState.timeSlowMultiplier = 1.0;
    gameState.freezeTimeActive = false;
    gameState.freezeTimeTimer = 0;
    dropShield(gameState);
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
    gameState.specialHits = {};
    gameState.hooked = null;
    
    // The quiver: some of its slots filled, and bigger for a player who has found the large one.
    // A boss fight has no zone before it to gather arrows in, so it starts with the quiver full.
    gameState.quiverCapacity = quiverCapacity(gameConfig.quiver, hasLargeQuiver());
    gameState.arrowCount = Math.min(gameState.quiverCapacity, startingArrows(gameConfig.quiver, gameState.mode === 'boss_fight'));
    
    // Boss Rush: the first boss comes in after a moment
    gameState.rushPause = 60;
    gameState.rushComplete = false;
    gameState.bossFightWon = false;
    gameState.gearUsed = null;
    gameState.bossDownFor = undefined;
    gameState.victory = false;
    gameState.afterLastBoss = 0;
    gameState.levelCap = undefined;
    
    // The set worn last time is worn again, with what its owned pieces give
    restoreEquipment();
    gameState.coins = 0;
    emptyBags();
    // Spare arrows kept in the bags fill the quiver
    topUpQuiver();
    gameState.bossLoot = [];
    
    // Reset bullet time system
    gameState.bulletTimeActive = false;
    gameState.bulletTimeMultiplier = 1.0;
    gameState.bulletTimeVisualTimer = 0;
    
    // Clear buffs and all game objects
    clearAllBuffs();
    clearHudNotifications();
    fallingItems = [];
    resetCreatures();
    resetFrostTraps();
    resetHudPanels();
    resetMelee();
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
    
    // The zone's own gear is carried by a creature (systems/creatureSystem.js), unless the site
    // offered it to fall
    for (let i = heldDrops.length - 1; i >= 0; i--) {
        if (!heldDrops[i].creature) continue;
        const [drop] = heldDrops.splice(i, 1);
        const itemData = zoneItemData(drop.item);
        if (itemData) carryForCreatures(itemData, drop.id);
    }
    
    // One at a time, a second apart: after a fight several may be waiting, and they should not
    // all come down at once
    heldDropWait -= deltaTimeMultiplier;
    if (heldDrops.length > 0 && heldDropWait <= 0) {
        const drop = heldDrops.shift();
        // One of the game's own items, or a piece of the zone's gear that falls (the site
        // offered it to fall, not for a creature to carry)
        const gameItem = gameItems.find(item => item.id === drop.item);
        const itemData = gameItem || zoneItemData(drop.item);
        
        if (itemData && (!gameItem || calculateItemProbability(itemData, gameState) > 0)) {
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
        // Get all available power-ups (Frost Traps only where there are creatures to catch)
        let availablePowerUps = powerUpItems.filter(powerUp => !powerUp.needsCreatures || zoneHasCreatures());
        
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
        
        // What a creature left that was not caught is no loss: it was never his
        if (!stillActive && item.missed && !item.fromCreature) {
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
            } else if (shieldBlocks(gameState)) {
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

// Loot a creature dropped hops out of it, to be caught like anything that falls; a piece of
// the zone's gear the site gave it to carry keeps its drop's id, to be reported when caught
function popCreatureLoot(itemData, x, y, dropId = null) {
    whenPictureReady(itemData.image, () => {
        const item = new FallingItem(() => itemData, isValidYPosition, [], gameState, images, canvas);
        item.popFrom(x, y, canvas, gameConfig.creatures.pop);
        if (dropId !== null && dropId !== undefined) item.dropId = dropId;
        fallingItems.push(item);
    });
}

// Loot pops out only once its picture is there to draw (fetched when the creature came in, so
// usually at once; a boss's once the site has said what it dropped), never as a glow alone.
// A picture that cannot be had pops out anyway, drawn as the game draws a missing picture.
function whenPictureReady(path, pop) {
    const picture = path ? assetManager.getImage(path) : null;
    // Loaded, or failed for good: at once
    if (!picture || picture.complete) return pop();
    const go = () => {
        picture.removeEventListener('load', go);
        picture.removeEventListener('error', go);
        if (gameState.gameRunning) pop();
    };
    picture.addEventListener('load', go);
    picture.addEventListener('error', go);
}

// A boss's loot, popping out of it where it fell. It is shown, not caught for keeps: the site
// gave it to the hunter as the boss fell (see onBossDefeated)
function popBossLoot(item, at) {
    const gear = gearCatalog()[item.id];
    const image = (gear && gear.image) || item.image;
    if (!image) return;
    const itemData = { id: item.id, name: item.name, image, type: item.rarity === 'epic' ? 'epic' : item.rarity === 'rare' ? 'special' : 'green', value: 0, collected: 0 };
    whenPictureReady(image, () => {
        const falling = new FallingItem(() => itemData, isValidYPosition, [], gameState, images, canvas);
        falling.popFrom(at.x, at.y, canvas, gameConfig.creatures.pop);
        falling.shownOnly = true;
        fallingItems.push(falling);
    });
}

// A piece of the zone's gear as it falls: from the site's catalogue (INPUT_BOOT.gear), sized and
// shown by its rarity like the other things that fall. It is kept, like any gear caught.
const zoneItems = new Map();
function zoneItemData(itemId) {
    if (!zoneItems.has(itemId)) {
        const gear = gearCatalog()[itemId];
        zoneItems.set(itemId, gear ? {
            id: itemId,
            name: gear.name,
            image: gear.image,
            type: gear.rarity === 'rare' ? 'special' : 'green',
            value: 0,
            collected: 0,
        } : null);
    }
    return zoneItems.get(itemId);
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

// Where the Back of the game's window goes, in words under it
function getBackLabelForSource() {
    return { game: 'to the game', pause: 'to the pause menu', menu: 'to the map', gameOver: 'to the end of the game' }[screensBackTarget()] || 'to the map';
}

// Where the Back of the game's window goes: where its first tab was opened from
function screensBackTarget() {
    const sourceOf = state => state[`${state.screen}Source`];
    const first = screenNavigationHistory[0];
    const current = getCurrentScreenNavigationState();
    // The first tab opened remembers where it was opened from
    const opened = first
        ? (NAVIGABLE_SCREENS.has(first.screen) ? sourceOf(first) : first.screen)
        : sourceOf(current);
    // Opened from the game's own button in play ("desktop"): back to the game
    const back = opened === 'desktop' ? 'game' : opened;
    return back && !NAVIGABLE_SCREENS.has(back) ? back : (gameState.showingPauseMenu ? 'pause' : 'menu');
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

// Back on How to play, Loot & bonuses, High scores and Settings: out of their window of tabs,
// to where it was opened from (the pause menu, the map, the end of a game), however many tabs
// were gone through on the way, as the character sheet's and the inventory's Back do
function navigateBackFromScreen() {
    const back = screensBackTarget();
    screenNavigationHistory.length = 0;
    restoreScreenNavigationState(back);
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
            // Ready to type over with a keyboard. Not on a touch screen: there it would scroll
            // the window down to the box (and the map out of sight) before anything is touched
            if (window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
                nameInput.focus({ preventScroll: true });
                nameInput.select();
            }
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
        renderPauseStatus();
        menuScreenManager.showPauseMenu();
    } else {
        menuScreenManager.showNameEntry();
    }
}

// The pause menu's top: where the game is, and how it stands
function renderPauseStatus() {
    const where = document.getElementById('pauseWhere');
    const holder = document.getElementById('pauseStatus');
    if (!where || !holder) return;
    
    where.textContent = ['Paused', currentBackgroundName(), `level ${(gameState.currentLevel || 0) + 1}`].filter(Boolean).join(' \u00b7 ');
    
    const seconds = Math.floor(gameState.elapsedTime || 0);
    const user = siteBoot && siteBoot.user ? siteBoot.user : null;
    const capacity = bagCapacity(gameConfig.bags, user && user.bags ? user.bags : []);
    const cells = [
        ['Score', Math.round(gameState.score || 0).toLocaleString('en-US'), 'is-score'],
        ['Health', `${Math.ceil(gameState.health || 0)} / ${gameState.maxHealth}`, 'is-health'],
        ['Time', `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`, ''],
        ['Bags', `${slotsUsed((gameState.bags && gameState.bags.contents) || {}, gameConfig.bags.stack) + (gameState.bagged || []).length} / ${capacity}`, ''],
    ];
    
    holder.textContent = '';
    for (const [label, value, kind] of cells) {
        const cell = document.createElement('div');
        cell.className = `pause-status-cell ${kind}`.trim();
        const name = document.createElement('span');
        name.className = 'window-label';
        name.textContent = label;
        const figure = document.createElement('span');
        figure.className = 'pause-status-value';
        figure.textContent = value;
        cell.append(name, figure);
        holder.append(cell);
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
    
    
    setSettingsBackLabel(gameState.settingsSource);
    updateScreenNavigation('settings', { backLabel: getBackLabelForSource(gameState.settingsSource) });
    
    // Update UI elements with current settings
    updateSettingsScreen();
    
    // Set up event handlers for settings controls (do this each time settings opens)
    bindSettingsScreen();
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
    
    // No name: said under the box, not in a browser popup
    const prompt = document.getElementById('nameEntryPrompt');
    if (!playerName) {
        if (prompt) {
            prompt.textContent = 'Enter a name to start playing';
            prompt.classList.add('is-warning');
        }
        nameInput.focus();
        return;
    }
    if (prompt) prompt.classList.remove('is-warning');
    
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
    // A boss fight is with the boss of the zone picked on the map
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

// What falls in a game looks as the gear it is: an item that is also gear (a weapon, a ring, a
// cape) falls as its gear icon (game/assets/items/gear, by the site's catalogue) where it has
// one, rather than the older picture it fell as before
for (const item of gameItems) {
    const gear = gearCatalog()[item.id];
    if (gear && /items\/gear\//.test(gear.image || '')) {
        item.image = gear.image;
        // Fetched now, so the first to fall finds its picture loaded
        assetManager.getImage(item.image);
    }
}

// Measurements of how the game runs, sent to the site (utils/perfProbe.js): in debug mode, and
// from a share of everyone's games
startPerfProbe({
    canvas,
    share: siteBoot ? siteBoot.perfShare : 0,
    send: body => {
        if (!(siteBoot && siteBoot.urls && siteBoot.urls.perf)) return;
        fetch(siteBoot.urls.perf, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            keepalive: true,
            body: JSON.stringify({ ...body, version: GAME_VERSION }),
        }).catch(() => { /* Lost: the next sample may get through */ });
    },
    // What was on screen and happening, with each sample
    describe: () => {
        const fight = bossFightState();
        return {
            mode: gameState.mode || 'normal',
            level: (gameState.currentLevel || 0) + 1,
            side: gameState.faction || null,
            boss: fight ? fight.name : null,
            upheaval: Boolean(fight && fight.upheaval),
            // How the fight is going: its health left, how long, and where the damage came from
            bossHealth: fight ? Math.round(fight.health) : null,
            bossMaxHealth: fight ? fight.maxHealth : null,
            fightSeconds: fight ? fight.seconds : null,
            dealt: fight && fight.dealt ? Object.entries(fight.dealt).map(([kind, amount]) => `${kind} ${Math.round(amount)}`).join(', ') : null,
            thunderfury: wearsThunderfury(),
            meleeFrames: meleeFramesSince(),
            creatures: creaturesAbout().length,
            falling: fallingItems.length,
            projectiles: fireballs.length,
            arrows: window.arrows ? window.arrows.length : 0,
            particles: particles.length,
            texts: combatTexts.length,
            powerUps: powerUps.length,
            canvas: `${canvas.width}x${canvas.height}`,
        };
    },
});

// ===== UI EVENT HANDLERS =====

// Between games the character sheet's and the inventory's Alliance and Horde show (and play)
// that side's hunter: the map moves to where that side starts
function showSide(side) {
    if (isPlaying() || side === currentSide()) return;
    setFaction(side);
    showStartMap();
    restoreEquipment();
}

// Set up UI event handlers
function setupUIEventHandlers() {
    
    // Which key does what can be changed under Settings (ui/keyBindingsScreen.js)
    initializeKeyBindings();
    initializeMusicButton();
    
    // The character sheet (ui/characterSheet.js): told what is worn and owned, and it says
    // back what the player wants on
    initializeCharacterSheet({
        getState: () => ({
            backWhere: hunterBackWhere(),
            coins: siteBoot && siteBoot.user ? siteBoot.user.coins || 0 : null,
            equipment: gameState.equipment,
            owned: availablePieces(),
            // In a game: how much of what is owned was left in the bank
            inBank: forSide(ownedPieces()).size - availablePieces().size,
            // What a player with an account takes into a game (a guest has no bank)
            carried: new Set(gameState.carried),
            // How much of his 36 is taken: what he carries and does not wear
            inHis36: inHis36(gameState.carried, Object.values(gameState.equipment)),
            carryLimit: gameConfig.bags.carry,
            outfits: outfitsForSheet(),
            mostOutfits: MOST_OUTFITS,
            // What he wears but is not drawn in
            hidden: hiddenGear(),
            // The place picked on the map, or the one the game is in
            scene: currentBackgroundImage(),
            faction: currentSide(),
            figure: hunterImage(),
            name: getAccountName() || gameState.playerName || document.getElementById('playerNameInput')?.value || 'Hunter',
            level: (gameState.currentLevel || 0) + 1,
            playing: gameState.gameRunning || gameState.showingPauseMenu,
            totals: gameState.setBonus,
            maxHealth: gameState.maxHealth,
            armorReduction: armorReduction(gameState.armor || 0, gameConfig.stats),
            crit: getCurrentTotalCritRating(),
            dodge: getCurrentTotalDodgeRating(),
            // What is lost on things caught with the bags full, after what the gear takes off
            fullBagLoss: Math.max(0, gameConfig.bags.fullPenalty - gameState.setBonus.carrying),
        }),
        // Putting something on, from the bank too: with no room to carry it, what the slot
        // holds now (if it is carried) goes to the bank in its place
        onEquip: (slotId, item) => {
            const wanted = equip(gameState.equipment, slotId, item, wearables());
            if (!noRoomFor(wanted)) {
                setEquipment(wanted);
                return '';
            }
            const current = gameState.equipment[slotId];
            if (current && gameState.carried.includes(current)) {
                gameState.carried = gameState.carried.filter(itemId => itemId !== current);
                setEquipment(wanted);
                const gone = wearableById(current);
                return { text: `${gone ? gone.name : 'What was there'} went to the bank to make room.`, kind: 'info' };
            }
            return { text: `Your hunter already carries ${gameConfig.bags.carry} things. Leave something in the bank to make room for it.`, kind: 'warning', chooseLeave: true };
        },
        onChooseLeave: () => showInventory('gear'),
        onHide: (itemId, hide) => {
            setHidden(itemId, hide);
            refreshCharacterSheet();
        },
        onOpenInventory: tab => showInventory(tab),
        // Between games the sheet's Alliance and Horde dress (and play) that side's hunter: the
        // map moves to where that side starts
        onShowSide: showSide,
        onCloseAll: closeWindowsAndResume,
        onWearOutfit: wearOutfit,
        onSaveOutfit: saveOutfit,
        onUpdateOutfit: updateOutfit,
        onRenameOutfit: renameOutfit,
        onDeleteOutfit: deleteOutfit,
    });
    // Kinds a bag slot holds more of (arrows)
    setItemStacks(gameConfig.bags.itemStacks);
    // The inventory (ui/inventory.js): the bags, the materials kept, and bags to buy
    initializeInventory({
        getState: () => {
            const user = siteBoot && siteBoot.user ? siteBoot.user : null;
            const playing = gameState.gameRunning || gameState.showingPauseMenu;
            
            return {
                playing,
                // In a game what its bags hold; between games what is kept in them
                contents: bagContents(),
                overflow: playing ? gameState.bags.overflow : {},
                recipes: recipes(),
                potion: { id: POTION, ...gameConfig.potions[POTION], key: keyName('potion') },
                potionKeys: { 'health-potion': keyName('potion'), 'mana-potion': keyName('mana_potion'), 'haste-potion': keyName('haste_potion') },
                capacity: bagCapacity(gameConfig.bags, user && user.bags ? user.bags : []),
                bags: user && user.bags ? user.bags : [],
                bagSlots: gameConfig.bags.bagSlots,
                forSale: user && siteBoot.bagsForSale ? siteBoot.bagsForSale : null,
                coins: user ? user.coins || 0 : null,
                backWhere: hunterBackWhere(),
                // Materials for coins (loot.material_prices on the site)
                materialPrices: user && siteBoot.materialPrices ? siteBoot.materialPrices : null,
                canSpend: Boolean(user && user.verified),
                // A guest sells for coins he can spend once he signs up
                canSell: Boolean(user && (user.verified || user.guest)),
                guest: Boolean(user && user.guest),
                bank: bankContents(),
                otherSide: currentSide() === 'alliance' ? 'horde' : 'alliance',
                // The copies of each thing bound to this hunter (the rest that bind when worn
                // can be sent to the other)
                bound: user ? sideOf(user.bound) : {},
                loggedIn: Boolean(user),
                // The gear owned besides the sets: how many of each, and which are being worn
                gear: user ? accountGear() : {},
                worn: Object.values(gameState.equipment),
                // Everything this side's hunter can wear and is owned, and what of it he
                // takes into a game (the other hunter's things are in his own inventory)
                owned: [...forSide(ownedPieces())],
                faction: currentSide(),
                // Whose inventory it is, for its heading
                name: getAccountName() || gameState.playerName || document.getElementById('playerNameInput')?.value || 'Hunter',
                level: (gameState.currentLevel || 0) + 1,
                carried: gameState.carried,
                // The gear he keeps in his bags, a slot a piece
                bagged: gameState.bagged || [],
                equipment: gameState.equipment,
                inHis36: inHis36(gameState.carried, Object.values(gameState.equipment)),
                carryLimit: gameConfig.bags.carry,
                // The pictures of the place and the hunter, for the gear tab
                scene: currentBackgroundImage(),
                figure: hunterImage(),
                fullBagLoss: Math.max(0, gameConfig.bags.fullPenalty - gameState.setBonus.carrying),
            };
        },
        onBuyBag: buyBag,
        onBuyMaterial: buyMaterial,
        onMove: moveKept,
        onSend: sendKept,
        onSendGear: sendGear,
        onShowSide: showSide,
        onCraft: craft,
        onSell: sellGear,
        onCarry: carryMany,
        onMoveGear: moveGear,
        onWornToBags: wornToBags,
        onWearGear: wearGear,
        onSwitchGear: switchGear,
        onCloseAll: closeWindowsAndResume,
        // The sheet closes the inventory itself once it is open, so the game stays paused
        onOpenGear: () => showCharacterSheet(),
    });
    document.getElementById('inventoryBtn')?.addEventListener('click', () => showInventory());
    document.getElementById('inventoryPauseBtn')?.addEventListener('click', () => showInventory());
    // Its key (B, unless the player changed it): opens it, and closes it again
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (actionFor(event.code) !== 'inventory' || typing || event.ctrlKey || event.altKey || event.metaKey) return;
        
        event.preventDefault();
        if (isInventoryOpen()) {
            closeInventory();
        } else if (!isCharacterSheetOpen()) {
            showInventory();
        }
    });
    
    // In a game, his stats (I unless changed) and what he wears (G) open over the field's edge
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        const action = actionFor(event.code);
        if ((action !== 'stats' && action !== 'gear') || typing || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (!gameState.gameRunning) return;
        event.preventDefault();
        if (action === 'stats') toggleStats();
        else toggleGear();
    });
    
    document.getElementById('characterBtn')?.addEventListener('click', () => showCharacterSheet());
    document.getElementById('characterPauseBtn')?.addEventListener('click', () => showCharacterSheet());
    // Its key (C, unless the player changed it): opens it, and closes it again
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (actionFor(event.code) !== 'character' || typing || event.ctrlKey || event.altKey || event.metaKey) return;
        
        event.preventDefault();
        if (isCharacterSheetOpen()) {
            closeCharacterSheet();
        } else {
            showCharacterSheet();
        }
    });
    
    // A Health Potion from the bags: its key (H unless the player changed it), or a tap on its
    // slot on the spell bar
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        const action = actionFor(event.code);
        if (typing || event.repeat) return;
        if (action === 'potion') drinkPotion('health-potion');
        if (action === 'mana_potion') drinkPotion('mana-potion');
        if (action === 'haste_potion') drinkPotion('haste-potion');
    });
    for (const { id, slot } of POTIONS) {
        document.getElementById(slot)?.addEventListener('pointerdown', event => {
            event.preventDefault();
            event.stopPropagation();
            drinkPotion(id);
        });
    }
    
    // Wearing a saved set in play: its key (1 to 4 unless the player changed them), or its
    // button on the set panel (refreshSetSwitch)
    document.addEventListener('keydown', event => {
        const index = OUTFIT_KEYS.indexOf(actionFor(event.code));
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (index < 0 || typing || !gameState.gameRunning || !outfits()[index]) return;
        
        wearOutfit(index, true);
    });
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (actionFor(event.code) !== 'next_set' || typing || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (gameState.currentScreen !== 'game' || !gameState.gameRunning) return;
        event.preventDefault();
        wearNextOutfit(3);
    });
    
    // The pet, defensive or aggressive: its key (P unless the player changed it) in a game, or
    // its switch on the character sheet and in Settings
    document.addEventListener('keydown', event => {
        const typing = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
        if (actionFor(event.code) !== 'pet_stance' || typing || event.repeat || event.ctrlKey || event.altKey || event.metaKey) return;
        if (gameState.currentScreen !== 'game' || !gameState.gameRunning) return;
        event.preventDefault();
        switchPetStance();
    });
    // Its button on the spell bar: pressed or tapped (without the press moving the hunter)
    document.getElementById('spell-pet')?.addEventListener('pointerdown', event => {
        event.preventDefault();
        event.stopPropagation();
        if (gameState.currentScreen === 'game' && gameState.gameRunning) switchPetStance();
    });
    const setPanelHeader = document.querySelector('#dragonstalkerProgressPanel .dragonstalker-panel-header');
    if (setPanelHeader) {
        setPanelHeader.addEventListener('click', () => {
            if (gameState.currentScreen === 'game') wearNextOutfit();
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
                // The list is filled again, which puts it back on the first zone: the place
                // picked on the map stays picked (a boss fight is for that place's boss)
                const startZone = document.getElementById('startZone');
                const picked = startZone ? startZone.value : '1';
                renderStartZonePicker(getFaction());
                if (startZone && [...startZone.options].some(option => option.value === picked && !option.disabled)) startZone.value = picked;
            }
        });
    }
    
    // Choosing a side remembers it and shows where that side starts
    document.querySelectorAll('#factionPicker input[name="faction"]').forEach(option => {
        option.addEventListener('change', () => {
            setFaction(option.value);
            if (!isPlaying()) restoreEquipment();
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
        }
        
        // Detailed stats shortcut
        if (e.ctrlKey && e.shiftKey && e.key === 'D') {
            e.preventDefault();
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
        viewScoresBtn.addEventListener('click', () => showHighScores());

        // Under the site's header the high scores have a page of their own, linked from there
        if (siteBoot && siteBoot.embedded) viewScoresBtn.style.display = 'none';
        // Under the site's header, which carries the logo already (styles/wow-theme.css)
        document.body.classList.toggle('site-framed', Boolean(siteBoot && siteBoot.embedded));
    } else {
        console.warn('viewScoresBtn not found!');
    }
    
    if (howToPlayBtn) {
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
    
    // Play again: the same place and the same kind of game, at once
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            menuScreenManager.hideAll();
            restartGame();
            startGameFromUI();
        });
    }
    
    // Back to the map, to pick again
    const gameOverMapBtn = document.getElementById('gameOverMapBtn');
    if (gameOverMapBtn) gameOverMapBtn.addEventListener('click', restartGameFromUI);
    
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
    
    const highScoresPauseBtn = document.getElementById('highScoresPauseBtn');
    if (highScoresPauseBtn) highScoresPauseBtn.addEventListener('click', () => showHighScores(true));
    
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
            if (gameState.gameRunning && !gameState.showingPauseMenu) {
                showPauseMenu();
            }
        });
        
        // Touch event handling for better mobile responsiveness
        mobilePauseBtn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            e.stopPropagation();
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
        renderAllTime(document.getElementById('allTimeList'), currentSide());
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
        renderAllTime(tabList, currentSide());
    }
    
    if (tabButton) tabButton.classList.add('active');
    if (tabList) tabList.classList.add('active');
    
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
                displayHighScoresSync();
            });
        }
    } catch (error) {
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
    setTextIfChanged(collectionCount, `${uniqueItemTypes} types, ${totalItemsCollected} total`);
    
    // Update player stats
    updatePlayerStats(gameState);
    
    // Update items list only when needed (event-based updates)
    // Note: updateItemsList will skip updates if no items were collected
    if (itemsListCache.needsUpdate || gameState.showingPauseMenu) {
        updateItemsList(sortedItems);
    }
    
    // Update dedicated dragonstalker progress panel
    updateDragonstalkerProgressPanel(gameState, gameItems);
    
    // The slim panels' own parts (ui/hudPanels.js); closed when a boss comes in
    const room = bagRoom();
    if (isBossFightActive() !== hudBossWas) {
        hudBossWas = isBossFightActive();
        if (hudBossWas) closePanels();
    }
    updateHudPanels({
        level: gameConfig.levels.progressionType === 'xp' ? getLevelProgress(gameState).progress : 0,
        coins: formatCoins(gameState.coins || 0),
        bagsFull: room.used >= room.capacity,
        bags: `${room.used}/${room.capacity}`,
        statsKey: keyName('stats'),
        gearKey: keyName('gear'),
        set: hudSet,
        worn: hudWorn,
    });
}

// What the set chip shows (filled with the set panel): the set he wears most of, and how many
// pieces he has on
let hudSet = null;
let hudWorn = 0;
let hudBossWas = false;

// Text put on the page only when it changes: setting it, even to what it was, makes the browser
// lay the page out and paint it again (every tenth frame, for the panels below)
function setTextIfChanged(element, text) {
    const value = String(text);
    if (element.textContent !== value) element.textContent = value;
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
                        <img src="${getPortraitUrl()}" crossorigin="anonymous" alt="Player Portrait" onerror="this.onerror=null;this.src='assets/player/efto.png'">
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
        setTextIfChanged(healthText, `${Math.round(gameState.player.health)}/${gameState.player.maxHealth}`);
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
        setTextIfChanged(playerNameDisplay, gameState.playerName || 'Unknown');
    }
    
    // Update score with formatting (large and prominent)
    if (playerScoreDisplay) {
        setTextIfChanged(playerScoreDisplay, gameState.score.toLocaleString());
    }
    
    // Update level (add 1 to 0-based internal level for 1-based UI display)
    if (playerLevelDisplay) {
        setTextIfChanged(playerLevelDisplay, levelLabel());
    }
    
    // Update health bar in player section
    const playerHealthFill = document.getElementById('playerHealthFill');
    const playerHealthText = document.getElementById('playerHealthText');
    
    if (playerHealthFill && playerHealthText && gameState.health !== undefined && gameState.maxHealth !== undefined) {
        const healthPercentage = Math.max(0, gameState.health / gameState.maxHealth);
        const healthPercent = Math.ceil(healthPercentage * 100);
        
        // Update health fill width and color
        const healthWidth = `${healthPercentage * 100}%`;
        if (playerHealthFill.style.width !== healthWidth) playerHealthFill.style.width = healthWidth;
        
        // Colour comes from the stylesheet: green, then amber, then red as health drops
        const healthLevel = healthPercentage <= 0.25 ? 'low' : healthPercentage <= 0.6 ? 'medium' : 'high';
        const healthClass = `player-health-fill ${healthLevel}`;
        if (playerHealthFill.className !== healthClass) playerHealthFill.className = healthClass;
        
        // Update health text
        setTextIfChanged(playerHealthText, `${Math.round(gameState.health)}/${gameState.maxHealth}`);
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
        
        setTextIfChanged(gameSpeed, speedText);
        
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
            setTextIfChanged(speedBoostValue, `+${gameState.currentSpeedIncreasePercent}%`);
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
        // What the set being worn adds is counted with them (utils/sets.js)
        let tempItemCritBonus = gameState.setBonus ? gameState.setBonus.crit : 0;
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
            
            setTextIfChanged(critRating, `${totalCritPercent}% (${bonuses.join(' ')})`);
            critRating.style.color = hasTempItemBonus ? '#FFD700' : '#FF4500'; // Gold for temp items, orange for spells
            critRating.style.fontWeight = 'bold';
            critRating.style.textShadow = hasTempItemBonus ? '0 0 6px #FFD700' : '0 0 6px #FF4500';
            
            // Add special glow if at max
            if (totalCritRating >= gameState.critRatingCap) {
                critRating.style.textShadow = '0 0 10px #FFD700';
                setTextIfChanged(critRating, critRating.textContent.replace(')', ' MAX!)'));
            }
        } else if (hasPermanentBonus) {
            // Show permanent bonus only
            const bonusPercent = permanentCritPercent - baseCritPercent;
            setTextIfChanged(critRating, `${permanentCritPercent}% (+${bonusPercent}%)`);
            critRating.style.color = '#FF6B00'; // Orange for enhanced
            critRating.style.fontWeight = 'bold';
            
            // Add glow effect if at max
            if (gameState.critRating >= gameState.critRatingCap) {
                critRating.style.textShadow = '0 0 8px #FF6B00';
                setTextIfChanged(critRating, `${permanentCritPercent}% (MAX!)`);
            } else {
                critRating.style.textShadow = 'none';
            }
        } else {
            // Base crit rating
            setTextIfChanged(critRating, `${baseCritPercent}%`);
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
        let tempItemDodgeBonus = gameState.setBonus ? gameState.setBonus.dodge : 0;
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
        
        setTextIfChanged(dodgeRating, displayText);
        dodgeRating.style.color = displayColor;
        dodgeRating.style.fontWeight = fontWeight;
        dodgeRating.style.textShadow = textShadow;
    }
    
    // Update dodge statistics display (removed totalDodges - not needed)
    const healthSavedElement = document.getElementById('healthSavedFromDodges');
    
    if (healthSavedElement) {
        setTextIfChanged(healthSavedElement, `${Math.round(gameState.healthSavedFromDodges)} HP`);
        // Color code based on health saved
        if (gameState.healthSavedFromDodges === 0) {
            healthSavedElement.style.color = '#CCCCCC'; // Gray for no health saved
        } else if (gameState.healthSavedFromDodges < 20) {
            healthSavedElement.style.color = '#FFD700'; // Gold for some health saved
        } else {
            healthSavedElement.style.color = '#00FF00'; // Green for significant health saved
        }
    }
    
    // Update arrow count display
    // Attack power and armor, from the pieces owned of the set being worn (utils/stats.js)
    const attackPowerElement = document.getElementById('attackPowerValue');
    if (attackPowerElement) {
        setTextIfChanged(attackPowerElement, String(gameState.attackPower || 0));
        attackPowerElement.title = `Arrows do ${gameState.attackPower || 0}% more damage`;
    }
    const armorElement = document.getElementById('armorValue');
    if (armorElement) {
        const blocked = Math.round(armorReduction(gameState.armor || 0, gameConfig.stats) * 100);
        setTextIfChanged(armorElement, blocked > 0 ? `${gameState.armor} (-${blocked}%)` : String(gameState.armor || 0));
        armorElement.title = `Hits do ${blocked}% less damage`;
    }
    
    // How full the bags are: red once nothing more fits
    const bagsElement = document.getElementById('bagsValue');
    if (bagsElement) {
        const room = bagRoom();
        setTextIfChanged(bagsElement, `${room.used}/${room.capacity}`);
        bagsElement.style.color = room.used >= room.capacity ? '#FF6B6B' : '';
    }
    
    const arrowCountElement = document.getElementById('arrowCount');
    if (arrowCountElement) {
        setTextIfChanged(arrowCountElement, `${gameState.arrowCount || 0}/${gameState.quiverCapacity}`);
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
        setTextIfChanged(coinCountElement, formatCoins(gameState.coins));
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

// ----- The bags (utils/bags.js) -----
// Everything caught goes into the bags. What is only worth selling pays its coins; a crafting
// material pays none, and is kept on the account when the game ends. With the bags full,
// whatever is caught is sold on the spot for less, a material too. A piece of a hunter set is
// worn, not carried: it takes no room.

// The bags as a game starts: empty, with the room of the backpack and the bags bought
// A game starts with the bags as they were left: what is kept in them between games
// (materials, what was crafted, potions and spare arrows) takes its room from what the game
// catches. Then the quiver is topped up from the spare arrows.
function emptyBags() {
    const kept = siteBoot && siteBoot.user ? sideOf(siteBoot.user.bagContents, gameState.faction || currentSide()) : {};
    gameState.bags = { contents: { ...kept }, overflow: {} };
    gameState.bagsAtStart = { ...kept };
    gameState.potionReadyAt = {};
    // Less the slots taken by the gear he keeps in them
    gameState.bagCapacity = bagCapacity(gameConfig.bags, siteBoot && siteBoot.user && siteBoot.user.bags ? siteBoot.user.bags : []) - (gameState.bagged || []).length;
    gameState.bagsFullSaid = false;
    // A potion caught at full health (or while time is slowed) and the arrows the quiver cannot
    // hold go into the bags, as far as there is room: how many went in
    gameState.keepInBags = (itemId, count) => {
        const put = stowInBags(gameState.bags.contents, itemId, count, gameState.bagCapacity, gameConfig.bags.stack);
        if (put > 0) refreshInventory();
        return put;
    };
    // A Frost Trap pickup: three traps across the field, or none if there is no room for three
    gameState.deployFrostTraps = () => deployFrostTraps({
        width: canvas.logicalWidth || canvas.width,
        height: canvas.logicalHeight || canvas.height,
        player: player.getBodyBounds(),
    });
}

// A hunter's part of what the site keeps for both ({ alliance, horde }); a page from before
// each hunter had his own sent one lot, which is the Alliance hunter's
function sideOf(kept, side = currentSide()) {
    if (!kept) return {};
    if (kept.alliance === undefined && kept.horde === undefined) return side === 'alliance' ? kept : {};
    return kept[side] || {};
}

// Set a hunter's part, keeping the other's
function setSideOf(key, side, value) {
    const kept = siteBoot.user[key];
    const both = kept && (kept.alliance !== undefined || kept.horde !== undefined) ? kept : { alliance: kept || {}, horde: {} };
    siteBoot.user[key] = { ...both, [side]: value || {} };
}

// What the bags hold between games (or in the game being played): this hunter's
function bagContents() {
    if (gameState.gameRunning || gameState.showingPauseMenu) return gameState.bags.contents;
    return siteBoot && siteBoot.user ? sideOf(siteBoot.user.bagContents) : {};
}

// What this hunter keeps in the bank
function bankContents() {
    return siteBoot && siteBoot.user ? sideOf(siteBoot.user.materials) : {};
}

// What a game did to the kept things in the bags that are not materials (potions, arrows): what
// went down was used, what went up was stored. Materials are settled by what was caught.
function bagChanges() {
    const used = {}, stored = {};
    const before = gameState.bagsAtStart || {};
    const after = (gameState.bags && gameState.bags.contents) || {};
    for (const itemId of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (MATERIALS.has(itemId) || !craftedById(itemId)) continue;
        const change = (after[itemId] || 0) - (before[itemId] || 0);
        if (change < 0) used[itemId] = -change;
        if (change > 0) stored[itemId] = change;
    }
    return { used, stored };
}

// ----- Spare arrows: in the bags, they fill the quiver as a game starts and when it runs dry -----
function topUpQuiver() {
    const spare = (gameState.bags && gameState.bags.contents.arrows) || 0;
    const room = Math.max(0, (gameState.quiverCapacity || 0) - (gameState.arrowCount || 0));
    const take = Math.min(spare, room);
    if (take <= 0) return 0;
    
    gameState.arrowCount += take;
    gameState.bags.contents.arrows = spare - take;
    if (!gameState.bags.contents.arrows) delete gameState.bags.contents.arrows;
    refreshInventory();
    return take;
}

// Every step: a quiver too low for a Multishot is filled from the bags, if they hold arrows
function refillQuiver() {
    if (!gameState.gameRunning || (gameState.arrowCount || 0) >= 5) return;
    const took = topUpQuiver();
    if (took > 0) addNotification(gameState, `🏹 ${took} arrows from your bags`, 150, '#CD7F32');
}

// ----- Potions: crafted between games, or caught and kept, and drunk in a fight from the bags -----
// Each with its key and its slot on the spell bar: Health Potion (H) heals, Mana Potion (M)
// slows time ("potions" in config/gameConfig.js)
const POTION = 'health-potion';
// The pet, defensive or aggressive, the other way round: its button on the spell bar says so
// (ui/petSlot.js, drawn with the game)
function switchPetStance() {
    const stance = (getSettings().gameplay?.petStance || 'defensive') === 'aggressive' ? 'defensive' : 'aggressive';
    updateSetting('gameplay', 'petStance', stance);
    refreshPetSlot(player.pet?.kind, stance);
}

const POTIONS = [
    { id: 'health-potion', slot: 'spell-potion' },
    { id: 'mana-potion', slot: 'spell-mana-potion' },
    { id: 'haste-potion', slot: 'spell-haste-potion' },
];

function drinkPotion(itemId = POTION) {
    if (!gameState.gameRunning || gameState.showingPauseMenu || gameState.gamePaused) return;
    const rules = gameConfig.potions[itemId];
    const item = craftedById(itemId);
    const name = item ? item.name : itemId;
    const have = gameState.bags.contents[itemId] || 0;
    const now = gameClock.now();
    if (!rules || have <= 0) {
        addNotification(gameState, `No ${name}s in your bags`, 180, '#FF6B35');
        return;
    }
    if (now < (gameState.potionReadyAt[itemId] || 0)) return;
    if (rules.slow && gameState.timeSlowActive) {
        addNotification(gameState, 'Time is already slowed', 120, '#4169E1');
        return;
    }
    if (rules.haste && gameState.hasteTimer > 0) {
        addNotification(gameState, 'He is already hasted', 120, '#FF6B35');
        return;
    }
    
    gameState.bags.contents[itemId] = have - 1;
    if (gameState.bags.contents[itemId] === 0) delete gameState.bags.contents[itemId];
    gameState.potionReadyAt[itemId] = now + (rules.cooldown || 0) * 1000;
    if (rules.heal) {
        const healed = Math.min(rules.heal, gameState.maxHealth - gameState.health);
        gameState.health = Math.min(gameState.maxHealth, gameState.health + rules.heal);
        combatTexts.push(new CombatText(player.x + player.width / 2, player.y, `+${healed}`, '#1EFF00', false));
    }
    if (rules.slow) {
        gameState.timeSlowActive = true;
        gameState.timeSlowTimer = rules.seconds * 60;
        gameState.timeSlowMultiplier = rules.slow;
        addNotification(gameState, `🔵 Time Slow ${Math.round((1 - rules.slow) * 100)}% for ${rules.seconds}s`, 180, '#4169E1');
    }
    if (rules.haste) {
        gameState.hasteTimer = gameConfig.powerUps.haste.duration;
        addNotification(gameState, `⚡ Haste: he moves and shoots faster for ${Math.round(gameConfig.powerUps.haste.duration / 60)}s`, 180, '#FF6B35');
    }
    refreshInventory();
}

// The potions' slots on the spell bar: each shown while there are any, with how many and its
// cooldown
const potionSlots = {};
function updatePotionSlot() {
    for (const { id, slot: slotId } of POTIONS) {
        const slot = document.getElementById(slotId);
        if (!slot) continue;
        const seen = potionSlots[id] || (potionSlots[id] = { shown: null, count: '', timer: '' });
        const have = (gameState.bags && gameState.bags.contents[id]) || 0;
        const shown = gameState.gameRunning && have > 0;
        if (shown !== seen.shown) {
            slot.hidden = !shown;
            seen.shown = shown;
        }
        if (!shown) continue;
        
        const count = String(have);
        if (count !== seen.count) {
            document.getElementById(`${slotId}-count`).textContent = count;
            seen.count = count;
        }
        const left = Math.max(0, Math.ceil(((gameState.potionReadyAt && gameState.potionReadyAt[id]) || 0) - gameClock.now()) / 1000);
        const timer = left > 0 ? `${Math.ceil(left)}s` : '';
        if (timer !== seen.timer) {
            const timerElement = document.getElementById(`${slotId}-timer`);
            timerElement.textContent = timer;
            timerElement.className = left > 0 ? 'spell-timer cooldown' : 'spell-timer';
            document.getElementById(`${slotId}-cooldown`).classList.toggle('active', left > 0);
            slot.classList.toggle('cooldown', left > 0);
            seen.timer = timer;
        }
    }
    refillQuiver();
}

// ----- Between games: moving things between the bank and the bags, and crafting -----
async function postKept(url, body, failed) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (!response.ok) return result.message || failed;
        
        // The purse, after a purchase
        if (result.coins !== undefined && siteBoot.user) {
            siteBoot.user.coins = result.coins;
            renderAccountBar();
        }
        // Both hunters' bags and bank as they are now (a send changes the other's too)
        if (result.all) {
            siteBoot.user.bagContents = result.all.bags;
            siteBoot.user.materials = result.all.bank;
        }
        // A piece of gear made: this hunter's gear, and what is bound to him, as they are now
        if (result.gear && result.side) {
            setSideOf('gear', result.side, result.gear);
            if (result.bound) setSideOf('bound', result.side, result.bound);
            refreshCharacterSheet();
        }
        return '';
    } catch (e) {
        return `${failed} No answer from the site.`;
    }
}

// Buy a material with coins, into this hunter's bank (loot.material_prices on the site)
function buyMaterial(itemId, count) {
    if (!hasBank() || !siteBoot.urls.materialsBuy) return Promise.resolve('Log in to buy materials.');
    if (isPlaying()) return Promise.resolve('Materials are bought between games.');
    return postKept(siteBoot.urls.materialsBuy, { item: itemId, count, side: currentSide() }, 'It could not be bought.');
}

function moveKept(itemId, count, to) {
    if (!hasBank() || !siteBoot.urls.bagsMove) return Promise.resolve('Log in to keep things in the bank.');
    if (isPlaying()) return Promise.resolve('Things are moved between the bank and your bags between games.');
    return postKept(siteBoot.urls.bagsMove, { item: itemId, count, to, side: currentSide() }, 'It could not be moved.');
}

// Send gear that binds when worn to the other hunter: copies not yet worn, between games
async function sendGear(itemId, count) {
    if (!hasBank() || !siteBoot.urls.gearSend) return 'Log in to keep gear.';
    if (isPlaying()) return 'Gear is sent between games.';
    try {
        const response = await fetch(siteBoot.urls.gearSend, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'X-CSRF-TOKEN': siteBoot.csrfToken || '' },
            credentials: 'same-origin',
            body: JSON.stringify({ item: itemId, count, side: currentSide() })
        });
        const result = await response.json();
        if (!response.ok) return result.message || 'It could not be sent.';
        
        siteBoot.user.gear = result.gear;
        siteBoot.user.bound = result.bound;
        if (result.equipment) siteBoot.user.equipment = result.equipment;
        restoreEquipment();
        return '';
    } catch (e) {
        return 'It could not be sent: no answer from the site.';
    }
}

// Send from this hunter's bank to the other's: materials, potions and arrows are not bound
function sendKept(itemId, count) {
    if (!hasBank() || !siteBoot.urls.bagsSend) return Promise.resolve('Log in to keep things in the bank.');
    if (isPlaying()) return Promise.resolve('Things are sent between games.');
    return postKept(siteBoot.urls.bagsSend, { item: itemId, count, side: currentSide() }, 'It could not be sent.');
}

function craft(recipeId, count) {
    if (!hasBank() || !siteBoot.urls.craft) return Promise.resolve('Log in to craft.');
    if (isPlaying()) return Promise.resolve('Crafting is done between games.');
    return postKept(siteBoot.urls.craft, { recipe: recipeId, count, side: currentSide() }, 'It could not be made.');
}

// Something worth coins was caught: into the bags with it, and the coins it comes to
function stowCatch(itemData) {
    const worth = coinsForItem(itemData.type, gameConfig.coins);
    const kind = categoryOf(itemData);
    
    // A weapon or a piece of jewellery: kept to wear or to sell later. It pays nothing now,
    // takes no room, and goes on if nothing is in its slot.
    if (isKeptGear(itemData.id)) {
        if (siteBoot && siteBoot.user) {
            const gear = accountGear();
            gear[itemData.id] = (gear[itemData.id] || 0) + 1;
        }
        if (carryCaught(itemData.id)) wearCaughtPiece(wearableById(itemData.id));
        return;
    }
    
    if (kind === 'gear') {
        gameState.coins += worth;
        return;
    }
    
    if (addToBags(gameState.bags, itemData.id, gameState.bagCapacity, gameConfig.bags.stack)) {
        // Carried: junk is as good as sold, a material is kept
        if (kind === 'junk') gameState.coins += worth;
    } else {
        // Gear that helps with carrying takes some of the loss away
        gameState.coins += soldShort(worth, gameConfig.bags, gameState.setBonus.carrying);
        if (!gameState.bagsFullSaid) {
            gameState.bagsFullSaid = true;
            const share = Math.round((1 - Math.max(0, gameConfig.bags.fullPenalty - gameState.setBonus.carrying)) * 100);
            addNotification(gameState, `Your bags are full: what does not fit sells for ${share}%`, 300, '#FF6B35');
        }
    }
    refreshInventory();
}

// How full the bags are: { used, capacity }
function bagRoom() {
    return { used: slotsUsed(gameState.bags.contents, gameConfig.bags.stack), capacity: gameState.bagCapacity };
}

// Trigger items list update when an item is collected
function onItemCollected(itemData, fallingItem = null) {
    // Mark that we need to update the items list
    itemsListCache.needsUpdate = true;
    
    const dropId = fallingItem ? fallingItem.dropId : null;
    lootSystem.recordPickup(itemData.id, dropId);
    if (lootSystem.earnsCoins(itemData, dropId)) {
        stowCatch(itemData);
    }
    
    // Worth seeing in the Found list: a piece of a set, gear he keeps, anything rare
    const foundColor = { set_piece: '#C77DFF', epic: '#B048F8', special: '#3D9BFF', legendary: '#FF8000', zee_zgnan: '#FF8000' }[itemData.type]
        || (isKeptGear(itemData.id) ? (BOSS_LOOT_COLORS[(gearCatalog()[itemData.id] || {}).rarity] || '#1EFF00') : null);
    if (foundColor) noteFound(itemData.name, foundColor);
    
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
            const pieces = accountPieces();
            if (!pieces.includes(itemData.id)) pieces.push(itemData.id);
        }
        if (carryCaught(itemData.id)) wearCaughtPiece(itemData);
        
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
        // The strongest set worn, and what it gave (null: nothing worn that gave anything)
        gear: noteGearUsed() || null,
        // How much of each thing caught did not fit in the bags and was sold short
        overflow: gameState.bags.overflow,
        // What was drunk or shot from the bags, and what was put in them (potions, arrows)
        ...bagChanges(),
        // Ratings as percentages with one decimal
        finalCritRating: Math.round(getCurrentTotalCritRating() * 1000) / 10,
        finalDodgeRating: Math.round(getCurrentTotalDodgeRating() * 1000) / 10,
        // A boss fight it ended in, lost or left (null: none)
        bossFight: fightInProgress()
    };
}

// The gear panel: what he has on, as it is now. For each hunter set he wears pieces of, how
// many are on and what they give at that count (and what more would give); then the rest of
// what is on, and what it all gives beyond its stats. Nothing about what is owned and not on.
function updateDragonstalkerProgressPanel(gameState) {
    const panel = document.getElementById('dragonstalkerProgressPanel');
    if (!panel) return;
    
    const equipment = gameState.equipment || {};
    const outfit = outfitsForSheet().find(saved => saved.isOn);
    
    // Throttle updates - only update every 1 second unless something changed
    const currentTime = Date.now();
    const stateKey = `${Object.entries(equipment).sort().join()}|${outfit ? outfit.name : ''}`;
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
    
    const items = SLOTS.map(slot => equipment[slot.id]).filter(Boolean).map(itemId => wearableById(itemId)).filter(Boolean);
    const counts = setsWorn(equipment, wearables());
    // For the set chip: the set he wears most of
    hudWorn = items.length;
    const most = gameConfig.sets.filter(set => counts[set.id]).sort((a, b) => counts[b.id] - counts[a.id])[0];
    hudSet = most ? { name: most.name.split(' ')[0], pieces: counts[most.id], of: piecesOf(gameItems, most.id).length, more: nextStep(most, counts[most.id]) } : null;
    
    // The heading: the saved set he has on, or what he wears
    const nameElement = document.getElementById('setPanelName');
    if (nameElement) nameElement.textContent = outfit ? outfit.name : 'What he wears';
    const saved = outfits().length;
    const setKeys = OUTFIT_KEYS.slice(0, saved).map(keyName).filter(Boolean);
    const nextKey = keyName('next_set');
    panel.title = saved === 0 ? 'Save sets on the character sheet to change them here'
        : [setKeys.length ? `Press ${setKeys.join(', ')} to wear one of your sets` : '', nextKey ? `${nextKey} wears the next of the first three` : ''].filter(Boolean).join('; ') || 'Tap here to wear the next of your sets';
    const progressText = document.getElementById('dragonstalkerProgressText');
    if (progressText) progressText.textContent = `${items.length} on`;
    // A button for each saved set, the one on lit
    refreshSetSwitch();
    
    // A line for each hunter set he wears pieces of: how many, what that gives, what is next
    const setLines = document.getElementById('setPanelSets');
    if (setLines) {
        setTextIfChanged(setLines, '');
        for (const set of gameConfig.sets) {
            const on = counts[set.id] || 0;
            if (!on) continue;
            const all = piecesOf(gameItems, set.id).length;
            const gives = bonusText(setBonus(set, on), { stats: false });
            const next = nextStep(set, on);
            const line = document.createElement('p');
            line.className = 'set-panel-set';
            const name = document.createElement('strong');
            setTextIfChanged(name, `${set.name.split(' ')[0]} ${on}/${all}`);
            line.append(name, ` ${gives || 'no bonus yet'}${next ? ` \u00b7 ${next} for more` : ''}`);
            setLines.append(line);
        }
        setLines.hidden = setLines.childElementCount === 0;
    }
    
    // What it all gives beyond its stats (the stats are in the hunter's own panel)
    const bonusLine = document.getElementById('setPanelBonus');
    if (bonusLine) {
        const gives = bonusText(gameState.setBonus, { stats: false });
        bonusLine.hidden = !gives || responsiveScaler.deviceType === 'mobile';
        setTextIfChanged(bonusLine, gives ? `In all: ${gives}` : '');
    }
    
    // Everything on him: set pieces first, by set, then the rest by slot
    const itemsList = document.getElementById('dragonstalkerItemsList');
    if (itemsList) {
        const order = item => (item.set ? gameConfig.sets.findIndex(set => set.id === item.set) : gameConfig.sets.length);
        const shown = [...items].sort((a, b) => order(a) - order(b));
        itemsList.innerHTML = '';
        itemsList.dataset.set = '';
        itemsList.classList.toggle('is-many', shown.length > 10);
        if (shown.length === 0) {
            const none = document.createElement('p');
            none.className = 'set-panel-none';
            setTextIfChanged(none, 'Nothing on: dress him on the character sheet (C).');
            itemsList.append(none);
        }
        shown.forEach(item => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'dragonstalker-item collected is-worn';
            itemDiv.dataset.itemId = item.id;
            itemDiv.dataset.rarity = item.set ? 'epic' : item.rarity || 'common';
            itemDiv.title = item.name;
            const icon = document.createElement('div');
            icon.className = 'dragonstalker-item-icon';
            const picture = document.createElement('img');
            picture.src = item.image;
            picture.alt = '';
            icon.append(picture);
            const label = document.createElement('div');
            label.className = 'dragonstalker-item-name';
            const slot = SLOTS.find(candidate => equipment[candidate.id] === item.id);
            setTextIfChanged(label, slot ? slot.label : '');
            itemDiv.append(icon, label);
            itemsList.append(itemDiv);
        });
    }
}

// ===== GAME END FUNCTIONS =====

// Boss loot, by rarity: the colour its name is written in
const BOSS_LOOT_COLORS = { uncommon: '#1EFF00', rare: '#4D9BFF', epic: '#C77DFF' };

// ----- Thunderfury (config/gear.php "crafted" on the site; thunderfury in gameConfig.js) -----
// Worn in the main hand, each loosing of arrows, and each blow struck with it, may call down
// its lightning: it strikes the harmful things falling nearest the hunter, destroying them,
// the creatures nearest him, and a boss being fought, which it hurts and dazes (it attacks
// slower for a while).
let thunderfuryReadyAt = 0;

function wearsThunderfury() {
    const held = gameState.equipment && gameState.equipment.mainhand ? wearableById(gameState.equipment.mainhand) : null;
    return Boolean(held && held.effect === 'chain-lightning');
}

// A bolt of lightning from one point to another, with a few sparks where it lands
function lightningBolt(fromX, fromY, toX, toY) {
    particles.push(new LightningBolt(fromX, fromY, toX, toY));
    for (let spark = 0; spark < 6; spark++) particles.push(new Particle(toX, toY, spark % 2 ? '#e6f6ff' : '#7fc8ff'));
}

function thunderfuryStrike() {
    if (!gameState.gameRunning || !wearsThunderfury()) return;
    const rules = gameConfig.bosses.thunderfury;
    const now = gameClock.now();
    if (now < thunderfuryReadyAt || Math.random() >= rules.chance) return;
    thunderfuryReadyAt = now + rules.cooldown * 1000;

    const fromX = player.x + player.width / 2;
    const fromY = player.y;
    let struck = 0;

    // The boss first, if there is one to strike
    const boss = strikeBoss({ damage: rules.bossDamage, slow: rules.slow, slowSeconds: rules.slowSeconds, combatTexts, canvas });
    if (boss) {
        lightningBolt(fromX, fromY, boss.x, boss.y);
        struck++;
    }

    // The creatures nearest him
    for (const at of strikeCreatures({ x: fromX, y: fromY, count: rules.targets, damage: rules.bossDamage, combatTexts })) {
        lightningBolt(fromX, fromY, at.x, at.y);
        struck++;
    }

    // Then the harmful things falling nearest him, gone in a flash
    const harmful = fireballs
        .filter(projectile => isHarmfulProjectile(projectile.data))
        .map(projectile => ({ projectile, distance: Math.hypot(projectile.x + projectile.width / 2 - fromX, projectile.y + projectile.height / 2 - fromY) }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, rules.targets);
    for (const { projectile } of harmful) {
        const x = projectile.x + projectile.width / 2;
        const y = projectile.y + projectile.height / 2;
        lightningBolt(fromX, fromY, x, y);
        fireballs.splice(fireballs.indexOf(projectile), 1);
        struck++;
    }

    if (struck > 0) combatTexts.push(new CombatText(fromX, player.y - 30, 'Thunderfury!', '#7fc8ff', false));
}

// A boss went down: it pays coins, and the site decides what it dropped. A logged-in player
// keeps the item on their account; a guest is only shown it. How the fight went goes with it,
// for the player's record of the game.
function onBossDefeated(boss, fight = null, at = null) {
    say('bossDefeated');
    gameState.coins += coinsForBoss(boss.zone, gameConfig.coins);
    if (gameState.mode === 'boss_rush') gameState.rushPause = gameConfig.bossRush.breather;
    if (gameState.mode === 'boss_fight') gameState.bossDownFor = 0;
    
    lootSystem.reportBoss(boss.id, fight).then(drop => {
        if (!drop) return;
        setUnlockedZone(boss.faction, drop.unlockedZone);
        // Beaten, and kept on the account: it may be fought on its own from now on
        if (drop.kept) rememberBeaten(boss.id);
        
        // The large quiver, found once by each hunter at most: this one's now, and it goes on at
        // once if the quiver slot is free (or holds only the clothes he started in)
        if (drop.quiver && siteBoot && siteBoot.user) {
            siteBoot.user.quiver = true;
            accountGear(boss.faction)[LARGE_QUIVER] = 1;
            const inSlot = gameState.equipment.quiver ? wearableById(gameState.equipment.quiver) : null;
            if (!inSlot || inSlot.starter) setEquipment(equip(gameState.equipment, 'quiver', wearableById(LARGE_QUIVER), wearables()));
            addNotification(gameState, hasLargeQuiver()
                ? `${drop.quiver}! Your quiver now holds ${gameState.quiverCapacity} arrows`
                : `${drop.quiver}! Put it on in the quiver slot for ${quiverCapacity(gameConfig.quiver, true)} arrows`, 480, '#FF8000');
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 90, 'Large quiver!', '#FF8000', true));
        }
        // A Binding of the Windseeker, into this hunter's bank: half of what Thunderfury is made of
        for (const binding of drop.bindings || []) {
            if (siteBoot && siteBoot.user) {
                const bank = { ...sideOf(siteBoot.user.materials, boss.faction) };
                bank[binding.id] = (bank[binding.id] || 0) + 1;
                setSideOf('materials', boss.faction, bank);
            }
            addNotification(gameState, `${binding.name}! It is in your bank: Thunderfury is made from both`, 600, '#FF8000');
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 120, binding.name, '#FF8000', true));
        }
        // A bag, on at once: more room in the bags from now on, this game too
        if (drop.bag && siteBoot && siteBoot.user) {
            siteBoot.user.bags = drop.bag.bags;
            gameState.bagCapacity = bagCapacity(gameConfig.bags, siteBoot.user.bags) - (gameState.bagged || []).length;
            addNotification(gameState, `${boss.name} dropped a ${drop.bag.size}-slot bag! It is on: your bags hold ${gameState.bagCapacity}`, 480, '#9FE870');
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 150, `${drop.bag.size}-slot bag`, '#9FE870', true));
        }
        // A piece of the zone's hunter set: his, and it goes on as one caught does
        const piece = drop.setPiece ? gameItems.find(item => item.id === drop.setPiece.id) : null;
        if (piece) {
            if (drop.kept && siteBoot && siteBoot.user) {
                const pieces = accountPieces(boss.faction);
                if (!pieces.includes(piece.id)) pieces.push(piece.id);
                if (carryCaught(piece.id)) wearCaughtPiece(piece);
            }
            gameState.bossLoot.push({ boss, item: { id: piece.id, name: piece.name, rarity: 'epic' }, kept: drop.kept, timesFound: null });
            if (gameState.gameRunning && at) popBossLoot({ id: piece.id, name: piece.name, rarity: 'epic', image: piece.image }, at);
            const set = setById(gameConfig.sets, piece.set);
            const owned = ownedCount(piecesOf(gameItems, piece.set), ownedPieces());
            addNotification(gameState, drop.kept
                ? `${boss.name} dropped ${piece.name}: ${set.name} ${owned}/${piecesOf(gameItems, piece.set).length}`
                : `Loot: ${piece.name} - log in to keep it`, 480, '#C77DFF');
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 70, piece.name, '#C77DFF', true));
        }
        // An early boss's zone gear besides its item: his as the item is, and it pops out too
        (drop.extras || []).forEach((extra, i) => {
            if (drop.kept && siteBoot && siteBoot.user && isKeptGear(extra.id)) {
                const gear = accountGear(boss.faction);
                gear[extra.id] = (gear[extra.id] || 0) + 1;
                carryCaught(extra.id);
            }
            gameState.bossLoot.push({ boss, item: extra, kept: drop.kept, timesFound: null });
            itemsListCache.needsUpdate = true;
            if (!gameState.gameRunning) return;
            if (at) popBossLoot(extra, at);
            const color = BOSS_LOOT_COLORS[extra.rarity] || '#1EFF00';
            noteFound(extra.name, color);
            // Under the item's floating text, one line each
            combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 160 - 30 * i, extra.name, color, true));
        });
        if (drop.extras && drop.extras.length && gameState.gameRunning) {
            addNotification(gameState, drop.kept
                ? `${boss.name} also dropped ${drop.extras.map(extra => extra.name).join(' and ')}`
                : `Loot: ${drop.extras.length} more pieces - log in to keep them`, 480, '#1EFF00');
        }
        if (!drop.item) return;
        // Kept: its side's hunter owns it from now on
        if (drop.kept && siteBoot && siteBoot.user && isKeptGear(drop.item.id)) {
            const gear = accountGear(boss.faction);
            gear[drop.item.id] = (gear[drop.item.id] || 0) + 1;
            // With him, while there is room in his 36 (the site did the same)
            carryCaught(drop.item.id);
        }
        
        // Listed with the game's loot, in the panel and on the loot screen
        gameState.bossLoot.push({ boss, item: drop.item, kept: drop.kept, timesFound: drop.timesFound });
        itemsListCache.needsUpdate = true;
        if (!gameState.gameRunning) return;
        
        // It pops out of the boss, as a creature's loot does: already his (the site has it), so
        // catching it is only the moment it is his to see; missed, it is his all the same
        if (at) popBossLoot(drop.item, at);
        
        const color = BOSS_LOOT_COLORS[drop.item.rarity] || '#FFD700';
        noteFound(drop.item.name, color);
        // Kept short: the message bar cuts long lines off
        const message = drop.kept ? `${boss.name} dropped ${drop.item.name}` : `Loot: ${drop.item.name} - log in to keep it`;
        addNotification(gameState, message, 420, color);
        // Floating text as well: phones do not show the message bar
        combatTexts.push(new CombatText((canvas.logicalWidth || canvas.width) / 2, player.y - 40, drop.item.name, color, true));
    }).catch(console.error);
}

// What the game earned, on the game over screen. "banked" is the server's answer once it has
// recorded the game: { earned, balance }, balance being null for guests.
// What a game brought home and what it was, for the end of the game (ui/gameOverScreen.js)
function gameOverSummary() {
    const faction = gameState.faction || getFaction() || 'alliance';
    const side = faction[0].toUpperCase() + faction.slice(1);
    const place = currentBackgroundName();
    const name = gameState.playerName || getAccountName() || 'The hunter';
    const loggedIn = Boolean(siteBoot && siteBoot.user);
    const fell = !gameState.victory && !gameState.rushComplete && !gameState.bossFightWon && gameState.health <= 0;
    const seconds = Math.floor(gameState.elapsedTime || 0);
    const minutes = Math.floor(seconds / 60);
    const modeLabel = { normal: 'normal game', boss_rush: 'Boss Rush', boss_fight: 'boss fight' }[gameState.mode] || 'normal game';
    
    const home = [];
    // What the bosses dropped
    for (const drop of gameState.bossLoot) {
        home.push({
            image: drop.boss.image,
            name: drop.item.name,
            rarity: drop.item.rarity,
            note: `Dropped by ${drop.boss.name}${drop.kept ? '' : ' · log in to keep boss loot'}`,
            isNew: drop.kept && drop.timesFound === 1,
        });
    }
    // The set pieces, weapons and jewellery caught: kept, and wearable
    for (const item of gameItems.filter(candidate => candidate.collected > 0 && (candidate.type === 'set_piece' || isKeptGear(candidate.id)))) {
        const set = item.type === 'set_piece' ? setById(gameConfig.sets, item.set) : null;
        const pieces = set ? piecesOf(gameItems, set.id) : [];
        home.push({
            image: item.image,
            name: item.name,
            rarity: 'epic',
            note: set ? `${set.name}: you have ${ownedCount(pieces, ownedPieces())} of ${pieces.length}` : (loggedIn ? (isGuestAccount() ? 'Kept in your guest session' : 'Kept on your account') : 'Log in to keep what you find'),
            isNew: false,
        });
    }
    // The crafting materials this game caught (the bags kept what was in them before)
    const contents = (gameState.bags && gameState.bags.contents) || {};
    const before = gameState.bagsAtStart || {};
    const caughtNow = Object.entries(contents)
        .map(([itemId, count]) => [itemId, count - (before[itemId] || 0)])
        .filter(([itemId, count]) => MATERIALS.has(itemId) && count > 0);
    for (const [itemId, count] of caughtNow) {
        const item = gameItems.find(candidate => candidate.id === itemId);
        home.push({
            image: item ? item.image : '',
            name: `${item ? item.name : itemId} ×${count}`,
            rarity: 'rare',
            note: loggedIn ? 'Crafting material, kept in your bags' : 'Log in to keep materials',
            isNew: false,
            material: itemId,
        });
    }
    
    // What was sold: the junk in the bags, and what did not fit
    const notes = [];
    const junk = Object.entries(contents).filter(([itemId]) => !MATERIALS.has(itemId) && !isCrafted(itemId) && !isKeptGear(itemId) && gameItems.find(item => item.id === itemId)?.type !== 'set_piece')
        .reduce((total, [, count]) => total + count, 0);
    if (junk > 0) notes.push({ text: `${junk} ${junk === 1 ? 'thing' : 'things'} of no use sold for coins`, kind: '' });
    const short = Object.values((gameState.bags && gameState.bags.overflow) || {}).reduce((total, count) => total + count, 0);
    if (short > 0) {
        const share = Math.round((1 - Math.max(0, gameConfig.bags.fullPenalty - gameState.setBonus.carrying)) * 100);
        notes.push({ text: `${short} ${short === 1 ? 'thing' : 'things'} did not fit in your bags and sold for ${share}%`, kind: 'warning' });
    }
    if (!loggedIn) notes.push({ text: 'Log in to keep your coins, boss loot, gear and materials.', kind: '' });
    else if (isGuestAccount()) notes.push({ text: 'Kept in this browser as a guest for a week after you last play. Sign up to keep it for good.', kind: '' });
    
    const figures = [
        { name: 'Level', value: String((gameState.currentLevel || 0) + 1) },
        { name: 'Time', value: `${minutes}:${String(seconds % 60).padStart(2, '0')}` },
        { name: 'Caught', value: String(gameState.perfectCollections || 0) },
        { name: 'Bosses', value: String(gameState.bossLoot.length), kind: 'bosses' },
        { name: 'Coins earned', value: formatCoins(gameState.coins || 0), kind: 'earned' },
    ];
    if (loggedIn) figures.push({ name: 'You have', value: formatCoins(siteBoot.user.coins || 0), kind: 'purse' });
    
    const title = gameState.bossFightWon ? 'Boss defeated!' : gameState.rushComplete ? 'Boss Rush complete!' : gameState.victory ? 'Victory!' : 'Game over';
    const where = place ? ` in ${place}` : '';
    
    return {
        title,
        heading: fell ? `${name} fell${where}` : `${name}${where}`,
        label: `${side} · ${modeLabel} · version ${GAME_VERSION}`,
        line: `Level ${(gameState.currentLevel || 0) + 1} · ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ${seconds % 60} ${seconds % 60 === 1 ? 'second' : 'seconds'}`,
        score: gameState.score,
        figures,
        home,
        homeLabel: loggedIn ? 'Kept on your account' : 'Kept with an account',
        notes,
        scene: currentBackgroundImage(),
        figure: hunterImage(),
        fell,
    };
}

// The coins the site kept for this game, and what the player has now
function showCoinsEarned(banked) {
    if (banked.balance !== null && banked.balance !== undefined && siteBoot && siteBoot.user) {
        siteBoot.user.coins = banked.balance;
        renderAccountBar();
    }
    showGameOverResult({ earned: banked.earned, balance: banked.balance });
}

function endGame() {
    gameState.gameRunning = false;
    
    const summary = gameOverSummary();
    showGameOverSummary({ ...summary, rank: '' });
    
    // Where the score landed on the high scores, among those of this version of the game
    const showRank = rank => {
        if (rank > 0) showGameOverResult({ rank: `#${rank} on the high scores of version ${GAME_VERSION}` });
    };
    
    try {
        // Under the site the server records the game, and a game that counts goes on the leaderboard
        const recorded = lootSystem.finishGame();
        
        if (recorded) {
            recorded.then(result => {
                if (result.scores) cacheHighScores(result.scores);
                // What he wears and carries, saved again now the site has what he caught: saved
                // during the game, a piece caught then was not his yet, and was left out
                if (siteBoot && siteBoot.user) saveEquipment();
                if (result.coins) showCoinsEarned(result.coins);
                // What is kept on the account now, for the inventory, and the totals beside
                // the materials brought home
                if (result.materials && result.materials.bank && siteBoot && siteBoot.user) {
                    setSideOf('materials', gameState.faction, result.materials.bank);
                }
                // The bags as they are kept now: the materials this game brought, less what
                // was drunk
                if (result.bags && siteBoot && siteBoot.user) {
                    setSideOf('bagContents', gameState.faction, result.bags);
                    showGameOverResult({ home: summary.home.map(thing => thing.material && result.bags[thing.material]
                        ? { ...thing, note: `${result.bags[thing.material]} in your bags now` }
                        : thing) });
                    refreshInventory();
                }
                
                if (result.mode === 'boss_rush' || result.mode === 'boss_fight') {
                    showGameOverResult({ rank: result.mode === 'boss_fight' ? 'A boss fight is not played for the leaderboard' : 'Boss Rush is not played for the leaderboard' });
                } else if (result.legal) {
                    showRank(result.rank);
                } else {
                    showGameOverResult({ rank: 'Offline game: not on the leaderboard' });
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
    
    // A boss fight won has had its cheer already, when the boss fell
    if (!gameState.bossFightWon) say(gameState.victory || gameState.rushComplete ? 'victory' : 'gameOver');
    
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