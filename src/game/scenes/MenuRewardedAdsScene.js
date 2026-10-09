import { MenuScene as CurrentMenuScene } from './MenuStoreCloseFixScene.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { REWARDED_PLACEMENTS, verifiedReward } from '../monetization/rewardedActions.js';
import { rewardedStatus, claimRewardedCoins, dailyStatus, claimDailyCoins } from '../store/storeEconomy.js';
import { playCoinRewardFlight, primeCoinRewardSound } from '../ui/coinRewardFlight.js';
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

  // Only the already-rendered store header animates. Economy was persisted
  // before this method runs; a hidden page or reduced-motion device stays correct.
  _animateStoreCoinBalance(previous,next){
    const root=this._storeModal;
    const from=Math.max(0,Math.floor(Number(previous)||0));
    const to=Math.max(0,Math.floor(Number(next)||0));
    if(!root?.scene||!this.tweens||to<=from||
      (typeof document!=='undefined'&&document.hidden)||
      (typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches))return;

    // Existing Phaser wallet objects, not a second DOM counter.
    const label=root.list?.find(child=>child?.type==='Text'&&
      Math.abs(Number(child.x)-(this.scale.width-150))<2&&Math.abs(Number(child.y)-29)<2);
    if(!label?.scene)return;
    const icon=root.list?.find(child=>child?.type==='Image'&&
      Math.abs(Number(child.x)-(this.scale.width-176))<2&&Math.abs(Number(child.y)-29)<2);
    const format=value=>Math.floor(Math.max(0,value)).toLocaleString(getLanguage()==='en'?'en-US':'es-ES');
    const labelScaleX=label.scaleX,labelScaleY=label.scaleY;
    const originalColor=label.style?.color||'#ffd85a';
    label.setText(format(from));
    label.setColor('#fff4be');

    const count=this.tweens.addCounter({
      from,to,duration:480,ease:'Cubic.easeOut',
      onUpdate:tween=>{
        if(root.scene&&this._storeModal===root)label.setText(format(tween.getValue()));
      },
      onComplete:()=>{
        if(root.scene&&this._storeModal===root){label.setText(format(to));label.setColor(originalColor);}
      }
    });
    const glow=this.tweens.add({
      targets:label,scaleX:labelScaleX*1.09,scaleY:labelScaleY*1.09,
      duration:185,yoyo:true,ease:'Sine.easeOut',
      onComplete:()=>{if(label.scene){label.setScale(labelScaleX,labelScaleY);label.setColor(originalColor);}}
    });
    const coinPulse=icon?.scene?this.tweens.add({
      targets:icon,scaleX:icon.scaleX*1.14,scaleY:icon.scaleY*1.14,
      duration:185,yoyo:true,ease:'Sine.easeOut'
    }):null;
    root.once('destroy',()=>{count?.stop();glow?.stop();coinPulse?.stop();});
  }

  _storeCard(parent,p,x,y,w,h){
    super._storeCard(parent,p,x,y,w,h);
    if(p?.type!=='reward'&&p?.type!=='daily')return;

    const card=parent?.list?.[parent.list.length-1];
    if(!card?.list)return;
    const hit=[...card.list].reverse().find(child=>
      child?.type==='Rectangle'&&child?.input&&Number(child.y)>h*.55);
    if(!hit)return;

    // The original card already has its own pointerup action. Remove BOTH
    // handlers before attaching ours to avoid starting two ads or grants.
    hit.removeAllListeners('pointerup');
    hit.removeAllListeners('pointerdown');
    const isVideo=p.type==='reward';
    let busy=false;
    const onClaim=async()=>{
      if(busy)return;
      const status=isVideo?rewardedStatus():dailyStatus();
      if(!status.available){this._openStoreModal?.('rewards');return;}
      busy=true;
      primeCoinRewardSound(this);
      try{
        if(isVideo){
          const ad=await showRewardedAd(this,{
            title:getLanguage()==='en'?'REWARDED VIDEO':'VÍDEO RECOMPENSADO',
            placement:REWARDED_PLACEMENTS.STORE_COINS_100,
            claimId:status.claimId
          });
          if(!verifiedReward(ad)){
            this._toastStore?.(getLanguage()==='en'?'VIDEO NOT COMPLETED':'VÍDEO NO COMPLETADO',false);
            return;
          }
        }
        // Grant and persist immediately; ONLY the visible wallet is delayed.
        // A suspended app, cancelled animation or lost WebAudio cannot lose coins.
        const result=isVideo?claimRewardedCoins(100):claimDailyCoins(250);
        if(!result.ok){this._toastStore?.(result.reason,false);return;}
        const rewardModal=this._storeModal;
        try{
          await playCoinRewardFlight(this,{
            amount:result.amount,card,width:w,height:h,english:getLanguage()==='en'
          });
        }catch(error){
          console.warn('[TDR reward] coin flight unavailable',error);
        }
        // Coins are already persisted. Update only the same visible modal,
        // never bring a dismissed/switched store screen back unexpectedly.
        if(this.scene?.isActive?.()&&rewardModal===this._storeModal&&rewardModal?.scene){
          this._openStoreModal?.('rewards');
          this._animateStoreCoinBalance(Number(result.state?.coins)-result.amount,Number(result.state?.coins));
          this._toastStore?.('+'+result.amount+' '+(getLanguage()==='en'?'COINS':'MONEDAS'),true);
        }
      }finally{
        busy=false;
      }
    };
    // Preserve the proven pointerdown ad gesture. The free daily gift uses
    // pointerup so scrolling the reward carousel cannot claim it accidentally.
    hit.on(isVideo?'pointerdown':'pointerup',onClaim);
  }
}

// DEV 1.1.132 validation trigger: store purchase confirmation remains in Phaser on iOS.
