// Bridge the existing circular stick to the DOM control's REAL client rect.
// No scene-size guesses and no polling; only Pointer Events on the visible pad.
// The original Phaser handlers remain a fallback for non-DOM/browser inputs.
export function bindVisibleStickPointer(element,state){
  if(!element||!state)return ()=>{};
  let activeId=null,anchorX=0,anchorY=0;
  const set=(x,y)=>{
    const rect=element.getBoundingClientRect();
    const cx=(rect.left+rect.right)*.5,cy=(rect.top+rect.bottom)*.5;
    const radius=Math.max(48,Math.min(rect.width,rect.height)*.34);
    const dx=x-cx-anchorX,dy=y-cy-anchorY;
    const d=Math.hypot(dx,dy);
    const ratio=d>radius?radius/Math.max(d,1e-6):1;
    state.stickX=dx*ratio/radius;
    state.stickY=dy*ratio/radius;
    state.steer=state.stickX;
    state.targetAngle=null;
    state.buttonSteer=0;
    state.leftActive=true;
  };
  const reset=()=>{
    activeId=null;anchorX=0;anchorY=0;
    state.stickX=0;state.stickY=0;state.steer=0;
    state.leftActive=false;state.targetAngle=null;
  };
  // The element itself becomes a generously-sized interactive surface.
  element.style.setProperty('pointer-events','auto','important');
  element.style.setProperty('touch-action','none','important');
  const down=e=>{
    if(activeId!==null)return;
    activeId=e.pointerId;
    const rect=element.getBoundingClientRect();
    anchorX=e.clientX-(rect.left+rect.right)*.5;
    anchorY=e.clientY-(rect.top+rect.bottom)*.5;
    state.leftActive=true;
    try{element.setPointerCapture(e.pointerId);}catch{}
    e.preventDefault();e.stopPropagation();
  };
  const move=e=>{
    if(activeId!==e.pointerId)return;
    set(e.clientX,e.clientY);
    e.preventDefault();e.stopPropagation();
  };
  const up=e=>{
    if(activeId!==e.pointerId)return;
    reset();
    try{if(element.hasPointerCapture?.(e.pointerId))element.releasePointerCapture(e.pointerId);}catch{}
    e.preventDefault();e.stopPropagation();
  };
  const handlers=[['pointerdown',down],['pointermove',move],['pointerup',up],
    ['pointercancel',up],['lostpointercapture',up]];
  handlers.forEach(([name,fn])=>element.addEventListener(name,fn,{passive:false}));
  return ()=>{
    reset();
    handlers.forEach(([name,fn])=>element.removeEventListener(name,fn));
    element.style.removeProperty('pointer-events');
    element.style.removeProperty('touch-action');
  };
}
