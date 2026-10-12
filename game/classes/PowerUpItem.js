import { addArrows } from '../utils/quiver.js';
import { gameConfig } from '../config/gameConfig.js';
import { addNotification, calculateFallAngle, getLogicalCanvasWidth, responsiveScaler } from '../utils/gameUtils.js';
import { assetManager } from '../utils/AssetManager.js';
import { FallingObject } from './FallingObject.js';
import { playSoundEffect } from '../systems/audioSystem.js';
import { drawAura, drawImageGlow } from '../utils/glow.js';
import { getSprite } from '../utils/spriteCache.js';

const REVERSE_GRAVITY = {
    angleRange: 65,          // Maximum deviation from straight up, in degrees
    speedFactor: 0.4,        // Slowed to 40% to give players more time to collect power-ups
    bounceRestitution: 0.8   // Speed kept when bouncing off the top and sides
};
const WALL_RESTITUTION = 0.8; // Power-ups retain more energy than items when bouncing off the side walls

function isPotionPowerUp(powerUpData) {
    return powerUpData.id === 'health_potion' || powerUpData.id === 'mana_potion';
}

// Every power-up is the same size (see items.powerUpSize in gameConfig)
function calculatePowerUpSize() {
    const size = responsiveScaler.getSize('item', 'powerUp') * gameConfig.items.powerUpSize;

    return responsiveScaler.capToPlayer(size);
}

export class PowerUpItem extends FallingObject {
    constructor(powerUpData, isValidYPosition, recentDropYPositions, gameState) {
        super();
        this.data = powerUpData;
        
        // Get resolution scale for consistent speed across resolutions
        const resolutionScale = gameState.universalMultiplier?.resolution || { average: 1 };
        
        // Use responsive scaling for power-up items with size multiplier
        const powerUpSize = calculatePowerUpSize(this.data);
        this.width = powerUpSize;
        this.height = powerUpSize;
        
        // Spawn anywhere across the full width of the canvas
        const canvasWidth = gameState.canvasWidth || window.innerWidth;
        this.x = Math.random() * Math.max(0, canvasWidth - this.width);
        this.y = this.findSpawnY(-120, isValidYPosition, recentDropYPositions);
        
        // Slower speed for power-ups (easier to collect)
        const speedVariation = 0.6 + Math.random() * 0.8; // Slower than regular items
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        
        // Apply resolution scaling to base speed for consistent gameplay across resolutions
        const baseSpeed = gameState.baseDropSpeed * effectiveLevelMultiplier * speedVariation * (gameState.universalMultiplier?.itemFallSpeed ?? resolutionScale.average);
        this.baseSpeed = baseSpeed; // Store base speed for recalculation when speed boosts are applied
        this.speed = baseSpeed * gameState.speedIncreaseMultiplier;
        
        // Add angle variation using dynamic fall angle system
        this.fallAngle = calculateFallAngle(gameState); // Use dynamic fall angle calculation
        this.horizontalSpeed = Math.sin(this.fallAngle) * this.speed * gameState.horizontalSpeedReduction; // Horizontal component (dynamic reduction)
        
        // Visual effects
        this.rotation = 0;
        this.rotationSpeed = 0.04; // Reduced from 0.08 to 0.04
        this.glowAnimation = 0;
        this.pulseAnimation = 0;
        
        // Get image from AssetManager
        this.powerUpImage = assetManager.getImage(powerUpData.image);
    }

    update(gameState, deltaTimeMultiplier, canvas) {
        const effectiveDelta = gameState.timeSlowMultiplier * deltaTimeMultiplier;
        const canvasWidth = getLogicalCanvasWidth(canvas);
        
        this.applyDriftPhysics(effectiveDelta, canvasWidth, WALL_RESTITUTION);
        
        if (this.applyGravity(effectiveDelta, canvasWidth, gameState, REVERSE_GRAVITY)) {
            // Reverse gravity just ended for this power-up - pick a fresh downward drift
            this.resetFallDirection(gameState);
        }
        
        this.x += this.horizontalSpeed * effectiveDelta;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.glowAnimation += 0.15 * deltaTimeMultiplier;
        this.pulseAnimation += 0.1 * deltaTimeMultiplier;
        
        if (this.hasLeftScreen(canvas, gameState)) {
            this.missed = true;
            return false;
        }
        
        return true;
    }

