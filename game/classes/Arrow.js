import { Particle } from './Particle.js';
import { responsiveScaler } from '../utils/gameUtils.js';

export class Arrow {
    constructor(x, y, angle = -90, speed = null, sizeMultiplier = 1.0) {
        this.x = x;
        this.y = y;
        this.angle = angle; // Angle in degrees (-90 is straight up)
        this.speed = speed || 8; // Same speed as projectiles
        this.sizeMultiplier = sizeMultiplier; // Size multiplier for different arrow types
        this.width = responsiveScaler.getSize('projectile', 'width') * sizeMultiplier;
        this.height = responsiveScaler.getSize('projectile', 'height') * sizeMultiplier;
        this.color = '#FFD700'; // Golden arrow color
        this.trailColor = '#FFA500';
        
        // Trail system
        this.trail = [];
        this.maxTrailLength = 8;
        this.trailUpdateCounter = 0;
        
        // Convert angle to radians for movement calculation
        this.angleRad = (this.angle * Math.PI) / 180;
        this.velocityX = Math.cos(this.angleRad) * this.speed;
        this.velocityY = Math.sin(this.angleRad) * this.speed;
        
        this.active = true;
    }

    update(deltaTimeMultiplier, canvas, gameState) {
        if (!this.active) return false;

        // Move the arrow
        this.x += this.velocityX * deltaTimeMultiplier;
        this.y += this.velocityY * deltaTimeMultiplier;

        // Update trail every few frames for performance
        this.trailUpdateCounter++;
        if (this.trailUpdateCounter >= 2) {
            this.trail.push({ x: this.x + this.width/2, y: this.y + this.height/2 });
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
            this.trailUpdateCounter = 0;
        }

        // Remove arrow if it goes off screen
        if (this.y + this.height < 0 || this.x + this.width < 0 || this.x > canvas.logicalWidth) {
            this.active = false;
            return false;
        }

        return true;
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw trail
        if (this.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = this.trailColor;
            ctx.lineWidth = 2 * this.sizeMultiplier; // Scale trail thickness with arrow size
            ctx.globalAlpha = 0.6;
            
            ctx.beginPath();
            ctx.moveTo(this.trail[0].x, this.trail[0].y);
            for (let i = 1; i < this.trail.length; i++) {
                const alpha = i / this.trail.length;
                ctx.globalAlpha = alpha * 0.6;
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
            ctx.stroke();
            ctx.restore();
        }

        // Draw arrow
        ctx.save();
        ctx.translate(this.x + this.width/2, this.y + this.height/2);
        ctx.rotate(this.angleRad);
        
        // Arrow body
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
        
        // Arrow head (triangle)
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.moveTo(0, -this.height/2);
        ctx.lineTo(-this.width/4, -this.height/4);
        ctx.lineTo(this.width/4, -this.height/4);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();

        // Add subtle glow effect (scaled with arrow size)
        ctx.save();
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 4 * this.sizeMultiplier;
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.restore();
    }

    // Check collision with a rectangular object
    checkCollision(object) {
        if (!this.active || !object) return false;
        
        return this.x < object.x + object.width &&
               this.x + this.width > object.x &&
               this.y < object.y + object.height &&
               this.y + this.height > object.y;
    }

    // Create impact particles when arrow hits something
    createImpactParticles(particles, impactX = null, impactY = null) {
        const x = impactX !== null ? impactX : this.x + this.width/2;
        const y = impactY !== null ? impactY : this.y + this.height/2;
        
        for (let i = 0; i < 6; i++) {
            particles.push(new Particle(x, y, '#FFD700'));
        }
    }

    // Handle window resize with responsive scaling
    repositionOnResize() {
        const newWidth = responsiveScaler.getSize('projectile', 'width') * this.sizeMultiplier;
        const newHeight = responsiveScaler.getSize('projectile', 'height') * this.sizeMultiplier;
        this.width = newWidth;
        this.height = newHeight;
    }
} 