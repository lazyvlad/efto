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
    
    // Apply tier set item restrictions
    if (item.type === "tier_set") {
        // If already collected, can't spawn again
        if (item.collected > 0) {
            probability = 0;
        }
        // If missed and not restored by Songflower, can't spawn again
        else if (item.missed > 0) {
            probability = 0;
        }
        // If missed but restored by Songflower (missed = 0), can spawn again
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
        // Use levelSpeedMultiplier for speed scaling
        const levelSpeedMultiplier = gameState.levelSpeedMultiplier || 1.0;
        probability *= (1 + (levelSpeedMultiplier - 1) * 0.5);
    }
    
    // Apply health scaling for healing items
    if (powerUp.healthScaling && gameState.health !== undefined) {
        const healthPercent = gameState.health / gameState.maxHealth;
        if (healthPercent < 0.3) {
            probability *= 1.3; // 30% bonus at <30% health
        } else if (healthPercent < 0.5) {
            probability *= 1.2; // 20% bonus at <50% health
        } else if (healthPercent < 0.7) {
            probability *= 1.1; // 10% bonus at <70% health
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
    for (let i = 0; i < gameConfig.gameplay.particleCount; i++) {
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

// Create menacing impact particles for harmful projectiles
export function createImpactParticles(x, y, particles, projectileData) {
    const particleCount = gameConfig.gameplay.impactParticleCount;
    
    // Determine colors and effects based on projectile type
    let primaryColor, secondaryColor, particleType;
    if (projectileData && projectileData.id === 'frostbolt') {
        primaryColor = '#FF0000';     // Blood red for ice damage
        secondaryColor = '#8B0000';   // Dark red
        particleType = 'ice_shards';
    } else {
        // Default fireball or generic damage
        primaryColor = '#FF4500';     // Orange-red flames
        secondaryColor = '#8B0000';   // Dark red
        particleType = 'fire_sparks';
    }
    
    for (let i = 0; i < particleCount; i++) {
        const isMainParticle = i < particleCount * 0.6; // 60% main particles, 40% secondary
        const color = isMainParticle ? primaryColor : secondaryColor;
        
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 15, // Faster, more violent spread
            vy: (Math.random() - 0.5) * 15,
            life: 40 + Math.random() * 20, // Longer lasting, more dramatic
            maxLife: 40 + Math.random() * 20,
            color: color,
            size: Math.random() * 6 + 3, // Larger particles
            particleType: particleType,
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3,
            gravity: 0.1, // Particles fall down
            update: function(deltaTimeMultiplier) {
                this.x += this.vx * deltaTimeMultiplier;
                this.y += this.vy * deltaTimeMultiplier;
                this.vy += this.gravity * deltaTimeMultiplier; // Apply gravity
                this.rotation += this.rotationSpeed * deltaTimeMultiplier;
                this.life -= deltaTimeMultiplier;
                
                // Slow down particles over time (friction)
                this.vx *= 0.98;
                this.vy *= 0.98;
                
                return this.life > 0;
            },
            draw: function(ctx) {
                const alpha = Math.max(0, this.life / this.maxLife);
                ctx.save();
                ctx.globalAlpha = alpha;
                
                if (this.particleType === 'ice_shards') {
                    // Draw jagged ice shards
                    ctx.translate(this.x, this.y);
                    ctx.rotate(this.rotation);
                    ctx.fillStyle = this.color;
                    ctx.beginPath();
                    // Create jagged shard shape
                    const points = 6;
                    for (let i = 0; i < points; i++) {
                        const angle = (i / points) * Math.PI * 2;
                        const radius = this.size * (0.5 + Math.random() * 0.5);
                        const x = Math.cos(angle) * radius;
                        const y = Math.sin(angle) * radius;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                    }
                    ctx.closePath();
                    ctx.fill();
                    
                    // Add inner glow
                    ctx.globalAlpha = alpha * 0.3;
                    ctx.fillStyle = '#FFFFFF';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * 0.3, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    // Draw fire sparks/embers
                    ctx.translate(this.x, this.y);
                    ctx.fillStyle = this.color;
                    
                    // Main ember body
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Inner hot core
                    ctx.globalAlpha = alpha * 0.7;
                    ctx.fillStyle = '#FFFF00'; // Yellow hot center
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * 0.4, 0, Math.PI * 2);
                    ctx.fill();
                    
                    // Outer glow
                    ctx.globalAlpha = alpha * 0.2;
                    ctx.fillStyle = '#FF0000';
                    ctx.beginPath();
                    ctx.arc(0, 0, this.size * 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
                
                ctx.restore();
            }
        });
    }
}

// Create dark shadow particles for shadowbolt effects
export function createShadowParticles(x, y, particles) {
    const particleCount = 20; // Fewer particles but more ominous
    
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 6, // Slower, more controlled movement
            vy: (Math.random() - 0.5) * 6,
            life: 60 + Math.random() * 30, // Longer lasting for ominous effect
            maxLife: 60 + Math.random() * 30,
            color: i < particleCount * 0.7 ? '#4B0082' : '#2F004F', // Dark purple/indigo
            size: Math.random() * 8 + 4, // Larger, more imposing particles
            particleType: 'shadow',
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            pulsePhase: Math.random() * Math.PI * 2, // For pulsing effect
            update: function(deltaTimeMultiplier) {
                this.x += this.vx * deltaTimeMultiplier;
                this.y += this.vy * deltaTimeMultiplier;
                this.rotation += this.rotationSpeed * deltaTimeMultiplier;
                this.pulsePhase += 0.1 * deltaTimeMultiplier;
                this.life -= deltaTimeMultiplier;
                
                // Slow down particles over time (more dramatic than fire)
                this.vx *= 0.96;
                this.vy *= 0.96;
                
                return this.life > 0;
            },
            draw: function(ctx) {
                const alpha = Math.max(0, this.life / this.maxLife);
                const pulse = Math.sin(this.pulsePhase) * 0.3 + 0.7; // Pulsing effect
                
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.translate(this.x, this.y);
                ctx.rotate(this.rotation);
                
                // Draw wispy shadow effect
                const currentSize = this.size * pulse;
                
                // Outer dark aura
                ctx.globalAlpha = alpha * 0.3;
                ctx.fillStyle = '#1A0033'; // Very dark purple
                ctx.beginPath();
                ctx.arc(0, 0, currentSize * 1.8, 0, Math.PI * 2);
                ctx.fill();
                
                // Main shadow body
                ctx.globalAlpha = alpha * 0.8;
                ctx.fillStyle = this.color;
                ctx.beginPath();
                ctx.arc(0, 0, currentSize, 0, Math.PI * 2);
                ctx.fill();
                
                // Inner darker core
                ctx.globalAlpha = alpha;
                ctx.fillStyle = '#2F004F'; // Darker purple
                ctx.beginPath();
                ctx.arc(0, 0, currentSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
                
                // Subtle inner glow
                ctx.globalAlpha = alpha * 0.4;
                ctx.fillStyle = '#8A2BE2'; // Brighter purple
                ctx.beginPath();
                ctx.arc(0, 0, currentSize * 0.2, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.restore();
            }
        });
    }
} 