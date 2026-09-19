const permutations = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
];

function axesFor(part) {
  const size = (part?.size || []).map(Number),
    dimensions = [Number(part?.u), Number(part?.v), Number(part?.thickness)];
  if (size.length !== 3 || dimensions.some((value) => !Number.isFinite(value)))
    return null;
  return permutations.reduce((best, axes) => {
    const score = axes.reduce(
      (sum, axis, dimension) => sum + Math.abs(size[axis] - dimensions[dimension]),
      0,
    );
    return !best || score < best.score ? { axes, score } : best;
  }, null)?.axes;
}

/** UI-only, slightly exaggerated strips that make specified edge banding visible in 3D. */
export function edgeVisualSegments(part) {
  if (part?.kind !== "part" || !Array.isArray(part?.edges) || part.edges.length !== 4)
    return [];
  const axes = axesFor(part);
  if (!axes) return [];
  const [uAxis, vAxis, thicknessAxis] = axes,
    size = part.size.map(Number),
    sides = [
      { axis: uAxis, sign: -1, spanAxis: vAxis, label: "U−" },
      { axis: uAxis, sign: 1, spanAxis: vAxis, label: "U+" },
      { axis: vAxis, sign: -1, spanAxis: uAxis, label: "V−" },
      { axis: vAxis, sign: 1, spanAxis: uAxis, label: "V+" },
    ];
  return sides.flatMap((side, index) => {
    const edge = Number(part.edges[index]) || 0;
    if (edge <= 0) return [];
    const visualWidth = Math.max(3, edge),
      segmentSize = [visualWidth, visualWidth, visualWidth],
      position = [0, 0, 0];
    segmentSize[side.axis] = visualWidth;
    segmentSize[side.spanAxis] = size[side.spanAxis] + 0.6;
    segmentSize[thicknessAxis] = size[thicknessAxis] + 0.8;
    position[side.axis] = side.sign * (size[side.axis] / 2 + 0.35);
    return [{
      key: `${side.label}-${index}`,
      label: side.label,
      edge,
      color: edge >= 1.5 ? "#f0a34a" : "#36cbd8",
      size: segmentSize,
      position,
    }];
  });
}
