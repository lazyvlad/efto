import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { calculateFallAngle, getLogicalCanvasWidth, responsiveScaler } from '../utils/gameUtils.js';
import { FallingObject } from './FallingObject.js';
import { drawImageGlow } from '../utils/glow.js';
import { getSprite } from '../utils/spriteCache.js';

const MOBILE_ITEM_SIZE_BANDS = {
    regular: { min: 42, max: 52 },
    green: { min: 46, max: 56 },
    epic: { min: 60, max: 76 },
    special: { min: 58, max: 74 },
    dragonstalker: { min: 54, max: 60 },
    wide_tier_weapon: { min: 96, max: 104 },
    tier_set: { min: 62, max: 78 },
    legendary: { min: 74, max: 84 },
    zee_zgnan: { min: 78, max: 86 },
    default: { min: 50, max: 66 }
};

const REVERSE_GRAVITY = {
    angleRange: 65,          // Maximum deviation from straight up, in degrees
    speedFactor: 0.4,        // Slowed to 40% to give players more time to collect items
    bounceRestitution: 0.8   // Speed kept when bouncing off the top and sides
};
const WALL_RESTITUTION = 0.6; // Items lose some energy when bouncing off the side walls

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function isDragonstalkerItem(itemData) {
    return itemData.type === 'tier_set' && itemData.setPosition >= 1 && itemData.setPosition <= 8;
}

function isWideTierWeapon(itemData) {
    return itemData.type === 'tier_set' && itemData.setPosition >= 9 && itemData.setPosition <= 10;
}

// Crop rectangles for the wide tier weapons, as fractions of the image so they keep working if
// the image files are resized
function getWideTierWeaponCrop(itemData) {
    const cropByImage = {
        'items/4.png': { x: 13 / 300, y: 105 / 300, width: 275 / 300, height: 90 / 300 },
        'items/ashkandi.png': { x: 12 / 300, y: 104 / 300, width: 275 / 300, height: 92 / 300 }
    };

    return isWideTierWeapon(itemData) ? cropByImage[itemData.image] : null;
}

function calculateItemSize(itemData) {
    const sizeMultiplier = itemData.size_multiplier || 1;
    const baseItemSize = responsiveScaler.getSize('item', 'base');

    if (responsiveScaler.deviceType !== 'mobile') {
        return baseItemSize * sizeMultiplier;
    }

    const bandKey = isDragonstalkerItem(itemData) ? 'dragonstalker' :
        isWideTierWeapon(itemData) ? 'wide_tier_weapon' :
        itemData.type;
    const band = MOBILE_ITEM_SIZE_BANDS[bandKey] || MOBILE_ITEM_SIZE_BANDS.default;
    const compressedSize = baseItemSize * sizeMultiplier * 0.85;
    return clamp(compressedSize, band.min, band.max);
}

export class FallingItem extends FallingObject {
    constructor(selectRandomItem, isValidYPosition, recentDropYPositions, gameState, images, canvas) {
        super();
        
        // Get resolution scale for consistent speed across resolutions
        const resolutionScale = gameState.universalMultiplier?.resolution || { average: 1 };
        
        // Select item based on probability weights
        this.itemData = selectRandomItem(gameState);
        
        // Mark zee_zgnan items as spawned (one-time only items)
        if (this.itemData.type === "zee_zgnan") {
            this.itemData.spawned++;
        }
        
        // Apply size multiplier from item data with responsive scaling
        const itemSize = calculateItemSize(this.itemData);
        this.width = itemSize;
        this.height = itemSize;
        
        // Spawn anywhere across the full width of the canvas
        this.x = Math.random() * Math.max(0, getLogicalCanvasWidth(canvas) - this.width);
        this.y = this.findSpawnY(-180, isValidYPosition, recentDropYPositions);
        
        // Random speed variation: 0.8x to 1.3x of base speed for dynamic gameplay
        const speedVariation = 0.8 + Math.random() * 0.5; // Random between 0.8 and 1.3
        
        // Apply cut_time reduction as a subtraction from level multiplier, not final speed
        const effectiveLevelMultiplier = Math.max(0.2, gameState.levelSpeedMultiplier - gameState.permanentSpeedReduction);
        
        // Apply resolution scaling to base speed for consistent gameplay across resolutions
        const baseSpeed = gameState.baseDropSpeed * effectiveLevelMultiplier * speedVariation * resolutionScale.average;
        this.baseSpeed = baseSpeed; // Store base speed for recalculation when speed boosts are applied
        this.speed = baseSpeed * gameState.speedIncreaseMultiplier;
        
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
    }

