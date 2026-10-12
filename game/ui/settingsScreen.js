import { getSettings, resetSettings, updateSetting } from '../systems/settingsSystem.js';

function byId(id) {
    return document.getElementById(id);
}

function setChecked(id, checked) {
    const element = byId(id);
    if (element) {
        element.checked = checked;
    }
}

function setValue(id, value) {
    const element = byId(id);
    if (element) {
        element.value = value;
    }
}

function setText(id, text) {
    const element = byId(id);
    if (element) {
        element.textContent = text;
    }
}

function markBound(element, key) {
    if (!element) {
        return false;
    }

    const flag = `settingsBound${key}`;
    if (element.dataset[flag] === 'true') {
        return false;
    }

    element.dataset[flag] = 'true';
    return true;
}

function bindRange(id, valueId, section, key) {
    const element = byId(id);
    if (!markBound(element, key)) {
        return;
    }

    element.addEventListener('input', function() {
        const value = parseInt(this.value, 10);
        setText(valueId, `${value}%`);
        updateSetting(section, key, value);
    });
}

function bindSelect(id, section, key, label) {
    const element = byId(id);
    if (!markBound(element, key)) {
        return;
    }

    element.addEventListener('change', function() {
        console.log(`${label} changed to:`, this.value);
        updateSetting(section, key, this.value);
    });
}

function bindToggle(id, key, label) {
    const toggle = byId(id);
    if (!toggle) {
        console.warn(`${label} toggle element not found!`);
        return;
    }

    const slider = toggle.parentElement?.querySelector('.toggle-slider');

    if (slider && markBound(slider, key)) {
        slider.addEventListener('click', function() {
            toggle.checked = !toggle.checked;
            toggle.dispatchEvent(new Event('change'));
        });
    }

    if (!markBound(toggle, key)) {
        return;
    }

    toggle.addEventListener('change', function() {
        console.log(`${label} toggle changed to:`, this.checked);
        updateSetting('audio', key, this.checked);
    });
}

export function setSettingsBackLabel(source) {
    const labels = {
        game: 'Continue Game',
        pause: 'Back to Pause Menu',
        menu: 'Back to Menu',
        howToPlay: 'Back to How to Play',
        highScores: 'Back to High Scores',
        gameOver: 'Back to Game Over'
    };

    setText('settingsBackBtn', labels[source] || labels.menu);
}

export function updateSettingsScreen() {
    const settings = getSettings();

    setChecked('soundEffectsToggle', settings.audio.soundEffects);
    setChecked('backgroundMusicToggle', settings.audio.backgroundMusic);

    const masterVolume = settings.audio.masterVolume || settings.audio.volume || 70;
    setValue('masterVolumeSlider', masterVolume);
    setText('masterVolumeValue', `${masterVolume}%`);

    const musicVolume = settings.audio.musicVolume || 50;
    setValue('musicVolumeSlider', musicVolume);
    setText('musicVolumeValue', `${musicVolume}%`);

    const effectsVolume = settings.audio.effectsVolume || 80;
    setValue('effectsVolumeSlider', effectsVolume);
    setText('effectsVolumeValue', `${effectsVolume}%`);

    const gameMode = settings.gameplay?.gameMode || 'normal';
    const gameModeRadio = document.querySelector(`input[name="gameMode"][value="${gameMode}"]`);
    if (gameModeRadio) {
        gameModeRadio.checked = true;
    }

    setValue('playerPanelStyle', settings.ui?.playerPanelStyle || 'auto');
    setValue('dragonstalkerPanelStyle', settings.ui?.dragonstalkerPanelStyle || 'auto');

    const panelOpacity = settings.ui?.panelOpacity || 80;
    setValue('panelOpacity', panelOpacity);
    setText('panelOpacityValue', `${panelOpacity}%`);
}

export function resetSettingsScreen() {
    resetSettings();
    updateSettingsScreen();
    alert('Settings have been reset to defaults!');
}

export function bindSettingsScreen() {
    console.log('Setting up settings event handlers...');

    bindToggle('soundEffectsToggle', 'soundEffects', 'Sound effects');
    bindToggle('backgroundMusicToggle', 'backgroundMusic', 'Background music');

    bindRange('masterVolumeSlider', 'masterVolumeValue', 'audio', 'masterVolume');
    bindRange('musicVolumeSlider', 'musicVolumeValue', 'audio', 'musicVolume');
    bindRange('effectsVolumeSlider', 'effectsVolumeValue', 'audio', 'effectsVolume');

    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        if (!markBound(radio, 'gameMode')) {
            return;
        }

        radio.addEventListener('change', function() {
            if (this.checked) {
                console.log('Game mode changed to:', this.value);
                updateSetting('gameplay', 'gameMode', this.value);
            }
        });
    });

    bindSelect('playerPanelStyle', 'ui', 'playerPanelStyle', 'Player panel style');
    bindSelect('dragonstalkerPanelStyle', 'ui', 'dragonstalkerPanelStyle', 'Dragonstalker panel style');
    bindRange('panelOpacity', 'panelOpacityValue', 'ui', 'panelOpacity');
}
