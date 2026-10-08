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
  const box=document.createElement('pre');box.id='tdr-perf-panel';
  box.style.cssText='display:none;position:fixed;right:12px;top:calc(env(safe-area-inset-top) + 96px);z-index:60000;background:#07111df0;color:#e5e7eb;border:1px solid #fbbf24;padding:10px;border-radius:8px;font:12px/1.5 monospace;pointer-events:none;white-space:pre';
  document.body.append(btn,box);
  let running=false,raf=0,last=0,frames=0,total=0,spikes=0,max=0,over33=0,over50=0;
  let samples=[],start=0,lastPaint=0;
  const tick=(now)=>{
    if(!running)return;
    if(last){
      const dt=now-last;
      if(dt>0&&dt<2000){frames++;total+=dt;max=Math.max(max,dt);if(dt>33.4)over33++;if(dt>50)over50++;if(dt>33.4){spikes++;samples.push(Math.round(dt));if(samples.length>12)samples.shift();}}
    }
    last=now;
    if(now-lastPaint>=1000){
      const seconds=Math.max(.001,(now-start)/1000);
      const mem=performance?.memory?.usedJSHeapSize;
      box.textContent='FPS (último s): '+(total>0?(1000*frames/total).toFixed(1):'—')+
        '\\nFotogramas >33ms: '+over33+'  >50ms: '+over50+
        '\\nPico: '+max.toFixed(0)+'ms'+
        '\\nTirones/min: '+(spikes*60/seconds).toFixed(1)+
        '\\nÚltimos tirones: '+(samples.join(', ')||'—')+' ms'+
        '\\nHeap JS: '+(Number.isFinite(mem)?(mem/1048576).toFixed(0)+' MB':'no disponible')+
        '\\nAD LOG: muestreo cada 2,5 s';
      frames=0;total=0;lastPaint=now;
    }
    raf=requestAnimationFrame(tick);
  };
  btn.addEventListener('click',()=>{
    running=!running;box.style.display=running?'block':'none';
    btn.textContent=running?'PERF ●':'PERF';
    if(running){last=0;frames=0;total=0;spikes=0;max=0;over33=0;over50=0;samples=[];start=performance.now();lastPaint=start;raf=requestAnimationFrame(tick);}
    else cancelAnimationFrame(raf);
  });
  window.addEventListener('pagehide',()=>{running=false;cancelAnimationFrame(raf);},{once:true});
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
