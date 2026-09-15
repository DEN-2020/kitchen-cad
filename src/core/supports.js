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
    module.legStyle === 'hidden' ||
    !Number.isFinite(module.feet) ||
    module.feet <= 0
  ) return [];

  const w = Number(module.width), d = Number(module.depth);
  const insetX = clamp(w * 0.11, 45, 75);
  const insetZ = clamp(d * 0.11, 45, 75);
  if (['cornerBaseDiagonal', 'cornerBaseL'].includes(module.type)) {
    const arm = Math.min(
      w,
      d,
      Number(module.cornerRunDepth) || Number(module.cornerWingDepth) || 600,
    );
    return [
      [insetX, insetZ],
      [w - insetX, insetZ],
      [w - insetX, Math.max(insetZ, arm - insetZ)],
      [insetX, d - insetZ],
      [Math.max(insetX, arm - insetX), d - insetZ],
    ];
  }
  return [
    [insetX, insetZ],
    [w - insetX, insetZ],
    [insetX, d - insetZ],
    [w - insetX, d - insetZ],
  ];
}

export function buildCabinetSupportObjects(module, moduleCode) {
  const points = cabinetSupportPoints(module);
  if (!points.length) return [];
  const round = module.legStyle === 'round';
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
      color: round ? '#333b3f' : '#454d50',
      gloss: false,
    },
  }));
}
