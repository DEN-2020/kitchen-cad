import { appearance, isApplianceType } from '../catalog/materials.js';
import { layoutProject, round } from './project.js';

/** u-/u+ shorten finished U; v-/v+ shorten finished V. Kerf is NOT a part deduction. */
export function blankSize(u, v, edges) {
  const values = [u, v, ...edges];
  if (edges.length !== 4 || values.some(n => !Number.isFinite(n)) || edges.some(n => n < 0)) throw new Error('Некорректная кромка');
  const a = round(u - edges[0] - edges[1]), b = round(v - edges[2] - edges[3]);
  if (a <= 0 || b <= 0) throw new Error('Кромка больше размера детали');
  return [a, b];
}

function applianceGeometry(m, id, objects) {
  const w=m.width,h=m.height,d=m.depth;
  const white=appearance('white','#d8ddde'), dark=appearance('graphite','#1f2b31'), gray=appearance('graphite','#7d898d'), metal=appearance('graphite','#aab2b4');
  const extra=(suffix,size,center,app,kind='accessory')=>objects.push({id:`${id}-${suffix}`,moduleId:m.id,kind,role:kind,size,center:[center[0]+m.x,center[1]+m.y,center[2]],appearance:app});
  extra('AP',[w,h,d],[w/2,h/2,d/2],white,'appliance');
  if (m.type === 'washer') {
    extra('PANEL',[w-18,82,10],[w/2,h-58,d+5],gray,'appliance-detail');
    extra('SCREEN',[126,34,12],[w*.67,h-55,d+12],dark,'appliance-detail');
    extra('PORT',[w*.54,w*.54,22],[w/2,h*.46,d+15],metal,'appliance-port');
    extra('GLASS',[w*.42,w*.42,28],[w/2,h*.46,d+25],dark,'appliance-glass');
  } else if (m.type === 'dishwasher') {
    extra('DOOR',[w-16,h-55,16],[w/2,(h-55)/2+10,d+10],metal,'appliance-detail');
    extra('CONTROL',[w-36,48,12],[w/2,h-38,d+13],dark,'appliance-detail');
    extra('HANDLE',[w*.52,16,20],[w/2,h-92,d+24],gray,'handle');
  } else if (m.type === 'oven') {
    extra('FRAME',[w-28,h-60,18],[w/2,h/2-5,d+12],dark,'appliance-detail');
    extra('GLASS',[w-82,h*.54,22],[w/2,h*.40,d+24],appearance('graphite','#11191d'),'appliance-detail');
    extra('CONTROL',[w-72,80,18],[w/2,h-62,d+23],gray,'appliance-detail');
    extra('HANDLE',[w*.68,18,22],[w/2,h*.66,d+32],metal,'handle');
  } else if (m.type === 'fridge') {
    extra('DOOR1',[w-22,h*.58,18],[w/2,h*.69,d+12],metal,'appliance-detail');
    extra('DOOR2',[w-22,h*.38,18],[w/2,h*.20,d+12],metal,'appliance-detail');
    extra('HANDLE1',[18,h*.22,24],[w-46,h*.69,d+28],dark,'handle');
    extra('HANDLE2',[18,h*.16,24],[w-46,h*.22,d+28],dark,'handle');
  }
}

