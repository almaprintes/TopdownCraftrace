import { RaceScene as ReplayRealSectorsScene } from './RaceReplayRealSectorsScene.js';

// Ghost and Time Attack are open-ended hot-lap modes, so without a session
// boundary a player can build a very large reward bundle before ever reaching
// the post-session rewarded offer. Keep the boundary explicit and predictable.
const HOTLAP_SESSION_MAX_LAPS = 10;

export class RaceScene extends ReplayRealSectorsScene {
  create(data){
    this._hotlapSessionBaseline = 0;
    this._hotlapSessionCapReached = false;
    const result = super.create(data);
    this._hotlapSessionBaseline = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;
    return result;
  }

  _completedLapCheck(now){
    const before = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;
    super._completedLapCheck(now);
    const history = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    const after = history.length;

    if(this._hotlapSessionCapReached || after <= before) return;
    if(this._tdrGameMode !== 'ghost' && this._tdrGameMode !== 'timeattack') return;

    const completed = Math.max(0, after - this._hotlapSessionBaseline);
    if(completed < HOTLAP_SESSION_MAX_LAPS) return;

    this._hotlapSessionCapReached = true;

    // Stop the car immediately so an 11th lap cannot sneak in while the report
    // is being opened. The normal session report owns rewards and the rewarded
    // x2 offer, exactly as if FIN SESIÓN had been pressed manually.
    try{ this.physics?.world?.pause?.(); }catch(_){ }
    try{
      if(this.carBody?.body?.velocity){
        this.carBody.body.velocity.x = 0;
        this.carBody.body.velocity.y = 0;
      }
    }catch(_){ }

    this.time?.delayedCall?.(0,()=>{
      if(typeof this._openSessionReport === 'function') this._openSessionReport();
    });
  }
}

export { HOTLAP_SESSION_MAX_LAPS };
