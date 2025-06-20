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

import { tryAutoInitAudio, startBackgroundMusic, playVoiceSound, playUffSound, playScreamSound, playTotalSound, playFireballImpactSound, playDragonstalkerSound, playItemSound, toggleAudio, audioInitialized, audioState, volumeSettings } from './systems/audioSystem.js';
import { loadHighScores, addHighScore, isHighScore, displayHighScores, displayHighScoresSync } from './systems/highScoreSystem.js';
import { initializeInputSystem, updatePlayerPosition } from './systems/inputSystem.js';
import { drawSettings, drawPauseMenu, drawUnifiedPanel, drawDragonstalkerProgress } from './systems/renderSystem.js';

import { calculateLevelSpeedMultiplier, isValidYPosition, cleanupRecentDropPositions, calculateDeltaTimeMultiplier, updateGameStateTimers, addNotification, updateNotifications, drawNotifications } from './utils/gameUtils.js';
import { selectRandomItem, selectRandomProjectile, selectRandomPowerUp, shouldSpawnPowerUp, createCollectionParticles, calculateProjectileProbability } from './utils/spawning.js';
import { spellSystem } from './systems/spellSystem.js';

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
    currentLevel: 1,
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
function init() {
    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Initialize player
    player = new Player(canvas.width, canvas.height);
    gameState.player = player;
    
    // Initialize audio
    tryAutoInitAudio();
    
    // Initialize input system
    initializeInputSystem(canvas, gameState, player, restartGame, startGame, showInGameSettings, showPauseMenu, () => {
        gameState.currentScreen = 'highScores';
        safeDisplayHighScores();
    }, updateCanvasOverlay);
    
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
    
    // Set up UI event handlers
    setupUIEventHandlers();
    
    // Show name entry screen on start
    showNameEntry();
    
    // Load high scores on initialization
    safeDisplayHighScores();
    
    // Initialize canvas overlay
    updateCanvasOverlay();
    
    // Start game loop
    gameLoop();
}

// Handle window resize to maintain fullscreen and reposition player
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    // Reposition player if needed
    if (player && player.repositionOnResize) {
        player.repositionOnResize(canvas.width, canvas.height);
    }
});

// Update canvas overlay visibility based on game state
function updateCanvasOverlay() {
    if (!canvasOverlay) return;
    
    // Show overlay (block canvas interaction) when game is not actively running
    // Hide overlay (allow canvas interaction) only when game is running and not paused/showing menus
    const shouldBlockCanvas = !gameState.gameRunning || 
                             gameState.showingSettings || 
                             gameState.showingPauseMenu ||
                             gameState.currentScreen !== 'game';
    
    if (shouldBlockCanvas) {
        canvasOverlay.classList.remove('hidden');
    } else {
        canvasOverlay.classList.add('hidden');
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
    // Only update game objects if the game is actually running
    if (!gameState.gameRunning) {
        return;
    }
    
    // Update game state timers
    updateGameStateTimers(gameState, deltaTimeMultiplier);
    
    // Update notifications
    updateNotifications(gameState, deltaTimeMultiplier);
    
    // Update spell system (pass player, canvas, and gameConfig for teleportation)
    spellSystem.update(Date.now(), player, canvas, gameConfig);
    
    // Update level and speed
    calculateLevelSpeedMultiplier(gameState);
    gameState.speedMultiplier = gameState.levelSpeedMultiplier;
    
    // Update player
    updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig);
    
    // Update player's internal timers and visual states
    if (player.updateTimers) {
        player.updateTimers(deltaTimeMultiplier);
    }
    
    // Spawn items, projectiles, and power-ups
    spawnItems(deltaTimeMultiplier);
    spawnProjectiles(deltaTimeMultiplier);
    spawnPowerUps(deltaTimeMultiplier);
    
    // Update falling items
    updateFallingItems(deltaTimeMultiplier);
    
    // Update projectiles
    updateProjectiles(deltaTimeMultiplier);
    
    // Update power-ups
    updatePowerUps(deltaTimeMultiplier);
    
    // Update particles
    updateParticles(deltaTimeMultiplier);
    
    // Check collisions
    checkCollisions();
    
    // Check win/lose conditions
    checkGameEndConditions();
    
    // Clean up old drop positions
    cleanupRecentDropPositions(recentDropYPositions);
}

