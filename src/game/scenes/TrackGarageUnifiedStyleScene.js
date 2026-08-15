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
function isDirt(track){return /dirt|tierra|gravel|grava/i.test(surface(track));}

export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor(){
    super();
    this._trackList=null;this._trackItems=[];this._trackScrollY=0;this._trackMinScroll=0;this._trackViewport=null;this._trackListTopY=0;
    this._trackPointerActive=false;this._trackPointerStartY=0;this._dragTrackStartY=0;this._dragTrackStartScroll=0;this._dragTrackList=false;this._trackVelocity=0;
    this._styledPreviewKeys=new Map();
  }

  create(){
    super.create();
    this.events.on('update',this._updateTrackScroll,this);
    this.events.once('shutdown',()=>{
      this._removeTrackInput();
      this.events.off('update',this._updateTrackScroll,this);
    });
  }

  _removeTrackInput(){
    if(!this.input)return;
    this.input.off('wheel',this._onTrackWheel,this);
    this.input.off('pointerdown',this._onTrackDown,this);
    this.input.off('pointermove',this._onTrackMove,this);
    this.input.off('pointerup',this._onTrackUp,this);
    this.input.off('pointerupoutside',this._onTrackUp,this);
  }

  _buildCommercial(){
    const W=this.scale.width,H=this.scale.height;if(!this._tracks?.length)return;
    this._removeTrackInput();
    const root=this.add.container(0,0).setDepth(10000);this._commercial=root;
    const g=this.add.graphics();root.add(g);

    g.fillGradientStyle(0x0a1635,0x10285f,0x07142f,0x0b1a3d,1).fillRect(0,0,W,H);
    g.fillStyle(0x2b7bff,.09).fillEllipse(W*.72,H*.25,W*.50,H*.40);
    g.fillStyle(0x2bff88,.06).fillEllipse(W*.65,H*.78,W*.55,H*.45);
    g.lineStyle(1,0xffffff,.03);for(let x=0;x<=W;x+=54)g.lineBetween(x,0,x,H);for(let y=0;y<=H;y+=54)g.lineBetween(0,y,W,y);

    const isLandscape=W>=H,topSafe=72,pad=clamp(Math.floor(W*.02),14,24),bottomPad=18;
    const leftW=isLandscape?clamp(Math.floor(W*.30),270,390):W-pad*2;
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
    const itemH=isLandscape?92:94,itemGap=10;let cy=0;
    this._tracks.forEach((t,i)=>{const item=this._trackItem(listX,cy,listW,itemH,t,i);this._trackItems.push(item);cy+=itemH+itemGap;});
    this._trackMinScroll=Math.min(0,listH-(cy-itemGap));
    const desired=-Math.max(0,this._index-2)*(itemH+itemGap);this._setTrackScroll(clamp(desired,this._trackMinScroll,0));

    this._onTrackWheel=(_p,_g,_dx,dy)=>{this._trackVelocity=0;this._setTrackScroll(this._trackScrollY-dy*.72);};
    this._onTrackDown=p=>{
      if(!this._trackViewport||!Phaser.Geom.Rectangle.Contains(this._trackViewport,p.x,p.y)){this._trackPointerActive=false;this._dragTrackList=false;return;}
      this._trackPointerActive=true;this._trackPointerStartY=p.y;this._dragTrackStartY=p.y;this._dragTrackStartScroll=this._trackScrollY;this._trackVelocity=0;this._dragTrackList=false;
    };
    this._onTrackMove=p=>{
      if(!p.isDown||!this._trackPointerActive)return;
      const raw=p.y-this._trackPointerStartY;if(!this._dragTrackList&&Math.abs(raw)>8)this._dragTrackList=true;if(!this._dragTrackList)return;
      this._trackVelocity=(p.velocity?.y||0)*.16;this._setTrackScroll(this._dragTrackStartScroll+(p.y-this._dragTrackStartY));
    };
    this._onTrackUp=()=>{this._trackPointerActive=false;this._dragTrackList=false;};
    this.input.on('wheel',this._onTrackWheel,this);this.input.on('pointerdown',this._onTrackDown,this);this.input.on('pointermove',this._onTrackMove,this);this.input.on('pointerup',this._onTrackUp,this);this.input.on('pointerupoutside',this._onTrackUp,this);

    const heroX=rightX,heroY=contentY,heroH=contentH;
    g.fillStyle(0x0b1020,.40).fillRoundedRect(heroX,heroY,rightW,heroH,24);g.lineStyle(2,0xb7c0ff,.16).strokeRoundedRect(heroX,heroY,rightW,heroH,24);
    this._trackHero(root,g,heroX,heroY,rightW,heroH);
  }

  _trackItem(x,y,w,h,t,i){
    const item=this.add.container(x,y),selected=i===this._index;this._trackList.add(item);
    const bg=this.add.rectangle(0,0,w,h,0x111a33,selected?.82:.50).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.65:.18);
    const accent=this.add.rectangle(0,0,8,h,selected?0x2bff88:0x2b7bff,selected?.95:.70).setOrigin(0);
    const thumbW=86,thumbH=h-14;const thumbBg=this.add.rectangle(14,7,thumbW,thumbH,0x071016,1).setOrigin(0);
    item.add([bg,accent,thumbBg]);
    const key=this._displayPreview(t,360,210);if(key&&this.textures.exists(key)){const im=this.add.image(14+thumbW/2,h/2,key);im.setScale(Math.min((thumbW-6)/im.width,(thumbH-6)/im.height)).setAlpha(selected?1:.82);item.add(im);}
    const tx=112,available=Math.max(100,w-tx-12);
    const name=this.add.text(tx,13,(t.name||t.key).toUpperCase(),{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'13px',fontStyle:'900',color:'#fff',fixedWidth:available});name.setCrop(0,0,available,22);item.add(name);
    item.add(this.add.text(tx,41,`${String(i+1).padStart(2,'0')} · ${surface(t)}\n${lengthM(t)} m · ${sectors(t)} sectores`,{fontFamily:'system-ui',fontSize:'11px',color:selected?'#c9d1ff':'#9ba8d2',lineSpacing:2,fixedWidth:available}));
    const hit=this.add.rectangle(0,0,w,h,0,0.001).setOrigin(0).setInteractive({useHandCursor:true});item.add(hit);
    let sy=0,drag=false;hit.on('pointerdown',p=>{sy=p.y;drag=false;});hit.on('pointermove',p=>{if(Math.abs(p.y-sy)>8)drag=true;});hit.on('pointerup',()=>{if(drag||this._dragTrackList)return;this._index=i;this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();});
    return {item,bg,hit};
  }

  _setTrackScroll(y){
    this._trackScrollY=clamp(y,this._trackMinScroll,0);if(this._trackList)this._trackList.y=this._trackListTopY+this._trackScrollY;
    if(!this._trackViewport)return;const vt=this._trackViewport.y,vb=vt+this._trackViewport.height;
    for(const it of this._trackItems){if(!it?.item||!it?.bg||!it?.hit)continue;const top=this._trackList.y+it.item.y,bottom=top+it.bg.height;const visible=bottom>vt&&top<vb;if(visible){if(!it.hit.input?.enabled)it.hit.setInteractive({useHandCursor:true});}else it.hit.disableInteractive();}
  }

  _updateTrackScroll(_time,delta){
    if(this._dragTrackList||Math.abs(this._trackVelocity)<.01)return;
    this._setTrackScroll(this._trackScrollY+this._trackVelocity*(delta/16.666));this._trackVelocity*=.94;
    if(this._trackScrollY>=0||this._trackScrollY<=this._trackMinScroll)this._trackVelocity*=.75;
  }

  _trackHero(root,g,x,y,w,h){
    const t=this._tracks[this._index],pad=24;
    root.add(this.add.text(x+w/2,y+18,(t.name||t.key).toUpperCase(),{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:`${Math.max(22,Math.min(34,w*.038))}px`,fontStyle:'900',color:'#fff'}).setOrigin(.5,0));
    root.add(this.add.text(x+w/2,y+60,`${surface(t).toUpperCase()} · ${sectors(t)} SECTORES`,{fontFamily:'system-ui',fontSize:'13px',fontStyle:'bold',color:'#2bff88'}).setOrigin(.5,0));

    const previewTop=y+92,previewH=Math.max(170,h-220),previewX=x+24,previewW=w-48;
    g.fillStyle(0x071016,.82).fillRoundedRect(previewX,previewTop,previewW,previewH,15);g.lineStyle(1,0xb7c0ff,.15).strokeRoundedRect(previewX,previewTop,previewW,previewH,15);
    const key=this._displayPreview(t,1400,850);if(key&&this.textures.exists(key)){const im=this.add.image(previewX+previewW/2,previewTop+previewH/2,key);im.setScale(Math.min((previewW-28)/im.width,(previewH-24)/im.height));root.add(im);}

    const statsY=previewTop+previewH+12,statsH=58,cellW=(w-48)/4;
    const rows=[['LONGITUD',`${lengthM(t)} m`],['SECTORES',String(sectors(t))],['SUPERFICIE',surface(t)],['ANCHO PISTA',`${widthM(t).toFixed(1)} m`]];
    rows.forEach((r,i)=>{const xx=x+24+i*cellW;if(i)g.lineStyle(1,0xb7c0ff,.12).lineBetween(xx,statsY+4,xx,statsY+statsH-4);root.add(this.add.text(xx+12,statsY+6,r[0],{fontFamily:'system-ui',fontSize:'9px',fontStyle:'bold',color:'#8fa0aa'}));root.add(this.add.text(xx+12,statsY+25,r[1],{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'15px',fontStyle:'900',color:'#fff'}));});

    const btnH=48,btnY=y+h-btnH-18,selectW=Math.min(290,w*.36),backW=160;
    const back=this.add.rectangle(x+24,btnY,backW,btnH,0x141b33,.9).setOrigin(0).setStrokeStyle(1,0xb7c0ff,.22).setInteractive({useHandCursor:true});root.add(back);
    root.add(this.add.text(x+24+backW/2,btnY+btnH/2,'VOLVER',{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'14px',fontStyle:'900',color:'#fff'}).setOrigin(.5));back.on('pointerup',()=>this.scene.start(this._mode==='admin'?'admin-hub':'menu'));
    const sx=x+w-selectW-24;const select=this.add.rectangle(sx,btnY,selectW,btnH,0x2bff88,.95).setOrigin(0).setStrokeStyle(2,0x7dffc1,.75).setInteractive({useHandCursor:true});root.add(select);
    root.add(this.add.text(sx+selectW/2,btnY+btnH/2,this._mode==='admin'?'EDITAR':'SELECCIONAR',{fontFamily:'Orbitron, system-ui, sans-serif',fontSize:'15px',fontStyle:'900',color:'#08131b'}).setOrigin(.5));select.on('pointerup',()=>this._launchSelected());
  }

  _displayPreview(track,w,h){
    const official=`official_track_${track?.key}`;if(this.textures.exists(official))return official;
    const styled=this._ensureStyledPreview(track,w,h);if(styled)return styled;
    return this._preview(track,w,h);
  }

  _ensureStyledPreview(track,w=900,h=520){
    const p=pts(track);if(p.length<3)return null;
    const sig=`${track?.key}_${isDirt(track)?'dirt':'asphalt'}_${p.length}`;const existing=this._styledPreviewKeys.get(sig);if(existing&&this.textures.exists(existing))return existing;
    const key=`styled_track_${sig}`;if(this.textures.exists(key)){this._styledPreviewKeys.set(sig,key);return key;}
    try{
      const canvas=document.createElement('canvas');canvas.width=Math.max(480,Math.round(w));canvas.height=Math.max(280,Math.round(h));const ctx=canvas.getContext('2d');if(!ctx)return null;
      const xs=p.map(q=>q.x),ys=p.map(q=>q.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=Math.min(canvas.width,canvas.height)*.09,scale=Math.min((canvas.width-pad*2)/bw,(canvas.height-pad*2)/bh),ox=(canvas.width-bw*scale)/2-minX*scale,oy=(canvas.height-bh*scale)/2-minY*scale;
      ctx.fillStyle='#31583a';ctx.fillRect(0,0,canvas.width,canvas.height);
      const path=()=>{ctx.beginPath();ctx.moveTo(p[0].x*scale+ox,p[0].y*scale+oy);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x*scale+ox,p[i].y*scale+oy);ctx.closePath();ctx.lineCap='round';ctx.lineJoin='round';};
      const rawWidth=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160),road=Math.max(7,rawWidth*scale);
      if(isDirt(track)){
        path();ctx.strokeStyle='#343638';ctx.lineWidth=road*1.48;ctx.stroke();
        path();ctx.strokeStyle='#8a704f';ctx.lineWidth=road;ctx.stroke();
        path();ctx.strokeStyle='rgba(207,174,121,.45)';ctx.lineWidth=Math.max(1,road*.055);ctx.setLineDash([Math.max(4,road*.20),Math.max(4,road*.18)]);ctx.stroke();ctx.setLineDash([]);
      }else{
        path();ctx.strokeStyle='#2f3337';ctx.lineWidth=road;ctx.stroke();
        path();ctx.strokeStyle='rgba(255,255,255,.78)';ctx.lineWidth=Math.max(1,road*.025);ctx.stroke();
      }
      this.textures.addCanvas(key,canvas);this._styledPreviewKeys.set(sig,key);return key;
    }catch{return null;}
  }
}
