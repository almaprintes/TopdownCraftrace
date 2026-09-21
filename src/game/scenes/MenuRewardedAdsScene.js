import { MenuScene as CurrentMenuScene } from './MenuStoreCloseFixScene.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { rewardedStatus, claimRewardedCoins } from '../store/storeEconomy.js';
import { getLanguage } from '../i18n/index.js';
import { showStoreDomConfirm, closeStoreDomConfirm } from '../ui/storeDomConfirm.js';

export class MenuScene extends CurrentMenuScene {
  _confirmStoreSpend({title='CONFIRMAR COMPRA',detail='',confirm='COMPRAR',onConfirm}={}){
    return showStoreDomConfirm({title,detail,confirm,onConfirm});
  }

  _openStoreModal(section='materials'){
    closeStoreDomConfirm();
    super._openStoreModal(section);
    const root=this._storeModal;
    if(!root?.scene)return;
    this._installStoreTextViewportClip(root);
    root.once?.('destroy',()=>closeStoreDomConfirm());
  }

  _installStoreTextViewportClip(root){
    const {width:w,height:h}=this.scale;
    const left=24,right=w-24,top=112,bottom=h-8;
    const content=root?.list?.find(child=>child?.type==='Container'&&child?.mask);
    if(!content?.list)return;
    // One viewport crop pass after movement settles. Phaser's per-Text setCrop()
    // was fighting the moving geometry mask on iOS and made labels pop/load while
    // swiping. The container mask is the single clipping authority.
    const texts=[];
    const walk=node=>{for(const child of node?.list||[]){if(child?.type==='Text')texts.push(child);if(child?.list)walk(child);}};
    walk(content);
    for(const text of texts){try{text.setCrop();text.setVisible(true);}catch{}}
    const applyVisibility=()=>{
      if(!root?.scene)return;
      for(const text of texts){
        if(!text?.scene)continue;
        const b=text.getBounds?.();
        if(!b)continue;
        text.setVisible(!(b.right<=left||b.left>=right||b.bottom<=top||b.top>=bottom));
      }
    };
    let timer=null;
    const settle=()=>{if(timer)clearTimeout(timer);timer=setTimeout(applyVisibility,90);};
    const input=this.input;
    input.on('dragstart',()=>{for(const text of texts){try{text.setVisible(true);}catch{}}});
    input.on('drag',settle);input.on('pointerup',settle);input.on('wheel',settle);
    root.once?.('destroy',()=>{if(timer)clearTimeout(timer);input.off('drag',settle);input.off('pointerup',settle);input.off('wheel',settle);});
    applyVisibility();
  }

  _storeCard(parent,p,x,y,w,h){
    super._storeCard(parent,p,x,y,w,h);
    if(p?.type!=='reward')return;

    const card=parent?.list?.[parent.list.length-1];
    if(!card?.list)return;
    const hit=[...card.list].reverse().find(child=>child?.type==='Rectangle'&&child?.input&&Number(child.y)>h*.55);
    if(!hit)return;

    try{hit.removeAllListeners('pointerdown');}catch{}
    let busy=false;
    hit.on('pointerdown',async()=>{
      if(busy)return;
      const status=rewardedStatus();
      if(!status.available){
        this._openStoreModal?.('rewards');
        return;
      }
      busy=true;
      try{
        const ad=await showRewardedAd(this,{
          title:getLanguage()==='en'?'REWARDED VIDEO':'VÍDEO RECOMPENSADO',
          placement:'store_rewarded_coins',
          claimId:`store-coins-${Date.now()}`
        });
        if(!ad?.completed||!ad?.verified){
          this._toastStore?.(getLanguage()==='en'?'VIDEO NOT COMPLETED':'VÍDEO NO COMPLETADO',false);
          return;
        }
        const result=claimRewardedCoins(100);
        const coins=getLanguage()==='en'?'COINS':'MONEDAS';
        this._toastStore?.(result.ok?`+100 ${coins}`:result.reason,result.ok);
        this._openStoreModal?.('rewards');
      }finally{
        busy=false;
      }
    });
  }
}
