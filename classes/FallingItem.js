import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { checkBoundaryCollision, applyAdvancedBouncePhysics, calculateSpinEffect, applyAirResistance, calculateFallAngle, responsiveScaler } from '../utils/gameUtils.js';

export class FallingItem {
    constructor(selectRandomItem, isValidYPosition, recentDropYPositions, gameState, images, canvas) {
        this.x = Math.random() * (canvas.width - 180);
        
        // Find valid Y position with spacing
        let attemptY = -180;
        let attempts = 0;
        while (!isValidYPosition(attemptY, recentDropYPositions) && attempts < 10) {
            attemptY -= 100; // Try higher up
            attempts++;
        }
        this.y = attemptY;
        recentDropYPositions.push(this.y);
        
        // Select item based on probability weights FIRST
        this.itemData = selectRandomItem(gameState);
        
        // Mark zee_zgnan items as spawned (one-time only items)
        if (this.itemData.type === "zee_zgnan") {
            this.itemData.spawned++;
        }
        
        // Apply size multiplier from item data with responsive scaling
        const sizeMultiplier = this.itemData.size_multiplier || 1;
        const baseItemSize = responsiveScaler.getSize('item', 'base');
        this.width = baseItemSize * sizeMultiplier;
        this.height = baseItemSize * sizeMultiplier;
        
        // Random speed variation: 0.8x to 1.3x of base speed for dynamic gameplay
        const speedVariation = 0.8 + Math.random() * 0.5; // Random between 0.8 and 1.3
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        const baseSpeed = gameState.baseDropSpeed * effectiveLevelMultiplier * speedVariation;
        this.baseSpeed = baseSpeed; // Store base speed for recalculation when speed boosts are applied
        this.speed = baseSpeed * gameState.speedIncreaseMultiplier;
        
        // Store speed components for debugging
        this.speedBreakdown = {
            baseSpeed: gameState.baseDropSpeed,
            levelMultiplier: gameState.levelSpeedMultiplier,
            permanentReduction: gameState.permanentSpeedReduction,
            effectiveMultiplier: effectiveLevelMultiplier,
            speedBoost: gameState.speedIncreaseMultiplier,
            variation: speedVariation,
            finalSpeed: this.speed
        };
        
        // Get image from AssetManager (will return cached or placeholder)
        this.itemImage = assetManager.getImage(this.itemData.image);
        
        // Add angle variation using dynamic fall angle system
        this.fallAngle = calculateFallAngle(gameState); // Use dynamic fall angle calculation
        this.horizontalSpeed = Math.sin(this.fallAngle) * this.speed * gameState.horizontalSpeedReduction; // Horizontal component (dynamic reduction)
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.02; // Reduced from 0.05 to 0.02
        
        // Animation properties for borders and glow
        this.borderAnimation = 0;
        this.borderPulseSpeed = 0.15;
        this.glowAnimation = 0; // For green glow on regular items
        
        // Store references for drawing
        this.images = images;
        
        // Performance tracking
        this.physicsCalculations = 0;
    }

