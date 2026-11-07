// Apple web OAuth only. GoTrue owns Apple's OAuth state; this independent nonce
// binds our callback to this tab and PKCE binds the code to its initiating device.
import {playerBackendConfig} from './backendConfig.js';
import {hasSavedRaceControlSession,savedRaceControlIdentity,activateRaceControlOnline,currentRaceControlAccount,acceptVerifiedSocialSession} from './raceControlOnline.js';
export const APPLE_REDIRECT='https://almaprintes.github.io/TopdownCraftrace/dev/';
export const APPLE_PENDING='tdr2:applePkce:v1';
const PENDING=APPLE_PENDING;
const FAILURE='No se pudo completar Apple. Tu partida sigue intacta. Vuelve a intentarlo desde Cuenta.';
const b64=bytes=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
export function appleWebAvailable(){
  return globalThis.location?.origin+globalThis.location?.pathname===APPLE_REDIRECT&&
    !globalThis.Capacitor?.isNativePlatform?.()&&!!globalThis.crypto?.subtle;
}
export async function startAppleWebSignIn(){
  if(!appleWebAvailable())throw new Error('Apple está disponible en la DEV web. El acceso nativo se preparará por separado.');
  const expectedId=savedRaceControlIdentity();
  if(!expectedId&&localStorage.getItem('tdr2:previousOnlineUserId:v1'))
    throw new Error('Este dispositivo conserva la referencia de una identidad antigua. Para mantener su ID necesitas una sesión válida de ese piloto. No se ha creado otra cuenta ni modificado tu partida.');
  let linking=false,token=null;
  if(expectedId){
    // A nickname is never proof of ownership: require the old live session.
    const account=await currentRaceControlAccount();
    if(account.id!==expectedId)throw new Error(FAILURE);
    linking=!account.socialProviders.includes('apple');
    if(linking)token=(await activateRaceControlOnline()).session.access_token;
  }

  const verifier=b64(crypto.getRandomValues(new Uint8Array(48)));
  const nonce=b64(crypto.getRandomValues(new Uint8Array(32)));
  const challenge=b64(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier))));
  const {url,key}=playerBackendConfig();
  const pending=JSON.stringify({verifier,nonce,createdAt:Date.now(),backend:url,expectedId,linking});
  // Never leave competing OAuth callback transactions in one browser tab.
  sessionStorage.removeItem('tdr2:googlePkce:v1');
  sessionStorage.setItem(PENDING,pending);
  if(sessionStorage.getItem(PENDING)!==pending)throw new Error(FAILURE);
  const redirect=new URL(APPLE_REDIRECT);redirect.hash=new URLSearchParams({tdr_state:nonce}).toString();
  const target=new URL(url+(linking?'/auth/v1/user/identities/authorize':'/auth/v1/authorize'));
  target.search=new URLSearchParams({provider:'apple',redirect_to:redirect.href,
    code_challenge:challenge,code_challenge_method:'s256',apikey:key}).toString();
  if(linking){
    target.searchParams.set('skip_http_redirect','true');
    try{
      const response=await fetch(target.href,{cache:'no-store',referrerPolicy:'no-referrer',
        headers:{apikey:key,Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});
      if(!response.ok){
        const data=await response.json().catch(()=>({}));
        if(data.code==='manual_linking_disabled')throw new Error('Activa Allow manual linking en Supabase para vincular Apple conservando este ID. Tu partida no ha cambiado.');
        throw new Error(FAILURE);
      }
      const data=await response.json();const next=new URL(data.url);
      if(next.protocol!=='https:'||next.hostname!=='appleid.apple.com'||savedRaceControlIdentity()!==expectedId)throw new Error(FAILURE);
      location.assign(next.href);
    }catch(error){sessionStorage.removeItem(PENDING);throw error;}
  }else location.assign(target.href);
}
export async function completeAppleWebSignIn(callback){
  if(!callback)return null;
  try{
    const pending=JSON.parse(sessionStorage.getItem(PENDING)||'null');
    // Consume once, including failed, denied, expired, and replayed callbacks.
    sessionStorage.removeItem(PENDING);
    const {url,key}=playerBackendConfig();
    if(!appleWebAvailable()||callback.error||!callback.code||callback.code.length>4096||
      !pending||pending.nonce!==callback.state||pending.backend!==url||
      Date.now()-pending.createdAt>600000||Date.now()<pending.createdAt||
      !/^[A-Za-z0-9_-]{64}$/.test(pending.verifier)||(hasSavedRaceControlSession()&&!pending.expectedId)||
      (savedRaceControlIdentity()||null)!==(pending.expectedId||null))throw new Error();
    const response=await fetch(url+'/auth/v1/token?grant_type=pkce',{
      method:'POST',cache:'no-store',referrerPolicy:'no-referrer',
      headers:{apikey:key,'Content-Type':'application/json'},
      body:JSON.stringify({auth_code:callback.code,code_verifier:pending.verifier}),
      signal:AbortSignal.timeout(20000)
    });
    if(!response.ok)throw new Error();
    const session=await response.json();
    await acceptVerifiedSocialSession(session,pending.expectedId||null,{provider:'apple',linking:pending.linking===true});
    return {ok:true,message:'Apple vinculado a CraftRace Studio con identidad verificada. Tu partida TDR sigue intacta; ninguna copia se restaura ni reemplaza por entrar.'};
  }catch{
    return {ok:false,message:FAILURE};
  }
}
