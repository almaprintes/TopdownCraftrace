import { StatsScene as CurrentStatsScene } from './StatsBroadcastRealReplayScene.js';
import { shareLapCode, decodeSharedLap } from '../social/sharedLapExchange.js';
import { loadSharedLaps } from '../social/sharedLapStore.js';
import { t } from '../i18n/index.js';

const fmt=ms=>{const n=Math.max(0,Number(ms)||0),m=Math.floor(n/60000),s=(n%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};

export class StatsScene extends CurrentStatsScene{
  _renderBroadcastRecords(trackId=null){
    super._renderBroadcastRecords(trackId);
  }

  _testerSelectedTrack(){for(const el of this._root?.querySelectorAll('[data-br-track]')||[])if(el.classList.contains('active'))return String(el.dataset.brTrack||'');return'';}

  _showRaceControlReplay(record,ghost){
    super._showRaceControlReplay(record,ghost);
    if(!ghost?.samples?.length)return;
    const head=this._root?.querySelector('.br-native-monitor .br-monitor-head');
    if(!head)return;
    head.querySelector('[data-br-share-replay]')?.remove();
    const share=document.createElement('button');
    share.type='button';share.dataset.brShareReplay='1';share.textContent='⇧';share.title=t('tester.shareLap');
    share.style.cssText='height:30px;min-width:34px;margin-left:auto;margin-right:7px;border:1px solid #e5a646;background:#4a2d0c;color:#ffd68d;font-size:18px;font-weight:1000;line-height:1';
    share.onclick=async e=>{e.stopPropagation();try{await shareLapCode(ghost);}catch(err){if(err?.name!=='AbortError')console.warn('[tester-share]',err);}};
    const close=head.querySelector('[data-br-native-close]');
    if(close)head.insertBefore(share,close);else head.appendChild(share);
  }

  _openTesterExchange(trackId=''){
    document.querySelector('[data-tester-modal]')?.remove();
    const selectedTrack=String(trackId||'');
    const root=document.createElement('div');root.dataset.testerModal='1';root.style.cssText='position:fixed;inset:0;z-index:2147483500;display:grid;place-items:center;background:rgba(2,7,12,.92);font-family:system-ui;color:#fff';
    const card=document.createElement('div');card.style.cssText='width:min(680px,92vw);max-height:88vh;overflow:auto;padding:18px;border:1px solid #3c7b8f;background:#06131d';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>${t('tester.laps')}</b><button type="button" data-close>✕</button></div><textarea data-code placeholder="${t('tester.pasteCode')}" style="width:100%;height:70px;box-sizing:border-box;margin-top:12px;background:#02090e;color:#fff;border:1px solid #315767"></textarea><button type="button" data-import style="margin-top:7px;height:34px">${t('tester.importLap')}</button><div data-status style="font-size:10px;margin:8px 0;color:#8eb0bd"></div><div data-list></div>`;
    root.appendChild(card);document.body.appendChild(root);
    const status=card.querySelector('[data-status]');
    const draw=()=>{const list=card.querySelector('[data-list]');if(!list)return;let fresh=[];try{fresh=loadSharedLaps(selectedTrack)||[];}catch(err){console.warn('[tester-exchange] load failed',err);if(status)status.textContent=t('tester.readFailed');}list.innerHTML=fresh.map((lap,i)=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:9px;border-top:1px solid #17333f"><div><b>${lap?.pilot?.name||t('raceControl.player')}</b><div style="font-size:9px;color:#7893a0">${lap?.carId||''} · ${t('tester.received')}</div></div><b>${fmt(lap?.lapMs)}</b><button type="button" data-play="${i}">▶</button></div>`).join('')||`<div style="font-size:10px;color:#7893a0">${t('tester.noneYet')}</div>`;list.querySelectorAll('[data-play]').forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();const lap=fresh[Number(btn.dataset.play)];if(!lap?.replay?.samples?.length)return;root.remove();try{this._showRaceControlReplay({trackId:lap.trackId,selectedLap:{carId:lap.carId,lapMs:lap.lapMs}},{trackKey:lap.trackId,carId:lap.carId,lapMs:lap.lapMs,recordedAt:lap.recordedAt,samples:lap.replay.samples,cameraSamples:lap.replay.cameraSamples||[],viewport:lap.replay.viewport||null});}catch(err){console.error('[tester-exchange] replay failed',err);}},false));};
    card.querySelector('[data-close]')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();root.remove();},false);
    card.querySelector('[data-import]')?.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();try{const raw=String(card.querySelector('[data-code]')?.value||'');const pos=raw.indexOf('TDRLAP1:');const imported=decodeSharedLap(pos>=0?raw.slice(pos).trim():raw);if(status){status.textContent=imported.importStatus==='duplicate'?`${t('tester.duplicate')} · ${imported.pilot.name} · ${fmt(imported.lapMs)}`:`${t('tester.imported')} · ${imported.pilot.name} · ${fmt(imported.lapMs)}`;status.style.color=imported.importStatus==='duplicate'?'#ffd68d':'#79f2b0';}draw();}catch(err){if(status){status.textContent=String(err?.message||t('tester.invalidCode'));status.style.color='#ff9a9a';}}},false);
    draw();
  }
}