import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateProjectCost, DEFAULT_COSTING } from '../src/core/cost.js';
import {
  applyDefaultFinishToModules,
  createModule,
  createProject,
} from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';
import { cabinetSupportPoints } from '../src/core/supports.js';

test('cost rounds visually different sheet materials separately', () => {
  const parts = [
    {
      role: 'body',
      u: 300,
      v: 300,
      thickness: 18,
      substrate: 'ldsp',
      decor: 'white',
      appearance: { color: '#eeeae0' },
      edges: [0, 0, 0, 0],
    },
    {
      role: 'body',
      u: 300,
      v: 300,
      thickness: 18,
      substrate: 'ldsp',
      decor: 'oak',
      appearance: { color: '#c29764' },
      edges: [0, 0, 0, 0],
    },
  ];
  const result = estimateProjectCost(
    {
      costing: {
        ...DEFAULT_COSTING,
        wastePercent: 0,
        serviceBase: 0,
        cuttingPerSheet: 0,
      },
    },
    { parts },
  );
  assert.equal(result.body.batches.length, 2);
  assert.equal(result.body.sheets, 2);
  assert.equal(result.body.cost, 2 * DEFAULT_COSTING.bodySheetPrice);
});

test('global kitchen finish updates furniture but preserves hinges and appliances', () => {
  const project = createProject();
  const cabinet = createModule('base');
  const washer = createModule('washer');
  cabinet.frontOverrides = [
    { decor: 'graphite', color: '#343b3f', hingeSide: 'right', hingeCount: 3 },
  ];
  project.modules = [cabinet, washer];
  project.defaults = {
    ...project.defaults,
    frontDecor: 'oak',
    frontColor: '#b46f3d',
    bodyDecor: 'olive',
    bodyColor: '#71806b',
    gloss: true,
  };

  const updated = applyDefaultFinishToModules(project);
  const [updatedCabinet, updatedWasher] = updated.modules;
  assert.equal(updatedCabinet.frontDecor, 'oak');
  assert.equal(updatedCabinet.frontColor, '#b46f3d');
  assert.equal(updatedCabinet.bodyDecor, 'olive');
  assert.equal(updatedCabinet.bodyColor, '#71806b');
  assert.equal(updatedCabinet.gloss, true);
  assert.deepEqual(updatedCabinet.frontOverrides, [
    { hingeSide: 'right', hingeCount: 3 },
  ]);
  assert.deepEqual(updatedWasher, washer);
  assert.notEqual(updated, project);
});

test('wide blind corner receives six structural support points', () => {
  const cabinet = createModule('cornerBaseBlind');
  cabinet.width = 1200;
  assert.equal(cabinetSupportPoints(cabinet).length, 6);
});

test('appliance overlapping a corner cabinet gets a specific safety issue', () => {
  const project = createProject();
  const corner = createModule('cornerBaseBlind');
  corner.width = 1200;
  const washer = createModule('washer');
  washer.offsetX = -600;
  project.modules = [corner, washer];
  const model = buildProject(project);
  assert.ok(
    model.issues.some((issue) => issue.type === 'appliance-corner-overlap'),
  );
  assert.ok(
    model.warnings.some((warning) => warning.includes('отдельным проёмом')),
  );
});
