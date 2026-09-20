import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';
import { getRaceControlGhost } from '../online/raceControlOnline.js';
import { decodeOnlineGhostNativeBinary, decodeOnlineGhostNative } from '../online/onlineGhostCodec.js';

const SESSION_KEY='tdr2:statsNativeReplay';
const RETURN_TRACK_KEY='tdr2:statsReturnTrack';
const esc=v=>String(v??'').replace(/[&<>\"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[ch]));
const fmt=ms=>{ms=Math.max(0,Number(ms)||0);const m=Math.floor(ms/60000),s=(ms%60000)/1000;return`${m}:${s.toFixed(3).padStart(6,'0')}`;};
const readLocalGhost=key=>{try{const g=JSON.parse(localStorage.getItem(key)||'null');return g&&Array.isArray(g.samples)&&g.samples.length>4?g:null;}catch{return null;}};
function byteaBytes(value){const raw=String(value||'');const hex=raw.startsWith('\\x')?raw.slice(2):raw.startsWith('\\\\x')?raw.slice(3):'';if(!hex||hex.length%2)return null;const out=new Uint8Array(hex.length/2);for(let i=0;i<out.length;i++){const n=parseInt(hex.slice(i*2,i*2+2),16);if(!Number.isFinite(n))return null;out[i]=n;}return out;}
function onlineGhostFromRow(row){const bytes=byteaBytes(row?.ghost_payload);if(!bytes)return null;const packet=decodeOnlineGhostNativeBinary(bytes,{ms:row.best_time_ms,tr:row.track_id,car:row.car_id,at:0,q:[4,10000],n:row.ghost_sample_count});return decodeOnlineGhostNative(packet);}

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
      .br-replay-modal{position:absolute;inset:0;z-index:80;display:grid;place-items:center;padding:clamp(10px,2vw,24px);background:rgba(1,7,12,.82);backdrop-filter:blur(5px)}
      .br-replay-modal__panel{width:min(920px,96%);max-height:94%;border:1px solid rgba(82,232,255,.48);background:#020a11;box-shadow:0 20px 60px rgba(0,0,0,.65);overflow:hidden}
      .br-replay-modal__head{height:48px;padding:8px 11px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(145deg,#081b27,#030c13);border-bottom:1px solid rgba(94,236,255,.18)}
      .br-replay-modal__head strong{display:block;font-size:13px}.br-replay-modal__head small{display:block;color:#76909f;font-size:7px;font-weight:900}.br-replay-modal__screen{position:relative;height:min(58vw,430px);min-height:250px;background:#020a11;overflow:hidden}
      .br-replay-modal__close{height:34px;min-width:92px;border:1px solid #4ee9ff;background:#0a2531;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em}
      .br-watch{border:1px solid #55eaff;background:rgba(20,75,91,.38);color:#fff;font-weight:1000;cursor:pointer}.br-watch:hover,.br-watch:active{background:#17475a}.br-pb .br-watch{margin-top:5px;height:28px;padding:0 10px;font-size:8px}.br-online-actions{display:grid;grid-template-columns:30px minmax(0,1fr);gap:4px;align-items:center}.br-online-actions .br-watch{height:42px;padding:0;font-size:12px}.br-online-actions .br-vs{min-width:0;width:100%}
      @media(max-height:430px){.br-native-monitor{min-height:0!important;height:auto!important}.br-native-screen{height:252px}.br-native-monitor .br-monitor-head{height:44px}.br-replay-modal{padding:5px}.br-replay-modal__screen{height:260px;min-height:0}.br-replay-modal__head{height:40px}}
    `;
    this._root.appendChild(s);
  }

  _renderBroadcastRecords(trackId=null){
    this._closeReplayModal();
    super._renderBroadcastRecords(trackId);
    this._installReplayModalActions(trackId);
  }

  _installReplayModalActions(trackId){
    const selected=this._getSelectedRecord?.(trackId)||null;
    if(selected?.ghostKey){
      const ghost=readLocalGhost(selected.ghostKey);
      const pb=this._root?.querySelector('.br-pb');
      if(ghost&&pb&&!pb.querySelector('[data-br-watch-local]')){
        const b=document.createElement('button');b.type='button';b.className='br-watch';b.dataset.brWatchLocal='1';b.textContent='▶ REPLAY';
        b.addEventListener('click',()=>this._showRaceControlReplayModal({trackId:selected.trackId,selectedLap:{carId:selected.bestCarId}},ghost,'LOCAL PB'));
        pb.appendChild(b);
      }
    }
    this._root?.querySelectorAll('.br-online-row').forEach(row=>{
      const vs=row.querySelector('[data-br-vs]');if(!vs)return;
      const ref=vs.dataset.brVs;if(!ref)return;
      const actions=document.createElement('span');actions.className='br-online-actions';
      const watch=document.createElement('button');watch.type='button';watch.className='br-watch';watch.title='Ver repetición';watch.textContent='▶';
      watch.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();watch.disabled=true;watch.textContent='…';try{const out=await getRaceControlGhost(ref);const data=Array.isArray(out)?out[0]:out;const ghost=onlineGhostFromRow(data);if(!ghost)throw new Error('Replay unavailable');this._showRaceControlReplayModal({trackId:data.track_id,selectedLap:{carId:data.car_id}},ghost,'ONLINE REPLAY');}catch(err){console.error('[race-control] replay download failed',err);watch.textContent='!';setTimeout(()=>{if(watch.isConnected){watch.disabled=false;watch.textContent='▶';}},1200);}});
      vs.replaceWith(actions);actions.append(watch,vs);
    });
  }

  _showRaceControlReplayModal(record,ghost,label='REPLAY'){
    this._closeReplayModal();
    if(!ghost?.samples?.length||!this._root)return;
    const trackId=String(ghost.trackKey||record?.trackId||'track01'),carId=String(ghost.carId||record?.selectedLap?.carId||'stock');
    const modal=document.createElement('div');modal.className='br-replay-modal';modal.dataset.brReplayModal='1';
    modal.innerHTML=`<section class="br-replay-modal__panel" role="dialog" aria-modal="true" aria-label="Race Control replay"><div class="br-replay-modal__head"><div><div class="br-label">RACE CONTROL // ${esc(label)}</div><strong>${esc(trackId).toUpperCase()}</strong><small>${esc(carId).toUpperCase()} · ${fmt(ghost.lapMs)}</small></div><button type="button" class="br-replay-modal__close" data-br-modal-close>CERRAR ✕</button></div><div class="br-replay-modal__screen" data-br-native-replay-screen="1"><div class="br-native-loading" data-br-native-loading>CARGANDO REPLAY REAL…</div></div></section>`;
    this._root.appendChild(modal);modal.querySelector('[data-br-modal-close]')?.addEventListener('click',()=>this._closeReplayModal());
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({version:3,source:'race-control-modal',embedded:true,returnTrackId:trackId,trackId,carId,lapMs:Number(ghost.lapMs)||0,recordedAt:Number(ghost.recordedAt)||0,samples:ghost.samples,cameraSamples:Array.isArray(ghost.cameraSamples)?ghost.cameraSamples:[],viewport:ghost.viewport||null}));}catch{this._closeReplayModal();return;}
    const launch=()=>{if(!this._root?.querySelector('[data-br-replay-modal]'))return;try{this.scene.launch('race',{trackKey:trackId,carId,statsNativeReplay:true,statsEmbeddedReplay:true});this.scene.bringToTop?.('race');requestAnimationFrame(()=>this._root?.querySelector('[data-br-native-loading]')?.remove?.());}catch(err){const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent='NO SE PUDO ABRIR EL REPLAY';console.error('[race-control] modal replay launch failed',err);}};
    try{const ensure=window.__tdrEnsureScene;if(typeof ensure==='function')Promise.resolve(ensure('race')).then(ok=>{if(ok)launch();else{const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent='NO SE PUDO CARGAR RACE';}});else launch();}catch{launch();}
  }

  _closeReplayModal(){
    try{if(this.scene?.isActive?.('race'))this.scene.stop('race');}catch{}
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    try{this._root?.querySelector('[data-br-replay-modal]')?.remove?.();}catch{}
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
    this._closeReplayModal();
  }
}
