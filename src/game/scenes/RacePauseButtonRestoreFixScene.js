import { RaceScene as CurrentRaceScene } from './RaceHandbrakeFrontAxleFixScene.js';

// Shipping hotfix: the generic pause-HUD sweep sees the pause button after the
// base pause menu has already set it to display:none, so that hidden state can be
// restored again after Continue. Resume must always return the pause control.
export class RaceScene extends CurrentRaceScene {
  _closePauseMenu(resume=true,...rest){
    const shouldResume=resume!==false;
    const result=super._closePauseMenu?.(resume,...rest);
    if(shouldResume){
      try{
        const button=this._pauseButton;
        if(button?.isConnected){
          button.style.removeProperty('display');
          button.style.display='grid';
          button.style.pointerEvents='auto';
        }
      }catch{}
    }
    return result;
  }
}
