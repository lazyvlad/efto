// Presentation only: both views use exactly the same world, inputs and collisions.
export const VIEW={orthographic:true,yawDegrees:25,elevationDegrees:25,distance:42,anchorX:.32,anchorY:.78,depthScale:1};
export const CAMERA_VIEWS={angled:VIEW,side:{orthographic:true,yawDegrees:9,elevationDegrees:25,distance:52,anchorX:.35,anchorY:.72,depthScale:.5}};
const cache=new WeakMap();
function basis(view){if(!cache.has(view)){const angle=Math.PI/180;cache.set(view,{cy:Math.cos(view.yawDegrees*angle),sy:Math.sin(view.yawDegrees*angle),cp:Math.cos(view.elevationDegrees*angle),sp:Math.sin(view.elevationDegrees*angle)});}return cache.get(view);}
export function viewDepth(x,z,y,cameraX,cameraZ=0,cameraY=0,view=VIEW){const{sy,cy,cp,sp}=basis(view);return -(x-cameraX)*sy*cp-(y-cameraY)*sp+(z-cameraZ)*(view.depthScale??1)*cy*cp;}
export function perspectiveScale(x,z,y,cameraX,cameraZ=0,cameraY=0,view=VIEW){return view.orthographic?1:view.distance/(view.distance+viewDepth(x,z,y,cameraX,cameraZ,cameraY,view));}
export function project3D(x,z,y,{cameraX,cameraZ=0,cameraY=0,width,height,unit,view=VIEW}){
 const{cy,sy,cp,sp}=basis(view),dx=x-cameraX,dz=(z-cameraZ)*(view.depthScale??1),dy=y-cameraY,f=perspectiveScale(x,z,y,cameraX,cameraZ,cameraY,view);
 return{x:width*view.anchorX+(dx*cy+dz*sy)*unit*f,y:height*view.anchorY+(dx*sy*sp-dy*cp-dz*cy*sp)*unit*f};
}
export function visibleCameraBounds(width,unit,length=64,view=VIEW){const{cy}=basis(view),span=width/unit;return{min:span*view.anchorX/cy,max:length-span*(1-view.anchorX)/cy};}
