import Phaser from 'phaser';
import { getLanguage } from '../i18n/index.js';
import { unlockedCarIds } from '../cars/carUnlocks.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { loadPlayerStats } from '../stats/playerStats.js';
import { masteryInfoForMeters, masteryWheelDataUri } from '../stats/carMastery.js';

const BASE=import.meta.env.BASE_URL||'/';
const fmtLap=(ms)=>{ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'—';const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};
const fmtKm=(meters,lang)=>{const km=Math.max(0,Number(meters)||0)/1000;return km.toLocaleString(lang==='en'?'en-US':'es-ES',{minimumFractionDigits:km<10?2:1,maximumFractionDigits:km<10?2:1});};
const esc=value=>String(value??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
const trackName=id=>TRACK_REGISTRY?.[id]?.name||String(id||'').replace(/^track/i,'Circuito ');

function bestForCar(car){
  let best=null,bestTrack=null;
  for(const [trackId,row] of Object.entries(car?.tracks||{})){
    const ms=Number(row?.bestLapMs);
    if(Number.isFinite(ms)&&ms>0&&(best==null||ms<best)){best=ms;bestTrack=trackId;}
  }
  return{best,bestTrack};
}

export class StatsScene extends Phaser.Scene{
  constructor(){super('StatsScene');this._root=null;this._selectedCar=null;}

  create(){
    const host=this.game?.canvas?.parentElement||document.getElementById('app')||document.body;
    const root=document.createElement('div');root.className='tdr-stats-hub';host.appendChild(root);this._root=root;
    this._renderCars();
    this.events.once('shutdown',()=>{try{root.remove();}catch{}this._root=null;});
  }

  _data(){
    const stats=loadPlayerStats();
    const ids=unlockedCarIds().filter(id=>CAR_SPECS?.[id]);
    return ids.map(id=>{
      const spec=CAR_SPECS[id]||{};
      const car=stats.cars?.[id]||{meters:0,races:0,laps:0,tracks:{}};
      const mastery=masteryInfoForMeters(car.meters||0);
      return{id,spec,car,mastery,...bestForCar(car)};
    });
  }

  _shell(title,backLabel){
    const lang=getLanguage()==='en'?'en':'es';
    return `<style>
      .tdr-stats-hub{position:absolute;inset:0;z-index:12000;background:radial-gradient(circle at 50% 0%,rgba(36,86,115,.25),transparent 40%),linear-gradient(180deg,#07131f,#020a11);color:#fff;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box;padding:max(8px,var(--tdr-safe-top,8px)) max(10px,var(--tdr-safe-right,10px)) max(8px,var(--tdr-safe-bottom,8px)) max(10px,var(--tdr-safe-left,10px));display:grid;grid-template-rows:auto minmax(0,1fr);overflow:hidden}.tdr-stats-hub *{box-sizing:border-box}
      .sh-head{display:flex;align-items:center;gap:clamp(12px,2vw,24px);min-height:clamp(48px,9vh,72px);border-bottom:1px solid rgba(70,221,255,.28);padding:0 clamp(6px,1vw,14px)}.sh-back{min-width:clamp(92px,12vw,155px);height:clamp(36px,6.5vh,50px);border:1px solid #4e6d82;background:#0b1d2b;color:#fff;font-weight:900;letter-spacing:.08em;cursor:pointer}.sh-title{margin:0;font-size:clamp(22px,3.5vw,42px);line-height:1;font-weight:950;letter-spacing:.02em}.sh-body{min-height:0;overflow:auto;padding:clamp(10px,1.8vh,18px) clamp(6px,1vw,14px) 10px}
      .sh-summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;margin-bottom:12px}.sh-sum{border:1px solid rgba(255,255,255,.09);background:#081722;padding:10px 13px;min-height:68px}.sh-sum small{display:block;color:#8297a8;font-size:clamp(7px,.75vw,10px);font-weight:900;letter-spacing:.13em}.sh-sum strong{display:block;margin-top:4px;font-size:clamp(18px,2.3vw,30px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.sh-sum.gold strong{color:#f4c554}.sh-sum.cyan strong{color:#6feaff}.sh-sum.green strong{color:#63f3a5}
      .sh-cars{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(290px,100%),1fr));gap:10px}.sh-car{position:relative;overflow:hidden;border:1px solid rgba(70,221,255,.28);background:linear-gradient(145deg,#0a1f2d,#06131d);min-height:clamp(150px,26vh,220px);padding:12px;cursor:pointer;clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}.sh-car:hover{border-color:#6feaff}.sh-car__top{display:flex;justify-content:space-between;gap:8px}.sh-car__name strong{display:block;font-size:clamp(15px,1.5vw,21px)}.sh-car__name small{display:block;margin-top:2px;color:#8297a8;font-size:9px;letter-spacing:.1em}.sh-car__badge{width:54px;height:54px;flex:0 0 auto}.sh-car__badge img{width:100%;height:100%;object-fit:contain}.sh-car__art{height:clamp(70px,12vh,108px);display:grid;place-items:center;margin:2px 0}.sh-car__art img{max-width:86%;max-height:100%;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45))}.sh-car__stats{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;border-top:1px solid rgba(255,255,255,.08);padding-top:7px}.sh-car__stats small{display:block;color:#7f94a5;font-size:7px;font-weight:900;letter-spacing:.08em}.sh-car__stats strong{display:block;margin-top:2px;font-size:clamp(12px,1.2vw,16px)}
      .sh-detail-hero{display:grid;grid-template-columns:minmax(240px,.75fr) minmax(0,1.6fr);gap:10px;margin-bottom:10px}.sh-detail-card{border:1px solid rgba(70,221,255,.28);background:linear-gradient(145deg,#0a1f2d,#06131d);padding:12px}.sh-detail-title{display:flex;align-items:center;gap:12px}.sh-detail-title img.car{width:clamp(110px,16vw,190px);height:clamp(74px,15vh,125px);object-fit:contain}.sh-detail-title h2{margin:0;font-size:clamp(22px,3vw,38px)}.sh-detail-title p{margin:4px 0 0;color:#8fa5b5;font-size:11px}.sh-detail-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;height:100%}.sh-metric{border:1px solid rgba(255,255,255,.08);background:#081722;padding:10px;display:flex;flex-direction:column;justify-content:center}.sh-metric small{color:#8297a8;font-size:8px;font-weight:900;letter-spacing:.11em}.sh-metric strong{margin-top:4px;font-size:clamp(18px,2vw,28px)}
      .sh-table-wrap{border:1px solid rgba(70,221,255,.25);background:#06131d;padding:10px;overflow:auto}.sh-table{width:100%;border-collapse:collapse;min-width:680px}.sh-table th{text-align:left;color:#7f95a7;font-size:8px;letter-spacing:.12em;padding:9px;border-bottom:1px solid rgba(255,255,255,.12)}.sh-table td{padding:10px 9px;border-bottom:1px solid rgba(255,255,255,.07);font-size:clamp(10px,1vw,14px)}.sh-table td.time{color:#f4c554;font-weight:900}.sh-table td.km{color:#6feaff;font-weight:900}.sh-table td.num{color:#dbe6ed;font-weight:800}.sh-table tr:last-child td{border-bottom:0}.sh-empty{color:#71899b;text-align:center;padding:24px!important}
      @media(max-height:430px){.sh-head{min-height:44px}.sh-body{padding-top:7px}.sh-summary{margin-bottom:8px}.sh-sum{min-height:54px;padding:7px 10px}.sh-car{min-height:145px}.sh-car__art{height:64px}.sh-detail-hero{grid-template-columns:minmax(220px,.7fr) minmax(0,1.7fr)}.sh-detail-title img.car{width:105px;height:70px}.sh-detail-metrics{gap:5px}.sh-metric{padding:7px}}
      @media(max-width:850px){.sh-summary{grid-template-columns:repeat(2,1fr)}.sh-detail-hero{grid-template-columns:1fr}.sh-detail-metrics{grid-template-columns:repeat(2,1fr)}}
    </style><header class="sh-head"><button class="sh-back" type="button">← ${backLabel}</button><h1 class="sh-title">${title}</h1></header><main class="sh-body"></main>`;
  }

  _renderCars(){
    const lang=getLanguage()==='en'?'en':'es';
    const rows=this._data();
    const totalMeters=rows.reduce((s,r)=>s+(Number(r.car.meters)||0),0);
    const totalLaps=rows.reduce((s,r)=>s+(Number(r.car.laps)||0),0);
    const totalRaces=rows.reduce((s,r)=>s+(Number(r.car.races)||0),0);
    let fastest=null;for(const r of rows)if(r.best&&(!fastest||r.best<fastest.best))fastest=r;
    this._root.innerHTML=this._shell(lang==='en'?'STATISTICS':'ESTADÍSTICAS',lang==='en'?'BACK':'VOLVER');
    const body=this._root.querySelector('.sh-body');
    body.innerHTML=`<section class="sh-summary"><article class="sh-sum cyan"><small>${lang==='en'?'TOTAL DISTANCE':'DISTANCIA TOTAL'}</small><strong>${fmtKm(totalMeters,lang)} KM</strong></article><article class="sh-sum"><small>${lang==='en'?'TIMED LAPS':'VUELTAS'}</small><strong>${totalLaps}</strong></article><article class="sh-sum green"><small>${lang==='en'?'RACES':'CARRERAS'}</small><strong>${totalRaces}</strong></article><article class="sh-sum gold"><small>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</small><strong>${fastest?fmtLap(fastest.best):'—'}</strong></article></section><section class="sh-cars">${rows.map(r=>`<article class="sh-car" data-car="${esc(r.id)}"><div class="sh-car__top"><div class="sh-car__name"><strong>${esc(r.spec.name||r.id)}</strong><small>${esc(r.spec.brand||'')} · ${esc(r.spec.category||'')}</small></div><div class="sh-car__badge"><img src="${masteryWheelDataUri(r.mastery.level,{size:128,blackBackground:true})}" alt=""></div></div><div class="sh-car__art"><img src="${BASE}assets/skins/${encodeURIComponent(r.spec.skin||'')}" alt=""></div><div class="sh-car__stats"><div><small>${lang==='en'?'DISTANCE':'DISTANCIA'}</small><strong>${fmtKm(r.car.meters,lang)} KM</strong></div><div><small>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</small><strong>${fmtLap(r.best)}</strong></div><div><small>${lang==='en'?'MASTERY':'MAESTRÍA'}</small><strong>${r.mastery.level}/9</strong></div></div></article>`).join('')}</section>`;
    this._root.querySelector('.sh-back')?.addEventListener('click',()=>this.scene.start('menu'));
    this._root.querySelectorAll('[data-car]').forEach(el=>el.addEventListener('click',()=>this._renderCarDetail(el.dataset.car)));
  }

  _renderCarDetail(carId){
    const lang=getLanguage()==='en'?'en':'es';
    const row=this._data().find(r=>r.id===carId);if(!row){this._renderCars();return;}
    this._selectedCar=carId;
    const tracks=Object.entries(TRACK_REGISTRY||{}).map(([id,track])=>({id,track,stats:row.car.tracks?.[id]||{meters:0,races:0,laps:0,bestLapMs:null,lastLapMs:null}}));
    const drivenTracks=tracks.filter(r=>(Number(r.stats.meters)||0)>0||(Number(r.stats.laps)||0)>0||(Number(r.stats.races)||0)>0);
    this._root.innerHTML=this._shell(esc(row.spec.name||carId),lang==='en'?'CARS':'COCHES');
    const body=this._root.querySelector('.sh-body');
    body.innerHTML=`<section class="sh-detail-hero"><article class="sh-detail-card"><div class="sh-detail-title"><img class="car" src="${BASE}assets/skins/${encodeURIComponent(row.spec.skin||'')}" alt=""><div><h2>${esc(row.spec.name||carId)}</h2><p>${esc(row.spec.brand||'')} · ${esc(row.spec.category||'')}</p></div></div></article><section class="sh-detail-metrics"><article class="sh-metric"><small>${lang==='en'?'DISTANCE':'DISTANCIA'}</small><strong>${fmtKm(row.car.meters,lang)} KM</strong></article><article class="sh-metric"><small>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</small><strong>${fmtLap(row.best)}</strong></article><article class="sh-metric"><small>${lang==='en'?'LAPS':'VUELTAS'}</small><strong>${Number(row.car.laps)||0}</strong></article><article class="sh-metric"><small>${lang==='en'?'MASTERY':'MAESTRÍA'}</small><strong>${row.mastery.level}/9</strong></article></section></section><section class="sh-table-wrap"><table class="sh-table"><thead><tr><th>${lang==='en'?'TRACK':'CIRCUITO'}</th><th>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</th><th>${lang==='en'?'DISTANCE':'DISTANCIA'}</th><th>${lang==='en'?'LAPS':'VUELTAS'}</th><th>${lang==='en'?'RACES':'CARRERAS'}</th></tr></thead><tbody>${drivenTracks.length?drivenTracks.map(r=>`<tr><td>${esc(r.track?.name||trackName(r.id))}</td><td class="time">${fmtLap(r.stats.bestLapMs)}</td><td class="km">${fmtKm(r.stats.meters,lang)} KM</td><td class="num">${Number(r.stats.laps)||0}</td><td class="num">${Number(r.stats.races)||0}</td></tr>`).join(''):`<tr><td class="sh-empty" colspan="5">${lang==='en'?'No circuit statistics yet':'Todavía no hay estadísticas por circuito'}</td></tr>`}</tbody></table></section>`;
    this._root.querySelector('.sh-back')?.addEventListener('click',()=>this._renderCars());
  }
}
