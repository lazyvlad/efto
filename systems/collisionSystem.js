import { gameConfig } from '../config/gameConfig.js';
import { addNotification, trackActivity, checkDragonstalkerCompletion } from '../utils/gameUtils.js';
import { createCollectionParticles, createImpactParticles, createShadowParticles } from '../utils/spawning.js';
import { Particle } from '../classes/Particle.js';
import { CombatText } from '../classes/CombatText.js';
import { startBackgroundMusic, playDragonstalkerSound, playTotalSound, playItemSound, playThunderSound } from './audioSystem.js';

export function checkCollisions(context) {
    const {
        gameState,
        player,
        fallingItems,
        fireballs,
        powerUps,
        particles,
        combatTexts,
        gameItems,
        spellSystem,
        onItemCollected,
        applyItemStatBonuses,
        shouldDodge,
        showDodgeText,
        trackDodge
    } = context;

    function createLightningEffect(startX, startY, endX, endY) {
        const steps = 8;
        const stepX = (endX - startX) / steps;
        const stepY = (endY - startY) / steps;
        
        for (let i = 0; i <= steps; i++) {
            const x = startX + (stepX * i) + (Math.random() - 0.5) * 20;
            const y = startY + (stepY * i) + (Math.random() - 0.5) * 20;
            particles.push(new Particle(x, y, '#FFFF00')); // Yellow lightning particles
        }
    }

    function triggerThunderfuryEffect(thunderfuryX, thunderfuryY) {
        let itemsCollected = 0;
        let totalPoints = 0;
        
        // Create lightning effect particles from Thunderfury position
        for (let i = 0; i < 15; i++) {
            particles.push(new Particle(thunderfuryX, thunderfuryY, '#FFD700')); // Golden lightning particles
        }
        
        // Auto-collect all remaining falling items (but not power-ups or projectiles)
        const remainingItems = fallingItems.filter(otherItem => {
            if (otherItem.itemData) {
                // Create lightning bolt effect from Thunderfury to each item
                createLightningEffect(thunderfuryX, thunderfuryY, otherItem.x + otherItem.width/2, otherItem.y + otherItem.height/2);
                
                // Collect the item
                otherItem.itemData.collected++;
                
                // Trigger items list update
                onItemCollected(otherItem.itemData);
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                const basePoints = otherItem.itemData.value;
                let finalPoints = Math.round(basePoints * pointMultiplier);
                
                // Check for critical hit (include spell crit rating bonus)
                const critRoll = Math.random();
                const spellCritBonus = spellSystem.getCritRatingBonus();
                const totalCritRating = Math.min(gameState.critRating + spellCritBonus, gameState.critRatingCap);
                const isCrit = critRoll < totalCritRating;
                
                if (isCrit) {
                    finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                    
                    // Create crit combat text for Thunderfury auto-collection
                    const critText = new CombatText(
                        otherItem.x + otherItem.width/2, 
                        otherItem.y + otherItem.height/2,
                        `+${finalPoints} CRIT!`,
                        '#FF6B00', // Orange crit color
                        true // is crit
                    );
                    combatTexts.push(critText);
                } else {
                    // Create normal combat text for non-crit
                    const normalText = new CombatText(
                        otherItem.x + otherItem.width/2, 
                        otherItem.y + otherItem.height/2,
                        `+${finalPoints}`,
                        '#FFD700', // Gold normal color
                        false // not crit
                    );
                    combatTexts.push(normalText);
                }
                
                gameState.score += finalPoints;
                totalPoints += finalPoints;
                
                gameState.perfectCollections++;
                itemsCollected++;
                
                // Create collection particles at item location
                createCollectionParticles(otherItem.x + otherItem.width/2, otherItem.y + otherItem.height/2, particles);
                
                // Handle tier set items
                if (otherItem.itemData.type === "tier_set" && otherItem.itemData.collected === 1) {
                    gameState.tierSetCollected++;
                }
            }
            
            return false; // Remove all items (they were auto-collected)
        });

        fallingItems.splice(0, fallingItems.length, ...remainingItems);
        
        // Play special thunder sound and show notification
        playThunderSound();
        if (itemsCollected > 0) {
            addNotification(gameState, `⚡ THUNDERFURY: ${itemsCollected} items collected! (+${totalPoints} pts)`, 300, '#FFD700');
        } else {
            addNotification(gameState, `⚡ THUNDERFURY: Lightning strikes!`, 180, '#FFD700');
        }
    }

    // Check item collisions
    fallingItems.forEach((item, itemIndex) => {
        if (item.checkCollision && item.checkCollision(player)) {
            // Update item data and score
            if (item.itemData) {
                item.itemData.collected++;
                
                // Trigger items list update
                onItemCollected(item.itemData);
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                const basePoints = item.itemData.value;
                let finalPoints = Math.round(basePoints * pointMultiplier);
                
                // Check for critical hit (include spell crit rating bonus)
                const critRoll = Math.random();
                const spellCritBonus = spellSystem.getCritRatingBonus();
                const totalCritRating = Math.min(gameState.critRating + spellCritBonus, gameState.critRatingCap);
                const isCrit = critRoll < totalCritRating;
                
                if (isCrit) {
                    finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                    
                    // Create crit combat text
                    const critText = new CombatText(
                        item.x + item.width/2, 
                        item.y + item.height/2,
                        `+${finalPoints} CRIT!`,
                        '#FF6B00', // Orange crit color
                        true // is crit
                    );
                    combatTexts.push(critText);
                    
                    // Add crit notification
                    addNotification(gameState, `💥 CRITICAL HIT! +${finalPoints} points`, 120, '#FF6B00');
                } else {
                    // Create normal combat text for non-crit
                    const normalText = new CombatText(
                        item.x + item.width/2, 
                        item.y + item.height/2,
                        `+${finalPoints}`,
                        '#FFD700', // Gold normal color
                        false // not crit
                    );
                    combatTexts.push(normalText);
                }
                
                gameState.score += finalPoints;
                
                // Show bonus points notification if spell multiplier is active (but not for crits to avoid spam)
                if (pointMultiplier > 1.0 && !isCrit) {
                    const bonusPercent = Math.round((pointMultiplier - 1.0) * 100);
                    addNotification(gameState, `💰 +${bonusPercent}% Points (${finalPoints})`, 120, '#FFD700');
                }
                
                gameState.perfectCollections++;
                
                // Track activity for hybrid progression
                trackActivity(gameState, 'collection', 1);
                
                // Create particles
                createCollectionParticles(item.x + item.width/2, item.y + item.height/2, particles);
                
                // Special effect for Thunderfury: Auto-collect all falling items
                if (item.itemData.id === "ThunderFury") {
                    triggerThunderfuryEffect(item.x + item.width/2, item.y + item.height/2);
                }
                
                // Apply configurable stat bonuses (crit rating, dodge rating)
                applyItemStatBonuses(item.itemData);
                
                // Play sounds and handle tier set collection
                if (item.itemData.type === "tier_set") {
                    playDragonstalkerSound();
                    
                    // Debug logging for tier set collection
                    console.log(`Tier set item collected: ${item.itemData.name} (${item.itemData.id})`);
                    console.log(`Player celebration method exists:`, !!player.onTierSetCollected);
                    
                    // Only increment if this is the first time collecting this specific piece
                    if (item.itemData.collected === 1) { // collected was incremented above, so 1 means first time
                        gameState.tierSetCollected++;
                    }
                    
                    // Check if this is an Ashkandi item for special celebration
                    if (item.itemData.id === "ashjrethul" || item.itemData.id === "ashkandi2") {
                        // Trigger special sando celebration for Ashkandi items
                        if (player.onAshkandiCollected) {
                            console.log(`Triggering sando celebration for: ${item.itemData.name}`);
                            player.onAshkandiCollected();
                        }
                    } else {
                        // Trigger regular player celebration for other tier set items
                        if (player.onTierSetCollected) {
                            console.log(`Triggering celebration for: ${item.itemData.name}`);
                            player.onTierSetCollected();
                        }
                    }
                    
                    // Add notification for tier set collection
                    // Use actual unique count for display
                    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                    addNotification(gameState, `🏆 ${item.itemData.name} (${uniquePiecesCollected}/10)`, 240, '#FFD700');
                    
                    // Check if Dragonstalker set is complete
                    const setCompleted = checkDragonstalkerCompletion(gameState, gameItems);
                    if (setCompleted) {
                        playTotalSound(); // Play total sound for Dragonstalker completion
                    }
                } else {
                    playItemSound(item.itemData);
                }
                
                // Start background music
                if (gameState.perfectCollections === gameConfig.audio.backgroundMusicStart) {
                    startBackgroundMusic();
                }
            }
            
            // Remove collected item
            fallingItems.splice(itemIndex, 1);
        }
    });
    
    // Check projectile collisions
    fireballs.forEach((projectile, projectileIndex) => {
        if (projectile.checkCollision && projectile.checkCollision(player)) {
            // Apply projectile effects
            if (projectile.data) {
                if (projectile.data.effects === "speed_increase") {
                    // Apply speed boost
                    const increasePercent = projectile.speedIncreasePercent || 20;
                    gameState.speedIncreaseActive = true;
                    gameState.speedIncreaseTimer = 600; // 10 seconds
                    gameState.currentSpeedIncreasePercent += increasePercent;
                    gameState.speedIncreaseMultiplier = 1 + (gameState.currentSpeedIncreasePercent / 100);
                    
                    // Cap at 100%
                    if (gameState.currentSpeedIncreasePercent > 100) {
                        gameState.currentSpeedIncreasePercent = 100;
                        gameState.speedIncreaseMultiplier = 2.0;
                    }
                    
                    // UPDATE EXISTING ITEMS' SPEED - Apply speed boost to all items currently on screen
                    fallingItems.forEach(item => {
                        if (item.speed && item.baseSpeed) {
                            // If item has stored base speed, recalculate from base
                            item.speed = item.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            // Otherwise, multiply current speed by the boost ratio
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            item.speed *= boostRatio;
                        }
                    });
                    
                    // Update power-up items too
                    powerUps.forEach(powerUp => {
                        if (powerUp.speed && powerUp.baseSpeed) {
                            powerUp.speed = powerUp.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            powerUp.speed *= boostRatio;
                        }
                    });
                    
                    // Update projectiles too (they should also be affected by speed boost)
                    fireballs.forEach(projectile => {
                        if (projectile.speed && projectile.baseSpeed) {
                            projectile.speed = projectile.baseSpeed * gameState.speedIncreaseMultiplier;
                        } else {
                            const previousMultiplier = 1 + ((gameState.currentSpeedIncreasePercent - increasePercent) / 100);
                            const boostRatio = gameState.speedIncreaseMultiplier / Math.max(previousMultiplier, 1);
                            projectile.speed *= boostRatio;
                        }
                    });
                    
                    // Add notification for speed boost
                    const totalSpeedPercent = Math.round(gameState.currentSpeedIncreasePercent);
                    addNotification(gameState, `⚡ Speed Boost +${increasePercent}% (Total: ${totalSpeedPercent}%)`, 180, '#FF0000');
                } else if (projectile.data.effects === "freeze_time") {
                    // Apply freeze effect
                    gameState.freezeTimeActive = true;
                    gameState.freezeTimeTimer = projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration;
                    
                    // Add notification for freeze/shield effect
                    const freezeSeconds = Math.round((projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration) / 60);
                    addNotification(gameState, `❄️ All Items Frozen ${freezeSeconds}s`, 120, '#87CEEB');
                    
                    // Special case: Frost Nova damages player despite beneficial effect
                    if (projectile.data.id === "frost_nova" && projectile.data.damage > 0) {
                        // Check dodge first, then shield
                        if (shouldDodge()) {
                            // Player dodged the Frost Nova damage
                            showDodgeText(player.x + player.width/2, player.y);
                            trackDodge(projectile.data.damage); // Track HP saved from dodging Frost Nova
                            addNotification(gameState, `💨 Dodged Frost Nova!`, 120, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks the damage (only if dodge failed)
                            addNotification(gameState, `🛡️ Damage Blocked!`, 120, '#FFD700');
                        } else {
                            // Track damage for hybrid progression
                            trackActivity(gameState, 'damage', projectile.data.damage);
                            
                            gameState.health = Math.max(0, gameState.health - projectile.data.damage);
                            addNotification(gameState, `❄️ Frost Nova -${projectile.data.damage} HP`, 120, '#00BFFF');
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                        }
                    }
                    
                    createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    fireballs.splice(projectileIndex, 1);
                    return;
                } else if (projectile.data.effects === "shield") {
                    // Apply shield effect
                    gameState.shieldActive = true;
                    gameState.shieldTimer = projectile.shieldDuration || 300; // Default 5 seconds
                    
                    // Add notification for shield effect
                    const shieldSeconds = Math.round((projectile.shieldDuration || 300) / 60);
                    addNotification(gameState, `🛡️ Shield Active ${shieldSeconds}s`, 120, '#FFD700');
                    
                    // Don't damage player for beneficial projectiles
                    createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    fireballs.splice(projectileIndex, 1);
                    return;
                } else {
                    // Handle different types of harmful projectiles
                    if (projectile.data.effects === "damage_over_time") {
                        // Shadowbolt - damage over time effect
                        if (shouldDodge()) {
                            // Player dodged the shadowbolt
                            showDodgeText(player.x + player.width/2, player.y);
                            trackDodge(0); // Track dodge but no immediate HP saved (prevents DOT application)
                            addNotification(gameState, `💨 Dodged Shadowbolt!`, 120, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks shadowbolt application (only if dodge failed)
                            addNotification(gameState, `🛡️ Shadow Effect Blocked!`, 120, '#FFD700');
                        } else {
                            // Add a new shadowbolt DOT using projectile data
                            if (!gameState.shadowboltDots) {
                                gameState.shadowboltDots = [];
                            }
                            gameState.shadowboltDots.push({
                                remainingDuration: projectile.data.dotDuration || 300, // Use data or fallback to 5 seconds
                                appliedAt: Date.now()
                            });
                            
                            // Reset timer to start ticking immediately if this is the first DOT
                            if (gameState.shadowboltDots.length === 1) {
                                gameState.shadowboltTimer = gameState.shadowboltTickRate;
                            }
                            
                            // Show shadowbolt application notification
                            addNotification(gameState, `🌑 Shadowbolt Applied! (${gameState.shadowboltDots.length} stacks)`, 120, '#4B0082');
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                        }
                        
                        // Create dark shadow particles for shadowbolt
                        createShadowParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles);
                    } else {
                        // Regular harmful projectiles (fireball, frostbolt, etc.)
                        if (shouldDodge()) {
                            // Player dodged the projectile
                            showDodgeText(player.x + player.width/2, player.y);
                            const damage = projectile.data.damage || 5;
                            trackDodge(damage); // Track HP saved from dodging projectile
                            const dodgeMessage = `💨 Dodged ${projectile.data.name || 'Attack'}!`;
                            addNotification(gameState, dodgeMessage, 120, '#00FF00');
                            
                            // Create dodge particles for visual feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#00FF00');
                        } else if (gameState.shieldActive) {
                            // Shield blocks the damage (only if dodge failed)
                            addNotification(gameState, `🛡️ Damage Blocked!`, 120, '#FFD700');
                            
                            // Still create particles and play sound for feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#FFD700');
                        } else {
                            // Apply immediate damage for harmful projectiles
                            const damage = projectile.data.damage || 5;
                            
                            // Track damage for hybrid progression
                            trackActivity(gameState, 'damage', damage);
                            
                            gameState.health = Math.max(0, gameState.health - damage);
                            
                            // Add damage notification
                            let damageIcon = '💥';
                            let damageColor = '#FF4500';
                            if (projectile.data.id === 'frostbolt') {
                                damageIcon = '❄️';
                                damageColor = '#00BFFF';
                            }
                            addNotification(gameState, `${damageIcon} ${projectile.data.name || 'Damage'} -${damage} HP`, 120, damageColor);
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                            
                            // Create menacing impact particles for harmful projectiles
                            createImpactParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, projectile.data);
                        }
                    }
                }
            }
            
            // Play impact sound
            if (projectile.playImpactSound) {
                projectile.playImpactSound();
            }
            
            // For beneficial projectiles, still use gentle collection particles
            if (projectile.data && (projectile.data.effects === "speed_increase" || projectile.data.effects === "freeze_time" || projectile.data.effects === "shield")) {
                const particleColor = projectile.data.color || '#FFD700';
                createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, particleColor);
            }
            
            // Remove projectile
            fireballs.splice(projectileIndex, 1);
        }
    });
    
    // Check power-up collisions
    powerUps.forEach((powerUp, powerUpIndex) => {
        if (powerUp.checkCollision && powerUp.checkCollision(player)) {
            // Track activity for hybrid progression
            trackActivity(gameState, 'powerUp', 1);
            
            // Apply power-up effect
            if (powerUp.applyEffect) {
                powerUp.applyEffect(gameState, {
                    fallingItems: fallingItems,
                    powerUps: powerUps,
                    fireballs: fireballs
                });
            }
            
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, particles);
            powerUps.splice(powerUpIndex, 1);
        }
    });
    
    // Check arrow collisions (iterate backwards to safely remove items)
    for (let arrowIndex = window.arrows.length - 1; arrowIndex >= 0; arrowIndex--) {
        const arrow = window.arrows[arrowIndex];
        let arrowRemoved = false;
        
        // Check arrow vs falling items (collectibles)
        for (let itemIndex = fallingItems.length - 1; itemIndex >= 0 && !arrowRemoved; itemIndex--) {
            const item = fallingItems[itemIndex];
            if (arrow.checkCollision(item)) {
                // Collect the item with potential crit bonus from multishot
                if (item.itemData) {
                    item.itemData.collected++;
                    
                    // Trigger items list update
                    onItemCollected(item.itemData);
                    
                    // Apply spell point multipliers
                    const pointMultiplier = spellSystem.getPointMultiplier();
                    const basePoints = item.itemData.value;
                    let finalPoints = Math.round(basePoints * pointMultiplier);
                    
                    // Check for critical hit (include spell crit rating bonus and current multishot bonus if active)
                    const critRoll = Math.random();
                    const spellCritBonus = spellSystem.getCritRatingBonus();
                    const arrowCritBonus = arrow.critBonus || 0; // Multishot arrows have +5% crit
                    const totalCritRating = Math.min(gameState.critRating + spellCritBonus + arrowCritBonus, gameState.critRatingCap);
                    const isCrit = critRoll < totalCritRating;
                    
                    if (isCrit) {
                        finalPoints = Math.round(finalPoints * gameState.critMultiplier);
                        
                        // Create crit combat text
                        const critText = new CombatText(
                            item.x + item.width/2, 
                            item.y + item.height/2,
                            `+${finalPoints} CRIT!`,
                            '#FF6B00', // Orange crit color
                            true // is crit
                        );
                        combatTexts.push(critText);
                    } else {
                        // Create normal combat text for non-crit
                        const normalText = new CombatText(
                            item.x + item.width/2, 
                            item.y + item.height/2,
                            `+${finalPoints}`,
                            '#FFD700', // Gold normal color
                            false // not crit
                        );
                        combatTexts.push(normalText);
                    }
                    
                    gameState.score += finalPoints;
                    gameState.perfectCollections++;
                    
                    // Track activity for hybrid progression
                    trackActivity(gameState, 'collection', 1);
                    
                    // Create collection particles
                    createCollectionParticles(item.x + item.width/2, item.y + item.height/2, particles);
                    
                    // Handle special item effects (Thunderfury, tier sets, etc.)
                    if (item.itemData.id === "ThunderFury") {
                        triggerThunderfuryEffect(item.x + item.width/2, item.y + item.height/2);
                    }
                    
                    // Apply configurable stat bonuses (crit rating, dodge rating)
                    applyItemStatBonuses(item.itemData);
                    
                    // Handle tier set items
                    if (item.itemData.type === "tier_set") {
                        playDragonstalkerSound();
                        
                        // Only increment if this is the first time collecting this specific piece
                        if (item.itemData.collected === 1) {
                            gameState.tierSetCollected++;
                        }
                        
                        // Check if this is an Ashkandi item for special celebration
                        if (item.itemData.id === "ashjrethul" || item.itemData.id === "ashkandi2") {
                            if (player.onAshkandiCollected) {
                                player.onAshkandiCollected();
                            }
                        } else {
                            if (player.onTierSetCollected) {
                                player.onTierSetCollected();
                            }
                        }
                        
                        // Add notification for tier set collection
                        const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
                        const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
                        addNotification(gameState, `🏹 ${item.itemData.name} (${uniquePiecesCollected}/10)`, 240, '#FFD700');
                        
                        // Check if Dragonstalker set is complete
                        const setCompleted = checkDragonstalkerCompletion(gameState, gameItems);
                        if (setCompleted) {
                            playTotalSound();
                        }
                    } else {
                        playItemSound(item.itemData);
                    }
                }
                
                // Create arrow impact particles
                arrow.createImpactParticles(particles);
                
                // Remove both arrow and item
                fallingItems.splice(itemIndex, 1);
                window.arrows.splice(arrowIndex, 1);
                arrowRemoved = true; // Mark arrow as removed
                break; // Exit item loop
            }
        }
        
        // Only check other collisions if arrow still exists
        if (!arrowRemoved && window.arrows[arrowIndex]) {
            // Check arrow vs projectiles (destroy them)
            for (let projectileIndex = fireballs.length - 1; projectileIndex >= 0 && !arrowRemoved; projectileIndex--) {
                const projectile = fireballs[projectileIndex];
                if (arrow.checkCollision(projectile)) {
                    // Create impact particles for destroyed projectile
                    arrow.createImpactParticles(particles);
                    createImpactParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, projectile.data);
                    
                    // If it's a beneficial projectile, apply its effect
                    if (projectile.data && (projectile.data.effects === "speed_increase" || projectile.data.effects === "freeze_time" || projectile.data.effects === "shield")) {
                        // Apply beneficial projectile effects
                        if (projectile.data.effects === "speed_increase") {
                            const increasePercent = projectile.speedIncreasePercent || 20;
                            gameState.speedIncreaseActive = true;
                            gameState.speedIncreaseTimer = 600; // 10 seconds
                            gameState.currentSpeedIncreasePercent += increasePercent;
                            gameState.speedIncreaseMultiplier = 1 + (gameState.currentSpeedIncreasePercent / 100);
                            
                            // Cap at 100%
                            if (gameState.currentSpeedIncreasePercent > 100) {
                                gameState.currentSpeedIncreasePercent = 100;
                                gameState.speedIncreaseMultiplier = 2.0;
                            }
                            
                            addNotification(gameState, `🏹⚡ Arrow Speed Boost +${increasePercent}%`, 180, '#FFD700');
                        } else if (projectile.data.effects === "freeze_time") {
                            gameState.freezeTimeActive = true;
                            gameState.freezeTimeTimer = 600; // 10 seconds
                            
                            addNotification(gameState, `🏹❄️ Arrow Freeze All Items!`, 180, '#87CEEB');
                        } else if (projectile.data.effects === "shield") {
                            gameState.shieldActive = true;
                            gameState.shieldTimer = 600; // 10 seconds
                            
                            addNotification(gameState, `🏹🛡️ Arrow Shield!`, 180, '#FFD700');
                        }
                    } else {
                        // Add notification for destroying harmful projectile
                        addNotification(gameState, `🏹💥 Projectile Destroyed!`, 120, '#FFD700');
                    }
                    
                    // Remove both arrow and projectile
                    fireballs.splice(projectileIndex, 1);
                    window.arrows.splice(arrowIndex, 1);
                    arrowRemoved = true; // Mark arrow as removed
                    break; // Exit projectile loop
                }
            }
        }
    }
}
