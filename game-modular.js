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
import { drawSettings, drawPauseMenu } from './systems/renderSystem.js';

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateDeltaTimeMultiplier, updateGameStateTimers, addNotification, updateNotifications, drawNotifications, responsiveScaler } from './utils/gameUtils.js';
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
    speedMultiplier: 1.0,
    permanentSpeedReduction: 0.0,
    
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
    
    // Counters
    perfectCollections: 0,
    missedItems: 0,
    tierSetCollected: 0,
    tierSetMissed: 0,
    gameUnwinnable: false,
    powerUpsSpawned: 0,
    cutTimeSpawned: 0,
    lastPowerUpScore: 0,
    
    // UI state
    showingSettings: false,
    showingPauseMenu: false,
    menuButtonBounds: null,
    pauseMenuBounds: null,
    
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
    initializeInputSystem(canvas, gameState, player, restartGame, startGame, showInGameSettings, showPauseMenu, () => {
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
    if (!canvasOverlay) return;
    
    // Allow canvas interaction in these cases:
    // 1. Game is running and not paused/showing menus (normal gameplay)
    // 2. On menu screen with Game Guide open (settings from menu)
    const allowCanvasInteraction = (gameState.gameRunning && !gameState.showingSettings && !gameState.showingPauseMenu) ||
                                   (gameState.currentScreen === 'menu' && gameState.showingSettings);
    
    // Allow menu clicks when pause menu or in-game settings are showing
    const allowMenuClicks = gameState.showingPauseMenu || (gameState.gameRunning && gameState.showingSettings);
    
    if (allowCanvasInteraction) {
        canvasOverlay.classList.add('hidden');
        canvasOverlay.classList.remove('allow-menu-clicks');
        canvas.classList.remove('show-cursor');
    } else if (allowMenuClicks) {
        canvasOverlay.classList.remove('hidden');
        canvasOverlay.classList.add('allow-menu-clicks');
        canvas.classList.add('show-cursor');
    } else {
        canvasOverlay.classList.remove('hidden');
        canvasOverlay.classList.remove('allow-menu-clicks');
        canvas.classList.add('show-cursor');
    }
}

// Main game loop
function gameLoop() {
    const deltaTimeMultiplier = calculateDeltaTimeMultiplier();
    
    // Update
    if (gameState.gameRunning && !gameState.showingSettings && !gameState.showingPauseMenu) {
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
    if (typeof gameState.showSpeedMonitor === 'undefined') gameState.showSpeedMonitor = false; // Hidden by default (Ctrl+Shift+S to show)
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
        // Show settings overlay if requested from menu
        if (gameState.showingSettings) {
            drawSettings(ctx, canvas, gameState);
        }
    } else if (gameState.currentScreen === 'game' || gameState.gameRunning) {
        renderGame();
        
        if (gameState.showingSettings) {
            drawSettings(ctx, canvas, gameState);
        } else if (gameState.showingPauseMenu) {
            drawPauseMenu(ctx, canvas, gameState);
        }
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
    
    // Render all game objects
    fallingItems.forEach(item => item.draw(ctx, gameConfig));
    fireballs.forEach(fireball => fireball.draw(ctx));
    powerUps.forEach(powerUp => powerUp.draw(ctx));
    particles.forEach(particle => particle.draw(ctx));
    player.draw(ctx, gameState.shieldActive);
    
    // Update DOM-based items panel (throttled for performance)
    // Only update every 10 frames to reduce DOM manipulation overhead
    if (!gameState.domUpdateCounter) gameState.domUpdateCounter = 0;
    gameState.domUpdateCounter++;
    if (gameState.domUpdateCounter % 10 === 0) {
        updateDOMItemsPanel(gameState, gameItems);
    }
    
    // Draw notifications (top center)
    drawNotifications(ctx, canvas, gameState);
    
    // Health bar - top right (now responsive)
    const uiSizes = responsiveScaler.getSize('ui');
    const healthBarWidth = uiSizes.healthBarWidth;
    const healthBarHeight = uiSizes.healthBarHeight;
    const healthBarX = canvas.width - healthBarWidth - responsiveScaler.scale(20);
    const healthBarY = responsiveScaler.scale(60);
    
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
    
    // Health text (responsive font size)
    ctx.fillStyle = 'white';
    ctx.font = `bold ${uiSizes.fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.ceil(gameState.health)}%`, healthBarX + healthBarWidth/2, healthBarY + healthBarHeight/2 + uiSizes.fontSize/3);
    ctx.textAlign = 'left';
    
    // Old speed panel removed - replaced by superior Speed Analysis Monitor
    
    // Render power-up status indicators
    renderPowerUpStatus();
    
    // Render spell UI
    renderSpellUI();
    
    // Render speed analysis monitor (throttled for performance)
    if (!gameState.speedMonitorCounter) gameState.speedMonitorCounter = 0;
    gameState.speedMonitorCounter++;
    if (gameState.speedMonitorCounter % 5 === 0) { // Update every 5 frames
        renderSpeedAnalysisMonitor();
    }
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

function renderSpellUI() {
    const currentTime = Date.now();
    const spellPadding = 15;
    const spellWidth = 80;
    const spellHeight = 60;
    
    // Position spells in the center, just above the movement constraint line
    const totalSpellsWidth = (spellWidth * 3) + (spellPadding * 2); // 3 spells with 2 paddings between
    const startX = (canvas.width - totalSpellsWidth) / 2; // Center horizontally
    
    // Calculate position just above the movement constraint line
    let startY = canvas.height - 100; // Default position
    if (gameConfig.player.movableArea.enabled) {
        const movableHeight = canvas.height * gameConfig.player.movableArea.heightPercent;
        const borderY = canvas.height - movableHeight;
        startY = borderY - spellHeight - 20; // 20px above the border line
    }
    
    // Spell data with icons
    const spells = [
        { 
            id: 'dragon_cry', 
            key: 'Q', 
            name: 'Dragon Cry', 
            color: '#FF4500',
            icon: 'assets/onyxia-buff.png'
        },
        { 
            id: 'zandalari', 
            key: 'W', 
            name: 'Zandalari', 
            color: '#FFD700',
            icon: 'assets/zg-buff.png'
        },
        { 
            id: 'songflower', 
            key: 'E', 
            name: 'Songflower', 
            color: '#FF69B4',
            icon: 'assets/songflower-buff.png'
        }
    ];
    
    spells.forEach((spell, index) => {
        const x = startX + (spellWidth + spellPadding) * index;
        const y = startY;
        
        // Get spell status
        const cooldownRemaining = spellSystem.getCooldownRemaining(spell.id, currentTime);
        const durationRemaining = spellSystem.getDurationRemaining(spell.id, currentTime);
        const isActive = spellSystem.isSpellActive(spell.id);
        const isOnCooldown = cooldownRemaining > 0;
        
        // Draw spell background
        ctx.fillStyle = isActive ? 'rgba(0, 255, 0, 0.3)' : 
                       isOnCooldown ? 'rgba(255, 0, 0, 0.3)' : 
                       'rgba(255, 255, 255, 0.2)';
        ctx.fillRect(x, y, spellWidth, spellHeight);
        
        // Draw spell border
        ctx.strokeStyle = isActive ? '#00FF00' : 
                         isOnCooldown ? '#FF0000' : 
                         spell.color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, spellWidth, spellHeight);
        
        // Draw spell icon if available
        if (spell.icon && images.spells && images.spells[spell.id]) {
            const iconSize = 32;
            const iconX = x + (spellWidth - iconSize) / 2;
            const iconY = y + 5;
            
            // Apply opacity if on cooldown
            if (isOnCooldown) {
                ctx.globalAlpha = 0.5;
            }
            
            ctx.drawImage(images.spells[spell.id], iconX, iconY, iconSize, iconSize);
            
            // Reset opacity
            ctx.globalAlpha = 1.0;
        } else {
            // Fallback to key letter if no icon
            ctx.fillStyle = 'white';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(spell.key, x + spellWidth/2, y + 25);
        }
        
        // Draw key binding in bottom corner
        ctx.fillStyle = 'white';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(spell.key, x + spellWidth/2, y + spellHeight - 20);
        
        // Draw spell name
        ctx.font = '8px Arial';
        ctx.fillText(spell.name, x + spellWidth/2, y + spellHeight - 8);
        
        // Draw cooldown/duration timer
        if (isActive && durationRemaining > 0) {
            ctx.fillStyle = '#00FF00';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`${durationRemaining}s`, x + spellWidth/2, y + spellHeight - 35);
        } else if (isOnCooldown) {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`${cooldownRemaining}s`, x + spellWidth/2, y + spellHeight - 35);
        }
    });
    
    // Reset text alignment
    ctx.textAlign = 'left';
}

