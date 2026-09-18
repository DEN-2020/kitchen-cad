import test from "node:test";
import assert from "node:assert/strict";
import { countPartsInOffcuts, planSheetLayout } from "../src/core/sheet-layout.js";

const product = { sheetWidth: 1220, sheetHeight: 2440 };
const part = (id, u, v, extra = {}) => ({
  id,
  name: id,
  blankU: u,
  blankV: v,
  appearance: { pattern: "solid" },
  ...extra,
});

test("sheet layout produces real, non-overlapping stock guidance", () => {
  const plan = planSheetLayout(
    [part("a", 600, 720), part("b", 600, 720), part("c", 560, 700)],
    product,
    { kerf: 4, trim: 10 },
  );
  assert.equal(plan.unplaced.length, 0);
  assert.ok(plan.sheetCount >= 1);
  assert.ok(plan.usedArea > 1);
  assert.ok(plan.leftoverArea >= 0);
  assert.ok(plan.utilization > 0 && plan.utilization <= 1);
  for (const sheet of plan.sheets)
    for (const item of sheet.placements) {
      assert.ok(item.x >= 10 && item.y >= 10);
      assert.ok(item.x + item.width <= 1210.01);
      assert.ok(item.y + item.height <= 2430.01);
    }
  for (const sheet of plan.sheets)
    for (let i = 0; i < sheet.placements.length; i += 1)
      for (let j = i + 1; j < sheet.placements.length; j += 1) {
        const a = sheet.placements[i], b = sheet.placements[j];
        const overlap =
          a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y;
        assert.equal(overlap, false, `${a.id} overlaps ${b.id}`);
      }
});

test("wood grain and stone veining lock orientation while solid decor may rotate", () => {
  const wood = part("wood", 1400, 500, {
    grain: "v",
    appearance: { pattern: "wood" },
  });
  const locked = planSheetLayout([wood], product, { trim: 0, kerf: 0 });
  assert.equal(locked.unplaced.length, 1);
  const stone = part("stone", 1400, 500, {
    grain: "v",
    appearance: { pattern: "stone" },
  });
  const stoneLocked = planSheetLayout([stone], product, { trim: 0, kerf: 0 });
  assert.equal(stoneLocked.unplaced.length, 1);
  const rotatable = planSheetLayout(
    [part("solid", 1400, 500)],
    product,
    { trim: 0, kerf: 0 },
  );
  assert.equal(rotatable.unplaced.length, 0);
  assert.equal(rotatable.sheets[0].placements[0].rotated, true);
});

test("minimum sheet reserve and offcut capacity are explicit", () => {
  const plan = planSheetLayout([part("a", 600, 600)], product, {
    trim: 10,
    kerf: 4,
    minimumSheets: 2,
  });
  assert.equal(plan.sheetCount, 2);
  const free = plan.sheets.flatMap((sheet) => sheet.usefulOffcuts);
  assert.ok(countPartsInOffcuts(free, 300, 300) > 0);
});

test("multi-strategy nesting avoids a nearly empty fourth carcass sheet", () => {
  const dimensions = [
    [1200, 129.2], [1164, 559.2], [1164, 100], [1164, 99.2],
    ...Array.from({ length: 4 }, () => [559.2, 720]),
    [68.4, 714.4], [600, 129.2],
    ...Array.from({ length: 6 }, () => [319.2, 720]),
    [630.4, 714.4], [564, 559.2],
    ...Array.from({ length: 6 }, () => [564, 319.2]),
    [564, 100], [564, 99.2],
    ...Array.from({ length: 3 }, () => [562, 299.2]),
  ];
  const plan = planSheetLayout(
    dimensions.map(([u, v], index) => part(`cabinet-${index + 1}`, u, v)),
    product,
    { trim: 10, kerf: 4 },
  );
  assert.equal(plan.unplaced.length, 0);
  assert.equal(plan.sheetCount, 3);
});
