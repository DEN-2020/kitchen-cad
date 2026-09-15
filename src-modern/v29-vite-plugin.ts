export function v29Plugin(){
 return {
  name:'v29-wall-blind-backless-cost-ui',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src/catalog/materials.js')){
    let next=code;
    next=next.replace("cornerWall: 'Угловой навесной шкаф (legacy)',", "cornerWall: 'Угловой навесной шкаф (legacy)',\n  cornerWallBlind: 'Угловой навесной — глухой',");
    next=next.replace("types:['cornerWallDiagonal','cornerWallL']", "types:['cornerWallBlind','cornerWallDiagonal','cornerWallL']");
    next=next.replace("['wall','cornerWall','cornerWallDiagonal','cornerWallL','microwave'", "['wall','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL','microwave'");
    next=next.replace("['cornerBase','cornerBaseBlind','cornerBaseDiagonal','cornerBaseL','cornerWall','cornerWallDiagonal','cornerWallL']", "['cornerBase','cornerBaseBlind','cornerBaseDiagonal','cornerBaseL','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL']");
    if(!next.includes("cornerWallBlind: 'Угловой навесной — глухой'"))throw new Error('v29 catalog wall blind transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/i18n.ts')){
    let next=code;
    next=next.replace("cornerWall:'Угловой навесной шкаф',cornerWallDiagonal", "cornerWall:'Угловой навесной шкаф',cornerWallBlind:'Угловой навесной — глухой',cornerWallDiagonal");
    next=next.replace("cornerWall:'Wall corner cabinet',cornerWallDiagonal", "cornerWall:'Wall corner cabinet',cornerWallBlind:'Blind wall corner',cornerWallDiagonal");
    next=next.replace("cornerWall:'خزانة زاوية علوية',cornerWallDiagonal", "cornerWall:'خزانة زاوية علوية',cornerWallBlind:'زاوية علوية عمياء',cornerWallDiagonal");
    if(!next.includes("cornerWallBlind:'Угловой навесной — глухой'"))throw new Error('v29 i18n wall blind transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/project.js')){
    let next=code;
    next=next.replace("wall:{width:600,height:720,depth:320,elevation:1500}, cornerWall:{width:650,height:720,depth:650,elevation:1500,doorCount:2},", "wall:{width:600,height:720,depth:320,elevation:1500}, cornerWall:{width:650,height:720,depth:650,elevation:1500,doorCount:2}, cornerWallBlind:{width:800,height:720,depth:320,elevation:1500,doorCount:1,cornerOpening:360},");
    next=next.replace("bottomMode:'between', topMode:'between', backMode:'overlay'", "bottomMode:'between', topMode:'between', backMode:'none'");
    if(!next.includes('cornerWallBlind:{width:800')||!next.includes("backMode:'none'"))throw new Error('v29 project defaults transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/domain/core.ts')){
    let next=code;
    next=next.replace("bottomMode:'between',topMode:'between',backMode:'overlay'", "bottomMode:'between',topMode:'between',backMode:'none'");
    if(!next.includes("backMode:'none'"))throw new Error('v29 editor default backless transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/parts.js')){
    let next=code;
    next=next.replace("topOverlay=['wall','cornerWall','cornerWallDiagonal','cornerWallL'].includes(m.type)", "topOverlay=['wall','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL'].includes(m.type)");
    next=next.replace("if(['wall','cornerWall','cornerWallDiagonal','cornerWallL'].includes(m.type)){", "if(['wall','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL'].includes(m.type)){");
    next=next.replace("if(m.type==='cornerBaseBlind'){", "if(['cornerBaseBlind','cornerWallBlind'].includes(m.type)){");
    next=next.replace("n=Math.max(1,Math.min(2,m.doorCount||1))", "n=1");
    if(!next.includes("['cornerBaseBlind','cornerWallBlind'].includes(m.type)")||!next.includes("'cornerWallBlind','cornerWallDiagonal'"))throw new Error('v29 wall blind parts transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace("const actualDoorCount=selectedModule?(['cornerBaseL','cornerWallL'].includes(selectedModule.type)?2:", "const actualDoorCount=selectedModule?(['cornerBaseBlind','cornerWallBlind'].includes(selectedModule.type)?1:['cornerBaseL','cornerWallL'].includes(selectedModule.type)?2:");
    next=next.replace("selectedModule.type!=='drawer'&&!['cornerBaseL','cornerWallL'].includes(selectedModule.type)", "selectedModule.type!=='drawer'&&!['cornerBaseBlind','cornerWallBlind','cornerBaseL','cornerWallL'].includes(selectedModule.type)");
    next=next.replace(":panel==='cost'?<div className=\"inspectorBody\">", ":panel==='cost'?<div className=\"inspectorBody costPanel\">");
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.9</span>');
    if(!next.includes("['cornerBaseBlind','cornerWallBlind'].includes(selectedModule.type)?1")||!next.includes('costPanel'))throw new Error('v29 App consistency transform did not apply');
    return next;
   }
   return null;
  }
 };
}
