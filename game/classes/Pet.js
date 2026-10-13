// The hunter's pet. It keeps busy: every so often it runs to fetch a falling item he is not
// going to reach, and in between it goes for the things that would hurt him, leaping at one
// and biting it out of the air. It rests a moment at his side after each. An item it fetches
// counts exactly as if the hunter had caught it.
//
// It only decides where it is and what it is after; catching an item is the collision
// system's (which asks catches()), what it bit is collected by the game (takeBitten()), and
// it is drawn with the hunter (Player.draw).

import { getSprite } from '../utils/spriteCache.js';
import { measureAhead } from '../utils/spriteFit.js';
import { petFor } from '../data/pets.js';
import { isHarmfulProjectile } from '../data/damageProjectiles.js';

const LEAP_STEPS = 16;     // How long a leap at a projectile lasts

// A picture of the pet, measured as soon as it has loaded: not in the middle of the game,
// the first time the pet runs
function load(path) {
    const image = new Image();
    image.onload = () => measureAhead([image]);
    image.src = path;
    return image;
}

export class Pet {
    constructor() {
        this.kind = null;
        this.setKind(null);
        this.reset();
    }

    // Become the pet of a side
    setKind(faction) {
        const kind = petFor(faction);
        if (this.kind && this.kind.id === kind.id) return;

        this.kind = kind;
        this.pictures = { sit: load(kind.sit), run: load(kind.run) };
    }

    // A new game: back at the hunter's side, with a while to go before the first fetch
    reset(rules = null) {
        this.x = null;              // Middle of the pet, along the ground (null: not placed yet)
        this.state = 'home';        // home (at the hunter's side), fetching, attacking, returning
        this.target = null;         // The item or projectile it is after
        this.fetchIn = rules ? rules.every / 2 : 0;     // Steps until it may fetch an item again
        this.rest = rules ? rules.rest : 0;             // Steps it rests at the hunter's side
        this.leap = 0;              // Steps left of a leap
        this.bitten = null;         // The projectile it has just bitten, until the game has been told
        this.bites = 0;             // How many it has bitten this game
        this.facing = 1;            // 1 facing right, -1 facing left
        this.moving = false;
        this.fetched = null;        // The item it has just fetched, until the game has been told
    }

    // Where it sits: at the hunter's side, on the left unless there is no room there
    home(player) {
        const left = player.x - player.width * 0.45;
        return left > player.width * 0.3 ? left : player.x + player.width * 1.45;
    }

    /**
     * One step of the game.
     * @param {object}   player        The hunter
     * @param {object[]} fallingItems  The items in the air
     * @param {object[]} projectiles   Everything else falling: what hurts, and the helpful spells
     * @param {object}   canvas        The game canvas (for its width)
     * @param {object}   rules         "pet" in config/gameConfig.js
     */
    update(player, fallingItems, projectiles, canvas, rules) {
        const home = this.home(player);
        if (this.x === null) this.x = home;

        const ground = player.groundY();
        const speed = canvas.logicalWidth * rules.speed;
        const before = this.x;

        if (this.fetchIn > 0) this.fetchIn--;
        if (this.rest > 0) this.rest--;
        if (this.leap > 0) this.leap--;

        if (this.state === 'home') {
            // Keeps up with the hunter, a little behind
            this.x += (home - this.x) * 0.2;
            if (this.rest <= 0) {
                // An item when it is time for one; otherwise, or with none worth the run,
                // something that would hurt him
                const item = this.fetchIn <= 0 ? this.pick(player, fallingItems, ground, speed, true) : null;
                const threat = item ? null : this.pick(player, projectiles.filter(projectile => isHarmfulProjectile(projectile.data)), ground, speed, false);

                this.target = item || threat;
                if (item) {
                    this.state = 'fetching';
                } else if (threat) {
                    this.state = 'attacking';
                } else {
                    this.rest = rules.lookAgain;
                }
            }
        } else if (this.state === 'fetching') {
            // The hunter got there first, or it fell: nothing to fetch any more
            if (!fallingItems.includes(this.target) || this.target.missed) {
                this.target = null;
                this.state = 'returning';
                this.rest = rules.lookAgain;
            } else {
                this.runTowards(this.target.x + this.target.width / 2, speed);
            }
        } else if (this.state === 'attacking') {
            const target = this.target;
            if (!projectiles.includes(target)) {
                // Shot down, or it has landed
                this.target = null;
                this.state = 'returning';
                this.rest = rules.lookAgain;
            } else {
                this.runTowards(target.x + target.width / 2, speed);

                // Close enough to leap at it: it is bitten out of the air
                const near = Math.abs(target.x + target.width / 2 - this.x) < player.width * 0.6;
                const low = target.y + target.height >= ground - player.figureHeight() * rules.leapHeight;
                if (near && low) {
                    this.bitten = target;
                    this.bites++;
                    this.leap = LEAP_STEPS;
                    this.target = null;
                    this.state = 'returning';
                    this.rest = rules.rest;
                }
            }
        } else {
            this.runTowards(home, speed);
            if (Math.abs(home - this.x) < speed) this.state = 'home';
        }

        const moved = this.x - before;
        this.moving = Math.abs(moved) > canvas.logicalWidth * 0.0012;
        if (this.moving) {
            this.facing = moved > 0 ? 1 : -1;
        } else if (this.state === 'home') {
            // At rest it looks towards the hunter
            this.facing = this.x < player.x + player.width / 2 ? 1 : -1;
        }
    }

