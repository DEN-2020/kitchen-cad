import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createServer } from 'vite';
import { buildProject } from '../src/core/parts.js';
import { estimateProjectCost } from '../src/core/cost.js';
import { auditProductionReadiness } from '../src/core/production-audit.js';
import { workshopCutListCSV, workshopSheets } from '../src/io/workshop-list.js';

const projectId = process.argv[2] || 'main';
const outputDir = resolve(process.argv[3] || 'output/workshop');
const dataDirectory = process.env.KITCHEN_CAD_DATA_DIR || join(process.env.LOCALAPPDATA || '', 'KitchenCAD');
const database = new DatabaseSync(join(dataDirectory, 'data.db'), { readOnly: true });
const row = database.prepare('SELECT payload, revision FROM projects WHERE id = ?').get(projectId);
database.close();
if (!row) throw new Error(`No saved project with id ${projectId}`);

const project = JSON.parse(row.payload);
const model = buildProject(project);
const cost = estimateProjectCost(project, model);
const audit = auditProductionReadiness(project, model, cost);
const { sheets, unplaced } = workshopSheets(model, cost);
const draft = audit.blockers.length > 0 || unplaced.length > 0;
const vite = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const { workshopReportHtml } = await vite.ssrLoadModule('/src-modern/export/report.ts');
  mkdirSync(outputDir, { recursive: true });
  writeFileSync(join(outputDir, 'workshop-list-cm.html'), workshopReportHtml(project, model, { draft }));
  writeFileSync(join(outputDir, 'workshop-list-cm.csv'), workshopCutListCSV(model, cost, { draft }));
  process.stdout.write(JSON.stringify({ projectId, revision: row.revision, parts: model.parts.length, sheets: sheets.length, unplaced: unplaced.length, blockers: audit.blockers.map((item) => item.message), draft, outputDir }) + '\n');
} finally {
  await vite.close();
}
