import {getEquippedCarSkin} from '../skins/carSkins.js';
import {goToPlayerGarageWithLift} from './LobbyGarageLiftTransition.js';
import {skinGeometry} from '../skins/skinGeometry.js';
import {selectedCarSkinFile,hasAlternativeSkins} from '../skins/carSkins.js';
import { loadGarage } from '../garage/garageStore.js';
import { CAR_SPECS } from '../cars/carSpecs.js';
import { resolveCarParams } from '../cars/resolveCarParams.js';
import { attainableTopSpeedKmh, METERS_PER_PX } from '../cars/speedUnits.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';
import { trackDisplayDirection } from '../tracks/trackDisplayDirection.js';
import { getCurrentRaceEvent, claimCurrentRaceEvent, raceEventRewardLabel } from '../events/raceEvents.js';
import { getLanguage, t } from '../i18n/index.js';
import { getPilotProfile } from '../social/pilotProfile.js';
import { cloudIdentity, shortPlayerId } from '../social/cloudProgress.js';
import {getMyRaceControlBadge} from '../online/raceControlOnline.js';

import { IS_PROD_BUILD } from '../buildTarget.js';
import {createAppWallet,disposeAppWallets} from './TdrAppHeader.js';
import {dailyStatus,rewardedStatus,DAILY_COIN_COOLDOWN_MS,REWARDED_COIN_COOLDOWN_MS} from '../store/storeEconomy.js';
import './lobby-dom.css';

const BASE = import.meta.env.BASE_URL || '/';
const asset = (name) => `${BASE}assets/ui/lobby/${name}`;
const CAR_BRANDS = new Set(['avenir', 'crown', 'forge', 'helix', 'veloce']);
const COMPACT_CAR_BRANDS = new Set(['avenir', 'helix', 'veloce']);
const tr = (key, params = null) => t(key, params);
const pad2=n=>String(Math.max(0,Math.floor(n))).padStart(2,'0');
function nextMonthStart(now=new Date()){return new Date(now.getFullYear(),now.getMonth()+1,1,0,0,0,0);}
function seasonCountdownLabel(){const ms=Math.max(0,nextMonthStart().getTime()-Date.now()),s=Math.ceil(ms/1000),d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;return `${d}D · ${pad2(h)}:${pad2(m)}:${pad2(sec)}`;}

