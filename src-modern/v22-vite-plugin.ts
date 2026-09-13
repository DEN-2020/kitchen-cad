export function v22Plugin(){
 return {
  name:'v22-fronts-edges-fixtures',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("import { buildProject } from '../../src/core/parts.js';","import { buildProject,blankSize } from '../../src/core/parts.js';");
    next=next.replace("for(const m of p.modules||[])if(!Array.isArray(m.frontOverrides))m.frontOverrides=[];", "for(const m of p.modules||[]){if(!Array.isArray(m.frontOverrides))m.frontOverrides=[];if(!m.edgeOverrides||typeof m.edgeOverrides!=='object')m.edgeOverrides={}};");
    next=next.replace(" for(const module of p.modules||[]){for(let i=0;i<(module.frontOverrides||[]).length;i++)", " for(const module of p.modules||[]){for(const part of model.parts.filter((x:any)=>x.moduleId===module.id)){const key=String(part.id).replace(/^M\\d+-/,'');const override=module.edgeOverrides?.[key];if(Array.isArray(override)&&override.length===4){part.edges=override.map((v:any)=>Math.max(0,Number(v)||0));const [bu,bv]=blankSize(part.u,part.v,part.edges);part.blankU=bu;part.blankV=bv;const obj=model.objects.find((x:any)=>x.id===part.id);if(obj){obj.edges=part.edges;obj.blankU=bu;obj.blankV=bv}}}for(let i=0;i<(module.frontOverrides||[]).length;i++)");
    next=next.replace("if(obj)obj.appearance={...(obj.appearance||{}),pattern:DECORS[decor]?.pattern||obj.appearance?.pattern,color}", "part.hingeSide=ov.hingeSide||part.hingeSide;if(obj){obj.appearance={...(obj.appearance||{}),pattern:DECORS[decor]?.pattern||obj.appearance?.pattern,color};obj.hingeSide=part.hingeSide}");
    next=next.replace("export function updateProjectDefaults", "export function updatePartEdges(project:any,moduleId:string,partId:string,edges:number[]){const p=clone(project),m=p.modules.find((x:any)=>x.id===moduleId);if(!m||!Array.isArray(edges)||edges.length!==4)return p;const key=String(partId).replace(/^M\\d+-/,'');m.edgeOverrides={...(m.edgeOverrides||{}),[key]:edges.map(v=>Math.max(0,Number(v)||0)};return p}\nexport function updateProjectDefaults");
    if(!next.includes('updatePartEdges')||!next.includes('blankSize(part.u'))throw new Error('v22 edge override transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/parts.js')){
    let next=code;
    next=next.replace("appearance:app};parts.push(part);objects.push({...part,kind:'part'});return part", "appearance:app,hingeSide:opts.hingeSide||null,rotationY:opts.rotationY||0};parts.push(part);objects.push({...part,kind:'part'});return part");
    next=next.replace(/if\(m\.type==='cornerBaseBlind'\)\{[\s\S]*?\} else if\(isDrawerType\(m\.type\)\)\{/, `if(m.type==='cornerBaseBlind'){
   const opening=Math.max(250,Math.min(m.cornerOpening||450,w-260)),fh=h-2*m.gap,blindW=Math.max(120,w-opening-3*m.gap),blindX=m.gap+blindW/2,n=Math.max(1,Math.min(2,m.doorCount||1)),fw=(opening-(n-1)*m.gap)/n,start=w-m.gap-opening;
   add('BF','Глухая фронтальная панель',blindW,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[blindW,fh,m.frontThickness],[blindX,h/2,d+2+m.frontThickness/2],'front',{hingeSide:null});
   for(let j=0;j<n;j++){const x=start+fw/2+j*(fw+m.gap),ov=(m.frontOverrides||[])[j]||{},decor=ov.decor||m.frontDecor,fa=appearance(decor,ov.color||undefined,m.gloss,m.grain),hingeSide=ov.hingeSide||(n===1?'left':j===0?'left':'right');add(\`F${j+1}\`,\`Фасад ${j+1}\`,fw,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[fw,fh,m.frontThickness],[x,h/2,d+2+m.frontThickness/2],'front',{decor,appearance:fa,hingeSide});frontExtras(m,id,objects,x,h/2,d+m.frontThickness+4,fw,fh)}
   warnings.push(\`${id}: blind-corner — проём фасада ${opening} мм; проверить петли и доступ в глухую зону.\`);
  } else if(['cornerBaseDiagonal','cornerWallDiagonal'].includes(m.type)){
   const arm=Math.min(w,d)*(m.type.includes('Wall')?.32:.56),dx=w-arm,dz=arm-d,faceLen=Math.max(180,Math.hypot(dx,dz)),n=Math.max(1,Math.min(2,m.doorCount||1)),fh=h-2*m.gap,fw=(faceLen-(n+1)*m.gap)/n,rot=Math.atan2(d-arm,w-arm);
   for(let j=0;j<n;j++){const along=m.gap+fw/2+j*(fw+m.gap),q=along/faceLen,x=arm+dx*q,z=d+dz*q,ov=(m.frontOverrides||[])[j]||{},decor=ov.decor||m.frontDecor,fa=appearance(decor,ov.color||undefined,m.gloss,m.grain),hingeSide=ov.hingeSide||(n===1?'left':j===0?'left':'right');add(\`F${j+1}\`,\`Диагональный фасад ${j+1}\`,fw,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[fw,fh,m.frontThickness],[x,h/2,z],'front',{decor,appearance:fa,hingeSide,rotationY:rot})}
   warnings.push(\`${id}: диагональный корпус остаётся предварительным; фасад и его угол уже входят в деталировку, корпус проверить перед производством.\`);
  } else if(['cornerBaseL','cornerWallL'].includes(m.type)){
   const arm=Math.min(w,d)*(m.type.includes('Wall')?.32:.56),fh=h-2*m.gap,lenX=Math.max(120,w-arm-m.gap),lenZ=Math.max(120,d-arm-m.gap),ovs=m.frontOverrides||[],ov1=ovs[0]||{},ov2=ovs[1]||{},d1=ov1.decor||m.frontDecor,d2=ov2.decor||m.frontDecor;
   add('F1','L-фасад 1',lenX,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[lenX,fh,m.frontThickness],[arm+lenX/2,h/2,arm+m.frontThickness/2],'front',{decor:d1,appearance:appearance(d1,ov1.color||undefined,m.gloss,m.grain),hingeSide:ov1.hingeSide||'right'});
   add('F2','L-фасад 2',lenZ,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[lenZ,fh,m.frontThickness],[arm+m.frontThickness/2,h/2,arm+lenZ/2],'front',{decor:d2,appearance:appearance(d2,ov2.color||undefined,m.gloss,m.grain),hingeSide:ov2.hingeSide||'left',rotationY:Math.PI/2});
   warnings.push(\`${id}: L-корпус остаётся предварительным; два фасада уже входят в деталировку, стык корпуса проверить перед производством.\`);
  } else if(isDrawerType(m.type)){`);
    next=next.replace(/const x=start\+fw\/2\+j\*\(fw\+m\.gap\),y=h\/2\+\(m\.frontOverhangTop-m\.frontOverhangBottom\)\/2,ov=\(m\.frontOverrides\|\|\[\]\)\[j\]\|\|\{\},decor=ov\.decor\|\|m\.frontDecor,fa=appearance\(decor,ov\.color\|\|undefined,m\.gloss,m\.grain\);add\(`F\$\{j\+1\}`,[\s\S]*?\{decor,appearance:fa\}\);frontExtras/, `const x=start+fw/2+j*(fw+m.gap),y=h/2+(m.frontOverhangTop-m.frontOverhangBottom)/2,ov=(m.frontOverrides||[])[j]||{},decor=ov.decor||m.frontDecor,fa=appearance(decor,ov.color||undefined,m.gloss,m.grain),hingeSide=ov.hingeSide||(n===1?'left':j===0?'left':j===n-1?'right':j%2?'right':'left');add(\`F${j+1}\`,\`Фасад ${j+1}\`,fw,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[fw,fh,m.frontThickness],[x,y,d+2+m.frontThickness/2],'front',{decor,appearance:fa,hingeSide});frontExtras`);
    if(!next.includes("m.type==='cornerBaseBlind'")||!next.includes("cornerBaseDiagonal")||!next.includes('hingeSide:opts.hingeSide'))throw new Error('v22 front/BOM transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
    let next=code;
    next=next.replace("const size=object.size.map(mm) as [number,number,number],local=object.localCenter.map(mm) as [number,number,number],a=object.appearance||{}", "const size=object.size.map(mm) as [number,number,number],local=object.localCenter.map(mm) as [number,number,number],a=object.appearance||{}");
    next=next.replace("return <mesh position={local} onPointerDown=", "return <mesh position={local} rotation={[0,object.rotationY||0,0]} onPointerDown=");
    next=next.replace("transparent={glass} opacity={glass?.55:1}/>{selected&&<Edges", "transparent={glass} opacity={glass?.55:1}/>{object.role==='front'&&object.hingeSide&&<mesh position={[object.hingeSide==='left'?-size[0]/2+.018:size[0]/2-.018,0,size[2]/2+.006]}><boxGeometry args={[.012,Math.min(.18,size[1]*.42),.008]}/><meshBasicMaterial color=\"#6d54d9\"/></mesh>}{selected&&<Edges");
    next=next.replace("const w=mm(module.width),h=mm(module.height),d=mm(module.depth),wall=String(module.type).includes('Wall'),arm=Math.min(w,d,wall?.32:.56),body='#e7e3d8',front='#9aa889';", "const w=mm(module.width),h=mm(module.height),d=mm(module.depth),wall=String(module.type).includes('Wall'),arm=Math.min(w,d,wall?.32:.56),body=module.bodyColor||'#e7e3d8';");
    next=next.replace(/<mesh position=\{\[\(w\+arm\)\/2,h\/2,\(d\+arm\)\/2\]\} rotation=\{\[0,-theta,0\]\}><boxGeometry args=\{\[len,h,.025\]\}\/><meshStandardMaterial color=\{front\} roughness=\{\.55\}\/><\/mesh>/,'');
    next=next.replace("cornerVisualTypes.has(module.type)&&!detailMode?<CornerVisual module={module}/>:skinTypes.has(module.type)", "cornerVisualTypes.has(module.type)&&!detailMode?<><CornerVisual module={module}/>{visibleObjects.filter((o:any)=>o.role==='front').map((o:any)=><Surface key={o.id} object={o} selected={selectedPartId===o.id} onSelect={()=>onSelectPart(o.id)}/>)}</>:skinTypes.has(module.type)");
    if(!next.includes("object.hingeSide")||!next.includes("visibleObjects.filter((o:any)=>o.role==='front')"))throw new Error('v22 scene front transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace("const fixtureTargetTypes=new Set(['base','drawer','sink','cornerBase','washer','dishwasher']);", "const fixtureTargetTypes=new Set(['base','drawer','sink','cornerBase','cornerBaseBlind','cornerBaseDiagonal','cornerBaseL','washer','dishwasher']);");
    next=next.replace('updateDoorOverride,updateFixture', 'updateDoorOverride,updatePartEdges,updateFixture');
    next=next.replace("</select></label></div>{actualDoorCount>0&&<>", "</select></label></div><div className=\"twoGrid\"><label className=\"field\">{lang==='ru'?'Цвет фасадов':lang==='ar'?'لون الواجهات':'Front color'}<input type=\"color\" value={selectedModule.frontColor} onChange={e=>patchModule({frontColor:e.target.value})}/></label><label className=\"field\">{lang==='ru'?'Цвет корпуса':lang==='ar'?'لون الهيكل':'Body color'}<input type=\"color\" value={selectedModule.bodyColor} onChange={e=>patchModule({bodyColor:e.target.value})}/></label></div>{actualDoorCount>0&&<>");
    next=next.replace("onChange={e=>setProject((p:any)=>updateDoorOverride(p,selectedModule.id,i,{color:e.target.value}))}/></label></div>})}</div>", "onChange={e=>setProject((p:any)=>updateDoorOverride(p,selectedModule.id,i,{color:e.target.value}))}/></label><label className=\"field\">{lang==='ru'?'Петли':lang==='ar'?'المفصلات':'Hinges'}<select value={ov.hingeSide||(actualDoorCount===1?'left':i===0?'left':'right')} onChange={e=>setProject((p:any)=>updateDoorOverride(p,selectedModule.id,i,{hingeSide:e.target.value}))}><option value=\"left\">{lang==='ru'?'Слева':lang==='ar'?'يسار':'Left'}</option><option value=\"right\">{lang==='ru'?'Справа':lang==='ar'?'يمين':'Right'}</option></select></label></div>})}</div>");
    next=next.replace("<div className=\"partList\">{parts.map", "{selectedPart&&<section><h3>{lang==='ru'?'Кромка выбранной детали':lang==='ar'?'حواف القطعة المحددة':'Selected part edges'}</h3><div className=\"segmented\">{(['U−','U+','V−','V+'] as const).map((side,i)=>{const on=(selectedPart.edges?.[i]||0)>0,thickness=selectedPart.role==='front'?(selectedModule.frontEdge||2):(selectedModule.bodyEdge||0.8);return <button key={side} className={on?'active':''} onClick={()=>{const edges=[...(selectedPart.edges||[0,0,0,0])];edges[i]=on?0:thickness;setProject((p:any)=>updatePartEdges(p,selectedModule.id,selectedPart.id,edges))}}>{side} {on?'✓':'–'}</button>})}</div><p className=\"note\">{lang==='ru'?'Изменение сразу пересчитывает заготовку и печать.':lang==='ar'?'يتم تحديث مقاس القص والطباعة فوراً.':'Updates blank size and print immediately.'}</p></section>}<div className=\"partList\">{parts.map");
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.2</span>');
    if(!next.includes('cornerBaseDiagonal')||!next.includes('updatePartEdges')||!next.includes("'Петли'"))throw new Error('v22 App transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/export/report.ts')){
    let next=code;
    next=next.replace("<span>${L(project,\"Количество\",\"Qty\",\"الكمية\")}: <b>1</b></span></div></article>", "<span>${L(project,\"Количество\",\"Qty\",\"الكمية\")}: <b>1</b></span>${p.role==='front'&&p.hingeSide?`<span>${L(project,'Петли','Hinges','المفصلات')}: <b>${p.hingeSide==='left'?L(project,'слева','left','يسار'):L(project,'справа','right','يمين')}</b></span>`:''}</div></article>");
    if(!next.includes("'Hinges'"))throw new Error('v22 report hinge transform did not apply');
    return next;
   }
   return null;
  }
 };
}
