import { MATERIAL_PACKS, buyMaterialPack, rewardedStatus, claimRewardedCoins, dailyStatus, claimDailyCoins } from '../store/storeEconomy.js';
import { loadGarage } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { t, getLanguage } from '../i18n/index.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { REWARDED_PLACEMENTS, verifiedReward } from '../monetization/rewardedActions.js';
import { openMaterialExchangeDom } from './MaterialExchangeFlexibleDom.js';
import {playDomCoinRewardFlight,animateDomCoinBalance,primeCoinRewardSound} from './coinRewardFlight.js';
import './store-dom.css';

const ROOT_ID='tdr-store-dom';
const BASE=()=>import.meta.env.BASE_URL||'/';
const fmt=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString(getLanguage()==='en'?'en-US':'es-ES');
const timeLabel=ms=>{const s=Math.max(0,Math.ceil(ms/1000)),h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;};
const assetUrl=id=>{const raw=GARAGE_ITEMS[id]?.asset||'';if(!raw)return'';if(/^(data:|https?:|\/)/.test(raw))return raw;return `${BASE()}${String(raw).replace(/^\.\//,'')}`;};
const el=(tag,className,text)=>{const node=document.createElement(tag);if(className)node.className=className;if(text!=null)node.textContent=String(text);return node;};

export function closeStoreDom(scene){
  // Store owns the recycler flow: closing the store must also destroy any recycler overlay.
  try{scene?._materialExchangeDom?.remove();}catch{}
  if(scene)scene._materialExchangeDom=null;
  try{document.getElementById('tdr-material-exchange-dom')?.remove();}catch{}
  try{scene?._partDismantleDom?.remove();}catch{}
  if(scene)scene._partDismantleDom=null;
  try{document.getElementById('tdr-part-dismantle-dom')?.remove();}catch{}
  const root=document.getElementById(ROOT_ID);
  if(root){root.dispatchEvent(new Event('tdr:store-closed'));root.remove();}
  if(scene){scene._storeDomRoot=null;try{scene._lobbyDomRoot?.classList?.remove('tdr-lobby-dom--modal-open');}catch{}}
}

function toast(root,message,ok=true){
  const old=root.querySelector('.tdr-store-toast');old?.remove();
  const node=el('div',`tdr-store-toast ${ok?'is-ok':'is-error'}`,message);
  root.appendChild(node);setTimeout(()=>node.remove(),1300);
}

function materialCard(scene,root,pack){
  const card=el('article','tdr-store-card tdr-store-material');
  const head=el('div','tdr-store-card-head');
  const title=el('h2','',t(`store.pack.${pack.id}.title`));
  const total=Object.values(pack.items||{}).reduce((sum,n)=>sum+Math.max(0,Number(n)||0),0);
  const badge=el('div','tdr-store-total');badge.innerHTML=`<strong>${fmt(total)}</strong><span>${t('store.totalUnits')}</span>`;
  head.append(title,badge);card.append(head);
  card.append(el('p','tdr-store-copy',t(`store.pack.${pack.id}.copy`)));
  card.append(el('div','tdr-store-section-label',t('store.contents')));
  const grid=el('div','tdr-store-material-grid');
  for(const [id,count] of Object.entries(pack.items||{})){
    const row=el('div','tdr-store-material-row');
    const url=assetUrl(id);if(url){const img=el('img','tdr-store-material-icon');img.src=url;img.alt='';row.append(img);}
    row.append(el('span','tdr-store-material-name',String(t(`materials.${id}`)||id).toUpperCase()));
    row.append(el('strong','tdr-store-material-count',`×${count}`));grid.append(row);
  }
  card.append(grid);
  const button=el('button','tdr-store-action',`${fmt(pack.price)} ${t('store.coins')}`);
  button.type='button';button.addEventListener('click',()=>{const result=buyMaterialPack(pack.id);toast(root,result.ok?t('store.packAdded'):result.reason,result.ok);if(result.ok)refreshBalance(root);});
  card.append(button);return card;
}

function refreshBalance(root){
  const balance=root.querySelector('[data-store-balance]');
  if(balance)balance.textContent=fmt(loadGarage().coins||0);
}

