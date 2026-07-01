// DOM helpers for the in-game spell and health status bars.

const SPELL_BAR_SLOTS = [
    { id: 'dragon_cry', elementId: 'spell-dragon-cry' },
    { id: 'zandalari', elementId: 'spell-zandalari' },
    { id: 'flask_of_titans', elementId: 'spell-flask-of-titans' },
    { id: 'autoshot', elementId: 'spell-autoshot' },
    { id: 'multishot', elementId: 'spell-multishot' }
];

export function updateSpellBar(spellSystem) {
    const currentTime = Date.now();

    SPELL_BAR_SLOTS.forEach(spell => {
        const element = document.getElementById(spell.elementId);
        const timerElement = document.getElementById(`${spell.elementId}-timer`);
        const cooldownOverlay = document.getElementById(`${spell.elementId}-cooldown`);

        if (!element || !timerElement || !cooldownOverlay) return;

        const cooldownRemaining = spellSystem.getCooldownRemaining(spell.id, currentTime);
        const durationRemaining = spellSystem.getDurationRemaining(spell.id, currentTime);
        const isActive = spellSystem.isSpellActive(spell.id);
        const isOnCooldown = cooldownRemaining > 0;

        element.className = 'spell-slot';
        if (isActive) {
            element.classList.add('active');
        } else if (isOnCooldown) {
            element.classList.add('cooldown');
        }

        if (isActive && durationRemaining > 0) {
            timerElement.textContent = `${durationRemaining}s`;
            timerElement.className = 'spell-timer active';
        } else if (isOnCooldown) {
            timerElement.textContent = `${cooldownRemaining}s`;
            timerElement.className = 'spell-timer cooldown';
        } else {
            timerElement.textContent = '';
            timerElement.className = 'spell-timer';
        }

        if (isOnCooldown) {
            cooldownOverlay.classList.add('active');
        } else {
            cooldownOverlay.classList.remove('active');
        }
    });
}

export function updateHealthBar({ health, maxHealth }) {
    const healthFill = document.getElementById('healthFill');
    const healthText = document.getElementById('healthText');

    if (!healthFill || !healthText) return;

    const healthPercentage = Math.max(0, health / maxHealth);
    const healthPercent = Math.ceil(healthPercentage * 100);

    healthFill.style.width = `${healthPercentage * 100}%`;
    healthFill.className = 'health-fill';
    if (healthPercentage <= 0.25) {
        healthFill.classList.add('low');
    } else if (healthPercentage <= 0.6) {
        healthFill.classList.add('medium');
    } else {
        healthFill.classList.add('high');
    }

    healthText.textContent = `${healthPercent}%`;
}
