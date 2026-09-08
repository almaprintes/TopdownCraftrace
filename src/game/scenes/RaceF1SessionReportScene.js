import { RaceScene as CurrentRaceScene } from './RacePenaltyReportFixScene.js';

function num(v){const n=Number(v);return Number.isFinite(n)?n:null;}
function fmtSector(ms){
  if(!Number.isFinite(ms)||ms<=0)return '—';
  const s=Math.floor(ms/1000),x=Math.floor(ms%1000);
  return `${s}.${String(x).padStart(3,'0')}`;
}
function fmtLap(ms){
  if(!Number.isFinite(ms)||ms<=0)return '—';
  const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),x=Math.floor(ms%1000);
  return `${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;
}
function sectorsFromRecord(rec){
  const split1=num(rec?.s1),split2=num(rec?.s2);
  const raw=num(rec?.rawLapMs)??num(rec?.lapMs)??num(rec?.ms)??num(rec?.time);
  if(split1==null||split2==null||raw==null||split1<=0||split2<=split1||raw<=split2)return [null,null,null];

  // The timing system stores S1 and S2 as cumulative split timestamps:
  // S1 = start -> sector 1 gate, S2 = start -> sector 2 gate.
  // Convert those splits to real sector durations before rendering.
  const s1=split1;
  const s2=split2-split1;
  const s3=raw-split2;
  if(![s1,s2,s3].every(v=>Number.isFinite(v)&&v>0))return [null,null,null];
  return [s1,s2,s3];
}
function bestBySector(records){
  const best=[Infinity,Infinity,Infinity];
  for(const rec of records||[]){
    const sectors=Array.isArray(rec?.sectors)?rec.sectors:sectorsFromRecord(rec);
    sectors.forEach((v,i)=>{if(Number.isFinite(v)&&v>0&&v<best[i])best[i]=v;});
  }
  return best.map(v=>Number.isFinite(v)?v:null);
}
function sameTime(a,b){return Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<0.5;}

export class RaceScene extends CurrentRaceScene {
  _sessionLaps(){
    const laps=super._sessionLaps?.()||[];
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    const base=Math.max(0,Number(this._sessionLapBaseline)||0);
    return laps.map((lap,i)=>{
      const rec=history[base+i]||{};
      return {...lap,sectors:sectorsFromRecord({...rec,rawLapMs:lap.rawLapMs??rec.rawLapMs,lapMs:lap.lapMs??rec.lapMs})};
    });
  }

  _sectorBenchmarks(laps){
    const history=Array.isArray(this.ttHistory)?this.ttHistory:[];
    return {session:bestBySector(laps),record:bestBySector(history)};
  }

  _f1LapTable(r){
    const laps=Array.isArray(r?.laps)?r.laps:[];
    if(!laps.length)return '<div class="empty">Aún no hay vueltas completas en esta sesión.</div>';
    const {session,record}=this._sectorBenchmarks(laps);
    const sectorCell=(v,i)=>{
      const cls=sameTime(v,record[i])?'purple':sameTime(v,session[i])?'green':'';
      return `<span class="sector ${cls}">${fmtSector(v)}</span>`;
    };
    return `<div class="f1laps">
      <div class="f1head"><b>VUELTA</b><b>S1</b><b>S2</b><b>S3</b><b>TOTAL</b><b></b></div>
      ${laps.map(l=>{
        const sectors=Array.isArray(l.sectors)?l.sectors:[null,null,null];
        const best=r.bestMs===l.lapMs;
        const penalty=Math.max(0,Number(l.penaltyMs)||0);
        const note=[best?'MEJOR':'',penalty?`+${(penalty/1000).toFixed(3)} s`:''].filter(Boolean).join(' · ');
        return `<div class="f1row${best?' bestlap':''}"><b>V${l.n}</b>${sectorCell(sectors[0],0)}${sectorCell(sectors[1],1)}${sectorCell(sectors[2],2)}<strong>${fmtLap(l.lapMs)}</strong><i class="${penalty?'penalty':''}">${note}</i></div>`;
      }).join('')}
    </div><div class="f1legend"><span><u class="green"></u> MEJOR DE LA SESIÓN</span><span><u class="purple"></u> RÉCORD DE SECTOR</span></div>`;
  }

  _reportInnerHtml(r){
    const html=super._reportInnerHtml?.(r)||'';
    const replacement=`<h3>Vueltas · Sectores</h3>${this._f1LapTable(r)}`;
    const start=html.indexOf('<h3>Vueltas</h3>');
    const end=start>=0?html.indexOf('<div class="insight">',start):-1;
    if(start>=0&&end>start)return `${html.slice(0,start)}${replacement}${html.slice(end)}`;
    return html.replace(/<h3>Vueltas<\/h3>\s*<div class="laps">[\s\S]*?<\/div>\s*(?=<div class="insight">)/,replacement);
  }

  _reportCss(){
    return `${super._reportCss?.()||''}
      .f1laps{border:1px solid #1e2b3d;border-radius:12px;overflow:hidden;background:#0b1320;font-variant-numeric:tabular-nums}
      .f1head,.f1row{display:grid;grid-template-columns:54px repeat(3,minmax(58px,.8fr)) minmax(92px,1.15fr) minmax(80px,.9fr);align-items:center;column-gap:5px;padding:0 10px}
      .f1head{height:29px;background:#121e2d;color:#79899f;font-size:8px;letter-spacing:.08em}.f1head b:not(:first-child){text-align:right}
      .f1row{min-height:38px;border-top:1px solid #172334;font-size:11px}.f1row>b{color:#94a4b9}.f1row.bestlap{background:rgba(72,220,180,.035)}
      .f1row .sector,.f1row strong{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;color:#e8edf4}.f1row strong{font-size:12px;color:#fff}
      .f1row .sector.green{color:#42ee9b}.f1row .sector.purple{color:#d363ff;text-shadow:0 0 10px rgba(211,99,255,.22)}
      .f1row i{text-align:right;font-size:7px;font-style:normal;font-weight:900;color:#62dcb6}.f1row i.penalty{color:#ff8f74}
      .f1legend{display:flex;gap:15px;justify-content:flex-end;flex-wrap:wrap;padding:7px 2px 0;color:#7f8da2;font-size:7px;font-weight:850;letter-spacing:.04em}.f1legend span{display:flex;align-items:center;gap:5px}.f1legend u{width:8px;height:8px;border-radius:2px;text-decoration:none}.f1legend u.green{background:#42ee9b}.f1legend u.purple{background:#d363ff}
      @media(max-width:560px){.f1head,.f1row{grid-template-columns:42px repeat(3,minmax(48px,.7fr)) minmax(82px,1fr) 72px;padding:0 7px;column-gap:3px}.f1row{font-size:10px}.f1row strong{font-size:11px}}
    `;
  }
}
