import { SettingsScene as CurrentSettingsScene } from './SettingsDomScene.js';

const STORAGE_KEY='tdr2:settings';

export class SettingsScene extends CurrentSettingsScene {
  _renderTab(tab){
    super._renderTab(tab);
    if(tab!=='controls' || !this.root) return;
    const row=this.root.querySelector('[data-choice="steer"]');
    if(!row || row.querySelector('[data-v="wheel"]')) return;
    const c=this.settings.controls;
    const btn=document.createElement('button');
    btn.className=`s2choice ${c.steeringMode==='wheel'?'on':''}`;
    btn.dataset.v='wheel';
    btn.textContent='◉ VOLANTE';
    row.appendChild(btn);
    row.onclick=e=>{
      const b=e.target.closest('[data-v]');
      if(!b)return;
      c.steeringMode=b.dataset.v;
      c.scheme=c.steeringMode==='gamepad'?'gamepad':'touch';
      try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.settings));}catch{}
      this._renderTab('controls');
    };
  }
}
