const KEY='tdr2:shipatonJudgeMode:v1';
const EVENT='tdr2:shipaton-judge-mode';

export function shipatonJudgeModeEnabled(){
  try{return localStorage.getItem(KEY)==='1';}catch{return false;}
}

export function setShipatonJudgeMode(enabled){
  const value=!!enabled;
  try{localStorage.setItem(KEY,value?'1':'0');}catch{}
  try{window.dispatchEvent(new CustomEvent(EVENT,{detail:{enabled:value}}));}catch{}
  syncJudgeBadge();
  return value;
}

export function toggleShipatonJudgeMode(){return setShipatonJudgeMode(!shipatonJudgeModeEnabled());}

// Evaluation access is deliberately read-only with respect to normal progression.
// Systems may use this as an additional access condition, but must never persist
// unlocks, currency, materials or ownership merely because Judge Mode is active.
export function evaluationAccessEnabled(){return shipatonJudgeModeEnabled();}

export function syncJudgeBadge(){
  const active=shipatonJudgeModeEnabled();
  let badge=document.getElementById('tdr-shipaton-judge-badge');
  if(!active){badge?.remove();return;}
  if(!badge){
    badge=document.createElement('div');badge.id='tdr-shipaton-judge-badge';badge.textContent='SHIPATON 2026 · MODO JUECES';
    Object.assign(badge.style,{position:'fixed',right:'max(10px,env(safe-area-inset-right,0px))',bottom:'max(8px,env(safe-area-inset-bottom,0px))',zIndex:'8500',pointerEvents:'none',padding:'6px 9px',border:'1px solid rgba(88,232,255,.55)',borderRadius:'8px',background:'rgba(4,12,20,.78)',color:'#8eefff',font:'800 9px system-ui,-apple-system,Segoe UI,sans-serif',letterSpacing:'.08em',boxShadow:'0 4px 18px rgba(0,0,0,.35)'});
    document.body.appendChild(badge);
  }
}

export const SHIPATON_JUDGE_MODE_KEY=KEY;
export const SHIPATON_JUDGE_MODE_EVENT=EVENT;

if(typeof window!=='undefined'){
  queueMicrotask(()=>syncJudgeBadge());
  window.addEventListener('pageshow',()=>syncJudgeBadge(),{passive:true});
}
