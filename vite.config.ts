import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { v19Plugin } from './src-modern/v19-vite-plugin';
import { v20Plugin } from './src-modern/v20-vite-plugin';

function v18ExplodeFix(){
  return {
    name:'v18-webgl-exploded-dimensions',
    enforce:'pre' as const,
    transform(code:string,id:string){
      if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
        let next=code;
        next=next.replace(
          '<Dimensions model={model} selection={selection}/>',
          "{detail==='none'&&<Dimensions model={model} selection={selection}/>}",
        );
        next=next.replace(
          /function PartCallouts[\s\S]*?function Dimensions/,
          `function WebGLLabel({text,position}:{text:string;position:[number,number,number]}){const texture=useMemo(()=>{const c=document.createElement('canvas');c.width=512;c.height=128;const g=c.getContext('2d')!;g.clearRect(0,0,c.width,c.height);g.fillStyle='rgba(22,27,55,.94)';g.strokeStyle='#8f7cf0';g.lineWidth=5;g.beginPath();g.roundRect(4,4,c.width-8,c.height-8,26);g.fill();g.stroke();g.fillStyle='#fff';g.font='700 48px system-ui,-apple-system,Segoe UI,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,c.height/2+1);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.needsUpdate=true;return t},[text]);useEffect(()=>()=>texture.dispose(),[texture]);return <sprite position={position} scale={[.26,.065,1]} renderOrder={999}><spriteMaterial map={texture} transparent depthTest={false} depthWrite={false}/></sprite>}
function PartCallouts({parts,module,explode}:{parts:any[];module:any;explode:number}){const mc=new THREE.Vector3(mm(module.x+module.width/2),mm(module.y+module.height/2),mm(module.z+module.depth/2));return <>{parts.map((p:any,i:number)=>{const cmm=explodedCentre(p,module,explode),c=new THREE.Vector3(...cmm.map(mm)),dir=c.clone().sub(mc);if(dir.lengthSq()<.0001)dir.set(i%2?.7:-.7,.45,i%3?.5:-.5);dir.normalize();const label=c.clone().add(dir.multiplyScalar(.11+(i%3)*.035)).add(new THREE.Vector3(0,.025,0)),a:[number,number,number]=[c.x,c.y,c.z],b:[number,number,number]=[label.x,label.y,label.z],labelText=\`${'${Math.round(p.u)}×${Math.round(p.v)}×${Math.round(p.thickness)}'}\`;return <group key={\`pc-${'${p.id}'}\`}><Line points={[a,b]} color="#765fe0" lineWidth={1.2}/><WebGLLabel text={labelText} position={b}/></group>})}</>}
function Dimensions`,
        );
        next=next.replace(
          /function CameraRig\(\{project,model,focusId,view\}:\{project:any;model:any;focusId:string\|null;view:ViewMode\}\)\{[\s\S]*?return <OrbitControls ref=\{controls\}[\s\S]*?<\/OrbitControls>\}/,
          `function CameraRig({project,model,focusId,view}:{project:any;model:any;focusId:string|null;view:ViewMode}){const{camera}=useThree(),controls=useRef<any>(null),fm=focusId?model.modules.find((x:any)=>x.id===focusId):null,focusKey=fm?\`${'${fm.id}:${fm.x}:${fm.y}:${fm.z}:${fm.width}:${fm.height}:${fm.depth}'}\`:'room',target=useMemo(()=>fm?new THREE.Vector3(mm(fm.x+fm.width/2),mm(fm.y+fm.height/2),mm(fm.z+fm.depth/2)):new THREE.Vector3(mm(project.room.width/2),mm(project.room.height*.35),mm(project.room.depth/2)),[focusKey,project.room.width,project.room.height,project.room.depth]);useEffect(()=>{camera.up.set(0,1,0);if(fm){const s=Math.max(mm(fm.width),mm(fm.height),mm(fm.depth),.7);if(view==='front')camera.position.set(target.x,target.y,target.z+s*2.3);else if(view==='top'){camera.position.set(target.x,target.y+s*2.3,target.z+.001);camera.up.set(0,0,-1)}else camera.position.set(target.x+s*1.35,target.y+s*.9,target.z+s*1.45)}else{const s=Math.max(mm(project.room.width),mm(project.room.height),mm(project.room.depth),1);if(view==='front')camera.position.set(target.x,target.y,mm(project.room.depth)+s*1.35);else if(view==='top'){camera.position.set(target.x,mm(project.room.height)+s*1.65,target.z+.001);camera.up.set(0,0,-1)}else camera.position.set(mm(project.room.width)*.9,mm(project.room.height)*.78,mm(project.room.depth)*1.15)}camera.lookAt(target);if(controls.current){controls.current.target.copy(target);controls.current.update()}},[focusKey,view,target,camera,project.room.width,project.room.height,project.room.depth]);return <OrbitControls ref={controls} makeDefault enableRotate={view==='3d'} enableDamping={false} rotateSpeed={.95} zoomSpeed={1} panSpeed={.8} minDistance={.3} maxDistance={12} touches={{ONE:view==='3d'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN}}/>}`,
        );
        if(!next.includes('function WebGLLabel'))throw new Error('v18 WebGL label transform did not apply');
        return next;
      }
      if(id.endsWith('/src-modern/App.tsx')){
        return code.replace('Kitchen CAD <span>v1.3</span>','Kitchen CAD <span>v1.8</span>');
      }
      return null;
    },
  };
}

export default defineConfig({
  base: '/kitchen-cad/',
  plugins: [v18ExplodeFix(),v19Plugin(),v20Plugin(),react()],
});
