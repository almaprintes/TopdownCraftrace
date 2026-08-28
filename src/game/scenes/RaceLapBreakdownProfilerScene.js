import { RaceScene as CurrentRaceScene } from './RaceHudPerformanceScene.js';

function safeDestroy(obj){if(!obj)return;try{obj.destroy?.(true);}catch{}}
function fmtLap(ms){
  if(!Number.isFinite(Number(ms)))return '--:--.--';
  const t=Math.max(0,Number(ms));
  const m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);
  return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
}

// Shipping-light race HUD.
// IMPORTANT: checkpoint state, lap validation and timing are read-only here.
// The former per-lap profiler was intentionally removed: on iOS its many
// performance.now() probes materially distorted the workload it was measuring.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);

    for(const key of [
      'raceInfoHud','competitionHud','minimapSportFrame',
      '_perfDiagText','_renderPerfText','_isoText','_diagText','_touchDbg','_dbgText','_lapBreakdownText',
      'devBox','devTitle','devInfo','devBtnMap','devTuneBtn'
    ]){safeDestroy(this[key]);this[key]=null;}

    this._updateRaceInfoHud=()=>{};
    this._pinRaceInfoHud=()=>{};
    this._buildRaceInfoHud=()=>{};
    this._syncCompetitionHud=()=>{};
    this._pinCompetitionHud=()=>{};
    this._pinMinimapSportFrame=()=>{};
    this._layoutMinimapSportFrame=()=>{};
    this._centerMinimapInsideSportFrame=()=>{};
    this._hideRaceDebugOnly=()=>{};
    this._dbgSet=()=>{};
    this._perfDiagEnabled=false;
    this._renderPerfEnabled=false;
    this._isoModes=null;
    this._lapBreakdown=null;
    try{this._perfStats?.clear?.();}catch{}

    const vw=Math.max(1,Number(this.scale?.width||1));
    const vh=Math.max(1,Number(this.scale?.height||1));

    this._simpleRaceTop=this.add.text(vw*0.5,8,'',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'700',
      color:'#F4F8FB',backgroundColor:'rgba(5,12,20,.58)',padding:{x:10,y:5}
    }).setOrigin(0.5,0).setScrollFactor(0).setDepth(4990);

    this._simpleRaceBottom=this.add.text(vw*0.5,vh-14,'',{
      fontFamily:'Orbitron,system-ui,sans-serif',fontSize:'20px',fontStyle:'800',
      color:'#F7FBFF',backgroundColor:'rgba(5,12,20,.70)',padding:{x:14,y:7}
    }).setOrigin(0.5,1).setScrollFactor(0).setDepth(4990);

    try{this.cameras.main.ignore([this._simpleRaceTop,this._simpleRaceBottom]);}catch{}
    this._simpleRaceTopLast='';
    this._simpleRaceBottomLast='';
    this._simpleRaceHudAccum=100;

    this._readRacePosition=()=>{
      const systems=[this.standingsSystem,this.standings,this._standings].filter(Boolean);
      const ids=[this.playerStandingsId,'player','you','user',this.carId].filter(Boolean).map(String);
      for(const sys of systems){
        if(typeof sys?.getPosition!=='function')continue;
        for(const id of ids){
          try{
            const pos=Number(sys.getPosition(id));
            if(Number.isFinite(pos)&&pos>0){
              const total=typeof sys.getCarCount==='function'?Number(sys.getCarCount()||0):0;
              return {pos,total};
            }
          }catch{}
        }
      }
      return null;
    };

    this._updateSimpleRaceHud=(delta=0)=>{
      this._simpleRaceHudAccum+=Math.max(0,Number(delta)||0);
      if(this._simpleRaceHudAccum<100)return;
      this._simpleRaceHudAccum=0;

      // performance.now() is intentionally sampled only at HUD refresh rate (10 Hz),
      // never once per rendered frame.
      const now=performance.now();
      const body=this.carBody?.body;
      const vx=Number(body?.velocity?.x||0),vy=Number(body?.velocity?.y||0);
      const kmh=Math.max(0,Math.hypot(vx,vy)*0.185);
      const started=!!this.timing?.started&&this.timing?.lapStart!=null;
      const elapsed=started?Math.max(0,now-Number(this.timing.lapStart)):0;
      const bottom=`${String(Math.round(kmh)).padStart(3,'0')} km/h    ${fmtLap(elapsed)}`;
      if(bottom!==this._simpleRaceBottomLast){this._simpleRaceBottomLast=bottom;this._simpleRaceBottom?.setText(bottom);}

      const lap=Math.max(1,Number(this.lapCount||0)+1);
      const cp=Math.max(0,Math.min(2,Number(this._cpState||0)));
      const sector=cp+1;
      const pos=this._readRacePosition?.();
      const hist=Array.isArray(this.ttHistory)?this.ttHistory:[];
      const histLast=hist.length?Number(hist[hist.length-1]?.lapMs):NaN;
      const lastMs=Number.isFinite(Number(this.timing?.lastLap))?Number(this.timing.lastLap):histLast;
      const bestMs=Number(this.ttBest?.lapMs);
      let deltaMs=NaN;
      if(cp>=2&&Number.isFinite(Number(this.timing?.s2))&&Number.isFinite(Number(this.ttBest?.s2)))deltaMs=Number(this.timing.s2)-Number(this.ttBest.s2);
      else if(cp>=1&&Number.isFinite(Number(this.timing?.s1))&&Number.isFinite(Number(this.ttBest?.s1)))deltaMs=Number(this.timing.s1)-Number(this.ttBest.s1);
      const deltaTxt=Number.isFinite(deltaMs)?`${deltaMs>=0?'+':'−'}${(Math.abs(deltaMs)/1000).toFixed(2)}`:'--';
      const parts=[`VUELTA ${lap}`,`S${sector}/3`];
      if(pos&&pos.total>1)parts.push(`POS ${pos.pos}/${pos.total}`);
      parts.push(`LAST ${fmtLap(lastMs)}`,`BEST ${fmtLap(bestMs)}`,`Δ ${deltaTxt}`);
      const top=parts.join('  ·  ');
      if(top!==this._simpleRaceTopLast){this._simpleRaceTopLast=top;this._simpleRaceTop?.setText(top);}
    };

    this._updateSimpleRaceHud(100);
    return result;
  }

  update(time,delta){
    const result=super.update(time,delta);
    this._updateSimpleRaceHud?.(delta);
    return result;
  }
}
