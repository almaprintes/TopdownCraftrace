import { MenuScene as PreviousMenuScene } from './MenuInventoryAssetsScene.js';
import { preloadTdrCoin, replaceProceduralCoins } from '../ui/CoinAssetUi.js';

export class MenuScene extends PreviousMenuScene {
  preload(){
    super.preload?.();
    preloadTdrCoin(this);
  }

  _renderTopLobbyHeader(){
    super._renderTopLobbyHeader?.();
    replaceProceduralCoins(this,this._topLobbyHeader,24);
  }

  _openLobbyInventoryModal(tab='materials',page=0,tierFilter=0){
    super._openLobbyInventoryModal(tab,page,tierFilter);
    replaceProceduralCoins(this,this._lobbyInventoryModal,22);
  }

  _showEventRewardModal(event){
    super._showEventRewardModal?.(event);
    replaceProceduralCoins(this,this._eventRewardModal,22);
  }
}
