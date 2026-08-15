import Phaser from 'phaser';
import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageGeneratedPreviewScene.js';
import { pxToMeters } from '../cars/speedUnits.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function pts(track){return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:+p[0],y:+p[1]}:{x:+p?.x,y:+p?.y}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function lengthWorld(track){const direct=Number(track?.length??track?.trackLength??track?.meta?.length??track?.meta?.trackLength);if(Number.isFinite(direct)&&direct>0)return direct;const p=pts(track);let d=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];d+=Math.hypot(b.x-a.x,b.y-a.y);}return d;}
function lengthM(track){return Math.round(pxToMeters(lengthWorld(track)));}
function widthM(track){const raw=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160);return pxToMeters(Number.isFinite(raw)?raw:160);}
function sectors(track){const n=Number(track?.sectors);if(Number.isFinite(n)&&n>0)return Math.round(n);const c=track?.checkpointFractions;return Array.isArray(c)?Math.max(1,c.length+1):3;}
function surface(track){return String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||'Asfalto');}

export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor(){
    super();
    this._trackList=null;this._trackItems=[];this._trackScrollY=0;this._trackMinScroll=0;this._trackViewport=null;this._trackListTopY=0;
    this._dragTrackList=false;this._dragTrackStartY=0;this._dragTrackStartScroll=0;
  }

  create(){
    super.create();
    this.input.off('wheel',this._onTrackWheel,this);
    this.input.off('pointerdown',this._onTrackDown,this);
    this.input.off('pointermove',this._onTrackMove,this);
    this.input.off('pointerup',this._onTrackUp,this);
    this.input.off('pointerupoutside',this._onTrackUp,this);
    this.events.once('shutdown',()=>{
      this.input.off('wheel',this._onTrackWheel,this);
      this.input.off('pointerdown',this._onTrackDown,this);
      this.input.off('pointermove',this._onTrackMove,this);
      this.input.off('pointerup',this._onTrackUp,this);
      this.input.off('pointerupoutside',this._onTrackUp,this);
    });
  }

  _buildCommercial(){
    const W=this.scale.width,H=this.scale.height;if(!this._tracks?.length)return;
    const root=this.add.container(0,0).setDepth(10000);this._commercial=root;
    const g=this.add.graphics();root.add(g);

    g.fillGradientStyle(0x0a1635,0x10285f,0x07142f,0x0b1a3d,1).fillRect(0,0,W,H);
    g.fillStyle(0x2b7bff,.09).fillEllipse(W*.72,H*.25,W*.50,H*.40);
    g.fillStyle(0x2bff88,.06).fillEllipse(W*.65,H*.78,W*.55,H*.45);
    g.lineStyle(1,0xffffff,.03);for(let x=0;x<=W;x+=54)g.lineBetween(x,0,x,H);for(let y=0;y<=H;y+=54)g.lineBetween(0,y,W,y);

    const isLandscape=W>=H,topSafe=72,pad=clamp(Math.floor(W*.02),14,24),bottomPad=18;
    const leftW=isLandscape?clamp(Math.floor(W*.30),250,380):W-pad*2;
    const rightX=pad+leftW+pad,rightW=isLandscape?W-rightX-pad:W-pad*2;
    const contentY=topSafe,contentH=H-contentY-bottomPad;

    root.add(this.add.text(W/2,16,'CIRCUITOS',{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:isLandscape?'34px':'28px',fontStyle:'900',color:'#fff',stroke:'#091a42',strokeThickness:8}).setOrigin(.5,0));
    root.add(this.add.text(W-16,20,this._mode==='admin'?'ADMIN':'PLAYER',{fontFamily:'system-ui',fontSize:'14px',color:'#fff',stroke:'#091a42',strokeThickness:5}).setOrigin(1,0));
    const backHit=this.add.rectangle(12,12,64,64,0,0.001).setOrigin(0).setDepth(10002).setInteractive({useHandCursor:true});root.add(backHit);
    root.add(this.add.text(16,16,'⬅',{fontFamily:'system-ui',fontSize:'28px',color:'#fff',stroke:'#091a42',strokeThickness:7}).setOrigin(0).setDepth(10003));
    backHit.on('pointerup',()=>this.scene.start(this._mode==='admin'?'admin-hub':'menu'));

    g.fillStyle(0x0b1020,.40).fillRoundedRect(pad,contentY,leftW,contentH,24);g.lineStyle(2,0xb7c0ff,.16).strokeRoundedRect(pad,contentY,leftW,contentH,24);
    root.add(this.add.text(pad+18,contentY+14,'COLECCIÓN',{fontFamily:'system-ui',fontSize:'16px',fontStyle:'bold',color:'#fff'}));

    const listX=pad+12,listY=contentY+46,listW=leftW-24,listH=contentH-58;
    this._trackViewport=new Phaser.Geom.Rectangle(listX,listY,listW,listH);this._trackListTopY=listY;
    const maskGfx=this.make.graphics({x:0,y:0,add:false});maskGfx.fillStyle(0xffffff).fillRect(listX,listY,listW,listH);const mask=maskGfx.createGeometryMask();
    this._trackList=this.add.container(0,listY).setMask(mask);root.add(this._trackList);this._trackItems=[];
    const itemH=isLandscape?104:98,itemGap=12;let cy=0;
    this._tracks.forEach((t,i)=>{const item=this._trackItem(listX,cy,listW,itemH,t,i);this._trackItems.push(item);cy+=itemH+itemGap;});
    this._trackMinScroll=Math.min(0,listH-(cy-itemGap));
    const desired=-Math.max(0,this._index-2)*(itemH+itemGap);this._setTrackScroll(clamp(desired,this._trackMinScroll,0));

    this._onTrackWheel=(_p,_g,_dx,dy)=>this._setTrackScroll(this._trackScrollY-dy*.75);
    this._onTrackDown=p=>{if(this._trackViewport&&Phaser.Geom.Rectangle.Contains(this._trackViewport,p.x,p.y)){this._dragTrackList=true;this._dragTrackStartY=p.y;this._dragTrackStartScroll=this._trackScrollY;}};
    this._onTrackMove=p=>{if(this._dragTrackList&&p.isDown)this._setTrackScroll(this._dragTrackStartScroll+(p.y-this._dragTrackStartY));};
    this._onTrackUp=()=>{this._dragTrackList=false;};
    this.input.on('wheel',this._onTrackWheel,this);this.input.on('pointerdown',this._onTrackDown,this);this.input.on('pointermove',this._onTrackMove,this);this.input.on('pointerup',this._onTrackUp,this);this.input.on('pointerupoutside',this._onTrackUp,this);

    const heroX=rightX,heroY=contentY,heroH=contentH;
    g.fillStyle(0x0b1020,.40).fillRoundedRect(heroX,heroY,rightW,heroH,24);g.lineStyle(2,0xb7c0ff,.16).strokeRoundedRect(heroX,heroY,rightW,heroH,24);
    this._trackHero(root,g,heroX,heroY,rightW,heroH);
  }

  _trackItem(x,y,w,h,t,i){
    const item=this.add.container(x,y),selected=i===this._index;this._trackList.add(item);
    const bg=this.add.rectangle(0,0,w,h,0x111a33,selected?.82:.50).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.65:.18);
    const accent=this.add.rectangle(0,0,8,h,selected?0x2bff88:0x2b7bff,selected?.95:.70).setOrigin(0);
    const thumbW=92,thumbH=h-18;const thumbBg=this.add.rectangle(14,9,thumbW,thumbH,0x071016,1).setOrigin(0);
    item.add([bg,accent,thumbBg]);
    const key=this._preview(t,320,190);if(key&&this.textures.exists(key)){const im=this.add.image(14+thumbW/2,h/2,key);im.setScale(Math.min((thumbW-8)/im.width,(thumbH-8)/im.height)).setAlpha(selected?1:.78);item.add(im);}
    item.add(this.add.text(120,15,(t.name||t.key).toUpperCase(),{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'15px',fontStyle:'900',color:'#fff'}));
    item.add(this.add.text(120,44,`${String(i+1).padStart(2,'0')} · ${surface(t)}\n${lengthM(t)} m · ${sectors(t)} sectores`,{fontFamily:'system-ui',fontSize:'12px',color:'#b7c0ff',lineSpacing:3}));
    const hit=this.add.rectangle(0,0,w,h,0,0.001).setOrigin(0).setInteractive({useHandCursor:true});item.add(hit);
    let sy=0,drag=false;hit.on('pointerdown',p=>{sy=p.y;drag=false;});hit.on('pointermove',p=>{if(Math.abs(p.y-sy)>10)drag=true;});hit.on('pointerup',()=>{if(drag)return;this._index=i;this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();});
    return {item,bg,hit};
  }

  _setTrackScroll(y){this._trackScrollY=clamp(y,this._trackMinScroll,0);if(this._trackList)this._trackList.y=this._trackListTopY+this._trackScrollY;}

  _trackHero(root,g,x,y,w,h){
    const t=this._tracks[this._index],pad=26;
    root.add(this.add.text(x+w*.58,y+22,(t.name||t.key).toUpperCase(),{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:`${Math.max(24,Math.min(40,w*.045))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5,0));
    root.add(this.add.text(x+w*.58,y+70,`${surface(t).toUpperCase()} · ${sectors(t)} SECTORES`,{fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',color:'#2bff88'}).setOrigin(.5,0));

    const infoW=Math.max(190,Math.min(240,w*.28)),imageX=x+infoW+18,imageW=w-infoW-36;
    const previewTop=y+108,previewH=Math.max(190,h-210);
    g.fillStyle(0x071016,.72).fillRoundedRect(imageX,previewTop,imageW,previewH,16);g.lineStyle(1,0xb7c0ff,.12).strokeRoundedRect(imageX,previewTop,imageW,previewH,16);
    const key=this._preview(t,1400,850);if(key&&this.textures.exists(key)){const im=this.add.image(imageX+imageW/2,previewTop+previewH/2,key);im.setScale(Math.min((imageW-24)/im.width,(previewH-24)/im.height));root.add(im);}

    const infoX=x+pad,infoY=y+118;
    root.add(this.add.text(infoX,infoY,'DATOS DEL CIRCUITO',{fontFamily:'system-ui',fontSize:'14px',fontStyle:'bold',color:'#fff'}));
    const rows=[['LONGITUD',`${lengthM(t)} m`],['SECTORES',String(sectors(t))],['SUPERFICIE',surface(t)],['ANCHO PISTA',`${widthM(t).toFixed(1)} m`]];
    rows.forEach((r,i)=>{const yy=infoY+42+i*66;root.add(this.add.text(infoX,yy,r[0],{fontFamily:'system-ui',fontSize:'11px',fontStyle:'bold',color:'#8fa0aa'}));root.add(this.add.text(infoX,yy+20,r[1],{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'18px',fontStyle:'900',color:'#fff'}));});

    const btnY=y+h-78,selectW=Math.min(300,w*.33),backW=190;
    const select=this.add.rectangle(x+w-selectW-24,btnY,selectW,54,0x2bff88,.95).setOrigin(0).setStrokeStyle(2,0x7dffc1,.75).setInteractive({useHandCursor:true});root.add(select);
    root.add(this.add.text(x+w-selectW/2-24,btnY+27,this._mode==='admin'?'EDITAR':'SELECCIONAR',{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'16px',fontStyle:'900',color:'#08131b'}).setOrigin(.5));
    select.on('pointerup',()=>this._launchSelected());
    const back=this.add.rectangle(x+24,btnY,backW,54,0x141b33,.9).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.22).setInteractive({useHandCursor:true});root.add(back);
    root.add(this.add.text(x+24+backW/2,btnY+27,'VOLVER',{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'15px',fontStyle:'900',color:'#fff'}).setOrigin(.5));
    back.on('pointerup',()=>this.scene.start(this._mode==='admin'?'admin-hub':'menu'));
  }
}