    update(deltaTimeMultiplier, canvas, gameState) {
        // Apply time slow multiplier (but not freeze effects - those are for projectiles only)
        const timeSlowMultiplier = gameState.timeSlowMultiplier || 1.0;
        const effectiveDelta = timeSlowMultiplier * deltaTimeMultiplier;
        const canvasWidth = getLogicalCanvasWidth(canvas);
        
        this.applyDriftPhysics(effectiveDelta, canvasWidth, WALL_RESTITUTION);
        
        if (this.applyGravity(effectiveDelta, canvasWidth, gameState, REVERSE_GRAVITY)) {
            // Reverse gravity just ended for this item - pick a fresh downward drift
            this.resetFallDirection(gameState);
        }
        
        this.x += this.horizontalSpeed * effectiveDelta;
        this.rotation += this.rotationSpeed * deltaTimeMultiplier;
        this.borderAnimation += this.borderPulseSpeed * deltaTimeMultiplier;
        this.glowAnimation += 0.15 * deltaTimeMultiplier; // Animate glow for regular items
        
        if (this.hasLeftScreen(canvas, gameState)) {
            this.missed = true;
            return false;
        }
        
        return true;
    }

    draw(ctx, gameConfig) {
        ctx.save();
        
        // Enhanced image quality settings for items
        if (gameConfig.items.imageQuality.smoothing) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = gameConfig.items.imageQuality.quality;
        } else {
            ctx.imageSmoothingEnabled = false;
        }
        
