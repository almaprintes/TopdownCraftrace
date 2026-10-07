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
  if(document.getElementById('tdr-rewarded-diagnostic'))return;
  const root=document.createElement('div');
  root.id='tdr-rewarded-diagnostic';
  root.style.cssText='position:fixed;inset:0;z-index:60000;background:#07111d;color:#fff;font:700 15px system-ui;padding:calc(env(safe-area-inset-top) + 18px) 20px 20px;overflow:auto';
  root.innerHTML='<div style="max-width:720px;margin:auto"><h1 style="font-size:24px;margin:0 0 8px">TDR · REWARDED TEST</h1><p style="opacity:.75;margin:0 0 18px">Anuncios reales · diagnóstico Android · la recompensa no modifica la partida.</p><button id="tdr-rw-next" style="font:900 18px system-ui;padding:14px 22px;border:0;border-radius:12px">MOSTRAR ANUNCIO 1/20</button><div id="tdr-rw-state" style="margin-top:16px">Preparado.</div><pre id="tdr-rw-log" style="white-space:pre-wrap;word-break:break-word;background:#0008;padding:14px;border-radius:10px;min-height:120px"></pre></div>';
  document.body.appendChild(root);
  const button=root.querySelector('#tdr-rw-next'),state=root.querySelector('#tdr-rw-state'),log=root.querySelector('#tdr-rw-log');
  let count=0,busy=false;
  button.addEventListener('click',async()=>{
    if(busy||count>=20)return;
    busy=true;button.disabled=true;state.textContent='Cargando anuncio real…';
    const number=count+1;
    try{
      const result=await bridge.show({placement:'post_race_double_loot',claimId:`diag-${Date.now()}-${number}`});
      count=number;
      const status=await bridge.diagnostics();
      state.textContent=`Anuncio ${count}/20 · ${result?.completed?'verificado':'sin verificar'}`;
      log.textContent=JSON.stringify(status?.lastRewardedDiagnostic||result,null,2);
    }catch(error){
      state.textContent=`Anuncio ${number}/20 · error`;
      log.textContent=String(error?.message||error);
    }finally{
      busy=false;button.disabled=count>=20;button.textContent=count>=20?'PRUEBA 20/20 COMPLETADA':`MOSTRAR ANUNCIO ${count+1}/20`;
    }
  });
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
