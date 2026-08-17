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
    this.events.once('shutdown',()=>this._destroySessionRewardsUi());
    this.events.once('destroy',()=>this._destroySessionRewardsUi());
    return result;
  }

  _destroySessionRewardsUi(){
    try{this._sessionRewardsDom?.remove?.();}catch{}
    this._sessionRewardsDom=null;
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
    // The legacy Survival flow stores only one chest. The queue above is now
    // the source of truth, so prevent that old single-chest result popup.
    if(meta?.chest&&this._survivalMode)this._pendingChestMeta=null;
    return result;
  }

  _showChestOpening(meta,resultRoot=null){
    // Never open a chest while driving. RaceLootEconomyScene calls this after
    // 420 ms in normal modes; intercepting it here converts that call into a queue.
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

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom)return;

    const summary=getRaceLootSessionSummary?.()||{};
    const entries=Object.entries(summary?.totals||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1]));
    const chestCount=Math.max(Number(summary?.chests||0),this._sessionChestQueue.length);

    if(!entries.length&&chestCount<=0){
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
      return;
    }

    if(resultRoot)resultRoot.style.display='none';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    const shown=Math.min(chestCount,6);
    const chests=Array.from({length:shown},()=>'<div class="tdrsr-chest"><div class="glow"></div><div class="base"></div><div class="lid"></div><div class="lock"></div></div>').join('');
    const total=entries.reduce((s,[,n])=>s+Number(n||0),0);

    root.innerHTML=`
      <style>
        .tdrsr-veil{position:fixed;inset:0;z-index:17500;background:radial-gradient(circle at 50% 42%,rgba(31,74,88,.36),rgba(2,5,10,.94) 64%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:14px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}
        .tdrsr-card{width:min(91vw,520px);max-height:92vh;overflow:auto;padding:18px 20px 17px;text-align:center;background:linear-gradient(180deg,#101d29,#071019);border:1px solid rgba(83,224,255,.43);box-shadow:0 28px 95px rgba(0,0,0,.68)}
        .tdrsr-k{font-size:9px;font-weight:950;letter-spacing:.18em;color:#69e5ff}.tdrsr-card h2{margin:5px 0 2px;font-size:24px}.tdrsr-sub{font-size:10px;color:#99adbb;margin-bottom:12px}
        .tdrsr-chests{height:92px;display:flex;align-items:center;justify-content:center;gap:7px;margin:2px 0 5px;cursor:pointer}.tdrsr-chest{position:relative;width:61px;height:60px;filter:drop-shadow(0 12px 16px rgba(0,0,0,.38))}.tdrsr-chest .base{position:absolute;left:5px;right:5px;bottom:0;height:38px;border-radius:5px 5px 9px 9px;background:linear-gradient(180deg,#aa6f25,#6c3c14);border:2px solid #e5ac4e}.tdrsr-chest .lid{position:absolute;left:3px;right:3px;top:11px;height:25px;border-radius:11px 11px 4px 4px;background:linear-gradient(180deg,#cb872d,#824919);border:2px solid #e8b654;transform-origin:50% 100%;transition:.42s;z-index:3}.tdrsr-chest .lock{position:absolute;left:24px;top:34px;width:14px;height:15px;border-radius:3px;background:#f2c85c;border:2px solid #70420f;z-index:4}.tdrsr-chest .glow{position:absolute;left:50%;top:34px;width:11px;height:11px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff5aa;opacity:0;box-shadow:0 0 15px 7px #ffd15d,0 0 38px 17px rgba(255,186,55,.62);transition:.42s;z-index:2}
        .tdrsr-open .tdrsr-chest .lid{transform:translateY(-5px) rotateX(68deg)}.tdrsr-open .tdrsr-chest .glow{opacity:1;transform:translate(-50%,-50%) scale(1.3)}.tdrsr-more{font-size:15px;font-weight:950;color:#ffd36e}
        .tdrsr-tap{font-size:9px;font-weight:950;letter-spacing:.12em;color:#ffd36e;margin:0 0 11px;transition:.2s}.tdrsr-open+.tdrsr-tap{opacity:0}
        .tdrsr-summary{display:flex;justify-content:space-between;align-items:end;margin:4px 0 8px;text-align:left}.tdrsr-summary small{font-size:8px;font-weight:950;letter-spacing:.13em;color:#7f96a7}.tdrsr-summary b{font-size:18px;color:#67efbd}.tdrsr-grid{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(4,entries.length||1))},minmax(0,1fr));gap:7px}.tdrsr-item{opacity:${chestCount?0:1};transform:${chestCount?'translateY(10px) scale(.94)':'none'};background:#0c1923;border:1px solid #263b49;padding:9px 5px;transition:.3s ease}.tdrsr-item.show{opacity:1;transform:none}.tdrsr-ico{font-size:24px;line-height:1}.tdrsr-name{font-size:7px;color:#a9bac9;font-weight:850;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrsr-q{font-size:16px;font-weight:950;margin-top:1px}
        .tdrsr-meta{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0}.tdrsr-chip{font-size:7px;font-weight:900;color:#b8c8d4;border:1px solid #29404f;background:#0b1720;padding:4px 7px}.tdrsr-next{width:100%;height:43px;border:1px solid #59dcf5;background:linear-gradient(180deg,#173b46,#0b242d);color:#fff;font:950 10px system-ui,-apple-system,sans-serif;letter-spacing:.09em;opacity:${chestCount?0:1};pointer-events:${chestCount?'none':'auto'};transition:.25s}.tdrsr-next.show{opacity:1;pointer-events:auto}
        @media(max-width:700px){.tdrsr-card{padding:13px 15px 12px}.tdrsr-card h2{font-size:20px}.tdrsr-chests{height:72px}.tdrsr-chest{width:48px;height:48px}.tdrsr-chest .base{height:31px}.tdrsr-chest .lid{height:20px}.tdrsr-chest .lock{left:18px;top:27px}.tdrsr-grid{gap:5px}.tdrsr-item{padding:6px 3px}.tdrsr-ico{font-size:20px}}
      </style>
      <div class="tdrsr-veil"><div class="tdrsr-card">
        <div class="tdrsr-k">SESIÓN FINALIZADA</div>
        <h2>${chestCount?`${chestCount} COFRE${chestCount===1?'':'S'} ACUMULADO${chestCount===1?'':'S'}`:'BOTÍN DE LA SESIÓN'}</h2>
        <div class="tdrsr-sub">Todo lo conseguido durante la tanda se entrega junto, sin interrumpir la carrera.</div>
        ${chestCount?`<div class="tdrsr-chests" data-a="open">${chests}${chestCount>6?`<span class="tdrsr-more">+${chestCount-6}</span>`:''}</div><div class="tdrsr-tap">TOCA PARA ABRIR TODOS</div>`:''}
        <div class="tdrsr-summary"><small>RECOMPENSAS TOTALES</small><b>${total} PIEZAS</b></div>
        <div class="tdrsr-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrsr-item" data-r="${i}"><div class="tdrsr-ico">${item.icon||'◆'}</div><div class="tdrsr-name">${item.name||id}</div><div class="tdrsr-q">×${Number(n)}</div></div>`;}).join('')}</div>
        <div class="tdrsr-meta"><span class="tdrsr-chip">🏁 ${Number(summary?.laps||0)} VUELTAS PREMIADAS</span>${Number(summary?.bonusLaps||0)?`<span class="tdrsr-chip">⚡ ${Number(summary.bonusLaps)} BONUS</span>`:''}${chestCount?`<span class="tdrsr-chip">▣ ${chestCount} COFRE${chestCount===1?'':'S'}</span>`:''}</div>
        <button class="tdrsr-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button>
      </div></div>`;

    const openNode=root.querySelector('[data-a="open"]');
    const next=root.querySelector('[data-a="next"]');
    let opened=chestCount===0;
    const reveal=()=>{
      if(opened)return;
      opened=true;
      openNode?.classList?.add('tdrsr-open');
      entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),360+i*120));
      setTimeout(()=>next?.classList?.add('show'),430+entries.length*120);
    };
    openNode?.addEventListener('click',reveal,{once:true});
    openNode?.addEventListener('touchend',(e)=>{e.preventDefault();reveal();},{once:true,passive:false});
    next?.addEventListener('click',()=>{
      try{root.remove();}catch{}
      if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
      this._sessionChestQueue=[];
      this._sessionChestKeys?.clear?.();
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
    });

    document.body.appendChild(root);
    this._sessionRewardsDom=root;
  }
}
