// Audio system.
//
// Sound effects go through the Web Audio API: every effect is fetched and decoded once, up
// front, into memory, and playing one just schedules it on the browser's audio thread. Nothing
// is loaded, decoded or seeked on the main thread while the game is running, so a sound starting
// or changing can't stall a frame. (Audio can't be moved into a Web Worker - workers have no
// audio output - the audio thread behind Web Audio is the browser's equivalent.)
//
// Background music is a long file, so it stays a streaming <audio> element.

import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';

const MAX_VOICES = 8;            // Effects that may play at the same time
const SAME_SOUND_COOLDOWN_MS = 100;

// Whether the audio system has been set up (kept for callers that check it)
export let audioInitialized = false;

let audioContext = null;
let effectsBus = null;           // All effects pass through this gain node (the effects volume)
const buffers = new Map();       // path -> { buffer, promise }
const voices = new Set();        // Effects currently playing: { source, priority }
const lastPlayed = new Map();    // key -> time last started (ms)
const fallbackElements = new Map();

// Only the music is an <audio> element now
export const sounds = {
    get background() { return assetManager.getAudio(assetRegistry.audio.background); }
};

// ----- Settings -----

function soundEffectsEnabled() {
    const settings = window.gameSettings;
    return settings && typeof settings.areSoundEffectsEnabled === 'function' ? settings.areSoundEffectsEnabled() : true;
}

function backgroundMusicEnabled() {
    const settings = window.gameSettings;
    return settings && typeof settings.isBackgroundMusicEnabled === 'function' ? settings.isBackgroundMusicEnabled() : true;
}

function clampVolume(value) {
    return Math.max(0, Math.min(1, Number(value) || 0));
}

function getEffectsVolume() {
    const settings = window.gameSettings;
    if (settings && typeof settings.getEffectsVolumeDecimal === 'function') return clampVolume(settings.getEffectsVolumeDecimal());
    if (settings && typeof settings.getVolumeDecimal === 'function') return clampVolume(settings.getVolumeDecimal());
    return gameConfig.audio.volumes.effects;
}

function getMusicVolume() {
    const settings = window.gameSettings;
    if (settings && typeof settings.getMusicVolumeDecimal === 'function') return clampVolume(settings.getMusicVolumeDecimal());
    if (settings && typeof settings.getVolumeDecimal === 'function') return clampVolume(settings.getVolumeDecimal());
    return gameConfig.audio.volumes.background;
}

// ----- Sound effects -----

function getAudioContext() {
    if (audioContext) return audioContext;

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    try {
        audioContext = new AudioContextClass({ latencyHint: 'interactive' });
        effectsBus = audioContext.createGain();
        effectsBus.gain.value = getEffectsVolume();
        effectsBus.connect(audioContext.destination);
    } catch (e) {
        audioContext = null;
    }
    return audioContext;
}

// Fetch and decode one effect. Decoding happens off the main thread.
function loadBuffer(path) {
    let entry = buffers.get(path);
    if (entry) return entry.promise;

    const context = getAudioContext();
    if (!context) return Promise.resolve(null);

    entry = { buffer: null, promise: null };
    entry.promise = fetch(path)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.arrayBuffer();
        })
        // Callback form: older Safari doesn't return a promise from decodeAudioData
        .then(data => new Promise((resolve, reject) => context.decodeAudioData(data, resolve, reject)))
        .then(buffer => {
            entry.buffer = buffer;
            return buffer;
        })
        .catch(() => null); // Missing or undecodable file: that sound simply never plays
    buffers.set(path, entry);
    return entry.promise;
}

// Decode every effect the game can play, so none is ever loaded mid-game
function preloadSoundEffects() {
    const paths = new Set(Object.values(assetRegistry.audio));
    paths.delete(assetRegistry.audio.background);
    return Promise.all([...paths].map(loadBuffer));
}

// Decode sounds that are not in the asset registry (the voice lines) ahead of their first use
export function preloadSounds(paths) {
    return Promise.all(paths.map(loadBuffer));
}

// Browsers keep audio suspended until the player interacts with the page
function unlockAudio() {
    const context = getAudioContext();
    if (context && context.state === 'suspended') {
        context.resume().catch(() => {});
    }
}

['pointerdown', 'touchend', 'keydown', 'click'].forEach(type => {
    document.addEventListener(type, unlockAudio, { capture: true, passive: true });
});

// Stay silent while the tab is in the background
document.addEventListener('visibilitychange', () => {
    if (!audioContext) return;
    if (document.hidden) {
        audioContext.suspend().catch(() => {});
    } else {
        audioContext.resume().catch(() => {});
    }
});

// Used only where Web Audio isn't available at all
function playWithAudioElement(path) {
    let element = fallbackElements.get(path);
    if (!element) {
        element = new Audio(path);
        fallbackElements.set(path, element);
    }
    element.volume = getEffectsVolume();
    element.currentTime = 0;
    element.play().catch(() => {});
    return true;
}

/**
 * Play a sound effect.
 * @param {string} path      Audio file, as listed in the asset registry
 * @param {object} options
 *   key       groups plays for the repeat cooldown (defaults to the file)
 *   volume    0..1, relative to the effects volume setting
 *   priority  true for the few sounds that should cut through: they silence ordinary effects
 *             and are never dropped when a lot is playing
 * @returns {boolean} whether the sound was started
 */