    update(deltaTimeMultiplier, canvas, gameState) {
        // Apply time slow multiplier (but not freeze effects - those are for projectiles only)
        const timeSlowMultiplier = gameState.timeSlowMultiplier || 1.0;
        const effectiveDelta = timeSlowMultiplier * deltaTimeMultiplier;
        
        // Performance optimization: Skip expensive physics for items far from edges
        const needsPhysics = this.x < 100 || this.x > canvas.width - 100 || Math.abs(this.horizontalSpeed) > 1;
        
        if (needsPhysics) {
            // Apply physics effects only when needed
            if (Math.abs(this.rotationSpeed) > 0.001) {
                calculateSpinEffect(this, effectiveDelta);
                this.physicsCalculations++;
            }
            // Only apply air resistance if item has significant horizontal movement or high speed
            if (Math.abs(this.horizontalSpeed) > 0.5 || this.speed > 5) {
                applyAirResistance(this, effectiveDelta);
                this.physicsCalculations++;
            }
            
            // Check for boundary collisions - detect when item is actually at or past boundaries
            const collisions = checkBoundaryCollision(this, canvas);
            if (collisions.left || collisions.right || collisions.top) {
                // Handle top bouncing during reverse gravity specially
                if (collisions.top && gameState.reverseGravityActive) {
                    // When hitting top during reverse gravity, remove reverse gravity effect from this item
                    // and apply normal bounce physics
                    this.wasReversed = false; // Remove reverse gravity effect from this item
                    this.bouncedOffTopDuringReverse = false; // Clear any bounce flags
                    
                    // Reset to normal downward movement
                    this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                    this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                    
                    // Ensure positive (downward) speed
                    if (this.speed < 0) {
                        this.speed = Math.abs(this.speed);
                    }
                    
                    // Apply normal bounce physics for top collision
                    this.physicsCalculations++;
                    applyAdvancedBouncePhysics(this, collisions, canvas, {
                        restitution: 0.6,        // Items lose some energy when bouncing
                        friction: 0.9,           // Some friction on surfaces
                        spinTransfer: 0.05,      // Much less spin from collisions
                        spinDamping: 0.9,        // More aggressive spin loss
                        angularRestitution: 0.5, // Less spin retention
                        minBounceSpeed: 1.0      // Minimum speed for bouncing
                    });
                    this.physicsCalculations++;
                } else {
                    this.physicsCalculations++;
                    applyAdvancedBouncePhysics(this, collisions, canvas, {
                        restitution: 0.6,        // Items lose some energy when bouncing
                        friction: 0.9,           // Some friction on surfaces
                        spinTransfer: 0.05,      // Much less spin from collisions (was 0.2)
                        spinDamping: 0.9,        // More aggressive spin loss (was 0.95)
                        angularRestitution: 0.5, // Less spin retention (was 0.7)
                        minBounceSpeed: 1.0      // Minimum speed for bouncing
                    });
                    this.physicsCalculations++;
                }
            }
        }
        
        // Update position (always needed)
        // Apply reverse gravity effect if active 
        if (gameState.reverseGravityActive) {
            // Items that haven't been individually exempted get reverse gravity
            if (this.wasReversed !== false) {
                this.y -= this.speed * effectiveDelta; // Move upward instead of downward
                this.wasReversed = true; // Mark as affected by reverse gravity
                
                // MANUAL BOUNDARY CHECK: Prevent items from going past top boundary during reverse gravity
                if (this.y <= 0) {
                    console.log(`FallingItem manually detected past top boundary: y=${this.y}, forcing bounce...`);
                    this.y = 0; // Clamp to top boundary
                    
                    // Force bounce behavior - item should immediately start falling
                    this.wasReversed = false; // Remove reverse gravity effect from this item
                    this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                    this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                    this.speed = Math.abs(this.speed) * 1.2; // bounce with some energy added
                    
                    console.log(`FallingItem manual bounce complete: y=${this.y}, speed=${this.speed}, wasReversed=${this.wasReversed}`);
                }
            } else {
                // Item has bounced off top during this reverse gravity session - make it fall normally
                this.y += this.speed * effectiveDelta; // Normal downward movement
            }
        } else {
            // When reverse gravity is not active, reset all items to be eligible for future reverse gravity
            if (this.wasReversed === false) {
                // Reset previously bounced items to be eligible again
                this.wasReversed = undefined;
            }
            
            // If reverse gravity just ended and this item was reversed, reset its movement
            if (this.wasReversed) {
                this.wasReversed = false;
                this.bouncedOffTopDuringReverse = false; // Reset bounce flag
                // Reset to normal downward movement - ensure angles are downward
                this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
                this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
                
                // Ensure the item is moving downward by forcing positive vertical speed
                // This fixes items that might have upward momentum from bouncing during reverse gravity
                if (this.speed < 0) {
                    this.speed = Math.abs(this.speed);
                }
            }
            this.y += this.speed * effectiveDelta; // Normal downward movement
        }
        this.x += this.horizontalSpeed * effectiveDelta;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.borderAnimation += this.borderPulseSpeed * deltaTimeMultiplier;
        this.glowAnimation += 0.15 * deltaTimeMultiplier; // Animate glow for regular items
        
        // Only remove items that go off the bottom during normal gravity
        if (!gameState.reverseGravityActive && this.y > canvas.height + this.height) {
            this.missed = true;
            return false;
        }
        
        // During reverse gravity, items should NEVER disappear off the top - they should bounce back!
        return true;
    }

