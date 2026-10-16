// Where the hunter may go up and down. He stands at the bottom of the field and can rise a
// little: a share of his own height ("rise" in gameConfig.player.movableArea), the same on every
// screen, enough to step up into a creature and drop back. While a boss's ambush or side charge
// is coming the room opens up by more (gameState.moveRaise, in his heights), to get out of its
// way. In a boss fight he is otherwise kept far enough below the boss (gameState.moveCeiling:
// the highest his head may come), so that however the field is sized he cannot stand right
// under it; Dragon Cry's free movement is not held to any of this.

import { gameConfig } from '../config/gameConfig.js';

/**
 * How high and how low his top (player.y) may go, in the field's own units.
 * @param {number} fieldHeight
 * @param {object} player     { height, figureHeight() }
 * @param {object} gameState  { moveRaise, moveCeiling }
 * @returns {{ minY: number, maxY: number }}
 */
export function movementBounds(fieldHeight, player, gameState = {}) {
    const rules = gameConfig.player.movableArea;
    const figure = typeof player.figureHeight === 'function' ? player.figureHeight() : player.height;
    const maxY = fieldHeight - player.height;
    const raise = gameState && gameState.moveRaise > 0 ? gameState.moveRaise : 0;

    let minY = maxY - figure * (rules.rise + raise);
    // Kept below the boss, except while the room is opened up for its ambush or side charge
    if (!raise && gameState && gameState.moveCeiling !== null && gameState.moveCeiling !== undefined) {
        minY = Math.max(minY, Math.min(maxY, gameState.moveCeiling));
    }
    return { minY: Math.max(0, minY), maxY };
}
