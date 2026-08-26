import { showSeasonRewardCelebration } from './seasonRewardCelebration.js';

function armTouchSafeContinue(){
  const root=document.querySelector('.tdr-season-celebration');
  const button=root?.querySelector('.continue');
  if(!root||!button)return;

  // Decorative layers must never steal taps from the CTA.
  root.querySelectorAll('.burst,.ring,.confetti,.spark,.art-wrap,.art').forEach(el=>{
    try{el.style.pointerEvents='none';}catch{}
  });
  try{
    root.style.pointerEvents='auto';
    button.style.pointerEvents='auto';
    button.style.touchAction='manipulation';
    button.style.position='relative';
    button.style.zIndex='20';
  }catch{}

  let closing=false;
  const closeNow=(ev)=>{
    if(closing)return;
    closing=true;
    try{ev?.preventDefault?.();ev?.stopPropagation?.();}catch{}
    try{
      const anim=root.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out'});
      anim.finished.catch(()=>{}).finally(()=>root.remove());
    }catch{root.remove();}
  };

  // Android WebViews / older mobile browsers are inconsistent about click after
  // touch-action:none on an ancestor. Listen to the physical end events too.
  button.addEventListener('pointerup',closeNow,{passive:false});
  button.addEventListener('touchend',closeNow,{passive:false});
  button.addEventListener('click',closeNow,{passive:false});
}

export function installSeasonRewardCelebrations(){
  if(typeof window==='undefined'||window.__tdrSeasonRewardCelebrationTouchSafeInstalled)return;
  window.__tdrSeasonRewardCelebrationTouchSafeInstalled=true;
  window.addEventListener('tdr:seasonRewardClaimed',ev=>{
    showSeasonRewardCelebration(ev?.detail?.event);
    requestAnimationFrame(armTouchSafeContinue);
  });
}
