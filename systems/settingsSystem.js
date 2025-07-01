// Settings System - Manages game settings and preferences
import { updateBackgroundVolume, startBackgroundMusic } from './audioSystem.js';

// Default settings
const defaultSettings = {
    audio: {
        soundEffects: true,
        backgroundMusic: true,
        masterVolume: 70,      // Master volume control (0-100)
        musicVolume: 50,       // Background music volume (0-100) 
        effectsVolume: 80      // Sound effects volume (0-100)
    },
    gameplay: {
    },
    ui: {
        playerPanelStyle: 'auto',       // auto, desktop, mobile
        dragonstalkerPanelStyle: 'auto', // auto, desktop, mobile
        panelOpacity: 80                 // 60-100
    }
};

// Current settings (loaded from localStorage or defaults)
let gameSettings = { ...defaultSettings };

// Load settings from localStorage
export function loadSettings() {
    try {
        const savedSettings = localStorage.getItem('dmtribut_settings');
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            gameSettings = { ...defaultSettings, ...parsed };
            
            // Ensure nested objects are properly merged
            if (parsed.audio) {
                gameSettings.audio = { ...defaultSettings.audio, ...parsed.audio };
                
                // Migration: Convert old single volume setting to new separate volumes
                if (parsed.audio.volume !== undefined && 
                    (parsed.audio.masterVolume === undefined || 
                     parsed.audio.musicVolume === undefined || 
                     parsed.audio.effectsVolume === undefined)) {
                    console.log('Migrating old volume setting to new separate volumes');
                    gameSettings.audio.masterVolume = parsed.audio.volume;
                    gameSettings.audio.musicVolume = Math.round(parsed.audio.volume * 0.7); // Make music 70% of old volume
                    gameSettings.audio.effectsVolume = Math.round(parsed.audio.volume * 1.1); // Make effects 110% of old volume
                    
                    // Save the migrated settings
                    saveSettings();
                }
            }
            if (parsed.gameplay) {
                gameSettings.gameplay = { ...defaultSettings.gameplay, ...parsed.gameplay };
            }
            if (parsed.ui) {
                gameSettings.ui = { ...defaultSettings.ui, ...parsed.ui };
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        gameSettings = { ...defaultSettings };
    }
    
    return gameSettings;
}

// Save settings to localStorage
export function saveSettings() {
    try {
        localStorage.setItem('dmtribut_settings', JSON.stringify(gameSettings));
    } catch (error) {
        console.error('Failed to save settings:', error);
    }
}

// Get current settings
export function getSettings() {
    return gameSettings;
}

// Update a specific setting
export function updateSetting(category, key, value) {
    if (!gameSettings[category]) {
        gameSettings[category] = {};
    }
    
    gameSettings[category][key] = value;
    saveSettings();
    
    // Apply the setting immediately
    applySetting(category, key, value);
}

// Apply a setting change immediately
function applySetting(category, key, value) {
    if (category === 'audio') {
        switch (key) {
            case 'masterVolume':
            case 'musicVolume':
            case 'effectsVolume':
                // Update background music volume
                updateBackgroundVolume();
                // Also update the audio system volumes
                if (window.updateVolumeFromSettings) {
                    window.updateVolumeFromSettings();
                }
                break;
            case 'backgroundMusic':
                // Handle background music toggle using audio system
                if (value) {
                    // Enable background music - start playing
                    console.log('Settings: Enabling background music');
                    startBackgroundMusic();
                } else {
                    // Disable background music - pause if playing
                    console.log('Settings: Disabling background music');
                    // Import sounds from audio system
                    import('../systems/audioSystem.js').then(audioModule => {
                        if (audioModule.sounds && audioModule.sounds.background && !audioModule.sounds.background.paused) {
                            console.log('Settings: Pausing background music');
                            audioModule.sounds.background.pause();
                        }
                    }).catch(e => console.log('Failed to pause background music:', e.message));
                }
                break;
            case 'soundEffects':
                // Sound effects toggle is handled in the audio system
                break;
        }
    } else if (category === 'ui') {
        switch (key) {
            case 'playerPanelStyle':
            case 'dragonstalkerPanelStyle':
                // Apply panel style changes
                applyPanelStyles();
                break;
            case 'panelOpacity':
                // Apply panel opacity changes
                applyPanelOpacity(value);
                break;
        }
    }
}

// Apply panel style preferences
function applyPanelStyles() {
    const playerStyle = gameSettings.ui.playerPanelStyle;
    const dragonstalkerStyle = gameSettings.ui.dragonstalkerPanelStyle;
    
    // Calculate optimal panel styles for "auto" modes
    const optimalPlayerStyle = calculateOptimalPanelStyle();
    const optimalDragonstalkerStyle = calculateOptimalPanelStyle();
    
    // Determine effective styles (use optimal for "auto", explicit for others)
    const effectivePlayerStyle = playerStyle === 'auto' ? optimalPlayerStyle : playerStyle;
    const effectiveDragonstalkerStyle = dragonstalkerStyle === 'auto' ? optimalDragonstalkerStyle : dragonstalkerStyle;
    
    // Remove existing forced style classes
    document.body.classList.remove('force-desktop-panels', 'force-mobile-panels');
    
    // Apply panel style preferences
    if (effectivePlayerStyle === 'desktop' || effectiveDragonstalkerStyle === 'desktop') {
        document.body.classList.add('force-desktop-panels');
    } else if (effectivePlayerStyle === 'mobile' || effectiveDragonstalkerStyle === 'mobile') {
        document.body.classList.add('force-mobile-panels');
    }
    
    // Individual panel styles
    const playerPanel = document.getElementById('itemsCollectionPanel');
    const dragonstalkerPanel = document.getElementById('dragonstalkerProgressPanel');
    
    if (playerPanel) {
        playerPanel.classList.remove('force-desktop', 'force-mobile');
        if (effectivePlayerStyle === 'desktop') playerPanel.classList.add('force-desktop');
        if (effectivePlayerStyle === 'mobile') playerPanel.classList.add('force-mobile');
    }
    
    if (dragonstalkerPanel) {
        dragonstalkerPanel.classList.remove('force-desktop', 'force-mobile');
        if (effectiveDragonstalkerStyle === 'desktop') dragonstalkerPanel.classList.add('force-desktop');
        if (effectiveDragonstalkerStyle === 'mobile') dragonstalkerPanel.classList.add('force-mobile');
    }
    
    // Debug log for auto-detection
    if (playerStyle === 'auto' || dragonstalkerStyle === 'auto') {
        const spaceInfo = calculateAvailableSpace();
        console.log(`📊 Auto Panel Detection:`, {
            aspectRatio: spaceInfo.aspectRatio.toFixed(2),
            availableSpace: spaceInfo.availableHorizontalSpace,
            isSquarish: spaceInfo.isSquarish,
            optimalStyle: optimalPlayerStyle,
            reason: spaceInfo.reason
        });
    }
}

// Calculate optimal panel style based on available space and aspect ratio
function calculateOptimalPanelStyle() {
    const spaceInfo = calculateAvailableSpace();
    
    // Factors that suggest using compact (mobile) panels:
    // 1. Viewport is more square-shaped (aspect ratio closer to 1:1)
    // 2. Limited horizontal space available for panels
    // 3. Canvas takes up most of the screen space
    
    if (spaceInfo.isSquarish || spaceInfo.availableHorizontalSpace < 600) {
        return 'mobile';
    }
    
    return 'desktop';
}

// Calculate available space for panels and viewport characteristics
function calculateAvailableSpace() {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const aspectRatio = viewportWidth / viewportHeight;
    
    // Get canvas information if available
    const canvas = document.getElementById('gameCanvas');
    let canvasDisplayWidth = viewportWidth;
    let canvasDisplayHeight = viewportHeight;
    let leftOffset = 0;
    let rightOffset = 0;
    
    if (canvas && canvas.displayWidth && canvas.displayHeight) {
        canvasDisplayWidth = canvas.displayWidth;
        canvasDisplayHeight = canvas.displayHeight;
        
        // Calculate letterbox offsets
        leftOffset = (viewportWidth - canvasDisplayWidth) / 2;
        rightOffset = leftOffset;
    }
    
    // Calculate available horizontal space for panels
    // This is the space on the sides that isn't occupied by the game canvas
    const availableHorizontalSpace = leftOffset * 2; // Total space on both sides
    
    // Determine if viewport is "squarish"
    // Square-ish means aspect ratio is closer to 1:1 (between 0.8 and 1.25)
    const isSquarish = aspectRatio >= 0.8 && aspectRatio <= 1.25;
    
    // Determine reason for recommendation
    let reason = '';
    if (isSquarish) {
        reason = 'Square-ish aspect ratio detected';
    } else if (availableHorizontalSpace < 600) {
        reason = 'Limited horizontal space for panels';
    } else {
        reason = 'Sufficient space for full panels';
    }
    
    return {
        viewportWidth,
        viewportHeight,
        aspectRatio,
        canvasDisplayWidth,
        canvasDisplayHeight,
        availableHorizontalSpace,
        isSquarish,
        reason
    };
}

// Apply panel opacity
function applyPanelOpacity(opacity) {
    const opacityValue = opacity / 100;
    const style = document.createElement('style');
    style.id = 'panel-opacity-override';
    
    // Remove existing override
    const existing = document.getElementById('panel-opacity-override');
    if (existing) existing.remove();
    
    style.textContent = `
        #itemsCollectionPanel,
        #dragonstalkerProgressPanel {
            background: rgba(0, 0, 0, ${opacityValue * 0.8}) !important;
            backdrop-filter: blur(${opacityValue * 0.1}px) !important;
        }
    `;
    
    document.head.appendChild(style);
}

// Reset settings to defaults
export function resetSettings() {
    gameSettings = { ...defaultSettings };
    
    // Deep copy nested objects
    gameSettings.audio = { ...defaultSettings.audio };
    gameSettings.gameplay = { ...defaultSettings.gameplay };
    gameSettings.ui = { ...defaultSettings.ui };
    
    saveSettings();
    
    // Apply all default settings
    Object.keys(gameSettings).forEach(category => {
        Object.keys(gameSettings[category]).forEach(key => {
            applySetting(category, key, gameSettings[category][key]);
        });
    });
    
    return gameSettings;
}

// Refresh panel styles (called when viewport changes)
export function refreshPanelStyles() {
    // Only refresh if using auto mode
    const playerStyle = gameSettings.ui.playerPanelStyle;
    const dragonstalkerStyle = gameSettings.ui.dragonstalkerPanelStyle;
    
    if (playerStyle === 'auto' || dragonstalkerStyle === 'auto') {
        applyPanelStyles();
    }
}

// Initialize settings system
export function initializeSettings() {
    loadSettings();
    
    // Apply all loaded settings
    Object.keys(gameSettings).forEach(category => {
        Object.keys(gameSettings[category]).forEach(key => {
            applySetting(category, key, gameSettings[category][key]);
        });
    });
    
    // Set up viewport change listeners for auto panel detection
    let resizeTimeout;
    window.addEventListener('resize', () => {
        // Debounce resize events
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            refreshPanelStyles();
        }, 100);
    });
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            refreshPanelStyles();
        }, 200);
    });
    
    return gameSettings;
}

