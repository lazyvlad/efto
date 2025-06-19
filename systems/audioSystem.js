import { gameConfig } from '../config/gameConfig.js';

// Audio system state
export let audioInitialized = false;
export let audioInitAttempted = false;

// Audio objects
export const sounds = {
    voice: new Audio('assets/voice.mp3'),
    scream: new Audio('assets/scream.mp3'),
    uff: new Audio('assets/uff.mp3'),      // New sound for missed items
    total: new Audio('assets/total.mp3'),   // New sound for 20 collections
    background: new Audio('assets/background.mp3'),  // Background music
    smukajte: new Audio('assets/SMUKAJTE.mp3'),     // 33 collections
    ohoo: new Audio('assets/ohoo.mp3'),              // 66 collections
    nakoj: new Audio('assets/nakoj.mp3'),            // 99 collections
    roll: new Audio('assets/roll.mp3'),               // 130 collections
    fireballimpact: new Audio('assets/fireballimpact.mp3'),  // Very loud fireball impact sound
    wegotit2: new Audio('assets/weGotIt2.mp3')       // Dragonstalker item collected sound
};

// Set up background music
sounds.background.loop = true;
sounds.background.volume = 0;  // Start muted

// Volume settings (now using config) - Start muted
export let volumeSettings = {
    background: 0,  // Start muted
    effects: 0      // Start muted
};

// Audio state management - Start muted by default
export let audioState = {
    isMuted: true,  // Start muted
    previousVolumes: {
        background: gameConfig.audio.volumes.background,
        effects: gameConfig.audio.volumes.effects
    }
};

// Initialize audio - now tries immediately and falls back to user interaction
export function initializeAudio() {
    if (audioInitialized || audioInitAttempted) return;
    audioInitAttempted = true;
    
    console.log('Initializing audio...');
    
    // Ensure button state matches audio state
    const audioBtn = document.getElementById('audioToggleBtn');
    if (audioBtn && audioState.isMuted) {
        audioBtn.textContent = '🔇';
        audioBtn.classList.add('muted');
        audioBtn.title = 'Unmute Audio';
    }
    
    // Create a promise chain to initialize all sounds
    const soundPromises = Object.keys(sounds).map(key => {
        return new Promise((resolve) => {
            const audio = sounds[key];
            audio.load(); // Preload audio
            
            // Set initial volumes
            if (key === 'background') {
                audio.volume = volumeSettings.background;
            } else if (key === 'fireballimpact') {
                audio.volume = gameConfig.audio.volumes.fireballImpact;
            } else {
                audio.volume = volumeSettings.effects;
            }
            
            // For browsers that support audio without user interaction, test play
            // For others, just resolve (they'll work when user first interacts)
            const testPlay = audio.play();
            if (testPlay && testPlay.then) {
                testPlay.then(() => {
                    audio.pause();
                    audio.currentTime = 0;
                    console.log(`✓ ${key} audio ready`);
                    resolve();
                }).catch(e => {
                    console.log(`✗ ${key} audio requires user interaction:`, e.message);
                    resolve(); // Continue even if one sound fails
                });
            } else {
                // Older browser or immediate success
                audio.pause();
                audio.currentTime = 0;
                console.log(`✓ ${key} audio loaded`);
                resolve();
            }
        });
    });
    
    // Wait for all sounds to be tested
    Promise.all(soundPromises).then(() => {
        audioInitialized = true;
        console.log('🔊 Audio initialization complete!');
    });
}

export function toggleAudio() {
    const audioBtn = document.getElementById('audioToggleBtn');
    
    if (audioState.isMuted) {
        // Unmute - restore previous volumes
        volumeSettings.background = audioState.previousVolumes.background;
        volumeSettings.effects = audioState.previousVolumes.effects;
        audioState.isMuted = false;
        
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
        // Create a new audio instance for the item sound
        const itemAudio = new Audio(item.sound);
        itemAudio.volume = volumeSettings.effects;
        itemAudio.play().catch(e => console.log(`Item sound ${item.sound} not available`));
    }
}

// Auto-initialization functions
export function tryAutoInitAudio() {
    // Small delay to ensure DOM is ready
    setTimeout(() => {
        // Set initial button state to muted
        const audioBtn = document.getElementById('audioToggleBtn');
        if (audioBtn) {
            audioBtn.textContent = '🔇';
            audioBtn.classList.add('muted');
            audioBtn.title = 'Unmute Audio';
            
            // Add click event listener for the audio toggle button
            audioBtn.addEventListener('click', toggleAudio);
            console.log('Audio toggle button event listener added');
        }
        initializeAudio();
    }, 100);
}

// Fallback: Initialize audio on user interaction if auto-init failed
export function fallbackAudioInit() {
    if (!audioInitialized) {
        audioInitAttempted = false; // Reset the attempt flag
        initializeAudio();
    }
} 