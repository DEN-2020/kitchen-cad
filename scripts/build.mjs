import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(resolve(root,'index.html'),resolve(dist,'index.html'));
await cp(resolve(root,'src'),resolve(dist,'src'),{recursive:true});

// Auto countertop keeps its nominal row size when a module is dragged.
const partsPath=resolve(dist,'src/core/parts.js');
let parts=await readFile(partsPath,'utf8');
parts=parts.replace(
  /const autoStart=floor\.length\?[\s\S]*?topY=bases\.length\?Math\.max\(\.\.\.bases\.map\(m=>m\.y\+m\.height\)\):860;/,
  `const autoLength=project.modules.filter(m=>m.type!=='wall').reduce((sum,m)=>sum+m.width,0);\n  const topLength=top.lengthMode==='manual'?top.length:autoLength+2*top.overhang, topX=top.lengthMode==='manual'?top.offsetX:top.offsetX-top.overhang,\n    topY=bases.length?Math.max(...bases.map(m=>m.y+m.height)):860;`
);
await writeFile(partsPath,parts);

const appPath=resolve(dist,'src/ui/app.js');
let app=await readFile(appPath,'utf8');
app=app.replace('hitRegions=[], moveDrag=false;','hitRegions=[], moveDrag=false, longPressTimer=null, pressOrigin=null;');

// Empty project is valid: no last-module guard and no panel crash.
app=app.replace(/else if\(a==='remove'\)\{if\(project\.modules\.length>1\)\{project\.fixtures=project\.fixtures\.filter\(f=>f\.targetModuleId!==selected\);project\.modules=project\.modules\.filter\(m=>m\.id!==selected\);selected=project\.modules\[0\]\.id;selectedObjectId=null\}\}/,
  "else if(a==='remove'){if(selected){project.fixtures=project.fixtures.filter(f=>f.targetModuleId!==selected);project.modules=project.modules.filter(m=>m.id!==selected);selected=project.modules[0]?.id;selectedObjectId=null}}");
app=app.replace(
  'function panelModules(model){const m=currentModule(),fixture=currentFixture(),doorItems=',
  "function panelModules(model){const m=currentModule();if(!m)return stats(model)+'<div class=\"note\">'+(lang()==='ru'?'В проекте пока нет модулей.':'There are no modules in this project yet.')+'</div><button class=\"button primary\" style=\"width:100%\" data-action=\"add\">＋ '+t('addModule')+'</button>';const fixture=currentFixture(),doorItems="
);
app=app.replace('function panelMaterials(){const m=currentModule(),c=project.countertop;return',
  "function panelMaterials(){const m=currentModule(),c=project.countertop;if(!m)return '<div class=\"note\">'+(lang()==='ru'?'В проекте пока нет модулей.':'There are no modules in this project yet.')+'</div>';return");
app=app.replace(/<div class=\"switch-row\"><span>\$\{t\('moveMode'\)\}<\/span><button class=\"switch \$\{project\.ui\.moveMode\?'on':''\}\" data-action=\"moveMode\"><\/button><\/div>/,
  `<div class="note">${'${lang()===\'ru\'?\'Зажми модуль примерно на 0,3 с и веди пальцем — он переместится.\':\'Press and hold a module for about 0.3 s, then drag to move it.\'}'}</div>`);
app=app.replace("else if(a==='moveMode'){project.ui.moveMode=!project.ui.moveMode}",'');

// Long press selects and immediately starts dragging; ordinary drag still rotates the camera.
const gesture=/canvas\.addEventListener\('pointerdown'[\s\S]*?canvas\.addEventListener\('pointercancel',e=>\{pointers\.delete\(e\.pointerId\);moveDrag=false\}\);/;
app=app.replace(gesture,`function cancelLongPress(){if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null}pressOrigin=null}\ncanvas.addEventListener('pointerdown',e=>{\n canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gestureMoved=false;moveDrag=false;\n const r=canvas.getBoundingClientRect(),hit=findHit(e.clientX-r.left,e.clientY-r.top);pressOrigin={x:e.clientX,y:e.clientY};\n if(hit?.moduleId){selected=hit.moduleId;selectedObjectId=hit.objectId;longPressTimer=setTimeout(()=>{moveDrag=true;gestureMoved=true;longPressTimer=null;navigator.vibrate?.(12);render({panel:false})},320)}\n if(pointers.size===2){cancelLongPress();const p=[...pointers.values()];lastDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}\n});\ncanvas.addEventListener('pointermove',e=>{\n if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;\n if(pressOrigin&&!moveDrag&&Math.hypot(e.clientX-pressOrigin.x,e.clientY-pressOrigin.y)>7)cancelLongPress();\n if(Math.hypot(dx,dy)>1)gestureMoved=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const model=buildProject(project);\n if(pointers.size===1){if(moveDrag){moveSelectedBy(dx,dy,model);render({panel:false})}else if(view==='iso'){yaw+=dx*.007;pitch=Math.max(.08,Math.min(1.15,pitch-dy*.006));render({panel:false})}}\n else if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastDistance){zoom=Math.max(.45,Math.min(3,zoom*dist/lastDistance));render({panel:false})}lastDistance=dist}\n});\nconst pointerUp=e=>{const p=pointers.get(e.pointerId),wasMoving=moveDrag;cancelLongPress();pointers.delete(e.pointerId);if(pointers.size<2)lastDistance=0;if(!gestureMoved&&p){const r=canvas.getBoundingClientRect(),hit=findHit(e.clientX-r.left,e.clientY-r.top);if(hit?.moduleId){selected=hit.moduleId;selectedObjectId=hit.objectId;openPanel('modules');render()}else if(hit?.objectId==='CT-01'){selectedObjectId='CT-01';openPanel('materials');render()}}moveDrag=false;if(wasMoving)render()};\ncanvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',e=>{cancelLongPress();pointers.delete(e.pointerId);moveDrag=false});`);

// Material summary is derived from current Parts[] and therefore updates on resize/delete automatically.
app=app.replace('function panelParts(model){',`function materialSummary(model){const groups=new Map();for(const p of model.parts){const key=p.substrate+'|'+p.decor+'|'+p.thickness,g=groups.get(key)||{count:0,area:0,substrate:p.substrate,decor:p.decor,thickness:p.thickness};g.count++;g.area+=p.u*p.v/1e6;groups.set(key,g)}const chips=[...groups.values()].map(g=>'<span class="chip">'+SUBSTRATES[g.substrate].name+' · '+DECORS[g.decor].name+' · '+g.thickness+' '+t('mm')+' · '+g.count+'× · '+g.area.toFixed(2)+' m²</span>').join('');const ct=model.countertop?'<span class="chip">'+t('countertop')+' · '+DECORS[project.countertop.decor].name+' · '+Math.round(model.countertop.length)+'×'+project.countertop.depth+'×'+project.countertop.thickness+' '+t('mm')+'</span>':'';return '<div class="section-title">'+(lang()==='ru'?'Материалы проекта':'Project materials')+'</div><div>'+(chips||'<span class="note">'+(lang()==='ru'?'Нет деталей для расчёта.':'No cut parts to calculate.')+'</span>')+ct+'</div>'}\nfunction panelParts(model){`);
app=app.replace('function panelParts(model){return `<div class="note">${t(\'noProduction\')}</div>',"function panelParts(model){return `${materialSummary(model)}<div class=\"note\">${t('noProduction')}</div>");
await writeFile(appPath,app);

await writeFile(resolve(dist,'.nojekyll'),'');
console.log('Built static Kitchen CAD site into dist/ with mobile regression patches.');
