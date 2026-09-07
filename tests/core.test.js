import test from 'node:test';
import assert from 'node:assert/strict';
import { createProject, createModule, validateProject } from '../src/core/project.js';
import { blankSize, buildProject } from '../src/core/parts.js';
import { cutListCSV } from '../src/io/cut-list.js';

test('default project is valid', () => {
  const project = createProject();
  assert.equal(validateProject(project), project);
  assert.equal(project.modules.length, 3);
});

test('default lower row is 1700 mm', () => {
  const model = buildProject(createProject());
  assert.equal(model.width, 1700);
});

test('edge banding is deducted from blank size only', () => {
  assert.deepEqual(blankSize(600, 720, [2, 2, 2, 2]), [596, 716]);
});

test('600 mm base cabinet creates one front', () => {
  const p = createProject();
  p.modules = [createModule('base')];
  const model = buildProject(p);
  assert.equal(model.parts.filter(x => x.role === 'front').length, 1);
});

test('wide cabinet creates two fronts', () => {
  const p = createProject();
  const m = createModule('base'); m.width = 900; p.modules = [m];
  assert.equal(buildProject(p).parts.filter(x => x.role === 'front').length, 2);
});

test('washer is display geometry, not a cut part', () => {
  const p = createProject(); p.modules = [createModule('washer')];
  assert.equal(buildProject(p).parts.length, 0);
});

test('decor change does not change cut dimensions', () => {
  const p = createProject(); p.modules = [createModule('base')];
  const before = buildProject(p).parts.map(x => [x.id,x.blankU,x.blankV]);
  p.modules[0].frontDecor = 'walnut'; p.modules[0].frontColor = '#815b3f';
  const after = buildProject(p).parts.map(x => [x.id,x.blankU,x.blankV]);
  assert.deepEqual(after, before);
});

test('CSV contains finished and blank dimensions', () => {
  const csv = cutListCSV(buildProject(createProject()).parts);
  assert.ok(csv.includes('Готовая U мм'));
  assert.ok(csv.includes('Заготовка U мм'));
});
