import Phaser from 'phaser';
import { IS_PROD_BUILD } from '../buildTarget.js';

// On-device DEV diagnostic, OFF until opened. Real Phaser game events rather
// than a second requestAnimationFrame loop or a fake "FPS" approximation.
const isIos=()=>{try{return /iPhone|iPad|iPod/i.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;}catch{return false;}};
const style=(node,css)=>{node.style.cssText=css;return node;};
const freshWindow=()=>({started:performance.now(),count:0,frameSum:0,frameMax:0,updateSum:0,updateMax:0,renderSum:0,renderMax:0,otherSum:0,otherMax:0,over33:0,over50:0,lastSpike:0});
const avg=(sum,count)=>count?sum/count:0;
const ms=n=>n.toFixed(1);
const metrics=(w,scene,mode)=>[
  'PERF iPhone · '+mode,
  'FOTOGRAMAS  '+w.count+'  '+(avg(w.frameSum,w.count)>0?ms(1000/avg(w.frameSum,w.count)):'--')+' FPS',
  'FRAME      '+ms(avg(w.frameSum,w.count))+' / '+ms(w.frameMax)+' ms',
  'UPDATE CPU '+ms(avg(w.updateSum,w.count))+' / '+ms(w.updateMax)+' ms',
  'RENDER CPU '+ms(avg(w.renderSum,w.count))+' / '+ms(w.renderMax)+' ms',
  'OTROS      '+ms(avg(w.otherSum,w.count))+' / '+ms(w.otherMax)+' ms',
  '>33ms '+w.over33+' · >50ms '+w.over50+' · último '+ms(w.lastSpike)+'ms',
  'TILES '+(scene._trackBeautyTiles?.length||0)+' · NO mide GPU directamente'
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
  const root=style(document.createElement('div'),'position:fixed;top:calc(env(safe-area-inset-top) + 48px);left:7px;z-index:2147483000;font:700 11px/1.35 ui-monospace,SFMono-Regular,Menlo,monospace;color:#fff;pointer-events:none;max-width:min(300px,94vw)');
  root.id='tdr-race-perf-diagnostic';
  const trigger=style(document.createElement('button'),'pointer-events:auto;padding:7px 11px;background:#101d29e8;color:#fff;border:1px solid #88b9cb;border-radius:8px;font:800 12px system-ui;min-height:35px');
  trigger.type='button';trigger.textContent='MEDIR';root.appendChild(trigger);
  const panel=style(document.createElement('div'),'display:none;margin-top:4px;padding:8px;border:1px solid #94aabb;border-radius:8px;background:rgba(3,12,22,.93);pointer-events:auto;box-shadow:0 6px 16px #0009');
  const pre=style(document.createElement('pre'),'margin:0 0 8px;font:700 10px/1.3 ui-monospace,SFMono-Regular,Menlo,monospace;white-space:pre-wrap;color:#e7f7ff;user-select:text;-webkit-user-select:text');
  pre.textContent='Abre y conduce 20 s para medir. Los valores son tiempos de CPU, no de GPU.';
  panel.appendChild(pre);
  const row=style(document.createElement('div'),'display:flex;gap:5px;flex-wrap:wrap');
  panel.appendChild(row);root.appendChild(panel);
  const control=(label,callback)=>{
    const b=style(document.createElement('button'),'padding:6px 8px;min-height:32px;background:#1b3241;color:#fff;border:1px solid #648194;border-radius:6px;font:800 10px system-ui');
    b.type='button';b.textContent=label;b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();callback(b);});row.appendChild(b);return b;
  };
  const state={active:false,disposed:false,hudOff:false,photoOff:false,lastUpdateMs:0,renderStart:0,lastPost:0,window:freshWindow(),lastReport:''};
  const mode=()=>['BASE',state.hudOff?'HUD OFF':'HUD ON',state.photoOff?'FOTO OFF':'FOTO ON'].join(' · ');
  const reset=()=>{
    state.window=freshWindow();
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
    if(now-w.started>=1400){
      state.lastReport=metrics(w,scene,mode());
      pre.textContent=state.lastReport;
      state.window=freshWindow();
    }
  };
  const hudButton=control('HUD ON',b=>{
    state.hudOff=!state.hudOff;
    scene._tdrDiagnosticHudOff=state.hudOff;
    if(scene._raceHudDom)scene._raceHudDom.style.display=state.hudOff?'none':'';
    if(!state.hudOff)scene._raceHudAccum=100;
    b.textContent=state.hudOff?'HUD OFF':'HUD ON';
    reset();
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
  control('COPIAR',async b=>{
    const output=state.lastReport||pre.textContent;
    try{await navigator.clipboard.writeText(output);b.textContent='COPIADO';}
    catch{pre.textContent=output+'\nMantén pulsado este informe para copiarlo, o envía una captura.';}
  });
  const open=()=>{
    state.active=!state.active;
    panel.style.display=state.active?'block':'none';
    trigger.textContent=state.active?'CERRAR':'MEDIR';
    if(state.active)reset();
  };
  trigger.addEventListener('click',open);
  host.appendChild(root);
  const events=scene.game.events;
  events.on(Phaser.Core.Events.PRE_RENDER,state.pre);
  events.on(Phaser.Core.Events.POST_RENDER,state.post);
  const cleanup=()=>{
    if(state.disposed)return;state.disposed=true;state.active=false;
    events.off(Phaser.Core.Events.PRE_RENDER,state.pre);
    events.off(Phaser.Core.Events.POST_RENDER,state.post);
    scene._tdrDiagnosticHudOff=false;
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
