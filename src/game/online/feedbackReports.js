// Optional, user-triggered feedback only. Never poll or upload in a race loop.
import {playerBackendConfig} from './backendConfig.js';
import {activateRaceControlOnline,hasSavedRaceControlSession} from './raceControlOnline.js';
import {summarizeStoredRuntimeErrors} from '../dev/runtimeSupportReport.js';

const CATEGORIES=new Set(['performance','controls','track','online','other']);
export const hasFeedbackAccount=()=>{
  try{
    const saved=JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')||'null');
    return !!saved?.access_token&&!!saved?.user?.id&&saved?.user?.is_anonymous!==true;
  }catch{return false;}
};

export function limitedFeedbackDiagnostics(){
  const platform=String(globalThis.Capacitor?.getPlatform?.()||'web').slice(0,24);
  const errors=summarizeStoredRuntimeErrors(globalThis.localStorage).errors;
  return {
    platform,
    version:String(document.querySelector('meta[name="tdr-dev-version"]')?.content||'unknown').slice(0,40),
    screen:{width:Math.min(9999,screen?.width||0),height:Math.min(9999,screen?.height||0),pixelRatio:Math.min(5,Math.max(1,window.devicePixelRatio||1))},
    lastErrors:errors.slice(0,2).map(e=>({type:e.type.slice(0,30),scene:e.scene.slice(0,60),track:e.track.slice(0,60),textureCount:Math.max(0,Math.min(20000,e.textureCount))}))
  };
}

export async function submitPlayerFeedback({category,message,includeDiagnostics=false}){
  const kind=String(category||'').trim();
  const text=String(message||'').trim();
  if(!CATEGORIES.has(kind)||text.length<8||text.length>1000)throw Error('Escribe entre 8 y 1000 caracteres.');
  if(!hasSavedRaceControlSession())throw Error('Para evitar abusos, primero entra en Ajustes → Cuenta con tu cuenta online.');
  const {session}=await activateRaceControlOnline();
  if(!session?.access_token||!session?.user?.id)throw Error('No se encontró una sesión online válida.');
  if(session.user.is_anonymous===true)throw Error('Vincula primero tu partida a una cuenta online desde Ajustes → Cuenta.');
  const {url,key}=playerBackendConfig();
  const response=await fetch(url+'/rest/v1/rpc/tdr_submit_feedback',{
    method:'POST',headers:{apikey:key,Authorization:'Bearer '+session.access_token,
      'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify({p_category:kind,p_message:text,
      p_diagnostics:includeDiagnostics?limitedFeedbackDiagnostics():{}}),
    cache:'no-store',signal:AbortSignal.timeout(10000)
  });
  const result=await response.json().catch(()=>null);
  if(!response.ok)throw Error('No se pudo enviar el informe. Inténtalo más tarde.');
  if(result?.accepted===true)return result;
  const reasons={
    disabled:'Los informes están desactivados temporalmente por mantenimiento.',
    daily_limit:'Hemos alcanzado el límite de informes de hoy. Gracias por avisarnos.',
    user_limit:'Ya has enviado el máximo de informes de hoy.',
    cooldown:'Espera unos minutos antes de enviar otro informe.',
    auth_required:'Necesitas iniciar sesión para informar de un problema.',
    invalid:'Revisa el mensaje o los datos del informe.'
  };
  throw Error(reasons[result?.reason]||'El servidor no ha aceptado el informe.');
}
