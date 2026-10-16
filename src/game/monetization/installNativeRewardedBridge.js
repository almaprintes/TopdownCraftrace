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


// Android player builds never mount AD LOG / PERF buttons or extra RAF loops.
// Rewarded diagnostics remain available through the native getStatus() API.

export async function installNativeRewardedBridge(){
  if(typeof window==='undefined'||Capacitor.getPlatform()!=='android'||!Capacitor.isNativePlatform()){
    return{installed:false,reason:'not_native_android'};
  }

  try{
    document.documentElement.classList.add('tdr-android-native');
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
    return detail;
  }catch(error){
    try{delete window.__tdrRewardedAds;}catch{}
    const detail={installed:false,reason:error?.message||'native_bridge_status_failed'};
    console.warn('[TDR rewarded bridge] unavailable');
    emitStatus(detail);
    return detail;
  }
}
