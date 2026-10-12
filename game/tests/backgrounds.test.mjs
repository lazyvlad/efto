// Run with: npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Loaded through a data: URL, as in gameClock.test.mjs
const source = await readFile(new URL('../data/backgrounds.js', import.meta.url));
const { FACTIONS, backgrounds, backgroundIndexForLevel } = await import(`data:text/javascript;base64,${source.toString('base64')}`);

const everyTwoLevels = { levelsPerBackground: 2, whenFinished: 'loop' };

test('a side with no backgrounds has none to show', () => {
    assert.equal(backgroundIndexForLevel(0, 0, everyTwoLevels), -1);
    assert.equal(backgroundIndexForLevel(7, 0, everyTwoLevels), -1);
});

test('the game moves to the next background every so many levels', () => {
    const indexes = [0, 1, 2, 3, 4, 5].map(level => backgroundIndexForLevel(level, 10, everyTwoLevels));
    assert.deepEqual(indexes, [0, 0, 1, 1, 2, 2]);
});

test('past the last background the game starts again from the first, or stays on the last', () => {
    assert.equal(backgroundIndexForLevel(20, 10, everyTwoLevels), 0);
    assert.equal(backgroundIndexForLevel(23, 10, everyTwoLevels), 1);
    assert.equal(backgroundIndexForLevel(23, 10, { levelsPerBackground: 2, whenFinished: 'hold' }), 9);
});

test('every side has a list, and every background has an id, a name and a picture in its own folder', async () => {
    assert.deepEqual(Object.keys(backgrounds).sort(), Object.keys(FACTIONS).sort());

    for (const [side, list] of Object.entries(backgrounds)) {
        const ids = list.map(entry => entry.id);
        assert.equal(new Set(ids).size, ids.length, `${side} has a repeated id`);

        for (const entry of list) {
            assert.ok(entry.id && entry.name, `${side} has a background without an id or a name`);
            assert.ok(entry.image.startsWith(`assets/backgrounds/${side}/`), `${entry.id} is not in the ${side} folder`);
            await readFile(new URL(`../${entry.image}`, import.meta.url));
        }
    }
});

test('the page fetches the same starting pictures early as the game shows', async () => {
    const page = (await readFile(new URL('../index.html', import.meta.url))).toString();

    for (const [side, list] of Object.entries(backgrounds)) {
        assert.ok(page.includes(`${side}: '${list[0].image}'`), `index.html preloads another picture for the ${side}`);
    }
    assert.ok(!page.includes('assets/ui/background'), 'the old background is still on the page');
});
