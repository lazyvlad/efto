import { toggleAudio, fallbackAudioInit } from './audioSystem.js';
import { spellSystem } from './spellSystem.js';
import { responsiveScaler } from '../utils/gameUtils.js';

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
export function initializeInputSystem(canvas, gameState, player, restartGame, startGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay) {
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
        
        handleKeyDown(e, gameState, restartGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay);
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
    if (gameState.currentScreen === 'menu') {
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
function handleKeyDown(e, gameState, restartGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay) {
    // TAB/I key handling removed - canvas-based guide replaced with HTML+CSS
    
    // Speed monitor removed - no longer needed
    
    // Testing: Increase Base Speed (Ctrl+A) - during gameplay
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && gameState.gameRunning) {
        e.preventDefault();
        gameState.baseDropSpeed += 0.5; // Increase by 0.5 each press
        console.log(`🚀 TESTING: Base Drop Speed increased to ${gameState.baseDropSpeed.toFixed(1)} (Ctrl+A to increase, was ${(gameState.baseDropSpeed - 0.5).toFixed(1)})`);
        return;
    }
    
    // ESC key handling
    if (e.key === 'Escape') {
        e.preventDefault();

        if (gameState.showingPauseMenu) {
            // Close HTML pause menu and resume game
            document.getElementById('pauseMenu').style.display = 'none';
            canvas.classList.remove('show-cursor');
            gameState.showingPauseMenu = false;
            gameState.gameRunning = true;
            if (updateCanvasOverlay) updateCanvasOverlay();
        } else if (gameState.gameRunning) {
            // During gameplay, ESC should show pause menu, not settings
            showPauseMenu();
        } else if (gameState.currentScreen === 'highScores') {
            gameState.currentScreen = 'menu';
            if (updateCanvasOverlay) updateCanvasOverlay();
        } else if (gameState.currentScreen === 'gameOver' || gameState.currentScreen === 'victory') {
            gameState.currentScreen = 'menu';
            if (updateCanvasOverlay) updateCanvasOverlay();
        } else if (gameState.currentScreen === 'menu' && !gameState.gameRunning) {
            // If we're on menu screen and not in game, ESC should return to name entry
            gameState.currentScreen = 'menu';
            // Show name entry screen
            const nameEntryElement = document.getElementById('nameEntry');
            if (nameEntryElement) nameEntryElement.style.display = 'block';
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
    
    // Audio toggle (A key) - works in any screen, but not when typing in input fields
    if (e.key.toLowerCase() === 'a') {
        // Don't trigger audio toggle if user is typing in an input field
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return; // Let the input field handle the 'a' key
        }
        
        e.preventDefault();
        fallbackAudioInit(); // Try to initialize audio on user interaction
        toggleAudio();
        // Update audio status message if the function exists
        if (typeof window.updateAudioStatusMessage === 'function') {
            window.updateAudioStatusMessage();
        }
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
    // Get responsive movable area configuration
    const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
    
    // Calculate movable area bounds
    let minX = 0;
    let maxX = canvas.width - player.width;
    let minY = 0;
    let maxY = canvas.height - player.height;
    
    // Check if player has unrestricted movement from spells (NOT cached - needs to be real-time)
    const hasUnrestrictedMovement = spellSystem.hasUnrestrictedMovement();
    
    if (movableAreaConfig.enabled && !hasUnrestrictedMovement) {
        // Constrain to bottom portion of canvas (unless spell allows unrestricted movement)
        const movableHeight = canvas.height * movableAreaConfig.heightPercent;
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
        
        // Optimized movement calculation - avoid sqrt when possible
        const dx = targetX - player.x;
        const dy = targetY - player.y;
        const distanceSquared = dx * dx + dy * dy;
        
        // Use squared distance comparison to avoid expensive sqrt
        if (distanceSquared > 25) { // 5 * 5 = 25
            const distance = Math.sqrt(distanceSquared);
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
    
    // Update player timers (celebration, impact, etc.)
    player.updateTimers(deltaTimeMultiplier);
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