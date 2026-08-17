import { RaceScene as CurrentRaceScene } from './RaceReplayDroneExportScene.js';

const TARGET_TRACK_NAME = 'Imported Track 1773617484759';
const FLAG_KEY = 'tdr2:track01AntiCutPenalty';
const PENALTY_MS = 2000;

// Zona marcada por el usuario: interior de la horquilla central antes de CP2.
// Es deliberadamente más compacta que la versión anterior para no invadir el asfalto.
const FIXED_ZONE = Object.freeze({ x:1145, y:810, rx:68, ry:78 });

function enabled(){
  try{
    const raw=localStorage.getItem(FLAG_KEY);
    return raw==null ? true : raw!=='0';
  }catch{return true;}
}

function xy(p){
  if(Array.isArray(p))return {x:Number(p[0]),y:Number(p[1]),width:Number(p[2])};
  return {x:Number(p?.x),y:Number(p?.y),width:Number(p?.width)};
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._antiCutArmed=true;
    this._antiCutPenaltyApplied=false;
    this._antiCutNotice=null;
    const result=super.create(data);
    this.events.once('shutdown',()=>{
      try{this._antiCutNotice?.destroy?.();}catch{}
      this._antiCutNotice=null;
    });
    return result;
  }

  _antiCutTargetTrack(){
    const name=String(this.track?.meta?.name||'');
    return name===TARGET_TRACK_NAME || this.trackKey==='track01';
  }

  _showAntiCutPenalty(){
    try{this._antiCutNotice?.destroy?.();}catch{}
    const {width}=this.scale;
    const t=this.add.text(width/2,86,'ATAJO · +2.000 s',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial,sans-serif',
      fontSize:'20px',fontStyle:'bold',color:'#ffcf5a',
      backgroundColor:'rgba(10,14,20,.82)',padding:{left:14,right:14,top:7,bottom:7}
    }).setOrigin(.5,0).setScrollFactor(0).setDepth(250000);
    this._antiCutNotice=t;
    try{this.cameras?.main?.ignore?.(t);this.uiCam?.removeFromRenderList?.(t);}catch{}
    this.tweens.add({
      targets:t,alpha:0,y:76,duration:900,delay:650,ease:'Sine.easeIn',
      onComplete:()=>{if(t?.scene)t.destroy();if(this._antiCutNotice===t)this._antiCutNotice=null;}
    });
  }

  _applyAntiCutPenalty(){
    if(this._antiCutPenaltyApplied)return;
    this._antiCutPenaltyApplied=true;
    if(Number.isFinite(this.timing?.lapStart)) this.timing.lapStart-=PENALTY_MS;
    if(Number.isFinite(this.lapStartTick)) this.lapStartTick-=Math.round(PENALTY_MS/(1000/60));
    this._showAntiCutPenalty();
  }

  _insideMarkedAntiCutZone(x,y){
    const dx=(Number(x)-FIXED_ZONE.x)/FIXED_ZONE.rx;
    const dy=(Number(y)-FIXED_ZONE.y)/FIXED_ZONE.ry;
    return Number.isFinite(dx)&&Number.isFinite(dy)&&(dx*dx+dy*dy)<=1;
  }

  _nearestRoadDistance(x,y){
    const cl=this.track?.meta?.centerline||this.track?.centerline||[];
    if(!Array.isArray(cl)||cl.length<2)return null;
    let best=null;
    for(let i=0;i<cl.length;i++){
      const a=xy(cl[i]),b=xy(cl[(i+1)%cl.length]);
      if(![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
      const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;
      if(l2<1e-6)continue;
      const t=Math.max(0,Math.min(1,((x-a.x)*vx+(y-a.y)*vy)/l2));
      const qx=a.x+vx*t,qy=a.y+vy*t;
      const dist=Math.hypot(x-qx,y-qy);
      if(!best||dist<best.dist){
        const width=Number.isFinite(a.width)?a.width:(Number.isFinite(b.width)?b.width:Number(this.track?.meta?.trackWidth)||162);
        best={dist,width};
      }
    }
    return best;
  }

  _isGenuineGrassCut(x,y){
    const road=this._nearestRoadDistance(x,y);
    if(!road)return false;
    const half=Math.max(1,Number(road.width||162)*0.5);
    // Pedimos que el centro del coche esté claramente más allá del borde de pista.
    // El margen evita falsos positivos al rozar el límite desde el asfalto.
    return road.dist > half + 8;
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(!enabled()||!this._antiCutTargetTrack()||this._replayActive||!this._raceStarted||!this.carBody)return result;

    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return result;

    const inZone=this._insideMarkedAntiCutZone(x,y);
    const genuineCut=inZone&&this._isGenuineGrassCut(x,y);

    if(genuineCut&&this._antiCutArmed){
      this._antiCutArmed=false;
      this._applyAntiCutPenalty();
    }

    if(!inZone)this._antiCutArmed=true;

    // Una sola penalización por vuelta. Se rearma al comenzar la siguiente.
    const p=Number(this._computeLapProgress01?.(x,y));
    if(Number.isFinite(p)&&p<0.08)this._antiCutPenaltyApplied=false;

    return result;
  }
}

// Reversible trial switch:
// localStorage.setItem('tdr2:track01AntiCutPenalty','0')  -> OFF
// localStorage.setItem('tdr2:track01AntiCutPenalty','1')  -> ON
