import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderOpenTrackScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _installFinalTopBar(){
    const {width}=this.scale;
    const usableRight=width-this._right;
    const y=12,h=34,gap=8;

    // One opaque bar, one coordinate system. Nothing inherited can show through it.
    const cover=this.add.rectangle(0,0,width,this._top,0x101626,1)
      .setOrigin(0).setDepth(40000);
    this._editCam?.ignore(cover);

    const titleW=Math.min(330,Math.max(255,usableRight*.27));
    const title=this.add.text(18,17,'ENVIRONMENT BUILDER',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',
      fontSize:'19px',fontStyle:'bold',color:'#fff'
    }).setDepth(40003);
    this._editCam?.ignore(title);

    const make=(x,w,label,cb,accent=0x3c4e7a)=>{
      const bg=this.add.rectangle(x,y,w,h,0x172034,1).setOrigin(0)
        .setStrokeStyle(1,accent,.95).setInteractive({useHandCursor:true}).setDepth(40002);
      const tx=this.add.text(x+w/2,y+h/2,label,{
        fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#fff'
      }).setOrigin(.5).setDepth(40003);
      this._editCam?.ignore([bg,tx]);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();cb?.();});
      return {b:bg,t:tx};
    };

    let x=titleW+28;
    const actionW=78;
    make(x,actionW,'GUARDAR',()=>this._save());x+=actionW+gap;
    make(x,actionW,'CARGAR',()=>this._load());x+=actionW+gap;
    make(x,86,'EXPORTAR',()=>this._export());x+=86+gap;

    const openW=118;
    make(x,openW,'ABRIR CIRCUITO',()=>this._openTrackPicker(),0xe1b33b);x+=openW+gap;

    const trackW=Math.max(150,usableRight-x-10);
    const trackBg=this.add.rectangle(x,y,trackW,h,0x10251f,1).setOrigin(0)
      .setStrokeStyle(1,0x2bff88,.95).setDepth(40002);
    this._headerTrackText=this.add.text(x+trackW/2,y+h/2,this._realTrack?.name||this._trackId,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#dfffee'
    }).setOrigin(.5).setDepth(40003);
    this._editCam?.ignore([trackBg,this._headerTrackText]);

    this._finalTrackBtn=null;
  }

  _refreshTrackButton(){
    super._refreshTrackButton?.();
    this._headerTrackText?.setText?.(this._realTrack?.name||this._trackId);
  }
}
