import { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Grid, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const demoModules = [
  { id:'base-1', name:'Нижний шкаф', size:[0.6,0.86,0.56] as const, position:[-0.55,0.43,0] as const, color:'#d9d5ca' },
  { id:'sink-1', name:'Шкаф под раковину', size:[0.5,0.86,0.56] as const, position:[0,0.43,0] as const, color:'#88977f' },
  { id:'washer-1', name:'Стиральная машина', size:[0.6,0.85,0.60] as const, position:[0.55,0.425,0] as const, color:'#cfd5d7' },
];

function ModuleBox({item, selected, onSelect}:{item:(typeof demoModules)[number];selected:boolean;onSelect:()=>void}){
  return <mesh position={item.position} onPointerDown={e=>{e.stopPropagation();onSelect()}} castShadow receiveShadow>
    <boxGeometry args={item.size} />
    <meshStandardMaterial color={item.color} roughness={0.56} metalness={item.id.includes('washer')?0.18:0.02} />
    {selected && <lineSegments>
      <edgesGeometry args={[new THREE.BoxGeometry(...item.size)]} />
      <lineBasicMaterial color="#7c5cff" />
    </lineSegments>}
  </mesh>
}

function Scene({selectedId,setSelectedId}:{selectedId:string|null;setSelectedId:(id:string|null)=>void}){
  return <>
    <color attach="background" args={['#141a1f']} />
    <ambientLight intensity={1.2} />
    <directionalLight position={[3,5,4]} intensity={2.4} castShadow />
    <group onPointerMissed={()=>setSelectedId(null)}>
      {demoModules.map(item=><ModuleBox key={item.id} item={item} selected={selectedId===item.id} onSelect={()=>setSelectedId(item.id)} />)}
      <mesh position={[0,0.88,0]} castShadow receiveShadow>
        <boxGeometry args={[1.7,0.035,0.62]} />
        <meshStandardMaterial color="#d6d1c8" roughness={0.28} />
      </mesh>
    </group>
    <Grid args={[6,6]} cellSize={0.1} sectionSize={0.5} fadeDistance={8} infiniteGrid position={[0,0,0]} />
    <OrbitControls makeDefault enableDamping minDistance={1.4} maxDistance={7} target={[0,0.7,0]} />
    <Environment preset="apartment" />
  </>
}

export function App(){
  const [selectedId,setSelectedId]=useState<string|null>('sink-1');
  const [inspectorOpen,setInspectorOpen]=useState(false);
  const [dark,setDark]=useState(true);
  const selected=useMemo(()=>demoModules.find(m=>m.id===selectedId)??null,[selectedId]);

  return <div className={dark?'app dark':'app'}>
    <header className="topbar">
      <button className="iconBtn">☰</button>
      <div className="brand">Kitchen CAD <span>Next</span></div>
      <button className="iconBtn" onClick={()=>setDark(v=>!v)}>◐</button>
    </header>

    <main className="editor">
      <section className="scenePanel">
        <Canvas shadows camera={{position:[2.6,2.2,3.2],fov:42}} onPointerMissed={()=>setSelectedId(null)}>
          <Scene selectedId={selectedId} setSelectedId={setSelectedId} />
        </Canvas>
        <div className="viewbar"><button>3D</button><button>Спереди</button><button>Сверху</button></div>
        {selected && <div className="selectionHud">
          <div><b>{selected.name}</b><span>{Math.round(selected.size[0]*1000)} × {Math.round(selected.size[1]*1000)} × {Math.round(selected.size[2]*1000)} мм</span></div>
          <div className="hudActions"><button onClick={()=>setInspectorOpen(true)}>⚙</button><button>⧉</button><button>🗑</button></div>
        </div>}
        <button className="fab">＋</button>
      </section>

      <aside className={inspectorOpen?'inspector open':'inspector'}>
        <div className="inspectorHead"><b>{selected?.name ?? 'Настройки'}</b><button onClick={()=>setInspectorOpen(false)}>×</button></div>
        {selected ? <div className="inspectorBody">
          <section><h3>Габариты</h3><div className="compactGrid"><label>Ширина<input defaultValue={Math.round(selected.size[0]*1000)} /></label><label>Высота<input defaultValue={Math.round(selected.size[1]*1000)} /></label><label>Глубина<input defaultValue={Math.round(selected.size[2]*1000)} /></label></div></section>
          <section><h3>Фасад</h3><div className="segmented"><button className="active">Плоский</button><button>Рамочный</button><button>Стекло</button></div></section>
          <section><h3>Редактирование</h3><button className="focusBtn">Открыть модуль отдельно</button><p>В следующем шаге здесь будет Focus/Edit: изоляция модуля, отдельные детали, полки, фасады и фурнитура.</p></section>
        </div> : <div className="empty">Выбери модуль на сцене.</div>}
      </aside>
    </main>

    <nav className="bottomNav"><button>Комната</button><button className="active">Модули</button><button>Материалы</button><button>Проект</button></nav>
  </div>
}
