import test from "node:test";
import assert from "node:assert/strict";
import { edgeVisualSegments } from "../src/core/edge-visuals.js";

test("edge-band visuals map U and V edges to a vertical panel", () => {
  const segments = edgeVisualSegments({
    kind: "part",
    u: 600,
    v: 720,
    thickness: 18,
    size: [600, 720, 18],
    edges: [0.8, 0, 2, 0],
  });

  assert.equal(segments.length, 2);
  assert.deepEqual(
    segments.map((segment) => [segment.label, segment.color]),
    [["U−", "#36cbd8"], ["V−", "#f0a34a"]],
  );
  assert.equal(segments[0].position[0], -300.35);
  assert.equal(segments[1].position[1], -360.35);
});

test("edge-band visuals follow the V edge of a horizontal rail", () => {
  const [segment] = edgeVisualSegments({
    kind: "part",
    u: 600,
    v: 100,
    thickness: 18,
    size: [600, 18, 100],
    edges: [0, 0, 0, 0.8],
  });

  assert.equal(segment.label, "V+");
  assert.equal(segment.position[2], 50.35);
  assert.deepEqual(segment.size, [600.6, 18.8, 3]);
});

test("objects without banded edges do not receive edge-band visuals", () => {
  assert.deepEqual(edgeVisualSegments({ kind: "part", edges: [0, 0, 0, 0] }), []);
  assert.deepEqual(edgeVisualSegments({ kind: "support", edges: [2, 2, 2, 2] }), []);
});
