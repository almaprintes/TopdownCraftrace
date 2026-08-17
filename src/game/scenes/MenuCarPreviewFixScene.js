import { MenuScene as CurrentMenuScene } from './MenuTrackPresentationScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage } from '../garage/garageStore.js';
import { METERS_PER_PX } from '../cars/speedUnits.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const INVENTORY_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];

function addEventFrame(scene,container,w,h,accent){
  const g=scene.add.graphics(),x=-w/2,y=-h/2,c=10;
  g.fillStyle(0x07131b,.94);g.lineStyle(2,accent,.82);
  g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();
  g.lineStyle(1,0xffffff,.05);g.strokeRect(x+5,y+5,w-10,h-10);g.fillStyle(accent,.78);g.fillRect(x+c,y+2,Math.max(48,w*.22),3);container.add(g);
}

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
  const cat=String(track?.category||'').toLowerCase();
  return(id.includes('offroad')||id.includes('raven')||cat.includes('dirt')||cat.includes('tierra'))?'TIERRA':'ASFALTO';
}

export class MenuScene extends CurrentMenuScene {
  preload() {
    try { super.preload?.(); } catch {}
    let carId = null;
    try { carId = localStorage.getItem('tdr2:carId'); } catch {}
    const spec = CAR_SPECS?.[carId];
    if (!spec?.id || !spec?.skin) return;
    const key = `skin:${spec.id}`;
    if (this.textures?.exists?.(key)) return;
    this.load.image(key, `assets/skins/${spec.skin}`);
  }

  renderUI() {
    super.renderUI();
    this._renderTopLobbyHeader();
    this._insetLobbySidePanels();
  }

