import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';
import { responsiveScaler } from '../utils/gameUtils.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { characterFor } from '../data/playerCharacters.js';

// The player is a whole figure (data/playerCharacters.js has one for each side), so the
// player's box is this many times taller than it is wide. The figure stands as tall as the
// box; a broad one reaches a little outside it to either side.
const FIGURE_HEIGHT_TO_WIDTH = 1.88;
// Under the feet, inside the player's box, is room for a small health bar: this much of the
// box's width, top to bottom.
const HEALTH_BAR_ROOM = 0.16;

// Player Class - Encapsulates all player functionality
export class Player {
    constructor(canvasWidth, canvasHeight) {
        // Get responsive sizes from scaler
        const playerSize = responsiveScaler.getSize('player');
        
        // Position and size (now responsive)
        this.width = playerSize.width;
        this.height = Math.round(playerSize.width * (FIGURE_HEIGHT_TO_WIDTH + HEALTH_BAR_ROOM));
        this.x = canvasWidth / 2 - this.width / 2;
        this.y = canvasHeight - this.height - responsiveScaler.scale(20);
        this.canvasWidth = canvasWidth;
        this.canvasHeight = canvasHeight;
        
        // Movement (scaled based on device)
        this.speed = playerSize.speed;
        this.targetX = this.x;
        this.smoothingFactor = 0.15;
        
        // The character's picture, and what brings it to life once it has loaded. The animation
        // only draws: position and collisions are this class's and the input system's.
        this.lastX = this.x;
        this.setCharacter(null);
    }
    
    // Become the character of a side ('alliance' or 'horde'; the Alliance one until one is chosen)
    setCharacter(faction) {
        const character = characterFor(faction);
        if (this.character === character) return;
        
        this.character = character;
        this.image = assetManager.getImage(character.image);
        this.animator = null;
    }
    
    // Handle getting hit by projectiles: he draws back and flashes
    onHit() {
        this.animator?.hit();
    }
    
    // He caught something: the hands come up
    onCollect() {
        this.animator?.collect();
    }
    
    // He loosed an arrow: he braces
    onShoot() {
        this.animator?.shoot();
    }
    
    // Set pieces and the tier weapons are caught like anything else
    onTierSetCollected() {
        this.onCollect();
    }
    
    onAshkandiCollected() {
        this.onCollect();
    }
    
    // Advance the animation (position is handled by the input system). Called every display
    // frame with the time passed, in 60ths of a second.
    updateTimers(deltaTimeMultiplier) {
        if (!this.animator && this.image.complete && this.image.naturalWidth > 0) {
            this.animator = new CharacterAnimator(this.image, this.character.rig);
        }
        
        const seconds = deltaTimeMultiplier / 60;
        if (!this.animator || seconds <= 0) return;
        
        // How fast he is moving sideways, from how far he has come since the last frame.
        // Crossing half the play field in a second counts as flat out.
        const velocityX = (this.x - this.lastX) / seconds;
        this.lastX = this.x;
        this.animator.update(seconds, velocityX, this.canvasWidth * 0.5);
    }
    
    /**
     * Draw the player.
     * @param {boolean} shieldActive  Whether a shield is around him
     * @param {number}  health        How much health he has left, 0 to 1, shown under his feet
     */
    draw(ctx, shieldActive = false, health = 1) {
        // The box holds him and, under his feet, his health bar
        const barRoom = this.width * HEALTH_BAR_ROOM;
        const figureHeight = this.height - barRoom;
        
        ctx.save();
        
        // Draw shield border if active
        if (shieldActive) {
            const centerX = this.x + this.width / 2;
            const centerY = this.y + figureHeight / 2;
            const radius = figureHeight / 2 + 10; // Around the whole of him
            
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
        
        // He stands in the middle of the player's box, his feet just above the health bar
        if (this.animator) {
            this.animator.draw(ctx, this.x + this.width / 2, this.y + figureHeight, figureHeight / this.character.heightInPicture);
        }
        
        ctx.restore();
        
        this.drawHealthBar(ctx, this.y + figureHeight, barRoom, health);
    }
    
    // A small health bar under his feet: a dark well with a gold edge, as on the panels, filled
    // green, then amber, then red as his health drops
    drawHealthBar(ctx, top, room, health) {
        const fill = Math.max(0, Math.min(1, health));
        const width = this.width * 0.9;
        const height = Math.max(4, room * 0.45);
        const x = this.x + (this.width - width) / 2;
        const y = top + (room - height) / 2;
        const colors = fill <= 0.25 ? ['#ff8a7a', '#8e0c0c'] : fill <= 0.6 ? ['#ffe680', '#b97800'] : ['#7dfa7d', '#0c7a0c'];
        
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(x, y, width, height);
        
        const gradient = ctx.createLinearGradient(0, y, 0, y + height);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width * fill, height);
        
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);
        ctx.strokeStyle = '#b9902f';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
        ctx.restore();
    }
    
    // What catches and gets hit: his head, arms and body, a square as wide as the player's box
    // at the top of it. That is the size the player's whole box used to be, so catching and
    // dodging are as they were; his legs neither catch nor get hit.
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.width
        };
    }
    
    // Handle window resize with responsive scaling
    repositionOnResize(canvasWidth, canvasHeight) {
        // Update size based on new scaling
        const playerSize = responsiveScaler.getSize('player');
        this.width = playerSize.width;
        this.height = Math.round(playerSize.width * (FIGURE_HEIGHT_TO_WIDTH + HEALTH_BAR_ROOM));
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
        this.lastX = this.x;
    }
    
    // Check if images are loaded
    areImagesLoaded() {
        return this.image.complete && this.image.naturalWidth > 0;
    }
}
