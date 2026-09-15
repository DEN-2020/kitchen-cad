const clamp=(v,min,max)=>Math.min(Math.max(v,min),max);
export function normalizeRotation(value){const n=Number(value)||0;return ((Math.round(n/90)*90)%360+360)%360}
export function rotatedFootprint(width,depth,rotationY=0){const r=normalizeRotation(rotationY);return r===90||r===270?{width:depth,depth:width}:{width,depth}}
export function wallSnapPose({roomWidth,roomDepth,moduleWidth,moduleDepth,centerX,centerZ,threshold=160,grid=50}){
 const round=v=>grid>0?Math.round(v/grid)*grid:v;
 const candidates=[
  {wall:'back',rotationY:0,distance:Math.abs(centerZ-moduleDepth/2),centerX:clamp(round(centerX),moduleWidth/2,roomWidth-moduleWidth/2),centerZ:moduleDepth/2},
  {wall:'front',rotationY:180,distance:Math.abs(centerZ-(roomDepth-moduleDepth/2)),centerX:clamp(round(centerX),moduleWidth/2,roomWidth-moduleWidth/2),centerZ:roomDepth-moduleDepth/2},
  {wall:'left',rotationY:90,distance:Math.abs(centerX-moduleDepth/2),centerX:moduleDepth/2,centerZ:clamp(round(centerZ),moduleWidth/2,roomDepth-moduleWidth/2)},
  {wall:'right',rotationY:270,distance:Math.abs(centerX-(roomWidth-moduleDepth/2)),centerX:roomWidth-moduleDepth/2,centerZ:clamp(round(centerZ),moduleWidth/2,roomDepth-moduleWidth/2)},
 ];
 const best=candidates.sort((a,b)=>a.distance-b.distance)[0];
 if(!best||best.distance>threshold)return null;
 const safe=clampPoseToRoom({roomWidth,roomDepth,moduleWidth,moduleDepth,rotationY:best.rotationY,centerX:best.centerX,centerZ:best.centerZ,grid:1});
 return {...best,centerX:safe.centerX,centerZ:safe.centerZ,rotationY:safe.rotationY};
}
export function clampPoseToRoom({roomWidth,roomDepth,moduleWidth,moduleDepth,rotationY=0,centerX,centerZ,grid=50}){
 const fp=rotatedFootprint(moduleWidth,moduleDepth,rotationY),round=v=>grid>0?Math.round(v/grid)*grid:v;
 const halfW=fp.width/2,halfD=fp.depth/2;
 const safeMinX=Math.min(halfW,roomWidth/2),safeMaxX=Math.max(roomWidth-halfW,roomWidth/2),safeMinZ=Math.min(halfD,roomDepth/2),safeMaxZ=Math.max(roomDepth-halfD,roomDepth/2);
 return {rotationY:normalizeRotation(rotationY),centerX:clamp(round(centerX),safeMinX,safeMaxX),centerZ:clamp(round(centerZ),safeMinZ,safeMaxZ)};
}
