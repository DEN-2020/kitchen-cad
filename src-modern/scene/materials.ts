import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();
const size = 512;

function channel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function shade(hex: string, amount: number) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return amount < 0 ? "#303438" : "#f3f2ed";
  const value = Number.parseInt(match[1], 16);
  const r = channel((value >> 16) + amount);
  const g = channel(((value >> 8) & 255) + amount);
  const b = channel((value & 255) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function noise(seed: number) {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function addSurfaceVariation(
  context: CanvasRenderingContext2D,
  color: string,
) {
  context.save();
  for (let i = 0; i < 1800; i++) {
    const light = noise(i * 3) > 0.52;
    context.globalAlpha = 0.018 + noise(i * 5) * 0.026;
    context.fillStyle = shade(color, light ? 30 : -28);
    const dot = 0.7 + noise(i * 11) * 1.8;
    context.fillRect(noise(i * 7) * size, noise(i * 13) * size, dot, dot);
  }
  context.restore();
}

function drawWood(
  context: CanvasRenderingContext2D,
  color: string,
  grain: string,
) {
  context.save();
  if (grain === "u") {
    context.translate(size, 0);
    context.rotate(Math.PI / 2);
  }
  for (let i = 0; i < 46; i++) {
    const x0 = 5 + i * 11 + noise(i) * 8;
    context.beginPath();
    for (let y = -20; y <= size + 20; y += 9) {
      const x =
        x0 +
        Math.sin(y * 0.022 + i * 0.72) * (2.4 + noise(i * 17) * 3.4) +
        Math.sin(y * 0.071 + i) * 1.15;
      if (y === -20) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.globalAlpha = 0.08 + noise(i * 19) * 0.1;
    context.strokeStyle = shade(color, i % 4 === 0 ? 42 : -48);
    context.lineWidth = 0.65 + noise(i * 23) * 1.8;
    context.stroke();
  }
  for (let i = 0; i < 5; i++) {
    const x = 55 + noise(i * 31) * 400;
    const y = 60 + noise(i * 37) * 390;
    context.globalAlpha = 0.1;
    context.strokeStyle = shade(color, -55);
    context.lineWidth = 1.2;
    context.beginPath();
    context.ellipse(
      x,
      y,
      7 + noise(i) * 8,
      20 + noise(i * 2) * 26,
      0,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();
}

function drawStone(context: CanvasRenderingContext2D, color: string) {
  for (let i = 0; i < 13; i++) {
    let y = -40 + noise(i * 41) * (size + 80);
    context.beginPath();
    context.moveTo(-20, y);
    for (let x = -20; x <= size + 20; x += 12) {
      y +=
        Math.sin(x * 0.025 + i * 1.8) * 2.5 +
        (noise(x + i * 67) - 0.5) * 7;
      context.lineTo(x, y);
    }
    context.globalAlpha = 0.07 + noise(i * 43) * 0.09;
    context.strokeStyle = shade(color, i % 3 === 0 ? 58 : -62);
    context.lineWidth = 0.7 + noise(i * 47) * 2.4;
    context.stroke();
  }
}

function drawSpeckle(context: CanvasRenderingContext2D, color: string) {
  for (let i = 0; i < 1500; i++) {
    context.globalAlpha = 0.045 + noise(i * 53) * 0.11;
    context.fillStyle = shade(color, i % 3 === 0 ? 56 : -50);
    const dot = 0.6 + noise(i * 59) * 2.2;
    context.beginPath();
    context.arc(
      noise(i * 61) * size,
      noise(i * 71) * size,
      dot,
      0,
      Math.PI * 2,
    );
    context.fill();
  }
}

export function proceduralTexture(
  pattern?: string,
  _color = "#aaaaaa",
  grain = "v",
) {
  if (!pattern || pattern === "solid") return null;
  const key = `${pattern}:${grain}`;
  if (cache.has(key)) return cache.get(key)!;

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const context = canvas.getContext("2d")!;
  // Keep the pattern neutral. The Three.js material owns the tint, so changing
  // a color never has to regenerate or compete with the texture itself.
  const neutral = "#d8d8d8";
  context.fillStyle = "#f5f5f5";
  context.fillRect(0, 0, size, size);
  addSurfaceVariation(context, neutral);
  if (pattern === "wood") drawWood(context, neutral, grain);
  else if (pattern === "stone") drawStone(context, neutral);
  else drawSpeckle(context, neutral);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    pattern === "stone" ? 1.2 : 1,
    pattern === "stone" ? 1.2 : 1,
  );
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  cache.set(key, texture);
  return texture;
}
