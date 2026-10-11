// DOM helpers for the in-game spell and health status bars.

import { gameClock } from '../utils/gameClock.js';

const SPELL_BAR_SLOTS = [
    { id: 'dragon_cry', elementId: 'spell-dragon-cry' },
    { id: 'zandalari', elementId: 'spell-zandalari' },
    { id: 'flask_of_titans', elementId: 'spell-flask-of-titans' },
    { id: 'autoshot', elementId: 'spell-autoshot' },
    { id: 'multishot', elementId: 'spell-multishot' }
];

// These run every frame, so only touch the DOM when a value actually changes.
function setClassName(element, className) {
    if (element.className !== className) element.className = className;
}

function setText(element, text) {
    if (element.textContent !== text) element.textContent = text;
}

let spellBarElements = null;

function getSpellBarElements() {
    if (spellBarElements && spellBarElements.every(slot => slot.element.isConnected)) {
        return spellBarElements;
    }

    const slots = [];
    for (const spell of SPELL_BAR_SLOTS) {
        const element = document.getElementById(spell.elementId);
        const timerElement = document.getElementById(`${spell.elementId}-timer`);
        const cooldownOverlay = document.getElementById(`${spell.elementId}-cooldown`);
        if (element && timerElement && cooldownOverlay) {
            slots.push({ id: spell.id, element, timerElement, cooldownOverlay });
        }
    }

    // Don't cache a partial bar - the rest of the DOM may not be there yet
    spellBarElements = slots.length === SPELL_BAR_SLOTS.length ? slots : null;
    return slots;
}

export function updateSpellBar(spellSystem) {
    const currentTime = gameClock.now();

    getSpellBarElements().forEach(({ id, element, timerElement, cooldownOverlay }) => {
        const cooldownRemaining = spellSystem.getCooldownRemaining(id, currentTime);
        const durationRemaining = spellSystem.getDurationRemaining(id, currentTime);
        const isActive = spellSystem.isSpellActive(id);
        const isOnCooldown = cooldownRemaining > 0;

        setClassName(element, isActive ? 'spell-slot active' : isOnCooldown ? 'spell-slot cooldown' : 'spell-slot');

        if (isActive && durationRemaining > 0) {
            setText(timerElement, `${durationRemaining}s`);
            setClassName(timerElement, 'spell-timer active');
        } else if (isOnCooldown) {
            setText(timerElement, `${cooldownRemaining}s`);
            setClassName(timerElement, 'spell-timer cooldown');
        } else {
            setText(timerElement, '');
            setClassName(timerElement, 'spell-timer');
        }

        cooldownOverlay.classList.toggle('active', isOnCooldown);
    });
}

export function updateHealthBar({ health, maxHealth }) {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');

    if (!healthFill || !healthText) return;

    const healthPercentage = Math.max(0, health / maxHealth);
    const healthPercent = Math.ceil(healthPercentage * 100);

    const width = `${healthPercentage * 100}%`;
    if (healthFill.style.width !== width) healthFill.style.width = width;
    setClassName(healthFill, healthPercentage <= 0.25 ? 'health-fill low' :
        healthPercentage <= 0.6 ? 'health-fill medium' : 'health-fill high');

    setText(healthText, `${healthPercent}%`);
}
