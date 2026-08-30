import { RaceScene as CurrentRaceScene } from './RaceMasteryRoofScene.js';
import { emitHaptic, shakeRaceCamera, applyKerbResistance } from '../services/raceFeedback.js';

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._kerbFeedback={lastAt:0,wasOn:false,nativePending:false,physicalLastAt:0};
    return result;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._updateKerbFeedback(Number(time)||performance.now());
    return result;
  }

  _updateKerbFeedback(now){
    if(typeof this._isOnKerb!=='function')return;
    const body=this.carBody;
    if(!body)return;
    const state=this._kerbFeedback||(this._kerbFeedback={lastAt:0,wasOn:false,nativePending:false,physicalLastAt:0});

    const cx=Number(body.center?.x??body.x),cy=Number(body.center?.y??body.y);
    if(!Number.isFinite(cx)||!Number.isFinite(cy))return;
    const vx=Number(body.velocity?.x)||0,vy=Number(body.velocity?.y)||0;
    const speed=Math.hypot(vx,vy);
    if(speed<12){state.wasOn=false;return;}

    const rawW=Number(body.width||body.gameObject?.displayWidth||22),rawH=Number(body.height||body.gameObject?.displayHeight||38);
    const carW=Math.max(12,Math.min(38,rawW)),carH=Math.max(20,Math.min(62,rawH));
    const halfTrack=carW*.50,axle=carH*.36;
    const angle=Number(body.gameObject?.rotation??this.carRig?.rotation??0)||0;
    const ca=Math.cos(angle),sa=Math.sin(angle);
    const localToWorld=(lx,ly)=>({x:cx+lx*ca-ly*sa,y:cy+lx*sa+ly*ca});
    const tyres=[localToWorld(-halfTrack,-axle),localToWorld(halfTrack,-axle),localToWorld(-halfTrack,axle),localToWorld(halfTrack,axle)];

    let wheelsOnKerb=0;
    for(const p of tyres)if(this._isOnKerb(p.x,p.y))wheelsOnKerb++;
    if(!wheelsOnKerb){state.wasOn=false;return;}

    const speed01=Math.max(0,Math.min(1,(speed-12)/300));
    const entry=!state.wasOn;
    state.wasOn=true;
    const interval=Math.round(98-speed01*26);
    if(!entry&&now-state.lastAt<interval)return;
    state.lastAt=now;

    const strong=wheelsOnKerb>=2;
    emitHaptic(state,entry||strong?'medium':'light',strong?55:40);
    shakeRaceCamera(this,{entry,strong,speed01});
    if(entry||now-state.physicalLastAt>=105){
      state.physicalLastAt=now;
      applyKerbResistance(this,body,{wheelsOnKerb,speed01});
    }
  }
}
