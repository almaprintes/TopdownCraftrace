import { CAR_SPECS } from '../cars/carSpecs.js';
import { getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';

const BASE=import.meta.env.BASE_URL||'/';
const ROOT_ID='tdr-race-loading-experience';
const STYLE_ID='tdr-race-loading-experience-style-v2';
const RECENT_KEY='tdr2:raceLoadingTipsRecent';
const RECENT_LIMIT=7;
const TIP_ROTATE_MS=9500;
const READY_TIMEOUT_MS=6500;
const READY_STABLE_MS=140;

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

const MODES={timeattack:{es:'CONTRARRELOJ',en:'TIME ATTACK'},ghost:{es:'FANTASMA',en:'GHOST'},survival:{es:'SUPERVIVENCIA',en:'SURVIVAL'},duel:{es:'DUELO',en:'DUEL'},practice:{es:'ÁREA DE PRUEBAS',en:'TEST AREA'}};
function language(){return getLanguage()==='en'?'en':'es';}
function safeGet(k,f=''){try{return localStorage.getItem(k)||f;}catch{return f;}}
function quality(){try{return String(JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.video?.quality||'high').toUpperCase();}catch{return'HIGH';}}
function mode(){return safeGet('tdr2:gameMode','timeattack');}
function trackKey(scene){return String(scene?.trackKey||safeGet('tdr2:trackKey','track01')||'track01');}
function carId(scene){return String(scene?.carId||safeGet('tdr2:carId','avenir_gripline')||'avenir_gripline');}
function modeName(v,l){return MODES[v]?.[l]||String(v||'').toUpperCase();}
function trackName(scene,key,l){try{return getTrackPublicName(scene?.track||key,l)||key.replace(/[-_]+/g,' ').toUpperCase();}catch{return key.replace(/[-_]+/g,' ').toUpperCase();}}
function carName(scene,id){return String(CAR_SPECS?.[id]?.name||scene?.carName||id).replace(/_/g,' ').toUpperCase();}
function pointsFromTrack(scene,key){
  const live=scene?.track?.raceCenterline||scene?.track?.centerline||scene?.track?.meta?.centerline;
  const reg=TRACK_REGISTRY?.[key];
  const raw=(Array.isArray(live)&&live.length?live:(reg?.raceCenterline||reg?.centerline||reg?.meta?.centerline||[]));
  return (Array.isArray(raw)?raw:[]).map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
}
function trackSvg(points){
  if(points.length<2)return '<div class="tdr-rload-map-empty">SIN VISTA PREVIA</div>';
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),sw=520,sh=260,pad=18,scale=Math.min((sw-pad*2)/bw,(sh-pad*2)/bh),ox=(sw-bw*scale)/2-minX*scale,oy=(sh-bh*scale)/2-minY*scale;
  const d=points.map((p,i)=>`${i?'L':'M'} ${(p.x*scale+ox).toFixed(1)} ${(p.y*scale+oy).toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 ${sw} ${sh}" aria-hidden="true"><path class="tdr-rload-track-glow" d="${d}"/><path class="tdr-rload-track-road" d="${d}"/><path class="tdr-rload-track-line" d="${d}"/></svg>`;
}
function recent(){try{const v=JSON.parse(localStorage.getItem(RECENT_KEY)||'[]');return Array.isArray(v)?v.slice(-RECENT_LIMIT):[];}catch{return[];}}
function remember(id){try{localStorage.setItem(RECENT_KEY,JSON.stringify([...recent().filter(x=>x!==id),id].slice(-RECENT_LIMIT)));}catch{}}
function chooseTip(m,avoid=''){const seen=new Set(recent());let pool=TIPS.filter(t=>!seen.has(t.id)&&t.id!==avoid&&(t.mode===m||!t.mode));const ctx=pool.filter(t=>t.mode===m);if(ctx.length&&Math.random()<.42)pool=ctx;if(!pool.length)pool=TIPS.filter(t=>t.id!==avoid);const t=pool[Math.floor(Math.random()*pool.length)]||TIPS[0];remember(t.id);return t;}
function ensureStyle(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  document.getElementById('tdr-race-loading-experience-style')?.remove?.();
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
#${ROOT_ID}{position:fixed;inset:0;z-index:2147483200;display:grid;place-items:center;overflow:hidden;background:radial-gradient(circle at 72% 38%,rgba(36,125,159,.18),transparent 31%),radial-gradient(circle at 18% 75%,rgba(255,168,64,.08),transparent 28%),linear-gradient(135deg,#03080e 0%,#07131d 48%,#050b12 100%);color:#f5fbff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;opacity:1;transition:opacity .22s ease}
#${ROOT_ID}.tdr-rload-out{opacity:0;pointer-events:none}.tdr-rload-shell{position:relative;width:min(96vw,1260px);height:min(90vh,650px);min-height:340px;display:grid;grid-template-columns:minmax(340px,.88fr) minmax(430px,1.12fr);gap:clamp(26px,4vw,62px);align-items:center;padding:clamp(24px,4vw,54px);border:1px solid rgba(106,214,255,.22);background:linear-gradient(145deg,rgba(8,19,29,.97),rgba(4,11,18,.95));box-shadow:0 34px 100px rgba(0,0,0,.52);clip-path:polygon(0 18px,18px 0,100% 0,100% calc(100% - 18px),calc(100% - 18px) 100%,0 100%)}
.tdr-rload-shell:before{content:"";position:absolute;left:0;top:0;width:37%;height:3px;background:linear-gradient(90deg,#5fe7ff,rgba(95,231,255,0));box-shadow:0 0 16px rgba(95,231,255,.42)}
.tdr-rload-kicker{font-size:11px;font-weight:900;letter-spacing:.22em;color:#64dcfa}.tdr-rload-title{margin-top:8px;font-size:clamp(30px,4.6vw,62px);line-height:.98;font-weight:950;letter-spacing:-.045em}.tdr-rload-sub{margin-top:12px;color:#8fa9ba;font-size:12px;font-weight:800;letter-spacing:.06em}
.tdr-rload-car{margin-top:24px;display:grid;grid-template-columns:170px 1fr;align-items:center;gap:18px;padding:12px 16px;min-height:112px;border:1px solid rgba(120,190,220,.16);background:rgba(4,12,19,.62);overflow:visible}.tdr-rload-car-visual{height:104px;display:grid;place-items:center;overflow:visible}.tdr-rload-car img{width:170px;height:104px;object-fit:contain;transform:scale(1.32);filter:drop-shadow(0 12px 18px rgba(0,0,0,.65))}.tdr-rload-car small,.tdr-rload-tip small{display:block;color:#7e99aa;font-size:10px;font-weight:900;letter-spacing:.16em}.tdr-rload-car strong{display:block;margin-top:6px;font-size:18px;font-weight:950}
.tdr-rload-tip{margin-top:20px;padding:16px 18px;border-left:3px solid #ffad47;background:linear-gradient(90deg,rgba(255,173,71,.085),rgba(255,173,71,0));min-height:88px}.tdr-rload-tip small{color:#e3a65e}.tdr-rload-tip strong{display:block;margin-top:7px;font-size:clamp(17px,1.7vw,24px);line-height:1.28;font-weight:850;color:#f8fafb}
.tdr-rload-map{height:min(39vh,290px);min-height:180px;display:grid;place-items:center;border:1px solid rgba(105,214,255,.16);background:radial-gradient(circle at 50% 50%,rgba(41,104,120,.19),rgba(4,11,17,.34) 58%,rgba(2,7,11,.58));overflow:hidden}.tdr-rload-map svg{width:96%;height:94%}.tdr-rload-track-glow{fill:none;stroke:#5ee9ff;stroke-width:20;opacity:.12;filter:blur(5px)}.tdr-rload-track-road{fill:none;stroke:#244652;stroke-width:13;stroke-linecap:round;stroke-linejoin:round}.tdr-rload-track-line{fill:none;stroke:#dffaff;stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round}.tdr-rload-map-empty{font-size:13px;font-weight:900;letter-spacing:.18em;color:#315264}
.tdr-rload-phase-row{margin-top:20px;display:flex;justify-content:space-between;align-items:end;gap:16px}.tdr-rload-phase{font-size:14px;font-weight:950;letter-spacing:.11em}.tdr-rload-percent{font:950 28px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#66e6ff}.tdr-rload-track{height:7px;margin-top:11px;background:#10232e;overflow:hidden}.tdr-rload-fill{height:100%;width:3%;background:linear-gradient(90deg,#32bfdc,#7df0ff);box-shadow:0 0 14px rgba(95,231,255,.42);transition:width .18s ease}.tdr-rload-steps{display:flex;gap:7px;margin-top:9px}.tdr-rload-steps i{height:3px;flex:1;background:#18313e}.tdr-rload-steps i.on{background:#5fe7ff;box-shadow:0 0 8px rgba(95,231,255,.44)}
@media(max-width:820px),(max-height:500px){.tdr-rload-shell{width:97vw;height:94vh;min-height:290px;grid-template-columns:43% 57%;gap:16px;padding:18px 22px}.tdr-rload-title{font-size:clamp(25px,5.8vw,42px)}.tdr-rload-sub{font-size:10px;margin-top:7px}.tdr-rload-car{margin-top:12px;grid-template-columns:118px 1fr;min-height:82px;padding:7px 10px;gap:9px}.tdr-rload-car-visual{height:78px}.tdr-rload-car img{width:122px;height:78px;transform:scale(1.38)}.tdr-rload-car small{font-size:8px}.tdr-rload-car strong{font-size:13px}.tdr-rload-tip{margin-top:10px;padding:10px 12px;min-height:64px}.tdr-rload-tip small{font-size:8px}.tdr-rload-tip strong{font-size:clamp(14px,2.2vw,18px)}.tdr-rload-map{height:43vh;min-height:138px}.tdr-rload-phase-row{margin-top:10px}.tdr-rload-phase{font-size:11px}.tdr-rload-percent{font-size:23px}}
`;document.head.appendChild(s);
}
function mount(scene){
  if(typeof document==='undefined')return null;ensureStyle();document.getElementById('tdr-track-loading')?.remove?.();document.getElementById(ROOT_ID)?.remove?.();
  const lang=language(),m=mode(),key=trackKey(scene),id=carId(scene),tip=chooseTip(m),root=document.createElement('div');root.id=ROOT_ID;
  root.innerHTML=`<div class="tdr-rload-shell"><div><div class="tdr-rload-kicker">TOP DOWN RACE // ${lang==='en'?'RACE READY':'PREPARACIÓN DE CARRERA'}</div><div class="tdr-rload-title" data-track-name>${trackName(scene,key,lang)}</div><div class="tdr-rload-sub"><span data-mode>${modeName(m,lang)}</span> · <span data-surface>${lang==='en'?'TRACK SURFACE':'SUPERFICIE'}</span> · ${quality()}</div><div class="tdr-rload-car"><div class="tdr-rload-car-visual"><img data-car-image src="${BASE}assets/cars/lobby/${encodeURIComponent(id)}.webp" alt=""></div><span><small>${lang==='en'?'SELECTED CAR':'COCHE SELECCIONADO'}</small><strong data-car-name>${carName(scene,id)}</strong></span></div><div class="tdr-rload-tip"><small data-tip-cat>${lang==='en'?tip.catEn:tip.catEs}</small><strong data-tip>${lang==='en'?tip.en:tip.es}</strong></div></div><div><div class="tdr-rload-map" data-map>${trackSvg(pointsFromTrack(scene,key))}</div><div class="tdr-rload-phase-row"><div class="tdr-rload-phase" data-phase>${lang==='en'?'LOADING RESOURCES':'CARGANDO RECURSOS'}</div><div class="tdr-rload-percent" data-percent>00%</div></div><div class="tdr-rload-track"><div class="tdr-rload-fill" data-fill></div></div><div class="tdr-rload-steps">${'<i></i>'.repeat(6)}</div></div></div>`;
  document.body.appendChild(root);
  const ui={root,lang,mode:m,trackKey:key,carId:id,tipId:tip.id,createdAt:performance.now(),percent:0,done:false,tipTimer:0,raf:0,stableSince:0,pausedClock:false};
  ui.tipTimer=window.setInterval(()=>{if(ui.done||!root.isConnected)return;const next=chooseTip(m,ui.tipId);ui.tipId=next.id;const c=root.querySelector('[data-tip-cat]'),t=root.querySelector('[data-tip]');if(c)c.textContent=lang==='en'?next.catEn:next.catEs;if(t)t.textContent=lang==='en'?next.en:next.es;},TIP_ROTATE_MS);
  scene._tdrRaceLoadingExperience=ui;return ui;
}
function setProgress(scene,value,phase){const ui=scene?._tdrRaceLoadingExperience;if(!ui?.root?.isConnected||ui.done)return;const pct=Math.max(ui.percent,Math.min(100,Math.round(Number(value)||0)));ui.percent=pct;const fill=ui.root.querySelector('[data-fill]'),p=ui.root.querySelector('[data-percent]'),label=ui.root.querySelector('[data-phase]');if(fill)fill.style.width=`${Math.max(3,pct)}%`;if(p)p.textContent=`${String(pct).padStart(2,'0')}%`;if(label&&phase)label.textContent=phase;const steps=[...ui.root.querySelectorAll('.tdr-rload-steps i')],on=Math.max(0,Math.min(steps.length,Math.ceil(pct/100*steps.length)));steps.forEach((el,i)=>el.classList.toggle('on',i<on));}
function refresh(scene){const ui=scene?._tdrRaceLoadingExperience;if(!ui?.root?.isConnected)return;const key=trackKey(scene),id=carId(scene),lang=ui.lang,track=scene?.track||TRACK_REGISTRY?.[key];const name=ui.root.querySelector('[data-track-name]'),car=ui.root.querySelector('[data-car-name]'),img=ui.root.querySelector('[data-car-image]'),map=ui.root.querySelector('[data-map]'),surface=ui.root.querySelector('[data-surface]');if(name)name.textContent=trackName(scene,key,lang);if(car)car.textContent=carName(scene,id);if(img)img.src=`${BASE}assets/cars/lobby/${encodeURIComponent(id)}.webp`;if(map)map.innerHTML=trackSvg(pointsFromTrack(scene,key));const dirt=/dirt|tierra|gravel|grava|offroad/i.test(String(track?.surface||track?.meta?.surface||track?.meta?.trackSurface||''));if(surface)surface.textContent=dirt?(lang==='en'?'DIRT':'TIERRA'):(lang==='en'?'ASPHALT':'ASFALTO');}
function readiness(scene){const trackReady=!!scene?.track?.geom;const envExpected=Array.isArray(scene?._tdrExpectedEnvironmentTextures)&&scene._tdrExpectedEnvironmentTextures.length>0;const environmentReady=!envExpected||scene?._tdrEnvironmentReady===true;const carReady=!!(scene?.carBody?.body||scene?.car?.body);const hudReady=!!(scene?.raceInfoHud?.scene||scene?.ttHud||scene?.hud||scene?.minimap||scene?.minimapUnifiedPanel?.scene);const startReady=!!(scene?._startModal?.scene||scene?._startState);return{trackReady,environmentReady,carReady,hudReady,startReady,ready:trackReady&&environmentReady&&carReady&&hudReady&&startReady};}
function cleanup(scene){const ui=scene?._tdrRaceLoadingExperience;if(!ui)return;ui.done=true;try{cancelAnimationFrame(ui.raf);}catch{}try{clearInterval(ui.tipTimer);}catch{}if(ui.pausedClock){try{scene.time.paused=false;}catch{}}try{ui.root?.remove?.();}catch{}scene._tdrRaceLoadingExperience=null;}
function finish(scene){const ui=scene?._tdrRaceLoadingExperience;if(!ui||ui.done)return;const phase=ui.lang==='en'?'READY TO RACE':'LISTO PARA CORRER';setProgress(scene,100,phase);ui.done=true;if(ui.pausedClock){try{scene.time.paused=false;}catch{}ui.pausedClock=false;}const fill=ui.root?.querySelector?.('[data-fill]'),p=ui.root?.querySelector?.('[data-percent]'),label=ui.root?.querySelector?.('[data-phase]');if(fill)fill.style.width='100%';if(p)p.textContent='100%';if(label)label.textContent=phase;ui.root?.querySelectorAll?.('.tdr-rload-steps i')?.forEach?.(el=>el.classList.add('on'));setTimeout(()=>{ui.root?.classList?.add('tdr-rload-out');setTimeout(()=>ui.root?.remove?.(),230);},190);}
function startGate(scene){const ui=scene?._tdrRaceLoadingExperience;if(!ui)return;refresh(scene);try{scene.time.paused=true;ui.pausedClock=true;}catch{}setProgress(scene,60,ui.lang==='en'?'BUILDING TRACK':'PREPARANDO PISTA');const gateStarted=performance.now();const tick=()=>{if(!ui.root?.isConnected||ui.done)return;const r=readiness(scene),elapsed=performance.now()-gateStarted;if(!r.trackReady)setProgress(scene,64,ui.lang==='en'?'BUILDING TRACK':'PREPARANDO PISTA');else if(!r.environmentReady)setProgress(scene,74,ui.lang==='en'?'APPLYING COLLISIONS':'APLICANDO COLISIONES');else if(!r.carReady)setProgress(scene,84,ui.lang==='en'?'PREPARING CAR':'PREPARANDO COCHE');else if(!r.hudReady)setProgress(scene,92,ui.lang==='en'?'STARTING HUD':'INICIANDO HUD');else if(!r.startReady)setProgress(scene,97,ui.lang==='en'?'PREPARING START':'PREPARANDO SALIDA');else setProgress(scene,99,ui.lang==='en'?'FINAL CHECK':'COMPROBACIÓN FINAL');if(r.ready){if(!ui.stableSince)ui.stableSince=performance.now();if(performance.now()-ui.stableSince>=READY_STABLE_MS){finish(scene);return;}}else ui.stableSince=0;if(elapsed>=READY_TIMEOUT_MS){console.warn('[race-loading] readiness timeout; releasing race',r);finish(scene);return;}ui.raf=requestAnimationFrame(tick);};ui.raf=requestAnimationFrame(tick);}
export function installRaceLoadingExperience(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;if(!proto||proto.__tdrRaceLoadingExperienceV2Installed)return;
  const originalPreload=proto.preload;proto.preload=function(...args){const result=originalPreload?.apply(this,args);try{this._destroyRaceLoadingUi?.();const ui=mount(this);if(ui){const progress=v=>setProgress(this,Math.round((Number(v)||0)*54),ui.lang==='en'?'LOADING RESOURCES':'CARGANDO RECURSOS');const complete=()=>setProgress(this,56,ui.lang==='en'?'RESOURCES READY':'RECURSOS LISTOS');const error=()=>setProgress(this,Math.max(6,ui.percent),ui.lang==='en'?'RESOURCE ERROR':'ERROR DE RECURSO');this.load?.on?.('progress',progress);this.load?.once?.('complete',complete);this.load?.on?.('loaderror',error);ui.loaderCleanup=()=>{try{this.load?.off?.('progress',progress);}catch{}try{this.load?.off?.('complete',complete);}catch{}try{this.load?.off?.('loaderror',error);}catch{}};}}catch(err){console.warn('[race-loading] preload UI failed',err);}return result;};
  const originalCreate=proto.create;proto.create=function(...args){let result;try{result=originalCreate?.apply(this,args);}catch(err){console.error('[race-loading] race create failed',err);cleanup(this);throw err;}try{this._tdrRaceLoadingExperience?.loaderCleanup?.();startGate(this);}catch(err){console.warn('[race-loading] readiness setup failed',err);finish(this);}const clean=()=>cleanup(this);this.events?.once?.('shutdown',clean);this.events?.once?.('destroy',clean);return result;};
  proto.__tdrRaceLoadingExperienceV2Installed=true;
}
