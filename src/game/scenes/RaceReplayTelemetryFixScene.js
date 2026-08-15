import { RaceScene as ReplayFullTrackScene } from './RaceReplayFullTrackScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const KMH_PER_PXSEC=0.185;

export class RaceScene extends ReplayFullTrackScene {
  _updateReplayIdentity(t){
    if(!this._replayDom)return;
    if(this._replayIntro)this._replayIntro.style.opacity=t<1500?'1':'0';

    const samples=this._ghostData?.samples||[];
    const lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    let speed=0,steer=0;

    if(samples.length>1){
      let i=1;
      while(i<samples.length&&Number(samples[i].t)<t)i++;
      i=clamp(i,1,samples.length-1);
      const a=samples[i-1],b=samples[i];
      const dt=Math.max(1,Number(b.t)-Number(a.t));
      const dx=Number(b.x)-Number(a.x),dy=Number(b.y)-Number(a.y);
      speed=Math.hypot(dx,dy)/(dt/1000);
      let dr=((Number(b.r||0)-Number(a.r||0)+Math.PI*3)%(Math.PI*2))-Math.PI;
      steer=clamp(dr*7,-1,1);
    }

    // Same conversion used by the live race HUD: replay and gameplay now agree.
    const kmh=Math.max(0,Math.round(speed*KMH_PER_PXSEC));
    if(this._replayTelemetry){
      this._replayTelemetry.querySelector('[data-speed]').textContent=String(kmh).padStart(3,'0');
      this._replayTelemetry.querySelector('[data-gear]').textContent=kmh<4?'N':(kmh<Math.max(35,(Number(this.carParams?.maxFwd||600)*KMH_PER_PXSEC)*.52)?'1ª':'2ª');
      const throttle=kmh>3?clamp(.55+speed/900,0,1):0;
      this._replayTelemetry.querySelector('[data-gas]').style.width=`${Math.round(throttle*100)}%`;
      this._replayTelemetry.querySelector('[data-brake]').style.width='0%';
      this._replayTelemetry.querySelector('[data-steer]').style.left=`${50+steer*46}%`;
    }

    // Complete S3 on the finish frame. The old code could only ever mark S1/S2
    // complete because it clamped the active sector to index 2.
    const progress=clamp(t/lap,0,1);
    const completed=progress>=0.999?3:Math.floor(progress*3);
    const active=Math.min(2,completed);
    this._replaySectors?.forEach((r,i)=>{
      if(i<completed){
        r.style.opacity='1';
        r.querySelector('[data-t]').textContent=this._fmtReplayMs(lap/3).replace('0:','');
        r.querySelector('[data-d]').textContent='✓';
      }else if(i===active){
        r.style.opacity='.8';
      }else{
        r.style.opacity='.45';
      }
    });

    if(this._replayDelta){
      const phase=progress,delta=Math.sin(phase*Math.PI*5)*.11*(1-phase);
      if(t>900&&t<lap-200&&Math.abs((phase*3)%1)<.18){
        this._replayDelta.style.opacity='1';
        const v=this._replayDelta.querySelector('[data-v]');
        v.textContent=`${delta<=0?'−':'+'}${Math.abs(delta).toFixed(3)}`;
        v.style.color=delta<=0?'#59f3b1':'#ff7188';
      }else this._replayDelta.style.opacity='0';
    }
  }
}
