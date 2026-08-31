import { RaceScene as CurrentRaceScene } from './RaceReplayDroneExportScene.js';
import { destroyRaceFeedback, showRaceFeedback } from '../ui/raceFeedbackUi.js';

const TARGET_TRACK_NAME = 'Imported Track 1773617484759';
const FLAG_KEY = 'tdr2:track01AntiCutPenalty';
const PENALTY_MS = 2000;

const FIXED_ZONE_POLY = Object.freeze([
  Object.freeze({ x:1133, y:721 }),
  Object.freeze({ x:1157, y:721 }),
  Object.freeze({ x:1145, y:839 })
]);

function enabled(){
  try{
    const raw=localStorage.getItem(FLAG_KEY);
    return raw==null ? true : raw!=='0';
  }catch{return true;}
}

function pointInPoly(x,y,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const a=poly[i],b=poly[j];
    const crosses=((a.y>y)!==(b.y>y)) &&
      (x < (b.x-a.x)*(y-a.y)/((b.y-a.y)||1e-9)+a.x);
    if(crosses)inside=!inside;
  }
  return inside;
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    this._antiCutArmed=true;
    this._antiCutPenaltyApplied=false;
    this._antiCutProgressAccum=0;
    const result=super.create(data);
    this._antiCutEnabled=enabled();
    const name=String(this.track?.meta?.name||'');
    this._antiCutIsTarget=(name===TARGET_TRACK_NAME || this.trackKey==='track01');
    this.events.once('shutdown',()=>destroyRaceFeedback(this));
    return result;
  }

  _antiCutTargetTrack(){return !!this._antiCutIsTarget;}

  _showAntiCutPenalty(){
    showRaceFeedback(this,{
      type:'penalty',
      eyebrow:'PENALIZACIÓN',
      title:'+2.000 s',
      detail:'ATAJO DETECTADO',
      holdMs:1000
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
    x=Number(x); y=Number(y);
    return Number.isFinite(x)&&Number.isFinite(y)&&pointInPoly(x,y,FIXED_ZONE_POLY);
  }

  update(time,delta){
    const result=super.update(time,delta);
    if(!this._antiCutEnabled||!this._antiCutIsTarget||this._replayActive||!this._raceStarted||!this.carBody)return result;

    const x=Number(this.carBody.x),y=Number(this.carBody.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return result;

    const inZone=this._insideMarkedAntiCutZone(x,y);
    if(inZone&&this._antiCutArmed){this._antiCutArmed=false;this._applyAntiCutPenalty();}
    if(!inZone)this._antiCutArmed=true;

    this._antiCutProgressAccum+=Number(delta||0);
    if(this._antiCutProgressAccum>=200){
      this._antiCutProgressAccum=0;
      const p=Number(this._computeLapProgress01?.(x,y));
      if(Number.isFinite(p)&&p<0.08)this._antiCutPenaltyApplied=false;
    }
    return result;
  }
}
