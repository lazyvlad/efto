import { gameItems } from '../data/gameItems.js';
import { gameConfig, cacheConfig } from '../config/gameConfig.js';
import { GAME_VERSION } from '../config/gameVersion.js';
import { gameClock } from './gameClock.js';
import { levelProgress } from './progression.js';
import { dropShield, shieldBlocks } from './shield.js';

// Calculate level-specific speed multiplier using hybrid progression
export function calculateLevelSpeedMultiplier(gameState) {
    const progressionType = gameConfig.levels.progressionType || "points";
    let currentLevel = 0;
    
    if (progressionType === "xp") {
        // Experience from catching items (levels are counted from 0 in the game state). A boss
        // that still stands holds the level at the end of its zone (levelCap, set by bossSystem).
        const earned = levelProgress(gameState.xp || 0, gameConfig.progression).level;
        currentLevel = Math.min(earned, gameState.levelCap || Infinity) - 1;
    } else if (progressionType === "hybrid" || progressionType === "time") {
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
        gameState.levelStartTime = gameClock.now() / 1000; // Convert to seconds
        gameState.timeRequiredForNextLevel = gameConfig.levels.baseTimePerLevel;
        gameState.levelActivity = {
            collections: 0,
            misses: 0,
            powerUpsCollected: 0,
            damageReceived: 0
        };
    }
    
    const currentTime = gameClock.now() / 1000;
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
            
        }
        
        // Reset all Dragonstalker items for next collection cycle
        dragonstalkerItems.forEach(item => {
            item.collected = 0;
            item.missed = 0;
        });
        
        // Reset tier set counters
        gameState.tierSetCollected = 0;
        gameState.tierSetMissed = 0;
        
        // Increase crit rating by 8% for completing Dragonstalker set
        const critIncrease = 0.08; // 8%
        const oldCritRating = gameState.critRating;
        gameState.critRating = Math.min(gameState.critRating + critIncrease, gameState.critRatingCap);
        const actualIncrease = gameState.critRating - oldCritRating;
        
        if (actualIncrease > 0) {
            const critPercent = Math.round(actualIncrease * 100);
            const newCritPercent = Math.round(gameState.critRating * 100);
            addNotification(gameState, `💥 CRIT RATING INCREASED! +${critPercent}% (Now: ${newCritPercent}%)`, 300, '#FF6B00');
        } else {
            const maxCritPercent = Math.round(gameState.critRatingCap * 100);
            addNotification(gameState, `💥 CRIT RATING MAXED! (${maxCritPercent}%)`, 240, '#FF6B00');
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
        } else {
            const maxDodgePercent = Math.round(gameState.dodgeRatingCap * 100);
            addNotification(gameState, `💨 DODGE RATING MAXED! (${maxDodgePercent}%)`, 240, '#00FF00');
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
    
    if (progressionType === "xp") {
        const { level, into, needed } = levelProgress(gameState.xp || 0, gameConfig.progression);
        // Held at a boss: the level is complete
        if (level > (gameState.levelCap || Infinity)) return { progress: 1, xpInto: needed, xpNeeded: needed };
        return { progress: into / needed, xpInto: into, xpNeeded: needed };
    }
    
    if (progressionType === "hybrid" || progressionType === "time") {
        if (!gameState.levelStartTime) return { progress: 0, timeRemaining: 45 };
        
        const currentTime = gameClock.now() / 1000;
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

// Canvas size in game (logical) units. canvas.width/height are physical pixels and are larger
// than this on high-DPI screens, so game logic must never use them directly.
export function getLogicalCanvasWidth(canvas) {
    return canvas.logicalWidth || 
           (canvas.deviceType === 'mobile' ? gameConfig.canvas.mobile.width :
            canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.width :
            gameConfig.canvas.desktop.width);
}

export function getLogicalCanvasHeight(canvas) {
    return canvas.logicalHeight || 
           (canvas.deviceType === 'mobile' ? (responsiveScaler ? responsiveScaler.canvasDimensions.height : 600) :
            canvas.deviceType === 'tablet' ? gameConfig.canvas.tablet.height :
            gameConfig.canvas.desktop.height);
}

// Resolution scaling factors for a canvas of the given logical size
function resolutionScaleFor(currentWidth, currentHeight) {
    const config = gameConfig.gameplay.independence;

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

// Calculate resolution scaling factor for consistent gameplay across different screen sizes
export function calculateResolutionScale(canvas) {
    if (!gameConfig?.gameplay?.independence?.enabled) {
        return { x: 1, y: 1, average: 1 };
    }

    return resolutionScaleFor(getLogicalCanvasWidth(canvas), getLogicalCanvasHeight(canvas));
}

// Resolution scaling for speeds, sizes and spawn coordinates.
// Frame rate independence is handled by the fixed-timestep loop (see gameClock.js).
export function calculateUniversalMultiplier(canvas) {
    const resolutionScale = calculateResolutionScale(canvas);

    // Fall speeds follow the height of the canvas, so an object takes the same time to cross
    // the screen on a phone (a short canvas) as on the desktop canvas the speeds were tuned on.
    // Desktop itself is unchanged: items keep its resolution scale, projectiles keep 1.
    const desktop = gameConfig.canvas.desktop;
    const heightRatio = getLogicalCanvasHeight(canvas) / desktop.height;
    const desktopItemScale = gameConfig?.gameplay?.independence?.enabled
        ? resolutionScaleFor(desktop.width, desktop.height).average
        : 1;
    
    return {
        resolution: resolutionScale,
        // Multiplier for speeds
        speed: resolutionScale.average,
        // Fall speed of items and power-ups, and of projectiles
        itemFallSpeed: desktopItemScale * heightRatio,
        projectileFallSpeed: heightRatio,
        // Size multiplier
        size: resolutionScale.average,
        // Position multiplier for spawn coordinates
        position: resolutionScale
    };
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
            window.addBuff('timeSlow', 'Zandalari Blessing', 'Time Slowed & +20% Points', gameState.timeSlowTimer, 'slow');
        }
        
        gameState.timeSlowTimer -= deltaTimeMultiplier;
        if (gameState.timeSlowTimer <= 0) {
            gameState.timeSlowActive = false;
            gameState.timeSlowMultiplier = 1.0;
        }
    }
    
    // A mana potion's endless arrows
    if (gameState.endlessArrowsTimer > 0) {
        if (typeof window.addBuff === 'function') {
            window.addBuff('endlessArrows', 'Mana Potion', 'Endless arrows', gameState.endlessArrowsTimer, 'freeze');
        }
        gameState.endlessArrowsTimer -= deltaTimeMultiplier;
        if (gameState.endlessArrowsTimer <= 0) {
            gameState.endlessArrowsTimer = 0;
            if (typeof window.removeBuff === 'function') window.removeBuff('endlessArrows');
        }
    }

    // Update freeze time timer
    if (gameState.freezeTimeActive && gameState.freezeTimeTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            window.addBuff('freezeTime', 'Frost Nova', 'Harmful projectiles frozen', gameState.freezeTimeTimer, 'freeze');
        }
        
        gameState.freezeTimeTimer -= deltaTimeMultiplier;
        if (gameState.freezeTimeTimer <= 0) {
            gameState.freezeTimeActive = false;
        }
    }
    
    // Haste (the speed boost): it runs down, shown among the buffs while it lasts
    if (gameState.hasteTimer > 0) {
        if (typeof window.addBuff === 'function') {
            window.addBuff('speedBoost', 'Haste', 'Moves and shoots faster', gameState.hasteTimer, 'speed');
        }
        gameState.hasteTimer = Math.max(0, gameState.hasteTimer - deltaTimeMultiplier);
    }
    
    // Update shield timer
    if (gameState.shieldActive && gameState.shieldTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const charges = gameState.shieldCharges ?? 1;
            window.addBuff('shield', 'Shield', `Blocks ${charges} more hit${charges === 1 ? '' : 's'}`, gameState.shieldTimer, 'shield');
        }
        
        gameState.shieldTimer -= deltaTimeMultiplier;
        if (gameState.shieldTimer <= 0) dropShield(gameState);
    }
    
    // Update dodge boost timer
    if (gameState.dodgeBoostTimer > 0) {
        // Add/update buff in tracker
        if (typeof window.addBuff === 'function') {
            const tempDodgePercent = Math.round((gameState.temporaryDodgeBoost || 0) * 100);
            window.addBuff('dodgeBoost', 'Aspect of the Monkey', `+${tempDodgePercent}% Dodge`, gameState.dodgeBoostTimer, 'dodge');
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
            window.addBuff('shadowboltDot', 'Shadowbolt DOT', `${activeDots} stack${activeDots > 1 ? 's' : ''} active`, maxDuration, 'damage');
        }
        
        gameState.shadowboltTimer -= deltaTimeMultiplier;
        
        if (gameState.shadowboltTimer <= 0) {
            // Deal damage from all active shadowbolt DOTs
            const activeDots = gameState.shadowboltDots.length;
            const damageThisTick = activeDots * gameState.shadowboltDamagePerTick;
            
            // Check if shield blocks DOT damage
            if (shieldBlocks(gameState)) {
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
            window.addBuff('chickenFoodHot', 'Chicken Food HOT', `${activeHots} stack${activeHots > 1 ? 's' : ''} active`, maxDuration, 'food');
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
            window.addBuff('reverseGravity', 'Reverse Gravity', 'Items Fall Upward', gameState.reverseGravityTimer, 'gravity');
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
    // Early exit for mobile devices - notifications are disabled for performance
    if (typeof window !== 'undefined' && window.notificationSystem && window.notificationSystem.isMobile) {
        return;
    }
    
    // Convert frame-based duration to milliseconds (assuming 60fps)
    const durationMs = Math.round((duration / 60) * 1000);
    
    // Map color to notification type for better styling
    let notificationType = 'activation';
    
    // Parse message for better type detection
    const lowerMessage = message.toLowerCase();
    
    // Determine if duplicates should be allowed based on message type
    let allowDuplicates = false;
    
    // The bar at the top of the play field is for things worth looking away from the action for:
    // a new level, a set piece, a permanent gain, an answer to a button press. Everything below
    // already shows somewhere better - floating text at the player, the health bar, or a timed
    // buff card - so it stays off the bar.
    const shouldSuppress = 
        // Moment-to-moment combat (floating text and the health bar cover these)
        lowerMessage.includes('critical hit') ||
        lowerMessage.includes('% points') ||
        lowerMessage.includes('projectile destroyed') ||
        lowerMessage.includes('dodged') ||
        lowerMessage.includes('blocked') ||
        lowerMessage.includes('shadow damage') ||
        // Timed effects starting and ending (buff cards and the stats panel cover these)
        lowerMessage.includes('aspect of the monkey') ||
        lowerMessage.includes('temp crit') ||
        lowerMessage.includes('temp dodge') ||
        lowerMessage.includes('aftereffect') ||
        /\bended\b/.test(lowerMessage) ||
        ((lowerMessage.includes('trajectory modified') || lowerMessage.includes('fall angles modified')) && !lowerMessage.includes('permanent')) ||
        // Effects with persistent versions
        lowerMessage.includes('shield active') ||
        lowerMessage.includes('all items frozen') ||
        lowerMessage.includes('harmful projectiles frozen') ||
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
    // Only the horizontal component of the angle is used (objects always spawn above the screen
    // and have to fall into view), so the "upward" range acts as a wider sideways drift.
    if (gameState.allowUpwardMovement && Math.random() < 0.1) { // 10% chance for the wide range
        // Calculate angle from the upward range (135° to 225° by default)
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
        
        // Get canvas dimensions for current device (handles dynamic sizing)
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
        
            
        // Listen for orientation changes (mobile-specific)
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.updateScaling();
                // Update mobile pause button visibility on orientation change
                if (window.updateMobilePauseButtonVisibility) {
                    window.updateMobilePauseButtonVisibility();
                }
            }, 100);
        });
        
        // Listen for resize events with quality monitoring
        window.addEventListener('resize', () => {
            this.updateScaling();
            
            // Update mobile pause button visibility on resize
            if (window.updateMobilePauseButtonVisibility) {
                window.updateMobilePauseButtonVisibility();
            }
            
            // Recalculate AssetManager constraints on significant resize
            if (window.assetManager) {
                window.assetManager.recalculateScalingConstraints();
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
        
        // A phone or tablet: touch is how it is pointed at. A laptop that also has a touch
        // screen is still worked with a mouse and keyboard, and gets the desktop field.
        const touchFirst = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

        if ((hasTouch && touchFirst) || isMobileUserAgent) {
            // A phone or small tablet held sideways has the wide field, scaled to fit: the
            // phone's own field is for a screen taller than it is wide
            if (width > height && maxDimension <= detection.mobileMaxWidth) {
                return 'desktop';
            }

            // Touch device - determine mobile vs tablet based on size
            if (maxDimension <= detection.mobileMaxWidth) {
                return 'mobile';
            } else if (maxDimension <= detection.tabletMaxWidth) {
                return 'tablet';
            } else {
                // Large touch device - still considered tablet
                return 'tablet';
            }
        }

        // With a mouse and keyboard, a window wider than it is tall always has the desktop
        // field, however small: zoomed in or with developer tools open it is scaled down, not
        // swapped for the tablet's or the phone's (ui/hudLayout.js scales the interface to it)
        if (width >= height) {
            return 'desktop';
        }

        // Browser devtools/mobile-preview modes can resize the viewport without exposing touch
        // APIs. Classify narrow viewports by size so gameplay scaling matches the mobile UI.
        const minDimension = Math.min(width, height);
        if (minDimension <= 600 && maxDimension <= detection.mobileMaxWidth) {
            return 'mobile';
        }

        if (minDimension <= 900 && maxDimension <= detection.tabletMaxWidth) {
            return 'tablet';
        }

        return 'desktop';
    }
    
    getOrientation() {
        return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
    }
    
    getCanvasDimensions() {
        // Get base canvas dimensions for device type
        const baseConfig = this.canvasConfig[this.deviceType];
        
        // For mobile devices with dynamic sizing, calculate based on viewport
        if (this.deviceType === 'mobile' && baseConfig.height === 'dynamic') {
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const positioning = baseConfig.positioning;
            
            // The field is as wide as the screen: it is drawn larger or smaller than its own
            // width by this much, so a wider phone shows the same field bigger, not more of it
            const displayScale = Math.max(0.5, Math.min(positioning.maxDisplayScale,
                (viewportWidth - 2 * positioning.sideMargin) / baseConfig.width));

            // Calculate available height after UI elements, in the field's own measure
            const availableHeight = (viewportHeight - positioning.topOffset - positioning.bottomOffset - positioning.safeAreaMargin) / displayScale;
            
            // Constrain to min/max bounds
            const constrainedHeight = Math.round(Math.max(positioning.minHeight, Math.min(positioning.maxHeight, availableHeight)));
            
            // Calculate playable height as percentage of total canvas height
            const playableHeight = constrainedHeight * positioning.playableHeightPercent;
            
            
            return {
                width: baseConfig.width,
                height: constrainedHeight,
                aspectRatio: baseConfig.width / constrainedHeight,
                playableWidth: baseConfig.width,
                playableHeight: playableHeight,
                displayScale: displayScale,
                positioning: baseConfig.positioning
            };
        }
        
        // For non-mobile or static configurations, return as-is
        return baseConfig;
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
    
    // Phones: nothing that falls is drawn bigger than the player (items.mobileMaxSizeVsPlayer)
    capToPlayer(size) {
        if (this.deviceType !== 'mobile') return size;

        // Against the hunter's full size: drawn smaller on a phone, he does not shrink the loot
        return Math.min(size, this.sizes.player.fullWidth * gameConfig.items.mobileMaxSizeVsPlayer);
    }
    
    calculateElementSizes() {
        // Responsive border approach - larger boundary for better visibility
        const elementBorderSize = 155; // Larger boundary for substantial game elements
        
        // Player aspect ratio is now 1:1 (square) for new square icon heads
        const playerAspectRatio = 1.0;
        
        // Calculate base sizes - only player uses 125px boundary, items keep original sizes
        const basePlayerWidth = Math.min(125, elementBorderSize); // Player fits within 125px border
        const baseItemSize = 70;         // Keep original item size
        const basePowerUpSize = 80;      // Keep original power-up size
        const baseProjectileSize = 60;   // Keep original projectile size
        
        // Landscape screens draw the hunter (and the bosses, systems/bossSystem.js) smaller
        // (canvas.scaling.objectScale); a phone has its own sizing below. Speeds are not touched.
        this.objectScale = this.deviceType === 'mobile' ? 1 : (this.canvasConfig.scaling.objectScale || 1);
        const drawn = this.uniformScale * this.objectScale;

        this.sizes = {
            // Player sizes (bound to 65px border)
            player: {
                width: Math.round(basePlayerWidth * drawn),
                height: Math.round((basePlayerWidth / playerAspectRatio) * drawn),
                speed: Math.round(12 * this.uniformScale),
                maxBorderSize: Math.round(elementBorderSize * this.uniformScale) // Visual boundary
            },
            
            // Item sizes (all bound to 65px border)
            item: {
                base: Math.round(baseItemSize * this.uniformScale),
                powerUp: Math.round(basePowerUpSize * this.uniformScale),
                projectile: Math.round(baseProjectileSize * this.uniformScale),
                maxBorderSize: Math.round(elementBorderSize * this.uniformScale) // Visual boundary
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
            },
            
            // Visual boundary for consistent sizing
            visualBoundary: {
                size: Math.round(elementBorderSize * this.uniformScale),
                borderWidth: Math.max(2, Math.round(3 * this.uniformScale))
            }
        };
        
        // Device-specific adjustments (maintaining 125px boundary)
        if (this.deviceType === 'mobile') {
            // Ensure all elements respect the 125px boundary on mobile
            const maxMobileSize = Math.round(elementBorderSize * this.uniformScale);
            
            // Cap player size to boundary (now square)
            this.sizes.player.width = Math.min(this.sizes.player.width, maxMobileSize);
            this.sizes.player.height = Math.min(this.sizes.player.height, maxMobileSize); // Square aspect ratio
            
            // Cap player size to boundary (now square)
            this.sizes.player.width = Math.min(this.sizes.player.width, maxMobileSize);
            this.sizes.player.height = Math.min(this.sizes.player.height, maxMobileSize); // Square aspect ratio
            
            // The field is narrow: a smaller hunter has room to step out from under things
            this.sizes.player.fullWidth = this.sizes.player.width;
            this.sizes.player.width = Math.round(this.sizes.player.width * gameConfig.player.mobileScale);
            this.sizes.player.height = Math.round(this.sizes.player.height * gameConfig.player.mobileScale);

            // Falling things keep the proportions they have next to the player on desktop
            // (items.mobileSizeBoost can draw them larger)
            const boost = gameConfig.items.mobileSizeBoost;
            this.sizes.item.base = Math.round(this.sizes.item.base * boost);
            this.sizes.item.powerUp = Math.round(this.sizes.item.powerUp * boost);
            this.sizes.item.projectile = Math.round(this.sizes.item.projectile * boost);
            
            // Smaller spell icons for mobile
            this.sizes.ui.spellIconSize = Math.round(this.sizes.ui.spellIconSize * 0.8);
        }
        
    }
    
    updateScaling() {
        // Re-detect device type and orientation
        const oldDeviceType = this.deviceType;
        const oldOrientation = this.orientation;
        this.deviceType = this.detectDeviceType();
        this.orientation = this.getOrientation();
        
        // For mobile devices with dynamic sizing, always recalculate canvas dimensions
        // because viewport size changes can affect the available space
        const shouldRecalculate = oldDeviceType !== this.deviceType || 
                                 oldOrientation !== this.orientation ||
                                 (this.deviceType === 'mobile' && this.canvasConfig.mobile.height === 'dynamic');
        
        if (shouldRecalculate) {
            // Recalculate canvas dimensions (handles dynamic sizing for mobile)
            this.canvasDimensions = this.getCanvasDimensions();
            
            // Update playable area
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
            borderColor: '#e8c66a', // The interface's soft gold
            borderOpacity: this.deviceType === 'mobile' ? 0.45 : 0.35, // More visible on mobile
            borderWidth: this.sizes.spacing.borderWidth
        };
    }
}

// Create global scaler instance
export const responsiveScaler = new ResponsiveScaler();

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

 