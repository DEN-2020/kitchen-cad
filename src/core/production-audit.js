import { isCornerType, isDisplayOnlyType, isWallMountedType } from '../catalog/materials.js';

const PRELIMINARY_CORNER_TYPES=new Set([
  'cornerBase','cornerWall','cornerBaseBlind','cornerWallBlind',
  'cornerBaseDiagonal','cornerWallDiagonal','cornerBaseL','cornerWallL',
]);
const VISUAL_ONLY_FRONT_STYLES=new Set(['frame','glass','slatted','shaker','louvered']);
const HARD_MODEL_ISSUES=new Set([
  'module-out','overlap','appliance-corner-overlap','countertop-out','countertop-cover',
  'fixture','fixture-part-collision','appliance-bay-fit','appliance-fixture-conflict','appliance-hob-clearance',
  'appliance-hob-compatibility','appliance-support-missing','dishwasher-corner-clearance','hood-clearance','washer-clearance',
]);

export function cornerProductionSignature(module={}){
  return [
    module.type,module.width,module.height,module.depth,module.feet,module.board,module.frontThickness,module.back,
    module.bottomMode,module.backMode,module.topMode,module.cornerOpening,module.cornerOpeningSide,module.cornerMuntinWidth,
    module.shelfCount,module.gap,module.frontEnabled,module.doorCount,module.applianceBay,module.applianceSupportMode,
    module.applianceWidth,module.applianceHeight,module.applianceDepth,module.applianceSideClearance,
  ].map(value=>String(value??'')).join('|');
}

/** Production gate for draft geometry. It does not replace a workshop check. */
export function auditProductionReadiness(project={},model={},cost={}){
  const findings=[],seen=new Set(),modules=Array.isArray(model.modules)?model.modules:(project.modules||[]);
  const add=(severity,code,message,moduleId=null)=>{
    const key=[severity,code,moduleId||'',message].join('|');if(seen.has(key))return;
    seen.add(key);findings.push({severity,code,message,moduleId});
  };
  for(const issue of model.issues||[]){
    const code=issue.type||issue.code||'model-issue',severity=HARD_MODEL_ISSUES.has(code)?'blocker':'warning';
    add(severity,code,issue.message||`Проверка модели: ${code}.`,issue.moduleId||null);
  }
  for(const module of modules){
    if(isDisplayOnlyType(module.type))continue;
    if(PRELIMINARY_CORNER_TYPES.has(module.type)){
      const approved=module.cornerProductionApproval===cornerProductionSignature(module);
      if(!approved)add('blocker','preliminary-corner','Корпус этого углового модуля пока является предварительным и не готов к напилу.',module.id);
      else add('warning','corner-construction-approved','Конструкция углового модуля утверждена для текущих размеров; изменение геометрии автоматически потребует повторного утверждения.',module.id);
    }
    if(module.type==='drawer')add('blocker','drawer-boxes-missing','Короба и днища ящиков не входят в напил; рассчитаны только фасады и количество направляющих.',module.id);
    if(module.type==='tallOven')add('blocker','oven-niche-missing','Ниша пенала под духовку не формируется по паспорту выбранной техники.',module.id);
    if(module.width>900&&!isCornerType(module.type))add('blocker','wide-span-unsupported','Ширина корпуса больше 900 мм, но центральная перегородка/усиление не сформированы в напиле.',module.id);
    if(VISUAL_ONLY_FRONT_STYLES.has(module.frontStyle))add('blocker','front-style-visual-only','Рамка, стекло или рейки показаны визуально, но не разложены на отдельные материалы и детали.',module.id);
    if(module.backMode==='none'&&isWallMountedType(module.type))add('warning','backless-wall-reinforcement','Навесной шкаф без задника допустим только с монтажной шиной/навесами и защитой от перекоса; крепление и жёсткость проверить по стене.',module.id);
    else if(module.backMode==='none'&&['tall','tallOven'].includes(module.type))add('blocker','structural-back-missing','У пенала не задан задник/диагональная жёсткость и система крепления.',module.id);
    else if(module.backMode==='none'&&!['sink','cornerBaseBlind'].includes(module.type)&&!['washer','dishwasher'].includes(module.applianceBay))add('warning','back-missing','Задняя стенка не включена в деталировку и стоимость.',module.id);
    if(['cornerBaseBlind','cornerWallBlind'].includes(module.type))add('warning','blind-corner-drilling','Проверить карту сверления монтажной стойки и конкретную петлю глухого угла.',module.id);
    if(['washer','dishwasher'].includes(module.applianceBay))add('warning','appliance-datasheet-required','Размеры проёма рассчитаны по введённым габаритам; перед распилом сверить точную модель техники и её монтажную схему.',module.id);
  }
  for(const warning of cost.stockWarnings||[])add('blocker','stock-unplaced',`Деталь ${warning.id||warning.name||''} не помещается в выбранный формат листа.`);
  for(const warning of cost.materialWarnings||[])add('blocker','material-thickness',`${warning.materialName}: толщина детали ${warning.partThickness} мм не совпадает с продуктом ${warning.productThickness} мм.`);
  if((model.parts||[]).some(part=>part.role==='front'&&part.hingeSide))add('warning','machining-maps-missing','Координаты чашек петель и присадки не сформированы: перед заказом сверления нужна карта выбранной системы фурнитуры.');
  if((model.parts||[]).some(part=>part.role==='front'&&Number(part.u)>600))add('warning','wide-front-hinge-load','Есть фасад шире 600 мм. Количество и тип петель нужно проверить по массе, высоте и таблице производителя фурнитуры.');
  if(cost.countertopPriced===false)add('warning','countertop-unpriced','Столешница имеет нулевую цену и не входит в денежный итог закупки. Геометрия и деталировка при этом остаются доступными.');
  if((project.fixtures||[]).length)add('warning','fixture-operations-unpriced','Вырезы, герметизация и монтаж раковины/варочной поверхности пока не имеют отдельной цены.');
  if((cost.unpricedHardware||[]).length){
    const names=cost.unpricedHardware.map(row=>row.name).join(', ');
    add('warning','hardware-unpriced',`Не заданы цены фурнитуры: ${names}. Это делает денежную смету неполной, но не блокирует геометрию напила.`);
  }
  if(modules.some(module=>isDisplayOnlyType(module.type)&&!['window','door'].includes(module.type)))add('warning','appliances-unpriced','Стоимость бытовой техники не входит в смету кухни.');
  if((cost.procurementTotal||0)>(cost.consumedTotal||cost.total||0)+1)add('warning','purchase-vs-consumption','Денежная закупка целыми листами выше стоимости фактически израсходованной площади; используй итог «к закупке».');
  const blockers=findings.filter(item=>item.severity==='blocker'),warnings=findings.filter(item=>item.severity==='warning');
  return{ready:blockers.length===0,blockers,warnings,findings};
}
