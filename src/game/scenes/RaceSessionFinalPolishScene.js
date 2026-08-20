import { RaceScene as CurrentRaceScene } from './RaceSessionRewardsScene.js';
import { getRaceLootSessionSummary } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';

const ATLANTIC_NAME='CIRCUITO ATLÁNTICO';
const MATERIAL_IDS=['scrap','alloy','rubber','compound','disc','spring','gear','ecu'];
const MATERIAL_ASSET={
  scrap:'chatarra.webp',alloy:'aleacion.webp',rubber:'goma.webp',compound:'compuesto.webp',
  disc:'disco_metalico.webp',spring:'muelle.webp',gear:'engranaje.webp',ecu:'electronica.webp'
};
const BASE=import.meta.env.BASE_URL||'/';
const matSrc=id=>`${BASE}assets/crafting/materials/${MATERIAL_ASSET[id]||''}`;
const fmtLap=ms=>{ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'—';const m=Math.floor(ms/60000),s=Math.floor((ms%60000)/1000),x=Math.floor(ms%1000);return`${m}:${String(s).padStart(2,'0')}.${String(x).padStart(3,'0')}`;};
const fmtSector=ms=>{ms=Number(ms);if(!Number.isFinite(ms)||ms<=0)return'—';const s=Math.floor(ms/1000),x=Math.floor(ms%1000);return`${s}.${String(x).padStart(3,'0')}`;};
const same=(a,b)=>Number.isFinite(Number(a))&&Number.isFinite(Number(b))&&Math.abs(Number(a)-Number(b))<.5;

