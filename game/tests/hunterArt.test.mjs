// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../data/hunterArt.js', import.meta.url));
const { hunterArt } = await import(`data:text/javascript;base64,${source.toString('base64')}`);
const exists = path => access(new URL(`../${path}`, import.meta.url)).then(() => true, () => false);

test('both hunters have a body, a face to keep, and every picture they are drawn with', async () => {
    for (const side of ['alliance', 'horde']) {
        const body = hunterArt.characters[side];
        assert.ok(await exists(body.base), body.base);
        assert.ok(await exists(body.faceSource), body.faceSource);
        assert.ok(body.faceLock.length > 2);
    }
    // The tauren's whole head is his own: put back after everything
    assert.ok(hunterArt.characters.horde.headClear.length > 0);

    const missing = [];
    for (const looks of Object.values(hunterArt.items)) {
        for (const parts of Object.values(looks)) {
            for (const part of parts || []) {
                if (!(await exists(part.layer))) missing.push(part.layer);
            }
        }
    }
    assert.deepEqual(missing, []);
});

test('every piece of the hunter sets, and the clothes the hunters start in, have their looks', async () => {
    const items = await readFile(new URL('../data/gameItems.js', import.meta.url), 'utf8');
    const pieces = [...items.matchAll(/id: "([\w-]+)"[^}]*type: "set_piece"/g)].map(match => match[1]);
    assert.equal(pieces.length, 25);

    for (const itemId of pieces) {
        assert.ok(hunterArt.items[hunterArt.aliases[itemId] || itemId], `${itemId} has no looks`);
    }
    for (const itemId of ['starter-alliance-pajama-top', 'starter-alliance-quiver', 'starter-horde-leather-vest', 'starter-horde-totem']) {
        assert.ok(hunterArt.items[itemId].alliance && hunterArt.items[itemId].horde, itemId);
    }
    // The quiver is drawn in two parts: behind him, and its strap over him
    assert.deepEqual(hunterArt.items['starter-alliance-quiver'].alliance.map(part => part.order), [-20, 36]);
    // The warcloth hangs over the belt, where a tabard is worn under it
    const belt = hunterArt.items['cryptstalker-belt'].horde[0].order;
    assert.ok(hunterArt.items['starter-horde-warcloth'].horde[0].order > belt);
    assert.ok(hunterArt.items['starter-alliance-tabard'].horde[0].order < belt);
});

test('nothing is drawn on the tauren\'s head, and rings and trinkets are not drawn at all', () => {
    assert.equal(hunterArt.items['giantstalker-helmet'].horde, null);
    assert.ok(hunterArt.items['giantstalker-helmet'].alliance);
    assert.equal(hunterArt.items['cryptstalker-ring'].alliance, null);
    assert.equal(hunterArt.items['atalai-tablet'].horde, null);
});
