import { isDisplayOnlyType, isWallMountedType } from '../catalog/materials.js';
import { hingeCountForHeight } from './hinges.js';

const product=(id,ru,en,ar,unit='шт.')=>{const units=unit==='м'?{ru:'м',en:'m',ar:'م'}:unit==='компл.'?{ru:'компл.',en:'set',ar:'طقم'}:{ru:'шт.',en:'pcs',ar:'قطعة'};return Object.freeze({id,name:ru,names:Object.freeze({ru,en,ar}),unit,units:Object.freeze(units)})};

export const HARDWARE_PRODUCTS = Object.freeze({
  hinge: product('hinge','Петля с ответной планкой','Hinge with mounting plate','مفصلة مع قاعدة'),
  hingeScrew: Object.freeze({...product('hingeScrew','Саморез петли 4×16 (обычно в комплекте)','Hinge screw 4×16 (normally included)','برغي مفصلة 4×16 (عادة ضمن الطقم)'),includedWith:'hinge'}),
  handle: product('handle','Ручка','Handle','مقبض'),
  handleScrew: product('handleScrew','Винт ручки M4','Handle screw M4','برغي مقبض M4'),
  leg: product('leg','Пластиковая регулируемая опора','Adjustable plastic leg','رِجل بلاستيكية قابلة للتعديل'),
  legScrew: product('legScrew','Саморез опоры 4×16','Leg screw 4×16','برغي رِجل 4×16'),
  plinthClip: product('plinthClip','Клипса цоколя','Plinth clip','مشبك الوزرة'),
  countertopBracket: product('countertopBracket','Уголок крепления столешницы','Countertop angle bracket','زاوية تثبيت سطح العمل'),
  bracketScrew: product('bracketScrew','Саморез уголка 4×16','Bracket screw 4×16','برغي زاوية 4×16'),
  carcassScrew: product('carcassScrew','Корпусной шуруп / конфирмат','Carcass screw / confirmat','برغي هيكل / كونفرمات'),
  moduleConnector: product('moduleConnector','Стяжной винт между модулями','Cabinet connector bolt','مسمار ربط بين الوحدات'),
  drawerRunnerPair: product('drawerRunnerPair','Комплект направляющих ящика','Drawer runner set','طقم مجاري درج','компл.'),
  shelfPin: product('shelfPin','Полкодержатель','Shelf pin','حامل رف'),
  wallHangerPair: product('wallHangerPair','Комплект подвесов навесного шкафа','Wall cabinet hanger set','طقم تعليق خزانة علوية','компл.'),
  wallRailM: product('wallRailM','Монтажная шина','Wall mounting rail','سكة تعليق','м'),
  wallAnchor: product('wallAnchor','Дюбель с шурупом для шины','Wall rail anchor and screw','وتد وبرغي لسكة التعليق'),
});

// Editable Egypt online-retail reference prices, checked 2026-09-19.
// Pack prices are normalized to one item. Hinge packs normally include their screws.
export const DEFAULT_HARDWARE_PRICES = Object.freeze({
  hinge:70,hingeScrew:0,handle:35,handleScrew:1,leg:27,legScrew:1.5,
  plinthClip:15,countertopBracket:5,bracketScrew:1.5,carcassScrew:2,
  moduleConnector:12,drawerRunnerPair:350,shelfPin:5,wallHangerPair:250,
  wallRailM:160,wallAnchor:15,
});

export const HARDWARE_PRICE_REFERENCE = Object.freeze({
  market:'Egypt online retail',checkedAt:'2026-09-19',currency:'EGP',
});

export function hardwareProductLabel(row={},lang='ru'){
  return row.names?.[lang]||row.names?.ru||row.name||row.id||'';
}
export function hardwareUnitLabel(row={},lang='ru'){
  return row.units?.[lang]||row.units?.ru||row.unit||'';
}

const round=(value,digits=3)=>{const factor=10**digits;return Math.round((Number(value)||0)*factor)/factor};
const bounds=m=>{const r=((Math.round((Number(m.rotationY)||0)/90)*90)%360+360)%360,swap=r===90||r===270,w=swap?m.depth:m.width,d=swap?m.width:m.depth,cx=m.x+m.width/2,cz=m.z+m.depth/2;return{x:cx-w/2,z:cz-d/2,width:w,depth:d}};

function adjacentPairCount(modules=[]){
  let pairs=0;
  for(let i=0;i<modules.length;i++)for(let j=i+1;j<modules.length;j++){
    const a=bounds(modules[i]),b=bounds(modules[j]),overlapX=Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x),overlapZ=Math.min(a.z+a.depth,b.z+b.depth)-Math.max(a.z,b.z),gapX=Math.max(0,Math.max(a.x,b.x)-Math.min(a.x+a.width,b.x+b.width)),gapZ=Math.max(0,Math.max(a.z,b.z)-Math.min(a.z+a.depth,b.z+b.depth));
    if((overlapX>80&&gapZ<=3)||(overlapZ>80&&gapX<=3))pairs++;
  }
  return pairs;
}

