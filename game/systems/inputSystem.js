import { movementBounds } from '../utils/movement.js';
import { fallbackAudioInit } from './audioSystem.js';
import { spellSystem } from './spellSystem.js';
import { responsiveScaler } from '../utils/gameUtils.js';
import { gameClock } from '../utils/gameClock.js';
import { isMouseLockEnabled } from './settingsSystem.js';
import { actionFor } from '../utils/keybindings.js';
import { perfProbeOn, noteMouseMove } from '../utils/perfProbe.js';

// Where the canvas is on the page, measured once and kept until the window is resized or
// scrolled. Asking the page for it is cheap only while nothing on it has changed: otherwise
// the browser lays the whole page out again there and then. A mouse can report a thousand
// times a second, several times a frame, and the HUD changes the page every frame: measuring
// on every report made the game hitch now and then.
let canvasBox = null;
function canvasRect(canvas) {
    if (!canvasBox) canvasBox = canvas.getBoundingClientRect();
    return canvasBox;
}
function forgetCanvasRect() {
    canvasBox = null;
}
if (typeof window !== 'undefined') {
    window.addEventListener('resize', forgetCanvasRect);
    window.addEventListener('scroll', forgetCanvasRect, true);
    window.addEventListener('orientationchange', forgetCanvasRect);
    // The page may move the canvas without resizing the window (the HUD, a panel opened)
    if (typeof ResizeObserver !== 'undefined') {
        const watchCanvas = () => {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) new ResizeObserver(forgetCanvasRect).observe(canvas);
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watchCanvas);
        else watchCanvas();
    }
}

// The actions that cast a spell: each is named as its spell (data/playerSpells.js)
const SPELL_ACTIONS = new Set(['autoshot', 'multishot', 'arcane_shot', 'dragon_cry', 'zandalari']);

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

// ----- Mouse lock -----
// While a game is being played the mouse is held inside the game (the browser's "pointer
// lock"), so it cannot wander off the field or out of the window and leave the hunter standing.
// The browser always lets the player out with Esc; that pauses the game, as Esc does anyway.
// A browser only grants the lock in answer to a click or a key press, so it is asked for
// after each of those while a game runs, and given back as soon as the game is not running.

let lockLostAt = -Infinity;     // When the lock was last lost, to tell its Esc from a second one
let rawMovementRefused = false; // This browser cannot give the mouse's movement unadjusted

function isPlaying(gameState) {
    return gameState.gameRunning && !gameState.showingPauseMenu && !gameState.gamePaused;
}

function isMouseLocked(canvas) {
    return document.pointerLockElement === canvas;
}

function wantsMouseLock(canvas, gameState) {
    return isPlaying(gameState) && isMouseLockEnabled() && !inputState.isTouchDevice && typeof canvas.requestPointerLock === 'function';
}

function requestMouseLock(canvas, gameState) {
    if (!wantsMouseLock(canvas, gameState) || isMouseLocked(canvas)) return;

    // Older browsers answer with nothing instead of a promise
    const ask = options => Promise.resolve(canvas.requestPointerLock(options));

    try {
        // The mouse's own movement is asked for, without the system's pointer acceleration:
        // with it some browsers report sudden jumps, which throw the hunter across the field.
        // Refused now and then (right after Esc, say): the next click or key press asks again.
        const asked = rawMovementRefused ? ask() : ask({ unadjustedMovement: true }).catch(error => {
            if (!error || error.name !== 'NotSupportedError') throw error;
            rawMovementRefused = true;
            return ask();
        });
        asked.catch(() => {});
    } catch (e) {
        // Not available here: the mouse is followed as before
    }
}

/**
 * Call every frame: gives the mouse back as soon as the game is not being played (paused,
 * over, a menu open) or the setting was turned off.
 */
export function updateMouseLock(canvas, gameState) {
    if (isMouseLocked(canvas) && !wantsMouseLock(canvas, gameState)) {
        document.exitPointerLock();
    }
}

function initializeMouseLock(canvas, gameState, player, showPauseMenu) {
    // After the click or key press has done its own work (started or resumed a game)
    const askSoon = () => setTimeout(() => requestMouseLock(canvas, gameState), 0);
    document.addEventListener('click', askSoon);
    document.addEventListener('keydown', askSoon);

    document.addEventListener('pointerlockchange', () => {
        if (isMouseLocked(canvas)) {
            // Carry on from where the hunter stands
            inputState.mouseX = player.x + player.width / 2;
            inputState.mouseY = player.y + player.height / 2;
            inputState.hasMouseMoved = true;
        } else if (isPlaying(gameState) && isMouseLockEnabled()) {
            // Let go by the player (Esc) or taken by the browser (another window): pause
            lockLostAt = performance.now();
            showPauseMenu();
        }
    });
}

