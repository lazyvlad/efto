// The guild's voice lines (data/voiceLines.js): something said at a moment in the game.
//
// One line at a time and not too often: a line is only begun when the one before has ended
// and a pause has passed, and the same clip is never said twice running. The lines go
// through the sound effects, so they follow the effects volume and are silent when sound
// effects are off; "Guild voice lines" in the settings turns them off on their own.

import { gameConfig } from '../config/gameConfig.js';
import { clips, moments } from '../data/voiceLines.js';
import { playSoundEffect, preloadSounds } from './audioSystem.js';
import { areVoiceLinesEnabled } from './settingsSystem.js';

// Browsers that cannot play OGG get the WAV copy
const probe = document.createElement('audio');
const EXTENSION = probe.canPlayType && probe.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'wav';

let quietUntil = 0;         // No line is begun before this (performance.now() time)
let lastClip = null;
let nextBanterAt = Infinity;

function pathOf(id) {
    return `assets/audio/voice/${clips[id].file}.${EXTENSION}`;
}

function allowed(id) {
    return Boolean(clips[id]) && (gameConfig.voice.explicit || !clips[id].explicit);
}

// Fetch the clips ahead, so the first line of each is not lost to loading
export function preloadVoiceLines() {
    preloadSounds(Object.keys(clips).filter(allowed).map(pathOf));
}

/**
 * Something happened that may draw a remark.
 * @param {string} moment  One of the moments in data/voiceLines.js
 * @returns {boolean} whether a line was begun
 */
export function say(moment) {
    const lines = moments[moment];
    if (!lines || !areVoiceLinesEnabled()) return false;

    const now = performance.now();
    if (now < quietUntil || Math.random() >= lines.chance) return false;

    const choices = lines.clips.filter(allowed);
    const fresh = choices.filter(id => id !== lastClip);
    const pool = fresh.length > 0 ? fresh : choices;
    if (pool.length === 0) return false;

    const id = pool[Math.floor(Math.random() * pool.length)];
    if (!playSoundEffect(pathOf(id), { key: 'voice-line', volume: gameConfig.voice.volume })) return false;

    lastClip = id;
    quietUntil = now + (clips[id].seconds + gameConfig.voice.pause) * 1000;
    return true;
}

// A new game: the first idle remark is a while off
export function resetVoiceLines() {
    nextBanterAt = banterDelay();
}

function banterDelay() {
    const { least, most } = gameConfig.voice.banterEvery;
    return (least + Math.random() * (most - least)) * 60;
}

/**
 * Call once per step of play: now and then somebody says something for no reason.
 * @param {boolean} quiet  True while it would be out of place (a boss fight)
 */
export function updateBanter(quiet = false) {
    if (--nextBanterAt > 0) return;

    nextBanterAt = banterDelay();
    if (!quiet) say('banter');
}

// What the hunter's health did since the last step: a cry for a healer when it falls below a
// quarter, a remark when a heavy blow lands
let healthBefore = null;

export function watchHealth(health, maxHealth) {
    const before = healthBefore;
    healthBefore = health;
    if (before === null || health <= 0) return;

    const rules = gameConfig.voice;
    const low = maxHealth * rules.lowHealth;
    if (before >= low && health < low) {
        say('lowHealth');
    } else if (before - health >= rules.heavyBlow) {
        say('hurt');
    }
}

export function forgetHealth() {
    healthBefore = null;
}
