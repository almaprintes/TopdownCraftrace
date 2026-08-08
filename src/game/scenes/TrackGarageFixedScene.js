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

export class TrackGarageScene extends BaseScene {
  constructor(){
    super({key:'TrackGarageScene'});
    this._tracks=[]; this._index=0; this._ui=null; this._downX=0; this._dragged=false;
  }

  create(){
    super.create();
    this.cameras.main.setBackgroundColor('#081016');
    this._tracks=getTrackKeys().map(k=>createTrack(k));
    let saved=null; try{saved=localStorage.getItem('tdr2:trackKey');}catch{}
    const idx=this._tracks.findIndex(t=>t.key===saved); this._index=idx>=0?idx:0;
    this.scale.on('resize',this._render,this);
    this.input.on('pointerdown',p=>{this._downX=p.x;this._dragged=false;});
    this.input.on('pointermove',p=>{if(p.isDown&&Math.abs(p.x-this._downX)>30)this._dragged=true;});
    this.input.on('pointerup',p=>{
      const dx=p.x-this._downX; if(this._dragged&&Math.abs(dx)>70) this._move(dx<0?1:-1);
    });
    this._render();
  }

  shutdown(){ this.scale.off('resize',this._render,this); }

  _preview(track,w=760,h=410){
    const key=`premium_track_${track.key}`;
    if(this.textures.exists(key)) return key;
    const g=this.make.graphics({add:false});
    g.fillStyle(0x0b1713,1); g.fillRoundedRect(0,0,w,h,30);
    g.fillGradientStyle(0x17331f,0x25452a,0x101b16,0x19331f,1); g.fillRoundedRect(10,10,w-20,h-20,26);
    const p=pts(track);
    if(p.length>1){
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      p.forEach(q=>{minX=Math.min(minX,q.x);minY=Math.min(minY,q.y);maxX=Math.max(maxX,q.x);maxY=Math.max(maxY,q.y);});
      const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=48,s=Math.min((w-pad*2)/bw,(h-pad*2)/bh);
      const ox=(w-bw*s)/2,oy=(h-bh*s)/2;
      const d=p.map(q=>({x:ox+(q.x-minX)*s,y:oy+(q.y-minY)*s}));
      const stroke=(lw,col,a)=>{g.lineStyle(lw,col,a);g.beginPath();g.moveTo(d[0].x,d[0].y);for(let i=1;i<d.length;i++)g.lineTo(d[i].x,d[i].y);g.lineTo(d[0].x,d[0].y);g.strokePath();};
      stroke(26,0x0a0f10,.45); stroke(20,0xe9edf0,.96); stroke(13,0x363a3e,1);
      g.fillStyle(0x4dff9a,1); g.fillCircle(d[0].x,d[0].y,7); g.lineStyle(2,0xffffff,.9);g.strokeCircle(d[0].x,d[0].y,10);
    }
    g.generateTexture(key,w,h);g.destroy();return key;
  }

  _move(dir){ if(!this._tracks.length)return; this._index=(this._index+dir+this._tracks.length)%this._tracks.length; this._render(); }

  _render(){
    const {width,height}=this.scale; if(this._ui)this._ui.destroy(true); this._ui=this.add.container(0,0);
    const add=o=>{this._ui.add(o);return o;};
    const bg=add(this.add.graphics());
    bg.fillGradientStyle(0x071017,0x102119,0x0b1218,0x18301f,1);bg.fillRect(0,0,width,height);
    bg.fillStyle(0x65ff9a,.035);bg.fillEllipse(width*.72,height*.30,width*.70,height*.62);
    bg.lineStyle(1,0xffffff,.025);for(let x=0;x<width;x+=72)bg.lineBetween(x,0,x,height);for(let y=0;y<height;y+=72)bg.lineBetween(0,y,width,y);

    const pad=clamp(width*.028,18,34), top=22;
    add(this.add.text(pad,top,'CIRCUITOS',{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.025,24,38)+'px',fontStyle:'900',color:'#fff'}));
    add(this.add.text(pad,top+40,'ELIGE TU PRÓXIMO TRAZADO',{fontFamily:'system-ui',fontSize:'11px',fontStyle:'700',color:'#62eaa1',letterSpacing:2}));
    add(this.add.text(width-pad,top+8,`${this._index+1} / ${this._tracks.length}`,{fontFamily:'Orbitron,system-ui',fontSize:'14px',color:'#8da6af'}).setOrigin(1,0));

    const back=add(this.add.text(width-pad,top+38,'← VOLVER',{fontFamily:'system-ui',fontSize:'12px',fontStyle:'800',color:'#dce8eb'}).setOrigin(1,0).setInteractive({useHandCursor:true}));
    back.on('pointerdown',()=>this.scene.start('menu'));

