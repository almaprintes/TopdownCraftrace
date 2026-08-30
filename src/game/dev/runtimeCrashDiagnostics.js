const SESSION_KEY='tdr2:runtimeSession';
const LAST_EVENT_KEY='tdr2:runtimeLastEvent';
const AUTO_SAFE_UNTIL_KEY='tdr2:autoIosSafeModeUntil';

function safeJson(raw){try{return JSON.parse(raw);}catch{return null;}}
function store(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function isIOSDevice(){try{const ua=String(navigator?.userAgent||''),platform=String(navigator?.platform||'');return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);}catch{return false;}}
function armAutoSafeMode(){
  if(!isIOSDevice())return;
  try{localStorage.setItem(AUTO_SAFE_UNTIL_KEY,String(Date.now()+6*60*60*1000));}catch{}
}
function sceneName(game){
  try{
    const scenes=game?.scene?.getScenes?.(true)||[];
    const s=scenes[scenes.length-1];
    return String(s?.sys?.settings?.key||s?.scene?.key||'unknown');
  }catch{return'unknown';}
}
function snapshot(game,type,extra={}){
  const canvas=game?.canvas;
  const renderer=game?.renderer;
  const info={
    at:new Date().toISOString(),type,
    scene:sceneName(game),
    mode:(()=>{try{return localStorage.getItem('tdr2:gameMode')||null;}catch{return null;}})(),
    track:(()=>{try{return localStorage.getItem('tdr2:selectedTrack')||null;}catch{return null;}})(),
    dpr:Number(window.devicePixelRatio||1),
    canvasW:Number(canvas?.width||0),canvasH:Number(canvas?.height||0),
    cssW:Number(canvas?.clientWidth||0),cssH:Number(canvas?.clientHeight||0),
    renderer:String(renderer?.type??''),
    ...extra
  };
  store(LAST_EVENT_KEY,info);
  return info;
}
function showNotice(info){
  if(typeof document==='undefined'||!info)return;
  const old=document.querySelector('[data-tdr-crash-notice]');old?.remove?.();
  const node=document.createElement('div');
  node.dataset.tdrCrashNotice='1';
  node.style.cssText='position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:25000;max-width:min(92vw,640px);padding:9px 12px;border:1px solid #ff9f43;background:rgba(7,15,24,.96);color:#fff;font:700 11px system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 4px 18px #0008;text-align:center;pointer-events:none';
  const label=info.type==='webglcontextlost'?'WEBGL PERDIÓ EL CONTEXTO':info.type==='js_error'?'ERROR JAVASCRIPT':info.type==='promise_rejection'?'ERROR ASÍNCRONO':'REINICIO INESPERADO';
  node.textContent=`DIAGNÓSTICO · ${label} · escena ${info.scene||'desconocida'}`;
  document.body.appendChild(node);
  setTimeout(()=>node.remove(),9000);
}

export function installRuntimeCrashDiagnostics(game){
  if(typeof window==='undefined'||!game||window.__tdrRuntimeCrashDiagnostics)return;
  window.__tdrRuntimeCrashDiagnostics=true;

  const previous=safeJson((()=>{try{return localStorage.getItem(SESSION_KEY);}catch{return null;}})());
  if(previous?.active===true&&previous?.clean!==true){
    const detected={...previous,type:'unexpected_reload',detectedAt:new Date().toISOString()};
    store(LAST_EVENT_KEY,detected);
    armAutoSafeMode();
    setTimeout(()=>showNotice(detected),1200);
  }

  const session={
    id:`${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
    startedAt:new Date().toISOString(),startedMs:Date.now(),lastBeat:new Date().toISOString(),active:true,clean:false,hadError:false
  };
  store(SESSION_KEY,session);

  const beat=()=>{
    // Diagnostics are not gameplay-critical. 15 s avoids synchronous storage
    // churn every few seconds while still leaving useful crash breadcrumbs.
    session.lastBeat=new Date().toISOString();
    session.scene=sceneName(game);
    store(SESSION_KEY,session);
  };
  const timer=setInterval(beat,15000);

  const onError=(event)=>{
    session.hadError=true;
    const info=snapshot(game,'js_error',{message:String(event?.message||'error'),source:String(event?.filename||''),line:Number(event?.lineno||0),column:Number(event?.colno||0)});
    showNotice(info);
  };
  const onRejection=(event)=>{
    session.hadError=true;
    const reason=event?.reason;
    const info=snapshot(game,'promise_rejection',{message:String(reason?.message||reason||'unhandled rejection')});
    showNotice(info);
  };
  const onContextLost=(event)=>{
    session.hadError=true;
    try{event?.preventDefault?.();}catch{}
    const info=snapshot(game,'webglcontextlost');
    armAutoSafeMode();
    showNotice(info);
  };
  const markClean=()=>{
    session.active=false;session.clean=true;session.endedAt=new Date().toISOString();
    session.scene=sceneName(game);store(SESSION_KEY,session);
    // A clean, error-free minute proves the automatic fallback is no longer
    // needed. Manual forceIosSafeMode is intentionally untouched.
    if(isIOSDevice()&&!session.hadError&&Date.now()-Number(session.startedMs||Date.now())>=60000){
      try{localStorage.removeItem(AUTO_SAFE_UNTIL_KEY);}catch{}
    }
  };

  window.addEventListener('error',onError);
  window.addEventListener('unhandledrejection',onRejection);
  window.addEventListener('pagehide',markClean);
  window.addEventListener('beforeunload',markClean);
  game.canvas?.addEventListener?.('webglcontextlost',onContextLost,false);

  game.events?.once?.('destroy',()=>{
    clearInterval(timer);
    markClean();
    window.removeEventListener('error',onError);
    window.removeEventListener('unhandledrejection',onRejection);
    window.removeEventListener('pagehide',markClean);
    window.removeEventListener('beforeunload',markClean);
    game.canvas?.removeEventListener?.('webglcontextlost',onContextLost,false);
    window.__tdrRuntimeCrashDiagnostics=false;
  });
}
