export const DEFAULT_COSTING=Object.freeze({
  currency:'EGP',sheetWidth:2440,sheetHeight:1220,wastePercent:15,
  bodySheetPrice:1500,frontSheetPrice:2500,backSheetPrice:450,
  cuttingPerSheet:100,serviceBase:300,edge08PerM:12,edge2PerM:25,
  countertopPerM:0,hardwareFixed:0,extraCost:0,uncertaintyPercent:12
});
const n=(v,f)=>Number.isFinite(Number(v))?Number(v):f;
export function normalizedCosting(project={}){const c={...DEFAULT_COSTING,...(project.costing||{})};for(const k of Object.keys(DEFAULT_COSTING)){if(typeof DEFAULT_COSTING[k]==='number')c[k]=Math.max(0,n(c[k],DEFAULT_COSTING[k]))}c.wastePercent=Math.min(60,c.wastePercent);c.uncertaintyPercent=Math.min(50,c.uncertaintyPercent);c.currency=String(c.currency||'EGP');return c}
const areaM2=p=>Math.max(0,n(p.u,0))*Math.max(0,n(p.v,0))/1e6;
export function edgeBandMeters(p){const e=Array.isArray(p.edges)?p.edges:[0,0,0,0],u=Math.max(0,n(p.u,0)),v=Math.max(0,n(p.v,0));return ((e[0]>0?v:0)+(e[1]>0?v:0)+(e[2]>0?u:0)+(e[3]>0?u:0))/1000}
export function edgeBandCost(p,costing){const c=normalizedCosting({costing}),e=Array.isArray(p.edges)?p.edges:[0,0,0,0],u=Math.max(0,n(p.u,0)),v=Math.max(0,n(p.v,0));let total=0,meters08=0,meters2=0;for(const [i,val] of e.entries()){if(!(val>0))continue;const meters=(i<2?v:u)/1000;if(val>1){meters2+=meters;total+=meters*c.edge2PerM}else{meters08+=meters;total+=meters*c.edge08PerM}}return{total,meters08,meters2}}
function group(parts,kind){return parts.filter(p=>kind==='front'?p.role==='front':kind==='back'?p.role==='back':p.role!=='front'&&p.role!=='back')}
function sheetsFor(parts,price,c){const area=parts.reduce((s,p)=>s+areaM2(p),0),sheetArea=c.sheetWidth*c.sheetHeight/1e6,usable=sheetArea*Math.max(.25,1-c.wastePercent/100),sheets=area>0?Math.ceil(area/usable):0;return{area,sheetArea,usable,sheets,cost:sheets*price}}
function countertopLength(model){if(Array.isArray(model?.countertopSegments))return model.countertopSegments.reduce((s,x)=>s+Math.max(0,n(x.length,0)),0);return model?.countertop?Math.max(0,n(model.countertop.length,0)):0}
export function estimateProjectCost(project,model){const c=normalizedCosting(project),parts=Array.isArray(model?.parts)?model.parts:[],body=sheetsFor(group(parts,'body'),c.bodySheetPrice,c),front=sheetsFor(group(parts,'front'),c.frontSheetPrice,c),back=sheetsFor(group(parts,'back'),c.backSheetPrice,c);let edgeCost=0,edge08=0,edge2=0;for(const p of parts){const e=edgeBandCost(p,c);edgeCost+=e.total;edge08+=e.meters08;edge2+=e.meters2}const sheetCount=body.sheets+front.sheets+back.sheets,cutting=sheetCount*c.cuttingPerSheet+c.serviceBase,ctLength=countertopLength(model),countertop=ctLength>0&&c.countertopPerM>0?ctLength/1000*c.countertopPerM:0,hardware=c.hardwareFixed,extras=c.extraCost,materials=body.cost+front.cost+back.cost,total=materials+edgeCost+cutting+countertop+hardware+extras,unc=c.uncertaintyPercent/100;return{settings:c,body,front,back,sheetCount,materials,edge:{meters08:edge08,meters2:edge2,cost:edgeCost},cutting,countertop,countertopLength:ctLength,hardware,extras,total,rangeLow:Math.max(0,total*(1-unc)),rangeHigh:total*(1+unc),countertopPriced:ctLength===0||c.countertopPerM>0}}
export const COST_PRESETS=Object.freeze({
  budget:{bodySheetPrice:1500,frontSheetPrice:1500},
  gloss:{bodySheetPrice:1500,frontSheetPrice:2500},
  premium:{bodySheetPrice:4000,frontSheetPrice:4000}
});
