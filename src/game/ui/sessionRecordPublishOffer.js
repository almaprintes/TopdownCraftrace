import {sessionPersonalBest,localRecordGhost,fmtPersonalBest,RECORD_PUBLISH_DISCLOSURE} from './sessionPersonalBestPublish.js';
import {ghostReplayCompatibility} from '../tracks/ghostTrackCompatibility.js';
import {encodeOnlineGhostNative,encodeOnlineGhostNativeBinary} from '../online/onlineGhostCodec.js';
import {submitRaceControlRecordWithGhost,submitRaceControlRecordWithoutGhost,getRaceControlSnapshot,getMyRaceControlRecord} from '../online/raceControlOnline.js';
import {saveCloudSnapshot} from '../stats/localRaceRecords.js';
import {ensureRaceControlPilotProfile} from '../online/onlinePilotIdentity.js';
import {verifiedRecordPublishClaims as verifiedPublishClaims} from '../online/verifiedRecordPublishClaims.js';
import {getPilotProfile} from '../social/pilotProfile.js';
import {isRewardedAdAvailable,showRewardedAd} from '../monetization/RewardedAdsProvider.js';
import {isAdFreePromoActive} from '../monetization/adFreeNovember.js';
import {REWARDED_PLACEMENTS,raceControlPublishClaimId,verifiedReward,rewardActionAllowed} from '../monetization/rewardedActions.js';

// Preserve verified ad credits and successful publications while the player
// remains in this app session. Reopening the session report must not charge
// another voluntary ad for a transient network failure.

