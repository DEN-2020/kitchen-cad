export function v28Plugin(){
 return {
  name:'v28-corner-depth-semantics',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src/core/project.js')){
    let next=code;
    next=next.replace("cornerBaseDiagonal:{width:900,height:720,depth:900,feet:140,doorCount:1,cornerOpening:450,cornerWingDepth:560}","cornerBaseDiagonal:{width:900,height:720,depth:900,feet:140,doorCount:1,cornerOpening:450,cornerWingDepth:600,cornerRunDepth:600}");
    next=next.replace("cornerBaseL:{width:900,height:720,depth:900,feet:140,doorCount:2,cornerOpening:450,cornerWingDepth:560}","cornerBaseL:{width:900,height:720,depth:900,feet:140,doorCount:2,cornerOpening:450,cornerWingDepth:600,cornerRunDepth:600}");
    next=next.replace("cornerWallDiagonal:{width:650,height:720,depth:650,elevation:1500,doorCount:1,cornerOpening:360,cornerWingDepth:320}","cornerWallDiagonal:{width:650,height:720,depth:650,elevation:1500,doorCount:1,cornerOpening:360,cornerWingDepth:320,cornerRunDepth:320}");
    next=next.replace("cornerWallL:{width:650,height:720,depth:650,elevation:1500,doorCount:2,cornerOpening:320,cornerWingDepth:320}","cornerWallL:{width:650,height:720,depth:650,elevation:1500,doorCount:2,cornerOpening:320,cornerWingDepth:320,cornerRunDepth:320}");
    next=next.replace("cornerOpening:d.cornerOpening ?? 0, cornerWingDepth:d.cornerWingDepth ?? 0,","cornerOpening:d.cornerOpening ?? 0, cornerWingDepth:d.cornerWingDepth ?? 0, cornerRunDepth:d.cornerRunDepth ?? 0,");
    next=next.replace("if(!Number.isFinite(m.cornerWingDepth))m.cornerWingDepth=d.cornerWingDepth??0;","if(!Number.isFinite(m.cornerWingDepth))m.cornerWingDepth=d.cornerWingDepth??0;if(!Number.isFinite(m.cornerRunDepth))m.cornerRunDepth=d.cornerRunDepth??0;if(['cornerBaseDiagonal','cornerBaseL'].includes(m.type)&&m.cornerRunDepth===0)m.cornerRunDepth=600;if(['cornerWallDiagonal','cornerWallL'].includes(m.type)&&m.cornerRunDepth===0)m.cornerRunDepth=320;");
    next=next.replace("if(m.cornerWingDepth)number(m.cornerWingDepth,150,1200,'Глубина крыла углового модуля');","if(m.cornerWingDepth)number(m.cornerWingDepth,150,1200,'Глубина крыла углового модуля');if(m.cornerRunDepth)number(m.cornerRunDepth,150,1200,'Глубина ряда углового модуля');");
    if(!next.includes('cornerRunDepth'))throw new Error('v28 project corner run depth transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("for(const m of p.modules||[])if(!Array.isArray(m.frontOverrides))m.frontOverrides=[];return p}","for(const m of p.modules||[]){if(!Array.isArray(m.frontOverrides))m.frontOverrides=[];if(['cornerBaseDiagonal','cornerBaseL'].includes(m.type)){if(!Number.isFinite(m.cornerRunDepth)||m.cornerRunDepth<=0)m.cornerRunDepth=600;if(!Number.isFinite(m.cornerWingDepth)||m.cornerWingDepth===560)m.cornerWingDepth=m.cornerRunDepth}else if(['cornerWallDiagonal','cornerWallL'].includes(m.type)){if(!Number.isFinite(m.cornerRunDepth)||m.cornerRunDepth<=0)m.cornerRunDepth=320;if(!Number.isFinite(m.cornerWingDepth))m.cornerWingDepth=m.cornerRunDepth}if(m.type==='cornerBaseDiagonal'&&m.width!==m.depth){const side=Math.max(m.width,m.depth,m.cornerRunDepth+150);m.width=side;m.depth=side}}return p}");
    next=next.replace("export function updateModule(project:any,id:string,patch:Record<string,unknown>){const p=clone(project),m=p.modules.find((x:any)=>x.id===id);if(m)Object.assign(m,patch);return p}","export function updateModule(project:any,id:string,patch:Record<string,unknown>){const p=clone(project),m=p.modules.find((x:any)=>x.id===id);if(m){Object.assign(m,patch);if(['cornerBaseDiagonal','cornerBaseL'].includes(m.type)&&'cornerRunDepth'in patch){m.cornerWingDepth=Number(m.cornerRunDepth)||600}if(m.type==='cornerBaseDiagonal'&&('width'in patch||'depth'in patch)){const side='width'in patch?Number(m.width):Number(m.depth);if(Number.isFinite(side)){m.width=side;m.depth=side}}}return p}");
    if(!next.includes("m.type==='cornerBaseDiagonal'&&m.width!==m.depth"))throw new Error('v28 domain corner semantics transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace("label={lang==='ru'?'Глубина крыла':lang==='ar'?'عمق الجناح':'Corner wing depth'} value={selectedModule.cornerWingDepth||(String(selectedModule.type).includes('Wall')?320:560)}", "label={lang==='ru'?'Глубина ряда':lang==='ar'?'عمق الصف':'Run depth'} value={selectedModule.cornerRunDepth||(String(selectedModule.type).includes('Wall')?320:600)}");
    next=next.replace("onCommit={n=>patchModule({cornerWingDepth:n})}","onCommit={n=>patchModule({cornerRunDepth:n,cornerWingDepth:n})}");
    next=next.replace("{['cornerBaseDiagonal','cornerBaseL','cornerWallDiagonal','cornerWallL'].includes(selectedModule.type)&&<NumberField", "{['cornerBaseDiagonal','cornerBaseL','cornerWallDiagonal','cornerWallL'].includes(selectedModule.type)&&<NumberField");
    next=next.replace("</div></section>{selectedFurniture&&<><section><h3>{lang==='ru'?'Конструкция':'Construction'}</h3>","</div>{selectedModule.type==='cornerBaseDiagonal'&&<p className=\"note\">{lang==='ru'?'Для угла 45° стороны A и B синхронизируются автоматически. Глубина ряда 600 мм не равна общему габариту углового модуля.':lang==='ar'?'في زاوية 45° يتم توحيد الضلعين A وB تلقائياً. عمق الصف ليس هو المقاس الكلي للوحدة.':'For a 45° corner, sides A and B stay equal automatically. Run depth is not the total corner footprint.'}</p>}</section>{selectedFurniture&&<><section><h3>{lang==='ru'?'Конструкция':'Construction'}</h3>");
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.8</span>');
    if(!next.includes('Глубина ряда')||!next.includes('v2.8'))throw new Error('v28 App corner semantics transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
    let next=code;
    next=next.replace("mm(Number(module.cornerWingDepth)||(wall?320:560))","mm(Number(module.cornerRunDepth)||Number(module.cornerWingDepth)||(wall?320:600))");
    if(!next.includes('module.cornerRunDepth'))throw new Error('v28 scene corner run depth transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/parts.js')){
    let next=code;
    next=next.replaceAll("Number(m.cornerWingDepth)||(m.type.includes('Wall')?320:560)","Number(m.cornerRunDepth)||Number(m.cornerWingDepth)||(m.type.includes('Wall')?320:600)");
    if(!next.includes('Number(m.cornerRunDepth)'))throw new Error('v28 parts corner run depth transform did not apply');
    return next;
   }
   return null;
  }
 };
}
