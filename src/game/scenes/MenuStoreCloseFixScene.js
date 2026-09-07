import { MenuScene as CurrentMenuScene } from './MenuGameModeSnapScene.js';
import { showFirstVisitTutorial } from '../ui/FirstVisitTutorial.js';

export class MenuScene extends CurrentMenuScene {
  create(...args){
    super.create(...args);
    this._installFreshLobbyClickGuard();
  }

  _installFreshLobbyClickGuard(){
    const root=this._lobbyDomRoot;
    if(!root||root.__tdrFreshClickGuardInstalled)return;
    root.__tdrFreshClickGuardInstalled=true;

    let armedButton=null;
    const buttonFor=target=>target?.closest?.('button')||null;
    const onDown=event=>{armedButton=buttonFor(event.target);};
    const onCancel=()=>{armedButton=null;};
    const onClick=event=>{
      const button=buttonFor(event.target);
      const keyboardClick=Number(event.detail)===0;
      const valid=keyboardClick||!!button&&button===armedButton;
      armedButton=null;
      if(valid)return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    };

    root.addEventListener('pointerdown',onDown,true);
    root.addEventListener('pointercancel',onCancel,true);
    root.addEventListener('click',onClick,true);

    const cleanup=()=>{
      try{root.removeEventListener('pointerdown',onDown,true);}catch{}
      try{root.removeEventListener('pointercancel',onCancel,true);}catch{}
      try{root.removeEventListener('click',onClick,true);}catch{}
      armedButton=null;
    };
    this.events?.once?.('shutdown',cleanup);
    this.events?.once?.('destroy',cleanup);
  }

  _openStoreModal(section='materials') {
    super._openStoreModal(section);
    showFirstVisitTutorial('store',{delay:180});
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

  _openLobbyInventoryModal(...args){
    const result=super._openLobbyInventoryModal(...args);
    showFirstVisitTutorial('inventory',{delay:180});
    return result;
  }
}
