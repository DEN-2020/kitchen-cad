import { SUBSTRATES, DECORS } from '../catalog/materials.js';
const csvCell = value => '"'+String(value).replaceAll('"','""')+'"';
export function cutListCSV(parts){
  const rows=[['ID','Модуль','Деталь','Материал','Декор','Кол-во','Готовая U мм','Готовая V мм','Толщина мм','Заготовка U мм','Заготовка V мм','Кромка U-','Кромка U+','Кромка V-','Кромка V+','Волокна']];
  for(const p of parts) rows.push([p.id,p.moduleCode,p.name,SUBSTRATES[p.substrate].name,DECORS[p.decor].name,1,p.u,p.v,p.thickness,p.blankU,p.blankV,...p.edges,p.grain.toUpperCase()]);
  return '\ufeff'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
export function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function partSVG(p){
  const ratio=Math.min(330/p.u,215/p.v),w=p.u*ratio,h=p.v*ratio,x=85,y=65;
  const lines=[[x,y,x,y+h],[x+w,y,x+w,y+h],[x,y,x+w,y],[x,y+h,x+w,y+h]];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 390" role="img" aria-label="${escapeHTML(p.name)}"><rect width="520" height="390" fill="#fff"/><g font-family="Arial,sans-serif" fill="#18333d"><text x="25" y="26" font-size="16">${p.id} · ${escapeHTML(p.name)}</text><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#edf1ed" stroke="#9daba9"/>${lines.map((l,i)=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" stroke="${p.edges[i]?'#d08741':'#8b9999'}" stroke-width="${p.edges[i]?5:1}"/>`).join('')}<text x="${x+w/2}" y="${y-14}" text-anchor="middle" font-size="16">U: ${p.u} мм</text><text x="${x+w+16}" y="${y+h/2}" font-size="15">V: ${p.v}</text><text x="${x+w/2}" y="${y+h/2}" text-anchor="middle" font-size="25">${p.grain==='u'?'↔':'↕'}</text><text x="25" y="320" font-size="14">Заготовка: ${p.blankU} × ${p.blankV} × ${p.thickness} мм</text><text x="25" y="345" font-size="13">Кромка U− / U+ / V− / V+: ${p.edges.join(' / ')} мм</text><text x="25" y="370" font-size="12">Схема, не масштаб 1:1. Оранжевым — кромка.</text></g></svg>`;
}
