const DELTA_PANEL_ID='tdr-live-delta-panel';
const TOGGLE_ID='tdr-live-delta-toggle';
const STORAGE_KEY='tdr2:liveDeltaVisible:v1';

function isRaceVisible(){
  const canvas=document.querySelector('canvas');
  if(!canvas)return false;
  const report=document.querySelector('.session-report,.race-report,[data-session-report],#session-report');
  return !report;
}

function makeToggle(){
  let button=document.getElementById(TOGGLE_ID);
  if(button)return button;
  button=document.createElement('button');
  button.id=TOGGLE_ID;
  button.type='button';
  button.textContent='DELTA';
  button.setAttribute('aria-pressed','false');
  Object.assign(button.style,{
    position:'fixed',
    top:'calc(env(safe-area-inset-top, 0px) + 18px)',
    right:'calc(env(safe-area-inset-right, 0px) + 92px)',
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
    touchAction:'manipulation',
    cursor:'pointer'
  });
  document.body.appendChild(button);
  return button;
}

let enabled=false;
function apply(){
  const button=makeToggle();
  const panel=document.getElementById(DELTA_PANEL_ID);
  const race=isRaceVisible();
  button.style.display=race?'block':'none';
  button.setAttribute('aria-pressed',enabled?'true':'false');
  button.style.color=enabled?'#58e8ff':'rgba(255,255,255,.72)';
  button.style.borderColor=enabled?'rgba(88,232,255,.58)':'rgba(255,255,255,.22)';
  button.style.boxShadow=enabled?'0 0 14px rgba(88,232,255,.18),0 4px 14px rgba(0,0,0,.24)':'0 4px 14px rgba(0,0,0,.24)';
  if(panel){
    panel.dataset.tdrUserDeltaEnabled=enabled?'1':'0';
    panel.style.setProperty('left','auto','important');
    panel.style.setProperty('right','calc(env(safe-area-inset-right, 0px) + 92px)','important');
    panel.style.setProperty('top','calc(env(safe-area-inset-top, 0px) + 58px)','important');
    panel.style.setProperty('transform','none','important');
    if(!enabled||!race)panel.style.setProperty('visibility','hidden','important');
    else panel.style.removeProperty('visibility');
  }
}

function setEnabled(value){
  enabled=!!value;
  // Deliberately session-only: every new race starts clean with delta OFF.
  try{sessionStorage.setItem(STORAGE_KEY,enabled?'1':'0');}catch{}
  apply();
}

function boot(){
  // Product rule: delta is opt-in by default on every fresh app/race session.
  enabled=false;
  try{sessionStorage.removeItem(STORAGE_KEY);}catch{}
  const button=makeToggle();
  button.addEventListener('click',()=>setEnabled(!enabled));
  const observer=new MutationObserver(()=>apply());
  observer.observe(document.body,{childList:true,subtree:true});
  window.addEventListener('resize',apply,{passive:true});
  window.addEventListener('orientationchange',apply,{passive:true});
  apply();
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
else boot();
