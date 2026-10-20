// The dungeon lab: plays the Stockade headless, 50 runs for each kind of hunter (bare, zone 2 and
// zone 4 gear; all four on Auto, or all four played turn by turn by a bot doing the plain action
// each turn: no spells), and says how
// often each wins; and the same with Auto on (everyone casting everything as it comes ready). After a balance change: npm run dungeon-lab. Numbers to try, as JSON:
// npm run dungeon-lab -- '{"F.convict.maxHp":400,"P.paladin.castTime":1.2}'

import { createBattle, step, setAuto, autoTurn } from '../dungeon/battle.js';
import { PARTY, FOES } from '../dungeon/stockade.js';
function mulberry(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
const tune = JSON.parse(process.argv[2]||'{}');
for (const [path,v] of Object.entries(tune)) { const [o,k,f]=path.split('.'); const obj=o==='P'?PARTY[k]:FOES[k]; if(Array.isArray(obj[f])) obj[f]=v; else obj[f]=v; }
const gearSets = { naked: {}, zone2: { health: 20, armor: 30, attackPower: 12, crit: 0.03 }, zone4: { health: 45, armor: 60, attackPower: 30, crit: 0.06, dodge: 0.03 } };
const out=[];
for (const [label, gear] of Object.entries(gearSets)) for (const play of (process.env.LAB_ROWS || 'turns,auto').split(',')) {
  let won=0, times=[], waves=0;
  for (let s=1;s<=50;s++){
    const b=createBattle({gear, rng:mulberry(s)});
    setAuto(b, play==='auto');
    for (let t=0;t<900 && !b.result;t+=1/30){ step(b,1/30); b.events.length=0;
      if (play==='turns') autoTurn(b); }
    if(b.result==='won'){won++; times.push(b.time);} waves+=b.wave+1;
  }
  out.push(`${label}/${play}: ${won*2}% ${times.length?Math.round(times.reduce((x,y)=>x+y)/times.length):'-'}s w${(waves/50).toFixed(1)}`);
}
console.log(out.join(' | '));
