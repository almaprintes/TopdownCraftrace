import Phaser from 'phaser';
import { IS_PROD_BUILD } from '../buildTarget.js';
import { supportDiagnosticsEnabled } from '../support/supportRaceDiagnostics.js';
import { THERMAL_TOUCH_LEVELS, loadPreviousRaceMeasurement, savePreviousRaceMeasurement, localMeasurementTime, formatMeasurementDuration, previousMeasurementContext } from '../support/raceMeasurementContext.js';
import { IOS_WEBGL_SYNC_KEY } from '../performance/iosWebglPresentationMode.js';
import { IOS_DEV_RESOLUTION_KEY } from '../performance/iosDevResolutionTrial.js';
import { createFramePacingStats, recordFramePacing, percentileFramePacing } from '../performance/iosFramePacingStats.js';
import { getDevRaceTextRenderMode, setDevRaceTextRenderMode } from '../ui/htmlTextRuntime.js';

// On-device DEV diagnostic, OFF until opened. Real Phaser game events rather
// than a second requestAnimationFrame loop or a fake "FPS" approximation.
const isIos=()=>{try{return /iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;}catch{return false;}};
const style=(node,css)=>{node.style.cssText=css;return node;};
const freshWindow=()=>({started:performance.now(),count:0,frameSum:0,frameMax:0,sceneSum:0,sceneMax:0,sceneSamples:0,stepSum:0,stepMax:0,stepSamples:0,renderSum:0,renderMax:0,otherSum:0,otherMax:0,otherSamples:0,over33:0,over50:0,lastSpike:0,pacing:createFramePacingStats()});
const avg=(sum,count)=>count?sum/count:0;
const ms=n=>n.toFixed(1);
const sampled=(sum,max,count)=>count?ms(avg(sum,count))+' / '+ms(max)+' ms':'SIN MUESTRAS';
const videoProbeEnabled=()=>{try{return JSON.parse(localStorage.getItem('tdr2:settings')||'{}')?.video?.showFPS===true;}catch{return false;}};
const safeModeDetails=()=>{
  try{
    const manual=localStorage.getItem('tdr2:forceIosSafeMode')==='1';
    const until=Number(localStorage.getItem('tdr2:autoIosSafeModeUntil')||0);
    const auto=Number.isFinite(until)&&until>Date.now();
    return manual?'MANUAL (forzado)':auto?'AUTO hasta '+new Date(until).toLocaleTimeString():'INACTIVO';
  }catch{return 'DESCONOCIDO';}
};
const engineStatus=scene=>{
  const engine=scene._tdrEngineSample;
  const data=engine?.getDevEngineAudioStatus?.();
  if(!data)return 'AUDIO MOTOR '+(engine?.engineStarted?'ON':'OFF')+' · CONTEXTO '+(engine?._ctx?.state||'sin contexto');
  const sourceCount=data.ready?data.sources:'cargando';
  return 'AUDIO MOTOR '+(data.diagnosticSuspended?'OFF':'ON')+' · CONTEXTO '+data.state+' · FUENTES '+sourceCount+' · '+data.mode;
};
const frameInfo=scene=>{
  const conf=window.__tdrIosFrameConfig||{},devIos=!IS_PROD_BUILD&&isIos();
  const context=scene.game?.renderer?.gl?.getContextAttributes?.();
  const actual=typeof context?.desynchronized==='boolean'?(context.desynchronized?'DESYNC':'SYNC'):'NO DISPONIBLE';
  const preset=devIos?conf.preset:window.__tdrVideoPreset;
  const resolution=devIos?conf.renderResolution:window.__tdrRenderResolution;
  const limit=devIos?conf.frameLimit:scene.game?.config?.fps?.limit;
  const line=`MODO ${preset||'?'}  RES ${resolution||'?'}  FPS limit ${limit??'?'}`;
  if(!devIos)return line+'\nWEBGL '+actual+' real · FPS HUD '+(videoProbeEnabled()?'ON':'OFF');
  return line+` · RES ${conf.resolutionTrialMode==='LOW'?'PRUEBA 1.0':'BASE '+(conf.baseRenderResolution??'?')}\nWEBGL ${conf.webglDesyncRequested?'DESYNC':'SYNC'} solicitado · ${actual} real\nSAFE ${conf.safeMode?'SI':'NO'} (${safeModeDetails()}) · TIMER ${conf.forceSetTimeOut?'SI':'NO'} · FPS HUD ${videoProbeEnabled()?'ON':'OFF'}`;
};
// Extra information is sampled on demand, never on every animation frame.
const contextLines=(w,scene,state,nowWall)=> {
  const pageAge=Math.max(0,performance.now());
  const raceAge=Math.max(0,performance.now()-state.raceMountedAt);
  const prev=state.previous;
  const thermalNow=THERMAL_TOUCH_LEVELS[state.thermalIndex]||THERMAL_TOUCH_LEVELS[0];
  const label=s=>s==null?'NO DISPONIBLE':s;
  const fps=w.count&&w.frameSum>0?1000/avg(w.frameSum,w.count):null;
  const prevDelta=prev&&Number.isFinite(prev.fps)&&fps!=null
    ?' · FPS '+(fps-prev.fps>=0?'+':'')+(fps-prev.fps).toFixed(1)+' vs anterior'
    :'';
  const duration=Math.max(0,nowWall-state.measurementStartedAt);
  const hiddenTotal=state.hiddenTotalMs+(state.hiddenSince>0?Math.max(0,performance.now()-state.hiddenSince):0);
  const track=scene.track||{};
  const trackName=[track?.meta?.name,track?.name,track?.id,scene?.trackId].find(v=>typeof v==='string'&&v.trim());
  const deviceMemory=Number(navigator?.deviceMemory);
  return [
    'FECHA INICIO '+localMeasurementTime(state.measurementStartedAt),
    'FECHA ACTUAL '+localMeasurementTime(nowWall),
    'DURACIÓN '+formatMeasurementDuration(duration)+' · sesión app '+formatMeasurementDuration(pageAge)+' · carrera '+formatMeasurementDuration(raceAge),
    previousMeasurementContext(prev,state.measurementStartedAt)+prevDelta,
    'CALOR AL TACTO (MANUAL): inicio '+state.thermalAtStart+' · ahora '+thermalNow+' · SIN SENSOR TÉRMICO',
    'CIRCUITO '+(trackName||'NO DISPONIBLE')+' · DPR '+label(window.devicePixelRatio)+' · RAM estimada '+(Number.isFinite(deviceMemory)&&deviceMemory>0?deviceMemory+' GB':'NO DISPONIBLE'),
    'SEGUNDO PLANO '+state.hiddenCount+' salidas · '+formatMeasurementDuration(hiddenTotal)+' acumulados',
    'BATERÍA '+(state.batteryReading||'NO DISPONIBLE EN ESTE NAVEGADOR')
  ];
};
const metrics=(w,scene,mode,state,nowWall=Date.now())=>[
  'PERF '+(isIos()?'iOS':/Android/i.test(String(navigator?.userAgent||''))?'Android':'dispositivo')+' · '+mode,
  'FOTOGRAMAS  '+w.count+'  '+(avg(w.frameSum,w.count)>0?ms(1000/avg(w.frameSum,w.count)):'--')+' FPS',
  'FRAME      '+ms(avg(w.frameSum,w.count))+' / '+ms(w.frameMax)+' ms',
  'ESCENA CPU '+sampled(w.sceneSum,w.sceneMax,w.sceneSamples),
  'PASO CPU   '+sampled(w.stepSum,w.stepMax,w.stepSamples),
  'RENDER CPU '+ms(avg(w.renderSum,w.count))+' / '+ms(w.renderMax)+' ms',
  'OTROS      '+sampled(w.otherSum,w.otherMax,w.otherSamples),
  '>33ms '+w.over33+' · >50ms '+w.over50+' · último '+ms(w.lastSpike)+'ms',
  'P95/P99   '+(w.pacing.samples?percentileFramePacing(w.pacing,.95)+' / '+percentileFramePacing(w.pacing,.99)+' ms (aprox.)':'SIN MUESTRAS'),
  'RÁFAGAS >50ms '+w.pacing.over50Runs+' · máx '+w.pacing.longestOver50+' seguidos · >33 máx '+w.pacing.longestOver33,
  'TILES '+(scene._trackBeautyTiles?.length||0)+' · NO mide GPU directamente',
  frameInfo(scene),
  engineStatus(scene),
  (()=>{const t=getDevRaceTextRenderMode();return 'TEXTOS '+t.mode+' · RAF '+(t.rafActive?'ON':'OFF')+' · nodos '+(t.registered??'?');})(),
  ...contextLines(w,scene,state,nowWall)
].join('\n');

