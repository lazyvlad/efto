// Isolated Mol'dar courtyard study. No game/account imports or persistent rewards.
import{WORLD,ENCOUNTERS,REFUGES,sectionAt,RUN,TRIBUTE}from './level-data.js?v=15';
export{WORLD};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const heightAt=(s,z)=>s.ramp?clamp((z-6)/2.5,0,1)*1.6:s.h;
const inside=(s,x,z)=>x>=s.x0&&x<=s.x1&&z>=s.z0&&z<=s.z1;
const overlaps=(s,x,z,r)=>Math.hypot(x-clamp(x,s.x0,s.x1),z-clamp(z,s.z0,s.z1))<r-.001;
export function groundAt(x,z,ceiling=Infinity){return [...SURFACES().filter(s=>inside(s,x,z)).map(s=>({id:s.id,y:heightAt(s,z)})),...WORLD.blocks.filter(b=>!b.overhead&&inside(b,x,z)).map(b=>({id:b.id,y:b.top}))].filter(s=>s.y<=ceiling+.001).sort((a,b)=>b.y-a.y)[0]||null;}
export function actor(x,z,opts={}){return{x,z,y:groundAt(x,z)?.y??0,vy:0,radius:.24,height:1,speed:WORLD.speed,grounded:true,coyote:.1,buffer:0,heldJump:false,facing:1,moving:false,...opts};}
// Ground contact uses the capsule footprint, so grazing a stair edge retains support.
function supportAt(a,x,z,ceiling=Infinity){
 return [...SURFACES().filter(s=>overlaps(s,x,z,a.radius)).map(s=>({id:s.id,y:heightAt(s,clamp(z,s.z0,s.z1))})),...WORLD.blocks.filter(b=>overlaps(b,x,z,a.radius)).map(b=>({id:b.id,y:b.top}))].filter(s=>s.y<=ceiling+1e-7).sort((a,b)=>b.y-a.y)[0]||null;
}
function contacts(a,x,z,y){
 const hits=WORLD.blocks.filter(b=>overlaps(b,x,z,a.radius)&&y<b.top-.025&&y+a.height>b.bottom+.025);
 const ramp=SURFACES().find(s=>s.ramp&&overlaps(s,x,z,a.radius));
 for(const s of SURFACES()){if(!overlaps(s,x,z,a.radius))continue;const top=heightAt(s,clamp(z,s.z0,s.z1));
  // Connected stair mouths are open to the leading edge of the capsule.
  if(ramp&&s.id==='gallery'&&top<=heightAt(ramp,z+a.radius)+.2)continue;
  // These are solid foundations, not bridges the hunter can walk underneath.
  if(top>y+(a.grounded?.2:.025))hits.push(s);
 }return hits;
}
export function canOccupy(a,x,z,y=a.y){
 return x>=a.radius&&x<=WORLD.length-a.radius&&z>=a.radius&&z<=WORLD.depth-a.radius&&!contacts(a,x,z,y).length;
}
export function moveActor(a,controls,dt,safe=false){
 if(controls.jump&&!a.heldJump)a.buffer=.12;a.heldJump=!!controls.jump;a.buffer=Math.max(0,a.buffer-dt);a.coyote=a.grounded?.1:Math.max(0,a.coyote-dt);
 const wasGrounded=a.grounded,departure=a.y;a.landedDrop=0;let jumped=false;const jump=()=>{if(a.buffer&&a.coyote){a.vy=WORLD.jump;a.grounded=false;a.fallOrigin=a.y;a.buffer=a.coyote=0;jumped=true;}};jump();
 let dx=controls.dx||0,dz=controls.dz||0;
 // A small entrance assist applies only at the foot of a stair, while walking into
 // depth with no lateral input. It never pulls a player up a side wall.
 if(!safe&&a.grounded&&!dx&&dz>0&&a.y<.21&&a.z>=5.1&&a.z<=6.3){
  const ramp=SURFACES().find(s=>s.ramp&&a.x>s.x0-.65&&a.x<s.x1+.65);
  if(ramp){const target=clamp(a.x,ramp.x0+a.radius*.3,ramp.x1-a.radius*.3),delta=target-a.x;if(Math.abs(delta)>.005)dx=clamp(delta*8,-.65,.65);}
 }
 let l=Math.hypot(dx,dz);if(l>1){dx/=l;dz/=l;}const before={x:a.x,z:a.z};
 const speed=a.speed*(controls.sneak?.47:1)*(a.slow>0?.38:1);
 const standingY=(x,z)=>{const ground=supportAt(a,x,z,a.y+.2);return a.grounded&&ground&&Math.abs(ground.y-a.y)<=.2000001?ground.y:a.y;};
 const allowed=(x,z)=>{const y=standingY(x,z);if(safe){const ground=supportAt(a,x,z,a.y+.2);if(!ground||Math.abs(ground.y-a.y)>.2000001)return false;}return canOccupy(a,x,z,y);};
 const accept=(x,z)=>{a.y=standingY(x,z);a.x=x;a.z=z;};
 const target={x:clamp(a.x+dx*speed*dt,a.radius,WORLD.length-a.radius),z:clamp(a.z+dz*speed*dt,a.radius,WORLD.depth-a.radius)};
 if(allowed(target.x,target.z))accept(target.x,target.z);
 else{
  // Reach contact, then project the remaining input along the collision face.
  // Rounded corners slide naturally; flat walls never add an unsolicited detour.
  let low=0,high=1;for(let i=0;i<10;i++){const t=(low+high)/2;if(allowed(a.x+(target.x-a.x)*t,a.z+(target.z-a.z)*t))low=t;else high=t;}
  const start={x:a.x,z:a.z};accept(start.x+(target.x-start.x)*low,start.z+(target.z-start.z)*low);
  let rx=target.x-a.x,rz=target.z-a.z;
  for(const s of contacts(a,target.x,target.z,standingY(target.x,target.z))){let nx=a.x-clamp(a.x,s.x0,s.x1),nz=a.z-clamp(a.z,s.z0,s.z1),n=Math.hypot(nx,nz);if(n<1e-8)continue;nx/=n;nz/=n;const into=rx*nx+rz*nz;if(into<0){rx-=into*nx;rz-=into*nz;}}
  if(allowed(a.x+rx,a.z+rz))accept(a.x+rx,a.z+rz);
 }
 const ground=supportAt(a,a.x,a.z,a.y+.2);
 if(a.grounded&&ground&&Math.abs(ground.y-a.y)<=.2000001){a.y=ground.y;a.vy=0;}else{if(wasGrounded&&!jumped)a.fallOrigin=departure;a.grounded=false;const y=a.y;a.y+=a.vy*dt-.5*WORLD.gravity*dt*dt;a.vy-=WORLD.gravity*dt;const landing=supportAt(a,a.x,a.z,y+.025);if(landing&&a.vy<0&&y>=landing.y-.025&&a.y<=landing.y){a.landedDrop=Math.max(0,(a.fallOrigin??landing.y)-landing.y);a.fallOrigin=null;a.y=landing.y;a.vy=0;a.grounded=true;a.coyote=.1;jump();}}
 a.moving=Math.hypot(a.x-before.x,a.z-before.z)>1e-6;if(Math.abs(a.x-before.x)>.00001)a.facing=Math.sign(a.x-before.x);a.blocked=!!l&&Math.hypot(a.x-before.x,a.z-before.z)<speed*dt*.1;a.blockedBy=a.blocked?(contacts(a,target.x,target.z,standingY(target.x,target.z))[0]?.id||'boundary'):null;return jumped;
}
// Clip a line against a volume. Ramp slabs use y - slope*z, retaining exact sight
// while avoiding a distance-sampled walk through every collider for every cone ray.
function intersects(from,to,box,slope=0){let low=.00001,high=.99999;
 for(const[start,delta,min,max]of [[from.x,to.x-from.x,box.x0,box.x1],[from.z,to.z-from.z,box.z0,box.z1],[from.y-slope*from.z,to.y-from.y-slope*(to.z-from.z),box.bottom+.015,box.top-.015]]){
  if(Math.abs(delta)<1e-10){if(start<=min||start>=max)return false;continue;}
  let a=(min-start)/delta,b=(max-start)/delta;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>=high)return false;
 }return true;
}
export function clearRay(from,to){
 for(const b of WORLD.blocks)if(intersects(from,to,b))return false;
 for(const s of SURFACES()){const ranges=s.ramp?[[s.z0,6,0,0],[6,8.5,.64,-3.84],[8.5,s.z1,0,1.6]]:[[s.z0,s.z1,0,s.h]];
  for(const[z0,z1,slope,top]of ranges)if(z1>z0&&intersects(from,to,{x0:s.x0,x1:s.x1,z0,z1,bottom:top-.4,top},slope))return false;
 }return true;
}
export function sees(g,a=g.guard){if(g.feign?.active)return false;const h=g.hero,dx=h.x-a.x,dz=h.z-a.z,d=Math.hypot(dx,dz);if(g.cover&&d>COVER.pointBlank)return false;const from={x:a.x,z:a.z,y:a.y+a.height*.8},to={x:h.x,z:h.z,y:h.y+h.height*.7};
 if(d>(a.vision??8.5)||!clearRay(from,to))return false;if(d<1.6&&Math.abs(a.y-h.y)<.5)return true;
 const heading=a.heading||{x:a.facing,z:0};return (dx*heading.x+dz*heading.z)/(d||1)>=Math.cos((a.state==='chase'?110:a.cone??57)*Math.PI/180);
}
const grid=.5;let navigation;
function buildNavigation(){const nodes=new Map(),a={radius:.58,height:1.95,grounded:true};for(let x=grid;x<WORLD.length;x+=grid)for(let z=grid;z<WORLD.depth;z+=grid){const g=groundAt(x,z),ramp=SURFACES().find(s=>s.ramp&&inside(s,x,z)&&z>6&&z<8.5);if(ramp&&(x-a.radius<ramp.x0||x+a.radius>ramp.x1))continue;if(g&&canOccupy({...a,y:g.y},x,z,g.y))nodes.set(x+','+z,{x,z,y:g.y,key:x+','+z});}return nodes;}
export function findPath(a,target){
 const nodes=navigation??=buildNavigation();const near=p=>{let best,score=Infinity;for(const n of nodes.values()){if(Math.abs(n.y-p.y)>=.5)continue;const d=(n.x-p.x)**2+(n.z-p.z)**2;if(d<score){best=n;score=d;}}return best;};
const start=near(a),end=near(target);if(!start||!end)return[];const open=[start],cost=new Map([[start.key,0]]),parent=new Map(),closed=new Set();
 while(open.length){open.sort((u,v)=>(cost.get(u.key)+Math.hypot(u.x-end.x,u.z-end.z))-(cost.get(v.key)+Math.hypot(v.x-end.x,v.z-end.z)));const cur=open.shift();if(cur.key===end.key){const path=[];let n=cur;while(n.key!==start.key){path.unshift({x:n.x,z:n.z,y:n.y});n=parent.get(n.key);}return path;}
  if(closed.has(cur.key))continue;closed.add(cur.key);
  for(let dz=-grid;dz<=grid;dz+=grid)for(let dx=-grid;dx<=grid;dx+=grid){if(!dx&&!dz)continue;const next=nodes.get((cur.x+dx)+','+(cur.z+dz));if(!next||closed.has(next.key)||Math.abs(next.y-cur.y)>.4)continue;
   const mx=(cur.x+next.x)/2,mz=(cur.z+next.z)/2,mg=groundAt(mx,mz);if(!mg||!canOccupy({...a,y:mg.y},mx,mz,mg.y))continue;
   const score=cost.get(cur.key)+Math.hypot(dx,dz);if(score<(cost.get(next.key)??Infinity)){cost.set(next.key,score);parent.set(next.key,cur);open.push(next);}
  }
 }return[];
}
export function createGame(side='alliance'){
 const enemies=ENCOUNTERS.map(spec=>actor(spec.x,spec.z,{...spec,zone:groundOf(spec),patrolSpeed:spec.patrolSpeed*HUNT.patrolBoost,wait:spec.wait*HUNT.waitScale,boss:true,hp:spec.named?360:150,maxHp:spec.named?360:150,speed:spec.patrolSpeed,heading:spec.heading||{x:1,z:0},facing:1,state:'patrol',stateTime:0,phase:0,slow:0,suspicion:0,lost:0,lastSeen:{x:spec.x,z:spec.z,y:groundAt(spec.x,spec.z)?.y??0},path:[],navAge:1,patrolIndex:spec.patrolIndex??0,patrolWait:spec.wait*HUNT.waitScale,windup:0,attackCooldown:0,shoutCooldown:0,castTime:0,castCooldown:1,castTarget:null}));
 return{side,time:0,mode:'playing',hero:actor(2,3),guard:enemies.find(e=>e.named),enemies,hp:100,maxHp:100,invulnerable:0,shotCooldown:0,shots:0,swing:null,projectiles:[],bolts:[],safe:{id:null,time:0,perched:false,protected:false,released:false},damageTaken:{fall:0,melee:0,spell:0},traps:[],trapCharges:3,trapHeld:false,feign:{active:false,time:0,cooldown:0},feignHeld:false,pet:{x:1.2,z:3.3,y:0,facing:1,moving:false,mode:'follow',target:null,time:0,cooldown:0},petHeld:false,alerts:0,suspicion:0,falls:0,visitedGallery:false,section:'approach',message:'Study the first pack. The stairs and front garden offer different ways around them.'};
}
function transition(a,state){a.axeTime=0;if(a.state==='chase'&&a.windup)a.windup=0;a.state=state;a.stateTime=0;a.looking=0;a.path=[];a.navAge=1;a.moving=false;if(state!=='chase')a.castTime=0;}
function walkTo(a,target,dt){
 // A sniper never leaves its post: it turns to look, and casts
 if(a.sweep){a.moving=false;const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);if(d>.3){a.heading={x:dx/d,z:dz/d};if(Math.abs(dx)>.01)a.facing=Math.sign(dx);}return;}
 // A roamer walks its open route straight (the route-finder plans for Mol'dar's girth, too
 // wide for the strip along the front); off its route, after a chase, it finds its way back
 if(a.direct&&a.state==='patrol'){const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz);if(d>.02){a.heading={x:dx/d,z:dz/d};if(Math.abs(dx)>.01)a.facing=Math.sign(dx);const before={x:a.x,z:a.z};moveActor(a,{dx:dx/d,dz:dz/d},dt,true);a.phase+=Math.hypot(a.x-before.x,a.z-before.z)/1.5*.7;}return;}
 // Chase a visible target directly in open space; retain A* for corners/stairs.
 // Waiting for a stale grid endpoint made nominally faster ogres trail runners.
 const tx=target.x-a.x,tz=target.z-a.z,td=Math.hypot(tx,tz);
 if(a.state==='chase'&&td>.02&&td<7&&Math.abs(a.y-target.y)<.2){const nx=-tz/td*a.radius,nz=tx/td*a.radius;
  if([0,-1,1].every(sign=>clearRay({x:a.x+nx*sign,z:a.z+nz*sign,y:a.y+.25},{x:target.x+nx*sign,z:target.z+nz*sign,y:target.y+.25}))){a.heading={x:tx/td,z:tz/td};const before={x:a.x,z:a.z};moveActor(a,{dx:tx/td,dz:tz/td},dt,true);a.phase+=Math.hypot(a.x-before.x,a.z-before.z)/1.5*.7;a.path=[];a.navAge=1;return;}
 }
 a.navAge+=dt;if(a.navAge>.7){a.path=findPath(a,target);a.navAge=0;}while(a.path.length&&Math.hypot(a.path[0].x-a.x,a.path[0].z-a.z)<.12)a.path.shift();const next=a.path[0];if(!next){a.moving=false;return;}
 const dx=next.x-a.x,dz=next.z-a.z,d=Math.hypot(dx,dz);if(d>.02){a.heading={x:dx/d,z:dz/d};const before={x:a.x,z:a.z};moveActor(a,{dx:dx/d,dz:dz/d},dt,true);a.phase+=Math.hypot(a.x-before.x,a.z-before.z)/1.5*.7;}}
