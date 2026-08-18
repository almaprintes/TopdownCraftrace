import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderRealTrackScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupUi(){
    super._setupUi();

    // Hide the old floating layer toolbar; its actions are preserved below.
    this._layerToolbar?.setVisible?.(false);

    this._installCleanTopBar();
    this._installRightLayerPanel();
  }

  _uiTopBtn(x,y,w,label,cb,accent=0x3c4e7a){
    const bg=this.add.rectangle(x,y,w,34,0x172034,1)
      .setOrigin(0)
      .setStrokeStyle(1,accent,.95)
      .setInteractive({useHandCursor:true})
      .setDepth(22002);
    const tx=this.add.text(x+w/2,y+17,label,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:'11px',fontStyle:'bold',color:'#fff'
    }).setOrigin(.5).setDepth(22003);
    this._editCam?.ignore([bg,tx]);
    bg.on('pointerup',p=>{p?.event?.stopPropagation?.();cb?.();});
    return {b:bg,t:tx};
  }

  _installCleanTopBar(){
    const {width}=this.scale;
    const usableRight=width-this._right;

    // Opaque replacement bar hides all previous overlapping top controls.
    const cover=this.add.rectangle(0,0,width,this._top,0x101626,1)
      .setOrigin(0).setDepth(22000);
    this._editCam?.ignore(cover);

    const title=this.add.text(18,17,'ENVIRONMENT BUILDER',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:'22px',fontStyle:'bold',color:'#fff'
    }).setDepth(22003);
    this._editCam?.ignore(title);

    let x=Math.min(260,Math.max(220,usableRight*.28));
    this._uiTopBtn(x,12,72,'GUARDAR',()=>this._save());x+=78;
    this._uiTopBtn(x,12,70,'CARGAR',()=>this._load());x+=76;
    this._uiTopBtn(x,12,78,'EXPORTAR',()=>this._export());

    const navW=Math.min(300,Math.max(220,usableRight*.30));
    const navX=Math.max(x+92,usableRight-navW-10);
    this._uiTopBtn(navX,12,34,'‹',()=>this._cycleTrack(-1),0x2bff88);
    this._cleanTrackBtn=this._uiTopBtn(navX+38,12,navW-76,this._realTrack?.name||this._trackId,()=>this._cycleTrack(1),0x2bff88);
    this._uiTopBtn(navX+navW-34,12,34,'›',()=>this._cycleTrack(1),0x2bff88);
  }

  _installRightLayerPanel(){
    const {width,height}=this.scale;
    const rx=width-this._right+14;
    const selectionY=height-174;
    const panelY=selectionY-58;
    const panelW=this._right-28;

    const bg=this.add.rectangle(rx,panelY,panelW,50,0x0b1624,.98)
      .setOrigin(0)
      .setStrokeStyle(1,0x45dfff,.55)
      .setDepth(21000);
    const title=this.add.text(rx+8,panelY+5,'CAPAS',{
      fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#8fdfff'
    }).setDepth(21002);
    this._editCam?.ignore([bg,title]);

    const defs=[
      ['FONDO',()=>this._layerToBack()],
      ['− CAPA',()=>this._layerDown()],
      ['+ CAPA',()=>this._layerUp()],
      ['FRENTE',()=>this._layerToFront()]
    ];
    const gap=5;
    const bw=(panelW-gap*3)/4;
    defs.forEach(([label,cb],i)=>{
      const x=rx+i*(bw+gap),y=panelY+20;
      const b=this.add.rectangle(x,y,bw,24,0x17263a,.98)
        .setOrigin(0)
        .setStrokeStyle(1,0x4e6c89,.9)
        .setInteractive({useHandCursor:true})
        .setDepth(21001);
      const t=this.add.text(x+bw/2,y+12,label,{
        fontFamily:'system-ui',fontSize:'8px',fontStyle:'bold',color:'#fff'
      }).setOrigin(.5).setDepth(21002);
      this._editCam?.ignore([b,t]);
      b.on('pointerup',p=>{p?.event?.stopPropagation?.();cb();});
    });

    this._cleanLayerInfo=this.add.text(rx+panelW-6,panelY+6,'SIN SEL.',{
      fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#70ffb0'
    }).setOrigin(1,0).setDepth(21003);
    this._editCam?.ignore(this._cleanLayerInfo);
    this._updateLayerInfo();
  }

  _refreshTrackButton(){
    super._refreshTrackButton?.();
    this._cleanTrackBtn?.t?.setText?.(this._realTrack?.name||this._trackId);
  }

  _updateLayerInfo(){
    super._updateLayerInfo?.();
    if(!this._cleanLayerInfo)return;
    const a=this._orderedObjects?.()||[];
    const i=this._selected?a.indexOf(this._selected):-1;
    this._cleanLayerInfo.setText(i>=0?`${i+1}/${a.length}`:'SIN SEL.');
  }
}
