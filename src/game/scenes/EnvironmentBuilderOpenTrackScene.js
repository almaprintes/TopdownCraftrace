import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderUILayoutScene.js';
import { createTrack } from '../tracks/trackRegistry.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  create(){
    super.create();
    // Repaint after every inherited UI/editor layer has finished creating.
    this.time.delayedCall(40,()=>{this._drawRealTrack?.();this._fitRealTrack?.();});
    this.time.delayedCall(220,()=>this._drawRealTrack?.());
  }

  _setupUi(){
    super._setupUi();
    this._installFinalTopBar();
  }

  _topButton(x,y,w,label,cb,accent=0x3c4e7a){
    const bg=this.add.rectangle(x,y,w,34,0x172034,1).setOrigin(0)
      .setStrokeStyle(1,accent,.95).setInteractive({useHandCursor:true}).setDepth(30002);
    const tx=this.add.text(x+w/2,y+17,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#fff'})
      .setOrigin(.5).setDepth(30003);
    this._editCam?.ignore([bg,tx]);
    bg.on('pointerup',p=>{p?.event?.stopPropagation?.();cb?.();});
    return {b:bg,t:tx};
  }

  _installFinalTopBar(){
    const {width}=this.scale;
    const usableRight=width-this._right;
    const cover=this.add.rectangle(0,0,width,this._top,0x101626,1).setOrigin(0).setDepth(30000);
    this._editCam?.ignore(cover);

    const title=this.add.text(18,17,'ENVIRONMENT BUILDER',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'20px',fontStyle:'bold',color:'#fff'}).setDepth(30003);
    this._editCam?.ignore(title);

    let x=420;
    this._topButton(x,12,76,'GUARDAR',()=>this._save());x+=84;
    this._topButton(x,12,76,'CARGAR',()=>this._load());x+=84;
    this._topButton(x,12,86,'EXPORTAR',()=>this._export());

    const selectorW=Math.min(340,Math.max(270,usableRight*.28));
    const selectorX=usableRight-selectorW-12;
    this._topButton(selectorX,12,42,'‹',()=>this._cycleTrack(-1),0x2bff88);
    this._finalTrackBtn=this._topButton(selectorX+48,12,selectorW-138,this._realTrack?.name||this._trackId,()=>this._openTrackPicker(),0x2bff88);
    this._topButton(selectorX+selectorW-84,12,42,'›',()=>this._cycleTrack(1),0x2bff88);
    this._topButton(selectorX+selectorW-38,12,38,'ABRIR',()=>this._openTrackPicker(),0xe1b33b);
  }

  _refreshTrackButton(){
    super._refreshTrackButton?.();
    this._finalTrackBtn?.t?.setText?.(this._realTrack?.name||this._trackId);
  }

  _openTrackPicker(){
    this._closeTrackPicker();
    const {width,height}=this.scale;
    const keys=this._trackKeys||[];
    const root=this.add.container(0,0).setDepth(32000);
    this._editCam?.ignore(root);
    const panelW=Math.min(560,width-120),panelH=Math.min(420,height-90);
    const px=(width-panelW)/2,py=(height-panelH)/2;
    const blocker=this.add.rectangle(0,0,width,height,0x000000,.55).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(px,py,panelW,panelH,0x0b1422,.99).setOrigin(0).setStrokeStyle(2,0x2bff88,.85);
    const title=this.add.text(px+20,py+16,'ABRIR CIRCUITO REAL',{fontFamily:'system-ui',fontSize:'18px',fontStyle:'bold',color:'#fff'});
    const hint=this.add.text(px+20,py+43,'Selecciona un circuito del registro del juego',{fontFamily:'system-ui',fontSize:'10px',color:'#9fb0c5'});
    const close=this.add.text(px+panelW-28,py+14,'×',{fontFamily:'system-ui',fontSize:'24px',fontStyle:'bold',color:'#fff'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    root.add([blocker,panel,title,hint,close]);
    close.on('pointerup',()=>this._closeTrackPicker());
    blocker.on('pointerup',()=>this._closeTrackPicker());

    const cols=2,cardW=(panelW-58)/2,cardH=52,startY=py+72;
    keys.forEach((key,i)=>{
      const col=i%cols,row=Math.floor(i/cols),x=px+20+col*(cardW+18),y=startY+row*(cardH+10);
      if(y+cardH>py+panelH-18)return;
      let track=null;try{track=createTrack(key);}catch{}
      const active=key===this._trackId;
      const bg=this.add.rectangle(x,y,cardW,cardH,active?0x173b2a:0x172034,1).setOrigin(0)
        .setStrokeStyle(1,active?0x2bff88:0x3c4e7a,.95).setInteractive({useHandCursor:true});
      const name=this.add.text(x+12,y+9,track?.name||key,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#fff'});
      const id=this.add.text(x+12,y+29,key,{fontFamily:'system-ui',fontSize:'8px',color:'#92a5bd'});
      root.add([bg,name,id]);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();this._chooseRealTrack(key);});
    });
    this._trackPicker=root;
  }

  _closeTrackPicker(){
    this._trackPicker?.destroy?.(true);
    this._trackPicker=null;
  }

  _chooseRealTrack(key){
    if(!key)return;
    if(key!==this._trackId&&((this._objects?.length||0)||(this._surfaces?.length||0))){
      const ok=window.confirm?.('Si no has guardado los cambios actuales, se perderán. ¿Abrir otro circuito?');
      if(ok===false)return;
    }
    this._closeTrackPicker();
    this._openRealTrack(key,true);
    this.time.delayedCall(30,()=>{this._drawRealTrack?.();this._fitRealTrack?.();});
    this._flash?.(`ABIERTO · ${this._realTrack?.name||key}`);
  }
}
