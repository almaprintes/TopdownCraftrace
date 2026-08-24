import { SettingsScene as CurrentSettingsScene } from './SettingsHelpTutorialScene.js';

const TUTORIALS = [
  ['dropTutorial1','assets/tutorials/dropping/dropping_01_717x330.png'],
  ['dropTutorial2','assets/tutorials/dropping/dropping_02_717x330.png'],
  ['dropTutorial3','assets/tutorials/dropping/dropping_03_717x330.png'],
  ['dropTutorial4','assets/tutorials/dropping/dropping_04_717x330.png'],
  ['dropTutorial5','assets/tutorials/dropping/dropping_05_717x330.png']
];

export class SettingsScene extends CurrentSettingsScene {
  create(){
    try {
      document.querySelectorAll('.tdr-lobby-dom').forEach(node=>node.remove());
      document.querySelectorAll('[data-tdr-modal],[data-tdr-overlay]').forEach(node=>node.remove());
      const canvas=this.game?.canvas;
      if(canvas){
        canvas.style.pointerEvents='auto';
        canvas.style.touchAction='none';
      }
      const host=canvas?.parentElement;
      host?.classList?.remove?.('tdr-lobby-host');
    } catch(_) {}

    try {
      this.input.enabled=true;
      if(this.game?.input) this.game.input.enabled=true;
      this.input.setTopOnly?.(true);
      const pointers=this.input.manager?.pointers||[];
      for(const p of pointers){
        if(!p) continue;
        p.isDown=false;
        p.wasTouch=false;
      }
    } catch(_) {}

    super.create();

    this.time.delayedCall(0,()=>{
      try {
        this.input.enabled=true;
        if(this.game?.input) this.game.input.enabled=true;
        const canvas=this.game?.canvas;
        if(canvas) canvas.style.pointerEvents='auto';
      } catch(_) {}
    });

    if(window.__tdrIosSafeMode===true){
      this.events.once('shutdown',()=>{
        for(const [key] of TUTORIALS){
          try{if(this.textures?.exists?.(key))this.textures.remove(key);}catch{}
        }
      });
    }
  }

  _openDroppingTutorial(startIndex=0){
    const missing=TUTORIALS.filter(([key])=>!this.textures.exists(key));
    if(!missing.length){
      super._openDroppingTutorial(startIndex);
      return;
    }

    if(this._dropTutorialLoading)return;
    this._dropTutorialLoading=true;

    const wait=this.add.text(this.scale.width/2,this.scale.height/2,'Cargando tutorial…',{
      fontFamily:'system-ui, -apple-system, Segoe UI, Arial',
      fontSize:'14px',fontStyle:'bold',color:'#ffffff',
      backgroundColor:'#071018',padding:{x:14,y:9}
    }).setOrigin(.5).setDepth(12000);

    for(const [key,url] of missing)this.load.image(key,url);
    this.load.once('complete',()=>{
      this._dropTutorialLoading=false;
      try{wait.destroy();}catch{}
      if(this.sys?.isActive?.())super._openDroppingTutorial(startIndex);
    });
    this.load.once('loaderror',()=>{});
    this.load.start();
  }
}
