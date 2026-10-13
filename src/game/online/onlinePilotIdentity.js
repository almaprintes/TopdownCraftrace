// One authenticated Supabase UUID is authoritative for records and rankings.
// Never copy a locally stored nickname onto a different account implicitly.
import {activateRaceControlOnline,getMyRaceControlProfile,claimRaceControlPilotNick} from './raceControlOnline.js';
import {getPilotProfile} from '../social/pilotProfile.js';

export const NICK_IDENTITY_CONFLICT='Tu nombre de piloto pertenece a otra cuenta de Supabase. Recupera esa cuenta desde Ajustes → Cuenta, o elige otro nombre en el perfil de piloto. Tu vuelta guardada no se pierde.';

export function explainPilotIdentityFailure(error){
  const detail=String(error?.message||error||'');
  if(/ocupado|duplicate key|unique constraint|23505|409 conflict/i.test(detail))
    return NICK_IDENTITY_CONFLICT;
  return detail||'No se ha podido comprobar el perfil de piloto.';
}

export async function ensureRaceControlPilotProfile(){
  await activateRaceControlOnline();
  const local=String(getPilotProfile()?.name||'').trim();
  if(local.length<3||local.length>16)
    throw new Error('Configura primero tu nombre de piloto en Ajustes → Cuenta. Tu vuelta se conserva.');
  const existing=await getMyRaceControlProfile();
  if(existing){
    if(existing.nick!==local)
      throw new Error('Esta sesión de Supabase pertenece al piloto «'+String(existing.nick)+
        '», pero este dispositivo tiene «'+local+'». Revisa la cuenta en Ajustes → Cuenta antes de publicar.');
    return existing;
  }
  // Reserve the nick atomically for THIS auth UID, only if not owned elsewhere.
  // A duplicate is an account-recovery decision, not permission to steal identity.
  try{await claimRaceControlPilotNick(local);}
  catch(error){throw new Error(explainPilotIdentityFailure(error));}
  const created=await getMyRaceControlProfile();
  if(!created||created.nick!==local)
    throw new Error('Supabase no confirmó el perfil de este piloto. No se ha publicado la vuelta.');
  return created;
}
