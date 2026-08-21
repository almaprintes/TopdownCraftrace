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
    this._survivalFastFinishButton = null;
    this._survivalRemainderSimulated = false;
    const result = super.create(data);
    this.events?.once?.('shutdown',()=>this._destroySurvivalFastFinishButton());
    this.events?.once?.('destroy',()=>this._destroySurvivalFastFinishButton());
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
          'Tu carrera ha terminado · puedes esperar o simular el final',
          '#62ffb2',
          false
        );
        this._showSurvivalFastFinishButton();
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

  _showSurvivalFastFinishButton(){
    if(typeof document==='undefined' || this._survivalFastFinishButton || this._survivalFinished) return;
    const b=document.createElement('button');
    b.type='button';
    b.textContent='TERMINAR YA · SIMULAR RESTO';
    b.dataset.tdrRaceUi='1';
    Object.assign(b.style,{
      position:'fixed',left:'50%',bottom:'calc(env(safe-area-inset-bottom, 0px) + 18px)',transform:'translateX(-50%)',
      zIndex:'13950',height:'46px',minWidth:'238px',padding:'0 18px',border:'1px solid #62ffb2',borderRadius:'12px',
      background:'linear-gradient(180deg,#145a45,#0d3e31)',color:'#fff',font:'900 11px system-ui,-apple-system,Segoe UI,sans-serif',
      letterSpacing:'.055em',boxShadow:'0 10px 30px rgba(0,0,0,.42)',WebkitTapHighlightColor:'transparent'
    });
    b.addEventListener('click',()=>{
      if(b.disabled)return;
      b.disabled=true;b.textContent='SIMULANDO…';
      this._simulateSurvivalRemainder();
    });
    document.body.appendChild(b);
    this._survivalFastFinishButton=b;
  }

  _destroySurvivalFastFinishButton(){
    try{this._survivalFastFinishButton?.remove?.();}catch(_){ }
    this._survivalFastFinishButton=null;
  }

  _survivalProjectedEtaToLap(racer,targetLap){
    const state=racer?.state||{};
    if(Number(state.completedLaps||0)>=targetLap)return -Infinity;
    const distance=racer?.player?this._survivalPlayerRaceDistance():Number(state.absProgress||state.completedLaps||0);
    const gap=Math.max(0,Number(targetLap)-Number(distance||0));
    const rate=Math.max(.0001,Number(state.lapRate||state.targetRate||.001));
    return gap/rate;
  }

  _simulateSurvivalRemainder(){
    if(this._survivalFinished || !this._survivalPlayerFinished){this._destroySurvivalFastFinishButton();return;}
    this._survivalRemainderSimulated=true;
    this._destroySurvivalFastFinishButton();

    // Resolve only the unfinished AI field. The player is already FINISHED at five
    // laps, so simulation cannot add distance, loot or timing entries to the player.
    // For each pending elimination round, the projected slowest remaining racer is
    // treated as the last to reach that round's finish threshold.
    let guard=0;
    while(!this._survivalFinished && guard++<12){
      const racers=this._survivalRacers?.()||[];
      if(racers.length<=1){
        this._finishSurvival?.(Boolean(racers[0]?.player));
        break;
      }

      const targetLap=Math.min(SURVIVAL_MAX_LAPS,Number(this._survivalRound||0)+1);
      let pending=racers.filter(r=>Number(r.state?.completedLaps||0)<targetLap);

      // Normally pending contains the racers still resolving this round. If live
      // crossings left the round in a fully-crossed transient state, use the least
      // advanced unfinished AI as deterministic fallback rather than stalling.
      if(!pending.length){
        pending=racers.filter(r=>!r.player && !r.state?.finished);
        if(!pending.length) pending=racers.filter(r=>!r.player);
      }
      if(!pending.length){
        this._finishSurvival?.(true);
        break;
      }

      const loser=pending.slice().sort((a,b)=>this._survivalProjectedEtaToLap(b,targetLap)-this._survivalProjectedEtaToLap(a,targetLap))[0];

      for(const r of racers){
        if(r===loser)continue;
        const st=r.state;if(!st)continue;
        st.completedLaps=Math.max(Number(st.completedLaps||0),targetLap);
        if(!r.player && !st.finished)st.absProgress=Math.max(Number(st.absProgress||0),targetLap);
      }

      this._survivalRound=targetLap;
      this._eliminateSpecific?.(loser);
    }

    if(!this._survivalFinished){
      const remaining=this._survivalEntries?.()||[];
      this._finishSurvival?.(Boolean(remaining[0]?.player));
    }
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

  _finishSurvival(win){
    this._destroySurvivalFastFinishButton();
    return super._finishSurvival(win);
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
        this._survivalHud._state.setText(`FINALIZADO · puedes esperar o simular · ronda ${Math.min(5,this._survivalRound+1)}/5 · meta ${crossed}/${need}`);
      }
    }
  }
}

export { SURVIVAL_MAX_LAPS };
