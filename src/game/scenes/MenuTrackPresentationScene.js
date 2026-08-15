import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX, attainableTopSpeedKmh } from '../cars/speedUnits.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function loopLength(center){if(!Array.isArray(center)||center.length<2)return 0;let total=0;for(let i=0;i<center.length;i++){const a=center[i],b=center[(i+1)%center.length];total+=Math.hypot((b?.x||0)-(a?.x||0),(b?.y||0)-(a?.y||0));}return total;}
function surfaceLabel(track){const id=String(track?.id||track?.key||'').toLowerCase();const category=String(track?.category||'').toLowerCase();return (id.includes('offroad')||id.includes('raven')||category.includes('dirt')||category.includes('tierra'))?'TIERRA':'ASFALTO';}
function walk(node,out=[]){if(!node)return out;for(const child of (Array.isArray(node.list)?node.list:[])){out.push(child);if(Array.isArray(child?.list))walk(child,out);}return out;}
function addChamferFrame(scene,container,w,h,accent=0x25d7ff){
  const g=scene.add.graphics(),x=-w/2,y=-h/2,c=10;
  g.fillStyle(0x07131b,.90);g.lineStyle(2,accent,.74);
  g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();
  g.lineStyle(1,0xffffff,.06);g.strokeRect(x+6,y+6,w-12,h-12);
  g.fillStyle(accent,.72);g.fillRect(x+c,y+2,Math.max(64,w*.20),3);container.add(g);
}

export class MenuScene extends CurrentMenuScene{
  renderUI(){super.renderUI();this._removeLegacyHeroHud();this._removeLegacyEventPanel();this._renderWelcomeCards();this._renderMissionCard();}

  _removeLegacyHeroHud(){
    if(!this._ui)return;
    const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase();
    const doomed=new Set();
    for(const o of walk(this._ui,[])){
      if(typeof o?.text!=='string')continue;
      const txt=String(o.text||'').trim().toLowerCase();
      if(txt===carName||txt==='grip medio'||/^[0-9]+\s*km\/h$/i.test(txt)){
        const p=o.parentContainer;if(p&&p!==this._ui)doomed.add(p);
      }
    }
    for(const p of doomed){try{p.destroy(true);}catch{}}
  }

  _removeLegacyEventPanel(){
    if(!this._ui)return;
    for(const o of walk(this._ui,[])){
      if(o?.texture?.key==='panel_event'){
        const p=o.parentContainer;try{(p&&p!==this._ui?p:o).destroy(true);}catch{}
      }
    }
  }

  _renderWelcomeCards(){
    const {width,height}=this.scale;if(width<760)return;
    const trackKey=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    const track=TRACK_REGISTRY?.[trackKey],spec=CAR_SPECS?.[this.selectedCarId];if(!track||!spec)return;

    // Anchors taken directly from the user's yellow cross markup:
    // vertical guide = exact screen centre; horizontal guide = 40.5% of height.
    // Car is centred on the vertical guide. Mission/track are mirrored at 25%/75%
    // and share the exact same horizontal centre line.
    const guideX=Math.floor(width*.5);
    const guideY=Math.floor(height*.405);

    const carW=clamp(Math.floor(width*.285),390,520);
    const carH=clamp(Math.floor(height*.115),82,94);
    const carX=guideX;
    const carY=clamp(Math.floor(height*.155),92,118);

    const trackW=clamp(Math.floor(width*.285),390,500);
    const trackH=clamp(Math.floor(height*.142),98,116);
    const trackX=Math.floor(width*.75);
    const trackY=guideY;

    this._renderCarCard(carX,carY,carW,carH,spec);
    this._renderTrackCard(trackX,trackY,trackW,trackH,track,trackKey);
  }

