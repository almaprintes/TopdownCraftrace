import {sessionPersonalBest,localRecordGhost,fmtPersonalBest,RECORD_PUBLISH_DISCLOSURE} from './sessionPersonalBestPublish.js';
import {encodeOnlineGhostNative,encodeOnlineGhostNativeBinary} from '../online/onlineGhostCodec.js';
import {activateRaceControlOnline,submitRaceControlRecordWithGhost} from '../online/raceControlOnline.js';
import {getPilotProfile} from '../social/pilotProfile.js';
import {isRewardedAdAvailable,showRewardedAd} from '../monetization/RewardedAdsProvider.js';
import {REWARDED_PLACEMENTS,raceControlPublishClaimId,verifiedReward} from '../monetization/rewardedActions.js';

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
      <button data-pb-publish type="button" style="flex:1 1 200px;min-height:45px;background:#def6ef;color:#0c241c;border:1px solid #80e2c4;border-radius:10px;padding:8px 12px;font:900 11px system-ui;touch-action:manipulation">PUBLICAR · VER ANUNCIO</button>
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
  let inFlight=false;
  let adVerified=false;
  let published=false;
  const skipOffer=()=>{
    if(inFlight)return;
    actions.hidden=true;
    card.querySelector('[data-pb-question]').textContent='Récord personal guardado en tu dispositivo.';
    card.querySelector('[data-pb-disclosure]').hidden=true;
    setStatus('No has elegido publicar. No se mostrará ningún anuncio.');
  };
  skip.addEventListener('click',skipOffer);
  publish.addEventListener('click',async()=>{
    if(inFlight||published)return;
    inFlight=true;publish.disabled=true;skip.disabled=true;
    try{
      if(!eligible)throw new Error('Este circuito de pruebas no admite publicación online.');
      const nick=getPilotProfile()?.name||'';
      if(nick.length<3)throw new Error('Primero configura tu nombre de piloto en Ajustes.');
      // Prepare an authentic replay BEFORE asking the player to spend time
      // watching an ad. No stale ghost is ever sent with a newer lap.
      const ghost=localRecordGhost(trackId,carId,best.lapMs);
      if(!ghost)throw new Error('No se ha podido recuperar la repetición exacta de esta vuelta. No se ha mostrado publicidad.');
      const packet=encodeOnlineGhostNative(ghost);
      const bytes=encodeOnlineGhostNativeBinary(packet);
      if(packet.p.length<2||packet.p.length>20000||bytes.byteLength>131072)
        throw new Error('La repetición supera el límite de publicación. No se ha mostrado publicidad.');
      if(!isRewardedAdAvailable()&&!adVerified)
        throw new Error('No hay un anuncio recompensado disponible ahora. Tu récord se conserva.');
      // Validate online readiness before attempting an optional rewarded ad.
      setStatus('Comprobando conexión y repetición…');
      await activateRaceControlOnline();
      if(!adVerified){
        setStatus('Preparando el anuncio opcional para publicar el récord…');
        const result=await showRewardedAd(scene,{
          title:'PUBLICAR RÉCORD · ANUNCIO RECOMPENSADO',
          placement:REWARDED_PLACEMENTS.RACE_CONTROL_PUBLISH,
          claimId:raceControlPublishClaimId(trackId,best.lapMs)
        });
        if(!verifiedReward(result))throw new Error('Anuncio cancelado o sin verificar. El récord no se ha publicado.');
        adVerified=true;
      }
      // Retrying a transient network failure in this report must NEVER
      // require the player to watch a second ad for the same record.
      setStatus('Anuncio completado. Publicando tu tiempo…');
      const response=await submitRaceControlRecordWithGhost({
        trackId,bestTimeMs:best.lapMs,carId,
        ghostBytes:bytes,ghostSampleCount:packet.p.length
      });
      const row=Array.isArray(response)?response[0]:response;
      if(!row||!row.record_ref)throw new Error('El servidor no confirmó la publicación. Puedes reintentar sin otro anuncio.');
      published=true;
      actions.hidden=true;
      card.querySelector('[data-pb-question]').textContent='✅ Tu récord está en la clasificación online';
      card.querySelector('[data-pb-disclosure]').hidden=true;
      setStatus(row.improved===false?'Ya tenías una marca online igual o mejor. Tu clasificación está conservada.':'Publicado correctamente. ¡Enhorabuena!');
    }catch(error){
      setStatus(String(error?.message||'No se pudo publicar el tiempo.'),true);
      if(adVerified)publish.textContent='REINTENTAR PUBLICACIÓN · SIN OTRO ANUNCIO';
    }finally{
      inFlight=false;
      publish.disabled=published;skip.disabled=published;
    }
  });
  return {best,card,getState:()=>({inFlight,adVerified,published})};
}
