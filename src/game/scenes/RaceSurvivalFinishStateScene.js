import { RaceScene as SessionLapCapScene } from './RaceSessionLapCapScene.js';

// Survival race distance belongs to each racer, not to the current leader.
// A participant that completes five valid laps becomes FINISHED: it remains in
// the classification and still counts as having crossed subsequent elimination
// thresholds, but it cannot accumulate a sixth lap or any extra race distance.
const SURVIVAL_MAX_LAPS = 5;

export class RaceScene extends SessionLapCapScene {
  create(data){
    this._survivalPlayerFinished = false;
    this._survivalPlayerFinishLock = null;
    const result = super.create(data);
    return result;
  }

  _registerFinishCross(racer){
    if(!racer || racer.finished) return false;

    const completed = super._registerFinishCross(racer);
    if(!completed) return false;

    if(Number(racer.completedLaps || 0) < SURVIVAL_MAX_LAPS) return true;

    racer.completedLaps = SURVIVAL_MAX_LAPS;
    racer.finished = true;
    racer.finishedAt = performance.now();

    if(racer === this._survivalPlayer){
      this._survivalPlayerFinished = true;
      this._survivalPlayerFinishLock = {
        x:Number(this.carBody?.x),
        y:Number(this.carBody?.y),
        r:Number(this.carBody?.rotation || 0)
      };
      try{
        if(this.carBody?.body?.velocity){
          this.carBody.body.velocity.x = 0;
          this.carBody.body.velocity.y = 0;
        }
      }catch(_){ }
      if(!this._survivalFinished){
        this._showSurvivalNotice?.(
          '5 VUELTAS COMPLETADAS',
          'Tu carrera ha terminado · los demás pilotos completan la suya',
          '#62ffb2',
          false
        );
      }
    }else{
      const bot = this._survivalBots?.find?.(b=>b===racer || b?.id===racer?.id);
      if(bot){
        bot.finished = true;
        bot.completedLaps = SURVIVAL_MAX_LAPS;
        bot._finishLock = {
          absProgress:Number(bot.absProgress || SURVIVAL_MAX_LAPS),
          x:Number(bot.sprite?.x),
          y:Number(bot.sprite?.y),
          r:Number(bot.sprite?.rotation || 0)
        };
      }
    }

    return true;
  }

  _survivalPlayerRaceDistance(){
    if(this._survivalPlayer?.finished || this._survivalPlayerFinished) return SURVIVAL_MAX_LAPS;
    return Math.min(SURVIVAL_MAX_LAPS, Number(super._survivalPlayerRaceDistance?.() || 0));
  }

  _survivalEntries(){
    const arr=[{
      id:'TÚ',
      player:true,
      active:!this._survivalPlayerOut,
      finished:!!this._survivalPlayer?.finished,
      raceDistance:this._survivalPlayerRaceDistance()
    }];
    for(const b of this._survivalBots || []){
      if(!b.active) continue;
      arr.push({
        ...b,
        raceDistance:b.finished ? SURVIVAL_MAX_LAPS : Math.min(SURVIVAL_MAX_LAPS, Number(b.absProgress)||0)
      });
    }
    return arr.filter(e=>e.active).sort((a,b)=>b.raceDistance-a.raceDistance);
  }

  _updateSurvivalBots(deltaMs){
    // Preserve exact finish positions while the remaining racers resolve their
    // own five-lap distance / elimination rounds.
    const lockedBots=(this._survivalBots || []).filter(b=>b?.active && b?.finished && b?._finishLock).map(b=>({
      b,
      absProgress:b._finishLock.absProgress,
      x:b._finishLock.x,
      y:b._finishLock.y,
      r:b._finishLock.r
    }));

    super._updateSurvivalBots(deltaMs);

    for(const lock of lockedBots){
      const b=lock.b;
      b.finished=true;
      b.completedLaps=SURVIVAL_MAX_LAPS;
      b.absProgress=lock.absProgress;
      b.lapRate=0;
      if(b.sprite?.scene){
        b.sprite.setPosition(lock.x,lock.y);
        b.sprite.rotation=lock.r;
      }
    }

    if(this._survivalPlayerFinished && !this._survivalFinished){
      const lock=this._survivalPlayerFinishLock;
      try{
        if(lock && this.carBody?.scene){
          this.carBody.setPosition(lock.x,lock.y);
          this.carBody.rotation=lock.r;
        }
        if(this.carBody?.body?.velocity){
          this.carBody.body.velocity.x=0;
          this.carBody.body.velocity.y=0;
        }
        if(Number.isFinite(this.carBody?.body?.angularVelocity)) this.carBody.body.angularVelocity=0;
      }catch(_){ }

      if(this._survivalHud?._state?.scene){
        const racers=this._survivalRacers?.() || [];
        const targetLap=Math.min(SURVIVAL_MAX_LAPS, Number(this._survivalRound||0)+1);
        const crossed=racers.filter(r=>Number(r.state?.completedLaps||0)>=targetLap).length;
        const need=Math.max(1,racers.length-1);
        this._survivalHud._state.setText(`FINALIZADO · esperando parrilla · ronda ${Math.min(5,this._survivalRound+1)}/5 · meta ${crossed}/${need}`);
      }
    }
  }
}

export { SURVIVAL_MAX_LAPS };