function hurt(g,n,kind='melee'){if((g.invulnerable>0&&kind!=='fall')||(g.safe.protected&&kind!=='fall')||g.mode!=='playing')return false;g.hp=Math.max(0,g.hp-n);g.damageTaken[kind]+=n;g.invulnerable=.8;g.safe.time=0;if(!g.hp){g.mode='defeat';g.message='Caught in the approach. Retry restores all patrols and frost devices.';}return true;}
function alarm(g,a){transition(a,'chase');a.rush=HUNT2.rushTime;
 const stretch=sectionOf(a.x);g.horns??={};
 if(!(g.horns[stretch]>g.time)&&!g.finale){g.horns[stretch]=g.time+HORN.every;let roused=0;
  for(const e of g.enemies){if(e===a||sectionOf(e.x)!==stretch||e.state==='chase')continue;e.lastSeen={...a.lastSeen};e.suspicion=Math.max(.65,e.suspicion);transition(e,'search');roused++;}
  if(roused){g.hornAt=g.time;g.message='A horn sounds: '+roused+(roused===1?' more ogre is':' more ogres are')+' searching this stretch!';}}g.alerts++;g.message=a.name+' spotted you. Break sight, retreat into cover and let the pack search.';
 if(a.shoutCooldown>0)return;a.shoutCooldown=7;
 for(const ally of g.enemies){if(ally===a||ally.pack!==a.pack||ally.state==='chase'||Math.hypot(ally.x-a.x,ally.z-a.z,ally.y-a.y)>7)continue;
  if(!clearRay({x:a.x,z:a.z,y:a.y+1},{x:ally.x,z:ally.z,y:ally.y+1}))continue;
  ally.lastSeen={...a.lastSeen};ally.suspicion=Math.max(.65,ally.suspicion);transition(ally,'search');
 }
}
// How a pack hunts (claude-dire-maul's take). A pack guards its own ground: past its edge
// (LEASH beyond the zone) for GIVE_UP seconds, a chase ends and they walk back. Lost from
// sight, they go where they last saw him, look about for LOOK seconds, and go back; a search
// lasts SEARCH_MOST at the longest. Chasing, they are only a little faster than he is, so
// breaking sight (cover, depth, stairs) shakes them where running alone does not.
export const HUNT={leash:3,giveUp:.8,look:4,searchMost:8,chase:3.45,chaseNamed:3.65,search:3,ground:4,meleeGap:1.4,holdBack:1.9,patrolBoost:1.7,waitScale:.4};
// Feign Death: down for up to MOST seconds (moving gets him up after MIN_DOWN), and every ogre
// on his trail loses interest; usable again COOLDOWN seconds after it was used
// Cover: standing still against a pillar, a screen or a big prop (level-data.js "cover"), he
// is hidden from any ogre not within POINT_BLANK of him
export const COVER={reach:.45,pointBlank:.75};
function inCover(h){if(!h.grounded||h.moving)return false;return WORLD.blocks.some(b=>b.cover&&Math.abs(b.bottom-h.y)<.3&&Math.max(b.x0-h.x,0,h.x-b.x1)**2+Math.max(b.z0-h.z,0,h.z-b.z1)**2<=(COVER.reach+h.radius)**2);}
// Downstairs is the hunt: ogres hear him (gravel, level-data.js WORLD.gravel, is loud even
// sneaking), rush the first moments of a chase, and reavers throw axes at range
// A crumbling stretch of gallery that has given way is gone from this game's floor until it
// comes back. The set is the game's own (g.fallen), made current as each step begins, so
// copies of a game (the route planner's) never share one.
let fallenKey='',surfaceList=null;
function SURFACES(){return surfaceList??=WORLD.surfaces;}
function useFallen(g){const key=Object.keys(g.fallen||{}).sort().join();if(key!==fallenKey||!surfaceList){fallenKey=key;surfaceList=WORLD.surfaces.filter(s=>!(s.crumble&&g.fallen?.[s.crumble]));}}
// An alarm sounds a horn: every ogre in that stretch, both floors, searches where he was seen
export const HORN={every:10};
// Feign Death within REACH of an ogre on his trail, and it comes to look at the body for LOOK
// seconds: up while it stands within CAUGHT of him, and he is caught
export const INSPECT={reach:3,look:2.5,caught:1.5};
// The finale: the tribute taken, Mol'dar charges after him (SPEED, a touch slower than the
// hunter), slamming the ground every SLAM_EVERY seconds: a shockwave rolls out at WAVE_SPEED to
// WAVE_REACH and hurts (DAMAGE, a moment's STUN) anyone on the ground as it passes. The gate
// at the exit closes GATE seconds after the tribute is taken.
export const FINALE={speed:3,slamEvery:2.2,windup:.5,waveSpeed:6.5,waveReach:7,damage:20,stun:.45,gate:16};
const sectionOf=x=>sectionAt(x).id;
export const CRUMBLE={after:.6,back:6};
export const HUNT2={rush:4.4,rushTime:1.6,noise:{run:3.4,gravelSneak:4.5,gravelRun:6},axe:{near:2.2,far:8,windup:.45,speed:9,damage:10,cooldown:2.4}};
const onGravel=h=>h.grounded&&h.y<.1&&(WORLD.gravel||[]).some(r=>h.x>=r.x0&&h.x<=r.x1&&h.z>=r.z0&&h.z<=r.z1);
export const FEIGN={cooldown:8,most:6,minDown:.6};
// The pet: follows him; Distract sends it at the nearest ogre within RANGE, which turns on it
// for HARASS seconds and forgets the hunter; usable again COOLDOWN seconds later
export const PET={speed:4.4,dash:7.5,range:9,harass:4,cooldown:12};
// A pack's ground: its patrol and so much either side (Mol'dar keeps his whole courtyard)
function groundOf(spec){if(spec.named||!spec.patrol?.length)return spec.zone;if(spec.sweep)return[spec.x-spec.vision-1,spec.x+spec.vision+1];const xs=spec.patrol.map(p=>p.x);return[Math.min(...xs)-HUNT.ground,Math.max(...xs)+HUNT.ground];}
function giveUp(g,a,why){a.suspicion=Math.min(a.suspicion,.3);a.windup=a.castTime=0;transition(a,'return');a.leash=0;g.message=why;}
function stepMoldar(g,a,dt){const h=g.hero;a.state='chase';a.seen=true;a.suspicion=1;a.lastSeen={x:h.x,z:h.z,y:h.y};
 a.slamIn=(a.slamIn??FINALE.slamEvery)-dt;
 if(a.slamWind>0){a.moving=false;a.slamWind-=dt;if(a.slamWind<=0){g.waves.push({x:a.x,z:a.z,y:a.y,r:.3,hit:false});a.slamIn=FINALE.slamEvery;g.message='Mol’dar slams the ground: jump the shockwave!';}return;}
 if(a.slamIn<=0&&Math.hypot(a.x-h.x,a.z-h.z)<FINALE.waveReach){a.slamWind=FINALE.windup;a.moving=false;return;}
 a.speed=FINALE.speed;walkTo(a,{x:h.x,z:h.z,y:h.y},dt);
 if(Math.hypot(a.x-h.x,a.z-h.z)<1.1&&Math.abs(a.y-h.y)<.4&&!a.attackCooldown){hurt(g,18);a.attackCooldown=1.2;}}
