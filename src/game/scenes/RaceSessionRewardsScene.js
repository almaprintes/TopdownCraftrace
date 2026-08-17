import { RaceScene as CurrentRaceScene } from './RaceLootEconomyScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._sessionChestQueue=[];
    this._sessionChestKeys=new Set();
    this._sessionRewardsDom=null;
    this._sessionFinalizing=false;
    this._sessionRewardsInputState=null;
    this.events.once('shutdown',()=>this._destroySessionRewardsUi());
    this.events.once('destroy',()=>this._destroySessionRewardsUi());
    return result;
  }

  _destroySessionRewardsUi(){
    try{this._sessionRewardsDom?.remove?.();}catch{}
    this._sessionRewardsDom=null;
    this._restoreSessionRewardsInput();
    this._sessionChestQueue=[];
    this._sessionChestKeys?.clear?.();
  }

  _chestKey(meta){
    const lap=Number(meta?.sessionLap||0);
    const loot=Object.entries(meta?.chestLoot||{}).sort(([a],[b])=>a.localeCompare(b));
    return `${lap}:${JSON.stringify(loot)}`;
  }

  _queueSessionChest(meta){
    if(!meta?.chest)return;
    const key=this._chestKey(meta);
    if(this._sessionChestKeys?.has(key))return;
    this._sessionChestKeys?.add(key);
    this._sessionChestQueue.push({...meta,chestLoot:{...(meta.chestLoot||{})}});
  }

  _showRaceLoot(reward){
    const meta=reward?.meta;
    if(meta?.chest)this._queueSessionChest(meta);
    const result=super._showRaceLoot(reward);
    if(meta?.chest&&this._survivalMode)this._pendingChestMeta=null;
    return result;
  }

  _showChestOpening(meta,resultRoot=null){
    this._queueSessionChest(meta);
    if(resultRoot&&this._sessionFinalizing)this._showSessionRewards(resultRoot);
  }

  _openPauseMenu(){
    const result=super._openPauseMenu?.();
    const root=this._pauseModal;
    if(!root)return result;

    const oldFinish=root.querySelector?.('[data-a="report"]');
    if(oldFinish){
      const finish=oldFinish.cloneNode(true);
      finish.textContent='FINALIZAR SESIÓN';
      oldFinish.replaceWith(finish);
      finish.addEventListener('click',()=>{
        this._closePauseMenu?.(false);
        this._finishSessionWithRewards();
      });
    }

    const oldMenu=root.querySelector?.('[data-a="menu"]');
    if(oldMenu){
      const menu=oldMenu.cloneNode(true);
      menu.textContent='ABANDONAR SESIÓN';
      oldMenu.replaceWith(menu);
      menu.addEventListener('click',()=>{
        this._closePauseMenu?.(false);
        if(this._testMode&&this._returnSceneKey)this.scene.start(this._returnSceneKey,this._returnSceneData||{});
        else this.scene.start('menu');
      });
    }
    return result;
  }

  _finishSessionWithRewards(){
    if(this._sessionFinalizing)return;
    this._sessionFinalizing=true;
    try{this.physics?.world?.pause?.();}catch{}
    if(this._pauseButton)this._pauseButton.style.display='none';
    this._showSessionRewards(null,()=>this._openFinalSessionReport());
  }

  _openFinalSessionReport(){
    this._openSessionReport?.();
    const modal=this._sessionReportModal;
    if(!modal)return;
    const continueBtn=modal.querySelector?.('[data-a="continue"]');
    if(continueBtn)continueBtn.style.display='none';
    const actions=modal.querySelector?.('.actions');
    if(actions)actions.style.gridTemplateColumns='1fr 1fr';
    if(this._pauseButton)this._pauseButton.style.display='none';
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults?.();
    this._sessionFinalizing=true;
    if(this._pendingChestMeta){
      this._queueSessionChest(this._pendingChestMeta);
      this._pendingChestMeta=null;
    }
    setTimeout(()=>this._showSessionRewards(this._survivalResultDom),90);
    return result;
  }

  _lockSessionRewardsInput(root){
    if(this._sessionRewardsInputState)return;
    const canvas=this.game?.canvas||null;
    const state={
      inputEnabled:this.input?.enabled,
      canvas,
      canvasPointerEvents:canvas?.style?.pointerEvents||'',
      hiddenDom:[]
    };
    try{if(this.input)this.input.enabled=false;}catch{}
    try{if(canvas?.style)canvas.style.pointerEvents='none';}catch{}
    try{
      for(const el of document.querySelectorAll('[data-tdr-race-ui="1"]')){
        if(el===root||root?.contains?.(el))continue;
        state.hiddenDom.push([el,el.style.display]);
        el.style.display='none';
      }
    }catch{}
    this._sessionRewardsInputState=state;
  }

  _restoreSessionRewardsInput(){
    const state=this._sessionRewardsInputState;
    if(!state)return;
    try{if(this.input)this.input.enabled=state.inputEnabled!==false;}catch{}
    try{if(state.canvas?.style)state.canvas.style.pointerEvents=state.canvasPointerEvents;}catch{}
    try{for(const [el,display] of state.hiddenDom||[])if(el?.style)el.style.display=display;}catch{}
    this._sessionRewardsInputState=null;
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom)return;

    const summary=getRaceLootSessionSummary?.()||{};
    const rewardedLaps=Math.max(0,Number(summary?.laps||0));
    const entries=Object.entries(summary?.totals||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1]));

    const chestTier=rewardedLaps>=5?Math.floor(rewardedLaps/5)*5:0;
    const hasChest=chestTier>=5;

    if(!entries.length&&!hasChest){
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
      return;
    }

    if(resultRoot)resultRoot.style.display='none';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';

    const total=entries.reduce((s,[,n])=>s+Number(n||0),0);
    const tierRank=Math.max(1,Math.floor(chestTier/5));
    const tierClass=tierRank>=10?'legend':tierRank>=6?'elite':tierRank>=3?'gold':tierRank>=2?'silver':'bronze';

    root.innerHTML=`
      <style>
        .tdrsr-veil{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 50% 42%,rgba(31,74,88,.36),rgba(2,5,10,.96) 64%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;pointer-events:auto;touch-action:none;overscroll-behavior:none}
        .tdrsr-card{position:relative;width:min(91vw,520px);max-height:92vh;overflow:auto;padding:18px 20px 17px;text-align:center;background:linear-gradient(180deg,#101d29,#071019);border:1px solid rgba(83,224,255,.43);box-shadow:0 28px 95px rgba(0,0,0,.68);touch-action:pan-y}
        .tdrsr-close{position:absolute;right:9px;top:8px;width:34px;height:34px;border-radius:50%;border:1px solid #355063;background:#0b1721;color:#d9e7ef;font:900 19px/1 system-ui;display:grid;place-items:center;z-index:2}
        .tdrsr-k{font-size:9px;font-weight:950;letter-spacing:.18em;color:#69e5ff}.tdrsr-card h2{margin:5px 38px 2px;font-size:24px}.tdrsr-sub{font-size:10px;color:#99adbb;margin-bottom:10px}
        .tdrsr-chests{height:112px;display:flex;align-items:center;justify-content:center;margin:0 0 2px;cursor:pointer}.tdrsr-chest{--rim:#e5ac4e;--top:#cb872d;--base:#6c3c14;position:relative;width:108px;height:96px;filter:drop-shadow(0 14px 20px rgba(0,0,0,.42));transform:scale(1);transition:.42s}.tdrsr-chest.silver{--rim:#d9edf5;--top:#9eb9c7;--base:#526b77}.tdrsr-chest.gold{--rim:#ffe07b;--top:#df9d2f;--base:#895415}.tdrsr-chest.elite{--rim:#71e9ff;--top:#247f9a;--base:#104555}.tdrsr-chest.legend{--rim:#d99aff;--top:#7b3d9f;--base:#3d1c54}
        .tdrsr-chest .base{position:absolute;left:8px;right:8px;bottom:0;height:58px;border-radius:8px 8px 13px 13px;background:linear-gradient(180deg,var(--top),var(--base));border:3px solid var(--rim)}.tdrsr-chest .lid{position:absolute;left:5px;right:5px;top:13px;height:39px;border-radius:17px 17px 6px 6px;background:linear-gradient(180deg,var(--rim),var(--top));border:3px solid var(--rim);transform-origin:50% 100%;transition:.42s;z-index:3}.tdrsr-chest .lock{position:absolute;left:43px;top:50px;width:24px;height:25px;border-radius:4px;background:var(--rim);border:3px solid var(--base);z-index:4}.tdrsr-chest .glow{position:absolute;left:50%;top:52px;width:16px;height:16px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;box-shadow:0 0 18px 8px var(--rim),0 0 52px 23px color-mix(in srgb,var(--rim) 62%,transparent);transition:.42s;z-index:2}
        .tdrsr-chest .tier{position:absolute;left:50%;bottom:-19px;transform:translateX(-50%);white-space:nowrap;font-size:9px;font-weight:950;letter-spacing:.10em;color:var(--rim)}
        .tdrsr-open .tdrsr-chest .lid{transform:translateY(-7px) rotateX(68deg)}.tdrsr-open .tdrsr-chest .glow{opacity:1;transform:translate(-50%,-50%) scale(1.45)}
        .tdrsr-tap{font-size:9px;font-weight:950;letter-spacing:.12em;color:#ffd36e;margin:10px 0 11px;transition:.2s}.tdrsr-open+.tdrsr-tap{opacity:0}
        .tdrsr-summary{display:flex;justify-content:space-between;align-items:end;margin:4px 0 8px;text-align:left}.tdrsr-summary small{font-size:8px;font-weight:950;letter-spacing:.13em;color:#7f96a7}.tdrsr-summary b{font-size:18px;color:#67efbd}.tdrsr-grid{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(4,entries.length||1))},minmax(0,1fr));gap:7px}.tdrsr-item{opacity:${hasChest?0:1};transform:${hasChest?'translateY(10px) scale(.94)':'none'};background:#0c1923;border:1px solid #263b49;padding:9px 5px;transition:.3s ease}.tdrsr-item.show{opacity:1;transform:none}.tdrsr-ico{font-size:24px;line-height:1}.tdrsr-name{font-size:7px;color:#a9bac9;font-weight:850;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrsr-q{font-size:16px;font-weight:950;margin-top:1px}
        .tdrsr-meta{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0}.tdrsr-chip{font-size:7px;font-weight:900;color:#b8c8d4;border:1px solid #29404f;background:#0b1720;padding:4px 7px}.tdrsr-next{width:100%;height:43px;border:1px solid #59dcf5;background:linear-gradient(180deg,#173b46,#0b242d);color:#fff;font:950 10px system-ui,-apple-system,sans-serif;letter-spacing:.09em;opacity:${hasChest?0:1};pointer-events:${hasChest?'none':'auto'};transition:.25s}.tdrsr-next.show{opacity:1;pointer-events:auto}
        @media(max-width:700px){.tdrsr-card{padding:12px 14px 11px}.tdrsr-card h2{font-size:20px}.tdrsr-chests{height:88px}.tdrsr-chest{width:82px;height:73px}.tdrsr-chest .base{height:45px}.tdrsr-chest .lid{height:30px}.tdrsr-chest .lock{left:32px;top:39px;width:19px;height:20px}.tdrsr-chest .tier{bottom:-16px}.tdrsr-grid{gap:5px}.tdrsr-item{padding:6px 3px}.tdrsr-ico{font-size:20px}}
      </style>
      <div class="tdrsr-veil" data-a="veil"><div class="tdrsr-card">
        <button class="tdrsr-close" data-a="close" aria-label="Cerrar">×</button>
        <div class="tdrsr-k">SESIÓN FINALIZADA</div>
        <h2>${hasChest?`COFRE DE ${chestTier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2>
        <div class="tdrsr-sub">Todo lo conseguido durante la tanda se entrega junto, sin interrumpir la carrera.</div>
        ${hasChest?`<div class="tdrsr-chests" data-a="open"><div class="tdrsr-chest ${tierClass}"><div class="glow"></div><div class="base"></div><div class="lid"></div><div class="lock"></div><div class="tier">NIVEL ${chestTier}</div></div></div><div class="tdrsr-tap">TOCA PARA ABRIR</div>`:''}
        <div class="tdrsr-summary"><small>RECOMPENSAS TOTALES</small><b>${total} PIEZAS</b></div>
        <div class="tdrsr-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrsr-item" data-r="${i}"><div class="tdrsr-ico">${item.icon||'◆'}</div><div class="tdrsr-name">${item.name||id}</div><div class="tdrsr-q">×${Number(n)}</div></div>`;}).join('')}</div>
        <div class="tdrsr-meta"><span class="tdrsr-chip">🏁 ${rewardedLaps} VUELTAS PREMIADAS</span>${Number(summary?.bonusLaps||0)?`<span class="tdrsr-chip">⚡ ${Number(summary.bonusLaps)} BONUS</span>`:''}${hasChest?`<span class="tdrsr-chip">▣ COFRE ${chestTier} VUELTAS</span>`:''}</div>
        <button class="tdrsr-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button>
      </div></div>`;

    const openNode=root.querySelector('[data-a="open"]');
    const next=root.querySelector('[data-a="next"]');
    const close=root.querySelector('[data-a="close"]');
    let opened=!hasChest;

    const stop=(e)=>{e.stopPropagation?.();};
    for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend']){
      root.addEventListener(type,stop,false);
    }

    const reveal=()=>{
      if(opened)return;
      opened=true;
      openNode?.classList?.add('tdrsr-open');
      entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),360+i*120));
      setTimeout(()=>next?.classList?.add('show'),430+entries.length*120);
    };

    const finishRewards=()=>{
      try{root.remove();}catch{}
      if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
      this._restoreSessionRewardsInput();
      this._sessionChestQueue=[];
      this._sessionChestKeys?.clear?.();
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
    };

    openNode?.addEventListener('click',reveal,{once:true});
    openNode?.addEventListener('touchend',(e)=>{e.preventDefault();reveal();},{once:true,passive:false});
    next?.addEventListener('click',finishRewards);
    close?.addEventListener('click',finishRewards);

    document.body.appendChild(root);
    this._sessionRewardsDom=root;
    this._lockSessionRewardsInput(root);
  }
}
