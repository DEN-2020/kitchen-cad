import { isDisplayOnlyType, isWallMountedType } from '../catalog/materials.js';
import { hingeCountForHeight } from './hinges.js';

export const HARDWARE_PRODUCTS = Object.freeze({
  hinge: Object.freeze({ id:'hinge', name:'Мебельная петля', unit:'шт.' }),
  handle: Object.freeze({ id:'handle', name:'Ручка', unit:'шт.' }),
  leg: Object.freeze({ id:'leg', name:'Регулируемая опора', unit:'шт.' }),
  plinthClip: Object.freeze({ id:'plinthClip', name:'Клипса цоколя', unit:'шт.' }),
  drawerRunnerPair: Object.freeze({ id:'drawerRunnerPair', name:'Комплект направляющих ящика', unit:'компл.' }),
  shelfPin: Object.freeze({ id:'shelfPin', name:'Полкодержатель', unit:'шт.' }),
  wallHangerPair: Object.freeze({ id:'wallHangerPair', name:'Комплект подвесов навесного шкафа', unit:'компл.' }),
  wallRailM: Object.freeze({ id:'wallRailM', name:'Монтажная шина', unit:'м' }),
  fastenerSet: Object.freeze({ id:'fastenerSet', name:'Крепёж корпуса', unit:'компл.' }),
});

export const DEFAULT_HARDWARE_PRICES = Object.freeze(Object.fromEntries(
  Object.keys(HARDWARE_PRODUCTS).map(id=>[id,0]),
));

const round=(value,digits=3)=>{const factor=10**digits;return Math.round((Number(value)||0)*factor)/factor};

/**
 * Quantity-only hardware BOM. Prices intentionally default to zero because
 * suppliers and fitting systems vary; the estimator exposes every unpriced
 * line instead of silently inventing a market price.
 */
export function buildHardwareBill(project={},model={}){
  const rows=new Map(),modules=Array.isArray(model.modules)?model.modules:(project.modules||[]),parts=Array.isArray(model.parts)?model.parts:[],objects=Array.isArray(model.objects)?model.objects:[];
  const add=(id,quantity,moduleId)=>{
    const product=HARDWARE_PRODUCTS[id];if(!product||!(quantity>0))return;
    const row=rows.get(id)||{...product,quantity:0,moduleIds:[]};row.quantity+=quantity;
    if(moduleId&&!row.moduleIds.includes(moduleId))row.moduleIds.push(moduleId);rows.set(id,row);
  };
  for(const module of modules){
    if(isDisplayOnlyType(module.type))continue;
    add('fastenerSet',1,module.id);
    if(module.type==='drawer')add('drawerRunnerPair',Math.max(1,Math.min(6,Math.round(Number(module.drawerCount)||3))),module.id);
    if(isWallMountedType(module.type)){add('wallHangerPair',1,module.id);add('wallRailM',Math.max(0,Number(module.width)||0)/1000,module.id)}
  }
  for(const part of parts){
    if(part.role==='front'&&part.hingeSide)add('hinge',Number(part.hingeCount)||hingeCountForHeight(part.v),part.moduleId);
    if(/-SH\d+$/.test(String(part.id)))add('shelfPin',4,part.moduleId);
  }
  for(const object of objects){
    if(object.kind==='support')add('leg',1,object.moduleId);
    if(object.kind==='support'&&modules.find(module=>module.id===object.moduleId)?.legStyle==='hidden')add('plinthClip',1,object.moduleId);
  }
  for(const module of modules){
    if(isDisplayOnlyType(module.type)||['none','integrated'].includes(module.handleStyle))continue;
    const frontCount=parts.filter(part=>part.moduleId===module.id&&part.role==='front').length;
    add('handle',frontCount,module.id);
  }
  return [...rows.values()].map(row=>({...row,quantity:round(row.quantity)}));
}

export function priceHardwareBill(rows=[],prices={}){
  return rows.map(row=>{const unitPrice=Math.max(0,Number(prices[row.id])||0);return{...row,unitPrice,cost:round(row.quantity*unitPrice,2)}});
}
