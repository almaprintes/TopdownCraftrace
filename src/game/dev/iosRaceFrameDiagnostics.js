import Phaser from 'phaser';
import { IS_PROD_BUILD } from '../buildTarget.js';
import { IOS_WEBGL_SYNC_KEY } from '../performance/iosWebglPresentationMode.js';

// On-device DEV diagnostic, OFF until opened. Real Phaser game events rather
// than a second requestAnimationFrame loop or a fake "FPS" approximation.
const isIos=()=>{try{return /iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;}catch{return false;}};
const style=(node,css)=>{node.style.cssText=css;return node;};
const freshWindow=()=>({started:performance.now(),count:0,frameSum:0,frameMax:0,updateSum:0,updateMax:0,renderSum:0,renderMax:0,otherSum:0,otherMax:0,over33:0,over50:0,lastSpike:0});
const avg=(sum,count)=>count?sum/count:0;
const ms=n=>n.toFixed(1);
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
  const data=scene._tdrEngineSample?.getDevEngineAudioStatus?.();
  if(!data)return 'AUDIO MOTOR: NO DISPONIBLE';
  const sourceCount=data.ready?data.sources:'cargando';
  return 'AUDIO MOTOR '+(data.diagnosticSuspended?'OFF':'ON')+' · CONTEXTO '+data.state+' · FUENTES '+sourceCount+' · '+data.mode;
};
const frameInfo=scene=>{const conf=window.__tdrIosFrameConfig||{};const context=scene.game?.renderer?.gl?.getContextAttributes?.();const actual=typeof context?.desynchronized==='boolean'?(context.desynchronized?'DESYNC':'SYNC'):'NO DISPONIBLE';return `MODO ${conf.preset||'?'}  RES ${conf.renderResolution||'?'}  FPS limit ${conf.frameLimit??'?'}\nWEBGL ${conf.webglDesyncRequested?'DESYNC':'SYNC'} solicitado · ${actual} real\nSAFE ${conf.safeMode?'SI':'NO'} (${safeModeDetails()}) · TIMER ${conf.forceSetTimeOut?'SI':'NO'} · FPS HUD ${videoProbeEnabled()?'ON':'OFF'}`;};
const metrics=(w,scene,mode)=>[
  'PERF iPhone · '+mode,
  'FOTOGRAMAS  '+w.count+'  '+(avg(w.frameSum,w.count)>0?ms(1000/avg(w.frameSum,w.count)):'--')+' FPS',
  'FRAME      '+ms(avg(w.frameSum,w.count))+' / '+ms(w.frameMax)+' ms',
  'UPDATE CPU '+ms(avg(w.updateSum,w.count))+' / '+ms(w.updateMax)+' ms',
  'RENDER CPU '+ms(avg(w.renderSum,w.count))+' / '+ms(w.renderMax)+' ms',
  'OTROS      '+ms(avg(w.otherSum,w.count))+' / '+ms(w.otherMax)+' ms',
  '>33ms '+w.over33+' · >50ms '+w.over50+' · último '+ms(w.lastSpike)+'ms',
  'TILES '+(scene._trackBeautyTiles?.length||0)+' · NO mide GPU directamente',
  frameInfo(scene),
  engineStatus(scene)
].join('\n');

// This installer wraps the outermost in-use race class (the concrete scene
// registered in Phaser), so UPDATE CPU includes later subclasses, engine
// sound, steering UI, gameplay and the actual DOM HUD update. Measuring only
// RaceTelemetryHudScene.update would miss all the subclasses above it.
export function installFinalRaceFrameDiagnosticUpdate(RaceClass){
  if(IS_PROD_BUILD||!RaceClass?.prototype)return;
  const proto=RaceClass.prototype;
  if(Object.prototype.hasOwnProperty.call(proto,'__tdrFinalFrameDiagnosticInstalled'))return;
  const original=proto.update;
  if(typeof original!=='function')return;
  proto.update=function(...args){
    const diag=this._tdrFrameDiagnostic;
    if(!diag?.active)return original.apply(this,args);
    const started=performance.now();
    try{return original.apply(this,args);}
    finally{diag.recordUpdate(performance.now()-started);}
  };
  Object.defineProperty(proto,'__tdrFinalFrameDiagnosticInstalled',{value:true});
}