function stepEnemy(g,a,input,dt){const h=g.hero;
 if(a.named&&g.finale){a.attackCooldown=Math.max(0,a.attackCooldown-dt);return stepMoldar(g,a,dt);}
 if(a.distracted>0){a.distracted-=dt;a.seen=false;a.moving=false;a.windup=a.castTime=0;a.suspicion=Math.max(0,a.suspicion-dt*.5);const dx=g.pet.x-a.x,dz=g.pet.z-a.z,d=Math.hypot(dx,dz)||1;a.heading={x:dx/d,z:dz/d};if(Math.abs(dx)>.01)a.facing=Math.sign(dx);if(a.distracted<=0&&a.state!=='patrol')transition(a,'return');return;}a.slow=Math.max(0,a.slow-dt);a.attackCooldown=Math.max(0,a.attackCooldown-dt);a.shoutCooldown=Math.max(0,a.shoutCooldown-dt);a.stateTime+=dt;a.castCooldown=Math.max(0,a.castCooldown-dt);
 const outside= !['chase','search'].includes(a.state)&&(h.x<a.zone[0]-5||h.x>a.zone[1]+5);
 a.seen=!outside&&!g.safe.protected&&sees(g,a);
 const gravel=onGravel(h),earshot=gravel?(input.sneak?HUNT2.noise.gravelSneak:HUNT2.noise.gravelRun):input.sneak?0:HUNT2.noise.run;
 const noisy=!outside&&!g.feign.active&&h.moving&&h.grounded&&Math.abs(h.y-a.y)<.6&&Math.hypot(h.x-a.x,h.z-a.z)<earshot;
 a.axeCooldown=Math.max(0,(a.axeCooldown||0)-dt);a.rush=Math.max(0,(a.rush||0)-dt);
 if(a.seen){a.lastSeen={x:h.x,z:h.z,y:groundAt(h.x,h.z,h.y+.2)?.y??0};a.lost=0;a.suspicion=clamp(a.suspicion+dt*(input.sneak?1:1.65),0,1);}else{a.lost+=dt;a.suspicion=Math.max(0,a.suspicion-dt*.55);if(noisy){a.lastSeen={x:h.x,z:h.z,y:h.y};a.suspicion=Math.max(a.suspicion,.18);}}
 if(outside&&a.state==='notice'){a.suspicion=0;a.windup=0;transition(a,'return');}
 if(g.safe.protected&&a.state==='chase'){a.castTime=a.windup=0;transition(a,'search');}
 if(a.suspicion>=1&&a.state!=='chase')alarm(g,a);
 if(a.state==='patrol'||a.state==='notice'){
  if(a.seen||noisy){a.moving=false;const dx=h.x-a.x,dz=h.z-a.z,d=Math.hypot(dx,dz)||1;a.heading={x:dx/d,z:dz/d};if(Math.abs(dx)>.01)a.facing=Math.sign(dx);a.state='notice';}
  else if(a.suspicion>.02){a.moving=false;}
  else if(a.sweep){a.state='patrol';a.moving=false;const t=(Math.sin(g.time*2*Math.PI/a.sweep.period)+1)/2,deg=a.sweep.from+(a.sweep.to-a.sweep.from)*t,r=deg*Math.PI/180;a.heading={x:Math.cos(r),z:Math.sin(r)};if(Math.abs(a.heading.x)>.05)a.facing=Math.sign(a.heading.x);}
  else{a.state='patrol';a.speed=a.patrolSpeed;const point=a.patrol[a.patrolIndex];if(Math.hypot(a.x-point.x,a.z-point.z)<.3){a.moving=false;if((a.patrolWait-=dt)<=0){a.patrolIndex=(a.patrolIndex+1)%a.patrol.length;a.patrolWait=a.wait;a.path=[];a.navAge=1;}}else walkTo(a,point,dt);}
 }else if(a.state==='chase'){
  a.speed=a.sweep?0:a.rush>0?HUNT2.rush:a.named?HUNT.chaseNamed:HUNT.chase;
  // Past the edge of their ground for a moment, they let him go
  const beyond=h.x<a.zone[0]-HUNT.leash||h.x>a.zone[1]+HUNT.leash;a.leash=beyond?(a.leash||0)+dt:0;
  if(a.leash>HUNT.giveUp){giveUp(g,a,a.name+' stops at the edge of the pack’s ground and turns back.');return;}const inReach=Math.hypot(a.x-h.x,a.z-h.z)<1.2&&Math.abs(a.y-h.y)<.4&&clearRay({x:a.x,z:a.z,y:a.y+1},{x:h.x,z:h.z,y:h.y+.6});
  const castReach=a.caster&&a.seen&&Math.hypot(a.x-h.x,a.z-h.z)<(a.castRange??7)&&Math.hypot(a.x-h.x,a.z-h.z)>1.5;
  const dist=Math.hypot(a.x-h.x,a.z-h.z),axe=HUNT2.axe;
  if(a.axeTime>0){a.moving=false;a.axeTime+=dt;if(!a.seen&&a.axeTime<axe.windup*.5){a.axeTime=0;}else if(a.axeTime>=axe.windup){const from={x:a.x,z:a.z,y:a.y+1.1},t=a.axeTarget,d=Math.hypot(t.x-from.x,t.z-from.z,t.y-from.y)||1;g.bolts.push({...from,vx:(t.x-from.x)/d*axe.speed,vz:(t.z-from.z)/d*axe.speed,vy:(t.y-from.y)/d*axe.speed,age:0,owner:a.id,kind:'axe',damage:axe.damage});a.axeTime=0;a.axeCooldown=axe.cooldown;}}
  else if(!a.caster&&!a.named&&a.seen&&!a.axeCooldown&&dist>axe.near&&dist<axe.far&&Math.abs(a.y-h.y)<.5){a.moving=false;a.axeTime=dt;a.axeTarget={x:h.x,z:h.z,y:h.y+.5};const dx=h.x-a.x;if(Math.abs(dx)>.01)a.facing=Math.sign(dx);g.message=a.name+' raises an axe. Get behind stone!';}
  else if(a.castTime>0){a.moving=false;a.castTime+=dt;if(a.slow>0||!a.seen){a.castTime=0;a.castCooldown=1;}else if(a.castTime>=1.05){const from={x:a.x,z:a.z,y:a.y+1.2},target=a.castTarget,d=Math.hypot(target.x-from.x,target.z-from.z,target.y-from.y);g.bolts.push({...from,vx:(target.x-from.x)/d*6,vz:(target.z-from.z)/d*6,vy:(target.y-from.y)/d*6,age:0,owner:a.id});a.castTime=0;a.castCooldown=2.4;}}
  else if(castReach&&!a.castCooldown){a.moving=false;a.castTime=dt;a.castTarget={x:h.x,z:h.z,y:h.y+.55};g.message=a.name+' is casting. Move away from the blue mark or get behind stone.';}
  // One blow at a time: an ogre swings only when no other is swinging and the last blow is a
  // moment past; the rest hold back a step, so a pack threatens rather than mobs
  else if(inReach&&!a.attackCooldown&&(g.swinger===a.id||(!g.swinger&&g.time>=(g.nextBlow||0)))){g.swinger=a.id;a.moving=false;a.windup+=dt;if(h.moving)walkTo(a,a.lastSeen,dt);if(a.windup>=.7){hurt(g,a.named?18:12);a.attackCooldown=1.8;a.windup=0;g.swinger=null;g.nextBlow=g.time+HUNT.meleeGap;}}
  else if(((g.swinger&&g.swinger!==a.id)||g.time<(g.nextBlow||0))&&Math.hypot(a.x-h.x,a.z-h.z)<HUNT.holdBack&&Math.abs(a.y-h.y)<.4){a.windup=0;a.moving=false;const dx=h.x-a.x,dz=h.z-a.z,d=Math.hypot(dx,dz)||1;a.heading={x:dx/d,z:dz/d};if(Math.abs(dx)>.01)a.facing=Math.sign(dx);}
  else{a.windup=0;walkTo(a,a.lastSeen,dt);}
  if(a.lost>1.35&&!a.castTime)transition(a,'search');
 }else if(a.state==='inspect'){
  a.speed=HUNT.search;const d=Math.hypot(a.x-a.lastSeen.x,a.z-a.lastSeen.z);
  if(d>.9&&!a.looking)walkTo(a,a.lastSeen,dt);else{a.moving=false;a.looking=(a.looking||0)+dt;}
  if(a.looking>INSPECT.look||a.stateTime>INSPECT.look+5){a.suspicion=0;transition(a,'return');}
  return;
 }else if(a.state==='search'){
  a.speed=HUNT.search;
  if(a.seen&&a.suspicion>.8){a.suspicion=1;alarm(g,a);return;}
  // Not past their own ground
  if(a.lastSeen.x<a.zone[0]-HUNT.leash||a.lastSeen.x>a.zone[1]+HUNT.leash){giveUp(g,a,a.name+' will not leave the pack’s ground.');return;}
  const there=Math.hypot(a.x-a.lastSeen.x,a.z-a.lastSeen.z)<.7||(a.stateTime>1.5&&!a.moving);
  if(!there&&!a.looking)walkTo(a,a.lastSeen,dt);
  else{a.moving=false;a.looking=(a.looking||0)+dt;
    // Looking about: a quarter turn each second
    const turn=Math.floor(a.looking)%4,dirs=[{x:1,z:0},{x:0,z:1},{x:-1,z:0},{x:0,z:-1}];a.heading=dirs[turn];if(dirs[turn].x)a.facing=dirs[turn].x;}
  if(!a.seen&&(a.looking>HUNT.look||a.stateTime>HUNT.searchMost)){a.looking=0;a.suspicion=0;transition(a,'return');}
 }else if(a.state==='return'){
  a.speed=a.patrolSpeed;walkTo(a,a.patrol[a.patrolIndex],dt);if(a.seen)transition(a,'notice');else if(Math.hypot(a.x-a.patrol[a.patrolIndex].x,a.z-a.patrol[a.patrolIndex].z)<.5){transition(a,'patrol');a.patrolWait=a.wait;}
 }
}
function stepFeign(g,input,dt){const f=g.feign,h=g.hero;f.cooldown=Math.max(0,f.cooldown-dt);
 const press=input.feign&&!g.feignHeld;g.feignHeld=!!input.feign;
 if(f.active){f.time+=dt;const moving=input.left||input.right||input.far||input.near||input.jump;if(f.time>=FEIGN.most||(moving&&f.time>=FEIGN.minDown)){f.active=false;g.message='You get up.';
   for(const a of g.enemies)if(a.state==='inspect'){if(Math.hypot(a.x-h.x,a.z-h.z)<INSPECT.caught){a.suspicion=1;alarm(g,a);g.message=a.name+' was standing over you. Caught!';}else{a.suspicion=.5;transition(a,'search');}}}return f.active;}
 if(press&&!f.cooldown&&h.grounded&&g.mode==='playing'){f.active=true;f.time=0;f.cooldown=FEIGN.cooldown;g.bolts=[];g.swinger=null;
  let fooled=0,curious=0;for(const a of g.enemies){if(a.named&&g.finale)continue;if(!(['chase','search','notice'].includes(a.state)||a.suspicion>.05))continue;
   a.windup=a.castTime=0;a.lost=9;
   if(!a.sweep&&Math.hypot(a.x-h.x,a.z-h.z)<=INSPECT.reach&&Math.abs(a.y-h.y)<.5){curious++;a.suspicion=.5;transition(a,'inspect');a.lastSeen={x:h.x,z:h.z,y:h.y};}
   else{fooled++;a.suspicion=0;transition(a,'return');}}
  g.message=curious?'You feign death, but '+(curious===1?'an ogre comes':curious+' ogres come')+' to look. Lie still until '+(curious===1?'it moves':'they move')+' off.':fooled?'You feign death. '+fooled+(fooled===1?' ogre loses':' ogres lose')+' interest.':'You feign death.';return true;}
 return false;}
