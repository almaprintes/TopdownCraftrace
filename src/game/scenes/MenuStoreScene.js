import { MenuScene as PreviousMenuScene } from './MenuCoinAssetScene.js';
import { MATERIAL_PACKS,COIN_PACKS,buyMaterialPack,simulateCoinPurchase,rewardedStatus,claimRewardedCoins,dailyStatus,claimDailyCoins } from '../store/storeEconomy.js';
import { loadGarage } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { preloadTdrCoin, TDR_COIN_KEY } from '../ui/CoinAssetUi.js';

const FONT='system-ui,-apple-system,Segoe UI,Arial';
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('es-ES');
const timeLabel=ms=>{const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;};
const PRICES=['1,99 €','4,99 €','9,99 €'];
const ACCENTS=[0x199dff,0x48d66f,0xffa52f,0xb66cff];
const COIN_PACK_ASSETS=['coins_2500','coins_7500','coins_20000'];
const REWARD_ASSETS={video:'rewarded_video',daily:'daily_gift'};
const PACK_COPY={mechanic:'Componentes esenciales para mantener y mejorar.',chassis:'Refuerza la estructura y el comportamiento.',technology:'Tecnología avanzada para el máximo rendimiento.',mixed:'Todo lo necesario para tu garaje y tu rendimiento.'};

export class MenuScene extends PreviousMenuScene{
 preload(){super.preload?.();preloadTdrCoin(this);for(const id of [...COIN_PACK_ASSETS,...Object.values(REWARD_ASSETS)]){const key=`store:${id}`;if(!this.textures.exists(key))this.load.image(key,`${import.meta.env.BASE_URL||'/'}assets/store/${id}.webp`);}for(const id of ['scrap','alloy','rubber','compound','disc','spring','gear','ecu']){const it=GARAGE_ITEMS[id];if(it?.asset&&!this.textures.exists(`store:${id}`))this.load.image(`store:${id}`,it.asset);}}

