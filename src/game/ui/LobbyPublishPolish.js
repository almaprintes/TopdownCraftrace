import { t } from '../i18n/index.js';
import {goToPlayerGarageWithLift} from './LobbyGarageLiftTransition.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { getCurrentRaceEvent } from '../events/raceEvents.js';
import { loadPlayerStatsPersisted } from '../stats/playerStats.js';
import { acknowledgedMasteryLevel, masteryInfoForMeters, masteryRoofVisible, masteryWheelDataUri } from '../stats/carMastery.js';
import { showMasteryUnlockModal } from './MasteryUnlockModal.js';
import { lobbyMasteryPlacement } from '../stats/masteryBadgePlacement.js';
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
// Publish polish only enhances cards; LobbyDomUi owns the bottom buttons.
// Replacing the row here previously erased Garage, Circuits and Online Records.
function installMasteryRoofBadge(scene,root){
  const carId=String(scene.selectedCarId||''),stats=loadPlayerStatsPersisted(),meters=Number(stats?.cars?.[carId]?.meters)||0,mastery=masteryInfoForMeters(meters);
  let badge=root.querySelector('[data-lobby-mastery]');
  if(!badge){badge=document.createElement('img');badge.dataset.lobbyMastery='1';badge.className='tdr-lobby-mastery-badge';badge.alt='';badge.draggable=false;root.appendChild(badge);}
  const car=root.querySelector('[data-lobby-car]');
  const position=()=>{
    if(!badge?.isConnected||!car?.isConnected)return;
    const rr=root.getBoundingClientRect(),cr=car.getBoundingClientRect();
    // The <img> can have large invisible letterboxes with object-fit:contain.
    // Measure its ACTUAL painted car before mounting the roof decal.
    const place=lobbyMasteryPlacement(cr,car.naturalWidth,car.naturalHeight,carId);
    if(!place)return;
    badge.style.left=`${place.x-rr.left}px`;
    badge.style.top=`${place.y-rr.top}px`;
    badge.style.setProperty('--mastery-size',`${place.size}px`);
    badge.style.transform=`translate(-50%,-50%) rotate(${place.rotation}deg)`;
  };
  const visible=mastery.level&&masteryRoofVisible();
  if(!visible){badge.hidden=true;badge.removeAttribute('src');}
  else{badge.hidden=false;badge.src=masteryWheelDataUri(mastery.level,{size:128,blackBackground:false});badge.dataset.level=String(mastery.level);requestAnimationFrame(position);if(!car.dataset.masteryPositionBound){car.dataset.masteryPositionBound='1';car.addEventListener('load',position);window.addEventListener('resize',position);scene.events.once('shutdown',()=>window.removeEventListener('resize',position));}}

  if(mastery.level>acknowledgedMasteryLevel(carId)&&!root.dataset.masteryCelebrationShown){
    root.dataset.masteryCelebrationShown='1';
    const carName=String(CAR_SPECS?.[carId]?.name||carId);
    window.setTimeout(()=>{if(root.isConnected)showMasteryUnlockModal({scene,carId,carName,meters,level:mastery.level});},220);
  }
}
function polishSeasonCard(scene,season){
  const kicker=season.querySelector('.tdr-card-kicker');if(kicker)kicker.textContent=t('lobby.seasonPass');
  const claim=season.querySelector('.tdr-event-claim');if(claim){claim.type='button';claim.classList.add('tdr-event-claim--notice');claim.innerHTML=`<span class="tdr-event-claim-dot" aria-hidden="true"></span><span>${t('lobby.rewardAvailable')}</span><span class="tdr-event-claim-chevron" aria-hidden="true">›</span>`;claim.setAttribute('aria-label',t('lobby.rewardAvailableOpenSeason'));claim.tabIndex=-1;claim.style.pointerEvents='none';}
  makeCardButton(season,t('lobby.openSeasonPass'),()=>scene.scene.start('season'));
}
function installGarageInductionCue(scene,root,season,car){
  if(!season||!car)return;
  const active=getCurrentRaceEvent()?.event?.id==='garage-visit';
  root.querySelector('[data-garage-induction-cue]')?.remove();
  car.classList.toggle('tdr-lobby-car--induction-cue',active);
  if(!active)return;
  const cue=document.createElement('div');cue.dataset.garageInductionCue='1';cue.className='tdr-garage-induction-cue';cue.innerHTML=`<span>${t('lobby.tapYourCar')}</span><b aria-hidden="true">↓</b>`;root.appendChild(cue);
  const position=()=>{if(!cue.isConnected||!car.isConnected)return;const rr=root.getBoundingClientRect(),cr=car.getBoundingClientRect();if(!cr.width)return;cue.style.left=`${cr.left-rr.left+cr.width*.5}px`;cue.style.top=`${Math.max(8,cr.top-rr.top-8)}px`;};
  requestAnimationFrame(position);window.addEventListener('resize',position);car.addEventListener('load',position,{once:true});scene.events.once('shutdown',()=>window.removeEventListener('resize',position));
}
export function polishLobbyForPublish(scene, root) {
  if (!root?.isConnected) return;
  const season = root.querySelector('[data-event-card]');if (season) polishSeasonCard(scene,season);
  const track = root.querySelector('[data-track-card]');if (track) makeCardButton(track,t('lobby.openTrackSelector'),() => scene.scene.start('TrackGarageScene', { mode: 'player' }));
  const car=root.querySelector('[data-lobby-car]');if(car){car.classList.add('tdr-lobby-car-preview--interactive');makeCardButton(car,t('lobby.openGarage'),()=>goToPlayerGarageWithLift(scene));}
  installGarageInductionCue(scene,root,season,car);installMasteryRoofBadge(scene,root);
}

// DEV 1.1.109 validation trigger: publish lobby copy uses i18n keys.

// DEV 1.1.126 validation trigger: induction cue is event-id based, not translation-text based.