    draw(ctx) {
        ctx.save();
        
        // Enhanced image quality settings for power-ups
        if (gameConfig.items.imageQuality.smoothing) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = gameConfig.items.imageQuality.quality;
        } else {
            ctx.imageSmoothingEnabled = false;
        }
        
        // Apply sharp scaling for pixel art if enabled
        if (gameConfig.items.imageQuality.sharpScaling) {
            ctx.imageSmoothingEnabled = false;
        }
        
        // Glow effect
        const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
        const glowBlur = 30 * glow;
        
        // Pulse effect
        const pulse = Math.sin(this.pulseAnimation) * 0.1 + 1.0;
        
        // Calculate high-DPI adjusted size with AssetManager constraints
        let baseWidth = this.width;  // Use the responsive width we calculated
        let baseHeight = gameConfig.visuals.forceItemAspectRatio ? this.width : this.height;
        
        // Apply conservative high-DPI scaling if enabled (focused on quality, not size)
        if (gameConfig.items.highDPI.enabled) {
            // Only apply very conservative scaling if explicitly enabled
            if (gameConfig.items.sizing.scaleWithDPI) {
                const dpr = window.devicePixelRatio || 1;
                const conservativeScale = Math.min(dpr * gameConfig.items.highDPI.multiplier, 2.0); // Conservative cap at 2x
                baseWidth *= conservativeScale;
                baseHeight *= conservativeScale;
            }
            
            // Only enforce minimum size if explicitly enabled
            if (gameConfig.items.sizing.respectMinimumSize) {
                const minPixelSize = gameConfig.items.highDPI.minPixelSize;
                baseWidth = Math.max(baseWidth, minPixelSize);
                baseHeight = Math.max(baseHeight, minPixelSize);
            }
            
            // Apply AssetManager scaling constraints to prevent quality degradation.
            // Potion assets need a readable mobile size even when their source images are small.
            const shouldApplyAssetConstraints = !(responsiveScaler.deviceType === 'mobile' && isPotionPowerUp(this.data));
            if (shouldApplyAssetConstraints && this.powerUpImage && this.data.image && window.assetManager) {
                const safeSize = window.assetManager.getMaxSafeSize(this.data.image, baseWidth, baseHeight);
                if (safeSize.wasConstrained) {
                    baseWidth = safeSize.width;
                    baseHeight = safeSize.height;
                    // Optional: Log when scaling is constrained
                    if (gameConfig.debug?.logScalingConstraints) {
                        console.log(`PowerUp ${this.data.name} scaling constrained: ${baseWidth}x${baseHeight} (max ${safeSize.maxScaleFactor}x)`);
                    }
                }
            }
        }
        
        const drawWidth = baseWidth * pulse;
        const drawHeight = baseHeight * pulse;
        
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Power-ups always help, so they sit on the "helpful" aura
        const aura = gameConfig.items.aura;
        if (aura.enabled) {
            const auraPulse = Math.sin(this.glowAnimation) * 0.15 + 0.85;
            drawAura(ctx, 0, 0, drawWidth * aura.radius, aura.helpfulColor, aura.opacity * auraPulse);
        }
        
