import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';
import { responsiveScaler } from '../utils/gameUtils.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { characterFor } from '../data/playerCharacters.js';

// The player is a whole figure (data/playerCharacters.js has one for each side), so the
// player's box is this many times taller than it is wide. The figure stands as tall as the
// box; a broad one reaches a little outside it to either side.
export const FIGURE_HEIGHT_TO_WIDTH = 1.88;
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
    
    // Wear a picture made from what he has on (utils/hunterLooks.js): the same drawing as the
    // character's own, dressed, so the same rig moves it
    setPicture(picture) {
        if (!picture || picture === this.image) return;
        this.image = picture;
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
        if (!this.animator && this.areImagesLoaded()) {
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
     * @param {number}  shield  Steps (1/60 s) left of a Power Word: Shield around him, 0 for none
     * @param {number}  health  How much health he has left, 0 to 1, shown under his feet
     */
    draw(ctx, shield = 0, health = 1) {
        // The box holds him and, under his feet, his health bar
        const barRoom = this.width * HEALTH_BAR_ROOM;
        const figureHeight = this.height - barRoom;
        const bubble = shield > 0 ? {
            x: this.x + this.width / 2,
            y: this.y + figureHeight / 2,
            radius: figureHeight / 2 + 10,   // Around the whole of him
            left: shield,
        } : null;
        
        // His pet, on the ground beside him (the game gives him one: classes/Pet.js)
        if (this.pet) this.pet.draw(ctx, this, gameConfig.pet);
        
        ctx.save();
        // The shield is round him: its haze behind him, its rim and light in front
        if (bubble) drawShieldBack(ctx, bubble);
        
        // He stands in the middle of the player's box, his feet just above the health bar
        if (this.animator) {
            this.animator.draw(ctx, this.x + this.width / 2, this.y + figureHeight, figureHeight / this.character.heightInPicture);
        }
        
        if (bubble) drawShieldFront(ctx, bubble);
        ctx.restore();
        
        this.drawHealthBar(ctx, this.y + figureHeight, barRoom, health);
    }
    
    // How tall the figure is, and where the ground under his feet is (his pet stands on it)
    figureHeight() {
        return this.height - this.width * HEALTH_BAR_ROOM;
    }
    
    groundY() {
        return this.y + this.figureHeight();
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
        
        // What is eating at his health without anything hitting him (a curse, a shadowbolt's
        // burn), named right under the bar with the time it has left: this.debuffs is set by
        // the game each frame as [{ label, color }]
        const debuffs = this.debuffs || [];
        if (debuffs.length > 0) {
            const fontSize = Math.max(11, Math.round(this.width * 0.15));
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.lineJoin = 'round';
            debuffs.forEach((debuff, index) => {
                const textY = y + height + 3 + index * (fontSize + 2);
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.strokeText(debuff.label, x + width / 2, textY);
                ctx.fillStyle = debuff.color;
                ctx.fillText(debuff.label, x + width / 2, textY);
            });
        }
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
        // A picture put together from what he wears is a canvas, drawn already
        if (typeof HTMLCanvasElement !== 'undefined' && this.image instanceof HTMLCanvasElement) return this.image.width > 0;
        return this.image.complete && this.image.naturalWidth > 0;
    }
}

// ----- Power Word: Shield -----
// A bubble of holy light round the hunter, as the priest's spell looks: a warm golden haze
// inside, brightest at the edge, a glow thrown out round it, a bright rim with light running
// along it and a gleam on top. It breathes slowly, and flickers in its last second and a half.

const SHIELD_FADING = 90;

// How strongly it shows now, 0 to 1
function shieldStrength(left, time) {
    if (left >= SHIELD_FADING) return 1;
    return 0.35 + 0.65 * Math.abs(Math.cos(time * 9));
}

function shieldRadius({ radius }, time) {
    return radius * (1 + Math.sin(time * 2.2) * 0.02);
}

function drawShieldBack(ctx, bubble) {
    const time = performance.now() / 1000;
    const r = shieldRadius(bubble, time);
    const { x, y } = bubble;

    ctx.save();
    ctx.globalAlpha = shieldStrength(bubble.left, time);

    // A shadow under its edge, so it stands out on a bright place too
    const shade = ctx.createRadialGradient(x, y, r * 0.92, x, y, r * 1.12);
    shade.addColorStop(0, 'rgba(40, 20, 0, 0)');
    shade.addColorStop(0.5, 'rgba(40, 20, 0, 0.35)');
    shade.addColorStop(1, 'rgba(40, 20, 0, 0)');
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.12, 0, Math.PI * 2);
    ctx.fill();

    // The glow it throws round itself
    ctx.globalCompositeOperation = 'lighter';
    const halo = ctx.createRadialGradient(x, y, r * 0.85, x, y, r * 1.45);
    halo.addColorStop(0, 'rgba(255, 190, 50, 0)');
    halo.addColorStop(0.3, 'rgba(255, 185, 40, 0.45)');
    halo.addColorStop(1, 'rgba(255, 170, 20, 0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // The haze inside: clear in the middle, thicker towards the edge, lit from above
    const haze = ctx.createRadialGradient(x - r * 0.25, y - r * 0.3, r * 0.1, x, y, r);
    haze.addColorStop(0, 'rgba(255, 250, 220, 0.14)');
    haze.addColorStop(0.6, 'rgba(255, 222, 120, 0.14)');
    haze.addColorStop(0.88, 'rgba(255, 205, 70, 0.32)');
    haze.addColorStop(1, 'rgba(255, 190, 40, 0.6)');
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawShieldFront(ctx, bubble) {
    const time = performance.now() / 1000;
    const r = shieldRadius(bubble, time);
    const { x, y } = bubble;

    ctx.save();
    ctx.globalAlpha = shieldStrength(bubble.left, time);
    ctx.lineCap = 'round';

    // The rim, glowing
    ctx.shadowColor = 'rgba(255, 180, 20, 1)';
    ctx.shadowBlur = 24;
    ctx.strokeStyle = 'rgba(255, 240, 175, 0.95)';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();

    // A fainter ring just inside it
    ctx.shadowBlur = 8;
    ctx.strokeStyle = 'rgba(255, 225, 130, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, r - 6, 0, Math.PI * 2);
    ctx.stroke();

    // Light running round the rim, two ways at once
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = 'rgba(255, 210, 80, 1)';
    ctx.shadowBlur = 30;
    ctx.strokeStyle = 'rgba(255, 245, 200, 0.95)';
    ctx.lineWidth = 6;
    for (const start of [time * 1.6, -time * 1.1 + Math.PI]) {
        ctx.beginPath();
        ctx.arc(x, y, r, start, start + 0.8);
        ctx.stroke();
    }

    // The gleam on top
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.82, -2.5, -1.75);
    ctx.stroke();
    ctx.restore();
}
