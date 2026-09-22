import {
  createProject,
  createModule,
  createFixture,
  applyDefaultFinishToModules,
  DEFAULT_MODULE_STYLE,
  ensureProjectDefaults,
  newId,
  validateProject,
} from "../../src/core/project.js";
import { decodeProject } from "../../src/io/project-store.js";
import { buildProject, blankSize } from "../../src/core/parts.js";
import { hingeCountForHeight } from "../../src/core/hinges.js";
import { detectCountertopJoints } from "../../src/core/countertop-joints.js";
import {
  DECORS,
  MATERIAL_PRODUCTS,
  inferMaterialProductId,
  isDisplayOnlyType,
  isWallMountedType,
  materialSelectionPatch,
  modulePlacementPolicy,
} from "../../src/catalog/materials.js";
import { COST_PRESETS, migrateLegacyWorkshopQuote } from "../../src/core/cost.js";
import {
  applianceBayMeasurements,
  applianceDefaults,
} from "../../src/core/appliance-bay.js";
import {
  buildCountertopSegments,
  countertopSegmentForModule,
} from "../../src/core/countertop-segments.js";
import {
  clampPoseToRoom,
  normalizeRotation,
  resolvePlacementPose,
} from "../../src/core/placement.js";
export type Selection =
  | { kind: "module"; id: string }
  | { kind: "countertop"; id: "CT-01" }
  | { kind: "part"; id: string; moduleId: string }
  | null;
