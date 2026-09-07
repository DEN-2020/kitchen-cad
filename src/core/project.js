import { SUBSTRATES, DECORS, MODULE_TYPES } from '../catalog/materials.js';
export const SCHEMA_VERSION = 1;
export const MAX_MODULES = 24;
export const round = n => Math.round((n + Number.EPSILON) * 1000) / 1000;
let sequence = 0;
export function newId() { return globalThis.crypto?.randomUUID?.() || `m-${Date.now().toString(36)}-${++sequence}`; }
export function createModule(type = 'base') {
  if (!(type in MODULE_TYPES)) throw new Error('Неизвестный модуль');
  return { id: newId(), type, width: 600, height: type === 'washer' ? 850 : 720,
    depth: type === 'wall' ? 320 : type === 'washer' ? 600 : 560,
    board: 18, frontThickness: 18, back: 3, gap: 2, bodyEdge: 0.8, frontEdge: 2,
    feet: type === 'wall' || type === 'washer' ? 0 : 140, elevation: type === 'wall' ? 1500 : 0,
    bodySubstrate: 'ldsp', frontSubstrate: 'mdf', bodyDecor: 'white', frontDecor: 'olive',
    bodyColor: DECORS.white.color, frontColor: DECORS.olive.color, gloss: false, grain: 'v' };
}
export function createProject() {
  const sink = createModule('sink'); sink.width = 500;
  return { schemaVersion: 1, name: 'Моя кухня', modules: [createModule(), sink, createModule('washer')],
    countertop: { enabled: true, depth: 620, thickness: 20, overhang: 0, decor: 'marble', color: DECORS.marble.color, gloss: false } };
}
function number(value, min, max, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`${label}: допустимо ${min}–${max} мм`);
}
function member(value, choices, label) { if (!choices.includes(value)) throw new Error(`Некорректное поле: ${label}`); }
function color(value) { if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new Error('Цвет должен быть #RRGGBB'); }
export function validateProject(p) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || p.schemaVersion !== 1) throw new Error('Неподдерживаемая версия проекта');
  if (typeof p.name !== 'string' || p.name.length > 120) throw new Error('Некорректное название проекта');
  if (!Array.isArray(p.modules) || p.modules.length < 1 || p.modules.length > MAX_MODULES) throw new Error(`Нужно 1–${MAX_MODULES} модулей`);
  const ids = new Set();
  for (const m of p.modules) {
    if (!m || typeof m !== 'object' || typeof m.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(m.id) || ids.has(m.id)) throw new Error('Повторяющийся или некорректный ID модуля');
    ids.add(m.id); member(m.type, Object.keys(MODULE_TYPES), 'тип модуля');
    number(m.width, 200, 1400, 'Ширина'); number(m.height, 200, 2400, 'Высота корпуса'); number(m.depth, 200, 900, 'Глубина корпуса');
    number(m.board, 12, 30, 'Толщина корпуса'); number(m.frontThickness, 12, 30, 'Толщина фасада'); number(m.back, 2, 8, 'Задняя стенка');
    number(m.feet, 0, 200, 'Ножки'); number(m.elevation, 0, 2500, 'Отметка низа'); number(m.gap, 1, 6, 'Зазор');
    number(m.bodyEdge, 0, 3, 'Кромка корпуса'); number(m.frontEdge, 0, 3, 'Кромка фасада');
    member(m.bodySubstrate, ['ldsp','mdf','plywood'], 'материал корпуса'); member(m.frontSubstrate, ['ldsp','mdf','plywood'], 'материал фасада');
    member(m.bodyDecor, Object.keys(DECORS), 'декор корпуса'); member(m.frontDecor, Object.keys(DECORS), 'декор фасада');
    member(m.grain, ['u','v'], 'волокна'); color(m.bodyColor); color(m.frontColor);
    if (typeof m.gloss !== 'boolean') throw new Error('Некорректный финиш');
  }
  const t = p.countertop;
  if (!t || typeof t.enabled !== 'boolean' || typeof t.gloss !== 'boolean') throw new Error('Некорректная столешница');
  number(t.depth, 300, 1000, 'Глубина столешницы'); number(t.thickness, 10, 60, 'Толщина столешницы'); number(t.overhang, 0, 150, 'Боковой свес');
  member(t.decor, Object.keys(DECORS), 'декор столешницы'); color(t.color);
  return p;
}
export function layoutProject(p) {
  validateProject(p);
  let floorX = 0, wallX = 0;
  return p.modules.map(m => {
    const wall = m.type === 'wall'; const x = wall ? wallX : floorX;
    if (wall) wallX += m.width; else floorX += m.width;
    return { ...m, x, y: wall ? m.elevation : m.type === 'washer' ? 0 : m.feet };
  });
}
