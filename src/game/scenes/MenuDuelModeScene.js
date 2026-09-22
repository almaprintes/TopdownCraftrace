import { MenuScene as CurrentMenuScene } from './MenuDomUiScene.js';
import { t, getLanguage } from '../i18n/index.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { buyMaterialPack, rewardedStatus, dailyStatus } from '../store/storeEconomy.js';

const DUEL_LAPS_KEY='tdr2:duelLaps';
const MODE_KEY='tdr2:gameMode';
const BASE=import.meta.env.BASE_URL||'/';
const FONT='system-ui,-apple-system,Segoe UI,Arial';
const STORE_TIME_LABEL=ms=>{const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;};

export class MenuScene extends CurrentMenuScene {
  _openStoreModal(section='materials'){
    this._storeCountdownEvent?.remove?.(false);
    this._storeCountdownEvent=null;
    super._openStoreModal(section);
    const root=this._storeModal;
    if(!root?.scene)return;

    const tabs=['materials','rewards'];
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
    this._installStoreCountdownTicker(root);
  }

  _installStoreCountdownTicker(root){
    const prefix=t('store.availableIn');
    const rewardTitles={video:t('store.rewardedVideo').toUpperCase(),daily:t('store.dailyGift').toUpperCase()};
    const collectCards=(node,out=[])=>{
      for(const child of node?.list||[]){
        if(child?.type==='Container'){
          const texts=(child.list||[]).filter(o=>o?.type==='Text');
          const title=texts.map(o=>String(o.text||'').toUpperCase()).join(' | ');
          if(title.includes(rewardTitles.video))out.push({kind:'video',card:child,texts});
          else if(title.includes(rewardTitles.daily))out.push({kind:'daily',card:child,texts});
          collectCards(child,out);
        }
      }
      return out;
    };
    const cards=collectCards(root,[]);
    if(!cards.length)return;
    const refresh=()=>{
      if(!root?.scene||this._storeModal!==root){this._storeCountdownEvent?.remove?.(false);this._storeCountdownEvent=null;return;}
      let becameAvailable=false;
      for(const entry of cards){
        const status=entry.kind==='video'?rewardedStatus():dailyStatus();
        const label=entry.texts.find(o=>String(o.text||'').startsWith(prefix));
        if(status.available){
          if(label)becameAvailable=true;
          continue;
        }
        if(label)label.setText(`${prefix} ${STORE_TIME_LABEL(status.remaining)}`);
      }
      if(becameAvailable){
        this._storeCountdownEvent?.remove?.(false);
        this._storeCountdownEvent=null;
        this._openStoreModal('rewards');
      }
    };
    refresh();
    this._storeCountdownEvent=this.time.addEvent({delay:1000,loop:true,callback:refresh});
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
        const artKeys=new Set(['store:rewarded_video','store:daily_gift']);
        const arts=(card.list||[]).filter(child=>child?.type==='Image'&&artKeys.has(child.texture?.key));
        arts.forEach(child=>{child.y+=22;});

      }
      return;
    }
    this._renderMaterialPackCard(parent,p,x,y,w,h);
  }

  _renderMaterialPackCard(parent,p,x,y,w,h){
    const lang=getLanguage()==='en'?'en':'es';
    const packKey=`store.pack.${p.id}`,packTitle=t(`${packKey}.title`),packCopy=t(`${packKey}.copy`);
    const card=this.add.container(x,y);parent.add(card);
    const compact=h<250,accent=p.accent||0x31aaff,entries=Object.entries(p.items||{});
    const totalUnits=entries.reduce((sum,[,n])=>sum+Math.max(0,Number(n)||0),0);
    const shadow=this.add.graphics();shadow.fillStyle(0x000000,.44);shadow.fillRoundedRect(7,8,w,h,18);card.add(shadow);
    const frame=this.add.graphics();frame.fillGradientStyle(0x091521,0x08111c,0x07101a,0x0b1721,1);frame.fillRoundedRect(0,0,w,h,18);frame.lineStyle(2,accent,.95);frame.strokeRoundedRect(0,0,w,h,18);frame.lineStyle(8,accent,.045);frame.strokeRoundedRect(5,5,w-10,h-10,14);card.add(frame);

    const title=this.add.text(16,compact?10:14,packTitle,{fontFamily:FONT,fontSize:compact?'15px':'19px',fontStyle:'bold',color:'#fff',wordWrap:{width:w-126}});title.setShadow(0,2,'#000',4,true,true);card.add(title);
    const badgeW=compact?82:98,badgeH=compact?34:40,bx=w-badgeW-12,by=compact?8:11,badge=this.add.graphics();badge.fillStyle(accent,.18);badge.fillRoundedRect(bx,by,badgeW,badgeH,8);badge.lineStyle(1.4,accent,.95);badge.strokeRoundedRect(bx,by,badgeW,badgeH,8);card.add(badge);
    card.add(this.add.text(bx+badgeW/2,by+badgeH*.38,String(totalUnits),{fontFamily:FONT,fontSize:compact?'17px':'20px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));
    card.add(this.add.text(bx+badgeW/2,by+badgeH*.77,t('store.totalUnits'),{fontFamily:FONT,fontSize:compact?'6px':'7px',fontStyle:'bold',color:'#d9e6ef'}).setOrigin(.5));
    const copyY=compact?36:48;card.add(this.add.text(16,copyY,packCopy,{fontFamily:FONT,fontSize:compact?'7px':'9px',color:'#aebdcc',wordWrap:{width:w-32},lineSpacing:1}));
    const labelY=compact?58:72;card.add(this.add.text(16,labelY,t('store.contents'),{fontFamily:FONT,fontSize:compact?'6px':'8px',fontStyle:'bold',color:'#8299ad'}));

    const buttonH=compact?34:44,buttonY=h-buttonH-10,gridTop=labelY+(compact?12:16),gridBottom=buttonY-7;
    const cols=entries.length>=5?2:1,rows=Math.ceil(entries.length/cols),gap=compact?4:6,cellW=(w-28-gap*(cols-1))/cols,cellH=Math.max(22,(gridBottom-gridTop-gap*(rows-1))/rows);
    entries.forEach(([id,count],i)=>{
      const col=i%cols,row=Math.floor(i/cols),cx=14+col*(cellW+gap),cy=gridTop+row*(cellH+gap),box=this.add.graphics();
      box.fillStyle(0x07131f,.96);box.fillRoundedRect(cx,cy,cellW,cellH,7);box.lineStyle(1,0x35566f,.9);box.strokeRoundedRect(cx,cy,cellW,cellH,7);card.add(box);
      const key=`store:${id}`,iconSize=Math.max(18,Math.min(compact?27:34,cellH*.66,cellW*.18));
      if(this.textures.exists(key)){const im=this.add.image(cx+7+iconSize/2,cy+cellH/2,key),scale=Math.min(iconSize/(im.width||1),iconSize/(im.height||1));im.setScale(scale);card.add(im);}
      const name=t(`materials.${id}`)||GARAGE_ITEMS[id]?.name||id,tx=cx+13+iconSize;
      card.add(this.add.text(tx,cy+cellH/2,String(name).toUpperCase(),{fontFamily:FONT,fontSize:cols>1?(compact?'7px':'8px'):(compact?'8px':'10px'),fontStyle:'bold',color:'#dfe8f1',wordWrap:{width:Math.max(28,cellW-iconSize-58)}}).setOrigin(0,.5));
      card.add(this.add.text(cx+cellW-9,cy+cellH/2,`×${count}`,{fontFamily:FONT,fontSize:cols>1?(compact?'11px':'13px'):(compact?'13px':'16px'),fontStyle:'bold',color:'#fff'}).setOrigin(1,.5));
    });

    const price=Number(p.price||0).toLocaleString(lang==='en'?'en-US':'es-ES'),buyLabel=`${price} ${t('store.coins')}`;
    this._buyButton(card,w,h,buyLabel,()=>{const r=buyMaterialPack(p.id),okLabel=t('store.packAdded');this._toastStore(r.ok?okLabel:r.reason,r.ok);if(r.ok)this._openStoreModal('materials');},true,accent,true);
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

// DEV 1.1.129 validation trigger: material store copy is centralized in i18n.