export type DimensionDetail = "none" | "selected";
export type ViewMode = "3d" | "front" | "top";
const clone = <T>(v: T): T => structuredClone(v);
function defaultStyle() {
  return {
    ...DEFAULT_MODULE_STYLE,
    washerClearance: 10,
  };
}
export function createEditorProject() {
  const p: any = createProject();
  p.countertop.lengthMode = "auto";
  p.countertop.offsetX = 0;
  p.countertop.offsetZ = 0;
  p.countertop.elevation = 860;
  p.ui = {
    ...(p.ui || {}),
    theme: "dark",
    explode: 0,
    view: "3d",
    language: "ru",
    showGrid: true,
    showRoomDimensions: true,
    showAllModuleDimensions: false,
    doorsOpen: false,
    autoOrbit: false,
  };
  p.defaults = { ...defaultStyle(), ...(p.defaults || {}) };
  return p;
}
export function normalizeEditorProject(raw: any) {
  const p: any = ensureProjectDefaults(clone(raw));
  p.countertop ??= {};
  if (!Number.isFinite(p.countertop.offsetZ)) p.countertop.offsetZ = 0;
  if (!Number.isFinite(p.countertop.elevation)) p.countertop.elevation = 860;
  if (!Number.isFinite(p.countertop.length)) p.countertop.length = 1700;
  p.ui ??= {};
  if (!Number.isFinite(p.ui.explode)) p.ui.explode = 0;
  if (!["3d", "front", "top"].includes(p.ui.view)) p.ui.view = "3d";
  if (!["ru", "en", "ar"].includes(p.ui.language)) p.ui.language = "ru";
  if (typeof p.ui.showGrid !== "boolean") p.ui.showGrid = true;
  if (typeof p.ui.showRoomDimensions !== "boolean")
    p.ui.showRoomDimensions = true;
  if (typeof p.ui.showAllModuleDimensions !== "boolean")
    p.ui.showAllModuleDimensions = false;
  if (typeof p.ui.doorsOpen !== "boolean") p.ui.doorsOpen = false;
  if (typeof p.ui.autoOrbit !== "boolean") p.ui.autoOrbit = false;
  if (typeof p.ui.autoRotateToWall !== "boolean") p.ui.autoRotateToWall = true;
  p.defaults = { ...defaultStyle(), ...(p.defaults || {}) };
  for (const m of p.modules || []) {
    if (!Array.isArray(m.frontOverrides)) m.frontOverrides = [];
    if (!m.edgeOverrides || typeof m.edgeOverrides !== "object")
      m.edgeOverrides = {};
  }
  for (const m of p.modules || []) {
    if (["washer", "dishwasher"].includes(m.applianceBay)) {
      const legacyWasher =
          m.applianceBay === "washer" &&
          m.applianceWidth === 600 &&
          m.applianceHeight === 850 &&
          m.applianceDepth === 600,
        legacyDishwasher =
          m.applianceBay === "dishwasher" &&
          m.applianceWidth === 600 &&
          m.applianceHeight === 815 &&
          m.applianceDepth === 570;
      if (legacyWasher || legacyDishwasher) {
        const spec = applianceDefaults(m.applianceBay);
        m.applianceWidth = spec.width;
        m.applianceHeight = spec.height;
        m.applianceDepth = spec.depth;
        m.applianceSideClearance = spec.sideClearance;
      }
      const measurements = applianceBayMeasurements(m, {
        ...p.defaults,
        countertopDepth: p.countertop?.depth,
      });
      if (m.type === "cornerBaseBlind")
        m.cornerOpening = Math.max(
          Number(m.cornerOpening) || 450,
          measurements.requiredOpeningWidth,
        );
      else if (["base", "sink"].includes(m.type) && Number(m.width) <= 600)
        m.width = measurements.requiredOuterWidth;
    }
    if (["cornerBaseDiagonal", "cornerBaseL"].includes(m.type)) {
      if (!Number.isFinite(m.cornerRunDepth) || m.cornerRunDepth <= 0)
        m.cornerRunDepth = 600;
      if (!Number.isFinite(m.cornerWingDepth) || m.cornerWingDepth === 560)
        m.cornerWingDepth = m.cornerRunDepth;
    } else if (["cornerWallDiagonal", "cornerWallL"].includes(m.type)) {
      if (!Number.isFinite(m.cornerRunDepth) || m.cornerRunDepth <= 0)
        m.cornerRunDepth = 320;
      if (!Number.isFinite(m.cornerWingDepth))
        m.cornerWingDepth = m.cornerRunDepth;
    }
    if (m.type === "cornerBaseDiagonal" && m.width !== m.depth) {
      const side = Math.max(m.width, m.depth, m.cornerRunDepth + 150);
      m.width = side;
      m.depth = side;
    }
  }
  return p;
}
export function deriveModel(project: any) {
  const p = normalizeEditorProject(project),
    model: any = buildProject({
      ...p,
      countertop: { ...p.countertop, enabled: false },
    });
  for (const module of p.modules || []) {
    for (const part of model.parts.filter(
      (x: any) => x.moduleId === module.id,
    )) {
      const key = String(part.id).replace(/^M\d+-/, "");
      const override = module.edgeOverrides?.[key];
      if (Array.isArray(override) && override.length === 4) {
        part.edges = override.map((v: any) => Math.max(0, Number(v) || 0));
        const [bu, bv] = blankSize(part.u, part.v, part.edges);
        part.blankU = bu;
        part.blankV = bv;
        const obj = model.objects.find((x: any) => x.id === part.id);
        if (obj) {
          obj.edges = part.edges;
          obj.blankU = bu;
          obj.blankV = bv;
        }
      }
    }
    for (let i = 0; i < (module.frontOverrides || []).length; i++) {
      const ov = module.frontOverrides[i];
      if (!ov) continue;
      const part = model.parts.find(
        (x: any) =>
          x.moduleId === module.id &&
          x.role === "front" &&
          x.id.endsWith(`-F${i + 1}`),
      );
      if (!part) continue;
      const decor = ov.decor && DECORS[ov.decor] ? ov.decor : part.decor,
        color = ov.color || DECORS[decor]?.color || part.appearance?.color;
      part.decor = decor;
      part.appearance = {
        ...(part.appearance || {}),
        pattern: DECORS[decor]?.pattern || part.appearance?.pattern,
        color,
      };
      const obj = model.objects.find((x: any) => x.id === part.id);
      part.hingeSide = ov.hingeSide || part.hingeSide;
      if (obj) {
        obj.appearance = {
          ...(obj.appearance || {}),
          pattern: DECORS[decor]?.pattern || obj.appearance?.pattern,
          color,
        };
        obj.hingeSide = part.hingeSide;
      }
    }
  }
  model.objects = model.objects.filter(
    (o: any) => o.kind !== "countertop-segment",
  );
  const segments = buildCountertopSegments(p, model.modules);
  model.countertopSegments = segments;
  model.countertopJoints = detectCountertopJoints(p, segments);
  model.countertop = segments[0] || null;
  for (const s of segments)
    model.objects.push({
      ...s,
      kind: "countertop-segment",
      role: "countertop",
      moduleId: null,
      appearance: {
        pattern: DECORS[p.countertop?.decor]?.pattern || "stone",
        color: p.countertop?.color || "#e7e5dd",
        gloss: !!p.countertop?.gloss,
      },
    });
  for (const f of model.fixtures || []) {
    const seg = countertopSegmentForModule(segments, f.targetModuleId);
    const obj = model.objects.find((o: any) => o.id === f.id);
    if (seg && obj) {
      obj.center = [
        obj.center[0],
        seg.elevation + seg.thickness + 3,
        obj.center[2],
      ];
      f.y = obj.center[1];
      f.countertopSegmentId = seg.id;
    }
  }
  for (const module of p.modules || []) {
    if (module.type === "drawer") continue;
    for (const part of model.parts.filter(
      (x: any) => x.moduleId === module.id && x.role === "front" && x.hingeSide,
    )) {
      const m = String(part.id).match(/-F(\d+)$/),
        i = m ? Math.max(0, Number(m[1]) - 1) : 0,
        ov = (module.frontOverrides || [])[i] || {},
        count = hingeCountForHeight(part.v, ov.hingeCount);
      part.hingeCount = count;
      const obj = model.objects.find((x: any) => x.id === part.id);
      if (obj) obj.hingeCount = count;
    }
  }
  const requiredWasherClearance = Math.max(
    5,
    Math.min(60, Number(p.defaults?.washerClearance) || 10),
  );
  for (const washer of model.modules.filter((m: any) => m.type === "washer")) {
    const segment = countertopSegmentForModule(segments, washer.id);
    if (!segment) continue;
    const clearance = Math.round(
      segment.elevation - (washer.y + washer.height),
    );
    if (clearance < requiredWasherClearance) {
      const message = `Над стиральной машиной ${washer.id} зазор ${clearance} мм; рекомендуется не менее ${requiredWasherClearance} мм.`;
      model.issues ??= [];
      model.issues.push({
        code: "washer-countertop-clearance",
        severity: "warning",
        moduleId: washer.id,
        clearance,
        required: requiredWasherClearance,
        message,
      });
      model.warnings ??= [];
      model.warnings.push(message);
    }
  }
  model.warnings = [...new Set(model.warnings || [])];
  return model;
}
export function updateModule(
  project: any,
  id: string,
  patch: Record<string, unknown>,
) {
  const p = clone(project),
    m = p.modules.find((x: any) => x.id === id);
  if (m) {
    Object.assign(m, patch);
    if ("applianceBay" in patch && ["washer", "dishwasher"].includes(String(m.applianceBay))) {
      const defaults = applianceDefaults(m.applianceBay);
      for (const [key, value] of Object.entries({
        applianceWidth: defaults.width,
        applianceHeight: defaults.height,
        applianceDepth: defaults.depth,
        applianceSideClearance: defaults.sideClearance,
      }))
        if (!(key in patch)) m[key] = value;
      const measurements = applianceBayMeasurements(m, {
        ...p.defaults,
        countertopDepth: p.countertop?.depth,
      });
      if (m.type === "cornerBaseBlind")
        m.cornerOpening = Math.max(
          Number(m.cornerOpening) || 450,
          measurements.requiredOpeningWidth,
        );
      else
        m.width = Math.max(Number(m.width) || 0, measurements.requiredOuterWidth);
    }
    if ("bodyMaterialId" in patch)
      Object.assign(m, materialSelectionPatch("body", String(m.bodyMaterialId)));
    if ("frontMaterialId" in patch)
      Object.assign(m, materialSelectionPatch("front", String(m.frontMaterialId)));
    if ("bodySubstrate" in patch && !("bodyMaterialId" in patch)) {
      Object.assign(
        m,
        materialSelectionPatch(
          "body",
          inferMaterialProductId({ role: "body", substrate: m.bodySubstrate }),
        ),
      );
    }
    if (
      ("frontSubstrate" in patch || "gloss" in patch) &&
      !("frontMaterialId" in patch)
    ) {
      const current = MATERIAL_PRODUCTS[m.frontMaterialId];
      const keepPremiumGloss =
        patch.gloss === true && current?.id === "acrylicHighGlossMdf18";
      Object.assign(
        m,
        materialSelectionPatch(
          "front",
          keepPremiumGloss
            ? current.id
            : inferMaterialProductId({
                role: "front",
                substrate: m.frontSubstrate,
                gloss: m.gloss,
              }),
        ),
      );
    }
    if (
      ["cornerBaseDiagonal", "cornerBaseL"].includes(m.type) &&
      "cornerRunDepth" in patch
    ) {
      m.cornerWingDepth = Number(m.cornerRunDepth) || 600;
    }
    if (
      m.type === "cornerBaseDiagonal" &&
      ("width" in patch || "depth" in patch)
    ) {
      const side = "width" in patch ? Number(m.width) : Number(m.depth);
      if (Number.isFinite(side)) {
        m.width = side;
        m.depth = side;
      }
    }
  }
  return p;
}
export function updateDoorOverride(
  project: any,
  moduleId: string,
  index: number,
  patch: Record<string, unknown>,
) {
  const p = clone(project),
    m = p.modules.find((x: any) => x.id === moduleId);
  if (!m) return p;
  m.frontOverrides ??= [];
  m.frontOverrides[index] = { ...(m.frontOverrides[index] || {}), ...patch };
  return p;
}
export function updatePartEdges(
  project: any,
  moduleId: string,
  partId: string,
  edges: number[],
) {
  const p = clone(project),
    m = p.modules.find((x: any) => x.id === moduleId);
  if (!m || !Array.isArray(edges) || edges.length !== 4) return p;
  const key = String(partId).replace(/^M\d+-/, "");
  m.edgeOverrides = {
    ...(m.edgeOverrides || {}),
    [key]: edges.map((v) => Math.max(0, Number(v) || 0)),
  };
  return p;
}
export function updateAllEdgeThickness(project: any, thickness = 0.2) {
  const p = clone(project);
  p.defaults = { ...(p.defaults || {}), bodyEdge: thickness, frontEdge: thickness };
  for (const module of p.modules || []) {
    module.bodyEdge = thickness;
    module.frontEdge = thickness;
    for (const [key, edges] of Object.entries(module.edgeOverrides || {})) {
      if (Array.isArray(edges) && edges.length === 4)
        module.edgeOverrides[key] = edges.map((value: any) => Number(value) > 0 ? thickness : 0);
    }
  }
  return p;
}
export function updateProjectDefaults(
  project: any,
  patch: Record<string, unknown>,
) {
  const p = clone(project);
  p.defaults = { ...(p.defaults || defaultStyle()), ...patch };
  if ("bodyMaterialId" in patch)
    Object.assign(
      p.defaults,
      materialSelectionPatch("body", String(p.defaults.bodyMaterialId)),
    );
  if ("frontMaterialId" in patch)
    Object.assign(
      p.defaults,
      materialSelectionPatch("front", String(p.defaults.frontMaterialId)),
    );
  if ("gloss" in patch && !("frontMaterialId" in patch)) {
    const keepPremiumGloss =
      p.defaults.gloss &&
      p.defaults.frontMaterialId === "acrylicHighGlossMdf18";
    if (!keepPremiumGloss)
      Object.assign(
        p.defaults,
        materialSelectionPatch(
          "front",
          inferMaterialProductId({
            role: "front",
            substrate: p.defaults.frontSubstrate,
            gloss: p.defaults.gloss,
          }),
        ),
      );
  }
  return p;
}
export function applyProjectFinish(project: any) {
  return applyDefaultFinishToModules(project);
}
export function applyMaterialPreset(
  project: any,
  presetId: keyof typeof COST_PRESETS,
) {
  const preset = COST_PRESETS[presetId];
  if (!preset) return clone(project);
  const p = updateProjectDefaults(project, preset);
  for (const module of p.modules || []) {
    if (isDisplayOnlyType(module.type)) continue;
    Object.assign(
      module,
      materialSelectionPatch("body", preset.bodyMaterialId),
      materialSelectionPatch("front", preset.frontMaterialId),
    );
  }
  return p;
}
export function updateCountertop(project: any, patch: Record<string, unknown>) {
  const p = clone(project);
  Object.assign(p.countertop, patch);
  return p;
}
export function updateUi(project: any, patch: Record<string, unknown>) {
  const p = clone(project);
  p.ui = { ...(p.ui || {}), ...patch };
  return p;
}
export function deleteModule(project: any, id: string) {
  const p = clone(project);
  p.modules = p.modules.filter((m: any) => m.id !== id);
  p.fixtures = (p.fixtures || []).filter((f: any) => f.targetModuleId !== id);
  return p;
}
export function duplicateModule(project: any, id: string) {
  const p = clone(project),
    m = p.modules.find((x: any) => x.id === id);
  if (!m) return p;
  const c = clone(m);
  c.id = newId();
  c.offsetX = (c.offsetX || 0) + 40;
  p.modules.push(c);
  return p;
}
export function addModule(project: any, type: string) {
  const p = clone(project),
    m = createModule(type);
  if (!isDisplayOnlyType(type)) {
    const d = p.defaults || defaultStyle();
    Object.assign(m, {
      frontDecor: d.frontDecor,
      frontColor: d.frontColor || DECORS[d.frontDecor]?.color || m.frontColor,
      bodyDecor: d.bodyDecor,
      bodyColor: d.bodyColor || DECORS[d.bodyDecor]?.color || m.bodyColor,
      ...materialSelectionPatch(
        "body",
        d.bodyMaterialId ||
          inferMaterialProductId({ role: "body", substrate: d.bodySubstrate }),
      ),
      ...materialSelectionPatch(
        "front",
        d.frontMaterialId ||
          inferMaterialProductId({
            role: "front",
            substrate: d.frontSubstrate,
            gloss: d.gloss,
          }),
      ),
      frontStyle: d.frontStyle,
      handleStyle: d.handleStyle,
      legStyle: d.legStyle,
      board: d.board,
      frontThickness: d.frontThickness,
      back: d.back,
      bodyEdge: d.bodyEdge,
      frontEdge: d.frontEdge,
      bodyEdgeType: d.bodyEdgeType,
      frontEdgeType: d.frontEdgeType,
      bottomMode: d.bottomMode,
      topMode: d.topMode,
      backMode: d.backMode,
      shelfCount: type === "drawer" ? 0 : d.shelfCount,
    });
  }
  m.frontOverrides = [];
  p.modules.push(m);
  return { project: p, id: m.id };
}
export function addFixture(
  project: any,
  type: "sink" | "hob",
  targetModuleId: string,
) {
  const p = clone(project),
    f = createFixture(type, targetModuleId);
  if (type === "hob") {
    f.width = 300;
    f.depth = 520;
  }
  p.fixtures ??= [];
  p.fixtures.push(f);
  return { project: p, id: f.id };
}
export function updateFixture(
  project: any,
  id: string,
  patch: Record<string, unknown>,
) {
  const p = clone(project),
    f = (p.fixtures || []).find((x: any) => x.id === id);
  if (f) Object.assign(f, patch);
  return p;
}
export function removeFixture(project: any, id: string) {
  const p = clone(project);
  p.fixtures = (p.fixtures || []).filter((f: any) => f.id !== id);
  return p;
}
export function snapModuleAbsolute(
  project: any,
  id: string,
  xAbs: number,
  zAbs: number,
) {
  const p = clone(project),
    model = deriveModel(p),
    m = model.modules.find((x: any) => x.id === id),
    src = p.modules.find((x: any) => x.id === id);
  if (!m || !src) return p;
  const proposedCenterX = xAbs + m.width / 2,
    proposedCenterZ = zAbs + m.depth / 2,
    policy = modulePlacementPolicy(m.type),
    pose = resolvePlacementPose({
      roomWidth: p.room.width,
      roomDepth: p.room.depth,
      moduleWidth: m.width,
      moduleDepth: m.depth,
      rotationY: m.rotationY || 0,
      centerX: proposedCenterX,
      centerZ: proposedCenterZ,
      autoRotate: p.ui?.autoRotateToWall !== false,
      snapToWall: policy.snapToWall,
      wallThreshold: 180,
      grid: 50,
      layer: policy.layer,
      neighbors: model.modules
        .filter((n: any) => n.id !== id)
        .map((n: any) => ({
          width: n.width,
          depth: n.depth,
          rotationY: n.rotationY || 0,
          centerX: n.x + n.width / 2,
          centerZ: n.z + n.depth / 2,
          layer: modulePlacementPolicy(n.type).layer,
        })),
    }),
    targetX = pose.centerX - m.width / 2,
    targetZ = pose.centerZ - m.depth / 2,
    nominal = m.x - (src.offsetX || 0);
  src.rotationY = pose.rotationY;
  src.offsetX = Math.round(targetX - nominal);
  src.offsetZ = Math.round(targetZ);
  return p;
}
export function rotateModule(project: any, id: string, rotationY: number) {
  const p = clone(project),
    model = deriveModel(p),
    m = model.modules.find((x: any) => x.id === id),
    src = p.modules.find((x: any) => x.id === id);
  if (!m || !src) return p;
  const centerX = m.x + m.width / 2,
    centerZ = m.z + m.depth / 2,
    pose = clampPoseToRoom({
      roomWidth: p.room.width,
      roomDepth: p.room.depth,
      moduleWidth: m.width,
      moduleDepth: m.depth,
      rotationY: normalizeRotation(rotationY),
      centerX,
      centerZ,
      grid: 1,
    }),
    targetX = pose.centerX - m.width / 2,
    targetZ = pose.centerZ - m.depth / 2,
    nominal = m.x - (src.offsetX || 0);
  src.rotationY = pose.rotationY;
  src.offsetX = Math.round(targetX - nominal);
  src.offsetZ = Math.round(targetZ);
  return p;
}
export function loadEditorProject() {
  try {
    const next = localStorage.getItem("kitchen-cad-three-v1"),
      old =
        localStorage.getItem("kitchen-cad-project-v4") ||
        localStorage.getItem("kitchen-cad-project-v3");
    return next
      ? decodeEditorProject(next)
      : old
        ? decodeEditorProject(old)
        : createEditorProject();
  } catch {
    return createEditorProject();
  }
}
export function decodeEditorProject(text: string) {
  return migrateLegacyWorkshopQuote(normalizeEditorProject(decodeProject(text)));
}
export function saveEditorProject(project: any): boolean {
  try {
    validateProject(clone(project));
    localStorage.setItem("kitchen-cad-three-v1", JSON.stringify(project));
    return true;
  } catch {
    return false;
  }
}
