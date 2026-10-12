import { gameConfig } from '../config/gameConfig.js';
import { addNotification } from '../utils/gameUtils.js';

export function updateBulletTime(gameState, deltaTimeMultiplier) {
    // Check if bullet time should be active
    const config = gameConfig.bulletTime;
    if (!config.enabled) {
        gameState.bulletTimeActive = false;
        gameState.bulletTimeMultiplier = 1.0;
        return;
    }
    
    // Calculate effective speed (levelSpeedMultiplier includes Dragonstalker reductions, subtract cut_time reductions)
    const effectiveSpeed = Math.max(0.2, gameState.levelSpeedMultiplier - (gameState.permanentSpeedReduction || 0));
    
    // Activate bullet time at trigger speed
    const shouldActivate = effectiveSpeed >= config.triggerSpeed;
    
    if (shouldActivate && !gameState.bulletTimeActive) {
        // Activate bullet time
        gameState.bulletTimeActive = true;
        gameState.bulletTimeMultiplier = config.timeDilation;
        gameState.bulletTimeVisualTimer = 0;
        
        // Add focus mode notification
        if (config.visualEffects.focusIndicator) {
            addNotification(gameState, '🎯 FOCUS MODE', 3000, config.visualEffects.glowColor);
        }
        
        console.log(`🎯 Bullet time activated at ${effectiveSpeed.toFixed(1)}x speed (${Math.round((1 - config.timeDilation) * 100)}% time dilation)`);
    } else if (!shouldActivate && gameState.bulletTimeActive) {
        // Deactivate bullet time
        gameState.bulletTimeActive = false;
        gameState.bulletTimeMultiplier = 1.0;
        
        console.log(`⏰ Bullet time deactivated`);
    }
    
    // Update visual timer
    if (gameState.bulletTimeActive) {
        gameState.bulletTimeVisualTimer += deltaTimeMultiplier;
    }
}

export function renderBulletTimeEffects(ctx, canvas, gameState) {
    if (!gameState.bulletTimeActive || !gameConfig.bulletTime.visualEffects.enabled) return;
    
    const config = gameConfig.bulletTime.visualEffects;
    const timer = gameState.bulletTimeVisualTimer;
    
    ctx.save();
    
    // Pulsating blue border glow effect
    if (config.borderGlow && config.glowIntensity > 0) {
        const pulseFactor = 0.5 + 0.5 * Math.sin(timer * config.pulseSpeed); // Smooth pulse from 0.5 to 1.0
        const glowOpacity = config.glowIntensity * pulseFactor;
        const borderWidth = 8 + (4 * pulseFactor); // Border width pulses from 8 to 12px
        
        // Set up glow effect
        ctx.strokeStyle = config.glowColor;
        ctx.lineWidth = borderWidth;
        ctx.globalAlpha = glowOpacity;
        ctx.shadowColor = config.glowColor;
        ctx.shadowBlur = 20 * pulseFactor;
        
        // Draw border around the playable area
        ctx.beginPath();
        ctx.rect(borderWidth / 2, borderWidth / 2, 
                canvas.logicalWidth - borderWidth, 
                canvas.logicalHeight - borderWidth);
        ctx.stroke();
        
        // Add inner glow effect
        ctx.lineWidth = Math.max(2, borderWidth - 4);
        ctx.globalAlpha = glowOpacity * 0.7;
        ctx.shadowBlur = 12 * pulseFactor;
        ctx.beginPath();
        ctx.rect(borderWidth, borderWidth, 
                canvas.logicalWidth - (borderWidth * 2), 
                canvas.logicalHeight - (borderWidth * 2));
        ctx.stroke();
    }
    
    ctx.restore();
}
