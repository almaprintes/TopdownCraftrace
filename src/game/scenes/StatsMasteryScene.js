import { StatsScene as CurrentStatsScene } from './StatsScene.js';
import { getLanguage } from '../i18n/index.js';
import { masteryInfoForMeters, masteryMaterialLabel, masteryWheelDataUri } from '../stats/carMastery.js';

const BASE=import.meta.env.BASE_URL||'/';
function fmtKm(n,lang){return Math.max(0,Number(n)||0).toLocaleString(lang==='en'?'en-US':'es-ES',{minimumFractionDigits:1,maximumFractionDigits:1});}
function lobbyCarSrc(carId){return `${BASE}assets/cars/lobby/${encodeURIComponent(String(carId||''))}.webp`;}

export class StatsScene extends CurrentStatsScene{
  _installMasteryStyles(){
    if(this._root?.querySelector('[data-mastery-stats-style]'))return;
    const style=document.createElement('style');style.dataset.masteryStatsStyle='1';style.textContent=`
.sh-car__badge{width:auto!important;height:46px!important;display:flex;align-items:center;gap:8px;padding:5px 9px;border:1px solid rgba(240,184,75,.45);background:rgba(4,12,18,.88);border-radius:4px}.sh-car__badge img{width:36px!important;height:36px!important}.sh-car__badge-copy{display:grid;gap:1px;text-align:left}.sh-car__badge-copy small{font-size:6px;font-weight:1000;letter-spacing:.11em;color:#f0b84b}.sh-car__badge-copy strong{font-size:11px;color:#fff}.sh-mastery-panel{display:grid;grid-template-columns:auto minmax(0,1fr);gap:18px;align-items:center;margin:0 0 10px;padding:14px 18px;border:1px solid rgba(240,184,75,.5);background:linear-gradient(110deg,rgba(48,31,9,.6),#071721 55%)}.sh-mastery-panel__badge{width:86px;height:86px;filter:drop-shadow(0 7px 10px rgba(0,0,0,.55))}.sh-mastery-panel__head{display:flex;justify-content:space-between;gap:12px;align-items:end}.sh-mastery-panel__kicker{font-size:7px;font-weight:1000;letter-spacing:.14em;color:#f0b84b}.sh-mastery-panel h3{margin:3px 0 0;font-size:clamp(18px,2.2vw,28px)}.sh-mastery-panel__level{font-size:clamp(18px,2vw,26px);font-weight:1000;color:#f0c65a;white-space:nowrap}.sh-mastery-panel__desc{margin:7px 0 9px;color:#a9bdca;font-size:10px;line-height:1.35}.sh-mastery-progress{height:9px;border:1px solid rgba(255,255,255,.13);background:#0a1117;overflow:hidden}.sh-mastery-progress>i{display:block;height:100%;background:linear-gradient(90deg,#b87333,#f0b84b,#62ffb2)}.sh-mastery-panel__foot{display:flex;justify-content:space-between;gap:12px;margin-top:6px;color:#8ea4b4;font-size:8px;font-weight:900}.sh-mastery-panel__foot strong{color:#fff}
.sh-car__art{position:relative!important;padding:0!important;overflow:hidden!important;min-height:0!important}.sh-car__art img[data-stats-lobby-art]{position:absolute!important;left:50%!important;top:50%!important;width:calc(100% - 24px)!important;height:calc(100% - 20px)!important;max-width:none!important;max-height:none!important;object-fit:contain!important;object-position:center center!important;transform:translate(-50%,-50%)!important;margin:0!important}.sh-detail-title img.car[data-stats-lobby-art]{width:100%!important;height:118px!important;max-height:118px!important;object-fit:contain!important;object-position:center!important;transform:none!important}
@media(max-height:430px){.sh-mastery-panel{padding:8px 12px;gap:12px}.sh-mastery-panel__badge{width:60px;height:60px}.sh-mastery-panel__desc{margin:4px 0 6px;font-size:8px}.sh-car__art img[data-stats-lobby-art]{width:calc(100% - 18px)!important;height:calc(100% - 14px)!important}.sh-detail-title img.car[data-stats-lobby-art]{height:88px!important}}
`;
    this._root?.appendChild(style);
  }
  _replaceOverviewCarArt(){
    this._root?.querySelectorAll('[data-car]').forEach(card=>{
      const carId=String(card.dataset.car||'');
      const img=card.querySelector('.sh-car__art img');
      if(!carId||!img)return;
      img.src=lobbyCarSrc(carId);img.dataset.statsLobbyArt='1';
    });
  }
  _replaceDetailCarArt(carId){
    const img=this._root?.querySelector('.sh-detail-title img.car');
    if(!img||!carId)return;
    img.src=lobbyCarSrc(carId);img.dataset.statsLobbyArt='1';
  }
  _renderCars(){
    super._renderCars();this._installMasteryStyles();this._replaceOverviewCarArt();
    const rows=this._data();
    this._root?.querySelectorAll('[data-car]').forEach(card=>{
      const row=rows.find(r=>r.id===card.dataset.car),badge=card.querySelector('.sh-car__badge');if(!row||!badge)return;
      const img=badge.querySelector('img');if(img)img.src=masteryWheelDataUri(row.mastery.level,{size:128,blackBackground:true});
      badge.querySelector('.sh-car__badge-copy')?.remove?.();
      const copy=document.createElement('span');copy.className='sh-car__badge-copy';copy.innerHTML=`<small>MAESTRÍA</small><strong>${row.mastery.level?`NIVEL ${row.mastery.level}`:'SIN NIVEL'}</strong>`;badge.appendChild(copy);
    });
  }
  _renderCarDetail(carId){
    super._renderCarDetail(carId);this._installMasteryStyles();this._replaceDetailCarArt(carId);
    const lang=getLanguage()==='en'?'en':'es',row=this._data().find(r=>r.id===carId);if(!row)return;
    const m=masteryInfoForMeters(row.car.meters||0),body=this._root?.querySelector('.sh-body'),table=body?.querySelector('.sh-table-wrap');if(!body||!table)return;
    const panel=document.createElement('section');panel.className='sh-mastery-panel';
    const material=m.level?masteryMaterialLabel(m.material,lang):(lang==='en'?'NOT UNLOCKED':'SIN DESBLOQUEAR');
    const target=m.nextKm==null?(lang==='en'?'MAXIMUM MASTERY':'MAESTRÍA MÁXIMA'):`${fmtKm(m.km,lang)} / ${fmtKm(m.nextKm,lang)} KM`;
    const desc=lang==='en'?'Mastery increases with the distance you drive this car. Each level awards a new badge that represents your experience with it.':'La maestría aumenta con la distancia que conduces este coche. Cada nivel concede una nueva insignia que representa tu experiencia con él.';
    panel.innerHTML=`<img class="sh-mastery-panel__badge" src="${masteryWheelDataUri(m.level,{size:192,blackBackground:true})}" alt=""><div><div class="sh-mastery-panel__head"><div><div class="sh-mastery-panel__kicker">${lang==='en'?'CAR MASTERY':'MAESTRÍA DEL COCHE'}</div><h3>${material} · ${m.spokes||0} ${lang==='en'?'SPOKES':'RADIOS'}</h3></div><div class="sh-mastery-panel__level">${lang==='en'?'LEVEL':'NIVEL'} ${m.level}/9</div></div><p class="sh-mastery-panel__desc">${desc}</p><div class="sh-mastery-progress"><i style="width:${Math.round(m.progress*100)}%"></i></div><div class="sh-mastery-panel__foot"><span>${m.nextKm==null?(lang==='en'?'All badges unlocked':'Todas las insignias desbloqueadas'):(lang==='en'?'NEXT BADGE':'SIGUIENTE INSIGNIA')}</span><strong>${target}</strong></div></div>`;
    table.before(panel);
  }
}
