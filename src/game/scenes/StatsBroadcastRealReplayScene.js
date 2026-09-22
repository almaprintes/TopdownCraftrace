import { StatsScene as ReplayStatsScene } from './StatsBroadcastReplayScene.js';
import { getRaceControlGhost } from '../online/raceControlOnline.js';
import { decodeOnlineGhostNativeBinary, decodeOnlineGhostNative } from '../online/onlineGhostCodec.js';
import { pxpsToKmh } from '../cars/speedUnits.js';
import { t } from '../i18n/index.js';
import { showRewardedAd } from '../monetization/RewardedAdsProvider.js';
import { setOnlineGhostChallenge } from '../online/onlineGhostSession.js';

const SESSION_KEY='tdr2:statsNativeReplay';
const RETURN_TRACK_KEY='tdr2:statsReturnTrack';
// Session-memory cache: one Supabase ghost download can feed replay and VS Ghost.
const ONLINE_GHOST_CACHE=new Map();
const cacheOnlineGhost=(ref,data,ghost)=>{const key=String(ref||'');if(key&&ghost?.samples?.length)ONLINE_GHOST_CACHE.set(key,{data,ghost});return ghost;};
const cachedOnlineGhost=ref=>ONLINE_GHOST_CACHE.get(String(ref||''))||null;
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
      .br-native-loading{position:absolute;left:190px;right:190px;top:0;bottom:0;z-index:450;display:grid;place-items:center;background:#03121b;color:#6f8c9b;font-size:8px;font-weight:1000;letter-spacing:.12em;pointer-events:none}@media(max-width:900px){.br-native-loading{left:150px;right:150px}}
      .br-main>.br-chart{display:block}
      .br-replay-modal{position:absolute;inset:0;z-index:80;display:grid;place-items:center;padding:clamp(10px,2vw,24px);background:rgba(1,7,12,.82);backdrop-filter:blur(5px)}
      .br-replay-modal__panel{width:min(1180px,98%);max-height:96%;display:flex;flex-direction:column;border:1px solid rgba(82,232,255,.48);background:#020a11;box-shadow:0 20px 60px rgba(0,0,0,.65);overflow:hidden}
      .br-replay-modal__head{height:48px;padding:8px 11px;display:flex;align-items:center;justify-content:space-between;background:linear-gradient(145deg,#081b27,#030c13);border-bottom:1px solid rgba(94,236,255,.18)}
      .br-replay-modal__head strong{display:block;font-size:13px}.br-replay-modal__head small{display:block;color:#76909f;font-size:7px;font-weight:900}.br-replay-modal__screen{position:relative;height:min(62vw,560px);min-height:300px;background:#020a11;overflow:hidden;padding:0 190px;box-sizing:border-box}
      .br-replay-modal__close{height:34px;min-width:92px;border:1px solid #4ee9ff;background:#0a2531;color:#fff;font-size:9px;font-weight:1000;letter-spacing:.08em}.br-replay-telemetry{position:absolute;inset:0;z-index:90;pointer-events:none;font-family:system-ui,-apple-system,sans-serif}.br-tel-left,.br-tel-right{position:absolute;top:0;bottom:0;width:190px;display:flex;flex-direction:column;gap:0;background:#020e16}.br-tel-left{left:0;border-right:1px solid rgba(82,232,255,.42)}.br-tel-right{right:0;border-left:1px solid rgba(82,232,255,.42)}.br-tel-card{border:0;border-bottom:1px solid rgba(82,232,255,.25);background:#020e16;box-shadow:inset 0 0 18px rgba(50,224,255,.035);padding:9px 11px;color:#fff}.br-tel-label{font-size:6px;font-weight:1000;letter-spacing:.16em;color:#62ecff}.br-tel-big{font-size:25px;font-weight:1000;line-height:1.05;font-variant-numeric:tabular-nums}.br-tel-row{display:flex;justify-content:space-between;gap:8px;padding-top:4px;margin-top:4px;border-top:1px solid rgba(255,255,255,.08);font-size:8px;font-weight:900}.br-tel-row span{color:#7893a2}.br-tel-good{color:#5df0b0!important}.br-tel-bad{color:#ff6975!important}.br-tel-car{font-size:11px;font-weight:1000}.br-tel-speed{font-size:27px;font-weight:1000}.br-tel-speed small{font-size:9px;color:#91a8b4}.br-tel-bar{height:7px;margin-top:5px;background:#102732;overflow:hidden}.br-tel-bar i{display:block;height:100%;width:0;background:#5defff;box-shadow:0 0 8px rgba(93,239,255,.55)}.br-tel-bottom{position:absolute;left:190px;right:190px;bottom:58px;height:60px;border:1px solid rgba(82,232,255,.28);background:rgba(2,14,22,.78);display:grid;grid-template-columns:repeat(5,1fr);align-items:center;text-align:center}.br-tel-bottom div{border-right:1px solid rgba(255,255,255,.08);font-size:7px;color:#7893a2}.br-tel-bottom strong{display:block;color:#fff;font-size:10px;margin-top:1px}.br-tel-bottom div:last-child{border:0}.br-playerbar{position:absolute;left:50%;bottom:14px;transform:translateX(-50%);width:min(620px,72%);height:72px;z-index:500;display:grid;grid-template-columns:1fr;grid-template-rows:18px 40px;gap:2px;padding:6px 16px 5px;box-sizing:border-box;border:1px solid rgba(82,232,255,.58);border-radius:27px;background:rgba(3,38,52,.94);box-shadow:0 8px 26px rgba(0,0,0,.38),0 0 0 1px rgba(82,232,255,.18);backdrop-filter:blur(5px);pointer-events:auto}.br-playerbar__timeline{display:grid;grid-template-columns:1fr 64px;gap:10px;align-items:center}.br-playerbar__seek{width:100%;min-width:0;accent-color:#52e8ff}.br-playerbar__time{text-align:right;color:#fff;font:900 9px/1 system-ui,sans-serif;font-variant-numeric:tabular-nums}.br-playerbar__buttons{display:flex;align-items:center;justify-content:space-around;gap:14px}.br-playerbar__btn{width:52px;height:34px;padding:0;border:0;background:transparent;color:#fff;font:1000 20px/1 system-ui,sans-serif}.br-playerbar__main{display:flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;flex:0 0 42px!important;width:42px!important;min-width:42px!important;max-width:42px!important;height:42px!important;min-height:42px!important;border-radius:50%!important;border:2px solid #52e8ff!important;background:#52e8ff!important;color:#032634!important;position:relative!important}.br-playerbar__glyph{display:block!important;visibility:visible!important;opacity:1!important;color:#032634!important;font:1000 22px/1 Arial,sans-serif!important;line-height:1!important}.br-playerbar__glyph--play{padding-left:4px!important;font-size:20px!important}.br-playerbar__speed{font-size:13px}.br-playerbar__analysis{font-size:16px;color:#fff}@media(max-height:430px){.br-playerbar{bottom:7px;width:min(560px,68%);height:66px;grid-template-rows:17px 36px;padding:5px 14px 4px;border-radius:24px}.br-playerbar__main{width:40px!important;height:40px!important;min-width:40px!important;min-height:40px!important}.br-playerbar__btn{height:32px}}@media(max-width:900px){.br-replay-modal__screen{padding-left:150px;padding-right:150px}.br-tel-left,.br-tel-right{width:150px}.br-tel-bottom{left:150px;right:150px}.br-tel-big,.br-tel-speed{font-size:20px}}
      .br-watch{border:1px solid #55eaff;background:rgba(20,75,91,.38);color:#fff;font-weight:1000;cursor:pointer}.br-watch:hover,.br-watch:active{background:#17475a}.br-pb .br-watch{margin-top:5px;height:28px;padding:0 10px;font-size:8px}.br-online-actions{display:grid;grid-template-columns:30px minmax(0,1fr);gap:4px;align-items:center}.br-online-actions .br-watch{height:42px;padding:0;font-size:12px}.br-online-actions .br-vs{min-width:0;width:100%}
      @media(max-height:430px){.br-native-monitor{min-height:0!important;height:auto!important}.br-native-screen{height:252px}.br-native-monitor .br-monitor-head{height:44px}.br-replay-modal{padding:5px}.br-replay-modal__screen{height:300px;min-height:0;padding-bottom:0}.br-replay-modal__head{height:40px}.br-tel-bottom{bottom:0;height:50px}.br-tel-card{padding:6px 8px}.br-tel-row{padding-top:2px;margin-top:2px}}
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
        const b=document.createElement('button');b.type='button';b.className='br-watch';b.dataset.brWatchLocal='1';b.textContent='▶ '+t('replay.replay');
        b.addEventListener('click',()=>this._showRaceControlReplayModal({trackId:selected.trackId,selectedLap:{carId:selected.bestCarId}},ghost,t('replay.localPb')));
        pb.appendChild(b);
      }
    }
    this._root?.querySelectorAll('.br-online-row').forEach(row=>{
      const originalVs=row.querySelector('[data-br-vs]');if(!originalVs)return;
      const ref=originalVs.dataset.brVs;if(!ref)return;
      // StatsBroadcastScene installs a placeholder confirm-only VS handler.
      // Clone the button here so the real replay layer owns the complete
      // rewarded-ad -> unlock -> download -> Ghost mode flow without double handlers.
      const vs=originalVs.cloneNode(true);
      const actions=document.createElement('span');actions.className='br-online-actions';
      const watch=document.createElement('button');watch.type='button';watch.className='br-watch';watch.title=t('replay.watch');watch.textContent='▶';
      watch.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();watch.disabled=true;watch.textContent='…';try{let hit=cachedOnlineGhost(ref),data=hit?.data,ghost=hit?.ghost;if(!ghost){const out=await getRaceControlGhost(ref);data=Array.isArray(out)?out[0]:out;ghost=onlineGhostFromRow(data);if(!ghost)throw new Error('Replay unavailable');cacheOnlineGhost(ref,data,ghost);}this._showRaceControlReplayModal({trackId:data.track_id,selectedLap:{carId:data.car_id}},ghost,t('replay.onlineReplay'));}catch(err){console.error('[race-control] replay download failed',err);watch.textContent='!';setTimeout(()=>{if(watch.isConnected){watch.disabled=false;watch.textContent='▶';}},1200);}});
      vs.addEventListener('click',async e=>{e.preventDefault();e.stopPropagation();if(vs.dataset.brVsLaunching==='1')return;vs.dataset.brVsLaunching='1';const original=vs.innerHTML;try{let unlocked=localStorage.getItem('tdr2:onlineGhostUnlocked:'+ref)==='1';if(!unlocked){if(!window.confirm(t('raceControl.unlockGhostRewarded')))return;vs.textContent='…';const ad=await showRewardedAd(this,{title:t('raceControl.unlockGhostRewarded'),placement:'race_control_vs_ghost',claimId:'race-control-ghost:'+ref});if(!ad?.completed||!ad?.verified)throw new Error(ad?.reason||'rewarded_ad_not_completed');localStorage.setItem('tdr2:onlineGhostUnlocked:'+ref,'1');unlocked=true;}vs.textContent='…';let hit=cachedOnlineGhost(ref),data=hit?.data,ghost=hit?.ghost;if(!ghost){const out=await getRaceControlGhost(ref);data=Array.isArray(out)?out[0]:out;ghost=onlineGhostFromRow(data);if(!ghost)throw new Error('Ghost unavailable');cacheOnlineGhost(ref,data,ghost);}this._launchOnlineGhostChallenge(ref,data,ghost);}catch(err){console.error('[race-control] VS ghost launch failed',err);vs.innerHTML=original;}finally{vs.dataset.brVsLaunching='0';}});
      originalVs.replaceWith(actions);actions.append(watch,vs);
    });
  }

  _launchOnlineGhostChallenge(ref,data,ghost){
    if(!ghost?.samples?.length)return;
    const trackId=String(ghost.trackKey||data?.track_id||'track01');
    const playerCarId=(()=>{try{return localStorage.getItem('tdr2:carId')||this.selectedCarId||'car';}catch{return this.selectedCarId||'car';}})();
    // Pass the already-decoded object by reference. This remains memory-only and
    // avoids serialising the online ghost or issuing a second Supabase request.
    setOnlineGhostChallenge({ref:String(ref||''),trackId,ghost});
    try{localStorage.setItem('tdr2:gameMode','ghost');localStorage.setItem('tdr2:trackKey',trackId);}catch{}
    // Closing the replay modal normally stops the shared lazy "race" scene.
    // For VS we are about to start that same scene, so clean only replay-owned
    // UI/state and leave the scene lifecycle to scene.start below.
    this._stopReplayTelemetry();
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    try{this._root?.querySelector('[data-br-replay-modal]')?.remove?.();}catch{}
    this._purgeReplayResidue();
    this.scene.start('race',{trackKey:trackId,carId:playerCarId,gameMode:'ghost',onlineGhostRef:String(ref||'')});
  }

  _showRaceControlReplayModal(record,ghost,label='REPLAY'){
    // Opening a replay must not stop an already-running Race scene: after a VS
    // challenge that would tear down the live race and can leave Phaser's lazy
    // scene entry unusable. Only purge replay-owned DOM/state here.
    this._stopReplayTelemetry();
    try{this._root?.querySelector('[data-br-replay-modal]')?.remove?.();}catch{}
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    this._purgeReplayResidue();
    if(!ghost?.samples?.length||!this._root)return;
    const trackId=String(ghost.trackKey||record?.trackId||'track01'),carId=String(ghost.carId||record?.selectedLap?.carId||'stock');
    const modal=document.createElement('div');modal.className='br-replay-modal';modal.dataset.brReplayModal='1';
    modal.innerHTML=`<section class="br-replay-modal__panel" role="dialog" aria-modal="true" aria-label="${t('replay.dialogLabel')}"><div class="br-replay-modal__head"><div><div class="br-label">RACE CONTROL // ${esc(label)}</div><strong>${esc(trackId).toUpperCase()}</strong><small>${esc(carId).toUpperCase()} · ${fmt(ghost.lapMs)}</small></div><button type="button" class="br-replay-modal__close" data-br-modal-close>${t('common.close')} ✕</button></div><div class="br-replay-modal__screen" data-br-native-replay-screen="1"><div class="br-native-loading" data-br-native-loading><span>${t('replay.preparing')}</span></div><div class="br-replay-telemetry" data-br-telemetry><aside class="br-tel-left"><div class="br-tel-card"><div class="br-tel-label">${t('replay.lapTiming')}</div><div class="br-tel-big" data-tel-time>0:00.000</div><div class="br-tel-row"><span>${t('replay.lapTime')}</span><b>${fmt(ghost.lapMs)}</b></div><div class="br-tel-row"><span>${t('replay.remaining')}</span><b data-tel-remaining>—</b></div><div class="br-tel-row"><span>${t('replay.progress')}</span><b data-tel-progress>0%</b></div><div class="br-tel-row"><span>${t('replay.sector')}</span><b data-tel-sector>S1</b></div></div><div class="br-tel-card"><div class="br-tel-label">${t('replay.driverMachine')}</div><div class="br-tel-car">${esc(carId).toUpperCase()}</div><div class="br-tel-row"><span>${t('replay.track')}</span><b>${esc(trackId).toUpperCase()}</b></div><div class="br-tel-row"><span>${t('replay.source')}</span><b>${esc(label)}</b></div><div class="br-tel-row"><span>${t('replay.samples')}</span><b>${ghost.samples.length}</b></div><div class="br-tel-row"><span>${t('replay.frequency')}</span><b data-tel-hz>—</b></div></div></aside><aside class="br-tel-right"><div class="br-tel-card"><div class="br-tel-label">${t('replay.dynamics')}</div><div class="br-tel-speed"><span data-tel-speed>0</span> <small>km/h</small></div><div class="br-tel-bar"><i data-tel-speedbar></i></div><div class="br-tel-row"><span>${t('replay.maxSpeed')}</span><b data-tel-vmax>0 km/h</b></div><div class="br-tel-row"><span>${t('replay.avgSpeed')}</span><b data-tel-vavg>0 km/h</b></div><div class="br-tel-row"><span>${t('replay.acceleration')}</span><b data-tel-accel>0 km/h/s</b></div><div class="br-tel-row"><span>${t('replay.turnRate')}</span><b data-tel-yaw>0°/s</b></div></div><div class="br-tel-card"><div class="br-tel-label">${t('replay.racingLine')}</div><div class="br-tel-row"><span>${t('replay.heading')}</span><b data-tel-heading>0°</b></div><div class="br-tel-row"><span>${t('replay.corner')}</span><b data-tel-turn>RECTA</b></div><div class="br-tel-row"><span>${t('replay.path')}</span><b data-tel-path>0%</b></div><div class="br-tel-row"><span>${t('replay.remaining')}</span><b data-tel-pathleft>100%</b></div><div class="br-tel-row"><span>${t('replay.sample')}</span><b data-tel-pos>0 / 0</b></div></div></aside></div><div class="br-playerbar" data-playerbar><div class="br-playerbar__timeline"><input class="br-playerbar__seek" data-player-seek type="range" min="0" max="${Math.max(1,Math.round(Number(ghost.lapMs)||1))}" step="1" value="0"><span class="br-playerbar__time" data-player-time>0:00.000</span></div><div class="br-playerbar__buttons"><button type="button" class="br-playerbar__btn" data-player-start title="${t('replay.start')}">↶</button><button type="button" class="br-playerbar__btn" data-player-prev title="${t('replay.stepBack')}">◀◀</button><button type="button" class="br-playerbar__btn br-playerbar__main" data-player-play title="${t('replay.play')}" aria-label="${t('replay.play')}" disabled><span class="br-playerbar__glyph br-playerbar__glyph--play" data-player-glyph>▷</span></button><button type="button" class="br-playerbar__btn" data-player-next title="${t('replay.stepForward')}">▶▶</button><button type="button" class="br-playerbar__btn br-playerbar__speed" data-player-speed title="${t('replay.speed')}">1×</button><button type="button" class="br-playerbar__btn br-playerbar__analysis" data-player-analysis title="${t('replay.racingLine')}">⌁</button></div></div></section>`;
    this._root.appendChild(modal);
    modal.querySelector('[data-br-modal-close]')?.addEventListener('click',()=>this._closeReplayModal());
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({version:3,source:'race-control-modal',embedded:true,returnTrackId:trackId,trackId,carId,lapMs:Number(ghost.lapMs)||0,recordedAt:Number(ghost.recordedAt)||0,samples:ghost.samples,cameraSamples:Array.isArray(ghost.cameraSamples)?ghost.cameraSamples:[],viewport:ghost.viewport||null}));}catch{this._closeReplayModal();return;}
    const reveal=()=>{const rs=this._raceReplayState();if(!rs)return;rs.elapsed=0;rs.playing=false;rs.finished=false;try{this.scene?.get?.('race')?._seekStatsReplay?.(0,true);}catch{}const play=this._root?.querySelector('[data-player-play]');if(play){play.disabled=false;play.title=t('replay.play');play.setAttribute('aria-label',t('replay.play'));const g=play.querySelector('[data-player-glyph]');if(g){g.textContent='▷';g.classList.add('br-playerbar__glyph--play');}}this._root?.querySelector('[data-br-native-loading]')?.remove?.();window.removeEventListener('tdr:embedded-replay-ready',reveal);};window.addEventListener('tdr:embedded-replay-ready',reveal,{once:true});const launch=()=>{if(!this._root?.querySelector('[data-br-replay-modal]'))return;try{this.scene.launch('race',{trackKey:trackId,carId,statsNativeReplay:true,statsEmbeddedReplay:true});this.scene.bringToTop?.(this.scene.key);const keepOwner=()=>{if(!this._root?.querySelector('[data-br-replay-modal]'))return;try{this.scene.bringToTop?.(this.scene.key);}catch{}const rs=this.scene?.get?.('race');if(rs?._tdrStatsReplay)return;this.time?.delayedCall?.(16,keepOwner);};keepOwner();}catch(err){const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent=t('replay.openFailed');console.error('[race-control] modal replay launch failed',err);}};
    try{const ensure=window.__tdrEnsureScene;if(typeof ensure==='function')Promise.resolve(ensure('race')).then(ok=>{if(ok)launch();else{const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent=t('replay.raceLoadFailed');}});else launch();}catch{launch();}
    // Telemetry is descriptive only; it must not simulate playback while the real
    // RaceScene is still loading. The ticker will remain at frame zero until
    // _tdrStatsReplay exists, then follow the actual replay state.
    this._startReplayTelemetry(ghost);
    this._bindPlayerBar(ghost);
  }

  _raceReplayState(){try{return this.scene?.get?.('race')?._tdrStatsReplay||null;}catch{return null;}}

  _bindPlayerBar(ghost){
    const bar=this._root?.querySelector('[data-playerbar]');if(!bar)return;
    const race=()=>this.scene.get('race');
    const seek=(ms)=>{const v=Math.max(0,Math.min(Number(ghost?.lapMs)||0,Number(ms)||0));try{race()?._seekStatsReplay?.(v,true);}catch{}const s=this._raceReplayState();if(s){s.elapsed=v;s.finished=v>=Number(ghost?.lapMs||0)-1;}};
    bar.querySelector('[data-player-start]')?.addEventListener('click',()=>seek(0));
    bar.querySelector('[data-player-prev]')?.addEventListener('click',()=>{try{race()?._stepStatsReplaySample?.(-1);}catch{}});
    bar.querySelector('[data-player-next]')?.addEventListener('click',()=>{try{race()?._stepStatsReplaySample?.(1);}catch{}});
    bar.querySelector('[data-player-play]')?.addEventListener('click',()=>{const s=this._raceReplayState();if(!s)return;if(s.finished||Number(s.elapsed)>=Number(ghost?.lapMs||0)-1){seek(0);s.finished=false;s.playing=true;}else s.playing=!s.playing;});
    bar.querySelector('[data-player-seek]')?.addEventListener('input',e=>seek(e.target.value));
    bar.querySelector('[data-player-speed]')?.addEventListener('click',e=>{const s=this._raceReplayState();if(!s)return;const speeds=[.25,.5,1,2],cur=Number(s.speed)||1,next=speeds[(speeds.indexOf(cur)+1)%speeds.length];s.speed=next;e.currentTarget.textContent=next+'×';});
    bar.querySelector('[data-player-analysis]')?.addEventListener('click',e=>{this._tdrReplayAnalysisEnabled=this._tdrReplayAnalysisEnabled===false;e.currentTarget.textContent=this._tdrReplayAnalysisEnabled?'⌁':'○';e.currentTarget.title=this._tdrReplayAnalysisEnabled?t('replay.hideLine'):t('replay.showLine');});
  }

  _startReplayTelemetry(ghost){
    this._stopReplayTelemetry();
    const samples=ghost?.samples||[],lap=Math.max(1,Number(ghost?.lapMs)||Number(samples.at(-1)?.t)||1);
    let maxSpeed=1,totalDistance=0,speedSum=0,speedCount=0;const cumulative=[0];for(let i=1;i<samples.length;i++){const a=samples[i-1],b=samples[i],d=Math.hypot(Number(b.x)-Number(a.x),Number(b.y)-Number(a.y)),dt=(Number(b.t)-Number(a.t))/1000;totalDistance+=Number.isFinite(d)?d:0;cumulative[i]=totalDistance;if(dt>0&&Number.isFinite(d)){const sv=d/dt;maxSpeed=Math.max(maxSpeed,sv);speedSum+=sv;speedCount++;}}
    const avgSpeed=speedCount?speedSum/speedCount:0,avgDt=samples.length>1?lap/(samples.length-1):0,hz=avgDt>0?Math.round(1000/avgDt):0;
    let last=performance.now(),elapsed=0,finished=false;
    const tick=now=>{const root=this._root?.querySelector('[data-br-telemetry]');if(!root)return;const dt=Math.min(80,now-last);last=now;const replayState=this._raceReplayState(),ready=!!replayState;if(replayState){elapsed=Math.max(0,Math.min(lap,Number(replayState.elapsed)||0));finished=!!replayState.finished;}else{elapsed=0;finished=false;}let i=1;while(i<samples.length&&Number(samples[i]?.t)<elapsed)i++;const a=samples[Math.max(0,i-1)]||samples[0],b=samples[Math.min(samples.length-1,i)]||a,span=Math.max(1,Number(b?.t)-Number(a?.t)),q=Math.max(0,Math.min(1,(elapsed-Number(a?.t||0))/span));const x=Number(a?.x)+(Number(b?.x)-Number(a?.x))*q,y=Number(a?.y)+(Number(b?.y)-Number(a?.y))*q;const prev=samples[Math.max(0,i-2)]||a,next=samples[Math.min(samples.length-1,i+1)]||b,wdt=Math.max(1,Number(next?.t)-Number(prev?.t))/1000,vx=(Number(next?.x)-Number(prev?.x))/wdt,vy=(Number(next?.y)-Number(prev?.y))/wdt,speed=Math.hypot(vx,vy),kmh=pxpsToKmh(speed),pace=Math.min(100,Math.round(speed/maxSpeed*100)),r=Number(a?.r)||0,forward=vx*Math.cos(r)+vy*Math.sin(r),lateral=-vx*Math.sin(r)+vy*Math.cos(r),scale=Math.max(1,speed);const lat=Math.max(-1.8,Math.min(1.8,lateral/scale*1.6)),lon=Math.max(-1.8,Math.min(1.8,(forward-speed)/scale*1.6));const prev2=samples[Math.max(0,i-3)]||prev,prevDt=Math.max(1,Number(a?.t)-Number(prev2?.t))/1000,prevSpeed=Math.hypot(Number(a?.x)-Number(prev2?.x),Number(a?.y)-Number(prev2?.y))/prevDt,accel=(kmh-pxpsToKmh(prevSpeed))/Math.max(.05,wdt),dr=((Number(next?.r)||r)-(Number(prev?.r)||r));const wrappedDr=Math.atan2(Math.sin(dr),Math.cos(dr)),yaw=wrappedDr/(wdt||1)*180/Math.PI,pathPct=totalDistance>0?Math.max(0,Math.min(100,(Number(cumulative[Math.max(0,i-1)])||0)/totalDistance*100)):elapsed/lap*100,turn=Math.abs(yaw)<8?t('replay.straight'):(yaw>0?t('replay.right'):t('replay.left'));const set=(s,v)=>{const e=root.querySelector(s);if(e)e.textContent=v;};set('[data-tel-time]',fmt(elapsed));set('[data-tel-remaining]',fmt(Math.max(0,lap-elapsed)));set('[data-tel-progress]',Math.round(elapsed/lap*100)+'%');set('[data-tel-speed]',Math.round(kmh));set('[data-tel-vmax]',Math.round(pxpsToKmh(maxSpeed))+' km/h');set('[data-tel-vavg]',Math.round(pxpsToKmh(avgSpeed))+' km/h');set('[data-tel-accel]',(accel>=0?'+':'')+accel.toFixed(1)+' km/h/s');set('[data-tel-yaw]',Math.round(Math.abs(yaw))+'°/s');set('[data-tel-hz]',hz?hz+' Hz':'—');set('[data-tel-sector]','S'+Math.min(3,Math.floor(elapsed/lap*3)+1));set('[data-tel-pos]',Math.min(samples.length,i+1)+' / '+samples.length);set('[data-tel-heading]',Math.round(((r*180/Math.PI)%360+360)%360)+'°');set('[data-tel-turn]',turn);set('[data-tel-path]',Math.round(pathPct)+'%');set('[data-tel-pathleft]',Math.round(100-pathPct)+'%');const bar=root.querySelector('[data-tel-speedbar]');if(bar)bar.style.width=pace+'%';const pb=this._root?.querySelector('[data-playerbar]');if(pb){const ps=pb.querySelector('[data-player-seek]'),pt=pb.querySelector('[data-player-time]'),pp=pb.querySelector('[data-player-play]');if(ps)ps.value=String(Math.round(elapsed));if(pt)pt.textContent=fmt(elapsed);if(pp){pp.disabled=!ready;const st=!ready?'play':(finished?'repeat':(replayState?.playing===false?'play':'pause')),g=pp.querySelector('[data-player-glyph]');if(g){g.textContent=st==='repeat'?'↻':(st==='play'?'▷':'Ⅱ');g.classList.toggle('br-playerbar__glyph--play',st==='play');}pp.title=finished?t('replay.repeat'):(st==='play'?t('replay.play'):t('replay.pause'));pp.setAttribute('aria-label',pp.title);}}this._tdrReplayTelemetryRaf=requestAnimationFrame(tick);};
    this._tdrReplayTelemetryRaf=requestAnimationFrame(tick);
  }
  _stopReplayTelemetry(){if(this._tdrReplayTelemetryRaf)cancelAnimationFrame(this._tdrReplayTelemetryRaf);this._tdrReplayTelemetryRaf=0;}

  _closeReplayModal(){
    this._stopReplayTelemetry();
    try{if(this.scene?.isActive?.('race'))this.scene.stop('race');}catch{}
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
    try{this._root?.querySelector('[data-br-replay-modal]')?.remove?.();}catch{}
    this._purgeReplayResidue();
  }

  _showRaceControlReplay(record,ghost){
    // Legacy inline replay retired: every replay (local or online) uses the same modal player.
    return this._showRaceControlReplayModal(record,ghost,t('replay.localReplay'));
    /* legacy inline path
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
        if(loading)loading.textContent=t('replay.openFailed');
        console.error('[race-control] embedded replay launch failed',err);
      }
    };
    try{
      const ensure=window.__tdrEnsureScene;
      if(typeof ensure==='function'){
        Promise.resolve(ensure('race')).then(ok=>{if(ok)launch();else{const loading=this._root?.querySelector('[data-br-native-loading]');if(loading)loading.textContent=t('replay.raceLoadFailed');}});
      }else launch();
    }catch{launch();}
  }

    */
  }

  _stopRaceControlReplay(){
    super._stopRaceControlReplay?.();
    this._closeReplayModal();
    this._purgeReplayResidue();
  }

  _purgeReplayResidue(){
    try{document.querySelectorAll('#tdr-replay-controls,[data-tdr-stats-native-replay="1"],[data-tdr-embedded-replay="1"]').forEach(n=>n.remove());}catch{}
    try{document.body.classList.remove('tdr-native-replay-clean');}catch{}
    try{const parent=this.game?.canvas?.parentElement;parent?.removeAttribute?.('data-tdr-native-replay');}catch{}
    try{sessionStorage.removeItem(SESSION_KEY);}catch{}
  }
}

// DEV 1.1.113 validation trigger: replay player copy uses i18n keys.

// DEV 1.1.136 validation trigger: leaderboard replay and VS share one session-memory ghost cache.

// DEV 1.1.136 final trigger after workflow verifier correction.

// DEV 1.1.136 deployment trigger after complete verifier bump.

// DEV 1.1.137 validation trigger: Race Control VS invokes rewarded provider before ghost unlock.

// DEV 1.1.139 validation trigger: replay telemetry waits for the real RaceScene and replay opening owns scene teardown.

// DEV 1.1.140 validation trigger: VS cleans replay UI without stopping the race scene before online Ghost handoff.
