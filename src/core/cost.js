import { MATERIAL_PRODUCTS, inferMaterialProductId } from '../catalog/materials.js';
import { planSheetLayout } from './sheet-layout.js';
import { buildHardwareBill, DEFAULT_HARDWARE_PRICES, priceHardwareBill } from './hardware.js';

export const DEFAULT_MATERIAL_PRICES=Object.freeze(Object.fromEntries(
  Object.values(MATERIAL_PRODUCTS).map(product=>[product.id,product.pricePerM2]),
));

export const DEFAULT_COSTING=Object.freeze({
  currency:'EGP',wastePercent:15,materialPrices:DEFAULT_MATERIAL_PRICES,
  hardwarePrices:DEFAULT_HARDWARE_PRICES,hardwarePriceVersion:1,
  sawKerf:4,sheetEdgeTrim:10,
  cuttingPerSheet:100,serviceBase:300,edge08PerM:12,edge2PerM:25,
  countertopPerM:0,hardwareFixed:0,extraCost:0,uncertaintyPercent:12,
});

export const COST_PRESETS=Object.freeze({
  budget:Object.freeze({bodyMaterialId:'mfc18',frontMaterialId:'highGlossMdfPvc18'}),
  standard:Object.freeze({bodyMaterialId:'melamineMdf18',frontMaterialId:'highGlossMdfPvc18'}),
  premium:Object.freeze({bodyMaterialId:'melamineMdf18',frontMaterialId:'acrylicHighGlossMdf18'}),
});

const n=(value,fallback)=>Number.isFinite(Number(value))?Number(value):fallback;
const areaM2=part=>Math.max(0,n(part.u,0))*Math.max(0,n(part.v,0))/1e6;

export function normalizedCosting(project={}){
  const raw=project.costing||{},c={...DEFAULT_COSTING,...raw};
  c.materialPrices={...DEFAULT_MATERIAL_PRICES,...(raw.materialPrices||{})};
  const savedHardwarePrices=raw.hardwarePriceVersion===1?(raw.hardwarePrices||{}):Object.fromEntries(Object.entries(raw.hardwarePrices||{}).filter(([,value])=>Number(value)>0));
  c.hardwarePrices={...DEFAULT_HARDWARE_PRICES,...savedHardwarePrices};c.hardwarePriceVersion=1;
  // Compatibility for projects saved before the EGP/m² model.
  if(!raw.materialPrices){
    const legacyArea=Math.max(.01,n(raw.sheetWidth,2440)*n(raw.sheetHeight,1220)/1e6);
    if(Number.isFinite(Number(raw.bodySheetPrice)))c.materialPrices.mfc18=Math.max(0,Number(raw.bodySheetPrice)/legacyArea);
    if(Number.isFinite(Number(raw.frontSheetPrice)))c.materialPrices.melamineMdf18=Math.max(0,Number(raw.frontSheetPrice)/legacyArea);
    if(Number.isFinite(Number(raw.glossFrontSheetPrice)))c.materialPrices.highGlossMdfPvc18=Math.max(0,Number(raw.glossFrontSheetPrice)/legacyArea);
    if(Number.isFinite(Number(raw.backSheetPrice)))c.materialPrices.hdf3=Math.max(0,Number(raw.backSheetPrice)/legacyArea);
  }
  for(const key of Object.keys(DEFAULT_COSTING))if(typeof DEFAULT_COSTING[key]==='number')c[key]=Math.max(0,n(c[key],DEFAULT_COSTING[key]));
  for(const product of Object.values(MATERIAL_PRODUCTS))c.materialPrices[product.id]=Math.max(0,n(c.materialPrices[product.id],product.pricePerM2));
  c.wastePercent=Math.min(60,c.wastePercent);c.uncertaintyPercent=Math.min(50,c.uncertaintyPercent);c.currency=String(c.currency||'EGP');
  return c;
}

