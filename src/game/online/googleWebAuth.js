// Browser OAuth only. GoTrue owns Google's OAuth state; this independent nonce
// binds our callback to this tab and PKCE binds the code to its initiating device.
import {playerBackendConfig} from './backendConfig.js';
import {hasSavedRaceControlSession,savedGoogleWebIdentity,savedRaceControlIdentity,activateRaceControlOnline,currentRaceControlAccount,acceptGoogleWebSession} from './raceControlOnline.js';
export const GOOGLE_REDIRECT='https://almaprintes.github.io/TopdownCraftrace/dev/';
const PENDING='tdr2:googlePkce:v1';
const FAILURE='No se pudo completar Google. Tu partida sigue intacta. Vuelve a intentarlo desde Cuenta.';
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function googleWebAvailable(){
  return globalThis.location?.origin+globalThis.location?.pathname===GOOGLE_REDIRECT&&
    !globalThis.Capacitor?.isNativePlatform?.()&&!!globalThis.crypto?.subtle;
}
export async function startGoogleWebSignIn(){
  if(!googleWebAvailable())throw new Error('Google está disponible en la DEV web. El acceso nativo se preparará por separado.');
  const expectedId=savedRaceControlIdentity();
  if(!expectedId&&localStorage.getItem('tdr2:previousOnlineUserId:v1'))
    throw new Error('Este dispositivo conserva la referencia de una identidad antigua. Para mantener su ID necesitas una sesión válida de ese piloto. No se ha creado otra cuenta ni modificado tu partida.');
  let linking=false,token=null;
  if(expectedId&&!savedGoogleWebIdentity()){
    // A nickname is never proof of ownership: require the old live session.
    const account=await currentRaceControlAccount();
    if(account.id!==expectedId)throw new Error(FAILURE);
    linking=!account.socialProviders.includes('google');
    if(linking)token=(await activateRaceControlOnline()).session.access_token;
  }

  const verifier=b64(crypto.getRandomValues(new Uint8Array(48)));
  const nonce=b64(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const {url,key}=playerBackendConfig();
  const pending=JSON.stringify({verifier,nonce,createdAt:Date.now(),backend:url,expectedId,linking});
  // Only one provider callback may be outstanding in this tab.
  sessionStorage.removeItem('tdr2:applePkce:v1');
  sessionStorage.setItem(PENDING,pending);
  if(sessionStorage.getItem(PENDING)!==pending)throw new Error(FAILURE);
  // URL fragments never reach the OAuth server, so they cannot survive its redirect.
  // Put our one-time nonce in the redirect query and consume it before boot.
  const redirect=new URL(GOOGLE_REDIRECT);redirect.searchParams.set('tdr_state',nonce);
  const target=new URL(url+(linking?'/auth/v1/user/identities/authorize':'/auth/v1/authorize'));
  target.search=new URLSearchParams({provider:'google',redirect_to:redirect.href,
    code_challenge:challenge,code_challenge_method:'s256',apikey:key}).toString();
  if(linking){
    target.searchParams.set('skip_http_redirect','true');
    try{
      const response=await fetch(target.href,{cache:'no-store',referrerPolicy:'no-referrer',
        headers:{apikey:key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
      if(!response.ok){
        const data=await response.json().catch(()=>({}));
        if(data.code==='manual_linking_disabled')throw new Error('Activa Allow manual linking en Supabase para vincular Google conservando este ID. Tu partida no ha cambiado.');
        throw new Error(FAILURE);
      }
      const data=await response.json();const next=new URL(data.url);
      if(next.protocol!=='https:'||next.hostname!=='accounts.google.com'||savedRaceControlIdentity()!==expectedId)throw new Error(FAILURE);
      location.assign(next.href);
    }catch(error){sessionStorage.removeItem(PENDING);throw error;}
  }else location.assign(target.href);
}
export async function completeGoogleWebSignIn(callback){
  if(!callback)return null;
  // Supabase returns this specific error when the provider identity belongs to
  // another Studio user. Never overwrite the current account or local save.
  const providerError=[callback.errorCode,callback.errorDescription,typeof callback.error==='string'?callback.error:'']
    .filter(value=>typeof value==='string').join(' ').toLowerCase();
  if(/identity[_ ]is[_ ]already[_ ]linked[_ ]to[_ ]another[_ ]user|identity[_ ]already[_ ]exists|already[_ ]linked[_ ]to[_ ]another[_ ]user/.test(providerError)){
    sessionStorage.removeItem(PENDING);
    return {ok:false,message:'Cuenta ya existente. Por favor, inicia sesión.'};
  }
  let stage='callback';
  try{
    const pending=JSON.parse(sessionStorage.getItem(PENDING)||'null');
    // Consume once, including failed, denied, expired, and replayed callbacks.
    sessionStorage.removeItem(PENDING);
    const {url,key}=playerBackendConfig();
    // Give actionable, non-sensitive failure codes: never show nonce, auth code or verifier.
    const checks=[
      ['C01','La dirección de retorno no corresponde a la web DEV.',!googleWebAvailable()],
      ['C02','Google devolvió una cancelación o un error.',!!callback.error],
      ['C03','No llegó el código de autorización de Google.',!callback.code||callback.code.length>4096],
      ['C04','Se perdió la sesión temporal del navegador durante el regreso de Google.',!pending],
      ['C05','No coincide el estado de seguridad de la redirección.',!!pending&&pending.nonce!==callback.state],
      ['C06','Ha cambiado el servidor de autenticación.',!!pending&&pending.backend!==url],
      ['C07','El intento ha caducado o la fecha del dispositivo es incorrecta.',!!pending&&(Date.now()-pending.createdAt>600000||Date.now()<pending.createdAt)],
      ['C08','La clave temporal de autorización es inválida.',!!pending&&!/^[A-Za-z0-9_-]{64}$/.test(pending.verifier)],
      ['C09','La sesión local no coincide con la que inició Google.',(hasSavedRaceControlSession()&&!pending?.expectedId)||(savedRaceControlIdentity()||null)!==(pending?.expectedId||null)]
    ];
    const failed=checks.find(([, ,condition])=>condition);
    if(failed)throw new Error(failed[0]+': '+failed[1]);
    stage='exchange';
    const response=await fetch(url+'/auth/v1/token?grant_type=pkce',{
      method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
      headers:{apikey:key,'Content-Type':'application/json'},
      body:JSON.stringify({auth_code:callback.code,code_verifier:pending.verifier}),
      signal:AbortSignal.timeout(20000)
    });
    if(!response.ok)throw new Error('Intercambio OAuth rechazado ('+response.status+').');
    const session=await response.json();
    stage='identity';
    await acceptGoogleWebSession(session,pending.expectedId||null,{linking:pending.linking===true});
    return {ok:true,message:'Google conectado. Tu partida local no ha cambiado. Confirma PROTEGER MI PARTIDA para crear una copia; si ya existe otra, podrás revisarla antes de recuperar.'};
  }catch(error){
    // No credentials, OAuth codes or provider tokens are included in UI diagnostics.
    const hint=stage==='callback'?'No se ha podido verificar el retorno de Google en este navegador.':
      stage==='exchange'?'Google ha vuelto, pero no se ha podido completar el intercambio seguro de sesión.':
      'Google ha vuelto, pero la cuenta no supera la verificación de identidad de CraftRace Studio.';
    const safeDetail=stage==='callback'&&/^C0[1-9]: /.test(error?.message||'')?error.message:'';
    console.warn('[TDR Google OAuth] Failed at stage',stage,error?.message||'');
    return {ok:false,message:FAILURE+' '+hint+(safeDetail?' Diagnóstico '+safeDetail:'')};
  }
}
