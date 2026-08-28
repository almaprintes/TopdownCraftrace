import { RaceScene as CurrentRaceScene } from './RaceRenderIsolationProfilerScene.js';

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

// Diagnostic-only per-lap CPU breakdown. Enabled only with "show FPS".
// It does not change physics, timing, rendering or input. It keeps whole-lap
// aggregates so a device can show which subsystem grows from L1 -> L2 -> L3...
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    if(!videoPrefs().showFPS)return result;

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
      ['_updateRaceInfoHud','raceHud'],
      ['_syncCompetitionHud','compHud'],
      ['_updateMinimap','minimap'],
      ['_updateStandings','standings'],
      ['_updateCpuAi','cpuAI'],
      ['_updateAI','ai'],
      ['_updateParticles','particles'],
      ['_updateCamera','camera'],
      ['_pinHudToScreen','hudPin'],
      ['_pinRaceInfoHud','raceHudPin'],
      ['_discoverFixedHud','hudDiscover'],
      ['_applyDirectionalLookahead','lookahead'],
      ['_enforceGraphicsPreset','gfxPreset'],
      ['_updateAuthoredEnvironmentCull','envCull']
    ])wrap(method,label);

    this._lapBreakdownText=this.add.text(350,42,'LAP BREAKDOWN --',{
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
    if(p.history.length>4)p.history.shift();
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
      for(const h of p.history.slice(-3)){
        const a=h.rows[0],b=h.rows[1];
        lines.push(`L${h.lap} UP ${h.updateAvg.toFixed(1)}/${h.updateMax.toFixed(1)} ${a?`${a.name}:${a.total.toFixed(0)}`:'-'} ${b?`${b.name}:${b.total.toFixed(0)}`:''}`);
      }
    }
    this._lapBreakdownText.setText(lines.join('\n'));
  }

  update(time,delta){
    const t0=performance.now();
    const result=super.update(time,delta);
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
