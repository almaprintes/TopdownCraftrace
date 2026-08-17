import { RaceScene as CurrentRaceScene } from './RaceProceduralAudioScene.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._deferredChestQueue=[];
    this._deferredChestKeys=new Set();
    this._deferredChestDom=null;
    this.events.once('shutdown',()=>{
      try{this._deferredChestDom?.remove?.();}catch{}
      this._deferredChestDom=null;
      this._deferredChestQueue=[];
      this._deferredChestKeys?.clear?.();
    });
    return result;
  }

  _chestQueueKey(meta){
    const lap=Number(meta?.sessionLap||0);
    const loot=Object.entries(meta?.chestLoot||{}).sort(([a],[b])=>a.localeCompare(b));
    return `${lap}:${JSON.stringify(loot)}`;
  }

  _queueDeferredChest(meta){
    if(!meta?.chest)return;
    const key=this._chestQueueKey(meta);
    if(this._deferredChestKeys?.has(key))return;
    this._deferredChestKeys?.add(key);
    this._deferredChestQueue.push({
      ...meta,
      chestLoot:{...(meta.chestLoot||{})}
    });
  }

  _showRaceLoot(reward){
    const meta=reward?.meta;
    const result=super._showRaceLoot(reward);
    if(meta?.chest){
      this._queueDeferredChest(meta);
      // RaceLootEconomyScene used this single slot in Survival. We own the queue now,
      // so clearing it prevents the old one-chest-at-a-time result flow from firing.
      if(this._survivalMode)this._pendingChestMeta=null;
    }
    return result;
  }

  _showChestOpening(meta,resultRoot=null){
    // During the race this method used to pause the world and open immediately.
    // Keep the reward, but postpone every presentation until the session is over.
    this._queueDeferredChest(meta);
    if(resultRoot&&this._sessionReportOpen)this._flushDeferredChests(resultRoot);
  }

  _openSessionReport(){
    const result=super._openSessionReport?.();
    if(this._deferredChestQueue.length){
      this.time?.delayedCall?.(0,()=>this._flushDeferredChests(this._sessionReportModal));
    }
    return result;
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults?.();
    if(this._deferredChestQueue.length){
      setTimeout(()=>this._flushDeferredChests(this._survivalResultDom),80);
    }
    return result;
  }

  _flushDeferredChests(resultRoot=null){
    if(typeof document==='undefined'||!this._deferredChestQueue.length||this._deferredChestDom)return;

    const chests=this._deferredChestQueue.splice(0);
    this._deferredChestKeys?.clear?.();
    const totals={};
    for(const meta of chests){
      for(const [id,n] of Object.entries(meta?.chestLoot||{})){
        if(!GARAGE_ITEMS[id]||Number(n)<=0)continue;
        totals[id]=(totals[id]||0)+Number(n);
      }
    }
    const entries=Object.entries(totals);
    if(!entries.length)return;

    if(resultRoot)resultRoot.style.display='none';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    const chestCount=chests.length;
    const chestIcons=Array.from({length:Math.min(chestCount,6)},()=>'<div class="tdrbatch-chest"><div class="lid"></div><div class="base"></div><div class="lock"></div><div class="glow"></div></div>').join('');
    root.innerHTML=`
      <style>
        .tdrbatch-veil{position:fixed;inset:0;z-index:17000;background:radial-gradient(circle at 50% 42%,rgba(47,73,94,.34),rgba(2,5,10,.94) 62%);backdrop-filter:blur(9px);-webkit-backdrop-filter:blur(9px);display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}
        .tdrbatch-card{width:min(90vw,500px);padding:20px 22px 18px;text-align:center;background:linear-gradient(180deg,#12202b,#071018);border:1px solid rgba(100,232,255,.44);box-shadow:0 30px 100px rgba(0,0,0,.68),0 0 55px rgba(76,214,255,.08)}
        .tdrbatch-k{font-size:9px;font-weight:950;letter-spacing:.17em;color:#76e9ff}.tdrbatch-card h2{margin:5px 0 2px;font-size:24px}.tdrbatch-sub{font-size:10px;color:#9fb0bd;margin-bottom:13px}
        .tdrbatch-chests{height:105px;display:flex;align-items:center;justify-content:center;gap:8px;margin:2px auto 8px;cursor:pointer}.tdrbatch-chest{position:relative;width:70px;height:68px;filter:drop-shadow(0 12px 18px rgba(0,0,0,.38));transition:.42s cubic-bezier(.2,.8,.2,1)}
        .tdrbatch-chest .base{position:absolute;left:5px;right:5px;bottom:0;height:43px;border-radius:5px 5px 9px 9px;background:linear-gradient(180deg,#a86d24,#693b14);border:2px solid #e3aa4d}.tdrbatch-chest .lid{position:absolute;left:3px;right:3px;top:12px;height:28px;border-radius:11px 11px 4px 4px;background:linear-gradient(180deg,#c8842b,#7f4819);border:2px solid #e5b354;transform-origin:50% 100%;transition:.42s;z-index:3}.tdrbatch-chest .lock{position:absolute;left:27px;top:38px;width:16px;height:17px;border-radius:3px;background:#f0c55b;border:2px solid #70420f;z-index:4}.tdrbatch-chest .glow{position:absolute;left:50%;top:37px;width:12px;height:12px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff4a7;opacity:0;box-shadow:0 0 16px 7px #ffd15d,0 0 38px 18px rgba(255,186,55,.6);transition:.42s;z-index:2}
        .tdrbatch-open .tdrbatch-chest{transform:translateY(-5px)}.tdrbatch-open .tdrbatch-chest .lid{transform:translateY(-5px) rotateX(68deg)}.tdrbatch-open .tdrbatch-chest .glow{opacity:1;transform:translate(-50%,-50%) scale(1.3)}
        .tdrbatch-tap{font-size:9px;font-weight:950;letter-spacing:.12em;color:#ffd36e;margin-bottom:12px;transition:.2s}.tdrbatch-open+.tdrbatch-tap{opacity:0}
        .tdrbatch-rewards{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(4,entries.length))},minmax(0,1fr));gap:8px;margin:0 0 13px}.tdrbatch-item{opacity:0;transform:translateY(10px) scale(.94);background:#0c1923;border:1px solid #263b49;padding:9px 6px;transition:.3s ease}.tdrbatch-item.show{opacity:1;transform:none}.tdrbatch-ico{font-size:25px;line-height:1}.tdrbatch-name{font-size:7px;color:#a9bac9;font-weight:850;margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrbatch-q{font-size:16px;font-weight:950;margin-top:1px}
        .tdrbatch-continue{width:100%;height:42px;border:1px solid #58dff7;background:linear-gradient(180deg,#173b46,#0b242d);color:#fff;font:950 10px system-ui,-apple-system,sans-serif;letter-spacing:.09em;opacity:0;pointer-events:none;transition:.25s}.tdrbatch-continue.show{opacity:1;pointer-events:auto}
        @media(max-width:640px){.tdrbatch-card{width:min(92vw,470px);padding:14px 16px 13px}.tdrbatch-card h2{font-size:20px}.tdrbatch-chests{height:82px}.tdrbatch-chest{width:55px;height:55px}.tdrbatch-chest .base{height:35px}.tdrbatch-chest .lid{height:23px}.tdrbatch-chest .lock{left:21px;top:31px;width:14px;height:14px}.tdrbatch-rewards{gap:5px}.tdrbatch-item{padding:7px 4px}}
      </style>
      <div class="tdrbatch-veil"><div class="tdrbatch-card">
        <div class="tdrbatch-k">BOTÍN GUARDADO DURANTE LA CARRERA</div>
        <h2>${chestCount===1?'1 COFRE ACUMULADO':`${chestCount} COFRES ACUMULADOS`}</h2>
        <div class="tdrbatch-sub">La carrera no se interrumpe. Ahora se abren todos juntos.</div>
        <div class="tdrbatch-chests" data-a="open">${chestIcons}${chestCount>6?`<b>+${chestCount-6}</b>`:''}</div>
        <div class="tdrbatch-tap">TOCA PARA ABRIR TODOS</div>
        <div class="tdrbatch-rewards">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrbatch-item" data-r="${i}"><div class="tdrbatch-ico">${item.icon||'◆'}</div><div class="tdrbatch-name">${item.name||id}</div><div class="tdrbatch-q">×${Number(n)}</div></div>`;}).join('')}</div>
        <button class="tdrbatch-continue" data-a="continue">VER RESULTADOS</button>
      </div></div>`;

    const chestsNode=root.querySelector('[data-a="open"]');
    const btn=root.querySelector('[data-a="continue"]');
    let opened=false;
    const open=()=>{
      if(opened)return;opened=true;
      chestsNode?.classList?.add('tdrbatch-open');
      entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),380+i*150));
      setTimeout(()=>btn?.classList?.add('show'),480+entries.length*150);
    };
    chestsNode?.addEventListener('click',open,{once:true});
    chestsNode?.addEventListener('touchend',(e)=>{e.preventDefault();open();},{once:true,passive:false});
    btn?.addEventListener('click',()=>{
      try{root.remove();}catch{}
      if(this._deferredChestDom===root)this._deferredChestDom=null;
      if(resultRoot)resultRoot.style.display='';
    });

    document.body.appendChild(root);
    this._deferredChestDom=root;
  }
}