export function playSoundEffect(path, { key = path, volume = 1, priority = false } = {}) {
    if (!path || !soundEffectsEnabled()) return false;

    const now = performance.now();
    if (now - (lastPlayed.get(key) ?? -Infinity) < SAME_SOUND_COOLDOWN_MS) return false;

    const context = getAudioContext();
    if (!context) {
        lastPlayed.set(key, now);
        return playWithAudioElement(path);
    }

    // Not decoded yet (or never will be): start loading and skip this one rather than wait
    const entry = buffers.get(path);
    if (!entry || !entry.buffer) {
        loadBuffer(path);
        return false;
    }

    // Still locked by the browser: don't queue sounds up to burst out later
    if (context.state !== 'running') {
        unlockAudio();
        return false;
    }

    if (priority) {
        for (const voice of voices) {
            if (!voice.priority) {
                try { voice.source.stop(); } catch (e) { /* already stopped */ }
            }
        }
    } else if (voices.size >= MAX_VOICES) {
        return false;
    }

    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = entry.buffer;
    gain.gain.value = clampVolume(volume);
    source.connect(gain);
    gain.connect(effectsBus);
    effectsBus.gain.value = getEffectsVolume();

    const voice = { source, priority };
    voices.add(voice);
    source.onended = () => {
        voices.delete(voice);
        source.disconnect();
        gain.disconnect();
    };

    source.start();
    lastPlayed.set(key, now);
    return true;
}

// A short snap of jaws: two quick clicks of filtered noise, made here, not played from a file.
// The pet's everyday bite; its voiced bite is a clip (assetRegistry.audio.petChomp).
let snapNoise = null;

export function playSnapSound(volume = 0.7) {
    const context = getAudioContext();
    if (!context || !soundEffectsEnabled() || context.state !== 'running') return false;

    if (!snapNoise) {
        // A tenth of a second of noise, dying away fast
        const length = Math.floor(context.sampleRate * 0.1);
        snapNoise = context.createBuffer(1, length, context.sampleRate);
        const samples = snapNoise.getChannelData(0);
        for (let i = 0; i < length; i++) {
            samples[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
        }
    }

    effectsBus.gain.value = getEffectsVolume();
    // The jaws closing, then the teeth meeting: the second click a little later and sharper
    for (const [delay, pitch, loudness] of [[0, 1400, 0.8], [0.055, 2600, 1]]) {
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = snapNoise;
        filter.type = 'bandpass';
        filter.frequency.value = pitch;
        filter.Q.value = 1.2;
        gain.gain.value = clampVolume(volume * loudness);
        source.connect(filter);
        filter.connect(gain);
        gain.connect(effectsBus);
        source.onended = () => {
            source.disconnect();
            filter.disconnect();
            gain.disconnect();
        };
        source.start(context.currentTime + delay);
    }
    return true;
}

export function playVoiceSound() {
    playSoundEffect(assetRegistry.audio.voice);
}

export function playUffSound() {
    playSoundEffect(assetRegistry.audio.uff);
}

export function playScreamSound() {
    playSoundEffect(assetRegistry.audio.scream, { priority: true });
}

export function playTotalSound() {
    playSoundEffect(assetRegistry.audio.total, { priority: true });
}

export function playFireballImpactSound() {
    playSoundEffect(assetRegistry.audio.fireballimpact);
}

export function playDragonstalkerSound() {
    playSoundEffect(assetRegistry.audio.wegotit2, { priority: true });
}

export function playThunderSound() {
    // Uses the "total" sound as the thunder effect (dramatic and fitting)
    playSoundEffect(assetRegistry.audio.total, { key: 'thunder', priority: true });
}

export function playItemSound(item) {
    if (item.sound) {
        // Keyed per item so different items collected together can both be heard
        playSoundEffect(item.sound, { key: `item_${item.id || 'generic'}` });
    }
}

// ----- Background music -----

export function startBackgroundMusic() {
    const music = sounds.background;
    if (!music || !backgroundMusicEnabled()) return;

    music.loop = true;
    music.volume = getMusicVolume();
    if (music.paused) {
        music.play().catch(() => { /* blocked until the player interacts */ });
    }
}

export function updateBackgroundVolume() {
    const music = sounds.background;
    if (music) music.volume = getMusicVolume();
}

// Apply the volume settings to everything that is currently set up
export function updateVolumeFromSettings() {
    updateBackgroundVolume();
    if (effectsBus) effectsBus.gain.value = getEffectsVolume();
}

// Settings and startup code call this through the window
window.updateVolumeFromSettings = updateVolumeFromSettings;

// ----- Setup -----

export async function initializeAudio() {
    if (audioInitialized) return;
    audioInitialized = true;

    const music = sounds.background;
    if (music) music.loop = true;
    updateVolumeFromSettings();

    await preloadSoundEffects();
}

export function tryAutoInitAudio() {
    // Small delay to ensure the settings system is ready
    setTimeout(() => {
        initializeAudio();

        // Music can only start once the player has interacted with the page
        const startMusicOnInteraction = () => {
            document.removeEventListener('click', startMusicOnInteraction);
            document.removeEventListener('keydown', startMusicOnInteraction);
            document.removeEventListener('touchstart', startMusicOnInteraction);
            startBackgroundMusic();
        };

        document.addEventListener('click', startMusicOnInteraction);
        document.addEventListener('keydown', startMusicOnInteraction);
        document.addEventListener('touchstart', startMusicOnInteraction);
    }, 100);
}

// Called on player input: makes sure audio is set up and unlocked
export function fallbackAudioInit() {
    initializeAudio();
    unlockAudio();
}
