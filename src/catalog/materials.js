/** Substrate affects the specification; decor only affects the preview. */
export const SUBSTRATES = Object.freeze({
  ldsp: { name: 'ЛДСП', group: 'panel' },
  mdf: { name: 'МДФ', group: 'panel' },
  blockboard: { name: 'Столярная плита / Counter', group: 'panel' },
  plywood: { name: 'Фанера', group: 'panel' },
  stone: { name: 'Камень (уточнить у поставщика)', group: 'countertop' },
});

/**
 * Purchasing products used by the estimator. Prices are normalized to EGP/m²;
 * sheet dimensions remain product data and are only used for stock planning.
 */
export const MATERIAL_PRODUCTS = Object.freeze({
  mfc18: Object.freeze({
    id:'mfc18',name:'ЛДСП / MFC меламин 18 мм',nameEn:'MFC / melamine chipboard 18 mm',nameAr:'خشب حبيبي ميلامين 18 مم',
    substrate:'ldsp',finish:'matte',roles:Object.freeze(['body','front']),sheetWidth:1220,sheetHeight:2440,thickness:18,
    pricePerM2:540,marketMinPerM2:500,marketMaxPerM2:575,
  }),
  melamineMdf18: Object.freeze({
    id:'melamineMdf18',name:'МДФ меламин 18 мм',nameEn:'Melamine MDF 18 mm',nameAr:'MDF ميلامين 18 مم',
    substrate:'mdf',finish:'matte',roles:Object.freeze(['body','front']),sheetWidth:1220,sheetHeight:2440,thickness:18,
    pricePerM2:700,marketMinPerM2:540,marketMaxPerM2:810,
  }),
  highGlossMdfPvc18: Object.freeze({
    id:'highGlossMdfPvc18',name:'МДФ High Gloss / PVC / Evogloss 18 мм',nameEn:'High Gloss MDF / PVC / Evogloss 18 mm',nameAr:'MDF هاي جلوس / PVC ‏18 مم',
    substrate:'mdf',finish:'gloss',roles:Object.freeze(['front']),sheetWidth:1220,sheetHeight:2800,thickness:18,
    pricePerM2:1150,marketMinPerM2:970,marketMaxPerM2:1315,
  }),
  acrylicHighGlossMdf18: Object.freeze({
    id:'acrylicHighGlossMdf18',name:'Акриловый High Gloss МДФ 18 мм',nameEn:'Acrylic High Gloss MDF 18 mm',nameAr:'MDF أكريليك هاي جلوس 18 مم',
    substrate:'mdf',finish:'gloss',roles:Object.freeze(['front']),sheetWidth:1220,sheetHeight:2800,thickness:18,
    pricePerM2:2200,marketMinPerM2:1960,marketMaxPerM2:2550,
  }),
  blockboard18: Object.freeze({
    id:'blockboard18',name:'Столярная плита / Counter 18 мм',nameEn:'Blockboard / Counter 18 mm',nameAr:'كونتر 18 مم',
    substrate:'blockboard',finish:'matte',roles:Object.freeze(['body','front']),sheetWidth:1220,sheetHeight:2440,thickness:18,
    pricePerM2:672,marketMinPerM2:504,marketMaxPerM2:873,
  }),
  plywood18: Object.freeze({
    id:'plywood18',name:'Фанера 18 мм (цена-ориентир)',nameEn:'Plywood 18 mm (estimate)',nameAr:'خشب رقائقي 18 مم (تقديري)',
    substrate:'plywood',finish:'matte',roles:Object.freeze(['body','front']),sheetWidth:1220,sheetHeight:2440,thickness:18,
    pricePerM2:1350,marketMinPerM2:0,marketMaxPerM2:0,
  }),
  hdf3: Object.freeze({
    id:'hdf3',name:'ХДФ для задников 3 мм (цена-ориентир)',nameEn:'HDF back panel 3 mm (estimate)',nameAr:'HDF خلفية 3 مم (تقديري)',
    substrate:'mdf',finish:'matte',roles:Object.freeze(['back']),sheetWidth:1220,sheetHeight:2440,thickness:3,
    pricePerM2:151,marketMinPerM2:0,marketMaxPerM2:0,
  }),
});

export const materialProductsForRole = role => Object.values(MATERIAL_PRODUCTS).filter(product => product.roles.includes(role));
export function materialProductLabel(product,lang='ru'){
  if(!product)return '';
  return lang==='ar'?product.nameAr:lang==='en'?product.nameEn:product.name;
}
export function inferMaterialProductId({role='body',substrate='ldsp',gloss=false}={}){
  if(role==='back')return 'hdf3';
  if(substrate==='blockboard')return 'blockboard18';
  if(substrate==='plywood')return 'plywood18';
  if(role==='front'&&gloss)return 'highGlossMdfPvc18';
  return substrate==='mdf'?'melamineMdf18':'mfc18';
}
export function materialSelectionPatch(role,productId){
  const product=MATERIAL_PRODUCTS[productId];
  if(!product||!product.roles.includes(role))throw new Error('Материал не подходит для выбранной детали');
  if(role==='front')return{frontMaterialId:product.id,frontSubstrate:product.substrate,frontThickness:product.thickness,gloss:product.finish==='gloss'};
  return{bodyMaterialId:product.id,bodySubstrate:product.substrate,board:product.thickness};
}

