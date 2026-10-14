import {CAR_SPECS} from '../cars/carSpecs.js';
import {availableCarSkins} from '../skins/carSkins.js';
import {bindMasteryHoldRepeat} from './masteryHoldRepeat.js';
import {skinGeometry,normalizeSkinGeometry,mergeSkinGeometry,SKIN_GEOMETRY_EXPORT}
 from '../skins/skinGeometry.js';
import official from '../skins/skinGeometry.json' with {type:'json'};
const DRAFT_KEY='tdr2:adminSkinGeometryDraft:v1';
const BASE=import.meta.env.BASE_URL||'/';
const clean=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showAdminSkinGeometryCalibration(host,{initialCarId='crown_cuper',onClose=()=>{}}={}){
 const ids=Object.keys(CAR_SPECS).filter(id=>!['stock','touring','power'].includes(id));
 let draft={};try{draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'{}')||{};}catch{}
 let carId=ids.includes(initialCarId)?initialCarId:ids[0],skinId='original',shortAxis=0,ready=false;
 let root=document.createElement('div');root.className='tdr-admin-skin-geometry';
 root.style.cssText='position:absolute;inset:0;z-index:90000;background:linear-gradient(145deg,#071521,#0c2937);color:#f4fbff;font:700 12px system-ui;display:flex;flex-direction:column;gap:8px;padding:clamp(7px,2vh,14px);box-sizing:border-box;overflow:auto;touch-action:pan-y;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;';
 root.innerHTML=`<style>
 .tdr-admin-skin-geometry *{box-sizing:border-box;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
 .tdr-admin-skin-geometry button,.tdr-admin-skin-geometry select{background:#10293b;color:#f6fbff;border:1px solid #6cdef4;border-radius:10px;min-height:34px;padding:4px 10px;font:850 11px system-ui;touch-action:manipulation}
 .tdr-admin-skin-geometry [data-nudge]{touch-action:none!important;-webkit-tap-highlight-color:transparent}
 .tdr-admin-skin-geometry .sg-top{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap}
 .tdr-admin-skin-geometry .sg-selectors{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
 .tdr-admin-skin-geometry .sg-grid{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,1fr);gap:12px;min-height:0;flex:1}
 .tdr-admin-skin-geometry .sg-preview{position:relative;min-height:170px;border:1px solid #467d8e;border-radius:15px;background:radial-gradient(ellipse,#153748,#07131f);overflow:hidden;display:flex;align-items:center;justify-content:center}
 .tdr-admin-skin-geometry .sg-preview img{position:absolute;left:50%;top:50%;max-width:90%;height:90%;width:auto;max-height:91%;object-fit:contain;pointer-events:none;-webkit-user-drag:none;transform:translate(-50%,-50%)}
 .tdr-admin-skin-geometry .sg-controls{min-height:0;overflow:auto;display:grid;align-content:start;gap:9px}
 .tdr-admin-skin-geometry .sg-pad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));max-width:280px;gap:5px}
 .tdr-admin-skin-geometry .sg-bar{display:flex;align-items:center;gap:8px;justify-content:space-between}
 .tdr-admin-skin-geometry .sg-bar button{min-width:50px}
 .tdr-admin-skin-geometry .sg-help{font-size:10px;color:#9cc4d2}
 @media(max-height:480px){.tdr-admin-skin-geometry .sg-grid{min-height:0}.tdr-admin-skin-geometry .sg-pad button{min-height:29px}}
 @media(max-width:700px) and (orientation:portrait){.tdr-admin-skin-geometry .sg-grid{grid-template-columns:1fr;flex:none}.tdr-admin-skin-geometry .sg-preview{height:35vh}}
 </style>
 <div class="sg-top"><div><strong style="font-size:clamp(14px,3vh,24px)">CALIBRAR SKINS</strong><div class="sg-help">APARIENCIA · 1 PX POR PULSACIÓN · MANTENER PULSADO</div></div><button data-close type="button">CERRAR ×</button></div>
 <div class="sg-selectors"><label>COCHE <select data-car></select></label><label>APARIENCIA <select data-skin></select></label><label><input data-reference type="checkbox" checked> MOSTRAR REFERENCIA</label></div>
 <div class="sg-grid"><div class="sg-preview"><img data-base alt=""><img data-skin-image alt=""><span data-wait style="position:absolute;left:10px;bottom:10px;color:#aed3e1;font-size:10px">REFERENCIA BASE + SKIN</span></div>
 <div class="sg-controls"><strong data-position>POSICIÓN · X 0 · Y 0</strong>
 <div class="sg-pad"><i></i><button type="button" data-nudge="up">▲ 1</button><i></i>
 <button type="button" data-nudge="left">◀ 1</button><button type="button" data-center>⌖</button><button type="button" data-nudge="right">1 ▶</button>
 <i></i><button type="button" data-nudge="down">▼ 1</button><i></i></div>
 <div class="sg-bar"><button type="button" data-nudge="shrink">− 1</button><strong data-scale>TAMAÑO</strong><button type="button" data-nudge="grow">+ 1</button></div>
 <div class="sg-bar"><button type="button" data-rotate="-90">↶ 90°</button><strong data-angle>GIRO 0°</strong><button type="button" data-rotate="90">90° ↷</button></div>
 <div class="sg-bar"><button type="button" data-reset>RESTABLECER SKIN</button><button type="button" data-export>EXPORTAR JSON</button></div>
 <div class="sg-help">Ajustes locales hasta exportar. Solo corrigen la imagen, nunca las físicas ni la skin equipada del jugador.</div>
 <small data-status role="status" aria-live="polite"></small></div></div>`;
 host.appendChild(root);
 const $=sel=>root.querySelector(sel),car=$('[data-car]'),skin=$('[data-skin]'),image=$('[data-skin-image]'),base=$('[data-base]');
 const status=text=>{$('[data-status]').textContent=text;};
 ids.forEach(id=>{const o=document.createElement('option');o.value=id;o.textContent=CAR_SPECS[id].name||id;car.appendChild(o);});
 car.value=carId;
 const row=()=>skinGeometry(carId,skinId,draft);
 function setSkins(){
  skin.replaceChildren();
  for(const choice of availableCarSkins(carId,CAR_SPECS[carId])){const o=document.createElement('option');o.value=choice.id;o.textContent=choice.name;skin.appendChild(o);}
  skinId=skin.options[0]?.value||'original';skin.value=skinId;load();
 }
 function load(){
  ready=false;shortAxis=0;
  const entries=availableCarSkins(carId,CAR_SPECS[carId]);
  const first=entries[0],chosen=entries.find(s=>s.id===skinId)||first;
  base.src=BASE+'assets/skins/'+encodeURIComponent(first.file);
  image.src=BASE+'assets/skins/'+encodeURIComponent(chosen.file);
  image.onload=()=>requestAnimationFrame(preview);
  image.onerror=()=>status('Falta la imagen de esta skin.');
  if(image.complete&&image.naturalWidth)requestAnimationFrame(preview);
 }
 function preview(){
  if(!root.isConnected||!image.naturalWidth)return;
  const img=image.getBoundingClientRect();
  const nw=image.naturalWidth,nh=image.naturalHeight;
  const stage=root.querySelector('.sg-preview').getBoundingClientRect();
  const naturalPaintW=Math.min(stage.width*.9,stage.height*.9*(nw/nh));
  const naturalPaintH=naturalPaintW*(nh/nw);
  shortAxis=Math.max(1,Math.min(naturalPaintW,naturalPaintH));ready=shortAxis>0;
  const v=row(),pxX=v.x*shortAxis,pxY=v.y*shortAxis;
  image.style.transform=`translate(calc(-50% + ${pxX}px),calc(-50% + ${pxY}px)) rotate(${v.rotation}deg) scale(${1+v.scale})`;
  $('[data-position]').textContent=`POSICIÓN · X ${pxX.toFixed(1)} px · Y ${pxY.toFixed(1)} px`;
  $('[data-scale]').textContent=`TAMAÑO ${(v.scale*shortAxis).toFixed(1)} px`;
  $('[data-angle]').textContent=`GIRO ${v.rotation}°`;
 }
 function edit(fn){
  if(!ready||shortAxis<=0){status('Espera a que cargue la imagen.');return;}
  (draft[carId]??={})[skinId]=normalizeSkinGeometry(fn(row()));
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(draft));}catch{}
  status('Borrador local guardado. Falta exportar para integrar.');
  preview();
 }
 const hold=[];
 const actions={up:['y',-1],down:['y',1],left:['x',-1],right:['x',1],shrink:['scale',-1],grow:['scale',1]};
 root.querySelectorAll('[data-nudge]').forEach(button=>{
  const [axis,d]=actions[button.dataset.nudge];
  hold.push(bindMasteryHoldRepeat(button,()=>edit(v=>({...v,[axis]:v[axis]+d/shortAxis}))));
 });
 root.querySelectorAll('[data-rotate]').forEach(button=>button.onclick=()=>edit(v=>({...v,rotation:(v.rotation+Number(button.dataset.rotate)+360)%360})));
 $('[data-center]').onclick=()=>edit(v=>({...v,x:0,y:0}));
 $('[data-reset]').onclick=()=>edit(()=>({x:0,y:0,scale:0,rotation:0}));
 $('[data-reference]').onchange=event=>{base.style.display=event.target.checked?'':'none';};
 car.onchange=()=>{hold.forEach(h=>h.cancel());carId=car.value;setSkins();};
 skin.onchange=()=>{hold.forEach(h=>h.cancel());skinId=skin.value;load();};
 const onResize=()=>preview();
 window.addEventListener('resize',onResize);
 function close(){hold.forEach(h=>h.dispose());window.removeEventListener('resize',onResize);root.remove();onClose();}
 $('[data-close]').onclick=close;
 $('[data-export]').onclick=()=>{
  const data=JSON.stringify(mergeSkinGeometry(official,draft),null,2)+'\n';
  const blob=new Blob([data],{type:'application/json'}),url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=SKIN_GEOMETRY_EXPORT;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),5000);status('JSON GLOBAL exportado. Envíamelo para publicarlo.');
 };
 setSkins();
 return{root,close};
}
