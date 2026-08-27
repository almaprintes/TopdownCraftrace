import { MenuScene as CurrentMenuScene } from './MenuSeasonScene.js';
import { t } from '../i18n/index.js';

const MODE_KEY='tdr2:gameMode';
const BASE=import.meta.env.BASE_URL||'/';
const FONT='system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif';

const MODES=[
  {key:'timeattack',asset:'contrarreloj.webp',accent:0x55bfff},
  {key:'ghost',asset:'fantasma.webp',accent:0x8f7dff},
  {key:'survival',asset:'supervivencia.webp',accent:0xff6a1a},
  {key:'duel',asset:'duelo.webp',accent:0xff9f43},
  {key:'practice',asset:'area-pruebas.webp',accent:0xffc857}
];

function clamp(n,a,b){return Math.max(a,Math.min(b,n));}

export class MenuScene extends CurrentMenuScene {
  create(data){
    if(typeof super.create==='function') super.create(data);
    // Startup overlay must disappear only after the real lobby has been created
    // and the browser has had a couple of frames to paint it.
    try{
      const started=Number(window.__tdrBootStartedAt)||performance.now();
      requestAnimationFrame(()=>requestAnimationFrame(()=>{
        const elapsedMs=Math.max(0,Math.round(performance.now()-started));
        window.__tdrBootLast={phase:'menu-ready',elapsedMs};
        window.dispatchEvent(new CustomEvent('tdr:bootphase',{detail:{phase:'menu-ready',elapsedMs}}));
        window.dispatchEvent(new CustomEvent('tdr:bootready'));
      }));
    }catch{}
  }

