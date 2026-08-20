import { EnvironmentBuilderScene as Current } from './EnvironmentBuilderLargeTrackFitScene.js';

const CATS=['TODOS','VEGETACIÓN','BARRERAS','PROPS','ESTRUCTURAS'];

export class EnvironmentBuilderScene extends Current{
  _setupUi(){super._setupUi();this._installLibraryButton();}
  _setupInput(){
    super._setupInput();
    this.input.on('pointerdown',p=>{
      if(this._mode!=='place-asset'||!this._placingAsset||!this._inside?.(p))return;
      const w=this._editCam.getWorldPoint(p.x,p.y),a=this._placingAsset;
      this._placingAsset=null;this._mode='select';this._spawn(a,{x:w.x,y:w.y});
      this._flash?.(`COLOCADO · ${a.id.replaceAll('_',' ')}`);
      this._placeHint?.setText('Abre la biblioteca para elegir una pieza').setColor('#93a6ba');
    });
  }

  _installLibraryButton(){
    const {width}=this.scale,rx=width-this._right,y=this._top+8;
    const cover=this.add.rectangle(rx,y,this._right,142,0x0f1422,1).setOrigin(0).setInteractive().setDepth(60500);
    const title=this.add.text(rx+14,y+10,'ASSETS',{fontFamily:'system-ui',fontSize:'16px',fontStyle:'bold',color:'#c7d2ff'}).setDepth(60502);
    const b=this.add.rectangle(rx+14,y+42,this._right-28,42,0x173226,1).setOrigin(0).setStrokeStyle(2,0x2bff88,.95).setInteractive({useHandCursor:true}).setDepth(60501);
    const t=this.add.text(rx+this._right/2,y+63,'＋ AÑADIR ASSET',{fontFamily:'system-ui',fontSize:'12px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(60502);
    this._placeHint=this.add.text(rx+14,y+94,'Abre la biblioteca para elegir una pieza',{fontFamily:'system-ui',fontSize:'9px',color:'#93a6ba'}).setDepth(60502);
    this._editCam?.ignore([cover,title,b,t,this._placeHint]);
    b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._openAssetLibrary();});
  }

  _allAssets(){
    const out=[];
    for(const cat of CATS.slice(1)){
      for(const a of this._catalogItemsForCategory?.(cat)||[])out.push({...a,cat:a.cat||cat});
    }
    const seen=new Set();
    return out.filter(a=>a?.id&&!seen.has(a.id)&&(seen.add(a.id),true));
  }

