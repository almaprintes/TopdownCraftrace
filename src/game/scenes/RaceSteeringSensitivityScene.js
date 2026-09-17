import { RaceScene as CurrentRaceScene } from './RaceGraphicsPresetScene.js';

const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const moveTowards=(current,target,maxDelta)=>{
  const d=target-current;
  if(Math.abs(d)<=maxDelta)return target;
  return current+Math.sign(d)*maxDelta;
};

function readSensitivity(){
  try{
    const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');
    return clamp(Number(raw?.controls?.sensitivity)||1,.5,1.5);
  }catch{return 1;}
}

// Keep the existing Settings DOM untouched visually, but correct the permitted
// sensitivity range to the agreed 50-150%. This module is loaded with the race
// scene graph, so the patch is available before Settings is opened.
function alignSensitivityControl(){
  try{
    document.querySelectorAll('#tdr-settings2 .s2card').forEach(card=>{
      if(card.querySelector('.s2label')?.textContent?.trim()!=='SENSIBILIDAD')return;
      const range=card.querySelector('input.s2range');
      if(!range)return;
      range.min='0.5';
      range.max='1.5';
      range.step='0.05';
      if(Number(range.value)<.5)range.value='0.5';
      if(Number(range.value)>1.5)range.value='1.5';
      const val=card.querySelector('.s2val');
      if(val)val.textContent=`${Math.round(Number(range.value)*100)}%`;
    });
  }catch{}
}
try{
  if(typeof document!=='undefined'){
    const observer=new MutationObserver(()=>alignSensitivityControl());
    observer.observe(document.documentElement,{childList:true,subtree:true});
    queueMicrotask(()=>alignSensitivityControl());
  }
}catch{}

// Input-response boundary only. Sensitivity changes how quickly the driver's
// requested direction reaches the existing steering physics. It never changes
// turnRate, grip, steering lock, mass, speed or any visual/touch geometry.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._tdrSteerResponse={x:0,y:0,steer:0};
    this._tdrSteerSensitivity=readSensitivity();
    this._tdrControlSettingsHandler=()=>{this._tdrSteerSensitivity=readSensitivity();};
    try{window.addEventListener('tdr2:control-settings',this._tdrControlSettingsHandler);}catch{}
    this.events.once('shutdown',()=>{
      try{window.removeEventListener('tdr2:control-settings',this._tdrControlSettingsHandler);}catch{}
    });
    return result;
  }

  update(time,deltaMs){
    const t=this.touch;
    if(!t)return super.update(time,deltaMs);

    // Settings currently persists immediately; reading the tiny local setting
    // here also makes changes authoritative even if an older Settings scene did
    // not emit the control-settings event.
    this._tdrSteerSensitivity=readSensitivity();

    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const sensitivity=clamp(Number(this._tdrSteerSensitivity)||1,.5,1.5);

    // Deliberately wide response window so 50% vs 150% is obvious on the
    // first corner. Full input is still exactly +/-1 at every setting.
    // 50%: ~0.70 s full-scale; 100%: ~0.20 s; 150%: ~0.055 s.
    const responseRate=1.43*Math.pow(3.74,(sensitivity-.5)*2);
    const maxDelta=responseRate*dt;
    const state=this._tdrSteerResponse||(this._tdrSteerResponse={x:0,y:0,steer:0});

    const rawX=clamp(Number(t.stickX)||0,-1,1);
    const rawY=clamp(Number(t.stickY)||0,-1,1);
    const rawSteer=clamp(Number(t.steer)||0,-1,1);

    state.x=moveTowards(state.x,rawX,maxDelta);
    state.y=moveTowards(state.y,rawY,maxDelta);
    state.steer=moveTowards(state.steer,rawSteer,maxDelta);

    t.stickX=state.x;
    t.stickY=state.y;
    if('steer' in t)t.steer=state.steer;

    try{return super.update(time,deltaMs);}
    finally{
      // Raw controls remain authoritative; no filtered value is fed back into
      // the DOM/touch/gamepad producer and no control is moved or resized.
      t.stickX=rawX;
      t.stickY=rawY;
      if('steer' in t)t.steer=rawSteer;
    }
  }
}