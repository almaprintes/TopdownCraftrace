import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageFixedScene.js';
import { loadTrackPreview } from '../tracks/trackPreviewStore.js';

const C = { bg:0x071017, panel:0x0b171f, panel2:0x101f28, line:0x263640, yellow:0xffc400, white:'#f4f7f8', muted:'#8fa0aa' };

export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor(){ super(); this._generatedPreviewKeys=new Map(); this._generatedPreviewPending=new Set(); this._commercial=null; }

  create(){
    super.create();
    this._buildCommercial();
    this.scale.on('resize', this._rebuildCommercial, this);
    this.events.once('shutdown',()=>this.scale.off('resize',this._rebuildCommercial,this));
  }

  _rebuildCommercial(){ if(!this.sys?.isActive?.()) return; this._commercial?.destroy(true); this._commercial=null; this._buildCommercial(); }

  _buildCommercial(){
    const W=this.scale.width, H=this.scale.height;
    if(!this._tracks?.length) return;
    const root=this.add.container(0,0).setDepth(10000); this._commercial=root;
    const g=this.add.graphics(); root.add(g);
    g.fillStyle(C.bg,1).fillRect(0,0,W,H);
    for(let x=-H;x<W;x+=74){ g.lineStyle(1,0x17252d,.32).lineBetween(x,0,x+H,H); }
    const top=Math.max(58,H*.105), bottom=Math.max(58,H*.105);
    g.fillStyle(0x050b10,.96).fillRect(0,0,W,top);
    g.lineStyle(2,C.yellow,.85).lineBetween(0,top-2,W,top-2);

    const title=this.add.text(34,top*.48,'🏁  SELECCIÓN DE CIRCUITO',{fontFamily:'Arial Black, Arial',fontSize:`${Math.max(22,Math.min(34,W*.021))}px`,fontStyle:'italic',color:C.white}).setOrigin(0,.5); root.add(title);
    const step=this.add.text(W-34,top*.48,`${String(this._index+1).padStart(2,'0')}  /  ${String(this._tracks.length).padStart(2,'0')}`,{fontFamily:'Arial',fontSize:`${Math.max(14,W*.011)}px`,fontStyle:'bold',color:'#91a2ad'}).setOrigin(1,.5); root.add(step);

    const margin=Math.max(24,W*.018), gap=Math.max(20,W*.014);
    const leftW=Math.min(W*.285,430), mainX=margin+leftW+gap, mainW=W-mainX-margin;
    const contentY=top+16, contentH=H-top-bottom-28;
    this._drawList(root,g,margin,contentY,leftW,contentH);
    this._drawHero(root,g,mainX,contentY,mainW,contentH);

    const by=H-bottom*.52;
    this._button(root,g,margin,by,Math.min(210,leftW),44,'←  VOLVER',false,()=>this.scene.start('MenuScene'));
    this._button(root,g,W-margin-300,by,300,48,'🏁  SELECCIONAR',true,()=>this._launchSelected());
  }

  _drawList(root,g,x,y,w,h){
    const count=Math.min(5,this._tracks.length), rowGap=9, rowH=(h-rowGap*(count-1))/count;
    let start=Math.max(0,Math.min(this._index-2,this._tracks.length-count));
    for(let j=0;j<count;j++){
      const i=start+j, t=this._tracks[i], yy=y+j*(rowH+rowGap), selected=i===this._index;
      g.fillStyle(selected?0x12242c:C.panel,.98).fillRoundedRect(x,yy,w,rowH,8);
      g.lineStyle(selected?2:1,selected?C.yellow:C.line,selected?1:.85).strokeRoundedRect(x,yy,w,rowH,8);
      if(selected){ g.fillStyle(C.yellow,1).fillRect(x,yy,5,rowH); }
      const thumbW=Math.min(112,w*.29), thumbH=rowH-18;
      g.fillStyle(0x071016,1).fillRoundedRect(x+12,yy+9,thumbW,thumbH,5);
      const key=this._preview(t,300,180);
      if(key&&this.textures.exists(key)){
        const im=this.add.image(x+12+thumbW/2,yy+rowH/2,key).setOrigin(.5);
        const sc=Math.min((thumbW-6)/im.width,(thumbH-6)/im.height); im.setScale(sc).setAlpha(selected?1:.7); root.add(im);
      }
      const tx=x+24+thumbW;
      root.add(this.add.text(tx,yy+rowH*.28,String(i+1).padStart(2,'0'),{fontFamily:'Arial Black',fontSize:`${Math.max(12,rowH*.13)}px`,color:selected?'#ffca19':'#70808a'}).setOrigin(0,.5));
      root.add(this.add.text(tx+42,yy+rowH*.28,(t.name||t.key).toUpperCase(),{fontFamily:'Arial Black',fontSize:`${Math.max(13,rowH*.145)}px`,fontStyle:'italic',color:selected?C.white:'#a4b0b7'}).setOrigin(0,.5));
      root.add(this.add.text(tx+42,yy+rowH*.64,`${Math.round(t.length||t.trackLength||0)} m   ·   ${t.sectors||3} SECTORES`,{fontFamily:'Arial',fontSize:`${Math.max(11,rowH*.105)}px`,fontStyle:'bold',color:selected?'#c8d1d6':'#6f7d85'}).setOrigin(0,.5));
      const hit=this.add.rectangle(x+w/2,yy+rowH/2,w,rowH,0,0).setInteractive({useHandCursor:true}); root.add(hit);
      hit.on('pointerup',()=>{this._index=i; this._commercial?.destroy(true); this._commercial=null; this._buildCommercial();});
    }
  }

  _drawHero(root,g,x,y,w,h){
    const t=this._tracks[this._index];
    g.fillStyle(C.panel,.98).fillRoundedRect(x,y,w,h,10); g.lineStyle(1,C.line,1).strokeRoundedRect(x,y,w,h,10);
    const headH=Math.max(62,h*.13), statH=Math.max(78,h*.18), imageY=y+headH, imageH=h-headH-statH;
    root.add(this.add.text(x+24,y+headH*.40,(t.name||t.key).toUpperCase(),{fontFamily:'Arial Black',fontSize:`${Math.max(24,Math.min(38,w*.035))}px`,fontStyle:'italic',color:C.white}).setOrigin(0,.5));
    root.add(this.add.text(x+w-24,y+headH*.42,`${(t.surface||'Asfalto').toUpperCase()}  ·  ${t.sectors||3} SECTORES`,{fontFamily:'Arial',fontSize:`${Math.max(12,w*.014)}px`,fontStyle:'bold',color:'#ffca19'}).setOrigin(1,.5));
    g.fillStyle(0x061015,1).fillRect(x+10,imageY,w-20,imageH);
    const key=this._preview(t,1000,600);
    if(key&&this.textures.exists(key)){
      const im=this.add.image(x+w/2,imageY+imageH/2,key).setOrigin(.5);
      const sc=Math.min((w-34)/im.width,(imageH-18)/im.height); im.setScale(sc).setAlpha(.96); root.add(im);
      const shade=this.add.rectangle(x+w/2,imageY+imageH-22,w-20,44,0x061015,.28); root.add(shade);
    }
    g.fillStyle(C.panel2,.98).fillRect(x+10,y+h-statH,w-20,statH-10);
    const stats=[['LONGITUD',`${Math.round(t.length||t.trackLength||0)} m`],['SECTORES',String(t.sectors||3)],['SUPERFICIE',t.surface||'Asfalto'],['ANCHO PISTA',`${Math.round(t.trackWidth||t.width||160)} m`]];
    const sw=(w-20)/4;
    stats.forEach((s,i)=>{ const sx=x+10+i*sw; if(i){g.lineStyle(1,0x30414a,.8).lineBetween(sx,y+h-statH+15,sx,y+h-18);} root.add(this.add.text(sx+18,y+h-statH+22,s[0],{fontFamily:'Arial',fontSize:`${Math.max(11,w*.012)}px`,fontStyle:'bold',color:C.muted})); root.add(this.add.text(sx+18,y+h-statH+48,s[1],{fontFamily:'Arial Black',fontSize:`${Math.max(17,w*.019)}px`,color:C.white})); });
  }

  _button(root,g,x,y,w,h,label,hot,fn){
    g.fillStyle(hot?C.yellow:0x101b22,1).fillRoundedRect(x,y-h/2,w,h,5); g.lineStyle(1,hot?0xffd84a:0x40505a,1).strokeRoundedRect(x,y-h/2,w,h,5);
    root.add(this.add.text(x+w/2,y,label,{fontFamily:'Arial Black',fontSize:`${Math.max(14,h*.34)}px`,fontStyle:'italic',color:hot?'#111820':C.white}).setOrigin(.5));
    const hit=this.add.rectangle(x+w/2,y,w,h,0,0).setInteractive({useHandCursor:true}); root.add(hit); hit.on('pointerup',fn);
  }

  _launchSelected(){
    const t=this._tracks?.[this._index]; if(!t) return;
    if(typeof this._confirmSelection==='function') return this._confirmSelection();
    if(typeof this._selectTrack==='function') return this._selectTrack();
    if(typeof this._startRace==='function') return this._startRace();
    try{ localStorage.setItem('selectedTrackKey',t.key); }catch(_){}
    this.registry.set('selectedTrackKey',t.key); this.registry.set('selectedTrack',t.key);
    this.scene.start('RaceScene',{trackKey:t.key,track:t.key});
  }

  _preview(track,w=760,h=410){
    const official=this._generatedPreviewKeys?.get(track?.key);
    if(official&&this.textures.exists(official)) return official;
    const fallback=super._preview(track,w,h); this._queueGeneratedPreview(track); return fallback;
  }

  async _queueGeneratedPreview(track){
    const trackKey=track?.key; if(!trackKey||this._generatedPreviewPending.has(trackKey)||this._generatedPreviewKeys.has(trackKey)) return;
    this._generatedPreviewPending.add(trackKey);
    try{
      const row=await loadTrackPreview(trackKey,track); if(!row?.blob||!this.sys?.isActive?.()) return;
      const textureKey=`generated_track_${trackKey}_${row.updatedAt||0}`;
      if(!this.textures.exists(textureKey)){
        const url=URL.createObjectURL(row.blob);
        try{ const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('preview'));img.src=url;}); if(!this.textures.exists(textureKey)) this.textures.addImage(textureKey,image); }
        finally{URL.revokeObjectURL(url);}
      }
      if(!this.textures.exists(textureKey)) return; this._generatedPreviewKeys.set(trackKey,textureKey);
      if(this._tracks?.[this._index]?.key===trackKey&&this.sys?.isActive?.()){ this._commercial?.destroy(true); this._commercial=null; this._buildCommercial(); }
    }catch(_){} finally{this._generatedPreviewPending.delete(trackKey);}
  }
}
