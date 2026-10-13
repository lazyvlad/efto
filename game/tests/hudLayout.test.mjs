// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../utils/hudLayout.js', import.meta.url));
const { HUD, hudScale, placeSpellBar } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

// A 16:9 field as large as fits, centred, as the game lays it out
function fieldIn(viewport, ratio = 16 / 9) {
    const height = Math.min(viewport.height, viewport.width / ratio, 900);
    const width = height * ratio;

    return { left: (viewport.width - width) / 2, top: (viewport.height - height) / 2, width, height };
}

function place(width, height) {
    const viewport = { width, height };
    const field = fieldIn(viewport);

    return placeSpellBar(viewport, field, hudScale(field.height));
}

test('the interface is full size on a full-size field and shrinks with it, to a floor', () => {
    assert.equal(hudScale(900), 1);
    assert.equal(hudScale(800), 1);
    assert.equal(hudScale(600), 0.75);
    assert.equal(hudScale(200), HUD.smallest);
});

test('a wide, short window puts the buttons in the margins beside the field', () => {
    // Zoomed in, or developer tools docked at the bottom
    assert.deepEqual(place(1900, 500), { place: 'sides', columns: false, lift: 0, shrink: 0 });
});

test('narrow margins take the buttons as columns', () => {
    assert.deepEqual(place(960, 415), { place: 'sides', columns: true, lift: 0, shrink: 0 });
});

test('a tall window puts the bar under the field and lifts the field to make room', () => {
    // Developer tools docked at the side
    const viewport = { width: 900, height: 700 };
    const field = fieldIn(viewport);
    const placed = placeSpellBar(viewport, field, hudScale(field.height));

    assert.equal(placed.place, 'below');
    // Lifted, the room under the field holds the bar
    const under = viewport.height - (field.top - placed.lift) - field.height;
    assert.ok(under >= (HUD.slotHeight + HUD.frame) * hudScale(field.height) + 2 * HUD.margin - 1e-9);
    assert.ok(field.top - placed.lift >= 0);
});

test('plenty of room under the field needs no lift', () => {
    assert.equal(place(900, 1400).lift, 0);
});

test('a window the field fills gives up the height of the bar, so the bar is never over it', () => {
    for (const [width, height] of [[1600, 900], [1280, 720]]) {
        const viewport = { width, height };
        const field = fieldIn(viewport);
        const scale = hudScale(field.height);
        const placed = placeSpellBar(viewport, field, scale);

        assert.equal(placed.place, 'below');
        assert.equal(placed.lift, field.top);
        // What is left under the smaller field holds the bar
        const under = viewport.height - (field.height - placed.shrink);
        assert.ok(Math.abs(under - ((HUD.slotHeight + HUD.frame) * scale + 2 * HUD.margin)) < 1e-9);
    }
});

test('a normal desktop window keeps the whole field and has the buttons beside it', () => {
    // A 1920x1080 screen with the browser's own bars: the field is capped at 1600x900
    const placed = place(1920, 950);

    assert.equal(placed.place, 'sides');
    assert.equal(placed.shrink, 0);
});
