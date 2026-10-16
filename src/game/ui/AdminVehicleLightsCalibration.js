import {CAR_SPECS} from '../cars/carSpecs.js';
import {availableCarSkins} from '../skins/carSkins.js';
import {bindMasteryHoldRepeat} from './masteryHoldRepeat.js';
import {
 defaultVehicleLights,normalizeVehicleLights,vehicleLightsForCar,lightCoordinates,
 mergeVehicleLights,VEHICLE_LIGHTS_EXPORT
} from '../skins/vehicleLightsCalibration.js';
import official from '../skins/vehicleLights.json' with {type:'json'};

const KEY='tdr2:adminVehicleLightsDraft:v1';
const BASE=import.meta.env.BASE_URL||'/';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function readDraft(){try{const value=JSON.parse(localStorage.getItem(KEY)||'{}');return value&&typeof value==='object'?value:{};}catch{return{};}}
function downloadJson(json){
 const blob=new Blob([JSON.stringify(json,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');
 link.href=url;link.download=VEHICLE_LIGHTS_EXPORT;link.click();
 setTimeout(()=>URL.revokeObjectURL(url),5000);
}

export function showAdminVehicleLightsCalibration(host,{initialCarId='crown_cuper',onClose=()=>{}}={}){
 if(!host)return null;
 host.querySelector('[data-vehicle-lights-editor]')?.remove();
 const ids=Object.keys(CAR_SPECS).filter(id=>!['stock','touring','power'].includes(id));
 const draft=readDraft();
 let carId=ids.includes(initialCarId)?initialCarId:ids[0],skinId='original';
 let group='rear',side='left',braking=false,w=0,h=0,ready=false,drag=null,closed=false;
 const root=document.createElement('section');
 root.dataset.vehicleLightsEditor='1';
 root.setAttribute('aria-label','Editor de faros delanteros y luces de freno');
 root.style.cssText='position:absolute;inset:0;z-index:91000;box-sizing:border-box;background:linear-gradient(155deg,#06131e,#102e3d);color:#f0fbff;font:750 12px system-ui;display:flex;flex-direction:column;gap:7px;padding:clamp(7px,1.5vh,14px);overflow:auto;touch-action:pan-y;-webkit-user-select:none;user-select:none';
 root.innerHTML=`
 <style>
 .tdr-lightcal *{box-sizing:border-box}
 .tdr-lightcal button,.tdr-lightcal select,.tdr-lightcal input{font:800 11px system-ui}
 .tdr-lightcal button,.tdr-lightcal select{background:#102b3d;color:#fff;border:1px solid #68cbe4;border-radius:9px;padding:6px 9px;min-height:33px;touch-action:manipulation}
 .tdr-lightcal button:focus-visible{outline:2px solid #ffd982;outline-offset:2px}
 .tdr-lightcal label{display:inline-flex;gap:5px;align-items:center;color:#bce0ec;white-space:nowrap}
 .tdr-lightcal .lc-head,.tdr-lightcal .lc-menu,.tdr-lightcal .lc-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
 .tdr-lightcal .lc-head{justify-content:space-between}
 .tdr-lightcal .lc-cols{display:grid;grid-template-columns:minmax(0,1.12fr) minmax(0,1fr);gap:10px;flex:1;min-height:0}
 .tdr-lightcal .lc-stage{position:relative;min-height:170px;border-radius:14px;border:1px solid #447d96;background:radial-gradient(ellipse,#183e50,#06141f);overflow:hidden;touch-action:none}
 .tdr-lightcal .lc-stage img{position:absolute;left:50%;top:50%;pointer-events:none;transform:translate(-50%,-50%);-webkit-user-drag:none}
 .tdr-lightcal .lc-stage svg{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);overflow:visible;touch-action:none}
 .tdr-lightcal .lc-panel{border:1px solid rgba(114,208,230,.3);border-radius:13px;padding:9px;display:flex;flex-direction:column;gap:8px;min-height:0;overflow-y:auto}
 .tdr-lightcal .lc-pad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:290px;gap:5px}
 .tdr-lightcal [data-nudge]{touch-action:none!important}
 .tdr-lightcal .lc-split{display:grid;grid-template-columns:1fr 1fr;gap:7px}
 .tdr-lightcal .lc-meter{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between}
 .tdr-lightcal .lc-meter input[type=range]{flex:1;max-width:180px;accent-color:#e6bb65}
 .tdr-lightcal .lc-hint{font-size:10px;line-height:1.35;color:#9bbdcc}
 .tdr-lightcal .lc-count{color:#ffe09b;font-variant-numeric:tabular-nums}
 .tdr-lightcal .lc-stage-note{position:absolute;bottom:6px;left:8px;font-size:10px;color:#9ed1df;pointer-events:none}
 .tdr-lightcal [data-select-light]{cursor:grab;touch-action:none}
 @media(max-width:700px) and (orientation:portrait){.tdr-lightcal .lc-cols{grid-template-columns:1fr;flex:none}.tdr-lightcal .lc-stage{height:35vh}}
 @media(max-height:440px){.tdr-lightcal .lc-pad button{min-height:29px}.tdr-lightcal .lc-panel{padding:6px;gap:5px}.tdr-lightcal .lc-stage{min-height:145px}}
 </style>
 <div class="lc-head"><div><strong style="font-size:clamp(15px,3vh,23px)">💡 LUCES / ÓPTICAS</strong><div class="lc-hint">AJUSTES POR COCHE Y SKIN · 1 PX POR TOQUE</div></div><button type="button" data-close>CERRAR ×</button></div>
 <div class="lc-menu"><label>COCHE <select data-car></select></label><label>SKIN <select data-skin></select></label><label><input data-braking type="checkbox"> SIMULAR FRENADA</label></div>
 <div class="lc-cols"><div class="lc-stage"><img data-image draggable="false" alt="Vista cenital del coche"><svg data-overlay aria-label="Ópticas ajustables"></svg><div class="lc-stage-note">ARRASTRA EL PUNTO O UTILIZA LAS FLECHAS · ROJO: TRASERAS · BLANCO: DELANTERAS</div></div>
 <div class="lc-panel">
 <div class="lc-split"><button type="button" data-group="front">◉ FAROS DELANTEROS</button><button type="button" data-group="rear">◉ FRENO / TRASERAS</button></div>
 <div class="lc-row"><button type="button" data-side="left">IZQUIERDA</button><button type="button" data-side="right">DERECHA</button><label><input type="checkbox" data-enabled> ACTIVADAS</label></div>
 <strong class="lc-count" data-position>X 0 · Y 0 · TAMAÑO 0</strong>
 <div class="lc-pad"><span></span><button type="button" data-nudge="up">▲ 1px</button><span></span><button type="button" data-nudge="left">◀ 1px</button><button type="button" data-center>⌖ CENTRAR</button><button type="button" data-nudge="right">1px ▶</button><span></span><button type="button" data-nudge="down">▼ 1px</button><span></span></div>
 <div class="lc-row"><button type="button" data-nudge="smaller">− 1px</button><strong>TAMAÑO</strong><button type="button" data-nudge="larger">+ 1px</button><button type="button" data-mirror>ESPEJAR L → R</button></div>
 <div class="lc-meter"><label>COLOR <input type="color" data-color value="#ff0000"></label><label>INTENSIDAD <output data-intensity-value></output></label><input type="range" data-intensity min="0" max="100" step="1"></div>
 <div class="lc-meter"><label>HALO <output data-halo-value></output></label><input type="range" data-halo min="0" max="100" step="1"></div>
 <div class="lc-meter" data-tail-row><label>LUZ DE POSICIÓN <output data-tail-value></output></label><input type="range" data-tail min="0" max="100" step="1"><label>COLOR POSICIÓN <input type="color" data-tail-color value="#8e2925"></label></div>
 <div class="lc-row"><button type="button" data-reset>RESTABLECER ESTE PAR</button><button type="button" data-export>EXPORTAR JSON GLOBAL</button></div>
 <div class="lc-hint">Los ajustes se guardan localmente hasta exportar. Sube el JSON a <strong>src/game/skins/vehicleLights.json</strong> para aplicarlos a todos los jugadores. Las físicas y las cartas no cambian.</div>
 <small data-status role="status" aria-live="polite" style="color:#83ecc3;min-height:13px"></small>
 </div></div>`;
 root.classList.add('tdr-lightcal');host.appendChild(root);
 const $=selector=>root.querySelector(selector);
 const car=$('[data-car]'),skin=$('[data-skin]'),image=$('[data-image]'),svg=$('[data-overlay]');
 const holds=[];
 const status=message=>{$('[data-status]').textContent=message;};
 const row=()=>vehicleLightsForCar(carId,skinId,draft)||defaultVehicleLights(carId);
 const save=(next)=>{
  (draft[carId]??={})[skinId]=normalizeVehicleLights(next,carId);
  try{localStorage.setItem(KEY,JSON.stringify(draft));}catch{}
  status('Ajustes locales guardados. Exporta el JSON para publicarlos globalmente.');
  preview();
 };
 const edit=(fn)=>save(fn(structuredClone(row())));
 const updatePair=(fn)=>edit(value=>{fn(value[group]);return value;});
 const updatePoint=(fn)=>updatePair(pair=>{fn(pair[side]);});
 for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=CAR_SPECS[id]?.name||id;car.appendChild(option);}
 car.value=carId;
 function fillSkins(){
  const prior=skinId;
  skin.replaceChildren();
  for(const entry of availableCarSkins(carId,CAR_SPECS[carId])){
   const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.name;skin.appendChild(opt);
  }
  skinId=[...skin.options].some(o=>o.value===prior)?prior:(skin.options[0]?.value||'original');
  skin.value=skinId;loadImage();preview();
 }
 function loadImage(){
  ready=false;w=0;h=0;
  const entries=availableCarSkins(carId,CAR_SPECS[carId]);
  const chosen=entries.find(e=>e.id===skinId)||entries[0];
  if(!chosen){status('No existe la imagen cenital.');return;}
  image.onload=()=>requestAnimationFrame(preview);
  image.onerror=()=>{ready=false;status('No se ha podido cargar la imagen.');};
  image.src=BASE+'assets/skins/'+encodeURIComponent(chosen.file);
  if(image.complete&&image.naturalWidth)requestAnimationFrame(preview);
 }
 function sizes(){
  const rect=$('.lc-stage').getBoundingClientRect();
  if(!image.naturalWidth||!rect.width||!rect.height)return false;
  const scale=Math.min((rect.width-26)/image.naturalWidth,(rect.height-22)/image.naturalHeight);
  w=Math.max(1,Math.round(image.naturalWidth*scale));
  h=Math.max(1,Math.round(image.naturalHeight*scale));
  image.style.width=w+'px';image.style.height=h+'px';svg.style.width=w+'px';svg.style.height=h+'px';
  svg.setAttribute('width',String(w));svg.setAttribute('height',String(h));svg.setAttribute('viewBox','0 0 '+w+' '+h);
  ready=true;return true;
 }
 function preview(){
  if(!root.isConnected||!sizes())return;
  const val=row(),short=Math.min(w,h);
  const parts=[];
  for(const kind of ['front','rear']){
   const pair=val[kind];
   for(const which of ['left','right']){
    const p=lightCoordinates(pair[which],w,h);
    const px=p.x+w/2,py=p.y+h/2,chosen=group===kind&&side===which;
    const fill=kind==='rear'&&!braking?(pair.tailColor||pair.color):pair.color;
    const intensity=kind==='rear'?(braking?pair.intensity:pair.tailIntensity):pair.intensity;
    const visible=pair.enabled,opacity=visible?Math.max(.12,intensity):.24;
    const radius=Math.max(3,p.size);
    if(kind==='front'){
     parts.push('<circle cx="'+px+'" cy="'+py+'" r="'+radius*2.3+'" fill="'+fill+'" opacity="'+(visible?pair.halo*.24:0)+'"/>');
     parts.push('<circle cx="'+px+'" cy="'+py+'" r="'+radius*.7+'" fill="'+fill+'" opacity="'+opacity+'"/>');
    }else{
     const points=(px-radius/2)+','+(py-radius*.45)+' '+(px+radius/2)+','+(py-radius*.45)+' '+px+','+(py+radius*.55);
     parts.push('<polygon points="'+points+'" fill="'+fill+'" opacity="'+opacity+'"/>');
     if(braking&&visible)parts.push('<circle cx="'+px+'" cy="'+py+'" r="'+radius*1.3+'" fill="'+fill+'" opacity="'+(pair.halo*.23)+'"/>');
    }
    parts.push('<circle data-select-light="'+kind+':'+which+'" cx="'+px+'" cy="'+py+'" r="'+Math.max(11,radius*1.3)+'" fill="transparent" stroke="'+(chosen?'#ffe17a':'#7aadc2')+'" stroke-width="'+(chosen?2.5:1)+'" stroke-dasharray="'+(visible?'none':'3 3')+'"/>');
   }
  }
  svg.innerHTML=parts.join('');
  const pair=val[group],point=pair[side],px=lightCoordinates(point,w,h);
  $('[data-position]').textContent='X '+Math.round(px.x)+' px · Y '+Math.round(px.y)+' px · TAMAÑO '+Math.round(px.size)+' px';
  for(const btn of root.querySelectorAll('[data-group]'))btn.style.borderColor=btn.dataset.group===group?'#ffd878':'#68cbe4';
  for(const btn of root.querySelectorAll('[data-side]'))btn.style.borderColor=btn.dataset.side===side?'#ffd878':'#68cbe4';
  $('[data-enabled]').checked=pair.enabled;
  $('[data-color]').value=pair.color;
  $('[data-intensity]').value=String(Math.round(pair.intensity*100));
  $('[data-intensity-value]').textContent=Math.round(pair.intensity*100)+'%';
  $('[data-halo]').value=String(Math.round(pair.halo*100));
  $('[data-halo-value]').textContent=Math.round(pair.halo*100)+'%';
  $('[data-tail-row]').style.display=group==='rear'?'flex':'none';
  $('[data-tail-color]').value=pair.tailColor||pair.color;
  $('[data-tail]').value=String(Math.round((pair.tailIntensity??0)*100));
  $('[data-tail-value]').textContent=Math.round((pair.tailIntensity??0)*100)+'%';
 }
 for(const btn of root.querySelectorAll('[data-nudge]')){
  const action=btn.dataset.nudge;
  holds.push(bindMasteryHoldRepeat(btn,()=>{
   if(!ready){status('Espera a que se cargue el coche.');return;}
   const dx=action==='left'?-1:action==='right'?1:0;
   const dy=action==='up'?-1:action==='down'?1:0;
   const ds=action==='smaller'?-1:action==='larger'?1:0;
   updatePoint(p=>{p.x+=dx/w;p.y+=dy/h;p.size+=ds/Math.min(w,h);});
  }));
 }
 $('[data-center]').onclick=()=>updatePoint(p=>{p.x=0;p.y=0;});
 $('[data-mirror]').onclick=()=>updatePair(pair=>{pair.right={x:-pair.left.x,y:pair.left.y,size:pair.left.size};});
 $('[data-enabled]').onchange=e=>updatePair(p=>{p.enabled=!!e.target.checked;});
 $('[data-color]').oninput=e=>updatePair(p=>{p.color=e.target.value;});
 $('[data-tail-color]').oninput=e=>updatePair(p=>{p.tailColor=e.target.value;});
 for(const [key,field] of [['intensity','intensity'],['halo','halo'],['tail','tailIntensity']]){
  $('[data-'+key+']').oninput=e=>updatePair(p=>{p[field]=Number(e.target.value)/100;});
 }
 $('[data-braking]').onchange=e=>{braking=!!e.target.checked;preview();};
 for(const btn of root.querySelectorAll('[data-group]'))btn.onclick=()=>{group=btn.dataset.group;preview();};
 for(const btn of root.querySelectorAll('[data-side]'))btn.onclick=()=>{side=btn.dataset.side;preview();};
 car.onchange=()=>{holds.forEach(h=>h.cancel());carId=car.value;skinId='original';fillSkins();};
 skin.onchange=()=>{holds.forEach(h=>h.cancel());skinId=skin.value;loadImage();preview();};
 $('[data-reset]').onclick=()=>updatePair(pair=>Object.assign(pair,structuredClone(defaultVehicleLights(carId)[group])));
 $('[data-export]').onclick=()=>{downloadJson(mergeVehicleLights(official,draft));status('JSON global exportado. Súbelo al repositorio para publicarlo.');};
 svg.addEventListener('pointerdown',event=>{
  const target=event.target.closest?.('[data-select-light]');
  if(!target||!ready)return;
  const pieces=target.getAttribute('data-select-light').split(':');
  group=pieces[0];side=pieces[1];drag=event.pointerId;
  svg.setPointerCapture?.(drag);event.preventDefault();preview();
 });
 svg.addEventListener('pointermove',event=>{
  if(drag==null||event.pointerId!==drag||!ready)return;
  const rect=svg.getBoundingClientRect();
  const x=clamp((event.clientX-rect.left-w/2)/w,-.8,.8);
  const y=clamp((event.clientY-rect.top-h/2)/h,-.8,.8);
  updatePoint(p=>{p.x=x;p.y=y;});
  event.preventDefault();
 });
 const stop=()=>{drag=null;};
 svg.addEventListener('pointerup',stop);svg.addEventListener('pointercancel',stop);svg.addEventListener('lostpointercapture',stop);
 const onResize=()=>requestAnimationFrame(preview);
 window.addEventListener('resize',onResize);
 function close(){
  if(closed)return;closed=true;holds.forEach(h=>h.dispose());
  window.removeEventListener('resize',onResize);root.remove();onClose();
 }
 $('[data-close]').onclick=close;
 fillSkins();
 return{root,close};
}
