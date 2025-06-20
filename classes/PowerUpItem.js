import { gameConfig } from '../config/gameConfig.js';
import { addNotification, checkBoundaryCollision, applyAdvancedBouncePhysics, calculateSpinEffect, applyAirResistance } from '../utils/gameUtils.js';
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
        const effectiveLevelMultiplier = Math.max(0.2, gameState.speedMultiplier - gameState.permanentSpeedReduction);
        this.speed = gameState.baseDropSpeed * effectiveLevelMultiplier * gameState.speedIncreaseMultiplier * speedVariation;
        
        // Add angle variation for more natural falling (up to 45 degrees)
        const angleVariation = (Math.random() - 0.5) * 90; // -45 to +45 degrees
        this.fallAngle = angleVariation * (Math.PI / 180); // Convert to radians
        this.horizontalSpeed = Math.sin(this.fallAngle) * this.speed * 0.3; // Horizontal component (reduced for subtlety)
        
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
            if (collisions.left || collisions.right || collisions.top) {
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
        
        // Update position (always needed)
        this.y += this.speed * effectiveDelta;
        this.x += this.horizontalSpeed * effectiveDelta;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.glowAnimation += 0.15 * deltaTimeMultiplier;
        this.pulseAnimation += 0.1 * deltaTimeMultiplier;
        
        if (this.y > canvas.height + this.height) {
            this.missed = true;
            return false;
        }
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
    
    applyEffect(audioInitialized, audioState, volumeSettings, gameState) {
        if (audioState.isMuted) {
            // Still apply the effect even if audio is muted, just skip the sound
            this.applyEffectLogic(gameState);
            return;
        }
        
        // Play power-up sound
        if (this.data.sound) {
            const powerUpAudio = new Audio(this.data.sound);
            powerUpAudio.volume = volumeSettings.effects;
            powerUpAudio.play().catch(e => console.log(`Power-up sound ${this.data.sound} not available`));
        }
        
        this.applyEffectLogic(gameState);
    }
    
    applyEffectLogic(gameState) {
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
        }
    }
} 