import { StatsScene as CurrentStatsScene } from './StatsBroadcastRealReplayScene.js';
import { shareLapCode, decodeSharedLap } from '../social/sharedLapExchange.js';
import { loadSharedLaps } from '../social/sharedLapStore.js';

const readGhost=key=>{try{const g=JSON.parse(localStorage.getItem(key)||'null');return g&&Array.isArray(g.samples)&&g.samples.length>4?g:null;}catch{return null;}};
const fmt=ms=>{const n=Math.max(0,Number(ms)||0),m=Math.floor(n/60000),s=(n%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};

export class StatsScene extends CurrentStatsScene{
  _renderBroadcastRecords(trackId=null){
    super._renderBroadcastRecords(trackId);
    const main=this._root;if(!main)return;
    main.querySelector('[data-tester-exchange]')?.remove();
    const b=document.createElement('button');b.type='button';b.dataset.testerExchange='1';b.textContent='TESTERS';
    b.style.cssText='position:absolute;right:12px;bottom:12px;z-index:30;height:34px;border:1px solid #55eaff;background:#0a3443;color:#fff;padding:0 13px;font:1000 9px system-ui;letter-spacing:.08em';
    b.onclick=()=>this._openTesterExchange(trackId||this._selectedTrack());
    main.appendChild(b);
    try{this._addShareButtons(trackId||this._selectedTrack());}catch(err){console.warn('[tester-share] controls skipped',err);}
  }

  _selectedTrack(){for(const el of this._root?.querySelectorAll('[data-br-track]')||[])if(el.classList.contains('active'))return String(el.dataset.brTrack||'');return'';}

  _addShareButtons(trackId){
    const state=this._getSelectedRecord?.(trackId);if(!state)return;
    const laps=Array.isArray(state.topLaps)?state.topLaps.slice(0,10):[];
    const rows=[...(this._root?.querySelectorAll('.br-lap')||[])];
    rows.forEach((row,index)=>{const lap=laps[index];if(!lap)return;let key=lap.replayKey||null;if(!key&&state.ghostKey&&Math.abs(Number(lap.lapMs)-Number(state.bestLapMs))<=1)key=state.ghostKey;const ghost=key?readGhost(key):null;if(!ghost)return;const share=document.createElement('button');share.type='button';share.textContent='⇧';share.title='Compartir vuelta';share.style.cssText='width:25px;height:25px;border:1px solid #e5a646;background:#4a2d0c;color:#ffd68d;font-weight:1000';share.onclick=async e=>{e.stopPropagation();try{await shareLapCode(ghost);}catch(err){if(err?.name!=='AbortError')console.warn('[tester-share]',err);}};row.appendChild(share);});
  }

  _openTesterExchange(trackId){
    document.querySelector('[data-tester-modal]')?.remove();
    const root=document.createElement('div');root.dataset.testerModal='1';root.style.cssText='position:fixed;inset:0;z-index:2147483500;display:grid;place-items:center;background:rgba(2,7,12,.92);font-family:system-ui;color:#fff';
    const card=document.createElement('div');card.style.cssText='width:min(680px,92vw);max-height:88vh;overflow:auto;padding:18px;border:1px solid #3c7b8f;background:#06131d';
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><b>VUELTAS DE TESTERS</b><button data-close>✕</button></div><textarea data-code placeholder="Pega aquí el código TDRLAP1" style="width:100%;height:70px;box-sizing:border-box;margin-top:12px;background:#02090e;color:#fff;border:1px solid #315767"></textarea><button data-import style="margin-top:7px;height:34px">IMPORTAR VUELTA</button><div data-status style="font-size:10px;margin:8px 0;color:#8eb0bd"></div><div data-list></div>`;
    root.appendChild(card);document.body.appendChild(root);
    const draw=()=>{const list=card.querySelector('[data-list]'),fresh=loadSharedLaps(trackId);list.innerHTML=fresh.map((lap,i)=>`<div style="display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center;padding:9px;border-top:1px solid #17333f"><div><b>${lap.pilot?.name||'PILOTO'}</b><div style="font-size:9px;color:#7893a0">${lap.carId}</div></div><b>${fmt(lap.lapMs)}</b><button data-play="${i}">▶</button></div>`).join('')||'<div style="font-size:10px;color:#7893a0">Sin vueltas recibidas todavía.</div>';list.querySelectorAll('[data-play]').forEach(btn=>btn.onclick=()=>{const lap=fresh[Number(btn.dataset.play)];root.remove();this._showRaceControlReplay({trackId:lap.trackId,selectedLap:{carId:lap.carId,lapMs:lap.lapMs}},{trackKey:lap.trackId,carId:lap.carId,lapMs:lap.lapMs,recordedAt:lap.recordedAt,samples:lap.replay.samples,cameraSamples:lap.replay.cameraSamples||[],viewport:lap.replay.viewport||null});});};
    card.querySelector('[data-close]').onclick=()=>root.remove();
    card.querySelector('[data-import]').onclick=()=>{const status=card.querySelector('[data-status]');try{const raw=card.querySelector('[data-code]').value;const pos=raw.indexOf('TDRLAP1:');const imported=decodeSharedLap(pos>=0?raw.slice(pos).trim():raw);status.textContent=`Importada: ${imported.pilot.name} · ${fmt(imported.lapMs)}`;draw();}catch(err){status.textContent=String(err?.message||'Código no válido');}};
    draw();
  }
}
