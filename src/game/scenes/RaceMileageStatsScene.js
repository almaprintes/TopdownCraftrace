import { RaceScene as CurrentRaceScene } from './RaceSurvivalHardLapCapScene.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';
import { addCarDistance, loadPlayerStatsPersisted, markCarRace } from '../stats/playerStats.js';
import { masteryLevelForMeters } from '../stats/carMastery.js';

// Distance persistence is not frame-critical. A longer flush interval dramatically
// reduces synchronous localStorage writes while retaining a shutdown flush.
const FLUSH_EVERY_MS=12000;

export class RaceScene extends CurrentRaceScene{
  create(data){
    const result=super.create(data);
    this._mileageCarId=String(this.carId||this.selectedCarId||data?.carId||'').trim();
    this._mileageTrackId=String(this.trackKey||data?.trackKey||'').trim();
    this._mileagePrev=null;
    this._mileagePendingMeters=0;
    this._mileageLastFlush=performance.now();
    this._mileageRaceMarked=false;
    this._pendingMasteryUnlock=null;
    this.events.once('shutdown',()=>this._flushMileage(true));
    return result;
  }

  update(time,delta){
    super.update?.(time,delta);
    this._sampleMileage(delta);
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

  _queueMasteryUnlock(level,totalMeters){
    if(!level)return;
    const current=this._pendingMasteryUnlock;
    if(!current||level>=Number(current.level||0)){
      this._pendingMasteryUnlock={level,totalMeters:Number(totalMeters)||0};
    }
    // Deliberately do not pause play or show UI here. The lobby already detects
    // unacknowledged mastery levels and presents the informational modal after the
    // race/session has returned there.
    this.time?.delayedCall?.(50,()=>this._installMasteryRoofWheel?.());
  }

  _flushMileage(final=false){
    const meters=Math.max(0,Number(this._mileagePendingMeters)||0);
    if(meters>0&&this._mileageCarId){
      const beforeMeters=Number(loadPlayerStatsPersisted()?.cars?.[this._mileageCarId]?.meters)||0;
      const beforeLevel=masteryLevelForMeters(beforeMeters);
      const state=addCarDistance(this._mileageCarId,meters,this._mileageTrackId);
      const afterMeters=Number(state?.cars?.[this._mileageCarId]?.meters)||beforeMeters+meters;
      const afterLevel=masteryLevelForMeters(afterMeters);
      if(afterLevel>beforeLevel)this._queueMasteryUnlock(afterLevel,afterMeters);
    }
    this._mileagePendingMeters=0;
    this._mileageLastFlush=performance.now();
    if(final)this._mileagePrev=null;
  }
}
