import { MenuScene as CurrentMenuScene } from './MenuDomUiScene.js';
import { t, getLanguage } from '../i18n/index.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { buyMaterialPack } from '../store/storeEconomy.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';
const MODE_KEY='tdr2:gameMode';
const BASE=import.meta.env.BASE_URL||'/';
const FONT='system-ui,-apple-system,Segoe UI,Arial';

const PACK_UI={
  mechanic:{es:'PACK MECÁNICA',en:'MECHANICS PACK',esCopy:'Base mecánica para mantener y mejorar.',enCopy:'Mechanical essentials for upkeep and upgrades.'},
  chassis:{es:'PACK CHASIS',en:'CHASSIS PACK',esCopy:'Refuerzo de estructura y comportamiento.',enCopy:'Chassis essentials for structure and handling.'},
  technology:{es:'PACK TECNOLOGÍA',en:'TECH PACK',esCopy:'Electrónica y componentes de alto rendimiento.',enCopy:'Electronics and high-performance components.'},
  mixed:{es:'PACK PADDOCK',en:'PADDOCK PACK',esCopy:'Selección variada para fabricar y evolucionar.',enCopy:'A mixed selection for crafting and progression.'}
};
const MATERIAL_LABELS={
  scrap:{es:'Chatarra',en:'Scrap'},alloy:{es:'Aleación',en:'Alloy'},rubber:{es:'Goma',en:'Rubber'},compound:{es:'Compuesto',en:'Compound'},
  disc:{es:'Disco metálico',en:'Metal disc'},spring:{es:'Muelle',en:'Spring'},gear:{es:'Engranaje',en:'Gear'},ecu:{es:'Electrónica',en:'Electronics'}
};

export class MenuScene extends CurrentMenuScene {
  _openStoreModal(section='materials'){
    super._openStoreModal(section);
    const root=this._storeModal;
    if(!root?.scene)return;

    const tabs=['materials','coins','rewards'];
    const tabY=68,tabW=170,tabH=38;
    tabs.forEach((id,i)=>{
      const x=24+i*(tabW+10);
      const hit=this.add.rectangle(x,tabY,tabW,tabH,0xffffff,.001)
        .setOrigin(0)
        .setInteractive({useHandCursor:true});
      root.add(hit);
      let fired=false;
      const activate=()=>{
        if(fired)return;
        fired=true;
        this._openStoreModal(id);
      };
      hit.on('pointerdown',activate);
    });

    this._installStoreInertia(root);
  }

  _installStoreInertia(root){
    const {width:w}=this.scale;
    const content=(root.list||[]).find(o=>o?.type==='Container'&&o.mask);
    const candidates=(root.list||[]).filter(o=>o?.type==='Rectangle'&&o.input);
    const hit=candidates.find(o=>Math.abs(Number(o.x)-24)<2&&Math.abs(Number(o.y)-112)<2&&Number(o.displayWidth)>w*.7)
      ||candidates[candidates.length-1];
    if(!content||!hit)return;

    let lastX=0,lastT=0,velocity=0;
    const viewportX=24,viewportW=w-48;
    const measure=()=>{
      let right=viewportW;
      for(const child of content.list||[]){
        try{
          const b=child.getBounds?.();
          if(b)right=Math.max(right,b.right-content.x);
        }catch{}
      }
      return Math.max(viewportW,right);
    };
    const clamp=x=>{
      const min=viewportX-Math.max(0,measure()-viewportW);
      return Math.max(min,Math.min(viewportX,x));
    };

    hit.on('dragstart',ptr=>{
      this.tweens.killTweensOf(content);
      lastX=Number(ptr.x)||0;
      lastT=performance.now();
      velocity=0;
    });
    hit.on('drag',ptr=>{
      const now=performance.now();
      const x=Number(ptr.x)||0;
      const dt=Math.max(8,now-lastT);
      const instant=(x-lastX)/dt;
      velocity=velocity*.55+instant*.45;
      lastX=x;
      lastT=now;
    });
    hit.on('dragend',()=>{
      const speed=Math.max(-2.2,Math.min(2.2,velocity));
      if(Math.abs(speed)<.025)return;
      const target=clamp(content.x+speed*310);
      const distance=Math.abs(target-content.x);
      if(distance<2)return;
      this.tweens.add({targets:content,x:target,duration:Math.min(620,220+distance*.62),ease:'Cubic.easeOut'});
    });
  }

  _storeCard(parent,p,x,y,w,h){
    if(p?.type!=='mat'){
      super._storeCard(parent,p,x,y,w,h);
      const card=parent.list?.[parent.list.length-1];
      if(card?.bringToTop){
        const topText=(card.list||[]).filter(child=>child?.type==='Text'&&Number(child.y)<82);
        topText.forEach(child=>card.bringToTop(child));
        const artKeys=new Set(['store:coins_2500','store:coins_7500','store:coins_20000','store:rewarded_video','store:daily_gift']);
        (card.list||[]).filter(child=>child?.type==='Image'&&artKeys.has(child.texture?.key)).forEach(child=>{child.y+=8;});
      }
      return;
    }
    this._renderMaterialPackCard(parent,p,x,y,w,h);
  }

