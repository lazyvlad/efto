// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { access } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const load = async file => import(`data:text/javascript;base64,${(await readFile(new URL(file, import.meta.url))).toString('base64')}`);
const { places, WORLD_MAP_PICTURE } = await load('../data/worldMap.js');
const { backgrounds } = await load('../data/backgrounds.js');

test('every zone of both sides has one place on the map, and on the map it is', () => {
    for (const [side, zones] of Object.entries(backgrounds)) {
        const there = places.filter(place => place.faction === side).map(place => place.zone).sort((a, b) => a - b);
        assert.deepEqual(there, zones.map((zone, index) => index + 1), `the ${side} zones on the map`);
    }
    for (const place of places) {
        assert.ok(place.x > 0 && place.x < 100 && place.y > 0 && place.y < 100, 'a pin stands off the map');
        assert.ok(place.description);
    }
});

test('the map and the pictures of places not yet in the game exist', async () => {
    await access(new URL(`../${WORLD_MAP_PICTURE}`, import.meta.url));
    for (const place of places.filter(place => !place.faction)) {
        assert.ok(place.name);
        await access(new URL(`../${place.image}`, import.meta.url));
    }
});
