import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderModalCameraScene.js';
import { createTrack } from '../tracks/trackRegistry.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  create(){
    super.create();
    this._ensureRealTrackVisible();
    this.time.delayedCall(30,()=>{ this._ensureRealTrackVisible(); this._drawRealTrack?.(); this._fitRealTrack?.(); });
  }

  _setupUi(){
    super._setupUi();
    this._ensureRealTrackVisible();
  }

  _ensureRealTrackVisible(){
    if(!this._editCam)return;
    for(const o of [this._realTrackG,this._realTrackMarkG]){
      if(!o)continue;
      try{ this._editCam.removeFromRenderList?.(o); }catch{}
      try{ this.cameras.main.ignore?.(o); }catch{}
    }
  }

  _openRealTrack(trackId,resetProject=true){
    super._openRealTrack(trackId,resetProject);
    this._ensureRealTrackVisible();
    this.time.delayedCall(0,()=>{ this._ensureRealTrackVisible(); this._drawRealTrack?.(); this._fitRealTrack?.(); });
  }

  _openTrackPicker(){
    this._closeTrackPicker();
    this._destroyModalCamera?.();

    const {width,height}=this.scale;
    const keys=this._trackKeys||[];
    const root=this.add.container(0,0).setDepth(50000);
    const panelW=Math.min(650,width-90),panelH=Math.min(470,height-70);
    const px=(width-panelW)/2,py=(height-panelH)/2;

    const blocker=this.add.rectangle(0,0,width,height,0x000000,.68).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(px,py,panelW,panelH,0x0b1422,1).setOrigin(0).setStrokeStyle(2,0x2bff88,.9);
    const title=this.add.text(px+22,py+16,'ABRIR CIRCUITO REAL',{fontFamily:'system-ui',fontSize:'18px',fontStyle:'bold',color:'#fff'});
    const hint=this.add.text(px+22,py+43,'Desliza para ver todos los circuitos del juego',{fontFamily:'system-ui',fontSize:'10px',color:'#9fb0c5'});
    const close=this.add.text(px+panelW-30,py+12,'×',{fontFamily:'system-ui',fontSize:'26px',fontStyle:'bold',color:'#fff'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    root.add([blocker,panel,title,hint,close]);

    const viewport={x:px+18,y:py+70,w:panelW-36,h:panelH-88};
    const list=this.add.container(0,0);
    root.add(list);

    const cols=2,gapX=18,gapY=10,cardH=52;
    const cardW=(viewport.w-gapX)/2;
    keys.forEach((key,i)=>{
      const col=i%cols,row=Math.floor(i/cols);
      const x=viewport.x+col*(cardW+gapX),y=viewport.y+row*(cardH+gapY);
      let track=null;try{track=createTrack(key);}catch{}
      const active=key===this._trackId;
      const bg=this.add.rectangle(x,y,cardW,cardH,active?0x173b2a:0x172034,1).setOrigin(0)
        .setStrokeStyle(1,active?0x2bff88:0x3c4e7a,.95).setInteractive({useHandCursor:true});
      const name=this.add.text(x+12,y+9,track?.name||key,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#fff'});
      const id=this.add.text(x+12,y+29,key,{fontFamily:'system-ui',fontSize:'8px',color:'#92a5bd'});
      bg._trackKey=key;
      bg.on('pointerup',p=>{
        if(this._pickerDragged)return;
        p?.event?.stopPropagation?.();
        this._chooseRealTrack(key);
      });
      list.add([bg,name,id]);
    });

    const rows=Math.ceil(keys.length/cols);
    const contentH=Math.max(viewport.h,rows*(cardH+gapY)-gapY);
    const minOffset=Math.min(0,viewport.h-contentH);
    let offset=0;
    const applyOffset=()=>{
      list.y=offset;
      for(const o of list.list||[]){
        if(!o?._trackKey)continue;
        const top=o.y+offset,bottom=top+cardH;
        if(o.input)o.input.enabled=bottom>viewport.y&&top<viewport.y+viewport.h;
      }
    };

    const maskG=this.make.graphics({x:0,y:0,add:false});
    maskG.fillStyle(0xffffff);maskG.fillRect(viewport.x,viewport.y,viewport.w,viewport.h);
    const mask=maskG.createGeometryMask();
    list.setMask(mask);

    const wheel=(pointer,_gos,_dx,dy)=>{
      if(pointer.x<viewport.x||pointer.x>viewport.x+viewport.w||pointer.y<viewport.y||pointer.y>viewport.y+viewport.h)return;
      offset=Math.max(minOffset,Math.min(0,offset-dy*.75));applyOffset();
    };
    this.input.on('wheel',wheel);

    let drag=null;
    const down=p=>{
      if(p.x<viewport.x||p.x>viewport.x+viewport.w||p.y<viewport.y||p.y>viewport.y+viewport.h)return;
      drag={y:p.y,start:offset};this._pickerDragged=false;
    };
    const move=p=>{
      if(!drag||!p.isDown)return;
      const d=p.y-drag.y;if(Math.abs(d)>5)this._pickerDragged=true;
      offset=Math.max(minOffset,Math.min(0,drag.start+d));applyOffset();
    };
    const up=()=>{drag=null;this.time.delayedCall(0,()=>{this._pickerDragged=false;});};
    this.input.on('pointerdown',down);this.input.on('pointermove',move);this.input.on('pointerup',up);

    const cleanup=()=>{
      this.input.off('wheel',wheel);this.input.off('pointerdown',down);this.input.off('pointermove',move);this.input.off('pointerup',up);
      try{maskG.destroy();}catch{}
    };
    root.once('destroy',cleanup);

    close.on('pointerup',p=>{p?.event?.stopPropagation?.();this._closeTrackPicker();});
    blocker.on('pointerup',()=>this._closeTrackPicker());

    this._trackPicker=root;
    applyOffset();

    const cam=this.cameras.add(0,0,width,height,false,'environment-builder-modal-scroll');
    cam.setScroll(0,0).setZoom(1).setBackgroundColor('rgba(0,0,0,0)');
    const keep=new Set([root,...(root.list||[]),list,...(list.list||[])]);
    const ignored=(this.children?.list||[]).filter(obj=>!keep.has(obj));
    if(ignored.length)cam.ignore(ignored);
    this._editCam?.ignore?.(root);
    this._modalCamera=cam;
  }
}