  _openAssetLibrary(cat='TODOS'){
    this._closeAssetLibrary();

    const {width,height}=this.scale;
    const pw=Math.min(920,width-80),ph=Math.min(570,height-52),px=(width-pw)/2,py=(height-ph)/2;
    const root=this.add.container(0,0).setDepth(90000);
    const block=this.add.rectangle(0,0,width,height,0x000000,.72).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(px,py,pw,ph,0x0b1422,1).setOrigin(0).setStrokeStyle(2,0x2bff88,.95).setInteractive();
    const title=this.add.text(px+22,py+15,'BIBLIOTECA DE ASSETS',{fontFamily:'system-ui',fontSize:'19px',fontStyle:'bold',color:'#fff'});
    const hint=this.add.text(px+22,py+43,'Elige una pieza y después toca el mapa para colocarla',{fontFamily:'system-ui',fontSize:'10px',color:'#9fb0c5'});
    const close=this.add.text(px+pw-30,py+10,'×',{fontFamily:'system-ui',fontSize:'28px',fontStyle:'bold',color:'#fff'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    root.add([block,panel,title,hint,close]);

    let tx=px+22;
    for(const c of CATS){
      const w=c==='ESTRUCTURAS'?108:c==='VEGETACIÓN'?104:c==='BARRERAS'?92:c==='TODOS'?72:70;
      const b=this.add.rectangle(tx,py+68,w,30,c===cat?0x19462f:0x172034,1).setOrigin(0).setStrokeStyle(1,c===cat?0x2bff88:0x425575,.95).setInteractive({useHandCursor:true});
      const tt=this.add.text(tx+w/2,py+83,c,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      b.on('pointerup',p=>{p?.event?.stopPropagation?.();this._openAssetLibrary(c);});
      root.add([b,tt]);tx+=w+8;
    }

    const vp={x:px+22,y:py+112,w:pw-44,h:ph-132};
    const list=this.add.container(0,0);root.add(list);
    const all=this._allAssets();
    const items=cat==='TODOS'?all:all.filter(a=>a.cat===cat);
    const cols=4,gap=12,ch=122,cw=(vp.w-gap*(cols-1))/cols;

    let drag=null;
    this._libDragged=false;

    const chooseAsset=a=>{
      if(!a)return;
      this._placingAsset=a;
      this._mode='place-asset';
      this._closeAssetLibrary();
      this._placeHint?.setText(`COLOCAR: ${a.id.replaceAll('_',' ')} · toca el mapa`).setColor('#6dffad');
      this._flash?.('TOCA EL MAPA PARA COLOCAR');
    };

    items.forEach((a,i)=>{
      const col=i%cols,row=Math.floor(i/cols),x=vp.x+col*(cw+gap),y=vp.y+row*(ch+gap);
      const bg=this.add.rectangle(x,y,cw,ch,0x151f31,1).setOrigin(0).setStrokeStyle(1,0x344563,.95);
      const img=this.add.image(x+cw/2,y+47,`env:${a.id}`);
      img.setScale(Math.min((cw-28)/(img.width||1),68/(img.height||1)));
      const lab=this.add.text(x+cw/2,y+89,a.id.replace(/_01$/,'').replaceAll('_',' '),{fontFamily:'system-ui',fontSize:'9px',color:'#fff',align:'center',wordWrap:{width:cw-12}}).setOrigin(.5,0);
      list.add([bg,img,lab]);
    });

    const rows=Math.ceil(items.length/cols);
    const min=Math.min(0,vp.h-Math.max(vp.h,rows*(ch+gap)-gap));
    let off=0;
    const apply=()=>{list.y=off;};

    const mg=this.make.graphics({x:0,y:0,add:false});
    mg.fillStyle(0xffffff);mg.fillRect(vp.x,vp.y,vp.w,vp.h);
    list.setMask(mg.createGeometryMask());

    const insideVp=p=>p&&p.x>=vp.x&&p.x<=vp.x+vp.w&&p.y>=vp.y&&p.y<=vp.y+vp.h;
    const insidePanel=p=>p&&p.x>=px&&p.x<=px+pw&&p.y>=py&&p.y<=py+ph;

    const assetAtPointer=p=>{
      if(!insideVp(p))return null;
      const localX=p.x-vp.x;
      const localY=p.y-vp.y-off;
      if(localX<0||localY<0)return null;
      const col=Math.floor(localX/(cw+gap));
      const row=Math.floor(localY/(ch+gap));
      if(col<0||col>=cols||row<0)return null;
      const inCardX=localX-col*(cw+gap);
      const inCardY=localY-row*(ch+gap);
      if(inCardX<0||inCardX>cw||inCardY<0||inCardY>ch)return null;
      return items[row*cols+col]||null;
    };

    const down=p=>{
      if(!insideVp(p))return;
      drag={y:p.y,start:off,asset:assetAtPointer(p)};
      this._libDragged=false;
    };
    const move=p=>{
      if(!drag||!p.isDown)return;
      const d=p.y-drag.y;
      if(Math.abs(d)>7)this._libDragged=true;
      off=Math.max(min,Math.min(0,drag.start+d));
      apply();
    };
    const up=p=>{
      const d=drag;
      const dragged=this._libDragged;
      drag=null;
      if(!dragged&&d&&insideVp(p)){
        const a=assetAtPointer(p);
        if(a&&a===d.asset){
          p?.event?.stopPropagation?.();
          chooseAsset(a);
          return;
        }
      }
      if(dragged)this.time.delayedCall(90,()=>{this._libDragged=false;});
      else this._libDragged=false;
    };
    const wheel=(p,_g,_x,dy)=>{
      if(!insideVp(p))return;
      off=Math.max(min,Math.min(0,off-dy*.7));
      apply();
    };

    this.input.on('pointerdown',down);
    this.input.on('pointermove',move);
    this.input.on('pointerup',up);
    this.input.on('pointerupoutside',up);
    this.input.on('wheel',wheel);

    root.once('destroy',()=>{
      this.input.off('pointerdown',down);
      this.input.off('pointermove',move);
      this.input.off('pointerup',up);
      this.input.off('pointerupoutside',up);
      this.input.off('wheel',wheel);
      try{mg.destroy();}catch{}
    });

    close.on('pointerup',p=>{p?.event?.stopPropagation?.();this._closeAssetLibrary();});
    panel.on('pointerup',p=>p?.event?.stopPropagation?.());
    block.on('pointerup',p=>{
      if(this._libDragged)return;
      if(insidePanel(p))return;
      this._closeAssetLibrary();
    });

    this._assetLibraryRoot=root;
    apply();

    const cam=this.cameras.add(0,0,width,height,false,'environment-builder-asset-library');
    cam.setScroll(0,0).setZoom(1);
    const keep=new Set([root,...(root.list||[]),list,...(list.list||[])]);
    const ignored=(this.children?.list||[]).filter(o=>!keep.has(o));
    if(ignored.length)cam.ignore(ignored);
    this._editCam?.ignore(root);
    this._assetLibraryCamera=cam;
  }

  _closeAssetLibrary(){
    if(this._assetLibraryCamera){
      try{this.cameras.remove(this._assetLibraryCamera);}catch{}
      this._assetLibraryCamera=null;
    }
    if(this._assetLibraryRoot){
      try{this._assetLibraryRoot.destroy(true);}catch{}
      this._assetLibraryRoot=null;
    }
  }
}