  _renderMaterialPackCard(parent,p,x,y,w,h){
    const lang=getLanguage()==='en'?'en':'es';
    const ui=PACK_UI[p.id]||{es:p.name,en:p.name,esCopy:'Pack de materiales',enCopy:'Materials pack'};
    const card=this.add.container(x,y);
    parent.add(card);
    const compact=h<250;
    const accent=p.accent||0x31aaff;

    const shadow=this.add.graphics();
    shadow.fillStyle(0x000000,.44);
    shadow.fillRoundedRect(7,8,w,h,18);
    card.add(shadow);

    const frame=this.add.graphics();
    frame.fillGradientStyle(0x091521,0x08111c,0x07101a,0x0b1721,1);
    frame.fillRoundedRect(0,0,w,h,18);
    frame.lineStyle(2,accent,.95);
    frame.strokeRoundedRect(0,0,w,h,18);
    frame.lineStyle(8,accent,.045);
    frame.strokeRoundedRect(5,5,w-10,h-10,14);
    card.add(frame);

    const heroH=Math.round(h*(compact?.54:.60));
    const hero=this.add.graphics();
    hero.fillGradientStyle(0x0b2233,0x0a1722,0x071018,0x0a1723,1);
    hero.fillRoundedRect(2,2,w-4,heroH,16);
    hero.fillStyle(accent,.09);
    hero.beginPath();
    hero.moveTo(w*.48,2);hero.lineTo(w-2,2);hero.lineTo(w-2,heroH);hero.lineTo(w*.28,heroH);hero.closePath();hero.fillPath();
    card.add(hero);

    const title=this.add.text(18,compact?12:16,ui[lang],{fontFamily:FONT,fontSize:compact?'17px':'22px',fontStyle:'bold',color:'#ffffff'});
    title.setShadow(0,3,'#000',5,true,true);
    const copy=this.add.text(18,compact?36:45,ui[`${lang}Copy`],{fontFamily:FONT,fontSize:compact?'7px':'9px',color:'#b9c7d4',wordWrap:{width:w*.48},lineSpacing:1});
    card.add([title,copy]);

    const entries=Object.entries(p.items||{});
    const preview=entries.slice(0,Math.min(4,entries.length));
    const cx=w*.72,cy=heroH*.52;
    const offsets=[[-52,14],[-8,-12],[38,12],[5,35]];
    const angles=[-13,8,-6,14];
    const sizes=compact?[70,82,68,57]:[88,104,84,68];
    preview.forEach(([id],i)=>{
      const key=`store:${id}`;
      if(!this.textures.exists(key))return;
      const [ox,oy]=offsets[i]||[i*18,0];
      const im=this.add.image(cx+ox,cy+oy,key).setAngle(angles[i]||0);
      const target=sizes[i]||72;
      im.setScale(Math.min(target/(im.width||1),target/(im.height||1)));
      im.setAlpha(i===3?.82:1);
      im.setShadow?.(0,5,'#000',8);
      card.add(im);
    });

    const divider=this.add.graphics();
    divider.fillStyle(accent,.9);
    divider.fillRoundedRect(18,heroH-4,compact?48:64,4,2);
    card.add(divider);

    const exact=entries.map(([id,n])=>`${n}× ${MATERIAL_LABELS[id]?.[lang]||GARAGE_ITEMS[id]?.name||id}`).join('  ·  ');
    const detailsY=heroH+(compact?10:13);
    const detailsLabel=lang==='en'?'INCLUDES':'INCLUYE';
    card.add(this.add.text(18,detailsY,detailsLabel,{fontFamily:FONT,fontSize:compact?'6px':'7px',fontStyle:'bold',color:'#7f95a8'}));
    card.add(this.add.text(18,detailsY+(compact?10:13),exact,{fontFamily:FONT,fontSize:compact?'7px':'8px',fontStyle:'bold',color:'#e3eaf1',wordWrap:{width:w-36},lineSpacing:2}));

    const price=Number(p.price||0).toLocaleString(lang==='en'?'en-US':'es-ES');
    const buyLabel=lang==='en'?`${price} COINS`:`${price} MONEDAS`;
    this._buyButton(card,w,h,buyLabel,()=>{
      const r=buyMaterialPack(p.id);
      const okLabel=lang==='en'?'PACK ADDED':'PACK AÑADIDO';
      this._toastStore(r.ok?okLabel:r.reason,r.ok);
      if(r.ok)this._openStoreModal('materials');
    },true,accent,true);
  }

