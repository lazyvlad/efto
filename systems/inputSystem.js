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
    lastTouchY: 0,
    hasMouseMoved: false, // Track if mouse has actually moved (not just initialized)
    isTouchDevice: false, // Track if this is a touch device
    playerInitialized: false // Track if player has been given an initial position
};

// Initialize input event listeners
export function initializeInputSystem(canvas, gameState, player, restartGame, startGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay) {
    // Detect if this is a touch device on initialization
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        inputState.isTouchDevice = true;
        console.log('Touch device detected on initialization');
    }
    // Mouse movement tracking
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        inputState.mouseX = e.clientX - rect.left;
        inputState.mouseY = e.clientY - rect.top;
        inputState.hasMouseMoved = true; // Mark that mouse has actually moved
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
        inputState.isTouchDevice = true; // Mark as touch device
        console.log('Touch device detected on touchstart');
        
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
        // Keep lastTouchX and lastTouchY - don't reset them so player stays at last position
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        fallbackAudioInit(); // Try to initialize audio on user interaction
        inputState.keys.add(e.key.toLowerCase());
        
        handleKeyDown(e, gameState, restartGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay, canvas);
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
    
    // Initialize spell touch/click handlers for mobile support
    initializeSpellTouchHandlers(gameState);
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
function handleKeyDown(e, gameState, restartGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay, canvas) {
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

// Initialize spell touch/click handlers for mobile support
function initializeSpellTouchHandlers(gameState) {
    const spells = [
        { id: 'dragon_cry', key: 'q', elementId: 'spell-dragon-cry' },
        { id: 'zandalari', key: 'w', elementId: 'spell-zandalari' },
        { id: 'flask_of_titans', key: 'e', elementId: 'spell-flask-of-titans' }
    ];
    
    spells.forEach(spell => {
        const element = document.getElementById(spell.elementId);
        if (!element) return;
        
        // Add touch and click event handlers
        const handleSpellActivation = (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Only cast spells during gameplay
            if (!gameState.gameRunning) return;
            
            // Try to initialize audio on user interaction
            fallbackAudioInit();
            
            // Cast the spell
            spellSystem.castSpellByKey(spell.key, Date.now());
            
            // Add visual feedback for touch
            element.classList.add('spell-touched');
            setTimeout(() => {
                element.classList.remove('spell-touched');
            }, 200);
            
            console.log(`Spell ${spell.id} cast via touch/click`);
        };
        
        // Consolidated touch start handler (combines spell activation + visual feedback)
        element.addEventListener('touchstart', (e) => {
            console.log(`Touch detected on spell ${spell.id}!`);
            e.preventDefault();
            e.stopPropagation();
            
            // Add visual feedback
            element.classList.add('spell-pressing');
            
            // Only cast spells during gameplay
            if (!gameState.gameRunning) {
                console.log(`Game not running, spell ${spell.id} not cast`);
                return;
            }
            
            // Try to initialize audio on user interaction
            fallbackAudioInit();
            
            // Cast the spell
            spellSystem.castSpellByKey(spell.key, Date.now());
            
            // Add touch feedback animation
            element.classList.add('spell-touched');
            setTimeout(() => {
                element.classList.remove('spell-touched');
            }, 200);
            
            console.log(`Spell ${spell.id} cast via touch - event prevented from bubbling`);
        }, { passive: false });
        
        // Click handler for desktop/mouse support
        element.addEventListener('click', (e) => {
            console.log(`Click detected on spell ${spell.id}!`);
            handleSpellActivation(e);
        });
        
        // Touch end handlers for visual feedback cleanup
        element.addEventListener('touchend', (e) => {
            element.classList.remove('spell-pressing');
        }, { passive: true });
        
        element.addEventListener('touchcancel', (e) => {
            element.classList.remove('spell-pressing');
        }, { passive: true });
        
        // Prevent context menu on long press
        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    });
    
    console.log('Spell touch handlers initialized for mobile support');
}

// Reset input state for new game
export function resetInputState() {
    inputState.playerInitialized = false;
    // Don't reset isTouchDevice or hasMouseMoved as these are persistent device characteristics
    console.log('Input state reset for new game');
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
    
    // Initialize player position if not done yet
    if (!inputState.playerInitialized) {
        // Set default position in center of movable area
        player.x = canvas.width / 2 - player.width / 2;
        player.y = maxY; // Bottom of movable area
        
        // For touch devices, also set the last touch position to player's initial position
        if (inputState.isTouchDevice) {
            inputState.lastTouchX = player.x + player.width / 2;
            inputState.lastTouchY = player.y + player.height / 2;
        }
        
        inputState.playerInitialized = true;
        console.log('Player initialized at position:', player.x, player.y, 'with speed:', player.speed);
    }
    
    let targetX, targetY;
    
    if (inputState.isTouchDevice) {
        // Touch device behavior: always use last touch position (even when not actively touching)
        targetX = inputState.lastTouchX - player.width / 2;
        targetY = inputState.lastTouchY - player.height / 2;
        
        // Constrain target position to movable area
        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));
        
        if (inputState.touchActive) {
            // Actively touching - move smoothly towards touch position
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const distanceSquared = dx * dx + dy * dy;
            
            // Use squared distance comparison to avoid expensive sqrt
            if (distanceSquared > 9) { // 3 * 3 = 9 (smaller threshold for more responsive movement)
                const distance = Math.sqrt(distanceSquared);
                const moveSpeed = player.speed * deltaTimeMultiplier;
                
                // Use faster movement for touch - either full speed or direct movement for close distances
                if (distance < moveSpeed * 2) {
                    // If very close to target, move directly to avoid oscillation
                    player.x = targetX;
                    player.y = targetY;
                } else {
                    // Normal smooth movement but with higher speed multiplier for touch
                    const touchSpeedMultiplier = 1.5; // 50% faster movement for touch
                    const adjustedSpeed = moveSpeed * touchSpeedMultiplier;
                    player.x += (dx / distance) * adjustedSpeed;
                    player.y += (dy / distance) * adjustedSpeed;
                }
            }
        } else {
            // Not actively touching - stay at last touch position (no movement)
            // Player remains at current position
        }
    } else {
        // Desktop/mouse behavior: follow mouse only if mouse has actually moved
        if (inputState.hasMouseMoved) {
            targetX = inputState.mouseX - player.width / 2;
            targetY = inputState.mouseY - player.height / 2;
            
            // Constrain target position to movable area
            targetX = Math.max(minX, Math.min(maxX, targetX));
            targetY = Math.max(minY, Math.min(maxY, targetY));
            
            // Follow mouse directly on desktop
            player.x = targetX;
            player.y = targetY;
        }
        // If mouse hasn't moved, player stays at initialized position
    }
    
    // Ensure player stays within bounds (safety check)
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