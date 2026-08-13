import Phaser from 'phaser';
import { BaseScene } from './BaseScene.js';
import { createTrack, getTrackKeys } from '../tracks/trackRegistry.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function pts(track){
  return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:p[0],y:p[1]}:p).filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y));
}

function lengthOf(track){
  const p=pts(track); if(p.length<2) return 0;
  let d=0; for(let i=0;i<p.length;i++){ const a=p[i],b=p[(i+1)%p.length]; d+=Math.hypot(b.x-a.x,b.y-a.y); }
  return Math.round(d);
}

function sectorsOf(track){
  const cps=track?.checkpointFractions;
  return Array.isArray(cps) ? Math.max(1,cps.length+1) : 3;
}

function surfaceOf(track){
  const raw=track?.meta?.trackSurface || track?.meta?.surface || track?.surface || track?.surfaceProfile || '';
  const s=String(raw).toLowerCase();
  if(s.includes('dirt')||s.includes('gravel')||s.includes('tierra')) return 'Tierra';
  if(s.includes('snow')||s.includes('ice')) return 'Nieve';
  if(s.includes('sand')) return 'Arena';
  return 'Asfalto';
}

export class TrackGarageScene extends BaseScene {
  constructor(){
    super({key:'TrackGarageScene'});
    this._tracks=[]; this._index=0; this._ui=null; this._mode='player';
    this._downY=0; this._dragged=false;
  }

  init(data){ this._mode=data?.mode==='admin'?'admin':'player'; }

  create(){
    super.create();
    this.cameras.main.setBackgroundColor('#050b10');
    this._tracks=getTrackKeys().map(k=>createTrack(k));
    let saved=null; try{saved=localStorage.getItem('tdr2:trackKey');}catch{}
    const idx=this._tracks.findIndex(t=>t.key===saved); this._index=idx>=0?idx:0;
    this.scale.on('resize',this._render,this);
    this.input.on('wheel',(_p,_g,_dx,dy)=>this._move(dy>0?1:-1));
    this.input.on('pointerdown',p=>{this._downY=p.y;this._dragged=false;});
    this.input.on('pointermove',p=>{if(p.isDown&&Math.abs(p.y-this._downY)>24)this._dragged=true;});
    this.input.on('pointerup',p=>{const dy=p.y-this._downY;if(this._dragged&&Math.abs(dy)>65)this._move(dy<0?1:-1);});
    this._render();
  }

  shutdown(){ this.scale.off('resize',this._render,this); }

