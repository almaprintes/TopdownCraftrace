import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';

const SESSION_KEY='tdr2:statsNativeReplay';
const RETURN_TRACK_KEY='tdr2:statsReturnTrack';
const esc=v=>String(v??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
const fmt=ms=>{ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};

export class StatsScene extends ReplayStatsScene{
  create(data){
    super.create(data);
    this.events?.once?.('shutdown',()=>this._stopRaceControlReplay());
    let trackId='';
    try{
      trackId=String(data?.raceControlTrackId||sessionStorage.getItem(RETURN_TRACK_KEY)||'');
      sessionStorage.removeItem(RETURN_TRACK_KEY);
    }catch{}
    if(trackId)this.time?.delayedCall?.(0,()=>this._renderBroadcastRecords(trackId));
  }

  _installBroadcastStyles(){
    super._installBroadcastStyles();
    if(this._root?.querySelector('[data-br-native-replay-style]'))return;
    const s=document.createElement('style');
    s.dataset.brNativeReplayStyle='1';
    s.textContent=`
      .br-main.br-native-active{align-content:start!important;grid-auto-rows:max-content!important}
      .br-main.br-native-active>.br-native-monitor,.br-main.br-native-active>.br-chart{align-self:start!important}
      .br-native-monitor{min-height:0!important;height:auto!important;background:transparent!important;overflow:hidden}
      .br-native-monitor .br-monitor-head{height:48px;background:linear-gradient(145deg,rgba(8,27,39,.98),rgba(3,12,19,.98));position:relative;z-index:8}
      .br-native-screen{position:relative;height:307px;overflow:hidden;background:#020a11!important;isolation:isolate;display:block}
      .br-native-screen:after{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;box-shadow:inset 0 0 0 1px rgba(82,232,255,.16),inset 0 -35px 45px rgba(0,0,0,.08)}
      .br-native-close{height:30px;border:1px solid #386b7c;background:#0a2531;color:#77eefa;padding:0 10px;font-size:8px;font-weight:1000;letter-spacing:.08em}
      .br-native-loading{position:absolute;inset:0;display:grid;place-items:center;color:#6f8c9b;font-size:8px;font-weight:1000;letter-spacing:.12em;pointer-events:none}
      .br-main>.br-chart{display:block}
      @media(max-height:430px){.br-native-monitor{min-height:0!important;height:auto!important}.br-native-screen{height:252px}.br-native-monitor .br-monitor-head{height:44px}}
    `;
    this._root.appendChild(s);
  }

  _showRaceControlReplay(record,ghost){
    this._stopRaceControlReplay();
    if(!ghost?.samples?.length)return;
    const main=this._root?.querySelector('.br-main');
    if(!main)return;
    const trackId=String(ghost.trackKey||record?.trackId||'track01');
    const carId=String(ghost.carId||record?.selectedLap?.carId||'stock');
    const chart=main.querySelector('.br-chart')?.cloneNode?.(true)||null;
    main.classList.add('br-native-active');
    main.innerHTML=`
      <section class="br-panel br-monitor br-native-monitor">
        <div class="br-monitor-head">
          <div>
            <div class="br-label">RACE CONTROL // REPLAY REAL</div>
            <strong>${esc(trackId).toUpperCase()}</strong>
            <small>${esc(carId).toUpperCase()} · ${fmt(ghost.lapMs)}</small>
          </div>
          <button type="button" class="br-native-close" data-br-native-close>← ANÁLISIS</button>
        </div>
        <div class="br-native-screen" data-br-native-replay-screen="1"><div class="br-native-loading" data-br-native-loading>CARGANDO REPLAY REAL…</div></div>
      </section>`;
    if(chart)main.appendChild(chart);
    main.querySelector('[data-br-native-close]')?.addEventListener('click',()=>this._renderBroadcastRecords(trackId));
    try{
      sessionStorage.setItem(SESSION_KEY,JSON.stringify({
        version:3,
        source:'race-control',
        embedded:true,
        returnTrackId:trackId,
        trackId,
        carId,
        lapMs:Number(ghost.lapMs)||0,
        recordedAt:Number(ghost.recordedAt)||0,
        samples:ghost.samples,
        cameraSamples:Array.isArray(ghost.cameraSamples)?ghost.cameraSamples:[],
        viewport:ghost.viewport||null
      }));
    }catch{return;}

    const launch=()=>{
      if(!this._root?.querySelector('[data-br-native-replay-screen="1"]'))return;
      try{
        this.scene.launch('race',{trackKey:trackId,carId,statsNativeReplay:true,statsEmbeddedReplay:true});
        this.scene.bringToTop?.('race');
        requestAnimationFrame(()=>this._root?.querySelector('[data-br-native-loading]')?.remove?.());
      }catch(err){
        const loading=this._root?.querySelector('[data-br-native-loading]');
        if(loading)loading.textContent='NO SE PUDO ABRIR EL REPLAY';
        console.error('[race-control] embedded replay launch failed',err);
      }
    };
    try{
      const ensure=window.__tdrEnsureScene;
      if(typeof ensure==='function'){
        Promise.resolve(ensure('race')).then(ok=>{if(ok)launch();else{const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent='NO SE PUDO CARGAR RACE';}});
      }else launch();
    }catch{launch();}
  }

  _stopRaceControlReplay(){
    super._stopRaceControlReplay?.();
    try{if(this.scene?.isActive?.('race'))this.scene.stop('race');}catch{}
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  }
}
