// Rewarded-ad boundary for the web game.
// Android will inject window.__tdrRewardedAds.show() from the native AdMob /
// RevenueCat Ads integration. Until then, /dev can exercise the full flow with
// a local video without pretending that an ad network has already been wired.
const VIDEO_SRC='assets/intro/intro.mp4';
const NATIVE_TIMEOUT_MS=45000;

function isDevPreview(){
  try{
    if(localStorage.getItem('tdr2:forceRewardedAdMock')==='1')return true;
    return /(?:^|\/)dev(?:\/|$)/i.test(String(window?.location?.pathname||''));
  }catch{return false;}
}

function nativeBridge(){
  try{return window?.__tdrRewardedAds&&typeof window.__tdrRewardedAds.show==='function'?window.__tdrRewardedAds:null;}
  catch{return null;}
}

export function isRewardedAdAvailable(){
  return !!nativeBridge()||isDevPreview();
}

function nativeRewardedAd({placement,claimId}){
  const bridge=nativeBridge();
  if(!bridge)return Promise.resolve({completed:false,verified:false,reason:'native_bridge_unavailable'});
  return Promise.race([
    Promise.resolve().then(()=>bridge.show({placement,claimId})).then(result=>{
      const completed=result?.completed===true;
      const verified=result?.verified===true;
      return{
        completed:completed&&verified,
        verified,
        source:'native',
        transactionId:result?.transactionId||result?.rewardId||null,
        reason:completed&&verified?null:(result?.reason||'reward_not_verified')
      };
    }).catch(error=>({completed:false,verified:false,source:'native',reason:error?.message||'native_error'})),
    new Promise(resolve=>setTimeout(()=>resolve({completed:false,verified:false,source:'native',reason:'timeout'}),NATIVE_TIMEOUT_MS))
  ]);
}

function devVideoRewardedAd(scene,{title='RECOMPENSA PATROCINADA'}={}){
  return new Promise((resolve)=>{
    if(typeof document==='undefined'){
      resolve({completed:false,verified:false,source:'dev-video',reason:'document_unavailable'});
      return;
    }
    const wasPaused=scene?.scene?.isPaused?.()===true;
    try{scene?.scene?.pause?.();}catch{}
    const root=document.createElement('div');
    Object.assign(root.style,{position:'fixed',inset:'0',zIndex:'99999',background:'rgba(4,8,15,.97)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',fontFamily:'system-ui,-apple-system,sans-serif',color:'#fff',padding:'20px'});
    const lab=document.createElement('div');
    lab.textContent=title;
    Object.assign(lab.style,{fontWeight:'900',letterSpacing:'1.5px',fontSize:'13px',marginBottom:'12px',color:'#67e8f9'});
    const video=document.createElement('video');
    video.src=VIDEO_SRC;
    video.muted=false;
    video.playsInline=true;
    video.controls=false;
    video.autoplay=true;
    Object.assign(video.style,{width:'min(92vw,520px)',maxHeight:'70vh',objectFit:'contain',borderRadius:'18px',background:'#000',boxShadow:'0 20px 80px rgba(0,0,0,.55)'});
    const hint=document.createElement('div');
    hint.textContent='SIMULACIÓN DEV · la recompensa se valida al terminar';
    Object.assign(hint.style,{opacity:'.7',fontSize:'12px',marginTop:'10px'});
    root.append(lab,video,hint);
    document.body.appendChild(root);

    let done=false;
    const finish=(result)=>{
      if(done)return;
      done=true;
      try{video.pause();}catch{}
      try{root.remove();}catch{}
      if(!wasPaused)try{scene?.scene?.resume?.();}catch{}
      resolve(result);
    };
    video.onended=()=>finish({completed:true,verified:true,source:'dev-video',transactionId:`dev-${Date.now()}`});
    video.onerror=()=>finish({completed:false,verified:false,source:'dev-video',reason:'video_error'});
    const play=video.play();
    if(play?.catch)play.catch(()=>{
      video.muted=true;
      video.play().catch(()=>finish({completed:false,verified:false,source:'dev-video',reason:'autoplay_blocked'}));
    });
  });
}

export async function showRewardedAd(scene,{title='RECOMPENSA PATROCINADA',placement='generic_reward',claimId=null}={}){
  if(nativeBridge())return nativeRewardedAd({placement,claimId});
  if(isDevPreview())return devVideoRewardedAd(scene,{title});
  return{completed:false,verified:false,source:'none',reason:'rewarded_ad_unavailable'};
}
