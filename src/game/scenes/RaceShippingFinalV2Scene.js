import { RaceScene as CurrentRaceScene } from './RaceHandbrakeFrontAxleFixScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

const BASE=import.meta.env.BASE_URL||'/';

export class RaceScene extends CurrentRaceScene {
  _closePauseMenu(resume=true,...rest){
    const result=super._closePauseMenu?.(resume,...rest);
    if(resume!==false){
      try{
        const b=this._pauseButton;
        if(b?.isConnected){b.style.removeProperty('display');b.style.display='grid';b.style.pointerEvents='auto';}
      }catch{}
    }
    return result;
  }

  _showChestOpening(meta,resultRoot=null){
    // Never interrupt a live run with a legacy chest presenter.
    try{this._queueSessionChest?.(meta);}catch{}
    if(resultRoot&&this._sessionFinalizing)this._showSessionRewards(resultRoot);
  }

  _showSessionRewards(resultRoot=null,onDone=null){
    if(typeof document==='undefined'||this._sessionRewardsDom?.isConnected)return;
    const s=getRaceLootSessionSummary?.()||{};
    const laps=Math.max(0,Number(s.laps)||0);
    const entries=Object.entries(s.totals||{}).filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
    const total=entries.reduce((sum,[,n])=>sum+Number(n||0),0);
    const tier=laps>=5?Math.floor(laps/5)*5:0;
    const tone=tier>=20?'gold':tier>=15?'purple':tier>=10?'green':'blue';
    if(!entries.length&&!tier){if(resultRoot)resultRoot.style.display='';onDone?.();return;}
    if(resultRoot)resultRoot.style.display='none';

    const root=document.createElement('div');
    root.dataset.tdrRaceUi='1';
    root.innerHTML=`<style>
.tdr-final2{position:fixed;inset:0;z-index:2147483600;background:rgba(2,6,11,.96);display:grid;place-items:center;padding:12px;color:#fff;font-family:system-ui,-apple-system,"Segoe UI",sans-serif}.tdr-final2 *{box-sizing:border-box}.tdr-final2-card{position:relative;width:min(94vw,900px);max-height:94vh;overflow:auto;border:1px solid #2d7189;background:#081621;padding:14px 20px;text-align:center}.tdr-final2-close{position:absolute;right:10px;top:8px;width:38px;height:38px;border-radius:50%;border:1px solid #486273;background:#0c1a25;color:#fff;font-size:21px;font-weight:900}.tdr-final2-k{font-size:9px;letter-spacing:.2em;font-weight:1000;color:#61e6ff}.tdr-final2 h2{font-size:25px;margin:5px 45px 1px}.tdr-final2-sub{font-size:10px;color:#93a8b8}.tdr-final2-pass{position:relative;width:150px;height:192px;margin:10px auto 2px;background:url("${BASE}assets/season/reward_cards/free_${tone}.svg") center/100% 100% no-repeat;filter:drop-shadow(0 16px 20px rgba(0,0,0,.55));cursor:pointer;transition:.25s}.tdr-final2-pass .free{position:absolute;top:9%;left:0;right:0;font-size:9px;font-weight:1000}.tdr-final2-pass .mark{position:absolute;left:50%;top:49%;transform:translate(-50%,-50%);font-size:48px;filter:drop-shadow(0 8px 8px #000)}.tdr-final2-pass .lvl{position:absolute;left:10%;right:10%;bottom:9%;font-size:8px;font-weight:1000;letter-spacing:.08em}.tdr-final2-pass.open{transform:scale(1.06);filter:drop-shadow(0 0 18px rgba(255,221,102,.5))}.tdr-final2-tap{font-size:9px;color:#ffd468;font-weight:950;letter-spacing:.12em}.tdr-final2-tap.hide{visibility:hidden}.tdr-final2-head{display:flex;justify-content:space-between;align-items:end;margin:8px 0}.tdr-final2-head small{font-size:8px;letter-spacing:.15em;color:#91a7b6;font-weight:950}.tdr-final2-head strong{font-size:20px;color:#62edbd}.tdr-final2-grid{display:grid;grid-template-columns:repeat(${Math.max(1,Math.min(4,entries.length||1))},1fr);gap:7px}.tdr-final2-item{background:#0d1d29;border:1px solid #294050;padding:8px 5px;opacity:${tier?0:1};transform:${tier?'translateY(8px)':'none'};transition:.25s}.tdr-final2-item.show{opacity:1;transform:none}.tdr-final2-icon{font-size:23px}.tdr-final2-name{font-size:7px;color:#aabac6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdr-final2-qty{font-size:15px;font-weight:1000}.tdr-final2-meta{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:9px 0}.tdr-final2-chip{font-size:7px;border:1px solid #294050;padding:4px 7px;color:#bdcbd5}.tdr-final2-next{width:100%;height:42px;border:1px solid #5adff7;background:#123743;color:#fff;font-size:10px;font-weight:1000;letter-spacing:.08em;opacity:${tier?0:1};pointer-events:${tier?'none':'auto'}.tdr-final2-next.show{opacity:1;pointer-events:auto}@media(max-height:560px){.tdr-final2-card{padding:8px 14px}.tdr-final2-pass{width:105px;height:134px;margin:4px auto}.tdr-final2 h2{font-size:20px}.tdr-final2-item{padding:5px 3px}}
</style><div class="tdr-final2"><section class="tdr-final2-card"><button class="tdr-final2-close" data-a="close">×</button><div class="tdr-final2-k">SESIÓN FINALIZADA</div><h2>${tier?`COFRE DE ${tier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2><div class="tdr-final2-sub">Recompensa de tanda con el mismo diseño del Pase de Temporada.</div>${tier?`<div class="tdr-final2-pass" data-a="open"><span class="free">FREE</span><span class="mark">◆</span><span class="lvl">COFRE ${tier}</span></div><div class="tdr-final2-tap">TOCA PARA ABRIR</div>`:''}<div class="tdr-final2-head"><small>RECOMPENSAS TOTALES</small><strong>${total} PIEZAS</strong></div><div class="tdr-final2-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return `<div class="tdr-final2-item" data-r="${i}"><div class="tdr-final2-icon">${item.icon||'◆'}</div><div class="tdr-final2-name">${item.name||id}</div><div class="tdr-final2-qty">×${Number(n)}</div></div>`;}).join('')}</div><div class="tdr-final2-meta"><span class="tdr-final2-chip">🏁 ${laps} VUELTAS PREMIADAS</span>${Number(s.bonusLaps||0)?`<span class="tdr-final2-chip">⚡ ${Number(s.bonusLaps)} BONUS</span>`:''}${tier?`<span class="tdr-final2-chip">▣ COFRE ${tier}</span>`:''}</div><button class="tdr-final2-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button></section></div>`;

    const open=root.querySelector('[data-a="open"]'),tap=root.querySelector('.tdr-final2-tap'),next=root.querySelector('[data-a="next"]'),close=root.querySelector('[data-a="close"]');
    let opened=!tier;
    const reveal=()=>{if(opened)return;opened=true;open?.classList.add('open');tap?.classList.add('hide');entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList.add('show'),220+i*90));setTimeout(()=>next?.classList.add('show'),300+entries.length*90);};
    const finish=()=>{try{root.remove();}catch{}if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;try{this._restoreSessionRewardsInput?.();}catch{}if(resultRoot)resultRoot.style.display='';onDone?.();};
    open?.addEventListener('click',reveal,{once:true});
    open?.addEventListener('touchend',e=>{e.preventDefault();reveal();},{once:true,passive:false});
    next?.addEventListener('click',finish);close?.addEventListener('click',finish);
    document.body.appendChild(root);this._sessionRewardsDom=root;try{this._lockSessionRewardsInput?.(root);}catch{}
  }
}
