const DELTA_PANEL_ID='tdr-live-delta-panel';
const TOGGLE_ID='tdr-live-delta-toggle';

let enabled=false;

function raceControlsRoot(){
  return document.getElementById('tdr-race-controls');
}

function isRaceVisible(){
  const controls=raceControlsRoot();
  if(!controls?.isConnected)return false;
  const style=getComputedStyle(controls);
  if(style.display==='none'||style.visibility==='hidden')return false;
  if(document.getElementById('tdrStartup'))return false;
  if(document.querySelector('.session-report,.race-report,[data-session-report],#session-report'))return false;
  if(document.querySelector('[data-tdr-session-rewards],#tdr-session-rewards'))return false;
  return true;
}

function makeToggle(){
  let button=document.getElementById(TOGGLE_ID);
  if(button)return button;
  button=document.createElement('button');
  button.id=TOGGLE_ID;
  button.type='button';
  button.textContent='DELTA';
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Mostrar u ocultar delta de vuelta');
  Object.assign(button.style,{
    position:'fixed',
    top:'calc(env(safe-area-inset-top, 0px) + 18px)',
    right:'calc(env(safe-area-inset-right, 0px) + 190px)',
    zIndex:'2147483100',
    height:'34px',
    padding:'0 13px',
    borderRadius:'10px',
    border:'1px solid rgba(255,255,255,.22)',
    background:'rgba(8,13,22,.82)',
    color:'rgba(255,255,255,.72)',
    font:'800 10px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    letterSpacing:'.14em',
    backdropFilter:'blur(7px)',
    WebkitBackdropFilter:'blur(7px)',
    boxShadow:'0 4px 14px rgba(0,0,0,.24)',
    touchAction:'none',
    WebkitUserSelect:'none',
    userSelect:'none',
    cursor:'pointer',
    display:'none'
  });

  const activate=e=>{
    if(e.pointerType&&e.pointerType!=='touch'&&e.pointerType!=='pen')return;
    e.preventDefault();
    e.stopPropagation();
    enabled=!enabled;
    apply();
  };
  button.addEventListener('pointerdown',activate,{capture:true,passive:false});
  button.addEventListener('click',e=>{
    // Mouse/desktop fallback. Touch is handled on pointerdown so it also works
    // while another finger is steering or holding throttle/brake.
    if(e.detail===0||e.pointerType)return;
    enabled=!enabled;
    apply();
  });
  document.body.appendChild(button);
  return button;
}

function installPauseMultitouch(){
  const buttons=[...document.querySelectorAll('button')];
  for(const button of buttons){
    if(button.dataset.tdrMultitouchPause==='1')continue;
    const text=String(button.textContent||'').replace(/\s+/g,'').toUpperCase();
    const meta=`${button.getAttribute('aria-label')||''} ${button.title||''}`.toUpperCase();
    const looksPause=/PAUSA|PAUSE/.test(meta)||text==='Ⅱ'||text==='II'||text==='||'||text==='⏸';
    if(!looksPause)continue;
    button.dataset.tdrMultitouchPause='1';
    button.style.touchAction='none';
    button.style.pointerEvents='auto';
    button.addEventListener('pointerdown',e=>{
      if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
      e.preventDefault();
      e.stopPropagation();
      // The legacy pause UI listens to click. Fire it immediately from this
      // independent pointer so a second finger can pause while driving.
      button.click();
    },{capture:true,passive:false});
  }
}

function apply(){
  const button=makeToggle();
  const panel=document.getElementById(DELTA_PANEL_ID);
  const race=isRaceVisible();

  if(!race)enabled=false;
  button.style.display=race?'block':'none';
  button.setAttribute('aria-pressed',enabled?'true':'false');
  button.style.color=enabled?'#58e8ff':'rgba(255,255,255,.72)';
  button.style.borderColor=enabled?'rgba(88,232,255,.58)':'rgba(255,255,255,.22)';
  button.style.boxShadow=enabled?'0 0 14px rgba(88,232,255,.18),0 4px 14px rgba(0,0,0,.24)':'0 4px 14px rgba(0,0,0,.24)';

  if(panel){
    panel.dataset.tdrUserDeltaEnabled=enabled?'1':'0';
    panel.style.setProperty('left','auto','important');
    panel.style.setProperty('right','calc(env(safe-area-inset-right, 0px) + 190px)','important');
    panel.style.setProperty('top','calc(env(safe-area-inset-top, 0px) + 86px)','important');
    panel.style.setProperty('transform','none','important');
    if(!enabled||!race)panel.style.setProperty('visibility','hidden','important');
    else panel.style.removeProperty('visibility');
  }

  installPauseMultitouch();
}

function boot(){
  enabled=false;
  makeToggle();
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['style','class']});
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('orientationchange',apply,{passive:true});
  window.addEventListener('tdr:viewportchange',apply,{passive:true});
  apply();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
