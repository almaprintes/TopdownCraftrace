// RACE CONTROL 2.0 — DEV visual hub. No online requests, no synthetic player stats.
import './raceControlHub.css';

const asset = path => `${import.meta.env.BASE_URL || '/'}assets/${path}`;
const labels = {
  es:{
    subtitle:'CENTRO DE COMPETICIÓN ONLINE',
    multiplayer:'MULTIJUGADOR', multiplayerSub:'CARRERAS EN DIRECTO · SALAS PRIVADAS',
    rankings:'CLASIFICACIONES', rankingsSub:'MUNDIAL · CONTINENTE · NACIONAL · REGIONAL',
    ghosts:'RIVALES Y FANTASMAS', ghostsSub:'DESAFÍA A PILOTOS DE TU NIVEL',
    versus:'VS GHOST', challenge:'DESAFÍOS',
    events:'EVENTOS', eventsSub:'COMPETICIONES ESPECIALES',
    pilots:'PILOTOS',pilotsSub:'PERFIL Y ESTADÍSTICAS',
    cars:'COCHES',carsSub:'HISTORIAL DE VEHÍCULOS',
    seasons:'TEMPORADAS',seasonsSub:'PROGRESO Y RECOMPENSAS',
    soon:'PRÓXIMAMENTE', inDev:'EN DESARROLLO',
    build:'VISTA PREVIA · DEV', exit:'VOLVER AL LOBBY',
    about:'EL MULTIJUGADOR ESTÁ EN PREPARACIÓN. LAS CLASIFICACIONES Y LOS FANTASMAS YA FUNCIONAN.',
    back:'ATRÁS'
  },
  en:{
    subtitle:'ONLINE COMPETITION CENTER',
    multiplayer:'MULTIPLAYER', multiplayerSub:'LIVE RACING · PRIVATE ROOMS',
    rankings:'LEADERBOARDS', rankingsSub:'WORLD · CONTINENT · COUNTRY · REGION',
    ghosts:'RIVALS AND GHOSTS', ghostsSub:'CHALLENGE DRIVERS AT YOUR LEVEL',
    versus:'VS GHOST', challenge:'CHALLENGES',
    events:'EVENTS', eventsSub:'SPECIAL COMPETITIONS',
    pilots:'DRIVERS',pilotsSub:'PROFILE AND STATISTICS',
    cars:'CARS',carsSub:'VEHICLE HISTORY',
    seasons:'SEASONS',seasonsSub:'PROGRESS AND REWARDS',
    soon:'COMING SOON', inDev:'IN DEVELOPMENT',
    build:'PREVIEW · DEV', exit:'BACK TO LOBBY',
    about:'MULTIPLAYER IS IN DEVELOPMENT. LEADERBOARDS AND GHOSTS ARE AVAILABLE NOW.',
    back:'BACK'
  }
};

const panel = ({type,photo,title,sub,body='',disabled=false,action='',className=''}) => `
  <article class="rc2-panel rc2-${type} ${className}" style="--rc2-photo:url('${asset(photo)}')">
    <span class="rc2-corner rc2-corner-tl" aria-hidden="true"></span>
    <span class="rc2-corner rc2-corner-br" aria-hidden="true"></span>
    <div class="rc2-panel-content">
      <div class="rc2-heading"><span class="rc2-symbol rc2-symbol-${type}" aria-hidden="true"></span><div class="rc2-heading-text">
        <h2>${title}</h2><p>${sub}</p></div>
      </div>
      ${body}
    </div>
    ${action ? `<button type="button" class="rc2-panel-hit" data-rc2-action="${action}" ${disabled?'aria-disabled="true"':''} aria-label="${title}"><span class="rc2-visually-hidden">${title}</span></button>` : ''}
    ${!disabled && action ? '<span class="rc2-chevron" aria-hidden="true">»</span>':''}
  </article>`;

/**
 * Mounts a standalone illustrated lobby inside the existing Statistics scene root.
 * Only callbacks change the view: no background polling, no realtime subscription.
 */
