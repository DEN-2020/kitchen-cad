export const APPLIANCE_BAY_DEFAULTS = Object.freeze({
  washer: Object.freeze({
    width: 598,
    height: 845,
    depth: 590,
    sideClearance: 20,
    topClearance: 15,
  }),
  dishwasher: Object.freeze({
    width: 598,
    height: 815,
    depth: 550,
    sideClearance: 2,
    topClearance: 5,
  }),
});

export function applianceDefaults(type = "washer") {
  return {
    ...(APPLIANCE_BAY_DEFAULTS[type] || APPLIANCE_BAY_DEFAULTS.washer),
  };
}

export function applianceBayMeasurements(module, projectDefaults = {}) {
  const defaults = applianceDefaults(module?.applianceBay),
    applianceWidth = Number(module?.applianceWidth) || defaults.width,
    applianceHeight = Number(module?.applianceHeight) || defaults.height,
    applianceDepth = Number(module?.applianceDepth) || defaults.depth,
    sideClearance = Math.max(
      0,
      Number.isFinite(Number(module?.applianceSideClearance))
        ? Number(module.applianceSideClearance)
        : defaults.sideClearance,
    ),
    board = Math.max(0, Number(module?.board) || 18),
    corner = module?.type === "cornerBaseBlind",
    openingWidth = corner
      ? Math.max(
          250,
          Math.min(
            Number(module?.cornerOpening) || 450,
            (Number(module?.width) || 0) - 260,
          ),
        )
      : Math.max(0, (Number(module?.width) || 0) - 2 * board),
    requiredOpeningWidth = applianceWidth + sideClearance,
    requiredOuterWidth = corner
      ? requiredOpeningWidth
      : requiredOpeningWidth + 2 * board,
    topClearance =
      module?.applianceBay === "washer"
        ? Math.max(
            5,
            Number(projectDefaults?.washerClearance) || defaults.topClearance,
          )
        : defaults.topClearance,
    availableHeight =
      (Number(module?.height) || 0) + (Number(module?.feet) || 0),
    availableDepth = Math.max(
      Number(module?.depth) || 0,
      Number(projectDefaults?.countertopDepth) || 0,
    );
  return {
    applianceWidth,
    applianceHeight,
    applianceDepth,
    sideClearance,
    board,
    corner,
    openingWidth,
    requiredOpeningWidth,
    requiredOuterWidth,
    topClearance,
    availableHeight,
    availableDepth,
    fits:
      requiredOpeningWidth <= openingWidth + 0.01 &&
      applianceHeight + topClearance <= availableHeight + 0.01 &&
      applianceDepth <= availableDepth + 0.01,
  };
}
