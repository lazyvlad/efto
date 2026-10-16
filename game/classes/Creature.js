import { CREATURE_SHEET, CREATURE_FRAMES } from '../data/creatures.js';

const STEP_MS = 1000 / 60;

// One of a zone's creatures (data/creatures.js): a small fight of its own, hand to hand.
//
// It comes in at the top of the field and stalks there, moving about as its kind does, while
// it closes in: its approach goes from 0 (at the top) to 1 (just above the hunter's head)
// over the zone's time, and it comes down with it. Arrows push it back: each one that strikes
// takes some of its approach away, and it stops closing in for a moment. Reverse gravity
// throws it about and back up.
//
// Its approach full, it is on him ("close"), and stays: it follows him about, no faster than
// it can, and every so often it pounces at him. A pounce is a wind-up that cannot be cut
// short, then a lunge at where he was, a bite if he is still there, and back. It bites again
// and again; it leaves only when it is killed, by arrows or his weapon.
//
// Here: where it is, what it is doing, and how it is drawn. x is its middle, y the top of its
// cell; size is how big a cell is drawn.
export class Creature {
    /**
     * @param {string} id     Its id in data/creatures.js
     * @param {object} data   Its entry there
     * @param {object} setup  { x, size, health, approachSteps, moveSpeed, biteEvery (steps,
     *                        [low, high], between pounces once it is on him), loot }
     */
    constructor(id, data, setup) {
        this.id = id;
        this.data = data;
        this.size = setup.size;
        this.x = setup.x;
        this.y = -setup.size;
        this.prevX = this.x;
        this.prevY = this.y;
        this.health = setup.health;
        this.maxHealth = setup.health;
        this.loot = setup.loot || [];
        this.approachSteps = setup.approachSteps;
        this.moveSpeed = setup.moveSpeed;
        this.biteEvery = setup.biteEvery;

        this.state = 'enter';           // enter, stalk, close, pounce, lunge, back, dying, leaving, gone
        this.stateMs = 0;
        this.approach = 0;              // 0 at the top .. 1 above his head
        this.stagger = 0;               // Steps it does not close in, after an arrow
        this.biteIn = 0;                // Steps until it pounces, once it is on him
        this.goalX = this.x;
        this.goalIn = 0;
        this.travelMs = Math.random() * 500;   // Not all in step: its loop starts somewhere along
        this.hitMs = 0;
        this.facing = 1;                // 1 as painted, -1 mirrored
        this.alpha = 1;
        this.thrown = null;             // Thrown about by reverse gravity: { vx, vy, spin }
        this.tilt = 0;
        this.lunge = null;              // The pounce under way: { fromX, fromY, toX, toY, endX, endY }
        this.pounceAt = null;           // Where he was when it began to pounce
        this.bitten = false;
    }

    get alive() {
        return this.state !== 'dying' && this.state !== 'leaving' && this.state !== 'gone';
    }

    // Where its body is on the field: what arrows hit, and what bites
    core() {
        const { core } = this.data;
        const left = this.facing > 0 ? core.x : 1 - core.x - core.width;
        return {
            x: this.x - this.size / 2 + left * this.size,
            y: this.y + core.y * this.size,
            width: core.width * this.size,
            height: core.height * this.size,
        };
    }

    // Steps until its next pounce, once it is on him
    nextBite() {
        const [low, high] = this.biteEvery;
        return low + Math.random() * (high - low);
    }

    // Where its cell's top is for an approach: its body near the top of the field at 0, just
    // above his head at 1
    yFor(approach, field) {
        const { core } = this.data;
        const top = field.height * 0.1 - core.y * this.size;
        const last = field.player.y - (core.y + core.height) * this.size - this.size * 0.08;
        return top + (Math.max(top, last) - top) * approach;
    }

