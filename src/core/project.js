import { DECORS, MODULE_TYPES, isApplianceType, isDisplayOnlyType, isWallMountedType, FRONT_STYLES, HANDLE_STYLES, LEG_STYLES, FIXTURE_TYPES } from '../catalog/materials.js';

export const SCHEMA_VERSION = 1;
export const MAX_MODULES = 64;
export const round = n => Math.round((n + Number.EPSILON) * 1000) / 1000;
let sequence = 0;
export function newId(prefix='m') { return globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now().toString(36)}-${++sequence}`; }

const typeDefaults = {
  base:{width:600,height:720,depth:560,feet:140}, drawer:{width:600,height:720,depth:560,feet:140,drawerCount:3}, sink:{width:600,height:720,depth:560,feet:140,shelfCount:0},
  cornerBase:{width:900,height:720,depth:900,feet:140,doorCount:2}, wall:{width:600,height:720,depth:320,elevation:1500}, cornerWall:{width:650,height:720,depth:650,elevation:1500,doorCount:2},
  tall:{width:600,height:2100,depth:560,feet:100,shelfCount:5}, tallOven:{width:600,height:2100,depth:600,feet:100,shelfCount:3},
  washer:{width:600,height:850,depth:600}, dishwasher:{width:600,height:815,depth:570}, oven:{width:600,height:600,depth:560}, fridge:{width:600,height:1850,depth:650}, freezer:{width:600,height:1850,depth:650},
  microwave:{width:600,height:380,depth:420,elevation:1350}, hood:{width:600,height:350,depth:300,elevation:1350}, window:{width:1200,height:1200,depth:80,elevation:900}, door:{width:900,height:2100,depth:80,elevation:0},
};

export function createModule(type='base') {
  if (!(type in MODULE_TYPES)) throw new Error('Неизвестный модуль');
  const d=typeDefaults[type]||typeDefaults.base, display=isDisplayOnlyType(type), wall=isWallMountedType(type);
  return {
    id:newId(), type, width:d.width, height:d.height, depth:d.depth,
    board:18, frontThickness:18, back:3, gap:2,
    bodyEdge:0.8, frontEdge:2, bodyEdgeType:'ABS', frontEdgeType:'ABS',
    bottomMode:'between', topMode:'between', backMode:'overlay', shelfCount:d.shelfCount ?? (display?0:1), drawerCount:d.drawerCount ?? 3,
    feet:d.feet ?? 0, elevation:d.elevation ?? (wall?1500:0), offsetX:0, offsetZ:0,
    bodySubstrate:'ldsp', frontSubstrate:'mdf', bodyDecor:'white', frontDecor:'olive',
    bodyColor:DECORS.white.color, frontColor:DECORS.olive.color, gloss:false, grain:'v',
    doorCount:d.doorCount ?? 0, frontStyle:'flat', handleStyle:'bar', legStyle:'round',
    frontOverhangTop:0, frontOverhangBottom:0, frontOverhangLeft:0, frontOverhangRight:0, frontOverrides:[],
  };
}

export function createFixture(type='sink',targetModuleId='') {
  if (!(type in FIXTURE_TYPES)) throw new Error('Неизвестный встраиваемый элемент');
  const sink=type==='sink'; return {id:newId('f'),type,targetModuleId,width:sink?500:560,depth:sink?400:490,offsetX:0,offsetZ:0,radius:sink?18:8};
}

export function createProject(){const sink=createModule('sink');sink.width=500;return{schemaVersion:SCHEMA_VERSION,name:'Моя кухня',room:{width:3000,depth:2500,height:2700,wallColor:'#f3f1ec',floorColor:'#d8d4cc'},ui:{language:'ru',showDimensions:true,dimensionMode:'main',theme:'dark',explode:0,moveMode:false},modules:[createModule(),sink,createModule('washer')],fixtures:[],countertop:{enabled:true,depth:620,thickness:20,overhang:0,decor:'marble',color:DECORS.marble.color,gloss:false,lengthMode:'auto',length:1700,offsetX:0}}}

function number(value,min,max,label){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw new Error(`${label}: допустимо ${min}–${max} мм`)}
function member(value,choices,label){if(!choices.includes(value))throw new Error(`Некорректное поле: ${label}`)}
function color(value){if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))throw new Error('Цвет должен быть #RRGGBB')}

export function ensureProjectDefaults(p){
  if(!p.room)p.room={width:3000,depth:2500,height:2700,wallColor:'#f3f1ec',floorColor:'#d8d4cc'}; if(!p.ui)p.ui={};
  p.ui.language=p.ui.language==='en'?'en':'ru'; if(typeof p.ui.showDimensions!=='boolean')p.ui.showDimensions=true; if(!['main','selected','all'].includes(p.ui.dimensionMode))p.ui.dimensionMode='main'; if(!['light','dark'].includes(p.ui.theme))p.ui.theme='dark'; if(!Number.isFinite(p.ui.explode))p.ui.explode=0; p.ui.explode=Math.max(0,Math.min(600,p.ui.explode));
  if(!Array.isArray(p.fixtures))p.fixtures=[]; if(!p.countertop)p.countertop={enabled:true,depth:620,thickness:20,overhang:0,decor:'marble',color:DECORS.marble.color,gloss:false};
  if(!['auto','manual'].includes(p.countertop.lengthMode))p.countertop.lengthMode='auto'; if(!Number.isFinite(p.countertop.length))p.countertop.length=p.modules?.filter(m=>m.type!=='wall').reduce((s,m)=>s+(m.width||0),0)||1700; if(!Number.isFinite(p.countertop.offsetX))p.countertop.offsetX=0;
  for(const m of p.modules||[]){
    const d=typeDefaults[m.type]||typeDefaults.base; if(!Number.isFinite(m.offsetX))m.offsetX=0;if(!Number.isFinite(m.offsetZ))m.offsetZ=0;if(!Number.isFinite(m.elevation))m.elevation=d.elevation??0;if(!Number.isFinite(m.feet))m.feet=d.feet??0;
    if(!Number.isFinite(m.doorCount))m.doorCount=d.doorCount??0;if(!Number.isFinite(m.drawerCount))m.drawerCount=d.drawerCount??3;
    if(!FRONT_STYLES[m.frontStyle])m.frontStyle='flat';if(!HANDLE_STYLES[m.handleStyle])m.handleStyle='bar';if(!LEG_STYLES[m.legStyle])m.legStyle='round';
    for(const k of ['frontOverhangTop','frontOverhangBottom','frontOverhangLeft','frontOverhangRight'])if(!Number.isFinite(m[k]))m[k]=0;
    if(!['between','under'].includes(m.bottomMode))m.bottomMode='between';if(!['between','overlay'].includes(m.topMode))m.topMode='between';if(!['overlay','inset'].includes(m.backMode))m.backMode='overlay';
    if(!['ABS','PVC'].includes(m.bodyEdgeType))m.bodyEdgeType='ABS';if(!['ABS','PVC'].includes(m.frontEdgeType))m.frontEdgeType='ABS';if(!Number.isFinite(m.shelfCount))m.shelfCount=d.shelfCount??(isDisplayOnlyType(m.type)?0:1);m.shelfCount=Math.max(0,Math.min(8,Math.round(m.shelfCount)));if(!Array.isArray(m.frontOverrides))m.frontOverrides=[];
  } return p;
}

export function validateProject(raw){
 const p=ensureProjectDefaults(raw);if(!p||typeof p!=='object'||Array.isArray(p)||p.schemaVersion!==SCHEMA_VERSION)throw new Error('Неподдерживаемая версия проекта');if(typeof p.name!=='string'||p.name.length>120)throw new Error('Некорректное название проекта');if(!Array.isArray(p.modules)||p.modules.length>MAX_MODULES)throw new Error(`Допустимо 0–${MAX_MODULES} модулей`);
 number(p.room.width,800,20000,'Ширина комнаты');number(p.room.depth,800,20000,'Длина комнаты');number(p.room.height,1800,6000,'Высота комнаты');color(p.room.wallColor);color(p.room.floorColor);const ids=new Set();
 for(const m of p.modules){if(!m||typeof m!=='object'||typeof m.id!=='string'||ids.has(m.id))throw new Error('Повторяющийся или некорректный ID модуля');ids.add(m.id);member(m.type,Object.keys(MODULE_TYPES),'тип модуля');number(m.width,100,3000,'Ширина');number(m.height,100,3000,'Высота');number(m.depth,20,1500,'Глубина');number(m.offsetX,-10000,10000,'Смещение X');number(m.offsetZ,-10000,10000,'Смещение Z');number(m.elevation,0,3000,'Отметка низа');number(m.feet,0,300,'Ножки');
   if(!isDisplayOnlyType(m.type)){number(m.board,12,30,'Толщина корпуса');number(m.frontThickness,12,30,'Толщина фасада');number(m.back,2,12,'Задняя стенка');number(m.gap,1,8,'Зазор');number(m.bodyEdge,0,3,'Кромка корпуса');number(m.frontEdge,0,3,'Кромка фасада');number(m.doorCount,0,6,'Количество фасадов');number(m.shelfCount,0,8,'Количество полок');number(m.drawerCount,1,6,'Количество ящиков');for(const k of ['frontOverhangTop','frontOverhangBottom','frontOverhangLeft','frontOverhangRight'])number(m[k],0,400,k);member(m.frontStyle,Object.keys(FRONT_STYLES),'тип фасада');member(m.handleStyle,Object.keys(HANDLE_STYLES),'тип ручки');member(m.legStyle,Object.keys(LEG_STYLES),'тип ножек');member(m.bottomMode,['between','under'],'тип дна');member(m.topMode,['between','overlay'],'тип верха');member(m.backMode,['overlay','inset'],'тип задней стенки');member(m.bodyEdgeType,['ABS','PVC'],'тип кромки корпуса');member(m.frontEdgeType,['ABS','PVC'],'тип кромки фасада');member(m.bodySubstrate,['ldsp','mdf','plywood'],'материал корпуса');member(m.frontSubstrate,['ldsp','mdf','plywood'],'материал фасада');member(m.bodyDecor,Object.keys(DECORS),'декор корпуса');member(m.frontDecor,Object.keys(DECORS),'декор фасада');member(m.grain,['u','v'],'волокна');color(m.bodyColor);color(m.frontColor);if(typeof m.gloss!=='boolean')throw new Error('Некорректный финиш')}
 }
 const t=p.countertop;if(!t||typeof t.enabled!=='boolean'||typeof t.gloss!=='boolean')throw new Error('Некорректная столешница');number(t.depth,300,1200,'Глубина столешницы');number(t.thickness,8,100,'Толщина столешницы');number(t.overhang,0,300,'Боковой свес');number(t.length,200,20000,'Длина столешницы');number(t.offsetX,-10000,10000,'Смещение столешницы');member(t.lengthMode,['auto','manual'],'режим длины столешницы');member(t.decor,Object.keys(DECORS),'декор столешницы');color(t.color);
 for(const f of p.fixtures){if(!f||typeof f.id!=='string'||!FIXTURE_TYPES[f.type]||!ids.has(f.targetModuleId))throw new Error('Некорректный встраиваемый элемент');number(f.width,100,1200,'Ширина выреза');number(f.depth,100,900,'Глубина выреза');number(f.offsetX,-1000,1000,'Смещение выреза X');number(f.offsetZ,-1000,1000,'Смещение выреза Z')}return p;
}

export function layoutProject(p){validateProject(p);let floorX=0,wallX=0;return p.modules.map(m=>{const wall=isWallMountedType(m.type),roomEl=['window','door'].includes(m.type);let baseX=wall?wallX:floorX;if(roomEl)baseX=0;else if(wall)wallX+=m.width;else floorX+=m.width;return{...m,x:baseX+m.offsetX,z:m.offsetZ,y:m.elevation+(isDisplayOnlyType(m.type)?0:m.feet)}})}