  _openGameModeModal(){
    if(this._gameModeModal?.scene)return;
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}})();
    this._modeSnapIndex=Math.max(0,MODES.findIndex(m=>m.key===selected));
    this._modeSnapAnimating=false;

    const root=this.add.container(0,0).setDepth(9000);
    this._ui?.add(root);
    this._gameModeModal=root;

    const veil=this.add.rectangle(0,0,width,height,0x02070d,.82).setOrigin(0).setInteractive();
    root.add(veil);

    const panelW=Math.min(width-28,1080,Math.max(760,Math.floor(width*.86)));
    const panelH=Math.min(height-20,440,Math.max(315,Math.floor(height*.76)));
    const cx=width/2,cy=height/2,x=cx-panelW/2,y=cy-panelH/2,c=16;

    const panel=this.add.graphics();
    panel.fillStyle(0x07131b,.99);panel.lineStyle(2,0xff9f43,.82);
    panel.beginPath();panel.moveTo(x+c,y);panel.lineTo(x+panelW-c,y);panel.lineTo(x+panelW,y+c);
    panel.lineTo(x+panelW,y+panelH-c);panel.lineTo(x+panelW-c,y+panelH);panel.lineTo(x+c,y+panelH);
    panel.lineTo(x,y+panelH-c);panel.lineTo(x,y+c);panel.closePath();panel.fillPath();panel.strokePath();
    panel.lineStyle(1,0xffffff,.07);panel.strokeRect(x+7,y+7,panelW-14,panelH-14);root.add(panel);

    const blocker=this.add.rectangle(x,y,panelW,panelH,0xffffff,.001).setOrigin(0).setInteractive();
    root.add(blocker);

    root.add(this.add.text(cx,y+17,t('modes.title'),{fontFamily:FONT,fontSize:height<430?'19px':'23px',fontStyle:'bold',color:'#fff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,y+46,t('modes.swipe'),{fontFamily:FONT,fontSize:'9px',color:'#a9bac9'}).setOrigin(.5,0));

    this._modeSnapCards=this.add.container(0,0);root.add(this._modeSnapCards);
    this._modeSnapUi={root,x,y,panelW,panelH,cx,cy};
    this._drawModeSnapCards();

    const closeHit=this.add.rectangle(x+panelW-28,y+25,46,46,0xffffff,.001).setInteractive({useHandCursor:true});
    const close=this.add.text(x+panelW-28,y+8,'×',{fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#a9bac9'}).setOrigin(.5,0);
    closeHit.on('pointerup',()=>{if(!this._modeSnapAnimating)this._closeGameModeModal();});
    root.add([closeHit,close]);

    veil.on('pointerup',()=>{if(!this._modeSnapAnimating)this._closeGameModeModal();});
  }

  _drawModeSnapCards(){
    const ui=this._modeSnapUi,layer=this._modeSnapCards;
    if(!ui||!layer?.scene||this._gameModeModal!==ui.root)return;
    layer.removeAll(true);

    const visual=this.add.container(0,0);
    layer.add(visual);
    this._modeSnapVisual=visual;

    const {x,y,panelW,panelH,cx}=ui;
    const compact=panelH<370;
    const cardTop=y+(compact?66:72);
    const availableH=panelH-(compact?105:116);
    const centerH=clamp(availableH,210,306);
    const centerW=Math.round(centerH*.75);
    const sideScale=.74;
    const sideW=Math.round(centerW*sideScale),sideH=Math.round(centerH*sideScale);
    const sideOffset=Math.min(centerW*.94,(panelW-centerW)/2-18);
    const index=clamp(Number(this._modeSnapIndex)||0,0,MODES.length-1);
    this._modeSnapIndex=index;

    const ensureTexture=(mode)=>{
      const key=`game_mode_card_${mode.key}`;
      if(this.textures.exists(key))return key;
      if(!this._modeSnapLoading)this._modeSnapLoading=new Set();
      if(!this._modeSnapLoading.has(key)){
        this._modeSnapLoading.add(key);
        const done=()=>{
          this._modeSnapLoading.delete(key);
          this.load.off(`filecomplete-image-${key}`,done);
          if(this._gameModeModal?.scene&&!this._modeSnapAnimating)this._drawModeSnapCards();
        };
        this.load.once(`filecomplete-image-${key}`,done);
        this.load.image(key,`${BASE}assets/ui/game-modes/${mode.asset}`);
        if(!this.load.isLoading())this.load.start();
      }
      return null;
    };

    [-1,1].forEach(delta=>{
      const i=index+delta;if(i<0||i>=MODES.length)return;
      const m=MODES[i],key=ensureTexture(m);
      const scx=cx+delta*sideOffset;
      const sy=cardTop+(centerH-sideH)/2;
      if(key){
        const img=this.add.image(scx,sy,key).setOrigin(.5,0).setDisplaySize(sideW,sideH).setAlpha(.46);
        visual.add(img);
      }else{
        visual.add(this.add.rectangle(scx,sy,sideW,sideH,0x10202b,.7).setOrigin(.5,0));
      }
    });

    const mode=MODES[index],key=ensureTexture(mode);
    const centerY=cardTop;
    if(key){
      const shadow=this.add.rectangle(cx+5,centerY+7,centerW,centerH,0x000000,.42).setOrigin(.5,0);
      const img=this.add.image(cx,centerY,key).setOrigin(.5,0).setDisplaySize(centerW,centerH);
      const border=this.add.rectangle(cx,centerY,centerW+4,centerH+4,0x000000,0).setOrigin(.5,0).setStrokeStyle(3,mode.accent,1);
      visual.add([shadow,img,border]);
    }else{
      const ph=this.add.rectangle(cx,centerY,centerW,centerH,0x10202b,.96).setOrigin(.5,0).setStrokeStyle(3,mode.accent,.9);
      visual.add(ph);
    }

    const gestureW=Math.max(centerW+70,Math.min(panelW-150,centerW*1.28));
    const gesture=this.add.rectangle(cx,centerY,gestureW,centerH,0xffffff,.001).setOrigin(.5,0).setInteractive({useHandCursor:true});
    layer.add(gesture);
    let down=false,startX=0,lastX=0;
    gesture.on('pointerdown',p=>{if(this._modeSnapAnimating)return;down=true;startX=lastX=Number(p.x)||0;});
    gesture.on('pointermove',p=>{if(down&&!this._modeSnapAnimating)lastX=Number(p.x)||lastX;});
    gesture.on('pointerout',()=>{if(down&&!this._modeSnapAnimating&&Math.abs(lastX-startX)>52){this._shiftModeSnap(lastX<startX?1:-1);}down=false;});
    gesture.on('pointerupoutside',p=>{if(!down||this._modeSnapAnimating)return;lastX=Number(p.x)||lastX;const dx=lastX-startX;down=false;if(Math.abs(dx)>42)this._shiftModeSnap(dx<0?1:-1);});
    gesture.on('pointerup',p=>{
      if(!down||this._modeSnapAnimating)return;lastX=Number(p.x)||lastX;const dx=lastX-startX;down=false;
      if(Math.abs(dx)>42){this._shiftModeSnap(dx<0?1:-1);return;}
      this._startSelectedMode(mode.key);
    });

    const arrowY=centerY+centerH/2;
    const arrow=(ax,glyph,enabled,delta)=>{
      const hit=this.add.circle(ax,arrowY,compact?24:28,0x102435,enabled?.98:.50)
        .setStrokeStyle(2,enabled?0xffb04c:0x425261,enabled?.95:.42);
      const txt=this.add.text(ax,arrowY,glyph,{fontFamily:FONT,fontSize:compact?'28px':'34px',fontStyle:'bold',color:enabled?'#fff':'#5c6c79'}).setOrigin(.5);
      layer.add([hit,txt]);
      if(enabled){hit.setInteractive({useHandCursor:true});hit.on('pointerup',()=>{if(!this._modeSnapAnimating)this._shiftModeSnap(delta);});}
    };
    arrow(x+34,'‹',index>0,-1);
    arrow(x+panelW-34,'›',index<MODES.length-1,1);

    const dotsY=y+panelH-22;
    MODES.forEach((m,i)=>{
      const active=i===index;
      layer.add(this.add.circle(cx+(i-(MODES.length-1)/2)*20,dotsY,active?5:4,active?m.accent:0x51606d,active?1:.65));
    });
  }

  _shiftModeSnap(delta){
    if(!this._gameModeModal?.scene||this._modeSnapAnimating)return;
    const direction=Math.sign(Number(delta)||0);
    const next=clamp((Number(this._modeSnapIndex)||0)+direction,0,MODES.length-1);
    if(next===this._modeSnapIndex)return;

    const oldVisual=this._modeSnapVisual;
    this._modeSnapAnimating=true;
    if(!oldVisual?.scene){
      this._modeSnapIndex=next;
      this._drawModeSnapCards();
      this._modeSnapAnimating=false;
      return;
    }

    this.tweens.killTweensOf(oldVisual);
    this.tweens.add({
      targets:oldVisual,
      x:-direction*56,
      alpha:.52,
      scaleX:.96,
      scaleY:.96,
      duration:115,
      ease:'Quad.easeIn',
      onComplete:()=>{
        if(!this._gameModeModal?.scene){this._modeSnapAnimating=false;return;}
        this._modeSnapIndex=next;
        this._drawModeSnapCards();
        const incoming=this._modeSnapVisual;
        if(!incoming?.scene){this._modeSnapAnimating=false;return;}
        incoming.x=direction*78;
        incoming.alpha=.58;
        incoming.setScale(.965);
        this.tweens.add({
          targets:incoming,
          x:0,
          alpha:1,
          scaleX:1,
          scaleY:1,
          duration:360,
          ease:'Back.easeOut',
          easeParams:[1.45],
          onComplete:()=>{this._modeSnapAnimating=false;}
        });
      }
    });
  }

  _closeGameModeModal(){
    try{if(this._modeSnapVisual)this.tweens.killTweensOf(this._modeSnapVisual);}catch{}
    this._modeSnapAnimating=false;
    super._closeGameModeModal();
    this._modeSnapCards=null;
    this._modeSnapVisual=null;
    this._modeSnapUi=null;
    this._modeSnapLoading?.clear?.();
  }
}