    /**
     * One step of the game.
     * @param {number} delta  Steps' worth of time (1 at 60 a second; less when time is slowed)
     * @param {object} field  { player: his body { x, y, width, height }, width, height,
     *                        frozen (Frost Nova), reversed (reverse gravity) }
     * @returns {'bite'|null}  'bite' on the step its pounce lands on him
     */
    update(delta, field) {
        this.prevX = this.x;
        this.prevY = this.y;
        const ms = delta * STEP_MS;
        // A Frost Trap's chill (systems/frostTrapSystem.js) slows how it moves, not how it acts:
        // its warning and the timing of its frames are as ever
        const move = this.chill > 0 ? (field.chillMove ?? 0.5) : 1;

        if (this.hitMs > 0) this.hitMs = Math.max(0, this.hitMs - ms);

        if (this.state === 'dying') {
            this.stateMs += ms;
            if (this.stateMs >= sum(CREATURE_FRAMES.death.ms)) this.state = 'gone';
            return null;
        }
        if (this.state === 'leaving') {
            this.stateMs += ms;
            this.alpha = Math.max(0, 1 - this.stateMs / 400);
            this.y -= 3 * delta;
            if (this.alpha <= 0) this.state = 'gone';
            return null;
        }
        // Frost Nova holds it where it is, whatever it was doing
        if (field.frozen || this.state === 'gone') return null;

        this.travelMs += ms;
        const him = field.player;
        const hisMiddle = him.x + him.width / 2;

        // Reverse gravity: thrown up and about, bouncing off the sides and the top, losing its
        // approach as it goes. A pounce under way is broken off.
        if (field.reversed && this.state !== 'enter') {
            if (!this.thrown) {
                this.thrown = { vx: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3), vy: -(3 + Math.random() * 2), spin: (Math.random() - 0.5) * 0.12 };
                this.setState('stalk');
                this.lunge = null;
            }
            const t = this.thrown;
            t.vy += 0.06 * delta;
            this.x += t.vx * delta;
            this.y += t.vy * delta;
            this.tilt += t.spin * delta;
            const top = this.yFor(0, field);
            if (this.y < top) { this.y = top; t.vy = Math.abs(t.vy) * 0.6; }
            if (this.y > this.yFor(this.approach, field)) { this.y = this.yFor(this.approach, field); t.vy = -Math.abs(t.vy) * 0.8; }
            if (this.x < this.size * 0.3 || this.x > field.width - this.size * 0.3) {
                this.x = Math.max(this.size * 0.3, Math.min(field.width - this.size * 0.3, this.x));
                t.vx = -t.vx;
            }
            this.approach = Math.max(0, this.approach - delta / (this.approachSteps * 0.25));
            return null;
        }
        if (this.thrown) {
            this.thrown = null;
            this.tilt = 0;
        }

        this.stateMs += ms;

        if (this.state === 'enter') {
            const to = this.yFor(0, field);
            this.y = Math.min(to, this.y + Math.max(2, (to - this.y) * 0.05) * delta * move);
            if (this.y >= to) this.setState('stalk');
            return null;
        }

        // A pounce already in the air when the frost takes it lands (slowed, but never held)
        if (this.state === 'lunge') return this.updateLunge(delta, field, Math.max(move, 0.5));

        // Back from a pounce, to where it keeps over him
        if (this.state === 'back') {
            this.backMs = (this.backMs || 0) + ms * Math.max(move, 0.5);
            const t = Math.min(1, this.backMs / 220);
            const lunge = this.lunge;
            this.x = lunge.endX + (lunge.fromX - lunge.endX) * t;
            this.y = lunge.endY + (lunge.fromY - lunge.endY) * t;
            if (t >= 1) {
                this.backMs = 0;
                this.lunge = null;
                this.biteIn = this.nextBite();
                this.setState('close');
            }
            return null;
        }

        // Closing in, unless an arrow has just pushed it back; and coming down with it
        if (this.state === 'stalk') {
            if (this.stagger > 0) this.stagger -= delta;
            else this.approach = Math.min(1, this.approach + delta * move / this.approachSteps);
        }
        const toY = this.yFor(this.approach, field);
        this.y += Math.max(-6, Math.min(3, (toY - this.y) * 0.08)) * delta * move;

