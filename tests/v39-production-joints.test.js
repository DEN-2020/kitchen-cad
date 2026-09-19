import test from "node:test";
import assert from "node:assert/strict";
import { buildProject } from "../src/core/parts.js";
import { createFixture, createModule, createProject } from "../src/core/project.js";
import { auditProductionReadiness } from "../src/core/production-audit.js";
import { applianceHobApprovalSignature } from "../src/core/appliance-bay.js";

test("a one-sided washer bay can share the adjacent cabinet side as its second worktop support", () => {
  const project = createProject();
  const bay = createModule("base");
  Object.assign(bay, {
    width: 638,
    applianceBay: "washer",
    applianceWidth: 600,
    applianceHeight: 850,
    applianceDepth: 550,
    applianceSideClearance: 20,
    applianceSupportMode: "left",
  });
  const neighbour = createModule("base");
  project.modules = [bay, neighbour];
  const model = buildProject(project);
  const parts = model.parts.filter((part) => part.moduleId === bay.id);
  assert.ok(parts.some((part) => part.id.endsWith("-SL")));
  assert.deepEqual(
    parts
      .filter((part) => part.id.endsWith("-RS"))
      .map((part) => [part.u, part.v, part.thickness]),
    [[620, 100, 18]],
  );
  assert.deepEqual(
    parts
      .filter((part) => part.id.endsWith("-FS"))
      .map((part) => ({ cut: [part.u, part.v, part.thickness], size: part.size })),
    [{ cut: [620, 100, 18], size: [620, 18, 100] }],
  );
  assert.equal(parts.some((part) => part.id.endsWith("-SR")), false);
  assert.equal(
    model.issues.some((issue) => issue.type === "appliance-support-missing"),
    false,
  );
  assert.equal(
    model.issues.some((issue) => issue.type === "appliance-bay-fit"),
    false,
  );
});

test("a shared appliance-bay side is blocked when no adjacent full-height cabinet exists", () => {
  const project = createProject();
  const bay = createModule("base");
  Object.assign(bay, {
    width: 638,
    applianceBay: "washer",
    applianceWidth: 600,
    applianceHeight: 840,
    applianceDepth: 550,
    applianceSideClearance: 20,
    applianceSupportMode: "left",
  });
  project.modules = [bay];
  const model = buildProject(project);
  assert.ok(
    model.issues.some(
      (issue) => issue.type === "appliance-support-missing" && issue.side === "right",
    ),
  );
});

test("corner filler adds a visible strip and a plinth return to the cut list", () => {
  const project = createProject();
  const cabinet = createModule("sink");
  cabinet.cornerFillerLeft = 40;
  cabinet.legStyle = "hidden";
  project.modules = [cabinet];
  const model = buildProject(project);
  const filler = model.parts.find((part) => part.id.endsWith("-CFL"));
  const plinthReturn = model.parts.find((part) => part.id.endsWith("-CPL"));
  assert.deepEqual(
    [filler.u, filler.v, filler.role],
    [40, cabinet.height - cabinet.gap * 2, "front"],
  );
  assert.deepEqual([plinthReturn.u, plinthReturn.v], [105, cabinet.feet - 10]);
});

test("an appliance-bay corner filler supports the front but still requires a neighbour for the rear rail", () => {
  const project = createProject();
  const bay = createModule("base");
  Object.assign(bay, {
    width: 636,
    feet: 100,
    legStyle: "hidden",
    applianceBay: "dishwasher",
    applianceWidth: 598,
    applianceHeight: 815,
    applianceDepth: 550,
    applianceSideClearance: 20,
    applianceSupportMode: "right",
    cornerFillerLeft: 51,
  });
  project.modules = [bay];

  const model = buildProject(project);
  const support = model.parts.find((part) => part.id.endsWith("-CSL"));

  assert.deepEqual([support.u, support.v, support.size], [100, 880, [18, 880, 100]]);
  assert.equal(
    model.issues.some(
      (issue) => issue.type === "appliance-support-missing" && issue.side === "left",
    ),
    true,
  );
});

test("a hood mounted only 470 mm above the worktop is a production blocker", () => {
  const project = createProject();
  const cabinet = createModule("base");
  const hood = createModule("hood");
  hood.elevation = 1370;
  project.modules = [cabinet, hood];
  project.fixtures = [createFixture("hob", cabinet.id)];
  const model = buildProject(project);
  const issue = model.issues.find((item) => item.type === "hood-clearance");
  assert.equal(issue.clearance, 470);
  const audit = auditProductionReadiness(project, model, {});
  assert.ok(audit.blockers.some((item) => item.code === "hood-clearance"));
});