export function mountNewPersonalBestOffer(scene,root,report){
  const best=sessionPersonalBest(report,scene?._sessionPreviousPersonalBestMs);
  if(!best)return null;
  const doc=root?.ownerDocument||document;
  const page=root?.querySelector?.('[data-report-page="resumen"]');
  if(!page)return null;
  const trackId=String(scene?.trackKey||scene?.track?.key||scene?.track?.id||'').trim();
  const carId=String(report?.carId||scene?.carId||'').trim();
  // Dev editing and training previews may use temporary identities and
  // should never create global records under an unregistered circuit.
  const eligible=Boolean(trackId&&!scene?._testMode&&!trackId.startsWith('local-preview:'));
  const card=doc.createElement('section');
  card.className='tdr-session-pb-celebration';
  card.setAttribute('aria-label','Nuevo récord personal');
  card.style.cssText='background:linear-gradient(125deg,#153627,#101e2d);border:1px solid #4bd5a6;border-radius:16px;padding:12px 14px;margin:10px 0;box-shadow:0 0 18px rgba(44,197,153,.12)';
  card.innerHTML=`
    <div style="font-size:10px;color:#94f5ca;letter-spacing:.09em;font-weight:900">🏆 ¡ENHORABUENA! NUEVO RÉCORD PERSONAL</div>
    <div style="font:1000 clamp(23px,3.7vw,34px) system-ui;color:#fff;font-variant-numeric:tabular-nums;margin:5px 0">${fmtPersonalBest(best.lapMs)}</div>
    <div data-pb-improvement style="color:#b8d3ca;font-size:11px;font-weight:750">${best.improvementMs!=null?`¡Has mejorado ${(best.improvementMs/1000).toFixed(3)} s tu marca anterior!`:'¡Ya tienes tu primera marca personal en este circuito!'}</div>
    <div data-pb-question style="margin-top:10px;font-size:13px;color:#fff;font-weight:850">¿Quieres publicarlo en la clasificación online?</div>
    <p data-pb-disclosure style="margin:6px 0 10px;color:#b5cbd7;font-size:11px;line-height:1.35">${RECORD_PUBLISH_DISCLOSURE}</p>
    <div data-pb-actions style="display:flex;gap:8px;flex-wrap:wrap">
      <button data-pb-publish type="button" style="flex:1 1 200px;min-height:45px;background:#def6ef;color:#0c241c;border:1px solid #80e2c4;border-radius:10px;padding:8px 12px;font:900 11px system-ui;touch-action:manipulation">${isAdFreePromoActive()?'PUBLICAR GRATIS · BLACK FRIDAY':'PUBLICAR · VER ANUNCIO'}</button>
      <button data-pb-skip type="button" style="flex:1 1 90px;min-height:45px;background:#172639;color:#edf4fa;border:1px solid #4b687a;border-radius:10px;padding:8px;font:850 11px system-ui;touch-action:manipulation">AHORA NO</button>
    </div>
    <div data-pb-status role="status" aria-live="polite" style="min-height:15px;margin-top:8px;color:#b7e8df;font-size:11px;font-weight:750"></div>
  `;
  page.insertBefore(card,page.querySelector?.('.headline')||page.firstChild||null);
  const publish=card.querySelector('[data-pb-publish]');
  const skip=card.querySelector('[data-pb-skip]');
  const status=card.querySelector('[data-pb-status]');
  const actions=card.querySelector('[data-pb-actions]');
  const setStatus=(message,isError=false)=>{
    status.textContent=message;status.style.color=isError?'#ffb1af':'#9bf1cb';
  };
  let inFlight=false,settled=false;
  const claimId=raceControlPublishClaimId(trackId,best.lapMs);
  const existing=verifiedPublishClaims.get(claimId)||null;
  let adVerified=existing?.adVerified===true;
  let promotionGranted=existing?.promotionGranted===true;
  let hasAccess=()=>adVerified||promotionGranted;
  let published=existing?.published===true;
  if(hasAccess()&&!published)publish.textContent='REINTENTAR PUBLICACIÓN · GRATIS';
  if(published){
    actions.hidden=true;actions.style.display='none';
    card.querySelector('[data-pb-question]').textContent='✅ Tu récord está en la clasificación online';
    card.querySelector('[data-pb-disclosure]').hidden=true;
    setStatus('Este tiempo ya se publicó. No necesitas otro anuncio.');
  }
  const skipOffer=()=>{
    if(inFlight)return;
    actions.hidden=true;actions.style.display='none';
    card.querySelector('[data-pb-question]').textContent='Récord personal guardado en tu dispositivo.';
    card.querySelector('[data-pb-disclosure]').hidden=true;
    setStatus('No has elegido publicar. No se mostrará ningún anuncio.');
  };
  skip.addEventListener('click',skipOffer);
  publish.addEventListener('click',async()=>{
    if(inFlight||published||settled)return;
    inFlight=true;publish.disabled=true;skip.disabled=true;
    try{
      if(!eligible)throw new Error('Este circuito de pruebas no admite publicación online.');
      const nick=getPilotProfile()?.name||'';
      if(nick.length<3)throw new Error('Primero configura tu nombre de piloto en Ajustes.');
      // Keep the player's official time separate from its optional recording.
      // Only send a replay when samples belong to the EXACT same lap, car and
      // geometry. When it is missing, Supabase supports a time-only record.
      const ghost=localRecordGhost(trackId,carId,best.lapMs,scene?._tdrSessionExactPbReplay);
      let replay=null;
      if(ghost&&ghostReplayCompatibility(ghost,trackId,scene?.track).compatible){
        try{
          const packet=encodeOnlineGhostNative(ghost);
          const bytes=encodeOnlineGhostNativeBinary(packet);
          if(packet.p.length>=2&&packet.p.length<=20000&&bytes.byteLength<=131072)
            replay={bytes,count:packet.p.length};
        }catch(error){console.warn('[race-control] exact replay unavailable; time-only publication',error);}
      }
      if(!replay){
        const approved=window.confirm('No existe una repetición exacta de esta vuelta. Puedes publicar el tiempo igualmente, pero NO tendrá replay ni desafío fantasma. ¿Quieres publicar solo tu tiempo?');
        if(!approved)throw new Error('Publicación sin repetición cancelada. Tu marca personal sigue guardada.');
      }
      // Validate online readiness before attempting an optional rewarded ad.
      setStatus(replay?'Comprobando conexión y repetición…':'Comprobando conexión para publicar solo el tiempo…');
      await ensureRaceControlPilotProfile();
      // A first local PB after an authorised geometry reset can be slower than
      // an older ONLINE record. Check the authenticated UUID before any ad.
      const ownOnline=await getMyRaceControlRecord(trackId);
      if(ownOnline&&Number(ownOnline.best_time_ms)<=best.lapMs){
        settled=true;
        actions.hidden=true;actions.style.display='none';
        card.querySelector('[data-pb-question]').textContent='Récord local guardado · marca online anterior conservada';
        card.querySelector('[data-pb-disclosure]').hidden=true;
        setStatus('Tu marca LOCAL '+fmtPersonalBest(best.lapMs)+
          ' no supera tu marca ONLINE '+fmtPersonalBest(ownOnline.best_time_ms)+
          '. No se ha publicado una nueva marca ni se ha mostrado ningún anuncio.');
        return;
      }
      if(!isRewardedAdAvailable()&&!hasAccess())
        throw new Error('No hay un anuncio recompensado disponible ahora. Tu récord se conserva.');
      if(!hasAccess()){
        setStatus(isAdFreePromoActive()?'Black Friday: publicación gratuita…':'Preparando el anuncio opcional para publicar el récord…');
        const result=await showRewardedAd(scene,{
          title:'PUBLICAR RÉCORD · ANUNCIO RECOMPENSADO',
          placement:REWARDED_PLACEMENTS.RACE_CONTROL_PUBLISH,
          claimId
        });
        if(!rewardActionAllowed(result))throw new Error('No se pudo autorizar la publicación. El récord está guardado.');
        adVerified=verifiedReward(result);
        promotionGranted=result?.promotion===true;
        verifiedPublishClaims.set(claimId,{adVerified,promotionGranted,published:false});
      }
      // Retrying a transient network failure in this report must NEVER
      // require the player to watch a second ad for the same record.
      setStatus(promotionGranted?'Promoción Black Friday: publicando gratis…':'Anuncio completado. Publicando tu tiempo…');
      const response=replay
        ?await submitRaceControlRecordWithGhost({
          trackId,bestTimeMs:best.lapMs,carId,
          ghostBytes:replay.bytes,ghostSampleCount:replay.count
        })
        :await submitRaceControlRecordWithoutGhost({trackId,bestTimeMs:best.lapMs,carId});
      const row=Array.isArray(response)?response[0]:response;
      if(!row||(replay?!row.record_ref:row.track_id!==trackId))
        throw new Error('El servidor no confirmó la publicación. Puedes reintentar sin otro anuncio.');
      if(row.improved!==true){
        settled=true;
        actions.hidden=true;actions.style.display='none';
        card.querySelector('[data-pb-question]').textContent='La clasificación online conserva tu mejor marca';
        card.querySelector('[data-pb-disclosure]').hidden=true;
        setStatus('El servidor ya tenía una marca online igual o mejor ('+
          fmtPersonalBest(row.best_time_ms)+'). Tu clasificación NO ha cambiado.');
        return;
      }
      published=true;
      verifiedPublishClaims.set(claimId,{adVerified,promotionGranted,published:true});
      // A successful publication must also make its online leaderboard
      // available on the next Race Control visit. Failure to refresh the
      // read-only cache never undoes a verified server write or its ad credit.
      void getRaceControlSnapshot(trackId).then(snapshot=>{
        if(Array.isArray(snapshot))saveCloudSnapshot(trackId,snapshot);
      }).catch(err=>console.warn('[race-control] post-publish ranking refresh unavailable',err));
      actions.hidden=true;actions.style.display='none';
      card.querySelector('[data-pb-question]').textContent='✅ Tu récord está en la clasificación online';
      card.querySelector('[data-pb-disclosure]').hidden=true;
      setStatus(replay?'Nuevo récord ONLINE publicado, con repetición.'
        :'Nuevo tiempo ONLINE publicado sin repetición. Aparecerá sin botón VS.');
    }catch(error){
      setStatus(String(error?.message||'No se pudo publicar el tiempo.'),true);
      if(hasAccess())publish.textContent='REINTENTAR PUBLICACIÓN · GRATIS';
    }finally{
      inFlight=false;
      publish.disabled=published||settled;skip.disabled=published||settled;
    }
  });
  return {best,card,getState:()=>({inFlight,adVerified,promotionGranted,published})};
}
