import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, createModule, validateProject } from '../src/core/project.js';
import { blankSize, buildProject } from '../src/core/parts.js';
import { cutListCSV } from '../src/io/cut-list.js';
import { moduleName } from '../src/i18n/translations.js';

test('default project is valid and has editable room',()=>{const p=createProject();assert.equal(validateProject(p),p);assert.equal(p.modules.length,3);assert.equal(p.room.height,2700)});
test('default lower row is 1700 mm',()=>assert.equal(buildProject(createProject()).width,1700));
test('edge banding is deducted from blank size only',()=>assert.deepEqual(blankSize(600,720,[2,2,2,2]),[596,716]));
test('600 mm base cabinet creates one front',()=>{const p=createProject();p.modules=[createModule('base')];assert.equal(buildProject(p).parts.filter(x=>x.role==='front').length,1)});
test('wide cabinet creates two fronts',()=>{const p=createProject(),m=createModule('base');m.width=900;p.modules=[m];assert.equal(buildProject(p).parts.filter(x=>x.role==='front').length,2)});
test('appliances are display geometry, not cut parts',()=>{for(const type of ['washer','dishwasher','oven','fridge']){const p=createProject();p.modules=[createModule(type)];assert.equal(buildProject(p).parts.length,0)}});
test('decor change does not change cut dimensions',()=>{const p=createProject();p.modules=[createModule('base')];const before=buildProject(p).parts.map(x=>[x.id,x.blankU,x.blankV]);p.modules[0].frontDecor='walnut';p.modules[0].frontColor='#815b3f';assert.deepEqual(buildProject(p).parts.map(x=>[x.id,x.blankU,x.blankV]),before)});
test('CSV contains finished and blank dimensions',()=>{const csv=cutListCSV(buildProject(createProject()).parts);assert.ok(csv.includes('Готовая U мм'));assert.ok(csv.includes('Заготовка U мм'))});
test('user-facing sink terminology uses раковина',()=>{assert.equal(moduleName('ru','sink'),'Шкаф под раковину');assert.equal(moduleName('en','sink'),'Sink cabinet')});
