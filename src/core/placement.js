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

function snapValue(value,candidates,distance=60,grid=50){
 let best=value,bestDistance=distance+1;
 for(const candidate of candidates){const delta=Math.abs(value-candidate);if(delta<bestDistance){best=candidate;bestDistance=delta}}
 return bestDistance<=distance?best:(grid>0?Math.round(value/grid)*grid:value);
}

/** One placement policy for floor, wall-mounted, appliance and room modules. */
export function resolvePlacementPose({roomWidth,roomDepth,moduleWidth,moduleDepth,rotationY=0,centerX,centerZ,autoRotate=true,snapToWall=true,wallThreshold=180,grid=50,layer='floor',neighbors=[]}){
 if(autoRotate&&snapToWall){
  const wallPose=wallSnapPose({roomWidth,roomDepth,moduleWidth,moduleDepth,centerX,centerZ,threshold:wallThreshold,grid});
  if(wallPose)return wallPose;
 }
 const normalized=normalizeRotation(rotationY),footprint=rotatedFootprint(moduleWidth,moduleDepth,normalized),halfW=footprint.width/2,halfD=footprint.depth/2;
 const xCandidates=[halfW,roomWidth-halfW],zCandidates=[halfD,roomDepth-halfD];
 const proposed={left:centerX-halfW,right:centerX+halfW,back:centerZ-halfD,front:centerZ+halfD};
 for(const neighbor of neighbors){
  if(neighbor.layer&&neighbor.layer!==layer)continue;
  const nfp=rotatedFootprint(neighbor.width,neighbor.depth,neighbor.rotationY),ncx=neighbor.centerX,ncz=neighbor.centerZ,nHalfW=nfp.width/2,nHalfD=nfp.depth/2;
  const nb={left:ncx-nHalfW,right:ncx+nHalfW,back:ncz-nHalfD,front:ncz+nHalfD};
  if(proposed.back<nb.front+80&&proposed.front>nb.back-80)xCandidates.push(nb.left-halfW,nb.right+halfW,ncx);
  if(proposed.left<nb.right+80&&proposed.right>nb.left-80)zCandidates.push(nb.back-halfD,nb.front+halfD,ncz);
 }
 return clampPoseToRoom({roomWidth,roomDepth,moduleWidth,moduleDepth,rotationY:normalized,centerX:snapValue(centerX,xCandidates,60,grid),centerZ:snapValue(centerZ,zCandidates,60,grid),grid:1});
}
