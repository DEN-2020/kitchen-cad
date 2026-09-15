export function v25Plugin(){
 return {
  name:'v25-countertop-joints-hinges',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("import { buildProject,blankSize } from '../../src/core/parts.js';", "import { buildProject,blankSize } from '../../src/core/parts.js';\nimport { hingeCountForHeight } from '../../src/core/hinges.js';\nimport { detectCountertopJoints } from '../../src/core/countertop-joints.js';");
    next=next.replace("model.countertopSegments=segments;model.countertop=segments[0]||null;", "model.countertopSegments=segments;model.countertopJoints=detectCountertopJoints(p,segments);model.countertop=segments[0]||null;");
    const start=next.indexOf('export function deriveModel'),end=next.indexOf('export function updateModule',start);if(start<0||end<0)throw new Error('v25 deriveModel block not found');const block=next.slice(start,end),marker='return model}',rel=block.lastIndexOf(marker);if(rel<0)throw new Error('v25 deriveModel return not found');const inject="for(const module of p.modules||[]){if(module.type==='drawer')continue;for(const part of model.parts.filter((x:any)=>x.moduleId===module.id&&x.role==='front'&&x.hingeSide)){const m=String(part.id).match(/-F(\\d+)$/),i=m?Math.max(0,Number(m[1])-1):0,ov=(module.frontOverrides||[])[i]||{},count=hingeCountForHeight(part.v,ov.hingeCount);part.hingeCount=count;const obj=model.objects.find((x:any)=>x.id===part.id);if(obj)obj.hingeCount=count}}return model}";const abs=start+rel;next=next.slice(0,abs)+inject+next.slice(abs+marker.length);
    if(!next.includes('model.countertopJoints=detectCountertopJoints')||!next.includes('part.hingeCount=count'))throw new Error('v25 domain transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
    let next=code;
    next=next.replace("import { isDisplayOnlyType } from '../../src/catalog/materials.js';", "import { isDisplayOnlyType } from '../../src/catalog/materials.js';\nimport { jointLinePoints } from '../../src/core/countertop-joints.js';");
    next=next.replace("{object.role==='front'&&object.hingeSide&&<mesh position={[object.hingeSide==='left'?-size[0]/2+.018:size[0]/2-.018,0,size[2]/2+.006]}><boxGeometry args={[.012,Math.min(.18,size[1]*.42),.008]}/><meshBasicMaterial color=\"#6d54d9\"/></mesh>}", "{object.role==='front'&&object.hingeSide&&Array.from({length:object.hingeCount||2},(_,i)=>{const n=object.hingeCount||2,edge=Math.min(.11,Math.max(.07,size[1]*.12)),yy=n===1?0:(size[1]/2-edge)-i*((size[1]-2*edge)/(n-1));return <mesh key={`hinge-${i}`} position={[object.hingeSide==='left'?-size[0]/2+.018:size[0]/2-.018,yy,size[2]/2+.006]}><boxGeometry args={[.016,.045,.009]}/><meshBasicMaterial color=\"#6d54d9\"/></mesh>})}");
    next=next.replace("function CountertopSegment({object,onSelect}", "function CountertopJointVisual({joint}:{joint:any}){const pts=jointLinePoints(joint).map((p:any)=>p.map(mm) as [number,number,number]);const c=joint.type==='miter45'?'#f0a34a':joint.type==='euro'?'#55c8a8':'#8d7cf0';return <group><Line points={pts} color={c} lineWidth={2}/><Html position={joint.center.map(mm) as [number,number,number]} center><span className=\"moduleDimBadge\">{joint.type==='miter45'?'45°':joint.type==='euro'?'EURO':'90°'} · {joint.gap} мм</span></Html></group>}\nfunction CountertopSegment({object,onSelect}");
    next=next.replace("{!focusId&&model.objects.filter((o:any)=>o.kind==='countertop-segment').map((o:any)=><CountertopSegment key={o.id} object={o} onSelect={()=>setSelection({kind:'countertop',id:'CT-01'})}/>)}<Dimensions", "{!focusId&&model.objects.filter((o:any)=>o.kind==='countertop-segment').map((o:any)=><CountertopSegment key={o.id} object={o} onSelect={()=>setSelection({kind:'countertop',id:'CT-01'})}/>)}{!focusId&&(model.countertopJoints||[]).map((j:any)=><CountertopJointVisual key={j.id} joint={j}/>)}<Dimensions");
    if(!next.includes('CountertopJointVisual')||!next.includes('object.hingeCount||2'))throw new Error('v25 scene transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.5</span>');
    next=next.replace("<section><h3>{lang==='ru'?'Экспорт проекта':'Project export'}</h3>", "<section><h3>{lang==='ru'?'Стыки столешницы':lang==='ar'?'وصلات سطح العمل':'Countertop joints'}</h3><div className=\"twoGrid\"><label className=\"field\">{lang==='ru'?'Тип стыка':lang==='ar'?'نوع الوصلة':'Joint type'}<select value={project.countertop?.jointType||'butt'} onChange={e=>setProject((p:any)=>({...p,countertop:{...p.countertop,jointType:e.target.value}}))}><option value=\"butt\">{lang==='ru'?'Прямой 90°':lang==='ar'?'مستقيم 90°':'Butt 90°'}</option><option value=\"miter45\">{lang==='ru'?'Диагональный 45°':lang==='ar'?'قطري 45°':'Miter 45°'}</option><option value=\"euro\">{lang==='ru'?'Еврозапил':lang==='ar'?'وصلة يورو':'Euro joint'}</option></select></label><NumberField compact label={lang==='ru'?'Зазор стыка':lang==='ar'?'فاصل الوصلة':'Joint gap'} value={project.countertop?.jointGap||0} min={0} max={20} onCommit={n=>setProject((p:any)=>({...p,countertop:{...p.countertop,jointGap:n}}))}/></div><p className=\"note\">{lang==='ru'?'Еврозапил пока показывается как схема стыка; точный CNC-профиль зависит от шаблона конкретного цеха.':lang==='ar'?'وصلة اليورو تخطيطية حالياً وتعتمد على قالب الورشة.':'Euro joint is schematic; exact CNC profile depends on the shop template.'}</p></section><section><h3>{lang==='ru'?'Экспорт проекта':'Project export'}</h3>");
    next=next.replace("<label className=\"field\">{lang==='ru'?'Петли':lang==='ar'?'المفصلات':'Hinges'}<select value={ov.hingeSide", "<label className=\"field\">{lang==='ru'?'Петли':lang==='ar'?'المفصلات':'Hinges'}<select value={ov.hingeSide");
    next=next.replace("</select></label></div>})}</div>", "</select></label><NumberField compact label={lang==='ru'?'Кол-во петель (0=авто)':lang==='ar'?'عدد المفصلات (0=تلقائي)':'Hinges (0=auto)'} value={ov.hingeCount||0} min={0} max={6} onCommit={n=>setProject((p:any)=>updateDoorOverride(p,selectedModule.id,i,{hingeCount:n}))}/></div>})}</div>");
    if(!next.includes('v2.5')||!next.includes("jointType||'butt'")||!next.includes('hingeCount:n'))throw new Error('v25 App transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/export/report.ts')){
    let next=code;
    next=next.replace("${p.role==='front'&&p.hingeSide?`<span>${L(project,'Петли','Hinges','المفصلات')}: <b>${p.hingeSide==='left'?L(project,'слева','left','يسار'):L(project,'справа','right','يمين')}</b></span>`:''}", "${p.role==='front'&&p.hingeSide?`<span>${L(project,'Петли','Hinges','المفصلات')}: <b>${p.hingeSide==='left'?L(project,'слева','left','يسار'):L(project,'справа','right','يمين')} · ${p.hingeCount||2} pcs</b></span>`:''}");
    next=next.replace("function countertopSummary(project:any,model:any){", "function countertopJointSummary(project:any,model:any){const j=model.countertopJoints||[];if(!j.length)return'';return page(L(project,'Стыки столешницы','Countertop joints','وصلات سطح العمل'),L(project,'Всего','Total','الإجمالي')+': <b>'+j.length+'</b>',`<table><thead><tr><th>#</th><th>${L(project,'Тип','Type','النوع')}</th><th>${L(project,'Зазор','Gap','الفاصل')}</th><th>${L(project,'Сегменты','Segments','القطاعات')}</th></tr></thead><tbody>${j.map((x:any,i:number)=>`<tr><td>${i+1}</td><td>${esc(x.type)}</td><td>${x.gap} mm</td><td>${esc(x.segmentAId)} + ${esc(x.segmentBId)}</td></tr>`).join('')}</tbody></table>`)}\nfunction countertopSummary(project:any,model:any){");
    next=next.replace("${moduleId?'':countertopSummary(project,model)}", "${moduleId?'':countertopSummary(project,model)+countertopJointSummary(project,model)}");
    if(!next.includes('countertopJointSummary')||!next.includes('p.hingeCount||2'))throw new Error('v25 report transform did not apply');
    return next;
   }
   return null;
  }
 };
}
