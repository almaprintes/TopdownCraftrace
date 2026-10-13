import { MATERIAL_PACKS, buyMaterialPack, rewardedStatus, claimRewardedCoins, dailyStatus, claimDailyCoins } from '../store/storeEconomy.js';
import { loadGarage } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { t, getLanguage } from '../i18n/index.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { REWARDED_PLACEMENTS, verifiedReward } from '../monetization/rewardedActions.js';
import { openMaterialExchangeDom } from './MaterialExchangeFlexibleDom.js';
import {playDomCoinRewardFlight,animateDomCoinBalance,primeCoinRewardSound} from './coinRewardFlight.js';
import {createAppHeader,disposeAppWallets,refreshAppWallets} from './TdrAppHeader.js';
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
  if(root){root.dispatchEvent(new Event('tdr:store-closed'));disposeAppWallets(root);root.remove();}
  if(scene){scene._storeDomRoot=null;try{scene._lobbyDomRoot?.classList?.remove('tdr-lobby-dom--modal-open');}catch{}}
}

function toast(root,message,ok=true){
  const old=root.querySelector('.tdr-store-toast');old?.remove();
  const node=el('div',`tdr-store-toast ${ok?'is-ok':'is-error'}`,message);
  root.appendChild(node);setTimeout(()=>node.remove(),1300);
}

function materialCard(scene,root,pack){
  const card=el('article',`tdr-store-card tdr-store-material tdr-store-material--${pack.id}`);
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
  // A prominent shop-price badge is presentation only. The canonical
  // buyMaterialPack still decides affordability and applies the transaction.
  const button=el('button','tdr-store-action');
  const coin=el('img','tdr-store-action-coin');
  coin.src=`${BASE()}assets/ui/moneda-tdr.webp`;coin.alt='';coin.draggable=false;
  button.append(coin,el('span','tdr-store-action-price',`${fmt(pack.price)} ${t('store.coins')}`));
  button.type='button';button.addEventListener('click',()=>{const result=buyMaterialPack(pack.id);toast(root,result.ok?t('store.packAdded'):result.reason,result.ok);if(result.ok)refreshBalance(root);});
  card.append(button);return card;
}

function refreshBalance(root){
  const balance=root.querySelector('[data-store-balance]');
  if(balance)balance.textContent=fmt(loadGarage().coins||0);
  refreshAppWallets(root);
}

function rewardCard(scene,root,kind){
  const isVideo=kind==='video';
  const card=el('article',`tdr-store-card tdr-store-reward tdr-store-reward--${kind}`);
  const title=el('h2','',isVideo?t('store.rewardedVideo'):t('store.dailyGift'));card.append(title);
  const img=el('img','tdr-store-reward-art');img.src=`${BASE()}assets/store/${isVideo?'rewarded_video':'daily_gift'}.webp`;img.alt='';card.append(img);
  card.append(el('div','tdr-store-reward-value',`+${isVideo?'100':'250'} ${t('store.coins')}`));
  // Share the lobby's illuminated outline language without touching the
  // actual reward button, advertising flow or wallet claim.
  const actionSlot=el('div','tdr-store-reward-action-slot');
  const halo=el('span','tdr-store-reward-action-halo');
  halo.setAttribute('aria-hidden','true');
  halo.append(el('span','tdr-store-reward-action-halo-shape'));
  const button=el('button','tdr-store-action');
  button.type='button';
  actionSlot.append(halo,button);
  card.append(actionSlot);
  let busy=false;
  const update=()=>{
    const status=isVideo?rewardedStatus():dailyStatus();
    button.disabled=busy||!status.available;
    card.classList.toggle('is-ready',status.available&&!busy);
    card.classList.toggle('is-cooling',!status.available);
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
      root.dataset.tdrWalletPending='1';
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
      // The flying coins and wallet count-up ARE the success confirmation.
      // A second green +100/+250 toast is redundant; keep errors intact.
    }catch(error){
      // An ad/network exception must NEVER be interpreted as verified.
      console.warn('[TDR reward] claim unavailable',error);
      if(root.isConnected)toast(root,getLanguage()==='en'?'REWARD UNAVAILABLE':'RECOMPENSA NO DISPONIBLE',false);
    }finally{
      busy=false;delete root.dataset.tdrWalletPending;
      if(root.isConnected){refreshBalance(root);update();}
    }
  });
  update();return {card,update};
}


