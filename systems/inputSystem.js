import { fallbackAudioInit } from './audioSystem.js';
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
    // Track mouse movement
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        
        // Get raw mouse coordinates relative to the displayed canvas
        const rawMouseX = e.clientX - rect.left;
        const rawMouseY = e.clientY - rect.top;
        
        // Scale mouse coordinates from display size to logical size using canvas scale properties
        if (canvas.logicalWidth && canvas.logicalHeight && canvas.displayWidth && canvas.displayHeight) {
            // Use the stored display dimensions for accurate scaling
            inputState.mouseX = rawMouseX * (canvas.logicalWidth / canvas.displayWidth);
            inputState.mouseY = rawMouseY * (canvas.logicalHeight / canvas.displayHeight);
        } else if (canvas.logicalWidth && canvas.logicalHeight) {
            // Fallback to rect dimensions if display dimensions not available
            inputState.mouseX = rawMouseX * (canvas.logicalWidth / rect.width);
            inputState.mouseY = rawMouseY * (canvas.logicalHeight / rect.height);
        } else {
            // Fallback for when scaling system isn't initialized yet
            inputState.mouseX = rawMouseX;
            inputState.mouseY = rawMouseY;
        }
        
        inputState.hasMouseMoved = true;
        

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
        const rawTouchX = touch.clientX - rect.left;
        const rawTouchY = touch.clientY - rect.top;
        
        // Convert screen coordinates to logical canvas coordinates (same as mouse)
        let touchX, touchY;
        if (canvas.logicalWidth && canvas.logicalHeight && canvas.displayWidth && canvas.displayHeight) {
            // Convert screen coordinates to logical canvas coordinates
            touchX = rawTouchX * (canvas.logicalWidth / canvas.displayWidth);
            touchY = rawTouchY * (canvas.logicalHeight / canvas.displayHeight);
        } else if (canvas.logicalWidth && canvas.logicalHeight) {
            // Fallback coordinate conversion
            touchX = rawTouchX * (canvas.logicalWidth / rect.width);
            touchY = rawTouchY * (canvas.logicalHeight / rect.height);
        } else {
            // No conversion needed
            touchX = rawTouchX;
            touchY = rawTouchY;
        }
        
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
        const rawTouchX = touch.clientX - rect.left;
        const rawTouchY = touch.clientY - rect.top;
        
        // Convert screen coordinates to logical canvas coordinates (same as mouse)
        if (canvas.logicalWidth && canvas.logicalHeight && canvas.displayWidth && canvas.displayHeight) {
            // Convert screen coordinates to logical canvas coordinates
            inputState.lastTouchX = rawTouchX * (canvas.logicalWidth / canvas.displayWidth);
            inputState.lastTouchY = rawTouchY * (canvas.logicalHeight / canvas.displayHeight);
        } else if (canvas.logicalWidth && canvas.logicalHeight) {
            // Fallback coordinate conversion
            inputState.lastTouchX = rawTouchX * (canvas.logicalWidth / rect.width);
            inputState.lastTouchY = rawTouchY * (canvas.logicalHeight / rect.height);
        } else {
            // No conversion needed
            inputState.lastTouchX = rawTouchX;
            inputState.lastTouchY = rawTouchY;
        }
    });

    canvas.addEventListener('touchend', (e) => {
        e.preventDefault();
        inputState.touchActive = false;
        // Keep lastTouchX and lastTouchY - don't reset them so player stays at last position
    });

    // Keyboard events
    document.addEventListener('keydown', (e) => {
        if (e.key) {
            inputState.keys.add(e.key.toLowerCase());
        }
        
        handleKeyDown(e, gameState, restartGame, startGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay, canvas);
    });

    document.addEventListener('keyup', (e) => {
        if (e.key) {
            inputState.keys.delete(e.key.toLowerCase());
        }
    });

    // Audio initialization on user interaction - handled by settings system
    
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
function handleKeyDown(e, gameState, restartGame, startGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay, canvas) {
    // Guard against missing key property
    if (!e.key) return;
    
    // Check if user is typing in an input field - if so, ignore most game shortcuts
    const activeElement = document.activeElement;
    const isTypingInInputField = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        activeElement.contentEditable === 'true'
    );
    
    // Allow ESC key even when typing (to close menus/dialogs)
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
    
    // If user is typing in an input field, ignore all other game shortcuts
    if (isTypingInInputField) {
        return;
    }
    
    // Testing: Increase Base Speed (Ctrl+A) - during gameplay
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && gameState.gameRunning) {
        e.preventDefault();
        gameState.baseDropSpeed += 0.5; // Increase by 0.5 each press
        console.log(`🚀 TESTING: Base Drop Speed increased to ${gameState.baseDropSpeed.toFixed(1)} (Ctrl+A to increase, was ${(gameState.baseDropSpeed - 0.5).toFixed(1)})`);
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
    
    // Autoshot spell (A key) - only during gameplay
    if (e.key.toLowerCase() === 'a' && gameState.gameRunning) {
        e.preventDefault();
        spellSystem.castSpellByKey('a', Date.now());
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
    console.log('Input state reset for new game');
}

// Update player position based on input
export function updatePlayerPosition(player, canvas, deltaTimeMultiplier, gameConfig, gameState) {
    // Get responsive movable area configuration
    const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
    
    // Calculate movable area bounds
    let minX = 0;
    let maxX = canvas.logicalWidth - player.width;
    let minY = 0;
    let maxY = canvas.logicalHeight - player.height;
    
    // Check if player has unrestricted movement from spells (NOT cached - needs to be real-time)
    const hasUnrestrictedMovement = spellSystem.hasUnrestrictedMovement();
    
    if (movableAreaConfig.enabled && !hasUnrestrictedMovement) {
        // Constrain to bottom portion of canvas (unless spell allows unrestricted movement)
        const baseMovableHeight = canvas.logicalHeight * movableAreaConfig.heightPercent;
        // Add dodge area expansion to movable height
        const dodgeExpansion = gameState ? (gameState.dodgeAreaExpansion || 0) : 0;
        const movableHeight = baseMovableHeight + dodgeExpansion;
        minY = canvas.logicalHeight - movableHeight;
        maxY = canvas.logicalHeight - player.height;
    }
    
    // Initialize player position if not done yet
    if (!inputState.playerInitialized) {
        // Set default position in center of movable area
        player.x = canvas.logicalWidth / 2 - player.width / 2;
        player.y = maxY; // Bottom of movable area
        
        // For touch devices, also set the last touch position to player's initial position
        if (inputState.isTouchDevice) {
            inputState.lastTouchX = player.x + player.width / 2;
            inputState.lastTouchY = player.y + player.height / 2;
        }
        
        inputState.playerInitialized = true;
        console.log('Player initialized at position:', player.x, player.y);
    }

    let targetX = player.x;
    let targetY = player.y;

    if (inputState.touchActive) {
        // Touch/mobile behavior
        targetX = inputState.lastTouchX - player.width / 2;
        targetY = inputState.lastTouchY - player.height / 2;
        
        // Constrain to movable area
        targetX = Math.max(minX, Math.min(maxX, targetX));
        targetY = Math.max(minY, Math.min(maxY, targetY));
        
        // Smooth movement
        const smoothingFactor = 0.15 * deltaTimeMultiplier;
        player.x += (targetX - player.x) * smoothingFactor;
        player.y += (targetY - player.y) * smoothingFactor;
    } else {
        // Desktop/mouse behavior
        if (inputState.hasMouseMoved) {
            targetX = inputState.mouseX - player.width / 2;
            targetY = inputState.mouseY - player.height / 2;
            
            // Constrain target position to movable area
            targetX = Math.max(minX, Math.min(maxX, targetX));
            targetY = Math.max(minY, Math.min(maxY, targetY));
            
            // Direct movement for desktop
            player.x = targetX;
            player.y = targetY;
        }
    }
    
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