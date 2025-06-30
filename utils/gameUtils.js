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

// Mathematical formula for speed progression with diminishing returns every 5 levels
// Strategy: Start fast, then slow down the rate of increase every 5 levels
function calculateSpeedFormula(level) {
    // Optional safety cap to prevent extreme values (can be disabled)
    const enableSafetyCap = gameConfig.levels.enableSafetyCap !== false; // Default: enabled
    const safetyCap = gameConfig.levels.safetyCap || 100.0; // Default: 100x max
    
    // Base speed for level 0
    const baseSpeed = gameConfig.levels.formulaBase;
    
    // Calculate speed using tier-based diminishing returns
    let speed = baseSpeed;
    let currentLevel = 0;
    
    // Define speed increase per level for each tier (aggressive progression)
    const tierIncrements = [
        { maxLevel: 5,  increment: 0.5 },   // Levels 1-5:  Fast start (+0.5x per level)
        { maxLevel: 10, increment: 0.4 },   // Levels 6-10:  Steady ramp (+0.4x per level)
        { maxLevel: 15, increment: 0.5 },   // Levels 11-15: Accelerating (+0.5x per level)
        { maxLevel: 20, increment: 0.4 },   // Levels 16-20: Strong ramp (+0.4x per level) → ~10x at level 20
        { maxLevel: 25, increment: 0.6 },   // Levels 21-25: Very aggressive (+0.6x per level)
        { maxLevel: 30, increment: 0.6 },   // Levels 26-30: Maximum aggression (+0.6x per level) → ~20x at level 30
        { maxLevel: 999, increment: 0.3 }   // Levels 31+:   Moderate late-game (+0.3x per level)
    ];
    
    // Apply tier-based progression
    for (const tier of tierIncrements) {
        const levelsInThisTier = Math.min(level - currentLevel, tier.maxLevel - currentLevel);
        if (levelsInThisTier <= 0) break;
        
        speed += levelsInThisTier * tier.increment;
        currentLevel += levelsInThisTier;
        
        if (currentLevel >= level) break;
    }
    
    // Fine-tune specific early levels for smooth progression
    const precisionAdjustments = {
        1: 0.0,   // Level 1: 1.7x (1.2 + 0.5 + 0.0)
        2: 0.1,   // Level 2: 2.3x (1.2 + 1.0 + 0.1) 
        3: 0.0,   // Level 3: 2.7x (1.2 + 1.5 + 0.0)
        4: 0.1,   // Level 4: 3.3x (1.2 + 2.0 + 0.1)
        5: 0.0,   // Level 5: 3.7x (1.2 + 2.5 + 0.0)
        10: 0.1,  // Level 10: 5.9x fine-tuning
        15: 0.0,  // Level 15: 8.2x fine-tuning
        20: 0.0   // Level 20: 10.2x fine-tuning
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
        
        // Apply speed reduction with cap to preserve bullet time access
        const previousReduction = gameState.permanentSpeedReductionFromSets;
        const newTotalReduction = previousReduction + speedReduction;
        const maxReduction = gameConfig.dragonstalker.maxSpeedReduction || 18.0; // Default to 18x if not configured
        
        if (newTotalReduction <= maxReduction) {
            gameState.permanentSpeedReductionFromSets = newTotalReduction;
        } else {
            // Cap the reduction to preserve bullet time access
            const allowedReduction = Math.max(0, maxReduction - previousReduction);
            gameState.permanentSpeedReductionFromSets = previousReduction + allowedReduction;
            
            if (allowedReduction > 0) {
                console.log(`🛡️ Dragonstalker speed reduction capped to preserve bullet time access (applied: ${allowedReduction.toFixed(1)}x of ${speedReduction.toFixed(1)}x)`);
            } else {
                console.log(`🛡️ No speed reduction applied - maximum reached to preserve bullet time access`);
            }
        }
        
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
        
        // Increase dodge rating by 1% for completing Dragonstalker set
        const dodgeIncrease = 0.01; // 1%
        const oldDodgeRating = gameState.dodgeRating;
        gameState.dodgeRating = Math.min(gameState.dodgeRating + dodgeIncrease, gameState.dodgeRatingCap);
        const actualDodgeIncrease = gameState.dodgeRating - oldDodgeRating;
        
        if (actualDodgeIncrease > 0) {
            const dodgePercent = Math.round(actualDodgeIncrease * 100);
            const newDodgePercent = Math.round(gameState.dodgeRating * 100);
            addNotification(gameState, `💨 DODGE RATING INCREASED! +${dodgePercent}% (Now: ${newDodgePercent}%)`, 300, '#00FF00');
            console.log(`💨 Dodge rating increased by ${dodgePercent}% to ${newDodgePercent}% (${gameState.dodgeRating.toFixed(3)})`);
        } else {
            const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
            addNotification(gameState, `💨 DODGE RATING MAXED! (${maxDodgePercent}%)`, 240, '#00FF00');
            console.log(`💨 Dodge rating already at maximum: ${maxDodgePercent}%`);
        }
        
        // Add completion notification with actual reduction applied
        const actualReduction = gameState.permanentSpeedReductionFromSets - previousReduction;
        const reductionPercentDisplay = Math.round(reductionPercent * 100);
        const bulletTimePreserved = gameState.permanentSpeedReductionFromSets < maxReduction;
        
        let notificationMessage = `🏆 DRAGONSTALKER SET #${gameState.dragonstalkerCompletions} COMPLETE! -${actualReduction.toFixed(1)}x Permanent Speed Reduction!`;
        if (!bulletTimePreserved) {
            notificationMessage += ' [Max Reduction Reached]';
        }
        
        addNotification(gameState, notificationMessage, 480, '#FFD700');
        
        console.log(`🏆 Dragonstalker set ${gameState.dragonstalkerCompletions} completed! Speed reduction: -${actualReduction.toFixed(1)}x (Total: -${gameState.permanentSpeedReductionFromSets.toFixed(1)}x)`);
        
        if (bulletTimePreserved) {
            console.log(`🎯 Bullet time access preserved - can still reach ${(gameConfig.levels.maxLevelSpeedMultiplier - gameState.permanentSpeedReductionFromSets).toFixed(1)}x speed`);
        }
        
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

// Calculate resolution scaling factor for consistent gameplay across different screen sizes
export function calculateResolutionScale(canvas) {
    if (!gameConfig?.gameplay?.independence?.enabled) {
        return { x: 1, y: 1, average: 1 };
    }
    
    const config = gameConfig.gameplay.independence;
    const currentWidth = canvas.logicalWidth || 
                        (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                         canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                         gameConfig.canvas.desktop.width);
    const currentHeight = canvas.logicalHeight || 
                         (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.height :
                          canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.height :
                          gameConfig.canvas.desktop.height);
    
    // Calculate scaling factors based on reference resolution
    let scaleX = currentWidth / config.referenceWidth;
    let scaleY = currentHeight / config.referenceHeight;
    
    // Apply scaling limits
    scaleX = Math.max(config.minResolutionScale, Math.min(config.maxResolutionScale, scaleX));
    scaleY = Math.max(config.minResolutionScale, Math.min(config.maxResolutionScale, scaleY));
    
    // Calculate average scale for uniform scaling
    const averageScale = (scaleX + scaleY) / 2;
    
    return {
        x: scaleX,
        y: scaleY,
        average: averageScale,
        width: currentWidth,
        height: currentHeight,
        referenceWidth: config.referenceWidth,
        referenceHeight: config.referenceHeight
    };
}

// Calculate comprehensive scaling multiplier that combines frame rate and resolution independence
export function calculateUniversalMultiplier(canvas, targetFPS = 60) {
    const frameMultiplier = calculateDeltaTimeMultiplier(targetFPS);
    const resolutionScale = calculateResolutionScale(canvas);
    
    return {
        frame: frameMultiplier,
        resolution: resolutionScale,
        // Combined multiplier for speeds (frame rate * resolution)
        speed: frameMultiplier * resolutionScale.average,
        // Size multiplier (resolution only, not frame rate dependent)
        size: resolutionScale.average,
        // Position multiplier for spawn coordinates
        position: resolutionScale
    };
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
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            window.addBuff('timeSlow', '🐉 Zandalari Blessing', 'Time Slowed & +20% Points', gameState.timeSlowTimer, 'slow');
        }
        
        gameState.timeSlowTimer -= deltaTimeMultiplier;
        if (gameState.timeSlowTimer <= 0) {
            gameState.timeSlowActive = false;
            gameState.timeSlowMultiplier = 1.0;
        }
    }
    
    // Update freeze time timer
    if (gameState.freezeTimeActive && gameState.freezeTimeTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            window.addBuff('freezeTime', '❄️ Freeze Time', 'All Items Frozen', gameState.freezeTimeTimer, 'freeze');
        }
        
        gameState.freezeTimeTimer -= deltaTimeMultiplier;
        if (gameState.freezeTimeTimer <= 0) {
            gameState.freezeTimeActive = false;
        }
    }
    
    // Update speed increase timer
    if (gameState.speedIncreaseActive && gameState.speedIncreaseTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const speedPercent = Math.min(gameState.currentSpeedIncreasePercent, 100);
            window.addBuff('speedBoost', '⚡ Speed Boost', `+${speedPercent}% Game Speed`, gameState.speedIncreaseTimer, 'speed');
        }
        
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
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            window.addBuff('shield', '🛡️ Shield', 'Blocks All Damage', gameState.shieldTimer, 'shield');
        }
        
        gameState.shieldTimer -= deltaTimeMultiplier;
        if (gameState.shieldTimer <= 0) {
            gameState.shieldActive = false;
            gameState.shieldTimer = 0;
        }
    }
    
    // Update dodge boost timer
    if (gameState.dodgeBoostTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const tempDodgePercent = Math.round((gameState.temporaryDodgeBoost || 0) * 100);
            window.addBuff('dodgeBoost', '🐒 Aspect of the Monkey', `+${tempDodgePercent}% Dodge`, gameState.dodgeBoostTimer, 'dodge');
        }
        
        gameState.dodgeBoostTimer -= deltaTimeMultiplier;
        if (gameState.dodgeBoostTimer <= 0) {
            gameState.temporaryDodgeBoost = 0;
            gameState.dodgeBoostTimer = 0;
            addNotification(gameState, `🐒💨 Aspect of the Monkey Expired`, 180, '#FF8C00');
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
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const activeDots = gameState.shadowboltDots.length;
            const maxDuration = Math.max(...gameState.shadowboltDots.map(dot => dot.remainingDuration));
            window.addBuff('shadowboltDot', '🌑 Shadowbolt DOT', `${activeDots} stack${activeDots > 1 ? 's' : ''} active`, maxDuration, 'damage');
        }
        
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
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const activeHots = gameState.chickenFoodHots.length;
            const maxDuration = Math.max(...gameState.chickenFoodHots.map(hot => hot.remainingDuration));
            window.addBuff('chickenFoodHot', '🐔 Chicken Food HOT', `${activeHots} stack${activeHots > 1 ? 's' : ''} active`, maxDuration, 'food');
        }
        
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
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            window.addBuff('reverseGravity', '🔄 Reverse Gravity', 'Items Fall Upward', gameState.reverseGravityTimer, 'gravity');
        }
        
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
        lowerMessage.includes('all items frozen') ||
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
        // Chicken Food HOT notifications (shown persistently in buff tracker)
        (lowerMessage.includes('chicken food') && lowerMessage.includes('+') && lowerMessage.includes('hp')) ||
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
    else if (lowerMessage.includes('dodge') || lowerMessage.includes('aspect of the monkey') || lowerMessage.includes('evasion') || lowerMessage.includes('💨')) {
        notificationType = 'dodge';
        allowDuplicates = false; // Don't spam dodge notifications
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
        // Import canvas config
        this.canvasConfig = gameConfig.canvas;
        
        // Reference playable area for scaling (THE KING 👑)
        this.basePlayableArea = this.canvasConfig.scaling.basePlayableArea;
        
        // Device type detection
        this.deviceType = this.detectDeviceType();
        this.orientation = this.getOrientation();
        
        // Get canvas dimensions for current device
        this.canvasDimensions = this.getCanvasDimensions();
        
        // Calculate playable area for current device
        this.playableArea = {
            width: this.canvasDimensions.playableWidth,
            height: this.canvasDimensions.playableHeight
        };
        
        // Scale factors based on playable area
        this.scaleX = this.playableArea.width / this.basePlayableArea.width;
        this.scaleY = this.playableArea.height / this.basePlayableArea.height;
        this.uniformScale = (this.scaleX + this.scaleY) / 2; // Average of both scales for uniform scaling
        
        // Apply device-specific scale adjustments
        this.applyDeviceScaleAdjustments();
        
        // Element sizes (calculated based on playable area scale)
        this.sizes = {};
        this.calculateElementSizes();
        
        console.log(`🎮 ResponsiveScaler initialized:
            Device: ${this.deviceType}
            Canvas: ${this.canvasDimensions.width}x${this.canvasDimensions.height}
            Playable Area: ${this.playableArea.width}x${this.playableArea.height}
            Scale: ${this.uniformScale.toFixed(2)}x (${this.scaleX.toFixed(2)}x width, ${this.scaleY.toFixed(2)}x height)`);
            
        // Listen for orientation changes
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateScaling();
            }, 100);
        });
        
        // Listen for resize events with quality monitoring
        window.addEventListener('resize', () => {
            this.updateScaling();
            
            // Recalculate AssetManager constraints on significant resize
            if (window.assetManager) {
                window.assetManager.recalculateScalingConstraints();
                
                // Log quality assessment for large displays
                const qualityAssessment = window.assetManager.getQualityAssessment();
                if (qualityAssessment && qualityAssessment.displayScale > 1.8) {
                    console.log(`🖼️ Display Quality Assessment:
                        Quality: ${qualityAssessment.overallQuality}
                        Display Scale: ${qualityAssessment.displayScale.toFixed(2)}x
                        Avg Original Size: ${qualityAssessment.averageOriginalSize}px
                        Recommendation: ${qualityAssessment.recommendation}`);
                }
            }
        });
    }
    
    detectDeviceType() {
        const userAgent = navigator.userAgent;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const maxDimension = Math.max(width, height);
        const detection = this.canvasConfig.deviceDetection;
        
        // Touch-first detection approach
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobileUserAgent = detection.mobileUserAgents.some(agent => 
            userAgent.includes(agent)
        );
        
        // Primary: Check if device has touch capability
        if (hasTouch || isMobileUserAgent) {
            // Touch device - determine mobile vs tablet based on size
            if (maxDimension <= detection.mobileMaxWidth) {
                return 'mobile';
            } else if (maxDimension <= detection.tabletMaxWidth) {
                return 'tablet';
            } else {
                // Large touch device - still considered tablet
                return 'tablet';
            }
        } else {
            // No touch - desktop regardless of size
            return 'desktop';
        }
    }
    
    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    getCanvasDimensions() {
        // Return canvas dimensions based on device type
        return this.canvasConfig[this.deviceType];
    }
    
    applyDeviceScaleAdjustments() {
        // Apply device-specific scaling adjustments
        switch (this.deviceType) {
            case 'mobile':
                // Mobile needs significant size reduction due to large playable area percentage (60% vs 30% desktop)
                // The mobile playableHeight (480px) is much larger than desktop (270px), causing uniformScale ~1.0
                // We need to scale DOWN to get appropriately sized mobile items
                this.uniformScale *= 0.8; // Moderate reduction for proper mobile sizing
                break;
                
            case 'tablet':
                // Tablet gets moderate scaling adjustment
                this.uniformScale *= 0.85; // Moderate reduction from desktop size
                break;
                
            case 'desktop':
                // Desktop uses base scaling with no additional adjustments
                break;
        }
        
        // Ensure scale stays within reasonable bounds
        this.uniformScale = Math.max(0.3, Math.min(2.0, this.uniformScale));
    }
    
    calculateElementSizes() {
        // Balanced base sizes for mobile and desktop
        // These provide good mobile touch interaction without making desktop items too large
        const basePlayerWidth = 60;      // Reduced from 80
        const baseItemSize = 70;         // Moderate increase from 55 for mobile visibility  
        const basePowerUpSize = 80;      // Moderate increase from 65 - balanced for mobile/desktop
        const baseProjectileSize = 60;   // Moderate increase from 50 for mobile visibility
        
        // Player aspect ratio is 1:2 (width:height) based on 250x500 original image
        const playerAspectRatio = 0.5;
        
        this.sizes = {
            // Player sizes (maintaining proper aspect ratio)
            player: {
                width: Math.round(basePlayerWidth * this.uniformScale),
                height: Math.round((basePlayerWidth / playerAspectRatio) * this.uniformScale),
                speed: Math.round(12 * this.uniformScale)
            },
            
            // Item sizes (all based on playable area scaling)
            item: {
                base: Math.round(baseItemSize * this.uniformScale),
                powerUp: Math.round(basePowerUpSize * this.uniformScale),
                projectile: Math.round(baseProjectileSize * this.uniformScale)
            },
            
            // UI elements (scaled proportionally)
            ui: {
                healthBarWidth: Math.round(200 * this.uniformScale),
                healthBarHeight: Math.round(20 * this.uniformScale),
                fontSize: Math.round(16 * this.uniformScale),
                notificationFontSize: Math.round(18 * this.uniformScale),
                spellIconSize: Math.round(50 * this.uniformScale)
            },
            
            // Spacing and layout (based on playable area)
            spacing: {
                minYSpacing: Math.round(150 * this.uniformScale),
                borderWidth: Math.max(1, Math.round(2 * this.uniformScale)),
                padding: Math.round(10 * this.uniformScale)
            }
        };
        
        // Device-specific final adjustments (reduced)
        if (this.deviceType === 'mobile') {
            // Make player smaller on mobile
            this.sizes.player.width = Math.round(this.sizes.player.width * 0.8); // 20% smaller
            this.sizes.player.height = Math.round(this.sizes.player.height * 0.8); // 20% smaller
            
            // Ensure minimum sizes for mobile touch interaction but don't go overboard
            const minTouchSize = 60; // Reduced from 75
            if (this.sizes.item.base < minTouchSize) {
                const scaleFactor = minTouchSize / this.sizes.item.base;
                this.sizes.item.base = minTouchSize;
                this.sizes.item.powerUp = Math.round(this.sizes.item.powerUp * scaleFactor);
                this.sizes.item.projectile = Math.round(this.sizes.item.projectile * scaleFactor);
            }
            
            // Smaller spell icons for mobile
            this.sizes.ui.spellIconSize = Math.round(this.sizes.ui.spellIconSize * 0.8); // 20% smaller
        }
        
        console.log(`📏 Element sizes calculated:
            Player: ${this.sizes.player.width}x${this.sizes.player.height}
            Items: ${this.sizes.item.base}px (base), ${this.sizes.item.powerUp}px (power-up), ${this.sizes.item.projectile}px (projectile)
            UI: ${this.sizes.ui.spellIconSize}px (spell icons)`);
    }
    
    updateScaling() {
        // Re-detect device type and recalculate everything
        const oldDeviceType = this.deviceType;
        this.deviceType = this.detectDeviceType();
        this.orientation = this.getOrientation();
        
        // Only recalculate if device type changed
        if (oldDeviceType !== this.deviceType) {
            this.canvasDimensions = this.getCanvasDimensions();
            this.playableArea = {
                width: this.canvasDimensions.playableWidth,
                height: this.canvasDimensions.playableHeight
            };
            
            // Recalculate scale factors
            this.scaleX = this.playableArea.width / this.basePlayableArea.width;
            this.scaleY = this.playableArea.height / this.basePlayableArea.height;
            this.uniformScale = (this.scaleX + this.scaleY) / 2;
            
            this.applyDeviceScaleAdjustments();
            this.calculateElementSizes();
            
            console.log(`🔄 Device type changed from ${oldDeviceType} to ${this.deviceType}, scaling updated`);
        }
    }
    
    // Get the canvas dimensions for the current device
    getCanvasDimensionsForDevice() {
        return this.canvasDimensions;
    }
    
    // Get the playable area dimensions for the current device
    getPlayableAreaDimensions() {
        return this.playableArea;
    }
    
    // Get scaled size for any element type
    getSize(category, property = null) {
        if (property) {
            return this.sizes[category]?.[property] || 1;
        }
        return this.sizes[category] || {};
    }
    
    // Scale a custom value based on playable area
    scale(value) {
        return Math.round(value * this.uniformScale);
    }
    
    // Get device-specific settings
    getDeviceSettings() {
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        return {
            deviceType: this.deviceType,
            orientation: this.orientation,
            scale: this.uniformScale,
            isMobile: this.deviceType === 'mobile',
            isTablet: this.deviceType === 'tablet',
            isDesktop: this.deviceType === 'desktop',
            isTouch: hasTouch,
            isPortrait: this.orientation === 'portrait',
            isLandscape: this.orientation === 'landscape',
            // Touch-specific categories
            isTouchPortrait: hasTouch && this.orientation === 'portrait',
            isTouchLandscape: hasTouch && this.orientation === 'landscape',
            sizes: this.sizes
        };
    }
    
    // Get movable area config - now consistent across all devices
    // The playable-area-based scaling ensures consistent feel
    getMovableAreaConfig() {
        return {
            enabled: true,
            heightPercent: 0.3,     // Consistent 30% across all devices
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
    // Get the correct canvas width - fallback to device-specific width
    const canvasWidth = canvas.logicalWidth || 
                       (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                        canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                        gameConfig.canvas.desktop.width);
    

    
    // Only check for side and top collisions - bottom collision means the item is missed
    return {
        left: item.x <= 0,
        right: item.x + item.width >= canvasWidth,
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
        // Get the correct canvas width - fallback to device-specific width
        const canvasWidth = canvas.logicalWidth || 
                           (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                            canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                            gameConfig.canvas.desktop.width);
        item.x = canvasWidth - item.width; // Correct position
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
        
        // Position correction - get the correct canvas width
        const canvasWidth = canvas.logicalWidth || 
                           (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
                            canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
                            gameConfig.canvas.desktop.width);
        item.x = isLeftWall ? 0 : canvasWidth - item.width;
        
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
    
    // Apply drag to speeds - but preserve speed boost effects
    if (item.baseSpeed && window.gameState && window.gameState.speedIncreaseActive) {
        // When speed boost is active, apply drag to base speed then recalculate final speed
        item.baseSpeed *= linearDrag;
        item.speed = item.baseSpeed * window.gameState.speedIncreaseMultiplier;
    } else {
        // Normal air resistance when no speed boost is active
        item.speed *= linearDrag;
    }
    
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
    
    // Clear localStorage game data (keep high scores and settings)
    const keysToKeep = ['dmtribut_high_scores', 'efto_settings', 'efto_audio_settings'];
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

// ===== GAME MODE UTILITIES =====

// Get current game mode modifiers
export function getGameModeModifiers() {
    // Import settings from settings system if available
    let gameMode = 'normal'; // default
    
    try {
        // Try to import getGameMode function
        if (typeof window !== 'undefined' && window.getGameMode) {
            gameMode = window.getGameMode();
        }
    } catch (error) {
        console.warn('Could not get game mode from settings, using normal mode');
    }
    
    return gameConfig.gameModes[gameMode] || gameConfig.gameModes.normal;
}

// Apply game mode modifier to a value
export function applyGameModeModifier(baseValue, modifierType) {
    const modifiers = getGameModeModifiers().modifiers;
    const modifier = modifiers[modifierType] || 1.0;
    return baseValue * modifier;
}

// Check if current game mode is specific mode
export function isGameMode(mode) {
    try {
        if (typeof window !== 'undefined' && window.getGameMode) {
            return window.getGameMode() === mode;
        }
    } catch (error) {
        console.warn('Could not check game mode');
    }
    return mode === 'normal'; // default
}

// Get current game mode name
export function getCurrentGameModeName() {
    try {
        const currentMode = getGameModeModifiers();
        return currentMode.name || 'Normal Mode';
    } catch (error) {
        return 'Normal Mode';
    }
} 