if(TRACK_REGISTRY?.['karting-tenerife']){
  TRACK_REGISTRY['karting-tenerife'].name=ATLANTIC_NAME;
  TRACK_REGISTRY['karting-tenerife'].meta={...(TRACK_REGISTRY['karting-tenerife'].meta||{}),name:ATLANTIC_NAME};
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._sessionPenaltyByLap=new Map();
    if(this.track){this.track.name=ATLANTIC_NAME;this.track.meta={...(this.track.meta||{}),name:ATLANTIC_NAME};}
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
      const penalty=Number(lap?.penaltyMs||0);if(penalty<=0)continue;
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
    const chestTier=rewardedLaps>=5?Math.floor(rewardedLaps/5)*5:0,hasChest=chestTier>=5;
    if(total<=0&&!hasChest){if(resultRoot)resultRoot.style.display='';onDone?.();return;}
    if(resultRoot)resultRoot.style.display='none';
    const root=document.createElement('div');root.dataset.tdrRaceUi='1';
    const tierRank=Math.max(1,Math.floor(chestTier/5));
    const tierClass=tierRank>=10?'legend':tierRank>=6?'elite':tierRank>=3?'gold':tierRank>=2?'silver':'bronze';

    root.innerHTML=`<style>
      .tdrfp-veil{position:fixed;inset:0;z-index:2147483000;background:radial-gradient(circle at 50% 38%,rgba(31,74,88,.32),rgba(2,5,10,.96) 65%);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:6px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff;pointer-events:auto;touch-action:none}
      .tdrfp-card{position:relative;width:min(96vw,760px);max-height:calc(100dvh - 12px);overflow:hidden;padding:10px 14px;text-align:center;background:linear-gradient(180deg,#101d29,#071019);border:1px solid rgba(83,224,255,.43);box-shadow:0 22px 70px rgba(0,0,0,.68)}
      .tdrfp-close{position:absolute;right:8px;top:7px;width:30px;height:30px;border-radius:50%;border:1px solid #355063;background:#0b1721;color:#d9e7ef;font:900 18px/1 system-ui;display:grid;place-items:center}.tdrfp-k{font-size:8px;font-weight:950;letter-spacing:.18em;color:#69e5ff}.tdrfp-card h2{margin:3px 34px 0;font-size:20px}.tdrfp-sub{font-size:9px;color:#99adbb;margin:2px 0 4px}
      .tdrfp-chestwrap{height:66px;display:flex;align-items:center;justify-content:center;cursor:pointer}.tdrfp-chest{--rim:#e5ac4e;--top:#cb872d;--base:#6c3c14;position:relative;width:66px;height:58px;filter:drop-shadow(0 9px 13px rgba(0,0,0,.42))}.tdrfp-chest.silver{--rim:#d9edf5;--top:#9eb9c7;--base:#526b77}.tdrfp-chest.gold{--rim:#ffe07b;--top:#df9d2f;--base:#895415}.tdrfp-chest.elite{--rim:#71e9ff;--top:#247f9a;--base:#104555}.tdrfp-chest.legend{--rim:#d99aff;--top:#7b3d9f;--base:#3d1c54}.tdrfp-chest .base{position:absolute;left:5px;right:5px;bottom:0;height:35px;border-radius:5px 5px 8px 8px;background:linear-gradient(180deg,var(--top),var(--base));border:2px solid var(--rim)}.tdrfp-chest .lid{position:absolute;left:3px;right:3px;top:7px;height:24px;border-radius:10px 10px 4px 4px;background:linear-gradient(180deg,var(--rim),var(--top));border:2px solid var(--rim);transform-origin:50% 100%;transition:.35s;z-index:3}.tdrfp-chest .lock{position:absolute;left:27px;top:30px;width:14px;height:15px;border-radius:3px;background:var(--rim);border:2px solid var(--base);z-index:4}.tdrfp-chest .glow{position:absolute;left:50%;top:31px;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%) scale(.1);background:#fff;opacity:0;box-shadow:0 0 13px 6px var(--rim),0 0 32px 14px rgba(255,220,120,.35);transition:.35s;z-index:2}.tdrfp-chest .tier{position:absolute;left:50%;bottom:-13px;transform:translateX(-50%);font-size:7px;font-weight:950;color:var(--rim);white-space:nowrap}.tdrfp-open .tdrfp-chest .lid{transform:translateY(-4px) rotateX(68deg)}.tdrfp-open .tdrfp-chest .glow{opacity:1;transform:translate(-50%,-50%) scale(1.25)}
      .tdrfp-tap{font-size:8px;font-weight:950;letter-spacing:.11em;color:#ffd36e;margin:4px 0;min-height:10px}.tdrfp-open+.tdrfp-tap{opacity:0}.tdrfp-summary{display:flex;justify-content:space-between;align-items:end;margin:1px 0 4px;text-align:left}.tdrfp-summary small{font-size:7px;font-weight:950;letter-spacing:.13em;color:#7f96a7}.tdrfp-summary b{font-size:16px;color:#67efbd}
      .tdrfp-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.tdrfp-item{height:104px;position:relative;overflow:hidden;opacity:${hasChest?0:1};transform:${hasChest?'translateY(6px) scale(.97)':'none'};background:#0c1923;border:1px solid #263b49;transition:.25s ease}.tdrfp-item.show{opacity:1;transform:none}.tdrfp-item.zero{opacity:${hasChest?0:.24}}.tdrfp-item.zero.show{opacity:.24}.tdrfp-asset{position:absolute;inset:6px 6px 28px;display:flex;align-items:center;justify-content:center}.tdrfp-asset img{width:100%;height:100%;object-fit:contain;display:block;filter:drop-shadow(0 5px 7px rgba(0,0,0,.34))}.tdrfp-copy{position:absolute;left:4px;right:4px;bottom:4px;height:27px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(180deg,rgba(7,16,25,.05),rgba(7,16,25,.92) 36%)}.tdrfp-name{font-size:7px;color:#b6c7d4;font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tdrfp-q{font-size:14px;font-weight:950}.tdrfp-item.zero .tdrfp-q{color:#61717e}
      .tdrfp-meta{display:flex;justify-content:center;gap:5px;flex-wrap:wrap;margin:5px 0}.tdrfp-chip{font-size:6px;font-weight:900;color:#b8c8d4;border:1px solid #29404f;background:#0b1720;padding:3px 6px}.tdrfp-next{width:100%;height:34px;border:1px solid #59dcf5;background:linear-gradient(180deg,#173b46,#0b242d);color:#fff;font:950 9px system-ui;letter-spacing:.09em;opacity:${hasChest?0:1};pointer-events:${hasChest?'none':'auto'};transition:.2s}.tdrfp-next.show{opacity:1;pointer-events:auto}
      @media(max-height:390px){.tdrfp-card{padding:7px 10px}.tdrfp-card h2{font-size:17px}.tdrfp-sub{display:none}.tdrfp-chestwrap{height:52px}.tdrfp-chest{transform:scale(.82)}.tdrfp-item{height:78px}.tdrfp-asset{inset:3px 4px 22px}.tdrfp-copy{height:23px}.tdrfp-meta{margin:3px 0}.tdrfp-next{height:31px}}
    </style><div class="tdrfp-veil"><div class="tdrfp-card"><button class="tdrfp-close" data-a="close">×</button><div class="tdrfp-k">SESIÓN FINALIZADA</div><h2>${hasChest?`COFRE DE ${chestTier} VUELTAS`:'BOTÍN DE LA SESIÓN'}</h2><div class="tdrfp-sub">Todo lo conseguido durante la tanda se entrega junto.</div>${hasChest?`<div class="tdrfp-chestwrap" data-a="open"><div class="tdrfp-chest ${tierClass}"><div class="glow"></div><div class="base"></div><div class="lid"></div><div class="lock"></div><div class="tier">NIVEL ${chestTier}</div></div></div><div class="tdrfp-tap">TOCA PARA ABRIR</div>`:''}<div class="tdrfp-summary"><small>8 MATERIALES · RECOMPENSAS TOTALES</small><b>${total} PIEZAS</b></div><div class="tdrfp-grid">${entries.map(([id,n],i)=>{const item=GARAGE_ITEMS[id]||{};return`<div class="tdrfp-item ${n<=0?'zero':''}" data-r="${i}"><div class="tdrfp-asset"><img src="${matSrc(id)}" alt=""></div><div class="tdrfp-copy"><div class="tdrfp-name">${item.name||id}</div><div class="tdrfp-q">×${n}</div></div></div>`;}).join('')}</div><div class="tdrfp-meta"><span class="tdrfp-chip">🏁 ${rewardedLaps} VUELTAS PREMIADAS</span>${Number(summary?.bonusLaps||0)?`<span class="tdrfp-chip">⚡ ${Number(summary.bonusLaps)} BONUS</span>`:''}${hasChest?`<span class="tdrfp-chip">▣ COFRE ${chestTier}</span>`:''}</div><button class="tdrfp-next" data-a="next">${resultRoot?'VER RESULTADOS':'VER INFORME'}</button></div></div>`;

    const openNode=root.querySelector('[data-a="open"]'),next=root.querySelector('[data-a="next"]'),close=root.querySelector('[data-a="close"]');let opened=!hasChest;
    const stop=e=>e.stopPropagation?.();for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','touchstart','touchend'])root.addEventListener(type,stop,false);
    const reveal=()=>{if(opened)return;opened=true;openNode?.classList?.add('tdrfp-open');entries.forEach((_,i)=>setTimeout(()=>root.querySelector(`[data-r="${i}"]`)?.classList?.add('show'),220+i*45));setTimeout(()=>next?.classList?.add('show'),310+entries.length*45);};
    const finishRewards=()=>{try{root.remove();}catch{}if(this._sessionRewardsDom===root)this._sessionRewardsDom=null;this._restoreSessionRewardsInput?.();this._sessionChestQueue=[];this._sessionChestKeys?.clear?.();if(resultRoot)resultRoot.style.display='';onDone?.();};
    openNode?.addEventListener('click',reveal,{once:true});openNode?.addEventListener('touchend',e=>{e.preventDefault();reveal();},{once:true,passive:false});next?.addEventListener('click',finishRewards);close?.addEventListener('click',finishRewards);
    document.body.appendChild(root);this._sessionRewardsDom=root;this._lockSessionRewardsInput?.(root);
  }

  _showSurvivalResults(){
    const result=super._showSurvivalResults?.();
    const root=this._survivalResultDom;if(!root)return result;
    const summary=getRaceLootSessionSummary?.()||{};
    const entries=Object.entries(summary?.totals||{}).filter(([id,n])=>GARAGE_ITEMS[id]&&Number(n)>0).sort((a,b)=>Number(b[1])-Number(a[1]));
    const nodes=[...root.querySelectorAll('.tdrsurv-loot-icon')];
    nodes.forEach((node,i)=>{const id=entries[i]?.[0];if(!MATERIAL_ASSET[id])return;node.innerHTML=`<img src="${matSrc(id)}" alt="">`;});
    const style=document.createElement('style');style.textContent=`.tdrsurv-loot-item{min-height:96px!important;position:relative;overflow:hidden;padding:4px!important}.tdrsurv-loot-icon{width:100%!important;height:66px!important;display:flex!important;align-items:center!important;justify-content:center!important}.tdrsurv-loot-icon img{width:92%!important;height:92%!important;object-fit:contain!important;display:block!important;filter:drop-shadow(0 5px 7px rgba(0,0,0,.35))}.tdrsurv-loot-name{font-size:7px!important}.tdrsurv-loot-qty{font-size:14px!important}`;root.appendChild(style);
    return result;
  }

  _showSurvivalSessionInfo(resultRoot){
    if(typeof document==='undefined')return;
    const laps=(this._sessionLaps?.()||[]).filter(l=>Number.isFinite(Number(l?.lapMs))&&Number(l.lapMs)>1000);
    const times=laps.map(l=>Number(l.lapMs)),best=times.length?Math.min(...times):null,worst=times.length?Math.max(...times):null,avg=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;
    const bench=this._sectorBenchmarks?.(laps)||{session:[null,null,null],record:[null,null,null]};
    const cell=(v,i)=>`<span class="sector ${same(v,bench.record?.[i])?'purple':same(v,bench.session?.[i])?'green':''}">${fmtSector(v)}</span>`;
    const rows=laps.length?`<div class="tdrsi-f1"><div class="tdrsi-head"><b>VUELTA</b><b>S1</b><b>S2</b><b>S3</b><b>TOTAL</b><b></b></div>${laps.map(l=>{const s=Array.isArray(l.sectors)?l.sectors:[null,null,null],isBest=Number(l.lapMs)===best;return`<div class="tdrsi-row${isBest?' best':''}"><b>V${l.n}</b>${cell(s[0],0)}${cell(s[1],1)}${cell(s[2],2)}<strong>${fmtLap(l.lapMs)}</strong><i>${isBest?'MEJOR':''}</i></div>`;}).join('')}</div><div class="tdrsi-legend"><span><u class="green"></u>MEJOR SESIÓN</span><span><u class="purple"></u>RÉCORD SECTOR</span></div>`:'<div class="tdrsi-empty">No hay vueltas cronometradas.</div>';
    const trackName=String(this.track?.meta?.name||this.track?.name||this.trackId||this.trackKey||'Circuito');
    const car=GARAGE_ITEMS?.[this.carId]||{};
    const overlay=document.createElement('div');overlay.dataset.tdrRaceUi='1';
    overlay.innerHTML=`<style>
      .tdrsi-veil{position:fixed;inset:0;z-index:14500;background:rgba(2,6,12,.90);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:8px;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#fff}.tdrsi-card{width:min(94vw,720px);max-height:calc(100dvh - 16px);overflow:auto;background:linear-gradient(180deg,#0d1b28,#071019);border:1px solid #3678ad;clip-path:polygon(16px 0,100% 0,100% calc(100% - 16px),calc(100% - 16px) 100%,0 100%,0 16px);padding:14px 18px;box-shadow:0 25px 90px rgba(0,0,0,.62)}.tdrsi-kicker{font-size:9px;font-weight:900;letter-spacing:.16em;color:#69c8ff}.tdrsi-card h2{margin:3px 0 1px;font-size:22px}.tdrsi-sub{color:#9aabc0;font-size:10px;margin-bottom:10px}.tdrsi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.tdrsi-stat{background:#101c29;border:1px solid #23364b;padding:7px;text-align:center}.tdrsi-stat small{display:block;color:#8193a8;font-size:7px;font-weight:900;letter-spacing:.1em;margin-bottom:3px}.tdrsi-stat b{font-size:13px}.tdrsi-card h3{font-size:9px;letter-spacing:.13em;color:#8fa1b6;margin:11px 0 5px}.tdrsi-f1{border:1px solid #1e2b3d;background:#0b1320;font-variant-numeric:tabular-nums}.tdrsi-head,.tdrsi-row{display:grid;grid-template-columns:48px repeat(3,minmax(54px,.8fr)) minmax(84px,1.1fr) 62px;align-items:center;gap:4px;padding:0 8px}.tdrsi-head{height:25px;background:#121e2d;color:#79899f;font-size:7px}.tdrsi-head b:not(:first-child){text-align:right}.tdrsi-row{min-height:32px;border-top:1px solid #172334;font-size:10px}.tdrsi-row .sector,.tdrsi-row strong{text-align:right;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800}.tdrsi-row strong{font-size:11px}.tdrsi-row .green{color:#42ee9b}.tdrsi-row .purple{color:#d363ff}.tdrsi-row i{text-align:right;color:#62ffb2;font-size:7px;font-style:normal;font-weight:900}.tdrsi-row.best{background:rgba(72,220,180,.035)}.tdrsi-legend{display:flex;gap:12px;justify-content:flex-end;font-size:7px;color:#7f8da2;padding:5px 0}.tdrsi-legend span{display:flex;align-items:center;gap:4px}.tdrsi-legend u{width:7px;height:7px}.tdrsi-legend .green{background:#42ee9b}.tdrsi-legend .purple{background:#d363ff}.tdrsi-back{width:100%;height:38px;margin-top:8px;border:1px solid #3f8bc7;background:#123452;color:#fff;font:900 10px system-ui;letter-spacing:.08em}@media(max-height:420px){.tdrsi-card{padding:9px 13px}.tdrsi-card h2{font-size:18px}.tdrsi-sub{margin-bottom:6px}.tdrsi-stat{padding:5px}.tdrsi-card h3{margin:7px 0 4px}.tdrsi-row{min-height:28px}.tdrsi-back{height:33px}}
    </style><div class="tdrsi-veil"><div class="tdrsi-card"><div class="tdrsi-kicker">INFO DE SESIÓN · SUPERVIVENCIA</div><h2>${trackName}</h2><div class="tdrsi-sub">${this.carId||car?.name||'Coche'} · resultado ${this._survivalWon?'1º / CAMPEÓN':'ELIMINADO'}</div><div class="tdrsi-grid"><div class="tdrsi-stat"><small>RONDAS</small><b>${this._survivalRound}/5</b></div><div class="tdrsi-stat"><small>MEJOR</small><b>${fmtLap(best)}</b></div><div class="tdrsi-stat"><small>MEDIA</small><b>${fmtLap(avg)}</b></div><div class="tdrsi-stat"><small>VUELTAS</small><b>${laps.length}</b></div><div class="tdrsi-stat"><small>PEOR</small><b>${fmtLap(worst)}</b></div><div class="tdrsi-stat"><small>COCHES INICIALES</small><b>6</b></div></div><h3>VUELTAS · SECTORES</h3>${rows}<button class="tdrsi-back" data-a="back">VOLVER AL RESULTADO</button></div></div>`;
    if(resultRoot)resultRoot.style.display='none';
    overlay.querySelector('[data-a="back"]')?.addEventListener('click',()=>{try{overlay.remove();}catch{}if(resultRoot)resultRoot.style.display='';});
    document.body.appendChild(overlay);
  }
}
