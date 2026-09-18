import test from "node:test";
import assert from "node:assert/strict";
import { buildProject } from "../src/core/parts.js";
import { createFixture, createModule, createProject } from "../src/core/project.js";
import { auditProductionReadiness } from "../src/core/production-audit.js";

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
  assert.deepEqual([filler.u, filler.v, filler.role], [40, 716, "front"]);
  assert.deepEqual([plinthReturn.u, plinthReturn.v], [105, 130]);
});

test("a hood mounted only 470 mm above the worktop is a production blocker", () => {
  const project = createProject();
  const cabinet = createModule("base");
  const hood = createModule("hood");
  hood.elevation = 1350;
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
