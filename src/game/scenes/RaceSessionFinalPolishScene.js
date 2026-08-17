import { RaceScene as CurrentRaceScene } from './RaceSessionRewardsScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';

const ATLANTIC_NAME='CIRCUITO ATLÁNTICO';
const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];

// Keep the public track name consistent anywhere the shared registry is used.
if(TRACK_REGISTRY?.['karting-tenerife']){
  TRACK_REGISTRY['karting-tenerife'].name=ATLANTIC_NAME;
  TRACK_REGISTRY['karting-tenerife'].meta={...(TRACK_REGISTRY['karting-tenerife'].meta||{}),name:ATLANTIC_NAME};
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._sessionPenaltyByLap=new Map();
    if(this.track){
      this.track.name=ATLANTIC_NAME;
      this.track.meta={...(this.track.meta||{}),name:ATLANTIC_NAME};
    }
    return result;
  }

  _applyAntiCutPenalty(){
    const before=!!this._antiCutPenaltyApplied;
    const result=super._applyAntiCutPenalty?.();
    if(!before&&this._antiCutPenaltyApplied){
      const completed=Math.max(0,(Array.isArray(this.ttHistory)?this.ttHistory.length:0)-Number(this._sessionLapBaseline||0));
      const lapNo=completed+1;
      this._sessionPenaltyByLap?.set(lapNo,(this._sessionPenaltyByLap.get(lapNo)||0)+2000);
    }
    return result;
  }

  _sessionLaps(){
    const laps=super._sessionLaps?.()||[];
    return laps.map(l=>({...l,penaltyMs:Number(this._sessionPenaltyByLap?.get(l.n)||0)}));
  }

  _reportInnerHtml(r){
    let html=super._reportInnerHtml?.(r)||'';
    for(const lap of r?.laps||[]){
      const penalty=Number(lap?.penaltyMs||0);
      if(penalty<=0)continue;
      const re=new RegExp(`(<div class="lap"><b>V${lap.n}</b><span>[^<]+</span>)<i>([^<]*)</i>`);
      html=html.replace(re,(_m,left,best)=>`${left}<i style="color:#ff8f74">${best?`${best} · `:''}+${(penalty/1000).toFixed(3)} s</i>`);
    }
    return html;
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom)return;

    const summary=getRaceLootSessionSummary?.()||{};
    const rewardedLaps=Math.max(0,Number(summary?.laps||0));
    const entries=MATERIAL_IDS.map(id=>[id,Number(summary?.totals?.[id]||0)]);
    const total=entries.reduce((s,[,n])=>s+n,0);
    const chestTier=rewardedLaps>=5?Math.floor(rewardedLaps/5)*5:0;
    const hasChest=chestTier>=5;

    if(total<=0&&!hasChest){
      if(resultRoot)resultRoot.style.display='';
      onDone?.();
      return;
    }

    if(resultRoot)resultRoot.style.display='none';
    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';

    const tierRank=Math.max(1,Math.floor(chestTier/5));
    const tierClass=tierRank>=10?'legend':tierRank>=6?'elite':tierRank>=3?'gold':tierRank>=2?'silver':'bronze';

    root.innerHTML=`
      <style>
        .tdrfp-veil{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 50% 38%,rgba(31,74,88,.32),rgba(2,5,10,.96) 65%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:6px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;pointer-events:auto;touch-action:none}
        .tdrfp-card{position:relative;width:min(96vw,760px);max-height:calc(100dvh - 12px);overflow:hidden;padding:10px 14px 10px;text-align:center;background:linear-gradient(180deg,#101d29,#071019);border:1px solid rgba(83,224,255,.43);box-shadow:0 22px 70px rgba(0,0,0,.68)}
        .tdrfp-close{position:absolute;right:8px;top:7px;width:30px;height:30px;border-radius:50%;border:1px solid #355063;background:#0b1721;color:#d9e7ef;font:900 18px/1 system-ui;display:grid;place-items:center}
        .tdrfp-k{font-size:8px;font-weight:950;letter-spacing:.18em;color:#69e5ff}.tdrfp-card h2{margin:3px 34px 0;font-size:20px}.tdrfp-sub{font-size:9px;color:#99adbb;margin:2px 0 4px}
        .tdrfp-chestwrap{height:66px;display:flex;align-items:center;justify-content:center;margin:0;cursor:pointer}.tdrfp-chest{--rim:#e5ac4e;--top:#cb872d;--base:#6c3c14;position:relative;width:66px;height:58px;filter:drop-shadow(0 9px 13px rgba(0,0,0,.42))}.tdrfp-chest.silver{--rim:#d9edf5;--top:#9eb9c7;--base:#526b77}.tdrfp-chest.gold{--rim:#ffe07b;--top:#df9d2f;--base:#895415}.tdrfp-chest.elite{--rim:#71e9ff;--top:#247f9a;--base:#104555}.tdrfp-chest.legend{--rim:#d99aff;--top:#7b3d9f;--base:#3d1c54}
        .tdrfp-chest .base{position:absolute;left:5px;right:5px;bottom:0;height:35px;border-radius:5px 5px 8px 8px;background:linear-gradient(180deg,var(--top),var(--base));border:2px solid var(--rim)}.tdrfp-chest .lid{position:absolute;left:3px;right:3px;top:7px;height:24px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,var(--rim),var(--top));border:2px solid var(--rim);transform-origin:50% 100%;transition:.35s;z-index:3}.tdrfp-chest .lock{position:absolute;left:27px;top:30px;width:14px;height:15px;border-radius:3px;background:var(--rim);border:2px solid var(--base);z-index:4}.tdrfp-chest .glow{position:absolute;left:50%;top:31px;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;box-shadow:0 0 13px 6px var(--rim),0 0 32px 14px rgba(255,220,120,.35);transition:.35s;z-index:2}.tdrfp-chest .tier{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);white-space:nowrap;font-size:7px;font-weight:950;letter-spacing:.08em;color:var(--rim)}
        .tdrfp-open .tdrfp-chest .lid{transform:translateY(-4px) rotateX(68deg)}.tdrfp-open .tdrfp-chest .glow{opacity:1;transform:translate(-50%,-50%) scale(1.25)}
        .tdrfp-tap{font-size:8px;font-weight:950;letter-spacing:.11em;color:#ffd36e;margin:4px 0 4px;min-height:10px}.tdrfp-open+.tdrfp-tap{opacity:0}
        .tdrfp-summary{display:flex;justify-content:space-between;align-items:end;margin:1px 0 4px;text-align:left}.tdrfp-summary small{font-size:7px;font-weight:950;letter-spacing:.13em;color:#7f96a7}.tdrfp-summary b{font-size:16px;color:#67efbd}
        .tdrfp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}.tdrfp-item{min-height:53px;opacity:${hasChest?0:1};transform:${hasChest?'translateY(6px) scale(.97)':'none'};display:flex;align-items:center;gap:7px;text-align:left;background:#0c1923;border:1px solid #263b49;padding:5px 7px;transition:.25s ease}.tdrfp-item.show{opacity:1;transform:none}.tdrfp-item.zero{opacity:${hasChest?0:.28}}.tdrfp-item.zero.show{opacity:.28}.tdrfp-ico{font-size:19px;line-height:1;width:22px;text-align:center}.tdrfp-copy{min-width:0;flex:1}.tdrfp-name{font-size:7px;color:#a9bac9;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrfp-q{font-size:14px;font-weight:950;margin-top:1px}.tdrfp-item.zero .tdrfp-q{color:#61717e}
        .tdrfp-meta{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin:5px 0}.tdrfp-chip{font-size:6px;font-weight:900;color:#b8c8d4;border:1px solid #29404f;background:#0b1720;padding:3px 6px}.tdrfp-next{width:100%;height:34px;border:1px solid #59dcf5;background:linear-gradient(180deg,#173b46,#0b242d);color:#fff;font:950 9px system-ui,-apple-system,sans-serif;letter-spacing:.09em;opacity:${hasChest?0:1};pointer-events:${hasChest?'none':'auto'};transition:.2s}.tdrfp-next.show{opacity:1;pointer-events:auto}
        @media(max-height:360px){.tdrfp-card{padding:7px 10px}.tdrfp-card h2{font-size:17px}.tdrfp-sub{display:none}.tdrfp-chestwrap{height:54px}.tdrfp-chest{transform:scale(.84)}.tdrfp-grid{gap:3px}.tdrfp-item{min-height:45px;padding:3px 6px}.tdrfp-meta{margin:3px 0}.tdrfp-next{height:31px}}
      </style>
      <div class="tdrfp-veil"><div class="tdrfp-card">
        <button class="tdrfp-close" data-a="close" aria-label="Cerrar">×</button>
        <div class="tdrfp-k">SESIÓN FINALIZADA</div>
        <h2>${hasChest?`COFRE DE ${chestTier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2>
        <div class="tdrfp-sub">Todo lo conseguido durante la tanda se entrega junto.</div>
        ${hasChest?`<div class="tdrfp-chestwrap" data-a="open"><div class="tdrfp-chest ${tierClass}"><div class="glow"></div><div class="base"></div><div class="lid"></div><div class="lock"></div><div class="tier">NIVEL ${chestTier}</div></div></div><div class="tdrfp-tap">TOCA PARA ABRIR</div>`:''}
        <div class="tdrfp-summary"><small>8 MATERIALES · RECOMPENSAS TOTALES</small><b>${total} PIEZAS</b></div>
        <div class="tdrfp-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdrfp-item ${n<=0?'zero':''}" data-r="${i}"><div class="tdrfp-ico">${item.icon||'◆'}</div><div class="tdrfp-copy"><div class="tdrfp-name">${item.name||id}</div><div class="tdrfp-q">×${n}</div></div></div>`;}).join('')}</div>
        <div class="tdrfp-meta"><span class="tdrfp-chip">🏁 ${rewardedLaps} VUELTAS PREMIADAS</span>${Number(summary?.bonusLaps||0)?`<span class="tdrfp-chip">⚡ ${Number(summary.bonusLaps)} BONUS</span>`:''}${hasChest?`<span class="tdrfp-chip">▣ COFRE ${chestTier}</span>`:''}</div>
        <button class="tdrfp-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button>
      </div></div>`;

    const openNode=root.querySelector('[data-a="open"]');
    const next=root.querySelector('[data-a="next"]');
    const close=root.querySelector('[data-a="close"]');
    let opened=!hasChest;
    const stop=e=>e.stopPropagation?.();
    for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend'])root.addEventListener(type,stop,false);

    const reveal=()=>{
      if(opened)return;
      opened=true;
      openNode?.classList?.add('tdrfp-open');
      entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),220+i*45));
      setTimeout(()=>next?.classList?.add('show'),310+entries.length*45);
    };

    const finishRewards=()=>{
      try{root.remove();}catch{}
      if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;
      this._restoreSessionRewardsInput?.();
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
    this._lockSessionRewardsInput?.(root);
  }
}
