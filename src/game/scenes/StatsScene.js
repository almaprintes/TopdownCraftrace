import Phaser from 'phaser';
import { getLanguage } from '../i18n/index.js';
import { unlockedCarIds } from '../cars/carUnlocks.js';

const fmtLap=(ms)=>{
  ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'—';
  const m=Math.floor(ms/60000),s=(ms-m*60000)/1000;
  return`${m}:${s.toFixed(3).padStart(6,'0')}`;
};

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
  return{laps,best,tracks,cars:unlockedCarIds().length};
}

export class StatsScene extends Phaser.Scene{
  constructor(){super('StatsScene');}
  create(){
    const host=this.game?.canvas?.parentElement||document.getElementById('app')||document.body;
    const lang=getLanguage()==='en'?'en':'es';
    const s=collectLocalStats();
    const root=document.createElement('div');
    root.className='tdr-stats';
    root.innerHTML=`
      <style>
        .tdr-stats{position:absolute;inset:0;z-index:12000;box-sizing:border-box;overflow:hidden;color:#fff;background:radial-gradient(circle at 50% 0%,rgba(30,70,95,.28),transparent 38%),linear-gradient(180deg,#07131f,#04101a 58%,#020a11);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:clamp(10px,2.2vh,20px) clamp(12px,2.4vw,28px);display:grid;grid-template-rows:auto minmax(0,1fr)}
        .tdr-stats *{box-sizing:border-box}
        .tdr-stats__head{display:flex;align-items:center;gap:clamp(12px,2vw,24px);min-height:clamp(52px,10vh,78px);border-bottom:1px solid rgba(70,221,255,.28)}
        .tdr-stats__back{min-width:clamp(92px,12vw,150px);height:clamp(38px,7vh,52px);border:1px solid #4e6d82;background:#0b1d2b;color:#fff;font-weight:900;letter-spacing:.08em;cursor:pointer}
        .tdr-stats__title{margin:0;font-size:clamp(24px,4.2vw,44px);line-height:1;font-weight:950;letter-spacing:.02em}
        .tdr-stats__body{min-height:0;overflow:auto;padding-top:clamp(12px,2.4vh,24px)}
        .tdr-stats__hero{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,2fr);gap:clamp(12px,2vw,24px);min-height:100%}
        .tdr-stats__panel{min-width:0;border:1px solid rgba(70,221,255,.28);background:linear-gradient(145deg,rgba(9,29,42,.94),rgba(4,14,22,.96));padding:clamp(14px,2vw,24px);clip-path:polygon(12px 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%,0 12px)}
        .tdr-stats__kicker{font-size:clamp(9px,1vw,13px);font-weight:900;letter-spacing:.16em;color:#66e8ff;margin-bottom:8px}
        .tdr-stats__big{font-size:clamp(28px,5vw,60px);font-weight:950;line-height:.95;color:#fff;margin:0 0 8px}
        .tdr-stats__sub{font-size:clamp(10px,1.15vw,15px);color:#91a7b8;line-height:1.35;margin:0}
        .tdr-stats__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:clamp(10px,1.5vw,18px)}
        .tdr-stat{min-width:0;border:1px solid rgba(255,255,255,.08);background:#081722;padding:clamp(14px,2vw,22px);display:flex;flex-direction:column;justify-content:center;min-height:clamp(100px,19vh,150px)}
        .tdr-stat small{font-size:clamp(8px,.95vw,12px);font-weight:900;letter-spacing:.14em;color:#8297a8}
        .tdr-stat strong{margin-top:6px;font-size:clamp(24px,4.2vw,48px);line-height:1;font-weight:950;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .tdr-stat--gold strong{color:#f4c554}.tdr-stat--green strong{color:#63f3a5}.tdr-stat--cyan strong{color:#6feaff}
        @media(max-height:430px){.tdr-stats{padding-top:8px;padding-bottom:8px}.tdr-stats__head{min-height:48px}.tdr-stats__hero{grid-template-columns:minmax(180px,.8fr) minmax(0,2.2fr);gap:10px}.tdr-stats__panel{padding:12px}.tdr-stats__grid{gap:8px}.tdr-stat{min-height:82px;padding:10px}.tdr-stats__big{font-size:clamp(24px,4vw,40px)}}
        @media(max-width:760px){.tdr-stats__hero{grid-template-columns:1fr}.tdr-stats__grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      </style>
      <header class="tdr-stats__head"><button class="tdr-stats__back" type="button">← ${lang==='en'?'BACK':'VOLVER'}</button><h1 class="tdr-stats__title">${lang==='en'?'STATISTICS':'ESTADÍSTICAS'}</h1></header>
      <main class="tdr-stats__body">
        <section class="tdr-stats__hero">
          <article class="tdr-stats__panel"><div class="tdr-stats__kicker">${lang==='en'?'DRIVER PROFILE':'PERFIL DEL PILOTO'}</div><h2 class="tdr-stats__big">${lang==='en'?'YOUR GARAGE':'TU GARAJE'}</h2><p class="tdr-stats__sub">${lang==='en'?'This is the first statistics dashboard. We will extend it with records, driving style, race modes and progression.':'Este es el primer tablero de estadísticas. Lo ampliaremos con récords, estilo de conducción, modos de carrera y progresión.'}</p></article>
          <section class="tdr-stats__grid">
            <article class="tdr-stat tdr-stat--cyan"><small>${lang==='en'?'TIMED LAPS':'VUELTAS CRONOMETRADAS'}</small><strong>${s.laps}</strong></article>
            <article class="tdr-stat tdr-stat--gold"><small>${lang==='en'?'BEST LAP':'MEJOR VUELTA'}</small><strong>${fmtLap(s.best)}</strong></article>
            <article class="tdr-stat tdr-stat--green"><small>${lang==='en'?'TRACKS RACED':'CIRCUITOS CORRIDOS'}</small><strong>${s.tracks}</strong></article>
            <article class="tdr-stat"><small>${lang==='en'?'CARS UNLOCKED':'COCHES DESBLOQUEADOS'}</small><strong>${s.cars}</strong></article>
          </section>
        </section>
      </main>`;
    host.appendChild(root);this._root=root;
    root.querySelector('.tdr-stats__back')?.addEventListener('click',()=>this.scene.start('menu'));
    this.events.once('shutdown',()=>{try{root.remove();}catch{}this._root=null;});
  }
}
