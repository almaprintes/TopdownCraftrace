import { RaceScene as CurrentRaceScene } from './RaceDuelSectorResultsScene.js';
import {
  createRaceAiLapLearner,
  resetRaceAiTeacherBuffer,
  recordRaceAiTeacherSample,
  finalizeRaceAiTeacherLap,
  observeRaceAiCpuLap,
  activateRaceAiPlanForNextLap,
  applyRaceAiPlanToProfile,
  raceAiLearnerPersistence
} from '../ai/raceAiLapLearner.js';
import { loadRaceAiLearning,saveRaceAiLearning } from '../ai/raceAiLearningStore.js';

function cloneProfile(profile){
  return profile?{...profile,samples:Array.isArray(profile.samples)?profile.samples.map(s=>({...s})):[]}:null;
}

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    this._duelLearner=null;
    this._duelLearningBaseProfile=null;
    this._duelLearningWorkingProfile=null;
    this._duelLearningLastSave=null;
    const result=super.create(data);
    if(this._duelStandalone){
      this.time?.delayedCall?.(450,()=>this._ensureDuelLearner());
      this.time?.delayedCall?.(950,()=>this._ensureDuelLearner());
    }
    return result;
  }

  _duelLearningKey(){
    return String(this.trackKey||this.track?.meta?.key||this.track?.id||'track01');
  }

  _duelLearningCar(){
    return String(this.carId||this.selectedCarId||'default');
  }

  _ensureDuelLearner(){
    if(this._duelLearner||!this._duelStandalone)return this._duelLearner;
    const base=this._duelProfile,model=this._duelTrackModel;
    if(!base?.valid||!Array.isArray(base.samples)||!model?.valid)return null;

    const saved=loadRaceAiLearning(this._duelLearningKey(),this._duelLearningCar());
    const learner=createRaceAiLapLearner({baseProfile:base,trackModel:model,saved});
    if(!learner)return null;

    this._duelLearningBaseProfile=base;
    this._duelLearningWorkingProfile=cloneProfile(base);
    this._duelLearner=learner;
    applyRaceAiPlanToProfile(learner,{
      baseProfile:this._duelLearningBaseProfile,
      trackModel:this._duelTrackModel,
      workingProfile:this._duelLearningWorkingProfile
    });
    // Desde este punto el controlador físico de DUELO consume el perfil de
    // aprendizaje. El perfil base queda congelado como referencia.
    this._duelProfile=this._duelLearningWorkingProfile;
    return learner;
  }

  _saveDuelLearning(type,extra={}){
    const s=this._duelLearner;if(!s)return;
    const patch=raceAiLearnerPersistence(s);
    patch.historyEntry={
      at:new Date().toISOString(),type,
      bestLapMs:s.bestCpuLapMs,
      bestCpuBlend:s.bestCpuBlend,
      currentBlend:s.currentBlend,
      teacherBestLapMs:s.teacherBestLapMs,
      decision:s.lastDecision,
      ...extra
    };
    this._duelLearningLastSave=saveRaceAiLearning(this._duelLearningKey(),this._duelLearningCar(),patch);
  }

  _applyDuelLearningForNextLap(){
    const s=this._duelLearner;if(!s)return;
    applyRaceAiPlanToProfile(s,{
      baseProfile:this._duelLearningBaseProfile,
      trackModel:this._duelTrackModel,
      workingProfile:this._duelLearningWorkingProfile
    });
    this._duelProfile=this._duelLearningWorkingProfile;
  }

  _crossDuelFinish(state,isPlayer){
    this._ensureDuelLearner();
    const wasArmed=!!state?.armed;
    const beforeLaps=Number(state?.laps||0);
    const usedBlend=Number(this._duelLearner?.currentBlend||0);
    const result=super._crossDuelFinish?.(state,isPlayer);
    const afterLaps=Number(state?.laps||0);
    const learner=this._duelLearner;
    if(!learner||!state)return result;

    if(isPlayer){
      if(!wasArmed&&state.armed){
        resetRaceAiTeacherBuffer(learner);
      }else if(afterLaps>beforeLaps){
        const lapMs=Number(state.lapTimes?.[state.lapTimes.length-1]);
        const teach=finalizeRaceAiTeacherLap(learner,{
          baseProfile:this._duelLearningBaseProfile,
          trackModel:this._duelTrackModel,
          lapMs
        });
        if(teach.accepted)this._saveDuelLearning('teacher_lap',{lapMs,coverage:teach.coverage});
      }
      return result;
    }

    if(afterLaps>beforeLaps){
      const lapMs=Number(state.lapTimes?.[state.lapTimes.length-1]);
      // Evaluar exactamente el plan que acaba de completar CPU1.
      learner.currentBlend=usedBlend;
      const observation=observeRaceAiCpuLap(learner,lapMs);
      // Solo ahora, ya cruzada meta, se decide el plan de la vuelta siguiente.
      const next=activateRaceAiPlanForNextLap(learner);
      this._applyDuelLearningForNextLap();
      this._saveDuelLearning('cpu_lap',{
        lapMs,usedBlend,
        decision:observation.decision,
        nextBlend:Number(next.blend||0),
        teacherLap:Number(next.teacherLap||0)
      });
    }
    return result;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(!this._duelStandalone||this._duelFinished||!this._raceStarted)return result;
    const learner=this._ensureDuelLearner();
    const body=this.carBody;
    if(!learner||!body?.scene||!this._duelPlayer?.armed)return result;

    const velocity=body.body?.velocity||body.velocity||{};
    const speed=Math.hypot(Number(velocity.x)||0,Number(velocity.y)||0);
    const x=Number(body.x),y=Number(body.y);
    const onTrack=this._isOnTrack?Boolean(this._isOnTrack(x,y)):true;
    recordRaceAiTeacherSample(learner,{
      baseProfile:this._duelLearningBaseProfile,
      trackModel:this._duelTrackModel,
      x,y,speed,onTrack,armed:true
    });
    return result;
  }
}
