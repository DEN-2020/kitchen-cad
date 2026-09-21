import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createProject } from '../src/core/project.js';
import { buildProject } from '../src/core/parts.js';
import { estimateProjectCost } from '../src/core/cost.js';
import { centimetres, workshopCutListCSV, workshopSheets } from '../src/io/workshop-list.js';

test('centimetre export preserves the model precision of one tenth millimetre', () => {
  assert.equal(centimetres(559.2), '55.92');
  assert.equal(centimetres(18), '1.80');
});

test('new kitchen uses the workshop edge band thickness', () => {
  const project = createProject();
  assert.equal(project.defaults.bodyEdge, 0.2);
  assert.equal(project.defaults.frontEdge, 0.2);
  assert.ok(project.modules.every((module) => module.bodyEdge === 0.2 && module.frontEdge === 0.2));
});

test('workshop sheets include every part once and use the actual edged blank', () => {
  const project = createProject();
  const model = buildProject(project);
  const cost = estimateProjectCost(project, model);
  const { sheets, unplaced } = workshopSheets(model, cost);
  const rows = sheets.flatMap((sheet) => sheet.rows);
  assert.equal(unplaced.length, 0);
  assert.deepEqual(rows.map(({ part }) => part.id).sort(), model.parts.map((part) => part.id).sort());

  for (const { part, placement } of rows) {
    assert.equal(placement.width, placement.rotated ? part.blankV : part.blankU);
    assert.equal(placement.height, placement.rotated ? part.blankU : part.blankV);
  }

  const csv = workshopCutListCSV(model, cost);
  const lines = csv.replace(/^\uFEFF/, '').split('\r\n');
  assert.equal(lines.length, model.parts.length + 1);
  const sample = rows.find(({ part }) => part.edges.some((edge) => edge > 0));
  assert.ok(sample);
  const fields = lines.find((line) => line.includes(sample.part.id)).split(';');
  assert.equal(fields[6], centimetres(sample.part.blankU));
  assert.equal(fields[8], centimetres(sample.part.u));
  assert.deepEqual(fields.slice(11, 15).map(Number), sample.part.edges);

  const draft = workshopCutListCSV(model, cost, { draft: true }).replace(/^\uFEFF/, '').split('\r\n');
  assert.equal(draft.length, model.parts.length + 1);
  assert.ok(draft[0].endsWith('Статус / Status'));
  assert.ok(draft.slice(1).every((line) => line.endsWith('ЧЕРНОВИК / DRAFT')));
});