function disableTree(node) { if (!node) return; try { node.disableInteractive?.(); } catch {} if (Array.isArray(node.list)) node.list.forEach(disableTree); }
function hideLegacyLobbyControls(scene) {
  if (scene._topLobbyHeader) { disableTree(scene._topLobbyHeader); scene._topLobbyHeader.setVisible(false); }
  const hiddenKeys = new Set(['btn_play', 'btn_garage', 'btn_factory', 'btn_tracks']);
  const legacyCardLabels = ['COCHE SELECCIONADO', 'CIRCUITO SELECCIONADO', 'SELECTED CAR', 'SELECTED TRACK'];
  const legacyCards = new Set();
  const walk = (node) => { if (!node) return; if (hiddenKeys.has(String(node?.texture?.key || ''))) { try { node.setVisible(false); } catch {} try { node.disableInteractive?.(); } catch {} } if (typeof node?.text === 'string') { const text = node.text.trim().toUpperCase(); if (legacyCardLabels.includes(text) || /^EVENTO(?:\s|$)/.test(text) || /^EVENT(?:\s|$)/.test(text) || text === 'TEMPORADA COMPLETADA' || text === 'SEASON COMPLETE') { if (node.parentContainer && node.parentContainer !== scene._ui) legacyCards.add(node.parentContainer); } } if (Array.isArray(node.list)) node.list.forEach(walk); };
  walk(scene._ui); legacyCards.forEach(card => { disableTree(card); try { card.setVisible(false); } catch {} });
}
const escapeHtml = value => String(value ?? '').replace(/[&<>\"]/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;' }[ch]));
function loopLength(center) { if (!Array.isArray(center) || center.length < 2) return 0; let total = 0; for (let i = 0; i < center.length; i++) { const a = center[i], b = center[(i + 1) % center.length]; total += Math.hypot(Number(b?.x || 0) - Number(a?.x || 0), Number(b?.y || 0) - Number(a?.y || 0)); } return total; }
function trackSvg(center) { if (!Array.isArray(center) || center.length < 2) return ''; const xs = center.map(p => Number(p?.x)).filter(Number.isFinite); const ys = center.map(p => Number(p?.y)).filter(Number.isFinite); if (!xs.length || !ys.length) return ''; const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys); const spanX = Math.max(1, maxX - minX), spanY = Math.max(1, maxY - minY); const scale = Math.min(150 / spanX, 82 / spanY); const ox = 90 - spanX * scale / 2, oy = 48 - spanY * scale / 2; const points = center.map(p => `${(ox + (Number(p.x) - minX) * scale).toFixed(1)},${(oy + (Number(p.y) - minY) * scale).toFixed(1)}`).join(' '); return `<svg viewBox="0 0 180 96"><polyline class="tdr-track-shadow" points="${points}"/><polyline class="tdr-track-line" points="${points}"/></svg>`; }

function renderDomCards(scene, root) {
  const eventSlot = root.querySelector('[data-event-card]'); const carSlot = root.querySelector('[data-car-card]'); const trackSlot = root.querySelector('[data-track-card]');
  const eventData = getCurrentRaceEvent();
  if (eventSlot) {
    eventSlot.classList.toggle('tdr-cuper-mileage-active',eventData.gated===true);
    const en=getLanguage()==='en';
    if(eventData.gated){
      const km=Math.max(0,Number(eventData.mileageMeters)||0)/1000,goal=Math.max(1,Number(eventData.requiredMeters)||500000)/1000;
      const ratio=Math.min(100,Math.max(0,km/goal*100)),remaining=Math.max(0,goal-km);
      eventSlot.innerHTML=`<div class="tdr-card-kicker">${en?'NEXT SEASON · 500 KM':'PRÓXIMA TEMPORADA · 500 KM'}</div><h2>CROWN CUPER 🔒</h2><p>${en?'Drive your AVENIR GRIPLINE to unlock':'Conduce tu AVENIR GRIPLINE para desbloquearla'}</p><strong class="tdr-cuper-mileage-value">${km.toFixed(1)}<span> / ${goal.toFixed(0)} km</span></strong><div class="tdr-event-progress tdr-cuper-mileage-progress" role="progressbar" aria-label="${en?'Gripline kilometers toward Cuper':'Kilómetros del Gripline para desbloquear Cuper'}" aria-valuemin="0" aria-valuemax="${goal.toFixed(0)}" aria-valuenow="${Math.min(km,goal).toFixed(1)}"><i style="width:${ratio.toFixed(2)}%"></i></div><strong class="tdr-cuper-mileage-remaining">${en?'ONLY '+remaining.toFixed(1)+' KM TO GO':'FALTAN '+remaining.toFixed(1)+' KM'}</strong><div class="tdr-season-next">${en?'Real lifetime mileage · never resets':'Kilometraje real acumulado · no se reinicia'}</div>`;
    }else if(eventData.finished){
      const km=Math.max(0,Number(eventData.mileageMeters)||0)/1000;
      eventSlot.innerHTML=eventData.family==='cuper'
        ?`<div class="tdr-card-kicker">${en?'CAMPAIGN COMPLETE':'TEMPORADA COMPLETADA'}</div><h2>CROWN CUPER · GOLD</h2><p>${en?'Gold Edition unlocked':'Edición dorada desbloqueada'}</p><div class="tdr-season-next">${en?'Cuper mastery':'Dominio del Cuper'}: ${km.toFixed(1)} / 500 km</div>`
        :`<div class="tdr-card-kicker">${tr('lobby.seasonComplete')}</div><h2>${tr('lobby.completeDriver')}</h2><p>${tr('lobby.inductionComplete')}</p>`;
    }else{
      const {event,progress}=eventData,ratio=Math.max(0,Math.min(100,(Number(progress.value)/Math.max(1,Number(progress.target)))*100));
      const seasonName=eventData.family==='cuper'?'CROWN CUPER':(en?'INDUCTION':'INDUCCIÓN');
      eventSlot.innerHTML=`<div class="tdr-card-kicker">${seasonName} · ${eventData.index+1}/${eventData.total}</div><h2>${escapeHtml(event.title)}</h2><p>${escapeHtml(event.description).toUpperCase()}</p><div class="tdr-event-reward">${tr('lobby.reward',{reward:escapeHtml(raceEventRewardLabel(event.reward))})}</div><div class="tdr-event-progress"><i style="width:${ratio.toFixed(2)}%"></i></div>${progress.complete?`<button type="button" class="tdr-event-claim">${tr('lobby.claimReward')}</button>`:`<strong>${progress.value}/${progress.target} ${escapeHtml(progress.label)}</strong>`}`;
      eventSlot.querySelector('.tdr-event-claim')?.addEventListener('click',()=>{
        const result=claimCurrentRaceEvent();if(result?.ok){scene._showEventRewardModal?.(result.event);renderDomCards(scene,root);}
      });
    }
  }
  const carId = scene.selectedCarId; const spec = CAR_SPECS?.[carId] || {}; const params = resolveCarParams(spec, { accelMult:1, brakeMult:1, dragMult:1, turnRateMult:1, maxFwdAdd:0, maxRevAdd:0, turnMinAdd:0 }); const topKmh = Math.round(attainableTopSpeedKmh(params)); const brandKey = String(carId || '').split('_')[0].toLowerCase(); const brandLogoName = COMPACT_CAR_BRANDS.has(brandKey) ? `logo_${brandKey}_compact.webp` : `logo_${brandKey}.webp`; const brandMark = CAR_BRANDS.has(brandKey) ? `<img src="${BASE}assets/logos/${brandLogoName}" alt="${escapeHtml(spec.brand || brandKey)}" draggable="false">` : escapeHtml(spec.brand || 'TDR');
  if (carSlot) carSlot.innerHTML = `<div class="tdr-card-kicker">${tr('lobby.selectedCar')}</div><div class="tdr-car-card-row"><span class="tdr-car-brand tdr-car-brand--${escapeHtml(brandKey)}">${brandMark}</span><span><h2>${escapeHtml(params?.name || spec.name || carId)}</h2><strong>${topKmh} km/h</strong></span><em>${escapeHtml(spec.category || spec.role || 'RACING')}</em></div>`;
  const carPreview = root.querySelector('[data-lobby-car]'); if (carPreview) { const assetVersion = encodeURIComponent(spec.collectionNo || 1); carPreview.decoding = 'async'; carPreview.src = hasAlternativeSkins(carId) ? `${BASE}assets/skins/${encodeURIComponent(selectedCarSkinFile(carId,spec,{dev:!IS_PROD_BUILD}))}?v=${assetVersion}` : `${BASE}assets/cars/lobby/${encodeURIComponent(carId)}.webp?v=${assetVersion}`; carPreview.alt = params?.name || spec.name || carId;
 if(hasAlternativeSkins(carId)){
   const picked=getEquippedCarSkin(carId,{spec,dev:!IS_PROD_BUILD});
   const v=skinGeometry(carId,picked.id);
   carPreview.style.translate=`${v.x*100}% ${v.y*100}%`;
   carPreview.style.scale=String(1+v.scale);
   carPreview.style.rotate=`${v.rotation}deg`;
 }else{
   carPreview.style.translate='';carPreview.style.scale='';carPreview.style.rotate='';
 }
 }
  const trackKey = scene.selectedTrackKey || 'track01'; const track = TRACK_REGISTRY?.[trackKey]; const center = Array.isArray(track?.raceCenterline) && track.raceCenterline.length ? track.raceCenterline : track?.centerline;
  if (trackSlot && track) { const id = String(track.id || track.key || '').toLowerCase(); const category = String(track.category || '').toLowerCase(); const surface = id.includes('offroad') || category.includes('dirt') || category.includes('tierra') ? tr('lobby.dirt') : tr('lobby.asphalt'); const directionKey=trackDisplayDirection(track); const direction=directionKey==='stage'?tr('lobby.pointToPoint'):directionKey==='counterclockwise'?tr('lobby.counterclockwise'):directionKey==='clockwise'?tr('lobby.clockwise'):'—'; const length = Math.round(loopLength(center) * METERS_PER_PX); const sectors = Math.max(1, (track.checkpoints?.length || 2) + 1); trackSlot.innerHTML = `<div class="tdr-card-kicker">${tr('lobby.selectedTrack')}</div><h2>${escapeHtml(track.name || trackKey)}</h2><div class="tdr-track-map">${trackSvg(center)}</div><div class="tdr-track-stats"><span><small>${tr('lobby.length')}</small><strong>${length} m</strong></span><span><small>${tr('lobby.sectors')}</small><strong>${sectors}</strong></span><span><small>${tr('lobby.surface')}</small><strong>${surface}</strong></span><span><small>${tr('lobby.direction')}</small><strong>${direction}</strong></span></div>`; }
}
// Lobby cards are navigation shortcuts only. The Store remains the single
// authority for ad verification, reward eligibility, claim and coin animation.
// Each reward uses two perfectly aligned ink layers. The filled layer is
// clipped to the same horizontal waterline as the colored fill so EVERY glyph
// stays high contrast, even when the fill crosses the middle of a number.
function createRewardFace(video,filled=false){
  const face=document.createElement('span');
  face.className='tdr-lobby-reward-face'+(filled?' tdr-lobby-reward-face--filled':'');
  if(filled)face.setAttribute('aria-hidden','true');
  const copy=document.createElement('span');copy.className='tdr-lobby-reward-copy';
  const total=document.createElement('strong');total.textContent=video?'+100':'+250';
  const status=document.createElement('small');status.dataset.rewardStatus='1';
  copy.append(total,status);face.append(copy);return face;
}
function makeRewardShortcut(kind,scene){
  const video=kind==='video',button=document.createElement('button');
  button.type='button';
  button.className='tdr-lobby-reward-cta '+(video?'tdr-lobby-reward-cta--video':'tdr-lobby-reward-cta--daily');
  button.dataset.lobbyRewardCta=kind;
  button.style.setProperty('--tdr-reward-progress','0%');
  button.style.setProperty('--tdr-reward-empty','100%');
  // One original, full-color icon never enters the clipped ink layers.
  const icon=document.createElement('img');
  icon.className='tdr-lobby-reward-icon';
  icon.src=`${BASE}assets/store/${video?'rewarded_video':'daily_gift'}.webp`;
  icon.alt='';icon.draggable=false;icon.decoding='async';
  button.append(icon,createRewardFace(video),createRewardFace(video,true));
  // Render the glow OUTSIDE the clipped bevel; preserve the original button and hit area.
  const slot=document.createElement('span');
  slot.className='tdr-lobby-reward-slot '+(video?'tdr-lobby-reward-slot--video':'tdr-lobby-reward-slot--daily');
  const halo=document.createElement('span');
  halo.className='tdr-lobby-reward-halo';
  halo.setAttribute('aria-hidden','true');
  const shape=document.createElement('span');
  shape.className='tdr-lobby-reward-halo-shape';
  halo.append(shape);
  // Blur on the parent of the clipped shape so the light is not clipped.
  slot.append(halo,button);
  // This remains navigation to the existing store rewards route.
  button.addEventListener('click',()=>scene._openStoreModal?.('rewards'));
  return slot;
}
const ctaCountdown=ms=>{
  const secs=Math.max(0,Math.ceil(Number(ms)||0)/1000);
  const hours=Math.floor(secs/3600),mins=Math.floor((secs%3600)/60);
  return `${pad2(hours)}:${pad2(mins)}`;
};
function updateLobbyRewardShortcuts(root){
  if(!root?.isConnected)return;
  const en=getLanguage()==='en';
  for(const kind of ['daily','video']){
    const button=root.querySelector(`[data-lobby-reward-cta="${kind}"]`);
    if(!button)continue;
    const status=kind==='daily'?dailyStatus():rewardedStatus();
    const ready=Boolean(status.available);
    const duration=kind==='daily'?DAILY_COIN_COOLDOWN_MS:REWARDED_COIN_COOLDOWN_MS;
    const remaining=Math.max(0,Number(status.remaining)||0);
    const progress=ready?1:Math.max(0,Math.min(1,1-remaining/duration));
    // CSS fill rises from the bottom; the second ink layer rises at the
    // EXACT same boundary and changes the text to dark over bright fill.
    button.style.setProperty('--tdr-reward-progress',`${(progress*100).toFixed(4)}%`);
    button.style.setProperty('--tdr-reward-empty',`${((1-progress)*100).toFixed(4)}%`);
    const label=kind==='daily'?(en?'Daily gift':'Regalo diario'):(en?'Rewarded video':'Vídeo recompensado');
    const caption=ready?(kind==='daily'?(en?'CLAIM':'RECOGER'):(en?'WATCH':'VER')):(kind==='daily'?(en?'GIFT':'REGALO'):(en?'VIDEO':'VÍDEO'));
    button.classList.toggle('is-ready',ready);
    button.classList.toggle('is-cooling',!ready);
    // The persisted economy eligibility also controls the external outline.
    button.parentElement?.classList.toggle('is-ready',ready);
    button.parentElement?.classList.toggle('is-cooling',!ready);
    button.querySelectorAll('[data-reward-status]').forEach(node=>{
      if(node.textContent!==caption)node.textContent=caption;
    });
    const exact=ready?caption:`${en?'Ready in':'Disponible en'} ${ctaCountdown(remaining)}`;
    button.setAttribute('aria-label',`${label}: +${kind==='daily'?250:100} ${en?'coins':'monedas'}. ${exact}`);
    button.title=button.getAttribute('aria-label');
  }
}
function makeButton({ cls = '', icon, label, action }) { const button = document.createElement('button'); button.type = 'button'; button.className = `tdr-lobby-button ${cls}`.trim(); button.innerHTML = `<img src="${asset(icon)}" alt="" draggable="false"><span>${label}</span>`; button.addEventListener('click', action); return button; }
// Direct Race Control entry from the lobby: the existing StatsScene already
// supports raceControlTrackId and opens the leaderboard without a nested tap.
function makeStatisticsShortcut(scene){
 const button=document.createElement('button');button.type='button';
 button.className='tdr-lobby-button tdr-lobby-button--statistics';
 button.dataset.lobbyStatistics='1';
 button.innerHTML=`<span class="tdr-lobby-button-glyph" aria-hidden="true">▥</span><span>${tr('lobby.statistics')}</span>`;
 button.addEventListener('click',()=>scene.scene.start('StatsScene',{statsView:'overview'}));
 return button;
}
function makeOnlineRecordsShortcut(scene){
  const button=document.createElement('button');
  button.type='button';
  button.className='tdr-lobby-button tdr-lobby-button--records';
  button.dataset.lobbyOnlineRecords='1';
  button.innerHTML=`<svg class="tdr-lobby-records-emblem" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4h14v9c0 6-3.2 9-7 9s-7-3-7-9V4z"/><path d="M9 7H5v4c0 5 3 7 7 7M23 7h4v4c0 5-3 7-7 7M16 22v5m-6 2h12m-10-2h8"/><path d="m16 8 1.4 2.8 3.1.5-2.3 2.2.6 3.1-2.8-1.5-2.8 1.5.6-3.1-2.3-2.2 3.1-.5L16 8z" stroke-width="1.4"/></svg><span>${tr('lobby.onlineRecords')}</span>`;
  button.addEventListener('click',()=>scene.scene.start('StatsScene',{
    raceControlTrackId:scene.selectedTrackKey||'track01',
    onlineFromLobby:true
  }));
  return button;
}
function startRaceFlow(scene) { if (typeof scene._openGameModeModal === 'function') { scene._openGameModeModal(); return; } const carId = scene.selectedCarId; const trackKey = scene.selectedTrackKey || 'track01'; try { localStorage.setItem('tdr2:carId', carId); localStorage.setItem('tdr2:trackKey', trackKey); } catch {} scene.scene.start('race', { carId, trackKey }); }

export function installLobbyDom(scene) {
  hideLegacyLobbyControls(scene); let root = scene._lobbyDomRoot;
  if (!root?.isConnected) {
    const host = scene.game?.canvas?.parentElement || document.getElementById('app') || document.body; host.classList.add('tdr-lobby-host'); root = document.createElement('div'); root.className = 'tdr-lobby-dom';
    root.style.backgroundImage = `url("${BASE}assets/ui/lobby/lobby_background_topdown_garage.webp")`; root.style.backgroundSize='cover'; root.style.backgroundPosition='center'; root.style.backgroundRepeat='no-repeat'; root.innerHTML = `<header class="tdr-lobby-header"><button type="button" class="tdr-lobby-brand" aria-label="Top Down Race"><img src="${BASE}assets/logo.webp" alt="Top Down Race" draggable="false"></button><div class="tdr-lobby-wallet"><img src="${BASE}assets/ui/moneda-tdr.webp" alt="" draggable="false"><span><small>${tr('lobby.coins')}</small><strong data-coins>0</strong></span></div><div data-pilot-header style="min-width:96px;max-width:180px;display:grid;gap:2px;padding:3px 8px;border-left:1px solid rgba(70,221,255,.18);border-right:1px solid rgba(70,221,255,.18);line-height:1;overflow:hidden"><small style="color:#7f94a6;font-size:8px;font-weight:900;letter-spacing:.16em">${tr('lobby.driver')}</small><strong data-pilot-header-name style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#65eaff;font-size:clamp(11px,1.05vw,16px);font-weight:950;letter-spacing:.05em">—</strong><button type="button" data-cloud-account style="padding:0;border:0;background:none;text-align:left;color:#8eabb9;font:700 9px system-ui;cursor:pointer;touch-action:manipulation" title="Cuenta y copia de seguridad">ID · … ☁</button></div><nav class="tdr-lobby-top-actions"></nav></header><img class="tdr-lobby-car-platform" src="${BASE}assets/ui/lobby/car_platform.webp" alt="" aria-hidden="true" draggable="false"><img class="tdr-lobby-car-preview" data-lobby-car alt="" draggable="false"><main class="tdr-lobby-cards"><section class="tdr-lobby-card tdr-event-card" data-event-card></section><section class="tdr-lobby-card tdr-car-card" data-car-card></section><section class="tdr-lobby-card tdr-track-card" data-track-card></section></main><div class="tdr-lobby-play-slot"></div><nav class="tdr-lobby-bottom-actions"></nav>`;
    const header=root.querySelector('.tdr-lobby-header');header?.classList.add('tdr-app-header');if(header)header.dataset.tdrAppHeader='1';root.querySelector('.tdr-lobby-wallet')?.remove();header?.append(createAppWallet({className:'tdr-lobby-wallet',amountAttribute:'coins',label:tr('lobby.coins')}));host.appendChild(root); scene._lobbyDomRoot = root;
    const top = root.querySelector('.tdr-lobby-top-actions'); top.append(makeButton({ cls:'tdr-lobby-button--gold', icon:'icon_inventory.webp', label:tr('lobby.inventory'), action:()=>scene._openLobbyInventoryModal?.('materials') }), makeButton({ cls:'tdr-lobby-button--purple', icon:'icon_store.webp', label:tr('lobby.store'), action:()=>scene._openStoreModal?.('materials') }), makeButton({ icon:'icon_settings.webp', label:tr('lobby.settings'), action:()=>scene.scene.start('SettingsScene') }));
    const play = document.createElement('button'); play.type='button'; play.className='tdr-lobby-play'; play.innerHTML=`<span class="tdr-lobby-play-triangle">▶</span><span>${getLanguage()==='en'?'PLAY':'JUGAR'}</span>`; play.addEventListener('click',()=>startRaceFlow(scene));
    const lane=root.querySelector('.tdr-lobby-play-slot');
    lane?.classList.add('tdr-lobby-action-capsule');
    lane?.append(makeRewardShortcut('daily',scene),play,makeRewardShortcut('video',scene));
    // Only LobbyDomUi owns the bottom navigation; polish must not replace it.
    const bottom=root.querySelector('.tdr-lobby-bottom-actions');
    bottom.append(
      makeStatisticsShortcut(scene),
      makeButton({icon:'icon_garage.webp',label:tr('lobby.garage'),action:()=>goToPlayerGarageWithLift(scene)}),
      makeButton({cls:'tdr-lobby-button--factory',icon:'icon_factory.webp',label:tr('lobby.factory'),action:()=>scene.scene.start('upgrade-shop')}),
      makeButton({cls:'tdr-lobby-button--gold',icon:'icon_tracks.webp',label:tr('lobby.tracks'),action:()=>scene.scene.start('TrackGarageScene',{mode:'player'})}),
      makeOnlineRecordsShortcut(scene)
    );
    if(!IS_PROD_BUILD){const brand=root.querySelector('.tdr-lobby-brand'); let adminTimer=0; const cancelAdmin=()=>{if(adminTimer)window.clearTimeout(adminTimer);adminTimer=0;}; brand.addEventListener('contextmenu',event=>event.preventDefault()); brand.addEventListener('dragstart',event=>event.preventDefault()); brand.addEventListener('pointerdown',event=>{event.preventDefault();cancelAdmin();adminTimer=window.setTimeout(()=>{const enabled=localStorage.getItem('tdr2:admin')==='1'?'0':'1';localStorage.setItem('tdr2:admin',enabled);if(enabled==='1')scene.scene.start('admin-hub');},700);}); ['pointerup','pointercancel','pointerleave'].forEach(name=>brand.addEventListener(name,cancelAdmin));}
    const syncPilot=()=>{const name=String(getPilotProfile()?.name||'').trim();const node=root.querySelector('[data-pilot-header-name]');if(node)node.textContent=name||'—';};
    window.addEventListener('tdr:pilotprofile',syncPilot);
    const accountButton=root.querySelector('[data-cloud-account]');
    const creatorBadge=document.createElement('span');
    creatorBadge.dataset.lobbyCreatorBadge='1';
    creatorBadge.textContent='✓ CREADOR';
    creatorBadge.title='Distintivo de creador confirmado por el servidor';
    creatorBadge.hidden=true;
    creatorBadge.style.cssText='display:none;white-space:nowrap;flex:0 0 auto;'+
      'padding:2px 5px;border:1px solid #a88338;border-radius:12px;'+
      'background:rgba(70,39,7,.85);color:#ffd478;font:900 8px system-ui;letter-spacing:.045em';
    // The lobby header has three height-constrained rows. A fourth badge row
    // was cropped by the header on iPhone landscape. Keep badge WITH the ID
    // inside row three; never grow the header or displace game shortcuts.
    const identityRow=document.createElement('div');
    identityRow.className='tdr-lobby-identity-row';
    accountButton?.parentNode?.insertBefore(identityRow,accountButton);
    if(accountButton)identityRow.append(accountButton,creatorBadge);
    const updateCloudId=async()=>{
      try{
        const {id}=await cloudIdentity();
        if(!root.isConnected)return;
        accountButton.textContent='ID · '+shortPlayerId(id)+' ☁';
        accountButton.title='ID: '+id+' · Cuenta y copia de seguridad';
        try{creatorBadge.hidden=(await getMyRaceControlBadge())!=='CREADOR';}
        catch{creatorBadge.hidden=true;}
        creatorBadge.style.display=creatorBadge.hidden?'none':'inline-flex';
      }catch{
        creatorBadge.hidden=true;creatorBadge.style.display='none';
        if(root.isConnected)accountButton.textContent='☁ SIN CONEXIÓN';
      }
    };
    // Keep the compact pilot ID in the lobby, but send account management to
    // the existing Settings > Cuenta tab. No duplicate full-screen manager.
    accountButton?.addEventListener('click',()=>{
      window.__tdrSettingsAccountRequested=true;
      scene.scene.start('SettingsScene');
    });
    updateCloudId();

    scene.events.once('shutdown',()=>{disposeAppWallets(root);try{window.removeEventListener('tdr:pilotprofile',syncPilot);}catch{}try{root.querySelectorAll('img').forEach(img=>{img.removeAttribute('src');img.src='';});}catch{}try{root.replaceChildren();}catch{}try{root.remove();}catch{}if(scene._lobbyDomRoot===root)scene._lobbyDomRoot=null;});
  }
  const syncLobbyHeader=()=>{const pilotNode=root.querySelector('[data-pilot-header-name]');if(pilotNode)pilotNode.textContent=String(getPilotProfile()?.name||'').trim()||'—';const countdown=root.querySelector('[data-season-countdown]');if(countdown)countdown.textContent=seasonCountdownLabel();updateLobbyRewardShortcuts(root);};
  syncLobbyHeader();
  if(!scene._lobbyCoinSyncTimer){scene._lobbyCoinSyncTimer=window.setInterval(syncLobbyHeader,1000);scene.events.once('shutdown',()=>{try{window.clearInterval(scene._lobbyCoinSyncTimer);}catch{}scene._lobbyCoinSyncTimer=null;});}
  renderDomCards(scene,root); return root;
}
