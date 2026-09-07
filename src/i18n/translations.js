export const TRANSLATIONS = Object.freeze({
  ru:{
    appName:'Kitchen CAD',constructor:'Конструктор кухни',room:'Комната',modules:'Модули',materials:'Материалы',parts:'Детали',project:'Проект',
    width:'Ширина',depth:'Глубина',roomDepth:'Длина',height:'Высота',wallColor:'Цвет стен',floorColor:'Цвет пола',add:'Добавить',copy:'Копия',remove:'Удалить',fit:'Вписать',front:'Спереди',top:'Сверху',
    dimensions:'Размеры',showDimensions:'Показывать размеры',dimensionMode:'Какие размеры',dimMain:'Основные',dimSelected:'Выбранный элемент',dimAll:'Все детали',sceneHint:'Проведи пальцем — повернуть по двум осям · щипок — масштаб',
    moduleSize:'Размер модуля',position:'Положение',moveMode:'Двигать выбранный модуль',board:'Плита',frontBase:'Основа фасада',frontDecor:'Декор фасада',frontColor:'Цвет фасада',bodyDecor:'Декор корпуса',
    fronts:'Фасады',doorCount:'Количество створок',auto:'Авто',frontStyle:'Тип фасада',handleStyle:'Ручки',legStyle:'Ножки',overhangTop:'Свес сверху',overhangBottom:'Свес снизу',overhangLeft:'Свес слева',overhangRight:'Свес справа',
    countertop:'Столешница',countertopDecor:'Декор столешницы',countertopMode:'Длина столешницы',autoLength:'Автоматически',manualLength:'Вручную',countertopLength:'Длина столешницы',countertopDepth:'Глубина столешницы',countertopThickness:'Толщина столешницы',countertopOffset:'Смещение X',
    selected:'Выбранный модуль',selectedPart:'Выбранный элемент',language:'Язык',theme:'Тема',dark:'Тёмная',light:'Светлая',kitchenWidth:'Длина ряда',moduleCount:'Модулей',partCount:'Деталей',mm:'мм',
    exportJson:'JSON',exportCsv:'CSV',exportPng:'PNG / фото',exportPdf:'PDF-чертёж',saveLocal:'Проект автоматически сохраняется на этом устройстве.',addModule:'Добавить модуль',settings:'Настройки',
    explode:'Разобранный вид',explodeDistance:'Разнос деталей',insert:'Встраиваемые элементы',addSink:'Добавить раковину',addHob:'Добавить варочную поверхность',fixtureSize:'Размер выреза/элемента',fixtureOffset:'Смещение по шкафу',
    noProduction:'Это предварительный расчёт. Перед распилом проверьте кромку, фурнитуру, сверление, вырезы и монтажные зазоры.',applianceNote:'Техника пока параметрическая. Точные размеры нужно сверять с конкретной моделью производителя.',
    base:'Нижний шкаф',sink:'Шкаф под раковину',wall:'Навесной шкаф',washer:'Стиральная машина',dishwasher:'Посудомоечная машина',oven:'Духовой шкаф',fridge:'Холодильник',
    roomSize:'Размер комнаты',material:'Материал',detail:'Деталь',finished:'Готовая',blank:'Заготовка',thickness:'Толщина',warning:'Проверить',moveHint:'В режиме перемещения тащи выбранный модуль пальцем по полу.'
  },
  en:{
    appName:'Kitchen CAD',constructor:'Kitchen designer',room:'Room',modules:'Modules',materials:'Materials',parts:'Parts',project:'Project',
    width:'Width',depth:'Depth',roomDepth:'Length',height:'Height',wallColor:'Wall color',floorColor:'Floor color',add:'Add',copy:'Duplicate',remove:'Delete',fit:'Fit',front:'Front',top:'Top',
    dimensions:'Dimensions',showDimensions:'Show dimensions',dimensionMode:'Dimension detail',dimMain:'Main',dimSelected:'Selected item',dimAll:'All parts',sceneHint:'Drag to orbit on two axes · pinch to zoom',
    moduleSize:'Module size',position:'Position',moveMode:'Move selected module',board:'Board',frontBase:'Front substrate',frontDecor:'Front decor',frontColor:'Front color',bodyDecor:'Body decor',
    fronts:'Fronts',doorCount:'Door count',auto:'Auto',frontStyle:'Front style',handleStyle:'Handles',legStyle:'Legs',overhangTop:'Top overhang',overhangBottom:'Bottom overhang',overhangLeft:'Left overhang',overhangRight:'Right overhang',
    countertop:'Countertop',countertopDecor:'Countertop decor',countertopMode:'Countertop length',autoLength:'Automatic',manualLength:'Manual',countertopLength:'Countertop length',countertopDepth:'Countertop depth',countertopThickness:'Countertop thickness',countertopOffset:'X offset',
    selected:'Selected module',selectedPart:'Selected item',language:'Language',theme:'Theme',dark:'Dark',light:'Light',kitchenWidth:'Run length',moduleCount:'Modules',partCount:'Parts',mm:'mm',
    exportJson:'JSON',exportCsv:'CSV',exportPng:'PNG / image',exportPdf:'PDF drawing',saveLocal:'The project is saved automatically on this device.',addModule:'Add module',settings:'Settings',
    explode:'Exploded view',explodeDistance:'Explode distance',insert:'Built-in items',addSink:'Add sink',addHob:'Add cooktop',fixtureSize:'Cut-out / item size',fixtureOffset:'Offset in cabinet',
    noProduction:'This is a preliminary calculation. Verify edging, hardware, drilling, cut-outs and installation clearances before production.',applianceNote:'Appliances are parametric placeholders. Verify exact dimensions against the selected manufacturer model.',
    base:'Base cabinet',sink:'Sink cabinet',wall:'Wall cabinet',washer:'Washing machine',dishwasher:'Dishwasher',oven:'Oven',fridge:'Refrigerator',
    roomSize:'Room size',material:'Material',detail:'Part',finished:'Finished',blank:'Blank',thickness:'Thickness',warning:'Check',moveHint:'In move mode, drag the selected module across the floor.'
  }
});
export const translate=(lang,key)=>TRANSLATIONS[lang]?.[key]??TRANSLATIONS.ru[key]??key;
export const moduleName=(lang,type)=>translate(lang,type);
const partNames={'Боковина левая':'Left side','Боковина правая':'Right side','Дно':'Bottom','Задняя стенка накладная':'Applied back','Верх':'Top','Передняя верхняя планка (плашмя)':'Front top rail','Задняя верхняя планка (ребром)':'Rear top rail','Цоколь (индивидуальный)':'Plinth','Полка (боковой зазор 1 мм)':'Shelf (1 mm side clearance)','Фасад 1':'Front 1','Фасад 2':'Front 2','Фасад 3':'Front 3','Фасад 4':'Front 4'};
export const partName=(lang,name)=>lang==='en'?(partNames[name]||name):name;
export function warningText(lang,text){
  if(lang!=='en')return text;const id=text.match(/^M\d+:/)?.[0]??'';
  if(text.includes('выходит за пределы комнаты'))return `${id} module is outside the room boundaries.`;
  if(text.includes('вырез раковины'))return `${id} sink cut-out, plumbing and moisture protection must be checked against the selected sink.`;
  if(text.includes('широкий пролёт'))return `${id} wide span: verify shelf/rail deflection and countertop support.`;
  if(text.startsWith('Столешница выходит'))return 'The countertop is outside the room boundaries. Check length, depth and offset.';
  if(text.startsWith('Столешница не перекрывает'))return 'The countertop does not cover all cabinets. Check its size or cabinet positions.';
  if(text.startsWith('Есть пересечение'))return 'Some floor modules overlap. Move cabinets or appliances.';
  if(text.includes('не помещается'))return text.startsWith('Раковина')?'The sink does not fit the selected cabinet/countertop.':'The cooktop does not fit the selected cabinet/countertop.';
  if(text.startsWith('Раковина:')||text.startsWith('Варочная'))return 'The shown outline is a planning cut-out only. Use the manufacturer cut-out template.';
  if(text.startsWith('Столешница над техникой'))return 'Countertop above appliances: independent supports and clearances are not calculated. Appliances are not structural supports.';
  if(text.startsWith('Модули стыкуются'))return 'Modules do not automatically include appliance installation gaps. Verify clearances against the manufacturer instructions.';
  if(text.startsWith('Предварительная деталировка'))return 'Preliminary cut list: fasteners, drilling, hinges, loads and workshop allowances require verification.';
  return text;
}
