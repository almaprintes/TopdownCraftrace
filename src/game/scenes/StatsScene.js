import Phaser from 'phaser';
import { getLanguage } from '../i18n/index.js';
import { unlockedCarIds } from '../cars/carUnlocks.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { loadPlayerStats } from '../stats/playerStats.js';

const fmtLap=(ms)=>{
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'—';
  const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;
  return`${m}:${s.toFixed(3).padStart(6,'0')}`;
};
const fmtKm=(meters,lang)=>{
  const km=Math.max(0,Number(meters)||0)/1000;
  return km.toLocaleString(lang==='en'?'en-US':'es-ES',{minimumFractionDigits:km<10?2:1,maximumFractionDigits:km<10?2:1});
};
const esc=value=>String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));

function collectLocalStats(){
  let laps=0,best=null,tracks=0;
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i)||'';
      if(!key.startsWith('tdr2:ttHist:'))continue;
      const history=JSON.parse(localStorage.getItem(key)||'null')?.history;
      if(!Array.isArray(history)||!history.length)continue;
      tracks++;
      laps+=history.length;
      for(const row of history){
        const ms=Number(row?.lapMs);
        if(Number.isFinite(ms)&&ms>0&&(best==null||ms<best))best=ms;
      }
    }
  }catch{}
  const persistent=loadPlayerStats();
  return{laps,best,tracks,cars:unlockedCarIds().length,persistent};
}

