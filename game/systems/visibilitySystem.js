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
        console.log('🔍 Visibility system already initialized');
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
    
    if (visibilityConfig.enableLogging) {
        console.log('🔍 Visibility system initialized - will auto-pause music when browser loses focus');
        console.log('🔍 Supported events:', {
            visibilitychange: true,
            focus: true,
            blur: true,
            pagehide: 'onpagehide' in window,
            pageshow: 'onpagehide' in window
        });
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
    
    if (visibilityConfig.enableLogging) {
        console.log(`🔍 Visibility changed: ${isHidden ? 'HIDDEN' : 'VISIBLE'} (via visibilitychange)`);
    }
    
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
    if (visibilityConfig.enableLogging && lastVisibilityState === 'hidden') {
        console.log('🔍 Window focused (via focus event)');
    }
    
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
    if (visibilityConfig.enableLogging && lastVisibilityState === 'visible') {
        console.log('🔍 Window blurred (via blur event)');
    }
    
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
    if (visibilityConfig.enableLogging) {
        console.log('🔍 Page hidden (via pagehide event)', { persisted: event.persisted });
    }
    
    lastVisibilityState = 'hidden';
    handlePageBecameHidden('pagehide');
}

/**
 * Page show handler (for mobile devices and some desktop scenarios)
 */
function handlePageShow(event) {
    if (visibilityConfig.enableLogging) {
        console.log('🔍 Page shown (via pageshow event)', { persisted: event.persisted });
    }
    
    lastVisibilityState = 'visible';
    handlePageBecameVisible('pageshow');
}

/**
 * Core logic when page becomes hidden
 * Pauses background music if it was playing
 */
function handlePageBecameHidden(source) {
    if (!visibilityConfig.respectUserSettings || !isBackgroundMusicEnabled()) {
        if (visibilityConfig.enableLogging) {
            console.log('🔍 Background music disabled in settings - no action needed');
        }
        return;
    }
    
    // Check if background music is currently playing
    const backgroundMusic = sounds.background;
    if (backgroundMusic && !backgroundMusic.paused) {
        musicWasPlayingBeforeHidden = true;
        
        if (visibilityConfig.enableLogging) {
            console.log(`🔍 Page hidden (${source}) - pausing background music`);
        }
        
        // Pause with a small delay to prevent rapid toggling
        setTimeout(() => {
            if (backgroundMusic && !backgroundMusic.paused && lastVisibilityState === 'hidden') {
                backgroundMusic.pause();
                if (visibilityConfig.enableLogging) {
                    console.log('🔊 Background music paused due to page hidden');
                }
            }
        }, visibilityConfig.pauseDelay);
    } else {
        musicWasPlayingBeforeHidden = false;
        if (visibilityConfig.enableLogging) {
            console.log('🔍 Page hidden but music was not playing - no action needed');
        }
    }
}

/**
 * Core logic when page becomes visible
 * Resumes background music if it was playing before and user settings allow
 */
function handlePageBecameVisible(source) {
    if (!visibilityConfig.respectUserSettings || !isBackgroundMusicEnabled()) {
        if (visibilityConfig.enableLogging) {
            console.log('🔍 Background music disabled in settings - no action needed');
        }
        musicWasPlayingBeforeHidden = false; // Reset state
        return;
    }
    
    // Only resume if music was playing before we hid the page
    if (musicWasPlayingBeforeHidden) {
        const backgroundMusic = sounds.background;
        
        if (visibilityConfig.enableLogging) {
            console.log(`🔍 Page visible (${source}) - resuming background music`);
        }
        
        // Resume with a delay to ensure proper state and avoid rapid toggling
        setTimeout(() => {
            if (backgroundMusic && backgroundMusic.paused && lastVisibilityState === 'visible' && isBackgroundMusicEnabled()) {
                backgroundMusic.play().then(() => {
                    if (visibilityConfig.enableLogging) {
                        console.log('🔊 Background music resumed after page became visible');
                    }
                }).catch(error => {
                    if (visibilityConfig.enableLogging) {
                        console.log('🔊 Failed to resume background music:', error.message);
                    }
                });
            }
        }, visibilityConfig.resumeDelay);
        
        // Reset the state
        musicWasPlayingBeforeHidden = false;
    } else {
        if (visibilityConfig.enableLogging) {
            console.log('🔍 Page visible but music was not playing before - no action needed');
        }
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
    if (visibilityConfig.enableLogging) {
        console.log('🔍 Visibility system config updated:', visibilityConfig);
    }
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
    
    if (visibilityConfig.enableLogging) {
        console.log('🔍 Visibility system cleaned up');
    }
} 