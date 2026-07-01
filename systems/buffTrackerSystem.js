// Buff tracker state facade.
// Rendering now happens on canvas via hudNotificationSystem to avoid gameplay-time DOM churn.
import {
    addOrUpdateBuff,
    clearBuffStates,
    removeBuffState,
    updateBuffStates
} from './hudNotificationSystem.js';

// Add or update a buff in the tracker
export function addBuff(id, name, effect, timer, type = 'default') {
    addOrUpdateBuff(id, name, effect, timer, type);
}

// Remove a buff from the tracker
export function removeBuff(id) {
    removeBuffState(id);
}

// Update all buff timers
export function updateBuffTracker(deltaTimeMultiplier) {
    updateBuffStates(deltaTimeMultiplier);
}

// Clear all buffs (for game restart)
export function clearAllBuffs() {
    clearBuffStates();
}
