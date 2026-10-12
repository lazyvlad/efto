import { addNotification } from '../utils/gameUtils.js';
import { CombatText } from '../classes/CombatText.js';

// Temporary stat effects tracking
let temporaryStatEffects = {
    critRatingEffects: [], // { bonus, remainingFrames, itemName }
    dodgeRatingEffects: [] // { bonus, remainingFrames, itemName }
};

export function getTemporaryStatEffects() {
    return temporaryStatEffects;
}

// Utility function to check if an action should crit
export function shouldCrit(gameState) {
    return Math.random() < getCurrentTotalCritRating(gameState);
}

// Utility function to check if the player should dodge an attack
export function shouldDodge(gameState, spellSystem) {
    const spellDodgeBonus = spellSystem.getDodgeRatingBonus ? spellSystem.getDodgeRatingBonus() : 0;
    const tempDodgeBonus = gameState.temporaryDodgeBoost || 0;
    const itemBasedDodgeRating = getCurrentTotalDodgeRating(gameState); // Includes permanent + temporary from items
    const totalDodgeRating = Math.min(itemBasedDodgeRating + spellDodgeBonus + tempDodgeBonus, gameState.dodgeRatingCap);
    return Math.random() < totalDodgeRating;
}

// Utility function to show combat text with dodge feedback
export function showDodgeText(x, y, combatTexts) {
    const dodgeText = new CombatText(x, y, "DODGE!", '#00FF00', false); // Green text at correct position
    combatTexts.push(dodgeText);
}

// Utility function to track dodge statistics
export function trackDodge(gameState, healthSaved = 0) {
    gameState.totalDodges++;
    gameState.healthSavedFromDodges += healthSaved;
    // Expand movable area by 1 pixel per HP saved from dodges
    gameState.dodgeAreaExpansion += healthSaved;
}

// Apply stat bonuses from collected items (crit rating, dodge rating)
export function applyItemStatBonuses(itemData, gameState) {
    // Performance optimization: skip if no bonuses defined
    const hasCritBonus = itemData.crit_rating_bonus && itemData.crit_rating_bonus > 0;
    const hasDodgeBonus = itemData.dodge_rating_bonus && itemData.dodge_rating_bonus > 0;
    
    if (!hasCritBonus && !hasDodgeBonus) {
        return; // No bonuses to apply
    }
    
    // Handle crit rating bonus
    if (hasCritBonus) {
        if (itemData.effect_type === "permanent") {
            applyPermanentCritBonus(itemData.crit_rating_bonus, itemData.name, gameState);
        } else if (itemData.effect_type === "temporary") {
            applyTemporaryCritBonus(itemData.crit_rating_bonus, itemData.effect_duration || 600, itemData.name, gameState);
        }
    }
    
    // Handle dodge rating bonus
    if (hasDodgeBonus) {
        if (itemData.effect_type === "permanent") {
            applyPermanentDodgeBonus(itemData.dodge_rating_bonus, itemData.name, gameState);
        } else if (itemData.effect_type === "temporary") {
            applyTemporaryDodgeBonus(itemData.dodge_rating_bonus, itemData.effect_duration || 600, itemData.name, gameState);
        }
    }
}

// Apply permanent crit rating bonus
function applyPermanentCritBonus(bonus, itemName, gameState) {
    const oldCritRating = gameState.critRating;
    gameState.critRating = Math.min(gameState.critRating + bonus, gameState.critRatingCap);
    const actualIncrease = gameState.critRating - oldCritRating;
    
    if (actualIncrease > 0) {
        const critPercent = Math.round(actualIncrease * 100);
        const newCritPercent = Math.round(gameState.critRating * 100);
        addNotification(gameState, `⚡ ${itemName}! Crit +${critPercent}% (Now: ${newCritPercent}%)`, 240, '#FF6B00');
        console.log(`⚡ ${itemName} increased permanent crit rating by ${critPercent}% to ${newCritPercent}%`);
    } else {
        const maxCritPercent = Math.round(gameState.critRatingCap * 100);
        addNotification(gameState, `⚡ ${itemName}! Crit already maxed (${maxCritPercent}%)`, 180, '#FF6B00');
    }
}

// Apply permanent dodge rating bonus
function applyPermanentDodgeBonus(bonus, itemName, gameState) {
    const oldDodgeRating = gameState.dodgeRating;
    gameState.dodgeRating = Math.min(gameState.dodgeRating + bonus, gameState.dodgeRatingCap);
    const actualIncrease = gameState.dodgeRating - oldDodgeRating;
    
    if (actualIncrease > 0) {
        const dodgePercent = Math.round(actualIncrease * 100);
        const newDodgePercent = Math.round(gameState.dodgeRating * 100);
        addNotification(gameState, `💨 ${itemName}! Dodge +${dodgePercent}% (Now: ${newDodgePercent}%)`, 240, '#00FF00');
        console.log(`💨 ${itemName} increased permanent dodge rating by ${dodgePercent}% to ${newDodgePercent}%`);
    } else {
        const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
        addNotification(gameState, `💨 ${itemName}! Dodge already maxed (${maxDodgePercent}%)`, 180, '#00FF00');
    }
}