  _renderTopLobbyHeader(){
    const ui=this._ui;
    const {width}=this.scale;
    if(!ui||!width)return;

    try{this._topLobbyHeader?.destroy?.(true);}catch{}
    this._topLobbyHeader=null;

    let logo=null;
    const visit=(node)=>{
      if(!node)return;
      const key=String(node?.texture?.key||'');
      if(/logo/i.test(key)){
        const b=node.getBounds?.();
        if(b&&(!logo||b.width*b.height>logo.bounds.width*logo.bounds.height))logo={node,bounds:b,key};
      }
      if(Array.isArray(node.list))for(const child of node.list)visit(child);
    };
    visit(ui);

    const barH=48;
    const root=this.add.container(0,0).setDepth(500);
    ui.add(root);
    this._topLobbyHeader=root;

    const bg=this.add.rectangle(0,0,width,barH,0x050c14,.95).setOrigin(0).setInteractive();
    root.add(bg);
    const line=this.add.graphics();
    line.fillStyle(0x45dfff,.46);line.fillRect(0,barH-2,width,1);
    line.fillStyle(0xd8a73a,.7);line.fillRect(0,0,Math.min(250,width*.18),2);
    root.add(line);

    if(logo?.key&&this.textures.exists(logo.key)){
      try{logo.node.setVisible(false);}catch{}
      const img=this.add.image(48,barH/2,logo.key).setOrigin(.5);
      const s=Math.min(40/(img.width||1),40/(img.height||1));
      img.setScale(s);
      root.add(img);
    }

    const garage=loadGarage();
    const coins=Math.max(0,Math.floor(Number(garage?.coins)||0));
    const coinX=96;
    root.add(this.add.text(coinX,12,'MONEDAS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#a5b2bf',letterSpacing:1}).setOrigin(0,.5));
    root.add(this.add.text(coinX,32,'◈',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(0,.5));
    root.add(this.add.text(coinX+23,32,String(coins),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'17px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0,.5));

    const makeHeaderButton=(right,w,label,icon,accent,onClick)=>{
      const x=right-w;
      const hit=this.add.rectangle(x,6,w,36,0x0b1822,.92).setOrigin(0).setStrokeStyle(1,accent,.5).setInteractive({useHandCursor:true});
      const t=this.add.text(x+w/2,24,`${icon}  ${label}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#ffffff',letterSpacing:.5}).setOrigin(.5);
      root.add([hit,t]);
      hit.on('pointerover',()=>hit.setFillStyle(0x122839,.98));
      hit.on('pointerout',()=>hit.setFillStyle(0x0b1822,.92));
      hit.on('pointerup',onClick);
      return x-8;
    };

    let right=width-12;
    right=makeHeaderButton(right,148,'CONFIGURACIÓN','⚙',0x45dfff,()=>this.scene.start('SettingsScene'));
    makeHeaderButton(right,142,'INVENTARIO','▦',0xd8a73a,()=>this._openLobbyInventoryModal());

    const shiftCarCard=(node)=>{
      if(!node)return false;
      if(typeof node.text==='string'&&node.text.trim().toUpperCase()==='COCHE SELECCIONADO'){
        const panel=node.parentContainer;
        const b=panel?.getBounds?.();
        if(panel&&b&&b.top<barH+5)panel.y+=barH+5-b.top;
        return true;
      }
      if(Array.isArray(node.list))for(const child of node.list)if(shiftCarCard(child))return true;
      return false;
    };
    shiftCarCard(ui);
  }

  _openLobbyInventoryModal(){
    if(this._lobbyInventoryModal?.scene)return;
    const {width,height}=this.scale;
    const garage=loadGarage();
    const panelW=Math.min(width-40,760),panelH=Math.min(height-32,390),cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(15000);
    this._ui?.add(root);
    this._lobbyInventoryModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.84).setOrigin(0).setInteractive();
    root.add(veil);
    root.add(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.995).setStrokeStyle(2,0x45dfff,.75));
    root.add(this.add.text(cx,cy-panelH/2+18,'INVENTARIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+54,`◈ ${Math.max(0,Math.floor(Number(garage.coins)||0))} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'14px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    const cols=4,gap=9,pad=22,gridW=panelW-pad*2,cardW=(gridW-gap*(cols-1))/cols;
    const cardH=Math.min(88,(panelH-136-gap)/2),startX=cx-gridW/2,startY=cy-panelH/2+91;
    INVENTORY_IDS.forEach((id,i)=>{
      const item=GARAGE_ITEMS[id]||{},qty=Math.max(0,Number(garage.inventory?.[id])||0);
      const col=i%cols,row=Math.floor(i/cols),x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);
      root.add(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(1,qty>0?0x355064:0x24323e,qty>0 ? .9 : .55));
      root.add(this.add.text(x+cardW/2,y+9,item.icon||'◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'23px',color:qty>0?'#ffffff':'#65717c'}).setOrigin(.5,0));
      root.add(this.add.text(x+cardW/2,y+38,String(item.name||id).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:qty>0?'#aebdca':'#667583',align:'center',wordWrap:{width:cardW-12}}).setOrigin(.5,0));
      root.add(this.add.text(x+cardW/2,y+cardH-27,`×${qty}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:qty>0?'#62ffb2':'#71808d'}).setOrigin(.5,0));
    });

    const btnY=cy+panelH/2-27;
    const closeBg=this.add.rectangle(cx,btnY,180,34,0x153244,.98).setStrokeStyle(1,0x45dfff,.65).setInteractive({useHandCursor:true});
    const closeText=this.add.text(cx,btnY,'CERRAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([closeBg,closeText]);
    const close=()=>{try{root.destroy(true);}catch{} if(this._lobbyInventoryModal===root)this._lobbyInventoryModal=null;};
    closeBg.on('pointerup',close);
    veil.on('pointerup',close);
  }

  _renderGlobalEventCard() {
    const {width,height}=this.scale;if(width<760)return;
    const data=getCurrentRaceEvent();
    const w=clamp(Math.floor(width*.145),236,264),h=clamp(Math.floor(height*.31),210,232),x=Math.floor(width*.11),y=Math.floor(height*.39);
    const finished=!!data.finished;
    const complete=!finished&&!!data.progress?.complete;
    const accent=finished?0xd8a73a:(complete?0x39ff9a:0x35cfff);
    const c=this.add.container(x,y).setDepth(24);this._ui?.add(c);addEventFrame(this,c,w,h,accent);
    const top=-h/2,bottom=h/2;

    if(finished){
      c.add(this.add.text(0,top+15,'TEMPORADA COMPLETADA',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1,align:'center'}).setOrigin(.5,0));
      c.add(this.add.text(0,top+52,'PILOTO\nDE ÉLITE',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'23px',fontStyle:'bold',color:'#fff',align:'center',lineSpacing:1}).setOrigin(.5,0));
      c.add(this.add.text(0,top+125,'HAS COMPLETADO LOS 7 EVENTOS\nDE PROGRESIÓN',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#b7c4d0',align:'center',lineSpacing:2}).setOrigin(.5,0));
      c.add(this.add.text(0,bottom-30,'7/7 EVENTOS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));
      return;
    }

    const event=data.event,progress=data.progress;
    const reward=raceEventRewardLabel(event.reward);
    const stage=`EVENTO ${data.index+1}/${data.total}`;
    c.add(this.add.text(0,top+14,complete?'EVENTO COMPLETADO':stage,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:complete?'#62ffb2':'#6deaff',letterSpacing:1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+46,event.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'21px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));
    c.add(this.add.text(0,top+83,event.description.toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#b8c7d3',align:'center',lineSpacing:2,wordWrap:{width:w-30}}).setOrigin(.5,0));
    c.add(this.add.text(0,top+126,`PREMIO · ${reward}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#f0c65a',align:'center',lineSpacing:1,wordWrap:{width:w-28}}).setOrigin(.5,0));

    const barW=w-34,barY=bottom-54;
    c.add(this.add.rectangle(-barW/2,barY,barW,11,0x10202b,.95).setOrigin(0).setStrokeStyle(1,0xffffff,.14));
    const ratio=Math.max(0,Math.min(1,progress.value/progress.target));
    if(ratio>0)c.add(this.add.rectangle(-barW/2+2,barY+2,(barW-4)*ratio,7,complete?0x39ff9a:0x35cfff,.97).setOrigin(0));

    if(complete){
      const btn=this.add.rectangle(0,bottom-28,w-34,32,0x174b37,.98).setStrokeStyle(1,0x62ffb2,.8).setInteractive({useHandCursor:true});
      c.add(btn);
      const label=this.add.text(0,bottom-28,'RECLAMAR PREMIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
      c.add(label);
      btn.on('pointerover',()=>btn.setFillStyle(0x206448,.98));
      btn.on('pointerout',()=>btn.setFillStyle(0x174b37,.98));
      btn.on('pointerup',()=>{const result=claimCurrentRaceEvent();if(result?.ok)this._showEventRewardModal(result.event);});
    }else{
      c.add(this.add.text(0,bottom-31,`${progress.value}/${progress.target} ${progress.label}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#6deaff',align:'center'}).setOrigin(.5,0));
    }
  }

  _renderTrackCard(x,_y,_w,_h,track,key){
    const {width,height}=this.scale;
    const center=Array.isArray(track?.raceCenterline)&&track.raceCenterline.length?track.raceCenterline:track?.centerline;
    if(!Array.isArray(center)||center.length<2)return;

    const w=clamp(Math.floor(width*.145),236,264),h=clamp(Math.floor(height*.31),210,232);
    const y=Math.floor(height*.39);
    const c=this.add.container(x,y).setDepth(36);this._ui?.add(c);addEventFrame(this,c,w,h,0xd8a73a);
    const top=-h/2,bottom=h/2;

    c.add(this.add.text(0,top+14,'CIRCUITO SELECCIONADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+43,String(track.name||this._trackTitle(key)).toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'19px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-28}}).setOrigin(.5,0));

    const previewW=Math.min(154,w-30),previewH=70,previewY=top+109;
    c.add(this.add.rectangle(0,previewY,previewW,previewH,0x050b10,.58).setStrokeStyle(1,0xd8a73a,.28));
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const p of center){
      const px=Number(p?.x),py=Number(p?.y);
      if(!Number.isFinite(px)||!Number.isFinite(py))continue;
      minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    }
    if(Number.isFinite(minX)&&maxX>minX&&maxY>minY){
      const g=this.add.graphics(),s=Math.min((previewW-14)/(maxX-minX),(previewH-12)/(maxY-minY));
      const ox=-(maxX-minX)*s/2,oy=previewY-(maxY-minY)*s/2;
      g.lineStyle(4,0x000000,.42);g.beginPath();
      center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();
      g.lineStyle(2,0xffffff,.98);g.beginPath();
      center.forEach((p,i)=>{const px=ox+(Number(p.x)-minX)*s,py=oy+(Number(p.y)-minY)*s;i?g.lineTo(px,py):g.moveTo(px,py);});g.closePath();g.strokePath();c.add(g);
    }

    const lengthM=Math.round(loopLength(center)*METERS_PER_PX);
    const sectors=Math.max(1,(track.checkpoints?.length||2)+1);
    const surface=surfaceLabel(track);
    const direction=String(track.raceDirection||'forward').toLowerCase()==='reverse'?'ANTIHORARIO':'HORARIO';
    const stats=[['LONGITUD',`${lengthM} m`],['SECTORES',String(sectors)],['SUPERFICIE',surface],['SENTIDO',direction]];
    const colX=[-w*.25,w*.25],rowY=[bottom-65,bottom-30];
    for(let i=0;i<stats.length;i++){
      const [label,value]=stats[i],cx=colX[i%2],cy=rowY[Math.floor(i/2)];
      c.add(this.add.text(cx,cy,label,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8f9eab',align:'center'}).setOrigin(.5,.5));
      c.add(this.add.text(cx,cy+14,value,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#fff',align:'center'}).setOrigin(.5,.5));
    }
  }

  _showEventRewardModal(event){
    if(!event||this._eventRewardModal?.scene)return;
    const {width,height}=this.scale;
    const items=Object.entries(event.reward?.items||{}).filter(([,n])=>Number(n)>0);
    const cols=Math.min(4,Math.max(1,items.length));
    const rows=Math.ceil(items.length/cols);
    const panelW=Math.min(width-36,Math.max(520,Math.min(760,180*cols+40)));
    const panelH=Math.min(height-26,Math.max(270,176+rows*82));
    const cx=width/2,cy=height/2;
    const root=this.add.container(0,0).setDepth(12000);
    this._ui?.add(root);
    this._eventRewardModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.82).setOrigin(0).setInteractive();
    root.add(veil);
    root.add(this.add.rectangle(cx,cy,panelW,panelH,0x08131d,.995).setStrokeStyle(2,0x62ffb2,.78));
    root.add(this.add.text(cx,cy-panelH/2+17,'EVENTO COMPLETADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#62ffb2',letterSpacing:2}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+42,event.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,cy-panelH/2+76,'PREMIO CONSEGUIDO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#aebdca',letterSpacing:1}).setOrigin(.5,0));

    const coins=Math.max(0,Number(event.reward?.coins)||0);
    if(coins)root.add(this.add.text(cx,cy-panelH/2+98,`◈ +${coins} MONEDAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));

    if(items.length){
      const gap=8,gridW=panelW-34,cardW=(gridW-gap*(cols-1))/cols,cardH=68,startX=cx-gridW/2,startY=cy-panelH/2+128;
      items.forEach(([id,n],i)=>{
        const item=GARAGE_ITEMS[id]||{};
        const col=i%cols,row=Math.floor(i/cols),x=startX+col*(cardW+gap),y=startY+row*(cardH+gap);
        root.add(this.add.rectangle(x,y,cardW,cardH,0x0d1a24,.98).setOrigin(0).setStrokeStyle(1,0x355064,.9));
        root.add(this.add.text(x+cardW/2,y+7,item.icon||'◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'20px'}).setOrigin(.5,0));
        root.add(this.add.text(x+cardW/2,y+31,String(item.name||id),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#aebdca',align:'center',wordWrap:{width:cardW-10}}).setOrigin(.5,0));
        root.add(this.add.text(x+cardW/2,y+47,`+${Number(n)}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'13px',fontStyle:'bold',color:'#62ffb2'}).setOrigin(.5,0));
      });
    }

    const btnY=cy+panelH/2-28;
    const btn=this.add.rectangle(cx,btnY,210,36,0x174b37,.98).setStrokeStyle(1,0x62ffb2,.85).setInteractive({useHandCursor:true});
    const label=this.add.text(cx,btnY,'CONTINUAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
    root.add([btn,label]);
    root.add(this.add.text(cx,btnY-25,'El premio ya está guardado en tu inventario',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',color:'#8295a8'}).setOrigin(.5,1));

    const close=()=>{try{root.destroy(true);}catch{}if(this._eventRewardModal===root)this._eventRewardModal=null;this.scene.restart();};
    btn.on('pointerup',close);
  }

  _insetLobbySidePanels() {
    const ui = this._ui;
    const width = Number(this.scale?.width) || 0;
    if (!ui || !width) return;
    const baseInset = 16;
    const panels = new Map();
    const visit = (node) => {
      if (!node) return;
      if (typeof node.text === 'string') {
        const label = node.text.trim().toUpperCase();
        if (label === 'CIRCUITO SELECCIONADO' || label.startsWith('EVENTO ') || label === 'TEMPORADA COMPLETADA') {
          const panel = node.parentContainer;
          if (panel && panel !== ui) panels.set(panel, label === 'CIRCUITO SELECCIONADO' ? baseInset + 1 : baseInset);
        }
      }
      if (Array.isArray(node.list)) for (const child of node.list) visit(child);
    };
    visit(ui);
    for (const [panel, inset] of panels) {
      const bounds = panel.getBounds?.();
      if (!bounds) continue;
      if (bounds.left < inset) panel.x += inset - bounds.left;
      if (bounds.right > width - inset) panel.x -= bounds.right - (width - inset);
    }
  }
}
