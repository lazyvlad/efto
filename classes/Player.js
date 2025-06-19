import { gameConfig } from '../config/gameConfig.js';

// Player Class - Encapsulates all player functionality
export class Player {
    constructor(canvasWidth, canvasHeight) {
        this.x = canvasWidth / 2;
        this.y = canvasHeight - 180;
        this.width = gameConfig.visuals.playerWidth;
        this.height = gameConfig.visuals.playerHeight;
        this.speed = gameConfig.visuals.playerSpeed;
        
        // Visual state management
        this.impactTimer = 0; // Timer for showing impact reaction
        this.impactDuration = gameConfig.player.impactDuration;
        this.celebrationTimer = 0; // Timer for tier set collection celebration
        this.celebrationDuration = gameConfig.player.celebrationDuration;
        
        // Image management
        this.normalImage = new Image();
        this.impactImage = new Image();
        this.celebrationImage = new Image();
        this.normalImage.src = 'assets/efto.png';
        this.impactImage.src = 'assets/vano.png';
        this.celebrationImage.src = 'assets/efto-win.png';
        
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
        // Update celebration timer first (has priority)
        if (this.celebrationTimer > 0) {
            this.celebrationTimer -= deltaTimeMultiplier;
            if (this.celebrationTimer <= 0) {
                this.celebrationTimer = 0; // Ensure it's exactly 0
                this.isCelebrating = false;
            }
        }
        
        // Update impact timer (only if not celebrating)
        if (!this.isCelebrating && this.impactTimer > 0) {
            this.impactTimer -= deltaTimeMultiplier;
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
    
    // Handle window resize
    repositionOnResize(canvasWidth, canvasHeight) {
        this.x = Math.min(this.x, canvasWidth - this.width);
        this.y = canvasHeight - 180;
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