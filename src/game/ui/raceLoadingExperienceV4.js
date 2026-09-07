import { installRaceLoadingExperience as installV3 } from './raceLoadingExperienceV3.js';

const STYLE_ID='tdr-race-loading-experience-v4-fit';

function installFitStyle(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    .tdr-rload-car{grid-template-columns:minmax(280px,42%) 1fr!important;min-height:146px!important;padding:8px 18px!important}
    .tdr-rload-car-visual{width:100%!important;height:130px!important;overflow:visible!important;display:grid!important;place-items:center!important}
    .tdr-rload-car img{width:118px!important;height:220px!important;max-width:none!important;max-height:none!important;object-fit:contain!important;transform-origin:50% 50%!important;transform:rotate(90deg) scale(.88)!important}
    @media (max-width:900px){
      .tdr-rload-car{grid-template-columns:minmax(210px,40%) 1fr!important}
      .tdr-rload-car-visual{height:118px!important}
      .tdr-rload-car img{width:104px!important;height:196px!important;transform:rotate(90deg) scale(.84)!important}
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceScene){
  installFitStyle();
  return installV3(RaceScene);
}
