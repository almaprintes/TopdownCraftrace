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

export function readSafeArea(){
  const el=ensureProbe();
  const cs=getComputedStyle(el);
  const raw={
    left:readPx(cs.paddingLeft),
    right:readPx(cs.paddingRight),
    top:readPx(cs.paddingTop),
    bottom:readPx(cs.paddingBottom)
  };
  const safe={
    left:Math.max(10,raw.left),
    right:Math.max(10,raw.right),
    top:Math.max(8,raw.top),
    bottom:Math.max(8,raw.bottom),
    hardware:raw
  };
  try{window.__tdrSafeArea=safe;}catch{}
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
  window.addEventListener('orientationchange',schedule,{passive:true});
  window.addEventListener('tdr:viewportchange',schedule,{passive:true});
  window.visualViewport?.addEventListener?.('resize',schedule,{passive:true});
  window.visualViewport?.addEventListener?.('scroll',schedule,{passive:true});
  return window.__tdrSafeArea;
}
