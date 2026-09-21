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
    // Store clipping belongs to the moving content container. Do not toggle child
    // Text visibility or crop individual labels: both bypass/lag the geometry mask
    // on some WebGL/iOS frames and cause the side overflow seen while scrolling.
    const content=root?.list?.find(child=>child?.type==='Container'&&child?.mask);
    if(!content)return;
    const clearChildCrop=node=>{
      for(const child of node?.list||[]){
        if(child?.type==='Text'){try{child.setCrop();child.setVisible(true);}catch{}}
        if(child?.list)clearChildCrop(child);
      }
    };
    clearChildCrop(content);
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
