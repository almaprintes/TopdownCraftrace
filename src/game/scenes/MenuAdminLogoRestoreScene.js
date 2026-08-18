import { MenuScene as CurrentMenuScene } from './MenuTrackNameFitScene.js';

export class MenuScene extends CurrentMenuScene {
  renderUI(){
    super.renderUI();
    this._restoreAdminLogoAccess();
  }

  _restoreAdminLogoAccess(){
    const ui=this._ui;
    if(!ui)return;

    try{this._adminLogoHit?.destroy?.();}catch{}
    this._adminLogoHit=null;

    const barH=48;
    const hit=this.add.rectangle(8,4,80,barH-8,0x000000,0.001)
      .setOrigin(0)
      .setDepth(1000)
      .setInteractive({useHandCursor:true});
    ui.add(hit);
    this._adminLogoHit=hit;

    let pressTimer=null;
    const clearPress=()=>{
      if(pressTimer){
        try{this.time.removeEvent(pressTimer);}catch{}
        pressTimer=null;
      }
    };

    hit.on('pointerdown',()=>{
      clearPress();
      pressTimer=this.time.delayedCall(700,()=>{
        pressTimer=null;
        let nowAdmin='1';
        try{
          nowAdmin=localStorage.getItem('tdr2:admin')==='1'?'0':'1';
          localStorage.setItem('tdr2:admin',nowAdmin);
        }catch{}

        try{this._toast?.(nowAdmin==='1'?'ADMIN ON':'ADMIN OFF');}catch{}

        if(nowAdmin==='1'){
          this.scene.start('admin-hub');
        }else{
          this.renderUI();
        }
      });
    });

    hit.on('pointerup',clearPress);
    hit.on('pointerout',clearPress);
    hit.on('pointerupoutside',clearPress);
  }
}
