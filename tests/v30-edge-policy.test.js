import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject,createModule } from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';
import { edgeBandMeters } from '../src/core/cost.js';

test('carcass edge policy bands visible front edges only',()=>{
 const p=createProject(),m=createModule('base');m.width=600;m.height=720;m.depth=560;m.backMode='none';m.shelfCount=1;m.doorCount=1;p.modules=[m];p.fixtures=[];p.countertop.enabled=false;
 const model=buildProject(p),by=s=>model.parts.find(x=>x.id.endsWith('-'+s));
 assert.deepEqual(by('SL').edges,[0,m.bodyEdge,0,0]);
 assert.deepEqual(by('SR').edges,[0,m.bodyEdge,0,0]);
 assert.deepEqual(by('BT').edges,[0,0,0,m.bodyEdge]);
 assert.deepEqual(by('RF').edges,[0,0,0,m.bodyEdge]);
 assert.deepEqual(by('RR').edges,[0,0,0,0]);
 assert.deepEqual(by('SH1').edges,[0,0,0,m.bodyEdge]);
 assert.deepEqual(by('F1').edges,[m.frontEdge,m.frontEdge,m.frontEdge,m.frontEdge]);
 assert.equal(model.parts.some(x=>x.role==='back'),false);
});

test('backless 600 cabinet edge total is plausible and not all carcass sides',()=>{
 const p=createProject(),m=createModule('base');m.width=600;m.height=720;m.depth=560;m.backMode='none';m.shelfCount=1;m.doorCount=1;p.modules=[m];p.fixtures=[];p.countertop.enabled=false;
 const model=buildProject(p);const total=model.parts.reduce((s,x)=>s+edgeBandMeters(x),0);
 assert.ok(total>5&&total<6.5,`edge total ${total} m`);
 const fronts=model.parts.filter(x=>x.role==='front').reduce((s,x)=>s+edgeBandMeters(x),0);
 const body=model.parts.filter(x=>x.role!=='front'&&x.role!=='back').reduce((s,x)=>s+edgeBandMeters(x),0);
 assert.ok(fronts>body);
});
