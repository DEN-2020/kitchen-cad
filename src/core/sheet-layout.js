const finite = (value, fallback = 0) =>
  Number.isFinite(Number(value)) ? Number(value) : fallback;

const round = (value, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

const area = (rect) => Math.max(0, rect.width) * Math.max(0, rect.height);

function removeContained(rects) {
  return rects.filter(
    (rect, index) =>
      rect.width > 0 &&
      rect.height > 0 &&
      !rects.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          rect.x >= other.x &&
          rect.y >= other.y &&
          rect.x + rect.width <= other.x + other.width &&
          rect.y + rect.height <= other.y + other.height,
      ),
  );
}

function orientations(part) {
  const u = Math.max(0, finite(part.blankU, finite(part.u, 0)));
  const v = Math.max(0, finite(part.blankV, finite(part.v, 0)));
  const directional = ["wood", "stone"].includes(part.appearance?.pattern);
  if (directional) {
    // The stock pattern runs along sheetHeight. Wood grain and stone veining
    // must stay aligned across neighbouring fronts; rotation is not free.
    return part.grain === "u"
      ? [{ width: v, height: u, rotated: true }]
      : [{ width: u, height: v, rotated: false }];
  }
  const result = [{ width: u, height: v, rotated: false }];
  if (Math.abs(u - v) > 0.01)
    result.push({ width: v, height: u, rotated: true });
  return result;
}

function createSheet(index, sheetWidth, sheetHeight, trim) {
  const usableWidth = Math.max(0, sheetWidth - trim * 2);
  const usableHeight = Math.max(0, sheetHeight - trim * 2);
  return {
    index,
    width: sheetWidth,
    height: sheetHeight,
    trim,
    usableWidth,
    usableHeight,
    placements: [],
    freeRects:
      usableWidth > 0 && usableHeight > 0
        ? [{ x: trim, y: trim, width: usableWidth, height: usableHeight }]
        : [],
  };
}

function bestPlacement(sheets, part) {
  let best = null;
  for (const sheet of sheets) {
    for (let rectIndex = 0; rectIndex < sheet.freeRects.length; rectIndex += 1) {
      const rect = sheet.freeRects[rectIndex];
      for (const orientation of orientations(part)) {
        if (
          orientation.width <= rect.width + 0.01 &&
          orientation.height <= rect.height + 0.01
        ) {
          const shortSide = Math.min(
            rect.width - orientation.width,
            rect.height - orientation.height,
          );
          const score = [area(rect) - orientation.width * orientation.height, shortSide];
          if (
            !best ||
            score[0] < best.score[0] ||
            (score[0] === best.score[0] && score[1] < best.score[1])
          )
            best = { sheet, rectIndex, orientation, score };
        }
      }
    }
  }
  return best;
}

function splitFreeRect(sheet, rectIndex, width, height, kerf) {
  const rect = sheet.freeRects[rectIndex];
  const right = Math.max(0, rect.width - width - kerf);
  const bottom = Math.max(0, rect.height - height - kerf);
  const replacements = [];

  // Guillotine split. Choosing the longer remaining direction preserves one
  // large, useful offcut instead of many optimistic overlapping rectangles.
  const verticalFirst = right > bottom;
  if (verticalFirst) {
    if (right > 0)
      replacements.push({
        x: rect.x + width + kerf,
        y: rect.y,
        width: right,
        height: rect.height,
      });
    if (bottom > 0)
      replacements.push({
        x: rect.x,
        y: rect.y + height + kerf,
        width,
        height: bottom,
      });
  } else {
    if (right > 0)
      replacements.push({
        x: rect.x + width + kerf,
        y: rect.y,
        width: right,
        height,
      });
    if (bottom > 0)
      replacements.push({
        x: rect.x,
        y: rect.y + height + kerf,
        width: rect.width,
        height: bottom,
      });
  }
  sheet.freeRects.splice(rectIndex, 1, ...replacements);
  sheet.freeRects = removeContained(sheet.freeRects);
  return {
    firstCut: verticalFirst ? "vertical" : "horizontal",
    secondCut: verticalFirst ? "horizontal" : "vertical",
  };
}

const partMetrics = (part) => {
  const size = orientations(part)[0];
  return {
    id: String(part.id || ""),
    width: size.width,
    height: size.height,
    long: Math.max(size.width, size.height),
    short: Math.min(size.width, size.height),
    area: size.width * size.height,
  };
};

const compareId = (a, b) => String(a.id || "").localeCompare(String(b.id || ""));

const seededIdHash = (value, seed) => {
  let hash = (2166136261 ^ seed) >>> 0;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
};

const SEEDED_SORTERS = Array.from({ length: 256 }, (_, index) => {
  const seed = index + 1;
  return (a, b) =>
    seededIdHash(a.id, seed) - seededIdHash(b.id, seed) ||
    a.id.localeCompare(b.id);
});

const SORTERS = [
  (a, b) => b.long - a.long || b.area - a.area,
  (a, b) => b.area - a.area || b.long - a.long,
  (a, b) => b.short - a.short || b.long - a.long,
  (a, b) => b.width - a.width || b.height - a.height,
  (a, b) => b.height - a.height || b.width - a.width,
  ...SEEDED_SORTERS,
];

