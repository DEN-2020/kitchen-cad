import test from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG_GROUPS, isWallMountedType } from '../src/catalog/materials.js';
import { buildProject } from '../src/core/parts.js';
import { createModule, createProject } from '../src/core/project.js';

test('over-hood microwave combo is a wall catalog module with real cut parts', () => {
  const project = createProject();
  const combo = createModule('wallMicrowaveCombo');
  project.modules = [combo];
  const model = buildProject(project);
  const parts = model.parts.filter((part) => part.moduleId === combo.id);

  assert.ok(CATALOG_GROUPS.find((group) => group.id === 'wall').types.includes('wallMicrowaveCombo'));
  assert.equal(isWallMountedType(combo.type), true);
  assert.deepEqual([combo.width, combo.height, combo.depth, combo.elevation], [600, 760, 420, 1600]);
  assert.ok(parts.some((part) => part.id.endsWith('-USL')));
  assert.ok(parts.some((part) => part.id.endsWith('-USR')));
  assert.ok(parts.some((part) => part.id.endsWith('-LSL')));
  assert.ok(parts.some((part) => part.id.endsWith('-LSR')));
  assert.ok(parts.some((part) => part.id.endsWith('-UMR')));
  assert.ok(parts.some((part) => part.id.endsWith('-F1') && part.hingeDrilling));
  assert.ok(parts.some((part) => part.id.endsWith('-MSH') && part.role === 'front'));
  assert.ok(parts.some((part) => part.id.endsWith('-UDV')));
  assert.equal(parts.find((part) => part.id.endsWith('-LSL')).v, 420);
  assert.equal(parts.find((part) => part.id.endsWith('-USL')).v, 286);
  assert.deepEqual(model.objects.find((object) => object.id.endsWith('-MICRO-BODY')).size, [440, 259, 338]);
  assert.equal(model.objects.some((object) => object.role === 'support' && object.id.includes('BRACKET')), false);
  assert.ok(model.issues.some((issue) => issue.type === 'microwave-combo-confirmation'));
});

test('16 mm microwave combo closes every carcass joint while keeping 18 mm visible shelf', () => {
  const project = createProject();
  const combo = createModule('wallMicrowaveCombo');
  combo.width = 600;
  combo.height = 620;
  combo.board = 16;
  combo.frontThickness = 18;
  combo.comboCabinetWidth = 590;
  combo.comboCabinetDepth = 316;
  combo.comboNicheHeight = 360;
  project.modules = [combo];
  const parts = buildProject(project).parts;
  const bySuffix = (suffix) => parts.find((part) => part.id.endsWith(`-${suffix}`));

  assert.equal(bySuffix('UDV').u, 558);
  assert.equal(bySuffix('UTP').u, 558);
  assert.equal(bySuffix('UMR').u, 558);
  assert.equal(bySuffix('USL').v, 210);
  assert.equal(bySuffix('MSH').thickness, 18);
  assert.deepEqual([bySuffix('F1').u, bySuffix('F1').v], [586, 238]);
  assert.equal(bySuffix('LSL').center[1] - combo.elevation, 198);
  assert.equal(bySuffix('UDV').center[1] - combo.elevation, 386);
  assert.equal(bySuffix('USL').center[1] - combo.elevation, 499);
});