export class StatsScene extends Phaser.Scene{
  constructor(){super('StatsScene');}
  create(){
    const host=this.game?.canvas?.parentElement||document.getElementById('app')||document.body;
    const lang=getLanguage()==='en'?'en':'es';
    const s=collectLocalStats();
    const unlocked=unlockedCarIds();
    const known=new Set([...unlocked,...Object.keys(s.persistent.cars||{})]);
    const mileageRows=[...known].map(id=>({id,spec:CAR_SPECS?.[id]||{},meters:Number(s.persistent.cars?.[id]?.meters)||0,races:Number(s.persistent.cars?.[id]?.races)||0})).sort((a,b)=>b.meters-a.meters);
    const totalMeters=Number(s.persistent.totalMeters)||mileageRows.reduce((sum,row)=>sum+row.meters,0);
    const root=document.createElement('div');
    root.className='tdr-stats';
    root.innerHTML=`
      <style>
        .tdr-stats{position:absolute;inset:0;z-index:12000;box-sizing:border-box;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 0%,rgba(30,70,95,.28),transparent 38%),linear-gradient(180deg,#07131f,#04101a 58%,#020a11);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:clamp(8px,1.8vh,18px) clamp(10px,2vw,26px);display:grid;grid-template-rows:auto minmax(0,1fr)}
        .tdr-stats *{box-sizing:border-box}.tdr-stats__head{display:flex;align-items:center;gap:clamp(12px,2vw,24px);min-height:clamp(48px,9vh,72px);border-bottom:1px solid rgba(70,221,255,.28)}
        .tdr-stats__back{min-width:clamp(88px,11vw,145px);height:clamp(36px,6.5vh,50px);border:1px solid #4e6d82;background:#0b1d2b;color:#fff;font-weight:900;letter-spacing:.08em;cursor:pointer}.tdr-stats__title{margin:0;font-size:clamp(22px,3.6vw,42px);line-height:1;font-weight:950;letter-spacing:.02em}
        .tdr-stats__body{min-height:0;overflow:auto;padding-top:clamp(10px,2vh,20px);padding-bottom:8px}.tdr-stats__hero{display:grid;grid-template-columns:minmax(0,1.1fr) minmax(0,2fr);gap:clamp(10px,1.6vw,20px)}
        .tdr-stats__panel{min-width:0;border:1px solid rgba(70,221,255,.28);background:linear-gradient(145deg,rgba(9,29,42,.94),rgba(4,14,22,.96));padding:clamp(12px,1.7vw,22px);clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
        .tdr-stats__kicker{font-size:clamp(8px,.9vw,12px);font-weight:900;letter-spacing:.16em;color:#66e8ff;margin-bottom:7px}.tdr-stats__big{font-size:clamp(25px,4.3vw,54px);font-weight:950;line-height:.95;color:#fff;margin:0 0 8px}.tdr-stats__sub{font-size:clamp(9px,1vw,14px);color:#91a7b8;line-height:1.35;margin:0}
        .tdr-stats__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(8px,1.2vw,14px)}.tdr-stat{min-width:0;border:1px solid rgba(255,255,255,.08);background:#081722;padding:clamp(11px,1.6vw,18px);display:flex;flex-direction:column;justify-content:center;min-height:clamp(82px,15vh,126px)}.tdr-stat small{font-size:clamp(7px,.85vw,11px);font-weight:900;letter-spacing:.14em;color:#8297a8}.tdr-stat strong{margin-top:5px;font-size:clamp(21px,3.5vw,42px);line-height:1;font-weight:950;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdr-stat--gold strong{color:#f4c554}.tdr-stat--green strong{color:#63f3a5}.tdr-stat--cyan strong{color:#6feaff}
        .tdr-mileage{margin-top:clamp(10px,1.8vh,18px)}.tdr-mileage__head{display:flex;align-items:end;justify-content:space-between;gap:16px;margin-bottom:8px}.tdr-mileage__head h2{margin:0;font-size:clamp(16px,2vw,25px);letter-spacing:.04em}.tdr-mileage__head span{color:#f4c554;font-size:clamp(13px,1.5vw,20px);font-weight:950;white-space:nowrap}.tdr-mileage__list{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(270px,100%),1fr));gap:8px}.tdr-car-km{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px;padding:10px 12px;border:1px solid rgba(255,255,255,.08);background:linear-gradient(135deg,#081722,#0b1e2b)}.tdr-car-km__name{min-width:0}.tdr-car-km__name strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:clamp(12px,1.25vw,17px)}.tdr-car-km__name small{display:block;margin-top:2px;color:#7f94a5;font-size:clamp(7px,.75vw,10px);letter-spacing:.08em}.tdr-car-km__value{text-align:right}.tdr-car-km__value strong{display:block;color:#6feaff;font-size:clamp(17px,1.9vw,25px);line-height:1}.tdr-car-km__value small{display:block;margin-top:2px;color:#91a7b8;font-size:8px}.tdr-mileage__future{margin-top:9px;color:#7f94a5;font-size:clamp(8px,.8vw,11px);line-height:1.3}
        @media(max-height:430px){.tdr-stats{padding-top:6px;padding-bottom:6px}.tdr-stats__head{min-height:44px}.tdr-stats__hero{grid-template-columns:minmax(180px,.8fr) minmax(0,2.2fr);gap:8px}.tdr-stats__panel{padding:10px}.tdr-stats__grid{gap:6px}.tdr-stat{min-height:70px;padding:8px}.tdr-stats__big{font-size:clamp(22px,3.7vw,36px)}.tdr-mileage{margin-top:8px}.tdr-car-km{padding:7px 10px}}
        @media(max-width:760px){.tdr-stats__hero{grid-template-columns:1fr}.tdr-stats__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      </style>
      <header class="tdr-stats__head"><button class="tdr-stats__back" type="button">← ${lang==='en'?'BACK':'VOLVER'}</button><h1 class="tdr-stats__title">${lang==='en'?'STATISTICS':'ESTADÍSTICAS'}</h1></header>
      <main class="tdr-stats__body">
        <section class="tdr-stats__hero">
          <article class="tdr-stats__panel"><div class="tdr-stats__kicker">${lang==='en'?'DRIVER PROFILE':'PERFIL DEL PILOTO'}</div><h2 class="tdr-stats__big">${fmtKm(totalMeters,lang)} KM</h2><p class="tdr-stats__sub">${lang==='en'?'Total distance driven. Mileage is recorded separately for every car and can later power car-specific achievements.':'Distancia total recorrida. El kilometraje se registra por separado para cada coche y servirá más adelante para logros específicos.'}</p></article>
          <section class="tdr-stats__grid">
            <article class="tdr-stat tdr-stat--cyan"><small>${lang==='en'?'TIMED LAPS':'VUELTAS CRONOMETRADAS'}</small><strong>${s.laps}</strong></article>
            <article class="tdr-stat tdr-stat--gold"><small>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</small><strong>${fmtLap(s.best)}</strong></article>
            <article class="tdr-stat tdr-stat--green"><small>${lang==='en'?'TRACKS RACED':'CIRCUITOS CORRIDOS'}</small><strong>${s.tracks}</strong></article>
            <article class="tdr-stat"><small>${lang==='en'?'CARS UNLOCKED':'COCHES DESBLOQUEADOS'}</small><strong>${s.cars}</strong></article>
          </section>
        </section>
        <section class="tdr-stats__panel tdr-mileage">
          <div class="tdr-mileage__head"><h2>${lang==='en'?'MILEAGE BY CAR':'KILOMETRAJE POR COCHE'}</h2><span>${fmtKm(totalMeters,lang)} KM</span></div>
          <div class="tdr-mileage__list">${mileageRows.map(row=>`<article class="tdr-car-km"><div class="tdr-car-km__name"><strong>${esc(row.spec?.name||row.id)}</strong><small>${esc(row.spec?.brand||String(row.id).split('_')[0].toUpperCase())}${row.races?` · ${row.races} ${lang==='en'?'RACES':'CARRERAS'}`:''}</small></div><div class="tdr-car-km__value"><strong>${fmtKm(row.meters,lang)}</strong><small>KM</small></div></article>`).join('')}</div>
          <p class="tdr-mileage__future">${lang==='en'?'Designed for future milestones such as 100 km, 500 km or 1,000 km with a specific car.':'Preparado para futuros hitos como 100 km, 500 km o 1.000 km con un coche concreto.'}</p>
        </section>
      </main>`;
    host.appendChild(root);this._root=root;
    root.querySelector('.tdr-stats__back')?.addEventListener('click',()=>this.scene.start('menu'));
    this.events.once('shutdown',()=>{try{root.remove();}catch{}this._root=null;});
  }
}