        // Use the specific power-up image from AssetManager
        if (this.powerUpImage && this.powerUpImage.complete && this.powerUpImage.naturalWidth > 0) {
            // Pre-rendered at its resting size (trimmed, undistorted); the pulse just scales it
            const sprite = getSprite(ctx, this.powerUpImage, baseWidth, baseHeight);
            const spriteWidth = sprite.width * pulse;
            const spriteHeight = sprite.height * pulse;
            drawImageGlow(ctx, sprite.canvas, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight, this.data.color, glowBlur);
            ctx.drawImage(sprite.canvas, -spriteWidth / 2, -spriteHeight / 2, spriteWidth, spriteHeight);
        } else {
            // Draw placeholder based on power-up type with consistent size
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = glowBlur;
            ctx.fillStyle = this.data.color;
            ctx.beginPath();
            ctx.arc(0, 0, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Add plus symbol for healing items
            if (this.data.type === "heal") {
                if (this.data.id === "chicken_food") {
                    // Special chicken symbol for chicken food
                    ctx.fillStyle = 'white';
                    ctx.font = `${drawWidth/2}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText('🐔', 0, drawWidth/6);
                } else {
                    // Regular plus symbol for other healing items
                    ctx.fillStyle = 'white';
                    ctx.fillRect(-drawWidth/6, -drawWidth/3, drawWidth/3, drawWidth*2/3);
                    ctx.fillRect(-drawWidth/3, -drawWidth/6, drawWidth*2/3, drawWidth/3);
                }
            } else if (this.data.type === "utility") {
                // Add clock symbol for utility items
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.arc(0, 0, drawWidth/3, 0, Math.PI * 2);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(0, -drawWidth/4);
                ctx.moveTo(0, 0);
                ctx.lineTo(drawWidth/6, 0);
                ctx.stroke();
            }
        }
        
        ctx.restore();
        
        // Draw effect text for arrow powerups (outside of restore so text isn't affected by rotation)
        this.drawEffectText(ctx, drawWidth, drawHeight);
    }

    drawEffectText(ctx, drawWidth, drawHeight) {
        // Only draw text for arrow powerups
        if (this.data.effect === "arrow_ammo") {
            // Background for text readability
            const textX = this.x + this.width/2;
            const textY = this.y + this.height + 25; // Position below the powerup
            const textWidth = 50;
            const textHeight = 20;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Border around text background using powerup color
            ctx.strokeStyle = this.data.color;
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Text showing arrow count
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${this.data.value}`, textX, textY + 4);
        }
    }

    applyEffect(gameState, gameObjects = {}) {
        playSoundEffect(this.data.sound, { key: `powerup_${this.data.id || this.data.effect || 'generic'}` });
        
        this.applyEffectLogic(gameState, gameObjects);
    }
    
    applyEffectLogic(gameState, gameObjects = {}) {
        // Apply the effect based on type
        switch(this.data.effect) {
            case "slow_time":
                gameState.timeSlowActive = true;
                gameState.timeSlowTimer = this.data.duration;
                gameState.timeSlowMultiplier = this.data.value;
                
                // Add notification for time slow
                const slowPercent = Math.round((1 - this.data.value) * 100);
                const slowSeconds = Math.round(this.data.duration / 60);
                addNotification(gameState, `🔵 Time Slow ${slowPercent}% for ${slowSeconds}s`, 180, '#4169E1');
                break;
                
            case "heal":
                const oldHealth = gameState.health;
                gameState.health = Math.min(gameState.maxHealth, gameState.health + this.data.value);
                const actualHeal = gameState.health - oldHealth;
                
                // Add notification for healing
                addNotification(gameState, `💚 Healed +${actualHeal} HP`, 120, '#FF69B4');
                break;
                
            case "heal_over_time":
                // Add a new chicken food HOT effect (10 seconds = 600 frames at 60fps)
                if (!gameState.chickenFoodHots) {
                    gameState.chickenFoodHots = [];
                }
                gameState.chickenFoodHots.push({
                    remainingDuration: this.data.duration, // 600 frames = 10 seconds
                    healPerTick: this.data.value // 1 HP per second
                });
                
                // Reset timer to start healing immediately if this is the first HOT
                if (gameState.chickenFoodHots.length === 1) {
                    gameState.chickenFoodTimer = gameState.chickenFoodTickRate;
                }
                
                // Add notification for chicken food
                const hotSeconds = Math.round(this.data.duration / 60);
                addNotification(gameState, `🐔 Chicken Food Applied! (${gameState.chickenFoodHots.length} stacks)`, 120, '#FFD700');
                break;
                
            case "freeze_time":
                // Freeze all projectiles for the configured duration
                gameState.freezeTimeActive = true;
                gameState.freezeTimeTimer = gameConfig.powerUps.freezeTime.duration;
                
                // Add notification for freeze
                const freezeSeconds = Math.round(gameConfig.powerUps.freezeTime.duration / 60);
                addNotification(gameState, `❄️ All Items Frozen ${freezeSeconds}s`, 120, '#87CEEB');
                break;
                
            case "cut_time":
                // Permanently reduce game speed by reducing the level multiplier
                const reductionAmount = gameConfig.powerUps.cutTime.speedReduction;
                gameState.permanentSpeedReduction += reductionAmount; // Accumulate reduction amount
                
                // Cap the total reduction to prevent excessive slowdown
                gameState.permanentSpeedReduction = Math.min(3.0, gameState.permanentSpeedReduction);
                
                // Add notification for permanent speed reduction
                const reductionPercent = Math.round(reductionAmount * 100);
                addNotification(gameState, `⚗️ Speed Cut -${reductionPercent}% Permanent`, 240, '#8A2BE2');
                break;
                
            case "modify_horizontal_speed":
                // Store original value if this is the first modification
                if (!gameState.horizontalSpeedModActive) {
                    gameState.originalHorizontalSpeedReduction = gameState.horizontalSpeedReduction;
                }
                
                // Modify horizontal speed reduction parameter
                gameState.horizontalSpeedReduction = this.data.value;
                
                // Set up timer for temporary effects
                if (this.data.duration > 0) {
                    gameState.horizontalSpeedModActive = true;
                    gameState.horizontalSpeedModTimer = this.data.duration;
                }
                
                // Add notification for horizontal speed modification
                const anglePercent = Math.round(this.data.value * 100);
                const durationSeconds = Math.round(this.data.duration / 60);
                if (this.data.duration > 0) {
                    addNotification(gameState, `🎯 Trajectory Modified ${anglePercent}% for ${durationSeconds}s`, 180, '#00FFFF');
                } else {
                    addNotification(gameState, `🎯 Trajectory Modified ${anglePercent}% Permanent`, 240, '#00FFFF');
                }
                break;
                
            case "modify_fall_angle":
                // Store original values if this is the first modification
                if (!gameState.fallAngleModActive) {
                    gameState.originalFallAngleMin = gameState.fallAngleMin;
                    gameState.originalFallAngleMax = gameState.fallAngleMax;
                    gameState.originalAllowUpwardMovement = gameState.allowUpwardMovement;
                }
                
                // Modify fall angle parameters based on power-up data
                if (this.data.angleMin !== undefined) {
                    gameState.fallAngleMin = this.data.angleMin;
                }
                if (this.data.angleMax !== undefined) {
                    gameState.fallAngleMax = this.data.angleMax;
                }
                if (this.data.allowUpward !== undefined) {
                    gameState.allowUpwardMovement = this.data.allowUpward;
                }
                if (this.data.upwardMin !== undefined) {
                    gameState.upwardAngleMin = this.data.upwardMin;
                }
                if (this.data.upwardMax !== undefined) {
                    gameState.upwardAngleMax = this.data.upwardMax;
                }
                
                // Set up timer for temporary effects
                if (this.data.duration > 0) {
                    gameState.fallAngleModActive = true;
                    gameState.fallAngleModTimer = this.data.duration;
                }
                
                // Add notification for fall angle modification
                const fallAngleDurationSeconds = Math.round(this.data.duration / 60);
                if (this.data.duration > 0) {
                    addNotification(gameState, `📐 Fall Angles Modified for ${fallAngleDurationSeconds}s`, 180, '#FF6B35');
                } else {
                    addNotification(gameState, `📐 Fall Angles Modified Permanent`, 240, '#FF6B35');
                }
                break;
                
            case "reverse_gravity":
                // Clear invisible items (those still above the screen) to prevent sudden appearance
                if (gameObjects.fallingItems) {
                    const initialCount = gameObjects.fallingItems.length;
                    gameObjects.fallingItems = gameObjects.fallingItems.filter(item => item.y >= 0);
                    const removedCount = initialCount - gameObjects.fallingItems.length;
                    
                    if (removedCount > 0) {
                        console.log(`Reverse Gravity: Cleared ${removedCount} invisible items from queue`);
                    }
                    
                    // RESET ALL ITEMS to be eligible for reverse gravity (fixes stacking issue)
                    gameObjects.fallingItems.forEach(item => {
                        if (item.wasReversed === false) {
                            // Reset items that were previously bounced to be eligible again
                            item.wasReversed = undefined;
                            item.bouncedOffTopDuringReverse = false;
                        }
                    });
                }
                
                // Also clear invisible power-ups and reset their reverse gravity state
                if (gameObjects.powerUps) {
                    const initialPowerUpCount = gameObjects.powerUps.length;
                    gameObjects.powerUps = gameObjects.powerUps.filter(item => item.y >= 0);
                    const removedPowerUpCount = initialPowerUpCount - gameObjects.powerUps.length;
                    
                    if (removedPowerUpCount > 0) {
                        console.log(`Reverse Gravity: Cleared ${removedPowerUpCount} invisible power-ups from queue`);
                    }
                    
                    // RESET ALL POWER-UPS to be eligible for reverse gravity
                    gameObjects.powerUps.forEach(item => {
                        if (item.wasReversed === false) {
                            // Reset power-ups that were previously bounced to be eligible again
                            item.wasReversed = undefined;
                            item.bouncedOffTopDuringReverse = false;
                        }
                    });
                }
                
                // Also clear invisible projectiles (damage items) and reset their reverse gravity state
                if (gameObjects.fireballs) {
                    const initialProjectileCount = gameObjects.fireballs.length;
                    gameObjects.fireballs = gameObjects.fireballs.filter(item => item.y >= 0);
                    const removedProjectileCount = initialProjectileCount - gameObjects.fireballs.length;
                    
                    if (removedProjectileCount > 0) {
                        console.log(`Reverse Gravity: Cleared ${removedProjectileCount} invisible projectiles from queue`);
                    }
                    
                    // RESET ALL PROJECTILES to be eligible for reverse gravity
                    gameObjects.fireballs.forEach(projectile => {
                        if (projectile.wasReversed === false) {
                            // Reset projectiles that were previously bounced to be eligible again
                            projectile.wasReversed = undefined;
                            projectile.bouncedOffTopDuringReverse = false;
                        }
                    });
                }
                
                // Activate reverse gravity effect (extend timer if already active)
                const wasAlreadyActive = gameState.reverseGravityActive;
                gameState.reverseGravityActive = true;
                gameState.reverseGravityTimer = this.data.duration; // Reset timer to full duration
                
                // Add notification for reverse gravity
                const gravitySeconds = Math.round(this.data.duration / 60);
                if (wasAlreadyActive) {
                    addNotification(gameState, `🔄 Reverse Gravity Extended! (${gravitySeconds}s)`, 180, '#8B00FF');
                } else {
                    addNotification(gameState, `🔄 Reverse Gravity Activated! (${gravitySeconds}s)`, 180, '#8B00FF');
                }
                break;
                
            case "dodge_boost":
                // Apply temporary dodge rating boost
                gameState.temporaryDodgeBoost = (gameState.temporaryDodgeBoost || 0) + this.data.value;
                gameState.dodgeBoostTimer = this.data.duration;
                
                // Add notification for dodge boost
                const dodgeBoostPercent = Math.round(this.data.value * 100);
                const boostSeconds = Math.round(this.data.duration / 60);
                const totalTempDodgePercent = Math.round((gameState.temporaryDodgeBoost || 0) * 100);
                addNotification(gameState, `🐒💨 ASPECT OF THE MONKEY! +${dodgeBoostPercent}% Dodge (${boostSeconds}s)`, 300, '#00FF00');
                break;
                
            case "permanent_dodge":
                // Apply permanent dodge rating increase
                const oldDodgeRating = gameState.dodgeRating;
                gameState.dodgeRating = Math.min(gameState.dodgeRating + this.data.value, gameState.dodgeRatingCap);
                const actualDodgeIncrease = gameState.dodgeRating - oldDodgeRating;
                
                if (actualDodgeIncrease > 0) {
                    const dodgePercent = Math.round(actualDodgeIncrease * 100);
                    const newDodgePercent = Math.round(gameState.dodgeRating * 100);
                    addNotification(gameState, `💨 EVASION! Permanent +${dodgePercent}% Dodge (Now: ${newDodgePercent}%)`, 360, '#00FFFF');
                } else {
                    const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
                    addNotification(gameState, `💨 EVASION! Dodge Already Maxed (${maxDodgePercent}%)`, 240, '#00FFFF');
                }
                break;
                
            case "arrow_ammo":
                // Add arrows to the ammunition inventory
                // The quiver only holds so many: what does not fit is lost
                const quiver = addArrows(gameState.arrowCount || 0, this.data.value, gameState.quiverCapacity || Infinity);
                const arrowsToAdd = quiver.added;
                gameState.arrowCount = quiver.arrows;
                
                // Add notification for arrow collection with tier-specific names and emojis
                const arrowTier = this.data.id === 'bronze_arrows' ? 'BRONZE' : this.data.id === 'silver_arrows' ? 'SILVER' : 'THORIUM';
                const arrowNotification = quiver.lost > 0
                    ? `🏹 ${arrowTier} ARROWS! +${arrowsToAdd} arrows - quiver full (${gameState.arrowCount})`
                    : `🏹 ${arrowTier} ARROWS! +${arrowsToAdd} arrows (Total: ${gameState.arrowCount})`;
                addNotification(gameState, arrowNotification, 300, this.data.color);
                break;
        }
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize() {
        // Update size based on new scaling with size multiplier
        const powerUpSize = calculatePowerUpSize(this.data);
        this.width = powerUpSize;
        this.height = powerUpSize;
    }
} 