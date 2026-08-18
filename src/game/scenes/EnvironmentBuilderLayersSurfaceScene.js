import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderFreePanScene.js';

const SURFACE_STYLE={
  asphalt:{label:'ASFALTO',main:0x2b2c2f,edge:0x656a70},
  grass:{label:'CÉSPED',main:0x285936,edge:0x39794a},
  dirt:{label:'TIERRA',main:0x695743,edge:0x806d55},
  gravel:{label:'GRAVA',main:0x77766f,edge:0x97968d}
};

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupWorld(){
    super._setupWorld();
    this._selectionG?.setDepth?.(10000);
  }

  _setupUi(){
    super._setupUi();
    this._surfaceVisual='asphalt';
    this._surfacePaletteRoot=null;
    this._installLayerToolbar();
    this._installSurfacePalette();
  }

  _installLayerToolbar(){
    const {width,height}=this.scale;
    const cx=this._vx+this._vw/2;
    const y=height-49;
    const root=this.add.container(0,0).setDepth(5000);
    this._editCam?.ignore(root);
    root.add(this.add.rectangle(cx,y,430,42,0x07111d,.95).setStrokeStyle(1,0x45dfff,.45));
    root.add(this.add.text(cx-205,y,'CAPAS',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#8fdfff'}).setOrigin(0,.5));
    const defs=[
      ['FONDO',()=>this._layerToBack()],
      ['− CAPA',()=>this._layerDown()],
      ['+ CAPA',()=>this._layerUp()],
      ['FRENTE',()=>this._layerToFront()]
    ];
    let x=cx-145;
    for(const [label,cb] of defs){
      const bg=this.add.rectangle(x,y,76,28,0x132235,.98).setStrokeStyle(1,0x4e6c89,.8).setInteractive({useHandCursor:true});
      const tx=this.add.text(x,y,label,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();cb();});
      root.add([bg,tx]);x+=84;
    }
    this._layerInfo=this.add.text(cx+192,y,'',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#70ffb0'}).setOrigin(1,.5);
    root.add(this._layerInfo);
    this._layerToolbar=root;
  }

  _installSurfacePalette(){
    const x=this._vx+12,y=this._vy+42;
    const root=this.add.container(0,0).setDepth(6000).setVisible(false);
    this._editCam?.ignore(root);
    const w=252,h=214;
    root.add(this.add.rectangle(x,y,w,h,0x08131d,.98).setOrigin(0).setStrokeStyle(1,0xe1b33b,.8));
    root.add(this.add.text(x+14,y+11,'SUPERFICIES',{fontFamily:'system-ui',fontSize:'15px',fontStyle:'bold',color:'#ffd65c'}).setOrigin(0));
    root.add(this.add.text(x+14,y+34,'Arrastra sobre el mapa para crear un tramo',{fontFamily:'system-ui',fontSize:'9px',color:'#b8c3ce'}).setOrigin(0));

    const visuals=['asphalt','grass','dirt','gravel'];
    visuals.forEach((id,i)=>{
      const bx=x+14+(i%2)*112,by=y+61+Math.floor(i/2)*37;
      const bg=this.add.rectangle(bx,by,104,30,0x142231,.98).setOrigin(0).setStrokeStyle(1,SURFACE_STYLE[id].edge,.9).setInteractive({useHandCursor:true});
      const t=this.add.text(bx+52,by+15,SURFACE_STYLE[id].label,{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();this._surfaceVisual=id;this._mode='surface';this._refreshSurfacePalette();this._status?.();});
      root.add([bg,t]);bg._surfaceVisual=id;
    });

    root.add(this.add.text(x+14,y+142,'FÍSICA DEL TRAMO',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#aebdca'}).setOrigin(0));
    const phys=[['ASFALTO','asphalt'],['CÉSPED','grass'],['TIERRA','dirt']];
    phys.forEach(([label,id],i)=>{
      const bx=x+14+i*74,by=y+160;
      const bg=this.add.rectangle(bx,by,68,28,0x142231,.98).setOrigin(0).setStrokeStyle(1,0x526477,.75).setInteractive({useHandCursor:true});
      const t=this.add.text(bx+34,by+14,label,{fontFamily:'system-ui',fontSize:'8px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);
      bg.on('pointerup',p=>{p?.event?.stopPropagation?.();this._surfacePhysics=id;this._refreshSurfacePalette();});
      root.add([bg,t]);bg._surfacePhysics=id;
    });

    const minus=this.add.rectangle(x+14,y+194,54,16,0x142231,.98).setOrigin(0).setInteractive({useHandCursor:true});
    const plus=this.add.rectangle(x+184,y+194,54,16,0x142231,.98).setOrigin(0).setInteractive({useHandCursor:true});
    this._surfaceWidthLabel=this.add.text(x+126,y+202,'',{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#ffd65c'}).setOrigin(.5);
    root.add([minus,plus,this.add.text(x+41,y+202,'ANCHO −',{fontFamily:'system-ui',fontSize:'8px',color:'#fff'}).setOrigin(.5),this.add.text(x+211,y+202,'ANCHO +',{fontFamily:'system-ui',fontSize:'8px',color:'#fff'}).setOrigin(.5),this._surfaceWidthLabel]);
    minus.on('pointerup',p=>{p?.event?.stopPropagation?.();this._surfaceWidth=Math.max(40,(this._surfaceWidth||120)-20);this._refreshSurfacePalette();});
    plus.on('pointerup',p=>{p?.event?.stopPropagation?.();this._surfaceWidth=Math.min(400,(this._surfaceWidth||120)+20);this._refreshSurfacePalette();});

    this._surfacePaletteRoot=root;

    // Visible, explicit button: no more hidden meaning behind "ASF".
    const bx=this._vx+8,by=this._vy+8;
    const toggle=this.add.rectangle(bx,by,118,28,0x5a4510,.98).setOrigin(0).setStrokeStyle(1,0xe1b33b,.95).setInteractive({useHandCursor:true}).setDepth(6100);
    const tt=this.add.text(bx+59,by+14,'TERRENOS',{fontFamily:'system-ui',fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setDepth(6101);
    this._editCam?.ignore([toggle,tt]);
    toggle.on('pointerup',p=>{p?.event?.stopPropagation?.();const show=!root.visible;root.setVisible(show);if(show){this._mode='surface';this._refreshSurfacePalette();}else if(this._mode==='surface'){this._mode='select';}this._status?.();});
  }

  _refreshSurfacePalette(){
    const root=this._surfacePaletteRoot;if(!root)return;
    for(const o of root.list||[]){
      if(o?._surfaceVisual)o.setStrokeStyle(2,o._surfaceVisual===this._surfaceVisual?0x2bff88:SURFACE_STYLE[o._surfaceVisual].edge,o._surfaceVisual===this._surfaceVisual?1:.8);
      if(o?._surfacePhysics)o.setStrokeStyle(2,o._surfacePhysics===this._surfacePhysics?0x2bff88:0x526477,o._surfacePhysics===this._surfacePhysics?1:.7);
    }
    this._surfaceWidthLabel?.setText?.(`ANCHO ${Math.round(this._surfaceWidth||120)}`);
    this._updateSurfaceInfo?.();
  }

  _select(obj){super._select(obj);this._updateLayerInfo();}

  _orderedObjects(){return (this._objects||[]).filter(o=>o?.scene).slice().sort((a,b)=>(a.depth||12)-(b.depth||12));}
  _applyLayerOrder(list){
    const clean=list.filter(o=>o?.scene);
    clean.forEach((o,i)=>o.setDepth(12+i));
    this._objects=clean;
    this._selectionG?.setDepth?.(10000);
    this._drawSelection?.();
    this._updateLayerInfo();
  }
  _layerToFront(){const s=this._selected;if(!s)return;const a=this._orderedObjects().filter(o=>o!==s);a.push(s);this._applyLayerOrder(a);}
  _layerToBack(){const s=this._selected;if(!s)return;const a=this._orderedObjects().filter(o=>o!==s);a.unshift(s);this._applyLayerOrder(a);}
  _layerUp(){const s=this._selected;if(!s)return;const a=this._orderedObjects(),i=a.indexOf(s);if(i<0||i===a.length-1)return;[a[i],a[i+1]]=[a[i+1],a[i]];this._applyLayerOrder(a);}
  _layerDown(){const s=this._selected;if(!s)return;const a=this._orderedObjects(),i=a.indexOf(s);if(i<=0)return;[a[i],a[i-1]]=[a[i-1],a[i]];this._applyLayerOrder(a);}
  _updateLayerInfo(){
    if(!this._layerInfo)return;const a=this._orderedObjects(),i=this._selected?a.indexOf(this._selected):-1;
    this._layerInfo.setText(i>=0?`${i+1}/${a.length}`:'SIN SEL.');
  }

  _spawn(a,data=null){
    const obj=super._spawn(a,data);
    if(obj&&Number.isFinite(Number(data?.z)))obj.setDepth(Number(data.z));
    this._selectionG?.setDepth?.(10000);
    this._updateLayerInfo();
    return obj;
  }

  _addSurface(a,b,width,physics,data=null){
    const visual=data?.visual||this._surfaceVisual||'asphalt';
    const s={x1:a.x,y1:a.y,x2:b.x,y2:b.y,width,visual,physics};
    this._surfaces.push(s);this._redrawSurfaces();
  }

  _redrawSurfaces(){
    this._surfaceG.clear();
    for(const s of this._surfaces){
      const st=SURFACE_STYLE[s.visual]||SURFACE_STYLE.asphalt;
      this._surfaceG.lineStyle(s.width,st.main,.98);this._surfaceG.lineBetween(s.x1,s.y1,s.x2,s.y2);
      this._surfaceG.lineStyle(Math.max(2,Math.min(5,s.width*.025)),st.edge,.9);this._surfaceG.lineBetween(s.x1,s.y1,s.x2,s.y2);
    }
  }

  _project(){
    const p=super._project();
    p.version=2;
    const byObject=this._objects.filter(o=>o?.scene);
    p.environment=(p.environment||[]).map((d,i)=>({...d,z:Number(byObject[i]?.depth)||12}));
    return p;
  }

  _applyProject(p){
    super._applyProject(p);
    const env=p?.environment||[];
    (this._objects||[]).forEach((o,i)=>o?.setDepth?.(Number(env[i]?.z)||12+i));
    this._selectionG?.setDepth?.(10000);
    this._updateLayerInfo();
  }
}
