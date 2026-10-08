import { Capacitor, registerPlugin } from '@capacitor/core';

const STATUS_TIMEOUT_MS=15000;
const RewardedAdsPlugin=registerPlugin('TdrRewardedAds');

function withTimeout(promise,ms){
  return Promise.race([
    promise,
    new Promise((_,reject)=>setTimeout(()=>reject(new Error('native_bridge_status_timeout')),ms))
  ]);
}

function emitStatus(detail){
  try{window.dispatchEvent(new CustomEvent('tdr:rewardedbridge',{detail}));}catch{}
}


function mountRewardedDiagnosticPanel(bridge){
  if(document.getElementById('tdr-ad-diagnostic-button'))return;
  const button=document.createElement('button');
  button.id='tdr-ad-diagnostic-button';
  button.textContent='AD LOG';
  button.setAttribute('aria-label','Abrir diagnóstico de anuncios');
  button.style.cssText='position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 8px);z-index:60000;border:1px solid #67e8f9;background:#091c29;color:#fff;border-radius:9px;padding:8px;font:700 12px system-ui';
  const panel=document.createElement('div');
  panel.id='tdr-ad-diagnostic-panel';
  panel.style.cssText='display:none;position:fixed;inset:0;z-index:60001;background:#07111df5;color:white;padding:calc(env(safe-area-inset-top) + 18px) 16px 18px;overflow:auto;font:14px system-ui';
  panel.innerHTML='<h2>Registro de anuncios · TDR</h2><p>Juega normalmente. Abre este registro después de un anuncio congelado. No borres los datos de la aplicación.</p><button id="tdr-ad-log-close" style="padding:10px">VOLVER AL JUEGO</button> <button id="tdr-ad-log-copy" style="padding:10px">COPIAR REGISTRO</button><pre id="tdr-ad-log-text" style="white-space:pre-wrap;word-break:break-word;background:#0009;padding:12px"></pre>';
  document.body.append(button,panel);
  const output=panel.querySelector('#tdr-ad-log-text');
  const storageKey='tdr_rewarded_diagnostic_history_v1';
  let history=[];
  try{history=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(history))history=[];}catch{}
  let last='';
  const render=()=>{output.textContent=JSON.stringify(history.slice(-100),null,2);};
  const sample=async()=>{
    try{
      const s=await bridge.diagnostics();
      const entry=s?.activeRewardedDiagnostic||s?.lastRewardedDiagnostic;
      if(!entry)return;
      // Record state transitions and terminal results, not a new line every 2.5s.
      const {elapsedMs,...stableEntry}=entry;
      const signature=JSON.stringify(stableEntry);
      if(signature===last)return;
      last=signature;
      history.push({at:new Date().toISOString(),...entry});
      history=history.slice(-100);
      try{localStorage.setItem(storageKey,JSON.stringify(history));}catch{}
      if(panel.style.display!=='none')render();
    }catch{}
  };
  button.addEventListener('click',()=>{panel.style.display='block';sample().then(render);});
  panel.querySelector('#tdr-ad-log-close').addEventListener('click',()=>panel.style.display='none');
  panel.querySelector('#tdr-ad-log-copy').addEventListener('click',async()=>{
    render();
    try{await navigator.clipboard.writeText(output.textContent);panel.querySelector('#tdr-ad-log-copy').textContent='COPIADO';}catch{output.select?.();}
  });
  setInterval(sample,2500);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)sample();});
  sample();
}


