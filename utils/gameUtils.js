import { gameConfig } from '../config/gameConfig.js';

// Calculate level-specific speed multiplier
export function calculateLevelSpeedMultiplier(gameState) {
    let currentLevel = 1;
    let multiplier = gameConfig.levels.initialSpeedMultiplier;
    
    for (let i = 0; i < gameConfig.levels.thresholds.length; i++) {
        if (gameState.score >= gameConfig.levels.thresholds[i]) {
            currentLevel = i + 1;
            multiplier = gameConfig.levels.speedMultipliers[i - 1] || gameConfig.levels.initialSpeedMultiplier;
        }
    }
    
    // Handle levels beyond the defined multipliers
    if (currentLevel > gameConfig.levels.speedMultipliers.length) {
        const lastMultiplier = gameConfig.levels.speedMultipliers[gameConfig.levels.speedMultipliers.length - 1];
        const levelsAbove = currentLevel - gameConfig.levels.speedMultipliers.length;
        multiplier = lastMultiplier + (levelsAbove * gameConfig.levels.levelBeyond5Increment);
    }
    
    // Cap at configured maximum
    multiplier = Math.min(multiplier, gameConfig.levels.maxSpeedMultiplier);
    
    gameState.currentLevel = currentLevel;
    gameState.levelSpeedMultiplier = multiplier;
    return multiplier;
}

// Check if Y position is valid (has enough spacing from recent drops)
export function isValidYPosition(y, recentDropYPositions) {
    const minSpacing = gameConfig.visuals.minYSpacing;
    return !recentDropYPositions.some(recentY => Math.abs(y - recentY) < minSpacing);
}

// Clean up old Y positions from recent drops array
export function cleanupRecentDropPositions(recentDropYPositions) {
    const maxAge = 20; // Keep last 20 positions
    if (recentDropYPositions.length > maxAge) {
        recentDropYPositions.splice(0, recentDropYPositions.length - maxAge);
    }
}

// Calculate delta time multiplier for frame rate normalization
export function calculateDeltaTimeMultiplier(targetFPS = 60) {
    const currentTime = performance.now();
    const deltaTime = currentTime - (calculateDeltaTimeMultiplier.lastTime || currentTime);
    calculateDeltaTimeMultiplier.lastTime = currentTime;
    
    // Calculate multiplier to normalize to target FPS
    const targetFrameTime = 1000 / targetFPS; // 16.67ms for 60fps
    const multiplier = deltaTime / targetFrameTime;
    
    // Clamp to prevent extreme values
    return Math.min(Math.max(multiplier, 0.1), 3.0);
}

// Update game state timers
export function updateGameStateTimers(gameState, deltaTimeMultiplier) {
    // Update time slow timer
    if (gameState.timeSlowActive && gameState.timeSlowTimer > 0) {
        gameState.timeSlowTimer -= deltaTimeMultiplier;
        if (gameState.timeSlowTimer <= 0) {
            gameState.timeSlowActive = false;
            gameState.timeSlowMultiplier = 1.0;
        }
    }
    
    // Update freeze time timer
    if (gameState.freezeTimeActive && gameState.freezeTimeTimer > 0) {
        gameState.freezeTimeTimer -= deltaTimeMultiplier;
        if (gameState.freezeTimeTimer <= 0) {
            gameState.freezeTimeActive = false;
        }
    }
    
    // Update speed increase timer
    if (gameState.speedIncreaseActive && gameState.speedIncreaseTimer > 0) {
        gameState.speedIncreaseTimer -= deltaTimeMultiplier;
        if (gameState.speedIncreaseTimer <= 0) {
            gameState.speedIncreaseActive = false;
            gameState.currentSpeedIncreasePercent = 0;
            gameState.speedIncreaseMultiplier = 1.0;
        } else {
            // Update speed multiplier based on current percentage
            const clampedPercent = Math.min(gameState.currentSpeedIncreasePercent, 100);
            gameState.speedIncreaseMultiplier = 1.0 + (clampedPercent / 100);
        }
    }
    
    // Update shield timer
    if (gameState.shieldActive && gameState.shieldTimer > 0) {
        gameState.shieldTimer -= deltaTimeMultiplier;
        if (gameState.shieldTimer <= 0) {
            gameState.shieldActive = false;
            gameState.shieldTimer = 0;
        }
    }
    
    // Update player impact timer
    if (gameState.player && gameState.player.impactTimer > 0) {
        gameState.player.impactTimer -= deltaTimeMultiplier;
        gameState.player.isReacting = gameState.player.impactTimer > 0;
    }
}

// Notification system
export function addNotification(gameState, message, duration = 180, color = '#FFD700') {
    if (!gameState.notifications) {
        gameState.notifications = [];
    }
    
    gameState.notifications.push({
        message: message,
        timer: duration, // frames
        maxTimer: duration,
        color: color,
        id: Date.now() + Math.random() // unique id
    });
}

export function updateNotifications(gameState, deltaTimeMultiplier) {
    if (!gameState.notifications) {
        gameState.notifications = [];
        return;
    }
    
    gameState.notifications = gameState.notifications.filter(notification => {
        notification.timer -= deltaTimeMultiplier;
        return notification.timer > 0;
    });
}

export function drawNotifications(ctx, canvas, gameState) {
    if (!gameState.notifications || gameState.notifications.length === 0) {
        return;
    }
    
    // Import gameConfig here to avoid circular dependencies
    const gameConfig = typeof window !== 'undefined' && window.gameConfig || 
                      (typeof globalThis !== 'undefined' && globalThis.gameConfig);
    
    ctx.save();
    
    let yOffset = gameConfig?.notifications?.yOffset || 50; // Start position from top
    gameState.notifications.forEach(notification => {
        const fadeOutPercent = gameConfig?.notifications?.fadeOutPercent || 0.3;
        const alpha = Math.min(1, notification.timer / (notification.maxTimer * fadeOutPercent)); // Fade out in last 30%
        
        // Background
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
        ctx.font = `bold ${gameConfig?.notifications?.fontSize || 24}px Arial`;
        const textMetrics = ctx.measureText(notification.message);
        const bgWidth = textMetrics.width + 40;
        const bgHeight = 40;
        const bgX = (canvas.width - bgWidth) / 2;
        const bgY = yOffset - 20;
        
        // Rounded rectangle background
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(bgX, bgY, bgWidth, bgHeight, 10);
        } else {
            // Fallback for browsers without roundRect
            ctx.rect(bgX, bgY, bgWidth, bgHeight);
        }
        ctx.fill();
        
        // Border
        ctx.strokeStyle = notification.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = alpha;
        ctx.stroke();
        
        // Text
        ctx.fillStyle = notification.color;
        ctx.textAlign = 'center';
        ctx.fillText(notification.message, canvas.width / 2, yOffset + 6);
        
        yOffset += gameConfig?.notifications?.spacing || 50; // Space between notifications
    });
    
    ctx.restore();
} 