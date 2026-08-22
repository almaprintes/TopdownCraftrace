import { MenuScene as CurrentMenuScene } from './MenuDomUiScene.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';
const MODE_KEY='tdr2:gameMode';

export class MenuScene extends CurrentMenuScene {
  _openGameModeModal(){
    if(this._gameModeModal?.scene)return;
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}})();

    const root=this.add.container(0,0).setDepth(9000);
    this._ui?.add(root);
    this._gameModeModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.76).setOrigin(0).setInteractive();
    root.add(veil);

    const panelW=Math.min(width-34,940,Math.max(760,Math.floor(width*.76)));
    const panelH=Math.min(height-24,402,Math.max(320,Math.floor(height*.62)));
    const cx=width/2,cy=height/2,x=cx-panelW/2,y=cy-panelH/2,c=16;
    const panel=this.add.graphics();
    panel.fillStyle(0x07131b,.985);panel.lineStyle(2,0x45dfff,.72);
    panel.beginPath();panel.moveTo(x+c,y);panel.lineTo(x+panelW-c,y);panel.lineTo(x+panelW,y+c);
    panel.lineTo(x+panelW,y+panelH-c);panel.lineTo(x+panelW-c,y+panelH);panel.lineTo(x+c,y+panelH);
    panel.lineTo(x,y+panelH-c);panel.lineTo(x,y+c);panel.closePath();panel.fillPath();panel.strokePath();
    panel.lineStyle(1,0xffffff,.07);panel.strokeRect(x+7,y+7,panelW-14,panelH-14);root.add(panel);

    const marqueeY=y+16;
    root.add(this.add.rectangle(cx,marqueeY,panelW-38,30,0x0b2230,.92).setOrigin(.5,0).setStrokeStyle(1,0x45dfff,.35));
    const marquee=this.add.text(cx,marqueeY+7,'◆  ELIGE MODO DE JUEGO   •   CUATRO FORMAS DE CORRER   •   ELIGE MODO DE JUEGO  ◆',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#77ecff',letterSpacing:1}).setOrigin(.5,0);
    root.add(marquee);
    this._gameModeMarqueeTween=this.tweens.add({targets:marquee,x:{from:cx-34,to:cx+34},duration:2200,yoyo:true,repeat:-1,ease:'Sine.easeInOut'});

    root.add(this.add.text(cx,y+61,'¿CÓMO QUIERES CORRER?',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'24px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,y+93,'Desliza el carrusel o usa las flechas · cada modo es una experiencia completa',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#a9bac9'}).setOrigin(.5,0));

    const modes=[
      {key:'timeattack',icon:'🏁',title:'CONTRARRELOJ',sub:'Persigue tu mejor vuelta',detail:'Pista libre · cronómetro puro',accent:0x55bfff},
      {key:'ghost',icon:'👻',title:'FANTASMA',sub:'Compite contra tu récord',detail:'Tu mejor vuelta como rival',accent:0x8f7dff},
      {key:'survival',icon:'⚡',title:'SUPERVIVENCIA',sub:'6 coches · último fuera',detail:'Una eliminación por vuelta',accent:0x42ff9d},
      {key:'duel',icon:'🏎️',title:'DUELO',sub:'Tú contra CPU1',detail:'5 · 10 · 15 vueltas · rival que aprende',accent:0xff9f43}
    ];

    const viewportW=panelW-118,viewportX=cx-viewportW/2;
    const gap=16,cardW=Math.floor((viewportW-gap*2)/3),cardH=Math.max(154,Math.min(176,panelH-158));
    const cardY=y+126,step=cardW+gap;
    const cards=this.add.container(viewportX,0);root.add(cards);
    const maskShape=this.add.graphics().fillStyle(0xffffff,1).fillRect(viewportX-2,cardY-3,viewportW+4,cardH+6);
    maskShape.setVisible(false);root.add(maskShape);cards.setMask(maskShape.createGeometryMask());

    modes.forEach((m,i)=>{
      const bx=i*step,active=selected===m.key;
      const bg=this.add.rectangle(bx,cardY,cardW,cardH,active?0x102c2b:0x0a1620,.98).setOrigin(0)
        .setStrokeStyle(2,active?m.accent:0x52677b,active?.95:.42).setInteractive({useHandCursor:true});
      const icon=this.add.text(bx+cardW/2,cardY+14,m.icon,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'27px'}).setOrigin(.5,0);
      const title=this.add.text(bx+cardW/2,cardY+53,m.title,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'15px',fontStyle:'bold',color:'#ffffff',align:'center'}).setOrigin(.5,0);
      const sub=this.add.text(bx+cardW/2,cardY+81,m.sub,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',fontStyle:'bold',color:active?'#baffdf':'#c4cfda',align:'center',wordWrap:{width:cardW-20}}).setOrigin(.5,0);
      const detail=this.add.text(bx+cardW/2,cardY+111,m.detail,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#8295a8',align:'center',wordWrap:{width:cardW-18}}).setOrigin(.5,0);
      cards.add([bg,icon,title,sub,detail]);
      if(active)cards.add(this.add.text(bx+cardW/2,cardY+cardH-21,'ÚLTIMO USADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'8px',fontStyle:'bold',color:'#72ffc1',letterSpacing:1}).setOrigin(.5,0));
      bg.on('pointerover',()=>{bg.setFillStyle(m.key==='duel'?0x3a2612:0x153244,.98);bg.setStrokeStyle(2,m.accent,.95);});
      bg.on('pointerout',()=>{bg.setFillStyle(active?0x102c2b:0x0a1620,.98);bg.setStrokeStyle(2,active?m.accent:0x52677b,active?.95:.42);});
      bg.on('pointerup',()=>m.key==='duel'?this._openDuelLapSelector():this._startSelectedMode(m.key));
    });

    let page=(selected==='duel')?1:0;
    const dots=[];
    const applyPage=(next,animate=true)=>{
      page=Math.max(0,Math.min(1,next));
      const targetX=viewportX-page*step;
      if(animate)this.tweens.add({targets:cards,x:targetX,duration:220,ease:'Cubic.easeOut'});else cards.x=targetX;
      dots.forEach((d,i)=>d.setFillStyle(i===page?0x77ecff:0x405364,i===page?1:.65));
      left.setAlpha(page?1:.28);right.setAlpha(page<1?1:.28);
    };
    const left=this.add.text(x+31,cardY+cardH/2,'‹',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'42px',fontStyle:'bold',color:'#9fdfff'}).setOrigin(.5).setInteractive({useHandCursor:true});
    const right=this.add.text(x+panelW-31,cardY+cardH/2,'›',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'42px',fontStyle:'bold',color:'#9fdfff'}).setOrigin(.5).setInteractive({useHandCursor:true});
    left.on('pointerup',()=>applyPage(page-1));right.on('pointerup',()=>applyPage(page+1));root.add([left,right]);
    for(let i=0;i<2;i++){const d=this.add.circle(cx+(i-.5)*20,y+panelH-25,4,0x405364,.65).setInteractive({useHandCursor:true});d.on('pointerup',()=>applyPage(i));dots.push(d);root.add(d);}
    applyPage(page,false);

    let dragX=null;
    veil.on('pointerdown',p=>{dragX=Number(p.x);});
    veil.on('pointerup',p=>{if(dragX==null)return;const dx=Number(p.x)-dragX;dragX=null;if(Math.abs(dx)>45)applyPage(page+(dx<0?1:-1));});

    const close=this.add.text(x+panelW-24,y+6,'×',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'27px',fontStyle:'bold',color:'#9aafc1'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    close.on('pointerup',()=>this._closeGameModeModal());root.add(close);
  }

  _openDuelLapSelector(){
    const parent=this._gameModeModal;
    if(!parent?.scene||this._duelLapModal?.scene)return;
    const {width,height}=this.scale,cx=width/2,cy=height/2;
    const c=this.add.container(0,0).setDepth(9050);parent.add(c);this._duelLapModal=c;
    const veil=this.add.rectangle(0,0,width,height,0x02070d,.88).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(cx,cy,440,190,0x091722,.99).setStrokeStyle(2,0xff9f43,.95);
    const title=this.add.text(cx,cy-70,'🏎️ DUELO · DISTANCIA',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    const sub=this.add.text(cx,cy-43,'Elige la duración del duelo contra CPU1',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aebdcc'}).setOrigin(.5);c.add([veil,panel,title,sub]);
    const current=(()=>{try{return Number(localStorage.getItem(DUEL_LAPS_KEY)||15);}catch{return 15;}})();
    [5,10,15].forEach((laps,i)=>{
      const bx=cx+(i-1)*118,active=current===laps;
      const b=this.add.rectangle(bx,cy+14,100,50,active?0x5a3512:0x112331,.98).setStrokeStyle(2,active?0xffb45f:0x587085,active?1:.55).setInteractive({useHandCursor:true});
      const t=this.add.text(bx,cy+14,`${laps} VUELTAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);c.add([b,t]);
      b.on('pointerup',()=>{try{localStorage.setItem(DUEL_LAPS_KEY,String(laps));}catch{}this._duelLapModal=null;c.destroy(true);this._startSelectedMode('duel');});
    });
    const cancel=this.add.text(cx,cy+70,'CANCELAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8fa3b5'}).setOrigin(.5).setInteractive({useHandCursor:true});
    cancel.on('pointerup',()=>{this._duelLapModal=null;c.destroy(true);});c.add(cancel);
  }
}
