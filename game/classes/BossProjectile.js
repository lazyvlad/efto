import { gameConfig } from '../config/gameConfig.js';
import { DamageProjectile } from './DamageProjectile.js';
import { drawAura } from '../utils/glow.js';
import { playFireballImpactSound } from '../systems/audioSystem.js';

const pictures = new Map();

function picture(path) {
    if (!pictures.has(path)) {
        const image = new Image();
        image.src = path;
        pictures.set(path, image);
    }
    return pictures.get(path);
}

/**
 * Something a boss throws at the player: a weapon or a bolt with its own picture.
 *
 * It falls, hits and can be shot down like any harmful projectile. Only the drawing differs:
 * the picture keeps its proportions, and a thrown weapon turns around its centre as it flies.
 * The attack's settings are the boss's "attack" entry in data/bosses.js.
 */
export class BossProjectile extends DamageProjectile {
    constructor(attack, isValidYPosition, recentDropYPositions, gameState, canvas) {
        super({
            id: attack.id,
            name: attack.name,
            image: attack.image,
            damage: attack.damage,
            sound: attack.sound,
            type: 'boss',
            effects: 'boss_attack',
            attackerLevel: attack.attackerLevel,
            speed: attack.speed,
            size_multiplier: attack.size,
            color: '#FF4500'
        }, isValidYPosition, recentDropYPositions, gameState, canvas);

        this.picture = picture(attack.image);
        // Thrown weapons tumble, either way round; bolts keep pointing down
        this.rotation = attack.spin ? Math.random() * Math.PI * 2 : 0;
        this.spin = attack.spin ? (Math.random() < 0.5 ? -1 : 1) * attack.spin : 0;

        // Sideways speed, for attacks thrown at an angle. One that "follows" steers towards the
        // player as it falls, slowly enough to be outrun.
        this.vx = attack.vx || 0;
        this.follows = Boolean(attack.follows);
        // Called if it hurts the player (not if it is dodged or blocked)
        this.onPlayerHit = attack.onPlayerHit || null;
        // One sent in an Upheaval (utils/upheaval.js) does not fall: it flies straight on, up
        // out of the ground or across from a side, { vx, vy } a step, until it is off the field
        this.flight = attack.flight || null;
    }

    update(deltaTimeMultiplier, canvas, gameState) {
        this.rotation += this.spin * deltaTimeMultiplier;

        if (this.flight) {
            this.x += this.flight.vx * deltaTimeMultiplier;
            this.y += this.flight.vy * deltaTimeMultiplier;
            // Pointing the way it goes (a picture points down)
            if (!this.spin) this.rotation = Math.atan2(-this.flight.vx, this.flight.vy);
            this.glowAnimation += 0.2 * deltaTimeMultiplier;

            const width = canvas.logicalWidth;
            const height = canvas.logicalHeight;
            const gone = (this.flight.vx > 0 && this.x > width) || (this.flight.vx < 0 && this.x + this.width < 0)
                || (this.flight.vy < 0 && this.y + this.height < 0) || (this.flight.vy > 0 && this.y > height);
            return !gone;
        }

        if (this.follows && gameState.player) {
            const target = gameState.player.x + gameState.player.width / 2 - this.width / 2;
            const fastest = this.speed * 0.55;
            this.vx += Math.max(-0.06, Math.min(0.06, (target - this.x) * 0.002)) * deltaTimeMultiplier;
            this.vx = Math.max(-fastest, Math.min(fastest, this.vx));
        }
        this.x += this.vx * deltaTimeMultiplier;

        // Bolts point the way they are going
        if (!this.spin) this.rotation = -Math.atan2(this.vx, Math.max(0.1, this.speed));

        return super.update(deltaTimeMultiplier, canvas, gameState);
    }

    draw(ctx) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;

        // The reddish aura every harmful projectile has
        const aura = gameConfig.items.aura;
        if (aura.enabled) {
            const pulse = Math.sin(this.glowAnimation) * 0.15 + 0.85;
            drawAura(ctx, centerX, centerY, this.width * aura.radius, aura.harmfulColor, aura.opacity * pulse);
        }

        if (!this.picture.complete || !this.picture.naturalWidth) return;

        // The picture's longest side spans the hit box, plus a little: the box is the solid core
        const scale = this.width * 1.25 / Math.max(this.picture.naturalWidth, this.picture.naturalHeight);
        const drawWidth = this.picture.naturalWidth * scale;
        const drawHeight = this.picture.naturalHeight * scale;

        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.translate(centerX, centerY);
        ctx.rotate(this.rotation);
        ctx.drawImage(this.picture, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        ctx.restore();
    }

    // What a boss throws shares one hit sound with the rest of the fight (audioSystem.js), so
    // a row or a fan landing at once is heard once
    playImpactSound() {
        playFireballImpactSound();
    }
}
