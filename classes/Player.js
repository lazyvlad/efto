import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';
import { responsiveScaler } from '../utils/gameUtils.js';

// Player Class - Encapsulates all player functionality
export class Player {
    constructor(canvasWidth, canvasHeight) {
        // Get responsive sizes from scaler
        const playerSize = responsiveScaler.getSize('player');
        
        // Position and size (now responsive)
        this.width = playerSize.width;
        this.height = playerSize.height;
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = canvasHeight - this.height - responsiveScaler.scale(20);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Movement (scaled based on device)
        this.speed = playerSize.speed;
        this.targetX = this.x;
        this.smoothingFactor = 0.15;
        
        // Visual state
        this.impactTimer = 0;
        this.impactDuration = gameConfig.player.impactDuration * (1000 / 60); // Convert frames to milliseconds
        this.celebrationTimer = 0;
        this.celebrationDuration = gameConfig.player.celebrationDuration * (1000 / 60); // Convert frames to milliseconds
        
        // Animation
        this.bobOffset = 0;
        this.bobSpeed = 0.05;
        this.bobAmplitude = 2;
        
        // Image management using AssetManager with centralized registry
        this.normalImage = assetManager.getImage(assetRegistry.player.normal);
        this.impactImage = assetManager.getImage(assetRegistry.player.impact);
        this.celebrationImage = assetManager.getImage(assetRegistry.player.celebration);
        
        // Current image state
        this.currentImage = this.normalImage;
        
        // State
        this.isReacting = false;
        this.isCelebrating = false;
        this.lastImageState = null; // For debugging image state changes
    }
    
    // Handle getting hit by projectiles
    onHit() {
        this.impactTimer = this.impactDuration;
        this.isReacting = true;
    }
    
    // Handle collecting tier set items
    onTierSetCollected() {
        this.celebrationTimer = this.celebrationDuration;
        this.isCelebrating = true;
        // Don't show impact during celebration
        this.isReacting = false;
        this.impactTimer = 0;
    }
    
    // Update player state
    update(targetX, targetY, canvasWidth, canvasHeight, deltaTimeMultiplier) {
        // Smooth mouse following (frame rate normalized)
        const normalizedSmoothing = gameConfig.player.moveSmoothing * deltaTimeMultiplier;
        
        // Update both X and Y positions with smooth following
        const distanceX = targetX - this.x;
        const distanceY = targetY - this.y;
        this.x += distanceX * Math.min(normalizedSmoothing, 1.0); // Cap at 1.0 to prevent overshooting
        this.y += distanceY * Math.min(normalizedSmoothing, 1.0);
        
        // Keep player within bounds
        this.x = Math.max(0, Math.min(canvasWidth - this.width, this.x));
        this.y = Math.max(0, Math.min(canvasHeight - this.height, this.y));
        
        // Update timers
        this.updateTimers(deltaTimeMultiplier);
    }
    
    // Update only timers and visual states (used when position is handled elsewhere)
    updateTimers(deltaTimeMultiplier) {
        // Convert deltaTimeMultiplier to milliseconds (assuming 60fps = 16.67ms per frame)
        const deltaTimeMs = deltaTimeMultiplier * (1000 / 60);
        
        // Update celebration timer first (has priority)
        if (this.celebrationTimer > 0) {
            this.celebrationTimer -= deltaTimeMs;
            if (this.celebrationTimer <= 0) {
                this.celebrationTimer = 0; // Ensure it's exactly 0
                this.isCelebrating = false;
            }
        }
        
        // Update impact timer (only if not celebrating)
        if (!this.isCelebrating && this.impactTimer > 0) {
            this.impactTimer -= deltaTimeMs;
            if (this.impactTimer <= 0) {
                this.impactTimer = 0; // Ensure it's exactly 0
                this.isReacting = false;
            }
        }
    }
    
    // Draw the player
    draw(ctx, shieldActive = false) {
        let imageToUse = this.normalImage; // Default to normal image (efto.png)
        
        // Priority: celebration > impact > normal
        if (this.isCelebrating) {
            imageToUse = this.celebrationImage; // efto-win.png
        } else if (this.isReacting) {
            imageToUse = this.impactImage; // vano.png
        }
        // If neither celebrating nor reacting, imageToUse remains this.normalImage (efto.png)
        
        ctx.save();
        
        // Draw shield border if active
        if (shieldActive) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + this.height / 2;
            const radius = Math.max(this.width, this.height) / 2 + 15; // Slightly larger than player
            
            // Animated glow effect
            const time = Date.now() * 0.005; // Slow animation
            const glowIntensity = 0.7 + Math.sin(time) * 0.3; // Pulsing between 0.4 and 1.0
            
            // Outer glow
            ctx.shadowColor = '#FFD700';
            ctx.shadowBlur = 20 * glowIntensity;
            ctx.strokeStyle = `rgba(255, 215, 0, ${glowIntensity})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            
            // Inner border
            ctx.shadowBlur = 10;
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 + glowIntensity * 0.2})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius - 5, 0, Math.PI * 2);
            ctx.stroke();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            ctx.shadowColor = 'transparent';
        }
        
        // Check if image is loaded and draw
        if (imageToUse && imageToUse.complete && imageToUse.naturalWidth > 0) {
            ctx.drawImage(imageToUse, this.x, this.y, this.width, this.height);
        } else {
            // Fallback: draw a simple rectangle with different colors for states
            let fillColor = '#4ECDC4'; // Normal (efto.png equivalent)
            if (this.isCelebrating) {
                fillColor = '#FFD700'; // Gold for celebration (efto-win.png equivalent)
            } else if (this.isReacting) {
                fillColor = '#FF6B6B'; // Red for impact (vano.png equivalent)
            }
            ctx.fillStyle = fillColor;
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
        
        ctx.restore();
    }
    
    // Get collision bounds
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize(canvasWidth, canvasHeight) {
        // Update size based on new scaling
        const playerSize = responsiveScaler.getSize('player');
        this.width = playerSize.width;
        this.height = playerSize.height;
        this.speed = playerSize.speed;
        
        // Update canvas dimensions
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Reposition within new bounds
        this.x = Math.min(this.x, canvasWidth - this.width);
        
        // Reposition Y based on responsive movable area
        const movableAreaConfig = responsiveScaler.getMovableAreaConfig();
        if (movableAreaConfig.enabled) {
            const movableHeight = canvasHeight * movableAreaConfig.heightPercent;
            const movableAreaTop = canvasHeight - movableHeight;
            // Keep player within movable area bounds
            this.y = Math.max(movableAreaTop, Math.min(canvasHeight - this.height, this.y));
        } else {
            // Fallback to responsive positioning
            this.y = canvasHeight - responsiveScaler.scale(180);
        }
    }
    
    // Reset player state (for game restart)
    reset() {
        this.impactTimer = 0;
        this.celebrationTimer = 0;
        this.isReacting = false;
        this.isCelebrating = false;
    }
    
    // Check if images are loaded
    areImagesLoaded() {
        return this.normalImage.complete && this.normalImage.naturalWidth > 0 &&
               this.impactImage.complete && this.impactImage.naturalWidth > 0 &&
               this.celebrationImage.complete && this.celebrationImage.naturalWidth > 0;
    }
} 