// Render everything
function render() {
    // Clear canvas (background is handled by CSS)
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState.currentScreen === 'menu') {
        renderMainMenu();
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
function renderMainMenu() {
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
            ctx.fillText('DMTRIBUT GAME', canvas.width/2, canvas.height/2 - 100);
    
    ctx.font = '24px Arial';
    ctx.fillText('Enter your name and press SPACE to start', canvas.width/2, canvas.height/2);
    ctx.fillText('Press H for High Scores', canvas.width/2, canvas.height/2 + 50);
}

function renderGame() {
    // Draw movable area border if enabled
    if (gameConfig.player.movableArea.enabled && gameConfig.player.movableArea.showBorder) {
        const movableArea = gameConfig.player.movableArea;
        const movableHeight = canvas.height * movableArea.heightPercent;
        const borderY = canvas.height - movableHeight;
        
        ctx.save();
        ctx.strokeStyle = movableArea.borderColor;
        ctx.globalAlpha = movableArea.borderOpacity;
        ctx.lineWidth = movableArea.borderWidth;
        
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
    
    // Render UI panels
    drawUnifiedPanel(ctx, gameState, gameItems);
    drawDragonstalkerProgress(ctx, canvas, gameState, gameItems);
    
    // Draw notifications (top center)
    drawNotifications(ctx, canvas, gameState);
    
    // Health bar - top right
    const healthBarWidth = 200;
    const healthBarHeight = 20;
    const healthBarX = canvas.width - healthBarWidth - 20;
    const healthBarY = 60;
    
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
    ctx.fillRect(10, canvas.height - 50, 350, 40);
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, canvas.height - 50, 350, 40);
    
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Level Speed:', 20, canvas.height - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    // Calculate effective speed with new cut_time logic (subtraction instead of multiplication)
    const effectiveSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
    const speedText = `${effectiveSpeed.toFixed(1)}x`;
    ctx.fillText(speedText, 110, canvas.height - 30);
    
    // Calculate and display effective item speed
    ctx.fillStyle = '#00BFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Item Speed:', 180, canvas.height - 30);
    
    ctx.fillStyle = 'white';
    ctx.font = '14px Arial';
    // Calculate the actual effective speed items are falling at
    const baseSpeed = gameState.baseDropSpeed || 2;
    const levelMultiplier = effectiveSpeed;
    const speedBoostMultiplier = gameState.speedIncreaseMultiplier || 1.0;
    const timeSlowMultiplier = gameState.timeSlowMultiplier || 1.0;
    
    const effectiveItemSpeed = baseSpeed * levelMultiplier * speedBoostMultiplier * timeSlowMultiplier;
    ctx.fillText(`${effectiveItemSpeed.toFixed(1)}`, 270, canvas.height - 30);
    
    // Show permanent reduction if active (now shows additive reduction amount)
    if (gameState.permanentSpeedReduction > 0) {
        ctx.fillStyle = '#8A2BE2';
        ctx.font = '12px Arial';
        ctx.fillText(`(cut: -${gameState.permanentSpeedReduction.toFixed(1)}x)`, 110, canvas.height - 15);
    }
    
    // Show active modifiers
    let modifierText = '';
    if (gameState.speedIncreaseActive) {
        modifierText += `+${gameState.currentSpeedIncreasePercent}% `;
    }
    if (gameState.timeSlowActive) {
        const slowPercent = Math.round((1 - timeSlowMultiplier) * 100);
        modifierText += `-${slowPercent}% `;
    }
    if (modifierText) {
        ctx.fillStyle = '#FFA500';
        ctx.font = '12px Arial';
        ctx.fillText(`(${modifierText.trim()})`, 270, canvas.height - 15);
    }
    
    // Render power-up status indicators
    renderPowerUpStatus();
    
    // Render spell UI
    renderSpellUI();
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
        ctx.fillText('ALL ITEMS FROZEN', 15, yOffset + 20);
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

// Load spell icons
function loadSpellIcons() {
    // Dragon Cry spell icon
    const dragonCryIcon = new Image();
    dragonCryIcon.onload = () => {
        images.spells.dragon_cry = dragonCryIcon;
    };
    dragonCryIcon.src = 'assets/onyxia-buff.png';
    
    // Zandalari spell icon
    const zandalariIcon = new Image();
    zandalariIcon.onload = () => {
        images.spells.zandalari = zandalariIcon;
    };
    zandalariIcon.src = 'assets/zg-buff.png';
    
    // Songflower spell icon
    const songflowerIcon = new Image();
    songflowerIcon.onload = () => {
        images.spells.songflower = songflowerIcon;
    };
    songflowerIcon.src = 'assets/songflower-buff.png';
}

// Game functions (simplified - these would contain the full logic)
function startGame() {
    // Reset game state
    gameState.score = 0;
    gameState.health = gameState.maxHealth;
    gameState.gameRunning = true;
    gameState.currentScreen = 'game';
    
    // Reset all counters
    gameState.perfectCollections = 0;
    gameState.tierSetCollected = 0;
    gameState.tierSetMissed = 0;
    gameState.gameUnwinnable = false;
    gameState.gameWon = false;
    gameState.missedItems = 0;
    gameState.powerUpsSpawned = 0;
    gameState.cutTimeSpawned = 0;
    gameState.lastPowerUpScore = 0;
    
    // Reset level and speed
    gameState.currentLevel = 1;
    gameState.levelSpeedMultiplier = 1.0;
    gameState.speedMultiplier = 1.0;
    gameState.permanentSpeedReduction = 0.0;
    
    // Reset power-up effects
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
    
    // Clear arrays
    fallingItems.length = 0;
    fireballs.length = 0;
    powerUps.length = 0;
    particles.length = 0;
    recentDropYPositions.length = 0;
    
    // Reset item collection counters
    gameItems.forEach(item => {
        item.collected = 0;
        item.missed = 0;
        item.spawned = 0;
    });
    
    // Start background music
    startBackgroundMusic();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

function restartGame() {
    // Reset all game state
    gameState.score = 0;
    gameState.health = 100;
    gameState.currentLevel = 1;
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
    
    gameState.gameRunning = true;
    gameState.currentScreen = 'game';
    
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
        const stillActive = gameState.freezeTimeActive ? true : item.update(deltaTimeMultiplier, canvas);
        
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
        const stillActive = gameState.freezeTimeActive ? true : powerUp.update(gameState, deltaTimeMultiplier, canvas);
        return stillActive && !powerUp.missed;
    });
}

