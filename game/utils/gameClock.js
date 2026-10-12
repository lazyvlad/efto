// Fixed-timestep clock for the game simulation.
//
// The simulation always advances in steps of exactly 1/60s, so every "per frame at 60fps"
// constant in the game means "per simulation step" regardless of the display refresh rate.
// Rendering happens once per display frame and interpolates between the last two steps.

export const SIM_STEP_MS = 1000 / 60;

// Longest real-time gap a single frame may account for (tab switches, long GC pauses)
const MAX_FRAME_MS = 250;
// Upper bound on catch-up work per frame; below ~12fps the game slows down instead of spiralling
const MAX_STEPS_PER_FRAME = 5;

export class FixedStepClock {
    constructor() {
        this.lastFrameTime = null;
        this.accumulator = 0;
        this.simTimeMs = 0;
    }

    // Call once per display frame. Returns the real time elapsed since the previous frame (ms).
    beginFrame(nowMs) {
        const elapsed = this.lastFrameTime === null ? 0 : nowMs - this.lastFrameTime;
        this.lastFrameTime = nowMs;
        return Math.max(0, Math.min(MAX_FRAME_MS, elapsed));
    }

    // Bank the frame's elapsed time and return how many simulation steps are due.
    takeSteps(frameMs) {
        this.accumulator += frameMs;
        let steps = Math.floor(this.accumulator / SIM_STEP_MS);
        if (steps > MAX_STEPS_PER_FRAME) {
            steps = MAX_STEPS_PER_FRAME;
            this.accumulator = 0;
        } else {
            this.accumulator -= steps * SIM_STEP_MS;
        }
        return steps;
    }

    // Advance simulation time by one step. Call once per simulation step.
    tick() {
        this.simTimeMs += SIM_STEP_MS;
    }

    // Fraction of a step the display is ahead of the simulation (0..1), for render interpolation
    get alpha() {
        return this.accumulator / SIM_STEP_MS;
    }

    // Drop banked time so the simulation doesn't fast-forward after a pause
    discardPending() {
        this.accumulator = 0;
    }

    // Simulation time in ms. Only advances while the game is actually running, so anything
    // timed against it (spell cooldowns, level timers) stops while paused.
    now() {
        return this.simTimeMs;
    }
}

export const gameClock = new FixedStepClock();
