import test from 'node:test';
import assert from 'node:assert/strict';
import { createModule, createProject, ensureProjectDefaults, validateProject } from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';
import { estimateProjectCost } from '../src/core/cost.js';

function modelFor(type, side = 'right') {
  const project = createProject();
  const cabinet = createModule(type);
  cabinet.cornerOpeningSide = side;
  project.modules = [cabinet];
  project.fixtures = [];
  return { project, cabinet, model: buildProject(project) };
}

for (const type of ['cornerBaseBlind', 'cornerWallBlind']) {
  test(`${type} mirrors its opening, hinge stile and hinge side`, () => {
    const right = modelFor(type, 'right');
    const rightDoor = right.model.parts.find((part) => part.id.endsWith('-F1'));
    const rightBlind = right.model.parts.find((part) => part.id.endsWith('-BF'));
    const rightStile = right.model.parts.find((part) => part.id.endsWith('-MS'));

    assert.ok(rightDoor.center[0] > rightStile.center[0]);
    assert.ok(rightStile.center[0] > rightBlind.center[0]);
    assert.equal(rightStile.name, 'Монтажная перегородка петель');
    assert.equal(rightStile.role, 'body');
    assert.equal(rightStile.u, 70);
    assert.equal(rightStile.size[0], right.cabinet.board);
    assert.equal(rightStile.size[2], 70);
    assert.equal(rightDoor.hingeSide, 'left');
    assert.equal(rightDoor.hingeMountPartId, rightStile.id);
    assert.equal(rightDoor.hingeType, 'blind-corner-95');

    right.cabinet.frontOverrides = [{ hingeSide: 'right' }];
    const physicallyConstrainedDoor = buildProject(right.project).parts.find((part) =>
      part.id.endsWith('-F1'),
    );
    assert.equal(physicallyConstrainedDoor.hingeSide, 'left');

    const left = modelFor(type, 'left');
    const leftDoor = left.model.parts.find((part) => part.id.endsWith('-F1'));
    const leftBlind = left.model.parts.find((part) => part.id.endsWith('-BF'));
    const leftStile = left.model.parts.find((part) => part.id.endsWith('-MS'));

    assert.ok(leftDoor.center[0] < leftStile.center[0]);
    assert.ok(leftStile.center[0] < leftBlind.center[0]);
    assert.equal(leftDoor.hingeSide, 'right');
    assert.equal(leftDoor.hingeMountPartId, leftStile.id);
    assert.equal(leftDoor.center[0] + rightDoor.center[0], right.cabinet.width);
    assert.equal(leftStile.center[0] + rightStile.center[0], right.cabinet.width);
  });
}

test('open-front mode removes doors, handles and hinges while preserving the carcass', () => {
  for (const type of ['base', 'wall', 'sink', 'cornerBaseBlind', 'cornerWallBlind']) {
    const { project, cabinet } = modelFor(type);
    cabinet.frontEnabled = false;
    cabinet.handleStyle = 'bar';
    const model = buildProject(project);

    assert.equal(model.parts.some((part) => part.role === 'front'), false, type);
    assert.equal(model.objects.some((object) => object.role === 'handle'), false, type);
    assert.ok(model.parts.some((part) => part.role === 'body'), type);
    if (type.endsWith('Blind')) {
      assert.ok(model.parts.some((part) => part.id.endsWith('-MS')), type);
      assert.ok(model.parts.some((part) => part.id.endsWith('-BF')), type);
    }
  }
});

test('open-front mode removes front material from the estimate', () => {
  const { project, cabinet } = modelFor('base');
  const closedCost = estimateProjectCost(project, buildProject(project));
  cabinet.frontEnabled = false;
  const openCost = estimateProjectCost(project, buildProject(project));

  assert.ok(closedCost.front.area > 0);
  assert.equal(openCost.front.area, 0);
  assert.equal(openCost.front.sheets, 0);
  assert.ok(openCost.total < closedCost.total);
});

test('legacy projects migrate to a front and a safe blind-corner hinge stile', () => {
  const project = createProject();
  const cabinet = createModule('cornerWallBlind');
  delete cabinet.frontEnabled;
  delete cabinet.cornerMuntinWidth;
  project.modules = [cabinet];

  ensureProjectDefaults(project);
  assert.equal(cabinet.frontEnabled, true);
  assert.equal(cabinet.cornerMuntinWidth, 70);
  assert.doesNotThrow(() => validateProject(project));

  cabinet.cornerMuntinWidth = 27;
  assert.throws(() => validateProject(project), /Глубина перегородки петель/);
});

test('blind corner supports one or two door leaves for base and wall variants', () => {
  for (const type of ['cornerBaseBlind', 'cornerWallBlind']) {
    const { project, cabinet } = modelFor(type);
    cabinet.doorCount = 2;
    const fronts = buildProject(project).parts.filter((part) => part.role === 'front');
    assert.equal(fronts.length, 2, type);
    assert.deepEqual(fronts.map((front) => front.hingeSide), ['left', 'right']);
    assert.ok(fronts.every((front) => front.hingeMountPartId), type);
  }
});
