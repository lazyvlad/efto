// A bolt of lightning from one point to another (Thunderfury): a jagged line of light with a
// blue glow, that flickers to a new shape now and then and fades in a quarter of a second.
// It lives among the particles: updated and drawn as they are.

const LIFE_STEPS = 16;

export class LightningBolt {
    constructor(fromX, fromY, toX, toY) {
        this.fromX = fromX;
        this.fromY = fromY;
        this.toX = toX;
        this.toY = toY;
        // Drawn by its own points, not moved: these only satisfy the renderer
        this.x = 0;
        this.y = 0;
        this.prevX = 0;
        this.prevY = 0;
        this.life = LIFE_STEPS;
        this.points = this.shape();
    }

    // A new jagged path between the two ends: kinks across the line, fewer near the ends
    shape() {
        const length = Math.hypot(this.toX - this.fromX, this.toY - this.fromY);
        const segments = Math.max(6, Math.round(length / 28));
        const normalX = -(this.toY - this.fromY) / (length || 1);
        const normalY = (this.toX - this.fromX) / (length || 1);
        const points = [];
        for (let step = 0; step <= segments; step++) {
            const share = step / segments;
            const reach = Math.sin(share * Math.PI) * Math.min(26, length * 0.08);
            const kink = step === 0 || step === segments ? 0 : (Math.random() - 0.5) * 2 * reach;
            points.push([this.fromX + (this.toX - this.fromX) * share + normalX * kink, this.fromY + (this.toY - this.fromY) * share + normalY * kink]);
        }
        return points;
    }

    update(deltaTimeMultiplier = 1) {
        this.life -= deltaTimeMultiplier;
        if (Math.random() < 0.35) this.points = this.shape();
        return this.life > 0;
    }

    draw(ctx) {
        const fade = Math.max(0, this.life / LIFE_STEPS);
        const trace = () => {
            ctx.beginPath();
            this.points.forEach(([x, y], index) => (index ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
            ctx.stroke();
        };

        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        // The glow as wide see-through strokes, widest and faintest first, then the white-hot
        // core: no canvas shadow blur, which is slow enough to drop frames
        for (const [lineWidth, alpha] of [[16, 0.12], [10, 0.22], [6, 0.45]]) {
            ctx.strokeStyle = `rgba(110, 190, 255, ${alpha * fade})`;
            ctx.lineWidth = lineWidth;
            trace();
        }
        ctx.strokeStyle = `rgba(235, 248, 255, ${fade})`;
        ctx.lineWidth = 2.5;
        trace();
        ctx.restore();
    }
}
