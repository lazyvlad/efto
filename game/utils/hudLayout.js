// Where the interface around the playing field goes, and how large it is drawn.
//
// The field shrinks with the window (a zoomed-in browser, developer tools open, a small
// window). The spell buttons and the two panels are sized in pixels, so without this they
// would cover more and more of a smaller field. Here they are scaled with the field, and the
// spell buttons are moved off it whenever there is room beside or under it.
//
// The numbers describe the spell bar as styles/spell-bar.css draws it at full size.
export const HUD = {
    fullHeight: 800,    // A field this tall or taller has the interface at full size
    smallest: 0.6,      // It is never drawn smaller than this share of full size
    compactBelow: 0.85, // Smaller than this, the buttons lose their names to keep the keys readable
    slotWidth: 60,
    slotHeight: 65,
    gap: 4,             // Between two buttons
    frame: 8,           // The padding and border around a group
    groupGap: 10,       // Between the two groups when the bar is in one piece
    margin: 8,          // Kept clear around the buttons, in screen pixels
    groups: [3, 2],     // Buttons in each group: the shots, the rest
};

/**
 * How large the interface is drawn against its full size, for a field of this height.
 */
export function hudScale(fieldHeight, hud = HUD) {
    return Math.max(hud.smallest, Math.min(1, fieldHeight / hud.fullHeight));
}

// Sizes on screen of a row or column of buttons at a scale
function along(count, size, scale, hud) {
    return (count * size + (count - 1) * hud.gap + hud.frame) * scale;
}

/**
 * Decide where the spell buttons go.
 *
 * In order of preference, each used when it fits:
 *   'sides'  the two groups stand in the empty margins left and right of the field, as rows,
 *            or as columns when the margins are narrow;
 *   'below'  the bar sits under the field, which is moved up to make the room, and made a
 *            little smaller when the window has no room to spare (a window the field fills).
 * The buttons are never left lying over the field.
 *
 * @param {Object} viewport - { width, height } of the window
 * @param {Object} field - { left, top, width, height } of the playing field, centred
 * @param {number} scale - From hudScale()
 * @returns {{place: string, columns: boolean, lift: number, shrink: number}} lift: how far up
 *          to move the field; shrink: how much height the field gives up
 */
export function placeSpellBar(viewport, field, scale, hud = HUD) {
    const most = Math.max(...hud.groups);
    const side = Math.min(field.left, viewport.width - field.left - field.width);

    if (side >= along(most, hud.slotWidth, scale, hud) + 2 * hud.margin) {
        return { place: 'sides', columns: false, lift: 0, shrink: 0 };
    }

    if (side >= along(1, hud.slotWidth, scale, hud) + 2 * hud.margin
        && field.height >= along(most, hud.slotHeight, scale, hud) + 2 * hud.margin) {
        return { place: 'sides', columns: true, lift: 0, shrink: 0 };
    }

    const barHeight = along(1, hud.slotHeight, scale, hud) + 2 * hud.margin;
    const spare = viewport.height - field.height;

    if (spare >= barHeight) {
        // The field was centred, with half the spare room under it: move it up until the
        // whole bar fits there
        return { place: 'below', columns: false, lift: Math.max(0, barHeight - spare / 2), shrink: 0 };
    }

    // No room at all: the field gives up the height of the bar and stands at the top
    return { place: 'below', columns: false, lift: field.top, shrink: barHeight - spare };
}
