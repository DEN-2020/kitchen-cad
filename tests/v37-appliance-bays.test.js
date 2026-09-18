import test from "node:test";
import assert from "node:assert/strict";
import { buildProject } from "../src/core/parts.js";
import { createModule, createProject } from "../src/core/project.js";

test("a self-supporting appliance bay keeps side panels and a clear 600 mm opening", () => {
  const project = createProject();
  const module = createModule("base");
  module.applianceBay = "dishwasher";
  module.applianceWidth = 598;
  module.applianceHeight = 815;
  module.applianceDepth = 550;
  module.applianceSideClearance = 2;
  module.width = 636;
  project.modules = [module];
  const model = buildProject(project);
  const parts = model.parts.filter((part) => part.moduleId === module.id);
  assert.ok(parts.some((part) => part.name === "Несущая боковина ниши левая"));
  assert.ok(parts.some((part) => part.name === "Несущая боковина ниши правая"));
  const frontRail = parts.find((part) => part.id.endsWith("-FS"));
  const rearRail = parts.find((part) => part.id.endsWith("-RS"));
  assert.deepEqual(frontRail.size, [600, 18, 100]);
  assert.deepEqual(rearRail.size, [600, 100, 18]);
  assert.deepEqual(parts.find((part) => part.id.endsWith("-SL")).edges, [0, module.bodyEdge, 0, 0]);
  assert.deepEqual(parts.find((part) => part.id.endsWith("-SR")).edges, [0, module.bodyEdge, 0, 0]);
  assert.deepEqual(rearRail.edges, [0, 0, 0, 0]);
  assert.equal(parts.some((part) => part.name.includes("Дно")), false);
  assert.equal(parts.some((part) => part.role === "front"), false);
  assert.ok(model.objects.some((object) => object.moduleId === module.id && object.embeddedAppliance));
  assert.equal(model.issues.some((issue) => issue.type === "appliance-bay-fit"), false);
});

test("an embedded washer retains its round front-loading door geometry", () => {
  const project = createProject();
  const module = createModule("base");
  module.applianceBay = "washer";
  module.applianceWidth = 598;
  module.applianceHeight = 845;
  module.applianceDepth = 590;
  module.applianceSideClearance = 20;
  module.width = 654;
  module.feet = 160;
  project.modules = [module];
  const model = buildProject(project);
  const applianceObjects = model.objects.filter((object) => object.embeddedAppliance);
  const frontRail = model.parts.find((part) => part.id.endsWith("-FS"));
  assert.ok(applianceObjects.some((object) => object.kind === "appliance-port" && object.shape === "disc"));
  assert.ok(applianceObjects.some((object) => object.kind === "appliance-glass" && object.shape === "disc"));
  assert.ok(applianceObjects.every((object) => object.applianceType === "washer"));
  assert.equal(frontRail.center[1] - frontRail.size[1] / 2, 862);
  assert.ok(frontRail.center[1] - frontRail.size[1] / 2 >= 850 + 10);
});

test("blind corner keeps a useful storage section beside an appliance opening", () => {
  const project = createProject();
  const module = createModule("cornerBaseBlind");
  module.width = 1200;
  module.cornerOpening = 600;
  module.applianceBay = "dishwasher";
  module.applianceWidth = 598;
  module.applianceHeight = 815;
  module.applianceDepth = 550;
  module.applianceSideClearance = 2;
  module.shelfCount = 1;
  project.modules = [module];
  const model = buildProject(project);
  const parts = model.parts.filter((part) => part.moduleId === module.id);
  assert.ok(parts.some((part) => part.name.includes("Полка глухой секции")));
  assert.ok(parts.some((part) => part.name === "Дно глухой секции"));
  assert.equal(parts.some((part) => part.role === "front"), false);
  assert.ok(model.objects.some((object) => object.embeddedAppliance));
});

test("sink and appliance in the same bay produce a hard conflict", () => {
  const project = createProject();
  const module = createModule("sink");
  module.applianceBay = "washer";
  module.applianceHeight = 840;
  project.modules = [module];
  project.fixtures = [{
    id: "fixture-1",
    type: "sink",
    targetModuleId: module.id,
    width: 500,
    depth: 400,
    offsetX: 0,
    offsetZ: 0,
  }];
  const model = buildProject(project);
  assert.ok(model.issues.some((issue) => issue.type === "appliance-fixture-conflict"));
});

