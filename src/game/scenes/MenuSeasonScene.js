import { MenuScene as CurrentMenuScene } from './MenuMaterialExchangeScene.js';
import { openMaterialExchangeDom, closeMaterialExchangeDom } from '../ui/MaterialExchangeDom.js';

// The publish lobby owns the Season Pass UI in DOM. The former Phaser season
// card is intentionally retired at its source instead of being rendered and
// hidden/destroyed later. This prevents duplicate UI and avoids wasting CPU on
// objects, hit areas and text that the player never uses.
export class MenuScene extends CurrentMenuScene {
  _renderGlobalEventCard() {}

  _closeMaterialExchange(){
    closeMaterialExchangeDom(this);
    this._materialExchangeModal=null;
  }

  _openMaterialExchange(fromId=this._exchangeFrom||'scrap',toId=this._exchangeTo||'compound',amount=this._exchangeAmount||100){
    this._materialExchangeModal=null;
    return openMaterialExchangeDom(this,fromId,toId,amount);
  }
}
