import { REFUGES, TRIBUTE } from './level-data.js?v=15';
import { WORLD, heightAt, groundAt, clamp, clearRay } from './engine.js?v=15';
import { project3D, perspectiveScale, viewDepth, visibleCameraBounds, CAMERA_VIEWS } from './camera.js?v=6';
import { ACTOR_ART } from './hunter-data.js?v=6';
import { PACK_ART } from './pack-data.js?v=6';
import { MOLDAR_ART } from './moldar-data.js?v=6';
import { gamePose, reviewPose } from './hunter-animations.js?v=6';
const sequenceContact=(actor,direction)=>reviewPose(actor,direction,'idle',0).frame;

const ART=['pet-alliance-run','pet-alliance-sit','pet-horde-run','pet-horde-sit','alliance-locomotion','alliance-actions','horde-locomotion','horde-actions','moldar','reaver','lookout','tent','crates','barrels','planter','floor','wall','trim','arch','backdrop','frost','fern','vines'];
export async function loadArt() {
  const entries = await Promise.all(ART.map(async key => {
    const image = new Image(); image.src = new URL(`./assets/${key}.webp?rev=3`, import.meta.url).href;
    await image.decode(); return [key, image];
  }));
  return Object.fromEntries(entries);
}
export class Renderer {
  constructor(canvas, images) {
    this.canvas=canvas; this.ctx=canvas.getContext('2d'); this.images=images; this.guides=false;this.viewMode='side';this.view=CAMERA_VIEWS.side;
    this.reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.width=1000; this.height=580;this.terrainCache=new Map();this.frameId=0;this.fastWindows=0;
    this.resize();
  }
  resize() {
    this.width=this.canvas.getBoundingClientRect().width;
    this.height=clamp(window.innerHeight*.65,420,680);
    this.maxRatio=Math.min(devicePixelRatio||1,1.5);this.resolutionScale??=1;const ratio=this.maxRatio*this.resolutionScale;this.ratio=ratio;this.terrainCache?.clear();
    this.canvas.width=Math.round(this.width*ratio); this.canvas.height=Math.round(this.height*ratio);
    this.canvas.style.height=this.height+'px'; this.ctx.setTransform(ratio,0,0,ratio,0,0);
    this.unit=Math.min(this.width/6,140,this.height/5.2);
  }
  // Pictures drawn at their on-screen size once, then copied 1:1: scaling a large atlas cell
  // down every frame was most of the frame. Sizes are bucketed, so a walking actor reuses them.
  scaled(key,image,sx,sy,sw,sh,dw,dh){
    const ratio=this.ratio||1,bucket=Math.max(4,Math.round(dw*ratio/6)*6),height=Math.max(4,Math.round(bucket*(dh/dw)));
    const id=key+'|'+sx+','+sy+'|'+bucket+'x'+height;this.scaledCache??=new Map();
    let canvas=this.scaledCache.get(id);
    if(canvas){this.scaledCache.delete(id);this.scaledCache.set(id,canvas);return canvas;}
    canvas=document.createElement('canvas');canvas.width=bucket;canvas.height=height;
    const c=canvas.getContext('2d');c.imageSmoothingQuality='high';c.drawImage(image,sx,sy,sw,sh,0,0,bucket,height);
    this.scaledCache.set(id,canvas);
    if(this.scaledCache.size>500)this.scaledCache.delete(this.scaledCache.keys().next().value);
    return canvas;
  }
  observeFrame(ms){
    if(ms<=0||ms>500)return;this.sampleMs=(this.sampleMs||0)+ms;this.sampleCount=(this.sampleCount||0)+1;
    if(this.sampleMs<800||this.sampleCount<8)return;const average=this.sampleMs/this.sampleCount;this.sampleMs=this.sampleCount=0;
    let scale=this.resolutionScale;if(average>23){scale=Math.max(.65,scale*.8);this.fastWindows=0;}else if(average<17.7&&++this.fastWindows>=4){scale=Math.min(1,scale+.1);this.fastWindows=0;}else if(average>=17.7)this.fastWindows=0;
    if(Math.abs(scale-this.resolutionScale)<.001)return;this.resolutionScale=scale;this.ratio=this.maxRatio*scale;
    this.canvas.width=Math.round(this.width*this.ratio);this.canvas.height=Math.round(this.height*this.ratio);this.ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
  }
  setView(mode){this.viewMode=mode==='angled'?'angled':'side';this.view=CAMERA_VIEWS[this.viewMode];this.cameraY=undefined;this.terrainCache.clear();}
  point(x,z,y=0) { return project3D(x,z,y,{cameraX:this.camera,cameraZ:this.cameraZ,cameraY:this.cameraY,width:this.width,height:this.height,unit:this.unit,view:this.view}); }
  scale(x,z,y=0){return this.unit*perspectiveScale(x,z,y,this.camera,this.cameraZ,this.cameraY,this.view);}
  poly(points,fill,stroke) {
    const c=this.ctx; c.beginPath(); points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();
    if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}
  }
  // A circle on the ground, as the camera sees it: from three projected points (its centre and
  // two radii) the canvas draws the ellipse itself, instead of a path through 41 projected points.
  // The camera is close to parallel, so this is the same shape to the pixel at these sizes.
  disk(x,z,y,r,fill,stroke,width=1) {
    const c=this.ctx,o=this.point(x,z,y),u=this.point(x+r,z,y),v=this.point(x,z+r,y);
    c.beginPath();c.save();c.transform(u.x-o.x,u.y-o.y,v.x-o.x,v.y-o.y,o.x,o.y);c.arc(0,0,1,0,Math.PI*2);c.restore();c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  }
  triangle(image,source,dest){
    const c=this.ctx,[s0,s1,s2]=source,[d0,d1,d2]=dest;
    const den=(s1.x-s0.x)*(s2.y-s0.y)-(s2.x-s0.x)*(s1.y-s0.y);if(Math.abs(den)<1e-7)return;
    const a=((d1.x-d0.x)*(s2.y-s0.y)-(d2.x-d0.x)*(s1.y-s0.y))/den;
    const b=((d1.y-d0.y)*(s2.y-s0.y)-(d2.y-d0.y)*(s1.y-s0.y))/den;
    const cc=((d2.x-d0.x)*(s1.x-s0.x)-(d1.x-d0.x)*(s2.x-s0.x))/den;
    const d=((d2.y-d0.y)*(s1.x-s0.x)-(d1.y-d0.y)*(s2.x-s0.x))/den;
    // Tiny overlap closes antialias hairlines between adjacent texture triangles.
    const center={x:(d0.x+d1.x+d2.x)/3,y:(d0.y+d1.y+d2.y)/3};
    c.save();c.beginPath();dest.forEach((p,i)=>{const x=center.x+(p.x-center.x)*1.004,y=center.y+(p.y-center.y)*1.004;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();c.clip();
    c.transform(a,b,cc,d,d0.x-a*s0.x-cc*s0.y,d0.y-b*s0.x-d*s0.y);
    const x=Math.max(0,Math.floor(Math.min(s0.x,s1.x,s2.x))-1),y=Math.max(0,Math.floor(Math.min(s0.y,s1.y,s2.y))-1),w=Math.min(image.width,Math.ceil(Math.max(s0.x,s1.x,s2.x))+1)-x,h=Math.min(image.height,Math.ceil(Math.max(s0.y,s1.y,s2.y))+1)-y;
    if(w>0&&h>0)c.drawImage(image,x,y,w,h,x,y,w,h);c.restore();
  }
  textured(image,source,dest){
    const xs=dest.map(p=>p.x),ys=dest.map(p=>p.y);if(Math.max(...xs)<0||Math.min(...xs)>this.width||Math.max(...ys)<0||Math.min(...ys)>this.height)return;
    this.triangle(image,[source[0],source[1],source[2]],[dest[0],dest[1],dest[2]]);this.triangle(image,[source[0],source[2],source[3]],[dest[0],dest[2],dest[3]]);
  }
  cuts(start,end,step){const values=[start];for(let p=Math.ceil((start+.0001)/step)*step;p<end;p+=step)values.push(p);values.push(end);return values;}
  uvQuad(image,u0,v0,u1,v1){return [{x:u0*image.width,y:v0*image.height},{x:u1*image.width,y:v0*image.height},{x:u1*image.width,y:v1*image.height},{x:u0*image.width,y:v1*image.height}];}
  backdrop(g) {
    const c=this.ctx,w=this.width,h=this.height;
    const im=this.images.backdrop,scale=Math.max(w/im.width,h/im.height)*1.15,iw=im.width*scale,ih=im.height*scale;
    const slide=(iw-w)*clamp(g.hero.x/WORLD.length,0,1);
    if(!this.backdropCache||this.backdropCache.width!==Math.ceil(iw)||this.backdropCache.height!==Math.ceil(ih)){const canvas=document.createElement('canvas');canvas.width=Math.ceil(iw);canvas.height=Math.ceil(ih);canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);this.backdropCache=canvas;}
    c.drawImage(this.backdropCache,-Math.round(slide),Math.round((h-ih)*.25));
    const atmosphere=c.createLinearGradient(0,h*.45,0,h);atmosphere.addColorStop(0,'#273e2500');atmosphere.addColorStop(1,'#142d2360');
    c.fillStyle=atmosphere;c.fillRect(0,h*.45,w,h*.55);
  }
  floor(s) {
    const c=this.ctx,span=this.width/this.unit;
    const left=Math.max(s.x0,Math.floor(this.camera-span*1.5)),right=Math.min(s.x1,Math.ceil(this.camera+span*1.5));if(right<=left)return;
    this.wall(s,'front',left,right);this.wall(s,'right',s.z0,s.z1);
    const texture=this.images.floor;
    const xs=this.cuts(left,right,2),zs=this.cuts(s.z0,s.z1,s.ramp?1:2);
    for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
      const x0=xs[i],x1=xs[i+1],z0=zs[j],z1=zs[j+1],tx=Math.floor((x0+.00001)/6)*6,tz=Math.floor((z0+.00001)/6)*6;
      const dest=[[x0,z0],[x1,z0],[x1,z1],[x0,z1]].map(([x,z])=>this.point(x,z,heightAt(s,z)));
      this.textured(texture,this.uvQuad(texture,(x0-tx)/6,(z0-tz)/6,(x1-tx)/6,(z1-tz)/6),dest);
    }
    const outline=[[s.x0,s.z0],[s.x1,s.z0],[s.x1,s.z1],[s.x0,s.z1]].map(([x,z])=>this.point(x,z,heightAt(s,z)));
    this.poly(outline,null,'#d9c59566');
  }
  stairGuide(s){
    const c=this.ctx;
    for(const x of [s.x0+.025,s.x1-.025]){c.beginPath();for(const z of [5.5,6,8.5,9]){const p=this.point(x,z,heightAt(s,z)+.016);z===5.5?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}c.strokeStyle='#e5c992aa';c.lineWidth=2;c.stroke();}
    this.poly([[s.x0,5.2],[s.x1,5.2],[s.x1,5.65],[s.x0,5.65]].map(([x,z])=>this.point(x,z,.014)),'#ead39d22','#ead39d77');
    // Draw actual tread/riser faces over the smooth physical ramp. Every step
    // remains below the capsule's 0.2 step allowance.
    for(let i=0;i<10;i++){const z0=6+i*.25,z1=z0+.25,y0=i*.16,y1=y0+.16;
      const tread=[[s.x0,z1,y1],[s.x1,z1,y1],[s.x1,z0,y1],[s.x0,z0,y1]].map(p=>this.point(...p));
      const riser=[[s.x0,z0,y0],[s.x1,z0,y0],[s.x1,z0,y1],[s.x0,z0,y1]].map(p=>this.point(...p));
      this.textured(this.images.floor,this.uvQuad(this.images.floor,0,0,.5,.12),tread);this.poly(tread,'#c7b58f22','#f0dbad88');
      this.textured(this.images.trim,this.uvQuad(this.images.trim,0,0,1,1),riser);this.poly(riser,'#3a2d2677','#e1c99a88');
    }
    const x=(s.x0+s.x1)/2;c.strokeStyle='#f0d9a5bb';c.lineWidth=2;
    for(const z of [5.3,5.7]){c.beginPath();for(const[px,pz]of [[x-.2,z-.12],[x,z+.1],[x+.2,z-.12]]){const p=this.point(px,pz,.014);px===x-.2?c.moveTo(p.x,p.y):c.lineTo(p.x,p.y);}c.stroke();}
  }
  wall(s,side,start,end){
    if(s.ramp&&side==='right'){
      const c=this.ctx,points=this.cuts(start,end,.5);
      for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],dest=[this.point(s.x1,a,heightAt(s,a)),this.point(s.x1,b,heightAt(s,b)),this.point(s.x1,b,-.04),this.point(s.x1,a,-.04)];this.textured(this.images.wall,this.uvQuad(this.images.wall,0,0,1,1),dest);this.poly(dest,'#3b354766');}
      return;
    }
    const texture=this.images.wall,c=this.ctx,along=this.cuts(start,end,2),drop=s.id==='gallery'?1.6:.8;
    const levels=this.cuts(0,drop,1);
    for(let i=0;i<along.length-1;i++)for(let j=0;j<levels.length-1;j++){
      const a=along[i],b=along[i+1],d0=levels[j],d1=levels[j+1],tile=Math.floor((a+.00001)/4)*4;
      const at=(v,d)=>side==='front'?this.point(v,s.z0,heightAt(s,s.z0)-d):this.point(s.x1,v,heightAt(s,v)-d);
      const dest=[at(a,d0),at(b,d0),at(b,d1),at(a,d1)];
      const ty=Math.floor((d0+.00001)/2)*2;
      this.textured(texture,this.uvQuad(texture,(a-tile)/4,(d0-ty)/2,(b-tile)/4,(d1-ty)/2),dest);
      this.poly(dest,side==='right'?'#17312255':'#3d321c18');
    }
    const trim=this.images.trim;
    for(let i=0;i<along.length-1;i++){
      const a=along[i],b=along[i+1],at=(v,d)=>side==='front'?this.point(v,s.z0,heightAt(s,s.z0)-d):this.point(s.x1,v,heightAt(s,v)-d);
      this.textured(trim,this.uvQuad(trim,0,0,1,1),[at(a,0),at(b,0),at(b,.16),at(a,.16)]);
    }
    c.globalAlpha=1;
  }
  propNodes(){
    const nodes=[];for(const x of WORLD.sections.flatMap(s=>[1,7,12,17,21,27].map(x=>x+s.start)))nodes.push({kind:'fern',x,z:.2,y:0,height:.55,flip:x%2===0});
    for(const x of WORLD.sections.flatMap(s=>[7,12,17,21].map(x=>x+s.start)))nodes.push({kind:'vines',x,z:8.5,y:1.55,height:1,hang:true});
    for(const x of [5,16,25,57,75])nodes.push({kind:'planter',x,z:-.6,y:0,height:.6});
    return nodes;
  }
  prop(node){
    const {x,z,y,kind}=node,p=this.point(x,z,y),u=this.scale(x,z,y),im=this.images[kind],h=node.height*u*.906,w=h*im.width/im.height;
    if(p.x+w<0||p.x-w>this.width)return;
    const c=this.ctx;c.save();this.clipBehindStone({x,z,y,height:node.height});c.translate(p.x,p.y);if(node.flip)c.scale(-1,1);
    c.drawImage(this.scaled(kind,im,0,0,im.width,im.height,w,h),-w/2,-h*(node.hang?.02:.97),w,h);c.restore();
  }
  arch(x,z,y){const p=this.point(x,z,y),u=this.scale(x,z,y),im=this.images.arch,h=3.4*u,w=h*im.width/im.height;this.ctx.drawImage(this.scaled('arch',im,0,0,im.width,im.height,w,h),p.x-w*.5,p.y-h*.96,w,h);}
  block(b,g){const c=this.ctx,pts=[[b.x0,b.z0],[b.x1,b.z0],[b.x1,b.z1],[b.x0,b.z1]],top=pts.map(([x,z])=>this.point(x,z,b.top));
    c.save();
    if(b.art){this.poly(pts.map(([x,z])=>this.point(x,z,b.bottom+.01)),'#5f574422','#c8b99788');this.prop({kind:b.art,x:(b.x0+b.x1)/2,z:(b.z0+b.z1)/2,y:b.bottom,height:b.top-b.bottom});c.restore();return;}
    const face=(points,shade)=>{this.textured(this.images.wall,this.uvQuad(this.images.wall,0,0,1,1),points);if(shade)this.poly(points,shade);};
    face([this.point(b.x0,b.z0,b.top),this.point(b.x1,b.z0,b.top),this.point(b.x1,b.z0,b.bottom),this.point(b.x0,b.z0,b.bottom)],'#4a405622');
    face([this.point(b.x1,b.z0,b.top),this.point(b.x1,b.z1,b.top),this.point(b.x1,b.z1,b.bottom),this.point(b.x1,b.z0,b.bottom)],'#35304844');
    this.textured(this.images.floor,this.uvQuad(this.images.floor,0,0,.4,.4),top);this.poly(top,b.safe?'#78b79722':null,b.safe?'#b0ebbc':'#ead6bc66');c.restore();
  }
  vision(g,a){const c=this.ctx;this.visionCache??=new Map();let cache=this.visionCache.get(a.id);const heading=Math.atan2(a.heading.z,a.heading.x);
    if(!cache||g.time<cache.time||g.time-cache.time>.18||Math.abs(heading-cache.heading)>.25){const points=[{x:a.x,z:a.z,y:a.y+.025}];for(let i=0;i<=24;i++){const t=heading+(i/24-.5)*2*(a.cone??57)*Math.PI/180;let r=.2,y=a.y;for(;r<a.vision;r+=.35){const x=a.x+Math.cos(t)*r,z=a.z+Math.sin(t)*r,ground=groundAt(x,z);if(!ground||!a.sweep&&Math.abs(ground.y-a.y)>.4||!clearRay({x:a.x,z:a.z,y:a.y+1.55},{x,z,y:(a.sweep?ground.y:a.y)+.65}))break;y=ground.y;}r=Math.max(.1,r-.35);points.push({x:a.x+Math.cos(t)*r,z:a.z+Math.sin(t)*r,y:(a.sweep?y:a.y)+.03});}cache={points,x:a.x,z:a.z,heading,time:g.time};this.visionCache.set(a.id,cache);}
    const alert=a.suspicion>.65||(a.sweep&&a.suspicion>.15),anchor=this.point(cache.x,cache.z,a.y+.025);
    if(!cache.bitmap||cache.alert!==alert||cache.unit!==this.unit||cache.view!==this.view){const points=cache.points.map(p=>{const q=this.point(p.x,p.z,p.y);return{x:q.x-anchor.x,y:q.y-anchor.y};}),left=Math.floor(Math.min(...points.map(p=>p.x)))-2,top=Math.floor(Math.min(...points.map(p=>p.y)))-2,canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.ceil(Math.max(...points.map(p=>p.x)))-left+2);canvas.height=Math.max(1,Math.ceil(Math.max(...points.map(p=>p.y)))-top+2);const previous=this.ctx;this.ctx=canvas.getContext('2d');try{this.poly(points.map(p=>({x:p.x-left,y:p.y-top})),alert?'#d4703440':a.sweep?'#e05a4a2a':'#d9b87525',alert?'#efb07e88':a.sweep?'#ff8a7088':'#e3c78b55');}finally{this.ctx=previous;}Object.assign(cache,{bitmap:canvas,left,top,alert,unit:this.unit,view:this.view});}
    const current=this.point(a.x,a.z,a.y+.025);c.drawImage(cache.bitmap,Math.round(current.x+cache.left),Math.round(current.y+cache.top));
  }
  trap(t,g) {
    const c=this.ctx;
    const frameQuad=(frame,r)=>{
      const sx=frame%4*256,sy=Math.floor(frame/4)*256;
      const source=[{x:sx,y:sy},{x:sx+256,y:sy},{x:sx+256,y:sy+256},{x:sx,y:sy+256}];
      const dest=[[t.x-r,t.z-r],[t.x+r,t.z-r],[t.x+r,t.z+r],[t.x-r,t.z+r]].map(([x,z])=>this.point(x,z,t.y+.025));
      this.textured(this.images.frost,source,dest);
    };
    if(!t.active){this.disk(t.x,t.z,t.y+.012,t.radius,'#8ceaff13','#c0f7ff99');
      const frame=t.age<.25?Math.min(2,Math.floor(t.age/.084)):3+(this.reduced?0:Math.floor(t.age/.3)%4);frameQuad(frame,.34);
    } else {
      const elapsed=g.time-t.triggered,frame=11+(this.reduced?0:Math.floor(elapsed/.2)%4);
      c.save();this.disk(t.x,t.z,t.y+.02,2.4,null,null);c.clip();c.globalAlpha=elapsed>6?Math.max(0,1-(elapsed-6)/.24):.45;frameQuad(frame,2.75);c.restore();
      this.disk(t.x,t.z,t.y+.02,2.4,'#78d4f32e','#a8f4fecc',1.5);
    }
  }
  sprite(a,g){
    const c=this.ctx,p=this.point(a.x,a.z,a.y);if(p.x< -400||p.x>this.width+400||p.y< -400||p.y>this.height+400)return;const u=this.scale(a.x,a.z,a.y)*.906;
    c.save();this.clipBehindStone(a);const ground=groundAt(a.x,a.z,a.y+.2);if(ground){const contactY=a.grounded?a.y:ground.y;this.disk(a.x,a.z,contactY+.01,a.boss?.52:.27,'#29213644');if(!a.boss)this.disk(a.x,a.z,contactY+.018,.19,null,'#f1dc9dcc',1.5);}
    c.translate(p.x,p.y);
    if(a.boss){const meta=a.named?MOLDAR_ART:PACK_ART[a.kind],v=a.heading,d=Math.abs(v.z)>Math.abs(v.x)*1.2?(v.z>0?'away':'toward'):(v.x<0?'west':'east'),side=a.facing<0?'west':'east';
      let frame=meta.groups[d][a.moving&&!this.reduced?Math.floor(a.phase/.7*meta.groups[d].length)%meta.groups[d].length:0],direction=d;
      if(a.castTime>0||a.windup>0||a.axeTime>0||a.slamWind>0||a.state==='chase'&&!a.moving){frame=meta.alert[side];direction=side;}else if(a.state==='notice'||a.state==='search'&&!a.moving){frame=meta.notice[side];direction=side;}
      const pivot=meta.pivots[direction]||meta.pivots[side],h=a.height*u/meta.bodyHeight;c.drawImage(this.scaled(a.kind,this.images[a.kind],frame%4*256,Math.floor(frame/4)*256,256,256,h,h),-h*pivot[0],-h*meta.frames[frame].foot,h,h);
      if(a.suspicion>.04||['chase','search','inspect'].includes(a.state)){c.fillStyle=a.state==='chase'?'#9a3d26':'#6b5429';c.strokeStyle='#f9e4b4';c.lineWidth=2;c.beginPath();c.arc(0,-a.height*u-19,11,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#fff0c8';c.font='bold 17px system-ui';c.textAlign='center';c.fillText(a.state==='chase'?'!':'?',0,-a.height*u-13);}
    }else if(g.feign?.active){
      // Feigning death: his standing picture laid on the ground (a stand-in for a painted pose)
      // Turned a quarter about his feet, head the way he faced, raised by half his girth so
      // he lies on the floor rather than in it
      const dir=a.facing<0?'west':'east',meta=ACTOR_ART[g.side].locomotion,frame=sequenceContact(g.side,dir),h=a.height*u/meta.bodyHeight,sheet=g.side+'-locomotion',pv=meta.pivots[dir]||[.5,.95];
      c.globalAlpha=.92;c.translate(0,-h*.13);c.rotate(dir==='east'?Math.PI/2:-Math.PI/2);c.drawImage(this.scaled(sheet,this.images[sheet],frame%4*256,Math.floor(frame/4)*256,256,256,h,h),-h*pv[0],-h*pv[1],h,h);
    }else{const pose=gamePose(g,a),meta=ACTOR_ART[g.side][pose.sheet],pivot=meta.pivots[pose.direction]||meta.pivots[a.facing<0?'west':'east'];
      if(g.cover)c.globalAlpha=.55;
      const frame=this.reduced&&pose.state==='run'?sequenceContact(g.side,pose.direction):pose.frame,h=a.height*u/meta.bodyHeight;
      if(g.invulnerable>0&&Math.floor(g.time*15)%2)c.globalAlpha=.55;
      const sheet=g.side+'-'+pose.sheet;c.drawImage(this.scaled(sheet,this.images[sheet],frame%4*256,Math.floor(frame/4)*256,256,256,h,h),-h*pivot[0],-h*pivot[1],h,h);
    }c.restore();
    if(a.caster&&a.castTime>0){c.save();this.clipBehindStone(a);const hand=this.point(a.x,a.z,a.y+1.2);this.glow(hand.x,hand.y,22,'#60e0ff');c.fillStyle='#a6f5ff';c.beginPath();c.arc(hand.x,hand.y,5+Math.sin(g.time*16)*2,0,Math.PI*2);c.fill();c.restore();const t=a.castTarget;this.disk(t.x,t.z,groundAt(t.x,t.z,t.y)?.y+.02||.02,.36,'#56caff22','#a5eeff',2);}
  }
  // The pet: sitting when he stands, running (with a little bound) when it moves; the main
  // game's two pictures of it, flipped to face its way
  pet(p,g){
    const c=this.ctx,pos=this.point(p.x,p.z,p.y);if(pos.x<-200||pos.x>this.width+200)return;const u=this.scale(p.x,p.z,p.y)*.906;
    const key='pet-'+g.side+'-'+(p.moving?'run':'sit'),im=this.images[key];if(!im)return;
    const h=(p.moving?.42:.62)*u,w=h*im.width/im.height,bound=p.moving&&!this.reduced?Math.abs(Math.sin(g.time*14))*.08*u:0;
    c.save();this.clipBehindStone({...p,height:.6});this.disk(p.x,p.z,p.y+.01,.22,'#29213640');
    c.translate(pos.x,pos.y-bound);if(p.facing<0)c.scale(-1,1);
    if(p.mode==='harass'&&!this.reduced)c.rotate(Math.sin(g.time*20)*.08);
    c.drawImage(this.scaled(key,im,0,0,im.width,im.height,w,h),-w/2,-h*.96,w,h);c.restore();
  }
  // A soft glow, drawn once per colour and size and then copied (canvas shadow blur is slow)
  glow(x,y,radius,color){
    this.glowCache??=new Map();const key=color+radius;let canvas=this.glowCache.get(key);
    if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=radius*2;const c=canvas.getContext('2d'),g=c.createRadialGradient(radius,radius,0,radius,radius,radius);
      g.addColorStop(0,color+'cc');g.addColorStop(.35,color+'66');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(0,0,radius*2,radius*2);this.glowCache.set(key,canvas);}
    this.ctx.drawImage(canvas,x-radius,y-radius);
  }
  // Keep projected convex faces, rather than rasterizing the whole screen on CPU.
  // Each billboard clips only against overlapping geometry in front of its plane.
  stoneDepth(){
    this.occluders=[];
    const span=this.width/this.unit*1.6;
    this.visibleBlocks=WORLD.blocks.filter(b=>b.x1>this.camera-span&&b.x0<this.camera+span);
    this.visibleSurfaces=WORLD.surfaces.filter(s=>!(s.crumble&&this.fallen?.[s.crumble])&&s.x1>this.camera-span&&s.x0<this.camera+span);
    const face=points=>{const world=points.map(([x,z,y])=>({x,z,y,d:this.view.distance+viewDepth(x,z,y,this.camera,this.cameraZ,this.cameraY,this.view)})),screen=world.map(p=>this.point(p.x,p.z,p.y)),xs=screen.map(p=>p.x),ys=screen.map(p=>p.y),bounds={x0:Math.min(...xs),x1:Math.max(...xs),y0:Math.min(...ys),y1:Math.max(...ys)};if(bounds.x1<0||bounds.x0>this.width||bounds.y1<0||bounds.y0>this.height)return;this.occluders.push({world,screen,...bounds,min:Math.min(...world.map(p=>p.d)),max:Math.max(...world.map(p=>p.d))});};
    for(const b of this.visibleBlocks){if(b.art)continue;
      face([[b.x0,b.z0,b.top],[b.x1,b.z0,b.top],[b.x1,b.z1,b.top],[b.x0,b.z1,b.top]]);
      for(const [[x0,z0],[x1,z1]]of [[[b.x0,b.z0],[b.x1,b.z0]],[[b.x1,b.z0],[b.x1,b.z1]],[[b.x1,b.z1],[b.x0,b.z1]],[[b.x0,b.z1],[b.x0,b.z0]]])face([[x0,z0,b.bottom],[x1,z1,b.bottom],[x1,z1,b.top],[x0,z0,b.top]]);
    }
    for(const s of this.visibleSurfaces){const x0=Math.max(s.x0,this.camera-span),x1=Math.min(s.x1,this.camera+span),zs=s.ramp?[5.5,6,8.5,9]:[s.z0,s.z1];for(let i=0;i<zs.length-1;i++){const z0=zs[i],z1=zs[i+1],y0=heightAt(s,z0),y1=heightAt(s,z1);face([[x0,z0,y0],[x1,z0,y0],[x1,z1,y1],[x0,z1,y1]]);if(s.ramp)face([[x1,z0,0],[x1,z1,0],[x1,z1,y1],[x1,z0,y0]]);}
      if(s.id==='gallery')face([[x0,s.z0,0],[x1,s.z0,0],[x1,s.z0,s.h],[x0,s.z0,s.h]]);
    }
  }
  clipBehindStone(a){
    const c=this.ctx,p=this.point(a.x,a.z,a.y),u=this.scale(a.x,a.z,a.y),depth=this.view.distance+viewDepth(a.x,a.z,a.y+a.height*.5,this.camera,this.cameraZ,this.cameraY,this.view)-.015;
    const x0=p.x-u*a.height*.8,x1=p.x+u*a.height*.8,y0=p.y-u*a.height-40,y1=p.y+u*a.height*.95;
    for(const o of this.occluders){if(o.min>=depth||o.x1<x0||o.x0>x1||o.y1<y0||o.y0>y1)continue;let screen=o.screen;
      if(o.max>=depth){const clipped=[];for(let i=0;i<o.world.length;i++){const a=o.world[i],b=o.world[(i+1)%o.world.length],ina=a.d<depth,inb=b.d<depth;if(ina)clipped.push(a);if(ina!==inb){const t=(depth-a.d)/(b.d-a.d);clipped.push({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,y:a.y+(b.y-a.y)*t});}}if(clipped.length<3)continue;screen=clipped.map(p=>this.point(p.x,p.z,p.y));}
      c.beginPath();c.rect(x0,y0,x1-x0,y1-y0);screen.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();c.clip('evenodd');
    }
  }
  // Loose gravel: loud underfoot, even sneaking
  gravel(p){const c=this.ctx;this.poly([[p.x0,p.z0],[p.x1,p.z0],[p.x1,p.z1],[p.x0,p.z1]].map(([x,z])=>this.point(x,z,.012)),'#4a3e3299','#2e261e');
    let seed=Math.round(p.x0*97+p.z0*31)+1;const rnd=()=>(seed=(seed*16807)%2147483647)/2147483647,r=Math.max(2,this.unit*.035);
    for(let i=0;i<(p.x1-p.x0)*(p.z1-p.z0)*70;i++){const q=this.point(p.x0+.05+rnd()*(p.x1-p.x0-.1),p.z0+.05+rnd()*(p.z1-p.z0-.1),.014),k=rnd();c.fillStyle=k<.4?'#b9a68a':k<.75?'#8f7d66':'#d8c8aa';c.beginPath();c.ellipse(q.x,q.y,r*(.6+k*.7),r*(.4+k*.4),k*3,0,Math.PI*2);c.fill();}}
  // The gallery's crumbling stretches: drawn every frame, cracking as he stands on one, gone once fallen
  crumbles(g){const c=this.ctx;for(const s of WORLD.surfaces){if(!s.crumble||g.fallen?.[s.crumble]||Math.abs((s.x0+s.x1)/2-this.camera)>this.width/this.unit*1.2)continue;
    const shake=g.crumbling?.[s.crumble]?Math.sin(g.time*70)*2.5:0,b=this.crumbleBitmap(s),anchor=this.point(s.x0,s.z0,s.h);c.save();c.translate(shake,0);c.drawImage(b.canvas,Math.round(anchor.x+b.dx),Math.round(anchor.y+b.dy));
    const t=(g.crumbling?.[s.crumble]||0)/.6,top=[[s.x0,s.z0],[s.x1,s.z0],[s.x1,s.z1],[s.x0,s.z1]].map(([x,z])=>this.point(x,z,s.h+.01));
    this.poly(top,`rgba(40,26,20,${(.22+.4*t).toFixed(2)})`,'#f0b07a99');c.strokeStyle='#2a1a14cc';c.lineWidth=1.6+2*t;c.beginPath();
    for(const[a,b]of [[[.1,.2],[.5,.55]],[[.5,.55],[.9,.3]],[[.5,.55],[.45,.95]],[[.2,.8],[.45,.95]]]){const p=this.point(s.x0+a[0]*(s.x1-s.x0),s.z0+a[1]*(s.z1-s.z0),s.h+.012),q=this.point(s.x0+b[0]*(s.x1-s.x0),s.z0+b[1]*(s.z1-s.z0),s.h+.012);c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);}c.stroke();c.restore();}}
  // A crumbling piece's stone, drawn once into its own bitmap (the camera only translates)
  crumbleBitmap(s){this.crumbleCache??=new Map();const key=s.crumble+'|'+this.unit+'|'+this.viewMode;let b=this.crumbleCache.get(key);if(b)return b;
    const corners=[];for(const x of [s.x0,s.x1])for(const z of [s.z0,s.z1])for(const y of [-.05,s.h])corners.push(this.point(x,z,y));
    const anchor=this.point(s.x0,s.z0,s.h),left=Math.floor(Math.min(...corners.map(p=>p.x)))-4,top=Math.floor(Math.min(...corners.map(p=>p.y)))-4,canvas=document.createElement('canvas');
    canvas.width=Math.ceil(Math.max(...corners.map(p=>p.x)))-left+4;canvas.height=Math.ceil(Math.max(...corners.map(p=>p.y)))-top+4;
    const saved={ctx:this.ctx,point:this.point},base=this.point.bind(this);this.ctx=canvas.getContext('2d');this.point=(x,z,y=0)=>{const p=base(x,z,y);return{x:p.x-left,y:p.y-top};};
    try{this.floor(s);}finally{Object.assign(this,saved);}
    b={canvas,dx:left-anchor.x,dy:top-anchor.y};this.crumbleCache.set(key,b);return b;}
  // Mol'dar's tribute: a chest by his fire, glinting until it is taken
  tributeChest(g){if(g.tribute||!TRIBUTE)return;const c=this.ctx,x=TRIBUTE.x,z=TRIBUTE.z,w=.34,d=.24,hgt=.32;const p=this.point(x,z,.5);if(p.x<-100||p.x>this.width+100)return;
    this.glow(p.x,p.y,34+Math.sin(g.time*4)*6,'#ffd36a');
    const box=(y0,y1,fill)=>{this.poly([[x-w,z-d,y1],[x+w,z-d,y1],[x+w,z-d,y0],[x-w,z-d,y0]].map(q=>this.point(...q)),fill,'#3a2614');this.poly([[x-w,z-d,y1],[x+w,z-d,y1],[x+w,z+d,y1],[x-w,z+d,y1]].map(q=>this.point(...q)),'#a0703c','#3a2614');};
    box(0,hgt,'#7a4e26');box(hgt,hgt+.12,'#8d5d2e');const lock=this.point(x,z-d,hgt+.02);c.fillStyle='#ffd36a';c.fillRect(lock.x-3,lock.y-4,6,7);
    c.fillStyle='#fff0c8';c.font='bold 11px system-ui';c.textAlign='center';const label=this.point(x,z,1.1);c.fillText('TRIBUTE',label.x,label.y);}
  axe(p,g){const c=this.ctx;c.save();this.glow(p.x,p.y,26,'#ffb070');c.translate(p.x,p.y);c.rotate(g.time*18);c.scale(this.unit/45,this.unit/45);c.fillStyle='#5b3a22';c.fillRect(-1.5,-11,3,22);c.fillStyle='#cfd3d6';c.beginPath();c.moveTo(1,-11);c.quadraticCurveTo(12,-8,9,1);c.lineTo(1,-3);c.closePath();c.fill();c.strokeStyle='#2b2b2b';c.lineWidth=1;c.stroke();c.restore();}
  refuge(r,g){const c=this.ctx;const p=this.point(r.x,r.z,r.y+1.5);c.fillStyle='#163822e8';c.fillRect(p.x-25,p.y-15,50,21);c.strokeStyle='#99d49f';c.strokeRect(p.x-25,p.y-15,50,21);c.fillStyle='#d5f3c6';c.font='bold 11px system-ui';c.textAlign='center';c.fillText('SAFE ↑',p.x,p.y);}
  minimap(g){const c=this.ctx,w=this.width<500?116:188,h=w*.48,x=14,y=this.height-h-15,scale=w/WORLD.length,zscale=h/13;
    c.save();c.translate(x,y);c.fillStyle='#1f2725dd';c.fillRect(0,0,w,h);for(const s of WORLD.surfaces){if(s.crumble&&g.fallen?.[s.crumble])continue;c.fillStyle=s.crumble?'#b07a62':s.id==='gallery'?'#aaa2af':s.ramp?'#d9c399':'#7f8178';c.fillRect(s.x0*scale,h-s.z1*zscale,(s.x1-s.x0)*scale,(s.z1-s.z0)*zscale);}
    for(const b of WORLD.blocks){c.fillStyle=b.safe?'#75da91':'#4e4052';c.fillRect(b.x0*scale,h-b.z1*zscale,(b.x1-b.x0)*scale,(b.z1-b.z0)*zscale);}
    for(const[a,color]of [...g.enemies.map(a=>[a,a.named?'#eac178':a.kind==='lookout'?'#bf9bd1':'#d28b59']),[g.hero,'#f8e6ae']]){c.fillStyle=color;c.beginPath();c.arc(a.x*scale,h-a.z*zscale,a.named?4:2.5,0,Math.PI*2);c.fill();}if(!g.tribute){c.fillStyle='#ffd36a';c.fillRect(TRIBUTE.x*scale-2.5,h-TRIBUTE.z*zscale-2.5,5,5);}c.strokeStyle='#d4c29b88';c.strokeRect(0,0,w,h);c.restore();
  }
  // Orthographic projection makes camera travel an exact 2D translation.
  // Cache opaque terrain in bounded screen-space tiles; actors retain live depth clipping.
  terrainTile(tx,ty){
    const key=tx+','+ty;let tile=this.terrainCache.get(key);if(tile){tile.used=this.frameId;return tile;}
    const size=768,canvas=document.createElement('canvas');canvas.width=canvas.height=size;
    const saved={ctx:this.ctx,width:this.width,height:this.height,camera:this.camera,cameraZ:this.cameraZ,cameraY:this.cameraY,point:this.point};
    const cy=Math.cos(this.view.yawDegrees*Math.PI/180),center=(tx+.5)*size/(cy*this.unit),span=size/this.unit*1.8;
    this.ctx=canvas.getContext('2d');this.width=this.height=size;this.camera=center;this.cameraZ=6;this.cameraY=.5;
    this.point=(x,z,y=0)=>{const p=project3D(x,z,y,{cameraX:0,cameraZ:6,cameraY:.5,width:0,height:0,unit:this.unit,view:this.view});return{x:p.x-tx*size,y:p.y-ty*size};};
    try{const surfaces=WORLD.surfaces.filter(s=>!s.crumble&&s.x1>center-span&&s.x0<center+span),blocks=WORLD.blocks.filter(b=>!b.art&&b.x1>center-span&&b.x0<center+span);
      for(const s of [...surfaces].sort((a,b)=>b.z1-a.z1))this.floor(s);for(const s of surfaces.filter(s=>s.ramp))this.stairGuide(s);for(const p of WORLD.gravel||[])if(p.x1>center-span&&p.x0<center+span)this.gravel(p);
      blocks.sort((a,b)=>viewDepth((b.x0+b.x1)/2,(b.z0+b.z1)/2,b.bottom,center,6,.5,this.view)-viewDepth((a.x0+a.x1)/2,(a.z0+a.z1)/2,a.bottom,center,6,.5,this.view));for(const b of blocks)this.block(b);
    }finally{Object.assign(this,saved);}
    tile={canvas,used:this.frameId};this.terrainCache.set(key,tile);
    if(this.terrainCache.size>20){const oldest=[...this.terrainCache.entries()].sort((a,b)=>a[1].used-b[1].used);for(const[k]of oldest.slice(0,this.terrainCache.size-20))this.terrainCache.delete(k);}
    return tile;
  }
  terrain(){const size=768,origin=this.point(0,6,.5),ox=Math.round(origin.x),oy=Math.round(origin.y),x0=Math.floor(-ox/size),x1=Math.floor((this.width-ox)/size),y0=Math.floor(-oy/size),y1=Math.floor((this.height-oy)/size);
    for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)this.ctx.drawImage(this.terrainTile(x,y).canvas,ox+x*size,oy+y*size);
    // Prepare the next horizontal strip while the browser has idle time.
    // Prepare the tiles two strips ahead on either side while the browser has time to spare,
    // one tile per idle moment, so a tile is never built inside a frame as the hero runs.
    if(!this.warmPending){const next=[];for(const x of [x1+1,x0-1,x1+2,x0-2])for(let y=y0;y<=y1;y++)if(!this.terrainCache.has(x+','+y))next.push([x,y]);if(next.length){this.warmPending=true;const view=this.view,unit=this.unit;
      const warm=deadline=>{if(this.view!==view||this.unit!==unit){this.warmPending=false;return;}while(next.length&&(!deadline||deadline.timeRemaining()>8)){const[x,y]=next.shift();if(!this.terrainCache.has(x+','+y))this.terrainTile(x,y);}if(next.length)window.requestIdleCallback?requestIdleCallback(warm,{timeout:1000}):setTimeout(warm,50);else this.warmPending=false;};
      if(window.requestIdleCallback)requestIdleCallback(warm,{timeout:1000});else setTimeout(warm,100);}}
  }
  render(g){this.frameId++;const c=this.ctx,bounds=visibleCameraBounds(this.width,this.unit,WORLD.length,this.view);this.camera=clamp(g.hero.x,bounds.min,bounds.max);this.cameraZ=this.viewMode==='side'?6:g.hero.z;if(g.hero.grounded||this.cameraY===undefined||g.time===0){const floor=g.hero.grounded?g.hero.y:(groundAt(g.hero.x,g.hero.z,g.hero.y+.2)?.y??0);this.cameraY=this.viewMode==='side'?.5+floor*.25:floor;}
    this.fallen=g.fallen;this.stoneDepth();this.backdrop(g);this.terrain();this.crumbles(g);this.tributeChest(g);for(const a of g.enemies)if(Math.abs(a.x-g.hero.x)<14&&(this.guides||a.sweep))this.vision(g,a);for(const t of g.traps)this.trap(t,g);
    // The props never move: listed once. What is drawn is ordered back to front, each one's
    // depth worked out once rather than on every comparison of the sort.
    this.props??=this.propNodes();
    const span=this.width/this.unit*1.6,depthOf=o=>viewDepth(o.x,o.z,o.y+(o.height??.5)*.5,this.camera,this.cameraZ,this.cameraY,this.view);
    // Exit is a physical arch across depth, rather than a flat camera-facing prop.
    
    for(const r of REFUGES)this.disk(r.x,r.z,r.y+.015,r.radius,'#9fe2b238','#b5f1be',2);
    const billboards=[];
    for(const node of this.props)if(Math.abs(node.x-this.camera)<span)billboards.push({depth:depthOf(node),kind:'prop',item:node});
    for(const b of this.visibleBlocks)if(b.art){const o={x:(b.x0+b.x1)/2,z:(b.z0+b.z1)/2,y:b.bottom,height:b.top-b.bottom};billboards.push({depth:depthOf(o),kind:'block',item:b});}
    for(const a of g.enemies)billboards.push({depth:depthOf(a),kind:'actor',item:a});billboards.push({depth:depthOf(g.hero),kind:'actor',item:g.hero});
    if(g.pet)billboards.push({depth:depthOf({...g.pet,height:.4}),kind:'pet',item:g.pet});
    billboards.sort((a,b)=>b.depth-a.depth);
    for(const b of billboards)b.kind==='prop'?this.prop(b.item):b.kind==='block'?this.block(b.item,g):b.kind==='pet'?this.pet(b.item,g):this.sprite(b.item,g);
    for(const r of REFUGES)this.refuge(r,g);
    this.disk(WORLD.exit.x,WORLD.exit.z,.02,.65,g.mode==='victory'?'#d5edb344':'#d5cd9f20','#d5cd9f77');
    for(const p of g.projectiles){const a=this.point(p.x+p.dx*p.age*12,p.z,p.y+p.age),b=this.point(p.x+p.dx*(p.age*12-.4),p.z,p.y+p.age);c.strokeStyle='#f6ddaa';c.lineWidth=2;c.beginPath();c.moveTo(b.x,b.y);c.lineTo(a.x,a.y);c.stroke();}
    for(const b of g.bolts){c.save();this.clipBehindStone({...b,height:.2});const p=this.point(b.x,b.z,b.y);if(b.kind==='axe')this.axe(p,g);else{this.glow(p.x,p.y,18,'#65cfff');c.fillStyle='#c3f5ff';c.beginPath();c.arc(p.x,p.y,5,0,Math.PI*2);c.fill();}c.restore();}
    for(const w of g.waves||[]){const fade=1-w.r/7;this.disk(w.x,w.z,w.y+.03,w.r,null,`rgba(255,196,120,${(.35+.6*fade).toFixed(2)})`,5);this.disk(w.x,w.z,w.y+.03,Math.max(.05,w.r-.3),null,`rgba(255,240,200,${(.5*fade).toFixed(2)})`,2);}
    for(const a of g.enemies)if(a.slamWind>0){const p=this.point(a.x,a.z,a.y+.02);this.glow(p.x,p.y,60,'#ff9a50');}
    c.fillStyle='#f5e5bd';c.font='11px system-ui';c.textAlign='right';c.fillText(Math.round(g.hero.x/WORLD.length*100)+'% of the approach',this.width-15,this.height-16);this.minimap(g);
  }
}
