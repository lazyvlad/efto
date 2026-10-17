// Opening only. Append/reorder sections here without baking offsets into AI or rendering.
const sections=[
 {id:'approach',name:'Overgrown approach',length:28},
 {id:'barracks',name:'Ogre encampment',length:28},
 {id:'moldar',name:'Mol’dar courtyard',length:28}
];
let offset=0;
export const SECTIONS=sections.map(s=>{const item={...s,start:offset,end:offset+s.length};offset=item.end;return item;});
const baseBlocks=[
 {id:'low-column-a',x0:8,x1:9,z0:1,z1:2.2,bottom:0,top:1.2},
 {id:'low-column-b',x0:18.7,x1:19.8,z0:3.6,z1:4.7,bottom:0,top:1.2},
 {id:'gallery-column-a',x0:9.2,x1:10.5,z0:8.7,z1:10,bottom:1.6,top:2.45},
 {id:'gallery-column-b',x0:14.7,x1:16,z0:10.5,z1:11.9,bottom:1.6,top:2.4},
 {id:'gallery-column-c',x0:19,x1:20.3,z0:8.6,z1:9.9,bottom:1.6,top:2.45}
];
// claude-dire-maul: the gallery is not one floor but pieces: in each stretch a gap to jump
// (rel. 12.2-13.6), and in the first two a stretch that gives way under him (rel. 17.2-18.6)
function galleryPieces(from,to){
 const cuts=[];for(const start of [0,28,56]){cuts.push({x0:start+12.2,x1:start+13.6,gap:true});if(start<56)cuts.push({x0:start+17.2,x1:start+18.6,crumble:'crumble-'+start});}
 const pieces=[];let x=from;
 for(const c of cuts){if(c.x0>x)pieces.push({id:'gallery',x0:x,x1:c.x0,z0:8.5,z1:12,h:1.6});if(c.crumble)pieces.push({id:'gallery',crumble:c.crumble,x0:c.x0,x1:c.x1,z0:8.5,z1:12,h:1.6});x=c.x1;}
 pieces.push({id:'gallery',x0:x,x1:to,z0:8.5,z1:12,h:1.6});return pieces;
}
export const WORLD={length:offset,depth:12,speed:3.1,gravity:160/9,jump:20/3,sections:SECTIONS,
 exit:{x:offset-1.2,z:3.5},
 surfaces:[{id:'court',x0:0,x1:offset,z0:0,z1:8.5,h:0},...galleryPieces(2,offset-2),...SECTIONS.flatMap(s=>[
  {id:s.id+'-west-stairs',x0:s.start+3,x1:s.start+6,z0:5.5,z1:9,ramp:true},
  {id:s.id+'-east-stairs',x0:s.start+22,x1:s.start+25,z0:5.5,z1:9,ramp:true}
 ])],
 blocks:SECTIONS.flatMap(s=>baseBlocks.map(b=>({...b,id:s.start?`${s.id}-${b.id}`:b.id,x0:b.x0+s.start,x1:b.x1+s.start})))
};
// Solid screens make places to break sight between encounters; neither grants invisibility.
for(const x of [26.5,54.5])WORLD.blocks.push(
 {id:'refuge-lower-'+x,x0:x,x1:x+1.4,z0:2.2,z1:5.6,bottom:0,top:1.1},
 {id:'refuge-upper-'+x,x0:x,x1:x+1.4,z0:8.7,z1:10.1,bottom:1.6,top:2.7});
