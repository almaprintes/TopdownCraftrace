import { MenuScene as CurrentMenuScene } from './MenuTrackNameFitScene.js';

export class MenuScene extends CurrentMenuScene {
  renderUI(){
    super.renderUI();
    this._renderFactoryButton();
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
    g.fillStyle(0x07131b,.98);g.lineStyle(2,0x38ff9b,.82);
    const hw=w/2,hh=h/2,c=13;
    g.beginPath();g.moveTo(-hw+c,-hh);g.lineTo(hw-c,-hh);g.lineTo(hw,-hh+c);g.lineTo(hw,hh-c);g.lineTo(hw-c,hh);g.lineTo(-hw+c,hh);g.lineTo(-hw,hh-c);g.lineTo(-hw,-hh+c);g.closePath();g.fillPath();g.strokePath();
    g.lineStyle(1,0xffffff,.08);g.strokeRect(-hw+6,-hh+6,w-12,h-12);
    g.fillStyle(0x38ff9b,.28);g.fillRect(-hw+14,-hh+8,w-28,3);
    root.add(g);

    const hit=this.add.rectangle(0,0,w,h,0x000000,0).setInteractive({useHandCursor:true});
    const icon=this.add.text(-64,0,'⚙',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'25px',color:'#62ffb2'}).setOrigin(.5);
    const text=this.add.text(14,0,'FACTORY',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'21px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([hit,icon,text]);

    hit.on('pointerover',()=>{g.clear();g.fillStyle(0x103126,.99);g.lineStyle(2,0x62ffb2,.95);g.fillRoundedRect(-hw,-hh,w,h,10);g.strokeRoundedRect(-hw,-hh,w,h,10);});
    hit.on('pointerout',()=>this.renderUI());
    hit.on('pointerup',()=>this.scene.start('upgrade-shop'));
  }
}
