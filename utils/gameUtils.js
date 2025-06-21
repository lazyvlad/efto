import { gameItems } from '../data/gameItems.js';
import { gameConfig, GAME_VERSION, cacheConfig } from '../config/gameConfig.js';

// Calculate level-specific speed multiplier using hybrid progression
export function calculateLevelSpeedMultiplier(gameState) {
    const progressionType = gameConfig.levels.progressionType || "points";
    let currentLevel = 0;
    
    if (progressionType === "hybrid" || progressionType === "time") {
        // Time-based or hybrid progression
        currentLevel = calculateTimeBasedLevel(gameState);
    } else {
        // Legacy points-based progression (fallback)
        currentLevel = calculatePointsBasedLevel(gameState);
    }
    
    let multiplier;
    
    // Use mathematical formula for speed progression
    multiplier = calculateSpeedFormula(currentLevel);
    
    // Apply permanent speed reduction from Dragonstalker completions
    if (gameState.permanentSpeedReductionFromSets > 0) {
        multiplier -= gameState.permanentSpeedReductionFromSets;
        // Ensure speed doesn't go below configured minimum
        const minSpeed = gameConfig.dragonstalker.minSpeedAfterReduction;
        multiplier = Math.max(minSpeed, multiplier);
    }
    
    // Cap at configured maximum
    multiplier = Math.min(multiplier, gameConfig.levels.maxLevelSpeedMultiplier);
    
    gameState.currentLevel = currentLevel;
    gameState.levelSpeedMultiplier = multiplier;
    return multiplier;
}

// Calculate level based on time + activity (hybrid system)
function calculateTimeBasedLevel(gameState) {
    // Initialize level tracking if not present
    if (typeof gameState.levelStartTime === 'undefined') {
        gameState.levelStartTime = Date.now() / 1000; // Convert to seconds
        gameState.timeRequiredForNextLevel = gameConfig.levels.baseTimePerLevel;
        gameState.levelActivity = {
            collections: 0,
            misses: 0,
            powerUpsCollected: 0,
            damageReceived: 0
        };
    }
    
    const currentTime = Date.now() / 1000;
    const timeInCurrentLevel = currentTime - gameState.levelStartTime;
    
    // Check if enough time has passed for next level
    if (timeInCurrentLevel >= gameState.timeRequiredForNextLevel) {
        // Level up!
        const oldLevel = gameState.currentLevel;
        gameState.currentLevel++;
        
        // Reset for next level
        gameState.levelStartTime = currentTime;
        gameState.timeRequiredForNextLevel = calculateNextLevelTime(gameState);
        gameState.levelActivity = {
            collections: 0,
            misses: 0,
            powerUpsCollected: 0,
            damageReceived: 0
        };
        
        console.log(`🕐 TIME-BASED LEVEL UP! Now level ${gameState.currentLevel + 1} (was ${oldLevel + 1})`);
        addNotification(gameState, `🕐 Level ${gameState.currentLevel + 1}! (Time-based)`, 180, '#FFD700');
    }
    
    return gameState.currentLevel;
}

// Calculate points-based level (legacy system)
function calculatePointsBasedLevel(gameState) {
    let currentLevel = 0;
    
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
        const additionalLevels = Math.floor(pointsBeyondLastThreshold / 100);
        currentLevel = gameConfig.levels.thresholds.length - 1 + additionalLevels;
    }
    
    return currentLevel;
}

// Calculate time required for next level based on activity
function calculateNextLevelTime(gameState) {
    const config = gameConfig.levels;
    let baseTime = config.baseTimePerLevel;
    
    if (config.progressionType !== "hybrid") {
        return baseTime; // Pure time-based, no activity adjustments
    }
    
    // Apply activity bonuses/penalties
    const activity = gameState.levelActivity;
    const bonus = config.activityBonus;
    
    let timeReduction = 0;
    let timeIncrease = 0;
    
    // Calculate reductions
    timeReduction += activity.collections * bonus.collectionsReduce;
    timeReduction += activity.powerUpsCollected * bonus.powerUpCollectedReduce;
    
    // Calculate increases
    timeIncrease += activity.misses * bonus.missesIncrease;
    timeIncrease += activity.damageReceived * bonus.damageReceivedIncrease;
    
    // Apply caps
    timeReduction = Math.min(timeReduction, bonus.maxReduction);
    timeIncrease = Math.min(timeIncrease, bonus.maxIncrease);
    
    // Calculate final time
    const finalTime = Math.max(10, baseTime - timeReduction + timeIncrease); // Minimum 10 seconds
    
    console.log(`⏱️ Next level time: ${finalTime}s (base: ${baseTime}s, -${timeReduction}s, +${timeIncrease}s)`);
    return finalTime;
}