  _openGameModeModal(){
    if(this._gameModeModal?.scene)return;
    const {width,height}=this.scale;
    const selected=(()=>{try{return localStorage.getItem(MODE_KEY)||'timeattack';}catch{return'timeattack';}})();

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

    root.add(this.add.text(cx,y+18,t('modes.title'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'22px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5,0));
    root.add(this.add.text(cx,y+48,t('modes.swipe'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',color:'#a9bac9'}).setOrigin(.5,0));

    const modes=[
      {key:'timeattack',asset:'contrarreloj.webp',accent:0xff9f43,label:'race.timeAttack'},
      {key:'ghost',asset:'fantasma.webp',accent:0x58d6ff,label:'race.ghost'},
      {key:'survival',asset:'supervivencia.webp',accent:0xff6a1a,label:'race.survival'},
      {key:'duel',asset:'duelo.webp',accent:0xff9f43,label:'race.duel'},
      {key:'practice',asset:'area-pruebas.webp',accent:0xff9f43,label:'race.practiceArea'}
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
        const titleBand=this.add.rectangle(bx+5,cardY+5,cardW-10,34,0x07131b,.92).setOrigin(0);
        const modeTitle=this.add.text(bx+cardW/2,cardY+22,t(m.label),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff',align:'center',fixedWidth:cardW-20}).setOrigin(.5);
        let fired=false;
        const choose=()=>{
          if(fired)return;
          fired=true;
          m.key==='duel'?this._openDuelLapSelector():this._startSelectedMode(m.key);
        };
        img.on('pointerdown',choose);img.on('pointerup',choose);
        border.on('pointerdown',choose);border.on('pointerup',choose);
        const hover=()=>border.setStrokeStyle(3,m.accent,1);
        const out=()=>border.setStrokeStyle(active?3:1,active?m.accent:0x536577,active?1:.5);
        img.on('pointerover',hover);img.on('pointerout',out);border.on('pointerover',hover);border.on('pointerout',out);
        cards.add([img,titleBand,modeTitle,border]);
        if(active){
          const tagBg=this.add.rectangle(bx+cardW/2,cardY+cardH-15,cardW-18,18,0x07131b,.9).setOrigin(.5);
          const tag=this.add.text(bx+cardW/2,cardY+cardH-15,t('modes.lastUsed'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'7px',fontStyle:'bold',color:'#72ffc1',letterSpacing:1}).setOrigin(.5);
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
    left.on('pointerdown',()=>applyPage(page-1));
    right.on('pointerdown',()=>applyPage(page+1));
    root.add([left,right]);
    for(let i=0;i<=maxPage;i++){
      const d=this.add.circle(cx+(i-maxPage/2)*20,y+panelH-18,4,0x405364,.65).setInteractive({useHandCursor:true});
      d.on('pointerdown',()=>applyPage(i));dots.push(d);root.add(d);
    }
    applyPage(page,false);

    let dragX=null;
    veil.on('pointerdown',p=>{dragX=Number(p.x);});
    veil.on('pointerup',p=>{
      if(dragX==null)return;
      const dx=Number(p.x)-dragX;dragX=null;
      if(Math.abs(dx)>45){applyPage(page+(dx<0?1:-1));return;}
      const px=Number(p.x),py=Number(p.y);
      if(px<x||px>x+panelW||py<y||py>y+panelH)this._closeGameModeModal();
    });
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
    const title=this.add.text(cx,cy-70,t('modes.duelDistance'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'18px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);
    const sub=this.add.text(cx,cy-43,t('modes.duelDesc'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'10px',color:'#aebdcc'}).setOrigin(.5);c.add([veil,panel,title,sub]);
    const current=(()=>{try{return Number(localStorage.getItem(DUEL_LAPS_KEY)||15);}catch{return 15;}})();
    [5,10,15].forEach((laps,i)=>{
      const bx=cx+(i-1)*118,active=current===laps;
      const b=this.add.rectangle(bx,cy+14,100,50,active?0x5a3512:0x112331,.98).setStrokeStyle(2,active?0xffb45f:0x587085,active?1:.55).setInteractive({useHandCursor:true});
      const txt=this.add.text(bx,cy+14,t('modes.laps',{laps}),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'11px',fontStyle:'bold',color:'#ffffff'}).setOrigin(.5);c.add([b,txt]);
      let fired=false;
      const choose=()=>{if(fired)return;fired=true;try{localStorage.setItem(DUEL_LAPS_KEY,String(laps));}catch{}this._duelLapModal=null;c.destroy(true);this._startSelectedMode('duel');};
      b.on('pointerdown',choose);b.on('pointerup',choose);
    });
    const cancel=this.add.text(cx,cy+70,t('modes.cancel'),{fontFamily:'system-ui,-apple-system,Segoe UI,Arial',fontSize:'9px',fontStyle:'bold',color:'#8fa3b5'}).setOrigin(.5).setInteractive({useHandCursor:true});
    cancel.on('pointerdown',()=>{this._duelLapModal=null;c.destroy(true);});c.add(cancel);
  }
}