 _renderTopLobbyHeader(){super._renderTopLobbyHeader?.();const root=this._topLobbyHeader;if(!root)return;const w=this.scale.width;const bg=this.add.rectangle(w-470,6,118,36,0x542f91,.96).setOrigin(0).setStrokeStyle(2,0xc987ff,.8).setInteractive({useHandCursor:true});const tx=this.add.text(w-411,24,'TIENDA',{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);root.add([bg,tx]);bg.on('pointerup',()=>this._openStoreModal('materials'));}

 _materialCardWidth(pack,w){
  const n=Math.max(1,Object.keys(pack.items||{}).length);
  const cols=n<=3?n:4;
  const perItem=Math.min(100,Math.max(86,w*.075));
  const side=24,gap=7;
  return Math.round(Math.min(460,side*2+cols*perItem+(cols-1)*gap));
 }

 _openStoreModal(section='materials'){
  try{this._storeModal?.destroy?.(true);}catch{}
  const {width:w,height:h}=this.scale,root=this.add.container(0,0).setDepth(25000);this._ui?.add(root);this._storeModal=root;
  root.add(this.add.rectangle(0,0,w,h,0x04101d,1).setOrigin(0).setInteractive());root.add(this.add.rectangle(0,0,w,58,0x0b1930,1).setOrigin(0));root.add(this.add.text(28,28,'TIENDA',{fontFamily:FONT,fontSize:'29px',fontStyle:'bold',color:'#fff'}).setOrigin(0,.5));
  if(this.textures.exists(TDR_COIN_KEY))root.add(this.add.image(w-176,29,TDR_COIN_KEY).setDisplaySize(30,30));root.add(this.add.text(w-150,29,fmt(loadGarage().coins||0),{fontFamily:FONT,fontSize:'18px',fontStyle:'bold',color:'#ffd85a'}).setOrigin(0,.5));
  const closeBox=this.add.graphics();closeBox.fillStyle(0x0a1526,.96);closeBox.fillRoundedRect(w-57,9,42,40,10);closeBox.lineStyle(1,0x36506c,.8);closeBox.strokeRoundedRect(w-57,9,42,40,10);root.add(closeBox);const close=this.add.text(w-36,29,'✕',{fontFamily:FONT,fontSize:'23px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setInteractive({useHandCursor:true});root.add(close);close.on('pointerup',()=>{root.destroy(true);this._storeModal=null;});

  let jump=()=>{};const tabs=[['materials','⬡  MATERIALES'],['coins','●  MONEDAS'],['rewards','◆  RECOMPENSAS']],tabY=68,tabW=170,tabH=38;
  tabs.forEach(([id,label],i)=>{const x=24+i*(tabW+10),active=id===section,g=this.add.graphics();g.fillStyle(active?0x123e70:0x101c2d,1);g.fillRoundedRect(x,tabY,tabW,tabH,8);g.lineStyle(1.4,active?0x25a8ff:0x2b4056,.95);g.strokeRoundedRect(x,tabY,tabW,tabH,8);root.add(g);const t=this.add.text(x+tabW/2,tabY+tabH/2,label,{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:active?'#fff':'#9ca9bb'}).setOrigin(.5).setInteractive({useHandCursor:true});root.add(t);t.on('pointerup',()=>jump(id));});

  const viewportX=24,viewportY=112,viewportW=w-48,viewportH=h-120,clip=this.add.graphics().fillStyle(0xffffff).fillRect(viewportX,viewportY,viewportW,viewportH);clip.setVisible(false);root.add(clip);const content=this.add.container(viewportX,viewportY).setMask(clip.createGeometryMask());root.add(content);
  const sectionHeadH=42,bottomSafe=10,cardH=Math.max(196,viewportH-sectionHeadH-bottomSafe),gap=16,sectionGap=56;let cursor=0;const starts={};
  const sectionTitle=(id,label,copy)=>{starts[id]=cursor;content.add(this.add.text(cursor,0,label,{fontFamily:FONT,fontSize:'16px',fontStyle:'bold',color:'#31aaff'}));content.add(this.add.text(cursor,21,copy,{fontFamily:FONT,fontSize:'10px',color:'#a7b4c6'}));};

  sectionTitle('materials','MATERIALES','Componentes para fabricar y mejorar piezas en la fábrica.');
  MATERIAL_PACKS.forEach((p,i)=>{const cw=this._materialCardWidth(p,w);this._storeCard(content,{type:'mat',...p,accent:ACCENTS[i%4]},cursor,sectionHeadH,cw,cardH);cursor+=cw+gap;});cursor+=sectionGap;
  sectionTitle('coins','MONEDAS','Acelera tu progreso con packs de monedas.');const coinW=Math.min(250,Math.max(220,w*.24));COIN_PACKS.slice(0,3).forEach((p,i)=>{this._storeCard(content,{type:'coin',...p,priceLabel:PRICES[i],coinVisual:i,accent:[0x37b8ff,0x6bd35e,0xe4a83b][i]},cursor,sectionHeadH,coinW,cardH);cursor+=coinW+gap;});cursor+=sectionGap;
  sectionTitle('rewards','RECOMPENSAS','Premios gratuitos y recompensas opcionales.');for(const p of [{type:'reward',id:'video',name:'VÍDEO RECOMPENSADO',accent:0xe4a83b},{type:'daily',id:'daily',name:'REGALO DIARIO',accent:0x48cf8b}]){this._storeCard(content,p,cursor,sectionHeadH,coinW,cardH);cursor+=coinW+gap;}

  const total=Math.max(viewportW,cursor-gap),clamp=x=>Math.max(viewportX-(total-viewportW),Math.min(viewportX,x));jump=id=>{content.x=clamp(viewportX-starts[id]);};let dragStart=null,startX=0;const hit=this.add.rectangle(viewportX,viewportY,viewportW,viewportH,0xffffff,.001).setOrigin(0).setInteractive({draggable:true});root.add(hit);hit.on('dragstart',ptr=>{dragStart=ptr.x;startX=content.x;});hit.on('drag',ptr=>{content.x=clamp(startX+(ptr.x-dragStart));});hit.on('wheel',(_p,_dx,dy)=>{content.x=clamp(content.x-dy*.7);});jump(section);
 }

 _cardFrame(card,w,h,accent){const radius=Math.min(18,h*.07),shadow=this.add.graphics();shadow.fillStyle(0x000000,.42);shadow.fillRoundedRect(7,7,w,h,radius);card.add(shadow);const panel=this.add.graphics();panel.fillStyle(0x0a1726,1);panel.fillRoundedRect(0,0,w,h,radius);panel.lineStyle(1.3,accent,.9);panel.strokeRoundedRect(0,0,w,h,radius);const headerH=Math.min(82,Math.max(62,h*.26));panel.fillStyle(accent,.08);panel.fillRoundedRect(1,1,w-2,headerH,{tl:radius-1,tr:radius-1,bl:3,br:3});card.add(panel);const glow=this.add.graphics();glow.lineStyle(7,accent,.05);glow.strokeRoundedRect(4,4,w-8,h-8,Math.max(8,radius-4));card.add(glow);}

 _heroAsset(card,p,w,h){const first=Object.keys(p.items||{})[0],key=`store:${first}`;if(!first||!this.textures.exists(key))return;const im=this.add.image(w-62,Math.min(54,h*.18),key).setAlpha(.13),max=Math.min(118,h*.33);im.setScale(Math.min(max/(im.width||1),max/(im.height||1)));card.add(im);}

 _materialGrid(card,p,w,h){
  const entries=Object.entries(p.items||{});if(!entries.length)return;const compact=h<250,n=entries.length,cols=n<=3?n:4,rows=Math.ceil(n/cols),gridTop=compact?78:Math.min(106,h*.32),gridBottom=h-(compact?46:56),gap=compact?6:8,gridH=Math.max(58,gridBottom-gridTop),cellW=(w-28-gap*(cols-1))/cols,cellH=(gridH-gap*(rows-1))/rows;
  entries.forEach(([id,count],i)=>{const col=i%cols,row=Math.floor(i/cols),x=14+col*(cellW+gap),y=gridTop+row*(cellH+gap),box=this.add.graphics();box.fillStyle(0x07111d,.84);box.fillRoundedRect(x,y,cellW,cellH,Math.min(10,cellH*.18));box.lineStyle(1,0x34506a,.7);box.strokeRoundedRect(x,y,cellW,cellH,Math.min(10,cellH*.18));card.add(box);const key=`store:${id}`;if(this.textures.exists(key)){const im=this.add.image(x+cellW/2,y+cellH*(rows===1?.39:.34),key),maxW=cellW*(rows===1?.90:.84),maxH=cellH*(rows===1?.61:.53),scale=Math.min(maxW/(im.width||1),maxH/(im.height||1));im.setScale(scale);card.add(im);}const name=String(GARAGE_ITEMS[id]?.name||id).toUpperCase();card.add(this.add.text(x+cellW/2,y+cellH*(rows===1?.75:.72),name,{fontFamily:FONT,fontSize:cols>=4?(compact?'6px':'7px'):(compact?'8px':'9px'),fontStyle:'bold',color:'#e8edf4',align:'center',wordWrap:{width:cellW-8}}).setOrigin(.5));card.add(this.add.text(x+cellW/2,y+cellH*(rows===1?.91:.90),`×${count}`,{fontFamily:FONT,fontSize:cols>=4?(compact?'11px':'13px'):(compact?'14px':'17px'),fontStyle:'bold',color:'#fff'}).setOrigin(.5));});
 }

 _storeCard(parent,p,x,y,w,h){const compact=h<250,card=this.add.container(x,y);parent.add(card);this._cardFrame(card,w,h,p.accent);card.add(this.add.text(16,compact?9:13,p.name,{fontFamily:FONT,fontSize:compact?'15px':'18px',fontStyle:'bold',color:'#fff',wordWrap:{width:w-32}}).setOrigin(0));const accentLine=this.add.graphics();accentLine.fillStyle(p.accent,1);accentLine.fillRoundedRect(16,compact?38:52,compact?30:38,3,2);card.add(accentLine);
  if(p.type==='mat'){this._heroAsset(card,p,w,h);card.add(this.add.text(16,compact?45:64,PACK_COPY[p.id]||'Pack de materiales para tu garaje.',{fontFamily:FONT,fontSize:compact?'8px':'10px',color:'#c8d2df',wordWrap:{width:w-92},lineSpacing:1}));this._materialGrid(card,p,w,h);this._buyButton(card,w,h,`${fmt(p.price)} MONEDAS`,()=>{const r=buyMaterialPack(p.id);this._toastStore(r.ok?'PACK AÑADIDO':r.reason,r.ok);if(r.ok)this._openStoreModal('materials');},true,p.accent,true);}
  if(p.type==='coin'){this._coinPile(card,w,h,p.coinVisual);card.add(this.add.text(w/2,h*(compact?.66:.67),`${fmt(p.coins)} MONEDAS`,{fontFamily:FONT,fontSize:compact?'18px':'23px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,p.priceLabel,()=>{simulateCoinPurchase(p.id);this._toastStore('COMPRA DE DESARROLLO',true);this._openStoreModal('coins');},true,p.accent,false);}
  if(p.type==='reward'){const st=rewardedStatus();this._rewardAsset(card,w,h,REWARD_ASSETS.video);card.add(this.add.text(w/2,h*.62,'+250 MONEDAS',{fontFamily:FONT,fontSize:compact?'17px':'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,st.available?'VER VÍDEO':`DISPONIBLE EN ${timeLabel(st.remaining)}`,()=>{if(!st.available)return;claimRewardedCoins(250);this._toastStore('+250 MONEDAS',true);this._openStoreModal('rewards');},st.available,p.accent,false);}
  if(p.type==='daily'){const st=dailyStatus();this._rewardAsset(card,w,h,REWARD_ASSETS.daily);card.add(this.add.text(w/2,h*.62,'+100 MONEDAS',{fontFamily:FONT,fontSize:compact?'17px':'22px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,st.available?'RECLAMAR GRATIS':'VUELVE MAÑANA',()=>{if(!st.available)return;claimDailyCoins(100);this._toastStore('+100 MONEDAS',true);this._openStoreModal('rewards');},st.available,p.accent,false);}}

 _coinPile(card,w,h,kind){const key=`store:${COIN_PACK_ASSETS[kind]||COIN_PACK_ASSETS[0]}`;if(!this.textures.exists(key))return;const im=this.add.image(w/2,h*(h<250?.39:.40),key),scale=Math.min((w*.78)/(im.width||1),(h*.48)/(im.height||1));im.setScale(scale);card.add(im);}

 _rewardAsset(card,w,h,id){const key=`store:${id}`;if(!this.textures.exists(key))return;const im=this.add.image(w/2,h*(h<250?.38:.39),key),scale=Math.min((w*.72)/(im.width||1),(h*.43)/(im.height||1));im.setScale(scale);card.add(im);}

 _buyButton(card,w,h,label,fn,enabled=true,accent=0x48cf8b,showCoin=false){const compact=h<250,bh=compact?34:44,x=12,y=h-bh-10,bw=w-24,shadow=this.add.graphics();shadow.fillStyle(0x000000,.28);shadow.fillRoundedRect(x+3,y+3,bw,bh,9);card.add(shadow);const visual=this.add.graphics();visual.fillStyle(enabled?0x11652f:0x202b38,1);visual.fillRoundedRect(x,y,bw,bh,9);visual.lineStyle(1.2,enabled?0x5ddd7a:0x526172,.95);visual.strokeRoundedRect(x,y,bw,bh,9);card.add(visual);const hit=this.add.rectangle(x,y,bw,bh,0xffffff,.001).setOrigin(0);if(enabled)hit.setInteractive({useHandCursor:true}).on('pointerup',fn);card.add(hit);let center=w/2;if(showCoin&&this.textures.exists(TDR_COIN_KEY)){const size=compact?22:27;card.add(this.add.image(center-54,y+bh/2,TDR_COIN_KEY).setDisplaySize(size,size));center+=10;}card.add(this.add.text(center,y+bh/2,label,{fontFamily:FONT,fontSize:compact?'10px':'12px',fontStyle:'bold',color:enabled?'#f5fff8':'#91a0af'}).setOrigin(.5));}

 _toastStore(msg,ok){const t=this.add.text(this.scale.width/2,105,msg,{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:ok?'#72ffad':'#ff7373',backgroundColor:'#07101ddd',padding:{x:14,y:8}}).setOrigin(.5).setDepth(30000);this.time.delayedCall(1200,()=>t.destroy());}
}
