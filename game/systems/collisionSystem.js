import { gameConfig } from '../config/gameConfig.js';
import { addNotification, trackActivity, checkDragonstalkerCompletion } from '../utils/gameUtils.js';
import { createCollectionParticles, createImpactParticles, createShadowParticles } from '../utils/spawning.js';
import { Particle } from '../classes/Particle.js';
import { CombatText } from '../classes/CombatText.js';
import { isHarmfulProjectile } from '../data/damageProjectiles.js';
import { itemValueAtLevel } from '../utils/progression.js';
import { damageAfterArmor } from '../utils/stats.js';
import { raiseShield, shieldBlocks } from '../utils/shield.js';
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
            // A boss's loot is already his: left to be caught
            if (otherItem.shownOnly) return true;
            if (otherItem.itemData) {
                // Create lightning bolt effect from Thunderfury to each item
                createLightningEffect(thunderfuryX, thunderfuryY, otherItem.x + otherItem.width/2, otherItem.y + otherItem.height/2);
                
                // Collect the item
                otherItem.itemData.collected++;
                
                // Trigger items list update
                onItemCollected(otherItem.itemData, otherItem);
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                // Items are worth more at higher levels; the same amount counts as experience
                const basePoints = itemValueAtLevel(otherItem.itemData.value, gameState.currentLevel + 1, gameConfig.progression);
                gameState.xp = (gameState.xp || 0) + basePoints;
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
        // Caught by the hunter, or fetched by his pet: either way it counts the same
        const fetched = Boolean(player.pet) && player.pet.catches(item, player, gameConfig.pet);
        if (fetched || (item.checkCollision && item.checkCollision(player))) {
            // A boss's loot, already his: caught, it is only seen to be (game-modular.js, popBossLoot)
            if (item.shownOnly) {
                combatTexts.push(new CombatText(item.x + item.width / 2, item.y, item.itemData.name, '#FF8000', true));
                createCollectionParticles(item.x + item.width / 2, item.y + item.height / 2, particles, '#FF8000');
                playDragonstalkerSound();
                fallingItems.splice(itemIndex, 1);
                return;
            }
            // Update item data and score
            if (item.itemData) {
                item.itemData.collected++;
                
                // Trigger items list update
                onItemCollected(item.itemData, item);
                
                // Apply spell point multipliers
                const pointMultiplier = spellSystem.getPointMultiplier();
                // Items are worth more at higher levels; the same amount counts as experience
                const basePoints = itemValueAtLevel(item.itemData.value, gameState.currentLevel + 1, gameConfig.progression);
                gameState.xp = (gameState.xp || 0) + basePoints;
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
                
                // A piece of a hunter set, or one of the hunter's two weapons: its own sound and
                // a celebration. The piece counts towards its set from now on (see onItemCollected
                // in game-modular.js, which also says how many of the set are owned).
                const isWeapon = item.itemData.id === "ashjrethul" || item.itemData.id === "ashkandi2";
                if (item.itemData.type === "set_piece" || isWeapon) {
                    playDragonstalkerSound();
                    
                    if (isWeapon) {
                        if (player.onAshkandiCollected) player.onAshkandiCollected();
                    } else if (player.onTierSetCollected) {
                        player.onTierSetCollected();
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
                    // Haste: the hunter moves and shoots faster for a while (a second one starts
                    // the time again); nothing else in the game speeds up
                    gameState.hasteTimer = gameConfig.powerUps.haste.duration;
                    addNotification(gameState, `⚡ Haste: he moves and shoots faster for ${Math.round(gameConfig.powerUps.haste.duration / 60)}s`, 180, '#FF6B35');
                } else if (projectile.data.effects === "freeze_time") {
                    // Apply freeze effect
                    gameState.freezeTimeActive = true;
                    gameState.freezeTimeTimer = projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration;
                    
                    // Add notification for freeze/shield effect
                    const freezeSeconds = Math.round((projectile.freezeDuration || gameConfig.powerUps.freezeTime.duration) / 60);
                    addNotification(gameState, `❄️ Harmful projectiles frozen ${freezeSeconds}s`, 120, '#87CEEB');
                    
                    // Special case: Frost Nova damages player despite beneficial effect
                    if (projectile.data.id === "frost_nova" && projectile.data.damage > 0) {
                        // Check dodge first, then shield
                        if (shouldDodge()) {
                            // Player dodged the Frost Nova damage
                            showDodgeText(player.x + player.width/2, player.y);
                            trackDodge(projectile.data.damage); // Track HP saved from dodging Frost Nova
                        } else if (shieldBlocks(gameState)) {
                            // Shield blocks the damage (only if dodge failed)
                            combatTexts.push(new CombatText(player.x + player.width/2, player.y, 'BLOCKED', '#FFD700', false));
                        } else {
                            // Track damage for hybrid progression
                            // His armor takes its share off the hit (utils/stats.js)
                            const taken = damageAfterArmor(projectile.data.damage, gameState.armor || 0, gameConfig.stats);
                            trackActivity(gameState, 'damage', taken);
                            
                            gameState.health = Math.max(0, gameState.health - taken);
                            combatTexts.push(new CombatText(player.x + player.width/2, player.y, `-${taken}`, '#00BFFF', false));
                            
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
                    // The shield goes up: for its time, or until its charges are spent
                    const charges = gameConfig.powerUps.shield.charges;
                    raiseShield(gameState, projectile.shieldDuration || 300, charges);
                    
                    const shieldSeconds = Math.round((projectile.shieldDuration || 300) / 60);
                    addNotification(gameState, `🛡️ Shield: ${charges} hits or ${shieldSeconds}s`, 120, '#FFD700');
                    
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
                        } else if (shieldBlocks(gameState)) {
                            // Shield blocks shadowbolt application (only if dodge failed)
                            combatTexts.push(new CombatText(player.x + player.width/2, player.y, 'BLOCKED', '#FFD700', false));
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
                        // Regular harmful projectiles (fireball, frostbolt, etc.). What a boss
                        // throws in a fight is a little harder to dodge (see utils/combat.js).
                        if (shouldDodge(projectile.data.attackerLevel)) {
                            // Player dodged the projectile
                            showDodgeText(player.x + player.width/2, player.y);
                            const damage = projectile.data.damage || 5;
                            trackDodge(damage); // Track HP saved from dodging projectile
                            
                            // Create dodge particles for visual feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#00FF00');
                        } else if (shieldBlocks(gameState)) {
                            // Shield blocks the damage (only if dodge failed)
                            combatTexts.push(new CombatText(player.x + player.width/2, player.y, 'BLOCKED', '#FFD700', false));
                            
                            // Still create particles and play sound for feedback
                            createCollectionParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, '#FFD700');
                        } else {
                            // Apply immediate damage for harmful projectiles: his armor takes its
                            // share off the hit (utils/stats.js)
                            const damage = damageAfterArmor(projectile.data.damage || 5, gameState.armor || 0, gameConfig.stats);
                            
                            // Track damage for hybrid progression
                            trackActivity(gameState, 'damage', damage);
                            
                            gameState.health = Math.max(0, gameState.health - damage);
                            
                            // Float the damage taken above the player
                            const damageColor = projectile.data.id === 'frostbolt' ? '#00BFFF' : '#FF4500';
                            combatTexts.push(new CombatText(player.x + player.width/2, player.y, `-${damage}`, damageColor, false));
                            
                            // Trigger player impact reaction
                            if (player.onHit) {
                                player.onHit();
                            }
                            
                            // Some attacks leave something behind (a boss's curse)
                            if (projectile.onPlayerHit) {
                                projectile.onPlayerHit();
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
        // One that could not be used falls on through him
        if (powerUp.refused) return;
        if (powerUp.checkCollision && powerUp.checkCollision(player)) {
            // Track activity for hybrid progression
            trackActivity(gameState, 'powerUp', 1);
            
            // Apply power-up effect
            if (powerUp.applyEffect) {
                const taken = powerUp.applyEffect(gameState, {
                    fallingItems: fallingItems,
                    powerUps: powerUps,
                    fireballs: fireballs
                });
                if (taken === false) {
                    powerUp.refused = true;
                    addNotification(gameState, 'No room for more Frost Traps yet', 150, '#BFE8FF');
                    return;
                }
            }
            
            createCollectionParticles(powerUp.x + powerUp.width/2, powerUp.y + powerUp.height/2, particles);
            powerUps.splice(powerUpIndex, 1);
        }
    });
    
    // Check arrow collisions (iterate backwards to safely remove arrows).
    // Arrows only shoot down harmful projectiles. They fly straight through collectible items,
    // power-ups and beneficial projectiles, which still have to be caught by the player.
    for (let arrowIndex = window.arrows.length - 1; arrowIndex >= 0; arrowIndex--) {
        const arrow = window.arrows[arrowIndex];
        
        for (let projectileIndex = fireballs.length - 1; projectileIndex >= 0; projectileIndex--) {
            const projectile = fireballs[projectileIndex];
            if (!isHarmfulProjectile(projectile.data) || !arrow.checkCollision(projectile)) continue;
            
            // Create impact particles for destroyed projectile
            arrow.createImpactParticles(particles);
            createImpactParticles(projectile.x + projectile.width/2, projectile.y + projectile.height/2, particles, projectile.data);
            
            addNotification(gameState, `🏹💥 Projectile Destroyed!`, 120, '#FFD700');
            
            // The projectile is gone, and so is the arrow - unless it is an Arcane Shot, which
            // flies on through
            fireballs.splice(projectileIndex, 1);
            if (arrow.arcane) continue;
            window.arrows.splice(arrowIndex, 1);
            break;
        }
    }
}
