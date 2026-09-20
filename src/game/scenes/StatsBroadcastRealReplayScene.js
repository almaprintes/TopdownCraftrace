import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';
import { getRaceControlGhost } from '../online/raceControlOnline.js';
import { decodeOnlineGhostNativeBinary, decodeOnlineGhostNative } from '../online/onlineGhostCodec.js';
import { pxpsToKmh } from '../cars/speedUnits.js';

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
      .br-replay-modal__panel{width:min(1180px,98%);max-height:96%;border:1px solid rgba(82,232,255,.48);background:#020a11;box-shadow:0 20px 60px rgba(0,0,0,.65);overflow:hidden}
      .br-replay-modal__head{height:48px;padding:8px 11px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(145deg,#081b27,#030c13);border-bottom:1px solid rgba(94,236,255,.18)}
      .br-replay-modal__head strong{display:block;font-size:13px}.br-replay-modal__head small{display:block;color:#76909f;font-size:7px;font-weight:900}.br-replay-modal__screen{position:relative;height:min(62vw,560px);min-height:300px;background:#020a11;overflow:hidden;padding:0 190px 66px;box-sizing:border-box}
      .br-replay-modal__close{height:34px;min-width:92px;border:1px solid #4ee9ff;background:#0a2531;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em}.br-replay-telemetry{position:absolute;inset:0;z-index:4;pointer-events:none;font-family:system-ui,-apple-system,sans-serif}.br-tel-left,.br-tel-right{position:absolute;top:0;bottom:0;width:190px;display:flex;flex-direction:column;gap:0;background:#020e16}.br-tel-left{left:0;border-right:1px solid rgba(82,232,255,.42)}.br-tel-right{right:0;border-left:1px solid rgba(82,232,255,.42)}.br-tel-card{border:0;border-bottom:1px solid rgba(82,232,255,.25);background:#020e16;box-shadow:inset 0 0 18px rgba(50,224,255,.035);padding:9px 11px;color:#fff}.br-tel-label{font-size:6px;font-weight:1000;letter-spacing:.16em;color:#62ecff}.br-tel-big{font-size:25px;font-weight:1000;line-height:1.05;font-variant-numeric:tabular-nums}.br-tel-row{display:flex;justify-content:space-between;gap:8px;padding-top:4px;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);font-size:8px;font-weight:900}.br-tel-row span{color:#7893a2}.br-tel-good{color:#5df0b0!important}.br-tel-bad{color:#ff6975!important}.br-tel-car{font-size:11px;font-weight:1000}.br-tel-speed{font-size:27px;font-weight:1000}.br-tel-speed small{font-size:9px;color:#91a8b4}.br-tel-bar{height:7px;margin-top:5px;background:#102732;overflow:hidden}.br-tel-bar i{display:block;height:100%;width:0;background:#5defff;box-shadow:0 0 8px rgba(93,239,255,.55)}.br-tel-g{position:relative;width:76px;height:76px;margin:5px auto 0;border:1px solid #567787;border-radius:50%;background:repeating-radial-gradient(circle,transparent 0 11px,rgba(91,230,255,.12) 12px 13px)}.br-tel-g:before,.br-tel-g:after{content:"";position:absolute;background:rgba(110,227,242,.25)}.br-tel-g:before{left:50%;top:0;width:1px;height:100%}.br-tel-g:after{top:50%;left:0;height:1px;width:100%}.br-tel-g-dot{position:absolute;left:50%;top:50%;width:9px;height:9px;margin:-4.5px;border-radius:50%;background:#5defff;box-shadow:0 0 10px #5defff;transform:translate(0,0)}.br-tel-bottom{position:absolute;left:190px;right:190px;bottom:0;height:66px;border:1px solid rgba(82,232,255,.28);background:rgba(2,14,22,.78);display:grid;grid-template-columns:repeat(4,1fr);align-items:center;text-align:center}.br-tel-bottom div{border-right:1px solid rgba(255,255,255,.08);font-size:7px;color:#7893a2}.br-tel-bottom strong{display:block;color:#fff;font-size:10px;margin-top:1px}.br-tel-bottom div:last-child{border:0}@media(max-width:900px){.br-replay-modal__screen{padding-left:150px;padding-right:150px}.br-tel-left,.br-tel-right{width:150px}.br-tel-bottom{left:150px;right:150px}.br-tel-big,.br-tel-speed{font-size:20px}}
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
    modal.innerHTML=`<section class="br-replay-modal__panel" role="dialog" aria-modal="true" aria-label="Race Control replay"><div class="br-replay-modal__head"><div><div class="br-label">RACE CONTROL // ${esc(label)}</div><strong>${esc(trackId).toUpperCase()}</strong><small>${esc(carId).toUpperCase()} · ${fmt(ghost.lapMs)}</small></div><button type="button" class="br-replay-modal__close" data-br-modal-close>CERRAR ✕</button></div><div class="br-replay-modal__screen" data-br-native-replay-screen="1"><div class="br-native-loading" data-br-native-loading>CARGANDO REPLAY REAL…</div><div class="br-replay-telemetry" data-br-telemetry><aside class="br-tel-left"><div class="br-tel-card"><div class="br-tel-label">VUELTA EN REPRODUCCIÓN</div><div class="br-tel-big" data-tel-time>0:00.000</div><div class="br-tel-row"><span>MEJOR VUELTA</span><b>${fmt(ghost.lapMs)}</b></div><div class="br-tel-row"><span>PROGRESO</span><b data-tel-progress>0%</b></div></div><div class="br-tel-card"><div class="br-tel-label">PILOTO / MÁQUINA</div><div class="br-tel-car">${esc(carId).toUpperCase()}</div><div class="br-tel-row"><span>CIRCUITO</span><b>${esc(trackId).toUpperCase()}</b></div><div class="br-tel-row"><span>MUESTRAS</span><b>${ghost.samples.length}</b></div><div class="br-tel-row"><span>FRECUENCIA</span><b data-tel-hz>—</b></div><div class="br-tel-row"><span>SECTOR</span><b data-tel-sector>S1</b></div></div></aside><aside class="br-tel-right"><div class="br-tel-card"><div class="br-tel-label">VELOCIDAD ESTIMADA</div><div class="br-tel-speed"><span data-tel-speed>0</span> <small>km/h</small></div><div class="br-tel-bar"><i data-tel-speedbar></i></div><div class="br-tel-row"><span>RITMO</span><b data-tel-pace>0%</b></div><div class="br-tel-row"><span>V. MÁX</span><b data-tel-vmax>0 km/h</b></div><div class="br-tel-row"><span>DISTANCIA</span><b data-tel-distance>0 m</b></div></div><div class="br-tel-card"><div class="br-tel-label">DINÁMICA</div><div class="br-tel-g"><i class="br-tel-g-dot" data-tel-gdot></i></div><div class="br-tel-row"><span>LAT G</span><b data-tel-latg>0.00</b></div><div class="br-tel-row"><span>LONG G</span><b data-tel-longg>0.00</b></div><div class="br-tel-row"><span>RUMBO</span><b data-tel-heading>0°</b></div></div></aside><div class="br-tel-bottom"><div>ESTADO<strong data-tel-state>REPLAY</strong></div><div>TRAZADA<strong>ANÁLISIS ON</strong></div><div>FORMATO<strong>RACE DATA</strong></div><div>FUENTE<strong>${esc(label)}</strong></div></div></div></div></section>`;
    this._root.appendChild(modal);modal.querySelector('[data-br-modal-close]')?.addEventListener('click',()=>this._closeReplayModal());
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({version:3,source:'race-control-modal',embedded:true,returnTrackId:trackId,trackId,carId,lapMs:Number(ghost.lapMs)||0,recordedAt:Number(ghost.recordedAt)||0,samples:ghost.samples,cameraSamples:Array.isArray(ghost.cameraSamples)?ghost.cameraSamples:[],viewport:ghost.viewport||null}));}catch{this._closeReplayModal();return;}
    const launch=()=>{if(!this._root?.querySelector('[data-br-replay-modal]'))return;try{this.scene.launch('race',{trackKey:trackId,carId,statsNativeReplay:true,statsEmbeddedReplay:true});this.scene.bringToTop?.('race');requestAnimationFrame(()=>this._root?.querySelector('[data-br-native-loading]')?.remove?.());}catch(err){const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent='NO SE PUDO ABRIR EL REPLAY';console.error('[race-control] modal replay launch failed',err);}};
    try{const ensure=window.__tdrEnsureScene;if(typeof ensure==='function')Promise.resolve(ensure('race')).then(ok=>{if(ok)launch();else{const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent='NO SE PUDO CARGAR RACE';}});else launch();}catch{launch();}
    this._startReplayTelemetry(ghost);
  }

  _startReplayTelemetry(ghost){
    this._stopReplayTelemetry();
    const samples=ghost?.samples||[],lap=Math.max(1,Number(ghost?.lapMs)||Number(samples.at(-1)?.t)||1);
    let maxSpeed=1,totalDistance=0;for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],d=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y)),dt=(Number(b.t)-Number(a.t))/1000;totalDistance+=Number.isFinite(d)?d:0;if(dt>0)maxSpeed=Math.max(maxSpeed,d/dt);}
    const avgDt=samples.length>1?lap/(samples.length-1):0,hz=avgDt>0?Math.round(1000/avgDt):0;
    let last=performance.now(),elapsed=0,finished=false;
    const tick=now=>{const root=this._root?.querySelector('[data-br-telemetry]');if(!root)return;const dt=Math.min(80,now-last);last=now;if(!finished){elapsed=Math.min(lap,elapsed+dt);if(elapsed>=lap)finished=true;}let i=1;while(i<samples.length&&Number(samples[i]?.t)<elapsed)i++;const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a,span=Math.max(1,Number(b?.t)-Number(a?.t)),q=Math.max(0,Math.min(1,(elapsed-Number(a?.t||0))/span));const x=Number(a?.x)+(Number(b?.x)-Number(a?.x))*q,y=Number(a?.y)+(Number(b?.y)-Number(a?.y))*q;const prev=samples[Math.max(0,i-2)]||a,next=samples[Math.min(samples.length-1,i+1)]||b,wdt=Math.max(1,Number(next?.t)-Number(prev?.t))/1000,vx=(Number(next?.x)-Number(prev?.x))/wdt,vy=(Number(next?.y)-Number(prev?.y))/wdt,speed=Math.hypot(vx,vy),kmh=pxpsToKmh(speed),pace=Math.min(100,Math.round(speed/maxSpeed*100)),r=Number(a?.r)||0,forward=vx*Math.cos(r)+vy*Math.sin(r),lateral=-vx*Math.sin(r)+vy*Math.cos(r),scale=Math.max(1,speed);const lat=Math.max(-1.8,Math.min(1.8,lateral/scale*1.6)),lon=Math.max(-1.8,Math.min(1.8,(forward-speed)/scale*1.6));const set=(s,v)=>{const e=root.querySelector(s);if(e)e.textContent=v;};set('[data-tel-time]',fmt(elapsed));set('[data-tel-progress]',Math.round(elapsed/lap*100)+'%');set('[data-tel-speed]',Math.round(kmh));set('[data-tel-pace]',pace+'%');set('[data-tel-latg]',lat.toFixed(2));set('[data-tel-longg]',lon.toFixed(2));set('[data-tel-vmax]',Math.round(pxpsToKmh(maxSpeed))+' km/h');set('[data-tel-distance]',Math.round(totalDistance)+' m');set('[data-tel-hz]',hz?hz+' Hz':'—');set('[data-tel-sector]','S'+Math.min(3,Math.floor(elapsed/lap*3)+1));set('[data-tel-heading]',Math.round(((r*180/Math.PI)%360+360)%360)+'°');set('[data-tel-state]',finished?'FINALIZADA':'REPLAY');const bar=root.querySelector('[data-tel-speedbar]');if(bar)bar.style.width=pace+'%';const dot=root.querySelector('[data-tel-gdot]');if(dot)dot.style.transform=`translate(${lat*16}px,${-lon*16}px)`;if(!finished)this._tdrReplayTelemetryRaf=requestAnimationFrame(tick);};
    this._tdrReplayTelemetryRaf=requestAnimationFrame(tick);
  }
  _stopReplayTelemetry(){if(this._tdrReplayTelemetryRaf)cancelAnimationFrame(this._tdrReplayTelemetryRaf);this._tdrReplayTelemetryRaf=0;}

  _closeReplayModal(){
    this._stopReplayTelemetry();
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
