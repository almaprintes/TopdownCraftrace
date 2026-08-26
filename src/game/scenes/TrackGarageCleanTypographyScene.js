import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageUnifiedStyleScene.js';
import { pxToMeters } from '../cars/speedUnits.js';
import { t, getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';

function pts(track){return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:+p[0],y:+p[1]}:{x:+p?.x,y:+p?.y}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function lengthWorld(track){const direct=Number(track?.length??track?.trackLength??track?.meta?.length??track?.meta?.trackLength);if(Number.isFinite(direct)&&direct>0)return direct;const p=pts(track);let d=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];d+=Math.hypot(b.x-a.x,b.y-a.y);}return d;}
function lengthM(track){return Math.round(pxToMeters(lengthWorld(track)));}
function widthM(track){const raw=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160);return pxToMeters(Number.isFinite(raw)?raw:160);}
function sectors(track){const n=Number(track?.sectors);if(Number.isFinite(n)&&n>0)return Math.round(n);const c=track?.checkpointFractions;return Array.isArray(c)?Math.max(1,c.length+1):3;}
function surface(track){return String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||'Asfalto');}
function isDirt(track){return /dirt|tierra|gravel|grava/i.test(surface(track));}
function surfaceLabel(track){return isDirt(track)?t('lobby.dirt'):t('lobby.asphalt');}
function displayName(track){return getTrackPublicName(track,getLanguage());}
const FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor(){
    super();
    this._centerSelectedTrackOnNextLayout=true;
    this._premiumPreviewKeys=new Map();
    this._ownedPremiumTextureKeys=new Set();
  }

  create(){
    super.create();
    this.events.once('shutdown',()=>this._releasePremiumPreviews());
  }

  _releasePremiumPreviews(){
    for(const key of this._ownedPremiumTextureKeys){try{if(this.textures.exists(key))this.textures.remove(key);}catch(_){}}
    this._ownedPremiumTextureKeys.clear();this._premiumPreviewKeys.clear();
  }

  _setTrackScroll(y){
    if(this._centerSelectedTrackOnNextLayout&&this._trackViewport&&this._trackItems?.length){const selected=this._trackItems[this._index];if(selected?.item&&selected?.bg)y=this._trackViewport.height/2-(selected.item.y+selected.bg.height/2);this._centerSelectedTrackOnNextLayout=false;}
    super._setTrackScroll(y);
  }

  _displayPreview(track,w,h){const premium=this._ensurePremiumPreview(track,w,h);if(premium)return premium;const official=`official_track_${track?.key}`;if(this.textures.exists(official))return official;return super._displayPreview(track,w,h);}

  _ensurePremiumPreview(track,w=900,h=520){
    const p=pts(track);if(p.length<3)return null;const hero=Number(w)>=800,tier=hero?'hero':'thumb',renderW=hero?640:240,renderH=hero?380:150;const sig=`${track?.key}_${isDirt(track)?'dirt':'asphalt'}_${p.length}_${tier}_v4_memcap`;const existing=this._premiumPreviewKeys.get(sig);if(existing&&this.textures.exists(existing))return existing;const key=`premium_track_${sig}`;if(this.textures.exists(key)){this._premiumPreviewKeys.set(sig,key);return key;}
    try{const canvas=document.createElement('canvas');canvas.width=renderW;canvas.height=renderH;const ctx=canvas.getContext('2d');if(!ctx)return null;ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const xs=p.map(q=>q.x),ys=p.map(q=>q.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),pad=Math.min(renderW,renderH)*(hero?.105:.125),scale=Math.min((renderW-pad*2)/bw,(renderH-pad*2)/bh),ox=(renderW-bw*scale)/2-minX*scale,oy=(renderH-bh*scale)/2-minY*scale;const grass=ctx.createLinearGradient(0,0,renderW,renderH);grass.addColorStop(0,'#294d34');grass.addColorStop(.55,'#23452e');grass.addColorStop(1,'#183521');ctx.fillStyle=grass;ctx.fillRect(0,0,renderW,renderH);ctx.globalAlpha=hero?.075:.04;ctx.fillStyle='#79a56f';for(let y=0;y<renderH;y+=(hero?42:58))ctx.fillRect(0,y,renderW,1);ctx.globalAlpha=1;const path=()=>{ctx.beginPath();ctx.moveTo(p[0].x*scale+ox,p[0].y*scale+oy);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x*scale+ox,p[i].y*scale+oy);ctx.closePath();ctx.lineCap='round';ctx.lineJoin='round';};const rawWidth=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160),road=Math.max(hero?18:13,rawWidth*scale);if(isDirt(track)){path();ctx.strokeStyle='rgba(3,10,8,.42)';ctx.lineWidth=road*1.32;ctx.stroke();path();ctx.strokeStyle='#40382e';ctx.lineWidth=road*1.14;ctx.stroke();path();ctx.strokeStyle='#8b714f';ctx.lineWidth=road;ctx.stroke();}else{path();ctx.strokeStyle='rgba(3,9,11,.50)';ctx.lineWidth=road*1.29;ctx.stroke();path();ctx.strokeStyle='#171d20';ctx.lineWidth=road*1.15;ctx.stroke();path();ctx.strokeStyle=hero?'rgba(214,220,218,.74)':'rgba(198,205,203,.58)';ctx.lineWidth=road*(hero?1.045:1.035);ctx.stroke();path();ctx.strokeStyle='#3d4448';ctx.lineWidth=road*(hero?.945:.955);ctx.stroke();}const a=p[0],b=p[1],ax=a.x*scale+ox,ay=a.y*scale+oy,ang=Math.atan2((b.y-a.y)*scale,(b.x-a.x)*scale),cells=hero?8:6;ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);const across=road*.82,cellH=across/cells,cellW=Math.max(hero?4:5,road*(hero?.07:.10));for(let col=0;col<2;col++)for(let row=0;row<cells;row++){ctx.fillStyle=((col+row)&1)?'#202628':'#e8ebe7';ctx.fillRect((col-1)*cellW,-across/2+row*cellH,cellW+.6,cellH+.6);}ctx.restore();this.textures.addCanvas(key,canvas);this._premiumPreviewKeys.set(sig,key);this._ownedPremiumTextureKeys.add(key);return key;}catch{return null;}
  }

  _trackItem(x,y,w,h,track,i){const item=this.add.container(x,y),selected=i===this._index;this._trackList.add(item);const bg=this.add.rectangle(0,0,w,h,0x111a33,selected?.82:.50).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.65:.18),accent=this.add.rectangle(0,0,7,h,selected?0x2bff88:0x2b7bff,selected?.95:.70).setOrigin(0),thumbW=84,thumbH=h-14,thumbBg=this.add.rectangle(14,7,thumbW,thumbH,0x071016,1).setOrigin(0);item.add([bg,accent,thumbBg]);const key=this._displayPreview(track,420,360);if(key&&this.textures.exists(key)){const im=this.add.image(14+thumbW/2,h/2,key);im.setScale(Math.min((thumbW-4)/im.width,(thumbH-4)/im.height)).setAlpha(selected?1:.90);item.add(im);}const tx=110,available=Math.max(110,w-tx-12),label=displayName(track).toUpperCase(),nameSize=label.length>18?11:label.length>14?12:13;item.add(this.add.text(tx,14,label,{fontFamily:FONT,fontSize:`${nameSize}px`,fontStyle:'bold',color:'#fff',fixedWidth:available}));item.add(this.add.text(tx,42,`${String(i+1).padStart(2,'0')} · ${surfaceLabel(track)}\n${lengthM(track)} m · ${sectors(track)} ${t('tracks.sectors').toLowerCase()}`,{fontFamily:FONT,fontSize:'10.5px',color:selected?'#cad3f4':'#94a3c7',lineSpacing:2,fixedWidth:available}));const hit=this.add.rectangle(0,0,w,h,0,0.001).setOrigin(0).setInteractive({useHandCursor:true});item.add(hit);let sy=0,drag=false;hit.on('pointerdown',p=>{sy=p.y;drag=false;});hit.on('pointermove',p=>{if(Math.abs(p.y-sy)>8)drag=true;});hit.on('pointerup',()=>{if(drag||this._dragTrackList)return;this._index=i;this._centerSelectedTrackOnNextLayout=true;this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();});return{item,bg,hit};}

  _trackHero(root,g,x,y,w,h){const trk=this._tracks[this._index],title=displayName(trk).toUpperCase(),titleSize=title.length>20?23:title.length>15?25:27;root.add(this.add.text(x+w/2,y+12,title,{fontFamily:FONT,fontSize:`${titleSize}px`,fontStyle:'bold',color:'#fff'}).setOrigin(.5,0));const previewX=x+24,previewTop=y+50,footerH=66,previewW=w-48,previewH=Math.max(135,h-50-footerH-12);g.fillStyle(0x071016,.82).fillRoundedRect(previewX,previewTop,previewW,previewH,15);g.lineStyle(1,0xb7c0ff,.15).strokeRoundedRect(previewX,previewTop,previewW,previewH,15);const key=this._displayPreview(trk,1400,850);if(key&&this.textures.exists(key)){const im=this.add.image(previewX+previewW/2,previewTop+previewH/2,key);im.setScale(Math.min((previewW-14)/im.width,(previewH-12)/im.height));root.add(im);}const footerY=y+h-footerH,selectW=Math.min(250,w*.31),selectH=44,selectX=x+w-selectW-24,statsRight=selectX-18,statsX=x+24,statsW=Math.max(260,statsRight-statsX),cellW=statsW/4,rows=[[t('tracks.length'),`${lengthM(trk)} m`],[t('tracks.sectors'),String(sectors(trk))],[t('tracks.surface'),surfaceLabel(trk)],[t('tracks.width'),`${widthM(trk).toFixed(1)} m`]];rows.forEach((r,i)=>{const xx=statsX+i*cellW;if(i)g.lineStyle(1,0xb7c0ff,.10).lineBetween(xx,footerY+9,xx,footerY+52);root.add(this.add.text(xx+10,footerY+8,r[0],{fontFamily:FONT,fontSize:'8.5px',fontStyle:'bold',color:'#7f8fae'}));root.add(this.add.text(xx+10,footerY+27,r[1],{fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#fff'}));});const select=this.add.rectangle(selectX,footerY+8,selectW,selectH,0x2bff88,.95).setOrigin(0).setStrokeStyle(1,0x7dffc1,.75).setInteractive({useHandCursor:true});root.add(select);root.add(this.add.text(selectX+selectW/2,footerY+30,this._mode==='admin'?t('tracks.edit'):t('tracks.select'),{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:'#07131b'}).setOrigin(.5));select.on('pointerup',()=>this._launchSelected());}
}
