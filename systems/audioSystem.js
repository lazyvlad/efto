import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';

// Audio system state
export let audioInitialized = false;
export let audioInitAttempted = false;

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

// Audio playback functions
export function playVoiceSound(gameState) {
    if (audioState.isMuted) return;
    if (gameState.perfectCollections > 0 && gameState.perfectCollections % gameConfig.audio.voiceSoundInterval === 0) {
        if (Math.random() < gameConfig.audio.voiceSoundChance) {
            sounds.voice.volume = volumeSettings.effects;
            sounds.voice.currentTime = 0;
            sounds.voice.play().catch(e => console.log('Voice sound failed to play'));
        }
    }
}

export function playUffSound() {
    if (audioState.isMuted) return;
    sounds.uff.volume = volumeSettings.effects;
    sounds.uff.currentTime = 0;
    sounds.uff.play().catch(e => console.log('Uff sound failed to play'));
}

export function playScreamSound() {
    if (audioState.isMuted) return;
    sounds.scream.volume = volumeSettings.effects;
    sounds.scream.currentTime = 0;
    sounds.scream.play().catch(e => console.log('Scream sound failed to play'));
}

export function playTotalSound() {
    if (audioState.isMuted) return;
    sounds.total.volume = volumeSettings.effects;
    sounds.total.currentTime = 0;
    sounds.total.play().catch(e => console.log('Total sound failed to play'));
}

export function playFireballImpactSound() {
    if (audioState.isMuted) return;
    sounds.fireballimpact.volume = gameConfig.audio.volumes.fireballImpact;
    sounds.fireballimpact.currentTime = 0;
    sounds.fireballimpact.play().catch(e => console.log('Fireball impact sound failed to play'));
}

export function playDragonstalkerSound() {
    if (audioState.isMuted) return;
    sounds.wegotit2.volume = volumeSettings.effects;
    sounds.wegotit2.currentTime = 0;
    sounds.wegotit2.play().catch(e => console.log('Dragonstalker sound failed to play'));
}

export function playThunderSound() {
    if (audioState.isMuted) return;
    // Use the "total" sound as thunder effect (dramatic and fitting)
    sounds.total.volume = volumeSettings.effects;
    sounds.total.currentTime = 0;
    sounds.total.play().catch(e => console.log('Thunder sound failed to play'));
}

export function startBackgroundMusic() {
    if (audioState.isMuted) return;
    sounds.background.volume = volumeSettings.background;
    sounds.background.play().catch(e => console.log('Background music failed to play'));
}

export function updateBackgroundVolume() {
    sounds.background.volume = volumeSettings.background;
}

export function playItemSound(item) {
    if (audioState.isMuted) return;
    if (item.sound) {
        // Use AssetManager to get the audio asset
        const itemAudio = assetManager.getAudio(item.sound);
        if (itemAudio) {
            itemAudio.volume = volumeSettings.effects;
            itemAudio.currentTime = 0; // Reset to beginning
            itemAudio.play().catch(e => console.log(`Item sound ${item.sound} not available`));
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
            if (!audioState.isMuted && sounds.background.paused) {
                console.log('Starting background music on user interaction...');
                sounds.background.volume = volumeSettings.background;
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