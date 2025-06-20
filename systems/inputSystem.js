import { toggleAudio, fallbackAudioInit } from './audioSystem.js';
import { spellSystem } from './spellSystem.js';

// Input system state
export let inputState = {
    mouseX: 0,
    mouseY: 0,
    isMouseDown: false,
    keys: new Set(),
    touchActive: false,
    lastTouchX: 0,
    lastTouchY: 0
};

// Initialize input event listeners
export function initializeInputSystem(canvas, gameState, player, restartGame, startGame, showInGameSettings, showPauseMenu, displayHighScores, updateCanvasOverlay) {
    // Mouse movement tracking
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        inputState.mouseX = e.clientX - rect.left;
        inputState.mouseY = e.clientY - rect.top;
    });

    // Mouse click events
    canvas.addEventListener('mousedown', (e) => {
        inputState.isMouseDown = true;
        fallbackAudioInit(); // Try to initialize audio on user interaction
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        handleMouseClick(mouseX, mouseY, gameState, restartGame, startGame, displayHighScores, updateCanvasOverlay);
    });

    canvas.addEventListener('mouseup', () => {
        inputState.isMouseDown = false;
    });

    // Touch events for mobile support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        fallbackAudioInit(); // Try to initialize audio on user interaction
        
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        inputState.touchActive = true;
        inputState.lastTouchX = touchX;
        inputState.lastTouchY = touchY;
        
        handleMouseClick(touchX, touchY, gameState, restartGame, startGame, displayHighScores, updateCanvasOverlay);
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        inputState.lastTouchX = touch.clientX - rect.left;
        inputState.lastTouchY = touch.clientY - rect.top;
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        inputState.touchActive = false;
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        fallbackAudioInit(); // Try to initialize audio on user interaction
        inputState.keys.add(e.key.toLowerCase());
        
        handleKeyDown(e, gameState, restartGame, showInGameSettings, showPauseMenu, displayHighScores, updateCanvasOverlay);
    });

    document.addEventListener('keyup', (e) => {
        inputState.keys.delete(e.key.toLowerCase());
    });

    // Audio button event listener
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
        audioBtn.addEventListener('click', (e) => {
            e.preventDefault();
            fallbackAudioInit(); // Try to initialize audio on user interaction
            toggleAudio();
        });
    }
}

// Handle mouse/touch clicks
function handleMouseClick(mouseX, mouseY, gameState, restartGame, startGame, displayHighScores, updateCanvasOverlay) {
    if (gameState.showingSettings) {
        // Handle settings menu clicks
        if (gameState.menuButtonBounds && 
            mouseX >= gameState.menuButtonBounds.x && 
            mouseX <= gameState.menuButtonBounds.x + gameState.menuButtonBounds.width &&
            mouseY >= gameState.menuButtonBounds.y && 
            mouseY <= gameState.menuButtonBounds.y + gameState.menuButtonBounds.height) {
            gameState.showingSettings = false;
            gameState.currentScreen = 'menu';
            if (updateCanvasOverlay) updateCanvasOverlay();
        }
    } else if (gameState.showingPauseMenu) {
        // Handle pause menu clicks
        if (gameState.pauseMenuBounds) {
            const bounds = gameState.pauseMenuBounds;
            
            // Continue button
            if (mouseX >= bounds.continue.x && 
                mouseX <= bounds.continue.x + bounds.continue.width &&
                mouseY >= bounds.continue.y && 
                mouseY <= bounds.continue.y + bounds.continue.height) {
                gameState.showingPauseMenu = false;
                gameState.gameRunning = true;
                if (updateCanvasOverlay) updateCanvasOverlay();
            }
            
            // Restart button
            if (mouseX >= bounds.restart.x && 
                mouseX <= bounds.restart.x + bounds.restart.width &&
                mouseY >= bounds.restart.y && 
                mouseY <= bounds.restart.y + bounds.restart.height) {
                restartGame();
            }
        }
    } else if (gameState.currentScreen === 'menu') {
        // Handle main menu clicks
        handleMenuClick(mouseX, mouseY, gameState, startGame, displayHighScores);
    } else if (gameState.currentScreen === 'gameOver') {
        // Handle game over screen clicks
        handleGameOverClick(mouseX, mouseY, gameState, restartGame);
    } else if (gameState.currentScreen === 'victory') {
        // Handle victory screen clicks
        handleVictoryClick(mouseX, mouseY, gameState, restartGame);
    } else if (gameState.currentScreen === 'highScores') {
        // Handle high scores screen clicks
        handleHighScoresClick(mouseX, mouseY, gameState);
    }
}

