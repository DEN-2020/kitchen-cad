import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function v17ExplodeFix(){
  return {
    name:'v17-explode-camera-print-fix',
    enforce:'pre' as const,
    transform(code:string,id:string){
      if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
        let next=code;
        next=next.replace(
          '<Dimensions model={model} selection={selection}/>',
          "{detail==='none'&&<Dimensions model={model} selection={selection}/>}",
        );
        next=next.replace(
          /function CameraRig\(\{project,model,focusId,view\}:\{project:any;model:any;focusId:string\|null;view:ViewMode\}\)\{[\s\S]*?return <OrbitControls ref=\{controls\}[\s\S]*?<\/OrbitControls>\}/,
          `function CameraRig({project,model,focusId,view}:{project:any;model:any;focusId:string|null;view:ViewMode}){const{camera}=useThree(),controls=useRef<any>(null),fm=focusId?model.modules.find((x:any)=>x.id===focusId):null,focusKey=fm?\`${'${fm.id}:${fm.x}:${fm.y}:${fm.z}:${fm.width}:${fm.height}:${fm.depth}'}\`:'room',target=useMemo(()=>fm?new THREE.Vector3(mm(fm.x+fm.width/2),mm(fm.y+fm.height/2),mm(fm.z+fm.depth/2)):new THREE.Vector3(mm(project.room.width/2),mm(project.room.height*.35),mm(project.room.depth/2)),[focusKey,project.room.width,project.room.height,project.room.depth]);useEffect(()=>{camera.up.set(0,1,0);if(fm){const s=Math.max(mm(fm.width),mm(fm.height),mm(fm.depth),.7);if(view==='front')camera.position.set(target.x,target.y,target.z+s*2.3);else if(view==='top'){camera.position.set(target.x,target.y+s*2.3,target.z+.001);camera.up.set(0,0,-1)}else camera.position.set(target.x+s*1.35,target.y+s*.9,target.z+s*1.45)}else{const s=Math.max(mm(project.room.width),mm(project.room.height),mm(project.room.depth),1);if(view==='front')camera.position.set(target.x,target.y,mm(project.room.depth)+s*1.35);else if(view==='top'){camera.position.set(target.x,mm(project.room.height)+s*1.65,target.z+.001);camera.up.set(0,0,-1)}else camera.position.set(mm(project.room.width)*.9,mm(project.room.height)*.78,mm(project.room.depth)*1.15)}camera.lookAt(target);if(controls.current){controls.current.target.copy(target);controls.current.update()}},[focusKey,view,target,camera,project.room.width,project.room.height,project.room.depth]);return <OrbitControls ref={controls} makeDefault enableRotate={view==='3d'} enableDamping={false} rotateSpeed={.95} zoomSpeed={1} panSpeed={.8} minDistance={.3} maxDistance={12} touches={{ONE:view==='3d'?THREE.TOUCH.ROTATE:THREE.TOUCH.PAN,TWO:THREE.TOUCH.DOLLY_PAN}}/>}`,
        );
        return next;
      }
      if(id.endsWith('/src-modern/export/report.ts')){
        return code.replace(
          "const visual=scenePng?`<div class=\"sceneShot\"><img src=\"${scenePng}\" alt=\"3D\"/></div>`:`<div class=\"fallback3d\">${explodedSvg(project,model,module)}</div>`;",
          "const visual=explode>0?`<div class=\"fallback3d\">${explodedSvg(project,model,module)}</div>`:scenePng?`<div class=\"sceneShot\"><img src=\"${scenePng}\" alt=\"3D\"/></div>`:`<div class=\"fallback3d\">${explodedSvg(project,model,module)}</div>`;",
        );
      }
      if(id.endsWith('/src-modern/App.tsx')){
        return code.replace('Kitchen CAD <span>v1.3</span>','Kitchen CAD <span>v1.7</span>');
      }
      return null;
    },
  };
}

export default defineConfig({
  base: '/kitchen-cad/',
  plugins: [v17ExplodeFix(),react()],
});