    draw(ctx, gameConfig) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the item's actual size (which includes size_multiplier)
        const drawWidth = this.width;
        const drawHeight = gameConfig.visuals.forceItemAspectRatio ? this.width : this.height;
        
        // Apply animated glow for regular and green items (similar to power-ups)
        if (this.itemData.type === 'regular') {
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6; // 0.2 to 1.0
            ctx.shadowColor = '#FFFFFF'; // White glow for regular items
            ctx.shadowBlur = 25 * glow; // Stronger glow than before, animated
            // No shadow offset for clean glow effect
        } else if (this.itemData.type === 'green') {
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6; // 0.2 to 1.0
            ctx.shadowColor = '#00FF00'; // Green glow for green items
            ctx.shadowBlur = 25 * glow; // Stronger glow than before, animated
            // No shadow offset for clean glow effect
        }
        
        // Use the specific item image from AssetManager (always available, placeholder if not loaded)
        if (this.itemImage && this.itemImage.complete && this.itemImage.naturalWidth > 0) {
            // Force the image to exact size, ignoring source dimensions
            ctx.drawImage(this.itemImage, -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
        } else {
            // Fallback: try to extract number from old naming pattern, otherwise use first available image
            const numberMatch = this.itemData.image.match(/(\d+)\.png/);
            let fallbackIndex = 0;
            
            if (numberMatch && numberMatch[1]) {
                const imageNumber = parseInt(numberMatch[1]);
                if (imageNumber >= 2 && imageNumber <= 8) {
                    fallbackIndex = Math.min(imageNumber - 2, this.images.items.length - 1);
                }
            }
            
            // Ensure we have a valid image to draw
            if (this.images.items[fallbackIndex] && this.images.items[fallbackIndex].complete && this.images.items[fallbackIndex].naturalWidth > 0) {
                // Force the fallback image to exact size too
                ctx.drawImage(this.images.items[fallbackIndex], -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
            } else {
                // Final fallback: draw a colored rectangle with consistent size
                ctx.fillStyle = this.itemData.type === 'regular' ? '#CCCCCC' : 
                               this.itemData.type === 'green' ? '#00FF00' : 
                               this.itemData.type === 'epic' ? '#9932CC' : 
                               this.itemData.type === 'special' ? '#FF69B4' : 
                               this.itemData.type === 'legendary' ? '#FFD700' :
                               this.itemData.type === 'zee_zgnan' ? '#FF0080' :
                               this.itemData.type === 'tier_set' ? '#00FFFF' : '#FFD700';
                ctx.fillRect(-drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
                
                // Add item name text
                ctx.fillStyle = 'white';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(this.itemData.name, 0, 0);
            }
        }
        
        // Reset shadow after drawing the item
        if (this.itemData.type === 'regular' || this.itemData.type === 'green') {
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }
        
        // Draw custom borders based on item type
        this.drawItemBorder(ctx, drawWidth, drawHeight);
        
        ctx.restore();
    }
    
    drawItemBorder(ctx, itemWidth, itemHeight) {
        const borderRadius = Math.max(itemWidth, itemHeight) / 2;
        const basePadding = 15; // Base padding to ensure borders don't clip items
        
        switch(this.itemData.type) {
            case 'regular':
            case 'green':
                // Regular and green items use the main glow effect, no additional border needed
                break;
                
            case 'epic':
                // Pulsating purple border with padding
                const epicPulse = Math.sin(this.borderAnimation) * 0.3 + 0.7; // 0.4 to 1.0
                ctx.strokeStyle = '#9932CC';
                ctx.lineWidth = 2.5 * epicPulse;
                ctx.shadowColor = '#9932CC';
                ctx.shadowBlur = 15 * epicPulse;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + (8 * epicPulse), 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'special':
                // Hot pink glowing border with padding
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#FF69B4';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'legendary':
                // Orange very noticeable animated border with extra padding
                const legendaryPulse = Math.sin(this.borderAnimation * 2) * 0.5 + 0.5; // 0 to 1
                const legendaryGlow = Math.sin(this.borderAnimation * 1.5) * 0.4 + 0.6; // 0.2 to 1
                
                // Outer glow with extra padding
                ctx.strokeStyle = '#FF8C00';
                ctx.lineWidth = 4;
                ctx.shadowColor = '#FF8C00';
                ctx.shadowBlur = 30 * legendaryGlow;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 20 + (8 * legendaryPulse), 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner border with padding
                ctx.strokeStyle = '#FFD700';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'zee_zgnan':
                // Ultra rare deep pink/magenta dramatic animated border
                const zeePulse = Math.sin(this.borderAnimation * 2.5) * 0.6 + 0.4; // 0 to 1
                const zeeGlow = Math.sin(this.borderAnimation * 2) * 0.5 + 0.5; // 0 to 1
                const zeeSparkle = Math.sin(this.borderAnimation * 3) * 0.3 + 0.7; // sparkle effect
                
                // Triple layer ultra-rare border
                // Outer massive glow
                ctx.strokeStyle = '#FF0080';
                ctx.lineWidth = 6 * zeePulse;
                ctx.shadowColor = '#FF0080';
                ctx.shadowBlur = 40 * zeeGlow;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 30 + (12 * zeePulse), 0, Math.PI * 2);
                ctx.stroke();
                
                // Middle layer
                ctx.strokeStyle = '#FF69B4';
                ctx.lineWidth = 4 * zeeSparkle;
                ctx.shadowBlur = 25;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 15, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner core
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 15;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 5, 0, Math.PI * 2);
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
                break;
                
            case 'tier_set':
                // Purple pulsating border that emanates outwards for Dragonstalker pieces
                const time = Date.now() * 0.003; // Control animation speed
                const pulseIntensity = (Math.sin(time) + 1) * 0.5; // 0 to 1
                const maxPulseRadius = 20; // Maximum pulse distance
                const pulseRadius = borderRadius + basePadding + (pulseIntensity * maxPulseRadius);
                
                // Outer pulsating emanation - fades as it expands
                const outerAlpha = 0.8 * (1 - pulseIntensity * 0.7); // Stronger fade
                ctx.strokeStyle = `rgba(138, 43, 226, ${outerAlpha})`;
                ctx.lineWidth = 2 + (pulseIntensity * 4); // Thicker as it pulses
                ctx.shadowColor = `rgba(138, 43, 226, ${outerAlpha * 0.8})`;
                ctx.shadowBlur = 15 + (pulseIntensity * 25); // Expanding glow
                ctx.beginPath();
                ctx.arc(0, 0, pulseRadius, 0, Math.PI * 2);
                ctx.stroke();
                
                // Middle ring - constant purple
                ctx.strokeStyle = '#8A2BE2';
                ctx.lineWidth = 3;
                ctx.shadowColor = '#8A2BE2';
                ctx.shadowBlur = 20;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 8, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner solid border - always visible
                ctx.strokeStyle = '#9370DB';
                ctx.lineWidth = 2;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding, 0, Math.PI * 2);
                ctx.stroke();
                
                // Additional inner glow that pulses inward
                const innerAlpha = 0.4 + (pulseIntensity * 0.5);
                ctx.strokeStyle = `rgba(186, 85, 211, ${innerAlpha})`;
                ctx.lineWidth = 1;
                ctx.shadowBlur = 8;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding - 3, 0, Math.PI * 2);
                ctx.stroke();
                
                ctx.shadowBlur = 0; // Reset shadow
                break;
        }
    }

    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        return this.x < playerBounds.x + playerBounds.width &&
               this.x + this.width > playerBounds.x &&
               this.y < playerBounds.y + playerBounds.height &&
               this.y + this.height > playerBounds.y;
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize() {
        // Update size based on new scaling
        const sizeMultiplier = this.itemData.size_multiplier || 1;
        const baseItemSize = responsiveScaler.getSize('item', 'base');
        this.width = baseItemSize * sizeMultiplier;
        this.height = baseItemSize * sizeMultiplier;
    }
} 