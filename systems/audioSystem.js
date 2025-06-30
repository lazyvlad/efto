import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';

// Audio system state
export let audioInitialized = false;
export let audioInitAttempted = false;

// Add retry limiting
let audioInitRetryCount = 0;
const MAX_AUDIO_INIT_RETRIES = 3;

// Audio playback tracking to prevent overlapping sounds
const activeSounds = new Map();
const soundCooldowns = new Map();

// Performance settings
const audioSettings = {
    maxConcurrentSounds: 3,      // Maximum concurrent effect sounds
    soundCooldownMs: 100,        // Minimum time between same sound plays
    prioritySounds: ['scream', 'total', 'wegotit2'], // High priority sounds that can interrupt others
    backgroundSounds: ['voice'],  // Sounds that shouldn't interrupt gameplay
};

// Audio objects - now managed by AssetManager
export const sounds = {
    get voice() { return assetManager.getAudio(assetRegistry.audio.voice); },
    get scream() { return assetManager.getAudio(assetRegistry.audio.scream); },
    get uff() { return assetManager.getAudio(assetRegistry.audio.uff); },
    get total() { return assetManager.getAudio(assetRegistry.audio.total); },
    get background() { return assetManager.getAudio(assetRegistry.audio.background); },
    get smukajte() { return assetManager.getAudio(assetRegistry.audio.smukajte); },
    get ohoo() { return assetManager.getAudio(assetRegistry.audio.ohoo); },
    get nakoj() { return assetManager.getAudio(assetRegistry.audio.nakoj); },
    get roll() { return assetManager.getAudio(assetRegistry.audio.roll); },
    get fireballimpact() { return assetManager.getAudio(assetRegistry.audio.fireballimpact); },
    get wegotit2() { return assetManager.getAudio(assetRegistry.audio.wegotit2); }
};

// Volume settings - now fully managed by settings system
export let volumeSettings = {
    background: gameConfig.audio.volumes.background,
    effects: gameConfig.audio.volumes.effects
};

// Update volume settings from settings system
export function updateVolumeFromSettings() {
    if (window.gameSettings) {
        // Get separate volume controls
        const musicVolume = typeof window.gameSettings.getMusicVolumeDecimal === 'function' ? 
            window.gameSettings.getMusicVolumeDecimal() : 
            (typeof window.gameSettings.getVolumeDecimal === 'function' ? window.gameSettings.getVolumeDecimal() : gameConfig.audio.volumes.background);
            
        const effectsVolume = typeof window.gameSettings.getEffectsVolumeDecimal === 'function' ? 
            window.gameSettings.getEffectsVolumeDecimal() : 
            (typeof window.gameSettings.getVolumeDecimal === 'function' ? window.gameSettings.getVolumeDecimal() : gameConfig.audio.volumes.effects);
        
        volumeSettings.background = musicVolume;
        volumeSettings.effects = effectsVolume;
        
        console.log('Updated volumes from settings:', { music: musicVolume, effects: effectsVolume });
        
        // Update background music volume immediately
        if (sounds.background) {
            sounds.background.volume = musicVolume;
        }
    }
}

// Initialize audio - now uses AssetManager and respects settings
export async function initializeAudio() {
    if (audioInitialized || audioInitAttempted || audioInitRetryCount >= MAX_AUDIO_INIT_RETRIES) return;
    audioInitAttempted = true;
    audioInitRetryCount++;
    
    console.log(`Initializing audio system with settings integration... (attempt ${audioInitRetryCount}/${MAX_AUDIO_INIT_RETRIES})`);
    
    try {
        // Use AssetManager's audio initialization with timeout
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Audio initialization timeout')), 5000)
        );
        
        const success = await Promise.race([
            assetManager.initializeAudioSystem(),
            timeoutPromise
        ]);
        
        if (success) {
            // Set up background music properties but don't start automatically
            const backgroundAudio = sounds.background;
            if (backgroundAudio) {
                backgroundAudio.loop = true;
                // Volume will be set when/if music starts
                console.log('Background music configured but not started (respecting settings)');
            }
            
            // Update volumes from settings
            updateVolumeFromSettings();
            
            // Test sound effects setup (but don't play them)
            const testSounds = ['voice', 'uff', 'total', 'fireballimpact'];
            for (const soundKey of testSounds) {
                const audio = sounds[soundKey];
                if (audio && audio.readyState >= 3) {
                    // Set volume based on settings
                    if (soundKey === 'fireballimpact') {
                        audio.volume = gameConfig.audio.volumes.fireballImpact;
                    } else {
                        audio.volume = volumeSettings.effects;
                    }
                    console.log(`✓ ${soundKey} audio ready and configured`);
                }
            }
            
            audioInitialized = true;
            console.log('🔊 Audio initialization complete with settings integration!');
        } else {
            console.warn(`Audio initialization failed (attempt ${audioInitRetryCount}/${MAX_AUDIO_INIT_RETRIES}), falling back to on-demand loading`);
            audioInitialized = false;
            // Only allow retry if we haven't exceeded max attempts
            if (audioInitRetryCount < MAX_AUDIO_INIT_RETRIES) {
                audioInitAttempted = false; // Allow retry later
            } else {
                console.log('🔇 Max audio initialization attempts reached, disabling further attempts');
            }
        }
    } catch (error) {
        console.error(`Audio initialization error (attempt ${audioInitRetryCount}/${MAX_AUDIO_INIT_RETRIES}):`, error);
        audioInitialized = false;
        // Only allow retry if we haven't exceeded max attempts
        if (audioInitRetryCount < MAX_AUDIO_INIT_RETRIES) {
            audioInitAttempted = false; // Allow retry later
        } else {
            console.log('🔇 Max audio initialization attempts reached, disabling further attempts');
        }
    }
}

