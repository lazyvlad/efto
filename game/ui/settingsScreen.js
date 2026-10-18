import { resetKeys } from '../utils/keybindings.js';
import { askConfirm } from './gameDialog.js';
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
        updateSetting(section, key, this.value);
    });
}

function bindToggle(id, key, label, category = 'audio') {
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
        updateSetting(category, key, this.checked);
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
    setChecked('voiceLinesToggle', settings.audio.voiceLines !== false);

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

    setValue('handedness', settings.ui?.handedness || 'right');
    setValue('petStance', settings.gameplay?.petStance || 'defensive');
    setValue('fullBags', settings.gameplay?.fullBags || 'weakest');
    setChecked('lockMouseToggle', settings.ui?.lockMouse !== false);
    setValue('playerPanelStyle', settings.ui?.playerPanelStyle || 'auto');
    setValue('dragonstalkerPanelStyle', settings.ui?.dragonstalkerPanelStyle || 'auto');

    const panelOpacity = settings.ui?.panelOpacity || 80;
    setValue('panelOpacity', panelOpacity);
    setText('panelOpacityValue', `${panelOpacity}%`);

    SWITCHED.forEach(showSwitch);
}

// The choices of a few words, shown as joined buttons in place of their drop-down lists (which
// cut their words short on a phone). The list stays, hidden, and keeps the value: a press sets
// it and tells it changed, as picking from it would.
const SWITCHED = ['petStance', 'fullBags', 'handedness', 'playerPanelStyle', 'dragonstalkerPanelStyle'];

function switchOf(select) {
    let holder = select.nextElementSibling;
    if (holder && holder.classList.contains('setting-switch')) return holder;

    holder = document.createElement('div');
    holder.className = 'joined-buttons setting-switch';
    holder.setAttribute('role', 'group');
    for (const option of select.options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'game-btn';
        button.dataset.value = option.value;
        // "Defensive (fetches loot, bites what falls at you)": the words before the brackets,
        // the rest when pointed at
        button.textContent = option.textContent.replace(/\s*\(.*\)\s*$/, '');
        button.title = option.textContent;
        button.addEventListener('click', () => {
            if (select.value === option.value) return;
            select.value = option.value;
            select.dispatchEvent(new Event('change'));
            showSwitch(select.id);
        });
        holder.append(button);
    }
    select.hidden = true;
    select.after(holder);
    return holder;
}

function showSwitch(id) {
    const select = byId(id);
    if (!select) return;
    switchOf(select).querySelectorAll('[data-value]').forEach(button => {
        const on = button.dataset.value === select.value;
        button.classList.toggle('is-on', on);
        button.setAttribute('aria-pressed', String(on));
    });
}

// Every setting and key back to how it came: asked first, in the game's own window
export async function resetSettingsScreen() {
    const sure = await askConfirm({
        title: 'Reset every setting?',
        text: 'Sound, display, controls and keys go back to how they came.',
        yes: 'Reset them',
        danger: true,
    });
    if (!sure) return;
    resetSettings();
    resetKeys('usual');
    updateSettingsScreen();
}

export function bindSettingsScreen() {

    bindToggle('soundEffectsToggle', 'soundEffects', 'Sound effects');
    bindToggle('backgroundMusicToggle', 'backgroundMusic', 'Background music');
    bindToggle('voiceLinesToggle', 'voiceLines', 'Voice lines');
    bindToggle('lockMouseToggle', 'lockMouse', 'Mouse lock', 'ui');

    bindRange('masterVolumeSlider', 'masterVolumeValue', 'audio', 'masterVolume');
    bindRange('musicVolumeSlider', 'musicVolumeValue', 'audio', 'musicVolume');
    bindRange('effectsVolumeSlider', 'effectsVolumeValue', 'audio', 'effectsVolume');

    document.querySelectorAll('input[name="gameMode"]').forEach(radio => {
        if (!markBound(radio, 'gameMode')) {
            return;
        }

        radio.addEventListener('change', function() {
            if (this.checked) {
                updateSetting('gameplay', 'gameMode', this.value);
            }
        });
    });

    bindSelect('handedness', 'ui', 'handedness', 'Handedness');
    bindSelect('petStance', 'gameplay', 'petStance', 'Your pet');
    bindSelect('fullBags', 'gameplay', 'fullBags', 'Your bags');
    bindSelect('playerPanelStyle', 'ui', 'playerPanelStyle', 'Player panel style');
    bindSelect('dragonstalkerPanelStyle', 'ui', 'dragonstalkerPanelStyle', 'Dragonstalker panel style');
    bindRange('panelOpacity', 'panelOpacityValue', 'ui', 'panelOpacity');
}