// Game PRE_STEP/POST_STEP and scene PRE_UPDATE/POST_UPDATE events are
// reliable measurements even when Phaser cached the update callback before
// a late prototype patch. No Scene.update monkey-patching is needed.
//
// PASO CPU measures the global Phaser game step (all active scenes/systems).
// ESCENA CPU covers this race scene's PRE_UPDATE through POST_UPDATE,
// including its physics, Scene.update and post-update event listeners.
// These are synchronous JS intervals, not direct GPU measurements.

// Testing with photo OFF is intentionally brief: it hides only photo sprites,
// not authored geometry/collision, so the road will be invisible.
export function mountRaceDevFrameDiagnostics(scene){
  if(typeof document==='undefined'||!scene?.game?.events||!supportDiagnosticsEnabled(sessionStorage))return null;
  const host=document.body;
  // This overlay must never cover the lower-left touch steering area in landscape.
  // Keep actions in a tiny top toolbar, cap the details, and measure while folded.
  const root=style(document.createElement('div'),'position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:7px;z-index:2147483000;font:700 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;pointer-events:none;width:min(300px,90vw);max-width:90vw');
  root.id='tdr-race-perf-diagnostic';
  const trigger=style(document.createElement('button'),'pointer-events:auto;padding:7px 11px;background:#101d29e8;color:#fff;border:1px solid #88b9cb;border-radius:8px;font:800 12px system-ui;min-height:35px');
  trigger.type='button';trigger.textContent='MEDIR';
  const toolbar=style(document.createElement('div'),'display:flex;align-items:center;gap:5px;flex-wrap:nowrap;pointer-events:auto');
  toolbar.appendChild(trigger);root.appendChild(toolbar);
  // Restrict BOTH the full panel and its scrollable contents. The touch stick
  // remains usable even on a compact iPhone held sideways.
  const panel=style(document.createElement('div'),'display:none;margin-top:4px;padding:7px;border:1px solid #94aabb;border-radius:8px;background:rgba(3,12,22,.93);pointer-events:auto;box-shadow:0 6px 16px #0009;max-height:min(39vh,250px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch');
  const row=style(document.createElement('div'),'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px');
  panel.appendChild(row);
  const pre=style(document.createElement('pre'),'margin:0;font:700 9px/1.22 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;overflow-wrap:anywhere;color:#e7f7ff;user-select:text;-webkit-user-select:text');
  pre.textContent='Pulsa MEDIR, oculta el panel y conduce; la medición continuará.';
  panel.appendChild(pre);root.appendChild(panel);
  const control=(label,callback,target=row)=>{
    const b=style(document.createElement('button'),'padding:5px 7px;min-height:30px;background:#1b3241;color:#fff;border:1px solid #648194;border-radius:6px;font:800 10px system-ui;touch-action:manipulation');
    b.type='button';b.textContent=label;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();callback(b);});target.appendChild(b);return b;
  };
  const state={active:false,expanded:false,disposed:false,hudOff:false,photoOff:false,audioBusy:false,stepStart:0,sceneStart:0,lastStepMs:0,lastSceneMs:0,stepMeasured:false,sceneMeasured:false,renderStart:0,lastPost:0,window:freshWindow(),lastReport:'',lastReportAt:performance.now(),
    raceMountedAt:performance.now(),measurementStartedAt:0,previous:null,thermalIndex:0,thermalAtStart:THERMAL_TOUCH_LEVELS[0],
    hiddenCount:0,hiddenSince:0,hiddenTotalMs:0,batteryReading:null,batteryRequested:false};
  const mode=()=>[state.hudOff?'HUD OFF':'HUD ON',state.photoOff?'FOTO OFF':'FOTO ON',scene._tdrEngineSample?.getDevEngineAudioStatus?.()?.diagnosticSuspended?'MOTOR OFF':'MOTOR ON','TEXTO '+getDevRaceTextRenderMode().mode].join(' · ');
  const reset=()=>{
    state.window=freshWindow();
    state.measurementStartedAt=Date.now();
    state.previous=loadPreviousRaceMeasurement(localStorage,state.measurementStartedAt);
    state.thermalAtStart=THERMAL_TOUCH_LEVELS[state.thermalIndex];
    state.hiddenCount=0;state.hiddenSince=document.hidden?performance.now():0;state.hiddenTotalMs=0;
    state.lastReportAt=performance.now();
    state.lastReport='';
    state.lastPost=0;
    state.stepStart=0;state.sceneStart=0;
    state.lastStepMs=0;state.lastSceneMs=0;
    state.stepMeasured=false;state.sceneMeasured=false;
    pre.textContent='Midiendo '+mode()+'\nConduce aproximadamente 20 s y haz una captura.';
  };
  const onVisibilityChange=()=>{
    if(!state.active)return;
    if(document.hidden){
      if(!state.hiddenSince)state.hiddenSince=performance.now();
    }else if(state.hiddenSince>0){
      state.hiddenTotalMs+=Math.max(0,performance.now()-state.hiddenSince);
      state.hiddenSince=0;state.hiddenCount++;
    }
  };
  const readBatteryOnce=()=>{
    if(state.batteryRequested||typeof navigator?.getBattery!=='function')return;
    state.batteryRequested=true;
    Promise.resolve().then(()=>navigator.getBattery()).then(battery=>{
      if(state.disposed)return;
      state.batteryReading=Math.round(Number(battery.level)*100)+' % · '+(battery.charging?'CARGANDO':'SIN CARGAR');
    }).catch(()=>{state.batteryReading='NO DISPONIBLE';});
  };
  state.preStep=()=>{if(state.active)state.stepStart=performance.now();};
  state.postStep=()=>{
    if(!state.active||!state.stepStart)return;
    state.lastStepMs=Math.max(0,performance.now()-state.stepStart);
    state.stepStart=0;state.stepMeasured=true;
  };
  state.scenePre=()=>{if(state.active)state.sceneStart=performance.now();};
  state.scenePost=()=>{
    if(!state.active||!state.sceneStart)return;
    state.lastSceneMs=Math.max(0,performance.now()-state.sceneStart);
    state.sceneStart=0;state.sceneMeasured=true;
  };
  state.pre=()=>{if(state.active)state.renderStart=performance.now();};
  state.post=()=>{
    if(!state.active)return;
    const now=performance.now(),w=state.window;
    const render=Math.max(0,now-(state.renderStart||now));
    const frame=state.lastPost>0?now-state.lastPost:0;
    const stepMeasured=state.stepMeasured,sceneMeasured=state.sceneMeasured;
    state.lastPost=now;
    // Never reuse stale CPU samples if Phaser omitted a step this frame.
    state.stepMeasured=false;state.sceneMeasured=false;
    if(frame>0&&frame<1500){
      w.count++;w.frameSum+=frame;w.frameMax=Math.max(w.frameMax,frame);
      w.renderSum+=render;w.renderMax=Math.max(w.renderMax,render);
      if(sceneMeasured){
        w.sceneSamples++;w.sceneSum+=state.lastSceneMs;
        w.sceneMax=Math.max(w.sceneMax,state.lastSceneMs);
      }
      if(stepMeasured){
        w.stepSamples++;w.stepSum+=state.lastStepMs;
        w.stepMax=Math.max(w.stepMax,state.lastStepMs);
        const other=Math.max(0,frame-state.lastStepMs-render);
        w.otherSamples++;w.otherSum+=other;
        w.otherMax=Math.max(w.otherMax,other);
      }
      recordFramePacing(w.pacing,frame);
      if(frame>33.4){w.over33++;w.lastSpike=frame;}
      if(frame>50)w.over50++;
    }
    if(now-state.lastReportAt>=1500){
      state.lastReport=metrics(w,scene,mode(),state);
      // Hidden reports should not trigger DOM paint/layout while the player drives.
      if(state.expanded)pre.textContent=state.lastReport;
      state.lastReportAt=now;
    }
  };
  let motorButton=null;
  if(!IS_PROD_BUILD&&isIos()){
  motorButton=control('MOTOR ON',async b=>{
    if(state.audioBusy)return;
    const engine=scene._tdrEngineSample;
    const current=engine?.getDevEngineAudioStatus?.();
    if(!engine?.setDevEngineAudioSuspended||!current?.started||!current?.ready){
      pre.textContent='Primero arranca el motor y espera a que se cargue el audio. La carrera no cambia.';
      return;
    }
    state.audioBusy=true;
    b.disabled=true;
    b.textContent='CAMBIANDO AUDIO…';
    try{
      const requested=!current.diagnosticSuspended;
      const result=await engine.setDevEngineAudioSuspended(requested);
      if(state.disposed)return;
      const next=engine.getDevEngineAudioStatus?.();
      b.textContent=next?.diagnosticSuspended?'MOTOR OFF':'MOTOR ON';
      if(!result?.ok){
        pre.textContent='PRUEBA NO VÁLIDA: '+(result?.reason||'No se pudo confirmar el AudioContext')+
          '\\nESTADO '+(result?.state||next?.state||'desconocido')+'. No interpretes FPS todavía.';
        return;
      }
      reset();
      pre.textContent='AUDIO MOTOR '+(requested?'REALMENTE SUSPENDIDO':'REANUDADO')+
        ' · AudioContext '+result.state+'\\nMide 20 segundos en esta fase y pulsa COPIAR.';
    }catch(error){
      b.textContent=engine?.getDevEngineAudioStatus?.()?.diagnosticSuspended?'MOTOR OFF':'MOTOR ON';
      pre.textContent='Error al cambiar motor: '+String(error?.message||error);
    }finally{
      state.audioBusy=false;
      b.disabled=false;
    }
  },toolbar);
  // MOTOR is reachable with details collapsed; before MEDIR it stays hidden.
  motorButton.style.display='none';
  const textButton=control('TEXTO '+getDevRaceTextRenderMode().mode,b=>{
    const previous=getDevRaceTextRenderMode();
    const toPhaser=previous.mode!=='PHASER';
    const result=setDevRaceTextRenderMode(scene,toPhaser);
    if(!result.ok){
      pre.textContent='No se pudo cambiar el motor de textos: '+(result.reason||'desconocido');
      return;
    }
    b.textContent='TEXTO '+result.mode;
    reset();
  });
  // Keep the A/B action accessible without scrolling through the other tools.
  row.insertBefore(textButton,row.firstChild);
  const hudButton=control('HUD ON',b=>{
    state.hudOff=!state.hudOff;
    scene._tdrDiagnosticHudOff=state.hudOff;
    if(scene._raceHudDom)scene._raceHudDom.style.display=state.hudOff?'none':'';
    if(!state.hudOff)scene._raceHudAccum=100;
    b.textContent=state.hudOff?'HUD OFF':'HUD ON';
    reset();
  });
  control(window.__tdrIosFrameConfig?.webglDesyncRequested?'PROBAR WEBGL SYNC (REINICIA)':'VOLVER WEBGL DESYNC (REINICIA)',()=>{
    const requested=!!window.__tdrIosFrameConfig?.webglDesyncRequested;
    try{localStorage.setItem(IOS_WEBGL_SYNC_KEY,requested?'1':'0');window.location.reload();}
    catch{pre.textContent='No se pudo guardar el modo WebGL. No se ha cambiado el juego.';}
  });
  // Only a lower framebuffer resolution is tested. Return to the original
  // preset-derived resolution after the second run; both changes restart Phaser.
  const resolutionConfig=window.__tdrIosFrameConfig||{};
  const resolutionBase=Number(resolutionConfig.baseRenderResolution)||1;
  const lowResolutionActive=resolutionConfig.resolutionTrialMode==='LOW';
  const resolutionButton=control(lowResolutionActive?'RES BASE (REINICIA)':'RES 1.0 (REINICIA)',()=>{
    if(resolutionBase<=1){pre.textContent='La resolución base ya es 1.0; no hay comparación que realizar.';return;}
    try{
      if(lowResolutionActive)localStorage.removeItem(IOS_DEV_RESOLUTION_KEY);
      else localStorage.setItem(IOS_DEV_RESOLUTION_KEY,'1.0');
      window.location.reload();
    }catch{pre.textContent='No se pudo cambiar la resolución de prueba.';}
  });
  if(resolutionBase<=1){resolutionButton.disabled=true;resolutionButton.textContent='RES BASE 1.0';}
  const photoButton=control('FOTO ON',b=>{
    const tiles=scene._trackBeautyTiles;
    if(!Array.isArray(tiles)||tiles.length===0){pre.textContent='No hay fotografía montada; el test FOTO no está disponible en este circuito.';return;}
    state.photoOff=!state.photoOff;
    for(const tile of tiles)if(tile?.scene)tile.setVisible(!state.photoOff);
    b.textContent=state.photoOff?'FOTO OFF':'FOTO ON';
    reset();
  });
  }
  const thermalButton=control('CALOR: '+THERMAL_TOUCH_LEVELS[state.thermalIndex],b=>{
    state.thermalIndex=(state.thermalIndex+1)%THERMAL_TOUCH_LEVELS.length;
    b.textContent='CALOR: '+THERMAL_TOUCH_LEVELS[state.thermalIndex];
    if(state.active){
      state.lastReport=metrics(state.window,scene,mode(),state);
      if(state.expanded)pre.textContent=state.lastReport;
    }
  });
  control('REINICIAR',()=>reset());
  const copyButton=control('COPIAR',async b=>{
    const finishedAt=Date.now(),w=state.window;
    const output=state.active?metrics(w,scene,mode(),state,finishedAt):pre.textContent;
    if(state.active&&w.count>0&&w.frameSum>0){
      savePreviousRaceMeasurement(localStorage,{
        finishedAt,fps:1000/avg(w.frameSum,w.count),
        over50Percent:100*w.over50/w.count,
        p95:percentileFramePacing(w.pacing,.95)
      });
    }
    state.lastReport=output;
    try{await navigator.clipboard.writeText(output);b.textContent='COPIADO';}
    catch{
      state.expanded=true;
      panel.style.display='block';
      trigger.textContent='MINIMIZAR';
      pre.textContent=output+'\nMantén pulsado este informe para copiarlo, o envía una captura.';
    }
  },toolbar);
  copyButton.style.display='none';
  const open=()=>{
    // Starting and folding are different operations. Folding MUST NOT change
    // the sampling state or reset elapsed frames: this is the whole iPhone fix.
    if(!state.active){
      state.active=true;
      state.expanded=true;
      if(!IS_PROD_BUILD&&isIos())motorButton.style.display='';
      copyButton.style.display='';
      reset();
      readBatteryOnce();
    }else{
      state.expanded=!state.expanded;
    }
    panel.style.display=state.expanded?'block':'none';
    trigger.textContent=state.expanded?'MINIMIZAR':'VER DATOS';
    if(state.expanded&&state.lastReport)pre.textContent=state.lastReport;
  };
  trigger.addEventListener('click',open);
  host.appendChild(root);
  const events=scene.game.events;
  document.addEventListener('visibilitychange',onVisibilityChange,{passive:true});
  events.on(Phaser.Core.Events.PRE_STEP,state.preStep);
  events.on(Phaser.Core.Events.POST_STEP,state.postStep);
  scene.events.on(Phaser.Scenes.Events.PRE_UPDATE,state.scenePre);
  scene.events.on(Phaser.Scenes.Events.POST_UPDATE,state.scenePost);
  events.on(Phaser.Core.Events.PRE_RENDER,state.pre);
  events.on(Phaser.Core.Events.POST_RENDER,state.post);
  const cleanup=()=>{
    if(state.disposed)return;state.disposed=true;state.active=false;state.expanded=false;
    document.removeEventListener('visibilitychange',onVisibilityChange);
    events.off(Phaser.Core.Events.PRE_STEP,state.preStep);
    events.off(Phaser.Core.Events.POST_STEP,state.postStep);
    scene.events.off(Phaser.Scenes.Events.PRE_UPDATE,state.scenePre);
    scene.events.off(Phaser.Scenes.Events.POST_UPDATE,state.scenePost);
    events.off(Phaser.Core.Events.PRE_RENDER,state.pre);
    events.off(Phaser.Core.Events.POST_RENDER,state.post);
    scene._tdrDiagnosticHudOff=false;
    // Restore the original HTML renderer and bridge RAF on leaving the race.
    setDevRaceTextRenderMode(scene,false);
    // AudioContext belongs to the race scene and is closed by its shutdown.
    // Never resume on teardown: another focus/ad event may still require silence.
    if(scene._raceHudDom)scene._raceHudDom.style.display='';
    for(const tile of scene._trackBeautyTiles||[])if(tile?.scene)tile.setVisible(true);
    root.remove();scene._tdrFrameDiagnostic=null;
  };
  scene.events.once('shutdown',cleanup);
  scene.events.once('destroy',cleanup);
  scene._tdrFrameDiagnostic=state;
  // No instrumentation callbacks perform any timing work before MEDIR is opened.
  // Assist-mode unlock alone never starts frame sampling.
  return state;
}
