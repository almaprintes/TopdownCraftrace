export function emitHaptic(state,strength='light',duration=40){
  try{
    const haptics=globalThis?.Capacitor?.Plugins?.Haptics;
    if(haptics?.impact&&!state.nativePending){
      state.nativePending=true;
      const style=strength==='medium'?'MEDIUM':'LIGHT';
      Promise.resolve(haptics.impact({style})).catch(()=>{}).finally(()=>{state.nativePending=false;});
      return;
    }
  }catch{}

  try{
    if(typeof navigator?.vibrate==='function'){
      const ms=Math.max(36,Math.min(62,Math.round(duration)));
      navigator.vibrate(ms);
    }
  }catch{}
}

export function shakeRaceCamera(scene,{entry=false,strong=false,speed01=0}={}){
  try{
    const cam=scene?.cameras?.main;
    if(!cam?.shake)return;
    const base=entry?0.0034:(strong?0.0027:0.0021);
    const intensity=base+Math.max(0,Math.min(1,Number(speed01)||0))*0.0011;
    const duration=entry?72:(strong?58:46);
    cam.shake(duration,intensity,true);
  }catch{}
}

export function applyKerbResistance(scene,body,{wheelsOnKerb=1,speed01=0}={}){
  try{
    const vx=Number(body?.velocity?.x)||0;
    const vy=Number(body?.velocity?.y)||0;
    if(!Number.isFinite(vx)||!Number.isFinite(vy))return;
    const s=Math.max(0,Math.min(1,Number(speed01)||0));
    const loss=wheelsOnKerb>=2?(0.991-s*0.002):(0.995-s*0.001);
    const setVelocity=scene?.matter?.body?.setVelocity;
    if(typeof setVelocity==='function')setVelocity.call(scene.matter.body,body,{x:vx*loss,y:vy*loss});
  }catch{}
}
