import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateProjectCost,edgeBandMeters,DEFAULT_COSTING,COST_PRESETS,applyWorkshopSheetQuote} from '../src/core/cost.js';
import {MATERIAL_PRODUCTS,materialSelectionPatch} from '../src/catalog/materials.js';

test('edge meters follow four actual edged sides',()=>{
 const p={u:500,v:700,edges:[0.8,0,2,2]};
 assert.equal(edgeBandMeters(p),1.7);
});

test('cost uses square metres while sheet count stays purchasing guidance',()=>{
 const parts=[
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
 ];
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,wastePercent:0,serviceBase:0,cuttingPerSheet:0}},{parts});
 assert.equal(r.body.sheets,2);
 assert.equal(r.body.pricedArea,3);
 assert.equal(r.body.cost,3*MATERIAL_PRODUCTS.mfc18.pricePerM2);
});

test('market presets separate carcass and door products',()=>{
 assert.equal(COST_PRESETS.budget.bodyMaterialId,'mfc18');
 assert.equal(COST_PRESETS.budget.frontMaterialId,'highGlossMdfPvc18');
 assert.equal(COST_PRESETS.premium.frontMaterialId,'acrylicHighGlossMdf18');
});

test('workshop sheet quote preserves EGP/m² accounting and clears unquoted service',()=>{
 const original={costing:{materialPrices:{melamineMdf18:777},serviceBase:300,edge08PerM:12}};
 const project=applyWorkshopSheetQuote(original);
 assert.equal(original.costing.serviceBase,300);
 assert.equal(project.costing.serviceBase,0);
 assert.equal(project.costing.cuttingPerSheet,500);
 assert.equal(project.costing.materialPrices.melamineMdf18,777);
 const parts=[
  {u:500,v:700,role:'body',materialProductId:'mfc18',edges:[0,0,0,0]},
  {u:500,v:700,role:'front',materialProductId:'highGlossMdfPvc18',edges:[0,0,0,0]},
 ];
 const cost=estimateProjectCost(project,{parts});
 assert.ok(Math.abs(cost.body.batches[0].referenceSheetPrice-1200)<1e-8);
 assert.ok(Math.abs(cost.front.batches[0].referenceSheetPrice-3200)<1e-8);
 assert.equal(cost.sheetCount,2);
 assert.ok(Math.abs(cost.purchaseMaterials+cost.cutting-5400)<1e-8);
});

test('every estimator product carries its own dimensions, thickness and EGP per m2 price',()=>{
 for(const product of Object.values(MATERIAL_PRODUCTS)){
  assert.ok(product.sheetWidth>0);
  assert.ok(product.sheetHeight>0);
  assert.ok(product.thickness>0);
  assert.ok(product.pricePerM2>0);
 }
});

test('selecting a door product keeps substrate thickness and gloss in sync',()=>{
 assert.deepEqual(materialSelectionPatch('front','highGlossMdfPvc18'),{
  frontMaterialId:'highGlossMdfPvc18',frontSubstrate:'mdf',frontThickness:18,gloss:true,
 });
 assert.equal(materialSelectionPatch('front','melamineMdf18').gloss,false);
});

test('default 15 percent waste follows area times price formula',()=>{
 const part={u:1000,v:1000,role:'front',materialProductId:'highGlossMdfPvc18',edges:[0,0,0,0]};
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,serviceBase:0,cuttingPerSheet:0}},{parts:[part]});
 assert.equal(r.front.pricedArea,1.15);
 assert.equal(r.front.cost,1.15*MATERIAL_PRODUCTS.highGlossMdfPvc18.pricePerM2);
});

test('estimate exposes uncertainty range around total',()=>{
 const parts=[{u:500,v:700,role:'front',edges:[2,2,2,2],edgeType:'ABS'}];
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,uncertaintyPercent:10,serviceBase:0,cuttingPerSheet:0}},{parts});
 assert.ok(r.rangeLow<r.total);
 assert.ok(r.rangeHigh>r.total);
 assert.equal(Math.round(r.rangeLow),Math.round(r.total*.9));
 assert.equal(Math.round(r.rangeHigh),Math.round(r.total*1.1));
});

test('Egypt sample-scale estimate is in the same order as the recent ~8000 EGP job',()=>{
 // Approximate areas: four 500 mm cabinets without backs + one 1800x400 extra panel;
 // one glossy-front sheet, three budget body sheets after waste/rounding.
 const parts=[];
 const add=(u,v,role='body',edges=[0,0,0,0])=>parts.push({u,v,role,edges,edgeType:'ABS',appearance:{gloss:role==='front'}});
 for(let k=0;k<2;k++){add(560,720);add(560,720);add(464,560);add(464,100);add(464,100);add(462,540);add(496,716,'front',[2,2,2,2]);}
 for(let k=0;k<2;k++){add(400,720);add(400,720);add(464,400);add(464,400);add(462,380);add(496,716,'front',[2,2,2,2]);}
 add(1800,400);
 const r=estimateProjectCost({costing:DEFAULT_COSTING},{parts});
 assert.ok(r.total>5500&&r.total<8500,`unexpected sample estimate ${r.total}`);
});

test('estimator warns when a part thickness differs from its selected product',()=>{
 const part={u:1000,v:500,role:'body',thickness:22,materialProductId:'mfc18',edges:[0,0,0,0]};
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,wastePercent:0}},{parts:[part]});
 assert.equal(r.materialWarnings.length,1);
 assert.equal(r.materialWarnings[0].productThickness,18);
 assert.equal(r.materialWarnings[0].partThickness,22);
});
