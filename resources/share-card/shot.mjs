// The card shown when the site is shared (public/images/input-card.jpg), from card.html:
//   node resources/share-card/shot.mjs "$PWD/resources/share-card/card.html" public/images/input-card.jpg
import { chromium } from '../../game/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 630 } });
await p.goto('file://' + process.argv[2]); await p.waitForTimeout(800);
await p.screenshot({ path: process.argv[3], type: 'jpeg', quality: 82 }); await b.close();