function updateParticles(deltaTimeMultiplier) {
    particles = particles.filter(particle => particle.update(deltaTimeMultiplier));
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
                
                // Play sounds and handle tier set collection
                if (item.itemData.type === "tier_set") {
                    playDragonstalkerSound();
                    
                    // Only increment if this is the first time collecting this specific piece
                    if (item.itemData.collected === 1) { // collected was incremented above, so 1 means first time
                        gameState.tierSetCollected++;
                    }
                    
                    // Trigger player celebration for tier set collection
                    if (player.onTierSetCollected) {
                        player.onTierSetCollected();
                    }
                    
                    // Add notification for tier set collection
                    // Use actual unique count for display
                    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                    addNotification(gameState, `🏆 ${item.itemData.name} (${uniquePiecesCollected}/8)`, 240, '#FFD700');
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
                    addNotification(gameState, `❄️ Time Frozen ${freezeSeconds}s`, 120, '#87CEEB');
                    
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
                    // Check if shield is active - if so, block all damage
                    if (gameState.shieldActive) {
                        // Shield blocks the damage
                        addNotification(gameState, `🛡️ Damage Blocked!`, 120, '#FFD700');
                        
                        // Still create particles and play sound for feedback
                        createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#FFD700');
                    } else {
                        // Apply damage for harmful projectiles
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
                    }
                }
            }
            
            // Play impact sound
            if (projectile.playImpactSound) {
                projectile.playImpactSound();
            }
            
            // Create particles
            const particleColor = projectile.data ? projectile.data.color : '#FF0000';
            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, particleColor);
            
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
    // 1. All 8 unique Dragonstalker pieces are collected
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // 2. Zee Zgnan Tigar is collected
    const zeeZgnanItem = gameItems.find(item => item.type === "zee_zgnan");
    const zeeZgnanCollected = zeeZgnanItem && zeeZgnanItem.collected > 0;
    
    if ((uniquePiecesCollected >= 8 || zeeZgnanCollected) && !gameState.gameWon) {
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

// Show name entry screen
function showNameEntry() {
    document.getElementById('nameEntry').style.display = 'block';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    gameState.showingSettings = false;
    
    // Focus on name input
    const nameInput = document.getElementById('playerNameInput');
    nameInput.focus();
    nameInput.select();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show high scores screen
function showHighScores() {
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'block';
    document.getElementById('gameOver').style.display = 'none';
    gameState.showingSettings = false;
    
    safeDisplayHighScores();
    
    // Update canvas overlay
    updateCanvasOverlay();
}

// Show items/settings screen from menu
function showItemsFromMenu() {
    // Hide all UI screens
    document.getElementById('nameEntry').style.display = 'none';
    document.getElementById('highScores').style.display = 'none';
    document.getElementById('gameOver').style.display = 'none';
    
    // Show settings overlay
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
    // Start Game button
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.addEventListener('click', startGameFromUI);
    }
    
    // View Scores button
    const viewScoresBtn = document.getElementById('viewScoresBtn');
    if (viewScoresBtn) {
        viewScoresBtn.addEventListener('click', showHighScores);
    }
    
    // View Items button
    const viewItemsBtn = document.getElementById('viewItemsBtn');
    if (viewItemsBtn) {
        viewItemsBtn.addEventListener('click', showItemsFromMenu);
    }
    
    // Back to Menu button
    const backToMenuBtn = document.getElementById('backToMenuBtn');
    if (backToMenuBtn) {
        backToMenuBtn.addEventListener('click', showNameEntry);
    }
    
    // Restart button
    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGameFromUI);
    }
    
    // View Scores button 2 (from game over screen)
    const viewScoresBtn2 = document.getElementById('viewScoresBtn2');
    if (viewScoresBtn2) {
        viewScoresBtn2.addEventListener('click', showHighScores);
    }
    
    // Audio toggle button
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
        audioBtn.addEventListener('click', toggleAudioButton);
    }
    
    // Handle Enter key in name input
    const nameInput = document.getElementById('playerNameInput');
    if (nameInput) {
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                startGameFromUI();
            }
        });
        
        // Auto-enable/disable start button based on input
        nameInput.addEventListener('input', () => {
            const startBtn = document.getElementById('startGameBtn');
            if (startBtn) {
                startBtn.disabled = !nameInput.value.trim();
            }
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