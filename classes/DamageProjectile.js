import { gameConfig } from '../config/gameConfig.js';
import { audioState, volumeSettings } from '../systems/audioSystem.js';
import { assetManager } from '../utils/AssetManager.js';

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
        this.width = projectileData.size.width;
        this.height = projectileData.size.height;
        
        // Gaussian randomized horizontal position (centered with some spread)
        const centerX = canvas.width / 2;
        const gaussianX = gaussianRandom(centerX, canvas.width * 0.25);
        this.x = Math.max(0, Math.min(canvas.width - this.width, gaussianX));
        
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
        const projectileSpeedMultiplier = Math.min((gameState.levelSpeedMultiplier * 0.6 + baseProjectileMultiplier), 4.5); // Cap at 4.5x total, includes base boost
        const projectileSpeedIncrease = gameState.speedIncreaseActive ? 
            Math.min(gameState.speedIncreaseMultiplier * 0.5, 1.15) : 1.0; // Reduce speed boost impact to max 15%
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveProjectileMultiplier = Math.max(0.3, projectileSpeedMultiplier - gameState.permanentSpeedReduction);
        this.speed = gameState.baseDropSpeed * effectiveProjectileMultiplier * projectileSpeedIncrease * speedVariation;
        
        // Visual effects
        this.glowAnimation = 0;
        
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

    update(deltaTimeMultiplier, canvas) {
        this.y += this.speed * deltaTimeMultiplier;
        this.glowAnimation += 0.2 * deltaTimeMultiplier;
        
        if (this.y > canvas.height + this.height) {
            return false;
        }
        return true;
    }

    draw(ctx) {
        ctx.save();
        
        // Glow effect based on projectile type
        if (this.data.id === "frostbolt") {
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6;
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = 25 * glow;
        } else if (this.data.id === "shadowbolt") {
            const glow = Math.sin(this.glowAnimation) * 0.5 + 0.5;
            ctx.shadowColor = this.data.color;
            ctx.shadowBlur = 30 * glow;
        }
        
        // Force consistent size regardless of source image dimensions
        const drawWidth = this.width;
        const drawHeight = this.height;
        const borderPadding = 8; // Padding for border around projectiles with variable values
        
        // Draw scary borders for damage-dealing projectiles (fireball, frostbolt, and shadowbolt)
        if (this.data.id === "fireball" || this.data.id === "frostbolt" || this.data.id === "shadowbolt") {
            // Animated pulsing effect for scary border
            const pulseIntensity = Math.sin(this.glowAnimation * 2) * 0.3 + 0.7;
            const borderSize = 2 + Math.sin(this.glowAnimation * 1.5) * 1; // Animated border thickness (thinner)
            
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
            } else {
                // Red glow for fireball and frostbolt
                ctx.strokeStyle = `rgba(255, 0, 0, ${pulseIntensity})`;
                ctx.lineWidth = borderSize;
                ctx.shadowColor = '#FF0000';
                ctx.shadowBlur = 15 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner darker red border circle for more definition
                ctx.strokeStyle = `rgba(139, 0, 0, ${pulseIntensity + 0.2})`;
                ctx.lineWidth = Math.max(1, borderSize - 1); // Thinner inner border
                ctx.shadowBlur = 6 * pulseIntensity;
                ctx.beginPath();
                ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
                ctx.stroke();
            }
            
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        // Draw colored border for projectiles with variable values
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FF0000';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - borderPadding, this.y - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        } else if (this.data.effects === "freeze_time" && this.freezeDuration) {
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#87CEEB';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - borderPadding, this.y - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        } else if (this.data.effects === "shield" && this.shieldDuration) {
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 8;
            ctx.strokeRect(this.x - borderPadding, this.y - borderPadding, drawWidth + (borderPadding * 2), drawHeight + (borderPadding * 2));
            ctx.shadowBlur = 0; // Reset shadow
        }
        
        // Check if projectile image is loaded, otherwise draw a placeholder
        if (this.projectileImage && this.projectileImage.complete && this.projectileImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.projectileImage, this.x, this.y, drawWidth, drawHeight);
        } else {
            // Draw placeholder based on projectile type with consistent size
            this.drawPlaceholder(ctx, drawWidth, drawHeight);
        }
        
        // Draw variable value text underneath for projectiles with special effects
        this.drawEffectText(ctx, drawWidth, drawHeight);
        
        ctx.restore();
    }

    drawPlaceholder(ctx, drawWidth, drawHeight) {
        if (this.data.id === "fireball") {
            // Fireball placeholder
            ctx.fillStyle = '#FF4500';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.data.id === "speedboost") {
            // Speed boost placeholder - red circle with percentage
            ctx.fillStyle = '#FF0000';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2.5, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.data.id === "frostbolt") {
            // Frostbolt placeholder
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
            // Add frost effect lines
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3;
                const startX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/4);
                const startY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/4);
                const endX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/2.5);
                const endY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/2.5);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.data.id === "power_word_shield_projectile") {
            // Power Word Shield placeholder - cyan shield with glow
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2.5, 0, Math.PI * 2);
            ctx.fill();
            // Add shield cross pattern
            ctx.strokeStyle = '#87CEEB';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.x + drawWidth/2, this.y + drawHeight/4);
            ctx.lineTo(this.x + drawWidth/2, this.y + drawHeight*3/4);
            ctx.moveTo(this.x + drawWidth/4, this.y + drawHeight/2);
            ctx.lineTo(this.x + drawWidth*3/4, this.y + drawHeight/2);
            ctx.stroke();
        } else if (this.data.id === "frost_nova") {
            // Frost Nova placeholder - similar to frostbolt but with different color scheme
            ctx.fillStyle = '#00BFFF';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(this.x + drawWidth/2, this.y + drawHeight/2, drawWidth/3, 0, Math.PI * 2);
            ctx.fill();
            // Add frost nova effect - more elaborate than frostbolt
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const startX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/6);
                const startY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/6);
                const endX = this.x + drawWidth/2 + Math.cos(angle) * (drawWidth/2.2);
                const endY = this.y + drawHeight/2 + Math.sin(angle) * (drawHeight/2.2);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        } else if (this.data.id === "shadowbolt") {
            // Shadowbolt placeholder - dark purple/indigo with wispy shadow effect
            const centerX = this.x + drawWidth/2;
            const centerY = this.y + drawHeight/2;
            const pulseEffect = Math.sin(this.glowAnimation) * 0.3 + 0.7;
            
            // Outer dark aura
            ctx.fillStyle = '#1A0033';
            ctx.beginPath();
            ctx.arc(centerX, centerY, (drawWidth/2) * 1.2, 0, Math.PI * 2);
            ctx.fill();
            
            // Main shadow body
            ctx.fillStyle = '#4B0082';
            ctx.beginPath();
            ctx.arc(centerX, centerY, drawWidth/2, 0, Math.PI * 2);
            ctx.fill();
            
            // Inner darker core
            ctx.fillStyle = '#2F004F';
            ctx.beginPath();
            ctx.arc(centerX, centerY, (drawWidth/2) * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
            // Pulsing inner glow
            ctx.fillStyle = `rgba(138, 43, 226, ${pulseEffect})`;
            ctx.beginPath();
            ctx.arc(centerX, centerY, (drawWidth/2) * 0.3, 0, Math.PI * 2);
            ctx.fill();
            
            // Add wispy shadow tendrils
            ctx.strokeStyle = `rgba(75, 0, 130, ${pulseEffect})`;
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const angle = (i * Math.PI) / 3 + this.glowAnimation * 0.1;
                const startX = centerX + Math.cos(angle) * (drawWidth/4);
                const startY = centerY + Math.sin(angle) * (drawHeight/4);
                const endX = centerX + Math.cos(angle) * (drawWidth/2.2);
                const endY = centerY + Math.sin(angle) * (drawHeight/2.2);
                ctx.beginPath();
                ctx.moveTo(startX, startY);
                ctx.lineTo(endX, endY);
                ctx.stroke();
            }
        }
    }

    drawEffectText(ctx, drawWidth, drawHeight) {
        if (this.data.effects === "speed_increase" && this.speedIncreasePercent) {
            // Background for text readability
            const textX = this.x + drawWidth/2;
            const textY = this.y + drawHeight + 20;
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
            const textX = this.x + drawWidth/2;
            const textY = this.y + drawHeight + 20;
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
            const textX = this.x + drawWidth/2;
            const textY = this.y + drawHeight + 20;
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
        if (audioState.isMuted) return;
        if (this.data.sound) {
            // Use AssetManager to get the audio asset
            const projectileAudio = assetManager.getAudio(this.data.sound);
            if (projectileAudio) {
                projectileAudio.volume = this.data.id === "fireball" ? gameConfig.audio.volumes.fireballImpact : volumeSettings.effects;
                projectileAudio.currentTime = 0; // Reset to beginning
                projectileAudio.play().catch(e => console.log(`Projectile sound ${this.data.sound} not available`));
            }
        }
    }
}

// Keep Fireball class for backward compatibility (now extends DamageProjectile)
export class Fireball extends DamageProjectile {
    constructor(fireballData, isValidYPosition, recentDropYPositions, gameState, canvas) {
        super(fireballData, isValidYPosition, recentDropYPositions, gameState, canvas);
    }
} 