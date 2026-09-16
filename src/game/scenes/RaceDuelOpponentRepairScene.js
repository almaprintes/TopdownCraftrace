import { RaceScene as CurrentRaceScene } from './RacePracticeAreaSurfaceTuningScene.js';

function isVisualCarSprite(scene,obj){
  const key=obj?.texture?.key;
  return !!key&&key!=='__BODY__'&&scene?.textures?.exists?.(key);
}

function findNestedVisual(scene){
  const seen=new Set();
  let found=null;
  const visit=obj=>{
    if(!obj||found||seen.has(obj))return;
    seen.add(obj);
    if(obj!==scene?.carRig&&isVisualCarSprite(scene,obj)&&obj.visible!==false){found=obj;return;}
    if(Array.isArray(obj?.list))for(const child of obj.list)visit(child);
  };
  visit(scene?.carRig);
  if(!found&&isVisualCarSprite(scene,scene?.car)&&scene.car.visible!==false)found=scene.car;
  return found;
}

export class RaceScene extends CurrentRaceScene{
  create(data={}){
    this._tdrDuelOpponentInitAttempts=0;
    const result=super.create(data);

    // DEV 1.0.111: Duel no owns a second player stopwatch anymore.
    // The canonical RaceScene lap/checkpoint pipeline is the single source of
    // truth for the player, so telemetry, sectors, DELTA and Duel all observe
    // the exact same completed laps.
    this._tdrDuelHistoryBase=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    this._tdrUnifiedDuelPlayerLap=Number(this.lapCount||0);
    return result;
  }

  _initStandaloneDuel(){
    if(!this._duelStandalone||this._duelBot||this._duelFinished)return super._initStandaloneDuel?.();

    const rig=this.carRig;
    const originalList=Array.isArray(rig?.list)?rig.list:null;
    let patchedList=false;

    // The standalone Duel code historically searched only direct carRig children.
    // Modern car presentation can nest the visible sprite in containers, so expose
    // that already-existing sprite to the legacy lookup for this synchronous init.
    if(originalList&&!originalList.some(obj=>isVisualCarSprite(this,obj)&&obj.visible!==false)){
      const nested=findNestedVisual(this);
      if(nested){
        rig.list=[nested,...originalList];
        patchedList=true;
      }
    }

    try{super._initStandaloneDuel?.();}
    finally{if(patchedList&&rig)rig.list=originalList;}

    if(this._duelBot||this._duelFinished)return;

    this._tdrDuelOpponentInitAttempts=Number(this._tdrDuelOpponentInitAttempts||0)+1;
    if(this._tdrDuelOpponentInitAttempts<16){
      this.time?.delayedCall?.(150,()=>this._initStandaloneDuel());
      return;
    }

    this._showDuelInitError?.('CPU1 no pudo inicializarse');
  }

  // CPU1 still needs its own participant timing. The player does not: the
  // normal RaceScene pipeline already validates CP1 -> CP2 -> finish and stores
  // the lap. Swallowing the legacy player crossing prevents two competing lap
  // counters from drifting apart.
  _crossDuelFinish(state,isPlayer){
    if(isPlayer)return;
    return super._crossDuelFinish?.(state,false);
  }

  _syncDuelPlayerFromCanonicalRace(){
    if(!this._duelStandalone||!this._duelPlayer)return;

    const canonicalLaps=Math.max(0,Number(this.lapCount||0));
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const base=Math.max(0,Math.min(history.length,Number(this._tdrDuelHistoryBase||0)));
    const sessionTimes=history
      .slice(base)
      .map(rec=>Number(rec?.lapMs))
      .filter(ms=>Number.isFinite(ms)&&ms>1000);

    this._duelPlayer.laps=canonicalLaps;
    this._duelPlayer.lapTimes=sessionTimes;
    this._tdrUnifiedDuelPlayerLap=canonicalLaps;

    if(!this._duelFinished&&canonicalLaps>=Number(this._duelLapTarget||0)){
      this._finishStandaloneDuel?.('player');
      return;
    }

    if(!this._duelFinished&&this._duelHud?._state){
      const playerProgress=canonicalLaps+Number(this._duelPlayer.lastProgress||0);
      const cpuProgress=Number(this._duelCpu?.laps||0)+Number(this._duelCpu?.lastProgress||0);
      const leader=playerProgress>=cpuProgress?'TÚ':'CPU1';
      this._duelHud._state.setText(`VUELTAS · TÚ ${canonicalLaps}/${this._duelLapTarget} · CPU1 ${this._duelCpu?.laps||0}/${this._duelLapTarget} · LÍDER ${leader}`);
    }
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._syncDuelPlayerFromCanonicalRace();
    return result;
  }
}