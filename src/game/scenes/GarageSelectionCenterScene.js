import { GarageScene as CurrentGarageScene } from './GarageLazyCardsScene.js';
import { showFirstVisitTutorial } from '../ui/FirstVisitTutorial.js';
import { ensureSelectionPaddockSkin } from '../ui/selectionPaddockSkin.js';
import { attachCenteredSelectionRail } from '../ui/centeredSelectionRail.js';

export class GarageScene extends CurrentGarageScene {
  create(...args){
    super.create(...args);
    showFirstVisitTutorial('garage',{delay:260});
    this.events.once('shutdown',()=>{this._centeredGarageRail?.destroy();this._centeredGarageRail=null;});
  }

  _installPlayerDomGarage(){
    this._centeredGarageRail?.destroy();
    this._centeredGarageRail=null;
    super._installPlayerDomGarage?.();
    if(this._mode!=='player')return;
    ensureSelectionPaddockSkin();
    const root=this._playerGarageDom;
    this._centeredGarageRail=attachCenteredSelectionRail(root,{
      listSelector:'.tdr-garage-dom-list',
      itemSelector:'.tdr-garage-dom-car',
      onSettle:index=>{
        if(index===this._selectedIndex)return;
        this._selectedIndex=index;
        // Selected car, locked state and stats use the original authoritative renderer.
        this._renderPlayerDomSelection();
      }
    });
    const rail=this._centeredGarageRail;
    requestAnimationFrame(()=>{if(rail===this._centeredGarageRail)rail?.center(this._selectedIndex,'instant');});
  }

  _renderPlayerDomSelection(){
    super._renderPlayerDomSelection?.();
    const rail=this._centeredGarageRail;
    if(!rail)return;
    // The clicked item lands in the center regardless of scroll direction.
    requestAnimationFrame(()=>{if(rail===this._centeredGarageRail)rail.center(this._selectedIndex,'smooth');});
  }
}
