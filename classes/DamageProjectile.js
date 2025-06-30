import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { responsiveScaler } from '../utils/gameUtils.js';

// Gaussian random number generator (Box-Muller transform)
function gaussianRandom(mean = 0, stdDev = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while(v === 0) v = Math.random();
    let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return z * stdDev + mean;
}

export class DamageProjectile {
    constructor(projectileData, isValidYPosition, recentDropYPositions, gameState, canvas) {
        this.data = projectileData;
        
        // Use responsive scaling for projectiles with size multiplier (like PowerUpItem)
        const sizeMultiplier = projectileData.size_multiplier || 1;
        const baseProjectileSize = responsiveScaler.getSize('item', 'projectile');
        this.width = baseProjectileSize * sizeMultiplier;
        this.height = baseProjectileSize * sizeMultiplier;
        
        // Gaussian randomized horizontal position (centered with some spread)
        // Use logical width instead of physical canvas width (fixes high-DPI scaling issues)
        const canvasLogicalWidth = canvas.logicalWidth || 
                                  (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                                   canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                                   gameConfig.canvas.desktop.width);
        const centerX = canvasLogicalWidth / 2;
        const gaussianX = gaussianRandom(centerX, canvasLogicalWidth * 0.25);
        this.x = Math.max(0, Math.min(canvasLogicalWidth - this.width, gaussianX));
        
        // Find valid Y position with spacing
        let attemptY = -this.height;
        let attempts = 0;
        while (!isValidYPosition(attemptY, recentDropYPositions) && attempts < 10) {
            attemptY -= 100;
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        // Random speed variation based on projectile data
        const speedVariation = projectileData.speed.min + Math.random() * (projectileData.speed.max - projectileData.speed.min);
        
        // Use separate scaling for projectiles with higher base speed but maintained ratios
        const baseProjectileMultiplier = 1.5; // Start projectiles 50% faster than before
        const projectileSpeedMultiplier = Math.min((gameState.levelSpeedMultiplier * 0.6 + baseProjectileMultiplier), 15.6); // Cap at 15.6x total (60% of 26x), includes base boost
        const projectileSpeedIncrease = gameState.speedIncreaseActive ? 
            Math.min(gameState.speedIncreaseMultiplier * 0.5, 1.15) : 1.0; // Reduce speed boost impact to max 15%
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveProjectileMultiplier = Math.max(0.3, projectileSpeedMultiplier - gameState.permanentSpeedReduction);
        const baseSpeed = gameState.baseDropSpeed * effectiveProjectileMultiplier * speedVariation;
        this.baseSpeed = baseSpeed; // Store base speed for recalculation when speed boosts are applied
        this.speed = baseSpeed * projectileSpeedIncrease;
        
        // Visual effects
        this.glowAnimation = 0;
        this.pulseAnimation = 0;
        this.flickerAnimation = 0;
        
        // Speed boost specific properties
        if (this.data.effects === "speed_increase") {
            // Randomly select one of the speed increase options
            const options = this.data.speedIncreaseOptions;
            this.speedIncreasePercent = options[Math.floor(Math.random() * options.length)];
        }
        
        // Freeze time specific properties
        if (this.data.effects === "freeze_time") {
            // Randomly select one of the freeze duration options
            const options = this.data.freezeDurationOptions;
            this.freezeDuration = options[Math.floor(Math.random() * options.length)];
        }
        
        // Shield specific properties
        if (this.data.effects === "shield") {
            // Randomly select one of the shield duration options
            const options = this.data.shieldDurationOptions;
            this.shieldDuration = options[Math.floor(Math.random() * options.length)];
        }
        
        // Get image from AssetManager
        this.projectileImage = assetManager.getImage(projectileData.image);
    }

    update(deltaTimeMultiplier, canvas, gameState) {
        // Get logical width for boundary calculations
        const canvasLogicalWidth = canvas.logicalWidth || 
                                  (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                                   canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                                   gameConfig.canvas.desktop.width);
        
        // Apply reverse gravity effect if active 
        if (gameState.reverseGravityActive) {
            // Projectiles that haven't been individually exempted get reverse gravity
            if (this.wasReversed !== false) {
                // First time being affected by reverse gravity - apply dramatic angle change
                if (this.wasReversed !== true) {
                    // REVERSE GRAVITY: Always move upward, but with dramatic angle variation
                    // Generate dramatic horizontal angles: up to 45 degrees from straight up (less than items for projectile balance)
                    const dramaticAngleRange = 45; // Maximum deviation from straight up
                    const baseVerticalAngle = 270; // 270° = straight up in standard coordinates
                    
                    // Random angle within the dramatic range for horizontal variation
                    const angleDeviation = (Math.random() - 0.5) * 2 * dramaticAngleRange; // -45 to +45
                    this.reverseGravityAngle = baseVerticalAngle + angleDeviation; // 225° to 315°
                    
                    // Calculate movement vectors - ALWAYS upward with horizontal variation
                    const angleRad = this.reverseGravityAngle * Math.PI / 180;
                    this.reverseGravityVerticalSpeed = Math.sin(angleRad) * this.speed; // Upward movement
                    this.reverseGravityHorizontalSpeed = Math.cos(angleRad) * this.speed; // Horizontal variation
                    
                    // Ensure vertical speed is always negative (upward)
                    this.reverseGravityVerticalSpeed = -Math.abs(this.reverseGravityVerticalSpeed);
                    
                    // DECREASE speed to give players more time during reverse gravity (but less than items)
                    const speedReduction = 0.5; // Reduce speed to 50% (50% slower, faster than items for more challenge)
                    this.reverseGravityVerticalSpeed *= speedReduction;
                    this.reverseGravityHorizontalSpeed *= speedReduction;
                }
                
                // Apply dramatic movement with the calculated angles
                this.y += this.reverseGravityVerticalSpeed * deltaTimeMultiplier;
                this.x += this.reverseGravityHorizontalSpeed * deltaTimeMultiplier;
                this.wasReversed = true; // Mark as affected by reverse gravity
                
                // MANUAL BOUNDARY CHECK: Bounce off top boundary while preserving angle momentum
                if (this.y <= 0) {
                    this.y = 0; // Clamp to top boundary
                    
                    // PRESERVE THE ANGLE MOMENTUM - just flip vertical direction
                    // Keep the same horizontal speed and angle, but make vertical speed positive (downward)
                    this.reverseGravityVerticalSpeed = Math.abs(this.reverseGravityVerticalSpeed) * 0.7; // Bounce with more energy loss than items
                    // Keep horizontal speed unchanged to maintain the dramatic angle
                    // this.reverseGravityHorizontalSpeed stays the same
                    // this.reverseGravityAngle stays the same
                    
                    // Mark that this projectile bounced off top but keep it affected by reverse gravity
                    this.bouncedOffTopDuringReverse = true;
                }
                
                // Handle horizontal screen boundaries during reverse gravity - BOUNCE instead of wrap
                if (this.x < 0) {
                    this.x = 0; // Clamp to left boundary
                    this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * 0.7; // Reverse and reduce speed (more energy loss)
                } else if (this.x > canvasLogicalWidth - this.width) {
                    this.x = canvasLogicalWidth - this.width; // Clamp to right boundary
                    this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * 0.7; // Reverse and reduce speed (more energy loss)
                }
            } else {
                // Projectile has bounced off top during this reverse gravity session - make it fall normally
                this.y += this.speed * deltaTimeMultiplier; // Normal downward movement
            }
        } else {
            // When reverse gravity is not active, reset all projectiles to be eligible for future reverse gravity
            if (this.wasReversed === false) {
                // Reset previously bounced projectiles to be eligible again
                this.wasReversed = undefined;
            }
            
            // If reverse gravity just ended and this projectile was reversed, reset its movement
            if (this.wasReversed) {
                this.wasReversed = false;
                this.bouncedOffTopDuringReverse = false; // Reset bounce flag
                
                // Clear reverse gravity movement vectors
                this.reverseGravityVerticalSpeed = 0;
                this.reverseGravityHorizontalSpeed = 0;
                this.reverseGravityAngle = 0;
                
                // Ensure the projectile is moving downward by forcing positive vertical speed
                if (this.speed < 0) {
                    this.speed = Math.abs(this.speed);
                }
            }
            this.y += this.speed * deltaTimeMultiplier; // Normal downward movement
        }
        
        // Update horizontal position (always needed for both normal and reverse gravity)
        if (gameState.reverseGravityActive && this.wasReversed === true) {
            // Horizontal movement already handled above during reverse gravity
        } else {
            // No horizontal movement during normal gravity for projectiles
        }
        
        this.glowAnimation += 0.2 * deltaTimeMultiplier;
        this.pulseAnimation += 0.12 * deltaTimeMultiplier;
        this.flickerAnimation += 0.25 * deltaTimeMultiplier;
        
        // Only remove projectiles that go off the bottom during normal gravity
        if (!gameState.reverseGravityActive && this.y > canvas.height + this.height) {
            return false;
        }
        
        // During reverse gravity, projectiles should NEVER disappear off the top - they should bounce back!
        return true;
    }

    draw(ctx) {
        ctx.save();
        
        // Enhanced image quality settings for projectiles
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
        
        // Calculate pulsating effects based on projectile type
        let drawWidth = this.width;
        let drawHeight = this.height;
        let glowIntensity = 1.0;
        
        if (this.data.id === "fireball") {
            // Fireball: Subtle flickering like real fire with size variation (matched to frostbolt)
            const flicker = Math.sin(this.flickerAnimation * 3) * 0.04 + Math.sin(this.flickerAnimation * 7) * 0.02; // Multi-frequency flicker (subtle)
            const sizePulse = Math.sin(this.pulseAnimation * 2) * 0.04 + 1.0; // Size pulsing (matched to frostbolt)
            drawWidth *= (1.0 + flicker) * sizePulse;
            drawHeight *= (1.0 + flicker) * sizePulse;
            glowIntensity = Math.sin(this.glowAnimation * 4) * 0.6 + 0.8; // Intense glow variation
            
            ctx.shadowColor = '#FF4500';
            ctx.shadowBlur = 35 * glowIntensity;
        } else if (this.data.id === "frostbolt") {
            // Frostbolt: Crystalline shimmer with subtle pulsing
            const shimmer = Math.sin(this.pulseAnimation * 1.5) * 0.08 + 1.0; // Subtle shimmer
            const crystalPulse = Math.sin(this.glowAnimation * 2.5) * 0.3 + 0.7; // Crystal-like pulsing
            drawWidth *= shimmer;
            drawHeight *= shimmer;
            glowIntensity = crystalPulse;
            
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = 25 * glowIntensity;
        } else if (this.data.id === "shadowbolt") {
            // Shadowbolt: Dark corruption with wispy tendrils
            const corruption = Math.sin(this.pulseAnimation * 0.8) * 0.1 + Math.sin(this.flickerAnimation * 2) * 0.05; // Slow corruption pulse
            const darkPulse = Math.sin(this.glowAnimation * 1.2) * 0.4 + 0.6; // Dark energy pulsing
            drawWidth *= (1.0 + corruption);
            drawHeight *= (1.0 + corruption);
            glowIntensity = darkPulse;
            
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = 30 * glowIntensity;
        } else {
            // Default glow for other projectiles
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
            ctx.shadowColor = this.data.color || '#FFFFFF';
            ctx.shadowBlur = 20 * glow;
        }
        
        // Apply conservative high-DPI scaling if enabled (focused on quality, not size)
        if (gameConfig.items.highDPI.enabled) {
            // Only apply very conservative scaling if explicitly enabled
            if (gameConfig.items.sizing.scaleWithDPI) {
                const dpr = window.devicePixelRatio || 1;
                const conservativeScale = Math.min(dpr * gameConfig.items.highDPI.multiplier, 2.0); // Conservative cap at 2x
                drawWidth *= conservativeScale;
                drawHeight *= conservativeScale;
            }
            
            // Only enforce minimum size if explicitly enabled
            if (gameConfig.items.sizing.respectMinimumSize) {
                const minPixelSize = gameConfig.items.highDPI.minPixelSize;
                drawWidth = Math.max(drawWidth, minPixelSize);
                drawHeight = Math.max(drawHeight, minPixelSize);
            }
            
            // Apply AssetManager scaling constraints to prevent quality degradation
            if (this.projectileImage && this.data.image && window.assetManager) {
                const safeSize = window.assetManager.getMaxSafeSize(this.data.image, drawWidth, drawHeight);
                if (safeSize.wasConstrained) {
                    drawWidth = safeSize.width;
                    drawHeight = safeSize.height;
                    // Optional: Log when scaling is constrained
                    if (gameConfig.debug?.logScalingConstraints) {
                        console.log(`Projectile ${this.data.id} scaling constrained: ${drawWidth}x${drawHeight} (max ${safeSize.maxScaleFactor}x)`);
                    }
                }
            }
        }
        const borderPadding = 8; // Padding for border around projectiles with variable values
        
        // Draw scary borders for shadowbolt and fireball (but not frostbolt)
        if (this.data.id === "fireball" || this.data.id === "shadowbolt") {
            // Animated pulsing effect for scary border
            const pulseIntensity = Math.sin(this.glowAnimation * 2) * 0.3 + 0.7;
            const borderSize = 2 + Math.sin(this.glowAnimation * 1.5) * 1; // Animated border thickness
            
            // Calculate center and radius for circular border
            const centerX = this.x + drawWidth / 2;
            const centerY = this.y + drawHeight / 2;
            const outerRadius = Math.max(drawWidth, drawHeight) / 2 + borderPadding;
            const innerRadius = outerRadius - 4;
            
            // Different border colors based on projectile type
            if (this.data.id === "shadowbolt") {
                // Dark purple glow for shadowbolt
                ctx.strokeStyle = `rgba(75, 0, 130, ${pulseIntensity})`;
                ctx.lineWidth = borderSize;
                ctx.shadowColor = '#4B0082';
                ctx.shadowBlur = 15 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner darker purple border circle for more definition
                ctx.strokeStyle = `rgba(47, 0, 79, ${pulseIntensity + 0.2})`;
                ctx.lineWidth = Math.max(1, borderSize - 1); // Thinner inner border
                ctx.shadowBlur = 6 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
                ctx.stroke();
            } else if (this.data.id === "fireball") {
                // Orange/red glow for fireball
                ctx.strokeStyle = `rgba(255, 69, 0, ${pulseIntensity})`;
                ctx.lineWidth = borderSize;
                ctx.shadowColor = '#FF4500';
                ctx.shadowBlur = 15 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner darker orange border circle for more definition
                ctx.strokeStyle = `rgba(255, 140, 0, ${pulseIntensity + 0.2})`;
                ctx.lineWidth = Math.max(1, borderSize - 1); // Thinner inner border
                ctx.shadowBlur = 6 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        // Draw colored border for projectiles with variable values
        // Calculate correct offset to match image positioning
        const offsetX = (drawWidth - this.width) / 2;
        const offsetY = (drawHeight - this.height) / 2;
        
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - offsetX - borderPadding, this.y - offsetY - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        } else if (this.data.effects === "freeze_time" && this.freezeDuration) {
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#87CEEB';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - offsetX - borderPadding, this.y - offsetY - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        } else if (this.data.effects === "shield" && this.shieldDuration) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - offsetX - borderPadding, this.y - offsetY - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        // Use the specific projectile image from AssetManager
        if (this.projectileImage && this.projectileImage.complete && this.projectileImage.naturalWidth > 0) {
            // Center the pulsating image and apply smooth rendering
            const offsetX = (drawWidth - this.width) / 2;
            const offsetY = (drawHeight - this.height) / 2;
            
            // Smooth rendering for all projectiles (they usually don't rotate but may pulse)
            ctx.drawImage(this.projectileImage, this.x - offsetX, this.y - offsetY, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on projectile type with pulsating size
            this.drawPlaceholder(ctx, drawWidth, drawHeight, glowIntensity);
        }
        
        // Draw variable value text underneath for projectiles with special effects
        this.drawEffectText(ctx, drawWidth, drawHeight);
        
        ctx.restore();
    }

    drawPlaceholder(ctx, drawWidth, drawHeight, glowIntensity = 1.0) {
        const offsetX = (drawWidth - this.width) / 2;
        const offsetY = (drawHeight - this.height) / 2;
        const centerX = this.x + this.width/2;
        const centerY = this.y + this.height/2;
        
        if (this.data.id === "fireball") {
            // Fireball placeholder with flickering intensity
            const flickerIntensity = glowIntensity * 0.8 + 0.2; // Never fully dim
            ctx.fillStyle = `rgba(255, 69, 0, ${flickerIntensity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner core with more intense flicker
            ctx.fillStyle = `rgba(255, 215, 0, ${Math.min(1.0, flickerIntensity * 1.3)})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
            
            // Add flame-like spikes around the edge
            ctx.strokeStyle = `rgba(255, 140, 0, ${flickerIntensity})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4 + this.flickerAnimation * 0.1;
                const spikeLength = (drawWidth/2) * (0.8 + Math.sin(this.flickerAnimation * 5 + i) * 0.3);
                const startX = centerX + Math.cos(angle) * (drawWidth/2.5);
                const startY = centerY + Math.sin(angle) * (drawHeight/2.5);
                const endX = centerX + Math.cos(angle) * spikeLength;
                const endY = centerY + Math.sin(angle) * spikeLength;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.data.id === "speedboost") {
            // Speed boost placeholder - red circle with percentage
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.data.id === "frostbolt") {
            // Frostbolt placeholder with crystalline shimmer
            const shimmerIntensity = glowIntensity;
            ctx.fillStyle = `rgba(0, 191, 255, ${shimmerIntensity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner crystalline core
            ctx.fillStyle = `rgba(135, 206, 235, ${Math.min(1.0, shimmerIntensity * 1.2)})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
            
            // Add animated crystalline spikes
            ctx.strokeStyle = `rgba(255, 255, 255, ${shimmerIntensity})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + this.pulseAnimation * 0.05; // Slow rotation
                const spikeLength = (drawWidth/2.5) * (0.9 + Math.sin(this.pulseAnimation * 2 + i) * 0.1); // Subtle length variation
                const startX = centerX + Math.cos(angle) * (drawWidth/4);
                const startY = centerY + Math.sin(angle) * (drawHeight/4);
                const endX = centerX + Math.cos(angle) * spikeLength;
                const endY = centerY + Math.sin(angle) * spikeLength;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            
            // Add inner shimmer lines
            ctx.strokeStyle = `rgba(173, 216, 230, ${shimmerIntensity * 0.7})`;
            ctx.lineWidth = 1;
            for (let i = 0; i < 3; i++) {
                const angle = (i * Math.PI) / 1.5 + this.pulseAnimation * 0.1;
                const length = drawWidth/4;
                ctx.beginPath();
                ctx.moveTo(centerX - Math.cos(angle) * length, centerY - Math.sin(angle) * length);
                ctx.lineTo(centerX + Math.cos(angle) * length, centerY + Math.sin(angle) * length);
                ctx.stroke();
            }
        } else if (this.data.id === "power_word_shield_projectile") {
            // Power Word Shield placeholder - cyan shield with glow
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2.5, 0, Math.PI * 2);
            ctx.fill();
            // Add shield cross pattern
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY - drawHeight/4);
            ctx.lineTo(centerX, centerY + drawHeight/4);
            ctx.moveTo(centerX - drawWidth/4, centerY);
            ctx.lineTo(centerX + drawWidth/4, centerY);
            ctx.stroke();
        } else if (this.data.id === "frost_nova") {
            // Frost Nova placeholder - similar to frostbolt but with different color scheme
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
            // Add frost nova effect - more elaborate than frostbolt
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const startX = centerX + Math.cos(angle) * (drawWidth/6);
                const startY = centerY + Math.sin(angle) * (drawHeight/6);
                const endX = centerX + Math.cos(angle) * (drawWidth/2.2);
                const endY = centerY + Math.sin(angle) * (drawHeight/2.2);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.data.id === "shadowbolt") {
            // Shadowbolt placeholder with dark corruption pulsing
            const corruptionIntensity = glowIntensity;
            
            // Outer dark aura that expands and contracts
            const auraSize = (drawWidth/2) * (1.1 + Math.sin(this.pulseAnimation * 0.8) * 0.15);
            ctx.fillStyle = `rgba(26, 0, 51, ${corruptionIntensity * 0.6})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, auraSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Main shadow body with corruption pulsing
            ctx.fillStyle = `rgba(75, 0, 130, ${corruptionIntensity})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner darker core
            ctx.fillStyle = `rgba(47, 0, 79, ${Math.min(1.0, corruptionIntensity * 1.2)})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, (drawWidth/2) * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing inner corruption glow
            const innerGlowSize = (drawWidth/2) * (0.25 + Math.sin(this.flickerAnimation * 1.5) * 0.08);
            ctx.fillStyle = `rgba(138, 43, 226, ${corruptionIntensity * 0.8})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, innerGlowSize, 0, Math.PI * 2);
            ctx.fill();
            
            // Add wispy shadow tendrils that writhe
            ctx.strokeStyle = `rgba(75, 0, 130, ${corruptionIntensity * 0.8})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + this.glowAnimation * 0.08 + Math.sin(this.flickerAnimation + i) * 0.2;
                const tendrilLength = (drawWidth/2.2) * (0.8 + Math.sin(this.pulseAnimation * 1.5 + i * 0.5) * 0.3);
                const startX = centerX + Math.cos(angle) * (drawWidth/4);
                const startY = centerY + Math.sin(angle) * (drawHeight/4);
                const endX = centerX + Math.cos(angle) * tendrilLength;
                const endY = centerY + Math.sin(angle) * tendrilLength;
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
            
            // Add corruption particles/wisps
            ctx.fillStyle = `rgba(138, 43, 226, ${corruptionIntensity * 0.4})`;
            for (let i = 0; i < 4; i++) {
                const angle = (i * Math.PI) / 2 + this.flickerAnimation * 0.5;
                const distance = (drawWidth/3) * (0.7 + Math.sin(this.pulseAnimation * 2 + i) * 0.3);
                const wispX = centerX + Math.cos(angle) * distance;
                const wispY = centerY + Math.sin(angle) * distance;
                const wispSize = 3 + Math.sin(this.flickerAnimation * 3 + i) * 2;
                ctx.beginPath();
                ctx.arc(wispX, wispY, wispSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    drawEffectText(ctx, drawWidth, drawHeight) {
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            // Background for text readability
            const textX = this.x + this.width/2;
            const textY = this.y + this.height + 20;
            const textWidth = 60;
            const textHeight = 18;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Border around text background
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Text
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`+${this.speedIncreasePercent}%`, textX, textY + 4);
        } else if (this.data.effects === "freeze_time" && this.freezeDuration) {
            // Background for text readability
            const textX = this.x + this.width/2;
            const textY = this.y + this.height + 20;
            const textWidth = 60;
            const textHeight = 18;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Border around text background
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Text - convert frames to seconds for display
            const seconds = Math.round(this.freezeDuration / 60);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${seconds}s`, textX, textY + 4);
        } else if (this.data.effects === "shield" && this.shieldDuration) {
            // Background for text readability
            const textX = this.x + this.width/2;
            const textY = this.y + this.height + 20;
            const textWidth = 60;
            const textHeight = 18;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.fillRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Border around text background
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 2;
            ctx.strokeRect(textX - textWidth/2, textY - textHeight/2, textWidth, textHeight);
            
            // Text - convert frames to seconds for display
            const seconds = Math.round(this.shieldDuration / 60);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${seconds}s`, textX, textY + 4);
        }
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
    
    playImpactSound() {
        if (this.data.sound) {
            // Use AssetManager to get the audio asset
            const projectileAudio = assetManager.getAudio(this.data.sound);
            if (projectileAudio && window.playAudioOptimized) {
                // Use optimized audio system - volume is handled internally by playAudioOptimized
                const soundKey = `projectile_${this.data.id || 'generic'}`;
                window.playAudioOptimized(soundKey, projectileAudio, { 
                    allowOverlap: true  // Allow multiple projectile impact sounds
                });
            } else if (projectileAudio) {
                // Fallback to direct play if optimized function not available
                // Check if sound effects are enabled before playing
                const soundEffectsEnabled = window.gameSettings && typeof window.gameSettings.areSoundEffectsEnabled === 'function' ? window.gameSettings.areSoundEffectsEnabled() : true;
                
                if (soundEffectsEnabled) {
                    // Get volume from settings system - use effects volume
                    const volume = (window.gameSettings && typeof window.gameSettings.getEffectsVolumeDecimal === 'function') ? 
                        window.gameSettings.getEffectsVolumeDecimal() : 
                        (window.gameSettings && typeof window.gameSettings.getVolumeDecimal === 'function' ? window.gameSettings.getVolumeDecimal() : 
                        (this.data.id === "fireball" ? gameConfig.audio.volumes.fireballImpact : gameConfig.audio.volumes.effects));
                        
                    projectileAudio.volume = volume;
                    projectileAudio.currentTime = 0;
                    projectileAudio.play().catch(e => console.log(`Projectile sound ${this.data.sound} not available`));
                } else {
                    console.log(`Projectile sound ${this.data.sound} blocked by settings (fallback)`);
                }
            }
        }
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize() {
        // Update size based on new scaling with size multiplier (like PowerUpItem)
        const sizeMultiplier = this.data.size_multiplier || 1;
        const baseProjectileSize = responsiveScaler.getSize('item', 'projectile');
        this.width = baseProjectileSize * sizeMultiplier;
        this.height = baseProjectileSize * sizeMultiplier;
    }
}

// Keep Fireball class for backward compatibility (now extends DamageProjectile)
export class Fireball extends DamageProjectile {
    constructor(fireballData, isValidYPosition, recentDropYPositions, gameState, canvas) {
        super(fireballData, isValidYPosition, recentDropYPositions, gameState, canvas);
    }
} 