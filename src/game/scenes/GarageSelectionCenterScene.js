import { GarageScene as CurrentGarageScene } from './GarageLazyCardsScene.js';
import { showFirstVisitTutorial } from '../ui/FirstVisitTutorial.js';

function centerSelected(root, behavior='smooth'){
  const list=root?.querySelector?.('.tdr-garage-dom-list');
  const selected=list?.querySelector?.('.tdr-garage-dom-car.is-selected');
  if(!list||!selected)return;
  const top=selected.offsetTop-(list.clientHeight-selected.offsetHeight)/2;
  const max=Math.max(0,list.scrollHeight-list.clientHeight);
  const target=Math.max(0,Math.min(max,top));
  try{list.scrollTo({top:target,behavior});}catch{list.scrollTop=target;}
}

export class GarageScene extends CurrentGarageScene {
  create(...args){
    super.create(...args);
    showFirstVisitTutorial('garage',{delay:260});
  }

  _installPlayerDomGarage(){
    super._installPlayerDomGarage?.();
    requestAnimationFrame(()=>centerSelected(this._playerGarageDom,'auto'));
  }

  _renderPlayerDomSelection(){
    super._renderPlayerDomSelection?.();
    requestAnimationFrame(()=>centerSelected(this._playerGarageDom,'smooth'));
  }
}