function mountAndroidPerformancePanel(){
  if(document.getElementById('tdr-perf-toggle'))return;
  const btn=document.createElement('button');
  btn.id='tdr-perf-toggle';btn.textContent='PERF';
  btn.style.cssText='position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 54px);z-index:60000;border:1px solid #fbbf24;background:#211a08;color:#fff;border-radius:9px;padding:8px;font:700 12px system-ui';
  const panel=document.createElement('div');
  panel.id='tdr-perf-summary';
  panel.style.cssText='display:none;position:fixed;inset:0;z-index:60002;background:#07111df7;color:#fff;padding:20px;overflow:auto;font:14px system-ui';
  panel.innerHTML='<h2>PERF · Resumen Android</h2><p>La medición se realiza automáticamente mientras juegas. No necesitas activar nada.</p><pre id="tdr-perf-summary-text" style="white-space:pre-wrap;word-break:break-word;background:#0009;padding:12px"></pre><button id="tdr-perf-copy" style="padding:12px">COPIAR INFORME</button> <button id="tdr-perf-reset" style="padding:12px">REINICIAR MEDICIÓN</button> <button id="tdr-perf-close" style="padding:12px">VOLVER</button>';
  document.body.append(btn,panel);
  const output=panel.querySelector('#tdr-perf-summary-text');
  let last=0,start=performance.now(),frameCount=0,over33=0,over50=0,max=0,sum=0,spikes=[],pausedMs=0;
  let previousVisible=!document.hidden;
  const tick=now=>{
    if(document.hidden){last=0;requestAnimationFrame(tick);return;}
    if(!previousVisible){last=0;previousVisible=true;}
    if(last){
      const dt=now-last;
      if(dt>0&&dt<2000){
        frameCount++;sum+=dt;max=Math.max(max,dt);
        if(dt>33.4){over33++;spikes.push({second:Math.round((now-start)/1000),ms:Math.round(dt)});if(spikes.length>40)spikes.shift();}
        if(dt>50)over50++;
      }
    }
    last=now;requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange',()=>{previousVisible=!document.hidden;last=0;});
  requestAnimationFrame(tick);
  const report=()=>{
    const elapsed=Math.max(1,(performance.now()-start-pausedMs)/1000);
    const mem=performance?.memory?.usedJSHeapSize;
    return 'Duración aproximada: '+Math.round(elapsed)+' s'+
      '\\nFPS promedio (RAF): '+(sum?((1000*frameCount)/sum).toFixed(1):'—')+
      '\\nFotogramas >33 ms: '+over33+'; >50 ms: '+over50+
      '\\nMayor intervalo: '+Math.round(max)+' ms'+
      '\\nTirones >33 ms/min: '+(over33*60/elapsed).toFixed(1)+
      '\\nMemoria JS actual: '+(Number.isFinite(mem)?(mem/1048576).toFixed(1)+' MB':'no disponible')+
      '\\nÚltimos tirones (segundo/ms): '+JSON.stringify(spikes)+
      '\\nNota: RAF mide cadencia de presentación, no FPS internos de Phaser.';
  };
  btn.addEventListener('click',()=>{output.textContent=report();panel.style.display='block';});
  panel.querySelector('#tdr-perf-close').addEventListener('click',()=>panel.style.display='none');
  panel.querySelector('#tdr-perf-reset').addEventListener('click',()=>{start=performance.now();last=0;frameCount=0;over33=0;over50=0;max=0;sum=0;spikes=[];pausedMs=0;output.textContent=report();});
  panel.querySelector('#tdr-perf-copy').addEventListener('click',async()=>{output.textContent=report();try{await navigator.clipboard.writeText(output.textContent);panel.querySelector('#tdr-perf-copy').textContent='COPIADO';}catch{}});
}

export async function installNativeRewardedBridge(){
  if(typeof window==='undefined'||Capacitor.getPlatform()!=='android'||!Capacitor.isNativePlatform()){
    return{installed:false,reason:'not_native_android'};
  }

  try{
    const status=await withTimeout(RewardedAdsPlugin.getStatus(),STATUS_TIMEOUT_MS);
    if(status?.bridgeReady!==true)throw new Error('native_bridge_not_ready');
    const bridge=Object.freeze({
      show(options={}){
        return RewardedAdsPlugin.show({
          placement:String(options?.placement||''),
          claimId:String(options?.claimId||'')
        });
      },
      showPrivacyOptions(){return RewardedAdsPlugin.showPrivacyOptions();},
      diagnostics(){return RewardedAdsPlugin.getStatus();}
    });
    Object.defineProperty(window,'__tdrRewardedAds',{
      configurable:true,
      enumerable:false,
      writable:false,
      value:bridge
    });
    RewardedAdsPlugin.addListener('rewardedFullscreen',event=>{
      try{window.dispatchEvent(new CustomEvent('tdr:rewardedfullscreen',{detail:{visible:event?.visible===true}}));}catch{}
    }).catch(()=>{});
    const detail={installed:true,configured:status?.configured===true,releaseBuild:status?.releaseBuild===true,diagnosticBuild:status?.diagnosticBuild===true,placementCount:Number(status?.placementCount)||0,consentUpdateCompleted:status?.consentUpdateCompleted===true,consentCanRequestAds:status?.consentCanRequestAds===true,adsInitialized:status?.adsInitialized===true};
    console.info('[TDR rewarded bridge]',detail);
    emitStatus(detail);
    if(status?.diagnosticBuild===true){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountRewardedDiagnosticPanel(bridge),{once:true});
      else mountRewardedDiagnosticPanel(bridge);
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountAndroidPerformancePanel,{once:true});
      else mountAndroidPerformancePanel();
    }
    return detail;
  }catch(error){
    try{delete window.__tdrRewardedAds;}catch{}
    const detail={installed:false,reason:error?.message||'native_bridge_status_failed'};
    console.warn('[TDR rewarded bridge] unavailable');
    emitStatus(detail);
    return detail;
  }
}
