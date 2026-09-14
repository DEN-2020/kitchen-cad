import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateProjectCost,edgeBandMeters,DEFAULT_COSTING,COST_PRESETS} from '../src/core/cost.js';

test('edge meters follow four actual edged sides',()=>{
 const p={u:500,v:700,edges:[0.8,0,2,2]};
 assert.equal(edgeBandMeters(p),1.7);
});

test('cost estimate rounds material demand up to whole sheets',()=>{
 const parts=[
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
  {u:1000,v:1000,role:'body',edges:[0,0,0,0]},
 ];
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,wastePercent:0,serviceBase:0,cuttingPerSheet:0}},{parts});
 assert.equal(r.body.sheets,2);
 assert.equal(r.body.cost,3000);
});

test('gloss preset keeps budget body and 2500 EGP front sheet',()=>{
 assert.equal(COST_PRESETS.gloss.bodySheetPrice,1500);
 assert.equal(COST_PRESETS.gloss.frontSheetPrice,2500);
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
 const add=(u,v,role='body',edges=[0,0,0,0])=>parts.push({u,v,role,edges,edgeType:'ABS'});
 for(let k=0;k<2;k++){add(560,720);add(560,720);add(464,560);add(464,100);add(464,100);add(462,540);add(496,716,'front',[2,2,2,2]);}
 for(let k=0;k<2;k++){add(400,720);add(400,720);add(464,400);add(464,400);add(462,380);add(496,716,'front',[2,2,2,2]);}
 add(1800,400);
 const r=estimateProjectCost({costing:{...DEFAULT_COSTING,bodySheetPrice:1500,frontSheetPrice:2500}},{parts});
 assert.ok(r.total>6500&&r.total<10000,`unexpected sample estimate ${r.total}`);
});
