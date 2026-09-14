export function v24Plugin(){
 return {
  name:'v24-segmented-countertops',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("import { DECORS,isDisplayOnlyType,isWallMountedType } from '../../src/catalog/materials.js';", "import { DECORS,isDisplayOnlyType,isWallMountedType } from '../../src/catalog/materials.js';\nimport { buildCountertopSegments,countertopSegmentForModule } from '../../src/core/countertop-segments.js';");
    const start=next.indexOf('export function deriveModel'),end=next.indexOf('export function updateModule',start);if(start<0||end<0)throw new Error('v24 deriveModel block not found');const block=next.slice(start,end),marker='return model}',rel=block.lastIndexOf(marker);if(rel<0)throw new Error('v24 deriveModel return not found');const inject="model.objects=model.objects.filter((o:any)=>o.id!=='CT-01'&&o.kind!=='countertop-segment');const segments=buildCountertopSegments(p,model.modules);model.countertopSegments=segments;model.countertop=segments[0]||null;for(const s of segments)model.objects.push({...s,kind:'countertop-segment',role:'countertop',moduleId:null,appearance:{pattern:'stone',color:p.countertop?.color||'#e7e5dd',gloss:!!p.countertop?.gloss}});for(const f of model.fixtures||[]){const seg=countertopSegmentForModule(segments,f.targetModuleId);const obj=model.objects.find((o:any)=>o.id===f.id);if(seg&&obj){obj.center=[obj.center[0],seg.elevation+seg.thickness+3,obj.center[2]];f.y=obj.center[1];f.countertopSegmentId=seg.id}}return model}";const abs=start+rel;next=next.slice(0,abs)+inject+next.slice(abs+marker.length);
    if(!next.includes('model.countertopSegments=segments'))throw new Error('v24 segmented model transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
    let next=code;
    next=next.replace("function Countertop({object,selected,onSelect,onCommit}", "function CountertopSegment({object,onSelect}:{object:any;onSelect?:()=>void}){const size=object.size.map(mm) as [number,number,number],pos=object.center.map(mm) as [number,number,number],texture=useMemo(()=>proceduralTexture(object.appearance?.pattern,object.appearance?.color),[object.appearance?.pattern,object.appearance?.color]);return <mesh position={pos} onPointerDown={e=>{if(onSelect){e.stopPropagation();onSelect()}}}><boxGeometry args={size}/><meshStandardMaterial map={texture||undefined} color={texture?'#fff':object.appearance?.color||'#dedbd2'} roughness={.3}/><Edges color=\"#7566a8\" lineWidth={1}/></mesh>}\nfunction Countertop({object,selected,onSelect,onCommit}");
    next=next.replace("{!focusId&&model.objects.find((o:any)=>o.id==='CT-01')&&<Countertop object={model.objects.find((o:any)=>o.id==='CT-01')} selected={selection?.kind==='countertop'} onSelect={()=>setSelection({kind:'countertop',id:'CT-01'})} onCommit={onMoveCountertop}/>}<Dimensions", "{!focusId&&model.objects.filter((o:any)=>o.kind==='countertop-segment').map((o:any)=><CountertopSegment key={o.id} object={o} onSelect={()=>setSelection({kind:'countertop',id:'CT-01'})}/>)}<Dimensions");
    next=next.replace("if(selection.kind==='countertop'){const o=model.objects.find((x:any)=>x.id==='CT-01');if(!o)return null;", "if(selection.kind==='countertop'){const o=model.objects.find((x:any)=>x.kind==='countertop-segment');if(!o)return null;");
    if(!next.includes("kind==='countertop-segment'"))throw new Error('v24 scene countertop transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.4</span>');
    next=next.replace("selection?.kind==='countertop'?`${project.countertop.length} × ${project.countertop.depth} × ${project.countertop.thickness} мм`", "selection?.kind==='countertop'?`${model.countertopSegments?.length||0} сегм. · ${(model.countertopSegments||[]).reduce((s:any,x:any)=>s+x.length,0)} мм` ");
    if(!next.includes('v2.4'))throw new Error('v24 App transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/export/report.ts')){
    let next=code;
    next=next.replace("function reportHtml(project:any,model:any,moduleId?:string,scenePng?:string|null){", "function countertopSummary(project:any,model:any){const s=model.countertopSegments||[];if(!s.length)return'';return page(L(project,'Столешница — сегменты','Countertop — segments','سطح العمل — القطاعات'),L(project,'Всего','Total','الإجمالي')+': <b>'+s.length+'</b>',`<table><thead><tr><th>#</th><th>${L(project,'Стена','Wall','الجدار')}</th><th>${L(project,'Длина','Length','الطول')}</th><th>${L(project,'Глубина','Depth','العمق')}</th><th>${L(project,'Толщина','Thickness','السماكة')}</th></tr></thead><tbody>${s.map((x:any,i:number)=>`<tr><td>${i+1}</td><td>${esc(x.wall)}</td><td>${x.length} mm</td><td>${x.depth} mm</td><td>${x.thickness} mm</td></tr>`).join('')}</tbody></table>`)}\nfunction reportHtml(project:any,model:any,moduleId?:string,scenePng?:string|null){");
    next=next.replace("<body>${cover}${chosen.map", "<body>${cover}${moduleId?'':countertopSummary(project,model)}${chosen.map");
    if(!next.includes('countertopSummary'))throw new Error('v24 report countertop transform did not apply');
    return next;
   }
   return null;
  }
 };
}