// Testing with photo OFF is intentionally brief: it hides only photo sprites,
// not authored geometry/collision, so the road will be invisible.
export function mountRaceDevFrameDiagnostics(scene){
  if(IS_PROD_BUILD||!isIos()||typeof document==='undefined'||!scene?.game?.events)return null;
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
  const state={active:false,expanded:false,disposed:false,hudOff:false,photoOff:false,audioBusy:false,lastUpdateMs:0,renderStart:0,lastPost:0,window:freshWindow(),lastReport:'',lastReportAt:performance.now()};
  const mode=()=>[state.hudOff?'HUD OFF':'HUD ON',state.photoOff?'FOTO OFF':'FOTO ON',scene._tdrEngineSample?.getDevEngineAudioStatus?.()?.diagnosticSuspended?'MOTOR OFF':'MOTOR ON'].join(' · ');
  const reset=()=>{
    state.window=freshWindow();
    state.lastReportAt=performance.now();
    state.lastReport='';
    state.lastPost=0;
    state.lastUpdateMs=0;
    pre.textContent='Midiendo '+mode()+'\nConduce aproximadamente 20 s y haz una captura.';
  };
  state.recordUpdate=msSpent=>{if(state.active)state.lastUpdateMs=Math.max(0,msSpent);};
  state.pre=()=>{if(state.active)state.renderStart=performance.now();};
  state.post=()=>{
    if(!state.active)return;
    const now=performance.now(),w=state.window;
    const render=Math.max(0,now-(state.renderStart||now));
    const frame=state.lastPost>0?now-state.lastPost:0;
    state.lastPost=now;
    if(frame>0&&frame<1500){
      const update=state.lastUpdateMs;
      const other=Math.max(0,frame-update-render);
      w.count++;w.frameSum+=frame;w.frameMax=Math.max(w.frameMax,frame);
      w.updateSum+=update;w.updateMax=Math.max(w.updateMax,update);
      w.renderSum+=render;w.renderMax=Math.max(w.renderMax,render);
      w.otherSum+=other;w.otherMax=Math.max(w.otherMax,other);
      if(frame>33.4){w.over33++;w.lastSpike=frame;}
      if(frame>50)w.over50++;
    }
    if(now-state.lastReportAt>=1500){
      state.lastReport=metrics(w,scene,mode());
      // Hidden reports should not trigger DOM paint/layout while the player drives.
      if(state.expanded)pre.textContent=state.lastReport;
      state.lastReportAt=now;
    }
  };
  const motorButton=control('MOTOR ON',async b=>{
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
  const photoButton=control('FOTO ON',b=>{
    const tiles=scene._trackBeautyTiles;
    if(!Array.isArray(tiles)||tiles.length===0){pre.textContent='No hay fotografía montada; el test FOTO no está disponible en este circuito.';return;}
    state.photoOff=!state.photoOff;
    for(const tile of tiles)if(tile?.scene)tile.setVisible(!state.photoOff);
    b.textContent=state.photoOff?'FOTO OFF':'FOTO ON';
    reset();
  });
  control('REINICIAR',()=>reset());
  const copyButton=control('COPIAR',async b=>{
    const output=state.lastReport||pre.textContent;
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
      motorButton.style.display='';
      copyButton.style.display='';
      reset();
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
  events.on(Phaser.Core.Events.PRE_RENDER,state.pre);
  events.on(Phaser.Core.Events.POST_RENDER,state.post);
  const cleanup=()=>{
    if(state.disposed)return;state.disposed=true;state.active=false;state.expanded=false;
    events.off(Phaser.Core.Events.PRE_RENDER,state.pre);
    events.off(Phaser.Core.Events.POST_RENDER,state.post);
    scene._tdrDiagnosticHudOff=false;
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
  return state;
}
