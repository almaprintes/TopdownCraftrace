import { RaceScene as CurrentRaceScene } from './RacePauseButtonRestoreFixScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

const BASE=import.meta.env.BASE_URL||'/';

// Last shipping wrapper. Keep final-session presentation here so lower legacy
// reward presenters cannot leak back into iOS/Android builds.
export class RaceScene extends CurrentRaceScene {
  _showChestOpening(meta,resultRoot=null){
    // Chests are earned during the run, but never interrupt live driving. Queue
    // them if the lower session-reward layer exists and present everything only
    // when the session ends.
    try{this._queueSessionChest?.(meta);}catch{}
    if(resultRoot&&this._sessionFinalizing)this._showSessionRewards(resultRoot);
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom?.isConnected)return;

    const summary=getRaceLootSessionSummary?.()||{};
    const rewardedLaps=Math.max(0,Number(summary.laps)||0);
    const entries=Object.entries(summary.totals||{})
      .filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0)
      .sort((a,b)=>Number(b[1])-Number(a[1]));
    const total=entries.reduce((s,[,n])=>s+Number(n||0),0);
    const chestTier=rewardedLaps>=5?Math.floor(rewardedLaps/5)*5:0;
    const hasChest=chestTier>=5;

    if(!entries.length&&!hasChest){
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
      return;
    }

    if(resultRoot)resultRoot.style.display='none';
    const tone=chestTier>=20?'gold':chestTier>=15?'purple':chestTier>=10?'green':'blue';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    root.className='tdr-final-rewards';

    const mini=entries.slice(0,4).map(([id,n])=>{
      const item=GARAGE_ITEMS[id]||{};
      return `<span class="tdrfr-mini"><b>${item.icon||'◆'}</b><em>×${Number(n)}</em></span>`;
    }).join('');

    root.innerHTML=`<style>
.tdrfr-veil{position:fixed;inset:0;z-index:2147483600;background:radial-gradient(circle at 50% 42%,rgba(27,66,82,.38),rgba(2,5,10,.97) 66%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:14px;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:auto;touch-action:none;overscroll-behavior:none}.tdrfr-panel{position:relative;width:min(92vw,760px);max-height:92vh;overflow:auto;background:linear-gradient(180deg,#0d1b27,#061018);border:1px solid rgba(73,213,245,.55);box-shadow:0 30px 100px rgba(0,0,0,.7);padding:18px 22px;text-align:center}.tdrfr-close{position:absolute;right:10px;top:9px;width:36px;height:36px;border-radius:50%;border:1px solid #3a5364;background:#0a1720;color:#dceaf2;font:900 20px/1 system-ui;display:grid;place-items:center}.tdrfr-k{font-size:9px;font-weight:1000;letter-spacing:.22em;color:#67e8ff}.tdrfr-panel h2{margin:6px 42px 2px;font-size:25px}.tdrfr-sub{font-size:10px;color:#98adbc;margin-bottom:8px}.tdrfr-pass-wrap{height:210px;display:flex;align-items:center;justify-content:center}.tdrfr-pass{position:relative;width:146px;height:186px;background:url("${BASE}assets/season/reward_cards/free_${tone}.svg") center/100% 100% no-repeat;filter:drop-shadow(0 16px 22px rgba(0,0,0,.58));cursor:pointer;transition:transform .28s ease,filter .28s ease}.tdrfr-free{position:absolute;top:9%;left:0;right:0;font-size:9px;font-weight:1000;letter-spacing:.08em}.tdrfr-lock{position:absolute;left:50%;top:48%;transform:translate(-50%,-50%);width:58px;height:48px;border:3px solid #fff1b8;border-radius:8px;background:linear-gradient(180deg,#d7a730,#76500e);box-shadow:0 8px 12px rgba(0,0,0,.45)}.tdrfr-lock:before{content:"";position:absolute;width:27px;height:22px;border:4px solid #fff1b8;border-bottom:0;border-radius:15px 15px 0 0;left:50%;top:-19px;transform:translateX(-50%)}.tdrfr-lock:after{content:"";position:absolute;width:9px;height:13px;border-radius:5px;background:#fff1b8;left:50%;top:16px;transform:translateX(-50%)}.tdrfr-minirow{position:absolute;left:12%;right:12%;top:34%;bottom:25%;display:none;grid-template-columns:repeat(2,1fr);gap:5px;align-content:center}.tdrfr-mini{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:42px;background:rgba(3,12,18,.72);border:1px solid rgba(255,255,255,.18)}.tdrfr-mini b{font-size:19px}.tdrfr-mini em{font-style:normal;font-size:8px;font-weight:950}.tdrfr-tier{position:absolute;left:12%;right:12%;bottom:9%;font-size:8px;font-weight:1000;letter-spacing:.08em}.tdrfr-pass.open{transform:scale(1.075);filter:drop-shadow(0 0 19px rgba(255,225,112,.55)) drop-shadow(0 18px 22px rgba(0,0,0,.55))}.tdrfr-pass.open .tdrfr-lock{display:none}.tdrfr-pass.open .tdrfr-minirow{display:grid}.tdrfr-tap{margin-top:-5px;font-size:9px;font-weight:950;letter-spacing:.13em;color:#ffd66f;transition:opacity .2s}.tdrfr-tap.hide{opacity:0}.tdrfr-head{display:flex;justify-content:space-between;align-items:end;margin:8px 0 9px;text-align:left}.tdrfr-head small{font-size:8px;font-weight:950;letter-spacing:.14em;color:#8da4b4}.tdrfr-head strong{font-size:20px;color:#64efbd}.tdrfr-grid{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(4,entries.length||1))},minmax(0,1fr));gap:7px}.tdrfr-item{opacity:${hasChest?0:1};transform:${hasChest?'translateY(10px) scale(.95)':'none'};background:#0b1822;border:1px solid #263d4c;padding:9px 5px;transition:.3s ease}.tdrfr-item.show{opacity:1;transform:none}.tdrfr-ico{font-size:24px}.tdrfr-name{font-size:7px;color:#a9bbc8;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrfr-q{font-size:16px;font-weight:1000}.tdrfr-meta{display:flex;justify-content:center;gap:6px;flex-wrap:wrap;margin:10px 0}.tdrfr-chip{font-size:7px;font-weight:900;color:#b8c8d4;border:1px solid #29404f;background:#0a1720;padding:4px 7px}.tdrfr-next{width:100%;height:43px;border:1px solid #58dff7;background:linear-gradient(180deg,#173d49,#0a242d);color:#fff;font:950 10px system-ui;letter-spacing:.09em;opacity:${hasChest?0:1};pointer-events:${hasChest?'none':'auto'};transition:.25s}.tdrfr-next.show{opacity:1;pointer-events:auto}@media(max-height:560px){.tdrfr-panel{padding:10px 16px}.tdrfr-pass-wrap{height:156px}.tdrfr-pass{width:108px;height:138px}.tdrfr-panel h2{font-size:20px}.tdrfr-grid{gap:5px}.tdrfr-item{padding:6px 3px}}
</style><div class="tdrfr-veil"><section class="tdrfr-panel"><button class="tdrfr-close" data-a="close" aria-label="Cerrar">×</button><div class="tdrfr-k">SESIÓN FINALIZADA</div><h2>${hasChest?`COFRE DE ${chestTier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2><div class="tdrfr-sub">Todo lo conseguido durante la tanda se entrega junto.</div>${hasChest?`<div class="tdrfr-pass-wrap"><div class="tdrfr-pass" data-a="open"><span class="tdrfr-free">FREE</span><span class="tdrfr-lock"></span><span class="tdrfr-minirow">${mini}</span><span class="tdrfr-tier">COFRE ${chestTier}</span></div></div><div class="tdrfr-tap">TOCA PARA ABRIR</div>`:''}<div class="tdrfr-head"><small>RECOMPENSAS TOTALES</small><strong>${total} PIEZAS</strong></div><div class="tdrfr-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrfr-item" data-r="${i}"><div class="tdrfr-ico">${item.icon||'◆'}</div><div class="tdrfr-name">${item.name||id}</div><div class="tdrfr-q">×${Number(n)}</div></div>`;}).join('')}</div><div class="tdrfr-meta"><span class="tdrfr-chip">🏁 ${rewardedLaps} VUELTAS PREMIADAS</span>${Number(summary.bonusLaps||0)?`<span class="tdrfr-chip">⚡ ${Number(summary.bonusLaps)} BONUS</span>`:''}${hasChest?`<span class="tdrfr-chip">▣ COFRE ${chestTier}</span>`:''}</div><button class="tdrfr-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button></section></div>`;

    const openNode=root.querySelector('[data-a="open"]');
    const tap=root.querySelector('.tdrfr-tap');
    const next=root.querySelector('[data-a="next"]');
    const close=root.querySelector('[data-a="close"]');
    let opened=!hasChest;
    const reveal=()=>{
      if(opened)return;
      opened=true;
      openNode?.classList.add('open');
      tap?.classList.add('hide');
      entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList.add('show'),260+i*90));
      setTimeout(()=>next?.classList.add('show'),330+entries.length*90);
    };
    const finish=()=>{
      try{root.remove();}catch{}
      if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
      try{this._restoreSessionRewardsInput?.();}catch{}
      try{this._sessionChestQueue=[];this._sessionChestKeys?.clear?.();}catch{}
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
    };

    openNode?.addEventListener('click',reveal,{once:true});
    openNode?.addEventListener('touchend',e=>{e.preventDefault();reveal();},{once:true,passive:false});
    next?.addEventListener('click',finish);
    close?.addEventListener('click',finish);

    document.body.appendChild(root);
    this._sessionRewardsDom=root;
    try{this._lockSessionRewardsInput?.(root);}catch{}
  }
}
