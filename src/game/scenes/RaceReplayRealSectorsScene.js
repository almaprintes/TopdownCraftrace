import { RaceScene as ReplayTelemetryScene } from './RaceReplayTelemetryFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends ReplayTelemetryScene {
  create(data){
    this._ghostSectorCrossings=[];
    this._ghostSectorLastProgress=0;
    const result=super.create(data);
    this.time.delayedCall(0,()=>this._ensureGhostSectorTimes());
    return result;
  }

  _recordGhostSample(now){
    super._recordGhostSample(now);
    if(this._replayActive||!this._raceStarted||!this.carBody||this._ghostLapStartPerf==null)return;

    const p=clamp(Number(this._computeLapProgress01?.(Number(this.carBody.x||0),Number(this.carBody.y||0))||0),0,1);
    const prev=clamp(Number(this._ghostSectorLastProgress||0),0,1);
    const elapsed=Math.max(0,Math.round(now-this._ghostLapStartPerf));

    if(this._ghostSectorCrossings.length===0 && prev<1/3 && p>=1/3){
      this._ghostSectorCrossings.push(elapsed);
    }
    if(this._ghostSectorCrossings.length===1 && prev<2/3 && p>=2/3){
      this._ghostSectorCrossings.push(elapsed);
    }
    this._ghostSectorLastProgress=p;
  }

  _completedLapCheck(now){
    const histBefore=Array.isArray(this.ttHistory)?this.ttHistory.length:0;
    const crossings=this._ghostSectorCrossings.slice(0,2);
    const oldGhost=this._ghostData;
    super._completedLapCheck(now);
    const histAfter=Array.isArray(this.ttHistory)?this.ttHistory.length:0;

    if(this._ghostData && this._ghostData!==oldGhost && crossings.length===2){
      const lap=Math.max(1,Number(this._ghostData.lapMs)||1);
      const c1=clamp(Number(crossings[0]),0,lap);
      const c2=clamp(Number(crossings[1]),c1,lap);
      const sectors=[c1,c2-c1,lap-c2].map(v=>Math.max(0,Math.round(v)));
      this._ghostData={...this._ghostData,version:5,sectorTimes:sectors,sectorCrossings:[c1,c2]};
      try{localStorage.setItem(this._ghostStorageKey,JSON.stringify(this._ghostData));}catch{}
    }

    if(histAfter>histBefore){
      this._ghostSectorCrossings=[];
      this._ghostSectorLastProgress=0;
    }
  }

  _deriveSectorTimesFromSamples(){
    const g=this._ghostData,samples=g?.samples||[];
    if(!g||samples.length<3)return null;
    const lap=Math.max(1,Number(g.lapMs)||1);
    const savedProg=this._ttProg?{...this._ttProg}:null;
    if(this._ttCl?.startIdx!=null)this._ttProg={idx:this._ttCl.startIdx,inited:false};

    let c1=null,c2=null,prev=0;
    for(const s of samples){
      const p=clamp(Number(this._computeLapProgress01?.(Number(s.x),Number(s.y))||0),0,1);
      const t=clamp(Number(s.t)||0,0,lap);
      if(c1==null && prev<1/3 && p>=1/3)c1=t;
      if(c1!=null && c2==null && prev<2/3 && p>=2/3){c2=t;break;}
      prev=p;
    }

    if(savedProg)this._ttProg=savedProg;
    else if(this._ttCl?.startIdx!=null)this._ttProg={idx:this._ttCl.startIdx,inited:false};

    if(c1==null||c2==null)return null;
    return [Math.round(c1),Math.round(c2-c1),Math.round(lap-c2)];
  }

  _ensureGhostSectorTimes(){
    if(!this._ghostData||Array.isArray(this._ghostData.sectorTimes)&&this._ghostData.sectorTimes.length===3)return;
    const sectors=this._deriveSectorTimesFromSamples();
    if(!sectors)return;
    this._ghostData={...this._ghostData,version:5,sectorTimes:sectors};
    try{localStorage.setItem(this._ghostStorageKey,JSON.stringify(this._ghostData));}catch{}
  }

  _updateReplayIdentity(t){
    super._updateReplayIdentity(t);

    // Keep the small replay stopwatch tied to the exact replay timeline.
    // It used to remain at the initial 0:00.00 because only its DOM adapter
    // was created, but nothing updated it after playback started.
    const lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    const shown=Math.min(Math.max(0,Number(t)||0),lap);
    if(this._replayTimeText?.scene)this._replayTimeText.setText(this._fmtReplayMs(shown));

    const rows=this._replaySectors;
    if(!rows?.length)return;

    const sectors=Array.isArray(this._ghostData?.sectorTimes)&&this._ghostData.sectorTimes.length===3
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
