export function doorOpenAngle(hingeSide, openness=1){
 const amount=Math.max(0,Math.min(1,Number(openness)||0));
 return (hingeSide==='left'?-1:1)*Math.PI*.58*amount;
}

export function doorHingeFrame(front){
 const width=Number(front?.size?.[0])||0,rotationY=Number(front?.rotationY)||0,center=front?.localCenter||[0,0,0],hingeOffset=front?.hingeSide==='left'?-width/2:width/2,c=Math.cos(rotationY),s=Math.sin(rotationY);
 return{
  position:[center[0]+c*hingeOffset,0,center[2]-s*hingeOffset],
  rotationY,
  frontCenter:[-hingeOffset,center[1],0],
  openAngle:doorOpenAngle(front?.hingeSide),
 };
}

export function objectInDoorFrame(object,frame){
 const center=object?.localCenter||[0,0,0],dx=center[0]-frame.position[0],dz=center[2]-frame.position[2],c=Math.cos(frame.rotationY),s=Math.sin(frame.rotationY);
 return{
  ...object,
  localCenter:[c*dx-s*dz,center[1],s*dx+c*dz],
  rotationY:(Number(object?.rotationY)||0)-frame.rotationY,
 };
}
