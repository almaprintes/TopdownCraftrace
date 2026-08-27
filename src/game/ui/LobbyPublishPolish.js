import { getLanguage } from '../i18n/index.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { loadPlayerStats } from '../stats/playerStats.js';
import { acknowledgedMasteryLevel, masteryInfoForMeters, masteryRoofVisible, masteryWheelDataUri } from '../stats/carMastery.js';
import { showMasteryUnlockModal } from './MasteryUnlockModal.js';
import './lobby-publish-polish.css';

const BASE=import.meta.env.BASE_URL||'/';

function makeCardButton(node, label, action) {
  if (!node) return;
  node.setAttribute('role', 'button');node.setAttribute('tabindex', '0');node.setAttribute('aria-label', label);
  if (!node.dataset.tdrPublishNavBound) {
    node.dataset.tdrPublishNavBound = '1';
    node.addEventListener('click', event => {event.preventDefault();action();});
    node.addEventListener('keydown', event => {if (event.key !== 'Enter' && event.key !== ' ') return;event.preventDefault();action();});
  }
}
function makeLobbyAction({cls='',icon=null,glyph='',label,action}){
  const button=document.createElement('button');button.type='button';button.className=`tdr-lobby-button ${cls}`.trim();
  const mark=icon?`<img src="${BASE}assets/ui/lobby/${icon}" alt="" draggable="false">`:`<span class="tdr-lobby-button-glyph" aria-hidden="true">${glyph}</span>`;
  button.innerHTML=`${mark}<span>${label}</span>`;button.addEventListener('click',action);return button;
}
function installBottomActions(scene,root,lang){
  const bottom=root.querySelector('.tdr-lobby-bottom-actions');if(!bottom||bottom.dataset.tdrPublishBottom==='1')return;
  bottom.dataset.tdrPublishBottom='1';bottom.replaceChildren(
    makeLobbyAction({glyph:'▥',label:lang==='en'?'STATISTICS':'ESTADÍSTICAS',action:()=>scene.scene.start('StatsScene')}),
    makeLobbyAction({cls:'tdr-lobby-button--factory',icon:'icon_factory.webp',label:lang==='en'?'FACTORY':'FÁBRICA',action:()=>scene.scene.start('upgrade-shop')})
  );bottom.classList.add('tdr-lobby-bottom-actions--two');
}

function installMasteryRoofBadge(scene,root){
  const carId=String(scene.selectedCarId||''),stats=loadPlayerStats(),meters=Number(stats?.cars?.[carId]?.meters)||0,mastery=masteryInfoForMeters(meters);
  let badge=root.querySelector('[data-lobby-mastery]');
  if(!badge){badge=document.createElement('img');badge.dataset.lobbyMastery='1';badge.className='tdr-lobby-mastery-badge';badge.alt='';badge.draggable=false;root.appendChild(badge);}
  const car=root.querySelector('[data-lobby-car]');
  const position=()=>{
    if(!badge?.isConnected||!car?.isConnected)return;
    const rr=root.getBoundingClientRect(),cr=car.getBoundingClientRect();if(!cr.width||!cr.height)return;
    badge.style.left=`${cr.left-rr.left+cr.width*.5}px`;badge.style.top=`${cr.top-rr.top+cr.height*.49}px`;
    const size=Math.max(24,Math.min(48,cr.width*.145));badge.style.setProperty('--mastery-size',`${size}px`);
  };
  const visible=mastery.level&&masteryRoofVisible();
  if(!visible){badge.hidden=true;badge.removeAttribute('src');}
  else{badge.hidden=false;badge.src=masteryWheelDataUri(mastery.level,{size:128,blackBackground:true});badge.dataset.level=String(mastery.level);requestAnimationFrame(position);if(!car.dataset.masteryPositionBound){car.dataset.masteryPositionBound='1';car.addEventListener('load',position);window.addEventListener('resize',position);scene.events.once('shutdown',()=>window.removeEventListener('resize',position));}}

  if(mastery.level>acknowledgedMasteryLevel(carId)&&!root.dataset.masteryCelebrationShown){
    root.dataset.masteryCelebrationShown='1';
    const carName=String(CAR_SPECS?.[carId]?.name||carId);
    window.setTimeout(()=>{if(root.isConnected)showMasteryUnlockModal({scene,carId,carName,meters,level:mastery.level});},220);
  }
}
function polishSeasonCard(scene,season,lang){
  const kicker=season.querySelector('.tdr-card-kicker');if(kicker)kicker.textContent=lang==='en'?'SEASON PASS':'PASE DE TEMPORADA';
  const claim=season.querySelector('.tdr-event-claim');if(claim){claim.type='button';claim.classList.add('tdr-event-claim--notice');claim.innerHTML=`<span class="tdr-event-claim-dot" aria-hidden="true"></span><span>${lang==='en'?'REWARD AVAILABLE':'PREMIO DISPONIBLE'}</span><span class="tdr-event-claim-chevron" aria-hidden="true">›</span>`;claim.setAttribute('aria-label',lang==='en'?'Reward available. Open Season Pass':'Premio disponible. Abrir Pase de Temporada');claim.tabIndex=-1;claim.style.pointerEvents='none';}
  makeCardButton(season,lang==='en'?'Open Season Pass':'Abrir Pase de Temporada',()=>scene.scene.start('season'));
}
export function polishLobbyForPublish(scene, root) {
  if (!root?.isConnected) return;
  const lang = getLanguage() === 'en' ? 'en' : 'es';
  const season = root.querySelector('[data-event-card]');if (season) polishSeasonCard(scene,season,lang);
  const track = root.querySelector('[data-track-card]');if (track) makeCardButton(track,lang === 'en' ? 'Open track selector' : 'Abrir selector de circuitos',() => scene.scene.start('TrackGarageScene', { mode: 'player' }));
  const car=root.querySelector('[data-lobby-car]');if(car){car.classList.add('tdr-lobby-car-preview--interactive');makeCardButton(car,lang==='en'?'Open garage':'Abrir garaje',()=>scene.scene.start('GarageScene',{mode:'player'}));}
  installMasteryRoofBadge(scene,root);installBottomActions(scene,root,lang);
}