function renderSpeedAnalysisMonitor() {
    // Speed monitor is now handled by HTML/CSS for better readability
    if (!gameState.showSpeedMonitor) {
        hideSpeedMonitor();
        return;
    }
    
    updateSpeedMonitor();
}

// Create HTML/CSS Speed Monitor
function createSpeedMonitor() {
    if (document.getElementById('speedMonitor')) return; // Already exists
    
    const monitor = document.createElement('div');
    monitor.id = 'speedMonitor';
    monitor.innerHTML = `
        <div class="speed-monitor-header">
            🔍 SPEED ANALYSIS MONITOR
        </div>
        <div class="speed-monitor-content">
            <div class="level-info">
                <span id="speedLevel">Level: 1</span>
                <span id="speedScore">Score: 0</span>
            </div>
            <div class="speed-breakdown">
                <div class="speed-row">
                    <span class="label">Base Drop Speed:</span>
                    <span id="baseSpeed" class="value">2.0 px/frame</span>
                </div>
                <div class="speed-row">
                    <span class="label">Level Speed Multiplier:</span>
                    <span id="levelMultiplier" class="value">1.00x</span>
                </div>
                <div class="speed-row permanent-reduction" style="display: none;">
                    <span class="label">Permanent Reduction:</span>
                    <span id="permanentReduction" class="value">-0.00x</span>
                </div>
                <div class="speed-row">
                    <span class="label">Effective Multiplier:</span>
                    <span id="effectiveMultiplier" class="value">1.00x</span>
                </div>
                <div class="speed-row speed-boost" style="display: none;">
                    <span class="label">Speed Boost:</span>
                    <span id="speedBoost" class="value">1.00x</span>
                </div>
                <div class="speed-row time-slow" style="display: none;">
                    <span class="label">Time Slow:</span>
                    <span id="timeSlow" class="value">1.00x</span>
                </div>
            </div>
            <div class="speed-results">
                <div class="speed-row final">
                    <span class="label">Expected Item Speed:</span>
                    <span id="expectedSpeed" class="value">2.00 px/frame</span>
                </div>
                <div class="speed-row">
                    <span class="label">Speed Range:</span>
                    <span id="speedRange" class="value">1.6 - 2.6 px/frame</span>
                </div>
                <div class="speed-row">
                    <span class="label">Visual Speed:</span>
                    <span id="visualSpeed" class="value">120 px/second</span>
                </div>
            </div>
            <div class="active-items">
                <div class="speed-row">
                    <span class="label">Active Items:</span>
                    <span id="activeItemCount" class="value">0</span>
                </div>
                <div id="itemSpeedList" class="item-list"></div>
            </div>
            <div class="monitor-footer">
                Press Ctrl+Shift+S to toggle • Ctrl+A to boost speed
            </div>
        </div>
    `;
    
    // Add CSS styles
    const style = document.createElement('style');
    style.textContent = `
                 #speedMonitor {
             position: fixed;
             bottom: 10px;
             left: 10px;
             width: 420px;
             background: rgba(0, 0, 0, 0.9);
             border: 2px solid #00FFFF;
             border-radius: 8px;
             font-family: 'Courier New', monospace;
             font-size: 12px;
             color: white;
             z-index: 1000;
             box-shadow: 0 4px 20px rgba(0, 255, 255, 0.3);
             backdrop-filter: blur(5px);
             display: none;
             pointer-events: none;
         }
        
        .speed-monitor-header {
            background: linear-gradient(90deg, #00FFFF, #0080FF);
            color: black;
            font-weight: bold;
            font-size: 14px;
            padding: 8px 12px;
            border-radius: 5px 5px 0 0;
            text-align: center;
        }
        
        .speed-monitor-content {
            padding: 12px;
        }
        
        .level-info {
            display: flex;
            justify-content: space-between;
            color: #FFD700;
            font-weight: bold;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 1px solid #333;
        }
        
        .speed-breakdown, .speed-results, .active-items {
            margin-bottom: 12px;
        }
        
        .speed-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 2px 0;
            line-height: 1.4;
        }
        
        .speed-row.final {
            color: #00FF00;
            font-weight: bold;
            border-top: 1px solid #333;
            padding-top: 6px;
            margin-top: 6px;
        }
        
        .speed-row.permanent-reduction {
            color: #8A2BE2;
        }
        
        .speed-row.speed-boost {
            color: #FF4444;
        }
        
        .speed-row.time-slow {
            color: #4169E1;
        }
        
        .label {
            color: #CCCCCC;
            flex: 1;
        }
        
        .value {
            color: white;
            font-weight: bold;
            text-align: right;
            min-width: 100px;
        }
        
        .item-list {
            max-height: 80px;
            overflow-y: auto;
            margin-top: 6px;
        }
        
        .item-speed {
            font-size: 11px;
            color: #CCCCCC;
            padding: 1px 0;
            display: flex;
            justify-content: space-between;
        }
        
        .item-name {
            color: #FF69B4;
            max-width: 200px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        .item-variation {
            font-size: 10px;
            color: #999;
            margin-left: 20px;
        }
        
        .monitor-footer {
            font-size: 10px;
            color: #888;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 6px;
            margin-top: 8px;
        }
        
        /* Scrollbar styling */
        .item-list::-webkit-scrollbar {
            width: 4px;
        }
        
        .item-list::-webkit-scrollbar-track {
            background: #333;
        }
        
        .item-list::-webkit-scrollbar-thumb {
            background: #00FFFF;
            border-radius: 2px;
        }
    `;
    
    document.head.appendChild(style);
    document.body.appendChild(monitor);
}

