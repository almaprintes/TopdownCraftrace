import { RaceScene as CurrentRaceScene } from './RaceDuelStandaloneScene.js';

function checkpointFractions(scene){
  const raw=scene?.track?.checkpointFractions||scene?.track?.meta?.checkpointFractions;
  const values=(Array.isArray(raw)?raw:[])
    .map(Number).filter(v=>Number.isFinite(v)&&v>0&&v<1).sort((a,b)=>a-b);
  const f1=values[0]??(1/3),f2=values[1]??(2/3);
  return [Math.min(f1,f2),Math.max(f1,f2)];
}
function csvSector(ms){return Number.isFinite(Number(ms))?(Number(ms)/1000).toFixed(3):'';}
function csvLap(ms){
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'';
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),x=Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
}
function safeName(value){return String(value||'circuito').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'').toLowerCase()||'circuito';}

export class RaceScene extends CurrentRaceScene {
  create(data={}){
    this._duelCpuSectorRows=[];
    this._duelCpuSectorTiming={lapStart:null,cp1At:null,cp2At:null};
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
        const start=Number(timing.lapStart),cp1=Number(timing.cp1At),cp2=Number(timing.cp2At);
        let sectors=[null,null,null];
        if(Number.isFinite(lapMs)&&Number.isFinite(start)&&Number.isFinite(cp1)&&Number.isFinite(cp2)&&cp1>start&&cp2>cp1){
          const s1=cp1-start,s2=cp2-cp1,s3=lapMs-(cp2-start);
          if([s1,s2,s3].every(v=>Number.isFinite(v)&&v>0))sectors=[s1,s2,s3];
        }
        if(Number.isFinite(lapMs)&&lapMs>1000)this._duelCpuSectorRows.push({n:Number(state.laps),lapMs,sectors});
        timing.lapStart=Number(state.lastLapAt)||performance.now();
        timing.cp1At=null;timing.cp2At=null;
      }
    }
    return result;
  }

  update(time,delta){
    const result=super.update?.(time,delta);
    if(!this._duelStandalone||!this._raceStarted)return result;
    const state=this._duelCpu,timing=this._duelCpuSectorTiming;
    if(!state?.armed||timing?.lapStart==null)return result;

    // Los sectores de CPU1 se disparan por el progreso real de vuelta desde meta.
    // Así una trazada aprendida puede abrirse/cerrarse sin depender de intersectar
    // exactamente el pequeño segmento gráfico del checkpoint.
    const distance=Number(state.distance||0);
    if(!Number.isFinite(distance)||distance<0)return result;
    const [f1,f2]=checkpointFractions(this),now=performance.now();
    if(timing.cp1At==null&&distance>=f1)timing.cp1At=now;
    if(timing.cp1At!=null&&timing.cp2At==null&&distance>=f2)timing.cp2At=now;
    return result;
  }

  async _exportDuelCsv(playerLaps=[],cpuLaps=[]){
    const count=Math.max(playerLaps.length,cpuLaps.length);
    const rows=[
      ['Vuelta','Tu_S1','Tu_S2','Tu_S3','Tu_Total','CPU1_S1','CPU1_S2','CPU1_S3','CPU1_Total'].join(';')
    ];
    for(let i=0;i<count;i++){
      const p=playerLaps[i]||{},c=cpuLaps[i]||{};
      const ps=Array.isArray(p.sectors)?p.sectors:[null,null,null];
      const cs=Array.isArray(c.sectors)?c.sectors:[null,null,null];
      rows.push([
        i+1,csvSector(ps[0]),csvSector(ps[1]),csvSector(ps[2]),csvLap(p.lapMs),
        csvSector(cs[0]),csvSector(cs[1]),csvSector(cs[2]),csvLap(c.lapMs)
      ].join(';'));
    }
    const track=this.track?.meta?.name||this.track?.name||this.trackKey||'Circuito';
    const meta=[`Circuito;${String(track).replace(/;/g,',')}`,`Vueltas objetivo;${Number(this._duelLapTarget||count)}`,''].join('\n');
    const csv='\uFEFF'+meta+rows.join('\n');
    const filename=`duelo-${safeName(track)}-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});

    try{
      const file=new File([blob],filename,{type:'text/csv'});
      if(navigator?.share&&navigator?.canShare?.({files:[file]})){
        await navigator.share({files:[file],title:'DUELO · Tiempos por sectores'});
        return;
      }
    }catch(err){
      if(err?.name==='AbortError')return;
    }

    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }

  _showStandaloneDuelResult(){
    super._showStandaloneDuelResult?.();

    const root=this._duelResultDom;
    if(!root||typeof document==='undefined')return;
    const card=root.querySelector?.('.duel-c'),actions=root.querySelector?.('.duel-a');
    if(!card||!actions||card.querySelector?.('[data-duel-sector-tables="1"]'))return;

    const playerReport=this._buildReport?.();
    const playerLaps=Array.isArray(playerReport?.laps)?playerReport.laps:[];
    const playerTable=playerReport&&typeof this._f1LapTable==='function'?this._f1LapTable(playerReport):'';
    const cpuLaps=Array.isArray(this._duelCpuSectorRows)?this._duelCpuSectorRows:[];
    const cpuTimes=cpuLaps.map(l=>Number(l.lapMs)).filter(Number.isFinite);
    const cpuReport={laps:cpuLaps,bestMs:cpuTimes.length?Math.min(...cpuTimes):null};
    const cpuTable=cpuLaps.length&&typeof this._f1LapTable==='function'?this._f1LapTable(cpuReport):'<div class="duel-empty">CPU1 no registró vueltas completas.</div>';
    if(!playerTable&&!cpuTable)return;

    const section=document.createElement('section');
    section.dataset.duelSectorTables='1';
    section.innerHTML=`<div class="duel-tables"><div><div class="duel-sector-title">TÚ · VUELTAS Y SECTORES</div>${playerTable}</div><div><div class="duel-sector-title cpu">CPU1 · VUELTAS Y SECTORES</div>${cpuTable}</div></div>`;

    const exportButton=document.createElement('button');
    exportButton.type='button';exportButton.dataset.a='export';exportButton.textContent='EXPORTAR CSV';
    const menuButton=actions.querySelector?.('[data-a="menu"]');
    if(menuButton)actions.insertBefore(exportButton,menuButton);else actions.appendChild(exportButton);
    exportButton.addEventListener('click',()=>{this._exportDuelCsv(playerLaps,cpuLaps);});

    const style=document.createElement('style');
    style.textContent=`
      .duel-c{width:min(97vw,1500px)!important;max-height:94vh!important;overflow-y:auto!important;box-sizing:border-box!important}
      .duel-a{grid-template-columns:repeat(3,1fr)!important}
      .duel-a [data-a="export"]{border-color:#4ea9d8!important;background:#102a3b!important;color:#77d2ff!important}
      .duel-tables{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px}
      .duel-sector-title{margin:4px 0 7px;color:#9eabc0;font-size:9px;font-weight:900;letter-spacing:.11em}.duel-sector-title.cpu{color:#63c5ff}
      .duel-empty{border:1px solid #1e2b3d;border-radius:8px;background:#0b1320;padding:18px;color:#7f8da2;font-size:10px}
      [data-duel-sector-tables="1"] .f1laps{border:1px solid #1e2b3d;border-radius:8px;overflow:hidden;background:#0b1320;font-variant-numeric:tabular-nums}
      [data-duel-sector-tables="1"] .f1head,[data-duel-sector-tables="1"] .f1row{display:grid;grid-template-columns:42px repeat(3,minmax(45px,.8fr)) minmax(74px,1.1fr) minmax(55px,.75fr);align-items:center;column-gap:3px;padding:0 7px}
      [data-duel-sector-tables="1"] .f1head{height:25px;background:#121e2d;color:#79899f;font-size:7px;letter-spacing:.06em}[data-duel-sector-tables="1"] .f1head b:not(:first-child){text-align:right}
      [data-duel-sector-tables="1"] .f1row{min-height:30px;border-top:1px solid #172334;font-size:9px}[data-duel-sector-tables="1"] .f1row>b{color:#94a4b9}[data-duel-sector-tables="1"] .f1row.bestlap{background:rgba(72,220,180,.035)}
      [data-duel-sector-tables="1"] .f1row .sector,[data-duel-sector-tables="1"] .f1row strong{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#e8edf4}[data-duel-sector-tables="1"] .f1row strong{font-size:10px;color:#fff}
      [data-duel-sector-tables="1"] .f1row .sector.green{color:#42ee9b}[data-duel-sector-tables="1"] .f1row .sector.purple{color:#d363ff}[data-duel-sector-tables="1"] .f1row i{text-align:right;font-size:6px;font-style:normal;font-weight:900;color:#62dcb6}[data-duel-sector-tables="1"] .f1legend{display:none}
      @media (max-width:900px){.duel-tables{grid-template-columns:1fr}}
      @media (orientation:landscape) and (max-height:520px){.duel-c{padding:10px 14px!important;max-height:calc(100dvh - 10px)!important}.duel-t{font-size:20px!important;margin-bottom:7px!important}.duel-g{gap:6px!important}.duel-s{padding:7px!important}.duel-s b{font-size:14px!important}.duel-tables{margin-top:7px;gap:9px}.duel-sector-title{margin:2px 0 4px}[data-duel-sector-tables="1"] .f1head,[data-duel-sector-tables="1"] .f1row{min-height:26px;padding:0 6px}.duel-a{margin-top:8px!important}}
    `;

    root.appendChild(style);card.insertBefore(section,actions);card.scrollTop=0;
  }
}