// Mathematical formula for speed progression
// Produces: Level 0: 1.2x, Level 1: 1.6x, Level 2: 2.6x, Level 3: 3.7x, Level 4: 5.0x, Level 5: 7.0x, Level 6+: Unlimited!
function calculateSpeedFormula(level) {
    // Optional safety cap to prevent extreme values (can be disabled)
    const enableSafetyCap = gameConfig.levels.enableSafetyCap !== false; // Default: enabled
    const safetyCap = gameConfig.levels.safetyCap || 100.0; // Default: 100x max
    
    if (enableSafetyCap && level >= 20) {
        // At level 20+, cap at safety limit to prevent performance issues
        return Math.min(safetyCap, gameConfig.levels.maxLevelSpeedMultiplier);
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

// Check if Dragonstalker set is complete and handle completion
export function checkDragonstalkerCompletion(gameState, gameItems) {
    // Check if multiple completions are enabled
    if (!gameConfig.dragonstalker.enableMultipleCompletions && gameState.dragonstalkerCompletions > 0) {
        console.log(`🚫 Multiple completions disabled, already have ${gameState.dragonstalkerCompletions} completions`);
        return false; // Only allow one completion if disabled
    }
    
    const dragonstalkerItems = gameItems.filter(item => item.type === "tier_set");
    const uniquePiecesCollected = dragonstalkerItems.filter(item => item.collected > 0).length;
    
    // Check if all 10 pieces are collected
    if (uniquePiecesCollected >= 10) {
        // Complete the set!
        gameState.dragonstalkerCompletions++;
        
        // Calculate permanent speed reduction (configurable % of current level speed)
        const currentLevelSpeed = gameState.levelSpeedMultiplier;
        const reductionPercent = gameConfig.dragonstalker.speedReductionPercent;
        const speedReduction = currentLevelSpeed * reductionPercent;
        gameState.permanentSpeedReductionFromSets += speedReduction;
        
        // Reset all Dragonstalker items for next collection cycle
        console.log('🔄 Resetting Dragonstalker items for next cycle...');
        dragonstalkerItems.forEach(item => {
            console.log(`  Resetting ${item.name}: collected ${item.collected} → 0, missed ${item.missed} → 0`);
            item.collected = 0;
            item.missed = 0;
        });
        
        // Reset tier set counters
        console.log(`🔄 Resetting tier set counters: tierSetCollected ${gameState.tierSetCollected} → 0, tierSetMissed ${gameState.tierSetMissed} → 0`);
        gameState.tierSetCollected = 0;
        gameState.tierSetMissed = 0;
        
        // Increase crit rating by 5% for completing Dragonstalker set
        const critIncrease = 0.05; // 5%
        const oldCritRating = gameState.critRating;
        gameState.critRating = Math.min(gameState.critRating + critIncrease, gameState.critRatingCap);
        const actualIncrease = gameState.critRating - oldCritRating;
        
        if (actualIncrease > 0) {
            const critPercent = Math.round(actualIncrease * 100);
            const newCritPercent = Math.round(gameState.critRating * 100);
            addNotification(gameState, `💥 CRIT RATING INCREASED! +${critPercent}% (Now: ${newCritPercent}%)`, 300, '#FF6B00');
            console.log(`💥 Crit rating increased by ${critPercent}% to ${newCritPercent}% (${gameState.critRating.toFixed(3)})`);
        } else {
            const maxCritPercent = Math.round(gameState.critRatingCap * 100);
            addNotification(gameState, `💥 CRIT RATING MAXED! (${maxCritPercent}%)`, 240, '#FF6B00');
            console.log(`💥 Crit rating already at maximum: ${maxCritPercent}%`);
        }
        
        // Add completion notification
        const reductionPercentDisplay = Math.round(reductionPercent * 100);
        addNotification(gameState, 
            `🏆 DRAGONSTALKER SET #${gameState.dragonstalkerCompletions} COMPLETE! -${speedReduction.toFixed(1)}x (${reductionPercentDisplay}%) Permanent Speed Reduction!`, 
            480, '#FFD700');
        
        console.log(`🏆 Dragonstalker set ${gameState.dragonstalkerCompletions} completed! Speed reduction: -${speedReduction.toFixed(1)}x (Total: -${gameState.permanentSpeedReductionFromSets.toFixed(1)}x)`);
        
        return true; // Set was completed
    }
    
    return false; // Set not complete yet
}

// Track activity for hybrid progression
export function trackActivity(gameState, activityType, amount = 1) {
    if (!gameState.levelActivity) {
        gameState.levelActivity = {
            collections: 0,
            misses: 0,
            powerUpsCollected: 0,
            damageReceived: 0
        };
    }
    
    switch (activityType) {
        case 'collection':
            gameState.levelActivity.collections += amount;
            break;
        case 'miss':
            gameState.levelActivity.misses += amount;
            break;
        case 'powerUp':
            gameState.levelActivity.powerUpsCollected += amount;
            break;
        case 'damage':
            gameState.levelActivity.damageReceived += amount;
            break;
    }
    
    // Recalculate time required for next level if using hybrid progression
    if (gameConfig.levels.progressionType === "hybrid") {
        gameState.timeRequiredForNextLevel = calculateNextLevelTime(gameState);
    }
}

// Get progress towards next level (for UI display)
export function getLevelProgress(gameState) {
    const progressionType = gameConfig.levels.progressionType || "points";
    
    if (progressionType === "hybrid" || progressionType === "time") {
        if (!gameState.levelStartTime) return { progress: 0, timeRemaining: 45 };
        
        const currentTime = Date.now() / 1000;
        const timeInLevel = currentTime - gameState.levelStartTime;
        const timeRequired = gameState.timeRequiredForNextLevel;
        const progress = Math.min(timeInLevel / timeRequired, 1.0);
        const timeRemaining = Math.max(0, timeRequired - timeInLevel);
        
        return { 
            progress: progress, 
            timeRemaining: timeRemaining,
            timeRequired: timeRequired,
            activity: gameState.levelActivity 
        };
    } else {
        // Points-based progress
        const currentLevel = gameState.currentLevel;
        const thresholds = gameConfig.levels.thresholds;
        
        if (currentLevel >= thresholds.length - 1) {
            // Beyond defined thresholds
            const lastThreshold = thresholds[thresholds.length - 1];
            const pointsInCurrentLevel = (gameState.score - lastThreshold) % 100;
            return { progress: pointsInCurrentLevel / 100, pointsRemaining: 100 - pointsInCurrentLevel };
        } else {
            const currentThreshold = thresholds[currentLevel];
            const nextThreshold = thresholds[currentLevel + 1];
            const pointsInLevel = gameState.score - currentThreshold;
            const pointsRequired = nextThreshold - currentThreshold;
            return { progress: pointsInLevel / pointsRequired, pointsRemaining: pointsRequired - pointsInLevel };
        }
    }
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
    let deltaTime = currentTime - (calculateDeltaTimeMultiplier.lastTime || currentTime);
    calculateDeltaTimeMultiplier.lastTime = currentTime;
    
    // Import mobile config if available
    const mobileConfig = (typeof gameConfig !== 'undefined' && gameConfig.gameplay?.mobile) ? 
                        gameConfig.gameplay.mobile : 
                        { minDeltaTime: 8, maxDeltaTime: 33, refreshRateSmoothing: 0.8, maxRefreshRateMultiplier: 1.2 };
    
    // Clamp delta time to prevent extreme values on mobile
    deltaTime = Math.max(mobileConfig.minDeltaTime, Math.min(mobileConfig.maxDeltaTime, deltaTime));
    
    // Calculate multiplier to normalize to target FPS
    const targetFrameTime = 1000 / targetFPS; // 16.67ms for 60fps
    let multiplier = deltaTime / targetFrameTime;
    
    // Improved clamping for high refresh rate devices (like iPhone 15 Pro Max at 120Hz)
    // More aggressive smoothing for mobile devices to prevent speed spikes
    const isHighRefreshRate = multiplier < 0.6; // Likely running at 120Hz or higher
    
    if (isHighRefreshRate) {
        // For high refresh rate devices, use mobile config limits
        multiplier = Math.min(Math.max(multiplier, 0.3), mobileConfig.maxRefreshRateMultiplier);
        
        // Apply additional smoothing for high refresh rate devices
        if (!calculateDeltaTimeMultiplier.smoothedMultiplier) {
            calculateDeltaTimeMultiplier.smoothedMultiplier = multiplier;
        }
        
        // Smooth the multiplier over time to prevent jerky movement
        const smoothingFactor = mobileConfig.refreshRateSmoothing; // Use config value
        calculateDeltaTimeMultiplier.smoothedMultiplier = 
            calculateDeltaTimeMultiplier.smoothedMultiplier * smoothingFactor + 
            multiplier * (1 - smoothingFactor);
        
        multiplier = calculateDeltaTimeMultiplier.smoothedMultiplier;
    } else {
        // Standard clamping for normal refresh rates
        multiplier = Math.min(Math.max(multiplier, 0.1), 3.0);
    }
    
    return multiplier;
}

// Update game state timers
export function updateGameStateTimers(gameState, deltaTimeMultiplier) {
    // Update elapsed time for timer-based systems
    if (gameState.elapsedTime === undefined) {
        gameState.elapsedTime = 0;
    }
    gameState.elapsedTime += deltaTimeMultiplier / 60; // Convert frames to seconds
    
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
    
    // Update horizontal speed modification timer
    if (gameState.horizontalSpeedModActive && gameState.horizontalSpeedModTimer > 0) {
        gameState.horizontalSpeedModTimer -= deltaTimeMultiplier;
        if (gameState.horizontalSpeedModTimer <= 0) {
            gameState.horizontalSpeedModActive = false;
            gameState.horizontalSpeedModTimer = 0;
            // Restore original horizontal speed reduction
            gameState.horizontalSpeedReduction = gameState.originalHorizontalSpeedReduction;
            addNotification(gameState, `🎯 Trajectory Effect Expired`, 120, '#00FFFF');
        }
    }
    
    // Update fall angle modification timer
    if (gameState.fallAngleModActive && gameState.fallAngleModTimer > 0) {
        gameState.fallAngleModTimer -= deltaTimeMultiplier;
        if (gameState.fallAngleModTimer <= 0) {
            gameState.fallAngleModActive = false;
            gameState.fallAngleModTimer = 0;
            // Restore original fall angle settings
            gameState.fallAngleMin = gameState.originalFallAngleMin;
            gameState.fallAngleMax = gameState.originalFallAngleMax;
            gameState.allowUpwardMovement = gameState.originalAllowUpwardMovement;
            addNotification(gameState, `📐 Angle Effect Expired`, 120, '#FF6B35');
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
    
    // Update reverse gravity timer
    if (gameState.reverseGravityActive && gameState.reverseGravityTimer > 0) {
        gameState.reverseGravityTimer -= deltaTimeMultiplier;
        if (gameState.reverseGravityTimer <= 0) {
            gameState.reverseGravityActive = false;
            gameState.reverseGravityTimer = 0;
            addNotification(gameState, `🔄 Reverse Gravity Expired`, 120, '#8B00FF');
        }
    }
}

// Notification system - updated to use HTML notifications
export function addNotification(gameState, message, duration = 180, color = '#FFD700') {
    // Convert frame-based duration to milliseconds (assuming 60fps)
    const durationMs = Math.round((duration / 60) * 1000);
    
    // Map color to notification type for better styling
    let notificationType = 'activation';
    
    // Parse message for better type detection
    const lowerMessage = message.toLowerCase();
    
    // Determine if duplicates should be allowed based on message type
    let allowDuplicates = false;
    
    // Check if this should be suppressed (effects handled by persistent notifications or unwanted spam)
    const shouldSuppress = 
        // Effects with persistent versions
        lowerMessage.includes('shield active') ||
        lowerMessage.includes('projectiles frozen') ||
        lowerMessage.includes('speed boost') ||
        lowerMessage.includes('time slow') ||
        lowerMessage.includes('reverse gravity') ||
        lowerMessage.includes('chicken food applied') ||
        lowerMessage.includes('shadowbolt applied') ||
        // Spell activations/expirations (persistent notifications handle these)
        lowerMessage.includes('activated') ||
        lowerMessage.includes('expired') ||
        lowerMessage.includes('cast') ||
        // Individual healing messages (HOT effect is shown persistently)
        (lowerMessage.includes('heal') && lowerMessage.includes('+') && lowerMessage.includes('hp')) ||
        // Generic activation messages for effects with persistent versions
        (lowerMessage.includes('applied') && (
            lowerMessage.includes('shield') ||
            lowerMessage.includes('freeze') ||
            lowerMessage.includes('slow') ||
            lowerMessage.includes('gravity') ||
            lowerMessage.includes('chicken')
        ));

    // Skip unwanted notifications
    if (shouldSuppress) {
        console.log(`Suppressing notification: ${message}`);
        return;
    }

    // Use message content for better detection
    if (lowerMessage.includes('damage') || lowerMessage.includes('fireball') || lowerMessage.includes('hit') || lowerMessage.includes('-') && lowerMessage.includes('hp')) {
        notificationType = 'damage';
        allowDuplicates = true; // Allow damage notifications to stack
    }
    else if (lowerMessage.includes('heal') || lowerMessage.includes('chicken') || lowerMessage.includes('+') && lowerMessage.includes('hp')) {
        notificationType = 'healing';
        allowDuplicates = true; // Allow healing notifications to stack
    }
    else if (lowerMessage.includes('frozen') || lowerMessage.includes('freeze') || lowerMessage.includes('frost') || lowerMessage.includes('ice')) {
        notificationType = 'freeze';
        allowDuplicates = false; // Don't spam freeze notifications
    }
    else if (lowerMessage.includes('speed') || lowerMessage.includes('boost') || lowerMessage.includes('⚡')) {
        notificationType = 'boost';
        allowDuplicates = false; // Don't spam speed notifications
    }
    else if (lowerMessage.includes('blocked') || lowerMessage.includes('shield') || lowerMessage.includes('🛡️')) {
        notificationType = 'success';
        allowDuplicates = true; // Allow shield block notifications
    }
            else if (lowerMessage.includes('flask of titans') || lowerMessage.includes('restored')) {
            notificationType = 'flask_of_titans';
            allowDuplicates = false; // Don't spam flask of titans
    }
    else if (lowerMessage.includes('teleport') || lowerMessage.includes('gravity') || lowerMessage.includes('trajectory')) {
        notificationType = 'teleport';
        allowDuplicates = false; // Don't spam teleport/gravity
    }
    else if (lowerMessage.includes('cooldown') || lowerMessage.includes('wait')) {
        notificationType = 'cooldown';
        allowDuplicates = false; // Don't spam cooldown warnings
    }
    else if (lowerMessage.includes('victory') || lowerMessage.includes('complete') || lowerMessage.includes('🏆')) {
        notificationType = 'success';
        allowDuplicates = true; // Allow victory notifications
    }
    else if (lowerMessage.includes('activated') || lowerMessage.includes('applied') || lowerMessage.includes('cast')) {
        notificationType = 'activation';
        allowDuplicates = false; // Don't spam activation notifications
    }
    else {
        // Fallback to color-based detection
        if (color === '#FF0000' || color === '#FF4500') {
            notificationType = 'damage';
        } 
        else if (color === '#00BFFF' || color === '#87CEEB') {
            notificationType = 'freeze';
        } 
        else if (color === '#FFD700' || color === '#00FF00' || color === '#32CD32') {
            notificationType = 'success';
        } 
        else if (color === '#FF69B4') {
            notificationType = 'flask_of_titans';
        } 
        else if (color === '#4169E1' || color === '#8A2BE2') {
            notificationType = 'activation';
        }
        else if (color === '#00FFFF' || color === '#FF6B35' || color === '#8B00FF' || color === '#9370DB') {
            notificationType = 'teleport';
        }
    }
    
    // Use the new HTML notification system
    if (typeof window !== 'undefined' && window.notificationSystem) {
        window.notificationSystem.showSpellNotification(message, durationMs, notificationType, {
            allowDuplicates: allowDuplicates
        });
    } else {
        console.warn('Notification system not available, message:', message);
    }
}

export function updateNotifications(gameState, deltaTimeMultiplier) {
    // Notifications now handled by HTML+CSS notification system
    // This function is kept for backward compatibility but does nothing
}

// ===== FALL ANGLE CALCULATION SYSTEM =====
// Dynamic fall angle calculation based on game state

export function calculateFallAngle(gameState) {
    // Check if upward movement is allowed and randomly decide
    if (gameState.allowUpwardMovement && Math.random() < 0.1) { // 10% chance for upward movement
        // Calculate upward angle (135° to 225°)
        const upwardRange = gameState.upwardAngleMax - gameState.upwardAngleMin;
        const upwardAngle = gameState.upwardAngleMin + (Math.random() * upwardRange);
        return upwardAngle * (Math.PI / 180); // Convert to radians
    } else {
        // Calculate normal downward angle
        const angleRange = gameState.fallAngleMax - gameState.fallAngleMin;
        const angle = gameState.fallAngleMin + (Math.random() * angleRange);
        return angle * (Math.PI / 180); // Convert to radians
    }
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
        // Enhanced base sizes for better mobile experience
        const basePlayerWidth = this.deviceType === 'mobile' ? 70 : 80;  // Slightly larger for mobile
        const baseItemSize = this.deviceType === 'mobile' ? 70 : 80;     // Larger items on mobile
        const basePowerUpSize = this.deviceType === 'mobile' ? 80 : 90;  // Larger power-ups
        const baseProjectileSize = this.deviceType === 'mobile' ? 60 : 70; // Appropriate projectile size
        
        // Player aspect ratio is 1:2 (width:height) based on 250x500 original image
        const playerAspectRatio = 0.5; // width/height = 250/500 = 0.5
        
        this.sizes = {
            // Player sizes (maintaining proper aspect ratio)
            player: {
                width: Math.round(basePlayerWidth * this.uniformScale),
                height: Math.round((basePlayerWidth / playerAspectRatio) * this.uniformScale), // height = width / 0.5 = width * 2
                speed: Math.round((this.deviceType === 'mobile' ? 16 : 12) * this.uniformScale) // Higher speed for mobile touch
            },
            
            // Item sizes
            item: {
                base: Math.round(baseItemSize * this.uniformScale),
                powerUp: Math.round(basePowerUpSize * this.uniformScale),
                projectile: Math.round(baseProjectileSize * this.uniformScale)
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
        
        // Enhanced mobile-specific adjustments
        if (this.deviceType === 'mobile') {
            // Make touch targets appropriately sized (maintain aspect ratio)
            const mobileScale = 1.3; // Increased from 1.2 to 1.3 for better visibility
            this.sizes.player.width = Math.round(this.sizes.player.width * mobileScale);
            this.sizes.player.height = Math.round(this.sizes.player.height * mobileScale);
            this.sizes.item.base = Math.round(this.sizes.item.base * 1.2); // Increased scaling
            this.sizes.item.powerUp = Math.round(this.sizes.item.powerUp * 1.2);
            this.sizes.item.projectile = Math.round(this.sizes.item.projectile * 1.1); // Keep projectiles reasonable
            this.sizes.ui.spellIconSize = Math.round(this.sizes.ui.spellIconSize * 1.4); // Larger touch targets
            
            // Increase spacing on mobile for easier gameplay
            this.sizes.spacing.minYSpacing = Math.round(this.sizes.spacing.minYSpacing * 1.4); // More spacing
            
            // Ensure minimum sizes for high-DPI displays
            const minItemSize = 60; // Minimum item size in pixels
            if (this.sizes.item.base < minItemSize) {
                const scaleFactor = minItemSize / this.sizes.item.base;
                this.sizes.item.base = minItemSize;
                this.sizes.item.powerUp = Math.round(this.sizes.item.powerUp * scaleFactor);
                this.sizes.item.projectile = Math.round(this.sizes.item.projectile * scaleFactor);
            }
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

// ===== CACHE BUSTING UTILITIES =====

// Generate cache-busted URL for any resource
export function getCacheBustedUrl(url, forceTimestamp = false) {
    if (!cacheConfig.enableCacheBusting) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    
    if (forceTimestamp || cacheConfig.useTimestampUrls) {
        // Use timestamp for immediate cache busting (development)
        return `${url}${separator}t=${Date.now()}`;
    } else if (cacheConfig.useVersionedUrls) {
        // Use version for controlled cache busting (production)
        return `${url}${separator}v=${GAME_VERSION}`;
    }
    
    return url;
}

// Force reload of critical game resources
export function reloadGameResources() {
    console.log('🔄 Forcing reload of game resources...');
    
    // List of critical resources to reload
    const criticalResources = [
        'game-modular.js',
        'config/gameConfig.js',
        'data/gameItems.js',
        'data/playerSpells.js',
        'systems/spellSystem.js'
    ];
    
    // Force reload each resource
    criticalResources.forEach(resource => {
        const script = document.createElement('script');
        script.type = 'module';
        script.src = getCacheBustedUrl(resource, true); // Force timestamp
        document.head.appendChild(script);
        
        // Remove after loading to clean up DOM
        script.onload = () => {
            setTimeout(() => document.head.removeChild(script), 1000);
        };
    });
}

// Check if game version has changed and prompt for refresh
export function checkGameVersion() {
    const STORAGE_KEY = 'efto_game_version';
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    if (storedVersion && storedVersion !== GAME_VERSION) {
        console.log(`🎮 Game updated: ${storedVersion} → ${GAME_VERSION}`);
        
        // Show update notification
        if (typeof addNotification !== 'undefined' && window.gameState) {
            addNotification(window.gameState, `🎮 Game Updated to v${GAME_VERSION}! Refresh recommended.`, 300, '#00FF00');
        }
        
        // For mobile devices, show more prominent update notice
        if (responsiveScaler.deviceType === 'mobile') {
            showMobileUpdatePrompt();
        }
    }
    
    // Store current version
    localStorage.setItem(STORAGE_KEY, GAME_VERSION);
}

// Show mobile-specific update prompt
function showMobileUpdatePrompt() {
    // Create update prompt overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.9);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: Arial, sans-serif;
    `;
    
    const prompt = document.createElement('div');
    prompt.style.cssText = `
        background: #1a1a1a;
        border: 3px solid #4ECDC4;
        border-radius: 15px;
        padding: 30px;
        text-align: center;
        max-width: 90%;
        color: white;
    `;
    
    prompt.innerHTML = `
        <h2 style="color: #4ECDC4; margin: 0 0 20px 0;">🎮 Game Updated!</h2>
        <p style="margin: 0 0 20px 0;">New version ${GAME_VERSION} is available!</p>
        <p style="margin: 0 0 30px 0; color: #ccc;">Refresh to get the latest features and fixes.</p>
        <button id="refreshBtn" style="
            background: #4ECDC4;
            color: #1a1a1a;
            border: none;
            padding: 15px 30px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            margin-right: 10px;
        ">🔄 Refresh Now</button>
        <button id="laterBtn" style="
            background: transparent;
            color: #ccc;
            border: 2px solid #666;
            padding: 13px 25px;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
        ">Later</button>
    `;
    
    overlay.appendChild(prompt);
    document.body.appendChild(overlay);
    
    // Handle button clicks
    document.getElementById('refreshBtn').onclick = () => {
        clearGameCache();
        window.location.reload(true);
    };
    
    document.getElementById('laterBtn').onclick = () => {
        document.body.removeChild(overlay);
    };
}

// Clear all game-related cache
export function clearGameCache() {
    console.log('🧹 Clearing game cache...');
    
    // Clear localStorage game data (keep high scores)
    const keysToKeep = [HIGH_SCORES_KEY, 'efto_settings', 'efto_audio_settings'];
    const allKeys = Object.keys(localStorage);
    
    allKeys.forEach(key => {
        if (key.startsWith('efto_') && !keysToKeep.includes(key)) {
            localStorage.removeItem(key);
        }
    });
    
    // Clear any cached assets if using Cache API
    if ('caches' in window) {
        caches.keys().then(cacheNames => {
            cacheNames.forEach(cacheName => {
                if (cacheName.includes('efto') || cacheName.includes('game')) {
                    caches.delete(cacheName);
                    console.log(`🗑️ Cleared cache: ${cacheName}`);
                }
            });
        });
    }
    
    // Force browser to not use cached resources on next load
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(registrations => {
            registrations.forEach(registration => {
                registration.update(); // Force service worker update
            });
        });
    }
} 