// Player spell system
import { playerSpells } from '../data/playerSpells.js';
import { notificationSystem } from './notificationSystem.js';

class SpellSystem {
    constructor() {
        this.spells = {};
        this.activeSpells = new Map();
        this.cooldowns = new Map();
        this.notificationCallback = null;
        this.gameStateCallback = null;
        
        // Initialize spells
        playerSpells.forEach(spell => {
            this.spells[spell.id] = spell;
            this.cooldowns.set(spell.id, 0);
        });
    }

    // Set notification callback function
    setNotificationCallback(callback) {
        this.notificationCallback = callback;
    }

    // Set game state callback function
    setGameStateCallback(callback) {
        this.gameStateCallback = callback;
    }

    // Internal method to add notifications
    addNotification(message, duration = 3000, type = null) {
        // Use the new HTML notification system
        notificationSystem.showSpellNotification(message, duration, type);
        
        // Keep the old callback for backward compatibility
        if (this.notificationCallback) {
            this.notificationCallback(message, duration);
        }
    }

    // Cast a spell by ID
    castSpell(spellId, currentTime) {
        const spell = this.spells[spellId];
        if (!spell) return false;

        // Check if spell is on cooldown
        if (this.isOnCooldown(spellId, currentTime)) {
            const remainingCooldown = Math.ceil((this.cooldowns.get(spellId) - currentTime) / 1000);
            this.addNotification(`${spell.name} on cooldown (${remainingCooldown}s)`, 2000, 'cooldown');
            return false;
        }

        // Activate spell
        this.activateSpell(spell, currentTime);
        return true;
    }

    // Cast spell by key binding
    castSpellByKey(key, currentTime) {
        const spell = playerSpells.find(s => s.key.toLowerCase() === key.toLowerCase());
        if (spell) {
            return this.castSpell(spell.id, currentTime);
        }
        return false;
    }

    // Activate a spell
    activateSpell(spell, currentTime) {
        // Set cooldown (convert frame-based cooldown to milliseconds)
        const cooldownMs = spell.cooldown * (1000 / 60);
        this.cooldowns.set(spell.id, currentTime + cooldownMs);
        
        // Handle special spell effects
        if (spell.id === 'flask_of_titans') {
            this.handleFlaskOfTitansEffect();
            return; // Flask of Titans is instant, no duration tracking needed
        }
        
        // Add to active spells (only for spells with duration)
        if (spell.duration > 0) {
            // Convert frame-based duration to milliseconds (60fps = 16.67ms per frame)
            const durationMs = spell.duration * (1000 / 60);
            this.activeSpells.set(spell.id, {
                spell: spell,
                endTime: currentTime + durationMs,
                startTime: currentTime
            });
        }

        // Don't show activation notification - persistent notification will handle this
    }

    // Check if spell is on cooldown
    isOnCooldown(spellId, currentTime) {
        return this.cooldowns.get(spellId) > currentTime;
    }

    // Check if spell is active
    isSpellActive(spellId) {
        return this.activeSpells.has(spellId);
    }

    // Get active spell effect value
    getSpellEffect(spellId, effectName) {
        const activeSpell = this.activeSpells.get(spellId);
        if (activeSpell && activeSpell.spell.effects[effectName]) {
            return activeSpell.spell.effects[effectName];
        }
        return null;
    }

    // Update spell system (remove expired spells)
    update(currentTime, player = null, canvas = null, gameConfig = null) {
        // Update persistent notifications for active spells
        this.updateSpellNotifications(currentTime);
        
        // Collect expired spells first to avoid modifying Map while iterating
        const expiredSpells = [];
        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            if (currentTime >= activeSpell.endTime) {
                expiredSpells.push({ spellId, activeSpell });
            }
        }
        
