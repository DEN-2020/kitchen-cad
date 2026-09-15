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
  corner.frontColor = '#761e91';
  corner.gloss = true;
  project.modules = [corner];
  const model = buildProject(project);
  const wall = model.parts.find((part) => part.id.endsWith('-BF'));
  const door = model.parts.find((part) => part.id.endsWith('-F1'));

  assert.equal(wall.role, 'body');
  assert.equal(wall.decor, 'white');
  assert.equal(wall.substrate, corner.bodySubstrate);
  assert.equal(wall.thickness, corner.board);
  assert.equal(wall.center[2], corner.depth - corner.board / 2);
  assert.equal(wall.appearance.gloss, false);
  assert.equal(door.role, 'front');
  assert.equal(door.decor, 'olive');
  assert.equal(door.appearance.color, '#761e91');
  assert.equal(door.appearance.gloss, true);
  assert.ok(door.center[2] > corner.depth);
});

test('common front tint reaches every cabinet type and explicit overrides still win', () => {
  for (const type of ['base', 'drawer', 'cornerBaseBlind', 'cornerBaseDiagonal', 'cornerBaseL']) {
    const project = createProject();
    const cabinet = createModule(type);
    cabinet.frontColor = '#2864a8';
    project.modules = [cabinet];
    const fronts = buildProject(project).objects.filter((object) => object.role === 'front');
    assert.ok(fronts.length > 0, `${type} should create at least one front`);
    assert.ok(
      fronts.every((front) => front.appearance.color === '#2864a8'),
      `${type} should inherit the common front tint`,
    );
  }

  const project = createProject();
  const cabinet = createModule('base');
  cabinet.frontColor = '#2864a8';
  cabinet.frontOverrides = [{ decor: 'oak', color: '#b06b32' }];
  project.modules = [cabinet];
  const [overridden] = buildProject(project).objects.filter(
    (object) => object.role === 'front',
  );
  assert.equal(overridden.decor, 'oak');
  assert.equal(overridden.appearance.color, '#b06b32');
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

test('hidden supports remain behind a plinth and L corners avoid the empty corner', () => {
  const project = createProject();
  const cabinet = createModule('base');
  cabinet.legStyle = 'hidden';
  project.modules = [cabinet];
  const model = buildProject(project);
  const hiddenSupports = model.objects.filter((object) => object.role === 'support');
  const plinth = model.objects.find((object) => object.id.endsWith('-PL'));
  assert.equal(hiddenSupports.length, 4);
  assert.ok(hiddenSupports.every((object) => object.shape === 'cylinder'));
  assert.ok(plinth);
  assert.ok(
    hiddenSupports.every(
      (support) => support.center[2] + support.size[2] / 2 <= plinth.center[2] - plinth.size[2] / 2,
    ),
  );

  const corner = createModule('cornerBaseL');
  corner.legStyle = 'round';
  const points = cabinetSupportPoints(corner);
  assert.equal(points.length, 5);
  assert.equal(
    points.some(([x, z]) => x > corner.cornerRunDepth && z > corner.cornerRunDepth),
    false,
  );
});
