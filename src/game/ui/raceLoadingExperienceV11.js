import { installRaceLoadingExperience as installV10 } from './raceLoadingExperienceV10.js';

const STYLE_ID='tdr-race-loading-experience-v11-car-label-gap';
const ROOT_ID='tdr-race-loading-experience';

function installCarLabelGap(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #${ROOT_ID} .tdr-rload-car>span{
      left:72%!important;
      right:18px!important;
      width:auto!important;
      max-width:none!important;
    }
    @media (max-width:900px),(max-height:520px){
      #${ROOT_ID} .tdr-rload-car>span{
        left:72%!important;
        right:14px!important;
        width:auto!important;
      }
    }
    @media (orientation:landscape) and (max-height:430px){
      #${ROOT_ID} .tdr-rload-car>span{
        left:72%!important;
        right:12px!important;
        width:auto!important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV10(RaceSceneClass);
  installCarLabelGap();
}
