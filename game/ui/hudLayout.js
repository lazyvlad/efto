// Puts the decisions of utils/hudLayout.js on the page: the scale of the interface and the
// place of the spell buttons, as classes on the body and values the stylesheet reads
// (styles/spell-bar.css, "The interface follows the field").

import { HUD, hudScale, placeSpellBar } from '../utils/hudLayout.js';

// The touch layout has its own arrangement of the buttons (the same query as spell-bar.css)
const TOUCH_LAYOUT = '(max-width: 768px), (hover: none) and (pointer: coarse)';

const PLACES = ['spells-sides', 'spells-below'];

/**
 * Work out the layout for a field of this size, centred in the window.
 * @returns {{scale: number, place: string, columns: boolean, lift: number, shrink: number}|null} null on a phone held upright
 */
export function planHud(viewport, field) {
    const scale = hudScale(field.height);

    if (window.matchMedia(TOUCH_LAYOUT).matches) {
        // The touch buttons have their own places (styles/spell-bar.css). Held upright the
        // panels have their own too; held sideways they are scaled like a small window's.
        return viewport.width > viewport.height ? { scale, place: 'touch', columns: false, lift: 0, shrink: 0 } : null;
    }

    return { scale, ...placeSpellBar(viewport, field, scale) };
}

// The two top panels (styles/hud.css): in the band above the field when it is tall enough for
// them, else just inside the field's top corners; never across its frame. Their widths in the
// page: the slim panels' own (330 and about 260 page pixels before scaling).
const PANEL_HEIGHT = 104;
const PANEL_MARGIN = 6;

function placePanels(plan, viewport, field) {
    const root = document.documentElement.style;
    const tall = PANEL_HEIGHT * plan.scale;
    const inBand = field.top >= tall + PANEL_MARGIN * 2;
    const top = inBand ? Math.max(PANEL_MARGIN, field.top - tall - PANEL_MARGIN) : field.top + PANEL_MARGIN;
    // Side by side with the field's edges, or the window's when the field reaches them
    const left = Math.max(PANEL_MARGIN, field.left + PANEL_MARGIN);
    const right = Math.max(PANEL_MARGIN, viewport.width - field.left - field.width + PANEL_MARGIN);
    // Positions inside a scaled (zoomed) element are in its own pixels
    root.setProperty('--hud-top', `${top / plan.scale}px`);
    root.setProperty('--hud-left', `${left / plan.scale}px`);
    root.setProperty('--hud-right', `${right / plan.scale}px`);
}

/**
 * Apply a layout from planHud(), for the field where it finally stands.
 */
export function applyHud(plan, viewport, field) {
    const body = document.body;
    const root = document.documentElement.style;

    const touch = plan?.place === 'touch';

    body.classList.remove(...PLACES, 'spells-columns', 'hud-compact');
    // The panels are scaled; the spell bar is scaled and placed only with a keyboard
    body.classList.toggle('hud-scaled', plan !== null);
    // The slim panels (ui/hudPanels.js, styles/hud.css): wherever the panels are scaled; a phone
    // held upright keeps its own layout
    body.classList.toggle('hud-v2', plan !== null);
    body.classList.toggle('hud-desktop', plan !== null && !touch);

    if (!plan) {
        root.setProperty('--ui-scale', '1');
        return;
    }

    root.setProperty('--ui-scale', String(plan.scale));
    placePanels(plan, viewport, field);
    if (touch) return;

    body.classList.add(`spells-${plan.place}`);
    body.classList.toggle('spells-columns', plan.columns);
    body.classList.toggle('hud-compact', plan.scale < HUD.compactBelow);

    // Everything inside a scaled element is measured in its own, scaled pixels: a distance on
    // screen is divided by the scale to say it there
    const inside = (pixels) => `${pixels / plan.scale}px`;
    const fieldBottom = viewport.height - field.top - field.height;

    root.setProperty('--spells-centre', inside(field.left + field.width / 2));

    if (plan.place === 'sides') {
        // Each group against its edge of the field, standing on the field's bottom line
        root.setProperty('--spells-bottom', inside(fieldBottom + HUD.margin));
        root.setProperty('--spells-left-of-field', inside(viewport.width - field.left + HUD.margin));
        root.setProperty('--spells-right-of-field', inside(field.left + field.width + HUD.margin));
    } else {
        // Under the field, in the middle of the room there
        root.setProperty('--spells-bottom', inside(Math.max(0, (fieldBottom - (HUD.slotHeight + HUD.frame) * plan.scale) / 2)));
    }
}
