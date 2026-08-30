import './racePauseUi.css';

export function mountRacePauseUi({onContinue=()=>{},onCaptureWorld=()=>{},onCaptureTechnical=()=>{},onFinish=()=>{},onAbandon=()=>{}}={}){
  if(typeof document==='undefined')return null;
  const root=document.createElement('div');
  root.className='tdr-race-pause';
  root.dataset.tdrRaceUi='pause';
  root.innerHTML=`<section class="tdr-race-pause-card"><header class="tdr-race-pause-head"><div><div class="tdr-race-pause-kicker">SESIÓN EN PAUSA</div><div class="tdr-race-pause-title">Menú de carrera</div></div><div class="tdr-race-pause-icon">⏸️</div></header><div class="tdr-race-pause-grid"><button class="primary" data-a="continue">CONTINUAR</button><button data-a="world">CAPTURA MUNDO</button><button data-a="technical">CAPTURA TÉCNICA</button><button class="wide" data-a="finish">FINALIZAR SESIÓN</button><button class="danger" data-a="abandon">ABANDONAR SESIÓN</button></div><div class="tdr-race-pause-note">Las capturas se realizan con la pausa cerrada y el HUD oculto.</div></section>`;
  let closed=false;
  const bind=(key,fn)=>root.querySelector(`[data-a="${key}"]`)?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();fn();});
  bind('continue',onContinue);bind('world',onCaptureWorld);bind('technical',onCaptureTechnical);bind('finish',onFinish);bind('abandon',onAbandon);
  root.addEventListener('touchmove',event=>event.preventDefault(),{passive:false});
  document.body.appendChild(root);
  return {root,destroy(){if(closed)return;closed=true;try{root.remove();}catch{}}};
}
