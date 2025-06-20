import { gameConfig } from '../config/gameConfig.js';

// Calculate level-specific speed multiplier using mathematical formula
export function calculateLevelSpeedMultiplier(gameState) {
    let currentLevel = 0; // Start from level 0
    
    // Determine current level based on score thresholds
    for (let i = gameConfig.levels.thresholds.length - 1; i >= 0; i--) {
        if (gameState.score >= gameConfig.levels.thresholds[i]) {
            currentLevel = i;
            break;
        }
    }
    
    // Handle levels beyond the defined thresholds
    if (currentLevel >= gameConfig.levels.thresholds.length) {
        const lastThreshold = gameConfig.levels.thresholds[gameConfig.levels.thresholds.length - 1];
        const pointsBeyondLastThreshold = gameState.score - lastThreshold;
        const additionalLevels = Math.floor(pointsBeyondLastThreshold / 100); // Every 100 points = new level
        currentLevel = gameConfig.levels.thresholds.length - 1 + additionalLevels;
    }
    
    let multiplier;
    
    // Use mathematical formula for speed progression (legacy array system removed)
    multiplier = calculateSpeedFormula(currentLevel);
    
    // Cap at configured maximum
    multiplier = Math.min(multiplier, gameConfig.levels.maxSpeedMultiplier);
    
    gameState.currentLevel = currentLevel;
    gameState.levelSpeedMultiplier = multiplier;
    return multiplier;
}

