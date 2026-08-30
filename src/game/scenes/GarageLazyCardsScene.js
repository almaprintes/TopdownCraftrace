import { GarageScene as CurrentGarageScene } from './GarageResponsiveHeroScene.js';
import { BaseScene } from './BaseScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { recordGarageVisit } from '../seasons/seasonTelemetry.js';
import { devFullCarAccessEnabled, isCarUnlocked, STARTER_CAR_ID } from '../cars/carUnlocks.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { attainableTopSpeedKmh } from '../cars/speedUnits.js';
import { t, getLanguage } from '../i18n/index.js';

const CARDS = [
  ['card_avenir_apex','card_avenir_apex_raro_008.webp'],
  ['card_avenir_gripline','card_avenir_gripline_poco_comun_007.webp'],
  ['card_avenir_torque','card_avenir_torque_elite_009.webp'],
  ['card_crown_axis','card_crown_axis_poco_comun_004.webp'],
  ['card_crown_equinox','card_crown_equinox_raro_006.webp'],
  ['card_crown_vector','card_crown_vector_raro_005.webp'],
  ['card_forge_anvil','card_forge_anvil_elite_014.webp'],
  ['card_forge_colossus','card_forge_colossus_legendario_015.webp'],
  ['card_forge_hammer','card_forge_hammer_raro_013.webp'],
  ['card_helix_comet','card_helix_comet_poco_comun_002.webp'],
  ['card_helix_pulse','card_helix_pulse_poco_comun_003.webp'],
  ['card_helix_spark','card_helix_spark_comun_001.webp'],
  ['card_helix_vortex','card_helix_vortex_raro_016.webp'],
  ['card_veloce_flash','card_veloce_flash_poco_comun_010.webp'],
  ['card_veloce_photon','card_veloce_photon_elite_012.webp'],
  ['card_veloce_surge','card_veloce_surge_raro_011.webp']
];
const LEGACY_IDS=new Set(['stock','touring','power']);
const BASE=import.meta.env.BASE_URL||'/';
const CARD_FILE=new Map(CARDS.map(([key,file])=>[key.replace(/^card_/,''),file]));
const DOM_ID='tdr-garage-player-dom';
const STYLE_ID='tdr-garage-player-dom-style';

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function savedSpec(carId){try{const raw=localStorage.getItem(`tdr2:carSpecs:${carId}`),obj=raw?JSON.parse(raw):null;return obj&&typeof obj==='object'?obj:{};}catch{return {};}}
function playableCars(){return Object.keys(CAR_SPECS).filter(id=>!LEGACY_IDS.has(id)).map(id=>({id,spec:CAR_SPECS[id]})).filter(x=>x.spec);}
function labels(){const en=getLanguage()==='en';return en?{garage:'GARAGE',collection:'COLLECTION',selected:'SELECTED CAR',mystery:'MYSTERY CAR',locked:'LOCKED',discover:'Unlock it through seasons, events or progression.',category:'CATEGORY',rarity:'RARITY',collectionNo:'COLLECTION',role:'ROLE',top:'TOP SPEED',accel:'ACCELERATION',brake:'BRAKING',select:'SELECT',back:'BACK'}:{garage:'GARAJE',collection:'COLECCIÓN',selected:'COCHE SELECCIONADO',mystery:'COCHE MISTERIOSO',locked:'BLOQUEADO',discover:'Consíguelo mediante temporadas, eventos o progresión.',category:'CATEGORÍA',rarity:'RAREZA',collectionNo:'COLECCIÓN',role:'ROL',top:'VEL. PUNTA',accel:'ACELERACIÓN',brake:'FRENADA',select:'SELECCIONAR',back:'VOLVER'};}
function localizedValue(value,type){
  const raw=String(value??'—');
  const key=raw.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  const en=getLanguage()==='en';
  const rarity={
    'comun':en?'Common':'Común','common':en?'Common':'Común',
    'poco comun':en?'Uncommon':'Poco común','uncommon':en?'Uncommon':'Poco común',
    'raro':en?'Rare':'Raro','rare':en?'Rare':'Raro',
    'elite':'Élite','legendario':en?'Legendary':'Legendario','legendary':en?'Legendary':'Legendario'
  };
  const category={
    'all-rounder':en?'All-Rounder':'Polivalente',
    'tecnico (grip)':en?'Technical (Grip)':'Técnico (Grip)',
    'technical (grip)':en?'Technical (Grip)':'Técnico (Grip)',
    'velocidad':en?'Speed':'Velocidad','speed':en?'Speed':'Velocidad',
    'potencia':en?'Power':'Potencia','power':en?'Power':'Potencia'
  };
  const table=type==='rarity'?rarity:category;
  return table[key]||raw;
}

