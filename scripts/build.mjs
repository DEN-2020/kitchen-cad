import { cp, mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=resolve(root,'dist');
const required=(text,find,repl,label)=>{if(typeof find==='string'&&!text.includes(find))throw new Error(`Build patch not found: ${label}`);const next=text.replace(find,repl);if(next===text)throw new Error(`Build patch did not apply: ${label}`);return next};
await rm(dist,{recursive:true,force:true});await mkdir(dist,{recursive:true});
await cp(resolve(root,'index.html'),resolve(dist,'index.html'));
await cp(resolve(root,'src'),resolve(dist,'src'),{recursive:true});

const projectPath=resolve(dist,'src/core/project.js');
let project=await readFile(projectPath,'utf8');
project=required(project,
  "countertop: { enabled: true, depth: 620, thickness: 20, overhang: 0, decor: 'marble', color: DECORS.marble.color, gloss: false, lengthMode:'auto', length:1700, offsetX:0 },",
  "countertop: { enabled: true, depth: 620, thickness: 20, overhang: 0, decor: 'marble', color: DECORS.marble.color, gloss: false, lengthMode:'manual', length:1700, offsetX:0, offsetZ:0, elevation:860 },",
  'countertop defaults');
project=required(project,
  "if (!Number.isFinite(p.countertop.offsetX)) p.countertop.offsetX=0;",
  "if (!Number.isFinite(p.countertop.offsetX)) p.countertop.offsetX=0;\n  if (!Number.isFinite(p.countertop.offsetZ)) p.countertop.offsetZ=0;\n  if (!Number.isFinite(p.countertop.elevation)) p.countertop.elevation=860;",
  'countertop migration');
project=required(project,
  "number(t.length,200,20000,'Длина столешницы'); number(t.offsetX,-10000,10000,'Смещение столешницы');",
  "number(t.length,200,20000,'Длина столешницы'); number(t.offsetX,-10000,10000,'Смещение столешницы X'); number(t.offsetZ,-10000,10000,'Смещение столешницы Z'); number(t.elevation,0,6000,'Высота столешницы');",
  'countertop validation');
await writeFile(projectPath,project);

const partsPath=resolve(dist,'src/core/parts.js');
let parts=await readFile(partsPath,'utf8');
parts=required(parts,
  /const autoStart=floor\.length\?[\s\S]*?topY=bases\.length\?Math\.max\(\.\.\.bases\.map\(m=>m\.y\+m\.height\)\):860;/,
  `const autoLength=project.modules.filter(m=>m.type!=='wall').reduce((sum,m)=>sum+m.width,0);\n  const topLength=top.lengthMode==='manual'?top.length:autoLength+2*top.overhang, topX=top.offsetX, topZ=top.offsetZ, topY=top.elevation;`,
  'independent countertop layout');
parts=required(parts,
  "const ctOut=topX<0||topX+topLength>project.room.width||top.depth>project.room.depth||topY+top.thickness>project.room.height;",
  "const ctOut=topX<0||topX+topLength>project.room.width||topZ<0||topZ+top.depth>project.room.depth||topY+top.thickness>project.room.height;",
  'countertop room bounds');
parts=required(parts,
  "const uncovered=bases.some(m=>m.x<topX||m.x+m.width>topX+topLength||m.z+m.depth>top.depth);",
  "const uncovered=bases.some(m=>m.x<topX||m.x+m.width>topX+topLength||m.z<topZ||m.z+m.depth>topZ+top.depth);",
  'countertop coverage');
parts=required(parts,
  "center:[topX+topLength/2,topY+top.thickness/2,top.depth/2]",
  "center:[topX+topLength/2,topY+top.thickness/2,topZ+top.depth/2]",
  'countertop Z center');
await writeFile(partsPath,parts);

const cssPath=resolve(dist,'src/ui/app.css');
let css=await readFile(cssPath,'utf8');
css += `\n@media(max-width:899px){.side-tools{display:none!important}.scene-badge{left:8px!important}}\n`;
await writeFile(cssPath,css);

const trPath=resolve(dist,'src/i18n/translations.js');
let tr=await readFile(trPath,'utf8');
tr=tr.replace("dimensionMode:'Какие размеры',dimMain:'Основные',dimSelected:'Выбранный элемент',dimAll:'Все детали'","dimensionMode:'Дополнительные размеры',dimMain:'Только габариты',dimSelected:'Детали выбранного модуля',dimAll:'Детали всех модулей'");
tr=tr.replace("autoLength:'Автоматически'","autoLength:'По нижнему ряду (связано)'");
tr=tr.replace("dimensionMode:'Dimension detail',dimMain:'Main',dimSelected:'Selected item',dimAll:'All parts'","dimensionMode:'Additional dimensions',dimMain:'Main dimensions only',dimSelected:'Selected module parts',dimAll:'All module parts'");
tr=tr.replace("autoLength:'Automatic'","autoLength:'Linked to base run'");
await writeFile(trPath,tr);

const appPath=resolve(dist,'src/ui/app.js');
let app=await readFile(appPath,'utf8');
app=required(app,"KEY='kitchen-cad-project-v3'","KEY='kitchen-cad-project-v4'",'storage version');
app=required(app,
  "let project;try{project=ensureProjectDefaults(JSON.parse(localStorage.getItem(KEY))||JSON.parse(localStorage.getItem('kitchen-cad-project-v2'))||JSON.parse(localStorage.getItem('kitchen-cad-project-v1'))||createProject())}catch{project=createProject()}",
  "let project;try{const own=localStorage.getItem(KEY),old=localStorage.getItem('kitchen-cad-project-v3')||localStorage.getItem('kitchen-cad-project-v2')||localStorage.getItem('kitchen-cad-project-v1');project=ensureProjectDefaults(JSON.parse(own||old)||createProject());if(!own){if(project.countertop.lengthMode==='auto'){project.countertop.length=project.modules.filter(m=>m.type!=='wall').reduce((s,m)=>s+m.width,0)+2*project.countertop.overhang;project.countertop.lengthMode='manual'}project.countertop.offsetZ=Number.isFinite(project.countertop.offsetZ)?project.countertop.offsetZ:0;project.countertop.elevation=Number.isFinite(project.countertop.elevation)?project.countertop.elevation:860;project.ui.detailSelection=false}}catch{project=createProject()}",
  'countertop one-time migration');
app=required(app,'hitRegions=[], moveDrag=false;','hitRegions=[], moveDrag=false, longPressTimer=null, pressOrigin=null, dragTarget=null;','gesture state');
app=required(app,
  "function panelModules(model){const m=currentModule(),fixture=currentFixture(),doorItems=",
  "function panelModules(model){const m=currentModule();if(!m)return stats(model)+'<div class=\"note\">'+(lang()==='ru'?'В проекте пока нет модулей.':'There are no modules yet.')+'</div><button class=\"button primary\" style=\"width:100%\" data-action=\"add\">＋ '+t('addModule')+'</button>';const fixture=currentFixture(),doorItems=",
  'empty module panel');
app=app.replace(/<div class=\"switch-row\"><span>\$\{t\('moveMode'\)\}<\/span><button class=\"switch \$\{project\.ui\.moveMode\?'on':''\}\" data-action=\"moveMode\"><\/button><\/div>/,
  `<div class="note">${'${lang()===\'ru\'?\'Зажми выбранный объект примерно на 0,3 с и веди пальцем — он переместится.\':\'Press and hold the selected object for about 0.3 s, then drag it.\'}'}</div>`);
app=app.replace("else if(a==='moveMode'){project.ui.moveMode=!project.ui.moveMode}",'');
app=required(app,
  "${input('countertop.offsetX',t('countertopOffset')+', '+t('mm'),c.offsetX,-10000,10000)}${select('countertop.decor',t('countertopDecor'),c.decor,DECORS)}",
  "${input('countertop.offsetX','X, '+t('mm'),c.offsetX,-10000,10000)}${input('countertop.offsetZ','Z, '+t('mm'),c.offsetZ??0,-10000,10000)}${input('countertop.elevation',(lang()==='ru'?'Высота':'Elevation')+', '+t('mm'),c.elevation??860,0,6000)}${select('countertop.decor',t('countertopDecor'),c.decor,DECORS)}",
  'countertop position fields');
app=app.replace("return `${!isApplianceType(m.type)?`<div class=\"section-title\">${moduleName(lang(),m.type)}",
  "return `${m&&!isApplianceType(m.type)?`<div class=\"section-title\">${moduleName(lang(),m.type)}");
app=app.replace("`:`<div class=\"note\">${t('applianceNote')}</div>`}<div class=\"section-title\">${t('countertop')}</div>",
  "`:(m?`<div class=\"note\">${t('applianceNote')}</div>`:'')}<div class=\"section-title\">${t('countertop')}</div>");

app=required(app,
  "function registerHit(o,poly){if(o.moduleId||o.kind==='countertop')hitRegions.push({objectId:o.id,moduleId:o.moduleId,poly})}",
  "function registerHit(o,poly){if(o.moduleId||o.kind==='countertop')hitRegions.push({objectId:o.id,moduleId:o.moduleId,kind:o.kind,role:o.role,poly})}",
  'hit metadata');
app=required(app,
  "ctx.strokeStyle=o.id===selectedObjectId?'#8b63ff':o.moduleId===selected?'#21c5d7':'#c5ccce';ctx.lineWidth=o.id===selectedObjectId?3:2;",
  "ctx.strokeStyle=o.id===selectedObjectId?'#8b63ff':'#c5ccce';ctx.lineWidth=o.id===selectedObjectId?3:2;",
  'disc group highlight');
app=required(app,
  "ctx.strokeStyle=issue?'#ff4f62':o.id===selectedObjectId?'#8b63ff':o.moduleId===selected?'#20c9dc':'#829196';ctx.lineWidth=issue?2.2:o.id===selectedObjectId?2.7:o.moduleId===selected?1.5:.55;",
  "ctx.strokeStyle=issue?'#ff4f62':o.id===selectedObjectId?'#8b63ff':'#829196';ctx.lineWidth=issue?2.2:o.id===selectedObjectId?2.7:.55;",
  'box group highlight');
app=required(app,
  "function drawPartDimensions(model,w,h){if(!project.ui.showDimensions)return;",
  "function wireSelection(model,w,h){const m=model.modules.find(x=>x.id===selected);if(!m)return;const [x,y,z]=[m.x+m.width/2,m.y+m.height/2,m.z+m.depth/2],[sx,sy,sz]=[m.width,m.height,m.depth],pts=[[x-sx/2,y-sy/2,z-sz/2],[x+sx/2,y-sy/2,z-sz/2],[x+sx/2,y+sy/2,z-sz/2],[x-sx/2,y+sy/2,z-sz/2],[x-sx/2,y-sy/2,z+sz/2],[x+sx/2,y-sy/2,z+sz/2],[x+sx/2,y+sy/2,z+sz/2],[x-sx/2,y+sy/2,z+sz/2]].map(p=>proj(...p,w,h,model)),edges=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];ctx.save();ctx.strokeStyle='#20c9dc';ctx.lineWidth=2;for(const [a,b] of edges){ctx.beginPath();ctx.moveTo(...pts[a]);ctx.lineTo(...pts[b]);ctx.stroke()}ctx.restore()}\nfunction drawPartDimensions(model,w,h){if(!project.ui.showDimensions)return;",
  'selection wireframe function');
const dimRe=/function drawPartDimensions\(model,w,h\)\{[\s\S]*?\}\r?\nfunction draw\(model\)\{/;
app=required(app,dimRe,`function drawPartDimensions(model,w,h){
 if(!project.ui.showDimensions)return;
 const m=model.modules.find(x=>x.id===selected),mode=project.ui.dimensionMode;
 if(selectedObjectId==='CT-01'&&model.countertop){const o=model.objects.find(x=>x.id==='CT-01');if(o){const [x,y,z]=o.center,[sx,sy,sz]=o.size;dim(proj(x-sx/2,y+sy/2+30,z+sz/2,w,h,model),proj(x+sx/2,y+sy/2+30,z+sz/2,w,h,model),Math.round(sx)+' '+t('mm'),true);dim(proj(x+sx/2+30,y,z-sz/2,w,h,model),proj(x+sx/2+30,y,z+sz/2,w,h,model),Math.round(sz)+' '+t('mm'),true);dim(proj(x+sx/2+55,y-sy/2,z+sz/2,w,h,model),proj(x+sx/2+55,y+sy/2,z+sz/2,w,h,model),Math.round(sy)+' '+t('mm'),true)}}
 else if(m){dim(proj(m.x,m.y+m.height+40,m.z+m.depth,w,h,model),proj(m.x+m.width,m.y+m.height+40,m.z+m.depth,w,h,model),m.width+' '+t('mm'),true);dim(proj(m.x+m.width+25,m.y,m.z+m.depth,w,h,model),proj(m.x+m.width+25,m.y+m.height,m.z+m.depth,w,h,model),m.height+' '+t('mm'),true);dim(proj(m.x+m.width+45,m.y+20,m.z,w,h,model),proj(m.x+m.width+45,m.y+20,m.z+m.depth,w,h,model),m.depth+' '+t('mm'),true)}
 if(mode==='selected'||mode==='all'){for(const p of model.parts){if(mode==='selected'&&p.moduleId!==selected)continue;const a=exploded(p,model),c=proj(...a.center,w,h,model);ctx.font='700 8px system-ui';ctx.textAlign='center';ctx.fillStyle=project.ui.theme==='dark'?'#fff':'#17262b';ctx.fillText(p.id+' '+p.u+'×'+p.v,c[0],c[1]-5)}}
}
function draw(model){`, 'dimension drawing');
app=required(app,
  "hitRegions=[];drawRoom(r.width,r.height,model);for(const o of model.objects)box(o,r.width,r.height,model);drawPartDimensions(model,r.width,r.height)",
  "hitRegions=[];drawRoom(r.width,r.height,model);for(const o of model.objects)box(o,r.width,r.height,model);wireSelection(model,r.width,r.height);drawPartDimensions(model,r.width,r.height)",
  'selection wireframe call');
app=app.replace("if(project.ui.showDimensions&&project.ui.dimensionMode!=='selected')","if(project.ui.showDimensions)");

const moveRe=/function moveSelectedBy\(dx,dy,model\)\{[\s\S]*?\}\r?\nfunction reportCanvas/;
app=required(app,moveRe,`function deltaWorld(dx,dy,model){if(view==='front'){const s=Math.max(.01,Math.min(canvas.clientWidth/project.room.width,canvas.clientHeight/project.room.height)*zoom);return[dx/s,0]}if(view==='top'){const s=Math.min((canvas.clientWidth-60)/Math.max(project.room.width,model.width+300),(canvas.clientHeight-85)/Math.max(project.room.depth,model.depth+500))*zoom;return[dx/s,dy/s]}const s=sceneScale(canvas.clientWidth,canvas.clientHeight,model),sp=Math.max(.08,Math.sin(pitch)),Xp=dx/s,Zp=dy/(sp*s),c=Math.cos(yaw),sn=Math.sin(yaw);return[Xp*c+Zp*sn,-Xp*sn+Zp*c]}
function moveTargetBy(dx,dy,model){const [wx,wz]=deltaWorld(dx,dy,model);if(dragTarget==='countertop'){project.countertop.offsetX+=wx;project.countertop.offsetZ+=wz;return}const m=currentModule();if(!m)return;m.offsetX+=wx;m.offsetZ+=wz}
function reportCanvas`, 'move target');

app=required(app,
  "<div class=\"section-title\">${t('dimensions')}</div>${select('ui.dimensionMode',t('dimensionMode'),project.ui.dimensionMode,{main:t('dimMain'),selected:t('dimSelected'),all:t('dimAll')})}",
  "<div class=\"section-title\">${t('dimensions')}</div>${select('ui.dimensionMode',t('dimensionMode'),project.ui.dimensionMode,{main:t('dimMain'),selected:t('dimSelected'),all:t('dimAll')})}<div class=\"switch-row\"><span>${lang()==='ru'?'Выбирать отдельные детали':'Select individual parts'}</span><button class=\"switch ${project.ui.detailSelection?'on':''}\" data-action=\"detailSelection\"></button></div>",
  'detail selection control');
app=app.replace("else if(a==='theme'){","else if(a==='detailSelection'){project.ui.detailSelection=!project.ui.detailSelection;if(!project.ui.detailSelection&&selectedObjectId!=='CT-01'&&!currentFixture())selectedObjectId=null}else if(a==='theme'){");

app=app.replace(/else if\(a==='remove'\)\{if\(project\.modules\.length>1\)\{project\.fixtures=project\.fixtures\.filter\(f=>f\.targetModuleId!==selected\);project\.modules=project\.modules\.filter\(m=>m\.id!==selected\);selected=project\.modules\[0\]\.id;selectedObjectId=null\}\}/,
  "else if(a==='remove'){if(selected){project.fixtures=project.fixtures.filter(f=>f.targetModuleId!==selected);project.modules=project.modules.filter(m=>m.id!==selected);selected=project.modules[0]?.id;selectedObjectId=null}}");
app=required(app,'function panelParts(model){',`function materialSummary(model){const groups=new Map();for(const p of model.parts){const key=p.substrate+'|'+p.decor+'|'+p.thickness,g=groups.get(key)||{count:0,area:0,substrate:p.substrate,decor:p.decor,thickness:p.thickness};g.count++;g.area+=p.u*p.v/1e6;groups.set(key,g)}const chips=[...groups.values()].map(g=>'<span class="chip">'+SUBSTRATES[g.substrate].name+' · '+DECORS[g.decor].name+' · '+g.thickness+' '+t('mm')+' · '+g.count+'× · '+g.area.toFixed(2)+' m²</span>').join('');const ct=model.countertop?'<span class="chip">'+t('countertop')+' · '+DECORS[project.countertop.decor].name+' · '+Math.round(model.countertop.length)+'×'+project.countertop.depth+'×'+project.countertop.thickness+' '+t('mm')+'</span>':'';return '<div class="section-title">'+(lang()==='ru'?'Материалы проекта':'Project materials')+'</div><div>'+(chips||'<span class="note">'+(lang()==='ru'?'Нет деталей для расчёта.':'No cut parts to calculate.')+'</span>')+ct+'</div>'}
function panelParts(model){`, 'material summary function');
app=app.replace('function panelParts(model){return `<div class="note">${t(\'noProduction\')}</div>',"function panelParts(model){return `${materialSummary(model)}<div class=\"note\">${t('noProduction')}</div>");

const gesture=/canvas\.addEventListener\('pointerdown'[\s\S]*?canvas\.addEventListener\('pointercancel',e=>\{pointers\.delete\(e\.pointerId\);moveDrag=false\}\);/;
app=required(app,gesture,`function cancelLongPress(){if(longPressTimer){clearTimeout(longPressTimer);longPressTimer=null}pressOrigin=null}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});gestureMoved=false;moveDrag=false;dragTarget=null;const r=canvas.getBoundingClientRect(),hit=findHit(e.clientX-r.left,e.clientY-r.top);pressOrigin={x:e.clientX,y:e.clientY};if(hit?.objectId==='CT-01'){selectedObjectId='CT-01';dragTarget='countertop';longPressTimer=setTimeout(()=>{moveDrag=true;gestureMoved=true;longPressTimer=null;navigator.vibrate?.(12);render({panel:false})},320)}else if(hit?.moduleId){selected=hit.moduleId;selectedObjectId=(hit.kind?.startsWith('fixture-')||project.ui.detailSelection)?hit.objectId:null;dragTarget='module';longPressTimer=setTimeout(()=>{moveDrag=true;gestureMoved=true;longPressTimer=null;navigator.vibrate?.(12);render({panel:false})},320)}if(pointers.size===2){cancelLongPress();dragTarget=null;const p=[...pointers.values()];lastDistance=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}});
canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;const old=pointers.get(e.pointerId),dx=e.clientX-old.x,dy=e.clientY-old.y;if(pressOrigin&&!moveDrag&&Math.hypot(e.clientX-pressOrigin.x,e.clientY-pressOrigin.y)>7)cancelLongPress();if(Math.hypot(dx,dy)>1)gestureMoved=true;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const model=buildProject(project);if(pointers.size===1){if(moveDrag){moveTargetBy(dx,dy,model);render({panel:false})}else if(view==='iso'){yaw+=dx*.007;pitch=Math.max(.08,Math.min(1.15,pitch-dy*.006));render({panel:false})}}else if(pointers.size===2){const p=[...pointers.values()],dist=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);if(lastDistance){zoom=Math.max(.45,Math.min(3,zoom*dist/lastDistance));render({panel:false})}lastDistance=dist}});
const pointerUp=e=>{const p=pointers.get(e.pointerId),wasMoving=moveDrag;cancelLongPress();pointers.delete(e.pointerId);if(pointers.size<2)lastDistance=0;if(!gestureMoved&&p){const r=canvas.getBoundingClientRect(),hit=findHit(e.clientX-r.left,e.clientY-r.top);if(hit?.objectId==='CT-01'){selectedObjectId='CT-01';openPanel('materials');render()}else if(hit?.moduleId){selected=hit.moduleId;selectedObjectId=(hit.kind?.startsWith('fixture-')||project.ui.detailSelection)?hit.objectId:null;openPanel('modules');render()}}moveDrag=false;dragTarget=null;if(wasMoving)render()};canvas.addEventListener('pointerup',pointerUp);canvas.addEventListener('pointercancel',e=>{cancelLongPress();pointers.delete(e.pointerId);moveDrag=false;dragTarget=null});`, 'long-press grouped selection');
await writeFile(appPath,app);

await writeFile(resolve(dist,'.nojekyll'),'');

const {createProject}=await import(pathToFileURL(resolve(dist,'src/core/project.js')).href+'?v='+Date.now());
const {buildProject}=await import(pathToFileURL(resolve(dist,'src/core/parts.js')).href+'?v='+Date.now());
const p=createProject();p.modules[0].offsetX=240;const a=buildProject(p),x1=a.objects.find(o=>o.id==='CT-01').center[0],len1=a.countertop.length;p.modules[0].offsetX=420;const b=buildProject(p),x2=b.objects.find(o=>o.id==='CT-01').center[0];if(x1!==x2||len1!==b.countertop.length)throw new Error('Regression: countertop follows a moved module');
const appBuilt=await readFile(appPath,'utf8');if(!appBuilt.includes("dragTarget='countertop'")||!appBuilt.includes('wireSelection(model'))throw new Error('Regression: grouped selection/countertop drag patch missing');
console.log('Built Kitchen CAD v4: independent countertop, grouped selection, compact mobile nav.');
