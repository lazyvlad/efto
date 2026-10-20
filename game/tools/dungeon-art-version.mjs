// The dungeon's art version: a fingerprint of every file under assets/dungeon/, written to
// dungeon/artVersion.js. The dungeon asks for its pictures with it (?v=), so a browser holding an
// older copy of a picture fetches the new one when the art changes (the names do not change).
// After copying new dungeon art: npm run dungeon-art (a test fails while it is out of date).
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const game = fileURLToPath(new URL('..', import.meta.url));

export function dungeonArtVersion() {
    const root = join(game, 'assets', 'dungeon');
    const files = [];
    (function walk(dir) {
        for (const name of readdirSync(dir).sort()) {
            const path = join(dir, name);
            if (statSync(path).isDirectory()) walk(path);
            else files.push(path);
        }
    })(root);
    const hash = createHash('sha256');
    for (const file of files) hash.update(relative(root, file)).update(readFileSync(file));
    return hash.digest('hex').slice(0, 10);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
    const version = dungeonArtVersion();
    writeFileSync(join(game, 'dungeon', 'artVersion.js'), `// Written by tools/dungeon-art-version.mjs (npm run dungeon-art): the fingerprint of the dungeon's art\nexport const ART_VERSION = '${version}';\n`);
    console.log('dungeon art version', version);
}
