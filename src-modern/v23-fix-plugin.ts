export function v23FixPlugin(){
 return {
  name:'v23-corner-bom-backless-fixes',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src/core/project.js')){
    let next=code;
    next=next.replace("if(!['overlay','inset'].includes(m.backMode))m.backMode='overlay'", "if(!['overlay','inset','none'].includes(m.backMode))m.backMode='overlay'");
    next=next.replace("member(m.backMode,['overlay','inset'],'тип задней стенки')", "member(m.backMode,['overlay','inset','none'],'тип задней стенки')");
    if(!next.includes("['overlay','inset','none']"))throw new Error('v23 backless project transform did not apply');
    return next;
   }
   if(id.endsWith('/src/core/parts.js')){
    let next=code;
    next=next.replace("topOverlay=['wall','cornerWall'].includes(m.type)&&m.topMode==='overlay'", "topOverlay=['wall','cornerWall','cornerWallDiagonal','cornerWallL'].includes(m.type)&&m.topMode==='overlay'");
    next=next.replace("if(backOverlay)add('BK','Задняя стенка накладная'", "if(m.backMode==='none'){}else if(backOverlay)add('BK','Задняя стенка накладная'");
    next=next.replace("if(['wall','cornerWall'].includes(m.type)){", "if(['wall','cornerWall','cornerWallDiagonal','cornerWallL'].includes(m.type)){" );
    next=next.replace("baseTypes=new Set(['base','drawer','sink','cornerBase'])", "baseTypes=new Set(['base','drawer','sink','cornerBase','cornerBaseBlind','cornerBaseDiagonal','cornerBaseL'])");
    if(!next.includes("m.backMode==='none'")||!next.includes("cornerWallDiagonal")||!next.includes("cornerBaseBlind"))throw new Error('v23 corner/backless parts transform did not apply');
    return next;
   }
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replace("const actualDoorCount=selectedModule?(selectedModule.type==='drawer'?(selectedModule.drawerCount||3):(selectedModule.doorCount>0?selectedModule.doorCount:(selectedModule.width>650?2:1))):0;", "const actualDoorCount=selectedModule?(['cornerBaseL','cornerWallL'].includes(selectedModule.type)?2:selectedModule.type==='drawer'?(selectedModule.drawerCount||3):(selectedModule.doorCount>0?selectedModule.doorCount:(selectedModule.width>650?2:1))):0;");
    next=next.replace("<option value=\"overlay\">{lang==='ru'?'Накладная':'Overlay'}</option><option value=\"inset\">{lang==='ru'?'Вкладная':'Inset'}</option>", "<option value=\"overlay\">{lang==='ru'?'Накладная':lang==='ar'?'خلفية خارجية':'Overlay'}</option><option value=\"inset\">{lang==='ru'?'Вкладная':lang==='ar'?'خلفية داخلية':'Inset'}</option><option value=\"none\">{lang==='ru'?'Без задней стенки':lang==='ar'?'بدون ظهر':'No back'}</option>");
    if(!next.includes("cornerBaseL','cornerWallL")||!next.includes('Без задней стенки'))throw new Error('v23 App consistency transform did not apply');
    return next;
   }
   return null;
  }
 };
}
