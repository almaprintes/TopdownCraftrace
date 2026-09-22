import { MenuScene as CurrentMenuScene } from './MenuStoreCloseFixScene.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { rewardedStatus, claimRewardedCoins } from '../store/storeEconomy.js';
import { getLanguage } from '../i18n/index.js';
import { showStoreDomConfirm, closeStoreDomConfirm } from '../ui/storeDomConfirm.js';

export class MenuScene extends CurrentMenuScene {
  _confirmStoreSpend(options={}){
    // Keep purchase confirmation inside Phaser. On iPhone/iOS, handing the
    // active gesture from the Phaser canvas to a fixed DOM overlay and then
    // removing that overlay on Cancel can leave the store input path inert.
    // The inherited Phaser confirmation never leaves the game input system.
    closeStoreDomConfirm();
    return super._confirmStoreSpend(options);
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
    const texts=[];
    const walk=node=>{
      for(const child of node?.list||[]){
        if(child?.type==='Text')texts.push(child);
        if(child?.list)walk(child);
      }
    };
    walk(content);
    const apply=()=>{
      if(!root?.scene)return;
      for(const text of texts){
        if(!text?.scene)continue;
        // Recalculate from the uncropped text every time. Otherwise a previous
        // horizontal crop becomes the next getBounds() input while dragging and
        // text can leak past the store viewport on iOS/WebGL.
        try{text.setCrop();}catch{}
        const b=text.getBounds?.();
        if(!b||!Number.isFinite(b.left)||!Number.isFinite(b.right))continue;
        const vl=Math.max(left,b.left),vr=Math.min(right,b.right),vt=Math.max(top,b.top),vb=Math.min(bottom,b.bottom);
        if(vr<=vl||vb<=vt){text.setVisible(false);continue;}
        text.setVisible(true);
        const sx=b.width>0?(text.width||b.width)/b.width:1,sy=b.height>0?(text.height||b.height)/b.height:1;
        const cropX=Math.max(0,(vl-b.left)*sx),cropY=Math.max(0,(vt-b.top)*sy);
        const cropW=Math.max(0,(vr-vl)*sx),cropH=Math.max(0,(vb-vt)*sy);
        text.setCrop(cropX,cropY,cropW,cropH);
      }
    };
    let queued=false;
    const schedule=()=>{
      if(queued||!root?.scene)return;
      queued=true;
      requestAnimationFrame(()=>{queued=false;apply();});
    };
    const input=this.input;
    input.on('drag',schedule);
    input.on('pointerup',schedule);
    input.on('wheel',schedule);
    root.once?.('destroy',()=>{
      input.off('drag',schedule);
      input.off('pointerup',schedule);
      input.off('wheel',schedule);
      for(const text of texts){try{text.setCrop();text.setVisible(true);}catch{}}
    });
    apply();
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

// DEV 1.1.132 validation trigger: store purchase confirmation remains in Phaser on iOS.
