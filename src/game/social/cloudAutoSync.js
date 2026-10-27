// DEV web-only, conservative cloud autosync. Never creates an online account,
// never merges two devices, and never touches the native Android/iOS clients.
// Local game saves remain synchronous; the server is an optional second copy.
import {googleWebAvailable} from '../online/googleWebAuth.js';
import {savedGoogleWebIdentity} from '../online/raceControlOnline.js';
import {
  cloudConfirmedMarker, cloudDataDigest, localProgressSnapshot,
  cloudBackupStatus, readCloudBackup, markCloudConfirmed,
  updateCloudBackupAutomatically
} from './cloudProgress.js';

export const AUTO_CLOUD_MIN_WRITE_MS=5*60*1000;
let installed=false,scheduled=null,inFlight=false,blocked='',lastWrite=0;
let lastReceiptId='';
const publish=(state,message='')=>{
  try{
    window.__tdrCloudAutoStatus={state,message,at:Date.now()};
    window.dispatchEvent(new CustomEvent('tdr:cloud-autosync',{detail:{state,message}}));
  }catch{}
};
export function cloudAutoSyncStatus(){
  return {blocked,message:blocked||'',enabled:installed&&googleWebAvailable()};
}
async function runCheckpoint(){
  if(inFlight||blocked||!googleWebAvailable()||document.hidden||
    window.__tdrCloudRaceActive||document.getElementById('tdr-cloud-account-modal'))return;
  const id=savedGoogleWebIdentity();
  if(!id)return; // Guests stay local. Never create anonymous identities.
  try{
    if(localStorage.getItem('tdr2:cloudLoginPendingRestore:v1'))return;
  }catch{return;}
  inFlight=true;
  try{
    const data=localProgressSnapshot().data;
    const digest=await cloudDataDigest(data);
    if(savedGoogleWebIdentity()!==id)return;
    let receipt=cloudConfirmedMarker(id);
    if(!receipt){
      // First use after updating an old installation: compare one full copy.
      // If local differs, ONLY the player may choose to overwrite the cloud.
      const status=await cloudBackupStatus();
      if(status.id!==id)return;
      if(!status.existing){
        blocked='Primero protege tu partida en Cuenta para activar el guardado automático.';
        publish('setup-required',blocked);return;
      }
      const remote=await readCloudBackup();
      if(!remote||remote.id!==id||remote.revision!==status.revision)return;
      const remoteDigest=await cloudDataDigest(remote.snapshot.data);
      if(remoteDigest!==digest){
        blocked='La partida local difiere de la nube. Confirma ACTUALIZAR COPIA o RECUPERAR PARTIDA en Cuenta.';
        publish('confirmation-required',blocked);return;
      }
      await markCloudConfirmed(id,remote.revision,remote.snapshot.data);
      receipt=cloudConfirmedMarker(id);
      if(!receipt)return;
      publish('synced','Partida ya sincronizada; se evitó una subida innecesaria.');
    }
    if(receipt.digest===digest)return; // Local save unchanged: zero API requests.
    if(Date.now()-lastWrite<AUTO_CLOUD_MIN_WRITE_MS){
      schedule(AUTO_CLOUD_MIN_WRITE_MS-(Date.now()-lastWrite)+1500);
      return;
    }
    if(savedGoogleWebIdentity()!==id)return;
    const result=await updateCloudBackupAutomatically(receipt.revision);
    if(result.saved){
      lastWrite=Date.now();
      publish('saved','Copia automática guardada (revisión '+result.revision+').');
    }
  }catch(error){
    // Fail closed if the local receipt disagrees with a remote revision.
    if(error?.code==='TDR_CLOUD_CONFLICT'||/revisión|Confirma primero|otra copia|cambiado de cuenta/.test(String(error?.message||''))){
      blocked=String(error.message||'Conflicto de copias.');
      publish('conflict',blocked);
    }else{
      publish('offline','No se pudo sincronizar. La partida local sigue guardada.');
    }
  }finally{inFlight=false;}
}
function schedule(delayMs=3000){
  if(!installed||blocked||scheduled)return;
  scheduled=setTimeout(()=>{
    scheduled=null;
    void runCheckpoint();
  },Math.max(0,delayMs));
}
export function installCloudAutoSync(){
  if(installed||!googleWebAvailable())return false;
  installed=true;
  // Explicit first/manual backup or restoration is the only way to unlock
  // a conflict. It emits this event after confirming the server revision.
  window.addEventListener('tdr:cloudsave-confirmed',()=>{
    const id=savedGoogleWebIdentity();
    if(!id||!cloudConfirmedMarker(id))return;
    blocked='';
    lastWrite=Date.now();
    lastReceiptId=id;
    schedule(3500);
  });
  window.addEventListener('tdr:cloud-checkpoint',()=>schedule(3500));
  window.addEventListener('focus',()=>schedule(3500));
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(3500);});
  // Checkpoints also cover purchases made without leaving the garage.
  // This reads local data at most every two minutes; unchanged saves use no network.
  setInterval(()=>{if(!document.hidden&&!window.__tdrCloudRaceActive)schedule(3500);},120000);
  schedule(18000);
  return true;
}