// Apply temporary crit rating bonus
function applyTemporaryCritBonus(bonus, durationFrames, itemName, gameState) {
    // Add to temporary effects list
    temporaryStatEffects.critRatingEffects.push({
        bonus: bonus,
        remainingFrames: durationFrames,
        itemName: itemName
    });
    
    const critPercent = Math.round(bonus * 100);
    const durationSeconds = Math.round(durationFrames / 60);
    addNotification(gameState, `⚡ ${itemName}! Temp Crit +${critPercent}% (${durationSeconds}s)`, 180, '#FFD700');
    console.log(`⚡ ${itemName} applied temporary crit bonus: +${critPercent}% for ${durationSeconds} seconds`);
}

// Apply temporary dodge rating bonus
function applyTemporaryDodgeBonus(bonus, durationFrames, itemName, gameState) {
    // Add to temporary effects list
    temporaryStatEffects.dodgeRatingEffects.push({
        bonus: bonus,
        remainingFrames: durationFrames,
        itemName: itemName
    });
    
    const dodgePercent = Math.round(bonus * 100);
    const durationSeconds = Math.round(durationFrames / 60);
    addNotification(gameState, `💨 ${itemName}! Temp Dodge +${dodgePercent}% (${durationSeconds}s)`, 180, '#87CEEB');
    console.log(`💨 ${itemName} applied temporary dodge bonus: +${dodgePercent}% for ${durationSeconds} seconds`);
}

// Update temporary stat effects (call each frame)
export function updateTemporaryStatEffects(deltaTimeMultiplier, gameState, updateItemBonusesWindow) {
    let effectsChanged = false;
    
    // Update crit rating effects
    for (let i = temporaryStatEffects.critRatingEffects.length - 1; i >= 0; i--) {
        const effect = temporaryStatEffects.critRatingEffects[i];
        effect.remainingFrames -= deltaTimeMultiplier;
        
        if (effect.remainingFrames <= 0) {
            // Effect expired
            const critPercent = Math.round(effect.bonus * 100);
            addNotification(gameState, `⚡ ${effect.itemName} crit bonus expired (-${critPercent}%)`, 120, '#888888');
            temporaryStatEffects.critRatingEffects.splice(i, 1);
            effectsChanged = true;
        }
    }
    
    // Update dodge rating effects
    for (let i = temporaryStatEffects.dodgeRatingEffects.length - 1; i >= 0; i--) {
        const effect = temporaryStatEffects.dodgeRatingEffects[i];
        effect.remainingFrames -= deltaTimeMultiplier;
        
        if (effect.remainingFrames <= 0) {
            // Effect expired
            const dodgePercent = Math.round(effect.bonus * 100);
            addNotification(gameState, `💨 ${effect.itemName} dodge bonus expired (-${dodgePercent}%)`, 120, '#888888');
            temporaryStatEffects.dodgeRatingEffects.splice(i, 1);
            effectsChanged = true;
        }
    }
    
    // Update Item Bonuses screen if it's open and effects changed
    const itemBonusesScreen = document.getElementById('itemBonusesScreen');
    if (itemBonusesScreen && itemBonusesScreen.style.display !== 'none') {
        // Update every 30 frames to show timer countdown
        if (!gameState.bonusesUpdateCounter) gameState.bonusesUpdateCounter = 0;
        gameState.bonusesUpdateCounter++;
        
        if (gameState.bonusesUpdateCounter % 30 === 0 || effectsChanged) {
            updateItemBonusesWindow();
        }
    }
}

// Get current total crit rating (permanent + temporary)
export function getCurrentTotalCritRating(gameState) {
    let totalBonus = 0;
    temporaryStatEffects.critRatingEffects.forEach(effect => {
        totalBonus += effect.bonus;
    });
    return Math.min(gameState.critRating + totalBonus, gameState.critRatingCap);
}

// Get current total dodge rating (permanent + temporary)
export function getCurrentTotalDodgeRating(gameState) {
    let totalBonus = 0;
    temporaryStatEffects.dodgeRatingEffects.forEach(effect => {
        totalBonus += effect.bonus;
    });
    return Math.min(gameState.dodgeRating + totalBonus, gameState.dodgeRatingCap);
}

// Clear all temporary stat effects (call on game restart)
export function clearTemporaryStatEffects() {
    temporaryStatEffects.critRatingEffects = [];
    temporaryStatEffects.dodgeRatingEffects = [];
}
