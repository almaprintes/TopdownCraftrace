import { RaceScene as CurrentRaceScene } from './RaceDuelCornerCutScene.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    this._duelCpuLapReplays=[];
    this._duelCpuReplayBuffer=[];
    this._duelCpuReplayLapStart=null;
    this._duelCpuReplayLastSample=0;
    this._duelSelectedLapReplay=null;
    this._duelReplayResultRoot=null;
    this._duelReplayBackButton=null;
    return super.create(data);
  }

  _resetDuelCpuLapReplay(){
    this._duelCpuReplayBuffer=[];
    this._duelCpuReplayLapStart=performance.now();
    this._duelCpuReplayLastSample=0;
  }

  _recordDuelCpuLapReplaySample(){
    if(this._replayActive||!this._raceStarted||this._duelFinished)return;
    const bot=this._duelBot,body=bot?.plannerBody;
    if(!bot?.active||!body?.body||!this._duelCpu?.armed)return;
    const now=performance.now();
    if(this._duelCpuReplayLapStart==null)this._duelCpuReplayLapStart=now;
    if(now-this._duelCpuReplayLastSample<40)return;
    this._duelCpuReplayLastSample=now;
    const v=body.body.velocity||{};
    const speed=Math.hypot(Number(v.x)||0,Number(v.y)||0);
    this._duelCpuReplayBuffer.push({
      t:Math.max(0,Math.round(now-this._duelCpuReplayLapStart)),
      x:Number(body.x||0),y:Number(body.y||0),r:Number(body.rotation||0),
      speed:Number(speed.toFixed(2)),kmh:Math.max(0,Math.round(speed*.1)),
      steer:Number(bot._plannerControl?.steer||0),
      throttle:Number(bot._plannerControl?.throttle||0),
      brake:Number(bot._plannerControl?.brake||0),
      straight:Boolean(bot._plannerControl?.straightLock)
    });
    if(this._duelCpuReplayBuffer.length>1600)this._duelCpuReplayBuffer.shift();
  }

  _finalizeDuelCpuLapReplay(lapMs,lapNo){
    const raw=this._duelCpuReplayBuffer;
    if(Number.isFinite(lapMs)&&lapMs>1000&&Array.isArray(raw)&&raw.length>=8){
      const elapsed=Math.max(1,Number(raw[raw.length-1]?.t||lapMs));
      const samples=raw.map(p=>({...p,t:Math.round(Number(p.t||0)*lapMs/elapsed)}));
      this._duelCpuLapReplays[lapNo-1]={
        version:1,kind:'duel_cpu1_session',
        trackKey:this.trackKey||this.track?.meta?.key||'track01',
        carId:this.carId||this.selectedCarId||'cpu1',carName:'CPU1',
        lapNo,lapMs:Math.round(lapMs),samples
      };
    }
    this._resetDuelCpuLapReplay();
  }

  _crossDuelFinish(state,isPlayer){
    const wasArmed=!!state?.armed;
    const beforeLaps=Number(state?.laps||0);
    const result=super._crossDuelFinish?.(state,isPlayer);
    if(!isPlayer&&state){
      const afterLaps=Number(state.laps||0);
      if(!wasArmed&&state.armed){
        this._resetDuelCpuLapReplay();
      }else if(afterLaps>beforeLaps){
        const lapMs=Number(state.lapTimes?.[state.lapTimes.length-1]);
        this._finalizeDuelCpuLapReplay(lapMs,afterLaps);
      }
    }
    return result;
  }

  _startDuelLapReplay(lapIndex){
    const replay=this._duelCpuLapReplays?.[lapIndex];
    if(!replay?.samples?.length||this._replayActive)return;
    this._duelSelectedLapReplay=replay;
    this._ghostData=replay;
    this._ghostTrackKey=replay.trackKey;
    try{this._ghostSprite?.destroy?.();}catch{}
    this._ghostSprite=null;
    const previousMode=this._tdrGameMode;
    this._tdrGameMode='ghost';
    this._createGhostSprite?.();
    this._tdrGameMode=previousMode;
    if(!this._ghostSprite?.scene){this._duelSelectedLapReplay=null;return;}

    this._duelReplayResultRoot=this._duelResultDom||null;
    if(this._duelReplayResultRoot)this._duelReplayResultRoot.style.display='none';
    try{this.physics?.world?.resume?.();}catch{}
    this._enterReplay?.();
    this._showDuelReplayBackButton();
  }

  _showDuelReplayBackButton(){
    if(typeof document==='undefined')return;
    try{this._duelReplayBackButton?.remove?.();}catch{}
    const wrap=document.createElement('div');
    wrap.dataset.tdrRaceUi='1';
    wrap.innerHTML=`<button type="button" style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:17000;height:44px;padding:0 22px;border:1px solid #ff9f43;background:#112434;color:#fff;font:900 10px system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.05em">VOLVER A RESULTADOS</button>`;
    document.body.appendChild(wrap);this._duelReplayBackButton=wrap;
    wrap.querySelector('button')?.addEventListener('click',()=>this._exitReplay?.());
  }

  _replayCarName(){
    if(this._duelSelectedLapReplay)return `CPU1 · VUELTA ${this._duelSelectedLapReplay.lapNo}`;
    return super._replayCarName?.()||'COCHE';
  }

  _exitReplay(){
    const duelReplay=!!this._duelSelectedLapReplay;
    const result=super._exitReplay?.();
    if(duelReplay){
      this._duelSelectedLapReplay=null;
      try{this.physics?.world?.pause?.();}catch{}
      try{this._duelReplayBackButton?.remove?.();}catch{}
      this._duelReplayBackButton=null;
      if(this._duelReplayResultRoot)this._duelReplayResultRoot.style.display='';
      this._duelReplayResultRoot=null;
    }
    return result;
  }

  _decorateDuelCpuReplayButtons(){
    const root=this._duelResultDom;
    if(!root||root.querySelector?.('[data-duel-replay-style="1"]'))return;
    const section=root.querySelector?.('[data-duel-sector-tables="1"]');
    const tables=section?.querySelectorAll?.('.f1laps');
    const cpuTable=tables?.[1];
    if(!cpuTable)return;
    const rows=[...cpuTable.querySelectorAll('.f1row')];
    rows.forEach((row,i)=>{
      const replay=this._duelCpuLapReplays?.[i];
      const button=document.createElement('button');
      button.type='button';button.className='duel-lap-replay';
      button.textContent='VER VUELTA';button.disabled=!replay?.samples?.length;
      if(!replay?.samples?.length)button.title='Repetición no disponible';
      button.addEventListener('click',()=>this._startDuelLapReplay(i));
      row.appendChild(button);
    });
    const style=document.createElement('style');
    style.dataset.duelReplayStyle='1';
    style.textContent=`
      [data-duel-sector-tables="1"] .duel-tables>div:nth-child(2) .f1head,
      [data-duel-sector-tables="1"] .duel-tables>div:nth-child(2) .f1row{grid-template-columns:38px repeat(3,minmax(42px,.72fr)) minmax(70px,1fr) 44px 66px!important}
      .duel-lap-replay{height:22px;padding:0 5px;border:1px solid #3d7fa4;background:#10283a;color:#73d0ff;font:900 6px system-ui;white-space:nowrap}
      .duel-lap-replay:disabled{opacity:.25}
    `;
    root.appendChild(style);
  }

  _showStandaloneDuelResult(){
    const result=super._showStandaloneDuelResult?.();
    this._decorateDuelCpuReplayButtons();
    return result;
  }

  _destroyStandaloneDuel(){
    // Las repeticiones de vuelta son deliberadamente efímeras: nada se persiste.
    this._duelCpuLapReplays=[];this._duelCpuReplayBuffer=[];
    this._duelSelectedLapReplay=null;
    try{this._duelReplayBackButton?.remove?.();}catch{}
    this._duelReplayBackButton=null;this._duelReplayResultRoot=null;
    return super._destroyStandaloneDuel?.();
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    this._recordDuelCpuLapReplaySample();
    return result;
  }
}
