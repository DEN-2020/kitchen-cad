import test from 'node:test';
import assert from 'node:assert/strict';
import { createModule, createProject } from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';
import { cabinetSupportPoints } from '../src/core/supports.js';

test('blind corner fixed section is a recessed body wall, not a door', () => {
  const project = createProject();
  const corner = createModule('cornerBaseBlind');
  corner.bodyDecor = 'white';
  corner.frontDecor = 'olive';
  project.modules = [corner];
  const model = buildProject(project);
  const wall = model.parts.find((part) => part.id.endsWith('-BF'));
  const door = model.parts.find((part) => part.id.endsWith('-F1'));

  assert.equal(wall.role, 'body');
  assert.equal(wall.decor, 'white');
  assert.equal(wall.substrate, corner.bodySubstrate);
  assert.equal(wall.thickness, corner.board);
  assert.equal(wall.center[2], corner.depth - corner.board / 2);
  assert.equal(door.role, 'front');
  assert.equal(door.decor, 'olive');
  assert.ok(door.center[2] > corner.depth);
});

test('round and square leg choices create visible support geometry', () => {
  const project = createProject();
  const cabinet = createModule('base');
  project.modules = [cabinet];

  cabinet.legStyle = 'round';
  let model = buildProject(project);
  let supports = model.objects.filter((object) => object.role === 'support');
  assert.equal(supports.length, 4);
  assert.ok(supports.every((object) => object.shape === 'cylinder'));
  assert.ok(supports.every((object) => object.center[1] === cabinet.feet / 2));
  assert.equal(model.parts.some((part) => part.id.endsWith('-PL')), false);

  cabinet.legStyle = 'square';
  model = buildProject(project);
  supports = model.objects.filter((object) => object.role === 'support');
  assert.equal(supports.length, 4);
  assert.ok(supports.every((object) => object.shape === 'box'));
});

test('hidden supports use a plinth and L corners avoid the empty corner', () => {
  const project = createProject();
  const cabinet = createModule('base');
  cabinet.legStyle = 'hidden';
  project.modules = [cabinet];
  const model = buildProject(project);
  assert.equal(model.objects.some((object) => object.role === 'support'), false);
  assert.equal(model.parts.some((part) => part.id.endsWith('-PL')), true);

  const corner = createModule('cornerBaseL');
  corner.legStyle = 'round';
  const points = cabinetSupportPoints(corner);
  assert.equal(points.length, 5);
  assert.equal(
    points.some(([x, z]) => x > corner.cornerRunDepth && z > corner.cornerRunDepth),
    false,
  );
});