// Update HTML Speed Monitor
function updateSpeedMonitor() {
    if (!gameState.gameRunning || gameState.showingSettings || gameState.showingPauseMenu) {
        hideSpeedMonitor();
        return;
    }
    
    createSpeedMonitor();
    const monitor = document.getElementById('speedMonitor');
    if (!monitor) return;
    
    monitor.style.display = 'block';
    
    // Calculate speed values
    const baseSpeed = gameState.baseDropSpeed || 2;
    const levelMultiplier = gameState.levelSpeedMultiplier || 1.0;
    const speedBoost = gameState.speedIncreaseMultiplier || 1.0;
    const timeSlow = gameState.timeSlowMultiplier || 1.0;
    const permanentReduction = gameState.permanentSpeedReduction || 0;
    const effectiveMultiplier = Math.max(0.2, levelMultiplier - permanentReduction);
    
    const expectedSpeed = baseSpeed * effectiveMultiplier * speedBoost * timeSlow;
    const speedRangeMin = expectedSpeed * 0.8;
    const speedRangeMax = expectedSpeed * 1.3;
    
    // Update level info
    document.getElementById('speedLevel').textContent = `Level: ${gameState.currentLevel + 1}`;
    document.getElementById('speedScore').textContent = `Score: ${gameState.score}`;
    
    // Update speed breakdown
    document.getElementById('baseSpeed').textContent = `${baseSpeed.toFixed(1)} px/frame`;
    document.getElementById('levelMultiplier').textContent = `${levelMultiplier.toFixed(2)}x`;
    document.getElementById('effectiveMultiplier').textContent = `${effectiveMultiplier.toFixed(2)}x`;
    
    // Show/hide optional rows
    const permanentRow = document.querySelector('.permanent-reduction');
    if (permanentReduction > 0) {
        permanentRow.style.display = 'flex';
        document.getElementById('permanentReduction').textContent = `-${permanentReduction.toFixed(2)}x`;
    } else {
        permanentRow.style.display = 'none';
    }
    
    const speedBoostRow = document.querySelector('.speed-boost');
    if (speedBoost !== 1.0) {
        speedBoostRow.style.display = 'flex';
        document.getElementById('speedBoost').textContent = `${speedBoost.toFixed(2)}x`;
    } else {
        speedBoostRow.style.display = 'none';
    }
    
    const timeSlowRow = document.querySelector('.time-slow');
    if (timeSlow !== 1.0) {
        timeSlowRow.style.display = 'flex';
        document.getElementById('timeSlow').textContent = `${timeSlow.toFixed(2)}x`;
    } else {
        timeSlowRow.style.display = 'none';
    }
    
    // Update results
    document.getElementById('expectedSpeed').textContent = `${expectedSpeed.toFixed(2)} px/frame`;
    document.getElementById('speedRange').textContent = `${speedRangeMin.toFixed(1)} - ${speedRangeMax.toFixed(1)} px/frame`;
    document.getElementById('visualSpeed').textContent = `${(expectedSpeed * 60).toFixed(0)} px/second`;
    
    // Update active items
    document.getElementById('activeItemCount').textContent = fallingItems.length.toString();
    
    const itemList = document.getElementById('itemSpeedList');
    if (fallingItems.length > 0) {
        const itemsToShow = Math.min(4, fallingItems.length);
        let itemsHTML = '';
        
        for (let i = 0; i < itemsToShow; i++) {
            const item = fallingItems[i];
            const shortName = item.itemData.name.length > 25 ? 
                item.itemData.name.substring(0, 25) + '...' : 
                item.itemData.name;
            
            itemsHTML += `
                <div class="item-speed">
                    <span class="item-name">${shortName}</span>
                    <span>${item.speed.toFixed(2)} px/frame</span>
                </div>
            `;
            
            if (item.speedBreakdown) {
                itemsHTML += `
                    <div class="item-variation">
                        Variation: ${item.speedBreakdown.variation.toFixed(2)}x
                    </div>
                `;
            }
        }
        
        if (fallingItems.length > 4) {
            itemsHTML += `<div class="item-speed" style="color: #666;">... and ${fallingItems.length - 4} more items</div>`;
        }
        
        itemList.innerHTML = itemsHTML;
        
        // Auto-scroll to bottom to show newest items
        itemList.scrollTop = itemList.scrollHeight;
    } else {
        itemList.innerHTML = '<div class="item-speed" style="color: #666;">No active items</div>';
    }
}

