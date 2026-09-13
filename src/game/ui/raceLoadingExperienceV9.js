import { installRaceLoadingExperience as installV8 } from './raceLoadingExperienceV8.js';

const STYLE_ID='tdr-race-loading-experience-v9-visual-car-center';
const ROOT_ID='tdr-race-loading-experience';

function installVisualCarCentering(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    /* The lobby car WebPs contain transparent padding. The img box can be
       geometrically centred while the visible car still sits too low. Offset
       the rendered asset itself so its visible mass is centred in the panel. */
    #${ROOT_ID} .tdr-rload-car img{
      position:relative!important;
      top:-18px!important;
    }
    @media (max-width:900px),(max-height:520px){
      #${ROOT_ID} .tdr-rload-car img{
        top:-24px!important;
      }
    }
    @media (orientation:landscape) and (max-height:430px){
      #${ROOT_ID} .tdr-rload-car img{
        top:-28px!important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV8(RaceSceneClass);
  installVisualCarCentering();
}