export function mountRaceControlHub(root,{onAction,onExit,language='es'}={}) {
  if(!root) return ()=>{};
  const l=labels[language==='en'?'en':'es'];
  const world='tracks/karting-tenerife/beauty/karting-tenerife-beauty-preview.webp';
  const canarias='tracks/karting-canarias/beauty/karting-canarias-beauty-preview.webp';
  const santa='tracks/santa-cruz/beauty/santa-cruz-beauty-preview.webp';
  const atlantico='tracks/track01/beauty/track01-beauty-preview.webp';
  const car1=asset('cars/lobby/veloce_photon.webp');
  const car2=asset('cars/lobby/crown_axis.webp');
  const car3=asset('cars/lobby/helix_vortex.webp');
  const car4=asset('cars/lobby/avenir_gripline.webp');
  root.innerHTML=`<div class="tdr-rc2" role="region" aria-label="RACE CONTROL 2.0">
    <header class="rc2-head">
      <div class="rc2-brand"><img src="${asset('logo.webp')}" alt="TOP DOWN RACE"><span>CRAFTRACE</span></div>
      <div class="rc2-headline"><h1>RACE CONTROL</h1><div class="rc2-stripes" aria-hidden="true"></div><p>${l.subtitle}</p></div>
      <div class="rc2-headside"><span class="rc2-test-label">${l.build}</span><button type="button" class="rc2-back" data-rc2-action="exit" aria-label="${l.exit}">‹ ${l.back}</button></div>
    </header>
    <main class="rc2-board">
      <div class="rc2-col rc2-col-left">
        ${panel({type:'multiplayer',photo:world,title:l.multiplayer,sub:l.multiplayerSub,disabled:true,action:'multiplayer',
          body:`<div class="rc2-multi-cars" aria-hidden="true"><img src="${car1}" alt=""><img src="${car2}" alt=""><img src="${car3}" alt=""><img src="${car4}" alt=""></div><span class="rc2-status">${l.inDev}</span>`})}
        ${panel({type:'rankings',photo:canarias,title:l.rankings,sub:l.rankingsSub,action:'rankings'})}
      </div>
      <div class="rc2-col rc2-col-mid">
        ${panel({type:'ghosts',photo:santa,title:l.ghosts,sub:l.ghostsSub,
          body:`<div class="rc2-ghost-cars" aria-hidden="true"><img src="${car2}" alt=""><img src="${car3}" alt=""></div>
            <div class="rc2-rival-actions"><button type="button" data-rc2-action="ghosts" class="rc2-rival-cyan">${l.versus}<strong>»</strong></button>
            <button type="button" data-rc2-action="ghosts" class="rc2-rival-gold">${l.challenge}<strong>»</strong></button></div>`})}
        ${panel({type:'events',photo:atlantico,title:l.events,sub:l.eventsSub,action:'events',disabled:true,
          body:`<span class="rc2-status">${l.soon}</span>`})}
      </div>
      <div class="rc2-col rc2-col-right">
        ${panel({type:'pilots',photo:santa,title:l.pilots,sub:l.pilotsSub,action:'pilots',
          body:`<img class="rc2-side-car" src="${car1}" alt="" aria-hidden="true">`})}
        ${panel({type:'cars',photo:world,title:l.cars,sub:l.carsSub,action:'cars',
          body:`<img class="rc2-side-car" src="${car4}" alt="" aria-hidden="true">`})}
        ${panel({type:'seasons',photo:atlantico,title:l.seasons,sub:l.seasonsSub,action:'seasons',
          body:`<img class="rc2-side-car" src="${car3}" alt="" aria-hidden="true">`})}
      </div>
    </main>
    <footer class="rc2-footer"><span class="rc2-footer-id">◈ TOP DOWN RACE · CRAFTRACE</span><span class="rc2-footer-note">${l.about}</span><button type="button" data-rc2-action="exit">‹ ${l.exit}</button></footer>
  </div>`;
  const handleClick=event=>{
    const button=event.target.closest?.('[data-rc2-action]');
    if(!button||!root.contains(button))return;
    const action=button.dataset.rc2Action;
    if(action==='exit'){onExit?.();return;}
    if(button.getAttribute('aria-disabled')==='true')return;
    onAction?.(action);
  };
  const handleKey=event=>{
    if(event.key==='Escape'){event.preventDefault();onExit?.();}
  };
  root.addEventListener('click',handleClick);
  root.addEventListener('keydown',handleKey);
  return ()=>{root.removeEventListener('click',handleClick);root.removeEventListener('keydown',handleKey);};
}
