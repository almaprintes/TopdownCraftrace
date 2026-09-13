import { installRaceLoadingExperience as installV7 } from './raceLoadingExperienceV7.js';

const STYLE_ID='tdr-race-loading-experience-v8-car-center';
const ROOT_ID='tdr-race-loading-experience';

function installCarCentering(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #${ROOT_ID} .tdr-rload-car{
      position:relative!important;
    }
    #${ROOT_ID} .tdr-rload-car-visual{
      position:absolute!important;
      inset:0!important;
      width:100%!important;
      height:100%!important;
      display:grid!important;
      place-items:center!important;
      overflow:visible!important;
      pointer-events:none!important;
    }
    #${ROOT_ID} .tdr-rload-car>span{
      position:relative!important;
      z-index:1!important;
      grid-column:2!important;
      justify-self:end!important;
      width:min(34%,150px)!important;
      margin-right:0!important;
    }
    @media (max-width:900px),(max-height:500px){
      #${ROOT_ID} .tdr-rload-car>span{
        width:min(36%,118px)!important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV7(RaceSceneClass);
  installCarCentering();
}
