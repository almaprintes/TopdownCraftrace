import { CAR_SPECS } from '../cars/carSpecs.js';
import { getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

const BASE=import.meta.env.BASE_URL||'/';
const ROOT_ID='tdr-race-loading-experience';
const STYLE_ID='tdr-race-loading-experience-style';
const RECENT_KEY='tdr2:raceLoadingTipsRecent';
const RECENT_LIMIT=7;
const TIP_ROTATE_MS=4500;
const READY_MIN_MS=180;
const READY_TIMEOUT_MS=7000;

const TIPS=[
  ['drive-01','CONDUCCIÓN','DRIVING','Frena antes de girar.','Brake before you turn.'],
  ['drive-02','CONDUCCIÓN','DRIVING','En recta, mueve el volante lo mínimo.','On straights, steer as little as possible.'],
  ['drive-03','CONDUCCIÓN','DRIVING','Acelera cuando el coche apunte a la salida.','Accelerate when the car points toward the exit.'],
  ['drive-04','CONDUCCIÓN','DRIVING','Una salida limpia de curva gana tiempo.','A clean corner exit saves time.'],
  ['drive-05','CONDUCCIÓN','DRIVING','No entres pasado: perderás la salida.','Do not overcook entry: you will lose the exit.'],
  ['drive-06','CONDUCCIÓN','DRIVING','Frena recto antes de pedir giro al coche.','Brake straight before asking the car to turn.'],
  ['drive-07','CONDUCCIÓN','DRIVING','Suavidad al volante también significa velocidad.','Smooth steering also means speed.'],
  ['drive-08','CONDUCCIÓN','DRIVING','Mira la salida de la curva, no el morro.','Look at the corner exit, not the nose.'],
  ['drive-09','CONDUCCIÓN','DRIVING','Corrige menos y conservarás más velocidad.','Correct less and you will keep more speed.'],
  ['drive-10','CONDUCCIÓN','DRIVING','Levantar un instante puede evitar una frenada fuerte.','A short lift can avoid heavy braking.'],
  ['line-01','TRAZADA','RACING LINE','Busca el vértice para acortar la curva.','Aim for the apex to shorten the corner.'],
  ['line-02','TRAZADA','RACING LINE','Abre la entrada para mejorar la salida.','Open the entry to improve the exit.'],
  ['line-03','TRAZADA','RACING LINE','Las curvas lentas se ganan en la salida.','Slow corners are won on exit.'],
  ['line-04','TRAZADA','RACING LINE','No todas las curvas piden la misma línea.','Not every corner needs the same line.'],
  ['line-05','TRAZADA','RACING LINE','Encadena curvas pensando en la última salida.','Link corners by planning the final exit.'],
  ['line-06','TRAZADA','RACING LINE','Sacrifica una curva para preparar mejor la siguiente.','Sacrifice one corner to prepare the next.'],
  ['line-07','TRAZADA','RACING LINE','Aprende una referencia fija para cada frenada.','Learn one fixed marker for each braking point.'],
  ['line-08','TRAZADA','RACING LINE','Ataca el piano solo si mejora tu trazada.','Use the kerb only if it improves your line.'],
  ['line-09','TRAZADA','RACING LINE','Una línea estable ayuda a alcanzar la punta.','A stable line helps you reach top speed.'],
  ['line-10','TRAZADA','RACING LINE','Prioriza la recta más larga al enlazar curvas.','Prioritize the longest straight when linking corners.'],
  ['time-01','CONTRARRELOJ','TIME ATTACK','Cada pequeña corrección cuesta tiempo.','Every small correction costs time.','timeattack'],
  ['time-02','CONTRARRELOJ','TIME ATTACK','Repite vueltas limpias antes de buscar el límite.','Repeat clean laps before chasing the limit.','timeattack'],
  ['time-03','CONTRARRELOJ','TIME ATTACK','Mejora una curva cada vez.','Improve one corner at a time.','timeattack'],
  ['ghost-01','FANTASMA','GHOST','El fantasma muestra dónde pierdes tiempo.','The ghost shows where you lose time.','ghost'],
  ['ghost-02','FANTASMA','GHOST','No persigas al fantasma: compara sus puntos fuertes.','Do not chase the ghost: compare its strong points.','ghost'],
  ['surv-01','SUPERVIVENCIA','SURVIVAL','Ser constante vale más que arriesgar cada curva.','Consistency beats risking every corner.','survival'],
  ['surv-02','SUPERVIVENCIA','SURVIVAL','Evita contactos: conservar velocidad también es sobrevivir.','Avoid contact: keeping speed is also survival.','survival'],
  ['duel-01','DUELO','DUEL','Presiona al rival sin regalar tu trazada.','Pressure the rival without giving away your line.','duel'],
  ['duel-02','DUELO','DUEL','Una mejor salida puede decidir el adelantamiento.','A better exit can decide the overtake.','duel'],
  ['test-01','PRUEBAS','TESTING','Usa el Área de Pruebas para comparar ajustes.','Use the Test Area to compare setups.','practice'],
  ['test-02','PRUEBAS','TESTING','Cambia una sola cosa y compara el resultado.','Change one thing and compare the result.','practice'],
  ['car-01','COCHE','CAR','Más punta no siempre da una vuelta más rápida.','More top speed does not always mean a faster lap.'],
  ['car-02','COCHE','CAR','Más agarre permite acelerar antes.','More grip lets you accelerate earlier.'],
  ['car-03','COCHE','CAR','Conoce tu coche antes de llevarlo al límite.','Know your car before pushing its limit.'],
  ['car-04','COCHE','CAR','La estabilidad también forma parte del rendimiento.','Stability is also part of performance.'],
  ['car-05','COCHE','CAR','Un coche rápido necesita una trazada limpia.','A fast car still needs a clean line.'],
  ['factory-01','FÁBRICA','FACTORY','La Fábrica mejora el coche pieza a pieza.','The Factory improves the car part by part.'],
  ['factory-02','FÁBRICA','FACTORY','Cada familia de piezas cambia el comportamiento.','Each part family changes the car behaviour.'],
  ['factory-03','FÁBRICA','FACTORY','Los tiers altos ofrecen mejores prestaciones.','Higher tiers offer better performance.'],
  ['factory-04','FÁBRICA','FACTORY','Prueba tus mejoras antes de competir al límite.','Test your upgrades before racing at the limit.'],
  ['prog-01','PROGRESIÓN','PROGRESSION','Los materiales sirven para fabricar y mejorar piezas.','Materials are used to craft and improve parts.'],
  ['prog-02','PROGRESIÓN','PROGRESSION','Guarda recursos para la mejora que realmente necesitas.','Save resources for the upgrade you really need.'],
  ['prog-03','PROGRESIÓN','PROGRESSION','Completa objetivos para ampliar tus opciones.','Complete objectives to expand your options.'],
  ['track-01','CIRCUITO','TRACK','Aprende primero el circuito; luego busca el límite.','Learn the track first; then chase the limit.'],
  ['track-02','CIRCUITO','TRACK','Identifica las curvas que preceden a rectas largas.','Identify corners that lead onto long straights.'],
  ['track-03','CIRCUITO','TRACK','Una referencia visual hace tu frenada repetible.','A visual marker makes your braking repeatable.'],
  ['track-04','CIRCUITO','TRACK','Usa varias vueltas para descubrir la trazada ideal.','Use several laps to find the ideal line.'],
  ['track-05','CIRCUITO','TRACK','Evita salirte: recuperar velocidad cuesta tiempo.','Stay on track: recovering speed costs time.']
].map(([id,catEs,catEn,es,en,mode=null])=>({id,catEs,catEn,es,en,mode}));

const MODES={
  timeattack:{es:'CONTRARRELOJ',en:'TIME ATTACK'},
  ghost:{es:'FANTASMA',en:'GHOST'},
  survival:{es:'SUPERVIVENCIA',en:'SURVIVAL'},
  duel:{es:'DUELO',en:'DUEL'},
  practice:{es:'ÁREA DE PRUEBAS',en:'TEST AREA'}
};

function language(){return getLanguage()==='en'?'en':'es';}
function safeStorageGet(key,fallback=''){try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function settingsQuality(){try{return String(JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.video?.quality||'high').toUpperCase();}catch{return'HIGH';}}
function selectedMode(){return safeStorageGet('tdr2:gameMode','timeattack');}
function selectedTrackKey(scene){return String(scene?.trackKey||safeStorageGet('tdr2:trackKey','track01')||'track01');}
function selectedCarId(scene){return String(scene?.carId||safeStorageGet('tdr2:carId','avenir_gripline')||'avenir_gripline');}
function modeLabel(mode,lang){return MODES[mode]?.[lang]||String(mode||'').toUpperCase();}
function trackName(scene,key,lang){try{return getTrackPublicName(scene?.track||key,lang)||String(key).replace(/[-_]+/g,' ').toUpperCase();}catch{return String(key).replace(/[-_]+/g,' ').toUpperCase();}}
function carName(scene,id){return String(CAR_SPECS?.[id]?.name||scene?.carName||id).replace(/_/g,' ').toUpperCase();}

function pointsFromTrack(scene,key){
  const fromTrack=scene?.track?.raceCenterline||scene?.track?.centerline||scene?.track?.meta?.centerline;
  const cached=scene?.cache?.json?.get?.(`trackjson:${key}`)||scene?.cache?.json?.get?.('trackjson:track01');
  const raw=Array.isArray(fromTrack)&&fromTrack.length?fromTrack:(cached?.raceCenterline||cached?.centerline||cached?.meta?.centerline||[]);
  return (Array.isArray(raw)?raw:[]).map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
}

function trackSvg(points){
  if(points.length<2)return '<div class="tdr-rload-map-empty">TDR</div>';
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=16,sw=360,sh=210,scale=Math.min((sw-pad*2)/bw,(sh-pad*2)/bh),ox=(sw-bw*scale)/2-minX*scale,oy=(sh-bh*scale)/2-minY*scale;
  const d=points.map((p,i)=>`${i?'L':'M'} ${(p.x*scale+ox).toFixed(1)} ${(p.y*scale+oy).toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 ${sw} ${sh}" aria-hidden="true"><path class="tdr-rload-track-glow" d="${d}"/><path class="tdr-rload-track-road" d="${d}"/><path class="tdr-rload-track-line" d="${d}"/></svg>`;
}

function readRecent(){try{const value=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(value)?value.slice(-RECENT_LIMIT):[];}catch{return[];}}
function rememberTip(id){try{const next=[...readRecent().filter(x=>x!==id),id].slice(-RECENT_LIMIT);localStorage.setItem(RECENT_KEY,JSON.stringify(next));}catch{}}
function chooseTip(mode,avoidId=''){
  const recent=new Set(readRecent());
  let pool=TIPS.filter(t=>!recent.has(t.id)&&t.id!==avoidId&&(t.mode===mode||!t.mode));
  const contextual=pool.filter(t=>t.mode===mode);
  if(contextual.length&&Math.random()<.42)pool=contextual;
  if(!pool.length)pool=TIPS.filter(t=>t.id!==avoidId);
  const tip=pool[Math.floor(Math.random()*pool.length)]||TIPS[0];rememberTip(tip.id);return tip;
}

function ensureStyle(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=`
#${ROOT_ID}{position:fixed;inset:0;z-index:2147483200;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 72% 38%,rgba(36,125,159,.18),transparent 31%),radial-gradient(circle at 18% 75%,rgba(255,168,64,.08),transparent 28%),linear-gradient(135deg,#03080e 0%,#07131d 48%,#050b12 100%);color:#f5fbff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;opacity:1;transition:opacity .22s ease}
#${ROOT_ID}.tdr-rload-out{opacity:0;pointer-events:none}.tdr-rload-shell{position:relative;width:min(94vw,1120px);height:min(88vh,560px);min-height:330px;display:grid;grid-template-columns:minmax(310px,.9fr) minmax(360px,1.1fr);gap:clamp(24px,4vw,58px);align-items:center;padding:clamp(24px,4.3vw,54px);border:1px solid rgba(106,214,255,.22);background:linear-gradient(145deg,rgba(8,19,29,.96),rgba(4,11,18,.93));box-shadow:0 34px 100px rgba(0,0,0,.52),inset 0 1px rgba(255,255,255,.035);clip-path:polygon(0 18px,18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.tdr-rload-shell:before{content:"";position:absolute;left:0;top:0;width:37%;height:3px;background:linear-gradient(90deg,#5fe7ff,rgba(95,231,255,0));box-shadow:0 0 16px rgba(95,231,255,.42)}.tdr-rload-shell:after{content:"";position:absolute;right:0;bottom:0;width:24%;height:2px;background:linear-gradient(90deg,rgba(255,173,71,0),#ffad47)}
.tdr-rload-kicker{font-size:10px;font-weight:900;letter-spacing:.22em;color:#64dcfa}.tdr-rload-title{margin-top:8px;font-size:clamp(28px,4.8vw,58px);line-height:.98;font-weight:950;letter-spacing:-.045em;text-wrap:balance}.tdr-rload-sub{margin-top:11px;color:#8fa9ba;font-size:11px;font-weight:750;letter-spacing:.06em}.tdr-rload-car{margin-top:26px;display:grid;grid-template-columns:102px 1fr;align-items:center;gap:16px;padding:12px 14px;border:1px solid rgba(120,190,220,.14);background:rgba(4,12,19,.62)}.tdr-rload-car img{width:102px;height:64px;object-fit:contain;filter:drop-shadow(0 10px 15px rgba(0,0,0,.55))}.tdr-rload-car small,.tdr-rload-tip small{display:block;color:#6f8b9d;font-size:8px;font-weight:900;letter-spacing:.16em}.tdr-rload-car strong{display:block;margin-top:4px;font-size:15px;font-weight:900}.tdr-rload-map{height:min(35vh,235px);min-height:150px;display:grid;place-items:center;border:1px solid rgba(105,214,255,.12);background:radial-gradient(circle at 50% 50%,rgba(41,104,120,.18),rgba(4,11,17,.3) 58%,rgba(2,7,11,.55));overflow:hidden}.tdr-rload-map svg{width:92%;height:92%}.tdr-rload-track-glow{fill:none;stroke:#5ee9ff;stroke-width:16;opacity:.08;filter:blur(5px)}.tdr-rload-track-road{fill:none;stroke:#223641;stroke-width:10;stroke-linecap:round;stroke-linejoin:round}.tdr-rload-track-line{fill:none;stroke:#d9f8ff;stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.tdr-rload-map-empty{font-size:40px;font-weight:1000;letter-spacing:.12em;color:#183343}
.tdr-rload-phase-row{margin-top:18px;display:flex;justify-content:space-between;align-items:end;gap:16px}.tdr-rload-phase{font-size:12px;font-weight:900;letter-spacing:.11em}.tdr-rload-percent{font:900 22px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#66e6ff}.tdr-rload-track{height:5px;margin-top:10px;background:#10232e;overflow:hidden}.tdr-rload-fill{height:100%;width:4%;background:linear-gradient(90deg,#32bfdc,#7df0ff);box-shadow:0 0 14px rgba(95,231,255,.42);transition:width .22s ease}.tdr-rload-steps{display:flex;gap:6px;margin-top:8px}.tdr-rload-steps i{height:2px;flex:1;background:#18313e;transition:background .18s ease,box-shadow .18s ease}.tdr-rload-steps i.on{background:#5fe7ff;box-shadow:0 0 8px rgba(95,231,255,.44)}
.tdr-rload-tip{margin-top:20px;padding:13px 15px;border-left:2px solid #ffad47;background:linear-gradient(90deg,rgba(255,173,71,.075),rgba(255,173,71,0));min-height:64px}.tdr-rload-tip small{color:#d99c52}.tdr-rload-tip strong{display:block;margin-top:5px;font-size:clamp(13px,1.8vw,18px);line-height:1.25;font-weight:850;color:#f5f7f8}.tdr-rload-foot{position:absolute;right:22px;top:16px;font-size:8px;font-weight:900;letter-spacing:.18em;color:#4e6c7d}
@media(max-width:760px),(max-height:470px){.tdr-rload-shell{width:96vw;height:92vh;min-height:280px;grid-template-columns:42% 58%;gap:14px;padding:18px 22px}.tdr-rload-title{font-size:clamp(24px,6.2vw,39px)}.tdr-rload-sub{font-size:9px;margin-top:7px}.tdr-rload-car{margin-top:13px;grid-template-columns:72px 1fr;padding:8px 10px;gap:10px}.tdr-rload-car img{width:72px;height:44px}.tdr-rload-car strong{font-size:11px}.tdr-rload-map{height:41vh;min-height:118px}.tdr-rload-phase-row{margin-top:10px}.tdr-rload-tip{margin-top:10px;padding:8px 11px;min-height:48px}.tdr-rload-tip strong{font-size:12px}.tdr-rload-foot{display:none}}
`;
  document.head.appendChild(style);
}

function mount(scene){
  if(typeof document==='undefined')return null;
  ensureStyle();
  document.getElementById('tdr-track-loading')?.remove?.();
  document.getElementById(ROOT_ID)?.remove?.();
  const lang=language(),mode=selectedMode(),trackKey=selectedTrackKey(scene),carId=selectedCarId(scene),tip=chooseTip(mode);
  const root=document.createElement('div');root.id=ROOT_ID;
  root.innerHTML=`<div class="tdr-rload-shell"><div><div class="tdr-rload-kicker">TOP DOWN RACE // ${lang==='en'?'RACE READY':'PREPARACIÓN DE CARRERA'}</div><div class="tdr-rload-title" data-track-name>${trackName(scene,trackKey,lang)}</div><div class="tdr-rload-sub"><span data-mode>${modeLabel(mode,lang)}</span> · <span data-surface>${lang==='en'?'TRACK SURFACE':'SUPERFICIE'}</span> · ${settingsQuality()}</div><div class="tdr-rload-car"><img data-car-image src="${BASE}assets/cars/lobby/${encodeURIComponent(carId)}.webp" alt=""><span><small>${lang==='en'?'SELECTED CAR':'COCHE SELECCIONADO'}</small><strong data-car-name>${carName(scene,carId)}</strong></span></div><div class="tdr-rload-tip"><small data-tip-cat>${lang==='en'?tip.catEn:tip.catEs}</small><strong data-tip>${lang==='en'?tip.en:tip.es}</strong></div></div><div><div class="tdr-rload-map" data-map>${trackSvg(pointsFromTrack(scene,trackKey))}</div><div class="tdr-rload-phase-row"><div class="tdr-rload-phase" data-phase>${lang==='en'?'LOADING RESOURCES':'CARGANDO RECURSOS'}</div><div class="tdr-rload-percent" data-percent>00%</div></div><div class="tdr-rload-track"><div class="tdr-rload-fill" data-fill></div></div><div class="tdr-rload-steps">${'<i></i>'.repeat(6)}</div></div><div class="tdr-rload-foot">DEV // LIVE READINESS</div></div>`;
  document.body.appendChild(root);
  const ui={root,lang,mode,trackKey,carId,tipId:tip.id,createdAt:performance.now(),percent:0,done:false,heldStart:null,releaseStart:null,tipTimer:0,raf:0,stableSince:0};
  const rotateTip=()=>{if(ui.done||!root.isConnected)return;const next=chooseTip(mode,ui.tipId);ui.tipId=next.id;const cat=root.querySelector('[data-tip-cat]'),text=root.querySelector('[data-tip]');if(cat)cat.textContent=lang==='en'?next.catEn:next.catEs;if(text)text.textContent=lang==='en'?next.en:next.es;};
  ui.tipTimer=window.setInterval(rotateTip,TIP_ROTATE_MS);
  scene._tdrRaceLoadingExperience=ui;
  return ui;
}

function setProgress(scene,value,phase){
  const ui=scene?._tdrRaceLoadingExperience;if(!ui?.root?.isConnected||ui.done)return;
  const pct=Math.max(ui.percent,Math.min(100,Math.round(Number(value)||0)));ui.percent=pct;
  const fill=ui.root.querySelector('[data-fill]'),percent=ui.root.querySelector('[data-percent]'),label=ui.root.querySelector('[data-phase]');
  if(fill)fill.style.width=`${Math.max(3,pct)}%`;if(percent)percent.textContent=`${String(pct).padStart(2,'0')}%`;if(label&&phase)label.textContent=phase;
  const steps=[...ui.root.querySelectorAll('.tdr-rload-steps i')],on=Math.max(0,Math.min(steps.length,Math.ceil(pct/100*steps.length)));steps.forEach((el,i)=>el.classList.toggle('on',i<on));
}

function refreshMetadata(scene){
  const ui=scene?._tdrRaceLoadingExperience;if(!ui?.root?.isConnected)return;
  const lang=ui.lang,key=selectedTrackKey(scene),id=selectedCarId(scene),track=scene?.track;
  const name=ui.root.querySelector('[data-track-name]'),car=ui.root.querySelector('[data-car-name]'),img=ui.root.querySelector('[data-car-image]'),map=ui.root.querySelector('[data-map]'),surface=ui.root.querySelector('[data-surface]');
  if(name)name.textContent=trackName(scene,key,lang);if(car)car.textContent=carName(scene,id);if(img)img.src=`${BASE}assets/cars/lobby/${encodeURIComponent(id)}.webp`;
  if(map)map.innerHTML=trackSvg(pointsFromTrack(scene,key));
  const dirt=/dirt|tierra|gravel|grava|offroad/i.test(String(track?.surface||track?.meta?.surface||track?.meta?.trackSurface||key));
  if(surface)surface.textContent=dirt?(lang==='en'?'DIRT':'TIERRA'):(lang==='en'?'ASPHALT':'ASFALTO');
}

function expectedVisualCells(scene){
  const cells=scene?.track?.geom?.cells;if(!(cells instanceof Map))return 0;let n=0;for(const cell of cells.values())if(cell?.polys?.length)n++;return n;
}
function readiness(scene){
  const trackReady=!!scene?.track?.geom;
  const envExpected=Array.isArray(scene?._tdrExpectedEnvironmentTextures)&&scene._tdrExpectedEnvironmentTextures.length>0;
  const environmentReady=!envExpected||scene?._tdrEnvironmentReady===true;
  const expected=expectedVisualCells(scene),gfx=scene?.track?.gfxByCell,visualCount=gfx instanceof Map?gfx.size:0;
  const visualReady=expected===0||visualCount>=Math.min(expected,6);
  const carReady=!!(scene?.carBody?.body||scene?.car?.body);
  const hudReady=!!(scene?.raceInfoHud?.scene||scene?.ttHud||scene?.hud||scene?.minimap||scene?.minimapUnifiedPanel?.scene);
  const startReady=!!(scene?._startModal?.scene||scene?._startState);
  return{trackReady,environmentReady,visualReady,carReady,hudReady,startReady,ready:trackReady&&environmentReady&&visualReady&&carReady&&hudReady&&startReady};
}

function finish(scene){
  const ui=scene?._tdrRaceLoadingExperience;if(!ui||ui.done)return;ui.done=true;
  const phase=ui.lang==='en'?'READY TO RACE':'LISTO PARA CORRER';setProgress(scene,100,phase);
  // setProgress stops after done, so force the final visual state explicitly.
  const fill=ui.root?.querySelector?.('[data-fill]'),percent=ui.root?.querySelector?.('[data-percent]'),label=ui.root?.querySelector?.('[data-phase]');
  if(fill)fill.style.width='100%';if(percent)percent.textContent='100%';if(label)label.textContent=phase;ui.root?.querySelectorAll?.('.tdr-rload-steps i')?.forEach?.(el=>el.classList.add('on'));
  window.setTimeout(()=>{
    try{ui.root?.classList?.add('tdr-rload-out');}catch{}
    window.setTimeout(()=>{try{ui.root?.remove?.();}catch{}},230);
    try{ui.releaseStart?.();}catch(err){console.warn('[race-loading] start release failed',err);}
  },READY_MIN_MS);
}

function startReadinessGate(scene){
  const ui=scene?._tdrRaceLoadingExperience;if(!ui)return;
  refreshMetadata(scene);setProgress(scene,44,ui.lang==='en'?'BUILDING TRACK':'PREPARANDO PISTA');
  const tick=()=>{
    if(!ui.root?.isConnected||ui.done)return;
    const r=readiness(scene),elapsed=performance.now()-ui.createdAt;
    if(!r.trackReady)setProgress(scene,48,ui.lang==='en'?'BUILDING TRACK':'PREPARANDO PISTA');
    else if(!r.environmentReady)setProgress(scene,62,ui.lang==='en'?'APPLYING COLLISIONS':'APLICANDO COLISIONES');
    else if(!r.visualReady)setProgress(scene,76,ui.lang==='en'?'DRAWING CIRCUIT':'DIBUJANDO CIRCUITO');
    else if(!r.carReady)setProgress(scene,84,ui.lang==='en'?'PREPARING CAR':'PREPARANDO COCHE');
    else if(!r.hudReady)setProgress(scene,91,ui.lang==='en'?'STARTING HUD':'INICIANDO HUD');
    else if(!r.startReady)setProgress(scene,96,ui.lang==='en'?'PREPARING START':'PREPARANDO SALIDA');
    else setProgress(scene,98,ui.lang==='en'?'CHECKING START':'COMPROBANDO SALIDA');
    if(r.ready){if(!ui.stableSince)ui.stableSince=performance.now();if(performance.now()-ui.stableSince>=120){finish(scene);return;}}else ui.stableSince=0;
    if(elapsed>=READY_TIMEOUT_MS){console.warn('[race-loading] readiness timeout; releasing race',r);finish(scene);return;}
    ui.raf=requestAnimationFrame(tick);
  };
  ui.raf=requestAnimationFrame(tick);
}

function cleanup(scene){
  const ui=scene?._tdrRaceLoadingExperience;if(!ui)return;
  ui.done=true;try{cancelAnimationFrame(ui.raf);}catch{}try{window.clearInterval(ui.tipTimer);}catch{}try{ui.root?.remove?.();}catch{}scene._tdrRaceLoadingExperience=null;
}

function holdAutomaticStart(scene,originalCreate,args){
  const clock=scene?.time;if(!clock||typeof clock.delayedCall!=='function')return originalCreate?.apply(scene,args);
  const original=clock.delayedCall.bind(clock);let held=null;
  clock.delayedCall=function(delay,callback,cbArgs,scope){
    let startCall=false;try{const src=String(callback);startCall=Number(delay)===150&&src.includes('_startState')&&src.includes('_startAutoFired')&&(src.includes('COUNTDOWN')||src.includes('RED LIGHTS'));}catch{}
    if(!held&&startCall){
      let cancelled=false;held=()=>{if(cancelled)return;cancelled=true;original(0,callback,cbArgs,scope);};
      const fake={remove:()=>{cancelled=true;},destroy:()=>{cancelled=true;},getProgress:()=>0,hasDispatched:false};
      return fake;
    }
    return original(delay,callback,cbArgs,scope);
  };
  let result;try{result=originalCreate?.apply(scene,args);}finally{clock.delayedCall=original;}
  const ui=scene._tdrRaceLoadingExperience;
  if(held&&ui){scene._startAutoFired=true;scene._raceStarted=false;scene._startState='COUNTDOWN';ui.releaseStart=()=>{scene._startAutoFired=false;held();};}
  return result;
}

export function installRaceLoadingExperience(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;if(!proto||proto.__tdrRaceLoadingExperienceInstalled)return;
  const originalPreload=proto.preload;
  proto.preload=function(...args){
    const result=originalPreload?.apply(this,args);
    try{this._destroyRaceLoadingUi?.();document.getElementById('tdr-track-loading')?.remove?.();const ui=mount(this);if(ui){const onProgress=p=>setProgress(this,Math.round((Number(p)||0)*34),ui.lang==='en'?'LOADING RESOURCES':'CARGANDO RECURSOS');const onError=()=>setProgress(this,Math.max(8,ui.percent),ui.lang==='en'?'RETRYING RESOURCES':'REINTENTANDO RECURSOS');const onComplete=()=>setProgress(this,36,ui.lang==='en'?'RESOURCES READY':'RECURSOS LISTOS');this.load?.on?.('progress',onProgress);this.load?.on?.('loaderror',onError);this.load?.once?.('complete',onComplete);ui.loaderCleanup=()=>{try{this.load?.off?.('progress',onProgress);}catch{}try{this.load?.off?.('loaderror',onError);}catch{}try{this.load?.off?.('complete',onComplete);}catch{}};}}catch(err){console.warn('[race-loading] preload UI failed',err);}return result;
  };
  const originalCreate=proto.create;
  proto.create=function(...args){
    let result;try{result=holdAutomaticStart(this,originalCreate,args);}catch(err){console.warn('[race-loading] create gate failed',err);result=originalCreate?.apply(this,args);}
    try{document.getElementById('tdr-track-loading')?.remove?.();this._tdrRaceLoadingExperience?.loaderCleanup?.();startReadinessGate(this);}catch(err){console.warn('[race-loading] readiness setup failed',err);try{finish(this);}catch{}}
    const clean=()=>cleanup(this);this.events?.once?.('shutdown',clean);this.events?.once?.('destroy',clean);return result;
  };
  proto.__tdrRaceLoadingExperienceInstalled=true;
}