// Hide HTML Speed Monitor
function hideSpeedMonitor() {
    const monitor = document.getElementById('speedMonitor');
    if (monitor) {
        monitor.style.display = 'none';
    }
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
    gameState.speedMultiplier = 1.0;
    gameState.permanentSpeedReduction = 0.0;
    gameState.perfectCollections = 0;
    gameState.missedItems = 0;
    gameState.tierSetCollected = 0;
    gameState.tierSetMissed = 0;
    gameState.gameUnwinnable = false;
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
    gameState.gameUnwinnable = false;
    gameState.gameWon = false;
    gameState.levelSpeedMultiplier = 1.0;
    gameState.speedMultiplier = 1.0;
    gameState.permanentSpeedReduction = 0;
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
    gameState.cutTimeSpawned = 0;
    gameState.lastPowerUpScore = 0;
    gameState.notifications = []; // Reset notifications
    
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
    
    // Don't automatically start the game - let the caller decide
    gameState.gameRunning = false;
    gameState.showingPauseMenu = false;
    gameState.showingSettings = false;
    
    // Update canvas overlay
    updateCanvasOverlay();
}

function showInGameSettings() {
    gameState.showingSettings = !gameState.showingSettings;
    updateCanvasOverlay();
}

function showPauseMenu() {
    gameState.showingPauseMenu = true;
    gameState.gameRunning = false;
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
        // Falling items should continue to fall even when freeze is active
        // Only projectiles should be frozen, not beneficial items
        const stillActive = item.update(deltaTimeMultiplier, canvas, gameState);
        
        if (!stillActive && item.missed) {
            gameState.missedItems++;
            
            // Handle tier set items being missed
            if (item.itemData && item.itemData.type === "tier_set") {
                item.itemData.missed++;
                gameState.tierSetMissed++;
                gameState.gameUnwinnable = true;
                playScreamSound();
            } else {
                // Check if shield is active - if so, block missed item damage
                if (gameState.shieldActive) {
                    // Shield blocks the damage from missed items
                    addNotification(gameState, `🛡️ Shield Protected!`, 120, '#FFD700');
                } else {
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
                    
                    // Trigger player celebration for tier set collection
                    if (player.onTierSetCollected) {
                        console.log(`Triggering celebration for: ${item.itemData.name}`);
                        player.onTierSetCollected();
                    }
                    
                    // Add notification for tier set collection
                    // Use actual unique count for display
                    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                    addNotification(gameState, `🏆 ${item.itemData.name} (${uniquePiecesCollected}/10)`, 240, '#FFD700');
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
            // Apply power-up effect
            if (powerUp.applyEffect) {
                powerUp.applyEffect(audioInitialized, audioState, volumeSettings, gameState);
            }
            
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, particles);
            powerUps.splice(powerUpIndex, 1);
        }
    });
}

