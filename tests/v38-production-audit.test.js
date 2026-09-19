import test from "node:test";
import assert from "node:assert/strict";
import { MODULE_TYPES } from "../src/catalog/materials.js";
import { estimateProjectCost } from "../src/core/cost.js";
import {
  buildHardwareBill,
  HARDWARE_PRODUCTS,
} from "../src/core/hardware.js";
import { buildProject } from "../src/core/parts.js";
import {
  auditProductionReadiness,
  cornerProductionSignature,
} from "../src/core/production-audit.js";
import { createModule, createProject } from "../src/core/project.js";

const projectWith = (module) => {
  const project = createProject();
  project.modules = [module];
  return project;
};

test("sink and hob cabinets use a vertical front stretcher clear of the fixture body", () => {
  for (const type of ["sink", "hob"]) {
    const module = createModule(type === "sink" ? "sink" : "base");
    const project = projectWith(module);
    project.fixtures = [{
      id: `fixture-${type}`,
      type,
      targetModuleId: module.id,
      width: type === "sink" ? 500 : 300,
      depth: type === "sink" ? 400 : 520,
      offsetX: 0,
      offsetZ: 0,
      installationHeight: type === "sink" ? 200 : 51,
      rimHeight: 6,
    }];
    const model = buildProject(project);
    const frontRail = model.parts.find((part) => part.id === "M01-RF");
    assert.deepEqual(frontRail.size.slice(1), [100, module.board]);
    assert.equal(model.fixtures[0].fits, true);
    assert.deepEqual(model.fixtures[0].collisions, []);
    assert.equal(model.issues.some((issue) => issue.type === "fixture-part-collision"), false);
  }
});

test("fixture collision with cabinet parts is a hard geometric issue", () => {
  const module = createModule("sink");
  const project = projectWith(module);
  project.fixtures = [{
    id: "fixture-wide",
    type: "sink",
    targetModuleId: module.id,
    width: 580,
    depth: 400,
    offsetX: 0,
    offsetZ: 0,
    installationHeight: 200,
    rimHeight: 6,
  }];
  const model = buildProject(project);
  assert.equal(model.fixtures[0].fits, false);
  assert.ok(model.fixtures[0].collisions.some((id) => id.endsWith("-SL")));
  assert.ok(model.fixtures[0].collisions.some((id) => id.endsWith("-SR")));
  assert.ok(model.issues.some((issue) => issue.type === "fixture-part-collision"));
});

test("tall cabinets have a solid structural top instead of base-cabinet rails", () => {
  for (const type of ["tall", "tallOven"]) {
    const model = buildProject(projectWith(createModule(type)));
    assert.ok(model.parts.some((part) => part.id === "M01-TP"));
    assert.equal(model.parts.some((part) => /M01-R[FR]$/.test(part.id)), false);
  }
});

test("automatic hardware bill follows fronts, shelves and visible supports", () => {
  const module = createModule("base");
  module.shelfCount = 1;
  module.doorCount = 1;
  const project = projectWith(module);
  const model = buildProject(project);
  const bill = Object.fromEntries(buildHardwareBill(project, model).map((row) => [row.id, row.quantity]));
  assert.equal(bill.fastenerSet, 1);
  assert.equal(bill.hinge, 2);
  assert.equal(bill.handle, 1);
  assert.equal(bill.shelfPin, 4);
  assert.equal(bill.leg, 4);
});

test("estimate separates consumed area from real whole-sheet procurement", () => {
  const project = projectWith(createModule("base"));
  project.countertop.enabled = false;
  const cost = estimateProjectCost(project, buildProject(project));
  assert.equal(cost.total, cost.consumedTotal);
  assert.ok(cost.purchaseMaterials > cost.materials);
  assert.ok(cost.procurementTotal > cost.consumedTotal);
  assert.ok(cost.procurementRangeHigh > cost.procurementRangeLow);
});