  _preview(track,w=900,h=560){
    const key=`premium_track_${track.key}`; if(this.textures.exists(key)) return key;
    const g=this.make.graphics({add:false});
    g.fillStyle(0x315b23,1); g.fillRect(0,0,w,h);
    g.fillStyle(0xffffff,.018); for(let y=0;y<h;y+=8) g.fillRect(0,y,w,1);
    const p=pts(track);
    if(p.length>1){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      p.forEach(q=>{minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);});
      const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=55,s=Math.min((w-pad*2)/bw,(h-pad*2)/bh);
      const ox=(w-bw*s)/2,oy=(h-bh*s)/2,d=p.map(q=>({x:ox+(q.x-minX)*s,y:oy+(q.y-minY)*s}));
      const stroke=(lw,col,a)=>{g.lineStyle(lw,col,a);g.beginPath();g.moveTo(d[0].x,d[0].y);for(let i=1;i<d.length;i++)g.lineTo(d[i].x,d[i].y);g.lineTo(d[0].x,d[0].y);g.strokePath();};
      stroke(82,0x2d2927,.98); stroke(48,0xf5f0df,.96); stroke(44,0x756f58,1);
      g.lineStyle(2,0xffffff,.9);g.beginPath();g.moveTo(d[0].x,d[0].y);for(let i=1;i<d.length;i++)g.lineTo(d[i].x,d[i].y);g.lineTo(d[0].x,d[0].y);g.strokePath();
    }
    g.generateTexture(key,w,h);g.destroy();return key;
  }

  _move(dir){
    if(!this._tracks.length)return;
    this._index=(this._index+dir+this._tracks.length)%this._tracks.length;
    this._render();
  }

  _visibleIndexes(count=5){
    const n=this._tracks.length;if(!n)return[];
    const size=Math.min(count,n);
    let start=clamp(this._index-2,0,Math.max(0,n-size));
    return Array.from({length:size},(_,k)=>start+k);
  }

  _text(add,x,y,text,size,color='#fff',weight='700',originX=0,originY=0){
    return add(this.add.text(x,y,text,{fontFamily:'Orbitron,Arial Narrow,system-ui,sans-serif',fontSize:`${size}px`,fontStyle:weight==='900'?'900':'bold',color}).setOrigin(originX,originY));
  }

  _render(){
    const {width,height}=this.scale;
    if(this._ui)this._ui.destroy(true);
    this._ui=this.add.container(0,0);const add=o=>{this._ui.add(o);return o;};
    const sx=width/1536, sy=height/1024, s=Math.min(sx,sy);
    const X=v=>v*sx, Y=v=>v*sy, S=v=>Math.max(8,Math.round(v*s));

    const bg=add(this.add.graphics());
    bg.fillGradientStyle(0x071019,0x0b151d,0x04090e,0x09131a,1);bg.fillRect(0,0,width,height);
    bg.fillStyle(0xffffff,.015);for(let y=0;y<height;y+=Math.max(3,Y(4)))bg.fillRect(0,y,width,1);
    bg.lineStyle(1,0x8aa0aa,.07);for(let x=0;x<width;x+=X(80))bg.lineBetween(x,0,x,height);

    // Header
    const header=add(this.add.rectangle(0,0,width,Y(86),0x081018,.97).setOrigin(0));header.setStrokeStyle(1,0x6f8590,.13);
    this._text(add,X(24),Y(27),'🏁 SELECCIÓN DE CIRCUITO',S(31),'#f5f7f8','900');
    const settings=this._text(add,width-X(34),Y(27),'⚙',S(31),'#c9d2d6','900',1,0).setInteractive({useHandCursor:true});
    settings.on('pointerdown',()=>this.scene.start('settings'));

    // Left list panel
    const leftX=X(20), leftY=Y(103), leftW=X(440), leftH=height-Y(119);
    add(this.add.rectangle(leftX,leftY,leftW,leftH,0x071018,.76).setOrigin(0).setStrokeStyle(1,0x526873,.26));
    const indexes=this._visibleIndexes(5), gap=Y(12), cardH=Math.min(Y(152),(leftH-Y(76)-gap*4)/5);
    indexes.forEach((idx,j)=>{
      const t=this._tracks[idx], selected=idx===this._index, y=leftY+Y(8)+j*(cardH+gap);
      const card=add(this.add.rectangle(leftX+X(8),y,leftW-X(16),cardH,selected?0x0d1920:0x0a131a,selected?.96:.72).setOrigin(0).setStrokeStyle(selected?2:1,selected?0xf0b51c:0x3d505a,selected?.95:.42).setInteractive({useHandCursor:true}));
      card.on('pointerdown',()=>{this._index=idx;this._render();});
      const num=String(idx+1).padStart(2,'0');
      this._text(add,leftX+X(26),y+Y(18),num,S(18),selected?'#ffffff':'#82919a','900');
      const mini=add(this.add.image(leftX+X(120),y+cardH/2,this._preview(t,320,190)));
      mini.setScale(Math.min(X(120)/mini.width,(cardH-Y(18))/mini.height));mini.setAlpha(selected?1:.45);
      this._text(add,leftX+X(205),y+Y(23),String(t.name||'CIRCUITO').toUpperCase(),S(18),selected?'#ffffff':'#89959c','900');
      this._text(add,leftX+X(205),y+Y(70),`🏁 ${lengthOf(t).toLocaleString('es-ES')} m`,S(13),selected?'#f0f2f3':'#72818a','700');
      this._text(add,leftX+X(205),y+Y(104),`${sectorsOf(t)}  SECTORES`,S(13),selected?'#f0f2f3':'#72818a','700');
    });

    const backY=height-Y(72);
    const back=add(this.add.rectangle(leftX+X(8),backY,X(220),Y(54),0x101b24,.96).setOrigin(0).setStrokeStyle(1,0x536873,.34).setInteractive({useHandCursor:true}));
    this._text(add,leftX+X(34),backY+Y(15),'←',S(25),'#bec9ce','900');
    this._text(add,leftX+X(103),backY+Y(18),'VOLVER',S(16),'#eef2f4','900');
    back.on('pointerdown',()=>this.scene.start(this._mode==='admin'?'admin-hub':'menu'));

    // Right detail panel
    const track=this._tracks[this._index]; if(!track)return;
    const rx=X(482), ry=Y(103), rw=width-rx-X(17), rh=height-Y(129);
    add(this.add.rectangle(rx,ry,rw,rh,0x0a141b,.84).setOrigin(0).setStrokeStyle(1,0x4e626d,.28));
    this._text(add,rx+X(20),ry+Y(17),String(track.name||'CIRCUITO').toUpperCase(),S(30),'#ffffff','900');

    const previewX=rx+X(10), previewY=ry+Y(62), previewW=rw-X(20), previewH=Math.max(Y(360),rh-Y(232));
    const frame=add(this.add.rectangle(previewX,previewY,previewW,previewH,0x213f1e,1).setOrigin(0).setStrokeStyle(1,0x81928d,.18));
    const img=add(this.add.image(previewX+previewW/2,previewY+previewH/2,this._preview(track)));
    img.setScale(Math.min(previewW/img.width,previewH/img.height));

    const statsY=previewY+previewH+Y(4), statsH=Y(88), colW=previewW/4;
    add(this.add.rectangle(previewX,statsY,previewW,statsH,0x0d1820,.98).setOrigin(0).setStrokeStyle(1,0x465a65,.24));
    const stats=[
      ['LONGITUD',`${lengthOf(track).toLocaleString('es-ES')} m`],
      ['SECTORES',String(sectorsOf(track))],
      ['SUPERFICIE',surfaceOf(track)],
      ['ANCHO PISTA',`${Math.round(track.trackWidth||0)} m`]
    ];
    stats.forEach((st,i)=>{
      const cx=previewX+i*colW;
      if(i)add(this.add.rectangle(cx,statsY+Y(14),1,statsH-Y(28),0x5c6c74,.3).setOrigin(.5,0));
      this._text(add,cx+X(20),statsY+Y(16),st[0],S(11),'#7f8d94','900');
      this._text(add,cx+X(20),statsY+Y(48),st[1],S(18),'#f0f3f4','900');
    });

    const btnW=Math.min(X(350),rw*.38),btnH=Y(68),btnX=rx+rw-btnW-X(8),btnY=height-btnH-Y(18);
    const select=add(this.add.rectangle(btnX,btnY,btnW,btnH,0xf4b712,1).setOrigin(0).setStrokeStyle(2,0xffd75c,.85).setInteractive({useHandCursor:true}));
    this._text(add,btnX+btnW/2,btnY+btnH/2,this._mode==='admin'?'🏁  EDITAR CIRCUITO':'🏁  SELECCIONAR',S(19),'#182025','900',.5,.5);
    select.on('pointerdown',()=>{
      try{localStorage.setItem('tdr2:trackKey',track.key);}catch{}
      if(this._mode==='admin')this.scene.start('track-editor',{trackKey:track.key});else this.scene.start('menu');
    });
  }
}