// Handle keyboard input
function handleKeyDown(e, gameState, restartGame, showInGameSettings, showPauseMenu, displayHighScores, updateCanvasOverlay) {
    // Settings toggle (TAB or I key) - only during gameplay
    if ((e.key === 'Tab' || e.key.toLowerCase() === 'i') && gameState.gameRunning) {
        e.preventDefault();
        showInGameSettings();
        return;
    }
    
    // ESC key handling
    if (e.key === 'Escape') {
        e.preventDefault();
        if (gameState.showingSettings) {
            gameState.showingSettings = false;
            if (gameState.gameRunning) {
                // Return to game
            } else {
                gameState.currentScreen = 'menu';
            }
            if (updateCanvasOverlay) updateCanvasOverlay();
        } else if (gameState.showingPauseMenu) {
            gameState.showingPauseMenu = false;
            gameState.gameRunning = true;
            if (updateCanvasOverlay) updateCanvasOverlay();
        } else if (gameState.gameRunning) {
            showPauseMenu();
        } else if (gameState.currentScreen === 'highScores') {
            gameState.currentScreen = 'menu';
            if (updateCanvasOverlay) updateCanvasOverlay();
        }
        return;
    }
    
    // Space key for various actions
    if (e.key === ' ') {
        e.preventDefault();
        if (gameState.currentScreen === 'menu') {
            // Start game
            const playerNameInput = document.getElementById('playerNameInput');
            const playerName = playerNameInput ? playerNameInput.value.trim() : '';
            if (playerName) {
                gameState.playerName = playerName;
                startGame();
            }
        } else if (gameState.currentScreen === 'gameOver' || gameState.currentScreen === 'victory') {
            restartGame();
        }
        return;
    }
    
    // H key for high scores
    if (e.key.toLowerCase() === 'h' && gameState.currentScreen === 'menu') {
        e.preventDefault();
                    try {
                const result = displayHighScores();
                if (result && typeof result.catch === 'function') {
                    result.catch(console.error);
                }
            } catch (error) {
                console.error('Error calling displayHighScores:', error);
            }
        return;
    }
    
    // R key for restart (during game over or victory)
    if (e.key.toLowerCase() === 'r' && (gameState.currentScreen === 'gameOver' || gameState.currentScreen === 'victory')) {
        e.preventDefault();
        restartGame();
        return;
    }
    
    // M key for return to menu (during game over or victory)
    if (e.key.toLowerCase() === 'm' && (gameState.currentScreen === 'gameOver' || gameState.currentScreen === 'victory')) {
        e.preventDefault();
        gameState.currentScreen = 'menu';
        if (updateCanvasOverlay) updateCanvasOverlay();
        return;
    }
    
    // Spell casting keys (Q, W, E, R) - only during gameplay
    if (gameState.gameRunning && ['q', 'w', 'e', 'r'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        spellSystem.castSpellByKey(e.key, Date.now());
        return;
    }
}

// Update player position based on input
export function updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig) {
    // Import gameConfig if not passed (for backward compatibility)
    if (!gameConfig) {
        // Fallback to default movable area settings
        gameConfig = {
            player: {
                movableArea: {
                    enabled: true,
                    heightPercent: 0.3
                }
            }
        };
    }
    
    // Calculate movable area bounds
    const movableArea = gameConfig.player.movableArea;
    let minX = 0;
    let maxX = canvas.width - player.width;
    let minY = 0;
    let maxY = canvas.height - player.height;
    
    // Check if player has unrestricted movement from spells
    const hasUnrestrictedMovement = spellSystem.hasUnrestrictedMovement();
    
    if (movableArea.enabled && !hasUnrestrictedMovement) {
        // Constrain to bottom portion of canvas (unless spell allows unrestricted movement)
        const movableHeight = canvas.height * movableArea.heightPercent;
        minY = canvas.height - movableHeight;
        maxY = canvas.height - player.height;
    }
    
    if (inputState.touchActive) {
        // Touch input - move towards touch position (but respect movable area)
        let targetX = inputState.lastTouchX - player.width / 2;
        let targetY = inputState.lastTouchY - player.height / 2;
        
        // Constrain target position to movable area
        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));
        
        // Smooth movement towards constrained target position
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > 5) {
            const moveSpeed = player.speed * deltaTimeMultiplier;
            player.x += (dx / distance) * moveSpeed;
            player.y += (dy / distance) * moveSpeed;
        }
    } else {
        // Mouse input - follow mouse position directly (but respect movable area)
        player.x = inputState.mouseX - player.width / 2;
        player.y = inputState.mouseY - player.height / 2;
    }
    
    // Keep player within movable area bounds
    player.x = Math.max(minX, Math.min(maxX, player.x));
    player.y = Math.max(minY, Math.min(maxY, player.y));
}

// Helper functions for menu clicks
function handleMenuClick(mouseX, mouseY, gameState, startGame, displayHighScores) {
    // This would contain the menu click handling logic
    // Implementation depends on your menu layout
}

function handleGameOverClick(mouseX, mouseY, gameState, restartGame) {
    // This would contain the game over screen click handling logic
}

function handleVictoryClick(mouseX, mouseY, gameState, restartGame) {
    // This would contain the victory screen click handling logic
}

function handleHighScoresClick(mouseX, mouseY, gameState) {
    // This would contain the high scores screen click handling logic
} 