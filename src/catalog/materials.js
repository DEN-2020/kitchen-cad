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
  oak: { name: 'Дуб', color: '#c29764', pattern: 'wood' },
  walnut: { name: 'Орех', color: '#815b3f', pattern: 'wood' },
  marble: { name: 'Светлый камень', color: '#e7e5dd', pattern: 'stone' },
  concrete: { name: 'Бетон', color: '#a7aaa6', pattern: 'speckle' },
});

export const MODULE_TYPES = Object.freeze({
  base: 'Нижний шкаф',
  drawer: 'Шкаф с ящиками',
  sink: 'Шкаф под раковину',
  cornerBase: 'Угловой нижний шкаф',
  wall: 'Навесной шкаф',
  cornerWall: 'Угловой навесной шкаф',
  tall: 'Пенал',
  tallOven: 'Пенал под духовку',
  washer: 'Стиральная машина',
  dishwasher: 'Посудомоечная машина',
  oven: 'Духовой шкаф',
  fridge: 'Холодильник',
  microwave: 'Микроволновая печь',
  hood: 'Вытяжка',
  freezer: 'Морозильник',
  window: 'Окно',
  door: 'Дверь',
});

export const CATALOG_GROUPS = Object.freeze([
  { id:'base', ru:'Нижние шкафы', en:'Base cabinets', types:['base','drawer','sink','cornerBase'] },
  { id:'wall', ru:'Навесные шкафы', en:'Wall cabinets', types:['wall','cornerWall'] },
  { id:'tall', ru:'Пеналы', en:'Tall units', types:['tall','tallOven'] },
  { id:'appliances', ru:'Техника', en:'Appliances', types:['washer','dishwasher','oven','fridge','freezer','microwave','hood'] },
  { id:'room', ru:'Комната', en:'Room elements', types:['window','door'] },
]);

export const APPLIANCE_TYPES = Object.freeze(['washer','dishwasher','oven','fridge','freezer','microwave','hood']);
export const ROOM_ELEMENT_TYPES = Object.freeze(['window','door']);
export const DISPLAY_ONLY_TYPES = Object.freeze([...APPLIANCE_TYPES,...ROOM_ELEMENT_TYPES]);
export const isApplianceType = type => APPLIANCE_TYPES.includes(type);
export const isRoomElementType = type => ROOM_ELEMENT_TYPES.includes(type);
export const isDisplayOnlyType = type => DISPLAY_ONLY_TYPES.includes(type);
export const isWallMountedType = type => ['wall','cornerWall','microwave','hood','window'].includes(type);
export const isCornerType = type => ['cornerBase','cornerWall'].includes(type);
export const isDrawerType = type => type === 'drawer';

export const FRONT_STYLES = Object.freeze({
  flat:'Плоский', frame:'Рамочный', glass:'Стекло', slatted:'Рейки',
  shaker:'Шейкер', handleless:'Без ручки / J-pull', louvered:'Жалюзийный'
});
export const HANDLE_STYLES = Object.freeze({bar:'Ручка-скоба', knob:'Кнопка', integrated:'Интегрированная', none:'Без ручки'});
export const LEG_STYLES = Object.freeze({round:'Круглые', square:'Квадратные', hidden:'Скрытые/цоколь'});
export const FIXTURE_TYPES = Object.freeze({sink:'Раковина', hob:'Варочная поверхность'});

export function appearance(decor, color, gloss = false, grain = 'v') {
  const d = DECORS[decor];
  if (!d) throw new Error('Неизвестный декор');
  return { pattern: d.pattern, color: color || d.color, gloss, grain };
}
