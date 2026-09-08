/** Pure presentation math. All sizes and centres are millimetres. */
export const moduleCentre=m=>[m.x+m.width/2,m.y+m.height/2,m.z+m.depth/2];
export function explodedCentre(object,module,distance=0){
  if(!distance||!module||['washer','dishwasher','oven','fridge'].includes(module.type)||object.kind!=='part')return [...object.center];
  const centre=moduleCentre(module);let direction=object.center.map((v,i)=>v-centre[i]);
  if(Math.hypot(...direction)<1)direction=object.role==='front'?[0,0,1]:[0,1,0];
  const length=Math.hypot(...direction);return object.center.map((v,i)=>v+direction[i]/length*distance);
}
