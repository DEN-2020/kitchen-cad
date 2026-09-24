import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildProject } from '../src/core/parts.js';
import { estimateProjectCost } from '../src/core/cost.js';
import { workshopGroupedRows } from '../src/io/workshop-list.js';

const projectId = process.argv[2] || 'main';
const outputPath = resolve(process.argv[3] || 'tmp/pdfs/kitchen-master-arabic.html');
const requestedRole = ['body', 'front', 'back'].includes(process.argv[4]) ? process.argv[4] : null;
const dataDirectory = process.env.KITCHEN_CAD_DATA_DIR || join(process.env.LOCALAPPDATA || '', 'KitchenCAD');
const database = new DatabaseSync(join(dataDirectory, 'data.db'), { readOnly: true });
const row = database.prepare('SELECT payload, revision FROM projects WHERE id = ?').get(projectId);
database.close();
if (!row) throw new Error(`No saved project with id ${projectId}`);

const project = JSON.parse(row.payload);
const model = buildProject(project);
const cost = estimateProjectCost(project, model);
const grouped = workshopGroupedRows(model);

const roleConfig = {
  body: {
    title: 'الهيكل',
    material: 'ميلامين MFC سماكة 16 مم',
    edge: 'حافة ABS سماكة 0.2 مم حيث توجد العلامة 1',
    sheet: cost.body?.batches?.[0],
  },
  front: {
    title: 'الواجهات',
    material: 'MDF High Gloss رمادي سماكة 18 مم',
    edge: 'حافة ABS سماكة 1 مم حيث توجد العلامة 1',
    sheet: cost.front?.batches?.[0],
  },
  back: {
    title: 'الظهر',
    material: 'HDF أبيض سماكة 3 مم',
    edge: 'بدون حافة',
    sheet: cost.back?.batches?.[0],
  },
};

const namesByIds = new Map([
  ['M02-SR|M08-SL', 'جوانب حاملة للأجهزة'],
  ['M02-CSL', 'دعامة الزاوية'],
  ['M03-SL|M03-SR', 'جانبا خزانة الزاوية'],
  ['M03-MS', 'حاجز تركيب المفصلات'],
  ['M03-BF', 'لوح مصمت لخزانة الزاوية'],
  ['M04-SL|M04-SR|M06-SL|M06-SR|M07-SL|M07-SR', 'جوانب الخزائن العلوية'],
  ['M03-BT', 'قاعدة خزانة الزاوية'],
  ['M09-LSL|M09-LSR', 'جوانب سفلية لحيز الميكروويف'],
  ['M04-BT|M04-TP|M06-BT|M06-TP|M07-BT|M07-TP', 'أسطح وقواعد الخزائن العلوية'],
  ['M09-UDV|M09-UTP', 'رف فاصل وسطح خزانة الميكروويف'],
  ['M04-SH1|M06-SH1|M07-SH1', 'أرفف الخزائن العلوية'],
  ['M09-USL|M09-USR', 'جوانب علوية لخزانة الميكروويف'],
  ['M03-RR', 'عارضة خلفية لخزانة الزاوية'],
  ['M02-RS', 'عارضة خلفية لحيز غسالة الصحون'],
  ['M08-FS|M08-RS', 'عارضتا حيز الغسالة'],
  ['M02-FS', 'عارضة أمامية لحيز غسالة الصحون'],
  ['M09-UMR', 'عارضة تثبيت خزانة الميكروويف'],
  ['M03-RF', 'عارضة أمامية لخزانة الزاوية'],
  ['M03-PL', 'وزرة خزانة الزاوية'],
  ['M02-CPL', 'امتداد الوزرة إلى الزاوية'],
  ['M03-F1|M03-F2', 'واجهتا خزانة الزاوية'],
  ['M02-CFL', 'حشوة الزاوية الأمامية'],
  ['M04-F1|M04-F2|M06-F1|M06-F2|M07-F1|M07-F2', 'أبواب الخزائن العلوية'],
  ['M09-MSH', 'رف سفلي لحيز الميكروويف'],
  ['M09-F1', 'باب خزانة الميكروويف'],
  ['M02-AF', 'شريط زخرفي فوق غسالة الصحون'],
  ['M08-AF', 'شريط زخرفي فوق الغسالة'],
  ['M04-BK|M06-BK|M07-BK', 'ظهر الخزائن العلوية'],
]);

const cm = (millimetres) => {
  const value = Math.round((Number(millimetres) / 10) * 100) / 100;
  return Number.isInteger(value) ? String(value) : String(value).replace(/0$/, '');
};
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const checked = () => '<span class="check">✓</span>';
const edge = (value) => Number(value) > 0 ? '1' : '';
const roleRows = (role) => grouped.filter((item) => item.role === role);

function labelFor(group) {
  const ids = group.parts.map((part) => part.id).sort().join('|');
  return namesByIds.get(ids) || group.parts.map((part) => part.id).join(', ');
}

function sheetSummary(batch) {
  if (!batch) return '';
  return `${batch.sheets} لوح - ${cm(batch.sheetWidth)} × ${cm(batch.sheetHeight)} سم`;
}

