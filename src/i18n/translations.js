export const TRANSLATIONS = Object.freeze({
  ru: {
    appName: 'Kitchen CAD', constructor: 'Конструктор кухни', room: 'Комната', modules: 'Модули', materials: 'Материалы', parts: 'Детали', project: 'Проект',
    width: 'Ширина', depth: 'Длина', height: 'Высота', wallColor: 'Цвет стен', floorColor: 'Цвет пола',
    add: 'Добавить', edit: 'Изменить', copy: 'Копия', remove: 'Удалить', close: 'Закрыть', fit: 'Вписать', front: 'Спереди', top: 'Сверху',
    dimensions: 'Размеры', showDimensions: 'Показывать размеры', sceneHint: 'Проведи пальцем — повернуть · щипок — масштаб',
    moduleSize: 'Размер модуля', board: 'Плита', frontBase: 'Основа фасада', frontDecor: 'Декор фасада', frontColor: 'Цвет фасада', bodyDecor: 'Декор корпуса',
    countertop: 'Столешница', countertopDecor: 'Декор столешницы', preliminary: 'Предварительная деталировка', exportJson: 'Скачать JSON', exportCsv: 'Скачать CSV',
    noProduction: 'Это предварительный расчёт. Перед распилом проверьте кромку, фурнитуру, сверление, вырезы и монтажные зазоры.',
    applianceNote: 'Техника отображается как габаритная 3D-модель. Точные размеры нужно сверять с конкретной моделью производителя.',
    base: 'Нижний шкаф', sink: 'Шкаф под раковину', wall: 'Навесной шкаф', washer: 'Стиральная машина', dishwasher: 'Посудомоечная машина', oven: 'Духовой шкаф', fridge: 'Холодильник',
    roomSize: 'Размер комнаты', selected: 'Выбранный модуль', language: 'Язык', kitchenWidth: 'Длина ряда', moduleCount: 'Модулей', partCount: 'Деталей', mm: 'мм',
    finished: 'Готовая', blank: 'Заготовка', thickness: 'Толщина', material: 'Материал', edge: 'Кромка', detail: 'Деталь',
    saveLocal: 'Проект автоматически сохраняется на этом устройстве.', addModule: 'Добавить модуль', settings: 'Настройки', menu: 'Меню'
  },
  en: {
    appName: 'Kitchen CAD', constructor: 'Kitchen designer', room: 'Room', modules: 'Modules', materials: 'Materials', parts: 'Parts', project: 'Project',
    width: 'Width', depth: 'Length', height: 'Height', wallColor: 'Wall color', floorColor: 'Floor color',
    add: 'Add', edit: 'Edit', copy: 'Duplicate', remove: 'Delete', close: 'Close', fit: 'Fit', front: 'Front', top: 'Top',
    dimensions: 'Dimensions', showDimensions: 'Show dimensions', sceneHint: 'Drag to rotate · pinch to zoom',
    moduleSize: 'Module size', board: 'Board', frontBase: 'Front substrate', frontDecor: 'Front decor', frontColor: 'Front color', bodyDecor: 'Body decor',
    countertop: 'Countertop', countertopDecor: 'Countertop decor', preliminary: 'Preliminary cut list', exportJson: 'Download JSON', exportCsv: 'Download CSV',
    noProduction: 'This is a preliminary calculation. Verify edging, hardware, drilling, cut-outs and installation clearances before production.',
    applianceNote: 'Appliances are shown as dimensioned 3D placeholders. Verify exact dimensions against the selected manufacturer model.',
    base: 'Base cabinet', sink: 'Sink cabinet', wall: 'Wall cabinet', washer: 'Washing machine', dishwasher: 'Dishwasher', oven: 'Oven', fridge: 'Refrigerator',
    roomSize: 'Room size', selected: 'Selected module', language: 'Language', kitchenWidth: 'Run length', moduleCount: 'Modules', partCount: 'Parts', mm: 'mm',
    finished: 'Finished', blank: 'Blank', thickness: 'Thickness', material: 'Material', edge: 'Edging', detail: 'Part',
    saveLocal: 'The project is saved automatically on this device.', addModule: 'Add module', settings: 'Settings', menu: 'Menu'
  }
});

export const translate = (lang, key) => TRANSLATIONS[lang]?.[key] ?? TRANSLATIONS.ru[key] ?? key;
export function moduleName(lang, type) { return translate(lang, type); }

const partNames = {
  'Боковина левая':'Left side','Боковина правая':'Right side','Дно':'Bottom','Задняя стенка накладная':'Applied back',
  'Верх':'Top','Передняя верхняя планка (плашмя)':'Front top rail','Задняя верхняя планка (ребром)':'Rear top rail',
  'Цоколь (индивидуальный)':'Plinth','Полка (боковой зазор 1 мм)':'Shelf (1 mm side clearance)','Фасад 1':'Front 1','Фасад 2':'Front 2'
};
export function partName(lang, name) { return lang === 'en' ? (partNames[name] || name) : name; }

export function warningText(lang, text) {
  if (lang !== 'en') return text;
  const id = text.match(/^M\d+:/)?.[0] ?? '';
  if (text.includes('вырез раковины')) return `${id} sink cut-out, plumbing and moisture protection are not designed yet.`;
  if (text.includes('широкий пролёт')) return `${id} wide span: verify shelf/rail deflection and countertop support.`;
  if (text.startsWith('Столешница над техникой')) return 'Countertop above appliances: independent supports and installation clearances are not calculated. Appliances are not structural supports.';
  if (text.startsWith('Верхние отметки')) return 'Cabinet top elevations differ: the countertop is not supported by every cabinet.';
  if (text.startsWith('Техника касается')) return 'An appliance touches or intersects the countertop. Use the manufacturer installation clearance.';
  if (text.startsWith('Столешница не перекрывает')) return 'The countertop does not cover some fronts in depth.';
  if (text.startsWith('Модули стыкуются')) return 'Modules currently snap together without appliance installation gaps. Design the appliance niche using the manufacturer instructions.';
  if (text.startsWith('Предварительная деталировка')) return 'Preliminary cut list: fasteners, drilling, hinges, loads and workshop allowances require verification.';
  return text;
}