// Performance-optimized audio playback function
function playAudioOptimized(soundKey, audioElement, options = {}) {
    if (!audioElement) return false;
    
    // Check if sound effects are disabled in settings (primary control)
    const soundEffectsEnabled = window.gameSettings && typeof window.gameSettings.areSoundEffectsEnabled === 'function' ? 
        window.gameSettings.areSoundEffectsEnabled() : true;
    
    if (!soundEffectsEnabled) {
        console.log(`Audio blocked by settings: Sound effects disabled for ${soundKey}`);
        return false;
    }
    
    const now = Date.now();
    const { 
        priority = false, 
        volume = volumeSettings.effects, 
        forcePlay = false,
        allowOverlap = false 
    } = options;
    
    // Check cooldown for this specific sound
    const lastPlayed = soundCooldowns.get(soundKey) || 0;
    if (!forcePlay && (now - lastPlayed) < audioSettings.soundCooldownMs) {
        console.log(`Audio cooldown active for ${soundKey}`);
        return false;
    }
    
    // Check if too many sounds are playing
    const activeSoundCount = activeSounds.size;
    if (!priority && !allowOverlap && activeSoundCount >= audioSettings.maxConcurrentSounds) {
        console.log(`Too many sounds playing (${activeSoundCount}), skipping ${soundKey}`);
        return false;
    }
    
    // If this is a priority sound, stop non-priority sounds
    if (priority && audioSettings.prioritySounds.includes(soundKey)) {
        for (const [activeKey, activeAudio] of activeSounds.entries()) {
            if (!audioSettings.prioritySounds.includes(activeKey)) {
                try {
                    activeAudio.pause();
                    activeSounds.delete(activeKey);
                } catch (e) {
                    console.log(`Failed to pause ${activeKey}:`, e.message);
                }
            }
        }
    }
    
    // Play the sound asynchronously to avoid blocking
    try {
        // Use settings-based volume with proper conversion - use effects volume
        const settingsVolume = window.gameSettings && typeof window.gameSettings.getEffectsVolumeDecimal === 'function' ? 
            window.gameSettings.getEffectsVolumeDecimal() : 
            (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function' ? window.gameSettings.getVolumeDecimal() : volume);
        
        audioElement.volume = Math.max(0, Math.min(1, settingsVolume));
        audioElement.currentTime = 0;
        
        // Use async play to avoid blocking the main thread
        const playPromise = audioElement.play();
        
        if (playPromise && playPromise.then) {
            playPromise
                .then(() => {
                    activeSounds.set(soundKey, audioElement);
                    soundCooldowns.set(soundKey, now);
                    
                    // Set up cleanup when sound ends
                    const cleanup = () => {
                        activeSounds.delete(soundKey);
                        audioElement.removeEventListener('ended', cleanup);
                        audioElement.removeEventListener('pause', cleanup);
                    };
                    
                    audioElement.addEventListener('ended', cleanup);
                    audioElement.addEventListener('pause', cleanup);
                })
                .catch(e => {
                    console.log(`Audio play failed for ${soundKey}:`, e.message);
                });
        }
        
        return true;
    } catch (e) {
        console.log(`Audio error for ${soundKey}:`, e.message);
        return false;
    }
}

// Cleanup function to clear stuck audio references
function cleanupAudioTracking() {
    for (const [soundKey, audioElement] of activeSounds.entries()) {
        if (audioElement.ended || audioElement.paused) {
            activeSounds.delete(soundKey);
        }
    }
}

// Periodically cleanup audio tracking
setInterval(cleanupAudioTracking, 5000);

// Export optimized audio function globally for use by other classes
window.playAudioOptimized = playAudioOptimized;

// Export volume update function globally
window.updateVolumeFromSettings = updateVolumeFromSettings;

// Audio playback functions
export function playVoiceSound() {
    // Voice sound now used for specific items (arcane crystal, black lotus)
    playAudioOptimized('voice', sounds.voice, { 
        allowOverlap: true,  // Allow overlap for multiple collections
        volume: volumeSettings.effects 
    });
}

export function playUffSound() {
    playAudioOptimized('uff', sounds.uff, { 
        volume: volumeSettings.effects 
    });
}

export function playScreamSound() {
    playAudioOptimized('scream', sounds.scream, { 
        priority: true,  // High priority sound
        volume: volumeSettings.effects 
    });
}

export function playTotalSound() {
    playAudioOptimized('total', sounds.total, { 
        priority: true,  // High priority sound
        volume: volumeSettings.effects 
    });
}

export function playFireballImpactSound() {
    playAudioOptimized('fireballimpact', sounds.fireballimpact, { 
        volume: gameConfig.audio.volumes.fireballImpact,
        allowOverlap: true  // Allow multiple fireball sounds
    });
}

export function playDragonstalkerSound() {
    playAudioOptimized('wegotit2', sounds.wegotit2, { 
        priority: true,  // High priority celebration sound
        volume: volumeSettings.effects 
    });
}

export function playThunderSound() {
    // Use the "total" sound as thunder effect (dramatic and fitting)
    playAudioOptimized('thunder', sounds.total, { 
        priority: true,  // Thunder is important for spell feedback
        volume: volumeSettings.effects 
    });
}

export function startBackgroundMusic() {
    console.log('startBackgroundMusic called');
    
    // Check if background music is disabled in settings
    if (window.gameSettings && typeof window.gameSettings.isBackgroundMusicEnabled === 'function' && !window.gameSettings.isBackgroundMusicEnabled()) {
        console.log('Background music disabled in settings');
        return;
    }
    
    if (!sounds.background) {
        console.log('Background music not available');
        return;
    }
    
    // Set volume from settings - use music volume
    const volume = (window.gameSettings && typeof window.gameSettings.getMusicVolumeDecimal === 'function') ? 
        window.gameSettings.getMusicVolumeDecimal() : 
        volumeSettings.background;
    
    console.log('Setting background music volume to:', volume);
    sounds.background.volume = volume;
    
    // Only start if not already playing
    if (sounds.background.paused) {
        console.log('Starting background music...');
        sounds.background.play().catch(e => console.log('Background music failed to play:', e.message));
    } else {
        console.log('Background music already playing');
    }
}

export function updateBackgroundVolume() {
    if (sounds.background) {
        // Use music volume if available, otherwise fall back to volumeSettings
        const volume = (window.gameSettings && typeof window.gameSettings.getMusicVolumeDecimal === 'function') ? 
            window.gameSettings.getMusicVolumeDecimal() : 
            volumeSettings.background;
        sounds.background.volume = volume;
    }
}

export function playItemSound(item) {
    if (item.sound) {
        // Use AssetManager to get the audio asset
        const itemAudio = assetManager.getAudio(item.sound);
        if (itemAudio) {
            // Use unique key for each item sound to allow different item sounds to overlap
            const soundKey = `item_${item.id || 'generic'}`;
            playAudioOptimized(soundKey, itemAudio, { 
                volume: volumeSettings.effects,
                allowOverlap: true  // Allow multiple item collection sounds
            });
        }
    }
}

// Auto-initialization functions
export function tryAutoInitAudio() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        initializeAudio();
        
        // Set up fallback to start background music on first user interaction
        const startBackgroundOnInteraction = () => {
            // Check if background music is disabled in settings
            if (window.gameSettings && typeof window.gameSettings.isBackgroundMusicEnabled === 'function' && !window.gameSettings.isBackgroundMusicEnabled()) {
                console.log('Background music disabled in settings - removing interaction listeners');
                // Remove listeners and exit if background music is disabled
                document.removeEventListener('click', startBackgroundOnInteraction);
                document.removeEventListener('keydown', startBackgroundOnInteraction);
                document.removeEventListener('touchstart', startBackgroundOnInteraction);
                return;
            }
            
            if (sounds.background && sounds.background.paused) {
                console.log('Starting background music on user interaction...');
                const volume = (window.gameSettings && typeof window.gameSettings.getMusicVolumeDecimal === 'function') ? 
                    window.gameSettings.getMusicVolumeDecimal() : 
                    volumeSettings.background;
                sounds.background.volume = volume;
                sounds.background.play().catch(e => console.log('Background music still failed:', e.message));
            }
            // Remove listeners after first attempt
            document.removeEventListener('click', startBackgroundOnInteraction);
            document.removeEventListener('keydown', startBackgroundOnInteraction);
            document.removeEventListener('touchstart', startBackgroundOnInteraction);
        };
        
        // Listen for user interactions to start background music
        document.addEventListener('click', startBackgroundOnInteraction);
        document.addEventListener('keydown', startBackgroundOnInteraction);
        document.addEventListener('touchstart', startBackgroundOnInteraction);
    }, 100);
}

// Fallback: Initialize audio on user interaction if auto-init failed
export function fallbackAudioInit() {
    if (!audioInitialized && !audioInitAttempted && audioInitRetryCount < MAX_AUDIO_INIT_RETRIES) {
        console.log('Fallback audio initialization triggered');
        initializeAudio();
    } else if (audioInitRetryCount >= MAX_AUDIO_INIT_RETRIES) {
        // Silently skip if max retries reached
        return;
    }
}

// Reset audio initialization state (useful for testing or settings changes)
export function resetAudioInitialization() {
    audioInitialized = false;
    audioInitAttempted = false;
    audioInitRetryCount = 0;
    console.log('🔄 Audio initialization state reset');
} 