test("dishwasher under a hob stays blocked until the two appliance manuals approve the combination", () => {
  const project = createProject();
  const cabinet = createModule("base");
  Object.assign(cabinet, {
    width: 636,
    applianceBay: "dishwasher",
    applianceWidth: 598,
    applianceHeight: 815,
    applianceDepth: 550,
    applianceSideClearance: 2,
  });
  project.modules = [cabinet];
  project.fixtures = [createFixture("hob", cabinet.id)];
  const model = buildProject(project);
  assert.ok(
    model.issues.some((issue) => issue.type === "appliance-hob-compatibility"),
  );
});

test("an approved hob appliance layout stays approved only for its current geometry", () => {
  const project = createProject();
  const cabinet = createModule("base");
  Object.assign(cabinet, {
    width: 636,
    feet: 160,
    applianceBay: "dishwasher",
    applianceWidth: 598,
    applianceHeight: 815,
    applianceDepth: 550,
    applianceSideClearance: 20,
    applianceSupportMode: "both",
  });
  const hob = createFixture("hob", cabinet.id);
  hob.installationHeight = 60;
  project.countertop.elevation = 880;
  project.modules = [cabinet];
  project.fixtures = [hob];
  cabinet.applianceHobApproval = applianceHobApprovalSignature(
    cabinet,
    hob,
    project.countertop,
  );

  const approved = buildProject(project);
  assert.equal(
    approved.issues.some((issue) => issue.type === "appliance-hob-compatibility"),
    false,
  );

  hob.installationHeight = 61;
  const changed = buildProject(project);
  assert.ok(
    changed.issues.some((issue) => issue.type === "appliance-hob-compatibility"),
  );
});

test("a 900 mm finished worktop height clears a 60 mm hob, dishwasher, and vertical front rail", () => {
  const project = createProject();
  const cabinet = createModule("base");
  Object.assign(cabinet, {
    width: 636,
    feet: 100,
    applianceBay: "dishwasher",
    applianceWidth: 600,
    applianceHeight: 815,
    applianceDepth: 550,
    applianceSideClearance: 18,
    applianceSupportMode: "right",
  });
  project.countertop.elevation = 880;
  project.countertop.thickness = 20;
  const hob = createFixture("hob", cabinet.id);
  hob.installationHeight = 60;
  project.modules = [cabinet];
  project.fixtures = [hob];
  const model = buildProject(project);
  const frontRail = model.parts.find((part) => part.id.endsWith("-FS"));
  const builtHob = model.fixtures.find((fixture) => fixture.id === hob.id);
  assert.deepEqual(frontRail.size, [618, 100, 18]);
  assert.equal(frontRail.center[1] + frontRail.size[1] / 2, 880);
  assert.equal(builtHob.collisions.length, 0);
  assert.equal(
    model.issues.some((issue) => issue.type === "fixture-part-collision"),
    false,
  );
  assert.ok(
    model.issues.some((issue) => issue.type === "appliance-hob-compatibility"),
  );
});

test("a dishwasher beside a perpendicular corner requires at least 51 mm door clearance", () => {
  const project = createProject();
  const dishwasher = createModule("base");
  Object.assign(dishwasher, {
    width: 636,
    applianceBay: "dishwasher",
    applianceWidth: 598,
    applianceHeight: 815,
    applianceDepth: 550,
    applianceSideClearance: 2,
    applianceSupportMode: "both",
  });
  const corner = createModule("cornerBaseBlind");
  dishwasher.offsetZ = 600;
  corner.offsetX = -1236;
  project.modules = [dishwasher, corner];
  const blocked = buildProject(project);
  const issue = blocked.issues.find(
    (item) => item.type === "dishwasher-corner-clearance",
  );
  assert.equal(issue.clearance, 40);
  assert.equal(issue.required, 51);
  dishwasher.offsetZ = 620;
  const safe = buildProject(project);
  assert.equal(
    safe.issues.some((item) => item.type === "dishwasher-corner-clearance"),
    false,
  );
});

test("a backless wall cabinet is a reinforced-installation warning, not an automatic blocker", () => {
  const project = createProject();
  const cabinet = createModule("wall");
  cabinet.backMode = "none";
  project.modules = [cabinet];
  const audit = auditProductionReadiness(project, buildProject(project), {});
  assert.equal(
    audit.blockers.some((item) => item.code === "structural-back-missing"),
    false,
  );
  assert.ok(
    audit.warnings.some((item) => item.code === "backless-wall-reinforcement"),
  );
});
