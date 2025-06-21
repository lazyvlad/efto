import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';

// Audio system state
export let audioInitialized = false;
export let audioInitAttempted = false;

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

// Set up background music
sounds.background.loop = true;
sounds.background.volume = gameConfig.audio.volumes.background;  // Start with configured volume

// Volume settings (now using config) - Start unmuted
export let volumeSettings = {
    background: gameConfig.audio.volumes.background,  // Start with configured volume
    effects: gameConfig.audio.volumes.effects         // Start with configured volume
};

// Audio state management - Start unmuted by default
export let audioState = {
    isMuted: false,  // Start unmuted
    enabled: true,   // Start enabled
    previousVolumes: {
        background: gameConfig.audio.volumes.background,
        effects: gameConfig.audio.volumes.effects
    }
};

// Initialize audio - now uses AssetManager
export async function initializeAudio() {
    if (audioInitialized || audioInitAttempted) return;
    audioInitAttempted = true;
    
    console.log('Initializing audio system with AssetManager...');
    
    // Ensure button state matches audio state
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn) {
        if (audioState.isMuted) {
            audioBtn.textContent = '🔇';
            audioBtn.classList.add('muted');
            audioBtn.title = 'Unmute Audio';
        } else {
            audioBtn.textContent = '🔊';
            audioBtn.classList.remove('muted');
            audioBtn.title = 'Mute Audio';
        }
    }
    
    // Update audio status message if the function exists
    if (typeof window.updateAudioStatusMessage === 'function') {
        window.updateAudioStatusMessage();
    }
    
    try {
        // Use AssetManager's audio initialization
        const success = await assetManager.initializeAudioSystem();
        
        if (success) {
            // Set initial volumes for loaded audio and start background music
            const backgroundAudio = sounds.background;
            if (backgroundAudio) {
                backgroundAudio.volume = volumeSettings.background;
                backgroundAudio.loop = true;
                
                // Start background music immediately if not muted
                if (!audioState.isMuted && volumeSettings.background > 0) {
                    console.log('Starting background music immediately...');
                    backgroundAudio.play().catch(e => {
                        console.log('Background music autoplay blocked, will start on user interaction:', e.message);
                    });
                }
            }
            
            // Test play essential sounds to verify they work
            const testSounds = ['voice', 'uff', 'total', 'fireballimpact'];
            for (const soundKey of testSounds) {
                const audio = sounds[soundKey];
                if (audio && audio.readyState >= 3) { // HAVE_FUTURE_DATA
                    // Set volume
                    if (soundKey === 'fireballimpact') {
                        audio.volume = gameConfig.audio.volumes.fireballImpact;
                    } else {
                        audio.volume = volumeSettings.effects;
                    }
                    
                    // Test play (may fail due to browser autoplay policy)
                    const testPlay = audio.play();
                    if (testPlay && testPlay.then) {
                        testPlay.then(() => {
                            audio.pause();
                            audio.currentTime = 0;
                            console.log(`✓ ${soundKey} audio ready`);
                        }).catch(e => {
                            console.log(`✗ ${soundKey} audio requires user interaction:`, e.message);
                        });
                    }
                }
            }
            
            audioInitialized = true;
            console.log('🔊 Audio initialization complete with AssetManager!');
        } else {
            console.warn('Audio initialization failed, falling back to on-demand loading');
            audioInitialized = false;
        }
    } catch (error) {
        console.error('Audio initialization error:', error);
        audioInitialized = false;
    }
}

