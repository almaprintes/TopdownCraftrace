import { RaceScene as CurrentRaceScene } from './RaceDuelLearningScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  _applyDuelCornerCut(){
    const profile=this._duelLearningWorkingProfile||this._duelProfile;
    const model=this._duelTrackModel;
    const learner=this._duelLearner;
    const samples=profile?.samples;
    const curve=model?.curvature;
    const center=model?.centerline;
    const limits=model?.limits;
    const frames=learner?.frames;
    const n=Array.isArray(samples)?samples.length:0;
    if(!n||!Array.isArray(curve)||curve.length!==n||!Array.isArray(center)||center.length!==n||!Array.isArray(frames)||frames.length!==n)return;

    for(let i=0;i<n;i++){
      const out=samples[i],c=center[i],f=frames[i];
      if(!out||!c||!f)continue;

      // Curvatura suavizada para no reaccionar a microcambios de signo.
      let weighted=0,total=0;
      for(let d=-2;d<=2;d++){
        const w=3-Math.abs(d);
        weighted+=Number(curve[(i+d+n)%n]||0)*w;
        total+=w;
      }
      const turn=weighted/Math.max(1,total);
      const abs=Math.abs(turn);
      // Rectas: 0 px. Curva suave: ~1 px. Curva clara: hasta 3 px.
      const strength=clamp((abs-.0025)/.0155,0,1);
      if(strength<=0)continue;
      const cutPx=3*strength*Math.sign(turn);

      const cx=Number(c.x),cy=Number(c.y);
      const currentOffset=(Number(out.x)-cx)*f.nx+(Number(out.y)-cy)*f.ny;
      const limit=Math.max(4,Number(limits?.[i]||45))*.94;
      const nextOffset=clamp(currentOffset+cutPx,-limit,limit);
      const delta=nextOffset-currentOffset;
      out.x=Number(out.x)+f.nx*delta;
      out.y=Number(out.y)+f.ny*delta;
    }
  }

  _ensureDuelLearner(){
    const existed=!!this._duelLearner;
    const learner=super._ensureDuelLearner?.();
    if(learner&&!existed)this._applyDuelCornerCut();
    return learner;
  }

  _applyDuelLearningForNextLap(){
    const result=super._applyDuelLearningForNextLap?.();
    this._applyDuelCornerCut();
    return result;
  }
}