function page(role, pageNumber) {
  const config = roleConfig[role];
  const rows = roleRows(role);
  const pieces = rows.reduce((total, item) => total + item.quantity, 0);
  return `<section class="page">
    <div class="pageNo">${pageNumber} / 3</div>
    <div class="cutTitle">قطع</div>
    <div class="summary" dir="rtl"><strong>${config.title}</strong> - ${config.material} - ${pieces} قطعة - ${sheetSummary(config.sheet)}</div>
    <table dir="ltr">
      <tbody class="tableHead">
        <tr>
          <td class="head sel" rowspan="2"></td>
          <td class="head num" rowspan="2">#</td>
          <td class="head dim" rowspan="2" dir="rtl">الطول</td>
          <td class="head dim" rowspan="2" dir="rtl">العرض</td>
          <td class="head qty" rowspan="2" dir="rtl">الكمية</td>
          <td class="head material" rowspan="2" dir="rtl">مواد</td>
          <td class="head rotate" rowspan="2" dir="rtl">دوران</td>
          <td class="head name" rowspan="2" dir="rtl">التسمية</td>
          <td class="head edgeGroup" colspan="4" dir="rtl">نطاقات الحافة (الاسم)</td>
        </tr>
        <tr>
          <td class="head edge" dir="rtl">أعلى</td>
          <td class="head edge" dir="rtl">اليسار</td>
          <td class="head edge" dir="rtl">الأسفل</td>
          <td class="head edge" dir="rtl">يمين</td>
        </tr>
      </tbody>
      <tbody>${rows.map((item, index) => `<tr>
        <td>${checked()}</td>
        <td>${index + 1}</td>
        <td>${cm(item.blankU)}</td>
        <td>${cm(item.blankV)}</td>
        <td>${item.quantity}</td>
        <td dir="rtl">${esc(role === 'body' ? 'MFC 16' : role === 'front' ? 'MDF 18' : 'HDF 3')}</td>
        <td>${item.rotationAllowed ? checked() : ''}</td>
        <td class="designation" dir="rtl">${esc(labelFor(item))}</td>
        <td>${edge(item.edges[2])}</td>
        <td>${edge(item.edges[0])}</td>
        <td>${edge(item.edges[3])}</td>
        <td>${edge(item.edges[1])}</td>
      </tr>`).join('')}</tbody>
    </table>
    <div class="notes" dir="rtl">
      <div><strong>مهم:</strong> الطول والعرض هما مقاس القص قبل تركيب الحواف. الوحدة: سم.</div>
      <div>العلامة 1 تعني تركيب الحافة على هذا الجانب. ${config.edge}.</div>
      <div>المراجعة: ${row.revision} - يجب مراجعة المقاسات وسمك اللوح والحواف قبل القص.</div>
    </div>
  </section>`;
}

const pageMarkup = requestedRole
  ? page(requestedRole, { body: 1, front: 2, back: 3 }[requestedRole])
  : `${page('body', 1)}${page('front', 2)}${page('back', 3)}`;
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>قائمة القص - مطبخي</title><style>
  @page{size:A4 portrait;margin:12mm 10mm}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,"Tahoma",sans-serif}.page{position:relative;height:273mm;break-before:page;padding-top:22mm;overflow:hidden}.page:first-child{break-before:auto}.pageNo{position:absolute;top:0;right:0;font:10px Arial;color:#555;direction:ltr}.cutTitle{position:absolute;top:5mm;left:0;font-size:20px;font-weight:700;direction:rtl}.summary{font-size:11px;margin-bottom:3mm;text-align:right;line-height:1.5}table{width:100%;border-collapse:collapse;table-layout:fixed;font:10px Arial,"Tahoma",sans-serif}td{border:1px solid #333;height:7.2mm;padding:1mm;text-align:center;vertical-align:middle}.head{font-weight:400;background:#fff;height:7.5mm}.sel{width:3%}.num{width:3.5%}.dim{width:7.5%}.qty{width:6.5%}.material{width:10%}.rotate{width:6%}.name{width:25%}.edge{width:7.5%}.designation{font-size:9px;text-align:right;line-height:1.2}.check{display:inline-flex;width:3.6mm;height:3.6mm;align-items:center;justify-content:center;border:1px solid #555;font-size:9px;line-height:1}.notes{margin-top:4mm;border-top:1px solid #777;padding-top:2.5mm;font-size:9px;line-height:1.55;text-align:right}.notes div{margin:.8mm 0}
</style></head><body>${pageMarkup}</body></html>`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html, 'utf8');
process.stdout.write(JSON.stringify({
  outputPath,
  revision: row.revision,
  groups: Object.fromEntries(Object.keys(roleConfig).map((role) => [role, roleRows(role).length])),
  pieces: Object.fromEntries(Object.keys(roleConfig).map((role) => [role, roleRows(role).reduce((sum, item) => sum + item.quantity, 0)])),
  sheets: { body: cost.body?.sheets || 0, front: cost.front?.sheets || 0, back: cost.back?.sheets || 0 },
}) + '\n');