function rewardCard(scene,root,kind){
  const isVideo=kind==='video';
  const card=el('article','tdr-store-card tdr-store-reward');
  const title=el('h2','',isVideo?t('store.rewardedVideo'):t('store.dailyGift'));card.append(title);
  const img=el('img','tdr-store-reward-art');img.src=`${BASE()}assets/store/${isVideo?'rewarded_video':'daily_gift'}.webp`;img.alt='';card.append(img);
  card.append(el('div','tdr-store-reward-value',`+${isVideo?'100':'250'} ${t('store.coins')}`));
  const button=el('button','tdr-store-action');button.type='button';card.append(button);
  let busy=false;
  const update=()=>{
    const status=isVideo?rewardedStatus():dailyStatus();
    button.disabled=busy||!status.available;
    button.textContent=status.available?(isVideo?t('store.rewardedVideo'):t('store.dailyGift')):`${t('store.availableIn')} ${timeLabel(status.remaining)}`;
  };
  button.addEventListener('click',async()=>{
    if(busy||!root.isConnected)return;
    const status=isVideo?rewardedStatus():dailyStatus();
    if(!status.available){update();return;}
    busy=true;
    button.disabled=true;
    primeCoinRewardSound(scene); // Must run from the real user gesture.
    try{
      if(isVideo){
        const ad=await showRewardedAd(scene,{
          title:t('store.rewardedVideo'),
          placement:REWARDED_PLACEMENTS.STORE_COINS_100,
          claimId:status.claimId
        });
        if(!verifiedReward(ad)){
          if(root.isConnected)toast(root,getLanguage()==='en'?'VIDEO NOT COMPLETED':'VÍDEO NO COMPLETADO',false);
          return; // No ad verification => no currency.
        }
      }
      // Durable wallet write happens synchronously BEFORE ANY visual effect.
      const result=isVideo?claimRewardedCoins(100):claimDailyCoins(250);
      if(!result.ok){if(root.isConnected)toast(root,result.reason,false);return;}
      if(!root.isConnected)return; // No UI to animate, but currency is already saved.
      try{
        await playDomCoinRewardFlight(scene,{amount:result.amount,root,card,english:getLanguage()==='en'});
        await animateDomCoinBalance(root,{
          from:Number(result.state?.coins)-result.amount,to:Number(result.state?.coins),
          english:getLanguage()==='en'
        });
      }catch(error){console.warn('[TDR reward] optional coin animation failed',error);}
      if(root.isConnected)toast(root,`+${result.amount} ${t('store.coins')}`,true);
    }catch(error){
      // An ad/network exception must NEVER be interpreted as verified.
      console.warn('[TDR reward] claim unavailable',error);
      if(root.isConnected)toast(root,getLanguage()==='en'?'REWARD UNAVAILABLE':'RECOMPENSA NO DISPONIBLE',false);
    }finally{
      busy=false;
      if(root.isConnected){refreshBalance(root);update();}
    }
  });
  update();return {card,update};
}

export function openStoreDom(scene){
  closeStoreDom(scene);
  const root=el('div','tdr-store-dom');root.id=ROOT_ID;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  const shell=el('section','tdr-store-shell');
  const header=el('header','tdr-store-header');
  header.append(el('h1','',t('store.title')));
  const balance=el('div','tdr-store-balance');
  const coin=el('img','tdr-store-coin');coin.src=`${BASE()}assets/ui/moneda-tdr.webp`;coin.alt='';
  const total=el('strong','',fmt(loadGarage().coins||0));total.dataset.storeBalance='';
  balance.append(coin,total,el('span','',t('store.coins')));
  const close=el('button','tdr-store-close','×');close.type='button';close.setAttribute('aria-label',t('common.close'));close.addEventListener('click',()=>closeStoreDom(scene));
  const recycler=el('button','tdr-store-recycler','♻  '+(getLanguage()==='en'?'RECYCLER':'RECICLADORA'));recycler.type='button';recycler.addEventListener('click',()=>openMaterialExchangeDom(scene,scene?._exchangeFrom||'scrap',scene?._exchangeTo||'compound',scene?._exchangeAmount||100));
  header.append(recycler,balance,close);shell.append(header);
  const scroller=el('main','tdr-store-scroller');
  for(const pack of MATERIAL_PACKS)scroller.append(materialCard(scene,root,pack));
  const video=rewardCard(scene,root,'video'),daily=rewardCard(scene,root,'daily');scroller.append(video.card,daily.card);shell.append(scroller);root.append(shell);
  root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('pointerup',e=>e.stopPropagation());root.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
  document.body.append(root);scene._storeDomRoot=root;
  const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return;}video.update();daily.update();},1000);
  const cleanup=()=>{clearInterval(timer);closeStoreDom(scene);};
  scene.events?.once?.('shutdown',cleanup);scene.events?.once?.('destroy',cleanup);
  return root;
}