// Mathematical formula for speed progression
// Produces: Level 0: 1.2x, Level 1: 1.6x, Level 2: 2.6x, Level 3: 3.7x, Level 4: 5.0x, Level 5: 7.0x, Level 6+: Unlimited!
function calculateSpeedFormula(level) {
    // Optional safety cap to prevent extreme values (can be disabled)
    const enableSafetyCap = gameConfig.levels.enableSafetyCap !== false; // Default: enabled
    const safetyCap = gameConfig.levels.safetyCap || 100.0; // Default: 100x max
    
    if (enableSafetyCap && level >= 20) {
        // At level 20+, cap at safety limit to prevent performance issues
        return Math.min(safetyCap, gameConfig.levels.maxSpeedMultiplier);
    }
    
    // Get configurable parameters
    const baseSpeed = gameConfig.levels.formulaBase;
    const weights = gameConfig.levels.formulaWeights;
    
    // Multi-component mathematical formula for accelerating difficulty curve
    const linearComponent = level * weights.linear;                                           // Steady growth
    const quadraticComponent = Math.pow(level, 2) * weights.quadratic;                      // Accelerating growth  
    const exponentialComponent = (Math.pow(weights.exponentialBase, level) - 1) * weights.exponential; // Rapid late-game growth
    
    // Combine all components
    let speed = baseSpeed + linearComponent + quadraticComponent + exponentialComponent;
    
    // Fine-tune specific levels to match your exact desired progression
    // These micro-adjustments ensure perfect alignment with target values
    const precisionAdjustments = {
        1: 0.15,  // Target: 1.6x (fine-tune from calculated ~1.45)
        2: 0.35,  // Target: 2.6x (fine-tune from calculated ~2.25)  
        3: 0.25,  // Target: 3.7x (fine-tune from calculated ~3.45)
        4: 0.6,   // Target: 5.0x (fine-tune from calculated ~4.40)
        5: 1.5    // Target: 7.0x (fine-tune from calculated ~5.50)
    };
    
    if (precisionAdjustments[level] !== undefined) {
        speed += precisionAdjustments[level];
    }
    
    // Apply optional safety cap for very high levels
    if (enableSafetyCap && speed > safetyCap) {
        speed = safetyCap;
    }
    
    // Round to one decimal place for clean display
    return Math.round(speed * 10) / 10;
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
    
    // Player timers are now handled by player.updateTimers() in inputSystem.js
    
    // Update shadowbolt damage-over-time effects
    if (gameState.shadowboltDots && gameState.shadowboltDots.length > 0) {
        gameState.shadowboltTimer -= deltaTimeMultiplier;
        
        if (gameState.shadowboltTimer <= 0) {
            // Deal damage from all active shadowbolt DOTs
            const activeDots = gameState.shadowboltDots.length;
            const damageThisTick = activeDots * gameState.shadowboltDamagePerTick;
            
            // Check if shield blocks DOT damage
            if (gameState.shieldActive) {
                // Shield blocks shadowbolt damage
                addNotification(gameState, `🛡️ Shield Blocked ${damageThisTick} Shadow Damage!`, 120, '#FFD700');
            } else {
                // Apply the damage
                gameState.health = Math.max(0, gameState.health - damageThisTick);
                
                // Show damage notification
                addNotification(gameState, `🌑 Shadow Damage -${damageThisTick} HP (${activeDots} stacks)`, 120, '#4B0082');
                
                // Trigger player impact reaction for DOT damage
                if (gameState.player && gameState.player.onHit) {
                    gameState.player.onHit();
                }
            }
            
            // Reduce duration of each DOT by 1 second (60 frames)
            gameState.shadowboltDots = gameState.shadowboltDots.map(dot => ({
                ...dot,
                remainingDuration: dot.remainingDuration - 60
            })).filter(dot => dot.remainingDuration > 0);
            
            // Reset timer for next tick if there are still active DOTs
            if (gameState.shadowboltDots.length > 0) {
                gameState.shadowboltTimer = gameState.shadowboltTickRate;
            }
        }
    }
    
    // Update chicken food heal-over-time effects
    if (gameState.chickenFoodHots && gameState.chickenFoodHots.length > 0) {
        gameState.chickenFoodTimer -= deltaTimeMultiplier;
        
        if (gameState.chickenFoodTimer <= 0) {
            // Heal from all active chicken food HOTs
            const activeHots = gameState.chickenFoodHots.length;
            const healThisTick = activeHots * gameState.chickenFoodHealPerTick;
            
            // Apply the healing (cap at max health)
            const oldHealth = gameState.health;
            gameState.health = Math.min(gameState.maxHealth, gameState.health + healThisTick);
            const actualHeal = gameState.health - oldHealth;
            
            // Show heal notification only if we actually healed
            if (actualHeal > 0) {
                addNotification(gameState, `🐔 Chicken Food +${actualHeal} HP (${activeHots} stacks)`, 120, '#FFD700');
            }
            
            // Reduce duration of each HOT by 1 second (60 frames)
            gameState.chickenFoodHots = gameState.chickenFoodHots.map(hot => ({
                ...hot,
                remainingDuration: hot.remainingDuration - 60
            })).filter(hot => hot.remainingDuration > 0);
            
            // Reset timer for next tick if there are still active HOTs
            if (gameState.chickenFoodHots.length > 0) {
                gameState.chickenFoodTimer = gameState.chickenFoodTickRate;
            }
        }
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

// ===== RESPONSIVE SCALING SYSTEM =====
// Comprehensive scaling system for different screen sizes and devices

export class ResponsiveScaler {
    constructor() {
        this.baseWidth = 1920;  // Reference desktop width
        this.baseHeight = 1080; // Reference desktop height
        this.minScale = 0.5;    // Minimum scale factor
        this.maxScale = 2.0;    // Maximum scale factor
        
        // Device type detection
        this.deviceType = this.detectDeviceType();
        this.orientation = this.getOrientation();
        
        // Scale factors
        this.scaleX = 1;
        this.scaleY = 1;
        this.uniformScale = 1;
        
        // Element sizes (will be calculated based on scale)
        this.sizes = {};
        
        this.updateScaling();
        
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateScaling();
            }, 100);
        });
        
        // Listen for resize events
        window.addEventListener('resize', () => {
            this.updateScaling();
        });
    }
    
    detectDeviceType() {
        const userAgent = navigator.userAgent;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const maxDimension = Math.max(width, height);
        const minDimension = Math.min(width, height);
        
        // Check for mobile devices
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
            // Distinguish between phone and tablet
            if (maxDimension < 768 || minDimension < 500) {
                return 'mobile';
            } else {
                return 'tablet';
            }
        }
        
        // Check for small desktop screens
        if (width < 1024 || height < 768) {
            return 'small-desktop';
        }
        
        return 'desktop';
    }
    
    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    updateScaling() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        // Update device detection
        this.deviceType = this.detectDeviceType();
        this.orientation = this.getOrientation();
        
        // Calculate scale factors
        this.scaleX = width / this.baseWidth;
        this.scaleY = height / this.baseHeight;
        
        // Use different scaling strategies based on device type
        switch (this.deviceType) {
            case 'mobile':
                // For mobile, use smaller of the two scales to ensure everything fits
                this.uniformScale = Math.min(this.scaleX, this.scaleY);
                // But don't make things too small on mobile
                this.uniformScale = Math.max(this.uniformScale, 0.6);
                break;
                
            case 'tablet':
                // For tablets, use a balanced approach
                this.uniformScale = Math.min(this.scaleX, this.scaleY);
                this.uniformScale = Math.max(this.uniformScale, 0.7);
                break;
                
            case 'small-desktop':
                // For small desktops, scale down but not too much
                this.uniformScale = Math.min(this.scaleX, this.scaleY);
                this.uniformScale = Math.max(this.uniformScale, 0.8);
                break;
                
            default: // desktop
                // For desktop, use average of scales but cap it
                this.uniformScale = (this.scaleX + this.scaleY) / 2;
                break;
        }
        
        // Apply min/max constraints
        this.uniformScale = Math.max(this.minScale, Math.min(this.maxScale, this.uniformScale));
        
        // Calculate element sizes based on device type and scale
        this.calculateElementSizes();
        
        console.log(`Scaling updated: ${this.deviceType} (${this.orientation}), scale: ${this.uniformScale.toFixed(2)}, player: ${this.sizes.player.width}x${this.sizes.player.height}`);
    }
    
    calculateElementSizes() {
        const basePlayerWidth = this.deviceType === 'mobile' ? 60 : 80;  // Base width for player
        const baseItemSize = this.deviceType === 'mobile' ? 60 : 80;
        const basePowerUpSize = this.deviceType === 'mobile' ? 70 : 90;
        
        // Player aspect ratio is 1:2 (width:height) based on 250x500 original image
        const playerAspectRatio = 0.5; // width/height = 250/500 = 0.5
        
        this.sizes = {
            // Player sizes (maintaining proper aspect ratio)
            player: {
                width: Math.round(basePlayerWidth * this.uniformScale),
                height: Math.round((basePlayerWidth / playerAspectRatio) * this.uniformScale), // height = width / 0.5 = width * 2
                speed: Math.round(8 * this.uniformScale)
            },
            
            // Item sizes
            item: {
                base: Math.round(baseItemSize * this.uniformScale),
                powerUp: Math.round(basePowerUpSize * this.uniformScale)
            },
            
            // UI elements
            ui: {
                healthBarWidth: Math.round(200 * this.uniformScale),
                healthBarHeight: Math.round(20 * this.uniformScale),
                fontSize: Math.round(16 * this.uniformScale),
                notificationFontSize: Math.round(18 * this.uniformScale),
                spellIconSize: Math.round(50 * this.uniformScale)
            },
            
            // Spacing and layout
            spacing: {
                minYSpacing: Math.round(150 * this.uniformScale),
                borderWidth: Math.max(1, Math.round(2 * this.uniformScale)),
                padding: Math.round(10 * this.uniformScale)
            }
        };
        
        // Adjust for mobile-specific considerations
        if (this.deviceType === 'mobile') {
            // Make touch targets larger on mobile (maintain aspect ratio)
            const mobileScale = 1.2;
            this.sizes.player.width *= mobileScale;
            this.sizes.player.height *= mobileScale;
            this.sizes.item.base *= 1.1;
            this.sizes.ui.spellIconSize *= 1.3;
            
            // Increase spacing on mobile for easier gameplay
            this.sizes.spacing.minYSpacing *= 1.3;
        }
    }
    
    // Get scaled size for any element type
    getSize(category, property = null) {
        if (property) {
            return this.sizes[category]?.[property] || 1;
        }
        return this.sizes[category] || {};
    }
    
    // Scale a custom value
    scale(value) {
        return Math.round(value * this.uniformScale);
    }
    
    // Get device-specific settings
    getDeviceSettings() {
        return {
            deviceType: this.deviceType,
            orientation: this.orientation,
            scale: this.uniformScale,
            isMobile: this.deviceType === 'mobile',
            isTablet: this.deviceType === 'tablet',
            isTouch: 'ontouchstart' in window,
            sizes: this.sizes
        };
    }
    
    // Update movable area based on device
    getMovableAreaConfig() {
        let heightPercent = 0.3; // Default for desktop
        
        switch (this.deviceType) {
            case 'mobile':
                // Give more space on mobile since screen is smaller
                heightPercent = this.orientation === 'portrait' ? 0.4 : 0.5;
                break;
            case 'tablet':
                heightPercent = 0.35;
                break;
        }
        
        return {
            enabled: true,
            heightPercent: heightPercent,
            showBorder: true,
            borderColor: '#4ECDC4',
            borderOpacity: this.deviceType === 'mobile' ? 0.4 : 0.3, // More visible on mobile
            borderWidth: this.sizes.spacing.borderWidth
        };
    }
}

