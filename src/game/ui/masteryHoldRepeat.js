// Pointer-held, one-pixel-at-a-time admin controls. No changes to driving input.
export function bindMasteryHoldRepeat(button,step,{
  windowTarget=globalThis,documentTarget=globalThis.document,
  delayMs=350,intervalMs=80
}={}){
  if(!button||typeof step!=='function')throw new TypeError('Hold control requires a button and step');
  let timeout=null,interval=null,active=false,pointerId=null;
  const cancel=()=>{
    active=false;pointerId=null;
    if(timeout!==null){windowTarget.clearTimeout(timeout);timeout=null;}
    if(interval!==null){windowTarget.clearInterval(interval);interval=null;}
    button.classList?.remove('is-holding');
  };
  const down=event=>{
    if(active||event.isPrimary===false||(event.pointerType==='mouse'&&event.button!==0))return;
    event.preventDefault();
    active=true;pointerId=event.pointerId;
    button.classList?.add('is-holding');
    try{if(pointerId!=null)button.setPointerCapture?.(pointerId);}catch{}
    step(); // Tap: exactly one pixel; hold: repeated one-pixel steps.
    timeout=windowTarget.setTimeout(()=>{
      timeout=null;
      if(!active)return;
      interval=windowTarget.setInterval(()=>{if(active)step();},intervalMs);
    },delayMs);
  };
  const end=event=>{
    if(!active)return;
    if(event?.pointerId!=null&&pointerId!=null&&event.pointerId!==pointerId)return;
    cancel();
  };
  const keyboardClick=event=>{
    // Native pointer-generated clicks are already handled on pointerdown.
    // Keyboard/assistive-tech clicks generally have detail 0.
    if(event.detail===0&&!active){event.preventDefault();step();}
  };
  const prevent=event=>event.preventDefault();
  const onVisibility=()=>{if(documentTarget?.hidden)cancel();};
  button.addEventListener('pointerdown',down,{passive:false});
  button.addEventListener('pointerup',end);
  button.addEventListener('pointercancel',end);
  button.addEventListener('lostpointercapture',end);
  button.addEventListener('pointerleave',end);
  button.addEventListener('click',keyboardClick);
  button.addEventListener('contextmenu',prevent);
  button.addEventListener('selectstart',prevent);
  button.addEventListener('dragstart',prevent);
  windowTarget.addEventListener?.('blur',cancel);
  documentTarget?.addEventListener?.('visibilitychange',onVisibility);
  const dispose=()=>{
    cancel();
    button.removeEventListener('pointerdown',down);
    button.removeEventListener('pointerup',end);
    button.removeEventListener('pointercancel',end);
    button.removeEventListener('lostpointercapture',end);
    button.removeEventListener('pointerleave',end);
    button.removeEventListener('click',keyboardClick);
    button.removeEventListener('contextmenu',prevent);
    button.removeEventListener('selectstart',prevent);
    button.removeEventListener('dragstart',prevent);
    windowTarget.removeEventListener?.('blur',cancel);
    documentTarget?.removeEventListener?.('visibilitychange',onVisibility);
  };
  return {cancel,dispose};
}
