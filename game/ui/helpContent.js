import { gameConfig } from '../config/gameConfig.js';
// Dynamic help content generation for the how-to-play screen.

// Configuration for Dragonstalker set completion bonuses
// These values should match the constants in utils/gameUtils.js checkDragonstalkerCompletion()
const DRAGONSTALKER_BONUSES = {
    critRatingIncrease: 0.08,    // 8% crit rating per completion
    dodgeRatingIncrease: 0.01    // 1% dodge rating per completion
};

export function generateDynamicHelpContent(gameState, gameItems) {
    generateCritSystemContent(gameState, gameItems);
    generateDodgeSystemContent(gameState, gameItems);
    generateArrowSystemContent(gameState);
}

function generateCritSystemContent(gameState, gameItems) {
    const container = document.getElementById('critSystemContent');
    if (!container) return;
    
    const baseCritPercent = Math.round(gameState.baseCritRating * 100);
    const maxCritPercent = Math.round(gameState.critRatingCap * 100);
    const critMultiplier = gameState.critMultiplier;
    
    // Read Dragonstalker completion bonus from configuration
    const dragonstalkerCritBonus = Math.round(DRAGONSTALKER_BONUSES.critRatingIncrease * 100);
    
    let content = `
        <p>• ${baseCritPercent}% base chance to ${critMultiplier}x points from any item</p>
        <p>• Complete Dragonstalker sets: +${dragonstalkerCritBonus}% crit chance each</p>
    `;
    
    // Add item-based crit bonuses dynamically
    const critItems = gameItems.filter(item => item.crit_rating_bonus > 0);
    if (critItems.length > 0) {
        // Sort items by type for better organization
        const sortedCritItems = critItems.sort((a, b) => {
            const typeOrder = { zee_zgnan: 5, legendary: 4, special: 3, epic: 2, tier_set: 1, regular: 0 };
            const aPriority = typeOrder[a.type] || 0;
            const bPriority = typeOrder[b.type] || 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return a.name.localeCompare(b.name);
        });
        
        sortedCritItems.forEach(item => {
            const bonusPercent = Math.round(item.crit_rating_bonus * 100);
            const effectType = item.effect_type === 'permanent' ? 'permanent' : 
                              `temporary (${Math.round((item.effect_duration || 600) / 60)}s)`;
            content += `<p>• ${item.name}: +${bonusPercent}% ${effectType} crit chance</p>`;
        });
    }
    
    // Add spell-based bonuses (Dragon Cry is hardcoded for now)
    content += `<p>• Dragon Cry spell: +5% crit chance for 10 seconds</p>`;
    
    content += `<p>• <strong>Maximum crit chance: ${maxCritPercent}%</strong></p>`;
    
    container.innerHTML = content;
}

function generateDodgeSystemContent(gameState, gameItems) {
    const container = document.getElementById('dodgeSystemContent');
    if (!container) return;
    
    const baseDodgePercent = Math.round(gameState.baseDodgeRating * 100);
    const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
    
    // Read Dragonstalker completion bonus from configuration
    const dragonstalkerDodgeBonus = Math.round(DRAGONSTALKER_BONUSES.dodgeRatingIncrease * 100);
    
    let content = `
        <p>• ${baseDodgePercent}% base chance to avoid damage from projectiles and item misses</p>
        <p>• Complete Dragonstalker sets: +${dragonstalkerDodgeBonus}% dodge chance each</p>
    `;
    
    // Add item-based dodge bonuses dynamically
    const dodgeItems = gameItems.filter(item => item.dodge_rating_bonus > 0);
    if (dodgeItems.length > 0) {
        // Sort items by type for better organization
        const sortedDodgeItems = dodgeItems.sort((a, b) => {
            const typeOrder = { zee_zgnan: 5, legendary: 4, special: 3, epic: 2, tier_set: 1, regular: 0 };
            const aPriority = typeOrder[a.type] || 0;
            const bPriority = typeOrder[b.type] || 0;
            if (aPriority !== bPriority) return bPriority - aPriority;
            return a.name.localeCompare(b.name);
        });
        
        sortedDodgeItems.forEach(item => {
            const bonusPercent = Math.round(item.dodge_rating_bonus * 100);
            const effectType = item.effect_type === 'permanent' ? 'permanent' : 
                              `temporary (${Math.round((item.effect_duration || 600) / 60)}s)`;
            content += `<p>• ${item.name}: +${bonusPercent}% ${effectType} dodge chance</p>`;
        });
    }
    
    // Add hardcoded spell/power-up bonuses that aren't easily discoverable
    content += `
        <p>• Zandalari spell: +5% dodge chance for 15s after spell expires</p>
        <p>• Aspect of the Monkey power-up: +3% dodge chance for 15 seconds</p>
        <p>• Evasion power-up: +1% permanent dodge chance</p>
        <p>• <strong>Area Expansion:</strong> Each HP saved from dodges expands your movable area by 1 pixel</p>
        <p>• Dodge is checked BEFORE Power Word Shield</p>
        <p>• Dodge does NOT prevent DOT damage ticks</p>
        <p>• <strong>Maximum dodge chance: ${maxDodgePercent}%</strong></p>
    `;
    
    container.innerHTML = content;
}

function generateArrowSystemContent(gameState) {
    const container = document.getElementById('arrowSystemContent');
    if (!container) return;
    
    const quiver = gameConfig.quiver;
    
    let content = `
        <p>• <strong>Quiver:</strong> ${quiver.slots} slots of ${quiver.slotSize} arrows, ${quiver.slots * quiver.slotSize} in all. A game starts with ${quiver.startFilled} slots filled (${quiver.startFilled * quiver.slotSize} arrows); arrows caught with a full quiver are lost</p>
        <p>• <strong>Large quiver:</strong> any boss may drop it for a logged-in player. It is kept on the account and adds ${quiver.bonusSlots} slots (${(quiver.slots + quiver.bonusSlots) * quiver.slotSize} arrows)</p>
        <p>• <strong>Arrow Power-ups:</strong> Bronze (+25), Silver (+50), Thorium (+100)</p>
        <p>• <strong>Autoshot (E):</strong> Fires 1 arrow straight up (0.5s cooldown, uses 1 arrow)</p>
        <p>• <strong>Multishot (R):</strong> Fires 5 arrows in wide spread (0.5s cooldown, uses 5 arrows)</p>
        <p>• Arrows destroy harmful projectiles (Fireball, Frostbolt, Shadowbolt)</p>
        <p>• Arrows pass through items, power-ups and beneficial spells - those you have to catch yourself</p>
        <p>• Arrow power-ups display the amount they add below the icon</p>
    `;
    
    container.innerHTML = content;
}
