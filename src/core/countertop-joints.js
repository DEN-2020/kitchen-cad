const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const horizontal=s=>s.wall==='back'||s.wall==='front';
function rect(s){return{x1:s.center[0]-s.size[0]/2,x2:s.center[0]+s.size[0]/2,z1:s.center[2]-s.size[2]/2,z2:s.center[2]+s.size[2]/2}}
export function normalizeJointType(value){return ['butt','miter45','euro'].includes(value)?value:'butt'}
export function detectCountertopJoints(project,segments){
 const type=normalizeJointType(project?.countertop?.jointType),gap=clamp(Number(project?.countertop?.jointGap)||0,0,20),out=[];
 for(let i=0;i<(segments||[]).length;i++)for(let j=i+1;j<(segments||[]).length;j++){
  const a=segments[i],b=segments[j];if(horizontal(a)===horizontal(b))continue;
  const ra=rect(a),rb=rect(b),x1=Math.max(ra.x1,rb.x1),x2=Math.min(ra.x2,rb.x2),z1=Math.max(ra.z1,rb.z1),z2=Math.min(ra.z2,rb.z2);
  const iw=x2-x1,id=z2-z1;if(iw<=0||id<=0)continue;
  const h=horizontal(a)?a:b,v=horizontal(a)?b:a,cx=(x1+x2)/2,cz=(z1+z2)/2;
  out.push({id:`J-${h.id}-${v.id}`,type,gap,segmentAId:a.id,segmentBId:b.id,horizontalId:h.id,verticalId:v.id,center:[cx,Math.max(a.elevation,b.elevation)+Math.max(a.thickness,b.thickness)+1.5,cz],intersection:{x1,x2,z1,z2,width:iw,depth:id}})
 }
 return out
}
export function jointLinePoints(joint){
 const {x1,x2,z1,z2}=joint.intersection,y=joint.center[1];
 if(joint.type==='miter45')return[[x1,y,z1],[x2,y,z2]];
 if(joint.type==='euro'){const mx=(x1+x2)/2,mz=(z1+z2)/2,q=Math.min(x2-x1,z2-z1)*.22;return[[x1,y,mz],[mx-q,y,mz],[mx,y,mz-q],[mx+q,y,mz],[x2,y,mz]]}
 const hWide=(x2-x1)>=(z2-z1);return hWide?[[x1,y,(z1+z2)/2],[x2,y,(z1+z2)/2]]:[[(x1+x2)/2,y,z1],[(x1+x2)/2,y,z2]]
}
