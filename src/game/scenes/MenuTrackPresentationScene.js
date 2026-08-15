import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';
import { CAR_SPECS } from '../cars/carSpecs.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function loopLength(center){
  if(!Array.isArray(center)||center.length<2)return 0;
  let total=0;
  for(let i=0;i<center.length;i++){
    const a=center[i],b=center[(i+1)%center.length];
    total+=Math.hypot((b?.x||0)-(a?.x||0),(b?.y||0)-(a?.y||0));
  }
  return total;
}
function surfaceLabel(track){
  const id=String(track?.id||track?.key||'').toLowerCase();
  const category=String(track?.category||'').toLowerCase();
  if(id.includes('offroad')||id.includes('raven')||category.includes('dirt')||category.includes('tierra'))return 'TIERRA';
  return 'ASFALTO';
}
function walkGameObjects(node,out=[]){
  if(!node)return out;
  const list=Array.isArray(node.list)?node.list:[];
  for(const child of list){out.push(child);if(Array.isArray(child?.list))walkGameObjects(child,out);}
  return out;
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){super.renderUI();this._recomposeHeroInfo();this._renderSelectedTrackCard();}

  _recomposeHeroInfo(){
    if(!this._ui)return;
    const {width,height}=this.scale;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];
    const trackNames=new Set([
      String(track?.name||'').trim().toLowerCase(),
      String(this._trackTitle(key)||'').trim().toLowerCase(),
      String(key||'').trim().toLowerCase()
    ].filter(Boolean));
    const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase();
    const objects=walkGameObjects(this._ui,[]);

    // The old hero row used three values: speed / track / grip. Kill its middle value
    // by position as well as by text, so aliases such as "Forest Endurance" cannot survive.
    const carTitleObj=objects.find(o=>String(o?.text??'').trim().toLowerCase()===carName);
    const panel=carTitleObj?.parentContainer;
    if(panel){
      const panelTexts=Array.isArray(panel.list)?panel.list.filter(o=>typeof o?.text==='string'):[];
      for(const obj of panelTexts){
        const txt=String(obj.text||'').trim().toLowerCase();
        const looksLikeTrack=trackNames.has(txt);
        const isMiddleLegacyStat=Number.isFinite(obj.x)&&Math.abs(obj.x)<=12&&obj!==carTitleObj;
        if(looksLikeTrack||isMiddleLegacyStat){try{obj.destroy();}catch{}}
      }
      // Compact car HUD, upper-left of the car. This leaves a clean lane for the track HUD.
      panel.x=clamp(Math.floor(width*.43),500,680);
      panel.y=clamp(Math.floor(height*.205),118,158);
    }
  }

  _renderSelectedTrackCard(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];if(!track)return;
    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;
    if(!Array.isArray(center)||center.length<2)return;

    // Wider + shallower card: title/preview on left, all facts in a clean right grid.
    const cardW=clamp(Math.floor(width*.34),430,560);
    const cardH=clamp(Math.floor(height*.145),108,126);
    const rightMargin=clamp(Math.floor(width*.04),40,64);
    const cardX=width-rightMargin-cardW/2;
    const cardY=clamp(Math.floor(height*.19),118,150);
    const card=this.add.container(cardX,cardY).setDepth(34);this._ui?.add(card);
    card.add(this.add.rectangle(0,0,cardW,cardH,0x07131b,.88).setOrigin(.5).setStrokeStyle(2,0x25d7ff,.42));
    card.add(this.add.rectangle(0,-cardH/2+3,cardW-6,3,0x25d7ff,.72).setOrigin(.5,0));

    const left=-cardW/2+16,top=-cardH/2+9;
    card.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#6deaff',letterSpacing:1}).setOrigin(0));
    card.add(this.add.text(left,top+16,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));

    const previewX=left+68,previewY=top+66,previewW=126,previewH=54;
    card.add(this.add.rectangle(previewX,previewY,previewW,previewH,0x071018,.72).setOrigin(.5).setStrokeStyle(1,0xffffff,.10));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of center){const x=Number(p?.x),y=Number(p?.y);if(!Number.isFinite(x)||!Number.isFinite(y))continue;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){
      const g=this.add.graphics(),s=Math.min((previewW-16)/(maxX-minX),(previewH-12)/(maxY-minY)),ox=previewX-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;
      g.lineStyle(5,0x000000,.45);g.beginPath();center.forEach((p,i)=>{const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.strokePath();
      g.lineStyle(2,0xffffff,.95);g.beginPath();center.forEach((p,i)=>{const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;i?g.lineTo(x,y):g.moveTo(x,y);});g.closePath();g.strokePath();card.add(g);
    }

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX),sectors=Math.max(1,(track.checkpoints?.length||2)+1),surface=surfaceLabel(track),difficulty=String(track.difficulty||'Media').toUpperCase(),direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const statsX=left+154,colGap=Math.max(108,Math.floor((cardW-190)/2));
    const labelStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#7d8da7'},valueStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'};
    [['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['DIFICULTAD',difficulty]].forEach((r,i)=>{const col=i%2,row=Math.floor(i/2),rx=statsX+col*colGap,ry=top+38+row*31;card.add(this.add.text(rx,ry,r[0],labelStyle).setOrigin(0));card.add(this.add.text(rx,ry+10,r[1],valueStyle).setOrigin(0));});
    card.add(this.add.text(cardW/2-12,cardH/2-7,direction,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#57ffb0'}).setOrigin(1,1));
  }
}