export function edgeBandMeters(part){
  const edges=Array.isArray(part.edges)?part.edges:[0,0,0,0],u=Math.max(0,n(part.u,0)),v=Math.max(0,n(part.v,0));
  return ((edges[0]>0?v:0)+(edges[1]>0?v:0)+(edges[2]>0?u:0)+(edges[3]>0?u:0))/1000;
}
export function edgeBandCost(part,costing){
  const c=normalizedCosting({costing}),edges=Array.isArray(part.edges)?part.edges:[0,0,0,0],u=Math.max(0,n(part.u,0)),v=Math.max(0,n(part.v,0));
  let total=0,meters08=0,meters2=0;
  for(const [index,value] of edges.entries()){
    if(!(value>0))continue;const meters=(index<2?v:u)/1000;
    if(value>1){meters2+=meters;total+=meters*c.edge2PerM}else{meters08+=meters;total+=meters*c.edge08PerM}
  }
  return{total,meters08,meters2};
}

function group(parts,kind){return parts.filter(part=>kind==='front'?part.role==='front':kind==='back'?part.role==='back':part.role!=='front'&&part.role!=='back')}
function productForPart(part,role){
  const requested=MATERIAL_PRODUCTS[part.materialProductId];
  if(requested?.roles.includes(role))return requested;
  return MATERIAL_PRODUCTS[inferMaterialProductId({role,substrate:part.substrate,gloss:part.appearance?.gloss})];
}
function materialKey(part,role){
  const product=productForPart(part,role);
  return [product.id,part.decor||'unspecified',part.appearance?.color||'unspecified',n(part.thickness,product.thickness)].join('|');
}
function materialsFor(parts,role,c,{includeFinish=false}={}){
  const groups=new Map(),wasteFactor=1+c.wastePercent/100;
  for(const part of parts){
    const product=productForPart(part,role),finish=product.finish||((part.appearance?.gloss)?'gloss':'matte'),key=materialKey(part,role),current=groups.get(key)||{
      materialProductId:product.id,materialName:product.name,substrate:product.substrate,decor:part.decor||'unspecified',color:part.appearance?.color||'',
      thickness:n(part.thickness,product.thickness),productThickness:product.thickness,finish:includeFinish?finish:undefined,sheetWidth:product.sheetWidth,sheetHeight:product.sheetHeight,
      sheetArea:product.sheetWidth*product.sheetHeight/1e6,area:0,parts:[],
    };
    current.area+=areaM2(part);current.parts.push(part);groups.set(key,current);
  }
  const batches=[...groups.values()].map(batch=>{
    const pricedArea=batch.area*wasteFactor,pricePerM2=c.materialPrices[batch.materialProductId],reserveSheets=pricedArea>0?Math.ceil(pricedArea/batch.sheetArea):0,stockPlan=planSheetLayout(batch.parts,{sheetWidth:batch.sheetWidth,sheetHeight:batch.sheetHeight},{kerf:c.sawKerf,trim:c.sheetEdgeTrim,minimumSheets:reserveSheets}),sheets=stockPlan.sheetCount,{parts:_parts,...publicBatch}=batch;
    return{...publicBatch,partCount:batch.parts.length,pricedArea,sheets,reserveSheets,stockPlan,pricePerM2,unitPrice:pricePerM2,cost:pricedArea*pricePerM2,purchaseCost:sheets*batch.sheetArea*pricePerM2,referenceSheetPrice:batch.sheetArea*pricePerM2,thicknessMismatch:Math.abs(batch.thickness-batch.productThickness)>.01};
  }),area=batches.reduce((sum,batch)=>sum+batch.area,0),pricedArea=batches.reduce((sum,batch)=>sum+batch.pricedArea,0),sheets=batches.reduce((sum,batch)=>sum+batch.sheets,0),cost=batches.reduce((sum,batch)=>sum+batch.cost,0),purchaseCost=batches.reduce((sum,batch)=>sum+batch.purchaseCost,0),reusableArea=batches.reduce((sum,batch)=>sum+batch.stockPlan.reusableArea,0),leftoverArea=batches.reduce((sum,batch)=>sum+batch.stockPlan.leftoverArea,0),result={area,pricedArea,sheets,cost,purchaseCost,reusableArea,leftoverArea,batches};
  if(includeFinish)for(const finish of ['matte','gloss']){const selected=batches.filter(batch=>batch.finish===finish);result[finish]={area:selected.reduce((sum,batch)=>sum+batch.area,0),pricedArea:selected.reduce((sum,batch)=>sum+batch.pricedArea,0),sheets:selected.reduce((sum,batch)=>sum+batch.sheets,0),cost:selected.reduce((sum,batch)=>sum+batch.cost,0),batches:selected}}
  return result;
}
function countertopLength(model){if(Array.isArray(model?.countertopSegments))return model.countertopSegments.reduce((sum,segment)=>sum+Math.max(0,n(segment.length,0)),0);return model?.countertop?Math.max(0,n(model.countertop.length,0)):0}
function edgeSummary(parts,c){let cost=0,meters08=0,meters2=0;for(const part of parts){const edge=edgeBandCost(part,c);cost+=edge.total;meters08+=edge.meters08;meters2+=edge.meters2}return{cost,meters08,meters2,meters:meters08+meters2}}