// Create global scaler instance
export const responsiveScaler = new ResponsiveScaler();

// Physics functions for boundary collision and bouncing
export function checkBoundaryCollision(item, canvas) {
    // Only check for side and top collisions - bottom collision means the item is missed
    return {
        left: item.x <= 0,
        right: item.x + item.width >= canvas.width,
        top: item.y <= 0,
        bottom: false // Never bounce from bottom - items should be missed instead
    };
}

export function applyBoundaryBounce(item, collisions, canvas, restitution = 0.7, spinFactor = 0.1) {
    // Restitution: how much energy is retained after bounce (0-1)
    // SpinFactor: how much collision affects rotation
    
    let bounced = false;
    
    // Left wall collision
    if (collisions.left) {
        item.x = 0; // Correct position
        item.horizontalSpeed = Math.abs(item.horizontalSpeed) * restitution; // Bounce right
        
        // Add rotational effect based on vertical speed
        const verticalImpact = Math.abs(item.speed); // item.speed is already the vertical component
        item.rotationSpeed += verticalImpact * spinFactor * (Math.random() - 0.5);
        
        bounced = true;
    }
    
    // Right wall collision
    if (collisions.right) {
        item.x = canvas.width - item.width; // Correct position
        item.horizontalSpeed = -Math.abs(item.horizontalSpeed) * restitution; // Bounce left
        
        // Add rotational effect based on vertical speed
        const verticalImpact = Math.abs(item.speed); // item.speed is already the vertical component
        item.rotationSpeed += verticalImpact * spinFactor * (Math.random() - 0.5);
        
        bounced = true;
    }
    
    // Top wall collision (rare but possible)
    if (collisions.top) {
        item.y = 0; // Correct position
        // Reverse vertical speed with energy loss
        item.speed = item.speed * restitution;
        item.horizontalSpeed += (Math.random() - 0.5) * item.speed * 0.3;
        
        // Strong rotational effect for top collisions
        item.rotationSpeed += item.speed * spinFactor * 2 * (Math.random() - 0.5);
        
        bounced = true;
    }
    
    // Bottom collision is not handled - items that reach the bottom should be missed
    // (removed bottom collision handling to prevent bouncing from floor)
    
    return bounced;
}

