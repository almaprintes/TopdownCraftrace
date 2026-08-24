import { SettingsScene as CurrentSettingsScene } from './SettingsLazyTutorialScene.js';

export class SettingsScene extends CurrentSettingsScene {
  _ensureDefaults(){
    super._ensureDefaults?.();
    const s=this.settings||(this.settings={});
    s.controls={leftHanded:false,...(s.controls||{})};
  }

  _renderTabContent(panelX,panelY,panelW,panelH){
    super._renderTabContent(panelX,panelY,panelW,panelH);
    this._ensureDefaults();
    if(this.activeTab!=='controls') return;
    if(this.settings?.ui?.settingsSubtab?.controls!=='tuning') return;

    const headH=this._panel?.headH||56;
    const x=panelX+24;
    const top=panelY+headH+14;
    const bodyY=top+44;
    const usableW=panelW-48;
    const gap=34;
    const colW=Math.floor((usableW-gap)/2);
    const rightX=x+colW+gap;
    const c=this.settings.controls;

    this._label(rightX,bodyY+98,'MODO ZURDO',12);
    this.add.text(rightX,bodyY+118,'Intercambia dirección y pedales de lado.',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aeb9d8'});
    this._switch(rightX,bodyY+144,!!c.leftHanded,()=>{
      c.leftHanded=!c.leftHanded;
      this._saveAll();
      this.scene.restart();
    });
  }
}