  _renderCarCard(x,y,w,h,spec){
    const p=resolveCarParams(spec,{accelMult:1,brakeMult:1,dragMult:1,turnRateMult:1,maxFwdAdd:0,maxRevAdd:0,turnMinAdd:0});
    const topKmh=Math.round(attainableTopSpeedKmh(p));
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0x35cfff);
    const left=-w/2+12,top=-h/2+7;
    c.add(this.add.text(left,top,'COCHE SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#6deaff',letterSpacing:1}).setOrigin(0));

    let textX=left+4;
    const brandSlug=this._brandSlug?.(spec?.brand);
    if(brandSlug){const logoKey=this._logoKey?.(brandSlug,false);if(logoKey&&this.textures.exists(logoKey)){const logo=this.add.image(left+30,7,logoKey).setOrigin(.5);const s=Math.min(46/(logo.width||1),46/(logo.height||1));logo.setScale(s);c.add(logo);textX=left+62;}}

    c.add(this.add.text(textX,top+20,String(p?.name||spec?.name||this.selectedCarId).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));
    c.add(this.add.text(textX,top+44,`${topKmh} km/h`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#b7c0ff'}).setOrigin(0));

    const badge=String(spec?.category||spec?.class||'').trim().toUpperCase();
    if(badge){const bw=Math.min(92,Math.max(58,badge.length*6+16)),bx=w/2-bw/2-10,by=h/2-14;c.add(this.add.rectangle(bx,by,bw,18,0x10273a,.9).setOrigin(.5).setStrokeStyle(1,0x35cfff,.38));c.add(this.add.text(bx,by,badge,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#8deaff'}).setOrigin(.5));}
  }

  _renderTrackCard(x,y,w,h,track,key){
    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;if(!Array.isArray(center)||center.length<2)return;
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0xd8a73a);
    const left=-w/2+12,top=-h/2+8;
    c.add(this.add.text(left,top,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1}).setOrigin(0));
    c.add(this.add.text(left,top+17,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));

    const previewW=94,previewH=42,previewX=left+47,previewY=top+65;
    c.add(this.add.rectangle(previewX,previewY,previewW,previewH,0x050b10,.56).setOrigin(.5).setStrokeStyle(1,0xd8a73a,.20));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of center){const px=Number(p?.x),py=Number(p?.y);if(!Number.isFinite(px)||!Number.isFinite(py))continue;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}
    if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){const g=this.add.graphics(),s=Math.min((previewW-12)/(maxX-minX),(previewH-8)/(maxY-minY)),ox=previewX-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;g.lineStyle(4,0x000000,.5);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();g.lineStyle(2,0xffffff,.96);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();c.add(g);}

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX),sectors=Math.max(1,(track.checkpoints?.length||2)+1),surface=surfaceLabel(track),direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const zoneLeft=left+112,zoneRight=w/2-12,zoneW=zoneRight-zoneLeft;
    const colCenters=[zoneLeft+zoneW*.25,zoneLeft+zoneW*.75];
    const rowCenters=[top+48,top+76];
    const ls={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'6px',fontStyle:'bold',color:'#8b97a8',align:'center'};
    const vs={fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#ffffff',align:'center'};
    [['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['SENTIDO',direction]].forEach((r,i)=>{const cx=colCenters[i%2],cy=rowCenters[Math.floor(i/2)];c.add(this.add.text(cx,cy,r[0],ls).setOrigin(.5,.5));c.add(this.add.text(cx,cy+9,r[1],vs).setOrigin(.5,.5));});
  }

  _renderMissionCard(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';
    let laps=0,best=null;
    try{const hist=JSON.parse(localStorage.getItem(`tdr2:ttHist:${key}`)||'null')?.history;if(Array.isArray(hist)){laps=hist.filter(r=>r&&Number.isFinite(r.lapMs)).length;for(const r of hist){if(Number.isFinite(r?.lapMs)&&(best==null||r.lapMs<best))best=r.lapMs;}}}catch{}
    const target=3,done=Math.min(target,laps),complete=done>=target;

    // Same horizontal centre as circuit card; mirrored to the left quarter.
    const w=clamp(Math.floor(width*.235),320,390);
    const h=clamp(Math.floor(height*.142),98,116);
    const x=Math.floor(width*.25);
    const y=Math.floor(height*.405);
    const c=this.add.container(x,y).setDepth(24);this._ui?.add(c);addChamferFrame(this,c,w,h,complete?0x39ff9a:0x35cfff);
    const left=-w/2+14,top=-h/2+10,accent=complete?'#62ffb2':'#6deaff';

    c.add(this.add.text(left,top,complete?'RETO COMPLETADO':'RETO DE PILOTO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:accent,letterSpacing:1}).setOrigin(0));
    c.add(this.add.text(left,top+21,complete?'3 VUELTAS REGISTRADAS':'COMPLETA 3 VUELTAS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0));
    c.add(this.add.text(left,top+44,best==null?'Tu primera vuelta fijará el tiempo de referencia.':`Mejor vuelta: ${this._formatMissionTime(best)}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#aebdca'}).setOrigin(0));

    const barX=left,barY=top+69,barW=w-28,barH=8;
    c.add(this.add.rectangle(barX,barY,barW,barH,0x10202b,.9).setOrigin(0).setStrokeStyle(1,0xffffff,.12));
    if(done>0)c.add(this.add.rectangle(barX+2,barY+2,(barW-4)*(done/target),barH-4,complete?0x39ff9a:0x35cfff,.9).setOrigin(0));
    c.add(this.add.text(left,top+84,`${done} / ${target} VUELTAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:accent}).setOrigin(0));
  }

  _formatMissionTime(ms){const t=Math.max(0,Number(ms)||0),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);return `${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;}
}
