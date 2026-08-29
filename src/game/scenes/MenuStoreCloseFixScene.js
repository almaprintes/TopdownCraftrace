import { MenuScene as CurrentMenuScene } from './MenuGameModeSnapScene.js';

export class MenuScene extends CurrentMenuScene {
  _openStoreModal(section='materials') {
    super._openStoreModal(section);
    const root=this._storeModal;
    if(!root?.scene)return;
    const {width:w}=this.scale;
    const closeHit=this.add.rectangle(w-36,29,56,56,0xffffff,.001)
      .setInteractive({useHandCursor:true});
    closeHit.name='store-close-hit';
    const closeStore=()=>{
      if(this._storeModal!==root)return;
      try{root.destroy(true);}catch{}
      this._storeModal=null;
    };
    closeHit.on('pointerup',closeStore);
    closeHit.on('pointerdown',(_pointer,_lx,_ly,event)=>{try{event?.stopPropagation?.();}catch{}});
    root.add(closeHit);
  }
}
