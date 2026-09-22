// Workshop-facing dimensions are centimetres to two decimal places (0.1 mm).
// The original model and cut-list CSV remain in millimetres.
export function centimetres(millimetres) {
  return (Math.round(Number(millimetres) * 10) / 100).toFixed(2);
}

export function workshopSheets(model, cost) {
  const parts = new Map((model.parts || []).map((part) => [part.id, part]));
  const assigned = new Set();
  const groups = [
    { role: 'body', batches: cost.body?.batches || [] },
    { role: 'front', batches: cost.front?.batches || [] },
    { role: 'back', batches: cost.back?.batches || [] },
  ];
  const sheets = [];
  for (const group of groups) for (const batch of group.batches) {
    for (const sheet of batch.stockPlan?.sheets || []) {
      const rows = (sheet.placements || []).map((placement) => {
        const part = parts.get(placement.id);
        if (!part || assigned.has(placement.id))
          throw new Error(`Некорректная карта распила: ${placement.id}`);
        assigned.add(placement.id);
        return { part, placement };
      });
      sheets.push({ role: group.role, batch, sheet, rows });
    }
  }
  return {
    sheets,
    unplaced: [...parts.values()].filter((part) => !assigned.has(part.id)),
  };
}

// Keep A4 cards in the same order and material batches as the workshop list.
export function workshopCardPages(model, cost, perPage = 4) {
  const { sheets, unplaced } = workshopSheets(model, cost);
  const size = Math.max(1, Math.floor(perPage));
  const pages = [];
  for (const sheet of sheets) {
    for (let start = 0; start < sheet.rows.length; start += size)
      pages.push({ ...sheet, rows: sheet.rows.slice(start, start + size), unplaced: false });
  }
  for (let start = 0; start < unplaced.length; start += size)
    pages.push({ role: 'unplaced', batch: null, sheet: null,
      rows: unplaced.slice(start, start + size).map(part => ({ part, placement: null })), unplaced: true });
  return pages;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[;"\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function workshopCutListCSV(model, cost, options = {}) {
  const { sheets, unplaced } = workshopSheets(model, cost);
  const headers = [
    'Группа / Group', 'Лист / Sheet', '№', 'ID', 'Деталь / Part', 'Количество / Qty',
    'Заготовка U см / Cut U cm', 'Заготовка V см / Cut V cm',
    'Готовая U см / Finished U cm', 'Готовая V см / Finished V cm',
    'Толщина см / Thickness cm', 'Кромка слева мм / Left edge mm',
    'Кромка справа мм / Right edge mm', 'Кромка сверху мм / Top edge mm',
    'Кромка снизу мм / Bottom edge mm', 'Материал / Material', 'Декор / Decor',
    'Поворот на карте / Rotated on map', 'Статус / Status',
  ];
  const rows = [];
  for (const { role, batch, sheet, rows: items } of sheets) for (const { part, placement } of items)
    rows.push([
      role, sheet.index, placement.sequence, part.id, part.name, 1,
      centimetres(part.blankU), centimetres(part.blankV),
      centimetres(part.u), centimetres(part.v), centimetres(part.thickness),
      ...(part.edges || [0, 0, 0, 0]), batch.materialName, batch.decor,
      placement.rotated ? 'yes' : 'no', options.draft ? 'ЧЕРНОВИК / DRAFT' : '',
    ]);
  for (const part of unplaced) rows.push([
    'UNPLACED', '', '', part.id, part.name, 1,
    centimetres(part.blankU), centimetres(part.blankV),
    centimetres(part.u), centimetres(part.v), centimetres(part.thickness),
    ...(part.edges || [0, 0, 0, 0]), part.materialProductId, part.decor, '', 'НЕ РАЗМЕЩЕНО / UNPLACED',
  ]);
  return '\ufeff' + [headers, ...rows]
    .map((row) => row.map(csvCell).join(';')).join('\r\n');
}
