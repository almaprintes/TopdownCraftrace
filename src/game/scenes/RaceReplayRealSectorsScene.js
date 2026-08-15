import { RaceScene as ReplayTelemetryScene } from './RaceReplayTelemetryFixScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends ReplayTelemetryScene {
  create(data){
    this._ghostSectorCrossings=[];
    this._ghostSectorLastProgress=0;
    this._exportCompositeCanvas=null;
    this._exportCompositeRaf=0;
    const result=super.create(data);
    this.time.delayedCall(0,()=>this._ensureGhostSectorTimes());
    this.events.once('shutdown',()=>this._stopExportComposite());
    return result;
  }

  _recordGhostSample(now){
    super._recordGhostSample(now);
    if(this._replayActive||!this._raceStarted||!this.carBody||this._ghostLapStartPerf==null)return;

    const p=clamp(Number(this._computeLapProgress01?.(Number(this.carBody.x||0),Number(this.carBody.y||0))||0),0,1);
    const prev=clamp(Number(this._ghostSectorLastProgress||0),0,1);
    const elapsed=Math.max(0,Math.round(now-this._ghostLapStartPerf));

    if(this._ghostSectorCrossings.length===0 && prev<1/3 && p>=1/3)this._ghostSectorCrossings.push(elapsed);
    if(this._ghostSectorCrossings.length===1 && prev<2/3 && p>=2/3)this._ghostSectorCrossings.push(elapsed);
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

    // Derive sectors directly from the recorded lap geometry. This is deliberately
    // independent of the live race progress tracker, whose internal state made
    // old ghosts collapse into 0 / 0 / total.
    const cumulative=[0];
    let total=0;
    for(let i=1;i<samples.length;i++){
      const a=samples[i-1],b=samples[i];
      total+=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y));
      cumulative.push(total);
    }
    if(total<=1)return null;

    const timeAtDistance=(target)=>{
      let i=1;
      while(i<cumulative.length&&cumulative[i]<target)i++;
      i=clamp(i,1,cumulative.length-1);
      const d0=cumulative[i-1],d1=cumulative[i],span=Math.max(.0001,d1-d0);
      const k=clamp((target-d0)/span,0,1);
      const t0=Number(samples[i-1].t)||0,t1=Number(samples[i].t)||t0;
      return clamp(t0+(t1-t0)*k,0,lap);
    };
    const c1=timeAtDistance(total/3),c2=timeAtDistance(total*2/3);
    return [Math.round(c1),Math.round(c2-c1),Math.round(lap-c2)];
  }

  _validSectorTimes(sectors){
    if(!Array.isArray(sectors)||sectors.length!==3)return false;
    const vals=sectors.map(Number),lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    if(vals.some(v=>!Number.isFinite(v)||v<=100))return false;
    return Math.abs(vals.reduce((a,b)=>a+b,0)-lap)<Math.max(150,lap*.015);
  }

  _ensureGhostSectorTimes(){
    if(!this._ghostData)return;
    if(this._validSectorTimes(this._ghostData.sectorTimes))return;
    const sectors=this._deriveSectorTimesFromSamples();
    if(!this._validSectorTimes(sectors))return;
    this._ghostData={...this._ghostData,version:6,sectorTimes:sectors};
    try{localStorage.setItem(this._ghostStorageKey,JSON.stringify(this._ghostData));}catch{}
  }

  _updateReplayIdentity(t){
    super._updateReplayIdentity(t);
    const lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    const shown=Math.min(Math.max(0,Number(t)||0),lap);
    if(this._replayTimeText?.scene)this._replayTimeText.setText(this._fmtReplayMs(shown));

    const rows=this._replaySectors;
    if(!rows?.length)return;
    const sectors=this._validSectorTimes(this._ghostData?.sectorTimes)?this._ghostData.sectorTimes.map(Number):null;
    if(!sectors)return;

    const end1=sectors[0],end2=sectors[0]+sectors[1],end3=lap;
    const completed=t>=end3-25?3:t>=end2?2:t>=end1?1:0;
    rows.forEach((r,i)=>{
      const done=i<completed,active=i===Math.min(2,completed);
      r.style.opacity=done?'1':active?'.8':'.45';
      const timeEl=r.querySelector('[data-t]'),markEl=r.querySelector('[data-d]');
      if(done){timeEl.textContent=this._fmtReplayMs(sectors[i]).replace(/^0:/,'');markEl.textContent='✓';}
      else{timeEl.textContent='--.--';markEl.textContent='--';}
    });
  }

  _roundRect(ctx,x,y,w,h,r=8){
    const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }

  _drawExportGlass(ctx,x,y,w,h,s){
    ctx.save();this._roundRect(ctx,x,y,w,h,8*s);ctx.fillStyle='rgba(3,13,22,.80)';ctx.fill();ctx.strokeStyle='rgba(100,232,255,.45)';ctx.lineWidth=Math.max(1,s);ctx.stroke();ctx.restore();
  }

  _drawExportOverlay(ctx,w,h){
    const sx=w/956,sy=h/440,s=Math.min(sx,sy),X=v=>v*sx,Y=v=>v*sy;
    const lap=Math.max(1,Number(this._ghostData?.lapMs)||1);
    const t=clamp(Number(this._replayElapsed)||Math.max(0,performance.now()-Number(this._replayStartedAt||performance.now())),0,lap);
    ctx.save();ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=2*s;

    // Identity plate.
    this._drawExportGlass(ctx,X(14),Y(12),X(205),Y(58),s);
    ctx.fillStyle='#7feaff';ctx.font=`900 ${10*s}px system-ui`;ctx.fillText('REPLAY · VUELTA RÁPIDA',X(26),Y(27));
    ctx.fillStyle='#fff';ctx.font=`900 ${15*s}px system-ui`;ctx.fillText(this._replayCarName(),X(26),Y(45));
    ctx.fillStyle='rgba(255,255,255,.72)';ctx.font=`700 ${9*s}px system-ui`;ctx.fillText(this._replayTrackName(),X(26),Y(61));

    // Sector plate using the real recorded sector values.
    this._drawExportGlass(ctx,X(790),Y(12),X(152),Y(78),s);
    ctx.fillStyle='#7feaff';ctx.font=`900 ${9*s}px system-ui`;ctx.fillText('SECTORES',X(804),Y(27));
    const sectors=this._validSectorTimes(this._ghostData?.sectorTimes)?this._ghostData.sectorTimes.map(Number):null;
    if(sectors){const e1=sectors[0],e2=e1+sectors[1],ends=[e1,e2,lap];for(let i=0;i<3;i++){const done=t>=ends[i]-25;ctx.fillStyle=done?'#fff':'rgba(255,255,255,.55)';ctx.font=`800 ${9*s}px ui-monospace,monospace`;ctx.fillText(`S${i+1}`,X(804),Y(43+i*15));ctx.fillText(done?this._fmtReplayMs(sectors[i]).replace(/^0:/,''):'--.--',X(836),Y(43+i*15));ctx.fillText(done?'✓':'--',X(915),Y(43+i*15));}}

    // Telemetry plate: mirror the live DOM telemetry values so export matches replay.
    this._drawExportGlass(ctx,X(747),Y(330),X(195),Y(92),s);
    const speed=this._replayTelemetry?.querySelector?.('[data-speed]')?.textContent||'000';
    const gear=this._replayTelemetry?.querySelector?.('[data-gear]')?.textContent||'N';
    const gas=parseFloat(this._replayTelemetry?.querySelector?.('[data-gas]')?.style?.width)||0;
    const brake=parseFloat(this._replayTelemetry?.querySelector?.('[data-brake]')?.style?.width)||0;
    const steer=parseFloat(this._replayTelemetry?.querySelector?.('[data-steer]')?.style?.left)||50;
    ctx.fillStyle='#fff';ctx.font=`900 ${25*s}px ui-monospace,monospace`;ctx.fillText(speed,X(760),Y(350));ctx.font=`700 ${8*s}px system-ui`;ctx.fillStyle='rgba(255,255,255,.68)';ctx.fillText('km/h',X(840),Y(351));ctx.fillStyle='#7feaff';ctx.font=`900 ${15*s}px system-ui`;ctx.fillText(gear,X(914),Y(350));
    const bar=(label,y,pct,color)=>{ctx.fillStyle='rgba(255,255,255,.8)';ctx.font=`800 ${7*s}px system-ui`;ctx.fillText(label,X(760),Y(y-5));ctx.fillStyle='rgba(35,57,65,.75)';ctx.fillRect(X(760),Y(y),X(166),Y(4));ctx.fillStyle=color;ctx.fillRect(X(760),Y(y),X(166*pct/100),Y(4));};bar('GAS',373,gas,'#35f3a0');bar('FRENO',392,brake,'#ff667d');ctx.fillStyle='rgba(255,255,255,.65)';ctx.font=`800 ${7*s}px system-ui`;ctx.fillText('DIRECCIÓN',X(760),Y(410));ctx.fillStyle='#18323a';ctx.fillRect(X(817),Y(408),X(109),Y(3));ctx.fillStyle='#8ff2ff';ctx.fillRect(X(817+109*clamp(steer/100,0,1)-1.5),Y(405),X(3),Y(9));

    // Timer + brand.
    this._drawExportGlass(ctx,X(446),Y(396),X(72),Y(26),s);ctx.fillStyle='#8ff2ff';ctx.font=`800 ${10*s}px ui-monospace,monospace`;ctx.textAlign='center';ctx.fillText(this._fmtReplayMs(t),X(482),Y(409));ctx.textAlign='left';ctx.fillStyle='rgba(167,245,255,.75)';ctx.font=`900 ${8*s}px system-ui`;ctx.fillText('TOPDOWN CRAFTRACE // REPLAY',X(14),Y(409));

    // Intro card for first 1.5 s.
    if(t<1500){this._drawExportGlass(ctx,X(360),Y(165),X(236),Y(92),s);ctx.textAlign='center';ctx.fillStyle='#59f3b1';ctx.font=`900 ${10*s}px system-ui`;ctx.fillText('PERSONAL BEST',X(478),Y(185));ctx.fillStyle='#fff';ctx.font=`900 ${32*s}px ui-monospace,monospace`;ctx.fillText(this._fmtReplayMs(lap),X(478),Y(215));ctx.fillStyle='rgba(255,255,255,.8)';ctx.font=`700 ${9*s}px system-ui`;ctx.fillText(`${this._replayCarName()} · ${this._replayTrackName()}`,X(478),Y(241));ctx.textAlign='left';}

    // Delta when the replay DOM says it is active.
    const deltaStyle=this._replayDelta?.style,deltaV=this._replayDelta?.querySelector?.('[data-v]');
    if(deltaStyle && Number(deltaStyle.opacity||0)>.5 && deltaV?.textContent){this._drawExportGlass(ctx,X(432),Y(12),X(92),Y(42),s);ctx.textAlign='center';ctx.fillStyle='rgba(255,255,255,.65)';ctx.font=`800 ${7*s}px system-ui`;ctx.fillText('DELTA',X(478),Y(23));ctx.fillStyle=deltaV.style.color||'#59f3b1';ctx.font=`900 ${17*s}px ui-monospace,monospace`;ctx.fillText(deltaV.textContent,X(478),Y(40));ctx.textAlign='left';}
    ctx.restore();
  }

  _stopExportComposite(){
    if(this._exportCompositeRaf)cancelAnimationFrame(this._exportCompositeRaf);
    this._exportCompositeRaf=0;this._exportCompositeCanvas=null;
  }

  _startReplayExport(){
    if(this._replayExporting||!this._ghostData)return;
    const source=this.game?.canvas;
    if(!source?.captureStream)return super._startReplayExport();

    // MediaRecorder only captures the Phaser canvas; the in-game replay UI is DOM.
    // Build a temporary composite canvas that burns the clean replay overlay into
    // every exported frame while keeping playback controls out of the video.
    const composite=document.createElement('canvas');
    composite.width=source.width;composite.height=source.height;
    const ctx=composite.getContext('2d',{alpha:false});
    this._exportCompositeCanvas=composite;
    const draw=()=>{if(!this._exportCompositeCanvas)return;try{ctx.drawImage(source,0,0,composite.width,composite.height);this._drawExportOverlay(ctx,composite.width,composite.height);}catch{}this._exportCompositeRaf=requestAnimationFrame(draw);};
    draw();

    const originalCapture=source.captureStream.bind(source);
    try{
      source.captureStream=(fps=60)=>composite.captureStream(fps);
      const result=super._startReplayExport();
      const rec=this._replayRecorder;
      if(rec){const prevStop=rec.onstop;rec.onstop=(ev)=>{this._stopExportComposite();try{prevStop?.call(rec,ev);}catch{}};}
      return result;
    }finally{source.captureStream=originalCapture;}
  }
}
