const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const furnitureModules=(modules=[])=>modules.filter(module=>!['window','door'].includes(module.type));

function frontVector(rotationY=0){
  const angle=Number(rotationY||0)*Math.PI/180;
  return{x:Math.sin(angle),z:Math.cos(angle)};
}

/**
 * A front-facing camera path for the showroom mode. All values are millimetres.
 * Unlike OrbitControls.autoRotate this never travels behind the averaged facade plane.
 * @param {{modules?: any[], room?: Record<string, any>, focusId?: string|null, phase?: number, aspect?: number}} options
 */
export function cinematicCameraPose({modules=[],room={},focusId=null,phase=0,aspect=1}={}){
  const available=furnitureModules(modules),focused=focusId?available.find(module=>module.id===focusId):null,shown=focused?[focused]:available;
  const fallback={x:Number(room.width||3000)/2,y:Number(room.height||2700)*.42,z:Number(room.depth||2500)/2};
  if(!shown.length)return{position:{x:fallback.x+1800,y:fallback.y+1200,z:fallback.z+2600},target:fallback,front:{x:0,z:1}};
  const minX=Math.min(...shown.map(module=>Number(module.x||0))),maxX=Math.max(...shown.map(module=>Number(module.x||0)+Number(module.width||0))),minY=Math.min(...shown.map(module=>Number(module.y||0))),maxY=Math.max(...shown.map(module=>Number(module.y||0)+Number(module.height||0))),minZ=Math.min(...shown.map(module=>Number(module.z||0))),maxZ=Math.max(...shown.map(module=>Number(module.z||0)+Number(module.depth||0))),centre={x:(minX+maxX)/2,y:(minY+maxY)/2,z:(minZ+maxZ)/2};
  let fx=0,fz=0,totalWeight=0;
  for(const module of shown){const weight=Math.max(100,Number(module.width||0)),front=frontVector(module.rotationY);fx+=front.x*weight;fz+=front.z*weight;totalWeight+=weight}
  let length=Math.hypot(fx,fz);
  if(length<Math.max(1,totalWeight*.12)){fx=Number(room.width||3000)/2-centre.x;fz=Number(room.depth||2500)/2-centre.z;length=Math.hypot(fx,fz)}
  if(length<1){fx=0;fz=1;length=1}
  fx/=length;fz/=length;
  const sx=fz,sz=-fx,width=Math.max(500,maxX-minX),depth=Math.max(400,maxZ-minZ),height=Math.max(600,maxY-minY),safeAspect=clamp(Number(aspect)||1,.38,2.4),portraitBoost=clamp(.92/safeAspect,1,2.15),span=Math.max(width,depth*.8),baseDistance=Math.max(focused?1250:1900,span*.72*portraitBoost,height*1.08),angle=((phase%1)+1)%1*Math.PI*2,sweep=Math.sin(angle)*Math.min(1250,Math.max(320,span*.34)),vertical=Math.sin(angle*2-Math.PI/2),zoom=1+.105*Math.cos(angle),target={x:centre.x+sx*sweep*.18,y:clamp(centre.y+vertical*height*.2,minY+height*.28,maxY-height*.16),z:centre.z+sz*sweep*.18},distance=baseDistance*zoom;
  return{
    position:{x:target.x+fx*distance+sx*sweep,y:target.y+height*.56+distance*.14+vertical*height*.09,z:target.z+fz*distance+sz*sweep},
    target,
    front:{x:fx,z:fz},
  };
}
