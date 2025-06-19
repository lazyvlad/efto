import { gameItems } from '../data/gameItems.js';
import { damageProjectiles } from '../data/damageProjectiles.js';
import { powerUpItems } from '../data/powerUpItems.js';
import { gameConfig } from '../config/gameConfig.js';

// Calculate item spawn probability based on level and type
export function calculateItemProbability(item, gameState) {
    let probability = item.baseProbability;
    
    // Apply level scaling
    if (item.levelScaling) {
        probability *= (1 + gameState.currentLevel * 0.1);
    }
    
    // Apply health scaling for healing items
    if (item.healthScaling && gameState.health !== undefined) {
        const healthPercent = gameState.health / gameState.maxHealth;
        if (healthPercent <= 0.3) {
            probability *= 1.5; // 50% bonus at ≤30% health
        } else if (healthPercent <= 0.5) {
            probability *= 1.3; // 30% bonus at ≤50% health
        } else if (healthPercent <= 0.7) {
            probability *= 1.15; // 15% bonus at ≤70% health
        }
    }
    
    // Apply frequency limits for ultra-rare items
    if (item.type === "zee_zgnan" && item.spawned > 0) {
        probability = 0; // Can only spawn once
    }
    
    return probability;
}

// Calculate projectile spawn probability
export function calculateProjectileProbability(projectile, gameState) {
    let probability = projectile.baseProbability;
    
    // Apply level scaling if enabled
    if (projectile.levelScaling) {
        probability *= (1 + gameState.currentLevel * 0.1);
    }
    
    return probability;
}

// Calculate power-up spawn probability
export function calculatePowerUpProbability(powerUp, gameState) {
    let probability = powerUp.baseProbability;
    
    // Apply speed scaling if enabled
    if (powerUp.speedScaling) {
        // Ensure speedMultiplier is defined and valid
        const speedMultiplier = gameState.speedMultiplier || gameState.levelSpeedMultiplier || 1.0;
        probability *= (1 + (speedMultiplier - 1) * 0.5);
    }
    
    // Apply health scaling for healing items
    if (powerUp.healthScaling && gameState.health !== undefined) {
        const healthPercent = gameState.health / gameState.maxHealth;
        if (healthPercent <= 0.3) {
            probability *= 1.5; // 50% bonus at ≤30% health
        } else if (healthPercent <= 0.5) {
            probability *= 1.3; // 30% bonus at ≤50% health
        } else if (healthPercent <= 0.7) {
            probability *= 1.15; // 15% bonus at ≤70% health
        }
    }
    
    return probability;
}

// Select random item based on weighted probabilities
export function selectRandomItem(gameState) {
    const weights = [];
    const items = [];
    
    for (const item of gameItems) {
        const probability = calculateItemProbability(item, gameState);
        if (probability > 0) {
            weights.push(probability);
            items.push(item);
        }
    }
    
    if (items.length === 0) return gameItems[0]; // Fallback
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return items[i];
        }
    }
    
    return items[items.length - 1]; // Fallback
}

// Select random projectile based on weighted probabilities
export function selectRandomProjectile(gameState) {
    const weights = [];
    const projectiles = [];
    
    for (const projectile of damageProjectiles) {
        const probability = calculateProjectileProbability(projectile, gameState);
        if (probability > 0) {
            weights.push(probability);
            projectiles.push(projectile);
        }
    }
    
    if (projectiles.length === 0) return damageProjectiles[0]; // Fallback
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < projectiles.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return projectiles[i];
        }
    }
    
    return projectiles[projectiles.length - 1]; // Fallback
}

// Select random power-up based on weighted probabilities
export function selectRandomPowerUp(gameState, availablePowerUps = powerUpItems) {
    const weights = [];
    const powerUps = [];
    
    for (const powerUp of availablePowerUps) {
        const probability = calculatePowerUpProbability(powerUp, gameState);
        if (probability > 0) {
            weights.push(probability);
            powerUps.push(powerUp);
        }
    }
    
    if (powerUps.length === 0) return availablePowerUps[0] || powerUpItems[0]; // Fallback
    
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < powerUps.length; i++) {
        random -= weights[i];
        if (random <= 0) {
            return powerUps[i];
        }
    }
    
    return powerUps[powerUps.length - 1]; // Fallback
}

// Check if it's time to spawn a power-up
export function shouldSpawnPowerUp(gameState) {
    if (!gameConfig.powerUps.enabled) return false;
    
    // Check regular interval spawning
    const interval = gameConfig.powerUps.spawnInterval;
    const currentMilestone = Math.floor(gameState.score / interval) * interval;
    
    let shouldSpawn = false;
    
    // Regular interval spawning - check if we've crossed a milestone
    if (gameState.score >= gameConfig.powerUps.startingScore && 
        currentMilestone > gameState.lastPowerUpScore) {
        shouldSpawn = true;
    }
    
    // Custom spawn points
    if (gameConfig.powerUps.customSpawnPoints.includes(gameState.score) &&
        gameState.lastPowerUpScore < gameState.score) {
        shouldSpawn = true;
    }
    
    // Only return true if conditions are met AND random chance succeeds
    return shouldSpawn && Math.random() < gameConfig.powerUps.spawnChance;
}

// Create collection particles effect
export function createCollectionParticles(x, y, particles, particleColor = '#FFD700') {
    for (let i = 0; i < gameConfig.gameplay.collectionParticleCount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 20,
            maxLife: 20,
            color: particleColor,
            size: Math.random() * 4 + 2,
            update: function(deltaTimeMultiplier) {
                this.x += this.vx * deltaTimeMultiplier;
                this.y += this.vy * deltaTimeMultiplier;
                this.life -= deltaTimeMultiplier;
                return this.life > 0;
            },
            draw: function(ctx) {
                const alpha = this.life / this.maxLife;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            }
        });
    }
} 