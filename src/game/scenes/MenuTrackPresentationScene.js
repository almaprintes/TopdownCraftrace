import { MenuScene as CurrentMenuScene } from './MenuCleanTypographyScene.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { METERS_PER_PX, attainableTopSpeedKmh } from '../cars/speedUnits.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function loopLength(center){if(!Array.isArray(center)||center.length<2)return 0;let total=0;for(let i=0;i<center.length;i++){const a=center[i],b=center[(i+1)%center.length];total+=Math.hypot((b?.x||0)-(a?.x||0),(b?.y||0)-(a?.y||0));}return total;}
function surfaceLabel(track){const id=String(track?.id||track?.key||'').toLowerCase(),cat=String(track?.category||'').toLowerCase();return(id.includes('offroad')||id.includes('raven')||cat.includes('dirt')||cat.includes('tierra'))?'TIERRA':'ASFALTO';}
function walk(node,out=[]){if(!node)return out;for(const child of(Array.isArray(node.list)?node.list:[])){out.push(child);if(Array.isArray(child?.list))walk(child,out);}return out;}
function addChamferFrame(scene,container,w,h,accent=0x25d7ff){const g=scene.add.graphics(),x=-w/2,y=-h/2,c=10;g.fillStyle(0x07131b,.92);g.lineStyle(2,accent,.78);g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();g.lineStyle(1,0xffffff,.05);g.strokeRect(x+5,y+5,w-10,h-10);g.fillStyle(accent,.74);g.fillRect(x+c,y+2,Math.max(48,w*.22),3);container.add(g);}

export class MenuScene extends CurrentMenuScene{
  renderUI(){super.renderUI();this._removeLegacyHeroHud();this._removeLegacyEventPanel();this._renderWelcomeCards();this._renderMissionCard();}

  _removeLegacyHeroHud(){if(!this._ui)return;const carName=String(CAR_SPECS?.[this.selectedCarId]?.name||this.selectedCarId||'').trim().toLowerCase(),doomed=new Set();for(const o of walk(this._ui,[])){if(typeof o?.text!=='string')continue;const t=String(o.text||'').trim().toLowerCase();if(t===carName||t==='grip medio'||/^[0-9]+\s*km\/h$/i.test(t)){const p=o.parentContainer;if(p&&p!==this._ui)doomed.add(p);}}for(const p of doomed){try{p.destroy(true);}catch{}}}
  _removeLegacyEventPanel(){if(!this._ui)return;for(const o of walk(this._ui,[])){if(o?.texture?.key==='panel_event'){const p=o.parentContainer;try{(p&&p!==this._ui?p:o).destroy(true);}catch{}}}}

  _renderWelcomeCards(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01',track=TRACK_REGISTRY?.[key],spec=CAR_SPECS?.[this.selectedCarId];if(!track||!spec)return;
    const carW=clamp(Math.floor(width*.18),290,330),carH=clamp(Math.floor(height*.085),64,72);
    // Fixed-content side cards: narrow enough to clear the center, tall enough for readable type.
    const sideW=clamp(Math.floor(width*.13),220,245),sideH=clamp(Math.floor(height*.205),150,172);
    const carX=Math.floor(width*.5),carY=clamp(Math.floor(height*.105),66,82);
    const trackX=Math.floor(width*.89),trackY=Math.floor(height*.405);
    this._renderCarCard(carX,carY,carW,carH,spec);
    this._renderTrackCard(trackX,trackY,sideW,sideH,track,key);
  }

