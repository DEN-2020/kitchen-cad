export const add=(a,b)=>a.map((v,i)=>v+b[i]);
export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const scale=(a,s)=>a.map(v=>v*s);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const normalize=a=>scale(a,1/(Math.hypot(...a)||1));
export function multiply(a,b){const o=new Float32Array(16);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o;}
export function lookAt(eye,target){const z=normalize(sub(eye,target)),x=normalize(cross([0,1,0],z)),y=cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-dot(x,eye),-dot(y,eye),-dot(z,eye),1]);}
export function perspective(fov,aspect,near=.01,far=200){const f=1/Math.tan(fov/2),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);}
export function orthographic(halfWidth,halfHeight,near=.01,far=200){return new Float32Array([1/halfWidth,0,0,0,0,1/halfHeight,0,0,0,0,-2/(far-near),0,0,0,-(far+near)/(far-near),1]);}
export function projectPoint(p,m,width,height){const a=[...p,1],v=[0,0,0,0];for(let r=0;r<4;r++)for(let c=0;c<4;c++)v[r]+=m[c*4+r]*a[c];if(v[3]<=0)return null;return [(v[0]/v[3]+1)*width/2,(1-v[1]/v[3])*height/2];}
export function intersectBox(origin,dir,center,size){let near=-Infinity,far=Infinity;for(let i=0;i<3;i++){const lo=center[i]-size[i]/2,hi=center[i]+size[i]/2;if(Math.abs(dir[i])<1e-10){if(origin[i]<lo||origin[i]>hi)return null;continue;}let a=(lo-origin[i])/dir[i],b=(hi-origin[i])/dir[i];if(a>b)[a,b]=[b,a];near=Math.max(near,a);far=Math.min(far,b);if(near>far)return null;}return far<0?null:Math.max(0,near);}
