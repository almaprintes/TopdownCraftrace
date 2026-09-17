import { RaceScene as CurrentRaceScene } from './RaceGraphicsPresetScene.js';

const SETTINGS_KEY='tdr2:settings';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const moveTowards=(current,target,maxDelta)=>{const d=target-current;return Math.abs(d)<=maxDelta?target:current+Math.sign(d)*maxDelta;};
const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};
function readSensitivity(){try{const raw=JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}');return clamp(Number(raw?.controls?.sensitivity)||1,.5,1.5);}catch{return 1;}}

export class RaceScene extends CurrentRaceScene{
  create(data){const result=super.create(data);this._tdrSteerResponse={x:0,y:0,steer:0};return result;}
  update(time,deltaMs){
    const t=this.touch;if(!t)return super.update(time,deltaMs);
    const sensitivity=readSensitivity();
    const dt=clamp(Number(deltaMs||16.67)/1000,.001,.05);
    const rawX=clamp(Number(t.stickX)||0,-1,1),rawY=clamp(Number(t.stickY)||0,-1,1),rawSteer=clamp(Number(t.steer)||0,-1,1);
    const state=this._tdrSteerResponse||(this._tdrSteerResponse={x:0,y:0,steer:0});

    // 100% is the original steering exactly. Below 100% only response time is
    // softened; full held input still reaches the same final steering request.
    if(sensitivity<1){
      const p=(sensitivity-.5)/.5;
      const responseRate=1.35+18*Math.pow(clamp(p,0,1),2.4);
      const maxDelta=responseRate*dt;
      state.x=moveTowards(state.x,rawX,maxDelta);state.y=moveTowards(state.y,rawY,maxDelta);state.steer=moveTowards(state.steer,rawSteer,maxDelta);
      t.stickX=state.x;t.stickY=state.y;if('steer' in t)t.steer=state.steer;
    }else{
      state.x=rawX;state.y=rawY;state.steer=rawSteer;
    }

    const rotationBefore=this.car?.rotation;
    let result;
    try{result=super.update(time,deltaMs);}
    finally{t.stickX=rawX;t.stickY=rawY;if('steer' in t)t.steer=rawSteer;}

    // Above 100%, accelerate only the steering response already produced by
    // the normal physics. Never change grip/speed/mass and never steer beyond
    // the driver's requested stick direction. 150% = 2.5x response rate.
    if(sensitivity>1&&this.car&&Number.isFinite(rotationBefore)){
      const normalDelta=wrapPi(this.car.rotation-rotationBefore);
      const boost=1+3*(sensitivity-1); // 100=1x, 125=1.75x, 150=2.5x
      let boosted=normalDelta*boost;
      const mag=Math.hypot(rawX,rawY);
      if(mag>.08){
        const target=Math.atan2(rawY,rawX);
        const remaining=wrapPi(target-rotationBefore);
        if(Math.sign(boosted)===Math.sign(remaining)&&Math.abs(boosted)>Math.abs(remaining))boosted=remaining;
      }
      this.car.rotation=rotationBefore+boosted;
    }
    return result;
  }
}