// Convert a mouse/touch position on the page to logical canvas coordinates
function toCanvasCoords(canvas, clientX, clientY) {
    const rect = canvasRect(canvas);
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    
    if (canvas.logicalWidth && canvas.logicalHeight && canvas.displayWidth && canvas.displayHeight) {
        // Use the stored display dimensions for accurate scaling
        return {
            x: rawX * (canvas.logicalWidth / canvas.displayWidth),
            y: rawY * (canvas.logicalHeight / canvas.displayHeight)
        };
    }
    if (canvas.logicalWidth && canvas.logicalHeight) {
        // Fallback to rect dimensions if display dimensions not available
        return {
            x: rawX * (canvas.logicalWidth / rect.width),
            y: rawY * (canvas.logicalHeight / rect.height)
        };
    }
    // Scaling system isn't initialized yet
    return { x: rawX, y: rawY };
}

// ----- Touches that do not steer -----
// On a phone the spell buttons and the pause button stand on the field. A thumb reaching for
// one and landing just beside it touches the field instead, which would send the hunter
// running there. So a band around each button is silent: a finger that comes down in it never
// moves the hunter, wherever it slides afterwards.
const SILENT_MARGIN = 16;           // Page pixels around a button that are silent
const SILENT_AROUND = '#spellBar .spell-group, #mobilePauseBtn';
const silentTouches = new Set();    // The fingers down now that started in a silent band

function inSilentZone(pageX, pageY) {
    for (const button of document.querySelectorAll(SILENT_AROUND)) {
        const box = button.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;

        if (pageX >= box.left - SILENT_MARGIN && pageX <= box.right + SILENT_MARGIN
            && pageY >= box.top - SILENT_MARGIN && pageY <= box.bottom + SILENT_MARGIN) {
            return true;
        }
    }

    return false;
}

// The finger that steers: the first one on the field that did not start in a silent band.
// Fingers resting on a button are not on the field and never count.
function steeringTouch(e) {
    for (const touch of e.targetTouches) {
        if (!silentTouches.has(touch.identifier)) return touch;
    }

    return null;
}

// Initialize input event listeners
export function initializeInputSystem(canvas, gameState, player, restartGame, startGame, deprecatedParam, showPauseMenu, displayHighScores, updateCanvasOverlay) {
    // Detect if this is a touch device on initialization
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
        inputState.isTouchDevice = true;
    }
    // Track mouse movement
    canvas.addEventListener('mousemove', (e) => {
        const startedAt = perfProbeOn() ? performance.now() : 0;
        if (isMouseLocked(canvas)) {
            // A locked mouse has no position, only movement: keep our own, inside the field
            const rect = canvasRect(canvas);
            // One report of half the field or more is a glitch, not a hand: leave it out
            if (Math.abs(e.movementX) > rect.width / 2 || Math.abs(e.movementY) > rect.height / 2) return;
            const width = canvas.logicalWidth || canvas.width;
            const height = canvas.logicalHeight || canvas.height;
            inputState.mouseX = Math.max(0, Math.min(width, inputState.mouseX + e.movementX * (width / rect.width)));
            inputState.mouseY = Math.max(0, Math.min(height, inputState.mouseY + e.movementY * (height / rect.height)));
        } else {
            const position = toCanvasCoords(canvas, e.clientX, e.clientY);
            inputState.mouseX = position.x;
            inputState.mouseY = position.y;
        }
        inputState.hasMouseMoved = true;
        if (startedAt) noteMouseMove(performance.now() - startedAt);
    });
    
    initializeMouseLock(canvas, gameState, player, showPauseMenu);

    // Mouse click events
    canvas.addEventListener('mousedown', (e) => {
        inputState.isMouseDown = true;
        fallbackAudioInit(); // Try to initialize audio on user interaction
        
        const rect = canvasRect(canvas);
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
        
        // A finger that came down just beside a button was meant for the button
        for (const started of e.changedTouches) {
            if (inSilentZone(started.clientX, started.clientY)) silentTouches.add(started.identifier);
        }

        const touch = steeringTouch(e);
        if (!touch) return;

        const { x: touchX, y: touchY } = toCanvasCoords(canvas, touch.clientX, touch.clientY);
        
        inputState.touchActive = true;
        inputState.lastTouchX = touchX;
        inputState.lastTouchY = touchY;
        inputState.isTouchDevice = true; // Mark as touch device
        
        handleMouseClick(touchX, touchY, gameState, restartGame, startGame, displayHighScores, updateCanvasOverlay);
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = steeringTouch(e);
        if (!touch) return;

        const position = toCanvasCoords(canvas, touch.clientX, touch.clientY);
        inputState.lastTouchX = position.x;
        inputState.lastTouchY = position.y;
    });

    const touchLifted = (e) => {
        e.preventDefault();
        for (const lifted of e.changedTouches) silentTouches.delete(lifted.identifier);
        inputState.touchActive = steeringTouch(e) !== null;
        // Keep lastTouchX and lastTouchY - don't reset them so player stays at last position
    };

    canvas.addEventListener('touchend', touchLifted);
    canvas.addEventListener('touchcancel', touchLifted);

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
        
        // The same press that let the mouse go has already paused the game
        if (performance.now() - lockLostAt < 400) return;

        if (gameState.showingPauseMenu) {
            // Close HTML pause menu and resume game
            document.getElementById('pauseMenu').style.display = 'none';
            canvas.classList.remove('show-cursor');
            gameState.showingPauseMenu = false;
            gameState.gameRunning = true;
            gameState.gamePaused = false;
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
            // Show name entry screen using the unified system
            if (typeof showNameEntry === 'function') {
                showNameEntry();
            }
            if (updateCanvasOverlay) updateCanvasOverlay();
        }
        return;
    }
    
    // If user is typing in an input field, ignore all other game shortcuts
    if (isTypingInInputField) {
        return;
    }
    
    // The keys that cast: whichever the player has given each spell (utils/keybindings.js).
    // First of all the game's own keys, so a spell on Space or H is not taken for a menu key.
    if (gameState.gameRunning && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const action = actionFor(e.code);
        if (SPELL_ACTIONS.has(action)) {
            e.preventDefault();
            spellSystem.castSpell(action, gameClock.now());
            return;
        }
    }
    
    // Testing: Increase Base Speed (Ctrl+A) - during gameplay
    if (e.ctrlKey && e.key.toLowerCase() === 'a' && gameState.gameRunning) {
        e.preventDefault();
        gameState.baseDropSpeed += 0.5; // Increase by 0.5 each press
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
    
}

