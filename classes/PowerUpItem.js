import { gameConfig } from '../config/gameConfig.js';
import { addNotification, checkBoundaryCollision, applyAdvancedBouncePhysics, calculateSpinEffect, applyAirResistance, calculateFallAngle } from '../utils/gameUtils.js';
import { assetManager } from '../utils/AssetManager.js';

export class PowerUpItem {
    constructor(powerUpData, isValidYPosition, recentDropYPositions, gameState) {
        this.data = powerUpData;
        this.x = Math.random() * (window.innerWidth - 120);
        
        // Find valid Y position with spacing
        let attemptY = -120;
        let attempts = 0;
        while (!isValidYPosition(attemptY, recentDropYPositions) && attempts < 10) {
            attemptY -= 100;
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        this.width = gameConfig.visuals.powerUpItemSize;
        this.height = gameConfig.visuals.powerUpItemSize;
        
        // Slower speed for power-ups (easier to collect)
        const speedVariation = 0.6 + Math.random() * 0.8; // Slower than regular items
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        const baseSpeed = gameState.baseDropSpeed * effectiveLevelMultiplier * speedVariation;
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
        
        // Performance optimization: Skip expensive physics for items far from edges
        const needsPhysics = this.x < 100 || this.x > canvas.width - 100 || Math.abs(this.horizontalSpeed) > 1;
        
        if (needsPhysics) {
            // Apply physics effects only when needed
            if (Math.abs(this.rotationSpeed) > 0.001) {
                calculateSpinEffect(this, effectiveDelta);
            }
            // Only apply air resistance if item has significant horizontal movement or high speed
            if (Math.abs(this.horizontalSpeed) > 0.5 || this.speed > 5) {
                applyAirResistance(this, effectiveDelta);
            }
            
            // Check for boundary collisions - detect when item is actually at or past boundaries
            const collisions = checkBoundaryCollision(this, canvas);
            
            // DEBUG: Log boundary info when close to top during reverse gravity
            if (gameState.reverseGravityActive && this.y <= 50) {
                console.log(`PowerUp near top: y=${this.y}, canvas.height=${canvas.height}, canvas.width=${canvas.width}, collisions=`, collisions);
            }
            
            if (collisions.left || collisions.right || collisions.top) {
                // Handle top bouncing during reverse gravity specially
                if (collisions.top && gameState.reverseGravityActive) {
                    // DEBUG: Log when hitting top during reverse gravity
                    console.log(`PowerUp hit top during reverse gravity: y=${this.y}, speed=${this.speed}, horizontalSpeed=${this.horizontalSpeed}, canvas dimensions: ${canvas.width}x${canvas.height}`);
                    
                    // When hitting top during reverse gravity, remove reverse gravity effect from this item
                    // and apply normal bounce physics
                    this.wasReversed = false; // Remove reverse gravity effect from this item
                    this.bouncedOffTopDuringReverse = false; // Clear any bounce flags
                    
                    // Reset to normal downward movement
                    this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                    this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                    
                    // Ensure positive (downward) speed
                    if (this.speed < 0) {
                        this.speed = Math.abs(this.speed);
                    }
                    
                    // Apply normal bounce physics for top collision
                    applyAdvancedBouncePhysics(this, collisions, canvas, {
                        restitution: 0.8,        // Power-ups retain more energy
                        friction: 0.95,          // Less friction for power-ups
                        spinTransfer: 0.03,      // Much less spin from collisions
                        spinDamping: 0.85,       // More aggressive spin loss
                        angularRestitution: 0.4, // Less spin retention
                        minBounceSpeed: 0.8      // Lower threshold for bouncing
                    });
                    
                    // DEBUG: Log after bounce
                    console.log(`PowerUp after bounce: y=${this.y}, speed=${this.speed}, horizontalSpeed=${this.horizontalSpeed}, wasReversed=${this.wasReversed}`);
                } else {
                    applyAdvancedBouncePhysics(this, collisions, canvas, {
                        restitution: 0.8,        // Power-ups retain more energy
                        friction: 0.95,          // Less friction for power-ups
                        spinTransfer: 0.03,      // Much less spin from collisions (was 0.15)
                        spinDamping: 0.85,       // More aggressive spin loss (was 0.97)
                        angularRestitution: 0.4, // Less spin retention (was 0.8)
                        minBounceSpeed: 0.8      // Lower threshold for bouncing
                    });
                }
            }
        }
        
        // Update position (always needed)
        // Apply reverse gravity effect if active 
        if (gameState.reverseGravityActive) {
            // Items that haven't been individually exempted get reverse gravity
            if (this.wasReversed !== false) {
                this.y -= this.speed * effectiveDelta; // Move upward instead of downward
                this.wasReversed = true; // Mark as affected by reverse gravity
                
                // MANUAL BOUNDARY CHECK: Prevent items from going past top boundary during reverse gravity
                if (this.y <= 0) {
                    console.log(`PowerUp manually detected past top boundary: y=${this.y}, forcing bounce...`);
                    this.y = 0; // Clamp to top boundary
                    
                    // Force bounce behavior - item should immediately start falling
                    this.wasReversed = false; // Remove reverse gravity effect from this item
                    this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                    this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                    this.speed = Math.abs(this.speed) * 0.8; // Bounce with energy loss
                    
                    console.log(`PowerUp manual bounce complete: y=${this.y}, speed=${this.speed}, wasReversed=${this.wasReversed}`);
                }
                
                // DEBUG: Log movement during reverse gravity
                if (this.y <= 10) { // Only log when close to top
                    console.log(`PowerUp moving upward: y=${this.y}, speed=${this.speed}, effectiveDelta=${effectiveDelta}`);
                }
            } else {
                // Item has bounced off top during this reverse gravity session - make it fall normally
                this.y += this.speed * effectiveDelta; // Normal downward movement
            }
        } else {
            // When reverse gravity is not active, reset all items to be eligible for future reverse gravity
            if (this.wasReversed === false) {
                // Reset previously bounced items to be eligible again
                this.wasReversed = undefined;
            }
            
            // If reverse gravity just ended and this item was reversed, reset its movement
            if (this.wasReversed) {
                this.wasReversed = false;
                this.bouncedOffTopDuringReverse = false; // Reset bounce flag
                // Reset to normal downward movement - ensure angles are downward
                this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                
                // Ensure the power-up is moving downward by forcing positive vertical speed
                // This fixes power-ups that might have upward momentum from bouncing during reverse gravity
                if (this.speed < 0) {
                    this.speed = Math.abs(this.speed);
                }
            }
            this.y += this.speed * effectiveDelta; // Normal downward movement
        }
        this.x += this.horizontalSpeed * effectiveDelta;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.glowAnimation += 0.15 * deltaTimeMultiplier;
        this.pulseAnimation += 0.1 * deltaTimeMultiplier;
        
        // Only remove items that go off the bottom during normal gravity
        if (!gameState.reverseGravityActive && this.y > canvas.height + this.height) {
            this.missed = true;
            return false;
        }
        
        // During reverse gravity, items should NEVER disappear off the top - they should bounce back!
        return true;
    }

    draw(ctx) {
        ctx.save();
        
        // Glow effect
        const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
        ctx.shadowColor = this.data.color;
        ctx.shadowBlur = 30 * glow;
        
        // Pulse effect
        const pulse = Math.sin(this.pulseAnimation) * 0.1 + 1.0;
        
        // Force consistent size regardless of source image dimensions
        const baseWidth = gameConfig.visuals.powerUpItemSize;
        const baseHeight = gameConfig.visuals.forceItemAspectRatio ? gameConfig.visuals.powerUpItemSize : this.height;
        const drawWidth = baseWidth * pulse;
        const drawHeight = baseHeight * pulse;
        
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the specific power-up image if loaded, otherwise use placeholder
        if (this.powerUpImage && this.powerUpImage.complete && this.powerUpImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.powerUpImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on power-up type with consistent size
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
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
    
    applyEffect(audioInitialized, audioState, volumeSettings, gameState, gameObjects = {}) {
        if (audioState.isMuted) {
            // Still apply the effect even if audio is muted, just skip the sound
            this.applyEffectLogic(gameState, gameObjects);
            return;
        }
        
        // Play power-up sound
        if (this.data.sound) {
            const powerUpAudio = new Audio(this.data.sound);
            powerUpAudio.volume = volumeSettings.effects;
            powerUpAudio.play().catch(e => console.log(`Power-up sound ${this.data.sound} not available`));
        }
        
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
                addNotification(gameState, `❄️ Projectiles Frozen ${freezeSeconds}s`, 120, '#87CEEB');
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
                }
                
                // Also clear invisible power-ups
                if (gameObjects.powerUps) {
                    const initialPowerUpCount = gameObjects.powerUps.length;
                    gameObjects.powerUps = gameObjects.powerUps.filter(item => item.y >= 0);
                    const removedPowerUpCount = initialPowerUpCount - gameObjects.powerUps.length;
                    
                    if (removedPowerUpCount > 0) {
                        console.log(`Reverse Gravity: Cleared ${removedPowerUpCount} invisible power-ups from queue`);
                    }
                }
                
                // Also clear invisible projectiles (damage items)
                if (gameObjects.fireballs) {
                    const initialProjectileCount = gameObjects.fireballs.length;
                    gameObjects.fireballs = gameObjects.fireballs.filter(item => item.y >= 0);
                    const removedProjectileCount = initialProjectileCount - gameObjects.fireballs.length;
                    
                    if (removedProjectileCount > 0) {
                        console.log(`Reverse Gravity: Cleared ${removedProjectileCount} invisible projectiles from queue`);
                    }
                }
                
                // Activate reverse gravity effect for remaining visible items
                gameState.reverseGravityActive = true;
                gameState.reverseGravityTimer = this.data.duration;
                
                // Add notification for reverse gravity
                const reverseGravitySeconds = Math.round(this.data.duration / 60);
                addNotification(gameState, `🔄 Reverse Gravity for ${reverseGravitySeconds}s`, 180, '#8B00FF');
                break;
        }
    }
} 