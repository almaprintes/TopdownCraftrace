import { installRaceLoadingExperience as installV9 } from './raceLoadingExperienceV9.js';

const STYLE_ID='tdr-race-loading-experience-v10-car-label-inset';
const ROOT_ID='tdr-race-loading-experience';

function installCarLabelInset(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #${ROOT_ID} .tdr-rload-car>span{
      position:absolute!important;
      right:18px!important;
      top:50%!important;
      transform:translateY(-50%)!important;
      z-index:2!important;
      width:124px!important;
      max-width:calc(100% - 36px)!important;
      margin:0!important;
      box-sizing:border-box!important;
      justify-self:auto!important;
      grid-column:auto!important;
    }
    @media (max-width:900px),(max-height:520px){
      #${ROOT_ID} .tdr-rload-car>span{
        right:14px!important;
        width:112px!important;
      }
    }
    @media (orientation:landscape) and (max-height:430px){
      #${ROOT_ID} .tdr-rload-car>span{
        right:12px!important;
        width:106px!important;
      }
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV9(RaceSceneClass);
  installCarLabelInset();
}
