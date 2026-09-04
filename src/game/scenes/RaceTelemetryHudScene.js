import { RaceScene as CurrentRaceScene } from './RaceMobilePerformanceScene.js';
import { mountRaceInstrumentHud, updateRaceInstrumentHud, destroyRaceInstrumentHud } from '../ui/raceInstrumentHud.js';

function safeDestroy(obj){if(!obj)return;try{obj.destroy?.(true);}catch{}}
function isIOSDevice(){try{return /iPad|iPhone|iPod/.test(navigator.userAgent)||((navigator.platform==='MacIntel')&&navigator.maxTouchPoints>1);}catch{return false;}}
function raceSessionEnding(scene){
  return scene?._sessionFinalizing===true||!!scene?._sessionReportModal?.isConnected||!!scene?._survivalResultDom?.isConnected||!!scene?._sessionRewardsDom?.isConnected;
}

function retireLegacyRaceUi(scene){
  scene._updateGrowthDiag=()=>{};
  scene._growthDiagAccum=0;
  scene._growthDiagLast='';
  for(const key of ['raceInfoHud','competitionHud','minimapSportFrame','_perfDiagText','_renderPerfText','_isoText','_diagText','_touchDbg','_dbgText','_lapBreakdownText','_growthDiagText','_bufferDiagText','_rendererDiagText','devBox','devTitle','devInfo','devBtnMap','devTuneBtn','_simpleRaceTop','_simpleRaceBottom']){
    safeDestroy(scene[key]);
    scene[key]=null;
  }
  scene._updateRaceInfoHud=()=>{};
  scene._pinRaceInfoHud=()=>{};
  scene._buildRaceInfoHud=()=>{};
  scene._syncCompetitionHud=()=>{};
  scene._pinCompetitionHud=()=>{};
  scene._pinMinimapSportFrame=()=>{};
  scene._layoutMinimapSportFrame=()=>{};
  scene._centerMinimapInsideSportFrame=()=>{};
  scene._hideRaceDebugOnly=()=>{};
  scene._dbgSet=()=>{};
  scene._perfDiagEnabled=false;
  scene._renderPerfEnabled=false;
  scene._isoModes=null;
  scene._lapBreakdown=null;
  try{scene._perfStats?.clear?.();}catch{}
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    if(isIOSDevice()&&this.carBody){
      try{
        const cam=this.cameras?.main;
        cam?.stopFollow?.();
        cam?.centerOn?.(this.carBody.x,this.carBody.y);
        cam?.startFollow?.(this.carBody,true,1,1);
        if(cam)cam.roundPixels=false;
      }catch{}
    }

    retireLegacyRaceUi(this);
    mountRaceInstrumentHud(this);
    updateRaceInstrumentHud(this,100);
    this.events?.once?.('shutdown',()=>destroyRaceInstrumentHud(this));
    this.events?.once?.('destroy',()=>destroyRaceInstrumentHud(this));
    return result;
  }

  _ensureRaceInstrumentHud(){
    if(raceSessionEnding(this))return;
    if(this._raceHudDom?.isConnected&&this._raceHudRefs)return;
    mountRaceInstrumentHud(this);
    updateRaceInstrumentHud(this,100);
  }

  update(time,delta){
    const result=super.update(time,delta);
    this._ensureRaceInstrumentHud();
    updateRaceInstrumentHud(this,delta);
    return result;
  }
}
