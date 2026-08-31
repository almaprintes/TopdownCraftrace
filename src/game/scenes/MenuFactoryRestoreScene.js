import { MenuScene as CurrentMenuScene } from './MenuTrackNameFitScene.js';

export class MenuScene extends CurrentMenuScene {
  renderUI(){
    super.renderUI();
    this._renderFactoryButton();
    this._prewarmFactoryScene();
  }

  _prewarmFactoryScene(){
    if(this._factoryWarmStarted)return;
    this._factoryWarmStarted=true;
    const warm=()=>{
      try{window.__tdrEnsureScene?.('upgrade-shop');}catch{}
    };
    try{
      this.time?.delayedCall?.(650,warm);
    }catch{
      setTimeout(warm,650);
    }
  }

  _renderFactoryButton(){
    const ui=this._ui;
    const {width,height}=this.scale;
    if(!ui||width<760)return;
    try{this._factoryRestore?.destroy?.(true);}catch{}

    const w=Math.min(280,Math.max(220,width*.19)),h=66,x=width/2,y=height-48;
    const root=this.add.container(x,y).setDepth(520);
    ui.add(root); this._factoryRestore=root;

    const g=this.add.graphics();
    const hw=w/2,hh=h/2,c=13;
    const paint=(hover=false)=>{
      g.clear();
      g.fillStyle(hover?0x103126:0x07131b,.99);
      g.lineStyle(2,hover?0x62ffb2:0x38ff9b,hover ? .95 : .82);
      g.beginPath();g.moveTo(-hw+c,-hh);g.lineTo(hw-c,-hh);g.lineTo(hw,-hh+c);g.lineTo(hw,hh-c);g.lineTo(hw-c,hh);g.lineTo(-hw+c,hh);g.lineTo(-hw,hh-c);g.lineTo(-hw,-hh+c);g.closePath();g.fillPath();g.strokePath();
      g.lineStyle(1,0xffffff,.08);g.strokeRect(-hw+6,-hh+6,w-12,h-12);
      g.fillStyle(0x38ff9b,.28);g.fillRect(-hw+14,-hh+8,w-28,3);
    };
    paint(false); root.add(g);

    const hit=this.add.rectangle(0,0,w,h,0x000000,0).setInteractive({useHandCursor:true});
    const icon=this.add.text(-64,0,'⚙',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'25px',color:'#62ffb2'}).setOrigin(.5);
    const text=this.add.text(14,0,'FACTORY',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'21px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([hit,icon,text]);

    hit.on('pointerover',()=>paint(true));
    hit.on('pointerout',()=>paint(false));
    hit.on('pointerup',()=>this.scene.start('upgrade-shop'));
  }
}
