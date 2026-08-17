import { MenuScene as CurrentMenuScene } from './MenuTrackPresentationScene.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { loadGarage } from '../garage/garageStore.js';

const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function addEventFrame(scene,container,w,h,accent){
  const g=scene.add.graphics(),x=-w/2,y=-h/2,c=10;
  g.fillStyle(0x07131b,.94);g.lineStyle(2,accent,.82);
  g.beginPath();g.moveTo(x+c,y);g.lineTo(x+w-c,y);g.lineTo(x+w,y+c);g.lineTo(x+w,y+h-c);g.lineTo(x+w-c,y+h);g.lineTo(x+c,y+h);g.lineTo(x,y+h-c);g.lineTo(x,y+c);g.closePath();g.fillPath();g.strokePath();
  g.lineStyle(1,0xffffff,.05);g.strokeRect(x+5,y+5,w-10,h-10);g.fillStyle(accent,.78);g.fillRect(x+c,y+2,Math.max(48,w*.22),3);container.add(g);
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
    this._renderTopEconomyHeader();
    this._insetLobbySidePanels();
  }

  _renderTopEconomyHeader(){
    const ui=this._ui;
    const {width}=this.scale;
    if(!ui||!width)return;

    try{this._coinHeader?.destroy?.(true);}catch{}
    this._coinHeader=null;

    let logo=null;
    const visit=(node)=>{
      if(!node)return;
      const key=String(node?.texture?.key||'');
      if(/logo/i.test(key)){
        const b=node.getBounds?.();
        if(b&&(!logo||b.width*b.height>logo.bounds.width*logo.bounds.height))logo={node,bounds:b};
      }
      if(Array.isArray(node.list))for(const child of node.list)visit(child);
    };
    visit(ui);

    const garage=loadGarage();
    const coins=Math.max(0,Math.floor(Number(garage?.coins)||0));
    const pillW=154,pillH=34;
    const logoBounds=logo?.bounds;
    const x=logoBounds
      ? clamp(Math.round(logoBounds.right+pillW/2+12),pillW/2+16,width-pillW/2-16)
      : clamp(Math.round(width*.63),pillW/2+16,width-pillW/2-16);
    const y=logoBounds
      ? Math.round(logoBounds.centerY)
      : 38;

    const c=this.add.container(x,y).setDepth(80);
    ui.add(c);
    this._coinHeader=c;

    const bg=this.add.graphics();
    const left=-pillW/2,top=-pillH/2,ch=8;
    bg.fillStyle(0x07131b,.96);
    bg.lineStyle(1,0xd8a73a,.78);
    bg.beginPath();
    bg.moveTo(left+ch,top);bg.lineTo(left+pillW-ch,top);bg.lineTo(left+pillW,top+ch);
    bg.lineTo(left+pillW,top+pillH-ch);bg.lineTo(left+pillW-ch,top+pillH);
    bg.lineTo(left+ch,top+pillH);bg.lineTo(left,top+pillH-ch);bg.lineTo(left,top+ch);
    bg.closePath();bg.fillPath();bg.strokePath();
    bg.fillStyle(0xd8a73a,.9);bg.fillRect(left+8,top+2,36,2);
    c.add(bg);

    c.add(this.add.text(left+15,-1,'◈',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'19px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(0,.5));
    c.add(this.add.text(left+42,-9,'MONEDAS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#8f9eab',letterSpacing:1}).setOrigin(0,.5));
    c.add(this.add.text(left+42,6,String(coins),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#ffffff'}).setOrigin(0,.5));
  }

  _renderGlobalEventCard() {
    const {width,height}=this.scale;
    if(width<760)return;

    const data=getCurrentRaceEvent();
    const w=clamp(Math.floor(width*.13),220,242),h=clamp(Math.floor(height*.22),162,178),x=Math.floor(width*.11),y=Math.floor(height*.40);
    const finished=!!data.finished;
    const complete=!finished&&!!data.progress?.complete;
    const accent=finished?0xd8a73a:(complete?0x39ff9a:0x35cfff);
    const c=this.add.container(x,y).setDepth(24);this._ui?.add(c);addEventFrame(this,c,w,h,accent);
    const top=-h/2,bottom=h/2;

    if(finished){
      c.add(this.add.text(0,top+13,'TEMPORADA COMPLETADA',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#f0c65a',letterSpacing:1,align:'center'}).setOrigin(.5,0));
      c.add(this.add.text(0,top+43,'PILOTO\nDE ÉLITE',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'19px',fontStyle:'bold',color:'#fff',align:'center',lineSpacing:0}).setOrigin(.5,0));
      c.add(this.add.text(0,top+94,'HAS COMPLETADO LOS 7 EVENTOS\nDE PROGRESIÓN',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#b7c4d0',align:'center',lineSpacing:1}).setOrigin(.5,0));
      c.add(this.add.text(0,bottom-25,'7/7 EVENTOS',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:'#f0c65a'}).setOrigin(.5,0));
      return;
    }

    const event=data.event,progress=data.progress;
    const reward=raceEventRewardLabel(event.reward);
    const stage=`EVENTO ${data.index+1}/${data.total}`;
    c.add(this.add.text(0,top+11,complete?'EVENTO COMPLETADO':stage,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:complete?'#62ffb2':'#6deaff',letterSpacing:1,align:'center'}).setOrigin(.5,0));
    c.add(this.add.text(0,top+34,event.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'16px',fontStyle:'bold',color:'#fff',align:'center',wordWrap:{width:w-24}}).setOrigin(.5,0));
    c.add(this.add.text(0,top+59,event.description.toUpperCase(),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#aebdca',align:'center',lineSpacing:1,wordWrap:{width:w-24}}).setOrigin(.5,0));
    c.add(this.add.text(0,top+91,`PREMIO · ${reward}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'6px',fontStyle:'bold',color:'#f0c65a',align:'center',wordWrap:{width:w-22}}).setOrigin(.5,0));

    const barW=w-30,barY=bottom-44;
    c.add(this.add.rectangle(-barW/2,barY,barW,9,0x10202b,.95).setOrigin(0).setStrokeStyle(1,0xffffff,.12));
    const ratio=Math.max(0,Math.min(1,progress.value/progress.target));
    if(ratio>0)c.add(this.add.rectangle(-barW/2+2,barY+2,(barW-4)*ratio,5,complete?0x39ff9a:0x35cfff,.97).setOrigin(0));

    if(complete){
      const btn=this.add.rectangle(0,bottom-24,w-30,27,0x174b37,.98).setStrokeStyle(1,0x62ffb2,.8).setInteractive({useHandCursor:true});
      c.add(btn);
      const label=this.add.text(0,bottom-24,'RECLAMAR PREMIO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#ffffff',letterSpacing:1}).setOrigin(.5);
      c.add(label);
      btn.on('pointerover',()=>btn.setFillStyle(0x206448,.98));
      btn.on('pointerout',()=>btn.setFillStyle(0x174b37,.98));
      btn.on('pointerup',()=>{
        const result=claimCurrentRaceEvent();
        if(result?.ok)this._showEventRewardModal(result.event);
      });
    }else{
      c.add(this.add.text(0,bottom-26,`${progress.value}/${progress.target} ${progress.label}`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#6deaff',align:'center'}).setOrigin(.5,0));
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

    const close=()=>{
      try{root.destroy(true);}catch{}
      if(this._eventRewardModal===root)this._eventRewardModal=null;
      this.scene.restart();
    };
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
        if (
          label === 'CIRCUITO SELECCIONADO' ||
          label.startsWith('EVENTO ') ||
          label === 'TEMPORADA COMPLETADA'
        ) {
          const panel = node.parentContainer;
          if (panel && panel !== ui) {
            panels.set(panel, label === 'CIRCUITO SELECCIONADO' ? baseInset + 1 : baseInset);
          }
        }
      }
      if (Array.isArray(node.list)) {
        for (const child of node.list) visit(child);
      }
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
