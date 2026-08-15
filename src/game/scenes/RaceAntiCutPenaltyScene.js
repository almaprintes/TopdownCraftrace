import { RaceScene as CurrentRaceScene } from './RaceReplayDroneExportScene.js';

const TARGET_TRACK_NAME = 'Imported Track 1773617484759';
const FLAG_KEY = 'tdr2:track01AntiCutPenalty';
const PENALTY_MS = 2000;
const ZONE_START = 0.285;
const ZONE_END = 0.345;

function enabled(){
  try{
    const raw=localStorage.getItem(FLAG_KEY);
    return raw==null ? true : raw!=='0';
  }catch{return true;}
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._antiCutArmed=true;
    this._antiCutPenaltyApplied=false;
    this._antiCutNotice=null;
    const result=super.create(data);
    this.events.once('shutdown',()=>{try{this._antiCutNotice?.destroy?.();}catch{}this._antiCutNotice=null;});
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

    // Add the penalty directly to the current lap clock. On the next finish-line
    // crossing the normal timing code resets lapStart, so it does not leak into
    // the following lap.
    if(Number.isFinite(this.timing?.lapStart)) this.timing.lapStart-=PENALTY_MS;
    if(Number.isFinite(this.lapStartTick)) this.lapStartTick-=Math.round(PENALTY_MS/(1000/60));
    this._showAntiCutPenalty();
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(!enabled()||!this._antiCutTargetTrack()||this._replayActive||!this._raceStarted||!this.carBody||!this._isOnTrack)return result;

    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    const p=Number(this._computeLapProgress01?.(x,y));
    if(!Number.isFinite(p))return result;

    const inWindow=p>=ZONE_START&&p<=ZONE_END;
    const offTrack=!this._isOnTrack(x,y);

    if(inWindow&&offTrack&&this._antiCutArmed){
      this._antiCutArmed=false;
      this._applyAntiCutPenalty();
    }
    if(!inWindow){
      this._antiCutArmed=true;
      // Rearm the one-penalty-per-lap latch only after leaving the target window
      // and wrapping back near the start of a new lap.
      if(p<0.08)this._antiCutPenaltyApplied=false;
    }
    return result;
  }
}

// Reversible trial switch:
// localStorage.setItem('tdr2:track01AntiCutPenalty','0')  -> OFF
// localStorage.setItem('tdr2:track01AntiCutPenalty','1')  -> ON
