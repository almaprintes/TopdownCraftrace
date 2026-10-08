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
  const render=()=>{output.textContent=JSON.stringify(history.slice(-30),null,2);};
  const sample=async()=>{
    try{
      const s=await bridge.diagnostics();
      const entry=s?.activeRewardedDiagnostic||s?.lastRewardedDiagnostic;
      if(!entry)return;
      const signature=JSON.stringify(entry);
      if(signature===last)return;
      last=signature;
      history.push({at:new Date().toISOString(),...entry});
      history=history.slice(-30);
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
    const detail={installed:true,configured:status?.configured===true,releaseBuild:status?.releaseBuild===true,diagnosticBuild:status?.diagnosticBuild===true,placementCount:Number(status?.placementCount)||0,consentUpdateCompleted:status?.consentUpdateCompleted===true,consentCanRequestAds:status?.consentCanRequestAds===true,adsInitialized:status?.adsInitialized===true};
    console.info('[TDR rewarded bridge]',detail);
    emitStatus(detail);
    if(status?.diagnosticBuild===true){
      if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>mountRewardedDiagnosticPanel(bridge),{once:true});
      else mountRewardedDiagnosticPanel(bridge);
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