export function estimateProjectCost(project,model){
  const c=normalizedCosting(project),parts=Array.isArray(model?.parts)?model.parts:[],bodyParts=group(parts,'body'),frontParts=group(parts,'front'),backParts=group(parts,'back'),body=materialsFor(bodyParts,'body',c),front=materialsFor(frontParts,'front',c,{includeFinish:true}),back=materialsFor(backParts,'back',c),bodyEdge=edgeSummary(bodyParts,c),frontEdge=edgeSummary(frontParts,c),backEdge=edgeSummary(backParts,c),edgeCost=bodyEdge.cost+frontEdge.cost+backEdge.cost,edge08=bodyEdge.meters08+frontEdge.meters08+backEdge.meters08,edge2=bodyEdge.meters2+frontEdge.meters2+backEdge.meters2,sheetCount=body.sheets+front.sheets+back.sheets,cutting=sheetCount*c.cuttingPerSheet+c.serviceBase,ctLength=countertopLength(model),countertop=ctLength>0&&c.countertopPerM>0?ctLength/1000*c.countertopPerM:0,hardwareBill=priceHardwareBill(buildHardwareBill(project,model),c.hardwarePrices),hardwareAuto=hardwareBill.reduce((sum,row)=>sum+row.cost,0),hardware=c.hardwareFixed+hardwareAuto,extras=c.extraCost,materials=body.cost+front.cost+back.cost,unc=c.uncertaintyPercent/100;
  const materialWarnings=[...body.batches,...front.batches,...back.batches].filter(batch=>batch.thicknessMismatch).map(batch=>({materialProductId:batch.materialProductId,materialName:batch.materialName,partThickness:batch.thickness,productThickness:batch.productThickness}));
  const purchaseMaterials=body.purchaseCost+front.purchaseCost+back.purchaseCost,stockWarnings=[...body.batches,...front.batches,...back.batches].flatMap(batch=>batch.stockPlan.unplaced.map(part=>({materialProductId:batch.materialProductId,materialName:batch.materialName,...part})));
  const common=edgeCost+cutting+countertop+hardware+extras,total=materials+common,procurementTotal=purchaseMaterials+common,rangeLow=Math.max(0,total*(1-unc)),rangeHigh=total*(1+unc),procurementRangeLow=Math.max(0,procurementTotal*(1-unc)),procurementRangeHigh=procurementTotal*(1+unc),unpricedHardware=hardwareBill.filter(row=>row.quantity>0&&row.unitPrice<=0);
  return{settings:c,body,front,back,sheetCount,materials,purchaseMaterials,stockWarnings,materialWarnings,edge:{meters08:edge08,meters2:edge2,meters:edge08+edge2,cost:edgeCost,body:bodyEdge,front:frontEdge,back:backEdge},cutting,countertop,countertopLength:ctLength,hardware,hardwareFixed:c.hardwareFixed,hardwareAuto,hardwareBill,unpricedHardware,extras,total,consumedTotal:total,procurementTotal,rangeLow,rangeHigh,procurementRangeLow,procurementRangeHigh,countertopPriced:ctLength===0||c.countertopPerM>0};
}
