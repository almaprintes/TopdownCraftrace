import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageUnifiedStyleScene.js';
import { pxToMeters } from '../cars/speedUnits.js';

function pts(track){return (track?.centerline||[]).map(p=>Array.isArray(p)?{x:+p[0],y:+p[1]}:{x:+p?.x,y:+p?.y}).filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));}
function lengthWorld(track){const direct=Number(track?.length??track?.trackLength??track?.meta?.length??track?.meta?.trackLength);if(Number.isFinite(direct)&&direct>0)return direct;const p=pts(track);let d=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];d+=Math.hypot(b.x-a.x,b.y-a.y);}return d;}
function lengthM(track){return Math.round(pxToMeters(lengthWorld(track)));}
function widthM(track){const raw=Number(track?.trackWidth??track?.width??track?.meta?.trackWidth??160);return pxToMeters(Number.isFinite(raw)?raw:160);}
function sectors(track){const n=Number(track?.sectors);if(Number.isFinite(n)&&n>0)return Math.round(n);const c=track?.checkpointFractions;return Array.isArray(c)?Math.max(1,c.length+1):3;}
function surface(track){return String(track?.surface||track?.meta?.trackSurface||track?.meta?.surface||'Asfalto');}
const FONT='system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

export class TrackGarageScene extends CurrentTrackGarageScene {
  _trackItem(x,y,w,h,t,i){
    const item=this.add.container(x,y),selected=i===this._index;this._trackList.add(item);
    const bg=this.add.rectangle(0,0,w,h,0x111a33,selected?.82:.50).setOrigin(0).setStrokeStyle(2,selected?0x2bff88:0xb7c0ff,selected?.65:.18);
    const accent=this.add.rectangle(0,0,7,h,selected?0x2bff88:0x2b7bff,selected?.95:.70).setOrigin(0);
    const thumbW=84,thumbH=h-14;const thumbBg=this.add.rectangle(14,7,thumbW,thumbH,0x071016,1).setOrigin(0);
    item.add([bg,accent,thumbBg]);
    const key=this._displayPreview(t,360,210);if(key&&this.textures.exists(key)){const im=this.add.image(14+thumbW/2,h/2,key);im.setScale(Math.min((thumbW-6)/im.width,(thumbH-6)/im.height)).setAlpha(selected?1:.82);item.add(im);}

    const tx=110,available=Math.max(110,w-tx-12),label=String(t.name||t.key).toUpperCase();
    const nameSize=label.length>18?11:label.length>14?12:13;
    item.add(this.add.text(tx,14,label,{fontFamily:FONT,fontSize:`${nameSize}px`,fontStyle:'bold',color:'#fff',fixedWidth:available}));
    item.add(this.add.text(tx,42,`${String(i+1).padStart(2,'0')} · ${surface(t)}\n${lengthM(t)} m · ${sectors(t)} sectores`,{fontFamily:FONT,fontSize:'10.5px',color:selected?'#cad3f4':'#94a3c7',lineSpacing:2,fixedWidth:available}));

    const hit=this.add.rectangle(0,0,w,h,0,0.001).setOrigin(0).setInteractive({useHandCursor:true});item.add(hit);
    let sy=0,drag=false;hit.on('pointerdown',p=>{sy=p.y;drag=false;});hit.on('pointermove',p=>{if(Math.abs(p.y-sy)>8)drag=true;});hit.on('pointerup',()=>{if(drag||this._dragTrackList)return;this._index=i;this._commercial?.destroy(true);this._commercial=null;this._buildCommercial();});
    return {item,bg,hit};
  }

  _trackHero(root,g,x,y,w,h){
    const t=this._tracks[this._index];
    const title=String(t.name||t.key).toUpperCase();
    const titleSize=title.length>20?23:title.length>15?25:27;
    root.add(this.add.text(x+w/2,y+16,title,{fontFamily:FONT,fontSize:`${titleSize}px`,fontStyle:'bold',color:'#fff'}).setOrigin(.5,0));
    root.add(this.add.text(x+w/2,y+54,`${surface(t).toUpperCase()} · ${sectors(t)} SECTORES`,{fontFamily:FONT,fontSize:'12px',fontStyle:'bold',color:'#2bff88'}).setOrigin(.5,0));

    // Reserve a real footer instead of letting statistics and buttons occupy
    // the same pixels. This was the source of the stacked labels in the screenshots.
    const previewX=x+24,previewTop=y+82,footerH=66,previewW=w-48;
    const previewH=Math.max(135,h-82-footerH-12);
    g.fillStyle(0x071016,.82).fillRoundedRect(previewX,previewTop,previewW,previewH,15);
    g.lineStyle(1,0xb7c0ff,.15).strokeRoundedRect(previewX,previewTop,previewW,previewH,15);
    const key=this._displayPreview(t,1400,850);if(key&&this.textures.exists(key)){const im=this.add.image(previewX+previewW/2,previewTop+previewH/2,key);im.setScale(Math.min((previewW-28)/im.width,(previewH-22)/im.height));root.add(im);}

    const footerY=y+h-footerH;
    const selectW=Math.min(250,w*.31),selectH=44,selectX=x+w-selectW-24,statsRight=selectX-18;
    const statsX=x+24,statsW=Math.max(260,statsRight-statsX),cellW=statsW/4;
    const rows=[['LONGITUD',`${lengthM(t)} m`],['SECTORES',String(sectors(t))],['SUPERFICIE',surface(t)],['ANCHO',`${widthM(t).toFixed(1)} m`]];
    rows.forEach((r,i)=>{const xx=statsX+i*cellW;if(i)g.lineStyle(1,0xb7c0ff,.10).lineBetween(xx,footerY+9,xx,footerY+52);root.add(this.add.text(xx+10,footerY+8,r[0],{fontFamily:FONT,fontSize:'8.5px',fontStyle:'bold',color:'#7f8fae'}));root.add(this.add.text(xx+10,footerY+27,r[1],{fontFamily:FONT,fontSize:'13px',fontStyle:'bold',color:'#fff'}));});

    const select=this.add.rectangle(selectX,footerY+8,selectW,selectH,0x2bff88,.95).setOrigin(0).setStrokeStyle(1,0x7dffc1,.75).setInteractive({useHandCursor:true});root.add(select);
    root.add(this.add.text(selectX+selectW/2,footerY+30,this._mode==='admin'?'EDITAR':'SELECCIONAR',{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:'#07131b'}).setOrigin(.5));
    select.on('pointerup',()=>this._launchSelected());
  }
}
