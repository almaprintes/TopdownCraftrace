import { RaceScene as ReplayTelemetryScene } from './RaceReplayTelemetryFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function validSectorTimes(sectors,lap){
  if(!Array.isArray(sectors)||sectors.length!==3)return false;
  const a=sectors.map(Number);
  if(a.some(v=>!Number.isFinite(v)||v<=250))return false;
  return Math.abs(a[0]+a[1]+a[2]-lap)<Math.max(80,lap*.01);
}

export class RaceScene extends ReplayTelemetryScene {
  create(data){
    const result=super.create(data);
    this.time.delayedCall(0,()=>this._ensureGhostSectorTimes());
    return result;
  }

  _sectorDataFromSamples(g=this._ghostData){
    const samples=g?.samples||[];
    if(!g||samples.length<4)return null;
    const lap=Math.max(1,Number(g.lapMs)||1);

    // Build cumulative travelled distance directly from the recorded replay.
    // This is deterministic and independent of the live lap-progress tracker,
    // which is stateful and was producing 0 / 0 / full-lap sectors in replay.
    const cum=[0];
    let total=0;
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i];
      const d=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
      total+=Number.isFinite(d)?d:0;
      cum.push(total);
    }
    if(total<1)return null;

    const timeAtDistance=(target)=>{
      let i=1;
      while(i<cum.length&&cum[i]<target)i++;
      i=clamp(i,1,cum.length-1);
      const d0=cum[i-1],d1=cum[i],span=Math.max(.0001,d1-d0);
      const k=clamp((target-d0)/span,0,1);
      const t0=Number(samples[i-1].t)||0,t1=Number(samples[i].t)||t0;
      return clamp(t0+(t1-t0)*k,0,lap);
    };

    const c1=timeAtDistance(total/3);
    const c2=timeAtDistance(total*2/3);
    if(!(c1>250&&c2>c1+250&&lap>c2+250))return null;
    const sectors=[c1,c2-c1,lap-c2].map(v=>Math.round(v));
    return {sectors,crossings:[Math.round(c1),Math.round(c2)]};
  }

  _completedLapCheck(now){
    const oldGhost=this._ghostData;
    super._completedLapCheck(now);

    // When a new PB has just been stored, derive the sector splits from the
    // exact samples that were saved with that PB, then persist them together.
    if(this._ghostData&&this._ghostData!==oldGhost){
      const data=this._sectorDataFromSamples(this._ghostData);
      if(data){
        this._ghostData={...this._ghostData,version:6,sectorTimes:data.sectors,sectorCrossings:data.crossings};
        try{localStorage.setItem(this._ghostStorageKey,JSON.stringify(this._ghostData));}catch{}
      }
    }
  }

  _ensureGhostSectorTimes(){
    if(!this._ghostData)return;
    const lap=Math.max(1,Number(this._ghostData.lapMs)||1);
    if(validSectorTimes(this._ghostData.sectorTimes,lap))return;

    // Repair old/broken ghosts too, including the 0 / 0 / full-lap data that
    // the previous stateful progress calculation could write.
    const data=this._sectorDataFromSamples(this._ghostData);
    if(!data)return;
    this._ghostData={...this._ghostData,version:6,sectorTimes:data.sectors,sectorCrossings:data.crossings};
    try{localStorage.setItem(this._ghostStorageKey,JSON.stringify(this._ghostData));}catch{}
  }

  _updateReplayIdentity(t){
    super._updateReplayIdentity(t);

    const lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    const shown=Math.min(Math.max(0,Number(t)||0),lap);
    if(this._replayTimeText?.scene)this._replayTimeText.setText(this._fmtReplayMs(shown));

    const rows=this._replaySectors;
    if(!rows?.length)return;

    const sectors=validSectorTimes(this._ghostData?.sectorTimes,lap)
      ? this._ghostData.sectorTimes.map(v=>Math.max(0,Number(v)||0))
      : null;
    if(!sectors)return;

    const end1=sectors[0],end2=sectors[0]+sectors[1],end3=lap;
    const completed=t>=end3-25?3:t>=end2?2:t>=end1?1:0;
    rows.forEach((r,i)=>{
      const done=i<completed;
      const active=i===Math.min(2,completed);
      r.style.opacity=done?'1':active?'.8':'.45';
      const timeEl=r.querySelector('[data-t]');
      const markEl=r.querySelector('[data-d]');
      if(done){
        timeEl.textContent=this._fmtReplayMs(sectors[i]).replace(/^0:/,'');
        markEl.textContent='✓';
      }else{
        timeEl.textContent='--.--';
        markEl.textContent='--';
      }
    });
  }
}