// Initialize spell touch/click handlers for mobile support
function initializeSpellTouchHandlers(gameState) {
    const spells = [
        { id: 'dragon_cry', key: 'q', elementId: 'spell-dragon-cry' },
        { id: 'zandalari', key: 'w', elementId: 'spell-zandalari' },
        { id: 'arcane_shot', key: 't', elementId: 'spell-arcane-shot' },
        { id: 'autoshot', key: 'e', elementId: 'spell-autoshot' },
        { id: 'multishot', key: 'r', elementId: 'spell-multishot' }
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
            spellSystem.castSpell(spell.id, gameClock.now());
            
            // Add visual feedback for touch
            element.classList.add('spell-touched');
            setTimeout(() => {
                element.classList.remove('spell-touched');
            }, 200);
            
        };
        
        // Consolidated touch start handler (combines spell activation + visual feedback)
        element.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Add visual feedback
            element.classList.add('spell-pressing');
            
            // Only cast spells during gameplay
            if (!gameState.gameRunning) {
                return;
            }
            
            // Try to initialize audio on user interaction
            fallbackAudioInit();
            
            // Cast the spell
            spellSystem.castSpell(spell.id, gameClock.now());
            
            // Add touch feedback animation
            element.classList.add('spell-touched');
            setTimeout(() => {
                element.classList.remove('spell-touched');
            }, 200);
            
        }, { passive: false });
        
        // Click handler for desktop/mouse support
        element.addEventListener('click', (e) => {
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
    
}

// Reset input state for new game
export function resetInputState() {
    inputState.playerInitialized = false;
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
        // At the bottom of the field, rising a little (utils/movement.js), unless a spell frees him
        ({ minY, maxY } = movementBounds(canvas.logicalHeight, player, gameState));
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
    }

    // Caught on a boss's hook he is dragged, not walked (systems/bossSystem.js)
    if (gameState && gameState.hooked) {
        player.updateTimers(deltaTimeMultiplier);
        return;
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
        
        // Smooth movement (exponential, so the feel is the same at any refresh rate); quicker
        // with Haste
        const follow = gameState && gameState.hasteTimer > 0 ? Math.min(0.6, 0.15 * gameConfig.powerUps.haste.move) : 0.15;
        const smoothingFactor = 1 - Math.pow(1 - follow, deltaTimeMultiplier);
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