export function applyAdvancedBouncePhysics(item, collisions, canvas, options = {}) {
    // Simplified bounce physics - just reverse direction with energy loss
    const {
        restitution = 0.7           // Energy retention (0-1)
    } = options;
    
    let bounced = false;
    
    if (collisions.left || collisions.right) {
        // Simple wall collision physics - just reverse horizontal direction with energy loss
        const isLeftWall = collisions.left;
        
        // Position correction
        item.x = isLeftWall ? 0 : canvas.width - item.width;
        
        // Simply reverse horizontal speed with energy loss
        item.horizontalSpeed = -item.horizontalSpeed * restitution;
        
        // Add a small amount of spin for visual effect
        item.rotationSpeed += (Math.random() - 0.5) * 0.1;
        
        bounced = true;
    }
    
    if (collisions.top) {
        // Simple ceiling collision physics - reverse vertical direction with energy loss
        // Position correction
        item.y = 0;
        
        // Simply reverse vertical speed with energy loss (bounce downward from ceiling)
        item.speed = Math.abs(item.speed) * restitution;
        
        // Add a small amount of spin for visual effect
        item.rotationSpeed += (Math.random() - 0.5) * 0.1;
        
        bounced = true;
    }
    
    return bounced;
}

export function calculateSpinEffect(item, deltaTime) {
    // Calculate how spin affects the trajectory (Magnus effect simulation)
    const spinStrength = Math.abs(item.rotationSpeed);
    const magnusForce = spinStrength * 0.03; // Much weaker Magnus effect (was 0.1)
    
    // Spin direction affects horizontal drift
    const spinDirection = Math.sign(item.rotationSpeed);
    const magnusAcceleration = magnusForce * spinDirection;
    
    // Apply Magnus effect to horizontal speed (very subtle)
    item.horizontalSpeed += magnusAcceleration * deltaTime;
    
    // Remove vertical Magnus effect to prevent excessive movement
    // (commented out the vertical effect)
}

export function applyAirResistance(item, deltaTime, airDensity = 0.001) {
    // Much gentler air resistance - only apply to very fast moving items
    // or items with significant horizontal speed
    const totalSpeed = Math.sqrt(item.speed * item.speed + item.horizontalSpeed * item.horizontalSpeed);
    
    // Only apply air resistance if item is moving fast or has significant horizontal movement
    if (totalSpeed < 2 && Math.abs(item.horizontalSpeed) < 1) {
        return; // Skip air resistance for slow-moving items
    }
    
    // Very gentle drag - much smaller effect
    const linearDrag = 1 - Math.min(airDensity * deltaTime, 0.01); // Cap at 1% per frame
    const angularDrag = 1 - Math.min(airDensity * 0.3 * deltaTime, 0.005); // Even gentler for rotation
    
    // Apply drag to speeds
    item.speed *= linearDrag;
    item.horizontalSpeed *= linearDrag;
    item.rotationSpeed *= angularDrag;
    
    // Much lower minimum speed thresholds
    if (Math.abs(item.horizontalSpeed) < 0.01) item.horizontalSpeed = 0;
    if (Math.abs(item.rotationSpeed) < 0.001) item.rotationSpeed = 0;
} 