import {CAR_SPECS} from '../cars/carSpecs.js';
import {bindMasteryHoldRepeat} from './masteryHoldRepeat.js';
import {masteryWheelDataUri} from '../stats/carMastery.js';
import official from '../stats/masteryRoofCalibration.json' with {type:'json'};
import {
  paintedCarBounds,lobbyMasteryPlacement,raceMasteryPlacement,
  normalizedMasteryCalibration
} from '../stats/masteryBadgePlacement.js';
import {
  nudgeMasteryCalibration,mergeMasteryCalibration,CALIBRATION_EXPORT_FILENAME
} from '../stats/masteryRoofCalibrationTools.js';

const BASE=import.meta.env.BASE_URL||'/';
const STORAGE_KEY='tdr2:adminMasteryRoofDraft:1';
const LEGACY_CAR_IDS=new Set(['stock','touring','power']);
const ids=Object.keys(CAR_SPECS).filter(id=>!LEGACY_CAR_IDS.has(id)).sort((a,b)=>
  (Number(CAR_SPECS[a]?.collectionNo)||0)-(Number(CAR_SPECS[b]?.collectionNo)||0));
function readDraft(){
  try{
    const data=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    if(data?.schema_version!==1||!data?.cars||typeof data.cars!=='object')return {};
    return Object.fromEntries(Object.entries(data.cars).filter(([id])=>ids.includes(id))
      .map(([id,row])=>[id,{
        lobby:normalizedMasteryCalibration(row?.lobby),
        race:normalizedMasteryCalibration(row?.race)
      }]));
  }catch{return {};}
}
function saveDraft(cars){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify({schema_version:1,cars}));return true;}
  catch{return false;}
}
function styleButton(btn,{active=false,accent='#4edfff'}={}){
  btn.style.cssText='min-height:34px;min-width:32px;border:1px solid '+(active?'#d9ad4b':accent)+
    ';background:linear-gradient(180deg,#172b3c,#071522);color:#edfcff;font:850 11px system-ui;'+
    'letter-spacing:.025em;padding:5px 8px;cursor:pointer;touch-action:manipulation;'+
    '-webkit-tap-highlight-color:transparent;border-radius:8px;'+
    (active?'box-shadow:inset 0 0 15px rgba(255,212,112,.2);':'');
}
export function showAdminMasteryRoofCalibration(adminRoot,{initialCarId=null,onClose=null}={}){
  if(!adminRoot)return null;
  adminRoot.querySelector('[data-mastery-roof-editor]')?.remove();
  const draft=readDraft();
  let carId=ids.includes(initialCarId)?initialCarId:ids[0],view='lobby',level=1,shortAxis=0,previewReady=false;
  let blobUrl=null;
  const previewVisible={lobby:true,race:true};
  const root=document.createElement('section');
  root.dataset.masteryRoofEditor='1';
  root.setAttribute('aria-label','Calibración global de maestrías');
  root.style.cssText='position:absolute;inset:0;z-index:30000;box-sizing:border-box;overflow:auto;'+
    '-webkit-overflow-scrolling:touch;background:radial-gradient(circle at 50% 0%,#162c3a,#06101b 75%);'+
    'color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;'+
    'padding:clamp(6px,1.1vh,12px);pointer-events:auto;touch-action:pan-y;display:flex;flex-direction:column;min-height:0;';
  root.classList.add('tdr-admin-mastery-editor');
  root.innerHTML=`
    <style>
      .tdr-admin-mastery-editor { --mc-stroke:rgba(111,226,248,.28); }
      .tdr-admin-mastery-editor * {box-sizing:border-box;}
      /* iPhone Safari: no text loupe, selection handles or long-press callout. */
      .tdr-admin-mastery-editor,
      .tdr-admin-mastery-editor *:not(select):not(option){
        -webkit-user-select:none!important;user-select:none!important;
        -webkit-touch-callout:none!important;
      }
      .tdr-admin-mastery-editor [data-nudge]{
        touch-action:none!important;-webkit-user-select:none!important;
        user-select:none!important;-webkit-touch-callout:none!important;
        -webkit-tap-highlight-color:transparent;
      }
      .tdr-admin-mastery-editor [data-nudge].is-holding{
        border-color:#ffe08a!important;background:linear-gradient(180deg,#31515b,#132b40)!important;
      }
      .tdr-admin-mastery-editor [data-stage] img{
        -webkit-user-drag:none;user-select:none;-webkit-user-select:none;
      }
      .tdr-admin-mastery-editor button {flex-shrink:0;}
      .tdr-admin-mastery-editor button:active {filter:brightness(1.23);}
      .tdr-admin-mastery-editor button:focus-visible {outline:2px solid #ffe082;outline-offset:2px;}
      .tdr-admin-mastery-editor [data-status]{display:block;font-size:10px;line-height:1.25;}
      .tdr-admin-mastery-editor .mcal-toolbar {flex:0 0 auto;min-height:0;}
      .tdr-admin-mastery-editor .mcal-filters {flex:0 0 auto;min-width:0;}
      .tdr-admin-mastery-editor .mcal-filters label{white-space:nowrap;}
      .tdr-admin-mastery-editor .mcal-filters select{font-size:12px;max-width:28vw;}
      .tdr-admin-mastery-editor .mcal-columns{
        flex:1 1 auto;min-height:0;min-width:0;overflow:hidden;
        grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);
        align-items:stretch;
      }
      .tdr-admin-mastery-editor .mcal-columns>div {
        border:1px solid var(--mc-stroke);border-radius:17px;
        background:linear-gradient(155deg,rgba(12,42,57,.7),rgba(5,17,28,.64));
        box-shadow:inset 0 1px rgba(226,250,255,.09);
        padding:clamp(6px,1.1vw,12px);
      }
      .tdr-admin-mastery-editor .mcal-preview{display:flex;flex-direction:column;min-height:0;min-width:0;overflow:hidden;}
      .tdr-admin-mastery-editor [data-stage]{
        flex:1 1 auto;height:auto!important;min-height:100px;min-width:0;
      }
      .tdr-admin-mastery-editor .mcal-preview p{margin:5px 0 0;font-size:10px;line-height:1.3;}
      .tdr-admin-mastery-editor .mcal-controls{
        display:grid;min-height:0;min-width:0;overflow:auto;
        grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(6px,1vw,12px);
        align-content:start;-webkit-overflow-scrolling:touch;
      }
      .tdr-admin-mastery-editor .mcal-motion,.tdr-admin-mastery-editor .mcal-settings{min-width:0;display:flex;flex-direction:column;gap:clamp(5px,.8vh,9px);}
      .tdr-admin-mastery-editor .mcal-pad{
        display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;width:100%;max-width:260px;
      }
      .tdr-admin-mastery-editor .mcal-pad button{min-width:0;min-height:36px;padding:4px;}
      .tdr-admin-mastery-editor .mcal-inline{display:flex;align-items:center;justify-content:space-between;gap:5px;}
      .tdr-admin-mastery-editor .mcal-inline strong{font-size:11px;white-space:nowrap;text-align:center;}
      .tdr-admin-mastery-editor .mcal-inline button{min-width:0;min-height:34px;padding:4px 7px;}
      .tdr-admin-mastery-editor .mcal-pair{display:flex;gap:5px;flex-wrap:wrap;}
      .tdr-admin-mastery-editor .mcal-pair button{flex:1 1 auto;white-space:normal;font-size:10px;}
      .tdr-admin-mastery-editor .mcal-divider{height:1px;background:rgba(119,218,233,.20);}
      .tdr-admin-mastery-editor .mcal-export{color:#ffe1a1;font-weight:900;font-size:11px;}
      .tdr-admin-mastery-editor .mcal-hint{color:#9bbbc8;font-size:10px;line-height:1.3;}
      @media (max-height:560px) and (orientation:landscape){
        .tdr-admin-mastery-editor .mcal-toolbar{margin-bottom:3px!important;}
        .tdr-admin-mastery-editor .mcal-filters{padding:2px 0 5px!important;}
        .tdr-admin-mastery-editor .mcal-controls{gap:5px;}
        .tdr-admin-mastery-editor .mcal-motion,.tdr-admin-mastery-editor .mcal-settings{gap:4px;}
        .tdr-admin-mastery-editor .mcal-pad button{min-height:31px;}
        .tdr-admin-mastery-editor .mcal-inline button{min-height:31px;}
        .tdr-admin-mastery-editor .mcal-preview p,.tdr-admin-mastery-editor .mcal-hint{display:none;}
        .tdr-admin-mastery-editor [data-readout]{line-height:1.25!important;}
      }
      @media (max-width:700px) and (orientation:portrait){
        .tdr-admin-mastery-editor{overflow:auto!important;}
        .tdr-admin-mastery-editor .mcal-columns{flex:none;overflow:visible;grid-template-columns:minmax(0,1fr);}
        .tdr-admin-mastery-editor [data-stage]{flex:none;height:32vh!important;min-height:185px;}
        .tdr-admin-mastery-editor .mcal-controls{overflow:visible;}
      }
    </style>
    <div class="mcal-toolbar" style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px">
      <div><strong style="font-size:clamp(14px,2.6vh,21px)">CALIBRAR MAESTRÍAS</strong>
      <div style="font-size:10px;color:#97b3c8">GLOBAL · MOVIMIENTO 1 PX · TAMAÑO 1 PX</div></div>
      <button type="button" data-action="close">CERRAR ✕</button>
    </div>
    <div class="mcal-filters" style="display:flex;align-items:center;flex-wrap:wrap;gap:7px;padding:3px 0 7px">
      <label style="font-size:11px;color:#b1c9d6;font-weight:800">COCHE
        <select data-car aria-label="Elegir coche" style="display:block;min-width:155px;max-width:32vw;background:#102333;border:1px solid #55ddff;border-radius:8px;padding:9px;color:#fff;font:800 12px system-ui"></select>
      </label>
      <label style="font-size:11px;color:#b1c9d6;font-weight:800">INSIGNIA
        <select data-level aria-label="Nivel de insignia" style="display:block;background:#102333;border:1px solid #55ddff;border-radius:8px;padding:9px;color:#fff;font:800 12px system-ui"></select>
      </label>
      <button type="button" data-view="lobby">LOBBY</button>
      <button type="button" data-view="race">CARRERA</button>
      <label style="display:flex;align-items:center;gap:6px;font-size:11px;color:#b1cad7;font-weight:800"><input type="checkbox" data-preview-visible checked aria-label="Mostrar insignia en la previsualización"> MOSTRAR INSIGNIA</label>
    </div>
    <div class="mcal-columns" style="display:grid;gap:clamp(7px,1vw,14px)">
      <div class="mcal-preview">
        <div data-stage style="position:relative;width:100%;height:clamp(180px,50vh,420px);border:1px solid #346074;border-radius:13px;background:radial-gradient(ellipse at center,rgba(46,93,111,.32),rgba(8,18,29,.98) 75%);overflow:hidden">
          <img data-car-image alt="Vista cenital del coche" draggable="false" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);height:94%;max-width:58%;width:auto;object-fit:contain;filter:drop-shadow(0 7px 10px #000c)">
          <img data-badge alt="Insignia de maestría" draggable="false" style="position:absolute;width:42px;height:42px;transform:translate(-50%,-50%);pointer-events:none;filter:drop-shadow(0 2px 2px #000);object-fit:contain">
          <span data-wait style="position:absolute;bottom:8px;left:10px;color:#9cb5c3;font-size:10px">Cargando vista previa…</span>
        </div>
        <p style="color:#90adbd;font-size:10px;line-height:1.5;margin:7px 0">El ajuste se calcula sobre la imagen real del coche. La vista de carrera es proporcional al sprite y utiliza su propia calibración.</p>
      </div>
      <div class="mcal-controls">
        <div class="mcal-motion">
          <strong data-view-title style="font-size:clamp(12px,1.8vh,16px);color:#76ebff">LOBBY · POSICIÓN</strong>
          <div data-readout style="color:#d1e8f2;font:800 11px system-ui;line-height:1.45">X 0 px · Y 0 px</div>
          <div class="mcal-pad">
            <span></span><button type="button" data-nudge="up" aria-label="Subir 1 píxel">▲ 1</button><span></span>
            <button type="button" data-nudge="left" aria-label="Izquierda 1 píxel">◀ 1</button>
            <button type="button" data-reset-center aria-label="Centrar y restaurar desplazamiento">⌖</button>
            <button type="button" data-nudge="right" aria-label="Derecha 1 píxel">1 ▶</button>
            <span></span><button type="button" data-nudge="down" aria-label="Bajar 1 píxel">▼ 1</button><span></span>
          </div>
          <small class="mcal-hint">Toca para mover 1 px · Mantén pulsado para desplazar continuamente.</small>
        </div>
        <div class="mcal-settings">
          <div class="mcal-inline">
            <button type="button" data-nudge="shrink" aria-label="Reducir insignia un píxel">− 1</button>
            <strong data-size-label>ESCUDO</strong>
            <button type="button" data-nudge="grow" aria-label="Aumentar insignia un píxel">+ 1</button>
          </div>
          <div class="mcal-inline">
            <button type="button" data-rotate="-90" aria-label="Rotar 90 grados a la izquierda">↶ 90°</button>
            <strong data-angle>0°</strong>
            <button type="button" data-rotate="90" aria-label="Rotar 90 grados a la derecha">90° ↷</button>
          </div>
          <div class="mcal-pair">
            <button type="button" data-reset-view>REINICIAR VISTA</button>
            <button type="button" data-reset-car>REINICIAR COCHE</button>
          </div>
          <div class="mcal-divider"></div>
          <div class="mcal-export">EXPORTACIÓN · TODA LA FLOTA</div>
          <div class="mcal-pair">
            <button type="button" data-export>EXPORTAR MAESTRÍAS JSON</button>
            <button type="button" data-copy>COPIAR JSON</button>
          </div>
          <small data-count class="mcal-hint">0 coches calibrados en este dispositivo.</small>
          <small data-status role="status" aria-live="polite" style="color:#79eebb;min-height:14px"></small>
        </div>
      </div>
    </div>`;
  const $=selector=>root.querySelector(selector);
  for(const b of root.querySelectorAll('button'))styleButton(b);
  for(const id of ids){const opt=document.createElement('option');opt.value=id;opt.textContent=CAR_SPECS[id]?.name||id;$('[data-car]').appendChild(opt);}
  for(let i=1;i<=9;i++){const opt=document.createElement('option');opt.value=String(i);opt.textContent='NIVEL '+i;$('[data-level]').appendChild(opt);}
  const carSelect=$('[data-car]'),levelSelect=$('[data-level]');
  carSelect.value=carId;levelSelect.value=String(level);
  const carImage=$('[data-car-image]'),badge=$('[data-badge]'),stage=$('[data-stage]');
  const getEntry=()=>draft[carId]||official?.cars?.[carId]||{};
  const viewRow=()=>normalizedMasteryCalibration(getEntry()[view]);
  const status=s=>{$('[data-status]').textContent=s;};
  const updateCount=()=>{$('[data-count]').textContent=`${Object.keys(draft).length} coches con ajustes provisionales · se exportan juntos en un JSON.`;};
  function preview(){
    if(!root.isConnected)return;
    const rect=carImage.getBoundingClientRect();
    const bounds=paintedCarBounds(rect,carImage.naturalWidth,carImage.naturalHeight);
    if(!bounds){previewReady=false;$('[data-wait]').textContent='Esperando imagen del coche';return;}
    shortAxis=Math.min(bounds.width,bounds.height);
    if(shortAxis<1){previewReady=false;return;}
    previewReady=true;
    const row=viewRow();
    badge.style.display=previewVisible[view]?'block':'none';
    let x,y,size;
    if(view==='lobby'){
      const p=lobbyMasteryPlacement(rect,carImage.naturalWidth,carImage.naturalHeight,carId,row);
      x=p.x;y=p.y;size=p.size;
    }else{
      // 46x96 local car-unit reference is scaled to actual preview image width.
      // Production race uses the SAME ratio corrections on the live car rig.
      const referenceWidth=46;
      const scale=shortAxis/referenceWidth;
      const p=raceMasteryPlacement(referenceWidth,96,carId,row);
      x=bounds.left+bounds.width*.5+p.x*scale;
      y=bounds.top+bounds.height*.5+p.y*scale;
      size=p.radius*2*scale;
    }
    const stageRect=stage.getBoundingClientRect();
    badge.style.left=(x-stageRect.left)+'px';
    badge.style.top=(y-stageRect.top)+'px';
    badge.style.width=size+'px';badge.style.height=size+'px';
    badge.style.transform='translate(-50%,-50%) rotate('+row.rotation+'deg)';
    $('[data-angle]').textContent='GIRO '+row.rotation+'°';
    $('[data-readout]').textContent='X '+(row.x*shortAxis).toFixed(1)+' px · Y '+(row.y*shortAxis).toFixed(1)+' px';
    $('[data-size-label]').textContent='ESCUDO '+size.toFixed(1)+' px';
    $('[data-wait]').textContent=view==='race'?'CARRERA · VISTA PROPORCIONAL':'LOBBY · PREVISUALIZACIÓN';
  }
  function activateTab(){
    for(const btn of root.querySelectorAll('[data-view]'))styleButton(btn,{active:btn.dataset.view===view});
    $('[data-view-title]').textContent=(view==='lobby'?'LOBBY':'CARRERA')+' · POSICIÓN';
    $('[data-preview-visible]').checked=previewVisible[view];
    preview();
  }
  function loadImage(){
    previewReady=false;shortAxis=0;
    badge.src=masteryWheelDataUri(level,{size:160,blackBackground:false});
    carImage.src=BASE+'assets/cars/lobby/'+encodeURIComponent(carId)+'.webp?v='+
      encodeURIComponent(CAR_SPECS[carId]?.collectionNo||1);
    if(carImage.complete&&carImage.naturalWidth>0)requestAnimationFrame(preview);
  }
  function persist(){
    saveDraft(draft);
    updateCount();
    status('BORRADOR LOCAL GUARDADO · Falta exportar para publicar.');
    preview();
  }
  function edit(fn){
    if(!previewReady||shortAxis<=0){status('Espera a que se cargue el coche.');return;}
    const previous=getEntry();
    const current={lobby:normalizedMasteryCalibration(previous.lobby),race:normalizedMasteryCalibration(previous.race)};
    current[view]=fn(current[view]);
    draft[carId]=current;
    persist();
  }
  $('[data-preview-visible]').onchange=event=>{previewVisible[view]=!!event.target.checked;preview();};
  const cancelAllHolds=()=>{for(const hold of holdControls)hold.cancel();};
  carSelect.onchange=()=>{cancelAllHolds();carId=carSelect.value;loadImage();status('');};
  levelSelect.onchange=()=>{level=Number(levelSelect.value)||1;badge.src=masteryWheelDataUri(level,{size:160,blackBackground:false});};
  carImage.onload=()=>requestAnimationFrame(preview);
  carImage.onerror=()=>{previewReady=false;$('[data-wait]').textContent='Error cargando la imagen';status('No se ha podido abrir el coche.');};
  for(const tab of root.querySelectorAll('[data-view]'))
    tab.onclick=()=>{cancelAllHolds();view=tab.dataset.view;activateTab();};
  const increments={up:['y',-1],down:['y',1],left:['x',-1],right:['x',1],
    shrink:['size',-1],grow:['size',1]};
  const holdControls=[];
  for(const btn of root.querySelectorAll('[data-nudge]')){
    const [axis,px]=increments[btn.dataset.nudge];
    holdControls.push(bindMasteryHoldRepeat(btn,()=>edit(row=>
      nudgeMasteryCalibration(row,axis,px,shortAxis))));
  }
  for(const button of root.querySelectorAll('[data-rotate]'))
    button.onclick=()=>edit(row=>({...row,rotation:(row.rotation+Number(button.dataset.rotate)+360)%360}));
  $('[data-reset-center]').onclick=()=>edit(row=>({...row,x:0,y:0}));
  $('[data-reset-view]').onclick=()=>edit(()=>({x:0,y:0,size:0,rotation:0}));
  $('[data-reset-car]').onclick=()=>{
    draft[carId]={lobby:{x:0,y:0,size:0,rotation:0},race:{x:0,y:0,size:0,rotation:0}};persist();
  };
  const payload=()=>mergeMasteryCalibration(official,draft,ids);
  const json=()=>JSON.stringify(payload(),null,2)+'\n';
  $('[data-export]').onclick=()=>{
    const text=json();
    const blob=new Blob([text],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=CALIBRATION_EXPORT_FILENAME;
    root.appendChild(a);a.click();a.remove();
    if(blobUrl)URL.revokeObjectURL(blobUrl);
    blobUrl=url;
    status('JSON EXPORTADO · Envíalo al chat para publicarlo en el repositorio.');
  };
  $('[data-copy]').onclick=async()=>{
    const data=json();
    try{await navigator.clipboard.writeText(data);status('JSON COPIADO AL PORTAPAPELES');}
    catch{status('No se pudo copiar: utiliza EXPORTAR JSON.');}
  };
  function close(){
    for(const hold of holdControls)hold.dispose();
    observer?.disconnect();
    if(blobUrl)URL.revokeObjectURL(blobUrl);
    root.remove();
    onClose?.();
  }
  $('[data-action="close"]').onclick=close;
  const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>requestAnimationFrame(()=>{if(root.isConnected)preview();})):null;
  observer?.observe(stage);
  adminRoot.appendChild(root);
  loadImage();activateTab();updateCount();
  return {close,root};
}
