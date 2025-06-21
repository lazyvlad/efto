// Settings System - Manages game settings and preferences
import { updateBackgroundVolume, startBackgroundMusic } from './audioSystem.js';

// Default settings
const defaultSettings = {
    audio: {
        soundEffects: true,
        backgroundMusic: true,
        volume: 70
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
            }
        }
    } catch (error) {
        console.error('Failed to load settings:', error);
        gameSettings = { ...defaultSettings };
    }
    
    console.log('Settings loaded:', gameSettings);
    return gameSettings;
}

// Save settings to localStorage
export function saveSettings() {
    try {
        localStorage.setItem('dmtribut_settings', JSON.stringify(gameSettings));
        console.log('Settings saved:', gameSettings);
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
            case 'volume':
                // Update background music volume
                updateBackgroundVolume();
                break;
            case 'backgroundMusic':
                // Handle background music toggle using audio system
                if (value) {
                    // Enable background music - start playing
                    console.log('Starting background music via settings');
                    startBackgroundMusic();
                } else {
                    // Disable background music - pause if playing
                    console.log('Stopping background music via settings');
                    // Access background music through audio system
                    if (typeof window.sounds !== 'undefined' && window.sounds.background && !window.sounds.background.paused) {
                        window.sounds.background.pause();
                    }
                }
                break;
            case 'soundEffects':
                // Sound effects toggle is handled in the audio system
                console.log('Sound effects', value ? 'enabled' : 'disabled');
                break;
        }
    }
}

// Reset settings to defaults
export function resetSettings() {
    gameSettings = { ...defaultSettings };
    
    // Deep copy nested objects
    gameSettings.audio = { ...defaultSettings.audio };
    
    saveSettings();
    
    // Apply all default settings
    Object.keys(gameSettings).forEach(category => {
        Object.keys(gameSettings[category]).forEach(key => {
            applySetting(category, key, gameSettings[category][key]);
        });
    });
    
    console.log('Settings reset to defaults');
    return gameSettings;
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

// Get volume setting (0-100)
export function getVolume() {
    return gameSettings.audio.volume;
}

// Get volume as decimal (0.0-1.0) for audio elements
export function getVolumeDecimal() {
    return gameSettings.audio.volume / 100;
} 