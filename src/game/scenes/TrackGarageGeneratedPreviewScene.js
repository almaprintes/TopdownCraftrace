import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageFixedScene.js';
import { loadTrackPreview } from '../tracks/trackPreviewStore.js';
import { OFFICIAL_TRACK_WEBP } from '../tracks/officialTrackPreviewData.js';

const C = { bg:0x071017, panel:0x0b171f, panel2:0x101f28, line:0x263640, yellow:0xffc400, white:'#f4f7f8', muted:'#8fa0aa' };
function points(track){return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function lengthOf(track){const direct=Number(track?.length??track?.trackLength??track?.meta?.length??track?.meta?.trackLength);if(Number.isFinite(direct)&&direct>0)return Math.round(direct);const p=points(track);let d=0;if(p.length<2)return d;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];d+=Math.hypot(b.x-a.x,b.y-a.y);}return Math.round(d);}
function sectorCount(track){const n=Number(track?.sectors);if(Number.isFinite(n)&&n>0)return Math.round(n);const c=track?.checkpointFractions;return Array.isArray(c)?Math.max(1,c.length+1):3;}
function surface(track){return String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||'Asfalto');}

export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor(){ super(); this._generatedPreviewKeys=new Map(); this._generatedPreviewPending=new Set(); this._commercial=null; }

  preload(){
    if(super.preload) super.preload();
    for(const [trackKey,url] of Object.entries(OFFICIAL_TRACK_WEBP)){
      const textureKey=`official_track_${trackKey}`;
      if(!this.textures.exists(textureKey)) this.load.image(textureKey,url);
    }
  }

  create(){ super.create(); this._buildCommercial(); this.scale.on('resize', this._rebuildCommercial, this); this.events.once('shutdown',()=>this.scale.off('resize',this._rebuildCommercial,this)); }
  _rebuildCommercial(){ if(!this.sys?.isActive?.()) return; this._commercial?.destroy(true); this._commercial=null; this._buildCommercial(); }

  _buildCommercial(){
    const W=this.scale.width,H=this.scale.height;if(!this._tracks?.length)return;
    const root=this.add.container(0,0).setDepth(10000);this._commercial=root;const g=this.add.graphics();root.add(g);
    g.fillStyle(C.bg,1).fillRect(0,0,W,H);for(let x=-H;x<W;x+=74)g.lineStyle(1,0x17252d,.32).lineBetween(x,0,x+H,H);
    const top=Math.max(58,H*.105),bottom=Math.max(58,H*.105);g.fillStyle(0x050b10,.96).fillRect(0,0,W,top);g.lineStyle(2,C.yellow,.85).lineBetween(0,top-2,W,top-2);
    root.add(this.add.text(34,top*.48,'🏁  SELECCIÓN DE CIRCUITO',{fontFamily:'Arial Black, Arial',fontSize:`${Math.max(22,Math.min(34,W*.021))}px`,fontStyle:'italic',color:C.white}).setOrigin(0,.5));
    root.add(this.add.text(W-34,top*.48,`${String(this._index+1).padStart(2,'0')}  /  ${String(this._tracks.length).padStart(2,'0')}`,{fontFamily:'Arial',fontSize:`${Math.max(14,W*.011)}px`,fontStyle:'bold',color:'#91a2ad'}).setOrigin(1,.5));
    const margin=Math.max(24,W*.018),gap=Math.max(18,W*.012),leftW=Math.min(W*.285,430),mainX=margin+leftW+gap,mainW=W-mainX-margin;const contentY=top+16,contentH=H-top-bottom-28;
    this._drawList(root,g,margin,contentY,leftW,contentH);this._drawHero(root,g,mainX,contentY,mainW,contentH);
    const by=H-bottom*.52;this._button(root,g,margin,by,Math.min(210,leftW),44,'←  VOLVER',false,()=>this.scene.start(this._mode==='admin'?'admin-hub':'menu'));this._button(root,g,W-margin-300,by,300,48,this._mode==='admin'?'🏁  EDITAR':'🏁  SELECCIONAR',true,()=>this._launchSelected());
  }

  _drawList(root,g,x,y,w,h){
    const count=Math.min(5,this._tracks.length),rowGap=9,rowH=(h-rowGap*(count-1))/count;let start=Math.max(0,Math.min(this._index-2,this._tracks.length-count));
    for(let j=0;j<count;j++){const i=start+j,t=this._tracks[i],yy=y+j*(rowH+rowGap),selected=i===this._index;g.fillStyle(selected?0x12242c:C.panel,.98).fillRoundedRect(x,yy,w,rowH,8);g.lineStyle(selected?2:1,selected?C.yellow:C.line,selected?1:.85).strokeRoundedRect(x,yy,w,rowH,8);if(selected)g.fillStyle(C.yellow,1).fillRect(x,yy,5,rowH);
      const thumbW=Math.min(112,w*.29),thumbH=rowH-18;g.fillStyle(0x071016,1).fillRoundedRect(x+12,yy+9,thumbW,thumbH,5);const key=this._preview(t,300,180);if(key&&this.textures.exists(key)){const im=this.add.image(x+12+thumbW/2,yy+rowH/2,key).setOrigin(.5);im.setScale(Math.min((thumbW-6)/im.width,(thumbH-6)/im.height)).setAlpha(selected?1:.7);root.add(im);}
      const tx=x+24+thumbW;root.add(this.add.text(tx,yy+rowH*.28,String(i+1).padStart(2,'0'),{fontFamily:'Arial Black',fontSize:`${Math.max(12,rowH*.13)}px`,color:selected?'#ffca19':'#70808a'}).setOrigin(0,.5));root.add(this.add.text(tx+42,yy+rowH*.28,(t.name||t.key).toUpperCase(),{fontFamily:'Arial Black',fontSize:`${Math.max(13,rowH*.145)}px`,fontStyle:'italic',color:selected?C.white:'#a4b0b7'}).setOrigin(0,.5));root.add(this.add.text(tx+42,yy+rowH*.64,`${lengthOf(t)} m   ·   ${sectorCount(t)} SECTORES`,{fontFamily:'Arial',fontSize:`${Math.max(11,rowH*.105)}px`,fontStyle:'bold',color:selected?'#c8d1d6':'#6f7d85'}).setOrigin(0,.5));
      const hit=this.add.rectangle(x+w/2,yy+rowH/2,w,rowH,0,0).setInteractive({useHandCursor:true});root.add(hit);hit.on('pointerup',()=>{this._index=i;this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();});}
  }

  _drawHero(root,g,x,y,w,h){
    const t=this._tracks[this._index];
    g.fillStyle(C.panel,.98).fillRoundedRect(x,y,w,h,10);g.lineStyle(1,C.line,1).strokeRoundedRect(x,y,w,h,10);
    const infoW=Math.max(190,Math.min(235,w*.205)),imageX=x+infoW,imageW=w-infoW,pad=Math.max(18,infoW*.085);
    g.fillStyle(0x09131a,1).fillRect(x,y,infoW,h);g.fillStyle(0x050d12,1).fillRect(imageX,y,imageW,h);g.lineStyle(1,0x31434d,.95).lineBetween(imageX,y+1,imageX,y+h-1);

    const numberSize=Math.max(36,Math.min(50,infoW*.19));
    root.add(this.add.text(x+pad,y+18,String(this._index+1).padStart(2,'0'),{fontFamily:'Arial Black',fontSize:`${numberSize}px`,fontStyle:'italic',color:'#ffca19'}));
    const nameY=y+68,nameH=Math.max(72,h*.17);
    root.add(this.add.text(x+pad,nameY,(t.name||t.key).toUpperCase(),{fontFamily:'Arial Black',fontSize:`${Math.max(21,Math.min(31,infoW*.125))}px`,fontStyle:'italic',color:C.white,wordWrap:{width:infoW-pad*2},lineSpacing:2}).setOrigin(0,0));

    const lineY=Math.min(y+h*.36,nameY+nameH+8);g.lineStyle(2,C.yellow,1).lineBetween(x+pad,lineY,x+infoW-pad,lineY);
    const stats=[['LONGITUD',`${lengthOf(t)} m`],['SECTORES',String(sectorCount(t))],['SUPERFICIE',surface(t)],['ANCHO PISTA',`${Math.round(Number(t.trackWidth||t.width||160))} m`]];
    const statsTop=lineY+10,statsBottom=y+h-14,cellH=(statsBottom-statsTop)/4;
    stats.forEach((s,i)=>{const cy=statsTop+i*cellH;if(i)g.lineStyle(1,0x273842,.82).lineBetween(x+pad,cy,x+infoW-pad,cy);const labelY=cy+cellH*.28,valueY=cy+cellH*.66;root.add(this.add.text(x+pad,labelY,s[0],{fontFamily:'Arial',fontSize:`${Math.max(10,Math.min(13,cellH*.18))}px`,fontStyle:'bold',color:C.muted}).setOrigin(0,.5));root.add(this.add.text(x+pad,valueY,s[1],{fontFamily:'Arial Black',fontSize:`${Math.max(15,Math.min(21,cellH*.28))}px`,color:C.white}).setOrigin(0,.5));});

    const inset=Math.max(8,imageW*.009);g.fillStyle(0x061015,1).fillRoundedRect(imageX+inset,y+inset,imageW-inset*2,h-inset*2,6);
    const key=this._preview(t,1400,850);if(key&&this.textures.exists(key)){const im=this.add.image(imageX+imageW/2,y+h/2,key).setOrigin(.5);im.setScale(Math.min((imageW-inset*2.2)/im.width,(h-inset*2.2)/im.height)).setAlpha(1);root.add(im);}
  }

  _button(root,g,x,y,w,h,label,hot,fn){g.fillStyle(hot?C.yellow:0x101b22,1).fillRoundedRect(x,y-h/2,w,h,5);g.lineStyle(1,hot?0xffd84a:0x40505a,1).strokeRoundedRect(x,y-h/2,w,h,5);root.add(this.add.text(x+w/2,y,label,{fontFamily:'Arial Black',fontSize:`${Math.max(14,h*.34)}px`,fontStyle:'italic',color:hot?'#111820':C.white}).setOrigin(.5));const hit=this.add.rectangle(x+w/2,y,w,h,0,0).setInteractive({useHandCursor:true});root.add(hit);hit.on('pointerup',fn);}
  _launchSelected(){const t=this._tracks?.[this._index];if(!t)return;try{localStorage.setItem('tdr2:trackKey',t.key);}catch(_){}this.registry.set('selectedTrackKey',t.key);this.registry.set('selectedTrack',t.key);if(this._mode==='admin')this.scene.start('track-editor',{trackKey:t.key});else this.scene.start('menu');}
  _preview(track,w=760,h=410){const fixed=`official_track_${track?.key}`;if(this.textures.exists(fixed))return fixed;const generated=this._generatedPreviewKeys?.get(track?.key);if(generated&&this.textures.exists(generated))return generated;const fallback=super._preview(track,w,h);this._queueGeneratedPreview(track);return fallback;}
  async _queueGeneratedPreview(track){const trackKey=track?.key;if(OFFICIAL_TRACK_WEBP[trackKey])return;if(!trackKey||this._generatedPreviewPending.has(trackKey)||this._generatedPreviewKeys.has(trackKey))return;this._generatedPreviewPending.add(trackKey);try{const row=await loadTrackPreview(trackKey,track);if(!row?.blob||!this.sys?.isActive?.())return;const textureKey=`generated_track_${trackKey}_${row.updatedAt||0}`;if(!this.textures.exists(textureKey)){const url=URL.createObjectURL(row.blob);try{const image=await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('preview'));img.src=url;});if(!this.textures.exists(textureKey))this.textures.addImage(textureKey,image);}finally{URL.revokeObjectURL(url);}}if(!this.textures.exists(textureKey))return;this._generatedPreviewKeys.set(trackKey,textureKey);if(this._tracks?.[this._index]?.key===trackKey&&this.sys?.isActive?.()){this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();}}catch(_){}finally{this._generatedPreviewPending.delete(trackKey);}}
}
