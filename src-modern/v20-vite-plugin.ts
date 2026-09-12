export function v20Plugin(){
 return {
  name:'v20-print-audit',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/App.tsx')){
    return code.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v2.0</span>');
   }
   if(id.endsWith('/src-modern/export/report.ts')){
    let next=code;
    next=next.replace(
      /function cutCard\(project:any,p:any\)\{[\s\S]*?\nfunction cutCardsSheets\(project:any,module:any,parts:any\[\]\)\{[\s\S]*?return pages\.join\('\'\)\}/,
      `function edgeSide(project:any,p:any,index:number,side:string,axis:string){const value=(p.edges||[0,0,0,0])[index]||0;return {on:value>0,text:\`${'${side} (${axis}): ${edgeLabel(project,value,p.edgeType)}'}\`}}
function cutCard(project:any,p:any,index:number,total:number){const e=p.edges||[0,0,0,0],dir=isAr(project)?'rtl':'ltr',sides=[edgeSide(project,p,0,'L','U−'),edgeSide(project,p,1,'R','U+'),edgeSide(project,p,2,'T','V−'),edgeSide(project,p,3,'B','V+')];return \`<article class="cutCard" dir="${'${dir}'}"><div class="cutHead"><b>${'${esc(p.id)}'} · ${'${esc(p.name)}'}</b><span>${'${L(project,"Деталь","Part","قطعة")}'} ${'${index+1}'} / ${'${total}'}</span></div><div class="cutSize">${'${p.u}'} × ${'${p.v}'} × ${'${p.thickness}'} mm</div><div class="partDiagram"><span class="edge top ${'${sides[2].on?"edgeOn":"edgeOff"}'}">${'${esc(sides[2].text)}'}</span><span class="edge right ${'${sides[1].on?"edgeOn":"edgeOff"}'}">${'${esc(sides[1].text)}'}</span><span class="edge bottom ${'${sides[3].on?"edgeOn":"edgeOff"}'}">${'${esc(sides[3].text)}'}</span><span class="edge left ${'${sides[0].on?"edgeOn":"edgeOff"}'}">${'${esc(sides[0].text)}'}</span><div class="panelRect"><strong>${'${p.u}'} × ${'${p.v}'}</strong><small>${'${p.thickness}'} mm</small></div></div><div class="cutMeta"><span>${'${L(project,"Материал","Material","الخامة")}'}: <b>${'${esc(substrateLabel(project,p.substrate))}'}</b></span><span>${'${L(project,"Декор","Decor","اللون/الديكور")}'}: <b>${'${esc(p.decor)}'}</b></span><span>${'${L(project,"Заготовка","Blank","مقاس قبل الحافة")}'}: <b>${'${p.blankU}'} × ${'${p.blankV}'} × ${'${p.thickness}'} mm</b></span><span>${'${L(project,"Количество","Qty","الكمية")}'}: <b>1</b></span></div></article>\`}
function cutCardsSheets(project:any,module:any,parts:any[]){const pages=[];for(let i=0;i<parts.length;i+=4){const chunk=parts.slice(i,i+4),title=\`${'${moduleName(module.type,isEn(project))}'} — ${'${L(project,"Карты деталей для напила","Cut cards","بطاقات القص")}'}\`,meta=\`${'${L(project,"Габарит модуля","Module size","مقاس الوحدة")}'}: <b>${'${module.width}'} × ${'${module.height}'} × ${'${module.depth}'} mm</b> · ${'${L(project,"Всего деталей","Total parts","إجمالي القطع")}'}: <b>${'${parts.length}'}</b>\`;pages.push(page(title,meta,\`<div class="cutCards">${'${chunk.map((p:any,j:number)=>cutCard(project,p,i+j,parts.length)).join("")}'} </div>\`,'cutCardsPage'))}return pages.join('')}`
    );
    next=next.replace(
      '.edge{position:absolute;font-size:7px;font-weight:700;color:#5a3fc0;background:#fff;padding:1px 3px}',
      '.edge{position:absolute;font-size:7px;font-weight:700;background:#fff;padding:1px 3px}.edgeOn{color:#5a3fc0;border:1px solid #8f7cf0;border-radius:3px}.edgeOff{color:#859197}.cutSize{font-size:9px;font-weight:800;margin-top:1mm}'
    );
    if(!next.includes('function edgeSide')||!next.includes('Total parts'))throw new Error('v20 print audit transform did not apply');
    return next;
   }
   return null;
  }
 };
}
