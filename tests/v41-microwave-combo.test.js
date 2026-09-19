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