    runTowards(x, speed) {
        this.x += Math.max(-speed, Math.min(speed, x - this.x));
    }

    // Something worth the run: low enough to be worth it and far enough from the ground for
    // the pet to get there in time. An item only if the hunter is not under it (he will catch
    // that one himself); a projectile wherever it is coming down.
    pick(player, falling, ground, speed, leaveToHunter) {
        const hunter = player.x + player.width / 2;
        let best = null;

        for (const item of falling) {
            if (item.missed || item.prevY === undefined) continue;

            const fall = item.y - item.prevY;       // How far it falls in a step
            if (fall <= 0) continue;

            const middle = item.x + item.width / 2;
            if (leaveToHunter && Math.abs(middle - hunter) < player.width * 1.2) continue;

            const stepsLeft = (ground - (item.y + item.height)) / fall;
            const stepsNeeded = Math.abs(middle - this.x) / speed;
            if (stepsLeft < stepsNeeded + 4 || stepsLeft > 150) continue;

            // The one that will land soonest
            if (!best || stepsLeft < best.stepsLeft) best = { item, stepsLeft };
        }

        return best ? best.item : null;
    }

    /**
     * Whether the pet catches this item now (asked by the collision system for every item).
     * @param {object} item    A falling item
     * @param {object} player  The hunter
     * @param {object} rules   "pet" in config/gameConfig.js
     */
    catches(item, player, rules) {
        if (item !== this.target || this.state !== 'fetching') return false;

        const reach = player.width * 0.6;
        const height = player.figureHeight() * rules.height;
        const near = Math.abs(item.x + item.width / 2 - this.x) < reach;
        const low = item.y + item.height >= player.groundY() - height;
        if (!near || !low) return false;

        this.fetched = item;
        this.target = null;
        this.state = 'returning';
        this.fetchIn = rules.every;
        this.rest = rules.rest;
        return true;
    }

    // The projectile just bitten, once: for the game to take it out of the air
    takeBitten() {
        const projectile = this.bitten;
        this.bitten = null;
        return projectile;
    }

    // The item just fetched, once: for the game to say so
    takeFetched() {
        const item = this.fetched;
        this.fetched = null;
        return item;
    }

    // Drawn on the ground the hunter stands on, sized against him
    draw(ctx, player, rules) {
        if (this.x === null) return;

        const leaping = this.leap > 0;
        const picture = this.moving || leaping ? this.pictures.run : this.pictures.sit;
        if (!picture.complete || !picture.naturalWidth) return;

        const figure = player.figureHeight();
        const ground = player.groundY();
        // Fitted into the same room either way: sitting it is as tall as that allows, running as long
        const sprite = getSprite(ctx, picture, figure * rules.length, figure * rules.height);

        ctx.save();
        // Its shadow on the ground
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(this.x, ground, sprite.width * 0.42, sprite.height * 0.07, 0, 0, Math.PI * 2);
        ctx.fill();

        // A leap carries it up off the ground and back
        const rise = leaping ? Math.sin(Math.PI * (1 - this.leap / LEAP_STEPS)) * figure * rules.leapHeight * 0.6 : 0;
        ctx.translate(this.x, ground - rise);
        ctx.scale(this.facing, 1);
        ctx.drawImage(sprite.canvas, -sprite.width / 2, -sprite.height, sprite.width, sprite.height);
        ctx.restore();
    }
}
