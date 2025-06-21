// CombatText.js - Floating combat text for crits and other feedback
export class CombatText {
    constructor(x, y, text, color = '#FFD700', isCrit = false) {
        this.x = x;
        this.y = y;
        this.startY = y;
        this.text = text;
        this.color = color;
        this.isCrit = isCrit;
        
        // Animation properties
        this.life = 120; // 2 seconds at 60fps
        this.maxLife = 120;
        this.velocityY = -2; // Float upward
        this.velocityX = (Math.random() - 0.5) * 1; // Slight horizontal drift
        
        // Visual properties
        this.fontSize = isCrit ? 28 : 20;
        this.scale = isCrit ? 1.2 : 1.0;
        this.opacity = 1.0;
        
        // Crit-specific effects
        if (isCrit) {
            this.pulseAnimation = 0;
            this.glowIntensity = 1.0;
        }
    }
    
    update(deltaTimeMultiplier) {
        // Update position
        this.x += this.velocityX * deltaTimeMultiplier;
        this.y += this.velocityY * deltaTimeMultiplier;
        
        // Slow down vertical movement over time
        this.velocityY *= 0.98;
        
        // Update life and opacity
        this.life -= deltaTimeMultiplier;
        this.opacity = Math.max(0, this.life / this.maxLife);
        
        // Crit-specific animations
        if (this.isCrit) {
            this.pulseAnimation += 0.2 * deltaTimeMultiplier;
            this.scale = 1.2 + Math.sin(this.pulseAnimation) * 0.1;
            this.glowIntensity = 0.8 + Math.sin(this.pulseAnimation * 2) * 0.2;
        }
        
        return this.life > 0;
    }
    
    draw(ctx) {
        if (this.opacity <= 0) return;
        
        ctx.save();
        
        // Set opacity
        ctx.globalAlpha = this.opacity;
        
        // Position and scale
        ctx.translate(this.x, this.y);
        ctx.scale(this.scale, this.scale);
        
        // Font setup
        ctx.font = `bold ${this.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Crit glow effect
        if (this.isCrit) {
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10 * this.glowIntensity;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
        }
        
        // Text outline for better visibility
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 3;
        ctx.strokeText(this.text, 0, 0);
        
        // Main text
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);
        
        // Additional crit effects
        if (this.isCrit && this.opacity > 0.5) {
            // Sparkle effect
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#FFFFFF';
            for (let i = 0; i < 3; i++) {
                const angle = (this.pulseAnimation + i * 120) * (Math.PI / 180);
                const sparkleX = Math.cos(angle) * 25;
                const sparkleY = Math.sin(angle) * 25;
                ctx.fillRect(sparkleX - 1, sparkleY - 1, 2, 2);
            }
        }
        
        ctx.restore();
    }
} 