function stepPet(g,input,dt){const p=g.pet,h=g.hero;p.cooldown=Math.max(0,p.cooldown-dt);p.time+=dt;
 const press=input.distract&&!g.petHeld;g.petHeld=!!input.distract;
 if(press&&!p.cooldown&&g.mode==='playing'){let best=null,bd=PET.range;for(const a of g.enemies){const d=Math.hypot(a.x-h.x,a.z-h.z);if(d<bd&&Math.abs(a.y-h.y)<.6){bd=d;best=a;}}
  if(best){p.mode='dash';p.target=best.id;p.time=0;p.cooldown=PET.cooldown;g.message='Your pet charges '+best.name+'.';}else g.message='No ogre near enough for your pet.';}
 const target=p.target&&g.enemies.find(a=>a.id===p.target);let to,speed=PET.speed;
 if(p.mode==='dash'&&target){to={x:target.x-Math.sign(target.x-p.x||1)*.75,z:target.z};speed=PET.dash;if(Math.hypot(target.x-p.x,target.z-p.z)<1){p.mode='harass';p.time=0;target.distracted=PET.harass;if(target.state==='chase'||target.state==='search')g.message=target.name+' turns on your pet.';}}
 else if(p.mode==='harass'&&target){const t=p.time*3;to={x:target.x+Math.cos(t)*.9,z:target.z+Math.sin(t)*.6};speed=PET.dash;if(p.time>=PET.harass){p.mode='follow';p.target=null;}}
 else{p.mode='follow';p.target=null;to={x:h.x-(h.facing||1)*.85,z:h.z+.35};}
 // Too far, or on another floor while following: it bounds over to him
 if(p.mode==='follow'&&(Math.hypot(p.x-h.x,p.z-h.z)>7||Math.abs(p.y-h.y)>.4&&Math.hypot(p.x-h.x,p.z-h.z)>1.6)){Object.assign(p,{x:to.x,z:to.z,y:h.y});}
 const dx=to.x-p.x,dz=to.z-p.z,d=Math.hypot(dx,dz),step=Math.min(d,speed*dt);
 p.moving=d>.12;if(d>.001){p.x+=dx/d*step;p.z+=dz/d*step;if(Math.abs(dx)>.02)p.facing=Math.sign(dx);}
 p.y=groundAt(p.x,p.z,(p.mode==='follow'?h.y:target?.y??p.y)+.3)?.y??p.y;}
