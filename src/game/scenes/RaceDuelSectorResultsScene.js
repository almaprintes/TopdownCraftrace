import { RaceScene as CurrentRaceScene } from './RaceDuelStandaloneScene.js';

function segIntersect(ax,ay,bx,by,cx,cy,dx,dy){
  const rX=bx-ax,rY=by-ay,sX=dx-cx,sY=dy-cy,den=rX*sY-rY*sX;
  if(Math.abs(den)<1e-8)return false;
  const qpx=cx-ax,qpy=cy-ay,t=(qpx*sY-qpy*sX)/den,u=(qpx*rY-qpy*rX)/den;
  return t>=0&&t<=1&&u>=0&&u<=1;
}
function crossed(prev,x,y,g){
  if(!g?.a||!g?.b||!prev)return false;
  const ax=Number(prev.x),ay=Number(prev.y),bx=Number(x),by=Number(y);
  const cx=Number(g.a.x),cy=Number(g.a.y),dx=Number(g.b.x),dy=Number(g.b.y);
  if(![ax,ay,bx,by,cx,cy,dx,dy].every(Number.isFinite))return false;
  return segIntersect(ax,ay,bx,by,cx,cy,dx,dy);
}
function duelCheckpointGates(scene){
  const authored=scene?.track?.meta?.checkpoints;
  if(Array.isArray(authored)&&authored.length>=2)return{cp1:authored[0],cp2:authored[1]};
  const legacy=scene?.checkpoints;
  if(Array.isArray(legacy)&&legacy.length>=2)return{cp1:legacy[0],cp2:legacy[1]};
  return{cp1:legacy?.cp1||null,cp2:legacy?.cp2||null};
}

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    this._duelCpuSectorRows=[];
    this._duelCpuSectorTiming={lapStart:null,cp1At:null,cp2At:null};
    this._duelCpuSectorPrev=null;
    return super.create(data);
  }

  _crossDuelFinish(state,isPlayer){
    const wasArmed=!!state?.armed;
    const beforeLaps=Number(state?.laps||0);
    const result=super._crossDuelFinish?.(state,isPlayer);

    if(!isPlayer&&state){
      const timing=this._duelCpuSectorTiming||(this._duelCpuSectorTiming={lapStart:null,cp1At:null,cp2At:null});
      if(!wasArmed&&state.armed){
        timing.lapStart=Number(state.lastLapAt)||performance.now();
        timing.cp1At=null;timing.cp2At=null;
      }else if(Number(state.laps||0)>beforeLaps){
        const lapMs=Number(state.lapTimes?.[state.lapTimes.length-1]);
        const start=Number(timing.lapStart);
        const cp1=Number(timing.cp1At),cp2=Number(timing.cp2At);
        let sectors=[null,null,null];
        if(Number.isFinite(lapMs)&&Number.isFinite(start)&&Number.isFinite(cp1)&&Number.isFinite(cp2)&&cp1>start&&cp2>cp1){
          const s1=cp1-start,s2=cp2-cp1,s3=lapMs-(cp2-start);
          if([s1,s2,s3].every(v=>Number.isFinite(v)&&v>0))sectors=[s1,s2,s3];
        }
        if(Number.isFinite(lapMs)&&lapMs>1000){
          this._duelCpuSectorRows.push({n:Number(state.laps),lapMs,sectors});
        }
        timing.lapStart=Number(state.lastLapAt)||performance.now();
        timing.cp1At=null;timing.cp2At=null;
      }
    }
    return result;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(!this._duelStandalone||!this._raceStarted||!this._duelBot?.plannerBody?.scene)return result;

    const body=this._duelBot.plannerBody,x=Number(body.x),y=Number(body.y);
    if(!Number.isFinite(x)||!Number.isFinite(y))return result;
    const prev=this._duelCpuSectorPrev;
    if(prev){
      const timing=this._duelCpuSectorTiming;
      const {cp1,cp2}=duelCheckpointGates(this);
      if(timing?.lapStart!=null&&timing.cp1At==null&&crossed(prev,x,y,cp1))timing.cp1At=performance.now();
      if(timing?.lapStart!=null&&timing.cp1At!=null&&timing.cp2At==null&&crossed(prev,x,y,cp2))timing.cp2At=performance.now();
    }
    this._duelCpuSectorPrev={x,y};
    return result;
  }

  _showStandaloneDuelResult(){
    super._showStandaloneDuelResult?.();

    const root=this._duelResultDom;
    if(!root||typeof document==='undefined')return;
    const card=root.querySelector?.('.duel-c');
    const actions=root.querySelector?.('.duel-a');
    if(!card||!actions||card.querySelector?.('[data-duel-sector-tables="1"]'))return;

    const playerReport=this._buildReport?.();
    const playerTable=playerReport&&typeof this._f1LapTable==='function'?this._f1LapTable(playerReport):'';
    const cpuLaps=Array.isArray(this._duelCpuSectorRows)?this._duelCpuSectorRows:[];
    const cpuTimes=cpuLaps.map(l=>Number(l.lapMs)).filter(Number.isFinite);
    const cpuReport={laps:cpuLaps,bestMs:cpuTimes.length?Math.min(...cpuTimes):null};
    const cpuTable=cpuLaps.length&&typeof this._f1LapTable==='function'?this._f1LapTable(cpuReport):'<div class="duel-empty">CPU1 no registró vueltas completas.</div>';
    if(!playerTable&&!cpuTable)return;

    const section=document.createElement('section');
    section.dataset.duelSectorTables='1';
    section.innerHTML=`<div class="duel-tables"><div><div class="duel-sector-title">TÚ · VUELTAS Y SECTORES</div>${playerTable}</div><div><div class="duel-sector-title cpu">CPU1 · VUELTAS Y SECTORES</div>${cpuTable}</div></div>`;

    const style=document.createElement('style');
    style.textContent=`
      .duel-c{width:min(97vw,1500px)!important;max-height:94vh!important;overflow-y:auto!important;box-sizing:border-box!important}
      .duel-tables{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
      .duel-sector-title{margin:4px 0 7px;color:#9eabc0;font-size:9px;font-weight:900;letter-spacing:.11em}
      .duel-sector-title.cpu{color:#63c5ff}
      .duel-empty{border:1px solid #1e2b3d;border-radius:8px;background:#0b1320;padding:18px;color:#7f8da2;font-size:10px}
      [data-duel-sector-tables="1"] .f1laps{border:1px solid #1e2b3d;border-radius:8px;overflow:hidden;background:#0b1320;font-variant-numeric:tabular-nums}
      [data-duel-sector-tables="1"] .f1head,[data-duel-sector-tables="1"] .f1row{display:grid;grid-template-columns:42px repeat(3,minmax(45px,.8fr)) minmax(74px,1.1fr) minmax(55px,.75fr);align-items:center;column-gap:3px;padding:0 7px}
      [data-duel-sector-tables="1"] .f1head{height:25px;background:#121e2d;color:#79899f;font-size:7px;letter-spacing:.06em}
      [data-duel-sector-tables="1"] .f1head b:not(:first-child){text-align:right}
      [data-duel-sector-tables="1"] .f1row{min-height:30px;border-top:1px solid #172334;font-size:9px}
      [data-duel-sector-tables="1"] .f1row>b{color:#94a4b9}
      [data-duel-sector-tables="1"] .f1row.bestlap{background:rgba(72,220,180,.035)}
      [data-duel-sector-tables="1"] .f1row .sector,[data-duel-sector-tables="1"] .f1row strong{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#e8edf4}
      [data-duel-sector-tables="1"] .f1row strong{font-size:10px;color:#fff}
      [data-duel-sector-tables="1"] .f1row .sector.green{color:#42ee9b}
      [data-duel-sector-tables="1"] .f1row .sector.purple{color:#d363ff}
      [data-duel-sector-tables="1"] .f1row i{text-align:right;font-size:6px;font-style:normal;font-weight:900;color:#62dcb6}
      [data-duel-sector-tables="1"] .f1legend{display:none}
      @media (max-width:900px){.duel-tables{grid-template-columns:1fr}}
      @media (orientation:landscape) and (max-height:520px){
        .duel-c{padding:10px 14px!important;max-height:calc(100dvh - 10px)!important}
        .duel-t{font-size:20px!important;margin-bottom:7px!important}.duel-g{gap:6px!important}.duel-s{padding:7px!important}.duel-s b{font-size:14px!important}
        .duel-tables{margin-top:7px;gap:9px}.duel-sector-title{margin:2px 0 4px}
        [data-duel-sector-tables="1"] .f1head,[data-duel-sector-tables="1"] .f1row{min-height:26px;padding:0 6px}
        .duel-a{margin-top:8px!important}
      }
    `;

    root.appendChild(style);
    card.insertBefore(section,actions);
    card.scrollTop=0;
  }
}