// Check if sound effects are enabled
export function areSoundEffectsEnabled() {
    return gameSettings.audio.soundEffects;
}

// Check if background music is enabled
export function isBackgroundMusicEnabled() {
    return gameSettings.audio.backgroundMusic;
}

// Get master volume setting (0-100)
export function getMasterVolume() {
    return gameSettings.audio.masterVolume;
}

// Get music volume setting (0-100)  
export function getMusicVolume() {
    return gameSettings.audio.musicVolume;
}

// Get effects volume setting (0-100)
export function getEffectsVolume() {
    return gameSettings.audio.effectsVolume;
}

// Get master volume as decimal (0.0-1.0) for audio elements
export function getMasterVolumeDecimal() {
    return gameSettings.audio.masterVolume / 100;
}

// Get music volume as decimal (0.0-1.0) for audio elements
export function getMusicVolumeDecimal() {
    const master = gameSettings.audio.masterVolume / 100;
    const music = gameSettings.audio.musicVolume / 100;
    return master * music; // Master volume affects music volume
}

// Get effects volume as decimal (0.0-1.0) for audio elements  
export function getEffectsVolumeDecimal() {
    const master = gameSettings.audio.masterVolume / 100;
    const effects = gameSettings.audio.effectsVolume / 100;
    return master * effects; // Master volume affects effects volume
}

// Backwards compatibility - returns master volume
export function getVolume() {
    return gameSettings.audio.masterVolume;
}

// Backwards compatibility - returns master volume as decimal
export function getVolumeDecimal() {
    return gameSettings.audio.masterVolume / 100;
}



// Get UI settings
export function getPlayerPanelStyle() {
    return gameSettings.ui.playerPanelStyle;
}

export function getDragonstalkerPanelStyle() {
    return gameSettings.ui.dragonstalkerPanelStyle;
}

export function getPanelOpacity() {
    return gameSettings.ui.panelOpacity;
} 