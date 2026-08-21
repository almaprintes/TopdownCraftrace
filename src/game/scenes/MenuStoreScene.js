import { MenuScene as PreviousMenuScene } from './MenuCoinAssetScene.js';
import { MATERIAL_PACKS,COIN_PACKS,buyMaterialPack,simulateCoinPurchase,rewardedStatus,claimRewardedCoins,dailyStatus,claimDailyCoins } from '../store/storeEconomy.js';
import { loadGarage } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { preloadTdrCoin, TDR_COIN_KEY, replaceProceduralCoins } from '../ui/CoinAssetUi.js';

const FONT='system-ui,-apple-system,Segoe UI,Arial';
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('es-ES');
const timeLabel=ms=>{const s=Math.ceil(ms/1000),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;};
const PRICES=['1,99 €','4,99 €','9,99 €'];

export class MenuScene extends PreviousMenuScene{
 preload(){super.preload?.();preloadTdrCoin(this);for(const id of ['scrap','alloy','rubber','compound','disc','spring','gear','ecu']){const it=GARAGE_ITEMS[id];if(it?.asset&&!this.textures.exists(`store:${id}`))this.load.image(`store:${id}`,it.asset);}}
 _renderTopLobbyHeader(){super._renderTopLobbyHeader?.();const root=this._topLobbyHeader;if(!root)return;const w=this.scale.width;const bg=this.add.rectangle(w-470,6,118,36,0x542f91,.96).setOrigin(0).setStrokeStyle(2,0xc987ff,.8).setInteractive({useHandCursor:true});const tx=this.add.text(w-411,24,'TIENDA',{fontFamily:FONT,fontSize:'11px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);root.add([bg,tx]);bg.on('pointerup',()=>this._openStoreModal('materials'));}
 _openStoreModal(section='materials'){
  try{this._storeModal?.destroy?.(true);}catch{};const {width:w,height:h}=this.scale,root=this.add.container(0,0).setDepth(25000);this._ui?.add(root);this._storeModal=root;root.add(this.add.rectangle(0,0,w,h,0x06101b,.99).setOrigin(0).setInteractive());root.add(this.add.rectangle(0,0,w,58,0x101c3a,1).setOrigin(0));root.add(this.add.text(26,27,'TIENDA',{fontFamily:FONT,fontSize:'28px',fontStyle:'bold',color:'#fff'}).setOrigin(0,.5));root.add(this.add.text(w-142,29,`◈ ${fmt(loadGarage().coins||0)}`,{fontFamily:FONT,fontSize:'17px',fontStyle:'bold',color:'#ffd85a'}).setOrigin(.5));const close=this.add.text(w-30,29,'✕',{fontFamily:FONT,fontSize:'25px',fontStyle:'bold',color:'#fff'}).setOrigin(.5).setInteractive({useHandCursor:true});root.add(close);close.on('pointerup',()=>{root.destroy(true);this._storeModal=null;});
  const viewportX=22,viewportY=120,viewportW=w-44,viewportH=h-140,clip=this.add.graphics().fillStyle(0xffffff).fillRect(viewportX,viewportY,viewportW,viewportH);clip.setVisible(false);root.add(clip);const content=this.add.container(viewportX,viewportY).setMask(clip.createGeometryMask());root.add(content);const cardW=Math.min(330,w*.31),cardH=Math.max(250,viewportH-14),gap=18,sectionGap=76;let cursor=0;const starts={};
  const title=(id,label)=>{starts[id]=cursor;content.add(this.add.text(cursor,8,label,{fontFamily:FONT,fontSize:'15px',fontStyle:'bold',color:'#8fe9ff',backgroundColor:'#102039dd',padding:{x:10,y:5}}));};
  title('materials','MATERIALES');MATERIAL_PACKS.forEach((p,i)=>{this._storeCard(content,{type:'mat',...p,accent:[0x28a9e8,0x48cf8b,0xe4a83b,0xa76ce5][i%4]},cursor,38,cardW,cardH-38);cursor+=cardW+gap;});cursor+=sectionGap;
  title('coins','MONEDAS');COIN_PACKS.slice(0,3).forEach((p,i)=>{this._storeCard(content,{type:'coin',...p,priceLabel:PRICES[i],coinVisual:i,accent:[0x37b8ff,0x6bd35e,0xe4a83b][i]},cursor,38,cardW,cardH-38);cursor+=cardW+gap;});cursor+=sectionGap;
  title('rewards','RECOMPENSAS');for(const p of [{type:'reward',id:'video',name:'VÍDEO RECOMPENSADO',accent:0xe4a83b},{type:'daily',id:'daily',name:'REGALO DIARIO',accent:0x48cf8b}]){this._storeCard(content,p,cursor,38,cardW,cardH-38);cursor+=cardW+gap;}
  const total=Math.max(viewportW,cursor-gap),clamp=x=>Math.max(viewportX-(total-viewportW),Math.min(viewportX,x)),jump=id=>{content.x=clamp(viewportX-starts[id]);};let nx=24;for(const [id,label] of [['materials','MATERIALES'],['coins','MONEDAS'],['rewards','RECOMPENSAS']]){const b=this.add.rectangle(nx,72,150,34,0x17253b,1).setOrigin(0).setStrokeStyle(2,0x4e6e91,1).setInteractive({useHandCursor:true}),t=this.add.text(nx+75,89,label,{fontFamily:FONT,fontSize:'10px',fontStyle:'bold',color:'#fff'}).setOrigin(.5);root.add([b,t]);b.on('pointerup',()=>jump(id));nx+=158;}
  let dragStart=null,startX=0;const hit=this.add.rectangle(viewportX,viewportY,viewportW,viewportH,0xffffff,.001).setOrigin(0).setInteractive({draggable:true});root.add(hit);hit.on('dragstart',ptr=>{dragStart=ptr.x;startX=content.x;});hit.on('drag',ptr=>{content.x=clamp(startX+(ptr.x-dragStart));});hit.on('wheel',(_p,_dx,dy)=>{content.x=clamp(content.x-dy*.7);});jump(section);replaceProceduralCoins(this,root,24);
 }
 _coinPile(card,w,h,kind){if(!this.textures.exists(TDR_COIN_KEY))return;const add=(x,y,s,r=0)=>card.add(this.add.image(x,y,TDR_COIN_KEY).setScale(s).setRotation(r));if(kind===0)add(w/2,h*.43,.42);else if(kind===1){for(let i=0;i<7;i++)add(w/2+(i%3-1)*38,h*.48-Math.floor(i/3)*30,.32,(i%2?-.08:.08));}else{for(let row=0;row<4;row++)for(let i=0;i<5-row;i++)add(w/2+(i-(4-row)/2)*42,h*.53-row*29,.29,(i%2?-.07:.07));}}
 _cardFrame(card,w,h,accent){
  const radius=18;
  const shadow=this.add.graphics();shadow.fillStyle(0x000000,.34);shadow.fillRoundedRect(7,9,w,h,radius);card.add(shadow);
  const panel=this.add.graphics();panel.fillStyle(0x0d1826,1);panel.fillRoundedRect(0,0,w,h,radius);panel.lineStyle(1.5,accent,.72);panel.strokeRoundedRect(0,0,w,h,radius);panel.fillStyle(accent,.07);panel.fillRoundedRect(2,2,w-4,62,{tl:radius-2,tr:radius-2,bl:2,br:2});card.add(panel);
  const line=this.add.graphics();line.fillStyle(accent,.82);line.fillRoundedRect(16,55,46,3,2);card.add(line);
 }
 _materialItems(card,p,w,h){
  const entries=Object.entries(p.items||{});if(!entries.length)return;
  const columns=entries.length<=3?1:2,rows=Math.ceil(entries.length/columns);
  const top=68,bottom=h-70,available=Math.max(100,bottom-top),rowH=available/rows,colW=(w-28)/columns;
  entries.forEach(([id,count],j)=>{
   const col=j%columns,row=Math.floor(j/columns),left=14+col*colW,cy=top+row*rowH+rowH*.5;
   const chipH=Math.max(34,Math.min(68,rowH-8)),chipY=cy-chipH*.5;
   const chip=this.add.graphics();chip.fillStyle(0x07111c,.72);chip.fillRoundedRect(left,chipY,colW-8,chipH,12);chip.lineStyle(1,0x294157,.75);chip.strokeRoundedRect(left,chipY,colW-8,chipH,12);card.add(chip);
   const key=`store:${id}`,assetSize=Math.max(26,Math.min(54,chipH-12)),assetX=left+8+assetSize*.5;
   if(this.textures.exists(key)){const im=this.add.image(assetX,cy,key);im.setScale(Math.min(assetSize/(im.width||1),assetSize/(im.height||1)));card.add(im);}
   const tx=left+16+assetSize,usable=colW-32-assetSize;
   card.add(this.add.text(tx,cy-9,String(GARAGE_ITEMS[id]?.name||id).toUpperCase(),{fontFamily:FONT,fontSize:columns===1?'9px':'8px',fontStyle:'bold',color:'#cbd7e4',wordWrap:{width:usable}}).setOrigin(0,.5));
   card.add(this.add.text(left+colW-18,cy+11,`×${count}`,{fontFamily:FONT,fontSize:columns===1?'17px':'15px',fontStyle:'bold',color:'#ffffff'}).setOrigin(1,.5));
  });
 }
 _storeCard(parent,p,x,y,w,h){const card=this.add.container(x,y);parent.add(card);this._cardFrame(card,w,h,p.accent);card.add(this.add.text(18,15,p.name,{fontFamily:FONT,fontSize:'18px',fontStyle:'bold',color:'#f5f8fb',wordWrap:{width:w-36}}).setOrigin(0));
  if(p.type==='mat'){this._materialItems(card,p,w,h);this._buyButton(card,w,h,`${fmt(p.price)} MONEDAS`,()=>{const r=buyMaterialPack(p.id);this._toastStore(r.ok?'PACK AÑADIDO':r.reason,r.ok);if(r.ok)this._openStoreModal('materials');},true,p.accent);}
  if(p.type==='coin'){this._coinPile(card,w,h,p.coinVisual);card.add(this.add.text(w/2,h*.67,`${fmt(p.coins)} MONEDAS`,{fontFamily:FONT,fontSize:'25px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,p.priceLabel,()=>{simulateCoinPurchase(p.id);this._toastStore('COMPRA DE DESARROLLO',true);this._openStoreModal('coins');},true,p.accent);}
  if(p.type==='reward'){const st=rewardedStatus();card.add(this.add.text(w/2,h*.39,'▶',{fontFamily:FONT,fontSize:'88px',fontStyle:'bold',color:'#ffd34f'}).setOrigin(.5));card.add(this.add.text(w/2,h*.62,'+250 MONEDAS',{fontFamily:FONT,fontSize:'24px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,st.available?'VER VÍDEO':`DISPONIBLE EN ${timeLabel(st.remaining)}`,()=>{if(!st.available)return;claimRewardedCoins(250);this._toastStore('+250 MONEDAS',true);this._openStoreModal('rewards');},st.available,p.accent);}
  if(p.type==='daily'){const st=dailyStatus();card.add(this.add.text(w/2,h*.4,'★',{fontFamily:FONT,fontSize:'96px',fontStyle:'bold',color:'#72ffad'}).setOrigin(.5));card.add(this.add.text(w/2,h*.62,'+100 MONEDAS',{fontFamily:FONT,fontSize:'24px',fontStyle:'bold',color:'#fff'}).setOrigin(.5));this._buyButton(card,w,h,st.available?'RECLAMAR GRATIS':'VUELVE MAÑANA',()=>{if(!st.available)return;claimDailyCoins(100);this._toastStore('+100 MONEDAS',true);this._openStoreModal('rewards');},st.available,p.accent);}}
 _buyButton(card,w,h,label,fn,enabled=true,accent=0x48cf8b){
  const x=12,y=h-57,bw=w-24,bh=43,visual=this.add.graphics();visual.fillStyle(enabled?0x163d2c:0x202b38,1);visual.fillRoundedRect(x,y,bw,bh,11);visual.lineStyle(1.5,enabled?accent:0x526172,.9);visual.strokeRoundedRect(x,y,bw,bh,11);card.add(visual);
  const hit=this.add.rectangle(x,y,bw,bh,0xffffff,.001).setOrigin(0);if(enabled)hit.setInteractive({useHandCursor:true}).on('pointerup',fn);card.add(hit);card.add(this.add.text(w/2,y+bh/2,label,{fontFamily:FONT,fontSize:'12px',fontStyle:'bold',color:enabled?'#f5fff8':'#91a0af'}).setOrigin(.5));
 }
 _toastStore(msg,ok){const t=this.add.text(this.scale.width/2,105,msg,{fontFamily:FONT,fontSize:'14px',fontStyle:'bold',color:ok?'#72ffad':'#ff7373',backgroundColor:'#07101ddd',padding:{x:14,y:8}}).setOrigin(.5).setDepth(30000);this.time.delayedCall(1200,()=>t.destroy());}
}
