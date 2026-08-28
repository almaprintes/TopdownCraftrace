import { RaceScene as CurrentRaceScene } from './RaceHudPerformanceScene.js';

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {showFPS:!!s?.video?.showFPS};
  }catch{return {showFPS:false};}
}

function makeStat(){return {sum:0,max:0,calls:0};}
function addStat(map,label,ms){
  const s=map.get(label)||makeStat();
  s.sum+=ms;s.max=Math.max(s.max,ms);s.calls++;
  map.set(label,s);
}

function safeDestroy(obj){
  if(!obj)return;
  try{obj.destroy?.(true);}catch{}
}

// Diagnostic-only per-lap CPU breakdown. Enabled only with "show FPS".
// IMPORTANT: checkpoints, lap validation and timing are NEVER modified here.
// This layer also removes obsolete race/debug HUDs that were still alive in
// the scene chain and replaces the expensive race status UI with one cheap text.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);

    // =========================================================
    // HARD CLEANUP: legacy HUDs / old diagnostics
    // =========================================================
    // Destroy, do not merely hide. These objects must not keep Text textures,
    // timers or update work alive in the background.
    for(const key of [
      'raceInfoHud','competitionHud',
      '_perfDiagText','_renderPerfText','_isoText',
      '_diagText','_touchDbg','_dbgText',
      'devBox','devTitle','devInfo','devBtnMap','devTuneBtn'
    ]){
      safeDestroy(this[key]);
      this[key]=null;
    }

    // Neutralise callbacks belonging only to the removed visual HUDs.
    // DO NOT touch _cpState, timing, _completedLapCheck or checkpoint methods.
    this._updateRaceInfoHud=()=>{};
    this._pinRaceInfoHud=()=>{};
    this._buildRaceInfoHud=()=>{};
    this._syncCompetitionHud=()=>{};
    this._pinCompetitionHud=()=>{};
    this._hideRaceDebugOnly=()=>{};
    this._dbgSet=()=>{};

    // Switch off state left by the old windowed profiler if present.
    this._perfDiagEnabled=false;
    this._renderPerfEnabled=false;
    this._isoModes=null;
    try{this._perfStats?.clear?.();}catch{}

    // =========================================================
    // MINIMAL RACE STATUS — one Text, 4 Hz, changes only on state change.
    // Reads checkpoints but NEVER writes them.
    // =========================================================
    const vw=Math.max(1,Number(this.scale?.width||1));
    const vh=Math.max(1,Number(this.scale?.height||1));
    this._simpleRaceStatusText=this.add.text(vw*0.5,vh-82,'',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:'14px',fontStyle:'700',color:'#F4F8FB',
      backgroundColor:'rgba(5,12,20,.68)',
      padding:{x:12,y:6}
    }).setOrigin(0.5,1).setScrollFactor(0).setDepth(4990);
    try{this.cameras.main.ignore(this._simpleRaceStatusText);}catch{}
    this._simpleRaceStatusLast='';
    this._simpleRaceStatusAt=-Infinity;

    this._readRacePosition=()=>{
      const systems=[this.standingsSystem,this.standings,this._standings].filter(Boolean);
      const ids=[this.playerStandingsId,'player','you','user',this.carId].filter(Boolean).map(String);
      for(const sys of systems){
        if(typeof sys?.getPosition!=='function')continue;
        for(const id of ids){
          try{
            const pos=sys.getPosition(id);
            if(Number.isFinite(Number(pos))&&Number(pos)>0){
              const total=typeof sys.getCarCount==='function'?Number(sys.getCarCount()||0):0;
              return {pos:Number(pos),total};
            }
          }catch{}
        }
      }
      return null;
    };

    this._updateSimpleRaceStatus=()=>{
      const now=performance.now();
      if(now-this._simpleRaceStatusAt<250)return;
      this._simpleRaceStatusAt=now;
      const lap=Math.max(1,Number(this.lapCount||0)+1);
      const cp=Math.max(0,Math.min(2,Number(this._cpState||0)));
      const sector=cp+1;
      const pos=this._readRacePosition?.();
      const parts=[`VUELTA ${lap}`,`SECTOR ${sector}/3`];
      if(pos&&pos.total>1)parts.push(`POS ${pos.pos}/${pos.total}`);
      const text=parts.join('   ·   ');
      if(text!==this._simpleRaceStatusLast){
        this._simpleRaceStatusLast=text;
        this._simpleRaceStatusText?.setText(text);
      }
    };
    this._updateSimpleRaceStatus();

    const showFPS=videoPrefs().showFPS;
    if(!showFPS)return result;

    this._lapBreakdown={
      lap:Number(this.lapCount||0)+1,
      startedAt:performance.now(),
      stats:new Map(),
      updateSum:0,updateMax:0,frames:0,
      history:[],
      lastUiAt:0
    };

    const wrap=(method,label)=>{
      const original=this[method];
      if(typeof original!=='function'||original.__tdrLapBreakdown)return;
      const bound=original.bind(this);
      const wrapped=(...args)=>{
        const t0=performance.now();
        const out=bound(...args);
        const p=this._lapBreakdown;
        if(p)addStat(p.stats,label,Math.max(0,performance.now()-t0));
        return out;
      };
      wrapped.__tdrLapBreakdown=true;
      this[method]=wrapped;
    };

    for(const [method,label] of [
      ['_computeLapProgress01','lapProg'],
      ['_computeCenterlineProjection','projection'],
      ['_getNearestTrackPoint','nearest'],
      ['_isOnTrack','onTrack'],
      ['_isOnKerb','kerb'],
      ['_isInBand','band'],
      ['_completedLapCheck','lapCheck'],
      ['_recordGhostSample','ghostRec'],
      ['_playGhost','ghostPlay'],
      ['_updateProceduralAudio','audio'],
      ['_updateKerbHaptics','haptics'],
      ['_updateMinimap','minimap'],
      ['_updateStandings','standings'],
      ['_updateCpuAi','cpuAI'],
      ['_updateAI','ai'],
      ['_updateParticles','particles'],
      ['_updateCamera','camera'],
      ['_pinHudToScreen','hudPin'],
      ['_discoverFixedHud','hudDiscover'],
      ['_applyDirectionalLookahead','lookahead'],
      ['_enforceGraphicsPreset','gfxPreset'],
      ['_updateAuthoredEnvironmentCull','envCull'],
      ['_updateSimpleRaceStatus','simpleHud']
    ])wrap(method,label);

    this._lapBreakdownText=this.add.text(350,42,'LAP CPU --',{
      fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
      fontSize:'10px',fontStyle:'bold',color:'#fff0a8',
      backgroundColor:'rgba(0,0,0,.66)',padding:{x:6,y:4},lineSpacing:2
    }).setScrollFactor(0).setDepth(5004);
    try{this.cameras.main.ignore(this._lapBreakdownText);}catch{}

    return result;
  }

  _lapBreakdownSnapshot(lap){
    const p=this._lapBreakdown;if(!p)return;
    const elapsed=Math.max(1,performance.now()-p.startedAt);
    const rows=[...p.stats.entries()].map(([name,s])=>({
      name,total:s.sum,avg:s.calls?s.sum/s.calls:0,max:s.max,calls:s.calls
    })).sort((a,b)=>b.total-a.total);
    p.history.push({
      lap,
      seconds:elapsed/1000,
      updateAvg:p.frames?p.updateSum/p.frames:0,
      updateMax:p.updateMax,
      frames:p.frames,
      rows:rows.slice(0,8)
    });
    if(p.history.length>8)p.history.shift();
  }

  _lapBreakdownReset(lap){
    const p=this._lapBreakdown;if(!p)return;
    p.lap=lap;p.startedAt=performance.now();p.stats=new Map();
    p.updateSum=0;p.updateMax=0;p.frames=0;
  }

  _lapBreakdownRender(){
    const p=this._lapBreakdown;if(!p||!this._lapBreakdownText?.scene)return;
    const current=[...p.stats.entries()].map(([name,s])=>({name,total:s.sum,avg:s.calls?s.sum/s.calls:0,max:s.max,calls:s.calls}))
      .sort((a,b)=>b.total-a.total).slice(0,5);
    const lines=[`LAP CPU · L${p.lap}  UP ${(p.frames?p.updateSum/p.frames:0).toFixed(1)}/${p.updateMax.toFixed(1)}ms`];
    for(const r of current)lines.push(`${r.name.padEnd(10).slice(0,10)} ${r.total.toFixed(0)}ms  ${r.avg.toFixed(2)}/${r.max.toFixed(1)} x${r.calls}`);
    if(p.history.length){
      lines.push('--- VUELTAS CERRADAS ---');
      for(const h of p.history.slice(-6)){
        const a=h.rows[0],b=h.rows[1];
        lines.push(`L${h.lap} UP ${h.updateAvg.toFixed(1)}/${h.updateMax.toFixed(1)} ${a?`${a.name}:${a.total.toFixed(0)}`:'-'} ${b?`${b.name}:${b.total.toFixed(0)}`:''}`);
      }
    }
    this._lapBreakdownText.setText(lines.join('\n'));
  }

  update(time,delta){
    const t0=performance.now();
    const result=super.update(time,delta);
    this._updateSimpleRaceStatus?.();
    const p=this._lapBreakdown;if(!p)return result;
    const ms=Math.max(0,performance.now()-t0);
    p.updateSum+=ms;p.updateMax=Math.max(p.updateMax,ms);p.frames++;

    const lap=Number(this.lapCount||0)+1;
    if(lap!==p.lap){
      this._lapBreakdownSnapshot(p.lap);
      this._lapBreakdownReset(lap);
    }

    const now=performance.now();
    if(now-p.lastUiAt>500){p.lastUiAt=now;this._lapBreakdownRender();}
    return result;
  }
}
