/** Substrate affects the specification; decor only affects the preview. */
export const SUBSTRATES = Object.freeze({
  ldsp: { name: 'ЛДСП', group: 'panel' },
  mdf: { name: 'МДФ', group: 'panel' },
  plywood: { name: 'Фанера', group: 'panel' },
  stone: { name: 'Камень (уточнить у поставщика)', group: 'countertop' },
});
export const DECORS = Object.freeze({
  white: { name: 'Тёплый белый', color: '#eeeae0', pattern: 'solid' },
  olive: { name: 'Шалфей', color: '#899782', pattern: 'solid' },
  graphite: { name: 'Графит', color: '#424d54', pattern: 'solid' },
  oak: { name: 'Дуб · имитация', color: '#c29764', pattern: 'wood' },
  walnut: { name: 'Орех · имитация', color: '#815b3f', pattern: 'wood' },
  marble: { name: 'Светлый камень · имитация', color: '#e7e5dd', pattern: 'stone' },
  concrete: { name: 'Бетон · имитация', color: '#a7aaa6', pattern: 'speckle' },
});
export const MODULE_TYPES = Object.freeze({base:'Нижний шкаф',sink:'Шкаф под мойку',wall:'Навесной шкаф',washer:'Стиральная машина'});
export function appearance(decor, color, gloss = false, grain = 'v') {
  const d = DECORS[decor];
  if (!d) throw new Error('Неизвестный декор');
  return { pattern: d.pattern, color: color || d.color, gloss, grain };
}
