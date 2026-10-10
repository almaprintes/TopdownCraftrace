import {loadGarage} from '../garage/garageStore.js';
import {getLanguage,t} from '../i18n/index.js';
import './app-header.css';
const BASE=import.meta.env.BASE_URL||'/';
export const APP_WALLET_UPDATED='tdr:garage-saved';
const fmt=coins=>Math.max(0,Math.floor(Number(coins)||0)).toLocaleString(getLanguage()==='en'?'en-US':'es-ES');
export function createAppWallet({className='',amountAttribute='storeBalance',label}={}){
  const wallet=document.createElement('div');wallet.className=('tdr-app-wallet '+className).trim();wallet.dataset.tdrWallet='1';
  const icon=document.createElement('img');icon.className='tdr-app-wallet-icon tdr-store-coin';icon.src=BASE+'assets/ui/moneda-tdr.webp';icon.alt='';icon.draggable=false;
  const copy=document.createElement('span');copy.className='tdr-app-wallet-copy';
  const caption=document.createElement('small');caption.textContent=label??t('store.coins');
  const amount=document.createElement('strong');amount.dataset[amountAttribute]='';
  copy.append(caption,amount);wallet.append(icon,copy);
  const refresh=()=>{if(wallet.closest('[data-tdr-wallet-pending="1"]'))return;amount.textContent=fmt(loadGarage().coins);};
  const visible=()=>{if(!document.hidden)refresh();};
  window.addEventListener(APP_WALLET_UPDATED,refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visible);
  wallet.tdrWalletRefresh=refresh;
  wallet.tdrWalletDestroy=()=>{window.removeEventListener(APP_WALLET_UPDATED,refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visible);};
  refresh();return wallet;
}
export function disposeAppWallets(root){for(const wallet of root?.querySelectorAll?.('[data-tdr-wallet]')||[])wallet.tdrWalletDestroy?.();}
export function refreshAppWallets(root){for(const wallet of root?.querySelectorAll?.('[data-tdr-wallet]')||[])wallet.tdrWalletRefresh?.();}
export function createAppHeader({title='',onBack=null,backLabel='×',actions=[]}={}){
  const header=document.createElement('header');header.className='tdr-app-header tdr-store-header';header.dataset.tdrAppHeader='1';
  const back=document.createElement('button');back.className='tdr-app-back tdr-store-close';back.type='button';back.setAttribute('aria-label',t('common.close'));back.textContent=backLabel;
  if(onBack)back.addEventListener('click',onBack);
  const label=document.createElement('h1');label.className='tdr-app-title';label.textContent=title;
  const tools=document.createElement('div');tools.className='tdr-app-header-actions';for(const action of actions)if(action)tools.append(action);
  header.append(back,label,tools,createAppWallet({className:'tdr-store-balance'}));return header;
}

/* Observes screens which replace the header with innerHTML on every tab.
   Disconnect the old wallet before attaching its replacement. */
export function observeAppHeader(root,selector){
  let previous=null;
  const sync=()=>{
    const header=root.querySelector(selector);
    if(header===previous&&header?.querySelector('[data-tdr-wallet]'))return;
    if(previous)disposeAppWallets(previous);
    previous=header;
    if(!header)return;
    header.classList.add('tdr-app-header');header.dataset.tdrAppHeader='1';
    header.querySelector('button')?.classList.add('tdr-app-back');
    header.append(createAppWallet());
  };
  const observer=new MutationObserver(sync);
  observer.observe(root,{childList:true});
  sync();
  return ()=>{observer.disconnect();if(previous)disposeAppWallets(previous);};
}
/* Fixed DOM bar for Phaser-rendered player screens. Phaser content stays intact.
   The header is not in the zoomable camera and survives canvas redraws. */
export function mountSceneAppHeader(scene,{title='',onBack=null}={}){
  if(scene._tdrAppHeader?.isConnected)return scene._tdrAppHeader;
  const host=scene.game?.canvas?.parentElement||document.getElementById('app')||document.body;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  const header=createAppHeader({title,onBack,backLabel:'←'});
  header.classList.remove('tdr-store-header');
  header.classList.add('tdr-phaser-header');
  host.appendChild(header);
  scene._tdrAppHeader=header;
  scene.events?.once?.('shutdown',()=>{
    disposeAppWallets(header);header.remove();
    if(scene._tdrAppHeader===header)scene._tdrAppHeader=null;
  });
  return header;
}
