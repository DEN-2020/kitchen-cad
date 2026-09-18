import { useEffect, useMemo, useRef, useState } from "react";
import { KitchenScene } from "./scene/KitchenScene";
import { NumberField } from "./ui/NumberField";
import { useViewport } from "./ui/useViewport";
import {
  BackIcon,
  ApplianceIcon,
  CatalogGlyph,
  CatalogIcon,
  CloseIcon,
  CopyIcon,
  ConstructionIcon,
  CostIcon,
  DownloadIcon,
  DepthIcon,
  DoorsIcon,
  EditIcon,
  HomeIcon,
  HeightIcon,
  ModuleDimensionsIcon,
  MaterialIcon,
  OrbitIcon,
  PartsIcon,
  PrintIcon,
  ProjectIcon,
  RoomDimensionsIcon,
  ResetIcon,
  SearchIcon,
  SettingsIcon,
  TrashIcon,
  RedoIcon,
  UndoIcon,
  UploadIcon,
} from "./ui/Icons";
import {
  downloadCsv,
  downloadJson,
  downloadPng,
  printReport,
} from "./export/report";
import {
  CATALOG_GROUPS,
  DECORS,
  FRONT_STYLES,
  HANDLE_STYLES,
  LEG_STYLES,
  MATERIAL_PRODUCTS,
  isDisplayOnlyType,
  isWallMountedType,
  materialProductLabel,
  materialProductsForRole,
} from "../src/catalog/materials.js";
import {
  addFixture,
  addModule,
  applyMaterialPreset,
  applyProjectFinish,
  deleteModule,
  decodeEditorProject,
  deriveModel,
  duplicateModule,
  loadEditorProject,
  removeFixture,
  saveEditorProject,
  snapModuleAbsolute,
  rotateModule,
  updateCountertop,
  updateDoorOverride,
  updatePartEdges,
  updateFixture,
  updateModule,
  updateProjectDefaults,
  updateUi,
  type DimensionDetail,
  type Selection,
  type ViewMode,
} from "./domain/core";
import {
  frontLabel,
  handleLabel,
  legLabel,
  moduleLabel,
  tr,
  type Lang,
} from "./i18n";
import { estimateProjectCost, COST_PRESETS } from "../src/core/cost.js";
import { countPartsInOffcuts } from "../src/core/sheet-layout.js";
import { applianceBayMeasurements } from "../src/core/appliance-bay.js";
import { auditProductionReadiness } from "../src/core/production-audit.js";
import { useProjectHistory } from "./state/useProjectHistory";
import { ProjectSyncPanel } from "./sync/ProjectSyncPanel";
import { useProjectSync } from "./sync/useProjectSync";

type Panel =
  | "selection"
  | "room"
  | "catalog"
  | "project"
  | "cost"
  | "settings"
  | "parts"
  | "print"
  | null;
type SaveStatus = "saving" | "saved" | "error";
type ModuleTab = "geometry" | "construction" | "facade" | "materials" | "equipment";
type ImportNotice = { kind: "success" | "error"; message: string } | null;
const sizeText = (m: any) => `${m.width} × ${m.height} × ${m.depth} мм`;
const moduleDisplayLabel = (lang: Lang, module: any) => {
  if (module?.applianceBay === "washer")
    return lang === "ru"
      ? "Ниша под стиральную машину"
      : lang === "ar"
        ? "فتحة غسالة ملابس"
        : "Washing machine bay";
  if (module?.applianceBay === "dishwasher")
    return lang === "ru"
      ? "Ниша под посудомоечную машину"
      : lang === "ar"
        ? "فتحة غسالة صحون"
        : "Dishwasher bay";
  return moduleLabel(lang, module?.type);
};
const fixtureTargetTypes = new Set([
  "base",
  "drawer",
  "sink",
  "cornerBase",
  "cornerBaseBlind",
  "cornerBaseDiagonal",
  "cornerBaseL",
  "washer",
  "dishwasher",
]);
const roomElement = (t: string) => t === "door" || t === "window";

function withoutFrontMaterialOverrides(overrides: any[] = []) {
  const inherited = overrides.map((override) => {
    const { decor: _decor, color: _color, ...rest } = override || {};
    return rest;
  });
  while (
    inherited.length &&
    Object.keys(inherited[inherited.length - 1]).length === 0
  )
    inherited.pop();
  return inherited;
}

function withoutFrontHingeOverrides(overrides: any[] = []) {
  const inherited = overrides.map((override) => {
    const { hingeSide: _hingeSide, ...rest } = override || {};
    return rest;
  });
  while (
    inherited.length &&
    Object.keys(inherited[inherited.length - 1]).length === 0
  )
    inherited.pop();
  return inherited;
}

function decorPatternLabel(lang: Lang, pattern: string) {
  const labels: Record<string, Record<Lang, string>> = {
    solid: { ru: "однотонный", en: "solid", ar: "لون موحّد" },
    wood: { ru: "текстура дерева", en: "wood grain", ar: "نسيج خشبي" },
    stone: { ru: "текстура камня", en: "stone texture", ar: "نسيج حجري" },
    speckle: { ru: "крапление", en: "speckled", ar: "منقّط" },
  };
  return labels[pattern]?.[lang] || pattern;
}

