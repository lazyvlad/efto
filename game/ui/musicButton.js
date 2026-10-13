// The music button on the starting window: one press turns the background music off or on.
// It changes the same setting as "Play Background Music" in Settings, so the two always agree
// and the choice is remembered.

import { isBackgroundMusicEnabled, updateSetting } from '../systems/settingsSystem.js';

function showState(button) {
    const playing = isBackgroundMusicEnabled();

    button.textContent = playing ? 'Music: On' : 'Music: Off';
    button.setAttribute('aria-pressed', String(playing));
    button.classList.toggle('is-off', !playing);
}

export function initializeMusicButton() {
    const button = document.getElementById('musicToggleBtn');
    if (!button) return;

    button.addEventListener('click', () => {
        updateSetting('audio', 'backgroundMusic', !isBackgroundMusicEnabled());
        showState(button);

        // The switch in Settings, should that screen be opened next
        const toggle = document.getElementById('backgroundMusicToggle');
        if (toggle) toggle.checked = isBackgroundMusicEnabled();
    });

    // Changed in Settings instead (the switch itself, or "Reset to Defaults")
    document.getElementById('settingsScreen')?.addEventListener('change', () => showState(button));
    document.getElementById('settingsScreen')?.addEventListener('click', () => setTimeout(() => showState(button), 0));

    showState(button);
}
