import { RaceScene as CurrentRaceScene } from './RaceReplayDroneExportScene.js';

const TARGET_TRACK_NAME = 'Imported Track 1773617484759';
const FLAG_KEY = 'tdr2:track01AntiCutPenalty';
const PENALTY_MS = 2000;

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const wrap01=n=>((Number(n)%1)+1)%1;
const wrapPi=a=>{while(a>Math.PI)a-=Math.PI*2;while(a<-Math.PI)a+=Math.PI*2;return a;};

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

function progressDelta(a,b){
  let d=wrap01(a)-wrap01(b);
  if(d>.5)d-=1;
  if(d<-.5)d+=1;
  return d;
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._antiCutArmed=true;
    this._antiCutPenaltyApplied=false;
    this._antiCutNotice=null;
    this._antiCutZone=null;
    const result=super.create(data);
    this.events.once('shutdown',()=>{
      try{this._antiCutNotice?.destroy?.();}catch{}
      this._antiCutNotice=null;
      this._antiCutZone=null;
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
    this.tweens.add({targets:t,alpha:0,y:76,duration:900,delay:650,ease:'Sine.easeIn',onComplete:()=>{if(t?.scene)t.destroy();if(this._antiCutNotice===t)this._antiCutNotice=null;}});
  }

  _applyAntiCutPenalty(){
    if(this._antiCutPenaltyApplied)return;
    this._antiCutPenaltyApplied=true;

    if(Number.isFinite(this.timing?.lapStart)) this.timing.lapStart-=PENALTY_MS;
    if(Number.isFinite(this.lapStartTick)) this.lapStartTick-=Math.round(PENALTY_MS/(1000/60));
    this._showAntiCutPenalty();
  }

  _antiCutCenterline(){
    const raw=this.track?.meta?.raceCenterline||this.track?.meta?.centerline||this.track?.raceCenterline||this.track?.centerline||[];
    return Array.isArray(raw)?raw:[];
  }

  _antiCutCp2(){
    const cps=this.track?.meta?.checkpoints||this.track?.checkpoints||[];
    return Array.isArray(cps)&&cps.length>=2?cps[1]:null;
  }

  _nearestCenterSegment(x,y){
    const cl=this._antiCutCenterline();
    if(cl.length<3)return null;
    let best=null;
    for(let i=0;i<cl.length;i++){
      const a=xy(cl[i]),b=xy(cl[(i+1)%cl.length]);
      if(![a.x,a.y,b.x,b.y].every(Number.isFinite))continue;
      const vx=b.x-a.x,vy=b.y-a.y,l2=vx*vx+vy*vy;
      if(l2<1e-6)continue;
      const t=clamp(((x-a.x)*vx+(y-a.y)*vy)/l2,0,1);
      const qx=a.x+vx*t,qy=a.y+vy*t,dx=x-qx,dy=y-qy,d2=dx*dx+dy*dy;
      if(!best||d2<best.d2){
        const len=Math.sqrt(l2),nx=-vy/len,ny=vx/len;
        best={i,t,qx,qy,d2,lateral:dx*nx+dy*ny,heading:Math.atan2(vy,vx),width:(Number(a.width)||Number(b.width)||Number(this.track?.meta?.trackWidth)||160)};
      }
    }
    return best;
  }

  _buildAntiCutZone(){
    if(this._antiCutZone)return this._antiCutZone;
    const cl=this._antiCutCenterline(),cp2=this._antiCutCp2();
    if(cl.length<12||!cp2?.a||!cp2?.b)return null;

    const cpx=(Number(cp2.a.x)+Number(cp2.b.x))*.5;
    const cpy=(Number(cp2.a.y)+Number(cp2.b.y))*.5;
    if(!Number.isFinite(cpx)||!Number.isFinite(cpy))return null;
    const cpProj=this._nearestCenterSegment(cpx,cpy);
    if(!cpProj)return null;

    const n=cl.length;
    // Search only behind CP2.  This deliberately selects the strongest bend in the
    // final ~18% of a lap before CP2, i.e. the corner immediately preceding it.
    let best=null;
    const minBack=Math.max(2,Math.round(n*.018));
    const maxBack=Math.max(minBack+3,Math.round(n*.18));
    for(let back=minBack;back<=maxBack;back++){
      const i=(cpProj.i-back+n)%n;
      const p0=xy(cl[(i-2+n)%n]),p1=xy(cl[i]),p2=xy(cl[(i+2)%n]);
      if(![p0.x,p0.y,p1.x,p1.y,p2.x,p2.y].every(Number.isFinite))continue;
      const h0=Math.atan2(p1.y-p0.y,p1.x-p0.x),h1=Math.atan2(p2.y-p1.y,p2.x-p1.x);
      const turn=wrapPi(h1-h0),score=Math.abs(turn);
      if(!best||score>best.score)best={i,turn,score,p:p1};
    }
    if(!best||best.score<0.015)return null;

    const apexProgress=Number(this._computeLapProgress01?.(best.p.x,best.p.y));
    const cpProgress=Number(this._computeLapProgress01?.(cpx,cpy));
    if(!Number.isFinite(apexProgress)||!Number.isFinite(cpProgress))return null;

    const turnSign=Math.sign(best.turn)||1;
    this._antiCutZone={
      apexProgress:wrap01(apexProgress),
      cp2Progress:wrap01(cpProgress),
      turnSign,
      // Narrow window around the apex: about 4.4% of a lap total.
      halfWindow:.022,
      centerIndex:best.i
    };
    return this._antiCutZone;
  }

  _isInsideOfTargetCorner(x,y,zone){
    const proj=this._nearestCenterSegment(x,y);
    if(!proj)return false;
    // Positive lateral means left of the racing direction. For a left-hand bend the
    // inside is left; for a right-hand bend the inside is right.
    const insideSigned=Number(proj.lateral)*Number(zone.turnSign||1);
    const half=Math.max(30,Number(proj.width||160)*.5);
    return insideSigned>half*.30;
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(!enabled()||!this._antiCutTargetTrack()||this._replayActive||!this._raceStarted||!this.carBody||!this._isOnTrack)return result;

    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    const p=Number(this._computeLapProgress01?.(x,y));
    if(!Number.isFinite(p))return result;

    const zone=this._buildAntiCutZone();
    if(!zone)return result;

    const inWindow=Math.abs(progressDelta(p,zone.apexProgress))<=zone.halfWindow;
    const offTrack=!this._isOnTrack(x,y);
    const inside=inWindow&&this._isInsideOfTargetCorner(x,y,zone);

    if(inWindow&&inside&&offTrack&&this._antiCutArmed){
      this._antiCutArmed=false;
      this._applyAntiCutPenalty();
    }

    if(!inWindow){
      this._antiCutArmed=true;
      if(p<0.08)this._antiCutPenaltyApplied=false;
    }
    return result;
  }
}

// Reversible trial switch:
// localStorage.setItem('tdr2:track01AntiCutPenalty','0')  -> OFF
// localStorage.setItem('tdr2:track01AntiCutPenalty','1')  -> ON