function DecorPicker({
  label,
  value,
  color,
  lang,
  onChange,
  onColorChange,
}: {
  label: string;
  value: string;
  color: string;
  lang: Lang;
  onChange: (decor: string) => void;
  onColorChange: (color: string) => void;
}) {
  const railRef = useRef<HTMLDivElement>(null),
    selectedDecor = (DECORS as any)[value] || Object.values(DECORS)[0];
  useEffect(() => {
    railRef.current
      ?.querySelector<HTMLElement>('[aria-selected="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  return (
    <div className="decorPicker">
      <div className="decorPickerHead">
        <span>{label}</span>
        <strong>
          {selectedDecor.name} · {decorPatternLabel(lang, selectedDecor.pattern)}
        </strong>
      </div>
      <div
        ref={railRef}
        className="decorSwatches"
        role="listbox"
        aria-label={label}
      >
        {Object.entries(DECORS).map(([key, decor]: any) => (
          <button
            key={key}
            type="button"
            role="option"
            aria-selected={value === key}
            className={value === key ? "active" : ""}
            aria-label={`${decor.name}, ${decorPatternLabel(lang, decor.pattern)}`}
            title={`${decor.name} · ${decorPatternLabel(lang, decor.pattern)}`}
            data-pattern={decor.pattern}
            onClick={() => onChange(key)}
          >
            <span
              className="decorSample"
              style={{ backgroundColor: decor.color }}
            />
            <small>{decor.name}</small>
          </button>
        ))}
      </div>
      <label className="decorTint">
        <span>
          {lang === "ru" ? "Оттенок" : lang === "ar" ? "درجة اللون" : "Tint"}
        </span>
        <span className="decorTintControl">
          <input
            type="color"
            value={color}
            aria-label={`${label}: ${lang === "ru" ? "оттенок" : "tint"}`}
            onChange={(event) => onColorChange(event.target.value)}
          />
          <code>{color.toUpperCase()}</code>
          <button
            type="button"
            disabled={color.toLowerCase() === selectedDecor.color.toLowerCase()}
            aria-label={
              lang === "ru"
                ? `Вернуть исходный цвет ${selectedDecor.name}`
                : `Reset ${selectedDecor.name} color`
            }
            title={lang === "ru" ? "Вернуть цвет образца" : "Reset swatch color"}
            onClick={() => onColorChange(selectedDecor.color)}
          >
            <ResetIcon size={16} />
          </button>
        </span>
      </label>
    </div>
  );
}

function MaterialProductSelect({
  label,
  role,
  value,
  lang,
  onChange,
}: {
  label: string;
  role: "body" | "front";
  value: string;
  lang: Lang;
  onChange: (value: string) => void;
}) {
  const product = (MATERIAL_PRODUCTS as any)[value];
  return (
    <label className="field materialProductField">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {materialProductsForRole(role).map((option: any) => (
          <option key={option.id} value={option.id}>
            {materialProductLabel(option, lang)}
          </option>
        ))}
      </select>
      {product && (
        <small>
          {product.sheetWidth}×{product.sheetHeight}×{product.thickness} мм ·{" "}
          {product.finish === "gloss"
            ? lang === "ru"
              ? "глянец"
              : "gloss"
            : lang === "ru"
              ? "матовый"
              : "matte"}
        </small>
      )}
    </label>
  );
}

function SheetPlan({ batch, role, lang }: { batch: any; role: string; lang: Lang }) {
  const [sampleWidth, setSampleWidth] = useState(600);
  const [sampleHeight, setSampleHeight] = useState(720);
  const plan = batch.stockPlan;
  if (!plan) return null;
  const freeRects = plan.sheets.flatMap((sheet: any) => sheet.usefulOffcuts || []);
  const wood = (DECORS as any)[batch.decor]?.pattern === "wood";
  const fitCount = countPartsInOffcuts(
    freeRects,
    sampleWidth,
    sampleHeight,
    !wood,
  );
  return (
    <details className="sheetPlan">
      <summary>
        <span
          className="costStockColor"
          style={{ background: batch.color || "#87949a" }}
        />
        <span className="sheetPlanTitle">
          <b>{role} · {batch.materialName}</b>
          <small>
            {(DECORS as any)[batch.decor]?.name || batch.decor} · {batch.thickness} мм · {batch.sheetWidth}×{batch.sheetHeight}
          </small>
        </span>
        <strong>{batch.sheets} {lang === "ru" ? "л." : "sheets"}</strong>
      </summary>
      <div className="sheetMetrics">
        <span><b>{plan.usedArea.toFixed(2)} м²</b>{lang === "ru" ? "детали" : "parts"}</span>
        <span><b>{plan.reusableArea.toFixed(2)} м²</b>{lang === "ru" ? "полезный остаток" : "usable offcut"}</span>
        <span><b>{Math.round(plan.utilization * 100)}%</b>{lang === "ru" ? "использовано" : "utilized"}</span>
      </div>
      <div className="sheetMaps">
        {plan.sheets.map((sheet: any) => (
          <div className="sheetMapCard" key={sheet.index}>
            <div><b>{lang === "ru" ? "Лист" : "Sheet"} {sheet.index}</b><small>{Math.round(sheet.utilization * 100)}%</small></div>
            <svg
              viewBox={`0 0 ${sheet.width} ${sheet.height}`}
              role="img"
              aria-label={`${lang === "ru" ? "Раскрой листа" : "Sheet layout"} ${sheet.index}`}
            >
              <rect x="0" y="0" width={sheet.width} height={sheet.height} className="sheetStock" />
              {sheet.placements.map((item: any, index: number) => (
                <g key={`${item.id}-${index}`}>
                  <rect x={item.x} y={item.y} width={item.width} height={item.height} className="sheetPart" />
                  {item.width > 230 && item.height > 100 && (
                    <text x={item.x + item.width / 2} y={item.y + item.height / 2}>{item.width}×{item.height}</text>
                  )}
                </g>
              ))}
            </svg>
            <small>
              {sheet.usefulOffcuts?.length
                ? `${lang === "ru" ? "Остатки" : "Offcuts"}: ${sheet.usefulOffcuts.slice(0, 3).map((rect: any) => `${Math.round(rect.width)}×${Math.round(rect.height)}`).join(", ")}${sheet.usefulOffcuts.length > 3 ? "…" : ""}`
                : lang === "ru" ? "Полезных остатков нет" : "No useful offcuts"}
            </small>
          </div>
        ))}
      </div>
      <div className="offcutFit">
        <span>{lang === "ru" ? "Что ещё войдёт в остатки" : "What still fits"}</span>
        <label><input type="number" min="1" value={sampleWidth} onChange={(event) => setSampleWidth(Math.max(1, Number(event.target.value) || 1))} /><small>мм</small></label>
        <span>×</span>
        <label><input type="number" min="1" value={sampleHeight} onChange={(event) => setSampleHeight(Math.max(1, Number(event.target.value) || 1))} /><small>мм</small></label>
        <strong>≈ {fitCount} шт.</strong>
      </div>
      <p className="note">
        {lang === "ru"
          ? `По площади с запасом ${batch.reserveSheets} л.; раскладка рекомендует ${batch.sheets} л. Закупка целыми листами ≈ ${Math.round(batch.purchaseCost).toLocaleString()} EGP. Пропил ${plan.kerf} мм, обрезка края ${plan.trim} мм${wood ? ", направление текстуры зафиксировано" : ""}.`
          : `Area reserve: ${batch.reserveSheets} sheets; nesting recommends ${batch.sheets}. Whole-sheet purchase ≈ ${Math.round(batch.purchaseCost).toLocaleString()} EGP. Kerf ${plan.kerf} mm, edge trim ${plan.trim} mm${wood ? ", grain direction locked" : ""}.`}
      </p>
    </details>
  );
}

export function App() {
  useViewport();
  const { project, setProject, undo, redo, canUndo, canRedo } =
    useProjectHistory<any>(() => loadEditorProject());
  const [selection, setSelection] = useState<Selection>(null),
    [panel, setPanel] = useState<Panel>(null),
    [focusId, setFocusId] = useState<string | null>(null),
    [detail, setDetail] = useState<DimensionDetail>("none"),
    [fixtureTargetId, setFixtureTargetId] = useState(""),
    [saveStatus, setSaveStatus] = useState<SaveStatus>("saving"),
    [importNotice, setImportNotice] = useState<ImportNotice>(null),
    [catalogQuery, setCatalogQuery] = useState(""),
    [catalogSearchOpen, setCatalogSearchOpen] = useState(false),
    [moduleTab, setModuleTab] = useState<ModuleTab>("geometry"),
    [cameraResetKey, setCameraResetKey] = useState(0);
  const importInputRef = useRef<HTMLInputElement>(null),
    projectRef = useRef(project);
  projectRef.current = project;
  const projectSync = useProjectSync(project);
  const model = useMemo(() => deriveModel(project), [project]);
  const cost = useMemo(
    () => estimateProjectCost(project, model),
    [project, model],
  );
  const productionAudit = useMemo(
    () => auditProductionReadiness(project, model, cost),
    [project, model, cost],
  );
  const furnitureModules = model.modules.filter(
      (module: any) => !isDisplayOnlyType(module.type),
    ),
    furnitureModuleCount = furnitureModules.length,
    activeCostPreset =
      Object.entries(COST_PRESETS).find(
        ([, preset]: [string, any]) =>
          furnitureModules.length > 0 &&
          furnitureModules.every(
            (module: any) =>
              module.bodyMaterialId === preset.bodyMaterialId &&
              module.frontMaterialId === preset.frontMaterialId,
          ),
      )?.[0] || null;
  const selectedModuleId =
    selection?.kind === "module"
      ? selection.id
      : selection?.kind === "part"
        ? selection.moduleId
        : null;
  const selectedModule = selectedModuleId
      ? model.modules.find((m: any) => m.id === selectedModuleId)
      : null,
    selectedPart =
      selection?.kind === "part"
        ? model.parts.find((p: any) => p.id === selection.id)
        : null,
    parts = selectedModuleId
      ? model.parts.filter((p: any) => p.moduleId === selectedModuleId)
      : [],
    selectedFixtures = selectedModuleId
      ? (project.fixtures || []).filter((fixture: any) => fixture.targetModuleId === selectedModuleId)
      : [],
    selectedFixture = selectedFixtures[0] || null,
    applianceBayEligible = !!selectedModule && ["base", "sink", "cornerBaseBlind"].includes(selectedModule.type),
    applianceBayActive = !!selectedModule && ["washer", "dishwasher"].includes(selectedModule.applianceBay),
    applianceMeasurements = selectedModule
      ? applianceBayMeasurements(selectedModule, {
          ...project.defaults,
          countertopDepth: project.countertop?.depth,
        })
      : null,
    applianceRequiredClearance = applianceMeasurements?.topClearance || 0,
    applianceAvailableWidth = applianceMeasurements?.openingWidth || 0,
    applianceAvailableHeight = applianceMeasurements?.availableHeight || 0,
    applianceAvailableDepth = applianceMeasurements?.availableDepth || 0,
    applianceWorktopDrop =
      selectedFixture?.type === "hob"
        ? Math.max(
            0,
            Number(selectedFixture.installationHeight || 51) -
              Number(project.countertop?.thickness || 20),
          )
        : 0,
    applianceFits =
      !applianceBayActive ||
      (!!applianceMeasurements?.fits &&
        selectedFixture?.type !== "sink" &&
        Number(selectedModule?.applianceHeight || 0) +
          applianceRequiredClearance +
          applianceWorktopDrop <=
          applianceAvailableHeight);
  const floorTargets = model.modules.filter((m: any) =>
    fixtureTargetTypes.has(m.type),
  );
  const dark = project.ui?.theme !== "light",
    lang = (
      ["ru", "en", "ar"].includes(project.ui?.language)
        ? project.ui.language
        : "ru"
    ) as Lang,
    t = (key: any) => tr(lang, key),
    view = (project.ui?.view || "3d") as ViewMode,
    normalizedCatalogQuery = catalogQuery.trim().toLocaleLowerCase(),
    catalogGroups = CATALOG_GROUPS.map((group: any) => {
      const groupName =
        lang === "ar" ? group.ar || group.en : lang === "en" ? group.en : group.ru;
      const groupMatches = groupName
        .toLocaleLowerCase()
        .includes(normalizedCatalogQuery);
      return {
        ...group,
        types: group.types.filter(
          (type: string) =>
            !normalizedCatalogQuery ||
            groupMatches ||
            moduleLabel(lang, type)
              .toLocaleLowerCase()
              .includes(normalizedCatalogQuery),
        ),
      };
    }).filter((group: any) => group.types.length);
  const saveText =
    saveStatus === "saving"
      ? lang === "ru"
        ? "Сохраняю…"
        : lang === "ar"
          ? "جارٍ الحفظ…"
          : "Saving…"
      : saveStatus === "error"
        ? lang === "ru"
          ? "Не сохранено"
          : lang === "ar"
            ? "لم يتم الحفظ"
            : "Not saved"
        : lang === "ru"
          ? "Сохранено"
          : lang === "ar"
            ? "تم الحفظ"
            : "Saved";
  const frontsEnabled = selectedModule
      ? selectedModule.type === "drawer" || (selectedModule.frontEnabled !== false && !applianceBayActive)
      : false,
    actualDoorCount = selectedModule && frontsEnabled
    ? ["cornerBaseBlind", "cornerWallBlind"].includes(selectedModule.type)
      ? Math.max(1, Math.min(2, selectedModule.doorCount || 1))
      : ["cornerBaseL", "cornerWallL"].includes(selectedModule.type)
        ? 2
        : selectedModule.type === "drawer"
          ? selectedModule.drawerCount || 3
          : selectedModule.doorCount > 0
            ? selectedModule.doorCount
            : selectedModule.width > 650
              ? 2
              : 1
    : 0,
    selectedFrontParts = parts.filter((part: any) => part.role === "front");
  useEffect(() => setModuleTab("geometry"), [selectedModuleId]);
  useEffect(() => {
    setSaveStatus("saving");
    const timer = window.setTimeout(() => {
      setSaveStatus(saveEditorProject(project) ? "saved" : "error");
    }, 250);
    return () => window.clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    const flushSave = () => saveEditorProject(projectRef.current);
    window.addEventListener("pagehide", flushSave);
    return () => window.removeEventListener("pagehide", flushSave);
  }, []);
  useEffect(() => {
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", dark ? "#111a1f" : "#f6f9fa");
  }, [dark]);
  useEffect(() => {
    if (
      !fixtureTargetId ||
      !floorTargets.some((m: any) => m.id === fixtureTargetId)
    )
      setFixtureTargetId(floorTargets[0]?.id || "");
  }, [fixtureTargetId, model.modules.length]);
  const select = (s: Selection) => {
    setSelection(s);
    if (!s) {
      setPanel(null);
      setFocusId(null);
      setDetail("none");
    }
  };
  const patchModule = (patch: any) =>
      selectedModuleId &&
      setProject((p: any) => updateModule(p, selectedModuleId, patch)),
    patchCost = (patch: any) =>
      setProject((p: any) => ({
        ...p,
        costing: { ...(p.costing || {}), ...patch },
      })),
    patchMaterialPrice = (id: string, price: number) =>
      patchCost({
        materialPrices: { ...cost.settings.materialPrices, [id]: price },
      }),
    patchHardwarePrice = (id: string, price: number) =>
      patchCost({
        hardwarePrices: { ...cost.settings.hardwarePrices, [id]: price },
      }),
    applyCostPreset = (id: keyof typeof COST_PRESETS) =>
      setProject((p: any) => applyMaterialPreset(p, id)),
    patchRoom = (patch: any) =>
      setProject((p: any) => ({ ...p, room: { ...p.room, ...patch } })),
    patchUi = (patch: any) => setProject((p: any) => updateUi(p, patch)),
    guardProductionExport = (action: (draft: boolean) => void) => {
      if (
        productionAudit.ready ||
        window.confirm(
          lang === "ru"
            ? `Проект содержит блокирующие проверки: ${productionAudit.blockers.length}. Экспортировать как черновик?`
            : `The project has ${productionAudit.blockers.length} blocking checks. Export a draft anyway?`,
        )
      )
        action(!productionAudit.ready);
    };
  const remove = () => {
      if (selectedModuleId) {
        setProject((p: any) => deleteModule(p, selectedModuleId));
        select(null);
      }
    },
    duplicate = () =>
      selectedModuleId &&
      setProject((p: any) => duplicateModule(p, selectedModuleId)),
    moveModule = (id: string, x: number, z: number) =>
      setProject((p: any) => snapModuleAbsolute(p, id, x, z)),
    countertopLength = (model.countertopSegments || []).reduce(
      (sum: number, segment: any) => sum + segment.length,
      0,
    );
  const selectionTitle =
      selection?.kind === "countertop"
        ? t("countertop")
        : selectedPart
          ? selectedPart.name
          : selectedModule
            ? moduleDisplayLabel(lang, selectedModule)
            : lang === "ru"
              ? "Объект"
              : "Object",
    selectionSize =
      selection?.kind === "countertop"
        ? `${model.countertopSegments?.length || 0} сегм. · ${countertopLength} мм`
        : selectedPart
          ? `${selectedPart.u} × ${selectedPart.v} × ${selectedPart.thickness} мм`
          : selectedModule
            ? sizeText(selectedModule)
            : "";
  const openPanel = (p: Panel) => setPanel((cur) => (cur === p ? null : p)),
    enterFocus = () => {
      if (!selectedModule || isDisplayOnlyType(selectedModule.type)) return;
      setFocusId(selectedModule.id);
      setSelection({ kind: "module", id: selectedModule.id });
      setDetail("none");
      setPanel("selection");
      setCameraResetKey((value) => value + 1);
      patchUi({ view: "3d" });
    },
    leaveFocus = () => {
      setFocusId(null);
      setDetail("none");
      setPanel(null);
      if (selectedModuleId)
        setSelection({ kind: "module", id: selectedModuleId });
    },
    showParts = () => {
      if (!selectedModule) return;
      setSelection({ kind: "module", id: selectedModule.id });
      setDetail("selected");
      setPanel("parts");
    };
  const addType = (type: string) => {
      const r = addModule(project, type);
      setProject(r.project);
      setSelection({ kind: "module", id: r.id });
      setPanel("selection");
    },
    selectedFurniture =
      selectedModule && !isDisplayOnlyType(selectedModule.type),
    panelTitle =
      panel === "room"
        ? t("room")
        : panel === "catalog"
          ? t("catalog")
          : panel === "project"
            ? t("project")
            : panel === "cost"
              ? lang === "ru"
                ? "Смета"
                : lang === "ar"
                  ? "التكلفة"
                  : "Cost"
              : panel === "settings"
                ? t("settings")
                : panel === "parts"
                  ? t("parts")
                  : panel === "print"
                    ? t("print")
                    : selectionTitle,
    addBuiltIn = (type: "sink" | "hob") => {
      if (!fixtureTargetId) return;
      const r = addFixture(project, type, fixtureTargetId);
      setProject(r.project);
    },
    addBlindCornerSink = () => {
      if (
        !selectedModule ||
        selectedModule.type !== "cornerBaseBlind" ||
        (project.fixtures || []).some(
          (fixture: any) =>
            fixture.type === "sink" && fixture.targetModuleId === selectedModule.id,
        )
      )
        return;
      const opening = Math.max(
          250,
          Math.min(
            selectedModule.cornerOpening || 450,
            selectedModule.width - 260,
          ),
        ),
        result = addFixture(project, "sink", selectedModule.id),
        fittedWidth = Math.max(100, Math.min(500, opening - 40));
      let next = updateFixture(result.project, result.id, {
        width: fittedWidth,
        offsetX: 0,
        offsetZ: 0,
      });
      next = updateModule(next, selectedModule.id, { shelfCount: 0 });
      setFixtureTargetId(selectedModule.id);
      setProject(next);
    },
    setSelectedWorktopFixture = (type: "none" | "sink" | "hob") => {
      if (!selectedModule) return;
      setProject((current: any) => {
        let next = current;
        for (const fixture of current.fixtures || [])
          if (fixture.targetModuleId === selectedModule.id)
            next = removeFixture(next, fixture.id);
        if (type === "none") return next;
        const result = addFixture(next, type, selectedModule.id);
        next = result.project;
        if (type === "sink" && selectedModule.type === "cornerBaseBlind") {
          const opening = Math.max(
            250,
            Math.min(selectedModule.cornerOpening || 450, selectedModule.width - 260),
          );
          next = updateFixture(next, result.id, {
            width: Math.max(100, Math.min(500, opening - 40)),
            offsetX: 0,
            offsetZ: 0,
          });
          next = updateModule(next, selectedModule.id, { shelfCount: 0 });
        }
        return next;
      });
    },
    decorOptions = Object.entries(DECORS) as [string, any][];
  const wallToggle = (key: string, label: string, defaultOn: boolean) => {
    const on = project.ui?.[key] === undefined ? defaultOn : !!project.ui[key];
    return (
      <button onClick={() => patchUi({ [key]: !on })}>
        <span>{label}</span>
        <b>{on ? t("on") : t("off")}</b>
      </button>
    );
  };
  const resetAfterHistoryNavigation = () => {
      setSelection(null);
      setFocusId(null);
      setDetail("none");
      setImportNotice(null);
      setPanel((current) =>
        current === "selection" || current === "parts" || current === "print"
          ? null
          : current,
      );
    },
    handleUndo = () => {
      if (!canUndo) return;
      undo();
      resetAfterHistoryNavigation();
    },
    handleRedo = () => {
      if (!canRedo) return;
      redo();
      resetAfterHistoryNavigation();
    },
    requestProjectImport = () => {
      setImportNotice(null);
      if (!importInputRef.current) return;
      importInputRef.current.value = "";
      importInputRef.current.click();
    },
    importProjectFile = async (file: File) => {
      try {
        if (file.size > 1_000_000)
          throw new Error("Файл слишком большой (максимум 1 МБ)");
        const imported = decodeEditorProject(await file.text());
        setProject(imported);
        setSelection(null);
        setFocusId(null);
        setDetail("none");
        setPanel("project");
        setImportNotice({
          kind: "success",
          message:
            lang === "ru"
              ? `Проект «${imported.name}» импортирован. При необходимости импорт можно отменить.`
              : lang === "ar"
                ? `تم استيراد المشروع «${imported.name}». يمكن التراجع عن الاستيراد.`
                : `Project “${imported.name}” imported. You can undo the import if needed.`,
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        setImportNotice({
          kind: "error",
          message:
            lang === "ru"
              ? `Не удалось импортировать проект: ${reason}`
              : lang === "ar"
                ? `تعذر استيراد المشروع: ${reason}`
                : `Could not import project: ${reason}`,
        });
      }
    };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable='true']"))
        return;
      const key = event.key.toLowerCase();
      const wantsRedo = key === "y" || (key === "z" && event.shiftKey);
      const wantsUndo = key === "z" && !event.shiftKey;
      if ((wantsUndo && !canUndo) || (wantsRedo && !canRedo)) return;
      if (!wantsUndo && !wantsRedo) return;
      event.preventDefault();
      if (wantsRedo) redo();
      else undo();
      setSelection(null);
      setFocusId(null);
      setDetail("none");
      setImportNotice(null);
      setPanel((current) =>
        current === "selection" || current === "parts" || current === "print"
          ? null
          : current,
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canRedo, canUndo, redo, undo]);
  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={`${dark ? "app dark" : "app"}${focusId ? " focus" : ""}`}
    >
      <header className="topbar">
        <div className="brand">
          Kitchen CAD <span>v3.0</span>
        </div>
        {focusId && selectedModule && (
          <div className="focusTitle">
            <b>{moduleDisplayLabel(lang, selectedModule)}</b>
            <span>{sizeText(selectedModule)}</span>
          </div>
        )}
        <div className="topbarTools">
          <span
            className={`saveIndicator ${saveStatus}`}
            role="status"
            aria-live="polite"
          >
            <span className="saveDot" aria-hidden="true" />
            <span className="saveText">{saveText}</span>
          </span>
          <div
            className="historyControls"
            role="group"
            aria-label={
              lang === "ru"
                ? "История изменений"
                : lang === "ar"
                  ? "سجل التغييرات"
                  : "Edit history"
            }
          >
            <button
              type="button"
              disabled={!canUndo}
              aria-label={
                lang === "ru"
                  ? "Отменить изменение"
                  : lang === "ar"
                    ? "تراجع"
                    : "Undo change"
              }
              title="Ctrl+Z"
              onClick={handleUndo}
            >
              <UndoIcon size={18} />
            </button>
            <button
              type="button"
              disabled={!canRedo}
              aria-label={
                lang === "ru"
                  ? "Повторить изменение"
                  : lang === "ar"
                    ? "إعادة"
                    : "Redo change"
              }
              title="Ctrl+Shift+Z / Ctrl+Y"
              onClick={handleRedo}
            >
              <RedoIcon size={18} />
            </button>
          </div>
        </div>
      </header>
      <main className={panel ? "editor panelOpen" : "editor"}>
        <section className="scenePanel">
          <KitchenScene
            project={project}
            model={model}
            selection={selection}
            setSelection={select}
            focusId={focusId}
            detail={detail}
            view={view}
            cameraResetKey={cameraResetKey}
            ghostEmbeddedAppliance={
              !!focusId && detail === "none" && moduleTab !== "equipment"
            }
            onMoveModule={moveModule}
          />
          <div
            className="viewSwitch"
            role="group"
            aria-label={
              lang === "ru"
                ? "Вид и размеры"
                : lang === "ar"
                  ? "العرض والأبعاد"
                  : "View and dimensions"
            }
          >
            <button
              className={view === "3d" ? "active" : ""}
              aria-pressed={view === "3d"}
              title={
                view === "3d"
                  ? lang === "ru"
                    ? "Сбросить камеру на вид спереди"
                    : "Reset camera to the front"
                  : undefined
              }
              onClick={() => {
                if (view === "3d") setCameraResetKey((value) => value + 1);
                else patchUi({ view: "3d" });
              }}
            >
              3D
            </button>
            <button
              className={view === "front" ? "active" : ""}
              aria-pressed={view === "front"}
              onClick={() => patchUi({ view: "front" })}
            >
              {t("front")}
            </button>
            <button
              className={view === "top" ? "active" : ""}
              aria-pressed={view === "top"}
              onClick={() => patchUi({ view: "top" })}
            >
              {t("top")}
            </button>
            <button
              type="button"
              className={project.ui?.doorsOpen ? "active" : ""}
              aria-label={
                lang === "ru"
                  ? project.ui?.doorsOpen
                    ? "Закрыть все дверцы"
                    : "Открыть все дверцы"
                  : project.ui?.doorsOpen
                    ? "Close all doors"
                    : "Open all doors"
              }
              title={lang === "ru" ? "Все дверцы" : "All doors"}
              aria-pressed={!!project.ui?.doorsOpen}
              onClick={() => patchUi({ doorsOpen: !project.ui?.doorsOpen })}
            >
              <DoorsIcon size={19} />
            </button>
            <button
              type="button"
              className={project.ui?.autoOrbit ? "active" : ""}
              aria-label={
                lang === "ru"
                  ? "Плавное вращение камеры"
                  : "Smooth camera rotation"
              }
              title={lang === "ru" ? "Режим стенда" : "Showroom mode"}
              aria-pressed={!!project.ui?.autoOrbit}
              onClick={() =>
                patchUi({ autoOrbit: !project.ui?.autoOrbit, view: "3d" })
              }
            >
              <OrbitIcon size={19} />
            </button>
            {!focusId && (
              <>
                <button
                  aria-label={
                    lang === "ru"
                      ? "Размеры комнаты"
                      : lang === "ar"
                        ? "أبعاد الغرفة"
                        : "Room dimensions"
                  }
                  aria-pressed={project.ui?.showRoomDimensions !== false}
                  className={
                    project.ui?.showRoomDimensions !== false ? "active" : ""
                  }
                  onClick={() =>
                    patchUi({
                      showRoomDimensions:
                        project.ui?.showRoomDimensions === false,
                    })
                  }
                >
                  <RoomDimensionsIcon size={19} />
                </button>
                <button
                  aria-label={
                    lang === "ru"
                      ? "Размеры всех модулей"
                      : lang === "ar"
                        ? "أبعاد جميع الوحدات"
                        : "All module dimensions"
                  }
                  aria-pressed={!!project.ui?.showAllModuleDimensions}
                  className={
                    project.ui?.showAllModuleDimensions ? "active" : ""
                  }
                  onClick={() =>
                    patchUi({
                      showAllModuleDimensions:
                        !project.ui?.showAllModuleDimensions,
                    })
                  }
                >
                  <ModuleDimensionsIcon size={19} />
                </button>
              </>
            )}
          </div>
          {focusId && (
            <button className="backScene" onClick={leaveFocus}>
              <BackIcon size={20} /> {t("backRoom")}
            </button>
          )}
          {selection && !focusId && !panel && (
            <div className="selectionHud">
              <div className="selectionInfo">
                <b>{selectionTitle}</b>
                <span>{selectionSize}</span>
              </div>
              <div className="hudActions">
                <button
                  aria-label={t("edit")}
                  onClick={() => setPanel("selection")}
                >
                  <EditIcon />
                </button>
                {selectedModuleId && (
                  <button aria-label={t("copy")} onClick={duplicate}>
                    <CopyIcon />
                  </button>
                )}
                {selectedModuleId && (
                  <button
                    aria-label={t("remove")}
                    className="danger"
                    onClick={remove}
                  >
                    <TrashIcon />
                  </button>
                )}
              </div>
            </div>
          )}
        </section>
        {panel && (
          <aside className="inspector">
          <div className="inspectorHead">
            <b>{panelTitle}</b>
            <button
              type="button"
              aria-label={
                lang === "ru" ? "Закрыть" : lang === "ar" ? "إغلاق" : "Close"
              }
              onPointerDown={(event) => event.stopPropagation()}
              onPointerUp={(event) => {
                event.stopPropagation();
                setPanel(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                setPanel(null);
              }}
            >
              <CloseIcon size={19} />
            </button>
          </div>
          {panel === "room" ? (
            <div className="inspectorBody">
              <section>
                <h3>{t("roomSize")}</h3>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    icon={<RoomDimensionsIcon size={14} />}
                    label={t("width")}
                    value={project.room.width}
                    min={800}
                    max={20000}
                    onCommit={(n) => patchRoom({ width: n })}
                  />
                  <NumberField
                    compact
                    icon={<DepthIcon size={14} />}
                    label={t("depth")}
                    value={project.room.depth}
                    min={800}
                    max={20000}
                    onCommit={(n) => patchRoom({ depth: n })}
                  />
                  <NumberField
                    compact
                    icon={<HeightIcon size={14} />}
                    label={t("height")}
                    value={project.room.height}
                    min={1800}
                    max={6000}
                    onCommit={(n) => patchRoom({ height: n })}
                  />
                </div>
              </section>
              <section>
                <h3>{t("finish")}</h3>
                <div className="twoGrid">
                  <label className="field">
                    {t("walls")}
                    <input
                      type="color"
                      value={project.room.wallColor}
                      onChange={(e) => patchRoom({ wallColor: e.target.value })}
                    />
                  </label>
                  <label className="field">
                    {t("floor")}
                    <input
                      type="color"
                      value={project.room.floorColor}
                      onChange={(e) =>
                        patchRoom({ floorColor: e.target.value })
                      }
                    />
                  </label>
                </div>
              </section>
              <section>
                <h3>{lang === "ru" ? "Стены на сцене" : "Scene walls"}</h3>
                <div className="settingsList">
                  {wallToggle(
                    "showWallBack",
                    lang === "ru" ? "Задняя" : "Back",
                    true,
                  )}
                  {wallToggle(
                    "showWallFront",
                    lang === "ru" ? "Передняя" : "Front",
                    false,
                  )}
                  {wallToggle(
                    "showWallLeft",
                    lang === "ru" ? "Левая" : "Left",
                    true,
                  )}
                  {wallToggle(
                    "showWallRight",
                    lang === "ru" ? "Правая" : "Right",
                    false,
                  )}
                </div>
                <div className="rangeRow">
                  <span>{lang === "ru" ? "Прозрачность" : "Opacity"}</span>
                  <input
                    type="range"
                    min="0.15"
                    max="1"
                    step="0.05"
                    value={project.ui?.wallOpacity ?? 0.92}
                    onChange={(e) => patchUi({ wallOpacity: +e.target.value })}
                  />
                  <output>
                    {Math.round((project.ui?.wallOpacity ?? 0.92) * 100)}%
                  </output>
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru" ? "Размеры на сцене" : "Scene dimensions"}
                </h3>
                <div className="settingsList">
                  <button
                    onClick={() =>
                      patchUi({
                        showRoomDimensions:
                          project.ui?.showRoomDimensions === false,
                      })
                    }
                  >
                    <span>{t("room")}</span>
                    <b>
                      {project.ui?.showRoomDimensions === false
                        ? t("off")
                        : t("on")}
                    </b>
                  </button>
                  <button
                    onClick={() =>
                      patchUi({
                        showAllModuleDimensions:
                          !project.ui?.showAllModuleDimensions,
                      })
                    }
                  >
                    <span>{lang === "ru" ? "Все модули" : "All modules"}</span>
                    <b>
                      {project.ui?.showAllModuleDimensions ? t("on") : t("off")}
                    </b>
                  </button>
                </div>
              </section>
            </div>
          ) : panel === "catalog" ? (
            <div className="inspectorBody catalogSections">
              <div
                className={`catalogSearch${catalogSearchOpen ? " open" : ""}`}
              >
                <button
                  type="button"
                  className="catalogSearchToggle"
                  aria-expanded={catalogSearchOpen}
                  onClick={() => setCatalogSearchOpen((open) => !open)}
                >
                  <SearchIcon size={17} />
                  <b>
                    {catalogSearchOpen
                      ? lang === "ru"
                        ? "Скрыть"
                        : "Close"
                      : catalogQuery
                        ? `${lang === "ru" ? "Поиск" : "Search"}: ${catalogQuery}`
                        : lang === "ru"
                          ? "Поиск"
                          : lang === "ar"
                            ? "بحث"
                            : "Search"}
                  </b>
                </button>
                {catalogSearchOpen && (
                  <input
                    autoFocus
                    aria-label={
                      lang === "ru"
                        ? "Поиск по каталогу"
                        : lang === "ar"
                          ? "بحث في الكتالوج"
                          : "Search catalog"
                    }
                    type="search"
                    value={catalogQuery}
                    placeholder={
                      lang === "ru"
                        ? "Угловой, мойка, стиралка…"
                        : "Corner, sink, washer…"
                    }
                    onChange={(event) => setCatalogQuery(event.target.value)}
                  />
                )}
                {!!catalogQuery && (
                  <button
                    type="button"
                    className="catalogSearchClear"
                    aria-label={lang === "ru" ? "Очистить поиск" : "Clear search"}
                    onClick={() => setCatalogQuery("")}
                  >
                    ×
                  </button>
                )}
              </div>
              {catalogGroups.map((g: any) => (
                <section className="catalogSection" key={g.id}>
                  <h3>
                    {lang === "ar" ? g.ar || g.en : lang === "en" ? g.en : g.ru}
                  </h3>
                  <div className="catalogGrid">
                    {g.types.map((type: string) => (
                      <button key={type} onClick={() => addType(type)}>
                        <span className="catalogGlyph">
                          <CatalogGlyph type={type} />
                        </span>
                        <b>{moduleLabel(lang, type)}</b>
                        <small>
                          {lang === "ru"
                            ? isDisplayOnlyType(type) &&
                              !roomElement(type)
                              ? "Отдельный проём / техника"
                              : "Добавить в сцену"
                            : "Add to scene"}
                        </small>
                      </button>
                    ))}
                  </div>
                  {g.id === "appliances" && (
                    <p className="note catalogApplianceNote">
                      {lang === "ru"
                        ? "Стиральную и посудомоечную машины можно поставить отдельным объектом или выбрать во вкладке «Техника» у нижнего/глухого углового модуля — тогда приложение само освободит правильный проём."
                        : lang === "ar"
                          ? "توضع الغسالة وغسالة الصحون في فتحة مستقلة بين الخزائن، وليس داخل خزانة الزاوية."
                          : "Washers and dishwashers can be separate objects or assigned from the Appliance tab of a base/blind-corner module, which reserves the correct clear bay."}
                    </p>
                  )}
                </section>
              ))}
              {!catalogGroups.length && (
                <div className="empty">
                  {lang === "ru" ? "Подходящих модулей нет." : "No matching modules."}
                </div>
              )}
            </div>
          ) : panel === "cost" ? (
            <div className="inspectorBody costPanel">
              <section>
                <h3>
                  {lang === "ru"
                    ? "Смета проекта"
                    : lang === "ar"
                      ? "تقدير تكلفة المشروع"
                      : "Project cost estimate"}
                </h3>
                <div className="projectStats">
                  <div>
                    <b>{Math.round(cost.procurementTotal).toLocaleString()}</b>
                    <span>{lang === "ru" ? "EGP к закупке" : "EGP purchase"}</span>
                  </div>
                  <div>
                    <b>
                      {Math.round(cost.procurementRangeLow).toLocaleString()}–
                      {Math.round(cost.procurementRangeHigh).toLocaleString()}
                    </b>
                    <span>
                      {lang === "ru"
                        ? "диапазон"
                        : lang === "ar"
                          ? "النطاق"
                          : "range"}
                    </span>
                  </div>
                  <div>
                    <b>{cost.sheetCount}</b>
                    <span>
                      {lang === "ru"
                        ? "листов"
                        : lang === "ar"
                          ? "ألواح"
                          : "sheets"}
                    </span>
                  </div>
                </div>
                <p className="note">
                  {lang === "ru"
                    ? `Считается вся кухня: ${furnitureModuleCount} мебельных модулей. Главный итог использует реально покупаемые целые листы; стоимость израсходованной площади — ${Math.round(cost.consumedTotal).toLocaleString()} EGP.`
                    : lang === "ar"
                      ? "يتم حساب المطبخ كاملاً، وتُفصل الألواح حسب الخامة واللون والسماكة."
                      : `Whole-kitchen estimate for ${furnitureModuleCount} furniture modules. The main total uses whole sheets; consumed-area cost is ${Math.round(cost.consumedTotal).toLocaleString()} EGP.`}
                </p>
                <div className={productionAudit.ready ? "fitStatus ok" : "fitStatus bad"}>
                  <b>
                    {productionAudit.ready
                      ? lang === "ru" ? "Проверки пройдены" : "Checks passed"
                      : lang === "ru" ? `Не готово к производству · ${productionAudit.blockers.length}` : `Not production-ready · ${productionAudit.blockers.length}`}
                  </b>
                  <span>
                    {lang === "ru"
                      ? `Предупреждений: ${productionAudit.warnings.length}. Экспорт с блокерами помечается как черновой.`
                      : `Warnings: ${productionAudit.warnings.length}. Exports with blockers are drafts.`}
                  </span>
                </div>
                {!productionAudit.ready && (
                  <div className="productionFindings">
                    {productionAudit.blockers.slice(0, 6).map((item: any, index: number) => (
                      <p className="warning" key={`${item.code}-${item.moduleId || index}`}>
                        {item.message}
                      </p>
                    ))}
                  </div>
                )}
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Ценовой сценарий"
                    : lang === "ar"
                      ? "الخامات"
                      : "Price scenario"}
                </h3>
                <div className="segmented costPresetSelector">
                  <button
                    type="button"
                    className={activeCostPreset === "budget" ? "active" : ""}
                    aria-pressed={activeCostPreset === "budget"}
                    onClick={() => applyCostPreset("budget")}
                  >
                    {lang === "ru"
                      ? "Бюджет"
                      : lang === "ar"
                        ? "اقتصادي"
                        : "Budget"}
                  </button>
                  <button
                    type="button"
                    className={activeCostPreset === "standard" ? "active" : ""}
                    aria-pressed={activeCostPreset === "standard"}
                    onClick={() => applyCostPreset("standard")}
                  >
                    {lang === "ru"
                      ? "Стандарт"
                      : lang === "ar"
                        ? "لامع"
                        : "Gloss"}
                  </button>
                  <button
                    type="button"
                    className={activeCostPreset === "premium" ? "active" : ""}
                    aria-pressed={activeCostPreset === "premium"}
                    onClick={() => applyCostPreset("premium")}
                  >
                    {lang === "ru"
                      ? "Премиум"
                      : lang === "ar"
                        ? "جودة أعلى"
                        : "Premium"}
                  </button>
                </div>
                <p className="note costPresetNote">
                  {lang === "ru"
                    ? activeCostPreset
                       ? "Сценарий применяет материалы корпуса и фасадов ко всем мебельным модулям."
                       : "В кухне используются разные материалы. Цена считается для каждой детали по её материалу."
                    : activeCostPreset
                       ? "The preset applies body and front products to every furniture module."
                       : "Mixed products are used. Each part is priced by its own material."}
                </p>
                <p className="note costFormulaNote">
                  {lang === "ru"
                    ? "Материал = площадь деталей × цена за м² × (1 + отход). Формат листа влияет на подсказку закупки, но не искажает цену."
                    : "Material = part area × EGP/m² × waste factor. Sheet size is used for the purchasing estimate."}
                </p>
                {!!cost.materialWarnings.length && (
                  <p className="warning">
                    {lang === "ru"
                      ? "Толщина некоторых деталей не совпадает с толщиной выбранного продукта. Цена остаётся приблизительной — выбери подходящий продукт или верни его штатную толщину."
                      : "Some part thicknesses do not match the selected product. Choose a matching product or restore its standard thickness."}
                  </p>
                )}
                {!!cost.stockWarnings?.length && (
                  <p className="warning">
                    {lang === "ru"
                      ? `В раскрой не помещается деталей: ${cost.stockWarnings.length}. Проверь формат листа, направление текстуры или размер детали — такие позиции нельзя считать готовыми к закупке.`
                      : `${cost.stockWarnings.length} parts do not fit the selected sheet. Check sheet size, grain direction or part dimensions before purchasing.`}
                  </p>
                )}
                <details className="materialPriceDetails" open>
                  <summary>
                    {lang === "ru" ? "Цены материалов, EGP/м²" : "Material prices, EGP/m²"}
                  </summary>
                  <div className="dimensionGrid">
                    {Object.values(MATERIAL_PRODUCTS)
                      .filter((product: any) => product.id !== "plywood18")
                      .map((product: any) => (
                        <NumberField
                          key={product.id}
                          compact
                          label={materialProductLabel(product, lang)}
                          value={cost.settings.materialPrices[product.id]}
                          unit="EGP/м²"
                          min={0}
                          max={10000}
                          onCommit={(n) => patchMaterialPrice(product.id, n)}
                        />
                      ))}
                  </div>
                </details>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    label={
                      lang === "ru" ? "Отход" : lang === "ar" ? "هدر" : "Waste"
                    }
                    value={cost.settings.wastePercent}
                    unit="%"
                    min={0}
                    max={60}
                    onCommit={(n) => patchCost({ wastePercent: n })}
                  />
                  <NumberField
                    compact
                    label={lang === "ru" ? "Пропил пилы" : "Saw kerf"}
                    value={cost.settings.sawKerf}
                    unit="мм"
                    min={0}
                    max={20}
                    onCommit={(n) => patchCost({ sawKerf: n })}
                  />
                  <NumberField
                    compact
                    label={lang === "ru" ? "Обрезка края" : "Edge trim"}
                    value={cost.settings.sheetEdgeTrim}
                    unit="мм"
                    min={0}
                    max={50}
                    onCommit={(n) => patchCost({ sheetEdgeTrim: n })}
                  />
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Работы и кромка"
                    : lang === "ar"
                      ? "القص والحواف"
                      : "Cutting & edge"}
                </h3>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Распил/лист"
                        : lang === "ar"
                          ? "قص/لوح"
                          : "Cut/sheet"
                    }
                    value={cost.settings.cuttingPerSheet}
                    unit="EGP"
                    min={0}
                    max={5000}
                    onCommit={(n) => patchCost({ cuttingPerSheet: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Сервис"
                        : lang === "ar"
                          ? "خدمة"
                          : "Service"
                    }
                    value={cost.settings.serviceBase}
                    unit="EGP"
                    min={0}
                    max={50000}
                    onCommit={(n) => patchCost({ serviceBase: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Кромка 0.8/м"
                        : lang === "ar"
                          ? "حافة 0.8/م"
                          : "Edge .8/m"
                    }
                    value={cost.settings.edge08PerM}
                    unit="EGP"
                    min={0}
                    max={1000}
                    onCommit={(n) => patchCost({ edge08PerM: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Кромка 2/м"
                        : lang === "ar"
                          ? "حافة 2/م"
                          : "Edge 2/m"
                    }
                    value={cost.settings.edge2PerM}
                    unit="EGP"
                    min={0}
                    max={1000}
                    onCommit={(n) => patchCost({ edge2PerM: n })}
                  />
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Столешница и прочее"
                    : lang === "ar"
                      ? "سطح العمل وإضافات"
                      : "Countertop & extras"}
                </h3>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Столешница/м"
                        : lang === "ar"
                          ? "سطح/م"
                          : "Countertop/m"
                    }
                    value={cost.settings.countertopPerM}
                    unit="EGP"
                    min={0}
                    max={50000}
                    onCommit={(n) => patchCost({ countertopPerM: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Фурнитура"
                        : lang === "ar"
                          ? "إكسسوارات"
                          : "Hardware"
                    }
                    value={cost.settings.hardwareFixed}
                    unit="EGP"
                    min={0}
                    max={100000}
                    onCommit={(n) => patchCost({ hardwareFixed: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Доп. расходы"
                        : lang === "ar"
                          ? "إضافات"
                          : "Extras"
                    }
                    value={cost.settings.extraCost}
                    unit="EGP"
                    min={0}
                    max={100000}
                    onCommit={(n) => patchCost({ extraCost: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Погрешность"
                        : lang === "ar"
                          ? "هامش"
                          : "Uncertainty"
                    }
                    value={cost.settings.uncertaintyPercent}
                    unit="%"
                    min={0}
                    max={50}
                    onCommit={(n) => patchCost({ uncertaintyPercent: n })}
                  />
                </div>
                {!!cost.hardwareBill.length && (
                  <details className="materialPriceDetails">
                    <summary>
                      {lang === "ru" ? "Фурнитура по количеству" : "Hardware quantities"}
                    </summary>
                    <div className="dimensionGrid">
                      {cost.hardwareBill.map((row: any) => (
                        <NumberField
                          key={row.id}
                          compact
                          label={`${row.name} · ${row.quantity} ${row.unit}`}
                          value={row.unitPrice}
                          unit="EGP"
                          min={0}
                          max={50000}
                          onCommit={(n) => patchHardwarePrice(row.id, n)}
                        />
                      ))}
                    </div>
                    <p className="note">
                      {lang === "ru"
                        ? "Количество считается автоматически. Поле «Фурнитура» выше остаётся резервом на позиции, которых ещё нет в каталоге."
                        : "Quantities are automatic. The fixed hardware field remains an allowance for uncatalogued items."}
                    </p>
                  </details>
                )}
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Разбивка"
                    : lang === "ar"
                      ? "التفاصيل"
                      : "Breakdown"}
                </h3>
                <div className="costBreakdown">
                  <small>
                    {lang === "ru" ? "Итого к закупке" : "Purchase total"}: {" "}
                    <b>{Math.round(cost.procurementTotal).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru" ? "Израсходованный материал и работы" : "Consumed material & work"}: {" "}
                    <b>{Math.round(cost.consumedTotal).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru" ? "Корпус" : lang === "ar" ? "هيكل" : "Body"}
                    : {cost.body.pricedArea.toFixed(2)} м² ={" "}
                    <b>{Math.round(cost.body.cost).toLocaleString()} EGP</b>
                  </small>
                  {!!cost.front.matte.sheets && <small>
                    {lang === "ru" ? "Фасады · матовые" : lang === "ar" ? "واجهات مطفية" : "Fronts · matte"}
                    : {cost.front.matte.pricedArea.toFixed(2)} м² ={" "}
                    <b>{Math.round(cost.front.matte.cost).toLocaleString()} EGP</b>
                  </small>}
                  {!!cost.front.gloss.sheets && <small>
                    {lang === "ru" ? "Фасады · глянец" : lang === "ar" ? "واجهات لامعة" : "Fronts · gloss"}
                    : {cost.front.gloss.pricedArea.toFixed(2)} м² ={" "}
                    <b>{Math.round(cost.front.gloss.cost).toLocaleString()} EGP</b>
                  </small>}
                  <small>
                    {lang === "ru"
                      ? "Задники"
                      : lang === "ar"
                        ? "ظهر"
                        : "Backs"}
                    : {cost.back.pricedArea.toFixed(2)} м² ={" "}
                    <b>{Math.round(cost.back.cost).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru" ? "Закупка целыми листами (справочно)" : "Whole-sheet purchase (reference)"}: {" "}
                    <b>{Math.round(cost.purchaseMaterials).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Кромка корпуса"
                      : lang === "ar"
                        ? "حواف الهيكل"
                        : "Body edge"}
                    :{" "}
                    <b>
                      {cost.edge.body.meters.toFixed(1)} m ·{" "}
                      {Math.round(cost.edge.body.cost).toLocaleString()} EGP
                    </b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Кромка фасадов"
                      : lang === "ar"
                        ? "حواف الواجهات"
                        : "Front edge"}
                    :{" "}
                    <b>
                      {cost.edge.front.meters.toFixed(1)} m ·{" "}
                      {Math.round(cost.edge.front.cost).toLocaleString()} EGP
                    </b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Кромка 0.8 / 2 мм"
                      : lang === "ar"
                        ? "حواف 0.8 / 2 مم"
                        : "Edge 0.8 / 2 mm"}
                    :{" "}
                    <b>
                      {cost.edge.meters08.toFixed(1)} /{" "}
                      {cost.edge.meters2.toFixed(1)} m
                    </b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Распил/сервис"
                      : lang === "ar"
                        ? "قص/خدمة"
                        : "Cut/service"}
                    : <b>{Math.round(cost.cutting).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Столешница"
                      : lang === "ar"
                        ? "سطح العمل"
                        : "Countertop"}
                    : <b>{Math.round(cost.countertop).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Фурнитура"
                      : lang === "ar"
                        ? "إكسسوارات"
                        : "Hardware"}
                    : <b>{Math.round(cost.hardware).toLocaleString()} EGP</b>
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Дополнительно"
                      : lang === "ar"
                        ? "إضافات"
                        : "Extras"}
                    : <b>{Math.round(cost.extras).toLocaleString()} EGP</b>
                  </small>
                </div>
                <details className="costStockDetails">
                  <summary>
                    {lang === "ru"
                      ? "Листы по фактическим материалам"
                      : "Sheets by actual material"}
                    <span>{cost.sheetCount}</span>
                  </summary>
                  <div className="costStockList">
                    {[
                      [lang === "ru" ? "Корпус" : "Body", cost.body.batches],
                      [lang === "ru" ? "Фасад" : "Front", cost.front.batches],
                      [lang === "ru" ? "Задник" : "Back", cost.back.batches],
                    ].flatMap(([role, batches]: any) =>
                      (batches || []).map((batch: any, index: number) => (
                        <SheetPlan
                          key={[
                            role,
                            batch.materialProductId,
                            batch.decor,
                            batch.color,
                            batch.thickness,
                            index,
                          ].join("-")}
                          batch={batch}
                          role={role}
                          lang={lang}
                        />
                      )),
                    )}
                  </div>
                  <p className="note">
                    {lang === "ru"
                      ? "Цена сметы по-прежнему считается по м² с заданным запасом. Раскладка отдельно показывает, сколько целых листов реально покупать и какие прямоугольные остатки можно сохранить. Это предварительный раскрой: порядок резов и технологические поля нужно подтвердить в цехе."
                      : "The estimate still uses m² plus the configured reserve. Nesting separately shows whole sheets to buy and reusable rectangular offcuts. It remains a preliminary layout for workshop confirmation."}
                  </p>
                </details>
              </section>
            </div>
          ) : panel === "project" ? (
            <div className="inspectorBody">
              <section>
                <h3>{t("project")}</h3>
                <div className="projectStats">
                  <div>
                    <b>{project.modules.length}</b>
                    <span>{t("objects")}</span>
                  </div>
                  <div>
                    <b>{model.parts.length}</b>
                    <span>{t("furnitureParts")}</span>
                  </div>
                  <div>
                    <b>{model.issues.length}</b>
                    <span>{t("checks")}</span>
                  </div>
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Смета материалов"
                    : lang === "ar"
                      ? "تقدير التكلفة"
                      : "Cost estimate"}
                </h3>
                <div className="projectStats">
                  <div>
                    <b>{Math.round(cost.procurementTotal).toLocaleString()}</b>
                    <span>EGP</span>
                  </div>
                  <div>
                    <b>{cost.sheetCount}</b>
                    <span>
                      {lang === "ru"
                        ? "листов"
                        : lang === "ar"
                          ? "ألواح"
                          : "sheets"}
                    </span>
                  </div>
                  <div>
                    <b>{(cost.edge.meters08 + cost.edge.meters2).toFixed(1)}</b>
                    <span>
                      {lang === "ru"
                        ? "м кромки"
                        : lang === "ar"
                          ? "م حواف"
                          : "m edge"}
                    </span>
                  </div>
                </div>
                <p className="note">
                  {lang === "ru"
                    ? `Закупка: ${Math.round(cost.procurementRangeLow).toLocaleString()}–${Math.round(cost.procurementRangeHigh).toLocaleString()} EGP. Расход по площади: ${Math.round(cost.consumedTotal).toLocaleString()} EGP.`
                    : lang === "ar"
                      ? `تقريباً ${Math.round(cost.procurementRangeLow).toLocaleString()}–${Math.round(cost.procurementRangeHigh).toLocaleString()} EGP`
                      : `Purchase estimate ${Math.round(cost.procurementRangeLow).toLocaleString()}–${Math.round(cost.procurementRangeHigh).toLocaleString()} EGP.`}
                </p>
                <div className={productionAudit.ready ? "fitStatus ok" : "fitStatus bad"}>
                  <b>
                    {productionAudit.ready
                      ? lang === "ru" ? "Готово по автоматическим проверкам" : "Automated checks passed"
                      : lang === "ru" ? `Блокирующих проверок: ${productionAudit.blockers.length}` : `Blocking checks: ${productionAudit.blockers.length}`}
                  </b>
                  <span>{lang === "ru" ? `Предупреждений: ${productionAudit.warnings.length}` : `Warnings: ${productionAudit.warnings.length}`}</span>
                </div>
                <div className="segmented costPresetSelector">
                  <button
                    type="button"
                    className={activeCostPreset === "budget" ? "active" : ""}
                    aria-pressed={activeCostPreset === "budget"}
                    onClick={() => applyCostPreset("budget")}
                  >
                    {lang === "ru"
                      ? "ЛДСП + High Gloss"
                      : lang === "ar"
                        ? "اقتصادي 1500"
                        : "MFC + High Gloss"}
                  </button>
                  <button
                    type="button"
                    className={activeCostPreset === "standard" ? "active" : ""}
                    aria-pressed={activeCostPreset === "standard"}
                    onClick={() => applyCostPreset("standard")}
                  >
                    {lang === "ru"
                      ? "Стандарт"
                      : lang === "ar"
                        ? "لامع 2500"
                        : "Standard"}
                  </button>
                  <button
                    type="button"
                    className={activeCostPreset === "premium" ? "active" : ""}
                    aria-pressed={activeCostPreset === "premium"}
                    onClick={() => applyCostPreset("premium")}
                  >
                    {lang === "ru"
                      ? "Акрил"
                      : lang === "ar"
                        ? "جودة أعلى 4000"
                        : "Acrylic"}
                  </button>
                </div>
                <p className="note costPresetNote">
                  {lang === "ru"
                    ? activeCostPreset
                      ? `Сценарий применяется ко всей кухне (${furnitureModuleCount} мебельных модулей).`
                      : "Активны свои цены для всей кухни."
                    : activeCostPreset
                      ? `Scenario applies to the whole kitchen (${furnitureModuleCount} furniture modules).`
                      : "Custom whole-kitchen prices are active."}
                </p>
                <div className="dimensionGrid">
                  {["mfc18", "highGlossMdfPvc18", "acrylicHighGlossMdf18"].map(
                    (productId) => {
                      const product = (MATERIAL_PRODUCTS as any)[productId];
                      return (
                        <NumberField
                          key={productId}
                          compact
                          label={materialProductLabel(product, lang)}
                          value={cost.settings.materialPrices[productId]}
                          unit="EGP/м²"
                          min={0}
                          max={10000}
                          onCommit={(n) => patchMaterialPrice(productId, n)}
                        />
                      );
                    },
                  )}
                  <NumberField
                    compact
                    label={
                      lang === "ru" ? "Отход" : lang === "ar" ? "هدر" : "Waste"
                    }
                    value={cost.settings.wastePercent}
                    unit="%"
                    min={0}
                    max={60}
                    onCommit={(n) => patchCost({ wastePercent: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Распил/лист"
                        : lang === "ar"
                          ? "قص/لوح"
                          : "Cut/sheet"
                    }
                    value={cost.settings.cuttingPerSheet}
                    unit="EGP"
                    min={0}
                    max={5000}
                    onCommit={(n) => patchCost({ cuttingPerSheet: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Кромка 0.8/м"
                        : lang === "ar"
                          ? "حافة 0.8/م"
                          : "Edge .8/m"
                    }
                    value={cost.settings.edge08PerM}
                    unit="EGP"
                    min={0}
                    max={1000}
                    onCommit={(n) => patchCost({ edge08PerM: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Кромка 2/м"
                        : lang === "ar"
                          ? "حافة 2/م"
                          : "Edge 2/m"
                    }
                    value={cost.settings.edge2PerM}
                    unit="EGP"
                    min={0}
                    max={1000}
                    onCommit={(n) => patchCost({ edge2PerM: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Сервис"
                        : lang === "ar"
                          ? "خدمة"
                          : "Service"
                    }
                    value={cost.settings.serviceBase}
                    unit="EGP"
                    min={0}
                    max={50000}
                    onCommit={(n) => patchCost({ serviceBase: n })}
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Доп. расходы"
                        : lang === "ar"
                          ? "إضافات"
                          : "Extras"
                    }
                    value={cost.settings.extraCost}
                    unit="EGP"
                    min={0}
                    max={100000}
                    onCommit={(n) => patchCost({ extraCost: n })}
                  />
                </div>
                <div className="costBreakdown">
                  <small>
                    {lang === "ru" ? "Корпус" : lang === "ar" ? "هيكل" : "Body"}
                    : {cost.body.pricedArea.toFixed(2)} м² ={" "}
                    {Math.round(cost.body.cost)} EGP
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Фасады"
                      : lang === "ar"
                        ? "واجهات"
                        : "Fronts"}
                    : {cost.front.pricedArea.toFixed(2)} м² ={" "}
                    {Math.round(cost.front.cost)} EGP
                  </small>
                  <small>
                    {lang === "ru" ? "Кромка" : lang === "ar" ? "حواف" : "Edge"}
                    : {Math.round(cost.edge.cost)} EGP
                  </small>
                  <small>
                    {lang === "ru"
                      ? "Распил/сервис"
                      : lang === "ar"
                        ? "قص/خدمة"
                        : "Cut/service"}
                    : {Math.round(cost.cutting)} EGP
                  </small>
                </div>
                {!cost.countertopPriced && (
                  <p className="warning">
                    {lang === "ru"
                      ? "Столешница пока не включена в цену: укажи цену за погонный метр позже."
                      : lang === "ar"
                        ? "سطح العمل غير محسوب حالياً."
                        : "Countertop is not priced yet."}
                  </p>
                )}
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Стыки столешницы"
                    : lang === "ar"
                      ? "وصلات سطح العمل"
                      : "Countertop joints"}
                </h3>
                <div className="twoGrid">
                  <label className="field">
                    {lang === "ru"
                      ? "Тип стыка"
                      : lang === "ar"
                        ? "نوع الوصلة"
                        : "Joint type"}
                    <select
                      value={project.countertop?.jointType || "butt"}
                      onChange={(e) =>
                        setProject((p: any) => ({
                          ...p,
                          countertop: {
                            ...p.countertop,
                            jointType: e.target.value,
                          },
                        }))
                      }
                    >
                      <option value="butt">
                        {lang === "ru"
                          ? "Прямой 90°"
                          : lang === "ar"
                            ? "مستقيم 90°"
                            : "Butt 90°"}
                      </option>
                      <option value="miter45">
                        {lang === "ru"
                          ? "Диагональный 45°"
                          : lang === "ar"
                            ? "قطري 45°"
                            : "Miter 45°"}
                      </option>
                      <option value="euro">
                        {lang === "ru"
                          ? "Еврозапил"
                          : lang === "ar"
                            ? "وصلة يورو"
                            : "Euro joint"}
                      </option>
                    </select>
                  </label>
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Зазор стыка"
                        : lang === "ar"
                          ? "فاصل الوصلة"
                          : "Joint gap"
                    }
                    value={project.countertop?.jointGap || 0}
                    min={0}
                    max={20}
                    onCommit={(n) =>
                      setProject((p: any) => ({
                        ...p,
                        countertop: { ...p.countertop, jointGap: n },
                      }))
                    }
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Боковой свес"
                        : lang === "ar"
                          ? "البروز الجانبي"
                          : "Side overhang"
                    }
                    value={project.countertop.overhang || 0}
                    min={0}
                    max={300}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        updateCountertop(p, { overhang: n }),
                      )
                    }
                  />
                </div>
                <p className="note">
                  {lang === "ru"
                    ? "Еврозапил пока показывается как схема стыка; точный CNC-профиль зависит от шаблона конкретного цеха."
                    : lang === "ar"
                      ? "وصلة اليورو تخطيطية حالياً وتعتمد على قالب الورشة."
                      : "Euro joint is schematic; exact CNC profile depends on the shop template."}
                </p>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Файл проекта"
                    : lang === "ar"
                      ? "ملف المشروع"
                      : "Project file"}
                </h3>
                <input
                  ref={importInputRef}
                  className="hiddenFileInput"
                  type="file"
                  accept="application/json,.json"
                  hidden
                  aria-hidden="true"
                  tabIndex={-1}
                  onChange={(event) => {
                    const input = event.currentTarget,
                      file = input.files?.[0];
                    if (!file) return;
                    void importProjectFile(file).finally(() => {
                      input.value = "";
                    });
                  }}
                />
                <div className="exportGrid">
                  <button onClick={() => downloadJson(project)}>
                    <DownloadIcon />
                    <span>
                      {lang === "ru"
                        ? "Скачать JSON"
                        : lang === "ar"
                          ? "تنزيل JSON"
                          : "Download JSON"}
                    </span>
                  </button>
                  <button onClick={requestProjectImport}>
                    <UploadIcon />
                    <span>
                      {lang === "ru"
                        ? "Импорт JSON"
                        : lang === "ar"
                          ? "استيراد JSON"
                          : "Import JSON"}
                    </span>
                  </button>
                  <button onClick={() => guardProductionExport((draft) => downloadCsv(model, undefined, { draft, blockers: productionAudit.blockers.length }))}>
                    <DownloadIcon />
                    <span>{t("csv")}</span>
                  </button>
                  <button onClick={() => downloadPng(project, model)}>
                    <DownloadIcon />
                    <span>{t("png")}</span>
                  </button>
                  <button
                    className="primary wide"
                    onClick={() => guardProductionExport(() => printReport(project, model))}
                  >
                    <PrintIcon />
                    <span>{t("pdf")}</span>
                  </button>
                </div>
                {importNotice && (
                  <p
                    className={`importNotice ${importNotice.kind}`}
                    role={importNotice.kind === "error" ? "alert" : "status"}
                  >
                    {importNotice.message}
                  </p>
                )}
                <p className="note">
                  {lang === "ru"
                    ? "Импорт проверяет формат и версию файла. PDF содержит обзор проекта и листы деталей для каждого шкафа."
                    : lang === "ar"
                      ? "يتحقق الاستيراد من تنسيق الملف وإصداره قبل استبدال المشروع."
                      : "Import validates the file format and version. PDF includes the project overview and cabinet detail sheets."}
                </p>
                {!productionAudit.ready && (
                  <p className="warning">
                    {lang === "ru"
                      ? `Производственный экспорт содержит ${productionAudit.blockers.length} блокирующих проверок. CSV/PDF можно выгрузить только как черновик после подтверждения.`
                      : `Production export has ${productionAudit.blockers.length} blocking checks. CSV/PDF can only be exported as a confirmed draft.`}
                  </p>
                )}
              </section>
              <ProjectSyncPanel
                lang={lang}
                sync={projectSync}
                onLoad={(remote) => {
                  try {
                    const imported = decodeEditorProject(JSON.stringify(remote.project));
                    setProject(imported);
                    setSelection(null);
                    setFocusId(null);
                    setDetail("none");
                    setImportNotice({
                      kind: "success",
                      message:
                        lang === "ru"
                          ? `Версия ${remote.revision} проекта «${imported.name}» загружена с компьютера.`
                          : `Revision ${remote.revision} of “${imported.name}” loaded from the PC.`,
                    });
                  } catch (error) {
                    setImportNotice({
                      kind: "error",
                      message:
                        lang === "ru"
                          ? `Версия с компьютера повреждена: ${error instanceof Error ? error.message : String(error)}`
                          : `The PC copy is invalid: ${error instanceof Error ? error.message : String(error)}`,
                    });
                  }
                }}
              />
              {model.warnings.slice(0, 8).map((w: string, i: number) => (
                <div className="warning" key={i}>
                  {w}
                </div>
              ))}
            </div>
          ) : panel === "settings" ? (
            <div className="inspectorBody">
              <section>
                <h3>{lang === "ru" ? "Интерфейс" : "Interface"}</h3>
                <div className="settingsList">
                  <button
                    onClick={() => patchUi({ theme: dark ? "light" : "dark" })}
                  >
                    <span>{t("theme")}</span>
                    <b>{dark ? t("dark") : t("light")}</b>
                  </button>
                  <button
                    onClick={() =>
                      patchUi({ showGrid: project.ui?.showGrid === false })
                    }
                  >
                    <span>{t("grid")}</span>
                    <b>{project.ui?.showGrid === false ? t("off") : t("on")}</b>
                  </button>
                  <button
                    onClick={() =>
                      patchUi({
                        autoRotateToWall:
                          project.ui?.autoRotateToWall === false,
                      })
                    }
                  >
                    <span>
                      {lang === "ru"
                        ? "Автоповорот к стене"
                        : lang === "ar"
                          ? "تدوير تلقائي عند الجدار"
                          : "Auto-rotate to wall"}
                    </span>
                    <b>
                      {project.ui?.autoRotateToWall === false
                        ? t("off")
                        : t("on")}
                    </b>
                  </button>
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Монтаж техники"
                    : lang === "ar"
                      ? "تركيب الأجهزة"
                      : "Appliance installation"}
                </h3>
                <div className="twoGrid">
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Зазор над стиралкой"
                        : lang === "ar"
                          ? "خلوص فوق الغسالة"
                          : "Washer top clearance"
                    }
                    value={project.defaults?.washerClearance || 10}
                    min={5}
                    max={60}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        updateProjectDefaults(p, { washerClearance: n }),
                      )
                    }
                  />
                </div>
              </section>
              <section>
                <h3>{t("language")}</h3>
                <div className="segmented languageSwitch">
                  <button
                    className={lang === "ru" ? "active" : ""}
                    onClick={() => patchUi({ language: "ru" })}
                  >
                    Русский
                  </button>
                  <button
                    className={lang === "en" ? "active" : ""}
                    onClick={() => patchUi({ language: "en" })}
                  >
                    English
                  </button>
                  <button
                    className={lang === "ar" ? "active" : ""}
                    onClick={() => patchUi({ language: "ar" })}
                  >
                    العربية
                  </button>
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Стиль кухни"
                    : "Kitchen style"}
                </h3>
                <p className="note materialHelp">
                  {lang === "ru"
                    ? "Эти значения используются для новых шкафов. Каждый модуль после этого можно настроить отдельно."
                    : "These values are used for new cabinets. Every module can still be customized separately."}
                </p>
                <div className="materialRoleGrid">
                  <MaterialProductSelect
                    label={lang === "ru" ? "Материал корпуса" : "Carcass material"}
                    role="body"
                    value={project.defaults?.bodyMaterialId || "mfc18"}
                    lang={lang}
                    onChange={(bodyMaterialId) =>
                      setProject((p: any) =>
                        updateProjectDefaults(p, { bodyMaterialId }),
                      )
                    }
                  />
                  <MaterialProductSelect
                    label={lang === "ru" ? "Материал дверок" : "Door material"}
                    role="front"
                    value={
                      project.defaults?.frontMaterialId ||
                      "highGlossMdfPvc18"
                    }
                    lang={lang}
                    onChange={(frontMaterialId) =>
                      setProject((p: any) =>
                        updateProjectDefaults(p, { frontMaterialId }),
                      )
                    }
                  />
                </div>
                <DecorPicker
                  label={lang === "ru" ? "Фасады кухни" : "Kitchen fronts"}
                  value={project.defaults?.frontDecor || "olive"}
                  color={
                    project.defaults?.frontColor ||
                    (DECORS as any)[project.defaults?.frontDecor || "olive"].color
                  }
                  lang={lang}
                  onChange={(frontDecor) =>
                    setProject((p: any) =>
                      updateProjectDefaults(p, {
                        frontDecor,
                        frontColor: (DECORS as any)[frontDecor].color,
                      }),
                    )
                  }
                  onColorChange={(frontColor) =>
                    setProject((p: any) =>
                      updateProjectDefaults(p, { frontColor }),
                    )
                  }
                />
                <DecorPicker
                  label={lang === "ru" ? "Корпуса кухни" : "Kitchen bodies"}
                  value={project.defaults?.bodyDecor || "white"}
                  color={
                    project.defaults?.bodyColor ||
                    (DECORS as any)[project.defaults?.bodyDecor || "white"].color
                  }
                  lang={lang}
                  onChange={(bodyDecor) =>
                    setProject((p: any) =>
                      updateProjectDefaults(p, {
                        bodyDecor,
                        bodyColor: (DECORS as any)[bodyDecor].color,
                      }),
                    )
                  }
                  onColorChange={(bodyColor) =>
                    setProject((p: any) =>
                      updateProjectDefaults(p, { bodyColor }),
                    )
                  }
                />
                <div
                  className="segmented finishSelector"
                  role="group"
                  aria-label={lang === "ru" ? "Покрытие кухни" : "Kitchen finish"}
                >
                  <button
                    type="button"
                    className={!project.defaults?.gloss ? "active" : ""}
                    aria-pressed={!project.defaults?.gloss}
                    onClick={() =>
                      setProject((p: any) =>
                        updateProjectDefaults(p, { gloss: false }),
                      )
                    }
                  >
                    {lang === "ru" ? "Матовый" : "Matte"}
                  </button>
                  <button
                    type="button"
                    className={project.defaults?.gloss ? "active" : ""}
                    aria-pressed={!!project.defaults?.gloss}
                    onClick={() =>
                      setProject((p: any) =>
                        updateProjectDefaults(p, { gloss: true }),
                      )
                    }
                  >
                    {lang === "ru" ? "Глянцевый" : "Gloss"}
                  </button>
                </div>
                <button
                  type="button"
                  className="applyKitchenFinish"
                  onClick={() =>
                    setProject((p: any) => applyProjectFinish(p))
                  }
                >
                  {lang === "ru"
                    ? `Применить ко всей мебели (${furnitureModuleCount})`
                    : `Apply to all furniture (${furnitureModuleCount})`}
                </button>
                <p className="note">
                  {lang === "ru"
                    ? "Команда применяет материалы, декор, оттенок и финиш. Размеры, ножки, ручки и петли сохраняются; действие можно отменить."
                    : "Materials, decor, tint and finish are applied. Sizes, legs, handles and hinges stay intact; the action can be undone."}
                </p>
              </section>
            </div>
          ) : panel === "parts" ? (
            <div className="inspectorBody">
              {selectedModule ? (
                <>
                  <section>
                    <h3>{t("explodeHint")}</h3>
                    <div className="rangeRow">
                      <span>{t("explode")}</span>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={project.ui?.explode || 0}
                        onChange={(e) => patchUi({ explode: +e.target.value })}
                      />
                      <output>{project.ui?.explode || 0} мм</output>
                    </div>
                    <p className="note">
                      {lang === "ru"
                        ? "Подписи и разнесение относятся только к деталям раскроя. Ручки и опоры остаются видимыми, но не входят в список напила."
                        : "Labels and exploded spacing apply only to cut parts. Handles and supports stay visible but are not part of the cut list."}
                    </p>
                  </section>
                  {selectedPart && (
                    <section>
                      <h3>
                        {lang === "ru"
                          ? "Кромка выбранной детали"
                          : lang === "ar"
                            ? "حواف القطعة المحددة"
                            : "Selected part edges"}
                      </h3>
                      <div className="segmented">
                        {(["U−", "U+", "V−", "V+"] as const).map((side, i) => {
                          const on = (selectedPart.edges?.[i] || 0) > 0,
                            thickness =
                              selectedPart.role === "front"
                                ? selectedModule.frontEdge || 2
                                : selectedModule.bodyEdge || 0.8;
                          return (
                            <button
                              key={side}
                              className={on ? "active" : ""}
                              onClick={() => {
                                const edges = [
                                  ...(selectedPart.edges || [0, 0, 0, 0]),
                                ];
                                edges[i] = on ? 0 : thickness;
                                setProject((p: any) =>
                                  updatePartEdges(
                                    p,
                                    selectedModule.id,
                                    selectedPart.id,
                                    edges,
                                  ),
                                );
                              }}
                            >
                              {side} {on ? "✓" : "–"}
                            </button>
                          );
                        })}
                      </div>
                      <p className="note">
                        {lang === "ru"
                          ? "Изменение сразу пересчитывает заготовку и печать."
                          : lang === "ar"
                            ? "يتم تحديث مقاس القص والطباعة فوراً."
                            : "Updates blank size and print immediately."}
                      </p>
                    </section>
                  )}
                  <div className="partList">
                    {parts.map((p: any) => (
                      <button
                        key={p.id}
                        className={
                          selection?.kind === "part" && selection.id === p.id
                            ? "active"
                            : ""
                        }
                        onClick={() =>
                          setSelection({
                            kind: "part",
                            id: p.id,
                            moduleId: p.moduleId,
                          })
                        }
                      >
                        <span className="partName">
                          <b>{p.name}</b>
                          <small>
                            {p.u} × {p.v} × {p.thickness} мм · {p.substrate} ·{" "}
                            {p.edgeType || ""} · L/R/T/B{" "}
                            {p.edges?.join("/") || "0/0/0/0"} · {p.id}
                          </small>
                        </span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty">{t("selectObject")}</div>
              )}
            </div>
          ) : panel === "print" ? (
            <div className="inspectorBody">
              {selectedFurniture ? (
                <>
                  <section>
                    <h3>{t("explodeHint")}</h3>
                    <div className="rangeRow">
                      <span>{t("explode")}</span>
                      <input
                        type="range"
                        min="0"
                        max="500"
                        step="10"
                        value={project.ui?.explode || 0}
                        onChange={(e) => patchUi({ explode: +e.target.value })}
                      />
                      <output>{project.ui?.explode || 0} мм</output>
                    </div>
                    <p className="note">
                      {lang === "ru"
                        ? "PDF использует текущий ракурс 3D как снимок сцены, а размеры вынесены на отдельные ортографические виды."
                        : "PDF uses the current 3D camera as a scene snapshot, with dimensions on separate orthographic views."}
                    </p>
                  </section>
                  <div className="exportGrid">
                    <button
                      onClick={() =>
                        guardProductionExport((draft) =>
                          downloadCsv(model, selectedModule.id, { draft, blockers: productionAudit.blockers.length }),
                        )
                      }
                    >
                      <DownloadIcon />
                      <span>{t("moduleCsv")}</span>
                    </button>
                    <button
                      onClick={() =>
                        downloadPng(project, model, selectedModule.id)
                      }
                    >
                      <DownloadIcon />
                      <span>{t("modulePng")}</span>
                    </button>
                    <button
                      className="primary wide"
                      onClick={() =>
                        guardProductionExport(() =>
                          printReport(project, model, selectedModule.id),
                        )
                      }
                    >
                      <PrintIcon />
                      <span>{t("modulePrint")}</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty">
                  {lang === "ru"
                    ? "Печать напила доступна для мебельных модулей."
                    : "Cut-list print is available for furniture modules."}
                </div>
              )}
            </div>
          ) : selection?.kind === "countertop" ? (
            <div className="inspectorBody">
              <section>
                <h3>{lang === "ru" ? "Габариты" : "Dimensions"}</h3>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    readOnly
                    label={
                      lang === "ru"
                        ? "Суммарная длина"
                        : lang === "ar"
                          ? "الطول الإجمالي"
                          : "Total length"
                    }
                    value={countertopLength}
                    onCommit={() => undefined}
                  />
                  <NumberField
                    compact
                    label={t("depth")}
                    value={project.countertop.depth}
                    min={300}
                    max={1200}
                    onCommit={(n) =>
                      setProject((p: any) => updateCountertop(p, { depth: n }))
                    }
                  />
                  <NumberField
                    compact
                    label={t("thickness")}
                    value={project.countertop.thickness}
                    min={8}
                    max={100}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        updateCountertop(p, { thickness: n }),
                      )
                    }
                  />
                  <NumberField
                    compact
                    label={
                      lang === "ru"
                        ? "Низ столешницы"
                        : lang === "ar"
                          ? "أسفل سطح العمل"
                          : "Countertop underside"
                    }
                    value={project.countertop.elevation || 860}
                    min={500}
                    max={1300}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        updateCountertop(p, { elevation: n }),
                      )
                    }
                  />
                </div>
              </section>
              <section>
                <h3>
                  {lang === "ru"
                    ? "Материал столешницы"
                    : lang === "ar"
                      ? "خامة سطح العمل"
                      : "Countertop material"}
                </h3>
                <DecorPicker
                  label={
                    lang === "ru"
                      ? "Декор и текстура"
                      : lang === "ar"
                        ? "الديكور والملمس"
                        : "Decor and texture"
                  }
                  value={project.countertop.decor || "marble"}
                  color={project.countertop.color || DECORS.marble.color}
                  lang={lang}
                  onChange={(decor) =>
                    setProject((p: any) =>
                      updateCountertop(p, {
                        decor,
                        color: (DECORS as any)[decor].color,
                      }),
                    )
                  }
                  onColorChange={(color) =>
                    setProject((p: any) => updateCountertop(p, { color }))
                  }
                />
                <div className="segmented finishSelector" role="group">
                  <button
                    type="button"
                    className={!project.countertop.gloss ? "active" : ""}
                    aria-pressed={!project.countertop.gloss}
                    onClick={() =>
                      setProject((p: any) => updateCountertop(p, { gloss: false }))
                    }
                  >
                    {lang === "ru" ? "Матовая" : lang === "ar" ? "مطفي" : "Matte"}
                  </button>
                  <button
                    type="button"
                    className={project.countertop.gloss ? "active" : ""}
                    aria-pressed={!!project.countertop.gloss}
                    onClick={() =>
                      setProject((p: any) => updateCountertop(p, { gloss: true }))
                    }
                  >
                    {lang === "ru" ? "Глянцевая" : lang === "ar" ? "لامع" : "Gloss"}
                  </button>
                </div>
                <p className="note">
                  {lang === "ru"
                    ? "Образец задаёт рисунок, оттенок перекрашивает его, а финиш меняет отражение света."
                    : "The swatch sets the pattern, tint recolors it and finish changes reflections."}
                </p>
              </section>
              <section>
                <h3>{t("fixtures")}</h3>
                <label className="field">
                  {t("alignTo")}
                  <select
                    value={fixtureTargetId}
                    onChange={(e) => setFixtureTargetId(e.target.value)}
                  >
                    {floorTargets.map((m: any) => (
                      <option key={m.id} value={m.id}>
                        {moduleDisplayLabel(lang, m)} · {Math.round(m.x)}…
                        {Math.round(m.x + m.width)} мм
                      </option>
                    ))}
                  </select>
                </label>
                <div className="fixtureActions">
                  <button
                    disabled={!fixtureTargetId}
                    onClick={() => addBuiltIn("sink")}
                  >
                    ◒ {t("addSink")}
                  </button>
                  <button
                    disabled={!fixtureTargetId}
                    onClick={() => addBuiltIn("hob")}
                  >
                    ◉◉ {t("addHob")}
                  </button>
                </div>
                {(project.fixtures || []).map((f: any) => (
                  <div className="fixtureCard" key={f.id}>
                    <div className="fixtureHead">
                      <b>
                        {f.type === "sink"
                          ? lang === "ru"
                            ? "Раковина"
                            : "Sink"
                          : lang === "ru"
                            ? "Варочная панель"
                            : "Hob"}
                      </b>
                      <button
                        aria-label={
                          lang === "ru"
                            ? "Удалить встраиваемый элемент"
                            : lang === "ar"
                              ? "حذف العنصر المدمج"
                              : "Remove built-in fixture"
                        }
                        onClick={() =>
                          setProject((p: any) => removeFixture(p, f.id))
                        }
                      >
                        ×
                      </button>
                    </div>
                    <label className="field">
                      {t("alignTo")}
                      <select
                        value={f.targetModuleId}
                        onChange={(e) =>
                          setProject((p: any) =>
                            updateFixture(p, f.id, {
                              targetModuleId: e.target.value,
                            }),
                          )
                        }
                      >
                        {floorTargets.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {moduleDisplayLabel(lang, m)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="dimensionGrid">
                      <NumberField
                        compact
                        label={t("width")}
                        value={f.width}
                        min={100}
                        max={1200}
                        onCommit={(n) =>
                          setProject((p: any) =>
                            updateFixture(p, f.id, { width: n }),
                          )
                        }
                      />
                      <NumberField
                        compact
                        label="X"
                        value={f.offsetX}
                        min={-1000}
                        max={1000}
                        onCommit={(n) =>
                          setProject((p: any) =>
                            updateFixture(p, f.id, { offsetX: n }),
                          )
                        }
                      />
                      <NumberField
                        compact
                        label="Z"
                        value={f.offsetZ || 0}
                        min={-1000}
                        max={1000}
                        onCommit={(n) =>
                          setProject((p: any) =>
                            updateFixture(p, f.id, { offsetZ: n }),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </section>
            </div>
          ) : selectedModule ? (
            <div className="inspectorBody">
              <nav className="moduleTabs" aria-label={lang === "ru" ? "Раздел настроек модуля" : "Module settings section"}>
                <button type="button" className={moduleTab === "geometry" ? "active" : ""} aria-selected={moduleTab === "geometry"} onClick={() => setModuleTab("geometry")}>
                  <ModuleDimensionsIcon size={18} /><span>{lang === "ru" ? "Размер" : "Size"}</span>
                </button>
                {selectedFurniture && <>
                  <button type="button" className={moduleTab === "construction" ? "active" : ""} aria-selected={moduleTab === "construction"} onClick={() => setModuleTab("construction")}>
                    <ConstructionIcon size={18} /><span>{lang === "ru" ? "Корпус" : "Build"}</span>
                  </button>
                  <button type="button" className={moduleTab === "facade" ? "active" : ""} aria-selected={moduleTab === "facade"} onClick={() => setModuleTab("facade")}>
                    <DoorsIcon size={18} /><span>{lang === "ru" ? "Фасад" : "Front"}</span>
                  </button>
                  <button type="button" className={moduleTab === "materials" ? "active" : ""} aria-selected={moduleTab === "materials"} onClick={() => setModuleTab("materials")}>
                    <MaterialIcon size={18} /><span>{lang === "ru" ? "Цвет" : "Finish"}</span>
                  </button>
                  {applianceBayEligible && <button type="button" className={moduleTab === "equipment" ? "active" : ""} aria-selected={moduleTab === "equipment"} onClick={() => setModuleTab("equipment")}>
                    <ApplianceIcon size={18} /><span>{lang === "ru" ? "Техника" : "Appliance"}</span>
                  </button>}
                </>}
              </nav>
              <section className={moduleTab === "geometry" ? "" : "moduleTabHidden"}>
                <h3>{lang === "ru" ? "Габариты" : "Dimensions"}</h3>
                <div className="dimensionGrid">
                  <NumberField
                    compact
                    label={t("width")}
                    value={selectedModule.width}
                    min={100}
                    max={3000}
                    onCommit={(n) => patchModule({ width: n })}
                  />
                  <NumberField
                    compact
                    label={t("height")}
                    value={selectedModule.height}
                    min={100}
                    max={3000}
                    onCommit={(n) => patchModule({ height: n })}
                  />
                  <NumberField
                    compact
                    label={t("depth")}
                    value={selectedModule.depth}
                    min={20}
                    max={1500}
                    onCommit={(n) => patchModule({ depth: n })}
                  />
                </div>
              </section>
              <section className={moduleTab === "geometry" ? "" : "moduleTabHidden"}>
                <h3>{t("position")}</h3>
                <div className="twoGrid">
                  <NumberField
                    compact
                    label="X"
                    value={Math.round(selectedModule.x)}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        snapModuleAbsolute(
                          p,
                          selectedModule.id,
                          n,
                          selectedModule.z,
                        ),
                      )
                    }
                  />
                  <NumberField
                    compact
                    label="Z"
                    value={Math.round(selectedModule.z)}
                    onCommit={(n) =>
                      setProject((p: any) =>
                        snapModuleAbsolute(
                          p,
                          selectedModule.id,
                          selectedModule.x,
                          n,
                        ),
                      )
                    }
                  />
                  {isWallMountedType(selectedModule.type) && (
                    <NumberField
                      compact
                      label={t("height")}
                      value={selectedModule.elevation || 0}
                      min={0}
                      max={3000}
                      onCommit={(n) => patchModule({ elevation: n })}
                    />
                  )}
                </div>
                <>
                  <h3>
                    {lang === "ru"
                      ? "Поворот"
                      : lang === "ar"
                        ? "الدوران"
                        : "Rotation"}
                  </h3>
                  <div className="segmented">
                    {[0, 90, 180, 270].map((a) => (
                      <button
                        key={a}
                        className={
                          (selectedModule.rotationY || 0) === a ? "active" : ""
                        }
                        onClick={() =>
                          setProject((p: any) =>
                            rotateModule(p, selectedModule.id, a),
                          )
                        }
                      >
                        {a}°
                      </button>
                    ))}
                  </div>
                  <p className="note">
                    {lang === "ru"
                      ? "Можно повернуть любой модуль. При включённом автоповороте модуль сам развернётся при привязке к стене."
                      : lang === "ar"
                        ? "يمكن تدوير أي وحدة. عند تفعيل الدوران التلقائي ستتجه الوحدة تلقائياً عند الالتصاق بالجدار."
                        : "Rotate any module. With auto-rotate enabled, it turns automatically when snapping to a wall."}
                  </p>
                </>
              </section>
              {selectedFurniture && (
                <>
                  <section className={moduleTab === "construction" ? "" : "moduleTabHidden"}>
                    <h3>{lang === "ru" ? "Конструкция" : "Construction"}</h3>
                    <div className="dimensionGrid">
                      <NumberField
                        compact
                        label={lang === "ru" ? "Корпус" : "Board"}
                        value={selectedModule.board}
                        min={12}
                        max={30}
                        onCommit={(n) => patchModule({ board: n })}
                      />
                      {frontsEnabled && <NumberField
                        compact
                        label={lang === "ru" ? "Фасад" : "Front"}
                        value={selectedModule.frontThickness}
                        min={12}
                        max={30}
                        onCommit={(n) => patchModule({ frontThickness: n })}
                      />}
                      <NumberField
                        compact
                        label={
                          lang === "ru"
                            ? "Задняя"
                            : lang === "ar"
                              ? "ظهر"
                              : "Back"
                        }
                        value={selectedModule.back}
                        min={2}
                        max={12}
                        onCommit={(n) => patchModule({ back: n })}
                      />
                      {!isWallMountedType(selectedModule.type) && (
                        <NumberField
                          compact
                          label={
                            lang === "ru"
                              ? "Высота ножек"
                              : lang === "ar"
                                ? "ارتفاع الأرجل"
                                : "Leg height"
                          }
                          value={selectedModule.feet || 0}
                          min={0}
                          max={300}
                          onCommit={(n) => patchModule({ feet: n })}
                        />
                      )}
                      {["base", "sink", "drawer"].includes(selectedModule.type) && (
                        <>
                          <NumberField
                            compact
                            label={lang === "ru" ? "Добор слева" : "Left corner filler"}
                            value={selectedModule.cornerFillerLeft || 0}
                            min={0}
                            max={200}
                            onCommit={(n) => patchModule({ cornerFillerLeft: n })}
                          />
                          <NumberField
                            compact
                            label={lang === "ru" ? "Добор справа" : "Right corner filler"}
                            value={selectedModule.cornerFillerRight || 0}
                            min={0}
                            max={200}
                            onCommit={(n) => patchModule({ cornerFillerRight: n })}
                          />
                        </>
                      )}{" "}
                      {String(selectedModule.type).startsWith("corner") && (
                        <NumberField
                          compact
                          label={
                            lang === "ru"
                              ? "Проём угла"
                              : lang === "ar"
                                ? "فتحة الزاوية"
                                : "Corner opening"
                          }
                          value={selectedModule.cornerOpening || 0}
                          min={150}
                          max={1000}
                          onCommit={(n) => patchModule({ cornerOpening: n })}
                        />
                      )}
                      {[
                        "cornerBaseDiagonal",
                        "cornerBaseL",
                        "cornerWallDiagonal",
                        "cornerWallL",
                      ].includes(selectedModule.type) && (
                        <NumberField
                          compact
                          label={
                            lang === "ru"
                              ? "Глубина ряда"
                              : lang === "ar"
                                ? "عمق الصف"
                                : "Run depth"
                          }
                          value={
                            selectedModule.cornerRunDepth ||
                            (String(selectedModule.type).includes("Wall")
                              ? 320
                              : 600)
                          }
                          min={150}
                          max={1200}
                          onCommit={(n) =>
                            patchModule({
                              cornerRunDepth: n,
                              cornerWingDepth: n,
                            })
                          }
                        />
                      )}
                    </div>
                    <div className="optionGrid">
                      <label className="field">
                        {lang === "ru" ? "Дно" : "Bottom"}
                        <select
                          value={selectedModule.bottomMode}
                          onChange={(e) =>
                            patchModule({ bottomMode: e.target.value })
                          }
                        >
                          <option value="between">
                            {lang === "ru"
                              ? "Между боковинами"
                              : "Between sides"}
                          </option>
                          <option value="under">
                            {lang === "ru" ? "Под боковинами" : "Under sides"}
                          </option>
                        </select>
                      </label>
                      <label className="field">
                        {lang === "ru" ? "Задняя стенка" : "Back"}
                        <select
                          value={selectedModule.backMode}
                          onChange={(e) =>
                            patchModule({ backMode: e.target.value })
                          }
                        >
                          <option value="overlay">
                            {lang === "ru"
                              ? "Накладная"
                              : lang === "ar"
                                ? "خلفية خارجية"
                                : "Overlay"}
                          </option>
                          <option value="inset">
                            {lang === "ru"
                              ? "Вкладная"
                              : lang === "ar"
                                ? "خلفية داخلية"
                                : "Inset"}
                          </option>
                          <option value="none">
                            {lang === "ru"
                              ? "Без задней стенки"
                              : lang === "ar"
                                ? "بدون ظهر"
                                : "No back"}
                          </option>
                        </select>
                      </label>
                      {isWallMountedType(selectedModule.type) &&
                        !isDisplayOnlyType(selectedModule.type) && (
                        <label className="field">
                          {lang === "ru" ? "Верх" : "Top"}
                          <select
                            value={selectedModule.topMode}
                            onChange={(e) =>
                              patchModule({ topMode: e.target.value })
                            }
                          >
                            <option value="between">
                              {lang === "ru"
                                ? "Между боковинами"
                                : "Between sides"}
                            </option>
                            <option value="overlay">
                              {lang === "ru" ? "Крышка сверху" : "Overlay top"}
                            </option>
                          </select>
                        </label>
                      )}
                    </div>
                    {[
                      "cornerBaseBlind",
                      "cornerWallBlind",
                    ].includes(selectedModule.type) && (
                      <div className="cornerConstructionNote">
                        <span className="fieldCaption">
                          {lang === "ru"
                            ? frontsEnabled
                              ? "Сторона проёма и фасада"
                              : "Сторона проёма"
                            : "Door and opening side"}
                        </span>
                        <div
                          className="segmented cornerSideSelector"
                          role="group"
                          aria-label={
                            lang === "ru"
                              ? frontsEnabled
                                ? "Сторона фасада глухого углового модуля"
                                : "Сторона проёма глухого углового модуля"
                              : "Blind-corner door side"
                          }
                        >
                          {(["left", "right"] as const).map((side) => (
                            <button
                              key={side}
                              type="button"
                              className={
                                (selectedModule.cornerOpeningSide || "right") === side
                                  ? "active"
                                  : ""
                              }
                              aria-pressed={
                                (selectedModule.cornerOpeningSide || "right") === side
                              }
                              onClick={() =>
                                patchModule({
                                  cornerOpeningSide: side,
                                  frontOverrides: withoutFrontHingeOverrides(
                                    selectedModule.frontOverrides,
                                  ),
                                })
                              }
                            >
                              {lang === "ru"
                                ? `${frontsEnabled ? "Фасад" : "Проём"} ${side === "left" ? "слева" : "справа"}`
                                : `${frontsEnabled ? "Front" : "Opening"} ${side}`}
                            </button>
                          ))}
                        </div>
                        <NumberField
                          compact
                          label={lang === "ru" ? "Глубина стойки петель" : "Hinge partition depth"}
                          value={selectedModule.cornerMuntinWidth || 70}
                          min={28}
                          max={150}
                          onCommit={(n) =>
                            patchModule({ cornerMuntinWidth: n })
                          }
                        />
                        <b>
                          {lang === "ru"
                            ? "Как устроен глухой угол"
                            : "How the blind corner works"}
                        </b>
                        <span>
                          {lang === "ru"
                            ? `Доступный проём ${selectedModule.cornerOpening || 0} мм сейчас ${selectedModule.cornerOpeningSide === "left" ? "слева" : "справа"}. Монтажная перегородка повёрнута перпендикулярно фасаду, как боковина, и входит в корпус на ${selectedModule.cornerMuntinWidth || 70} мм. На неё крепится ответная планка петель, но она не перекрывает весь угловой объём.`
                            : `The ${selectedModule.cornerOpening || 0} mm access opening is on the ${selectedModule.cornerOpeningSide === "left" ? "left" : "right"}. The hinge partition is perpendicular to the front like a side panel and runs ${selectedModule.cornerMuntinWidth || 70} mm into the cabinet without blocking the full corner volume.`}
                        </span>
                        {frontsEnabled && <span>
                          {lang === "ru"
                            ? `Фасад накладной: между корпусом и дверцей ${selectedModule.gap || 0} мм, поэтому лицевая плоскость выступает примерно на ${(selectedModule.gap || 0) + (selectedModule.frontThickness || 0)} мм — это нормально.`
                            : `The overlay door sits ${selectedModule.gap || 0} mm off the body, so its face projects about ${(selectedModule.gap || 0) + (selectedModule.frontThickness || 0)} mm.`}
                        </span>}
                        {selectedModule.type === "cornerBaseBlind" && (
                          <>
                            <span>
                              {lang === "ru"
                                ? `Мойку можно встроить над доступной секцией. Для текущего проёма допустима чаша шириной до ${Math.max(100, Math.min(500, Math.max(250, Math.min(selectedModule.cornerOpening || 450, selectedModule.width - 260)) - 40))} мм; внутренняя полка будет убрана.`
                                : "A sink can be centered over the accessible bay; its width is limited by the opening and the inner shelf is removed."}
                            </span>
                            <button
                              type="button"
                              className="cornerSinkAction"
                              disabled={(project.fixtures || []).some(
                                (fixture: any) =>
                                  fixture.type === "sink" &&
                                  fixture.targetModuleId === selectedModule.id,
                              )}
                              onClick={addBlindCornerSink}
                            >
                              ◒{" "}
                              {(project.fixtures || []).some(
                                (fixture: any) =>
                                  fixture.type === "sink" &&
                                  fixture.targetModuleId === selectedModule.id,
                              )
                                ? lang === "ru"
                                  ? "Мойка уже добавлена"
                                  : "Sink added"
                                : lang === "ru"
                                  ? "Добавить мойку в эту секцию"
                                  : "Add sink to this bay"}
                            </button>
                            <span className="warningText">
                              {lang === "ru"
                                ? "Технику нельзя зажимать между боковинами обычного корпуса. Во вкладке «Техника» можно превратить доступную секцию в отдельный проём, сохранив пол и полки в глухой части."
                                : "An appliance cannot be squeezed between normal cabinet sides. Use the Appliance tab to reserve the accessible section while keeping the blind storage section."}
                            </span>
                          </>
                        )}
                      </div>
                    )}
                    {selectedModule.type === "drawer" ? (
                      <div className="twoGrid">
                        <NumberField
                          compact
                          label={lang === "ru" ? "Ящиков" : "Drawers"}
                          unit=""
                          value={selectedModule.drawerCount || 3}
                          min={1}
                          max={6}
                          onCommit={(n) =>
                            patchModule({ drawerCount: Math.round(n) })
                          }
                        />
                      </div>
                    ) : (
                      <div className="twoGrid">
                        <NumberField
                          compact
                          label={lang === "ru" ? "Полок" : "Shelves"}
                          unit=""
                          value={selectedModule.shelfCount || 0}
                          min={0}
                          max={8}
                          onCommit={(n) =>
                            patchModule({ shelfCount: Math.round(n) })
                          }
                        />
                        {frontsEnabled && <NumberField
                          compact
                          label={lang === "ru" ? "Зазор фасада" : "Front gap"}
                          value={selectedModule.gap}
                          min={1}
                          max={8}
                          onCommit={(n) => patchModule({ gap: n })}
                        />}
                      </div>
                    )}
                  </section>
                  <section className={moduleTab === "facade" ? "" : "moduleTabHidden"}>
                    <h3>{t("facade")}</h3>
                    {selectedModule.type !== "drawer" && (
                      <div
                        className="segmented frontPresence"
                        role="group"
                        aria-label={lang === "ru" ? "Наличие фасада" : "Front presence"}
                      >
                        <button
                          type="button"
                          disabled={applianceBayActive}
                          className={frontsEnabled ? "active" : ""}
                          aria-pressed={frontsEnabled}
                          onClick={() => patchModule({ frontEnabled: true })}
                        >
                          {lang === "ru" ? "С фасадом" : "With front"}
                        </button>
                        <button
                          type="button"
                          disabled={applianceBayActive}
                          className={!frontsEnabled ? "active" : ""}
                          aria-pressed={!frontsEnabled}
                          onClick={() => patchModule({ frontEnabled: false })}
                        >
                          {lang === "ru" ? "Без фасада" : "Open front"}
                        </button>
                      </div>
                    )}
                    {!frontsEnabled && (
                      <p className="note openFrontNote">
                        {applianceBayActive
                          ? lang === "ru"
                            ? "Фасад автоматически скрыт, потому что этот проём занят техникой. Верни режим «Шкаф» во вкладке «Техника», чтобы снова использовать фасад."
                            : "The front is hidden because this bay contains an appliance. Switch back to Cabinet in the Appliance tab to restore it."
                          : lang === "ru"
                            ? "Фасад, ручка и петли исключены из 3D, деталировки и сметы. Корпус, полки и угловая монтажная перегородка остаются."
                            : "The front, handle and hinges are excluded from 3D, parts and cost; the carcass, shelves and corner mounting stile remain."}
                      </p>
                    )}
                    {frontsEnabled && (
                      <div className="segmented">
                        {Object.keys(FRONT_STYLES).map((k) => (
                          <button
                            key={k}
                            className={
                              selectedModule.frontStyle === k ? "active" : ""
                            }
                            onClick={() => patchModule({ frontStyle: k })}
                          >
                            {frontLabel(lang, k)}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="optionGrid">
                      {frontsEnabled && <label className="field">
                        {t("handles")}
                        <select
                          value={selectedModule.handleStyle}
                          onChange={(e) =>
                            patchModule({ handleStyle: e.target.value })
                          }
                        >
                          {Object.keys(HANDLE_STYLES).map((k) => (
                            <option key={k} value={k}>
                              {handleLabel(lang, k)}
                            </option>
                          ))}
                        </select>
                      </label>}
                      {!isWallMountedType(selectedModule.type) && (
                        <label className="field">
                          {t("legs")}
                          <select
                            value={selectedModule.legStyle}
                            onChange={(e) =>
                              patchModule({ legStyle: e.target.value })
                            }
                          >
                            {Object.keys(LEG_STYLES).map((k) => (
                              <option key={k} value={k}>
                                {legLabel(lang, k)}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {frontsEnabled && selectedModule.type !== "drawer" && (
                          <label className="field">
                            {lang === "ru" ? "Количество створок" : t("doors")}
                            <select
                              value={
                                ["cornerBaseL", "cornerWallL"].includes(
                                  selectedModule.type,
                                )
                                  ? 2
                                  : selectedModule.doorCount
                              }
                              disabled={["cornerBaseL", "cornerWallL"].includes(
                                selectedModule.type,
                              )}
                              onChange={(e) =>
                                patchModule({ doorCount: +e.target.value })
                              }
                            >
                              {![
                                "cornerBaseBlind",
                                "cornerWallBlind",
                                "cornerBaseDiagonal",
                                "cornerWallDiagonal",
                                "cornerBaseL",
                                "cornerWallL",
                              ].includes(selectedModule.type) && (
                                <option value="0">Auto</option>
                              )}
                              {(["cornerBaseL", "cornerWallL"].includes(
                                selectedModule.type,
                              )
                                ? [2]
                                : [
                                      "cornerBaseBlind",
                                      "cornerWallBlind",
                                      "cornerBaseDiagonal",
                                      "cornerWallDiagonal",
                                    ].includes(selectedModule.type)
                                  ? [1, 2]
                                  : [1, 2, 3, 4, 5, 6]
                              ).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </label>
                        )}
                    </div>
                    {frontsEnabled && ["cornerBaseL", "cornerWallL"].includes(selectedModule.type) && (
                      <p className="note">
                        {lang === "ru"
                          ? "L-образный угол конструктивно состоит из двух связанных фасадных панелей, поэтому здесь фиксировано 2 створки. Фасад целиком можно отключить переключателем «Без фасада»."
                          : lang === "ar"
                            ? "تتكون زاوية L إنشائياً من لوحتي واجهة مترابطتين، لذلك العدد ثابت عند بابين. يمكن إخفاء الواجهة بالكامل بخيار «بدون واجهة»."
                            : "The L-corner uses two linked front panels, so its leaf count is fixed at 2. Disable the whole front with the No front switch."}
                      </p>
                    )}
                    {!isWallMountedType(selectedModule.type) && (
                      <p className="note">
                        {lang === "ru"
                          ? "Скрытые — это регулируемые ножки за цоколем. При высоте 0 мм корпус стоит прямо на полу."
                          : lang === "ar"
                            ? "الأرجل المخفية قابلة للتعديل خلف القاعدة. عند ارتفاع 0 مم يستقر الهيكل مباشرة على الأرض."
                            : "Hidden means adjustable feet behind a plinth. At 0 mm the carcass sits directly on the floor."}
                      </p>
                    )}
                    {frontsEnabled && <>
                    <h3>
                      {lang === "ru" ? "Выступ фасада" : "Front overhang"}
                    </h3>
                    <div className="dimensionGrid">
                      <NumberField
                        compact
                        label={lang === "ru" ? "Сверху" : "Top"}
                        value={selectedModule.frontOverhangTop || 0}
                        min={0}
                        max={400}
                        onCommit={(n) => patchModule({ frontOverhangTop: n })}
                      />
                      <NumberField
                        compact
                        label={lang === "ru" ? "Снизу" : "Bottom"}
                        value={selectedModule.frontOverhangBottom || 0}
                        min={0}
                        max={400}
                        onCommit={(n) =>
                          patchModule({ frontOverhangBottom: n })
                        }
                      />
                      <NumberField
                        compact
                        label={lang === "ru" ? "Слева" : "Left"}
                        value={selectedModule.frontOverhangLeft || 0}
                        min={0}
                        max={400}
                        onCommit={(n) => patchModule({ frontOverhangLeft: n })}
                      />
                      <NumberField
                        compact
                        label={lang === "ru" ? "Справа" : "Right"}
                        value={selectedModule.frontOverhangRight || 0}
                        min={0}
                        max={400}
                        onCommit={(n) => patchModule({ frontOverhangRight: n })}
                      />
                    </div>
                    </>}
                  </section>
                  <section className={moduleTab === "materials" ? "" : "moduleTabHidden"}>
                    <h3>{t("materials")}</h3>
                    <div className="materialRoleGrid">
                      <MaterialProductSelect
                        label={lang === "ru" ? "Материал корпуса" : "Carcass material"}
                        role="body"
                        value={selectedModule.bodyMaterialId || "mfc18"}
                        lang={lang}
                        onChange={(bodyMaterialId) =>
                          patchModule({ bodyMaterialId })
                        }
                      />
                      <MaterialProductSelect
                        label={lang === "ru" ? "Материал фасада" : "Front material"}
                        role="front"
                        value={
                          selectedModule.frontMaterialId ||
                          "highGlossMdfPvc18"
                        }
                        lang={lang}
                        onChange={(frontMaterialId) =>
                          patchModule({ frontMaterialId })
                        }
                      />
                    </div>
                    {!frontsEnabled && (
                      <p className="note retainedFrontSettings">
                        {lang === "ru"
                          ? applianceBayActive
                            ? "Фасад сейчас заменён лицевой частью техники, но его материал и цвет не потеряны: они снова применятся при возврате в режим «Шкаф»."
                            : "У модуля отключён фасад. Его материал и цвет сохранены и применятся, если снова включить фасад."
                          : "The front is currently inactive, but its saved material and decor will be restored when the front is enabled again."}
                      </p>
                    )}
                    <DecorPicker
                      label={
                        lang === "ru"
                          ? "Декор фасадов"
                          : lang === "ar"
                            ? "ديكور الواجهات"
                            : "Front decor"
                      }
                      value={selectedModule.frontDecor}
                      color={selectedModule.frontColor}
                      lang={lang}
                      onChange={(frontDecor) =>
                        patchModule({
                          frontDecor,
                          frontColor: (DECORS as any)[frontDecor].color,
                          frontOverrides: withoutFrontMaterialOverrides(
                            selectedModule.frontOverrides,
                          ),
                        })
                      }
                      onColorChange={(frontColor) =>
                        patchModule({
                          frontColor,
                          frontOverrides: withoutFrontMaterialOverrides(
                            selectedModule.frontOverrides,
                          ),
                        })
                      }
                    />
                    <DecorPicker
                      label={
                        lang === "ru"
                          ? "Декор корпуса"
                          : lang === "ar"
                            ? "ديكور الهيكل"
                            : "Body decor"
                      }
                      value={selectedModule.bodyDecor}
                      color={selectedModule.bodyColor}
                      lang={lang}
                      onChange={(bodyDecor) =>
                        patchModule({
                          bodyDecor,
                          bodyColor: (DECORS as any)[bodyDecor].color,
                        })
                      }
                      onColorChange={(bodyColor) =>
                        patchModule({ bodyColor })
                      }
                    />
                    <>
                    <p className="note materialHelp">
                      {lang === "ru"
                        ? "Образец задаёт рисунок и стартовый цвет. «Оттенок» перекрашивает этот же рисунок. Общая настройка применяется ко всем фасадам."
                        : lang === "ar"
                          ? "يحدد النموذج النقش واللون الأولي. يغيّر خيار درجة اللون لون النقش نفسه، ويُطبّق الإعداد العام على جميع الواجهات."
                          : "A swatch sets the pattern and starting color. Tint recolors that pattern. The common setting applies to every front."}
                    </p>
                    <h3>
                      {lang === "ru"
                        ? "Покрытие фасадов"
                        : lang === "ar"
                          ? "تشطيب الواجهات"
                          : "Front finish"}
                    </h3>
                    <div
                      className="segmented finishSelector"
                      role="group"
                      aria-label={
                        lang === "ru" ? "Покрытие фасадов" : "Front finish"
                      }
                    >
                      <button
                        type="button"
                        className={!selectedModule.gloss ? "active" : ""}
                        aria-pressed={!selectedModule.gloss}
                        onClick={() => patchModule({ gloss: false })}
                      >
                        {lang === "ru"
                          ? "Матовый"
                          : lang === "ar"
                            ? "مطفي"
                            : "Matte"}
                      </button>
                      <button
                        type="button"
                        className={selectedModule.gloss ? "active" : ""}
                        aria-pressed={!!selectedModule.gloss}
                        onClick={() => patchModule({ gloss: true })}
                      >
                        {lang === "ru"
                          ? "Глянцевый"
                          : lang === "ar"
                            ? "لامع"
                            : "Gloss"}
                      </button>
                    </div>
                    <p className="note">
                      {lang === "ru"
                        ? "Глянец применяется только к дверкам и ящикам; корпус остаётся матовым."
                        : lang === "ar"
                          ? "يُطبّق اللمعان على الأبواب والأدراج فقط، بينما يبقى الهيكل مطفياً."
                          : "Gloss applies to doors and drawers only; the carcass stays matte."}
                    </p>
                    {actualDoorCount > 0 && (
                      <details className="doorOverridesDisclosure">
                        <summary>
                          {lang === "ru"
                            ? "Отдельные фасады"
                            : lang === "ar"
                              ? "واجهات منفردة"
                              : "Individual fronts"}
                          <span>
                            {selectedModule.frontOverrides?.some(
                              (override: any) =>
                                override?.decor || override?.color,
                            )
                              ? lang === "ru"
                                ? "есть индивидуальные настройки"
                                : lang === "ar"
                                  ? "توجد إعدادات فردية"
                                  : "contains individual settings"
                              : lang === "ru"
                                ? "только если должны отличаться"
                                : lang === "ar"
                                  ? "عند الحاجة فقط"
                                  : "only when different"}
                          </span>
                        </summary>
                        <p className="note doorOverridesHelp">
                          {lang === "ru"
                            ? "Здесь можно переопределить отдельную дверку или ящик. Новый общий декор или оттенок снова выровняет все фасады."
                            : lang === "ar"
                              ? "يمكنك هنا تخصيص باب أو درج منفرد. اختيار إعداد عام جديد يوحّد جميع الواجهات مرة أخرى."
                              : "Override a single door or drawer here. A new common decor or tint makes all fronts match again."}
                        </p>
                        <div className="doorOverrides">
                          {Array.from({ length: actualDoorCount }, (_, i) => {
                            const ov = selectedModule.frontOverrides?.[i] || {},
                              renderedFront = selectedFrontParts[i],
                              blindCornerFront = [
                                "cornerBaseBlind",
                                "cornerWallBlind",
                              ].includes(selectedModule.type);
                            return (
                              <div className="doorOverride" key={i}>
                                <b>
                                  {selectedModule.type === "drawer"
                                    ? lang === "ru"
                                      ? `Ящик ${i + 1}`
                                      : `Drawer ${i + 1}`
                                    : lang === "ru"
                                      ? `Створка ${i + 1}`
                                      : `Door ${i + 1}`}
                                </b>
                                <label className="field">
                                  {lang === "ru" ? "Декор" : "Decor"}
                                  <select
                                    value={
                                      ov.decor || selectedModule.frontDecor
                                    }
                                    onChange={(e) =>
                                      setProject((p: any) =>
                                        updateDoorOverride(
                                          p,
                                          selectedModule.id,
                                          i,
                                          {
                                            decor: e.target.value,
                                            color: (DECORS as any)[
                                              e.target.value
                                            ].color,
                                          },
                                        ),
                                      )
                                    }
                                  >
                                    {decorOptions.map(([k, v]) => (
                                      <option key={k} value={k}>
                                        {v.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <label className="field">
                                  {lang === "ru" ? "Цвет" : "Color"}
                                  <input
                                    type="color"
                                    value={
                                      ov.color ||
                                      (ov.decor
                                        ? (DECORS as any)[ov.decor]?.color
                                        : selectedModule.frontColor)
                                    }
                                    onChange={(e) =>
                                      setProject((p: any) =>
                                        updateDoorOverride(
                                          p,
                                          selectedModule.id,
                                          i,
                                          { color: e.target.value },
                                        ),
                                      )
                                    }
                                  />
                                </label>
                                <label className="field">
                                  {lang === "ru"
                                    ? blindCornerFront
                                      ? "Петли по стойке"
                                      : "Петли"
                                    : lang === "ar"
                                      ? "المفصلات"
                                      : "Hinges"}
                                  <select
                                    disabled={blindCornerFront}
                                    value={
                                      ov.hingeSide ||
                                      renderedFront?.hingeSide ||
                                      (actualDoorCount === 1
                                        ? "left"
                                        : i === 0
                                          ? "left"
                                          : "right")
                                    }
                                    onChange={(e) =>
                                      setProject((p: any) =>
                                        updateDoorOverride(
                                          p,
                                          selectedModule.id,
                                          i,
                                          { hingeSide: e.target.value },
                                        ),
                                      )
                                    }
                                  >
                                    <option value="left">
                                      {lang === "ru"
                                        ? "Слева"
                                        : lang === "ar"
                                          ? "يسار"
                                          : "Left"}
                                    </option>
                                    <option value="right">
                                      {lang === "ru"
                                        ? "Справа"
                                        : lang === "ar"
                                          ? "يمين"
                                          : "Right"}
                                    </option>
                                  </select>
                                </label>
                                <NumberField
                                  compact
                                  label={
                                    lang === "ru"
                                      ? "Кол-во петель (0=авто)"
                                      : lang === "ar"
                                        ? "عدد المفصلات (0=تلقائي)"
                                        : "Hinges (0=auto)"
                                  }
                                  value={ov.hingeCount || 0}
                                  min={0}
                                  max={6}
                                  onCommit={(n) =>
                                    setProject((p: any) =>
                                      updateDoorOverride(
                                        p,
                                        selectedModule.id,
                                        i,
                                        { hingeCount: n },
                                      ),
                                    )
                                  }
                                />
                              </div>
                            );
                          })}
                        </div>
                      </details>
                    )}
                    </>
                  </section>
                  {applianceBayEligible && (
                    <section className={moduleTab === "equipment" ? "equipmentSection" : "moduleTabHidden"}>
                      <h3>{lang === "ru" ? "Конструкция модуля" : "Module construction"}</h3>
                      <div className="segmented applianceSelector" role="group" aria-label={lang === "ru" ? "Конструкция модуля" : "Module construction"}>
                        {(["none", "washer", "dishwasher"] as const).map((type) => (
                          <button
                            type="button"
                            key={type}
                            className={(selectedModule.applianceBay || "none") === type ? "active" : ""}
                            aria-pressed={(selectedModule.applianceBay || "none") === type}
                            onClick={() => patchModule({ applianceBay: type })}
                          >
                            {type === "none"
                              ? lang === "ru" ? "Шкаф с дном" : "Cabinet with bottom"
                              : type === "washer"
                                ? lang === "ru" ? "Ниша стиралки" : "Washer bay"
                                : lang === "ru" ? "Ниша ПММ" : "Dishwasher bay"}
                          </button>
                        ))}
                      </div>
                      {applianceBayActive ? (
                        <>
                          <p className="note equipmentExplanation">
                            {lang === "ru"
                              ? selectedModule.type === "cornerBaseBlind"
                                ? "Доступная часть углового модуля становится проёмом под технику. Дно, полки, фасад, цоколь и опоры убираются только из проёма; глухая секция остаётся с дном и полками."
                                : "Чистый проём задаётся по фактическому размеру техники и монтажному люфту. Можно оставить две собственные боковины либо одну, используя полноразмерную боковину соседнего шкафа как вторую опору. Дна, полок, фасада, цоколя и ножек внутри проёма нет."
                              : selectedModule.type === "cornerBaseBlind"
                                ? "The accessible corner section becomes an appliance bay; the blind storage section keeps its bottom and shelves."
                                : "The bay may use two own side panels or share one full-height side with an adjacent cabinet."}
                          </p>
                          {selectedModule.type !== "cornerBaseBlind" && (
                            <label className="field">
                              {lang === "ru" ? "Собственные опоры ниши" : "Bay support panels"}
                              <select
                                value={selectedModule.applianceSupportMode || "both"}
                                onChange={(e) => patchModule({ applianceSupportMode: e.target.value })}
                              >
                                <option value="both">{lang === "ru" ? "Слева и справа" : "Left and right"}</option>
                                <option value="left">{lang === "ru" ? "Только слева; справа соседний шкаф" : "Left only; share right"}</option>
                                <option value="right">{lang === "ru" ? "Только справа; слева соседний шкаф" : "Right only; share left"}</option>
                                <option value="none">{lang === "ru" ? "Нет; опоры с обеих сторон соседние" : "None; share both sides"}</option>
                              </select>
                            </label>
                          )}
                          <div className="dimensionGrid">
                            <NumberField compact label={t("width")} value={selectedModule.applianceWidth || (selectedModule.applianceBay === "washer" ? 600 : 598)} min={400} max={1200} onCommit={(n) => patchModule({ applianceWidth: n })} />
                            <NumberField compact label={t("height")} value={selectedModule.applianceHeight || (selectedModule.applianceBay === "washer" ? 850 : 815)} min={500} max={1000} onCommit={(n) => patchModule({ applianceHeight: n })} />
                            <NumberField compact label={t("depth")} value={selectedModule.applianceDepth || (selectedModule.applianceBay === "washer" ? 590 : 550)} min={400} max={900} onCommit={(n) => patchModule({ applianceDepth: n })} />
                            <NumberField compact label={lang === "ru" ? "Боковой люфт, всего" : "Total side clearance"} value={selectedModule.applianceSideClearance ?? (selectedModule.applianceBay === "washer" ? 20 : 2)} min={0} max={100} onCommit={(n) => patchModule({ applianceSideClearance: n })} />
                          </div>
                          <div className={applianceFits ? "fitStatus ok" : "fitStatus bad"}>
                            <b>{applianceFits ? (lang === "ru" ? "Помещается" : "Fits") : (lang === "ru" ? "Не помещается" : "Does not fit")}</b>
                            <span>
                              {lang === "ru" ? "Чистый проём" : "Clear opening"}: {applianceAvailableWidth}×{applianceAvailableHeight}×{applianceAvailableDepth} мм · {lang === "ru" ? "нужно по ширине" : "required width"} {applianceMeasurements?.requiredOpeningWidth || 0} мм · {lang === "ru" ? "верхний зазор" : "top clearance"} {applianceRequiredClearance} мм{applianceWorktopDrop > 0 ? ` · ${lang === "ru" ? "корпус варочной ниже столешницы" : "hob drop below worktop"} ${applianceWorktopDrop} мм` : ""}
                            </span>
                          </div>
                          {selectedModule.type !== "cornerBaseBlind" &&
                            applianceMeasurements &&
                            selectedModule.width < applianceMeasurements.requiredOuterWidth && (
                              <button
                                type="button"
                                className="fitModuleBtn"
                                onClick={() => patchModule({ width: applianceMeasurements.requiredOuterWidth })}
                              >
                                {lang === "ru"
                                  ? `Расширить модуль до ${applianceMeasurements.requiredOuterWidth} мм`
                                  : `Resize module to ${applianceMeasurements.requiredOuterWidth} mm`}
                              </button>
                            )}
                          {selectedModule.type === "cornerBaseBlind" &&
                            applianceMeasurements &&
                            selectedModule.cornerOpening < applianceMeasurements.requiredOpeningWidth && (
                              <button
                                type="button"
                                className="fitModuleBtn"
                                onClick={() => patchModule({ cornerOpening: applianceMeasurements.requiredOpeningWidth })}
                              >
                                {lang === "ru"
                                  ? `Увеличить проём до ${applianceMeasurements.requiredOpeningWidth} мм`
                                  : `Resize opening to ${applianceMeasurements.requiredOpeningWidth} mm`}
                              </button>
                            )}
                        </>
                      ) : (
                        <p className="note equipmentExplanation">
                          {lang === "ru"
                            ? "Сейчас выбран обычный шкаф: поэтому остаются дно и цоколь. Для открытого проёма с боковинами и верхней связующей планкой выберите «Ниша стиралки» или «Ниша ПММ»."
                            : "Cabinet mode keeps the carcass, front, shelves and supports. Selecting an appliance creates a real opening and updates parts and cost."}
                        </p>
                      )}

                      <h3>{lang === "ru" ? "В столешнице над модулем" : "In the worktop above"}</h3>
                      <div className="segmented applianceSelector" role="group" aria-label={lang === "ru" ? "Элемент столешницы" : "Worktop fixture"}>
                        {(["none", "sink", "hob"] as const).map((type) => (
                          <button
                            type="button"
                            key={type}
                            className={(selectedFixture?.type || "none") === type ? "active" : ""}
                            aria-pressed={(selectedFixture?.type || "none") === type}
                            onClick={() => setSelectedWorktopFixture(type)}
                          >
                            {type === "none"
                              ? lang === "ru" ? "Нет" : "None"
                              : type === "sink"
                                ? lang === "ru" ? "Мойка" : "Sink"
                                : lang === "ru" ? "Варочная" : "Hob"}
                          </button>
                        ))}
                      </div>
                      {selectedFixture && (
                        <>
                          <div className="dimensionGrid fixtureInlineFields">
                            <NumberField compact label={t("width")} value={selectedFixture.width} min={100} max={1200} onCommit={(n) => setProject((p: any) => updateFixture(p, selectedFixture.id, { width: n }))} />
                            <NumberField compact label={t("depth")} value={selectedFixture.depth} min={100} max={900} onCommit={(n) => setProject((p: any) => updateFixture(p, selectedFixture.id, { depth: n }))} />
                            <NumberField compact label={selectedFixture.type === "sink" ? (lang === "ru" ? "Глубина чаши" : "Bowl depth") : (lang === "ru" ? "Высота корпуса" : "Body height")} value={selectedFixture.installationHeight || (selectedFixture.type === "sink" ? 200 : 51)} min={selectedFixture.type === "sink" ? 80 : 20} max={selectedFixture.type === "sink" ? 400 : 150} onCommit={(n) => setProject((p: any) => updateFixture(p, selectedFixture.id, { installationHeight: n }))} />
                            <NumberField compact label={lang === "ru" ? "Высота борта" : "Rim height"} value={selectedFixture.rimHeight || 6} min={1} max={30} onCommit={(n) => setProject((p: any) => updateFixture(p, selectedFixture.id, { rimHeight: n }))} />
                            <NumberField compact label="X" value={selectedFixture.offsetX || 0} min={-1000} max={1000} onCommit={(n) => setProject((p: any) => updateFixture(p, selectedFixture.id, { offsetX: n }))} />
                          </div>
                          <p className="note fixtureDepthNote">
                            {lang === "ru"
                              ? selectedFixture.type === "sink"
                                ? "Глубина чаши учитывается ниже столешницы; 200 мм — реалистичное стартовое значение, но точный вырез и глубину нужно брать из паспорта мойки."
                                : "Тонкая стеклянная панель видна сверху, а корпус варочной поверхности уходит под столешницу. Стартовая высота 51 мм взята как типовая, точные зазоры зависят от модели."
                              : selectedFixture.type === "sink"
                                ? "Bowl depth extends below the worktop; verify the exact cut-out and depth from the sink datasheet."
                                : "The thin glass top remains visible while the appliance body extends below the worktop; verify model-specific clearances."}
                          </p>
                        </>
                      )}
                      {applianceBayActive && selectedFixture?.type === "sink" && (
                        <p className="warning">{lang === "ru" ? "Конфликт: мойка и техника занимают один проём. Такой вариант нельзя отдавать в производство." : "Conflict: the sink and appliance occupy the same bay."}</p>
                      )}
                      {applianceBayActive && selectedFixture?.type === "hob" && (
                        <p className="warning">{lang === "ru" ? applianceFits ? "По введённым размерам корпуса помещаются, но вентиляцию и минимальные зазоры всё равно нужно сверить по паспортам обеих моделей." : `Не помещается по высоте: корпус варочной выступает ниже столешницы на ${applianceWorktopDrop} мм. Увеличь высоту столешницы/ниши или выбери совместимые модели.` : "A hob above an appliance requires model-specific ventilation and clearance checks."}</p>
                      )}
                    </section>
                  )}
                  {!focusId && (
                    <button className="focusBtn" onClick={enterFocus}>
                      {t("focusEdit")}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="empty">{t("selectObject")}</div>
          )}
          </aside>
        )}
      </main>
      {!focusId ? (
        <nav className="bottomNav">
          <button
            className={panel === "room" ? "active" : ""}
            onClick={() => openPanel("room")}
          >
            <HomeIcon />
            <span>{t("room")}</span>
          </button>
          <button
            className={panel === "catalog" ? "active" : ""}
            onClick={() => openPanel("catalog")}
          >
            <CatalogIcon />
            <span>{t("catalog")}</span>
          </button>
          <button
            className={panel === "project" ? "active" : ""}
            onClick={() => openPanel("project")}
          >
            <ProjectIcon />
            <span>{t("project")}</span>
          </button>
          <button
            className={panel === "cost" ? "active" : ""}
            onClick={() => openPanel("cost")}
          >
            <CostIcon />
            <span>
              {lang === "ru" ? "Смета" : lang === "ar" ? "التكلفة" : "Cost"}
            </span>
          </button>
          <button
            className={panel === "settings" ? "active" : ""}
            onClick={() => openPanel("settings")}
          >
            <SettingsIcon />
            <span>{t("settings")}</span>
          </button>
        </nav>
      ) : (
        <nav className="bottomNav focusNav">
          <button
            className={panel === "selection" ? "active" : ""}
            onClick={() => {
              setDetail("none");
              if (focusId) setSelection({ kind: "module", id: focusId });
              setPanel("selection");
            }}
          >
            <EditIcon />
            <span>{t("parameters")}</span>
          </button>
          <button
            className={panel === "parts" ? "active" : ""}
            onClick={showParts}
          >
            <PartsIcon />
            <span>{t("parts")}</span>
          </button>
          <button
            className={panel === "print" ? "active" : ""}
            onClick={() => setPanel("print")}
          >
            <PrintIcon />
            <span>{t("print")}</span>
          </button>
        </nav>
      )}
    </div>
  );
}