        // Apply sharp scaling for pixel art if enabled
        if (gameConfig.items.imageQuality.sharpScaling) {
            ctx.imageSmoothingEnabled = false;
        }
        
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.rotation);
        
        // Calculate high-DPI adjusted size with AssetManager constraints
        let drawWidth = this.width;
        let drawHeight = gameConfig.visuals.forceItemAspectRatio ? this.width : this.height;
        
        // Apply conservative high-DPI scaling if enabled (focused on quality, not size)
        if (gameConfig.items.highDPI.enabled) {
            // Only apply very conservative scaling if explicitly enabled
            if (gameConfig.items.sizing.scaleWithDPI) {
                const dpr = window.devicePixelRatio || 1;
                const conservativeScale = Math.min(dpr * gameConfig.items.highDPI.multiplier, 2.0); // Conservative cap at 2x
                drawWidth *= conservativeScale;
                drawHeight *= conservativeScale;
            }
            
            // Only enforce minimum size if explicitly enabled
            if (gameConfig.items.sizing.respectMinimumSize) {
                const minPixelSize = gameConfig.items.highDPI.minPixelSize;
                drawWidth = Math.max(drawWidth, minPixelSize);
                drawHeight = Math.max(drawHeight, minPixelSize);
            }
            
            // Apply AssetManager scaling constraints to prevent quality degradation
            if (this.itemImage && this.itemData.image && window.assetManager) {
                const safeSize = window.assetManager.getMaxSafeSize(this.itemData.image, drawWidth, drawHeight);
                if (safeSize.wasConstrained) {
                    drawWidth = safeSize.width;
                    drawHeight = safeSize.height;
                    // Quality info available but not logged to prevent spam
                }
            }
        }
        
        // Animated glow for regular and green items (similar to power-ups)
        let glowColor = null;
        let glowBlur = 0;
        if (this.itemData.type === 'regular' || this.itemData.type === 'green') {
            const glow = Math.sin(this.glowAnimation) * 0.4 + 0.6; // 0.2 to 1.0
            glowColor = this.itemData.type === 'regular' ? '#FFFFFF' : '#00FF00';
            glowBlur = 25 * glow;
        }
        
        // Use the specific item image from AssetManager (always available, placeholder if not loaded)
        if (this.itemImage && this.itemImage.complete && this.itemImage.naturalWidth > 0) {
            // Smooth rendering for rotating items to prevent visual tearing
            // Only use crisp rendering for non-rotating items
            const isRotating = Math.abs(this.rotationSpeed) > 0.001 || Math.abs(this.rotation) > 0.001;
            const wideWeaponCrop = responsiveScaler.deviceType === 'mobile' ? getWideTierWeaponCrop(this.itemData) : null;
            
            if (wideWeaponCrop) {
                const weaponDrawHeight = Math.max(drawHeight * 0.48, 46);
                ctx.drawImage(
                    this.itemImage,
                    wideWeaponCrop.x * this.itemImage.naturalWidth,
                    wideWeaponCrop.y * this.itemImage.naturalHeight,
                    wideWeaponCrop.width * this.itemImage.naturalWidth,
                    wideWeaponCrop.height * this.itemImage.naturalHeight,
                    -drawWidth / 2,
                    -weaponDrawHeight / 2,
                    drawWidth,
                    weaponDrawHeight
                );
            } else {
                // Pre-rendered at this size, trimmed of transparent padding and undistorted
                const sprite = getSprite(ctx, this.itemImage, drawWidth, drawHeight);
                let spriteX = -sprite.width / 2;
                let spriteY = -sprite.height / 2;
                let spriteWidth = sprite.width;
                let spriteHeight = sprite.height;
                if (gameConfig.items.highDPI.crispRendering && !isRotating) {
                    // Pixel-perfect positioning only for stationary items
                    spriteX = Math.round(spriteX);
                    spriteY = Math.round(spriteY);
                    spriteWidth = Math.round(spriteWidth);
                    spriteHeight = Math.round(spriteHeight);
                }
                if (glowColor) drawImageGlow(ctx, sprite.canvas, spriteX, spriteY, spriteWidth, spriteHeight, glowColor, glowBlur);
                ctx.drawImage(sprite.canvas, spriteX, spriteY, spriteWidth, spriteHeight);
            }
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
                // Apply same smooth rendering to fallback images
                const isRotating = Math.abs(this.rotationSpeed) > 0.001 || Math.abs(this.rotation) > 0.001;
                
                if (gameConfig.items.highDPI.crispRendering && !isRotating) {
                    const pixelPerfectX = Math.round(-drawWidth/2);
                    const pixelPerfectY = Math.round(-drawHeight/2);
                    const pixelPerfectWidth = Math.round(drawWidth);
                    const pixelPerfectHeight = Math.round(drawHeight);
                    if (glowColor) drawImageGlow(ctx, this.images.items[fallbackIndex], pixelPerfectX, pixelPerfectY, pixelPerfectWidth, pixelPerfectHeight, glowColor, glowBlur);
                    ctx.drawImage(this.images.items[fallbackIndex], pixelPerfectX, pixelPerfectY, pixelPerfectWidth, pixelPerfectHeight);
                } else {
                    if (glowColor) drawImageGlow(ctx, this.images.items[fallbackIndex], -drawWidth/2, -drawHeight/2, drawWidth, drawHeight, glowColor, glowBlur);
                    ctx.drawImage(this.images.items[fallbackIndex], -drawWidth/2, -drawHeight/2, drawWidth, drawHeight);
                }
            } else {
                // Final fallback: draw a colored rectangle with consistent size
                if (glowColor) {
                    ctx.shadowColor = glowColor;
                    ctx.shadowBlur = glowBlur;
                }
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
        
        // Reset shadow after drawing the item (only the rectangle fallback sets one)
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        
        // Draw custom borders based on item type (use scaled dimensions for borders to match items)
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

    // Handle window resize with responsive scaling
    repositionOnResize() {
        // Update size based on new scaling
        const itemSize = calculateItemSize(this.itemData);
        this.width = itemSize;
        this.height = itemSize;
    }
} 