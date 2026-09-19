import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  Edges,
  Environment,
  Grid,
  Html,
  Lightformer,
  Line,
  OrbitControls,
  RoundedBox,
} from "@react-three/drei";
import * as THREE from "three";
import { proceduralTexture } from "./materials";
import { ApplianceVisual } from "./ApplianceVisual";
import { explodedCentre } from "../domain/view-math.js";
import { DECORS, isDisplayOnlyType } from "../../src/catalog/materials.js";
import { jointLinePoints } from "../../src/core/countertop-joints.js";
import { doorHingeFrame, objectInDoorFrame } from "../../src/core/door-motion.js";
import { clampPoseToRoom } from "../../src/core/placement.js";
import { cinematicCameraPose } from "../../src/core/showroom-path.js";
import { edgeVisualSegments } from "../../src/core/edge-visuals.js";
import type { DimensionDetail, Selection, ViewMode } from "../domain/core";
const mm = (v: number) => v / 1000,
  skinTypes = new Set(["washer", "dishwasher", "oven", "fridge"]),
  cornerVisualTypes = new Set([
    "cornerBaseDiagonal",
    "cornerBaseL",
    "cornerWallDiagonal",
    "cornerWallL",
  ]);
function pointOnPlane(e: any, y: number) {
  return e.ray.intersectPlane(
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -y),
    new THREE.Vector3(),
  );
}
function FixtureVisual({ object }: { object: any }) {
  const [x, y, z] = object.localCenter.map(mm),
    w = mm(object.size[0]),
    d = mm(object.size[2]),
    installationHeight = mm(object.installationHeight || object.size[1]),
    rimHeight = mm(object.rimHeight || 6);
  if (object.kind === "fixture-hob")
    return (
      <group position={[x, y, z]}>
        <mesh>
          <boxGeometry args={[w, rimHeight, d]} />
          <meshPhysicalMaterial
            color="#0b1114"
            roughness={0.1}
            clearcoat={0.9}
            clearcoatRoughness={0.08}
          />
        </mesh>
        <mesh
          position={[
            0,
            -(Math.max(0.02, installationHeight - rimHeight) + rimHeight) / 2,
            0,
          ]}
        >
          <boxGeometry
            args={[
              w * 0.86,
              Math.max(0.02, installationHeight - rimHeight),
              d * 0.78,
            ]}
          />
          <meshStandardMaterial color="#252d31" metalness={0.28} roughness={0.4} />
        </mesh>
        {[-w * 0.25, w * 0.25].map((dx, i) => (
          <group
            key={i}
            position={[dx, rimHeight / 2 + 0.003, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <mesh>
              <torusGeometry args={[Math.min(w, d) * 0.18, 0.008, 10, 32]} />
              <meshStandardMaterial color="#9aa6ab" metalness={0.65} />
            </mesh>
          </group>
        ))}
      </group>
    );
  return (
    <group position={[x, y, z]}>
      <RoundedBox
        args={[w * 0.8, rimHeight, d * 0.74]}
        radius={Math.min(0.025, w * 0.04)}
        smoothness={3}
      >
        <meshStandardMaterial color="#94a0a4" metalness={0.76} roughness={0.23} />
      </RoundedBox>
      <RoundedBox
        args={[w * 0.69, rimHeight + 0.003, d * 0.61]}
        radius={Math.min(0.022, w * 0.035)}
        smoothness={3}
        position={[0, rimHeight / 2 + 0.002, 0]}
      >
        <meshStandardMaterial color="#26373e" metalness={0.34} roughness={0.2} />
      </RoundedBox>
      <mesh position={[0, -installationHeight / 2, 0]}>
        <boxGeometry args={[w * 0.68, installationHeight, d * 0.6]} />
        <meshStandardMaterial
          color="#7d8b90"
          metalness={0.7}
          roughness={0.28}
          transparent
          opacity={0.72}
        />
      </mesh>
      <mesh position={[0, 0.09, -d * 0.36]}>
        <cylinderGeometry args={[0.012, 0.012, 0.17, 16]} />
        <meshStandardMaterial color="#abb5b8" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.18, -d * 0.29]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.065, 0.011, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#abb5b8" metalness={0.8} />
      </mesh>
    </group>
  );
}
function EdgeBandVisual({ object }: { object: any }) {
  const segments = useMemo(
    () => edgeVisualSegments(object),
    [object.kind, object.u, object.v, object.thickness, object.size, object.edges],
  );
  return (
    <>
      {segments.map((segment: any) => (
        <mesh
          key={segment.key}
          position={segment.position.map(mm) as [number, number, number]}
          renderOrder={6}
        >
          <boxGeometry args={segment.size.map(mm) as [number, number, number]} />
          <meshBasicMaterial color={segment.color} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}
function Surface({
  object,
  selected = false,
  onSelect,
  ghost = false,
}: {
  object: any;
  selected?: boolean;
  onSelect?: () => void;
  ghost?: boolean;
}) {
  if (object.kind === "fixture-sink" || object.kind === "fixture-hob")
    return <FixtureVisual object={object} />;
  const size = object.size.map(mm) as [number, number, number],
    local = object.localCenter.map(mm) as [number, number, number],
    a = object.appearance || {},
    texture = useMemo(
      () => proceduralTexture(a.pattern, a.color, a.grain),
      [a.pattern, a.color, a.grain],
    ),
    glass =
      String(object.kind).includes("glass") || object.kind === "front-insert",
    metallic = object.kind === "handle" || object.role === "support",
    roughness = glass
      ? 0.11
      : a.gloss
        ? 0.1
        : a.pattern === "stone"
          ? 0.34
          : object.role === "front"
            ? 0.4
            : 0.58;
  if (object.shape === "disc")
    return (
      <mesh
        position={local}
        rotation={[Math.PI / 2, object.rotationY || 0, 0]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[2], 48]} />
        <meshPhysicalMaterial
          color={ghost ? "#52b9c7" : a.color || "#77858a"}
          roughness={object.kind === "appliance-glass" ? 0.1 : 0.24}
          metalness={object.kind === "appliance-glass" ? 0.12 : 0.62}
          clearcoat={object.kind === "appliance-glass" ? 0.8 : 0.2}
          transparent={ghost || object.kind === "appliance-glass"}
          opacity={ghost ? 0.2 : object.kind === "appliance-glass" ? 0.88 : 1}
          depthWrite={!ghost}
        />
        {(selected || ghost) && (
          <Edges color={ghost ? "#62dcea" : "#9a75ff"} lineWidth={2} />
        )}
      </mesh>
    );
  return (
    <mesh
      position={local}
      rotation={[0, object.rotationY || 0, 0]}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      {object.shape === "cylinder" ? (
        <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 18]} />
      ) : (
        <boxGeometry args={size} />
      )}
      <meshPhysicalMaterial
        map={ghost ? undefined : texture || undefined}
        color={ghost ? "#52b9c7" : a.color || "#ccc"}
        roughness={roughness}
        metalness={metallic ? 0.45 : 0.01}
        clearcoat={a.gloss ? 0.92 : object.role === "front" ? 0.08 : 0}
        clearcoatRoughness={a.gloss ? 0.07 : 0.3}
        transmission={glass ? 0.22 : 0}
        thickness={glass ? 0.012 : 0}
        ior={1.46}
        transparent={glass || ghost}
        opacity={ghost ? 0.2 : glass ? 0.55 : 1}
        depthWrite={!ghost}
      />
      {!ghost && <EdgeBandVisual object={object} />}
      {object.role === "front" &&
        object.hingeSide &&
        (object.hingeDrilling?.positionsFromTop ||
          Array.from({ length: object.hingeCount || 2 }, (_, i) => {
            const n = object.hingeCount || 2,
              edge = Math.min(110, Math.max(70, object.v * 0.12));
            return n === 1
              ? object.v / 2
              : edge + i * ((object.v - 2 * edge) / (n - 1));
          })).map((fromTop: number, i: number) => {
          const cupCenter = mm(object.hingeDrilling?.cupCenterFromEdge || 20.5),
            yy = size[1] / 2 - mm(fromTop);
          return (
            <mesh
              key={`hinge-${i}`}
              position={[
                object.hingeSide === "left"
                  ? -size[0] / 2 + cupCenter
                  : size[0] / 2 - cupCenter,
                yy,
                -size[2] / 2 - 0.001,
              ]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry args={[0.0175, 0.0175, 0.002, 24]} />
              <meshBasicMaterial color="#6d54d9" transparent opacity={0.9} />
            </mesh>
          );
        })}
      {(selected || ghost) && (
        <Edges color={ghost ? "#62dcea" : "#9a75ff"} lineWidth={2} />
      )}
    </mesh>
  );
}
function DoorAssembly({
  front,
  attachments,
  open,
  selected,
  onSelect,
}: {
  front: any;
  attachments: any[];
  open: boolean;
  selected: boolean;
  onSelect?: () => void;
}) {
  const moving = useRef<THREE.Group>(null!),
    { invalidate } = useThree(),
    frame = useMemo(() => doorHingeFrame(front), [front]),
    framedFront = useMemo(
      () => ({ ...front, localCenter: frame.frontCenter, rotationY: 0 }),
      [front, frame],
    ),
    framedAttachments = useMemo(
      () => attachments.map((object) => objectInDoorFrame(object, frame)),
      [attachments, frame],
    );
  useEffect(() => invalidate(), [open, invalidate]);
  useFrame((_, delta) => {
    if (!moving.current) return;
    const target = open ? frame.openAngle : 0,
      next = THREE.MathUtils.damp(moving.current.rotation.y, target, 8, delta);
    moving.current.rotation.y = Math.abs(next - target) < 0.001 ? target : next;
    if (Math.abs(moving.current.rotation.y - target) >= 0.001) invalidate();
  });
  return (
    <group
      position={frame.position.map(mm) as [number, number, number]}
      rotation={[0, frame.rotationY, 0]}
    >
      <group ref={moving}>
        <Surface object={framedFront} selected={selected} onSelect={onSelect} />
        {framedAttachments.map((object) => (
          <Surface key={object.id} object={object} onSelect={onSelect} />
        ))}
      </group>
    </group>
  );
}
function setControlsEnabled(controls: any, value: boolean) {
  if (controls && "enabled" in controls) {
    controls.enabled = value;
    controls.update?.();
  }
}
function CornerVisual({ module }: { module: any }) {
  const w = mm(module.width),
    h = mm(module.height),
    d = mm(module.depth),
    wall = String(module.type).includes("Wall"),
    arm = Math.min(
      w,
      d,
      mm(
        Number(module.cornerRunDepth) ||
          Number(module.cornerWingDepth) ||
          (wall ? 320 : 600),
      ),
    ),
    body = module.bodyColor || "#e7e3d8",
    bodyPattern = (DECORS as any)[module.bodyDecor]?.pattern,
    bodyTexture = useMemo(
      () => proceduralTexture(bodyPattern, body, module.grain),
      [bodyPattern, body, module.grain],
    );
  if (String(module.type).endsWith("L"))
    return (
      <group>
        <mesh position={[w / 2, h / 2, arm / 2]} castShadow receiveShadow>
          <boxGeometry args={[w, h, arm]} />
          <meshPhysicalMaterial
            map={bodyTexture || undefined}
            color={body}
            roughness={0.58}
          />
        </mesh>
        <mesh position={[arm / 2, h / 2, d / 2]} castShadow receiveShadow>
          <boxGeometry args={[arm, h, d]} />
          <meshPhysicalMaterial
            map={bodyTexture || undefined}
            color={body}
            roughness={0.58}
          />
        </mesh>
        <Edges color="#5b6b70" lineWidth={1} />
      </group>
    );
  const dx = w - arm,
    dz = d - arm,
    len = Math.max(0.18, Math.hypot(dx, dz)),
    theta = Math.atan2(dz, dx);
  return (
    <group>
      <mesh position={[w / 2, h / 2, arm / 2]} castShadow receiveShadow>
        <boxGeometry args={[w, h, arm]} />
        <meshPhysicalMaterial
          map={bodyTexture || undefined}
          color={body}
          roughness={0.58}
        />
      </mesh>
      <mesh position={[arm / 2, h / 2, d / 2]} castShadow receiveShadow>
        <boxGeometry args={[arm, h, d]} />
        <meshPhysicalMaterial
          map={bodyTexture || undefined}
          color={body}
          roughness={0.58}
        />
      </mesh>
    </group>
  );
}
function ModuleVisual({
  module,
  room,
  objects,
  selected,
  selectedPartId,
  focus,
  detail,
  explode,
  doorsOpen,
  ghostEmbeddedAppliance,
  onSelect,
  onSelectPart,
  onCommitPosition,
}: {
  module: any;
  room: any;
  objects: any[];
  selected: boolean;
  selectedPartId: string | null;
  focus: boolean;
  detail: DimensionDetail;
  explode: number;
  doorsOpen: boolean;
  ghostEmbeddedAppliance: boolean;
  onSelect: () => void;
  onSelectPart: (id: string) => void;
  onCommitPosition: (x: number, z: number) => void;
}) {
  const group = useRef<THREE.Group>(null!),
    draggingRef = useRef(false),
    offset = useRef({ x: 0, z: 0 }),
    [dragging, setDragging] = useState(false),
    { invalidate, controls } = useThree(),
    detailMode =
      detail !== "none" && selected && !isDisplayOnlyType(module.type),
    rotation = THREE.MathUtils.degToRad(module.rotationY || 0);
  const localObjects = useMemo(
      () =>
        objects.map((o) => {
          const c = detailMode ? explodedCentre(o, module, explode) : o.center;
          return {
            ...o,
            localCenter: [c[0] - module.x, c[1] - module.y, c[2] - module.z],
          };
        }),
      [objects, module, detailMode, explode],
    ),
    visibleObjects = detailMode
      ? localObjects.filter((object) => !object.embeddedAppliance)
      : localObjects,
    rootObjects = detailMode
      ? visibleObjects
      : visibleObjects.filter((o) => !o.parentFrontId),
    fixtureObjects = localObjects.filter(
      (o) => o.kind === "fixture-sink" || o.kind === "fixture-hob",
    );
  const renderObject = (object: any, selectInCorner = false) => {
    const onObjectSelect =
      (detailMode && object.kind === "part") || selectInCorner
        ? () => onSelectPart(object.id)
        : undefined;
    if (object.role === "front" && object.hingeSide && !detailMode)
      return (
        <DoorAssembly
          key={object.id}
          front={object}
          attachments={visibleObjects.filter(
            (candidate) => candidate.parentFrontId === object.id,
          )}
          open={doorsOpen}
          selected={selectedPartId === object.id}
          onSelect={onObjectSelect}
        />
      );
    return (
      <Surface
        key={object.id}
        object={object}
        selected={selectedPartId === object.id}
        onSelect={onObjectSelect}
        ghost={ghostEmbeddedAppliance && !!object.embeddedAppliance}
      />
    );
  };
  const down = (e: any) => {
    e.stopPropagation();
    if (!selected) {
      onSelect();
      return;
    }
    if (focus || detailMode) return;
    const p = pointOnPlane(e, mm(module.y));
    if (!p) return;
    draggingRef.current = true;
    setDragging(true);
    setControlsEnabled(controls, false);
    offset.current = {
      x: group.current.position.x - p.x,
      z: group.current.position.z - p.z,
    };
    e.target.setPointerCapture?.(e.pointerId);
    invalidate();
  };
  const move = (e: any) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const p = pointOnPlane(e, mm(module.y));
    if (!p) return;
    const safe = clampPoseToRoom({
      roomWidth: room.width,
      roomDepth: room.depth,
      moduleWidth: module.width,
      moduleDepth: module.depth,
      rotationY: module.rotationY || 0,
      centerX: (p.x + offset.current.x) * 1000,
      centerZ: (p.z + offset.current.z) * 1000,
      grid: 50,
    });
    group.current.position.x = mm(safe.centerX);
    group.current.position.z = mm(safe.centerZ);
    invalidate();
  };
  const up = (e: any) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = false;
    setDragging(false);
    setControlsEnabled(controls, true);
    e.target.releasePointerCapture?.(e.pointerId);
    onCommitPosition(
      group.current.position.x * 1000 - module.width / 2,
      group.current.position.z * 1000 - module.depth / 2,
    );
    invalidate();
  };
  return (
    <group
      ref={group}
      position={[
        mm(module.x + module.width / 2),
        mm(module.y),
        mm(module.z + module.depth / 2),
      ]}
      rotation={[0, rotation, 0]}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <group position={[-mm(module.width / 2), 0, -mm(module.depth / 2)]}>
        {cornerVisualTypes.has(module.type) && !detailMode ? (
          <>
            <CornerVisual module={module} />
            {rootObjects
              .filter(
                (o: any) =>
                  o.role === "front" ||
                  o.role === "support" ||
                  o.kind !== "part",
              )
              .map((o: any) => renderObject(o, true))}
          </>
        ) : skinTypes.has(module.type) ? (
          <>
            <ApplianceVisual module={module} selected={selected} />
            {fixtureObjects.map((o: any) => (
              <Surface key={o.id} object={o} />
            ))}
          </>
        ) : (
          <>
            {rootObjects.map((o: any) => renderObject(o))}
          </>
        )}
      </group>
      {selected && !detailMode && (
        <mesh
          position={[0, mm(module.height / 2), 0]}
          scale={dragging ? 1.055 : 1}
        >
          <boxGeometry
            args={[mm(module.width), mm(module.height), mm(module.depth)]}
          />
          <meshBasicMaterial transparent opacity={0} />
          <Edges
            color={dragging ? "#55e7ff" : "#34d4e5"}
            lineWidth={dragging ? 4 : 2}
          />
        </mesh>
      )}
      {dragging && (
        <Html position={[0, mm(module.height) + 0.09, 0]} center>
          <span className="dragBadge">
            ↔ {module.width}×{module.height}×{module.depth}
          </span>
        </Html>
      )}
    </group>
  );
}
function CountertopJointVisual({ joint, unitLabel }: { joint: any; unitLabel: string }) {
  const pts = jointLinePoints(joint).map(
    (p: any) => p.map(mm) as [number, number, number],
  );
  const c =
    joint.type === "miter45"
      ? "#f0a34a"
      : joint.type === "euro"
        ? "#55c8a8"
        : "#8d7cf0";
  return (
    <group>
      <Line points={pts} color={c} lineWidth={2} />
      <Html position={joint.center.map(mm) as [number, number, number]} center>
        <span className="moduleDimBadge">
          {joint.type === "miter45"
            ? "45°"
            : joint.type === "euro"
              ? "EURO"
              : "90°"}{" "}
          · {joint.gap} {unitLabel}
        </span>
      </Html>
    </group>
  );
}
function CountertopSegment({
  object,
  selected,
  onSelect,
}: {
  object: any;
  selected: boolean;
  onSelect?: () => void;
}) {
  const size = object.size.map(mm) as [number, number, number],
    pos = object.center.map(mm) as [number, number, number],
    texture = useMemo(
      () =>
        proceduralTexture(object.appearance?.pattern, object.appearance?.color),
      [object.appearance?.pattern, object.appearance?.color],
    );
  return (
    <mesh
      position={pos}
      castShadow
      receiveShadow
      onPointerDown={(e) => {
        if (onSelect) {
          e.stopPropagation();
          onSelect();
        }
      }}
    >
      <boxGeometry args={size} />
      <meshPhysicalMaterial
        map={texture || undefined}
        color={object.appearance?.color || "#dedbd2"}
        roughness={object.appearance?.gloss ? 0.09 : 0.32}
        clearcoat={object.appearance?.gloss ? 0.88 : 0.12}
        clearcoatRoughness={object.appearance?.gloss ? 0.07 : 0.28}
      />
      <Edges
        color={selected ? "#34d4e5" : "#7566a8"}
        lineWidth={selected ? 3 : 1}
      />
    </mesh>
  );
}
function Countertop({
  object,
  selected,
  onSelect,
  onCommit,
}: {
  object: any;
  selected: boolean;
  onSelect: () => void;
  onCommit: (x: number, z: number) => void;
}) {
  const group = useRef<THREE.Group>(null!),
    draggingRef = useRef(false),
    offset = useRef({ x: 0, z: 0 }),
    [dragging, setDragging] = useState(false),
    { invalidate, controls } = useThree(),
    size = object.size.map(mm) as [number, number, number],
    pos = object.center.map(mm) as [number, number, number],
    texture = useMemo(
      () =>
        proceduralTexture(object.appearance?.pattern, object.appearance?.color),
      [object.appearance?.pattern, object.appearance?.color],
    );
  const down = (e: any) => {
    e.stopPropagation();
    if (!selected) {
      onSelect();
      return;
    }
    const p = pointOnPlane(e, pos[1]);
    if (!p) return;
    draggingRef.current = true;
    setDragging(true);
    setControlsEnabled(controls, false);
    offset.current = {
      x: group.current.position.x - p.x,
      z: group.current.position.z - p.z,
    };
    e.target.setPointerCapture?.(e.pointerId);
    invalidate();
  };
  const move = (e: any) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    const p = pointOnPlane(e, pos[1]);
    if (!p) return;
    group.current.position.x = Math.round((p.x + offset.current.x) * 20) / 20;
    group.current.position.z = Math.round((p.z + offset.current.z) * 20) / 20;
    invalidate();
  };
  const up = (e: any) => {
    if (!draggingRef.current) return;
    e.stopPropagation();
    draggingRef.current = false;
    setDragging(false);
    setControlsEnabled(controls, true);
    e.target.releasePointerCapture?.(e.pointerId);
    onCommit(
      (group.current.position.x - size[0] / 2) * 1000,
      (group.current.position.z - size[2] / 2) * 1000,
    );
    invalidate();
  };
  return (
    <group
      ref={group}
      position={pos}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
    >
      <mesh scale={dragging ? 1.025 : 1} castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshPhysicalMaterial
          map={texture || undefined}
          color={object.appearance?.color || "#dedbd2"}
          roughness={object.appearance?.gloss ? 0.09 : 0.32}
          clearcoat={object.appearance?.gloss ? 0.88 : 0.12}
          clearcoatRoughness={object.appearance?.gloss ? 0.07 : 0.28}
        />
        {selected && (
          <Edges
            color={dragging ? "#55e7ff" : "#9a75ff"}
            lineWidth={dragging ? 4 : 2}
          />
        )}
      </mesh>
      {dragging && (
        <Html position={[0, 0.09, 0]} center>
          <span className="dragBadge">↔</span>
        </Html>
      )}
    </group>
  );
}
function Dimension({
  a,
  b,
  label,
}: {
  a: [number, number, number];
  b: [number, number, number];
  label: string;
}) {
  const mid: [number, number, number] = [
    (a[0] + b[0]) / 2,
    (a[1] + b[1]) / 2,
    (a[2] + b[2]) / 2,
  ];
  return (
    <>
      <Line points={[a, b]} color="#6d54d9" lineWidth={1} />
      <Html position={mid} center>
        <span className="dimLabel">{label}</span>
      </Html>
    </>
  );
}
function RoomDimensions({ room, unitLabel }: { room: any; unitLabel: string }) {
  const w = mm(room.width),
    h = mm(room.height),
    d = mm(room.depth);
  return (
    <>
      <Dimension
        a={[0, h + 0.08, 0]}
        b={[w, h + 0.08, 0]}
        label={`${room.width} ${unitLabel}`}
      />
      <Dimension
        a={[w + 0.08, 0, 0]}
        b={[w + 0.08, h, 0]}
        label={`${room.height} ${unitLabel}`}
      />
      <Dimension
        a={[w + 0.12, 0.03, 0]}
        b={[w + 0.12, 0.03, d]}
        label={`${room.depth} ${unitLabel}`}
      />
    </>
  );
}
function ModuleDimensionLabels({
  model,
  selectedId,
}: {
  model: any;
  selectedId?: string | null;
}) {
  return (
    <>
      {model.modules.map((m: any) =>
        m.id === selectedId ? null : (
          <Html
            key={`md-${m.id}`}
            position={[
              mm(m.x + m.width / 2),
              mm(m.y + m.height + 0.06),
              mm(m.z + m.depth),
            ]}
            center
          >
            <span className="moduleDimBadge">
              {m.width}×{m.height}×{m.depth}
            </span>
          </Html>
        ),
      )}
    </>
  );
}
function WebGLLabel({
  text,
  position,
}: {
  text: string;
  position: [number, number, number];
}) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const g = c.getContext("2d")!;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "rgba(22,27,55,.94)";
    g.strokeStyle = "#8f7cf0";
    g.lineWidth = 5;
    g.beginPath();
    g.roundRect(4, 4, c.width - 8, c.height - 8, 26);
    g.fill();
    g.stroke();
    g.fillStyle = "#fff";
    g.font = "700 48px system-ui,-apple-system,Segoe UI,sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(text, c.width / 2, c.height / 2 + 1);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [text]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <sprite position={position} scale={[0.26, 0.065, 1]} renderOrder={999}>
      <spriteMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </sprite>
  );
}
function PartCallouts({
  parts,
  module,
  explode,
}: {
  parts: any[];
  module: any;
  explode: number;
}) {
  const mc = new THREE.Vector3(
    mm(module.x + module.width / 2),
    mm(module.y + module.height / 2),
    mm(module.z + module.depth / 2),
  );
  return (
    <>
      {parts.map((p: any, i: number) => {
        const cmm = explodedCentre(p, module, explode),
          c = new THREE.Vector3(...cmm.map(mm)),
          dir = c.clone().sub(mc);
        if (dir.lengthSq() < 0.0001)
          dir.set(i % 2 ? 0.7 : -0.7, 0.45, i % 3 ? 0.5 : -0.5);
        dir.normalize();
        const label = c
            .clone()
            .add(dir.multiplyScalar(0.11 + (i % 3) * 0.035))
            .add(new THREE.Vector3(0, 0.025, 0)),
          a: [number, number, number] = [c.x, c.y, c.z],
          b: [number, number, number] = [label.x, label.y, label.z],
          labelText = `${Math.round(p.u)}×${Math.round(p.v)}×${Math.round(p.thickness)}`;
        return (
          <group key={`pc-${p.id}`}>
            <Line points={[a, b]} color="#765fe0" lineWidth={1.2} />
            <WebGLLabel text={labelText} position={b} />
          </group>
        );
      })}
    </>
  );
}
function Dimensions({
  model,
  selection,
  unitLabel,
}: {
  model: any;
  selection: Selection;
  unitLabel: string;
}) {
  if (!selection) return null;
  if (selection.kind === "countertop") {
    const o = model.objects.find((x: any) => x.kind === "countertop-segment");
    if (!o) return null;
    const [x, y, z] = o.center.map(mm),
      [w, h, d] = o.size.map(mm);
    return (
      <>
        <Dimension
          a={[x - w / 2, y + h / 2 + 0.04, z + d / 2]}
          b={[x + w / 2, y + h / 2 + 0.04, z + d / 2]}
          label={`${Math.round(o.size[0])} ${unitLabel}`}
        />
        <Dimension
          a={[x + w / 2 + 0.04, y, z - d / 2]}
          b={[x + w / 2 + 0.04, y, z + d / 2]}
          label={`${Math.round(o.size[2])} ${unitLabel}`}
        />
      </>
    );
  }
  const moduleId =
      selection.kind === "part" ? selection.moduleId : selection.id,
    m = model.modules.find((x: any) => x.id === moduleId);
  if (!m) return null;
  const cx = mm(m.x + m.width / 2),
    cy = mm(m.y),
    cz = mm(m.z + m.depth / 2),
    w = mm(m.width),
    h = mm(m.height),
    d = mm(m.depth),
    r = THREE.MathUtils.degToRad(m.rotationY || 0),
    vx = new THREE.Vector3(Math.cos(r), 0, -Math.sin(r)),
    vz = new THREE.Vector3(Math.sin(r), 0, Math.cos(r)),
    p = (ax: number, ay: number, az: number): [number, number, number] => [
      cx + vx.x * ax + vz.x * az,
      cy + ay,
      cz + vx.z * ax + vz.z * az,
    ],
    up = 0.05;
  return (
    <>
      <Dimension
        a={p(-w / 2, h + up, d / 2 + 0.035)}
        b={p(w / 2, h + up, d / 2 + 0.035)}
        label={`${m.width} ${unitLabel}`}
      />
      <Dimension
        a={p(w / 2 + 0.045, 0, d / 2 + 0.035)}
        b={p(w / 2 + 0.045, h, d / 2 + 0.035)}
        label={`${m.height} ${unitLabel}`}
      />
      <Dimension
        a={p(w / 2 + 0.075, 0.03, -d / 2)}
        b={p(w / 2 + 0.075, 0.03, d / 2)}
        label={`${m.depth} ${unitLabel}`}
      />
    </>
  );
}
function CameraRig({
  project,
  model,
  focusId,
  view,
  autoOrbit,
  resetKey,
}: {
  project: any;
  model: any;
  focusId: string | null;
  view: ViewMode;
  autoOrbit: boolean;
  resetKey: number;
}) {
  const { camera, invalidate, size } = useThree(),
    controls = useRef<any>(null),
    showcaseTime = useRef(0),
    initialized = useRef(false),
    previousView = useRef<ViewMode>(view),
    previousFocusId = useRef<string | null>(focusId),
    previousResetKey = useRef(resetKey),
    fm = focusId ? model.modules.find((x: any) => x.id === focusId) : null,
    target = fm
      ? new THREE.Vector3(
          mm(fm.x + fm.width / 2),
          mm(fm.y + fm.height / 2),
          mm(fm.z + fm.depth / 2),
        )
      : new THREE.Vector3(
          mm(project.room.width / 2),
          mm(project.room.height * 0.35),
          mm(project.room.depth / 2),
        );
  useEffect(() => {
    showcaseTime.current = 0;
  }, [autoOrbit, focusId]);
  useFrame((_, delta) => {
    if (!autoOrbit || view !== "3d" || !controls.current) return;
    showcaseTime.current += Math.min(delta, 0.08);
    const pose = cinematicCameraPose({
        modules: model.modules,
        room: project.room,
        focusId,
        phase: (showcaseTime.current % 24) / 24,
        aspect: size.width / Math.max(1, size.height),
      }),
      desiredPosition = new THREE.Vector3(
        mm(pose.position.x),
        mm(pose.position.y),
        mm(pose.position.z),
      ),
      desiredTarget = new THREE.Vector3(
        mm(pose.target.x),
        mm(pose.target.y),
        mm(pose.target.z),
      ),
      blend = 1 - Math.exp(-delta * 1.25);
    camera.up.set(0, 1, 0);
    camera.position.lerp(desiredPosition, blend);
    controls.current.target.lerp(desiredTarget, blend);
    controls.current.update();
    invalidate();
  });
  useEffect(() => {
    camera.up.set(0, 1, 0);
    const roomScale = Math.max(
        mm(project.room.width),
        mm(project.room.height),
        mm(project.room.depth),
        1,
      ),
      focusScale = fm
        ? Math.max(mm(fm.width), mm(fm.height), mm(fm.depth), 0.7)
        : roomScale,
      preserveOrbit =
        initialized.current &&
        view === "3d" &&
        previousView.current === "3d" &&
        previousFocusId.current === focusId &&
        previousResetKey.current === resetKey;
    if (!preserveOrbit && controls.current) {
      const damping = controls.current.enableDamping;
      controls.current.enableDamping = false;
      controls.current.update();
      controls.current.enableDamping = damping;
    }
    if (preserveOrbit) {
      const previousTarget = controls.current?.target?.clone() || target.clone(),
        direction = camera.position.clone().sub(previousTarget);
      if (direction.lengthSq() < 0.0001)
        direction
          .set(1, 0.75, 1)
          .normalize()
          .multiplyScalar(fm ? focusScale * 2.15 : roomScale * 1.35);
      camera.position.copy(target).add(direction);
    } else if (fm) {
      if (view === "front")
        camera.position.set(
          target.x,
          target.y,
          target.z + focusScale * 2.3,
        );
      else if (view === "top") {
        camera.position.set(
          target.x,
          target.y + focusScale * 2.3,
          target.z + 0.001,
        );
        camera.up.set(0, 0, -1);
      } else {
        const rotation = THREE.MathUtils.degToRad(fm.rotationY || 0),
          side = new THREE.Vector3(Math.cos(rotation), 0, -Math.sin(rotation)),
          front = new THREE.Vector3(Math.sin(rotation), 0, Math.cos(rotation));
        camera.position
          .copy(target)
          .add(side.multiplyScalar(focusScale * 0.9))
          .add(front.multiplyScalar(focusScale * 1.55))
          .add(new THREE.Vector3(0, focusScale * 0.85, 0));
      }
    } else {
      if (view === "front")
        camera.position.set(
          target.x,
          target.y,
          mm(project.room.depth) + roomScale * 1.35,
        );
      else if (view === "top") {
        camera.position.set(
          target.x,
          mm(project.room.height) + roomScale * 1.65,
          target.z + 0.001,
        );
        camera.up.set(0, 0, -1);
      } else
        camera.position.set(
          mm(project.room.width) * 0.9,
          mm(project.room.height) * 0.78,
          mm(project.room.depth) * 1.15,
        );
    }
    camera.lookAt(target);
    if (controls.current) {
      controls.current.target.copy(target);
      controls.current.update();
    }
    initialized.current = true;
    previousView.current = view;
    previousFocusId.current = focusId;
    previousResetKey.current = resetKey;
    invalidate();
  }, [
    focusId,
    view,
    resetKey,
    camera,
    fm?.x,
    fm?.y,
    fm?.z,
    fm?.width,
    fm?.height,
    fm?.depth,
    project.room.width,
    project.room.height,
    project.room.depth,
  ]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableRotate={view === "3d" && !autoOrbit}
      enablePan={!autoOrbit}
      enableZoom={!autoOrbit}
      enableDamping
      dampingFactor={0.07}
      autoRotate={false}
      rotateSpeed={0.95}
      zoomSpeed={1}
      panSpeed={0.8}
      minDistance={0.3}
      maxDistance={12}
      minPolarAngle={0.08}
      maxPolarAngle={Math.PI / 2 - 0.04}
      touches={{
        ONE: view === "3d" ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN,
        TWO: THREE.TOUCH.DOLLY_PAN,
      }}
    />
  );
}
function MovingShowcaseLight({
  active,
  project,
  model,
  focusId,
}: {
  active: boolean;
  project: any;
  model: any;
  focusId: string | null;
}) {
  const light = useRef<THREE.PointLight>(null!);
  const elapsed = useRef(0);
  useFrame((_, delta) => {
    if (!active || !light.current) return;
    elapsed.current += Math.min(delta, 0.08);
    const pose = cinematicCameraPose({
      modules: model.modules,
      room: project.room,
      focusId,
      phase: ((elapsed.current / 19) + 0.2) % 1,
      aspect: 1,
    });
    light.current.position.lerp(
      new THREE.Vector3(
        mm(pose.target.x + (pose.position.x - pose.target.x) * 0.48),
        mm(pose.target.y + 1250),
        mm(pose.target.z + (pose.position.z - pose.target.z) * 0.48),
      ),
      1 - Math.exp(-delta * 1.1),
    );
  });
  return (
    <pointLight
      ref={light}
      intensity={active ? 13 : 0}
      distance={7}
      decay={2}
      color="#fff3df"
    />
  );
}
function SnapshotBridge() {
  const { gl, scene, camera, invalidate } = useThree();
  useEffect(() => {
    (window as any).__kitchenCadCapture = () => {
      try {
        invalidate();
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      } catch {
        return null;
      }
    };
    return () => {
      delete (window as any).__kitchenCadCapture;
    };
  }, [gl, scene, camera, invalidate]);
  return null;
}
function SceneContent(props: any) {
  const {
      project,
      model,
      selection,
      setSelection,
      focusId,
      detail,
      view,
      unitLabel = "мм",
      cameraResetKey,
      ghostEmbeddedAppliance,
      onMoveModule,
    } = props,
    selectedModuleId =
      selection?.kind === "module"
        ? selection.id
        : selection?.kind === "part"
          ? selection.moduleId
          : null,
    selectedPartId = selection?.kind === "part" ? selection.id : null,
    explode = detail === "none" ? 0 : project.ui?.explode || 0,
    renderModules = focusId
      ? model.modules.filter((m: any) => m.id === focusId)
      : model.modules,
    focusModule = focusId
      ? model.modules.find((m: any) => m.id === focusId)
      : null,
    focusParts = focusId
      ? model.parts.filter((p: any) => p.moduleId === focusId)
      : [],
    opacity = project.ui?.wallOpacity ?? 0.92,
    wallMat = (
      <meshStandardMaterial
        color={project.room.wallColor}
        roughness={0.92}
        transparent={opacity < 1}
        opacity={opacity}
      />
    );
  const showBack = project.ui?.showWallBack !== false,
    showLeft = project.ui?.showWallLeft !== false,
    showFront = project.ui?.showWallFront === true,
    showRight = project.ui?.showWallRight === true;
  return (
    <>
      <color
        attach="background"
        args={[project.ui?.theme === "light" ? "#dfe6e8" : "#10171b"]}
      />
      <hemisphereLight args={["#ffffff", "#48565d", 0.88]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[3.8, 5.5, 4.2]}
        intensity={1.8}
        color="#ffffff"
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-bias={-0.00025}
      />
      <MovingShowcaseLight
        active={!!project.ui?.autoOrbit && view === "3d"}
        project={project}
        model={model}
        focusId={focusId}
      />
      <directionalLight
        position={[-3, 2.4, -2.5]}
        intensity={0.5}
        color="#dcecff"
      />
      <Environment resolution={128} frames={1}>
        <Lightformer
          form="rect"
          intensity={2.2}
          position={[1.5, 4.5, 4]}
          scale={[5, 3, 1]}
        />
        <Lightformer
          form="rect"
          intensity={1.1}
          position={[-3, 2.5, -2]}
          rotation={[0, Math.PI / 2, 0]}
          scale={[3, 2, 1]}
        />
      </Environment>
      {!focusId && (
        <>
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[
              mm(project.room.width / 2),
              0,
              mm(project.room.depth / 2),
            ]}
            receiveShadow
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelection(null);
            }}
          >
            <planeGeometry
              args={[mm(project.room.width), mm(project.room.depth)]}
            />
            <meshStandardMaterial
              color={project.room.floorColor}
              roughness={0.85}
            />
          </mesh>
          {showBack && (
            <mesh
              position={[
                mm(project.room.width / 2),
                mm(project.room.height / 2),
                -0.012,
              ]}
            >
              <boxGeometry
                args={[mm(project.room.width), mm(project.room.height), 0.02]}
              />
              {wallMat}
            </mesh>
          )}
          {showFront && (
            <mesh
              position={[
                mm(project.room.width / 2),
                mm(project.room.height / 2),
                mm(project.room.depth) + 0.012,
              ]}
            >
              <boxGeometry
                args={[mm(project.room.width), mm(project.room.height), 0.02]}
              />
              {wallMat}
            </mesh>
          )}
          {showLeft && (
            <mesh
              position={[
                -0.012,
                mm(project.room.height / 2),
                mm(project.room.depth / 2),
              ]}
            >
              <boxGeometry
                args={[0.02, mm(project.room.height), mm(project.room.depth)]}
              />
              {wallMat}
            </mesh>
          )}
          {showRight && (
            <mesh
              position={[
                mm(project.room.width) + 0.012,
                mm(project.room.height / 2),
                mm(project.room.depth / 2),
              ]}
            >
              <boxGeometry
                args={[0.02, mm(project.room.height), mm(project.room.depth)]}
              />
              {wallMat}
            </mesh>
          )}
        </>
      )}
      {focusId && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[
            focusModule ? mm(focusModule.x + focusModule.width / 2) : 0,
            -0.002,
            focusModule ? mm(focusModule.z + focusModule.depth / 2) : 0,
          ]}
          receiveShadow
        >
          <planeGeometry args={[8, 8]} />
          <shadowMaterial transparent opacity={0.16} />
        </mesh>
      )}
      {renderModules.map((m: any) => (
        <ModuleVisual
          key={m.id}
          module={m}
          room={project.room}
          objects={model.objects.filter((o: any) => o.moduleId === m.id)}
          selected={selectedModuleId === m.id}
          selectedPartId={selectedPartId}
          focus={!!focusId}
          detail={detail}
          explode={explode}
          doorsOpen={!!project.ui?.doorsOpen}
          ghostEmbeddedAppliance={!!ghostEmbeddedAppliance}
          onSelect={() => setSelection({ kind: "module", id: m.id })}
          onSelectPart={(id: string) =>
            setSelection({ kind: "part", id, moduleId: m.id })
          }
          onCommitPosition={(x, z) => onMoveModule(m.id, x, z)}
        />
      ))}
      {!focusId &&
        model.objects
          .filter((o: any) => o.kind === "countertop-segment")
          .map((object: any) => (
            <CountertopSegment
              key={object.id}
              object={object}
              selected={selection?.kind === "countertop"}
              onSelect={() => setSelection({ kind: "countertop", id: "CT-01" })}
            />
          ))}
      {!focusId &&
        (model.countertopJoints || []).map((joint: any) => (
          <CountertopJointVisual key={joint.id} joint={joint} unitLabel={unitLabel} />
        ))}
      {detail === "none" && <Dimensions model={model} selection={selection} unitLabel={unitLabel} />}
      {focusId && detail !== "none" && focusModule && (
        <PartCallouts
          parts={focusParts}
          module={focusModule}
          explode={explode}
        />
      )}{" "}
      {!focusId && project.ui?.showRoomDimensions !== false && (
        <RoomDimensions room={project.room} unitLabel={unitLabel} />
      )}{" "}
      {!focusId && project.ui?.showAllModuleDimensions && (
        <ModuleDimensionLabels model={model} selectedId={selectedModuleId} />
      )}{" "}
      {project.ui?.showGrid !== false && (
        <Grid
          args={[7, 7]}
          cellSize={0.1}
          sectionSize={0.5}
          cellColor="#617179"
          sectionColor="#82939b"
          fadeDistance={6}
          infiniteGrid
          position={[0, 0.001, 0]}
        />
      )}
      <CameraRig
        project={project}
        model={model}
        focusId={focusId}
        view={view}
        autoOrbit={!!project.ui?.autoOrbit}
        resetKey={cameraResetKey || 0}
      />
      <SnapshotBridge />
    </>
  );
}
export function KitchenScene(props: any) {
  return (
    <Canvas
      shadows="basic"
      frameloop="demand"
      dpr={[1, 1.25]}
      camera={{ position: [2.7, 2.1, 3.05], fov: 43 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
      onPointerMissed={() => {
        if (!props.focusId) props.setSelection(null);
      }}
    >
      <SceneContent {...props} />
    </Canvas>
  );
}