  _renderCarCard(x,y,w,h,spec){
    const p=resolveCarParams(spec,{accelMult:1,brakeMult:1,dragMult:1,turnRateMult:1,maxFwdAdd:0,maxRevAdd:0,turnMinAdd:0}),topKmh=Math.round(attainableTopSpeedKmh(p));
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0x35cfff);
    const left=-w/2+10,top=-h/2+5;c.add(this.add.text(left,top,'COCHE SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#6deaff',letterSpacing:1}).setOrigin(0));
    let textX=left+4;const slug=this._brandSlug?.(spec?.brand);if(slug){const k=this._logoKey?.(slug,false);if(k&&this.textures.exists(k)){const logo=this.add.image(left+22,4,k).setOrigin(.5),s=Math.min(32/(logo.width||1),32/(logo.height||1));logo.setScale(s);c.add(logo);textX=left+44;}}
    c.add(this.add.text(textX,top+17,String(p?.name||spec?.name||this.selectedCarId).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'14px',fontStyle:'bold',color:'#fff'}).setOrigin(0));
    c.add(this.add.text(textX,top+36,`${topKmh} km/h`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#b7c0ff'}).setOrigin(0));
    const badge=String(spec?.category||spec?.class||'').trim().toUpperCase();if(badge){const bw=Math.min(78,Math.max(50,badge.length*5+12)),bx=w/2-bw/2-8,by=h/2-11;c.add(this.add.rectangle(bx,by,bw,14,0x10273a,.9).setStrokeStyle(1,0x35cfff,.35));c.add(this.add.text(bx,by,badge,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'5px',fontStyle:'bold',color:'#8deaff'}).setOrigin(.5));}
  }

  _renderTrackCard(x,y,w,h,track,key){
    const center=Array.isArray(track.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track.centerline;if(!Array.isArray(center)||center.length<2)return;
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addChamferFrame(this,c,w,h,0xd8a73a);
    const top=-h/2+10;
    c.add(this.add.text(0,top,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+20,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));

    const previewW=Math.min(112,w-34),previewH=48,previewY=top+65;
    c.add(this.add.rectangle(0,previewY,previewW,previewH,0x050b10,.58).setStrokeStyle(1,0xd8a73a,.22));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;for(const p of center){const px=Number(p?.x),py=Number(p?.y);if(!Number.isFinite(px)||!Number.isFinite(py))continue;minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);}if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){const g=this.add.graphics(),s=Math.min((previewW-12)/(maxX-minX),(previewH-10)/(maxY-minY)),ox=-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;g.lineStyle(3,0x000000,.45);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();g.lineStyle(2,0xffffff,.98);g.beginPath();center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();c.add(g);}

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX),sectors=Math.max(1,(track.checkpoints?.length||2)+1),surface=surfaceLabel(track),direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const stats=[['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['SENTIDO',direction]];
    const colX=[-w*.245,w*.245],rowY=[top+104,top+137];
    for(let i=0;i<stats.length;i++){
      const [label,value]=stats[i],cx=colX[i%2],cy=rowY[Math.floor(i/2)];
      c.add(this.add.text(cx,cy,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'6px',fontStyle:'bold',color:'#8899aa',align:'center'}).setOrigin(.5,0));
      c.add(this.add.text(cx,cy+11,value,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#fff',align:'center'}).setOrigin(.5,0));
    }
  }

  _renderMissionCard(){
    const {width,height}=this.scale;if(width<760)return;
    const key=this.selectedTrackKey||localStorage.getItem('tdr2:trackKey')||'track01';let laps=0,best=null;try{const hist=JSON.parse(localStorage.getItem(`tdr2:ttHist:${key}`)||'null')?.history;if(Array.isArray(hist)){laps=hist.filter(r=>r&&Number.isFinite(r.lapMs)).length;for(const r of hist){if(Number.isFinite(r?.lapMs)&&(best==null||r.lapMs<best))best=r.lapMs;}}}catch{}
    const target=3,done=Math.min(target,laps),complete=done>=target,w=clamp(Math.floor(width*.13),220,245),h=clamp(Math.floor(height*.205),150,172),x=Math.floor(width*.11),y=Math.floor(height*.405);
    const c=this.add.container(x,y).setDepth(24);this._ui?.add(c);addChamferFrame(this,c,w,h,complete?0x39ff9a:0x35cfff);
    const top=-h/2+10,accent=complete?'#62ffb2':'#6deaff';
    c.add(this.add.text(0,top,complete?'RETO COMPLETADO':'RETO DE PILOTO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:accent,letterSpacing:1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+28,complete?'3 VUELTAS\nREGISTRADAS':'COMPLETA\n3 VUELTAS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#fff',align:'center',lineSpacing:-1}).setOrigin(.5,0));
    c.add(this.add.text(0,top+75,best==null?'PRIMERA VUELTA = REFERENCIA':`MEJOR VUELTA · ${this._formatMissionTime(best)}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#b7c3cf',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));
    const barW=w-34,barY=top+105;
    c.add(this.add.rectangle(-barW/2,barY,barW,9,0x10202b,.95).setOrigin(0).setStrokeStyle(1,0xffffff,.12));
    if(done>0)c.add(this.add.rectangle(-barW/2+2,barY+2,(barW-4)*(done/target),5,complete?0x39ff9a:0x35cfff,.95).setOrigin(0));
    c.add(this.add.text(0,barY+18,`${done}/${target} VUELTAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:accent,align:'center'}).setOrigin(.5,0));
  }

  _formatMissionTime(ms){const t=Math.max(0,Number(ms)||0),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000),cs=Math.floor((t%1000)/10);return`${m}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;}
}