WORLD.blocks.push({id:'camp-tent',x0:40.3,x1:42.1,z0:6.8,z1:8.15,bottom:0,top:2.4,art:'tent'}, {id:'camp-crates',x0:34.2,x1:35.8,z0:3.5,z1:4.5,bottom:0,top:2.1,art:'crates'});
for(const x of [34,51])WORLD.blocks.push({id:'camp-barrels-'+x,x0:x-.7,x1:x+.7,z0:11.1,z1:12,bottom:1.6,top:2.45,art:'barrels'});
const circuit=(x,z=3)=>[{x,z},{x:x+6,z},{x:x+5,z:z+2},{x:x-1.5,z:z+1.8}].map(p=>({...p,y:0}));
const member=(id,pack,kind,x,z,patrol,options={})=>({id,pack,kind,caster:kind==='lookout',name:kind==='lookout'?'Gordok frostweaver':'Gordok reaver',x,z,patrol,height:kind==='lookout'?1.7:1.8,radius:.48,vision:kind==='lookout'?7.2:6.5,patrolSpeed:kind==='lookout'?1.1:1.2,wait:.9,zone:pack==='approach'?[0,28]:[28,56],...options});
export const ENCOUNTERS=[
 member('approach-lead','approach','reaver',12,3,circuit(12),{wait:1.4}),
 member('approach-wing','approach','reaver',11,3.8,[{x:11,z:3.8,y:0},{x:17,z:3.8,y:0},{x:17,z:5.7,y:0},{x:11,z:5.7,y:0}],{wait:2.4}),
 member('approach-watch','approach','lookout',10.5,5.8,circuit(10.5,5.8),{wait:3.4}),
 member('barracks-lead','barracks','reaver',40,3,circuit(40),{wait:1.2}),
 member('barracks-wing','barracks','reaver',39,3.8,[{x:39,z:3.8,y:0},{x:45,z:3.8,y:0},{x:45,z:5.7,y:0},{x:39,z:5.7,y:0}],{wait:2.2}),
 member('barracks-watch','barracks','lookout',38.5,5.8,circuit(38.5,5.8),{wait:3.2}),
 member('gallery-watch','barracks','lookout',40.5,10.8,[{x:40.5,z:10.8,y:1.6},{x:46,z:10.8,y:1.6}],{heading:{x:1,z:0},wait:1.5}),
 {id:'moldar',pack:'moldar',kind:'moldar',name:'Mol’dar',x:68,z:3,height:1.95,radius:.58,vision:8.5,patrolSpeed:1.35,patrol:circuit(68),wait:1.4,zone:[56,84],named:true}
];
// claude-dire-maul: one ogre downstairs and one upstairs in each stretch, spread along the
// approach rather than camped in packs. Downstairs a reaver walks the front of the courtyard
// across its stretch and back (Mol'dar keeps his circuit in his courtyard); upstairs a frostweaver walks
// the gallery, a straight line between its columns. Each is its own pack: one ogre's alarm brings no other. Three tall pillars
// stand along the front of each stretch, and the gallery's columns are cover too: standing
// still against one hides him (engine.js).
{
 // The reaver walks the front of the courtyard, past the pillars: get one between him and you
 // Upstairs is the sniper's walk: a frostweaver at a post sweeps a long, narrow gaze (degrees,
 // 0 east, 90 away from the camera) back and forth over the gallery and down into the
 // courtyard, and casts from far off
 function sniper(id,x,z,from,to,options={}){return member(id,id,'lookout',x,z,[{x,z,y:1.6}],{sweep:{from,to,period:5.5},vision:11,cone:22,castRange:10,wait:99,...options});}
 const reaver=(id,start)=>member(id,id,'reaver',start+7.5,.5,[{x:start+7.5,z:.5,y:0},{x:start+20.5,z:.5,y:0}],{wait:.8,patrolSpeed:1.5,direct:true});
 const keep=ENCOUNTERS.filter(e=>e.id==='gallery-watch'||e.named);
 for(const e of keep)e.pack=e.id;
 // The gallery lookout becomes the encampment's sniper
 Object.assign(keep.find(e=>e.id==='gallery-watch'),sniper('gallery-watch',36.2,9,0,-60));
 ENCOUNTERS.length=0;
 ENCOUNTERS.push(
  reaver('approach-down',0),
  sniper('approach-up',21.3,9,180,240),
  reaver('barracks-down',28),
  ...keep,
  sniper('moldar-up',63.5,9,190,260,{zone:[56,84]}));
 for(const [section,start] of [['approach',0],['barracks',28],['moldar',56]])
  for(const x of section==='approach'?[11.5,14.5,17.5]:[6.5,11.5,16.5])WORLD.blocks.push({id:section+'-tall-pillar-'+x,x0:start+x,x1:start+x+1,z0:1.3,z1:2.2,bottom:0,top:2.6,cover:true});
 // The gallery's columns: cover to stand against, low enough for a sniper to see over
 for(const b of WORLD.blocks)if(b.id.includes('gallery-column')){b.top=b.bottom+1.2;b.cover=true;}
}
// Gravel: loud underfoot even sneaking (engine.js). Between the pillars on the way behind them,
// in every stretch: cross when the ogre is far enough off.
WORLD.gravel=[
 {x0:12.6,x1:14.3,z0:2.25,z1:3.3},{x0:15.6,x1:17.3,z0:2.25,z1:3.3},
 {x0:36.6,x1:39.3,z0:2.25,z1:3.3},{x0:41.6,x1:44.3,z0:2.25,z1:3.3},
 {x0:63.6,x1:67.3,z0:2.25,z1:3.3},{x0:68.6,x1:72.3,z0:2.25,z1:3.3}];
// Cover: the tall pillars, the stone screens and the big props
for(const b of WORLD.blocks)if(!b.safe&&!b.overhead&&(b.art||b.id.startsWith('refuge')||b.top-b.bottom>=2))b.cover=true;
// The run's time limit, in seconds, and the best route's time (worked out beforehand by playing
// every way through: upstairs or down in each stretch, moving only when no ogre would see)
// The tribute: in Mol'dar's courtyard, by the last pillar. Taking it is the finale (engine.js)
export const TRIBUTE={x:74.2,z:.6};
export const RUN={limit:120,best:56.4};
export const sectionAt=x=>SECTIONS.find(s=>x<s.end)||SECTIONS.at(-1);

// Jump-only safe perches: a 1.05 rise exceeds walk-up height, below the 1.25 jump apex.
export const REFUGES=[23.5,30.5,58.5,76.5].map((x,i)=>({id:'safe-'+i,name:['Entry perch','Camp perch','Courtyard perch','Arch perch'][i],x,z:1.7,y:1.05,radius:.7,hold:3}));
for(const r of REFUGES)WORLD.blocks.push({id:r.id,x0:r.x-1.15,x1:r.x+1.15,z0:r.z-.9,z1:r.z+.9,bottom:0,top:r.y,safe:true});
WORLD.blocks.push({id:'arch-lintel',overhead:true,x0:82.25,x1:83,z0:1.4,z1:6,bottom:2.9,top:3.3});
// Physical posts leave the exit opening clear. Ferns/vines remain soft decoration.
WORLD.blocks.push({id:'arch-near-post',x0:82.25,x1:83,z0:1.4,z1:2.2,bottom:0,top:3.15},{id:'arch-far-post',x0:82.25,x1:83,z0:5.2,z1:6,bottom:0,top:3.15});