export const DECORS = Object.freeze({
  white: { name: 'Тёплый белый', nameEn: 'Warm white', nameAr: 'أبيض دافئ', color: '#eeeae0', pattern: 'solid' },
  olive: { name: 'Шалфей', nameEn: 'Sage', nameAr: 'أخضر مريمي', color: '#899782', pattern: 'solid' },
  graphite: { name: 'Графит', nameEn: 'Graphite', nameAr: 'جرافيت', color: '#424d54', pattern: 'solid' },
  oak: { name: 'Дуб', nameEn: 'Oak', nameAr: 'بلوط', color: '#c29764', pattern: 'wood' },
  walnut: { name: 'Орех', nameEn: 'Walnut', nameAr: 'جوز', color: '#815b3f', pattern: 'wood' },
  marble: { name: 'Светлый камень', nameEn: 'Light stone', nameAr: 'حجر فاتح', color: '#e7e5dd', pattern: 'stone' },
  concrete: { name: 'Бетон', nameEn: 'Concrete', nameAr: 'خرسانة', color: '#a7aaa6', pattern: 'speckle' },
});

export function decorLabel(decor,lang='ru'){
  if(!decor)return '';
  return lang==='ar'?decor.nameAr:lang==='en'?decor.nameEn:decor.name;
}

export const MODULE_TYPES = Object.freeze({
  base: 'Нижний шкаф',
  drawer: 'Шкаф с ящиками',
  sink: 'Шкаф под раковину',
  cornerBase: 'Угловой нижний шкаф (legacy)',
  cornerBaseBlind: 'Угловой нижний — глухой',
  cornerBaseDiagonal: 'Угловой нижний — диагональный 45°',
  cornerBaseL: 'Угловой нижний — L-образный',
  wall: 'Навесной шкаф',
  cornerWall: 'Угловой навесной шкаф (legacy)',
  cornerWallBlind: 'Угловой навесной — глухой',
  cornerWallDiagonal: 'Угловой навесной — диагональный 45°',
  cornerWallL: 'Угловой навесной — L-образный',
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
  { id:'base', ru:'Нижние шкафы', en:'Base cabinets', ar:'خزائن سفلية', types:['base','drawer','sink'] },
  { id:'base-corner', ru:'Угловые нижние', en:'Base corner cabinets', ar:'خزائن زاوية سفلية', types:['cornerBaseBlind','cornerBaseDiagonal','cornerBaseL'] },
  { id:'wall', ru:'Навесные шкафы', en:'Wall cabinets', ar:'خزائن علوية', types:['wall'] },
  { id:'wall-corner', ru:'Угловые навесные', en:'Wall corner cabinets', ar:'خزائن زاوية علوية', types:['cornerWallBlind','cornerWallDiagonal','cornerWallL'] },
  { id:'tall', ru:'Пеналы', en:'Tall units', ar:'خزائن طويلة', types:['tall','tallOven'] },
  { id:'appliances', ru:'Техника', en:'Appliances', ar:'أجهزة', types:['washer','dishwasher','oven','fridge','freezer','microwave','hood'] },
  { id:'room', ru:'Комната', en:'Room elements', ar:'عناصر الغرفة', types:['window','door'] },
]);

export const APPLIANCE_TYPES = Object.freeze(['washer','dishwasher','oven','fridge','freezer','microwave','hood']);
export const ROOM_ELEMENT_TYPES = Object.freeze(['window','door']);
export const DISPLAY_ONLY_TYPES = Object.freeze([...APPLIANCE_TYPES,...ROOM_ELEMENT_TYPES]);
export const isApplianceType = type => APPLIANCE_TYPES.includes(type);
export const isRoomElementType = type => ROOM_ELEMENT_TYPES.includes(type);
export const isDisplayOnlyType = type => DISPLAY_ONLY_TYPES.includes(type);
const WALL_MOUNTED_TYPES = Object.freeze(['wall','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL','microwave','hood','window']);
export const MODULE_PLACEMENT = Object.freeze(Object.fromEntries(
  Object.keys(MODULE_TYPES).map(type => [type, Object.freeze({
    layer: WALL_MOUNTED_TYPES.includes(type) ? 'wall' : isRoomElementType(type) ? 'room' : 'floor',
    snapToWall: true,
    clampToRoom: true,
  })]),
));
export const modulePlacementPolicy = type => MODULE_PLACEMENT[type] || Object.freeze({layer:'floor',snapToWall:true,clampToRoom:true});
export const isWallMountedType = type => modulePlacementPolicy(type).layer === 'wall';
export const CORNER_TYPES = Object.freeze(['cornerBase','cornerBaseBlind','cornerBaseDiagonal','cornerBaseL','cornerWall','cornerWallBlind','cornerWallDiagonal','cornerWallL']);
export const isCornerType = type => CORNER_TYPES.includes(type);
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
