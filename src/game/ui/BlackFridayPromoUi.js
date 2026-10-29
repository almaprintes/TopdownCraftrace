import {isAdFreePromoActive,isBlackFridayPromoWindow} from '../monetization/adFreeNovember.js';
import {getLanguage} from '../i18n/index.js';
import './black-friday-promo.css';

const SESSION_KEY='tdr2:blackFriday2026:shown';
const labels={
  es:{badge:'BLACK FRIDAY · SIN ANUNCIOS',event:'TOP DOWN RACE · EVENTO ESPECIAL',
    title:'BLACK FRIDAY',subtitle:'¡NOVIEMBRE SIN ANUNCIOS!',
    dates:'1–30 NOVIEMBRE 2026 · HORA CANARIA',coins:'100 monedas GRATIS cada 4 h',
    records:'Publica tus récords gratis',loot:'Duplica cada botín una sola vez',
    ghosts:'Fantasmas sin anuncios',play:'¡A CORRER!',info:'Promoción activa hasta el 30 de noviembre',
    close:'Cerrar oferta'},
  en:{badge:'BLACK FRIDAY · NO ADS',event:'TOP DOWN RACE · SPECIAL EVENT',
    title:'BLACK FRIDAY',subtitle:'NOVEMBER WITHOUT ADS!',
    dates:'NOVEMBER 1–30, 2026 · CANARY TIME',coins:'100 FREE coins every 4 h',
    records:'Publish records for free',loot:'Double each reward once',
    ghosts:'Ghosts without ads',play:'LET\'S RACE!',info:'Promotion active through November 30',
    close:'Close offer'}
};

export function installBlackFridayPromoUi(root){
  if(!root||!isAdFreePromoActive())return;
  const en=getLanguage()==='en';
  const currentLabels=()=>{
  const t={...labels[en?'en':'es']};
  if(!isBlackFridayPromoWindow())Object.assign(t,en?{
    badge:'NO ADS',title:'PLAY WITHOUT ADS',subtitle:'Rewards without videos',
    dates:'ADVERTISING PAUSED',info:'Normal reward limits apply. Ads remain paused pending review.'
  }:{badge:'SIN ANUNCIOS',title:'JUEGA SIN ANUNCIOS',subtitle:'Premios sin vídeos',
    dates:'PUBLICIDAD EN PAUSA',info:'Se mantienen los límites habituales. Los anuncios siguen en pausa hasta su revisión.'});
  return t;
  };
  const badge=document.createElement('button');
  badge.type='button';badge.className='tdr-bf-mini';badge.textContent=currentLabels().badge;
  root.appendChild(badge);
  let dialog=null;
  function close(){dialog?.remove();dialog=null;}
  function open(){
    if(dialog||!root.isConnected||!isAdFreePromoActive())return;
    const t=currentLabels();
    dialog=document.createElement('div');dialog.className='tdr-bf-shade';
    dialog.innerHTML=`<section class="tdr-bf-panel" role="dialog" aria-modal="true" aria-label="${t.title}">
      <button class="tdr-bf-close" type="button" aria-label="${t.close}">×</button>
      <div class="tdr-bf-kicker">${t.event}</div>
      <div class="tdr-bf-title">${t.title}</div>
      <div class="tdr-bf-subtitle">${t.subtitle}</div>
      <div class="tdr-bf-dates">${t.dates}</div>
      <div class="tdr-bf-perks">
        <span>◉ ${t.coins}</span><span>★ ${t.records}</span>
        <span>◆ ${t.loot}</span><span>⚑ ${t.ghosts}</span>
      </div>
      <button type="button" class="tdr-bf-play">${t.play}</button>
      <div class="tdr-bf-foot">${t.info}</div>
    </section>`;
    dialog.querySelector('.tdr-bf-close')?.addEventListener('click',close);
    dialog.querySelector('.tdr-bf-play')?.addEventListener('click',close);
    dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
    // Mount outside the Phaser/lobby stacking context to avoid clipping.
    document.body.appendChild(dialog);
  }
  badge.addEventListener('click',open);
  // Show on first lobby appearance per app session, then allow reopening by badge.
  try{
    if(sessionStorage.getItem(SESSION_KEY)!=='1'){
      sessionStorage.setItem(SESSION_KEY,'1');open();
    }
  }catch{open();}
  const sync=()=>{
    const active=isAdFreePromoActive();
    badge.hidden=!active;
    badge.textContent=currentLabels().badge;
    if(!active)close();
  };
  const timer=setInterval(sync,60000);
  window.addEventListener('tdr:promotion-changed',sync);
  const remove=()=>{clearInterval(timer);window.removeEventListener('tdr:promotion-changed',sync);close();};
  return remove;
}
