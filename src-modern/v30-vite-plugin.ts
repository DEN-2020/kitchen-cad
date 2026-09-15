export function v30Plugin(){
 return {
  name:'v30-consistency-edge-material-audit',
  enforce:'pre' as const,
  transform(code:string,id:string){
   if(id.endsWith('/src-modern/App.tsx')){
    let next=code;
    next=next.replaceAll("{selection.kind==='module'&&<button", "{selectedModuleId&&<button");
    const edgeLine="<small>{lang==='ru'?'Кромка':lang==='ar'?'حواف':'Edge'}: <b>{Math.round(cost.edge.cost).toLocaleString()} EGP</b></small>";
    const edgeBreakdown="<small>{lang==='ru'?'Кромка корпуса':lang==='ar'?'حواف الهيكل':'Body edge'}: <b>{cost.edge.body.meters.toFixed(1)} m · {Math.round(cost.edge.body.cost).toLocaleString()} EGP</b></small><small>{lang==='ru'?'Кромка фасадов':lang==='ar'?'حواف الواجهات':'Front edge'}: <b>{cost.edge.front.meters.toFixed(1)} m · {Math.round(cost.edge.front.cost).toLocaleString()} EGP</b></small><small>{lang==='ru'?'Кромка 0.8 / 2 мм':lang==='ar'?'حواف 0.8 / 2 مم':'Edge 0.8 / 2 mm'}: <b>{cost.edge.meters08.toFixed(1)} / {cost.edge.meters2.toFixed(1)} m</b></small>";
    if(next.includes(edgeLine))next=next.replace(edgeLine,edgeBreakdown);
    else next=next.replace(/<small>\{lang==='ru'\?'Кромка'[\s\S]*?cost\.edge\.cost[\s\S]*?<\/small>/,edgeBreakdown);
    next=next.replace(/Kitchen CAD <span>v[^<]+<\/span>/,'Kitchen CAD <span>v3.0</span>');
    if(!next.includes('cost.edge.body.meters')||!next.includes("selectedModuleId&&<button aria-label={t('remove')}"))throw new Error('v30 App consistency transform did not apply');
    return next;
   }
   return null;
  }
 };
}
