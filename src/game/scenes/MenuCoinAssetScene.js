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

    // Final induction reward is a car rendered together with its presentation
    // plinth. Keep the whole artwork visible: on short Android landscape
    // viewports the previous scale cropped the bottom of the plinth.
    if(!event?.reward?.car?.id||!this._eventRewardModal?.scene)return;
    const root=this._eventRewardModal;
    const images=[];
    const walk=node=>{
      if(!node)return;
      if(node.type==='Image'&&Number(node.width)>0&&Number(node.height)>0)images.push(node);
      if(Array.isArray(node.list))node.list.forEach(walk);
    };
    walk(root);
    if(!images.length)return;
    const art=images.sort((a,b)=>(b.displayWidth*b.displayHeight)-(a.displayWidth*a.displayHeight))[0];
    if(!art)return;
    const {width,height}=this.scale;
    const maxW=width*.58,maxH=height*.62;
    const fit=Math.min(maxW/Math.max(1,art.width),maxH/Math.max(1,art.height));
    art.setScale(fit);
    art.setPosition(width*.5,height*.49);
  }
}