test("hob body depth is checked above an appliance", () => {
  const project = createProject();
  const module = createModule("base");
  module.applianceBay = "washer";
  module.applianceWidth = 598;
  module.applianceHeight = 845;
  module.applianceDepth = 590;
  module.applianceSideClearance = 20;
  module.width = 654;
  project.modules = [module];
  project.fixtures = [{
    id: "fixture-hob",
    type: "hob",
    targetModuleId: module.id,
    width: 300,
    depth: 520,
    offsetX: 0,
    offsetZ: 0,
    installationHeight: 51,
    rimHeight: 6,
  }];
  const model = buildProject(project);
  assert.ok(model.issues.some((issue) => issue.type === "appliance-hob-clearance"));
});

test("hob appliance bay braces the lowered front rail up to the countertop", () => {
  const project = createProject();
  const module = createModule("base");
  module.applianceBay = "dishwasher";
  module.applianceWidth = 598;
  module.applianceHeight = 815;
  module.applianceDepth = 550;
  module.applianceSideClearance = 20;
  module.applianceSupportMode = "right";
  module.width = 636;
  module.height = 720;
  module.feet = 160;
  project.modules = [module];
  project.countertop.elevation = 880;
  project.countertop.thickness = 20;
  project.countertop.depth = 620;
  project.fixtures = [{
    id: "fixture-hob-braced",
    type: "hob",
    targetModuleId: module.id,
    width: 300,
    depth: 520,
    offsetX: 0,
    offsetZ: 0,
    installationHeight: 60,
    rimHeight: 6,
  }];

  const model = buildProject(project);
  const frontRail = model.parts.find((part) => part.id.endsWith("-FS"));
  const leftBrace = model.parts.find((part) => part.id.endsWith("-FSL"));
  const rightBrace = model.parts.find((part) => part.id.endsWith("-FSR"));
  const rearRail = model.parts.find((part) => part.id.endsWith("-RS"));

  assert.deepEqual(leftBrace.size, [18, 34, 100]);
  assert.deepEqual(rightBrace.size, [18, 34, 100]);
  assert.deepEqual(leftBrace.edges, [0, module.bodyEdge, 0, 0]);
  assert.deepEqual(rightBrace.edges, [0, module.bodyEdge, 0, 0]);
  assert.equal(leftBrace.center[1] - leftBrace.size[1] / 2, frontRail.center[1] + frontRail.size[1] / 2);
  assert.equal(rightBrace.center[1] + rightBrace.size[1] / 2, rearRail.center[1] + rearRail.size[1] / 2);
  assert.equal(model.issues.some((issue) => issue.type === "fixture-part-collision"), false);
});

test("a rear appliance rail bridges a corner filler to the neighbouring side", () => {
  const project = createProject();
  project.room.width = 1850;
  project.room.depth = 4200;
  const bay = createModule("base");
  bay.width = 636;
  bay.height = 720;
  bay.depth = 560;
  bay.feet = 160;
  bay.rotationY = 270;
  bay.offsetX = 652;
  bay.offsetZ = 649;
  bay.applianceBay = "dishwasher";
  bay.applianceWidth = 598;
  bay.applianceHeight = 815;
  bay.applianceDepth = 550;
  bay.applianceSideClearance = 20;
  bay.applianceSupportMode = "right";
  bay.cornerFillerLeft = 51;
  const corner = createModule("cornerBaseBlind");
  corner.width = 1200;
  corner.depth = 560;
  corner.feet = 160;
  corner.offsetX = -586;
  corner.offsetZ = 0;
  project.modules = [bay, corner];
  project.fixtures = [];
  project.countertop.enabled = false;

  const model = buildProject(project);
  const rearRail = model.parts.find((part) => part.moduleId === bay.id && part.id.endsWith("-RS"));
  assert.deepEqual(rearRail.size, [669, 100, 18]);
  assert.equal(
    model.issues.some((issue) => issue.type === "appliance-support-missing" && issue.moduleId === bay.id),
    false,
  );
  assert.ok(model.warnings.some((warning) => warning.includes("задняя планка продлена через добор на 51 мм")));
});
