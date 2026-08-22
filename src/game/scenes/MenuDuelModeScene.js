import { MenuScene as CurrentMenuScene } from './MenuDomUiScene.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';

export class MenuScene extends CurrentMenuScene {
  _openGameModeModal(){
    super._openGameModeModal?.();
    const root=this._gameModeModal;
    if(!root?.scene||root._duelAdded)return;
    root._duelAdded=true;

    const {width,height}=this.scale;
    const panelW=Math.min(width-40,920,Math.max(760,Math.floor(width*.72)));
    const panelH=Math.min(height-28,390,Math.max(310,Math.floor(height*.58)));
    const cx=width/2,cy=height/2;
    const y=cy-panelH/2;
    const buttonY=Math.min(height-42,y+panelH+20);
    const bw=Math.min(360,panelW*.48),bh=38;
    const accent=0xff9f43;
    const bg=this.add.rectangle(cx,buttonY,bw,bh,0x2b1b0c,.98)
      .setStrokeStyle(2,accent,.92).setInteractive({useHandCursor:true});
    const tx=this.add.text(cx,buttonY,'🏎️  DUELO · TÚ VS CPU1',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'12px',fontStyle:'bold',color:'#ffe2bd',letterSpacing:1}).setOrigin(.5);
    root.add([bg,tx]);
    bg.on('pointerover',()=>bg.setFillStyle(0x4a2b10,.98));
    bg.on('pointerout',()=>bg.setFillStyle(0x2b1b0c,.98));
    bg.on('pointerup',()=>this._openDuelLapSelector());
  }

  _openDuelLapSelector(){
    const parent=this._gameModeModal;
    if(!parent?.scene||this._duelLapModal?.scene)return;
    const {width,height}=this.scale,cx=width/2,cy=height/2;
    const c=this.add.container(0,0).setDepth(9050);
    parent.add(c);this._duelLapModal=c;
    const veil=this.add.rectangle(0,0,width,height,0x02070d,.86).setOrigin(0).setInteractive();
    const panel=this.add.rectangle(cx,cy,430,184,0x091722,.99).setStrokeStyle(2,0xff9f43,.9);
    const title=this.add.text(cx,cy-68,'🏎️ DUELO · DISTANCIA',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    const sub=this.add.text(cx,cy-42,'CPU1 aprende durante el stint · elige vueltas',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aebdcc'}).setOrigin(.5);
    c.add([veil,panel,title,sub]);
    const current=(()=>{try{return Number(localStorage.getItem(DUEL_LAPS_KEY)||15);}catch{return 15;}})();
    [5,10,15].forEach((laps,i)=>{
      const x=cx+(i-1)*116,active=current===laps;
      const b=this.add.rectangle(x,cy+15,98,48,active?0x5a3512:0x112331,.98)
        .setStrokeStyle(2,active?0xffb45f:0x587085,active?1:.55).setInteractive({useHandCursor:true});
      const t=this.add.text(x,cy+15,`${laps} VUELTAS`,{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
      c.add([b,t]);
      b.on('pointerup',()=>{
        try{localStorage.setItem(DUEL_LAPS_KEY,String(laps));}catch{}
        this._duelLapModal=null;
        c.destroy(true);
        this._startSelectedMode('duel');
      });
    });
    const cancel=this.add.text(cx,cy+66,'CANCELAR',{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8fa3b5'}).setOrigin(.5).setInteractive({useHandCursor:true});
    cancel.on('pointerup',()=>{this._duelLapModal=null;c.destroy(true);});
    c.add(cancel);
    veil.on('pointerup',()=>{this._duelLapModal=null;c.destroy(true);});
  }
}
