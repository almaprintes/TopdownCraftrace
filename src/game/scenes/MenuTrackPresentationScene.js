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
  for(const child of list){
    out.push(child);
    if(Array.isArray(child?.list))walkGameObjects(child,out);
  }
  return out;
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){
    super.renderUI();
    this._recomposeHeroInfo();
    this._renderSelectedTrackCard();
  }

  _recomposeHeroInfo(){
    if(!this._ui)return;
    const {width}=this.scale;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];
    const oldTrackTitle=String(track?.name||this._trackTitle(key)||'').trim().toLowerCase();
    const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase();

    const objects=walkGameObjects(this._ui,[]);

    // Remove only the legacy circuit-name text from the old car information row.
    // The new circuit card below is the sole place where the circuit name lives.
    for(const obj of objects){
      const txt=String(obj?.text??'').trim().toLowerCase();
      if(!txt)continue;
      if(oldTrackTitle&&txt===oldTrackTitle){
        try{obj.destroy();}catch{}
      }
    }

    // Move the whole selected-car information panel clearly to the left.
    // Its title text is a reliable anchor to the parent HUD container created by MenuScene.
    const carTitleObj=objects.find(obj=>{
      const txt=String(obj?.text??'').trim().toLowerCase();
      return !!carName && txt===carName;
    });
    const panel=carTitleObj?.parentContainer;
    if(panel&&Number.isFinite(panel.x)){
      panel.x-=clamp(Math.floor(width*.13),170,250);
    }
  }

  _renderSelectedTrackCard(){
    const {width,height}=this.scale;
    if(width<760)return;

    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[key];
    if(!track)return;

    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;
    if(!Array.isArray(center)||center.length<2)return;

    // High right-side placement: deliberately above the mode selector and play button.
    const cardW=clamp(Math.floor(width*.28),350,480);
    const cardH=clamp(Math.floor(height*.17),126,148);
    const rightMargin=clamp(Math.floor(width*.045),46,72);
    const cardX=width-rightMargin-cardW/2;
    const cardY=clamp(Math.floor(height*.235),170,225);

    const card=this.add.container(cardX,cardY).setDepth(34);
    this._ui?.add(card);

    card.add(this.add.rectangle(0,0,cardW,cardH,0x07131b,.84)
      .setOrigin(.5).setStrokeStyle(2,0x25d7ff,.35));
    card.add(this.add.rectangle(0,-cardH/2+3,cardW-6,3,0x25d7ff,.65).setOrigin(.5,0));

    const left=-cardW/2+16;
    const top=-cardH/2+10;
    card.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#6deaff',letterSpacing:1
    }).setOrigin(0));

    card.add(this.add.text(left,top+18,String(track.name||this._trackTitle(key)).toUpperCase(),{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'19px',fontStyle:'bold',color:'#ffffff'
    }).setOrigin(0));

    const previewX=left+68;
    const previewY=top+75;
    const previewW=Math.min(132,cardW*.28);
    const previewH=62;

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
      const s=Math.min((previewW-16)/(maxX-minX),(previewH-14)/(maxY-minY));
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

    const statsX=left+150;
    const colGap=Math.max(96,Math.floor((cardW-180)/2));
    const labelStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#7d8da7'};
    const valueStyle={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff'};
    const rows=[
      ['LONGITUD',`${lengthM} m`],
      ['SECTORES',String(sectors)],
      ['SUPERFICIE',surface],
      ['DIFICULTAD',difficulty]
    ];
    rows.forEach((r,i)=>{
      const col=i%2,row=Math.floor(i/2);
      const rx=statsX+col*colGap,ry=top+52+row*35;
      card.add(this.add.text(rx,ry,r[0],labelStyle).setOrigin(0));
      card.add(this.add.text(rx,ry+12,r[1],valueStyle).setOrigin(0));
    });

    card.add(this.add.text(cardW/2-12,cardH/2-9,direction,{
      fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#57ffb0'
    }).setOrigin(1,1));
  }
}