export class GarageScene extends CurrentGarageScene {
  preload(){
    // Player garage is pure DOM and uses browser images directly. Loading all 16
    // cards into Phaser's TextureManager duplicates decoded image memory on iOS.
    if(this._mode!=='admin')return;
    super.preload?.();
    this.load.setPath('assets/cars/runtime');
    for(const [key,file] of CARDS){if(!this.textures.exists(key))this.load.image(key,file);}
    this.load.setPath('');
  }

  _fullAccess(){return this._mode==='admin'||devFullCarAccessEnabled();}
  _lockedCar(carId){return !this._fullAccess()&&!isCarUnlocked(carId);}

  create(){
    if(this._mode==='admin'){
      super.create();
      recordGarageVisit();
      return;
    }

    // Do not build the legacy Phaser garage at all in player mode. Previously the
    // DOM garage was accidentally gated by !devFullCarAccessEnabled(), so a stale
    // development flag silently sent iPhone back through the expensive old scene.
    BaseScene.prototype.create.call(this);
    this.cameras.main.setBackgroundColor('#09142d');
    this._cars=playableCars();
    let savedCarId=null;try{savedCarId=localStorage.getItem('tdr2:carId');}catch{}
    let index=this._cars.findIndex(car=>car.id===savedCarId);
    if(index<0||this._lockedCar(this._cars[index]?.id)){
      const starterIndex=this._cars.findIndex(car=>car.id===STARTER_CAR_ID);
      index=starterIndex>=0?starterIndex:0;
      const starter=this._cars[index];
      if(starter)try{localStorage.setItem('tdr2:carId',starter.id);}catch{}
    }
    this._selectedIndex=Math.max(0,index);
    this._installPlayerDomGarage();
    recordGarageVisit();
    this.events.once('shutdown',()=>this._removePlayerDomGarage());
  }