    const track=this._tracks[this._index]; if(!track)return;
    const contentTop=86, bottomStrip=84, contentH=height-contentTop-bottomStrip-14;
    const previewW=width*.59-pad*1.3, infoX=width*.61, infoW=width-infoX-pad;

    const card=add(this.add.rectangle(pad,contentTop,previewW,contentH,0x091118,.86).setOrigin(0).setStrokeStyle(1,0x5fffa0,.22));
    const img=add(this.add.image(pad+previewW/2,contentTop+contentH/2,this._preview(track)));
    img.setScale(Math.min((previewW-24)/img.width,(contentH-24)/img.height));

    const left=add(this.add.text(pad+16,contentTop+contentH/2,'‹',{fontFamily:'system-ui',fontSize:'46px',color:'#fff',backgroundColor:'#0b1218aa',padding:{x:7,y:0}}).setOrigin(0,.5).setInteractive({useHandCursor:true}));
    const right=add(this.add.text(pad+previewW-16,contentTop+contentH/2,'›',{fontFamily:'system-ui',fontSize:'46px',color:'#fff',backgroundColor:'#0b1218aa',padding:{x:7,y:0}}).setOrigin(1,.5).setInteractive({useHandCursor:true}));
    left.on('pointerdown',()=>this._move(-1)); right.on('pointerdown',()=>this._move(1));

    add(this.add.text(infoX,contentTop+8,track.name,{fontFamily:'Orbitron,system-ui',fontSize:clamp(width*.027,25,39)+'px',fontStyle:'900',color:'#fff',wordWrap:{width:infoW}}));
    add(this.add.text(infoX,contentTop+64,String(track.category||'CIRCUITO').toUpperCase(),{fontFamily:'system-ui',fontSize:'11px',fontStyle:'900',color:'#62eaa1',letterSpacing:2}));

    const badge=(x,y,text,col)=>{
      const t=add(this.add.text(x,y,text,{fontFamily:'system-ui',fontSize:'11px',fontStyle:'800',color:'#fff',backgroundColor:col,padding:{x:10,y:6}})); return t;
    };
    badge(infoX,contentTop+94,`DIFICULTAD · ${track.difficulty||'—'}`,'#263a45');
    badge(infoX,contentTop+128,`LONGITUD · ${track.lengthLabel||'—'}`,'#263a45');

    const len=lengthOf(track);
    add(this.add.text(infoX,contentTop+174,`≈ ${len.toLocaleString('es-ES')} px`,{fontFamily:'Orbitron,system-ui',fontSize:'16px',color:'#d9f6e7'}));
    add(this.add.text(infoX,contentTop+204,`${Math.round(track.trackWidth)} px de ancho\n${track.worldW} × ${track.worldH} mundo`,{fontFamily:'system-ui',fontSize:'12px',color:'#8fa5ad',lineSpacing:6}));

    const selectY=contentTop+contentH-54;
    const btn=add(this.add.rectangle(infoX,selectY,infoW,48,0x43f58b,1).setOrigin(0).setInteractive({useHandCursor:true}));
    add(this.add.text(infoX+infoW/2,selectY+24,'ELEGIR CIRCUITO',{fontFamily:'Orbitron,system-ui',fontSize:'13px',fontStyle:'900',color:'#062012'}).setOrigin(.5));
    btn.on('pointerdown',()=>{try{localStorage.setItem('tdr2:trackKey',track.key);}catch{} this.scene.start('menu');});

    const stripY=height-bottomStrip+10;
    const gap=8,cardW=Math.min(150,(width-pad*2-gap*(this._tracks.length-1))/this._tracks.length),cardH=56;
    const total=this._tracks.length*cardW+(this._tracks.length-1)*gap,startX=(width-total)/2;
    this._tracks.forEach((t,i)=>{
      const x=startX+i*(cardW+gap),sel=i===this._index;
      const r=add(this.add.rectangle(x,stripY,cardW,cardH,sel?0x163c2b:0x0b1419,.96).setOrigin(0).setStrokeStyle(sel?2:1,sel?0x52ff99:0x35505c,sel?.95:.55).setInteractive({useHandCursor:true}));
      add(this.add.text(x+10,stripY+9,t.name,{fontFamily:'system-ui',fontSize:'10px',fontStyle:'800',color:sel?'#fff':'#a8b8be',wordWrap:{width:cardW-20}}));
      add(this.add.text(x+10,stripY+34,t.difficulty||'',{fontFamily:'system-ui',fontSize:'9px',color:sel?'#62eaa1':'#66808b'}));
      r.on('pointerdown',()=>{this._index=i;this._render();});
    });
  }
}