function checkGameEndConditions() {
    // Check win conditions
    // 1. All 10 unique Dragonstalker pieces are collected
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // 2. Zee Zgnan Tigar is collected
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    if ((uniquePiecesCollected >= 10 || zeeZgnanCollected) && !gameState.gameWon) {
        // Mark victory achieved but don't end the game
        gameState.gameWon = true;
        
        // Show appropriate victory notification
        if (zeeZgnanCollected) {
            addNotification(gameState, `🎯 ZEE ZGNAN TIGAR! ULTIMATE VICTORY! Game continues... 🎯`, 360, '#FF69B4');
        } else {
            addNotification(gameState, `🏆 VICTORY! Complete Dragonstalker Set! Game continues... 🏆`, 360, '#FFD700');
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
    gameState.currentScreen = 'menu';
    gameState.showingSettings = false;
    
    // Focus on name input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.focus();
        nameInput.select();
    }
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show high scores screen
function showHighScores() {
    console.log('Showing high scores screen');
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'block';
    document.getElementById('howToPlay').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    gameState.currentScreen = 'highScores';
    gameState.showingSettings = false;
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show how to play screen
function showHowToPlay() {
    console.log('Showing how to play screen');
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('howToPlay').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    gameState.currentScreen = 'howToPlay';
    gameState.showingSettings = false;
    
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
    
    // Ensure we're on the menu screen and show settings overlay
    gameState.currentScreen = 'menu';
    gameState.showingSettings = true;
    
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
            showNameEntry();
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
        const effectiveSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        gameSpeed.textContent = `${effectiveSpeed.toFixed(1)}x`;
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
    
    // Show/hide section based on progress
    if (uniquePiecesCollected > 0 || gameState.tierSetMissed > 0 || zeeZgnanCollected) {
        section.classList.remove('hidden');
        
        // Update progress
        tierProgress.textContent = `${uniquePiecesCollected}/10`;
        
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
        } else if (gameState.gameUnwinnable) {
            tierStatus.textContent = '❌ VICTORY IMPOSSIBLE ❌';
            tierStatus.classList.add('impossible');
        } else if (uniquePiecesCollected >= 8) {
            tierStatus.textContent = '🏆 ALMOST THERE! 🏆';
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
    } else if (gameState.gameUnwinnable) {
        panel.classList.add('impossible');
    }
    
    // Update progress bar
    const progressFill = document.getElementById('dragonstalkerProgressFill');
    const progressText = document.getElementById('dragonstalkerProgressText');
    if (progressFill && progressText) {
        const progressPercent = (uniquePiecesCollected / 10) * 100;
        progressFill.style.width = `${progressPercent}%`;
        progressText.textContent = `${uniquePiecesCollected}/10 PIECES`;
        
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
        } else if (gameState.gameUnwinnable) {
            statusElement.textContent = '❌ VICTORY IMPOSSIBLE ❌';
            statusElement.classList.add('impossible');
        } else if (uniquePiecesCollected >= 8) {
            statusElement.textContent = '🏆 ALMOST THERE! 🏆';
        } else {
            statusElement.textContent = `Need ${10 - uniquePiecesCollected} more pieces`;
        }
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
        } else if (gameState.gameUnwinnable) {
            bottomMessage.textContent = `Missed ${gameState.tierSetMissed} pieces - Game Over`;
            bottomMessage.classList.add('impossible');
        } else if (uniquePiecesCollected >= 8) {
            bottomMessage.textContent = 'So close to victory!';
            bottomMessage.classList.add('almost-there');
        } else {
            bottomMessage.textContent = 'Collect all pieces to win the game!';
        }
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