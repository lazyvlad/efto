import { getLogicalCanvasHeight } from '../utils/gameUtils.js';

// Shared movement and collision for everything that falls from the top of the screen
// (items, power-ups and damage projectiles).
export class FallingObject {
    // Pick a spawn Y above the screen that keeps some spacing from other recent drops
    findSpawnY(startY, isValidYPosition, recentDropYPositions) {
        let attemptY = startY;
        let attempts = 0;
        while (!isValidYPosition(attemptY, recentDropYPositions) && attempts < 10) {
            attemptY -= 100; // Try higher up
            attempts++;
        }
        recentDropYPositions.push(attemptY);
        return attemptY;
    }

    // Random downward drift direction based on the current fall angle range
    resetFallDirection(gameState) {
        this.fallAngle = Math.random() * (gameState.fallAngleMax - gameState.fallAngleMin) + gameState.fallAngleMin;
        this.horizontalSpeed = Math.sin(this.fallAngle * Math.PI / 180) * this.speed * (gameState.horizontalSpeedReduction || 0.3);
    }

    // Spin drift, air drag and side-wall bounces. Skipped for objects far from the edges that
    // are barely drifting, since none of it is visible there.
    applyDriftPhysics(delta, canvasWidth, restitution) {
        const needsPhysics = this.x < 100 || this.x > canvasWidth - 100 || Math.abs(this.horizontalSpeed) > 1;
        if (!needsPhysics) return;

        if (Math.abs(this.rotationSpeed) > 0.001) {
            this.applySpinDrift(delta);
        }
        // Only apply air resistance if the object has significant horizontal movement or high speed
        if (Math.abs(this.horizontalSpeed) > 0.5 || this.speed > 5) {
            this.applyAirResistance(delta);
        }

        this.bounceOffSideWalls(canvasWidth, restitution);
    }

    // Spin nudges the trajectory sideways (very subtle Magnus effect)
    applySpinDrift(delta) {
        const magnusForce = Math.abs(this.rotationSpeed) * 0.03;
        this.horizontalSpeed += magnusForce * Math.sign(this.rotationSpeed) * delta;
    }

    applyAirResistance(delta, airDensity = 0.001) {
        const totalSpeed = Math.sqrt(this.speed * this.speed + this.horizontalSpeed * this.horizontalSpeed);

        // Skip air resistance for slow-moving objects
        if (totalSpeed < 2 && Math.abs(this.horizontalSpeed) < 1) {
            return;
        }

        // Very gentle drag
        const linearDrag = 1 - Math.min(airDensity * delta, 0.01); // Cap at 1% per frame
        const angularDrag = 1 - Math.min(airDensity * 0.3 * delta, 0.005); // Even gentler for rotation

        this.speed *= linearDrag;
        this.horizontalSpeed *= linearDrag;
        this.rotationSpeed *= angularDrag;

        if (Math.abs(this.horizontalSpeed) < 0.01) this.horizontalSpeed = 0;
        if (Math.abs(this.rotationSpeed) < 0.001) this.rotationSpeed = 0;
    }

    // Keep the object inside the side walls; reverse its drift (with energy loss) when it runs into one
    bounceOffSideWalls(canvasWidth, restitution) {
        const hitLeft = this.x <= 0;
        const hitRight = this.x + this.width >= canvasWidth;
        if (!hitLeft && !hitRight) return;

        this.x = hitLeft ? 0 : canvasWidth - this.width;

        const movingIntoWall = hitLeft ? this.horizontalSpeed < 0 : this.horizontalSpeed > 0;
        if (movingIntoWall) {
            this.horizontalSpeed = -this.horizontalSpeed * restitution;
            // Add a small amount of spin for visual effect
            this.rotationSpeed += (Math.random() - 0.5) * 0.1;
        }
    }

    // Vertical movement, including the reverse gravity power-up.
    // tuning: { angleRange, speedFactor, bounceRestitution }
    // Returns true on the step this object is released from reverse gravity.
    applyGravity(delta, canvasWidth, gameState, tuning) {
        if (!gameState.reverseGravityActive) {
            // Objects that were exempted during the last reverse gravity are eligible again
            if (this.wasReversed === false) {
                this.wasReversed = undefined;
            }

            // Reverse gravity just ended for this object - go back to normal downward movement
            let released = false;
            if (this.wasReversed) {
                this.wasReversed = false;
                this.bouncedOffTopDuringReverse = false;
                this.reverseGravityVerticalSpeed = 0;
                this.reverseGravityHorizontalSpeed = 0;
                this.reverseGravityAngle = 0;
                this.speed = Math.abs(this.speed);
                released = true;
            }

            this.y += this.speed * delta;
            return released;
        }

        // Individually exempted objects keep falling normally
        if (this.wasReversed === false) {
            this.y += this.speed * delta;
            return false;
        }

        // First step under reverse gravity: head upward at a random angle around straight up, slowed
        // down to give the player time to react
        if (this.wasReversed !== true) {
            const angleDeviation = (Math.random() - 0.5) * 2 * tuning.angleRange;
            this.reverseGravityAngle = 270 + angleDeviation; // 270° = straight up
            const angleRad = this.reverseGravityAngle * Math.PI / 180;
            this.reverseGravityVerticalSpeed = -Math.abs(Math.sin(angleRad) * this.speed) * tuning.speedFactor;
            this.reverseGravityHorizontalSpeed = Math.cos(angleRad) * this.speed * tuning.speedFactor;
            this.wasReversed = true;
        }

        this.y += this.reverseGravityVerticalSpeed * delta;
        this.x += this.reverseGravityHorizontalSpeed * delta;

        // Bounce off the top, keeping the horizontal momentum
        if (this.y <= 0) {
            this.y = 0;
            this.reverseGravityVerticalSpeed = Math.abs(this.reverseGravityVerticalSpeed) * tuning.bounceRestitution;
            this.bouncedOffTopDuringReverse = true;
        }

        // Bounce off the sides
        if (this.x < 0) {
            this.x = 0;
            this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * tuning.bounceRestitution;
        } else if (this.x > canvasWidth - this.width) {
            this.x = canvasWidth - this.width;
            this.reverseGravityHorizontalSpeed = -this.reverseGravityHorizontalSpeed * tuning.bounceRestitution;
        }

        return false;
    }

    // Fallen past the bottom edge. Never true during reverse gravity - objects bounce back instead.
    hasLeftScreen(canvas, gameState) {
        return !gameState.reverseGravityActive && this.y > getLogicalCanvasHeight(canvas) + this.height;
    }

    // Box overlap against the player, covering the whole path travelled during the last
    // simulation step so fast objects can't skip over the player between steps.
    checkCollision(player) {
        const playerBounds = player.getCollisionBounds();
        const prevX = this.prevX ?? this.x;
        const prevY = this.prevY ?? this.y;
        const left = Math.min(this.x, prevX);
        const right = Math.max(this.x, prevX) + this.width;
        const top = Math.min(this.y, prevY);
        const bottom = Math.max(this.y, prevY) + this.height;

        return left < playerBounds.x + playerBounds.width &&
               right > playerBounds.x &&
               top < playerBounds.y + playerBounds.height &&
               bottom > playerBounds.y;
    }
}
