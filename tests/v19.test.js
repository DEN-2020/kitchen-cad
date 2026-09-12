import test from 'node:test';
import assert from 'node:assert/strict';
import { createModule,createProject,ensureProjectDefaults,validateProject } from '../src/core/project.js';
import { CATALOG_GROUPS,isCornerType,isWallMountedType } from '../src/catalog/materials.js';

test('v19 corner catalog exposes blind, diagonal and L-shaped variants',()=>{
 const base=CATALOG_GROUPS.find(g=>g.id==='base-corner');
 const wall=CATALOG_GROUPS.find(g=>g.id==='wall-corner');
 assert.deepEqual(base.types,['cornerBaseBlind','cornerBaseDiagonal','cornerBaseL']);
 assert.deepEqual(wall.types,['cornerWallDiagonal','cornerWallL']);
 for(const type of [...base.types,...wall.types])assert.equal(isCornerType(type),true);
 assert.equal(isWallMountedType('cornerWallDiagonal'),true);
});

test('base cabinet leg height is independently editable',()=>{
 const m=createModule('base');
 assert.equal(m.height,720);
 assert.equal(m.feet,140);
 m.feet=125;
 assert.equal(m.height+m.feet,845);
});

test('washing machine reference defaults remain 600 x 850',()=>{
 const m=createModule('washer');
 assert.equal(m.width,600);
 assert.equal(m.height,850);
 assert.ok(m.depth>=550);
});

test('project keeps Arabic language and configurable washer clearance',()=>{
 const p=createProject();
 p.ui.language='ar';
 p.defaults.washerClearance=20;
 ensureProjectDefaults(p);
 assert.equal(p.ui.language,'ar');
 assert.equal(p.defaults.washerClearance,20);
 assert.doesNotThrow(()=>validateProject(p));
});
