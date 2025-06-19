import { gameConfig } from '../config/gameConfig.js';

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
        this.itemData = selectRandomItem();
        
        // Mark zee_zgnan items as spawned (one-time only items)
        if (this.itemData.type === "zee_zgnan") {
            this.itemData.spawned++;
        }
        
        // Apply size multiplier from item data
        const sizeMultiplier = this.itemData.size_multiplier || 1;
        this.width = gameConfig.visuals.itemSize * sizeMultiplier;
        this.height = gameConfig.visuals.itemSize * sizeMultiplier;
        
        // Random speed variation: 0.5x to 2.0x of base speed for dynamic gameplay
        const speedVariation = 0.5 + Math.random() * 1.5; // Random between 0.5 and 2.0
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.speedMultiplier - gameState.permanentSpeedReduction);
        this.speed = gameState.baseDropSpeed * effectiveLevelMultiplier * gameState.speedIncreaseMultiplier * speedVariation;
        
        // Create image object for this specific item
        this.itemImage = new Image();
        this.itemImage.src = this.itemData.image;
        
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.05;
        
        // Animation properties for borders
        this.borderAnimation = 0;
        this.borderPulseSpeed = 0.15;
        
        // Store references for drawing
        this.images = images;
    }

    update(deltaTimeMultiplier, canvas) {
        this.y += this.speed * deltaTimeMultiplier;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.borderAnimation += this.borderPulseSpeed * deltaTimeMultiplier;
        
        // Check if item fell off screen
        if (this.y > canvas.height + 180) {
            this.missed = true;
            return false;
        }
        return true;
    }

    draw(ctx, gameConfig) {
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Use the item's actual size (which includes size_multiplier)
        const drawWidth = this.width;
        const drawHeight = gameConfig.visuals.forceItemAspectRatio ? this.width : this.height;
        
        // Use the specific item image if loaded, otherwise use fallback
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
                ctx.fillStyle = this.itemData.type === 'regular' ? '#00FF00' : 
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
        
        // Draw custom borders based on item type
        this.drawItemBorder(ctx, drawWidth, drawHeight);
        
        ctx.restore();
    }
    
    drawItemBorder(ctx, itemWidth, itemHeight) {
        const borderRadius = Math.max(itemWidth, itemHeight) / 2;
        const basePadding = 15; // Base padding to ensure borders don't clip items
        
        switch(this.itemData.type) {
            case 'regular':
                // No border for regular items
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
                // Cyan dramatic border for Dragonstalker pieces with padding
                const tierPulse = Math.sin(this.borderAnimation * 1.2) * 0.4 + 0.6; // 0.2 to 1
                
                // Outer border effect with padding
                ctx.strokeStyle = '#00FFFF';
                ctx.lineWidth = 3 * tierPulse;
                ctx.shadowColor = '#00FFFF';
                ctx.shadowBlur = 25 * tierPulse;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 12, 0, Math.PI * 2);
                ctx.stroke();
                
                // Inner cyan border with padding
                ctx.strokeStyle = '#87CEEB';
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.arc(0, 0, borderRadius + basePadding + 3, 0, Math.PI * 2);
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
} 