        // Process expired spells
        for (const { spellId, activeSpell } of expiredSpells) {
            // Handle spell expiration effects
            this.handleSpellExpiration(spellId, activeSpell.spell, player, canvas, gameConfig);
            
            // Remove from active spells
            this.activeSpells.delete(spellId);
            
            // Remove persistent notification
            if (notificationSystem && notificationSystem.removePersistentNotification) {
                notificationSystem.removePersistentNotification(`spell_${spellId}`);
            }
            
            // Don't show expiration notification - persistent notification disappearing will indicate expiration
        }
    }

    // Update persistent notifications for active spells
    updateSpellNotifications(currentTime) {
        if (!notificationSystem || !notificationSystem.showPersistentNotification) return;

        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            const remainingTime = Math.max(0, activeSpell.endTime - currentTime);
            const seconds = Math.ceil(remainingTime / 1000);
            
            if (seconds > 0) {
                let icon = '✨';
                let type = 'activation';
                
                // Customize icon and type based on spell
                if (spellId === 'dragon_cry') {
                    icon = '🐲';
                    type = 'teleport';
                } else if (spellId === 'zandalari') {
                    icon = '⚡';
                    type = 'boost';
                } else if (spellId === 'flask_of_titans') {
                    icon = '🌸';
                    type = 'flask_of_titans';
                }
                
                const message = `${icon} ${activeSpell.spell.name} (${seconds}s)`;
                notificationSystem.showPersistentNotification(`spell_${spellId}`, message, type, true);
            }
        }
    }

    // Handle special effects when spells expire
    handleSpellExpiration(spellId, spell, player, canvas, gameConfig) {
        if (spellId === 'dragon_cry' && player && canvas && gameConfig) {
            // Teleport player back to constrained area if they're outside
            this.teleportPlayerToConstrainedArea(player, canvas, gameConfig);
        }
    }

    // Teleport player back to the constrained movable area
    teleportPlayerToConstrainedArea(player, canvas, gameConfig) {
        const movableArea = gameConfig.player.movableArea;
        
        if (!movableArea.enabled) return; // No constraints to enforce
        
        // Calculate constrained area bounds
        const movableHeight = canvas.height * movableArea.heightPercent;
        const minY = canvas.height - movableHeight;
        const maxY = canvas.height - player.height;
        
        // Check if player is outside the constrained area
        if (player.y < minY) {
            // Player is above the constrained area, teleport them down
            player.y = minY;
            this.addNotification('Teleported to safe area!', 3000, 'teleport');
        }
        
        // Ensure player is also within horizontal bounds (just in case)
        const minX = 0;
        const maxX = canvas.width - player.width;
        
        if (player.x < minX) {
            player.x = minX;
        } else if (player.x > maxX) {
            player.x = maxX;
        }
    }

    // Get cooldown remaining in seconds
    getCooldownRemaining(spellId, currentTime) {
        const cooldownEnd = this.cooldowns.get(spellId);
        if (cooldownEnd <= currentTime) return 0;
        return Math.ceil((cooldownEnd - currentTime) / 1000);
    }

    // Get spell duration remaining in seconds
    getDurationRemaining(spellId, currentTime) {
        const activeSpell = this.activeSpells.get(spellId);
        if (!activeSpell) return 0;
        return Math.max(0, Math.ceil((activeSpell.endTime - currentTime) / 1000));
    }

    // Get all active spells
    getActiveSpells() {
        return Array.from(this.activeSpells.values());
    }

    // Check if player has unrestricted movement
    hasUnrestrictedMovement() {
        return this.isSpellActive('dragon_cry');
    }

    // Get point multiplier from active spells
    getPointMultiplier() {
        let multiplier = 1.0;
        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            if (activeSpell.spell.effects.point_multiplier) {
                multiplier *= activeSpell.spell.effects.point_multiplier;
            }
        }
        return multiplier;
    }

    // Get projectile speed multiplier from active spells
    getProjectileSpeedMultiplier() {
        let multiplier = 1.0;
        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            if (activeSpell.spell.effects.slow_projectiles) {
                multiplier = Math.min(multiplier, activeSpell.spell.effects.slow_projectiles);
            }
        }
        return multiplier;
    }

    // Get item speed multiplier from active spells
    getItemSpeedMultiplier() {
        let multiplier = 1.0;
        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            if (activeSpell.spell.effects.slow_items) {
                multiplier = Math.min(multiplier, activeSpell.spell.effects.slow_items);
            }
        }
        return multiplier;
    }

    // Get crit rating bonus from active spells
    getCritRatingBonus() {
        let bonus = 0.0;
        for (const [spellId, activeSpell] of this.activeSpells.entries()) {
            if (activeSpell.spell.effects.crit_rating_bonus) {
                bonus += activeSpell.spell.effects.crit_rating_bonus;
            }
        }
        return bonus;
    }

    // Handle flask of titans effect - remove one missed dragonstalker item
    handleFlaskOfTitansEffect() {
        // Access the global gameItems array directly
        if (typeof window !== 'undefined' && window.gameItems) {
            // Find dragonstalker items that have been missed
            const missedDragonstalkerItems = window.gameItems.filter(item => 
                item.type === 'tier_set' && item.missed > 0
            );

            if (missedDragonstalkerItems.length === 0) {
                this.addNotification('Flask of Titans had no effect - no missed dragonstalker items', 3000, 'warning');
                return;
            }

            // Remove one miss from the first item with misses
            const itemToFix = missedDragonstalkerItems[0];
            itemToFix.missed--;

            // Update game state if available
            const gameState = this.gameStateCallback ? this.gameStateCallback() : null;
            if (gameState) {
                // Decrease missed tier set counter
                gameState.tierSetMissed = Math.max(0, gameState.tierSetMissed - 1);
                
                // Check if game is now winnable again
                const stillMissedItems = window.gameItems.filter(item => 
                    item.type === 'tier_set' && item.missed > 0
                );
                
                        if (stillMissedItems.length === 0) {
            this.addNotification(`Flask of Titans restored ${itemToFix.name}! Victory is possible again! 🏆`, 4000, 'success');
        } else {
            this.addNotification(`Flask of Titans restored ${itemToFix.name}!`, 3000, 'flask_of_titans');
        }
            } else {
                this.addNotification(`Flask of Titans restored ${itemToFix.name}!`, 3000, 'flask_of_titans');
            }
            return;
        }

        // Fallback: try to get gameItems through the gameState callback
        if (!this.gameStateCallback) {
            this.addNotification('Flask of Titans failed - game state not available', 3000, 'warning');
            return;
        }

        const gameState = this.gameStateCallback();
        if (!gameState) {
            this.addNotification('Flask of Titans failed - game state not available', 3000, 'warning');
            return;
        }

        // Try to access gameItems through a different path
        let gameItemsArray = null;
        if (gameState.gameItems) {
            gameItemsArray = gameState.gameItems;
        } else if (typeof gameItems !== 'undefined') {
            gameItemsArray = gameItems;
        }

        if (!gameItemsArray) {
            this.addNotification('Flask of Titans failed - items not available', 3000, 'warning');
            return;
        }

        // Find dragonstalker items that have been missed
        const missedDragonstalkerItems = gameItemsArray.filter(item => 
            item.type === 'tier_set' && item.missed > 0
        );

        if (missedDragonstalkerItems.length === 0) {
            this.addNotification('Flask of Titans had no effect - no missed dragonstalker items', 3000, 'warning');
            return;
        }

        // Remove one miss from the first item with misses
        const itemToFix = missedDragonstalkerItems[0];
        itemToFix.missed--;

        // Decrease missed tier set counter
        gameState.tierSetMissed = Math.max(0, gameState.tierSetMissed - 1);
        
        // Check if game is now winnable again
        const stillMissedItems = gameItemsArray.filter(item => 
            item.type === 'tier_set' && item.missed > 0
        );
        
        if (stillMissedItems.length === 0) {
            this.addNotification(`Flask of Titans restored ${itemToFix.name}! Victory is possible again! 🏆`, 4000, 'success');
        } else {
            this.addNotification(`Flask of Titans restored ${itemToFix.name}!`, 3000, 'flask_of_titans');
        }
    }
}

export const spellSystem = new SpellSystem(); 