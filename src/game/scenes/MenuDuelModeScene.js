import { MenuScene as CurrentMenuScene } from './MenuDomUiScene.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';
const MODE_KEY='tdr2:gameMode';
const BASE=import.meta.env.BASE_URL||'/';

export class MenuScene extends CurrentMenuScene {
  _openGameModeModal(){
    if(this._gameModeModal?.scene)return;
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}})();

    // Al volver desde UI DOM (p.ej. calibrador de controles), WebKit puede dejar
    // el gesto anterior en una transición rara. Reiniciamos el estado de input de
    // la escena y usamos pointerdown en las acciones críticas del modal.
    try{this.input?.setEnabled?.(false);this.input?.setEnabled?.(true);}catch{}

    const root=this.add.container(0,0).setDepth(9000);
    this._ui?.add(root);
    this._gameModeModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.78).setOrigin(0).setInteractive();
    root.add(veil);

    const panelW=Math.min(width-24,980,Math.max(760,Math.floor(width*.88)));
    const panelH=Math.min(height-18,430,Math.max(330,Math.floor(height*.72)));
    const cx=width/2,cy=height/2,x=cx-panelW/2,y=cy-panelH/2,c=16;
    const panel=this.add.graphics();
    panel.fillStyle(0x07131b,.985);panel.lineStyle(2,0xff9f43,.78);
    panel.beginPath();panel.moveTo(x+c,y);panel.lineTo(x+panelW-c,y);panel.lineTo(x+panelW,y+c);
    panel.lineTo(x+panelW,y+panelH-c);panel.lineTo(x+panelW-c,y+panelH);panel.lineTo(x+c,y+panelH);
    panel.lineTo(x,y+panelH-c);panel.lineTo(x,y+c);panel.closePath();panel.fillPath();panel.strokePath();
    panel.lineStyle(1,0xffffff,.07);panel.strokeRect(x+7,y+7,panelW-14,panelH-14);root.add(panel);

    root.add(this.add.text(cx,y+18,'ELIGE MODO DE JUEGO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'22px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,y+48,'Desliza el carrusel o usa las flechas',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#a9bac9'}).setOrigin(.5,0));

    const modes=[
      {key:'timeattack',asset:'contrarreloj.webp',accent:0xff9f43},
      {key:'ghost',asset:'fantasma.webp',accent:0x58d6ff},
      {key:'survival',asset:'supervivencia.webp',accent:0xff6a1a},
      {key:'duel',asset:'duelo.webp',accent:0xff9f43}
    ];

    const viewportW=panelW-96,viewportX=cx-viewportW/2;
    const gap=14;
    const cardH=Math.max(220,Math.min(292,panelH-104));
    const cardW=Math.round(cardH*.75);
    const step=cardW+gap;
    const cardY=y+76;
    const cards=this.add.container(viewportX,0);root.add(cards);
    const maskShape=this.add.graphics().fillStyle(0xffffff,1).fillRect(viewportX-2,cardY-3,viewportW+4,cardH+6);
    maskShape.setVisible(false);root.add(maskShape);cards.setMask(maskShape.createGeometryMask());

    const textureKeys=[];
    const ensureCard=(m,i)=>{
      const key=`game_mode_card_${m.key}`;
      textureKeys.push(key);
      const url=`${BASE}assets/ui/game-modes/${m.asset}`;
      const make=()=>{
        const bx=i*step,active=selected===m.key;
        const img=this.add.image(bx,cardY,key).setOrigin(0).setDisplaySize(cardW,cardH).setInteractive({useHandCursor:true});
        const border=this.add.rectangle(bx,cardY,cardW,cardH,0x000000,0).setOrigin(0)
          .setStrokeStyle(active?3:1,active?m.accent:0x536577,active?1:.5).setInteractive({useHandCursor:true});
        let fired=false;
        const choose=()=>{
          if(fired)return;fired=true;
          m.key==='duel'?this._openDuelLapSelector():this._startSelectedMode(m.key);
        };
        img.on('pointerdown',choose);border.on('pointerdown',choose);
        const hover=()=>border.setStrokeStyle(3,m.accent,1);
        const out=()=>border.setStrokeStyle(active?3:1,active?m.accent:0x536577,active?1:.5);
        img.on('pointerover',hover);img.on('pointerout',out);border.on('pointerover',hover);border.on('pointerout',out);
        cards.add([img,border]);
        if(active){
          const tagBg=this.add.rectangle(bx+cardW/2,cardY+cardH-15,cardW-18,18,0x07131b,.9).setOrigin(.5);
          const tag=this.add.text(bx+cardW/2,cardY+cardH-15,'ÚLTIMO USADO',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#72ffc1',letterSpacing:1}).setOrigin(.5);
          cards.add([tagBg,tag]);
        }
      };
      if(this.textures.exists(key)){make();return;}
      this.load.image(key,url);
      this.load.once(`filecomplete-image-${key}`,make);
      this.load.start();
    };
    modes.forEach(ensureCard);

    const visibleCards=Math.max(1,Math.floor((viewportW+gap)/step));
    const maxPage=Math.max(0,modes.length-visibleCards);
    let page=Math.min(maxPage,Math.max(0,modes.findIndex(m=>m.key===selected)-(visibleCards-1)));
    const dots=[];
    const applyPage=(next,animate=true)=>{
      page=Math.max(0,Math.min(maxPage,next));
      const targetX=viewportX-page*step;
      if(animate)this.tweens.add({targets:cards,x:targetX,duration:220,ease:'Cubic.easeOut'});else cards.x=targetX;
      dots.forEach((d,i)=>d.setFillStyle(i===page?0xffb45f:0x405364,i===page?1:.65));
      left.setAlpha(page>0?1:.28);right.setAlpha(page<maxPage?1:.28);
    };
    const left=this.add.text(x+24,cardY+cardH/2,'‹',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'42px',fontStyle:'bold',color:'#ffd09a'}).setOrigin(.5).setInteractive({useHandCursor:true});
    const right=this.add.text(x+panelW-24,cardY+cardH/2,'›',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'42px',fontStyle:'bold',color:'#ffd09a'}).setOrigin(.5).setInteractive({useHandCursor:true});
    left.on('pointerdown',()=>applyPage(page-1));right.on('pointerdown',()=>applyPage(page+1));root.add([left,right]);
    for(let i=0;i<=maxPage;i++){const d=this.add.circle(cx+(i-maxPage/2)*20,y+panelH-18,4,0x405364,.65).setInteractive({useHandCursor:true});d.on('pointerdown',()=>applyPage(i));dots.push(d);root.add(d);}
    applyPage(page,false);

    let dragX=null;
    veil.on('pointerdown',p=>{dragX=Number(p.x);});
    veil.on('pointerup',p=>{if(dragX==null)return;const dx=Number(p.x)-dragX;dragX=null;if(Math.abs(dx)>45)applyPage(page+(dx<0?1:-1));});
    veil.on('pointerupoutside',()=>{dragX=null;});

    const close=this.add.text(x+panelW-22,y+3,'×',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'27px',fontStyle:'bold',color:'#9aafc1'}).setOrigin(.5,0).setInteractive({useHandCursor:true});
    close.on('pointerdown',()=>this._closeGameModeModal());root.add(close);
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
      b.on('pointerdown',()=>{try{localStorage.setItem(DUEL_LAPS_KEY,String(laps));}catch{}this._duelLapModal=null;c.destroy(true);this._startSelectedMode('duel');});
    });
    const cancel=this.add.text(cx,cy+70,'CANCELAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8fa3b5'}).setOrigin(.5).setInteractive({useHandCursor:true});
    cancel.on('pointerdown',()=>{this._duelLapModal=null;c.destroy(true);});c.add(cancel);
  }
}
