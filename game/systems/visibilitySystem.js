// Page Visibility System - Manages audio behavior when browser loses/gains focus
// Handles cases like: browser minimize, tab switching, phone lock, app switching

import { sounds } from './audioSystem.js';
import { isBackgroundMusicEnabled } from './settingsSystem.js';

// State tracking
let visibilitySystemInitialized = false;
let musicWasPlayingBeforeHidden = false;
let lastVisibilityState = 'visible';

// Configuration
const visibilityConfig = {
    enableLogging: (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'), // Enable logging in development only
    pauseDelay: 100,           // Delay before pausing (ms) - prevents rapid toggling
    resumeDelay: 500,          // Delay before resuming (ms) - ensures proper state
    respectUserSettings: true   // Always respect user's background music setting
};

/**
 * Initialize the Page Visibility API system
 * Sets up event listeners for visibility changes and focus events
 */
export function initializeVisibilitySystem() {
    if (visibilitySystemInitialized) {
        return;
    }

    // Check if Page Visibility API is supported
    if (typeof document.hidden === 'undefined') {
        console.warn('🔍 Page Visibility API not supported in this browser');
        return;
    }

    visibilitySystemInitialized = true;
    
    // Set initial state
    lastVisibilityState = document.hidden ? 'hidden' : 'visible';
    
    // Listen for visibility changes (main event)
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus events (backup/additional detection)
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);
    
    // Listen for page lifecycle events (modern browsers)
    if ('onpagehide' in window) {
        window.addEventListener('pagehide', handlePageHide);
        window.addEventListener('pageshow', handlePageShow);
    }
    
}

/**
 * Main visibility change handler (Page Visibility API)
 * This is the primary method for detecting when the page becomes hidden/visible
 */
function handleVisibilityChange() {
    const isHidden = document.hidden;
    const newState = isHidden ? 'hidden' : 'visible';
    
    if (newState === lastVisibilityState) {
        return; // No actual change
    }
    
    lastVisibilityState = newState;
    
    
    if (isHidden) {
        handlePageBecameHidden('visibilitychange');
    } else {
        handlePageBecameVisible('visibilitychange');
    }
}

/**
 * Window focus handler (backup detection method)
 */
function handleWindowFocus() {
    
    // Only trigger if we haven't already handled this via visibility change
    if (lastVisibilityState === 'hidden') {
        lastVisibilityState = 'visible';
        handlePageBecameVisible('focus');
    }
}

/**
 * Window blur handler (backup detection method)
 */
function handleWindowBlur() {
    
    // Only trigger if we haven't already handled this via visibility change
    if (lastVisibilityState === 'visible') {
        lastVisibilityState = 'hidden';
        handlePageBecameHidden('blur');
    }
}

/**
 * Page hide handler (for mobile devices and some desktop scenarios)
 */
function handlePageHide(event) {
    
    lastVisibilityState = 'hidden';
    handlePageBecameHidden('pagehide');
}

/**
 * Page show handler (for mobile devices and some desktop scenarios)
 */
function handlePageShow(event) {
    
    lastVisibilityState = 'visible';
    handlePageBecameVisible('pageshow');
}

/**
 * Core logic when page becomes hidden
 * Pauses background music if it was playing
 */
function handlePageBecameHidden(source) {
    if (!visibilityConfig.respectUserSettings || !isBackgroundMusicEnabled()) {
        return;
    }
    
    // Check if background music is currently playing
    const backgroundMusic = sounds.background;
    if (backgroundMusic && !backgroundMusic.paused) {
        musicWasPlayingBeforeHidden = true;
        
        
        // Pause with a small delay to prevent rapid toggling
        setTimeout(() => {
            if (backgroundMusic && !backgroundMusic.paused && lastVisibilityState === 'hidden') {
                backgroundMusic.pause();
            }
        }, visibilityConfig.pauseDelay);
    } else {
        musicWasPlayingBeforeHidden = false;
    }
}

/**
 * Core logic when page becomes visible
 * Resumes background music if it was playing before and user settings allow
 */
function handlePageBecameVisible(source) {
    if (!visibilityConfig.respectUserSettings || !isBackgroundMusicEnabled()) {
        musicWasPlayingBeforeHidden = false; // Reset state
        return;
    }
    
    // Only resume if music was playing before we hid the page
    if (musicWasPlayingBeforeHidden) {
        const backgroundMusic = sounds.background;
        
        
        // Resume with a delay to ensure proper state and avoid rapid toggling
        setTimeout(() => {
            if (backgroundMusic && backgroundMusic.paused && lastVisibilityState === 'visible' && isBackgroundMusicEnabled()) {
                // Refused until the player touches the page again: nothing to do about it
                backgroundMusic.play().catch(() => {});
            }
        }, visibilityConfig.resumeDelay);
        
        // Reset the state
        musicWasPlayingBeforeHidden = false;
    }
}

/**
 * Get current visibility system status (for debugging)
 */
export function getVisibilitySystemStatus() {
    return {
        initialized: visibilitySystemInitialized,
        currentState: lastVisibilityState,
        isHidden: document.hidden,
        musicWasPlaying: musicWasPlayingBeforeHidden,
        apiSupported: typeof document.hidden !== 'undefined',
        backgroundMusicEnabled: isBackgroundMusicEnabled(),
        backgroundMusicPlaying: sounds.background ? !sounds.background.paused : false
    };
}

/**
 * Update visibility system configuration
 */
export function updateVisibilityConfig(newConfig) {
    Object.assign(visibilityConfig, newConfig);
}

/**
 * Cleanup function (if needed for testing or reinitialization)
 */
export function cleanupVisibilitySystem() {
    if (!visibilitySystemInitialized) return;
    
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('focus', handleWindowFocus);
    window.removeEventListener('blur', handleWindowBlur);
    
    if ('onpagehide' in window) {
        window.removeEventListener('pagehide', handlePageHide);
        window.removeEventListener('pageshow', handlePageShow);
    }
    
    visibilitySystemInitialized = false;
    musicWasPlayingBeforeHidden = false;
    lastVisibilityState = 'visible';
    
} 