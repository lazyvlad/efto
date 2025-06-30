import { gameConfig } from '../config/gameConfig.js';
import { addNotification, checkBoundaryCollision, applyAdvancedBouncePhysics, calculateSpinEffect, applyAirResistance, calculateFallAngle, responsiveScaler } from '../utils/gameUtils.js';
import { assetManager } from '../utils/AssetManager.js';

export class PowerUpItem {
    constructor(powerUpData, isValidYPosition, recentDropYPositions, gameState) {
        this.data = powerUpData;
        
        // Get resolution scale for consistent sizing and positioning
        const resolutionScale = gameState.universalMultiplier?.resolution || { average: 1 };
        const margin = 120 * resolutionScale.average;
        // Use canvas width instead of window.innerWidth for consistency
        const canvasWidth = gameState.canvasWidth || window.innerWidth;
        this.x = Math.random() * (canvasWidth - margin);
        
        // Find valid Y position with spacing
        let attemptY = -120;
        let attempts = 0;
        while (!isValidYPosition(attemptY, recentDropYPositions) && attempts < 10) {
            attemptY -= 100;
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        // Use responsive scaling for power-up items with size multiplier
        const sizeMultiplier = this.data.size_multiplier || 1;
        const basePowerUpSize = responsiveScaler.getSize('item', 'powerUp');
        this.width = basePowerUpSize * sizeMultiplier;
        this.height = basePowerUpSize * sizeMultiplier;
        
        // Slower speed for power-ups (easier to collect)
        const speedVariation = 0.6 + Math.random() * 0.8; // Slower than regular items
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        
        // Apply resolution scaling to base speed for consistent gameplay across resolutions
        const baseSpeed = gameState.baseDropSpeed * effectiveLevelMultiplier * speedVariation * resolutionScale.average;
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
        
        // Get current canvas dimensions (supports portrait mode)
        const canvasWidth = canvas.logicalWidth || 
                           (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                            canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                            gameConfig.canvas.desktop.width);
        const canvasHeight = canvas.logicalHeight || 
                            (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.height :
                             canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.height :
                             gameConfig.canvas.desktop.height);
        
        // Performance optimization: Skip expensive physics for items far from edges
        const needsPhysics = this.x < 100 || this.x > canvasWidth - 100 || Math.abs(this.horizontalSpeed) > 1;
        
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
                console.log(`PowerUp near top: y=${this.y}, canvas.height=${canvasHeight}, canvas.width=${canvasWidth}, collisions=`, collisions);
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
                // First time being affected by reverse gravity - apply dramatic angle change
                if (this.wasReversed !== true) {
                    // REVERSE GRAVITY: Always move upward, but with dramatic angle variation
                    // Generate dramatic horizontal angles: up to 65 degrees from straight up
                    const dramaticAngleRange = 65; // Maximum deviation from straight up
                    const baseVerticalAngle = 270; // 270° = straight up in standard coordinates
                    
                    // Random angle within the dramatic range for horizontal variation
                    const angleDeviation = (Math.random() - 0.5) * 2 * dramaticAngleRange; // -65 to +65
                    this.reverseGravityAngle = baseVerticalAngle + angleDeviation; // 205° to 335°
                    
                    // Calculate movement vectors - ALWAYS upward with horizontal variation
                    const angleRad = this.reverseGravityAngle * Math.PI / 180;
                    this.reverseGravityVerticalSpeed = Math.sin(angleRad) * this.speed; // Upward movement
                    this.reverseGravityHorizontalSpeed = Math.cos(angleRad) * this.speed; // Horizontal variation
                    
                    // Ensure vertical speed is always negative (upward)
                    this.reverseGravityVerticalSpeed = -Math.abs(this.reverseGravityVerticalSpeed);
                    
                    // DECREASE speed to give players more time to collect items during reverse gravity
                    const speedReduction = 0.4; // Reduce speed to 40% (60% slower)
                    this.reverseGravityVerticalSpeed *= speedReduction;
                    this.reverseGravityHorizontalSpeed *= speedReduction;
                }
                
                // Apply dramatic movement with the calculated angles
                this.y += this.reverseGravityVerticalSpeed * effectiveDelta;
                this.x += this.reverseGravityHorizontalSpeed * effectiveDelta;
                this.wasReversed = true; // Mark as affected by reverse gravity
                
                // MANUAL BOUNDARY CHECK: Bounce off top boundary while preserving angle momentum
                if (this.y <= 0) {
                    this.y = 0; // Clamp to top boundary
                    
                    // PRESERVE THE ANGLE MOMENTUM - just flip vertical direction
                    // Keep the same horizontal speed and angle, but make vertical speed positive (downward)
                    this.reverseGravityVerticalSpeed = Math.abs(this.reverseGravityVerticalSpeed) * 0.8; // Bounce with slight energy loss
                    // Keep horizontal speed unchanged to maintain the dramatic angle
                    // this.reverseGravityHorizontalSpeed stays the same
                    // this.reverseGravityAngle stays the same
                    
                    // Mark that this item bounced off top but keep it affected by reverse gravity
                    this.bouncedOffTopDuringReverse = true;
                }
                
                // Handle horizontal screen boundaries during reverse gravity - BOUNCE instead of wrap
                if (this.x < 0) {
                    this.x = 0; // Clamp to left boundary
                    this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * 0.8; // Reverse and reduce speed
                        } else if (this.x > canvasWidth - this.width) {
            this.x = canvasWidth - this.width; // Clamp to right boundary
                    this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * 0.8; // Reverse and reduce speed
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
                
                // Clear reverse gravity movement vectors
                this.reverseGravityVerticalSpeed = 0;
                this.reverseGravityHorizontalSpeed = 0;
                this.reverseGravityAngle = 0;
                
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
        if (!gameState.reverseGravityActive && this.y > canvasHeight + this.height) {
            this.missed = true;
            return false;
        }
        
        // During reverse gravity, items should NEVER disappear off the top - they should bounce back!
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
        ctx.shadowColor = this.data.color;
        ctx.shadowBlur = 30 * glow;
        
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
            
            // Apply AssetManager scaling constraints to prevent quality degradation
            if (this.powerUpImage && this.data.image && window.assetManager) {
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
        
        // Use the specific power-up image from AssetManager
        if (this.powerUpImage && this.powerUpImage.complete && this.powerUpImage.naturalWidth > 0) {
            // Smooth rendering for rotating items to prevent visual tearing
            // Only use crisp rendering for non-rotating items
            const isRotating = Math.abs(this.rotationSpeed) > 0.001 || Math.abs(this.rotation) > 0.001;
            
            if (gameConfig.items.highDPI.crispRendering && !isRotating) {
                // Use pixel-perfect positioning only for stationary items
                const pixelPerfectX = Math.round(-drawWidth/2);
                const pixelPerfectY = Math.round(-drawHeight/2);
                const pixelPerfectWidth = Math.round(drawWidth);
                const pixelPerfectHeight = Math.round(drawHeight);
                ctx.drawImage(this.powerUpImage, pixelPerfectX, pixelPerfectY, pixelPerfectWidth, pixelPerfectHeight);
            } else {
                // Smooth rendering for rotating items or when crisp rendering is disabled
                ctx.drawImage(this.powerUpImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
            }
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
    
    applyEffect(gameState, gameObjects = {}) {
        // Play power-up sound using optimized audio system
        if (this.data.sound) {
            // Use AssetManager to get the audio asset (consistent with DamageProjectile)
            const powerUpAudio = assetManager.getAudio(this.data.sound);
            if (powerUpAudio && window.playAudioOptimized) {
                // Use optimized audio system - volume is handled internally by playAudioOptimized
                const soundKey = `powerup_${this.data.id || this.data.effect || 'generic'}`;
                window.playAudioOptimized(soundKey, powerUpAudio, { 
                    // Removed allowOverlap to prevent audio overlapping
                });
            } else if (powerUpAudio) {
                // Fallback to direct play if optimized function not available
                // Check if sound effects are enabled before playing
                const soundEffectsEnabled = window.gameSettings && typeof window.gameSettings.areSoundEffectsEnabled === 'function' ? window.gameSettings.areSoundEffectsEnabled() : true;
                
                if (soundEffectsEnabled) {
                    // Get volume from settings system - use effects volume
                    const volume = (window.gameSettings && typeof window.gameSettings.getEffectsVolumeDecimal === 'function') ? 
                        window.gameSettings.getEffectsVolumeDecimal() : 
                        (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function' ? window.gameSettings.getVolumeDecimal() : gameConfig.audio.volumes.effects);
                        
                    powerUpAudio.volume = volume;
                    powerUpAudio.currentTime = 0;
                    powerUpAudio.play().catch(e => console.log(`Power-up sound ${this.data.sound} not available`));
                } else {
                    console.log(`Power-up sound ${this.data.sound} blocked by settings (fallback)`);
                }
            }
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
                const arrowsToAdd = this.data.value;
                gameState.arrowCount = (gameState.arrowCount || 0) + arrowsToAdd;
                
                // Add notification for arrow collection
                addNotification(gameState, `🏹 THORIUM ARROWS! +${arrowsToAdd} arrows (Total: ${gameState.arrowCount})`, 300, '#FFD700');
                break;
        }
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize() {
        // Update size based on new scaling with size multiplier
        const sizeMultiplier = this.data.size_multiplier || 1;
        const basePowerUpSize = responsiveScaler.getSize('item', 'powerUp');
        this.width = basePowerUpSize * sizeMultiplier;
        this.height = basePowerUpSize * sizeMultiplier;
    }
} 