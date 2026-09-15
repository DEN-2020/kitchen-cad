import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateProjectCost } from '../src/core/cost.js';

test('backless model has zero back-sheet cost',()=>{
 const project={costing:{bodySheetPrice:1500,frontSheetPrice:2500,backSheetPrice:450,wastePercent:0,cuttingPerSheet:0,serviceBase:0,edge08PerM:0,edge2PerM:0,hardwareFixed:0,extraCost:0,uncertaintyPercent:0}};
 const model={parts:[
  {role:'body',u:600,v:720,edges:[0,0,0,0]},
  {role:'front',u:350,v:716,edges:[2,2,2,2],name:'Глухая фронтальная панель'},
  {role:'front',u:350,v:716,edges:[2,2,2,2],name:'Фасад 1'}
 ]};
 const cost=estimateProjectCost(project,model);
 assert.equal(cost.back.sheets,0);
 assert.equal(cost.back.cost,0);
 assert.equal(cost.front.sheets,1);
 assert.equal(cost.front.cost,2500);
});

test('blind fixed panel still contributes to front material area',()=>{
 const project={costing:{bodySheetPrice:0,frontSheetPrice:2500,backSheetPrice:0,wastePercent:0,cuttingPerSheet:0,serviceBase:0,edge08PerM:0,edge2PerM:0,hardwareFixed:0,extraCost:0,uncertaintyPercent:0}};
 const one={parts:[{role:'front',u:350,v:716,edges:[0,0,0,0]}]};
 const two={parts:[{role:'front',u:350,v:716,edges:[0,0,0,0]},{role:'front',u:350,v:716,edges:[0,0,0,0]}]};
 const a=estimateProjectCost(project,one),b=estimateProjectCost(project,two);
 assert.ok(b.front.area>a.front.area);
});
