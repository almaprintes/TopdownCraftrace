import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function loopLength(center){if(!Array.isArray(center)||center.length<2)return 0;let total=0;for(let i=0;i<center.length;i++){const a=center[i],b=center[(i+1)%center.length];total+=Math.hypot((b?.x||0)-(a?.x||0),(b?.y||0)-(a?.y||0));}return total;}
function surfaceLabel(track){const id=String(track?.id||track?.key||'').toLowerCase();const category=String(track?.category||'').toLowerCase();return (id.includes('offroad')||id.includes('raven')||category.includes('dirt')||category.includes('tierra'))?'TIERRA':'ASFALTO';}
function walk(node,out=[]){if(!node)return out;for(const child of (Array.isArray(node.list)?node.list:[])){out.push(child);if(Array.isArray(child?.list))walk(child,out);}return out;}

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    this._removeLegacyCarHud();
    this._renderCleanCarCard();
    this._renderSelectedTrackCard();
  }

  _removeLegacyCarHud(){
    if(!this._ui)return;
    const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase();
    const objects=walk(this._ui,[]);
    const title=objects.find(o=>String(o?.text??'').trim().toLowerCase()===carName);
    const panel=title?.parentContainer;
    if(panel){try{panel.destroy(true);}catch{}}
  }

  _renderCleanCarCard(){
    const {width,height}=this.scale;
    const spec=CAR_SPECS?.[this.selectedCarId];if(!spec)return;
    const p=resolveCarParams(spec,{accelMult:1,brakeMult:1,dragMult:1,turnRateMult:1,maxFwdAdd:0,maxRevAdd:0,turnMinAdd:0});
    const topKmh=Math.round((Number(p?.maxFwd)||0)*.185);
    const cardW=clamp(Math.floor(width*.22),300,390),cardH=clamp(Math.floor(height*.13),86,106);
    const cardX=clamp(Math.floor(width*.405),560,730),cardY=clamp(Math.floor(height*.17),105,138);
    const c=this.add.container(cardX,cardY).setDepth(34);this._ui?.add(c);
    c.add(this.add.rectangle(0,0,cardW,cardH,0x07131b,.80).setOrigin(.5).setStrokeStyle(1,0xb7c0ff,.20));
    const left=-cardW/2+16,top=-cardH/2+12;
    const brandSlug=this._brandSlug?.(spec?.brand);
    if(brandSlug){const key=this._logoKey?.(brandSlug,false);if(key&&this.textures.exists(key)){const logo=this.add.image(left+28,0,key).setOrigin(.5);const s=Math.min(52/(logo.width||1),52/(logo.height||1));logo.setScale(s);c.add(logo);}}
    c.add(this.add.text(left+62,top,String(p?.name||spec?.name||this.selectedCarId).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'20px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));
    c.add(this.add.text(left+62,top+34,`${topKmh} km/h`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#b7c0ff'}).setOrigin(0));
    const grip=String(spec?.category||spec?.class||'').trim();
    if(grip)c.add(this.add.text(cardW/2-14,cardH/2-14,grip.toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#57ffb0'}).setOrigin(1,1));
  }

  _renderSelectedTrackCard(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];if(!track)return;
    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;if(!Array.isArray(center)||center.length<2)return;

    const cardW=clamp(Math.floor(width*.31),420,520),cardH=clamp(Math.floor(height*.145),106,124);
    const cardX=width-clamp(Math.floor(width*.045),44,68)-cardW/2;
    const cardY=clamp(Math.floor(height*.17),105,138);
    const c=this.add.container(cardX,cardY).setDepth(34);this._ui?.add(c);
    c.add(this.add.rectangle(0,0,cardW,cardH,0x07131b,.88).setOrigin(.5).setStrokeStyle(2,0x25d7ff,.42));
    c.add(this.add.rectangle(0,-cardH/2+3,cardW-6,3,0x25d7ff,.72).setOrigin(.5,0));
    const left=-cardW/2+14,top=-cardH/2+8;
    c.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#6deaff',letterSpacing:1}).setOrigin(0));
    c.add(this.add.text(left,top+15,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));

    const previewX=left+66,previewY=top+64,previewW=120,previewH=50;
    c.add(this.add.rectangle(previewX,previewY,previewW,previewH,0x071018,.72).setOrigin(.5).setStrokeStyle(1,0xffffff,.10));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of center){const x=Number(p?.x),y=Number(p?.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){const g=this.add.graphics(),s=Math.min((previewW-14)/(maxX-minX),(previewH-10)/(maxY-minY)),ox=previewX-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;g.lineStyle(4,0x000000,.45);g.beginPath();center.forEach((p,i)=>{const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.strokePath();g.lineStyle(2,0xffffff,.95);g.beginPath();center.forEach((p,i)=>{const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.strokePath();c.add(g);}

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX),sectors=Math.max(1,(track.checkpoints?.length||2)+1),surface=surfaceLabel(track),difficulty=String(track.difficulty||'Media').toUpperCase(),direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const statsX=left+144,colGap=Math.max(104,Math.floor((cardW-176)/2));
    const ls={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#7d8da7'},vs={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#ffffff'};
    [['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['DIFICULTAD',difficulty]].forEach((r,i)=>{const col=i%2,row=Math.floor(i/2),rx=statsX+col*colGap,ry=top+36+row*29;c.add(this.add.text(rx,ry,r[0],ls).setOrigin(0));c.add(this.add.text(rx,ry+9,r[1],vs).setOrigin(0));});
    c.add(this.add.text(cardW/2-10,cardH/2-6,direction,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#57ffb0'}).setOrigin(1,1));
  }
}