export function toggleAudio() {
    const audioBtn = document.getElementById('audioToggleBtn');
    
    if (audioState.isMuted) {
        // Unmute - restore previous volumes
        volumeSettings.background = audioState.previousVolumes.background;
        volumeSettings.effects = audioState.previousVolumes.effects;
        audioState.isMuted = false;
        audioState.enabled = true;
        
        // Force audio initialization if not already done
        if (!audioInitialized) {
            audioInitAttempted = false; // Reset to allow re-initialization
            initializeAudio();
        }
        
        // Update button appearance
        if (audioBtn) {
            audioBtn.textContent = '🔊';
            audioBtn.classList.remove('muted');
            audioBtn.title = 'Mute Audio';
        }
        
        // Update background music volume if it's playing
        if (!sounds.background.paused) {
            sounds.background.volume = volumeSettings.background;
        }
        
        console.log('🔊 Audio unmuted - Effects:', volumeSettings.effects, 'Background:', volumeSettings.background);
    } else {
        // Mute - save current volumes and set to 0
        audioState.previousVolumes.background = volumeSettings.background;
        audioState.previousVolumes.effects = volumeSettings.effects;
        
        volumeSettings.background = 0;
        volumeSettings.effects = 0;
        audioState.isMuted = true;
        audioState.enabled = false;
        
        // Update button appearance
        if (audioBtn) {
            audioBtn.textContent = '🔇';
            audioBtn.classList.add('muted');
            audioBtn.title = 'Unmute Audio';
        }
        
        // Mute background music immediately
        sounds.background.volume = 0;
        
        console.log('🔇 Audio muted');
    }
    
    // Update audio status message if the function exists
    if (typeof window.updateAudioStatusMessage === 'function') {
        window.updateAudioStatusMessage();
    }
}

// Performance-optimized audio playback function
function playAudioOptimized(soundKey, audioElement, options = {}) {
    if (!audioElement) return false;
    
    // Check if sound effects are disabled in settings (primary control)
    const soundEffectsEnabled = window.gameSettings && typeof window.gameSettings.areSoundEffectsEnabled === 'function' ? window.gameSettings.areSoundEffectsEnabled() : true;
    
    if (!soundEffectsEnabled) {
        console.log(`Audio blocked by settings: Sound effects disabled for ${soundKey}`);
        return false;
    }
    
    // Legacy audio mute check (secondary control)
    if (audioState.isMuted) {
        console.log(`Audio blocked by legacy mute: ${soundKey}`);
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
        audioElement.volume = Math.max(0, Math.min(1, volume));
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
    // Check if background music is disabled in settings (primary control)
    if (window.gameSettings && typeof window.gameSettings.isBackgroundMusicEnabled === 'function' && !window.gameSettings.isBackgroundMusicEnabled()) {
        return;
    }
    
    // Legacy audio mute check (secondary control)
    if (audioState.isMuted) return;
    
    const volume = (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function') ? 
        window.gameSettings.getVolumeDecimal() : 
        volumeSettings.background;
    sounds.background.volume = volume;
    sounds.background.play().catch(e => console.log('Background music failed to play'));
}

export function updateBackgroundVolume() {
    if (sounds.background) {
        // Use settings volume if available, otherwise fall back to volumeSettings
        const volume = (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function') ? 
            window.gameSettings.getVolumeDecimal() : 
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
        // Set initial button state based on audio state
        const audioBtn = document.getElementById('audioToggleBtn');
        if (audioBtn) {
            if (audioState.isMuted) {
                audioBtn.textContent = '🔇';
                audioBtn.classList.add('muted');
                audioBtn.title = 'Unmute Audio';
            } else {
                audioBtn.textContent = '🔊';
                audioBtn.classList.remove('muted');
                audioBtn.title = 'Mute Audio';
            }
            
            // Add click event listener for the audio toggle button
            audioBtn.addEventListener('click', toggleAudio);
            console.log('Audio toggle button event listener added');
        }
        initializeAudio();
        
        // Set up fallback to start background music on first user interaction
        const startBackgroundOnInteraction = () => {
            // Check if background music is disabled in settings (primary control)
            if (window.gameSettings && typeof window.gameSettings.isBackgroundMusicEnabled === 'function' && !window.gameSettings.isBackgroundMusicEnabled()) {
                // Remove listeners and exit if background music is disabled
                document.removeEventListener('click', startBackgroundOnInteraction);
                document.removeEventListener('keydown', startBackgroundOnInteraction);
                document.removeEventListener('touchstart', startBackgroundOnInteraction);
                return;
            }
            
            if (!audioState.isMuted && sounds.background.paused) {
                console.log('Starting background music on user interaction...');
                const volume = (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function') ? 
                    window.gameSettings.getVolumeDecimal() : 
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
    if (!audioInitialized) {
        audioInitAttempted = false; // Reset the attempt flag
        initializeAudio();
    }
} 