function stepCrumble(g,dt){g.fallen??={};g.crumbling??={};const h=g.hero;
 for(const [id,until] of Object.entries(g.fallen))if(g.time>=until){delete g.fallen[id];useFallen(g);}
 const under=h.grounded?WORLD.surfaces.find(s=>s.crumble&&!g.fallen[s.crumble]&&Math.abs(h.y-s.h)<.05&&h.x>=s.x0-h.radius&&h.x<=s.x1+h.radius&&h.z>=s.z0&&h.z<=s.z1):null;
 for(const id of Object.keys(g.crumbling))if(id!==under?.crumble)delete g.crumbling[id];
 if(under){g.crumbling[under.crumble]=(g.crumbling[under.crumble]||0)+dt;if(g.crumbling[under.crumble]>=CRUMBLE.after){g.fallen[under.crumble]=g.time+CRUMBLE.back;delete g.crumbling[under.crumble];useFallen(g);h.grounded=false;g.message='The gallery gives way beneath you!';}}}
function stepFinale(g,dt){const h=g.hero;g.waves??=[];
 if(!g.tribute&&h.grounded&&Math.hypot(h.x-TRIBUTE.x,h.z-TRIBUTE.z)<.75){g.tribute=true;g.finale={start:g.time,gate:g.time+FINALE.gate};g.message='You take the tribute. Mol’dar roars: run for the arch before the gate closes!';}
 if(g.finale&&g.time>=g.finale.gate&&g.mode==='playing'){g.mode='defeat';g.message='The gate slammed shut. Mol’dar keeps his tribute.';}
 for(const w of g.waves){w.r+=FINALE.waveSpeed*dt;const d=Math.hypot(h.x-w.x,h.z-w.z),onGround=h.grounded||h.y-(groundAt(h.x,h.z,h.y+.2)?.y??0)<.12;
  if(!w.hit&&Math.abs(d-w.r)<.35&&onGround&&Math.abs(h.y-w.y)<.5){w.hit=true;if(hurt(g,FINALE.damage))g.stunned=FINALE.stun;}}
 g.waves=g.waves.filter(w=>w.r<FINALE.waveReach);g.stunned=Math.max(0,(g.stunned||0)-dt);}