export function buildProject(project) {
  const modules = layoutProject(project), parts = [], objects = [], warnings = [];
  modules.forEach((m, index) => {
    const w=m.width,h=m.height,d=m.depth,t=m.board,b=m.back, sd=d-b, inner=w-2*t, id=`M${String(index+1).padStart(2,'0')}`;
    const baseAppearance=appearance(m.bodyDecor,m.bodyColor,false), faceAppearance=appearance(m.frontDecor,m.frontColor,m.gloss,m.grain);
    const add=(suffix,name,u,v,thick,edges,size,center,role='body')=>{
      const front=role==='front', raw=blankSize(u,v,edges), partId=`${id}-${suffix}`;
      const part={id:partId,moduleId:m.id,moduleCode:id,name,role,u:round(u),v:round(v),thickness:thick,blankU:raw[0],blankV:raw[1],edges,
        substrate:role==='back'?'mdf':front?m.frontSubstrate:m.bodySubstrate,decor:front?m.frontDecor:m.bodyDecor,
        grain:front?m.grain:'v',size,center:[center[0]+m.x,center[1]+m.y,center[2]],appearance:front?faceAppearance:baseAppearance};
      parts.push(part);objects.push({...part,kind:'part'});
    };
    const extra=(suffix,size,center,app,kind='accessory')=>objects.push({id:`${id}-${suffix}`,moduleId:m.id,kind,role:kind,size,center:[center[0]+m.x,center[1]+m.y,center[2]],appearance:app});

    if (isApplianceType(m.type)) {
      applianceGeometry(m,id,objects);
      return;
    }

    add('SL','Боковина левая',sd,h,t,[0,m.bodyEdge,0,0],[t,h,sd],[t/2,h/2,b+sd/2]);
    add('SR','Боковина правая',sd,h,t,[0,m.bodyEdge,0,0],[t,h,sd],[w-t/2,h/2,b+sd/2]);
    add('BT','Дно',inner,sd,t,[0,0,0,m.bodyEdge],[inner,t,sd],[w/2,t/2,b+sd/2]);
    add('BK','Задняя стенка накладная',w,h,b,[0,0,0,0],[w,h,b],[w/2,h/2,b/2],'back');
    if(m.type==='wall') {
      add('TP','Верх',inner,sd,t,[0,0,0,m.bodyEdge],[inner,t,sd],[w/2,h-t/2,b+sd/2]);
    } else {
      add('RF','Передняя верхняя планка (плашмя)',inner,100,t,[0,0,0,m.bodyEdge],[inner,t,100],[w/2,h-t/2,d-50]);
      add('RR','Задняя верхняя планка (ребром)',inner,100,t,[0,0,0,0],[inner,100,t],[w/2,h-50,b+t/2]);
      if (m.feet>20) add('PL','Цоколь (индивидуальный)',w,m.feet-10,t,[0,0,0,m.bodyEdge],[w,m.feet-10,t],[w/2,-(m.feet-10)/2,d-65]);
      for(const [j,x] of [[0,50],[1,w-50]]) for(const [k,z] of [[0,70],[1,d-70]])
        extra(`LEG${j}${k}`,[34,m.feet,34],[x,-m.feet/2,z],appearance('graphite','#434b50'));
    }
    if(m.type!=='sink') {
      const shelfWidth=inner-2,shelfDepth=sd-20;
      add('SH','Полка (боковой зазор 1 мм)',shelfWidth,shelfDepth,t,[0,0,0,m.bodyEdge],[shelfWidth,t,shelfDepth],[w/2,h/2,b+shelfDepth/2]);
    }
    const n=w>650?2:1,fw=(w-2*m.gap-(n-1)*m.gap)/n,fh=h-2*m.gap;
    for(let j=0;j<n;j++){
      const x=m.gap+fw/2+j*(fw+m.gap);
      add(`F${j+1}`,'Фасад '+(j+1),fw,fh,m.frontThickness,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge],[fw,fh,m.frontThickness],[x,h/2,d+2+m.frontThickness/2],'front');
      extra(`H${j}`,[100,10,16],[x,h-65,d+m.frontThickness+13],appearance('graphite','#384349'),'handle');
    }
    if(m.width>900) warnings.push(`${id}: широкий пролёт; проверить прогиб полки, планок и опору столешницы.`);
    if(m.type==='sink') warnings.push(`${id}: вырез раковины, трубы и влагозащита ещё не спроектированы.`);
  });

  const floor=modules.filter(m=>m.type!=='wall'),bases=floor.filter(m=>!isApplianceType(m.type)),top=project.countertop;
  const length=floor.reduce((s,m)=>s+m.width,0), topY=bases.length?Math.max(...bases.map(m=>m.y+m.height)):860;
  let countertop=null;
  if(top.enabled && floor.length){
    countertop={id:'CT-01',length:length+2*top.overhang,depth:top.depth,thickness:top.thickness,elevation:topY};
    objects.push({id:'CT-01',kind:'countertop',role:'countertop',moduleId:null,size:[countertop.length,top.thickness,top.depth],center:[length/2,topY+top.thickness/2,top.depth/2],appearance:appearance(top.decor,top.color,top.gloss)});
    if(floor.some(m=>isApplianceType(m.type))) warnings.push('Столешница над техникой: независимые опоры и монтажные зазоры не рассчитаны. Техника не считается опорой.');
    if(bases.some(m=>Math.abs(m.y+m.height-topY)>.1)) warnings.push('Верхние отметки шкафов разные: столешница не опирается на все корпуса.');
    if(floor.some(m=>isApplianceType(m.type)&&m.height>=topY)) warnings.push('Техника касается или пересекает столешницу по высоте. Нужен монтажный зазор по инструкции модели.');
    if(bases.some(m=>m.depth+m.frontThickness+2>top.depth)) warnings.push('Столешница не перекрывает некоторые фасады по глубине.');
  }
  if (floor.some(m=>isApplianceType(m.type))) warnings.push('Модули стыкуются без монтажных промежутков. Нишу техники и зазоры по инструкции нужно проектировать отдельно.');
  warnings.push('Предварительная деталировка: крепёж, сверление, петли, нагрузки и припуски цеха требуют проверки.');
  return {modules,parts,objects,warnings:[...new Set(warnings)],countertop,width:Math.max(length,...modules.map(m=>m.x+m.width)),height:Math.max(900,...modules.map(m=>m.y+m.height)),depth:Math.max(620,...modules.map(m=>m.depth+m.frontThickness+2))};
}
