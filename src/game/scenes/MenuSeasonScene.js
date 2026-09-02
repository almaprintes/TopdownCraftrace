import { MenuScene as CurrentMenuScene } from './MenuMaterialExchangeScene.js';
import { openMaterialExchangeDom, closeMaterialExchangeDom } from '../ui/MaterialExchangeFlexibleDom.js';

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
    try{
      const root=openMaterialExchangeDom(this,fromId,toId,amount);
      if(!root)throw new Error('Recycler DOM did not return a root');
      // Keep full-screen DOM outside Phaser's canvas/container stacking context.
      // This is especially important on iOS, where a transformed canvas parent can
      // trap fixed overlays and make the screen look frozen even though Phaser lives.
      if(typeof document!=='undefined'&&root.parentElement!==document.body){
        document.body.appendChild(root);
      }
      return root;
    }catch(err){
      console.error('[recycler-dom] open failed',err);
      try{closeMaterialExchangeDom(this);}catch{}
      this._materialExchangeModal=null;
      try{if(this._storeModal?.scene)this._storeModal.setVisible(true);}catch{}
      try{this._toastStore?.('NO SE PUDO ABRIR LA RECICLADORA',false);}catch{}
      return null;
    }
  }
}
