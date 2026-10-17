// Presentation clocks consume the existing simulation; no damage, movement or cooldown changes.
export const DIRECTIONS=['east','west','toward','away'];
const runs={east:[0,1,2,3,4,5],west:[6,7,8,9,10,11],toward:[12,13],away:[14,15]};
const actorRuns={horde:{east:[0,1,2,3],west:[4,5,6,7,8,9,10,11],toward:[12,13],away:[14,15]},stormspine:{east:[0,1,2,3],west:[4,5,6,7],toward:[8,9,10,11],away:[12,13,14,15]}};
export function sequence(actor,direction,state){
 const side=direction==='west'?'west':'east',boss=actor==='stormspine';
 if(state==='run'||state==='idle'){const frames=(actorRuns[actor]||runs)[direction];return {sheet:'locomotion',frames:state==='idle'?[frames[0]]:frames,durations:state==='idle'?[.5]:frames.map(()=>.5/frames.length),loop:state==='run'};}
 const sets=boss?{
  windup:{east:[0,1],west:[4,5],durations:[.55,.5]},
  attack:{east:[2,3],west:[6,7],durations:[.16,.49]},
  hit:{east:[8],west:[9],durations:[.12]},
  death:{east:[10,11,12],west:[13,14,15],durations:[.333,.333,.334]},
 }:{
  jump:{east:[0,1,2,3],west:[4,5,6,7],durations:[.08,.28,.27,.12]},
  melee:{east:[8,9],west:[10,11],durations:[.18,.24]},
  ranged:{east:[12,13],west:[14,15],durations:[.18,.2]},
 };
 const set=sets[state];if(!set)throw Error('Unsupported state '+actor+'/'+state);
 return {sheet:'actions',frames:set[side],durations:set.durations,loop:false};
}
export function timedFrame(seq,time){
 const duration=seq.durations.reduce((n,v)=>n+v,0);let t=seq.loop?Math.max(0,time)%duration:Math.max(0,Math.min(time,duration));
 for(let i=0;i<seq.frames.length;i++){if(t<seq.durations[i]||i===seq.frames.length-1)return seq.frames[i];t-=seq.durations[i];}
 return seq.frames.at(-1);
}
export function reviewPose(actor,direction,state,time){const seq=sequence(actor,direction,state);return {sheet:seq.sheet,frame:timedFrame(seq,time),state,direction};}
function stateFor(a){return {x:a.x,z:a.z,grounded:a.grounded,direction:a.facing<0?'west':'east',phase:0,jumpAge:1,landAge:1,shotAge:1};}
export function stepPresentation(g,dt,controls={}){
 g.visual??={hero:stateFor(g.hero),stormspine:stateFor((g.enemies.find(e=>e.boss)||g.guard)),seenShots:g.shots};
 for(const [key,a]of [['hero',g.hero],['stormspine',(g.enemies.find(e=>e.boss)||g.guard)]]){
  const v=g.visual[key],dx=a.x-v.x,dz=a.z-v.z,d=Math.hypot(dx,dz);
  if(d>1e-6){v.direction=Math.abs(dz)>Math.abs(dx)*1.2?(dz>0?'away':'toward'):(dx>0?'east':'west');v.phase+=d/(key==='hero'?2:1.65)*.5;}
  v.moving=d>1e-6;
  if(v.grounded&&!a.grounded)v.jumpAge=0;else v.jumpAge+=dt;
  if(!v.grounded&&a.grounded)v.landAge=0;else v.landAge+=dt;
  v.shotAge+=dt;if(key==='hero'&&g.shots>g.visual.seenShots)v.shotAge=0;
  v.grounded=a.grounded;v.x=a.x;v.z=a.z;
 }
 g.visual.seenShots=g.shots;g.visual.aiming=!!controls.attack;
}
export function gamePose(g,a){
 const boss=!!a.boss,id=boss?'stormspine':g.side,v=g.visual?.[boss?'stormspine':'hero'];
 const direction=v?.direction||(a.facing<0?'west':'east'),side=a.facing<0?'west':'east';
 if(boss){
  if(a.state==='death')return reviewPose(id,side,'death',a.stateTime);
  if(a.state==='windup')return reviewPose(id,side,'windup',a.stateTime);
  if(a.state==='attack')return reviewPose(id,side,'attack',a.stateTime);
  if(a.hitTime>0)return reviewPose(id,side,'hit',0);
 }else{
  if(g.swing)return reviewPose(id,side,'melee',g.swing.age);
  if(!a.grounded){const seq=sequence(id,side,'jump');return {sheet:'actions',frame:seq.frames[(v?.jumpAge||0)<.08?0:a.vy>=0?1:2],state:'jump',direction:side};}
  if(v?.landAge<.12)return {sheet:'actions',frame:sequence(id,side,'jump').frames[3],state:'landing',direction:side};
  if(v?.shotAge<.15)return {sheet:'actions',frame:sequence(id,side,'ranged').frames[1],state:'ranged-release',direction:side};
  if(g.visual?.aiming&&g.shotCooldown>.15)return {sheet:'actions',frame:sequence(id,side,'ranged').frames[0],state:'ranged-ready',direction:side};
 }
 return reviewPose(id,direction,(v?.moving??a.moving)?'run':'idle',v?.phase||0);
}
