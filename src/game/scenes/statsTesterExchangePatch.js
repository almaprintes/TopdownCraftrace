import { StatsScene as CurrentStatsScene } from './StatsBroadcastRealReplayScene.js';
import { StatsScene as TesterStatsScene } from './StatsTesterExchangeScene.js';

const current=CurrentStatsScene?.prototype;
const tester=TesterStatsScene?.prototype;

if(current&&tester&&!current.__tdrTesterExchangePatch){
  const inherited=current._renderBroadcastRecords;
  current._selectedTrack=tester._selectedTrack;
  current._addShareButtons=tester._addShareButtons;
  current._openTesterExchange=tester._openTesterExchange;
  current._renderBroadcastRecords=function(trackId=null){
    const out=inherited?.call(this,trackId);
    const root=this._root;if(!root)return out;
    root.querySelector('[data-tester-exchange]')?.remove();
    const selected=()=>this._selectedTrack?.()||trackId||'';
    const b=document.createElement('button');b.type='button';b.dataset.testerExchange='1';b.textContent='TESTERS';
    b.style.cssText='position:absolute;right:12px;bottom:12px;z-index:30;height:34px;border:1px solid #55eaff;background:#0a3443;color:#fff;padding:0 13px;font:1000 9px system-ui;letter-spacing:.08em';
    b.onclick=()=>this._openTesterExchange?.(selected());
    root.appendChild(b);

    // The first Race Control paint can finish its replay decoration after this wrapper.
    // Decorate only once the final TOP rows/play controls exist, and repeat briefly
    // while that initial DOM settles. Circuit changes remain synchronous.
    let attempts=0;
    const decorate=()=>{
      if(!this._root?.isConnected)return;
      this._root.querySelectorAll('button[title="Compartir vuelta"]').forEach(el=>el.remove());
      try{this._addShareButtons?.(selected());}catch(err){console.warn('[tester-share] controls skipped',err);}
      attempts++;
      if(attempts<8)setTimeout(decorate,attempts<3?0:40);
    };
    queueMicrotask(decorate);
    requestAnimationFrame(decorate);
    return out;
  };
  current.__tdrTesterExchangePatch=true;
}
