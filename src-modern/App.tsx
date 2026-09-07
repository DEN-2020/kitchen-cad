import { useEffect, useMemo, useState } from 'react';
import { KitchenScene } from './scene/KitchenScene';
import { addModule, deleteModule, deriveModel, duplicateModule, loadEditorProject, saveEditorProject, snapModuleAbsolute, updateCountertop, updateModule, type DimensionDetail, type Selection } from './domain/core';

const types=[['base','Нижний шкаф'],['sink','Шкаф под раковину'],['wall','Навесной шкаф'],['washer','Стиральная машина'],['dishwasher','Посудомойка'],['oven','Духовка'],['fridge','Холодильник']];
type Panel='selection'|'room'|'project'|null;

export function App(){
  const [project,setProject]=useState<any>(()=>loadEditorProject());
  const [selection,setSelection]=useState<Selection>(null);
  const [panel,setPanel]=useState<Panel>(null);
  const [focusId,setFocusId]=useState<string|null>(null);
  const [detail,setDetail]=useState<DimensionDetail>('none');
  const [addOpen,setAddOpen]=useState(false);
  const model=useMemo(()=>deriveModel(project),[project]);
  const selectedModule=selection?.kind==='module'?model.modules.find((m:any)=>m.id===selection.id):null;
  const dark=project.ui?.theme!=='light';
  useEffect(()=>saveEditorProject(project),[project]);

  const select=(s:Selection)=>{setSelection(s);if(!s){setPanel(null);setFocusId(null)}};
  const patchModule=(patch:any)=>selection?.kind==='module'&&setProject((p:any)=>updateModule(p,selection.id,patch));
  const patchRoom=(patch:any)=>setProject((p:any)=>({...p,room:{...p.room,...patch}}));
  const remove=()=>{if(selection?.kind==='module'){setProject((p:any)=>deleteModule(p,selection.id));select(null)}};
  const duplicate=()=>selection?.kind==='module'&&setProject((p:any)=>duplicateModule(p,selection.id));
  const moveModule=(id:string,x:number,z:number)=>setProject((p:any)=>snapModuleAbsolute(p,id,x,z));
  const moveCountertop=(x:number,z:number)=>setProject((p:any)=>updateCountertop(p,{offsetX:Math.round(x/50)*50,offsetZ:Math.round(z/50)*50}));

  const selectionTitle=selection?.kind==='countertop'?'Столешница':selectedModule?.type==='sink'?'Шкаф под раковину':selectedModule?'Модуль':null;
  const selectionSize=selection?.kind==='countertop'?`${project.countertop.length} × ${project.countertop.depth} × ${project.countertop.thickness} мм`:selectedModule?`${selectedModule.width} × ${selectedModule.height} × ${selectedModule.depth} мм`:'';

  return <div className={dark?'app dark':'app'}>
    <header className="topbar"><div className="brand">Kitchen CAD <span>3D</span></div><button className="iconBtn" aria-label="Тема" onClick={()=>setProject((p:any)=>({...p,ui:{...p.ui,theme:dark?'light':'dark'}}))}>◐</button></header>
    <main className="editor">
      <section className="scenePanel">
        <KitchenScene project={project} model={model} selection={selection} setSelection={select} focusId={focusId} detail={detail} onMoveModule={moveModule} onMoveCountertop={moveCountertop}/>
        <div className="viewbar"><span>3D</span><button className={detail!=='none'?'active':''} onClick={()=>setDetail(v=>v==='none'?'selected':'none')}>{detail==='none'?'+ детали':'− детали'}</button></div>
        {selection&&<div className="selectionHud"><div><b>{selectionTitle}</b><span>{selectionSize}</span></div><div className="hudActions"><button aria-label="Настройки" onClick={()=>setPanel('selection')}>⚙</button>{selection.kind==='module'&&<><button aria-label="Копировать" onClick={duplicate}>⧉</button><button aria-label="Удалить" onClick={remove}>🗑</button></>}</div></div>}
        <button className="fab" aria-label="Добавить" onClick={()=>setAddOpen(true)}>＋</button>
        {focusId&&<button className="exitFocus" onClick={()=>setFocusId(null)}>← Комната</button>}
      </section>

      <aside className={panel?'inspector open':'inspector'}>
        <div className="inspectorHead"><b>{panel==='room'?'Комната':panel==='project'?'Проект':selectionTitle||'Свойства'}</b><button onClick={()=>setPanel(null)}>×</button></div>
        {panel==='room'?<div className="inspectorBody"><section><h3>Размер комнаты</h3><div className="compactGrid"><label>Ширина<input type="number" value={project.room.width} onChange={e=>patchRoom({width:+e.target.value})}/></label><label>Длина<input type="number" value={project.room.depth} onChange={e=>patchRoom({depth:+e.target.value})}/></label><label>Высота<input type="number" value={project.room.height} onChange={e=>patchRoom({height:+e.target.value})}/></label></div></section><section><h3>Отделка</h3><div className="compactGrid"><label>Стены<input type="color" value={project.room.wallColor} onChange={e=>patchRoom({wallColor:e.target.value})}/></label><label>Пол<input type="color" value={project.room.floorColor} onChange={e=>patchRoom({floorColor:e.target.value})}/></label></div></section></div>
        :panel==='project'?<div className="inspectorBody"><section><h3>Отображение</h3><div className="segmented"><button className={detail==='none'?'active':''} onClick={()=>setDetail('none')}>Основные</button><button className={detail==='selected'?'active':''} onClick={()=>setDetail('selected')}>Выбранный</button><button className={detail==='all'?'active':''} onClick={()=>setDetail('all')}>Все детали</button></div></section><section><h3>Статус</h3><p>{project.modules.length} модулей · {model.parts.length} деталей · {model.issues.length} предупреждений.</p><p>Производственные размеры берутся из параметрического ядра; визуальные 3D-модели не меняют деталировку.</p></section></div>
        :selection?.kind==='countertop'?<div className="inspectorBody"><section><h3>Габариты столешницы</h3><div className="compactGrid"><label>Длина<input type="number" value={project.countertop.length} onChange={e=>setProject((p:any)=>updateCountertop(p,{length:+e.target.value}))}/></label><label>Глубина<input type="number" value={project.countertop.depth} onChange={e=>setProject((p:any)=>updateCountertop(p,{depth:+e.target.value}))}/></label><label>Толщина<input type="number" value={project.countertop.thickness} onChange={e=>setProject((p:any)=>updateCountertop(p,{thickness:+e.target.value}))}/></label></div></section><section><h3>Положение</h3><div className="compactGrid"><label>X<input type="number" value={project.countertop.offsetX||0} onChange={e=>setProject((p:any)=>updateCountertop(p,{offsetX:+e.target.value}))}/></label><label>Z<input type="number" value={project.countertop.offsetZ||0} onChange={e=>setProject((p:any)=>updateCountertop(p,{offsetZ:+e.target.value}))}/></label><label>Высота<input type="number" value={project.countertop.elevation||860} onChange={e=>setProject((p:any)=>updateCountertop(p,{elevation:+e.target.value}))}/></label></div></section></div>
        :selectedModule?<div className="inspectorBody"><section><h3>Габариты</h3><div className="compactGrid"><label>Ширина<input type="number" value={selectedModule.width} onChange={e=>patchModule({width:+e.target.value})}/></label><label>Высота<input type="number" value={selectedModule.height} onChange={e=>patchModule({height:+e.target.value})}/></label><label>Глубина<input type="number" value={selectedModule.depth} onChange={e=>patchModule({depth:+e.target.value})}/></label></div></section>{!['washer','dishwasher','oven','fridge'].includes(selectedModule.type)&&<><section><h3>Фасад</h3><div className="segmented">{['flat','frame','glass','slatted'].map(v=><button key={v} className={selectedModule.frontStyle===v?'active':''} onClick={()=>patchModule({frontStyle:v})}>{v==='flat'?'Плоский':v==='frame'?'Рамка':v==='glass'?'Стекло':'Рейки'}</button>)}</div></section><section><h3>Цвет фасада</h3><input className="wideColor" type="color" value={selectedModule.frontColor} onChange={e=>patchModule({frontColor:e.target.value})}/></section></>}<section><h3>Focus / Edit</h3><button className="focusBtn" onClick={()=>{setFocusId(selectedModule.id);setPanel(null)}}>Редактировать отдельно</button><p>Модуль изолируется, камера приближается, остальные объекты приглушаются.</p></section></div>
        :<div className="empty">Выбери объект на сцене.</div>}
      </aside>

      {addOpen&&<div className="modalBackdrop" onClick={()=>setAddOpen(false)}><div className="addSheet" onClick={e=>e.stopPropagation()}><div className="sheetHead"><b>Добавить</b><button onClick={()=>setAddOpen(false)}>×</button></div><div className="addGrid">{types.map(([type,name])=><button key={type} onClick={()=>{const r=addModule(project,type);setProject(r.project);setSelection({kind:'module',id:r.id});setAddOpen(false)}}><span>▦</span><b>{name}</b></button>)}</div></div></div>}
    </main>
    <nav className="bottomNav"><button className={panel==='room'?'active':''} onClick={()=>setPanel(panel==='room'?null:'room')}>Комната</button><button onClick={()=>setAddOpen(true)}>Добавить</button><button className={detail!=='none'?'active':''} onClick={()=>setDetail(v=>v==='none'?'selected':'none')}>Размеры</button><button className={panel==='project'?'active':''} onClick={()=>setPanel(panel==='project'?null:'project')}>Проект</button></nav>
  </div>
}