function packParts(parts, sorter, sheetWidth, sheetHeight, trim, kerf) {
  const sheets = [];
  const unplaced = [];
  const sortedParts = parts
    .map((part) => ({ part, metrics: partMetrics(part) }))
    .sort((a, b) => sorter(a.metrics, b.metrics) || compareId(a.part, b.part))
    .map((entry) => entry.part);

  for (const part of sortedParts) {
    let placement = bestPlacement(sheets, part);
    if (!placement) {
      const sheet = createSheet(sheets.length + 1, sheetWidth, sheetHeight, trim);
      sheets.push(sheet);
      placement = bestPlacement([sheet], part);
    }
    if (!placement) {
      if (sheets.at(-1)?.placements.length === 0) sheets.pop();
      unplaced.push({
        id: part.id,
        name: part.name,
        width: orientations(part)[0].width,
        height: orientations(part)[0].height,
        reason: "oversize",
      });
      continue;
    }
    const { sheet, rectIndex, orientation } = placement;
    const rect = sheet.freeRects[rectIndex];
    const cut = splitFreeRect(
      sheet,
      rectIndex,
      orientation.width,
      orientation.height,
      kerf,
    );
    sheet.placements.push({
      id: part.id,
      name: part.name,
      moduleId: part.moduleId,
      sequence: sheet.placements.length + 1,
      x: round(rect.x),
      y: round(rect.y),
      width: round(orientation.width),
      height: round(orientation.height),
      rotated: orientation.rotated,
      grainLocked: ["wood", "stone"].includes(part.appearance?.pattern),
      firstCut: cut.firstCut,
      secondCut: cut.secondCut,
    });
  }
  return { sheets, unplaced };
}

/**
 * Deterministic preliminary sheet nesting. This is purchasing guidance, not a
 * CNC cutting program: the workshop still decides cut order, clamps and trims.
 */
export function planSheetLayout(parts = [], product = {}, options = {}) {
  const sheetWidth = Math.max(1, finite(product.sheetWidth, 2440));
  const sheetHeight = Math.max(1, finite(product.sheetHeight, 1220));
  const kerf = Math.max(0, finite(options.kerf, 4));
  const trim = Math.max(0, finite(options.trim, 10));
  const minimumSheets = Math.max(0, Math.ceil(finite(options.minimumSheets, 0)));
  const validParts = [...parts].filter(
    (part) => orientations(part)[0]?.width > 0 && orientations(part)[0]?.height > 0,
  );
  const candidates = SORTERS.map((sorter) =>
    packParts(validParts, sorter, sheetWidth, sheetHeight, trim, kerf),
  );
  candidates.sort(
    (a, b) =>
      a.unplaced.length - b.unplaced.length ||
      a.sheets.length - b.sheets.length ||
      b.sheets.at(-1)?.placements.length - a.sheets.at(-1)?.placements.length,
  );
  const { sheets, unplaced } = candidates[0];

  while (sheets.length < minimumSheets)
    sheets.push(createSheet(sheets.length + 1, sheetWidth, sheetHeight, trim));

  for (const sheet of sheets) {
    sheet.usedArea =
      sheet.placements.reduce((sum, item) => sum + item.width * item.height, 0) / 1e6;
    sheet.freeRects = sheet.freeRects
      .map((rect) => ({
        ...rect,
        x: round(rect.x),
        y: round(rect.y),
        width: round(rect.width),
        height: round(rect.height),
        area: round(area(rect) / 1e6, 3),
      }))
      .sort((a, b) => b.width * b.height - a.width * a.height);
    sheet.usefulOffcuts = sheet.freeRects.filter(
      (rect) => Math.min(rect.width, rect.height) >= 80 && rect.area >= 0.01,
    );
    sheet.utilization =
      sheet.width * sheet.height > 0
        ? (sheet.usedArea * 1e6) / (sheet.width * sheet.height)
        : 0;
  }

  const usedArea = sheets.reduce((sum, sheet) => sum + sheet.usedArea, 0);
  const stockArea = (sheets.length * sheetWidth * sheetHeight) / 1e6;
  const reusableArea =
    sheets.reduce(
      (sum, sheet) =>
        sum + sheet.usefulOffcuts.reduce((partSum, rect) => partSum + rect.area, 0),
      0,
    );
  return {
    sheetWidth,
    sheetHeight,
    kerf,
    trim,
    sheets,
    sheetCount: sheets.length,
    usedArea: round(usedArea, 3),
    stockArea: round(stockArea, 3),
    leftoverArea: round(Math.max(0, stockArea - usedArea), 3),
    reusableArea: round(reusableArea, 3),
    utilization: stockArea > 0 ? usedArea / stockArea : 0,
    unplaced,
  };
}

export function countPartsInOffcuts(freeRects = [], width, height, allowRotate = true) {
  const w = Math.max(1, finite(width, 1));
  const h = Math.max(1, finite(height, 1));
  return freeRects.reduce((sum, rect) => {
    const normal = Math.floor(rect.width / w) * Math.floor(rect.height / h);
    const rotated = allowRotate
      ? Math.floor(rect.width / h) * Math.floor(rect.height / w)
      : 0;
    return sum + Math.max(normal, rotated);
  }, 0);
}