function carcassFastenerCount(parts=[]){
  let count=0;
  for(const part of parts){
    const id=String(part.id||'');
    if(/-(BT|TP)$/.test(id))count+=4; // two fasteners into each side panel
    else if(/-(RF|RR|FS|RS)$/.test(id))count+=2; // one at each end of a narrow rail
    else if(/-(BF|MS)$/.test(id))count+=4; // blind panel / hinge mounting partition
  }
  return Math.max(8,count);
}

/** Quantity-first hardware BOM. Fastener counts are workshop estimates and stay editable. */
export function buildHardwareBill(project={},model={}){
  const rows=new Map(),modules=Array.isArray(model.modules)?model.modules:(project.modules||[]),parts=Array.isArray(model.parts)?model.parts:[],objects=Array.isArray(model.objects)?model.objects:[],structuralModules=modules.filter(module=>!isDisplayOnlyType(module.type));
  const add=(id,quantity,moduleId)=>{
    const item=HARDWARE_PRODUCTS[id];if(!item||!(quantity>0))return;
    const row=rows.get(id)||{...item,quantity:0,moduleIds:[]};row.quantity+=quantity;
    if(moduleId&&!row.moduleIds.includes(moduleId))row.moduleIds.push(moduleId);rows.set(id,row);
  };
  for(const module of structuralModules){
    const moduleParts=parts.filter(part=>part.moduleId===module.id);
    add('carcassScrew',carcassFastenerCount(moduleParts),module.id);
    if(module.type==='drawer')add('drawerRunnerPair',Math.max(1,Math.min(6,Math.round(Number(module.drawerCount)||3))),module.id);
    if(isWallMountedType(module.type)){
      add('wallHangerPair',1,module.id);add('wallRailM',Math.max(0,Number(module.width)||0)/1000,module.id);add('wallAnchor',2,module.id);
    }else if(project.countertop?.enabled!==false&&Number(module.height)<=1000){
      add('countertopBracket',2,module.id);add('bracketScrew',8,module.id);
    }
  }
  let hingeTotal=0;
  for(const part of parts){
    if(part.role==='front'&&part.hingeSide){const quantity=Number(part.hingeCount)||hingeCountForHeight(part.v);hingeTotal+=quantity;add('hinge',quantity,part.moduleId)}
    if(/-SH\d+$/.test(String(part.id)))add('shelfPin',4,part.moduleId);
  }
  add('hingeScrew',hingeTotal*4);
  let legTotal=0;
  for(const object of objects){
    if(object.kind==='support'){legTotal++;add('leg',1,object.moduleId);if(modules.find(module=>module.id===object.moduleId)?.legStyle==='hidden')add('plinthClip',1,object.moduleId)}
  }
  add('legScrew',legTotal*4);
  const handleObjects=objects.filter(object=>object.kind==='handle'&&object.parentFrontId),selectedHandles=handleObjects.length;
  for(const object of handleObjects){const module=modules.find(item=>item.id===object.moduleId);add('handle',1,object.moduleId);add('handleScrew',module?.handleStyle==='knob'?1:2,object.moduleId)}
  const potentialHandles=parts.filter(part=>part.role==='front'&&/-F\d+$/.test(String(part.id))).length;
  if(potentialHandles>selectedHandles){
    const optionalHandles=potentialHandles-selectedHandles,row=rows.get('handle')||{...HARDWARE_PRODUCTS.handle,quantity:0,moduleIds:[]},screws=rows.get('handleScrew')||{...HARDWARE_PRODUCTS.handleScrew,quantity:0,moduleIds:[]};row.optionalQuantity=optionalHandles;screws.optionalQuantity=optionalHandles*2;rows.set('handle',row);rows.set('handleScrew',screws);
  }
  add('moduleConnector',adjacentPairCount(structuralModules.filter(module=>!isWallMountedType(module.type)))*2);
  add('moduleConnector',adjacentPairCount(structuralModules.filter(module=>isWallMountedType(module.type)))*2);
  return [...rows.values()].map(row=>({...row,quantity:round(row.quantity),optionalQuantity:round(row.optionalQuantity||0)}));
}

export function priceHardwareBill(rows=[],prices={}){
  return rows.map(row=>{const unitPrice=Math.max(0,Number(prices[row.id])||0);return{...row,unitPrice,cost:round(row.quantity*unitPrice,2),optionalCost:round((row.optionalQuantity||0)*unitPrice,2)}});
}
