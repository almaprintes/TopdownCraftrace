let probe=null;
let raf=0;

function ensureProbe(){
  if(probe?.isConnected)return probe;
  probe=document.createElement('div');
  probe.setAttribute('aria-hidden','true');
  probe.style.cssText='position:fixed;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none;visibility:hidden;padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px);padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px);';
  document.documentElement.appendChild(probe);
  return probe;
}

function readPx(value){const n=parseFloat(value);return Number.isFinite(n)?Math.max(0,n):0;}
function isIOSPhone(){
  try{
    const ua=String(navigator?.userAgent||'');
    const platform=String(navigator?.platform||'');
    const ios=/iPhone|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);
    const w=Math.max(Number(screen?.width||0),Number(screen?.height||0));
    return ios&&w>0&&w<=1000;
  }catch{return false;}
}
function isLandscape(){
  const vv=window.visualViewport;
  const w=Number(vv?.width||window.innerWidth||0),h=Number(vv?.height||window.innerHeight||0);
  return w>h;
}

export function readSafeArea(){
  const el=ensureProbe();
  const cs=getComputedStyle(el);
  const raw={
    left:readPx(cs.paddingLeft),
    right:readPx(cs.paddingRight),
    top:readPx(cs.paddingTop),
    bottom:readPx(cs.paddingBottom)
  };

  // Safari/PWA normally reports the correct hardware cutout through env().
  // Some in-app/mobile browsers report 0 on both landscape sides even on an
  // iPhone with a notch/Dynamic Island. In that case we reserve a conservative
  // symmetric side gutter for IMPORTANT UI only. Background/canvas stays edge-to-edge.
  const iosLandscape=isIOSPhone()&&isLandscape();
  const browserMissedSideCutout=iosLandscape&&raw.left<24&&raw.right<24;
  const sideFallback=browserMissedSideCutout?52:10;

  const safe={
    left:Math.max(sideFallback,raw.left),
    right:Math.max(sideFallback,raw.right),
    top:Math.max(8,raw.top),
    bottom:Math.max(8,raw.bottom),
    hardware:raw,
    fallback:{iosLandscape,browserMissedSideCutout,side:sideFallback}
  };

  // Publish the runtime values back to CSS so DOM UI and Phaser helpers use
  // the exact same safe frame, including the iOS browser fallback above.
  try{
    const root=document.documentElement;
    root.style.setProperty('--tdr-safe-left',`${safe.left}px`);
    root.style.setProperty('--tdr-safe-right',`${safe.right}px`);
    root.style.setProperty('--tdr-safe-top',`${safe.top}px`);
    root.style.setProperty('--tdr-safe-bottom',`${safe.bottom}px`);
    window.__tdrSafeArea=safe;
  }catch{}
  return safe;
}

function publish(){
  raf=0;
  const safe=readSafeArea();
  try{window.dispatchEvent(new CustomEvent('tdr:safeareachange',{detail:safe}));}catch{}
}

function schedule(){
  if(raf)cancelAnimationFrame(raf);
  raf=requestAnimationFrame(publish);
}

export function installSafeAreaRuntime(){
  if(window.__tdrSafeAreaInstalled)return readSafeArea();
  window.__tdrSafeAreaInstalled=true;
  publish();
  window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('orientationchange',()=>{schedule();setTimeout(schedule,120);setTimeout(schedule,420);},{passive:true});
  window.addEventListener('tdr:viewportchange',schedule,{passive:true});
  window.addEventListener('pageshow',schedule,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();},{passive:true});
  window.visualViewport?.addEventListener?.('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener?.('scroll',schedule,{passive:true});
  return window.__tdrSafeArea;
}
