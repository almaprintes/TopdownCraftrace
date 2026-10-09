// Stable storage port. The rest of the game never sees PostgREST, SQL or
// vendor-specific API conventions. No DB/admin secrets may be used in clients.
import { playerBackendConfig } from './backendConfig.js';

async function responseJson(res){
  const value=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(value?.message||value?.error_description||value?.error||
    'Error de servidor HTTP '+res.status);
  return value;
}
function contextHeaders(config,token){return {
  Authorization:'Bearer '+token,
  ...(config.key?{apikey:config.key}:{}),
  'Content-Type':'application/json'
};}
// Window.fetch requires Window as its receiver in Safari/WebKit. Passing the
// bare function as a class property turns this.transport() into an illegal call.
const defaultTransport=(url,options)=>globalThis.fetch(url,options);
function ownPlayer(identity){
  if(!identity?.id||!identity?.token)throw new Error('El jugador debe iniciar sesión.');
}

export class SupabaseProgressRepository {
  constructor(config=playerBackendConfig(),transport=defaultTransport){
    this.config=config;
    this.transport=transport;
  }
  async read(identity,{statusOnly=false}={}){
    ownPlayer(identity);
    const fields=statusOnly?'revision,updated_at':'revision,updated_at,progress';
    const query='/rest/v1/player_progress?select='+fields+'&user_id=eq.'+encodeURIComponent(identity.id);
    const res=await this.transport(this.config.url+query,{
      method:'GET',headers:contextHeaders(this.config,identity.token)
    });
    const rows=await responseJson(res);
    if(!Array.isArray(rows))throw new Error('Respuesta de progreso inválida.');
    if(rows.length>1)throw new Error('Se han recibido varias copias del mismo piloto.');
    const row=rows[0];
    return row?{revision:row.revision,updatedAt:row.updated_at,
      ...(!statusOnly?{snapshot:row.progress}:{})}:null;
  }
  async save(identity,snapshot,expectedRevision){
    ownPlayer(identity);
    const res=await this.transport(this.config.url+'/rest/v1/rpc/save_my_player_progress',{
      method:'POST',headers:contextHeaders(this.config,identity.token),
      body:JSON.stringify({p_progress:snapshot,p_expected_revision:expectedRevision})
    });
    const result=await responseJson(res);
    const row=Array.isArray(result)?result[0]:result;
    if(typeof row?.saved!=='boolean')throw new Error('Respuesta de guardado inválida.');
    return {saved:row.saved,revision:Number(row.current_revision)||0};
  }
}

// Contract for replacing Supabase with our own HTTPS API and PostgreSQL.
// Routes operate on the bearer-token subject, never on a caller-supplied UUID:
// GET /v1/players/me/progress 200 {revision,updatedAt,snapshot} or 404
// PUT /v1/players/me/progress {snapshot,expectedRevision}
//     200 {saved,revision}; 409 {saved:false,revision}.
// Backends MUST verify JWT and perform an atomic expectedRevision compare/swap.
export class HttpV1ProgressRepository {
  constructor(config=playerBackendConfig(),transport=defaultTransport){
    this.config=config;
    this.transport=transport;
  }
  async read(identity,{statusOnly=false}={}){
    ownPlayer(identity);
    const url=this.config.progressApiUrl+'/v1/players/me/progress'+(statusOnly?'?fields=status':'');
    const res=await this.transport(url,{method:'GET',
      headers:contextHeaders({key:''},identity.token)});
    if(res.status===404)return null;
    const row=await responseJson(res);
    if(!row||!Number.isSafeInteger(row.revision)||row.revision<1)
      throw new Error('Respuesta de la API portátil inválida.');
    return {revision:row.revision,updatedAt:row.updatedAt,
      ...(!statusOnly?{snapshot:row.snapshot}:{})};
  }
  async save(identity,snapshot,expectedRevision){
    ownPlayer(identity);
    const res=await this.transport(this.config.progressApiUrl+'/v1/players/me/progress',{
      method:'PUT',headers:contextHeaders({key:''},identity.token),
      body:JSON.stringify({snapshot,expectedRevision})
    });
    const row=await responseJson(res.status===409?{
      ok:true,json:()=>res.json()
    }:res);
    if(typeof row?.saved!=='boolean'||!Number.isSafeInteger(row.revision))
      throw new Error('Respuesta del proveedor de partidas inválida.');
    return row;
  }
}
export function createPlayerProgressRepository(config=playerBackendConfig(),transport=defaultTransport){
  return config.storageProvider==='http-v1'
    ?new HttpV1ProgressRepository(config,transport)
    :new SupabaseProgressRepository(config,transport);
}