// The four packs and two rewards share one scrolling host but never appear
// half-overlapped. Section tabs change visibility, not their handlers/data.
function mountStoreNavigation(root,shell,scroller,packCards,rewardCards,initialSection){
  const bar=el('nav','tdr-store-section-nav');
  bar.setAttribute('aria-label',getLanguage()==='en'?'Store categories':'Secciones de tienda');
  const tabGroup=el('div','tdr-store-section-tabs');
  const tabs={};
  for(const [key,es,en] of [['materials','PACKS','PACKS'],['rewards','RECOMPENSAS','REWARDS']]){
    const button=el('button','tdr-store-section-tab',getLanguage()==='en'?en:es);
    button.type='button';button.dataset.storeSection=key;
    button.addEventListener('click',()=>setSection(key));
    tabGroup.append(button);tabs[key]=button;
  }
  const controls=el('div','tdr-store-page-controls');
  const previous=el('button','tdr-store-page-arrow','‹');
  previous.type='button';previous.setAttribute('aria-label',getLanguage()==='en'?'Previous pack':'Anterior pack');
  const counter=el('span','tdr-store-page-counter');
  counter.setAttribute('aria-live','off');
  const next=el('button','tdr-store-page-arrow','›');
  next.type='button';next.setAttribute('aria-label',getLanguage()==='en'?'Next pack':'Siguiente pack');
  controls.append(previous,counter,next);bar.append(tabGroup,controls);
  shell.append(bar);
  const grouped={materials:packCards,rewards:rewardCards};
  const activeCards=()=>grouped[scroller.dataset.section]||packCards;
  const updateControls=()=>{
    if(!root.isConnected)return;
    const cards=activeCards();
    const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
    const gap=parseFloat(getComputedStyle(scroller).columnGap)||16;
    const width=cards[0]?.getBoundingClientRect().width||1;
    const index=Math.max(0,Math.min(cards.length-1,Math.round(scroller.scrollLeft/(width+gap))));
    counter.textContent=`${String(index+1).padStart(2,'0')} / ${String(cards.length).padStart(2,'0')}`;
    previous.disabled=scroller.scrollLeft<=2;
    next.disabled=scroller.scrollLeft>=max-2;
  };
  function setSection(section){
    const key=section==='rewards'?'rewards':'materials';
    scroller.dataset.section=key;
    for(const card of packCards)card.hidden=key!=='materials';
    for(const card of rewardCards)card.hidden=key!=='rewards';
    for(const [id,button] of Object.entries(tabs)){
      const active=id===key;
      button.classList.toggle('is-active',active);
      button.setAttribute('aria-pressed',String(active));
    }
    scroller.scrollLeft=0;
    requestAnimationFrame(updateControls);
  }
  const stepScroll=direction=>{
    const cards=activeCards(),width=cards[0]?.getBoundingClientRect().width||0;
    const gap=parseFloat(getComputedStyle(scroller).columnGap)||16;
    scroller.scrollBy({left:direction*(width+gap),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?'instant':'smooth'});
  };
  previous.addEventListener('click',()=>stepScroll(-1));
  next.addEventListener('click',()=>stepScroll(1));
  scroller.addEventListener('scroll',updateControls,{passive:true});
  const syncSize=()=>requestAnimationFrame(updateControls);
  window.addEventListener('resize',syncSize);
  root.addEventListener('tdr:store-closed',()=>window.removeEventListener('resize',syncSize),{once:true});
  setSection(initialSection);
}

export function openStoreDom(scene,section='materials'){
  closeStoreDom(scene);
  const root=el('div','tdr-store-dom');root.id=ROOT_ID;root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');
  const shell=el('section','tdr-store-shell');
  const recycler=el('button','tdr-store-recycler','♻  '+(getLanguage()==='en'?'RECYCLER':'RECICLADORA'));recycler.type='button';recycler.addEventListener('click',()=>openMaterialExchangeDom(scene,scene?._exchangeFrom||'scrap',scene?._exchangeTo||'compound',scene?._exchangeAmount||100));
  const header=createAppHeader({title:t('store.title'),onBack:()=>closeStoreDom(scene),actions:[recycler]});shell.append(header);
  const scroller=el('main','tdr-store-scroller');
  const packCards=MATERIAL_PACKS.map(pack=>materialCard(scene,root,pack));
  for(const card of packCards)scroller.append(card);
  const video=rewardCard(scene,root,'video'),daily=rewardCard(scene,root,'daily');
  scroller.append(video.card,daily.card);
  mountStoreNavigation(root,shell,scroller,packCards,[video.card,daily.card],section);
  shell.append(scroller);root.append(shell);
  root.addEventListener('pointerdown',e=>e.stopPropagation());root.addEventListener('pointerup',e=>e.stopPropagation());root.addEventListener('touchmove',e=>e.stopPropagation(),{passive:true});
  document.body.append(root);scene._storeDomRoot=root;
  // The lobby's rewards shortcut now opens the focused RECOMPENSAS view.
  // No adjacent material pack is cut off along its left edge.
  const timer=setInterval(()=>{if(!root.isConnected){clearInterval(timer);return;}video.update();daily.update();},1000);
  const cleanup=()=>{clearInterval(timer);closeStoreDom(scene);};
  scene.events?.once?.('shutdown',cleanup);scene.events?.once?.('destroy',cleanup);
  return root;
}
