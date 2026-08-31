import './raceFeedbackUi.css';

const HOLD_MS=2400;
const EXIT_MS=260;

function esc(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function hostFor(scene){
  const canvas=scene?.game?.canvas;
  return canvas?.parentElement||document.getElementById('app')||document.body;
}

export function destroyRaceFeedback(scene){
  const state=scene?._raceFeedbackState;
  if(state?.hideTimer)clearTimeout(state.hideTimer);
  if(state?.removeTimer)clearTimeout(state.removeTimer);
  try{state?.root?.remove?.();}catch{}
  if(scene)scene._raceFeedbackState=null;
}

export function showRaceFeedback(scene,{type='info',eyebrow='',title='',detail='',holdMs=HOLD_MS}={}){
  if(typeof document==='undefined'||!scene)return null;
  const host=hostFor(scene);if(!host)return null;
  try{if(getComputedStyle(host).position==='static')host.style.position='relative';}catch{}

  let state=scene._raceFeedbackState;
  if(!state?.root?.isConnected){
    const root=document.createElement('div');
    root.className='tdr-race-feedback';
    root.dataset.tdrRaceUi='1';
    root.setAttribute('aria-live','polite');
    root.innerHTML='<div class="tdr-race-feedback-accent"></div><div class="tdr-race-feedback-copy"><small data-feedback-eyebrow></small><strong data-feedback-title></strong><span data-feedback-detail></span></div>';
    host.appendChild(root);
    state={root,hideTimer:null,removeTimer:null};
    scene._raceFeedbackState=state;
  }

  if(state.hideTimer)clearTimeout(state.hideTimer);
  if(state.removeTimer)clearTimeout(state.removeTimer);
  const root=state.root;
  root.className=`tdr-race-feedback is-${String(type||'info').replace(/[^a-z0-9_-]/gi,'')}`;
  root.querySelector('[data-feedback-eyebrow]').innerHTML=esc(eyebrow);
  root.querySelector('[data-feedback-title]').innerHTML=esc(title);
  root.querySelector('[data-feedback-detail]').innerHTML=esc(detail);
  requestAnimationFrame(()=>requestAnimationFrame(()=>root.classList.add('is-visible')));

  state.hideTimer=setTimeout(()=>{
    root.classList.remove('is-visible');
    state.removeTimer=setTimeout(()=>{
      try{root.remove();}catch{}
      if(scene._raceFeedbackState===state)scene._raceFeedbackState=null;
    },EXIT_MS+40);
  },Math.max(450,Number(holdMs)||HOLD_MS));
  return root;
}
