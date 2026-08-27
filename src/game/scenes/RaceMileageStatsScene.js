import { RaceScene as CurrentRaceScene } from './RaceSurvivalHardLapCapScene.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';
import { addCarDistance, loadPlayerStats, markCarRace, recordCarTrackLap } from '../stats/playerStats.js';
import { masteryLevelForMeters } from '../stats/carMastery.js';
import { showMasteryUnlockModal } from '../ui/MasteryUnlockModal.js';

const FLUSH_EVERY_MS=3500;

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._mileageCarId=String(this.carId||this.selectedCarId||data?.carId||'').trim();
    this._mileageTrackId=String(this.trackKey||data?.trackKey||'').trim();
    this._mileagePrev=null;
    this._mileagePendingMeters=0;
    this._mileageLastFlush=performance.now();
    this._mileageRaceMarked=false;
    this._statsSeenHistoryLength=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._masteryCelebrating=false;
    this.events.once('shutdown',()=>this._flushMileage(true));
    return result;
  }

  update(time,delta){
    super.update?.(time,delta);
    if(!this._masteryCelebrating)this._sampleMileage(delta);
    this._captureNewLapStats();
  }

  _completedLapCheck(now){
    const before=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    const result=super._completedLapCheck(now);
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    if(hist.length>before)this._captureNewLapStats();
    return result;
  }

  _captureNewLapStats(){
    const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const seen=Math.max(0,Number(this._statsSeenHistoryLength)||0);
    if(hist.length<=seen)return;
    for(let i=seen;i<hist.length;i++){
      const row=hist[i]||{};
      const ms=Number(row.lapMs ?? row.timeMs ?? row.ms ?? row.time ?? row.lapTime ?? row.durationMs);
      const valid=row.valid!==false&&row.invalid!==true;
      if(valid&&Number.isFinite(ms)&&ms>1000&&this._mileageCarId&&this._mileageTrackId){
        recordCarTrackLap(this._mileageCarId,this._mileageTrackId,ms);
      }
    }
    this._statsSeenHistoryLength=hist.length;
  }

  _sampleMileage(delta){
    const body=this.carBody;
    const x=Number(body?.x),y=Number(body?.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return;
    if(!this._mileagePrev){this._mileagePrev={x,y};return;}
    const dx=x-this._mileagePrev.x,dy=y-this._mileagePrev.y;
    this._mileagePrev={x,y};
    const px=Math.hypot(dx,dy);
    if(!Number.isFinite(px)||px<=0)return;
    const dt=Math.max(8,Math.min(100,Number(delta)||16.67));
    const maxPx=Math.max(32,dt*4.5);
    if(px>maxPx)return;
    this._mileagePendingMeters+=px*METERS_PER_PX;
    if(!this._mileageRaceMarked&&this._mileagePendingMeters>=10){this._mileageRaceMarked=true;markCarRace(this._mileageCarId,this._mileageTrackId);}
    if(performance.now()-this._mileageLastFlush>=FLUSH_EVERY_MS)this._flushMileage(false);
  }

  _showMasteryCelebration(level,totalMeters){
    if(this._masteryCelebrating||!level)return;
    this._masteryCelebrating=true;
    try{this.physics?.world?.pause?.();}catch{}
    this.time?.delayedCall?.(50,()=>this._installMasteryRoofWheel?.());
    showMasteryUnlockModal({scene:this,carId:this._mileageCarId,meters:totalMeters,level,onClose:()=>{
      this._masteryCelebrating=false;
      try{this.physics?.world?.resume?.();}catch{}
      this._mileagePrev=null;
    }});
  }

  _flushMileage(final=false){
    const meters=Math.max(0,Number(this._mileagePendingMeters)||0);
    if(meters>0&&this._mileageCarId){
      const beforeMeters=Number(loadPlayerStats()?.cars?.[this._mileageCarId]?.meters)||0;
      const beforeLevel=masteryLevelForMeters(beforeMeters);
      const state=addCarDistance(this._mileageCarId,meters,this._mileageTrackId);
      const afterMeters=Number(state?.cars?.[this._mileageCarId]?.meters)||beforeMeters+meters;
      const afterLevel=masteryLevelForMeters(afterMeters);
      if(!final&&afterLevel>beforeLevel)this._showMasteryCelebration(afterLevel,afterMeters);
    }
    this._mileagePendingMeters=0;
    this._mileageLastFlush=performance.now();
    if(final){this._mileagePrev=null;this._captureNewLapStats();}
  }
}
