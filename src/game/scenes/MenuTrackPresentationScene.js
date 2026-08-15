import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';

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

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    this._renderSelectedTrackCard();
  }

  _renderSelectedTrackCard(){
    const {width,height}=this.scale;
    if(width<760)return;

    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];
    if(!track)return;

    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;
    if(!Array.isArray(center)||center.length<2)return;

    const cardW=clamp(Math.floor(width*.30),360,520);
    const cardH=clamp(Math.floor(height*.19),132,164);
    const cardX=width-clamp(Math.floor(width*.055),54,84)-cardW/2;
    const cardY=clamp(Math.floor(height*.48),310,410);

    const card=this.add.container(cardX,cardY).setDepth(34);
    this._ui?.add(card);

    card.add(this.add.rectangle(0,0,cardW,cardH,0x07131b,.84)
      .setOrigin(.5).setStrokeStyle(2,0x25d7ff,.35));
    card.add(this.add.rectangle(0,-cardH/2+3,cardW-6,3,0x25d7ff,.65).setOrigin(.5,0));

    const left=-cardW/2+16;
    const top=-cardH/2+12;
    card.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#6deaff',letterSpacing:1
    }).setOrigin(0));

    card.add(this.add.text(left,top+19,String(track.name||this._trackTitle(key)).toUpperCase(),{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'20px',fontStyle:'bold',color:'#ffffff'
    }).setOrigin(0));

    const previewX=left+78;
    const previewY=top+83;
    const previewW=Math.min(150,cardW*.30);
    const previewH=70;

    card.add(this.add.rectangle(previewX,previewY,previewW,previewH,0x071018,.72)
      .setOrigin(.5).setStrokeStyle(1,0xffffff,.10));

    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of center){
      const x=Number(p?.x),y=Number(p?.y);
      if(!Number.isFinite(x)||!Number.isFinite(y))continue;
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
    }
    if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){
      const g=this.add.graphics();
      const s=Math.min((previewW-18)/(maxX-minX),(previewH-16)/(maxY-minY));
      const ox=previewX-(maxX-minX)*s/2;
      const oy=previewY-(maxY-minY)*s/2;
      g.lineStyle(5,0x000000,.45);
      g.beginPath();
      center.forEach((p,i)=>{
        const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;
        if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
      });
      g.closePath();g.strokePath();
      g.lineStyle(2,0xffffff,.95);
      g.beginPath();
      center.forEach((p,i)=>{
        const x=ox+(Number(p.x)-minX)*s,y=oy+(Number(p.y)-minY)*s;
        if(i===0)g.moveTo(x,y);else g.lineTo(x,y);
      });
      g.closePath();g.strokePath();
      card.add(g);
    }

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX);
    const sectors=Math.max(1,(track.checkpoints?.length||2)+1);
    const surface=surfaceLabel(track);
    const difficulty=String(track.difficulty||'Media').toUpperCase();
    const direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';

    const statsX=left+168;
    const labelStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#7d8da7'};
    const valueStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#ffffff'};
    const rows=[
      ['LONGITUD',`${lengthM} m`],
      ['SECTORES',String(sectors)],
      ['SUPERFICIE',surface],
      ['DIFICULTAD',difficulty]
    ];
    rows.forEach((r,i)=>{
      const col=i%2,row=Math.floor(i/2);
      const rx=statsX+col*112,ry=top+58+row*40;
      card.add(this.add.text(rx,ry,r[0],labelStyle).setOrigin(0));
      card.add(this.add.text(rx,ry+13,r[1],valueStyle).setOrigin(0));
    });

    card.add(this.add.text(cardW/2-14,cardH/2-13,direction,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#57ffb0'
    }).setOrigin(1,1));
  }
}
