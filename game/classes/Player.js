import { movementBounds } from '../utils/movement.js';
import { gameConfig } from '../config/gameConfig.js';
import { assetManager } from '../utils/AssetManager.js';
import { assetRegistry } from '../data/assetRegistry.js';
import { responsiveScaler } from '../utils/gameUtils.js';
import { CharacterAnimator } from './CharacterAnimator.js';
import { characterFor } from '../data/playerCharacters.js';
import { maskOfPicture, maskHitsRect, maskHitsCircle } from '../utils/hitMask.js';
import { perfProbeOn, noteHunterDraw } from '../utils/perfProbe.js';

// The player is a whole figure (data/playerCharacters.js has one for each side), so the
// player's box is this many times taller than it is wide. The figure stands as tall as the
// box; a broad one reaches a little outside it to either side.
export const FIGURE_HEIGHT_TO_WIDTH = 1.88;
// Under the feet, inside the player's box, is room for his health and his quiver, a row each:
// this much of the box's width, top to bottom.
const HEALTH_BAR_ROOM = 0.48;     // Under his feet: health, arrows, and the swing timer

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
     * @param {object}  [status]  { health, arrows, capacity, slotSize }: his health as a number,
     *                  and his quiver, for the two rows under his feet
     */
    draw(ctx, shield = 0, health = 1, status = null) {
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
        // Fighting hand to hand he is drawn in parts, his arms swinging (systems/meleeSystem.js)
        if (this.drawMelee && this.animator && this.drawMelee(ctx, this.pictureBounds())) {
            // Drawn
        } else if (this.animator) {
            const startedAt = perfProbeOn() ? performance.now() : 0;
            this.animator.draw(ctx, this.x + this.width / 2, this.y + figureHeight, figureHeight / this.character.heightInPicture);
            if (startedAt) noteHunterDraw(performance.now() - startedAt);
        }
        
        if (bubble) drawShieldFront(ctx, bubble);
        ctx.restore();
        
        this.drawStatus(ctx, this.y + figureHeight, barRoom, health, status);
    }

    // How tall the figure is, and where the ground under his feet is (his pet stands on it)
    figureHeight() {
        return this.height - this.width * HEALTH_BAR_ROOM;
    }
    
    groundY() {
        return this.y + this.figureHeight();
    }
    
    // Under his feet, two rows: his health (a heart, the bar, the number), then his quiver (the
    // arrows, a segment for each slot, the count). The bars line up, the numbers beside them.
    // Health goes green, amber, red; the quiver amber and pulsing with a quarter or less left,
    // red when empty. Without status (a hunter drawn outside a game): the health bar alone.
    drawStatus(ctx, top, room, health, status) {
        const fill = Math.max(0, Math.min(1, health));
        // Three rows: health, the quiver, and the swing timer
        const rowHeight = Math.max(5, this.width * 0.072);
        const gap = Math.max(4, this.width * 0.086);
        const width = this.width * 0.72;
        const x = this.x + (this.width - width) / 2;
        const firstY = top + (room - rowHeight * 3 - gap * 2) / 2;
        const secondY = firstY + rowHeight + gap;
        const thirdY = secondY + rowHeight + gap;
        const fontSize = Math.max(11, Math.round(this.width * 0.15));
        const icon = Math.round(fontSize * 1.25);
        const colors = fill <= 0.25 ? ['#ff8a7a', '#8e0c0c', '#ff8a7a'] : fill <= 0.6 ? ['#ffe680', '#b97800', '#ffd56a'] : ['#7dfa7d', '#0c7a0c', '#a8f5a8'];
        const number = (text, y, color) => {
            // Plain and bold: Marcellus's figures are too ornate to read at this size
            ctx.font = `bold ${fontSize}px 'Trebuchet MS', 'Segoe UI', Verdana, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 4;
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.92)';
            ctx.strokeText(text, x + width + 5, y);
            ctx.fillStyle = color;
            ctx.fillText(text, x + width + 5, y);
        };

        ctx.save();
        // Health: the heart, the bar, the number
        drawHeart(ctx, x - icon * 0.5 - 4, firstY + rowHeight / 2, icon * 0.45);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x, firstY, width, rowHeight);
        const gradient = ctx.createLinearGradient(0, firstY, 0, firstY + rowHeight);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        ctx.fillStyle = gradient;
        ctx.fillRect(x, firstY, width * fill, rowHeight);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 1, firstY - 1, width + 2, rowHeight + 2);
        ctx.strokeStyle = '#b9902f';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - 0.5, firstY - 0.5, width + 1, rowHeight + 1);
        if (status) number(String(Math.max(0, Math.ceil(status.health))), firstY + rowHeight / 2, colors[2]);

        // The quiver: the arrows, a segment for each slot, the count
        if (status && status.capacity > 0) {
            const slots = Math.max(1, Math.round(status.capacity / (status.slotSize || 50)));
            const count = Math.max(0, Math.floor(status.arrows));
            const low = count <= status.capacity / 4;
            const pulse = count > 0 && low ? 0.5 + 0.5 * Math.sin(performance.now() / 220) : 0;
            const arrowsPicture = assetManager.getImage(assetRegistry.powerups.bronzeArrows);
            if (arrowsPicture && arrowsPicture.complete && arrowsPicture.naturalWidth) {
                ctx.drawImage(arrowsPicture, x - icon - 2, secondY + rowHeight / 2 - icon / 2, icon, icon);
            }
            // The well, its frame red when empty and glowing amber when low
            ctx.fillStyle = 'rgba(12, 9, 6, 0.9)';
            ctx.fillRect(x - 1, secondY - 1, width + 2, rowHeight + 2);
            // The glow when low: a wider see-through frame, not a canvas shadow (too slow)
            if (pulse > 0) {
                ctx.strokeStyle = `rgba(255, 176, 60, ${0.55 * pulse})`;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 3, secondY - 3, width + 6, rowHeight + 6);
            }
            ctx.strokeStyle = count <= 0 ? '#b3231a' : '#8f7a45';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 1.5, secondY - 1.5, width + 3, rowHeight + 3);
            const segmentGap = 2;
            const segment = (width - segmentGap * (slots - 1)) / slots;
            // One gradient for the row, shared by its segments
            const fillGradient = ctx.createLinearGradient(0, secondY, 0, secondY + rowHeight);
            fillGradient.addColorStop(0, low ? '#ffd37a' : '#fff0b0');
            fillGradient.addColorStop(1, low ? '#c46a00' : '#c99a2e');
            for (let slot = 0; slot < slots; slot++) {
                const share = Math.max(0, Math.min(1, (count - slot * (status.slotSize || 50)) / (status.slotSize || 50)));
                const left = x + slot * (segment + segmentGap);
                // An empty slot a shade lighter than the well, so the slots read apart
                ctx.fillStyle = '#3a2e1d';
                ctx.fillRect(left, secondY, segment, rowHeight);
                if (share > 0) {
                    ctx.fillStyle = fillGradient;
                    ctx.fillRect(left, secondY, segment * share, rowHeight);
                }
            }
            number(String(count), secondY + rowHeight / 2, count <= 0 ? '#ff7a6a' : low ? '#ffc85a' : '#f4ecd8');
        }

        // The swing timer: his weapon, and a bar that fills as his next swing comes ready; full,
        // it glows. Step in to strike when it is, and away while it fills again.
        const melee = status && status.melee;
        if (melee) {
            const ready = melee.ready >= 1;
            const weaponPicture = melee.icon ? assetManager.getImage(melee.icon) : null;
            if (weaponPicture && weaponPicture.complete && weaponPicture.naturalWidth) {
                ctx.drawImage(weaponPicture, x - icon - 2, thirdY + rowHeight / 2 - icon / 2, icon, icon);
            }
            ctx.fillStyle = 'rgba(12, 9, 6, 0.9)';
            ctx.fillRect(x - 1, thirdY - 1, width + 2, rowHeight + 2);
            if (ready) {
                const glow = 0.45 + 0.35 * Math.sin(performance.now() / 180);
                ctx.strokeStyle = `rgba(150, 215, 255, ${glow})`;
                ctx.lineWidth = 4;
                ctx.strokeRect(x - 3, thirdY - 3, width + 6, rowHeight + 6);
            }
            ctx.strokeStyle = ready ? '#9fd8ff' : '#5d6b7a';
            ctx.lineWidth = 1;
            ctx.strokeRect(x - 1.5, thirdY - 1.5, width + 3, rowHeight + 3);
            const swingGradient = ctx.createLinearGradient(0, thirdY, 0, thirdY + rowHeight);
            swingGradient.addColorStop(0, ready ? '#e8f6ff' : '#b8c6d4');
            swingGradient.addColorStop(1, ready ? '#5aa9e6' : '#55606c');
            ctx.fillStyle = swingGradient;
            ctx.fillRect(x, thirdY, width * Math.max(0, Math.min(1, melee.ready)), rowHeight);
            number(ready ? 'READY' : `${melee.seconds.toFixed(1)}s`, thirdY + rowHeight / 2, ready ? '#9fd8ff' : '#c9d3dc');
        }
        ctx.restore();

        // What is eating at his health is named under the rows (drawn as before)
        this.drawDebuffs(ctx, x, width, (melee ? thirdY : status ? secondY : firstY) + rowHeight);
    }

    // What is eating at his health without anything hitting him (a curse, a shadowbolt's burn),
    // named under his rows with the time it has left: this.debuffs is set by the game each
    // frame as [{ label, color }]
    drawDebuffs(ctx, x, width, bottom) {
        ctx.save();
        const debuffs = this.debuffs || [];
        if (debuffs.length > 0) {
            const fontSize = Math.max(11, Math.round(this.width * 0.15));
            ctx.font = `bold ${fontSize}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.lineJoin = 'round';
            debuffs.forEach((debuff, index) => {
                const textY = bottom + 3 + index * (fontSize + 2);
                ctx.lineWidth = 3;
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.strokeText(debuff.label, x + width / 2, textY);
                ctx.fillStyle = debuff.color;
                ctx.fillText(debuff.label, x + width / 2, textY);
            });
        }
        ctx.restore();
    }
    
    // What catches things: the player's box from his head to his feet (not the health bar
    // under them). What hurts him goes by his shape instead (isHitBy below).
    getCollisionBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.figureHeight()
        };
    }
    
    // His body, head to feet: where a storm or a stomp finds him, and how close to a boss he is
    getBodyBounds() {
        return this.getCollisionBounds();
    }
    
    // Where his picture is drawn, as CharacterAnimator.draw places it: by the middle of his feet
    pictureBounds() {
        const figureHeight = this.figureHeight();
        const height = figureHeight / this.character.heightInPicture;
        const width = height * (this.image.naturalWidth || this.image.width) / (this.image.naturalHeight || this.image.height);
        const { foot } = this.character.rig;
        return {
            left: this.x + this.width / 2 - width * foot.u,
            top: this.y + figureHeight - height * foot.v,
            width,
            height,
        };
    }
    
    // His shape (utils/hitMask.js), made once for each picture he wears; null until it has loaded
    hitMask() {
        if (this.maskOf !== this.image) {
            if (!this.areImagesLoaded()) return null;
            this.maskOf = this.image;
            this.mask = maskOfPicture(this.image);
        }
        return this.mask;
    }
    
    /**
     * Whether something that hurts reaches him: a rectangle ({ x, y, width, height }), or a
     * circle ({ x, y, radius }). Only where he is drawn counts; with his shape not to be had,
     * his body's box does.
     */
    isHitBy(shape) {
        const mask = this.hitMask();
        if (shape.radius !== undefined) {
            if (mask) return maskHitsCircle(mask, this.pictureBounds(), shape.x, shape.y, shape.radius);
            const body = this.getBodyBounds();
            const nearestX = Math.max(body.x, Math.min(shape.x, body.x + body.width));
            const nearestY = Math.max(body.y, Math.min(shape.y, body.y + body.height));
            return Math.hypot(nearestX - shape.x, nearestY - shape.y) <= shape.radius;
        }
        if (mask) return maskHitsRect(mask, this.pictureBounds(), shape);
        const body = this.getBodyBounds();
        return shape.x < body.x + body.width && shape.x + shape.width > body.x
            && shape.y < body.y + body.height && shape.y + shape.height > body.y;
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
            // Keep player within movable area bounds (utils/movement.js)
            const { minY, maxY } = movementBounds(canvasHeight, this);
            this.y = Math.max(minY, Math.min(maxY, this.y));
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

// A small heart, red with a dark edge, centred on (x, y)
function drawHeart(ctx, x, y, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(size / 8, size / 8);
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.bezierCurveTo(-5, 2.5, -7, 0, -7, -2.5);
    ctx.bezierCurveTo(-7, -4.5, -5.4, -6, -3.5, -6);
    ctx.bezierCurveTo(-2, -6, -0.8, -5.1, 0, -4);
    ctx.bezierCurveTo(0.8, -5.1, 2, -6, 3.5, -6);
    ctx.bezierCurveTo(5.4, -6, 7, -4.5, 7, -2.5);
    ctx.bezierCurveTo(7, 0, 5, 2.5, 0, 6);
    ctx.closePath();
    ctx.fillStyle = '#d8392b';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#000';
    ctx.stroke();
    ctx.restore();
}