test("production gate blocks incomplete geometry but treats missing prices as estimate warnings", () => {
  const project = projectWith(createModule("drawer"));
  const model = buildProject(project);
  const audit = auditProductionReadiness(project, model, estimateProjectCost(project, model));
  const codes = new Set(audit.blockers.map((item) => item.code));
  const warningCodes = new Set(audit.warnings.map((item) => item.code));
  assert.equal(audit.ready, false);
  assert.ok(codes.has("drawer-boxes-missing"));
  assert.ok(!codes.has("countertop-unpriced"));
  assert.ok(!codes.has("hardware-unpriced"));
  assert.ok(warningCodes.has("countertop-unpriced"));
  assert.ok(warningCodes.has("hardware-unpriced"));
});

test("missing prices do not block a geometrically complete cabinet", () => {
  const project = projectWith(createModule("base"));
  const model = buildProject(project);
  const audit = auditProductionReadiness(project, model, estimateProjectCost(project, model));
  assert.equal(audit.ready, true);
  assert.equal(audit.blockers.length, 0);
  assert.ok(audit.warnings.some((item) => item.code === "countertop-unpriced"));
  assert.ok(audit.warnings.some((item) => item.code === "hardware-unpriced"));
});

test("production gate keeps every corner construction in draft status", () => {
  for (const type of [
    "cornerBase",
    "cornerBaseBlind",
    "cornerBaseDiagonal",
    "cornerBaseL",
    "cornerWall",
    "cornerWallBlind",
    "cornerWallDiagonal",
    "cornerWallL",
  ]) {
    const project = projectWith(createModule(type));
    const model = buildProject(project);
    const audit = auditProductionReadiness(project, model, estimateProjectCost(project, model));
    assert.ok(
      audit.blockers.some((item) => item.code === "preliminary-corner"),
      type,
    );
  }
});

test("an explicitly approved corner is not a blocker until its geometry changes", () => {
  const corner = createModule("cornerBaseBlind");
  corner.cornerProductionApproval = cornerProductionSignature(corner);
  const project = projectWith(corner);
  const approved = auditProductionReadiness(
    project,
    buildProject(project),
    estimateProjectCost(project, buildProject(project)),
  );
  assert.equal(
    approved.blockers.some((item) => item.code === "preliminary-corner"),
    false,
  );
  assert.ok(
    approved.warnings.some((item) => item.code === "corner-construction-approved"),
  );

  corner.cornerOpening += 1;
  const changedModel = buildProject(project);
  const changed = auditProductionReadiness(
    project,
    changedModel,
    estimateProjectCost(project, changedModel),
  );
  assert.ok(changed.blockers.some((item) => item.code === "preliminary-corner"));
});

test("a wide straight cabinet is blocked until a structural divider is modeled", () => {
  const cabinet = createModule("base");
  cabinet.width = 1000;
  const project = projectWith(cabinet);
  const model = buildProject(project);
  const audit = auditProductionReadiness(project, model, estimateProjectCost(project, model));
  assert.ok(audit.blockers.some((item) => item.code === "wide-span-unsupported"));
});

test("a complete basic cabinet can pass after purchase prices are supplied", () => {
  const project = projectWith(createModule("base"));
  project.costing = {
    countertopPerM: 1,
    hardwarePrices: Object.fromEntries(Object.keys(HARDWARE_PRODUCTS).map((id) => [id, 1])),
  };
  const model = buildProject(project);
  const audit = auditProductionReadiness(project, model, estimateProjectCost(project, model));
  assert.equal(audit.ready, true);
  assert.equal(audit.blockers.length, 0);
});

test("every catalog element builds only positive cut sizes and four explicit edge sides", () => {
  for (const type of Object.keys(MODULE_TYPES)) {
    const model = buildProject(projectWith(createModule(type)));
    for (const part of model.parts) {
      assert.ok(part.u > 0 && part.v > 0 && part.thickness > 0, `${type}: ${part.id}`);
      assert.ok(part.blankU > 0 && part.blankV > 0, `${type}: ${part.id} blank`);
      assert.equal(part.edges.length, 4, `${type}: ${part.id} edges`);
      assert.ok(part.edges.every((edge) => edge >= 0), `${type}: ${part.id} edge value`);
    }
  }
});
