export function v27Plugin(){
 return {
  name:'v27-corner-wing-depth',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src/core/project.js')){
    let next=code;
    next=next.replace("cornerBaseDiagonal:{width:900,height:720,depth:900,feet:140,doorCount:1,cornerOpening:450}","cornerBaseDiagonal:{width:900,height:720,depth:900,feet:140,doorCount:1,cornerOpening:450,cornerWingDepth:560}");
    next=next.replace("cornerBaseL:{width:900,height:720,depth:900,feet:140,doorCount:2,cornerOpening:450}","cornerBaseL:{width:900,height:720,depth:900,feet:140,doorCount:2,cornerOpening:450,cornerWingDepth:560}");
    next=next.replace("cornerWallDiagonal:{width:650,height:720,depth:650,elevation:1500,doorCount:1,cornerOpening:360}","cornerWallDiagonal:{width:650,height:720,depth:650,elevation:1500,doorCount:1,cornerOpening:360,cornerWingDepth:320}");
    next=next.replace("cornerWallL:{width:650,height:720,depth:650,elevation:1500,doorCount:2,cornerOpening:320}","cornerWallL:{width:650,height:720,depth:650,elevation:1500,doorCount:2,cornerOpening:320,cornerWingDepth:320}");
    next=next.replace("cornerOpening:d.cornerOpening ?? 0,","cornerOpening:d.cornerOpening ?? 0, cornerWingDepth:d.cornerWingDepth ?? 0,");
    next=next.replace("if(!Number.isFinite(m.cornerOpening))m.cornerOpening=d.cornerOpening??0;","if(!Number.isFinite(m.cornerOpening))m.cornerOpening=d.cornerOpening??0;if(!Number.isFinite(m.cornerWingDepth))m.cornerWingDepth=d.cornerWingDepth??0;");
    next=next.replace("if(m.cornerOpening)number(m.cornerOpening,150,1000,'Проём углового модуля');","if(m.cornerOpening)number(m.cornerOpening,150,1000,'Проём углового модуля');if(m.cornerWingDepth)number(m.cornerWingDepth,150,1200,'Глубина крыла углового модуля');");
    if(!next.includes('cornerWingDepth'))throw new Error('v27 project corner wing transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/parts.js')){
    let next=code;
    next=next.replaceAll("arm=Math.min(w,d)*(m.type.includes('Wall')?.32:.56)","arm=Math.min(w,d,Number(m.cornerWingDepth)||(m.type.includes('Wall')?320:560))");
    if(!next.includes("Number(m.cornerWingDepth)"))throw new Error('v27 parts corner wing transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/scene/KitchenScene.tsx')){
    let next=code;
    next=next.replace("arm=Math.min(w,d,wall?.32:.56)","arm=Math.min(w,d,mm(Number(module.cornerWingDepth)||(wall?320:560)))");
    if(!next.includes("module.cornerWingDepth"))throw new Error('v27 scene corner wing transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    const needle="{String(selectedModule.type).startsWith('corner')&&<NumberField compact label={lang==='ru'?'Проём угла':lang==='ar'?'فتحة الزاوية':'Corner opening'} value={selectedModule.cornerOpening||0} min={150} max={1000} onCommit={n=>patchModule({cornerOpening:n})}/>}";
    const repl=needle+"{['cornerBaseDiagonal','cornerBaseL','cornerWallDiagonal','cornerWallL'].includes(selectedModule.type)&&<NumberField compact label={lang==='ru'?'Глубина крыла':lang==='ar'?'عمق الجناح':'Corner wing depth'} value={selectedModule.cornerWingDepth||(String(selectedModule.type).includes('Wall')?320:560)} min={150} max={1200} onCommit={n=>patchModule({cornerWingDepth:n})}/>}";
    if(!next.includes(needle))throw new Error('v27 App corner opening marker not found');
    next=next.replace(needle,repl);
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.7</span>');
    return next;
   }
   return null;
  }
 };
}
