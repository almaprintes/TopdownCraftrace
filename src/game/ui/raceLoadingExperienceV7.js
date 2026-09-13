import { installRaceLoadingExperience as installV6 } from './raceLoadingExperienceV6.js';

const STYLE_ID='tdr-race-loading-experience-v7-android-fit';

function installAndroidViewportFit(){
  if(typeof document==='undefined'||document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');
  style.id=STYLE_ID;
  style.textContent=`
    #tdr-race-loading-experience{
      inset:auto!important;
      left:var(--tdr-vv-left,0px)!important;
      top:var(--tdr-vv-top,0px)!important;
      width:var(--tdr-vv-width,100vw)!important;
      height:var(--tdr-vv-height,100vh)!important;
      max-width:100vw!important;
      max-height:100vh!important;
    }
    #tdr-race-loading-experience .tdr-rload-shell{
      width:min(calc(var(--tdr-vv-width,100vw) - 18px),1180px)!important;
      height:min(calc(var(--tdr-vv-height,100vh) - 14px),590px)!important;
      max-height:calc(var(--tdr-vv-height,100vh) - 14px)!important;
      min-height:0!important;
      box-sizing:border-box!important;
    }
    @media (orientation:landscape) and (max-height:520px){
      #tdr-race-loading-experience .tdr-rload-shell{
        width:calc(var(--tdr-vv-width,100vw) - 12px)!important;
        height:calc(var(--tdr-vv-height,100vh) - 10px)!important;
        max-height:calc(var(--tdr-vv-height,100vh) - 10px)!important;
        grid-template-columns:minmax(285px,.92fr) minmax(350px,1.08fr)!important;
        gap:16px!important;
        padding:12px 16px!important;
        align-items:center!important;
      }
      #tdr-race-loading-experience .tdr-rload-title{margin-top:5px!important;font-size:clamp(27px,4.2vw,44px)!important;line-height:.94!important}
      #tdr-race-loading-experience .tdr-rload-sub{margin-top:6px!important;font-size:9px!important}
      #tdr-race-loading-experience .tdr-rload-car{margin-top:9px!important;min-height:88px!important;height:92px!important;padding:5px 10px!important;grid-template-columns:minmax(165px,38%) 1fr!important;gap:10px!important}
      #tdr-race-loading-experience .tdr-rload-car-visual{height:82px!important;min-height:0!important}
      #tdr-race-loading-experience .tdr-rload-car img{width:76px!important;height:144px!important;transform:rotate(90deg) scale(.82)!important}
      #tdr-race-loading-experience .tdr-rload-car small,#tdr-race-loading-experience .tdr-rload-tip small{font-size:8px!important}
      #tdr-race-loading-experience .tdr-rload-car strong{margin-top:3px!important;font-size:14px!important}
      #tdr-race-loading-experience .tdr-rload-tip{margin-top:8px!important;padding:8px 11px!important;min-height:56px!important}
      #tdr-race-loading-experience .tdr-rload-tip strong{margin-top:4px!important;font-size:clamp(13px,1.55vw,18px)!important;line-height:1.12!important}
      #tdr-race-loading-experience .tdr-rload-map{height:clamp(125px,32vh,160px)!important;min-height:0!important}
    }
    @media (orientation:landscape) and (max-height:430px){
      #tdr-race-loading-experience .tdr-rload-shell{padding:9px 13px!important;gap:12px!important;grid-template-columns:minmax(250px,.9fr) minmax(320px,1.1fr)!important}
      #tdr-race-loading-experience .tdr-rload-kicker{font-size:8px!important}
      #tdr-race-loading-experience .tdr-rload-title{font-size:clamp(24px,3.8vw,37px)!important}
      #tdr-race-loading-experience .tdr-rload-car{height:78px!important;min-height:76px!important;margin-top:6px!important}
      #tdr-race-loading-experience .tdr-rload-car-visual{height:68px!important}
      #tdr-race-loading-experience .tdr-rload-car img{width:66px!important;height:126px!important}
      #tdr-race-loading-experience .tdr-rload-tip{margin-top:6px!important;min-height:48px!important;padding:6px 9px!important}
      #tdr-race-loading-experience .tdr-rload-tip strong{font-size:12px!important}
      #tdr-race-loading-experience .tdr-rload-map{height:118px!important}
    }
  `;
  document.head.appendChild(style);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installAndroidViewportFit();
  return installV6(RaceSceneClass);
}
