const SUPPORTED_TYPES = new Set([
  'base',
  'drawer',
  'sink',
  'cornerBase',
  'cornerBaseBlind',
  'cornerBaseDiagonal',
  'cornerBaseL',
  'tall',
  'tallOven',
]);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Local support centres in millimetres, measured from the cabinet back-left. */
export function cabinetSupportPoints(module) {
  if (
    !SUPPORTED_TYPES.has(module.type) ||
    !Number.isFinite(module.feet) ||
    module.feet <= 0
  ) return [];

  const w = Number(module.width), d = Number(module.depth);
  const insetX = clamp(w * 0.11, 45, 75);
  const insetZ = clamp(d * 0.11, 45, 75);
  // A hidden front support must sit fully behind the plinth, whose front face
  // is roughly 56 mm from the cabinet front. Its 48 mm diameter therefore
  // needs a centre at least 80 mm back; 105 mm leaves a useful visual margin.
  const frontInsetZ = module.legStyle === 'hidden' ? Math.min(d / 2, 105) : insetZ;
  if (['cornerBaseDiagonal', 'cornerBaseL'].includes(module.type)) {
    const arm = Math.min(
      w,
      d,
      Number(module.cornerRunDepth) || Number(module.cornerWingDepth) || 600,
    );
    return [
      [insetX, insetZ],
      [w - insetX, insetZ],
      [w - insetX, Math.max(frontInsetZ, arm - frontInsetZ)],
      [insetX, d - frontInsetZ],
      [Math.max(insetX, arm - insetX), d - frontInsetZ],
    ];
  }
  if (module.type === 'cornerBaseBlind' && w >= 1000) {
    return [
      [insetX, insetZ],
      [w / 2, insetZ],
      [w - insetX, insetZ],
      [insetX, d - frontInsetZ],
      [w / 2, d - frontInsetZ],
      [w - insetX, d - frontInsetZ],
    ];
  }
  return [
    [insetX, insetZ],
    [w - insetX, insetZ],
    [insetX, d - frontInsetZ],
    [w - insetX, d - frontInsetZ],
  ];
}

export function buildCabinetSupportObjects(module, moduleCode) {
  const points = cabinetSupportPoints(module);
  if (!points.length) return [];
  const hidden = module.legStyle === 'hidden';
  const round = module.legStyle === 'round' || hidden;
  const width = round ? 48 : 44;
  return points.map(([x, z], index) => ({
    id: `${moduleCode}-LEG${index + 1}`,
    moduleId: module.id,
    kind: 'support',
    role: 'support',
    shape: round ? 'cylinder' : 'box',
    size: [width, module.feet, width],
    center: [module.x + x, module.y - module.feet / 2, module.z + z],
    appearance: {
      pattern: 'solid',
      color: hidden ? '#252b2e' : round ? '#333b3f' : '#454d50',
      gloss: false,
    },
  }));
}
