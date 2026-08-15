import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function loopLength(center){if(!Array.isArray(center)||center.length<2)return 0;let total=0;for(let i=0;i<center.length;i++){const a=center[i],b=center[(i+1)%center.length];total+=Math.hypot((b?.x||0)-(a?.x||0),(b?.y||0)-(a?.y||0));}return total;}
function surfaceLabel(track){const id=String(track?.id||track?.key||'').toLowerCase();const category=String(track?.category||'').toLowerCase();return (id.includes('offroad')||id.includes('raven')||category.includes('dirt')||category.includes('tierra'))?'TIERRA':'ASFALTO';}
function walk(node,out=[]){if(!node)return out;for(const child of (Array.isArray(node.list)?node.list:[])){out.push(child);if(Array.isArray(child?.list))walk(child,out);}return out;}
function addChamferFrame(scene,container,w,h,accent=0x25d7ff){
  const g=scene.add.graphics();
  const x=-w/2,y=-h/2,c=12;
  g.fillStyle(0x07131b,.88);
  g.lineStyle(2,accent,.72);
  g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();
  g.lineStyle(1,0xffffff,.08);g.strokeRect(x+8,y+8,w-16,h-16);
  g.fillStyle(accent,.65);g.fillRect(x+c,y+2,Math.max(72,w*.22),3);
  container.add(g);
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    this._removeLegacyCarHud();
    this._renderWelcomeCarCard();
    this._renderWelcomeTrackCard();
  }

  _removeLegacyCarHud(){
    if(!this._ui)return;
    const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase();
    const objects=walk(this._ui,[]);
    const doomed=new Set();
    for(const o of objects){
      if(typeof o?.text!=='string')continue;
      const txt=o.text.trim().toLowerCase();
      if(txt===carName || txt==='grip medio' || /km\/h/i.test(txt)){
        const p=o.parentContainer;
        if(p&&p!==this._ui)doomed.add(p);
      }
    }
    for(const p of doomed){try{p.destroy(true);}catch{}}
  }

  _renderWelcomeCarCard(){
    const {width,height}=this.scale;
    const spec=CAR_SPECS?.[this.selectedCarId];if(!spec)return;
    const p=resolveCarParams(spec,{accelMult:1,brakeMult:1,dragMult:1,turnRateMult:1,maxFwdAdd:0,maxRevAdd:0,turnMinAdd:0});
    const topKmh=Math.round((Number(p?.maxFwd)||0)*.185);
    const w=clamp(Math.floor(width*.255),360,470),h=clamp(Math.floor(height*.145),100,118);
    const x=clamp(Math.floor(width*.36),520,700),y=clamp(Math.floor(height*.175),112,138);
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0x35cfff);
    const left=-w/2+18,top=-h/2+10;
    c.add(this.add.text(left,top,'COCHE SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#6deaff',letterSpacing:1}).setOrigin(0));
    const brandSlug=this._brandSlug?.(spec?.brand);
    let textX=left;
    if(brandSlug){const logoKey=this._logoKey?.(brandSlug,false);if(logoKey&&this.textures.exists(logoKey)){const logo=this.add.image(left+34,12,logoKey).setOrigin(.5);const s=Math.min(60/(logo.width||1),60/(logo.height||1));logo.setScale(s);c.add(logo);textX=left+76;}}
    c.add(this.add.text(textX,top+23,String(p?.name||spec?.name||this.selectedCarId).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'21px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));
    c.add(this.add.text(textX,top+55,`${topKmh} km/h`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#b7c0ff'}).setOrigin(0));
    const badge=String(spec?.category||spec?.class||'').trim().toUpperCase();
    if(badge){const bw=Math.max(68,badge.length*7+20),bx=w/2-bw/2-14,by=h/2-20;c.add(this.add.rectangle(bx,by,bw,24,0x10273a,.92).setOrigin(.5).setStrokeStyle(1,0x35cfff,.4));c.add(this.add.text(bx,by,badge,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8deaff'}).setOrigin(.5));}
  }

  _renderWelcomeTrackCard(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];if(!track)return;
    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;if(!Array.isArray(center)||center.length<2)return;
    const w=clamp(Math.floor(width*.34),470,590),h=clamp(Math.floor(height*.145),100,118);
    const rightMargin=clamp(Math.floor(width*.055),64,92),x=width-rightMargin-w/2,y=clamp(Math.floor(height*.175),112,138);
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0xd8a73a);
    const left=-w/2+16,top=-h/2+10;
    c.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1}).setOrigin(0));
    c.add(this.add.text(left,top+20,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));

    const previewW=126,previewH=50,previewX=left+64,previewY=top+72;
    c.add(this.add.rectangle(previewX,previewY,previewW,previewH,0x050b10,.55).setOrigin(.5).setStrokeStyle(1,0xd8a73a,.22));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of center){const px=Number(p?.x),py=Number(p?.y);if(!Number.isFinite(px)||!Number.isFinite(py))continue;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){const g=this.add.graphics(),s=Math.min((previewW-16)/(maxX-minX),(previewH-12)/(maxY-minY)),ox=previewX-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;g.lineStyle(5,0x000000,.5);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();g.lineStyle(2,0xffffff,.96);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();c.add(g);}

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX),sectors=Math.max(1,(track.checkpoints?.length||2)+1),surface=surfaceLabel(track),direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const sx=left+150,sy=top+48,cellW=Math.max(98,Math.floor((w-184)/2)),cellH=30;
    const labelStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#8b97a8'},valueStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'};
    [['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['SENTIDO',direction]].forEach((r,i)=>{const col=i%2,row=Math.floor(i/2),rx=sx+col*cellW,ry=sy+row*cellH;c.add(this.add.text(rx,ry,r[0],labelStyle).setOrigin(0));c.add(this.add.text(rx,ry+10,r[1],valueStyle).setOrigin(0));});
  }
}