        if (this.state === 'stalk') {
            this.wander(delta * move, field, hisMiddle);
            if (this.approach >= 1) {
                this.biteIn = this.nextBite() * 0.5;
                this.setState('close');
            }
        } else if (this.state === 'close') {
            // On him: it keeps over him as he moves (no faster than it can), and pounces now and then
            const gap = hisMiddle - this.x;
            const most = this.moveSpeed * 1.6 * delta * move;
            this.x += Math.max(-most, Math.min(most, gap));
            if (Math.abs(gap) > this.size * 0.05) this.facing = gap < 0 ? -1 : 1;
            if (this.stagger > 0) this.stagger -= delta;
            else if (move > 0) this.biteIn -= delta;    // Held in the frost, it does not pounce
            if (this.biteIn <= 0) {
                // It marks where he is, and will lunge there whatever he does next
                this.pounceAt = Math.max(this.size * 0.3, Math.min(field.width - this.size * 0.3, hisMiddle));
                this.facing = this.pounceAt < this.x ? -1 : 1;
                this.setState('pounce');
            }
        } else if (this.state === 'pounce') {
            // The warning (it cannot be cut short): it gathers itself, then lunges at where he was when it began
            if (this.stateMs >= sum(CREATURE_FRAMES.windup.ms)) {
                const body = this.core();
                this.lunge = {
                    fromX: this.x,
                    fromY: this.y,
                    toX: this.pounceAt,
                    // Its body half way into his
                    toY: this.y + (him.y + body.height * 0.5) - (body.y + body.height),
                };
                this.bitten = false;
                this.lungeMs = 0;
                this.setState('lunge');
            }
        }
        return null;
    }

    // Moving about at the top: towards a spot it picks now and then, mostly near him
    wander(delta, field, hisMiddle) {
        this.goalIn -= delta;
        if (this.goalIn <= 0) {
            const near = Math.random() < 0.6;
            const spread = near ? field.width * 0.2 : field.width * 0.5;
            const middle = near ? hisMiddle : field.width / 2;
            this.goalX = Math.max(this.size * 0.4, Math.min(field.width - this.size * 0.4, middle + (Math.random() - 0.5) * 2 * spread));
            this.goalIn = 60 + Math.random() * 90;
        }
        const gap = this.goalX - this.x;
        const most = this.moveSpeed * delta;
        this.x += Math.max(-most, Math.min(most, gap));
        if (Math.abs(gap) > this.size * 0.05) this.facing = gap < 0 ? -1 : 1;
    }

    // Its flight takes the first attack frame's time (longer, chilled); the bite comes when it
    // gets there, and it goes back once both the flight and the frames are done
    updateLunge(delta, field, move = 1) {
        const total = sum(CREATURE_FRAMES.attack.ms);
        this.lungeMs = (this.lungeMs || 0) + delta * STEP_MS * move;
        const t = Math.min(1, this.lungeMs / CREATURE_FRAMES.attack.ms[0]);
        const lunge = this.lunge;
        this.x = lunge.fromX + (lunge.toX - lunge.fromX) * t;
        this.y = lunge.fromY + (lunge.toY - lunge.fromY) * t;

        let bit = null;
        if (!this.bitten && t >= 1) {
            this.bitten = true;
            if (overlaps(this.core(), field.player)) bit = 'bite';
        }
        if (t >= 1 && this.stateMs >= total) {
            // Bitten or missed, it goes back to where it keeps over him, for the next
            lunge.endX = this.x;
            lunge.endY = this.y;
            this.setState('back');
        }
        return bit;
    }

    setState(state) {
        this.state = state;
        this.stateMs = 0;
        this.lungeMs = 0;
        this.backMs = 0;
    }

    /**
     * An arrow struck it: the damage, and how much of its approach it loses. True if that
     * killed it.
     */
    takeHit(damage, pushback = 0, staggerSteps = 0) {
        if (!this.alive) return false;
        this.health -= damage;
        this.hitMs = CREATURE_FRAMES.hit.ms[0];
        if (this.health <= 0) {
            this.die();
            return true;
        }
        // Not once it is pouncing: that has been seen coming. On him, it is driven off him.
        if (pushback > 0 && (this.state === 'stalk' || this.state === 'close')) {
            this.approach = Math.max(0, this.approach - pushback);
            this.stagger = Math.max(this.stagger, staggerSteps);
            this.setState('stalk');
        }
        return false;
    }

    /**
     * The hunter's weapon struck it, up close: it hurts, and breaks off a pounce. True if that
     * killed it.
     */
    takeMelee(damage, pushback) {
        if (!this.alive) return false;
        this.health -= damage;
        this.hitMs = CREATURE_FRAMES.hit.ms[0];
        if (this.health <= 0) {
            this.die();
            this.felled = true;     // Brought down: its points and its loot (systems/creatureSystem.js)
            return true;
        }
        // A pounce is broken off. Knocked back (if blows knock back), it comes again; else it
        // stays on him, and pounces again in its time
        this.lunge = null;
        if (pushback > 0 || this.state === 'stalk' || this.state === 'enter') {
            this.approach = Math.max(0, this.approach - pushback);
            this.stagger = Math.max(this.stagger, 30);
            if (this.state !== 'enter') this.setState('stalk');
        } else {
            this.biteIn = this.nextBite();
            this.setState('close');
        }
        return false;
    }

    die() {
        this.hitMs = 0;
        this.thrown = null;
        this.setState('dying');
    }

    // A boss is coming: it slinks away, and leaves nothing
    leave() {
        if (!this.alive) return;
        this.setState('leaving');
    }

    // The cell of its sheet to show now
    frame() {
        if (this.state === 'dying') return pick(CREATURE_FRAMES.death, this.stateMs);
        if (this.hitMs > 0) return CREATURE_FRAMES.hit.frames[0];
        if (this.thrown) return CREATURE_FRAMES.hit.frames[0];
        if (this.state === 'pounce') return pick(CREATURE_FRAMES.windup, this.stateMs);
        if (this.state === 'lunge') return pick(CREATURE_FRAMES.attack, this.stateMs);
        return pick(CREATURE_FRAMES.travel, this.travelMs);
    }

    opacity() {
        if (this.state === 'dying') {
            const { ms, fade } = CREATURE_FRAMES.death;
            let at = this.stateMs;
            for (let i = 0; i < ms.length; i++) {
                if (at < ms[i]) return fade[i];
                at -= ms[i];
            }
            return 0;
        }
        return this.alpha;
    }

    draw(ctx, sheet) {
        // A sheet decoded and ready (systems/creatureSystem.js), or nothing yet
        if (!sheet || this.state === 'gone') return;

        const cell = CREATURE_SHEET.cell;
        const index = this.frame();
        const sx = (index % CREATURE_SHEET.columns) * cell;
        const sy = Math.floor(index / CREATURE_SHEET.columns) * cell;

        ctx.save();
        ctx.globalAlpha = this.opacity();
        ctx.translate(this.x, this.y + this.size / 2);
        if (this.tilt) ctx.rotate(this.tilt);
        if (this.facing < 0) ctx.scale(-1, 1);
        ctx.drawImage(sheet, sx, sy, cell, cell, -this.size / 2, -this.size / 2, this.size, this.size);
        // The hit: a brief brightening over the pose
        if (this.hitMs > 0) {
            ctx.globalCompositeOperation = 'lighter';
            ctx.globalAlpha = 0.35 * this.hitMs / CREATURE_FRAMES.hit.ms[0];
            ctx.drawImage(sheet, sx, sy, cell, cell, -this.size / 2, -this.size / 2, this.size, this.size);
        }
        ctx.restore();

        if (this.alive) this.drawBars(ctx);
    }

    // Under it: its health, and below that how close it has come (red as it nears)
    drawBars(ctx) {
        const body = this.core();
        const width = Math.max(40, body.width * 1.4);
        const x = body.x + body.width / 2 - width / 2;
        const y = this.y + Math.min(this.size * 0.92, (this.data.core.y + this.data.core.height) * this.size + 10);

        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, width + 2, 9);
        ctx.fillStyle = '#C0392B';
        ctx.fillRect(x, y, width * Math.max(0, this.health / this.maxHealth), 4);
        const near = this.approach;
        ctx.fillStyle = `rgb(${Math.round(200 + 55 * near)}, ${Math.round(200 - 140 * near)}, 60)`;
        ctx.fillRect(x, y + 5, width * near, 2);
        ctx.restore();
    }
}

function sum(list) {
    return list.reduce((total, ms) => total + ms, 0);
}

// The frame of an animation at a time into it (a loop goes round; anything else stops on its last)
function pick(animation, ms) {
    const total = sum(animation.ms);
    let at = animation.loop ? ms % total : Math.min(ms, total - 0.001);
    for (let i = 0; i < animation.frames.length; i++) {
        if (at < animation.ms[i]) return animation.frames[i];
        at -= animation.ms[i];
    }
    return animation.frames[animation.frames.length - 1];
}

function overlaps(a, b) {
    return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
