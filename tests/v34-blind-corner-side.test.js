import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixture, createModule, createProject, ensureProjectDefaults } from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';

function blindCornerProject(side = 'right') {
  const project = createProject();
  const corner = createModule('cornerBaseBlind');
  corner.width = 1200;
  corner.cornerOpening = 600;
  corner.cornerOpeningSide = side;
  project.modules = [corner];
  project.fixtures = [];
  return { project, corner };
}

test('blind-corner door, body panel, hinge and knob mirror together', () => {
  const { project, corner } = blindCornerProject('right');
  corner.handleStyle = 'knob';
  let model = buildProject(project);
  let door = model.objects.find((object) => object.id.endsWith('-F1'));
  let blind = model.objects.find((object) => object.id.endsWith('-BF'));
  let knob = model.objects.find((object) => object.id.includes('-KNOB-'));

  assert.ok(door.center[0] > blind.center[0]);
  assert.equal(door.hingeSide, 'left');
  assert.ok(knob.center[0] > door.center[0]);

  corner.cornerOpeningSide = 'left';
  model = buildProject(project);
  door = model.objects.find((object) => object.id.endsWith('-F1'));
  blind = model.objects.find((object) => object.id.endsWith('-BF'));
  knob = model.objects.find((object) => object.id.includes('-KNOB-'));

  assert.ok(door.center[0] < blind.center[0]);
  assert.equal(door.hingeSide, 'right');
  assert.ok(knob.center[0] < door.center[0]);
});

test('sink follows the accessible blind-corner bay and checks its usable width', () => {
  const { project, corner } = blindCornerProject('right');
  const sink = createFixture('sink', corner.id);
  project.fixtures = [sink];

  let model = buildProject(project);
  let placed = model.fixtures[0];
  const rightX = placed.x;
  assert.equal(placed.fits, true);
  assert.ok(rightX > corner.width / 2);

  corner.cornerOpeningSide = 'left';
  model = buildProject(project);
  placed = model.fixtures[0];
  assert.equal(placed.fits, true);
  assert.ok(placed.x < corner.width / 2);
  assert.equal(rightX + placed.x, corner.width);

  sink.width = 580;
  model = buildProject(project);
  assert.equal(model.fixtures[0].fits, false);
  assert.ok(model.issues.some((issue) => issue.type === 'fixture'));
});

test('older projects receive a right-side blind-corner default', () => {
  const project = createProject();
  const corner = createModule('cornerBaseBlind');
  delete corner.cornerOpeningSide;
  project.modules = [corner];

  ensureProjectDefaults(project);
  assert.equal(project.modules[0].cornerOpeningSide, 'right');
});
