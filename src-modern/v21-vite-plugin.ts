export function v21Plugin(){
 return {
  name:'v21-wall-auto-rotate',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("import { DECORS,isDisplayOnlyType,isWallMountedType } from '../../src/catalog/materials.js';", "import { DECORS,isDisplayOnlyType,isWallMountedType } from '../../src/catalog/materials.js';\nimport { wallSnapPose,clampPoseToRoom,normalizeRotation } from '../../src/core/placement.js';");
    next=next.replace("if(typeof p.ui.showAllModuleDimensions!=='boolean')p.ui.showAllModuleDimensions=false;", "if(typeof p.ui.showAllModuleDimensions!=='boolean')p.ui.showAllModuleDimensions=false;if(typeof p.ui.autoRotateToWall!=='boolean')p.ui.autoRotateToWall=true;");
    next=next.replace(/export function snapModuleAbsolute\(project:any,id:string,xAbs:number,zAbs:number\)\{[\s\S]*?return p\}/, `export function snapModuleAbsolute(project:any,id:string,xAbs:number,zAbs:number){const p=clone(project),model=deriveModel(p),m=model.modules.find((x:any)=>x.id===id),src=p.modules.find((x:any)=>x.id===id);if(!m||!src)return p;const proposedCenterX=xAbs+m.width/2,proposedCenterZ=zAbs+m.depth/2;if(p.ui?.autoRotateToWall!==false&&!isWallMountedType(m.type)){const pose=wallSnapPose({roomWidth:p.room.width,roomDepth:p.room.depth,moduleWidth:m.width,moduleDepth:m.depth,centerX:proposedCenterX,centerZ:proposedCenterZ,threshold:180,grid:50});if(pose){src.rotationY=pose.rotationY;const targetX=pose.centerX-m.width/2,targetZ=pose.centerZ-m.depth/2,nominal=m.x-(src.offsetX||0);src.offsetX=Math.round(targetX-nominal);src.offsetZ=Math.round(targetZ);return p}}const xs=[0,p.room.width-m.width],zs=[0,p.room.depth-m.depth];for(const n of model.modules){if(n.id===id||isWallMountedType(n.type))continue;if(zAbs<n.z+n.depth+80&&zAbs+m.depth>n.z-80)xs.push(n.x+n.width,n.x-m.width,n.x);if(xAbs<n.x+n.width+80&&xAbs+m.width>n.x-80)zs.push(n.z+n.depth,n.z-m.depth,n.z)}const x=snap(xAbs,xs),z=snap(zAbs,zs),nominal=m.x-(src.offsetX||0);src.offsetX=Math.round(x-nominal);src.offsetZ=Math.round(z);return p}
export function rotateModule(project:any,id:string,rotationY:number){const p=clone(project),model=deriveModel(p),m=model.modules.find((x:any)=>x.id===id),src=p.modules.find((x:any)=>x.id===id);if(!m||!src)return p;const centerX=m.x+m.width/2,centerZ=m.z+m.depth/2,pose=clampPoseToRoom({roomWidth:p.room.width,roomDepth:p.room.depth,moduleWidth:m.width,moduleDepth:m.depth,rotationY:normalizeRotation(rotationY),centerX,centerZ,grid:1}),targetX=pose.centerX-m.width/2,targetZ=pose.centerZ-m.depth/2,nominal=m.x-(src.offsetX||0);src.rotationY=pose.rotationY;src.offsetX=Math.round(targetX-nominal);src.offsetZ=Math.round(targetZ);return p}`);
    if(!next.includes('export function rotateModule'))throw new Error('v21 core rotation transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace('snapModuleAbsolute,updateCountertop', 'snapModuleAbsolute,rotateModule,updateCountertop');
    next=next.replace("{roomElement(selectedModule.type)&&<><h3>{lang==='ru'?'Поворот относительно комнаты':'Room rotation'}</h3><div className=\"segmented\">{[0,90,180,270].map(a=><button key={a} className={(selectedModule.rotationY||0)===a?'active':''} onClick={()=>patchModule({rotationY:a})}>{a}°</button>)}</div><p className=\"note\">{lang==='ru'?'90°/270° удобно для установки двери или окна на боковую стену.':'Use 90°/270° to place a door or window on a side wall.'}</p></>}", "<><h3>{lang==='ru'?'Поворот':lang==='ar'?'الدوران':'Rotation'}</h3><div className=\"segmented\">{[0,90,180,270].map(a=><button key={a} className={(selectedModule.rotationY||0)===a?'active':''} onClick={()=>setProject((p:any)=>rotateModule(p,selectedModule.id,a))}>{a}°</button>)}</div><p className=\"note\">{lang==='ru'?'Можно повернуть любой модуль. При включённом автоповороте модуль сам развернётся при привязке к стене.':lang==='ar'?'يمكن تدوير أي وحدة. عند تفعيل الدوران التلقائي ستتجه الوحدة تلقائياً عند الالتصاق بالجدار.':'Rotate any module. With auto-rotate enabled, it turns automatically when snapping to a wall.'}</p></>");
    next=next.replace("<button onClick={()=>patchUi({showGrid:project.ui?.showGrid===false})}><span>{t('grid')}</span><b>{project.ui?.showGrid===false?t('off'):t('on')}</b></button>", "<button onClick={()=>patchUi({showGrid:project.ui?.showGrid===false})}><span>{t('grid')}</span><b>{project.ui?.showGrid===false?t('off'):t('on')}</b></button><button onClick={()=>patchUi({autoRotateToWall:project.ui?.autoRotateToWall===false})}><span>{lang==='ru'?'Автоповорот к стене':lang==='ar'?'تدوير تلقائي عند الجدار':'Auto-rotate to wall'}</span><b>{project.ui?.autoRotateToWall===false?t('off'):t('on')}</b></button>");
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.1</span>');
    if(!next.includes('rotateModule(p,selectedModule.id,a)'))throw new Error('v21 App rotation transform did not apply');
    return next;
   }
   return null;
  }
 };
}