export function stepGame(g,input,dt){if(g.mode!=='playing')return;useFallen(g);stepCrumble(g,dt);stepFinale(g,dt);if(g.mode!=='playing')return;if(g.stunned>0)input={};
 // The run has a time limit (level-data.js RUN): set from the best route known, with room to spare
 if(g.time>=RUN.limit){g.mode='defeat';g.message='Out of time: the tribute run failed. The best route known takes '+RUN.best+' seconds.';return;}
 // Down and feigning: he does not move, and nothing on his trail sees him
 if(stepFeign(g,input,dt))input={};if(g.swinger&&g.enemies.find(a=>a.id===g.swinger)?.state!=='chase')g.swinger=null;dt=Math.min(dt,1/30);g.time+=dt;g.invulnerable=Math.max(0,g.invulnerable-dt);g.shotCooldown=Math.max(0,g.shotCooldown-dt);const h=g.hero;
 moveActor(h,{dx:Number(!!input.right)-Number(!!input.left),dz:Number(!!input.far)-Number(!!input.near),jump:input.jump,sneak:input.sneak},dt);
 g.cover=inCover(h);
 // claude-dire-maul: jumping and dropping from the gallery cost nothing
 if(h.y<-3){g.falls++;Object.assign(h,{x:2,z:3,y:0,vy:0,grounded:true});g.message='You fell from the ruins. Back at the entrance; the ogres are still alive.';}
 if(h.grounded&&h.y>1.4)g.visitedGallery=true;const section=sectionAt(h.x);if(g.section!==section.id){g.section=section.id;g.message=section.id==='barracks'?'Ogre encampment. A lookout patrols the gallery; consider the front garden.':'Mol’dar’s courtyard. Keep the named guard alive and slip through the far arch.';}
 if(input.attack&&!g.shotCooldown){g.shots++;g.shotCooldown=.65;g.projectiles.push({x:h.x,z:h.z,y:h.y+.6,age:0,dx:h.facing});g.message='A warning shot draws nearby ogres. No ogre takes damage in this stealth study.';for(const a of g.enemies)if(Math.hypot(a.x-h.x,a.z-h.z)<9){a.lastSeen={x:h.x,z:h.z,y:groundAt(h.x,h.z,h.y+.2)?.y??0};a.suspicion=Math.max(.65,a.suspicion);transition(a,'search');}}
 if(input.trap&&!g.trapHeld&&g.trapCharges&&h.grounded){const x=h.x+h.facing*.65,z=h.z,floor=groundAt(x,z,h.y+.2);if(floor&&Math.abs(floor.y-h.y)<.3){g.trapCharges--;g.traps.push({x,z,y:floor.y,age:0,active:false,radius:1.2,triggered:null});g.message='Frost device set. It waits for an ogre on this floor.';}}g.trapHeld=!!input.trap;
 for(const t of g.traps){t.age+=dt;for(const a of g.enemies){if(!t.active&&t.age>.25&&Math.abs(a.y-t.y)<.3&&Math.hypot(a.x-t.x,a.z-t.z)<=t.radius+a.radius){t.active=true;t.triggered=g.time;g.message='The frost triggered. Move into cover while nearby ogres are slowed.';}if(t.active&&g.time-t.triggered<3.5&&Math.abs(a.y-t.y)<.3&&Math.hypot(a.x-t.x,a.z-t.z)<1.8+a.radius)a.slow=.1;}}
 g.traps=g.traps.filter(t=>!t.active||g.time-t.triggered<4);g.projectiles=g.projectiles.filter(p=>(p.age+=dt)<.6);
 const onPerch=REFUGES.some(r=>h.grounded&&Math.abs(h.y-r.y)<.05&&Math.hypot(h.x-r.x,h.z-r.z)<r.radius);g.safe.protected=onPerch;
 for(const a of g.enemies)stepEnemy(g,a,input,dt);
 stepPet(g,input,dt);
 // Bolts aim at the cast-time position. Swept segments hit stone before the hunter.
 g.bolts=g.bolts.filter(b=>{const to={x:b.x+b.vx*dt,z:b.z+b.vz*dt,y:b.y+b.vy*dt};b.age+=dt;if(b.age>3||!clearRay(b,to))return false;Object.assign(b,to);if(Math.hypot(b.x-h.x,b.z-h.z)<h.radius+.15&&b.y>h.y&&b.y<h.y+h.height){hurt(g,b.damage??14,b.kind==='axe'?'melee':'spell');return false;}return true;});
 // Ogres and hunter have solid bodies, in addition to the static scenery.
 for(const a of g.enemies){const dx=h.x-a.x,dz=h.z-a.z,d=Math.hypot(dx,dz),gap=a.radius+h.radius;if(h.y>=a.y+a.height||h.y+h.height<=a.y||d>=gap)continue;const nx=d?dx/d:1,nz=d?dz/d:0,x=a.x+nx*gap,z=a.z+nz*gap;if(canOccupy(h,x,z)&&Math.abs((groundAt(x,z,h.y+.2)?.y??-9)-h.y)<.21)Object.assign(h,{x,z});else{const ax=h.x-nx*gap,az=h.z-nz*gap;if(canOccupy(a,ax,az))Object.assign(a,{x:ax,z:az});}}
 const refuge=REFUGES.find(r=>Math.hypot(h.x-r.x,h.z-r.z)<r.radius&&Math.abs(h.y-r.y)<.05&&h.grounded);
 if(g.safe.id!==refuge?.id)g.safe={id:refuge?.id??null,time:0,perched:false,protected:false,released:false};
 g.safe.perched=g.safe.protected=!!refuge;
 if(refuge&&!h.moving){g.safe.time=Math.min(refuge.hold,g.safe.time+dt);if(g.safe.time>=refuge.hold&&!g.safe.released){g.safe.released=true;g.bolts=[];for(const a of g.enemies){a.suspicion=0;a.castTime=a.windup=0;if(['chase','search','notice'].includes(a.state))transition(a,'return');}g.message='The pack gave up. Jump down when the way is clear.';}}
 else{g.safe.time=0;g.safe.released=false;}

 // Keep pack silhouettes apart without pushing anyone through scenery or off stairs.
 for(let i=0;i<g.enemies.length;i++)for(let j=i+1;j<g.enemies.length;j++){
  const a=g.enemies[i],b=g.enemies[j],dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz),gap=(a.radius+b.radius)*.9;if(Math.abs(a.y-b.y)>.15||d>=gap)continue;
  const amount=Math.min(.02,(gap-d)/2),nx=d?dx/d:1,nz=d?dz/d:0;
  for(const[e,sign]of [[a,-1],[b,1]]){const x=e.x+nx*amount*sign,z=e.z+nz*amount*sign,floor=groundAt(x,z,e.y+.02);if(floor&&Math.abs(floor.y-e.y)<.02&&canOccupy(e,x,z))Object.assign(e,{x,z});}
 }
 g.suspicion=Math.max(0,...g.enemies.map(a=>a.suspicion));g.windup=g.guard.windup;
 g.threat=[...g.enemies].filter(a=>Math.hypot(a.x-h.x,a.z-h.z)<12).sort((a,b)=>(Number(b.state==='chase')*2+b.suspicion)-(Number(a.state==='chase')*2+a.suspicion)||Math.hypot(a.x-h.x,a.z-h.z)-Math.hypot(b.x-h.x,b.z-h.z))[0]||null;
 if(h.x>WORLD.exit.x-.8&&h.z>1.7&&h.z<5.3&&h.grounded&&h.y<.2){if(!g.tribute)g.message='The tribute is in Mol’dar’s courtyard. You cannot leave without it.';else if(g.finale||g.enemies.every(a=>a.suspicion<.05&&!['chase','search'].includes(a.state))){g.mode='victory';g.message=(g.alerts?'Every ogre lives. You shook off pursuit and cleared the opening.':'Every ogre lives. You slipped past them all without an alarm.')+' Your time: '+g.time.toFixed(1)+' s · the best route known: '+RUN.best+' s.';}else g.message='The arch is here. Lose the ogres’ attention before leaving.';}
}