  _ensurePlayerDomStyle(){
    if(document.getElementById(STYLE_ID))return;
    const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${DOM_ID}{position:absolute;inset:0;z-index:23500;pointer-events:auto;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:radial-gradient(circle at 72% 22%,rgba(43,123,255,.18),transparent 34%),radial-gradient(circle at 65% 82%,rgba(43,255,136,.08),transparent 35%),#09142d;display:grid;grid-template-rows:62px minmax(0,1fr);padding:8px 14px 14px;box-sizing:border-box;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none}
#${DOM_ID} *{box-sizing:border-box}#${DOM_ID} button{font:inherit;color:inherit;touch-action:manipulation}#${DOM_ID} img{-webkit-user-drag:none;user-select:none}
.tdr-garage-dom-head{display:grid;grid-template-columns:64px 1fr 64px;align-items:center;border:1px solid rgba(70,221,255,.34);border-radius:13px;background:#06121df2;position:relative}.tdr-garage-dom-head:before{content:'';position:absolute;left:16px;top:-1px;width:min(245px,25vw);height:2px;background:#e6b84e}.tdr-garage-dom-head h1{margin:0;text-align:center;font-size:clamp(22px,3.2vw,34px);line-height:1}.tdr-garage-dom-back{width:52px;height:46px;margin-left:5px;border:0;background:transparent;font-size:27px;border-radius:10px}.tdr-garage-dom-back:active{background:#13273a}
.tdr-garage-dom-layout{min-height:0;display:grid;grid-template-columns:minmax(245px,30%) minmax(0,1fr);gap:14px;padding-top:10px}.tdr-garage-dom-listpanel,.tdr-garage-dom-hero{min-height:0;border:1px solid rgba(183,192,255,.20);border-radius:22px;background:rgba(7,14,31,.76);overflow:hidden}.tdr-garage-dom-listpanel{display:grid;grid-template-rows:42px minmax(0,1fr)}.tdr-garage-dom-kicker{padding:13px 16px 8px;font-size:13px;font-weight:900;letter-spacing:.06em}.tdr-garage-dom-list{min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;touch-action:pan-y;padding:2px 10px 12px;scrollbar-width:thin}.tdr-garage-dom-car{width:100%;min-height:92px;display:grid;grid-template-columns:76px minmax(0,1fr);gap:10px;align-items:center;margin:0 0 9px;padding:7px 9px;border:1px solid rgba(183,192,255,.18);border-left:7px solid #2b7bff;border-radius:9px;background:#111a3380;text-align:left;cursor:pointer}.tdr-garage-dom-car.is-selected{border-color:rgba(43,255,136,.68);border-left-color:#2bff88;background:#111a33d1}.tdr-garage-dom-car.is-locked{border-left-color:#52606d}.tdr-garage-dom-car img{width:70px;height:78px;object-fit:contain;display:block}.tdr-garage-dom-car.is-locked img{filter:brightness(0) drop-shadow(0 0 5px rgba(70,221,255,.25))}.tdr-garage-dom-carname{font-size:14px;font-weight:1000;line-height:1.1;margin-bottom:7px}.tdr-garage-dom-carmeta{font-size:10px;line-height:1.45;color:#aebbe1;font-weight:700}
.tdr-garage-dom-hero{display:grid;grid-template-columns:minmax(230px,46%) minmax(0,1fr);gap:16px;padding:16px;position:relative}.tdr-garage-dom-cardzone{min-width:0;min-height:0;height:100%;display:flex;align-items:center;justify-content:center;padding:8px 2px;overflow:hidden}.tdr-garage-dom-cardzone img{display:block;max-width:100%;max-height:94%;width:auto;height:auto;object-fit:contain;filter:drop-shadow(0 10px 16px rgba(0,0,0,.32))}.tdr-garage-dom-cardzone.is-locked img{filter:brightness(0) drop-shadow(0 0 9px rgba(70,221,255,.35))}.tdr-garage-dom-info{min-width:0;min-height:0;display:flex;flex-direction:column}.tdr-garage-dom-selected{font-size:10px;color:#7f94b8;font-weight:900;letter-spacing:.08em;margin:2px 0 5px}.tdr-garage-dom-title{font-size:clamp(22px,2.6vw,31px);font-weight:1000;line-height:1.05;margin:0}.tdr-garage-dom-brand{font-size:14px;font-weight:900;color:#2bff88;margin-top:7px}.tdr-garage-dom-meta{display:grid;grid-template-columns:1fr 1fr;gap:7px 12px;margin-top:13px}.tdr-garage-dom-meta div{padding:7px 9px;background:#0d1830;border:1px solid rgba(183,192,255,.10);border-radius:6px}.tdr-garage-dom-meta span{display:block;color:#788aaf;font-size:8px;font-weight:900}.tdr-garage-dom-meta strong{display:block;font-size:11px;margin-top:2px}.tdr-garage-dom-personality{font-size:10px;line-height:1.4;color:#dce4ff;font-style:italic;margin:10px 2px 0}.tdr-garage-dom-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;margin-top:auto;padding-top:10px}.tdr-garage-dom-stat{background:#111a33;border:1px solid rgba(255,255,255,.10);border-radius:7px;padding:8px;text-align:center}.tdr-garage-dom-stat span{display:block;font-size:8px;color:#8fa1c7;font-weight:900}.tdr-garage-dom-stat strong{display:block;font-size:14px;margin-top:3px}.tdr-garage-dom-actions{display:grid;grid-template-columns:minmax(130px,1.55fr) minmax(90px,1fr);gap:9px;margin-top:10px}.tdr-garage-dom-actions button{height:42px;border-radius:6px;font-weight:1000;border:1px solid rgba(183,192,255,.22);background:#141b33}.tdr-garage-dom-actions .primary{background:#2bff88;color:#07131b;border-color:#8dffc8}.tdr-garage-dom-actions button:disabled{background:#2b3445;color:#8e9caf;border-color:#556172}
@media(max-height:430px){#${DOM_ID}{grid-template-rows:54px minmax(0,1fr);padding:6px 10px 10px}.tdr-garage-dom-layout{padding-top:7px;gap:9px}.tdr-garage-dom-listpanel{grid-template-rows:34px}.tdr-garage-dom-kicker{padding:9px 13px 5px;font-size:11px}.tdr-garage-dom-car{min-height:78px;grid-template-columns:60px 1fr;padding:5px 7px;margin-bottom:6px}.tdr-garage-dom-car img{width:55px;height:65px}.tdr-garage-dom-carname{font-size:12px;margin-bottom:4px}.tdr-garage-dom-carmeta{font-size:9px}.tdr-garage-dom-hero{padding:10px;gap:10px;grid-template-columns:minmax(190px,43%) minmax(0,1fr)}.tdr-garage-dom-cardzone{padding:6px 2px}.tdr-garage-dom-cardzone img{max-height:92%}.tdr-garage-dom-meta{margin-top:7px;gap:5px}.tdr-garage-dom-meta div{padding:4px 6px}.tdr-garage-dom-personality{margin-top:6px;font-size:9px}.tdr-garage-dom-stats{padding-top:6px;gap:5px}.tdr-garage-dom-stat{padding:5px}.tdr-garage-dom-actions{margin-top:6px}.tdr-garage-dom-actions button{height:34px;font-size:11px}}
`;
    document.head.appendChild(s);
  }

  _installPlayerDomGarage(){
    if(this._mode!=='player')return;
    this._removePlayerDomGarage();this._ensurePlayerDomStyle();
    const canvas=this.game?.canvas,host=canvas?.parentElement||document.getElementById('app')||document.body;if(!host)return;
    if(getComputedStyle(host).position==='static')host.style.position='relative';
    const root=document.createElement('div');root.id=DOM_ID;host.appendChild(root);this._playerGarageDom=root;
    const L=labels();
    root.innerHTML=`<header class="tdr-garage-dom-head"><button type="button" class="tdr-garage-dom-back" aria-label="${esc(L.back)}">⬅</button><h1>${esc(L.garage)}</h1><span></span></header><main class="tdr-garage-dom-layout"><section class="tdr-garage-dom-listpanel"><div class="tdr-garage-dom-kicker">${esc(L.collection)}</div><div class="tdr-garage-dom-list"></div></section><section class="tdr-garage-dom-hero"><div class="tdr-garage-dom-cardzone"><img alt="" draggable="false" decoding="async"></div><div class="tdr-garage-dom-info"></div></section></main>`;
    root.querySelector('.tdr-garage-dom-back')?.addEventListener('click',()=>this.scene.start('menu'));
    const list=root.querySelector('.tdr-garage-dom-list');
    (this._cars||[]).forEach((car,index)=>{
      const locked=this._lockedCar(car.id),spec=car.spec||{},btn=document.createElement('button');
      btn.type='button';btn.className=`tdr-garage-dom-car${index===this._selectedIndex?' is-selected':''}${locked?' is-locked':''}`;btn.dataset.index=String(index);
      const file=CARD_FILE.get(car.id),src=file?`${BASE}assets/cars/runtime/${file}`:'';
      const category=localizedValue(spec.category,'category'),rarity=localizedValue(spec.rarity,'rarity');
      btn.innerHTML=`${src?`<img src="${src}" alt="" draggable="false" loading="lazy" decoding="async">`:''}<div><div class="tdr-garage-dom-carname">${locked?'???':esc(String(spec.name||car.id).toUpperCase())}</div><div class="tdr-garage-dom-carmeta">${locked?`🔒 ${esc(L.locked)}`:`${esc(spec.brand||'—')} · ${esc(category)}<br>${esc(rarity)} · #${String(spec.collectionNo||0).padStart(3,'0')}`}</div></div>`;
      btn.addEventListener('click',()=>{this._selectedIndex=index;this._renderPlayerDomSelection();});
      list?.appendChild(btn);
    });
    this._renderPlayerDomSelection();
    requestAnimationFrame(()=>root.querySelector('.tdr-garage-dom-car.is-selected')?.scrollIntoView({block:'center'}));
  }

  _renderPlayerDomSelection(){
    const root=this._playerGarageDom;if(!root?.isConnected)return;
    const selected=this._cars?.[this._selectedIndex];if(!selected)return;
    const L=labels(),locked=this._lockedCar(selected.id),spec=selected.spec||{};
    root.querySelectorAll('.tdr-garage-dom-car').forEach((node,i)=>node.classList.toggle('is-selected',i===this._selectedIndex));
    const zone=root.querySelector('.tdr-garage-dom-cardzone'),img=zone?.querySelector('img'),file=CARD_FILE.get(selected.id);
    if(zone)zone.classList.toggle('is-locked',locked);
    if(img){const next=file?`${BASE}assets/cars/runtime/${file}`:'';if(img.getAttribute('src')!==next)img.src=next;img.alt='';}
    const live={...spec,...savedSpec(selected.id)},resolved=resolveCarParams(live),top=Math.round(attainableTopSpeedKmh(resolved)),accel=Math.round(resolved.accel||0),brake=Math.round(resolved.brakeForce||0);
    let personality='';try{personality=t(`garage.personality.${selected.id}`)||'';}catch{}
    const info=root.querySelector('.tdr-garage-dom-info');if(!info)return;
    if(locked){
      info.innerHTML=`<div class="tdr-garage-dom-selected">${esc(L.selected)}</div><h2 class="tdr-garage-dom-title">???</h2><div class="tdr-garage-dom-brand">${esc(L.mystery)}</div><p class="tdr-garage-dom-personality">🔒 ${esc(L.discover)}</p><div class="tdr-garage-dom-stats"><div class="tdr-garage-dom-stat"><span>${esc(L.top)}</span><strong>???</strong></div><div class="tdr-garage-dom-stat"><span>${esc(L.accel)}</span><strong>???</strong></div><div class="tdr-garage-dom-stat"><span>${esc(L.brake)}</span><strong>???</strong></div></div><div class="tdr-garage-dom-actions"><button type="button" class="primary" disabled>${esc(L.locked)}</button><button type="button" data-back>${esc(L.back)}</button></div>`;
    }else{
      const category=localizedValue(spec.category,'category'),rarity=localizedValue(spec.rarity,'rarity');
      info.innerHTML=`<div class="tdr-garage-dom-selected">${esc(L.selected)}</div><h2 class="tdr-garage-dom-title">${esc(String(spec.name||selected.id).toUpperCase())}</h2><div class="tdr-garage-dom-brand">${esc(String(spec.brand||'—').toUpperCase())}</div><div class="tdr-garage-dom-meta"><div><span>${esc(L.category)}</span><strong>${esc(category)}</strong></div><div><span>${esc(L.rarity)}</span><strong>${esc(rarity)}</strong></div><div><span>${esc(L.collectionNo)}</span><strong>#${String(spec.collectionNo||0).padStart(3,'0')}</strong></div><div><span>${esc(L.role)}</span><strong>${esc(spec.role||'—')}</strong></div></div>${personality?`<p class="tdr-garage-dom-personality">${esc(personality)}</p>`:''}<div class="tdr-garage-dom-stats"><div class="tdr-garage-dom-stat"><span>${esc(L.top)}</span><strong>${top} km/h</strong></div><div class="tdr-garage-dom-stat"><span>${esc(L.accel)}</span><strong>${accel}</strong></div><div class="tdr-garage-dom-stat"><span>${esc(L.brake)}</span><strong>${brake}</strong></div></div><div class="tdr-garage-dom-actions"><button type="button" class="primary" data-select>${esc(L.select)}</button><button type="button" data-back>${esc(L.back)}</button></div>`;
    }
    info.querySelector('[data-select]')?.addEventListener('click',()=>{if(this._lockedCar(selected.id))return;try{localStorage.setItem('tdr2:carId',selected.id);}catch{}this.scene.start('menu');});
    info.querySelector('[data-back]')?.addEventListener('click',()=>this.scene.start('menu'));
  }

  _removePlayerDomGarage(){try{this._playerGarageDom?.remove();}catch{}this._playerGarageDom=null;}
}
