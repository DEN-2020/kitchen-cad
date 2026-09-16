import test from "node:test";
import assert from "node:assert/strict";
import { buildProject } from "../src/core/parts.js";
import { createModule, createProject } from "../src/core/project.js";

test("a 600 mm base appliance bay is an opening, not a machine squeezed into a carcass", () => {
  const project = createProject();
  const module = createModule("base");
  module.applianceBay = "dishwasher";
  module.applianceWidth = 600;
  module.applianceHeight = 815;
  module.applianceDepth = 570;
  project.modules = [module];
  const model = buildProject(project);
  assert.equal(model.parts.filter((part) => part.moduleId === module.id).length, 0);
  assert.ok(model.objects.some((object) => object.moduleId === module.id && object.embeddedAppliance));
  assert.equal(model.issues.some((issue) => issue.type === "appliance-bay-fit"), false);
});

test("blind corner keeps a useful storage section beside an appliance opening", () => {
  const project = createProject();
  const module = createModule("cornerBaseBlind");
  module.width = 1200;
  module.cornerOpening = 600;
  module.applianceBay = "dishwasher";
  module.applianceWidth = 600;
  module.applianceHeight = 815;
  module.applianceDepth = 570;
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
