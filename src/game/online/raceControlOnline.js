// RACE Control Online — no request is made until activateRaceControlOnline().
// Uses the public browser endpoint/key supplied by the deployment build.
let api=null;
const cfg=()=>({url:String(import.meta.env.VITE_TDR_ONLINE_URL||'').trim(),key:String(import.meta.env.VITE_TDR_ONLINE_PUBLIC||'').trim()});
const headers=(key,token)=>({'apikey':key,'Authorization':`Bearer ${token||key}`,'Content-Type':'application/json'});
const readSession=()=>{try{return JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')||'null');}catch{return null;}};
const saveSession=s=>{try{localStorage.setItem('tdr2:onlineSession:v1',JSON.stringify(s));}catch{}};
const sessionUsable=s=>Boolean(s?.access_token&&s?.user?.id&&Number(s?.expires_at||0)*1000>Date.now()+30000);

async function request(path,{method='GET',body,token}={}){
  const {url,key}=cfg();if(!url||!key)throw new Error('Online backend not configured');
  const res=await fetch(`${url}${path}`,{method,headers:headers(key,token),body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||`Online HTTP ${res.status}`);
  return data;
}

export async function activateRaceControlOnline(){
  if(sessionUsable(api?.session))return api;
  const old=readSession();
  if(sessionUsable(old)){api={session:old};return api;}
  if(old?.refresh_token){
    try{
      const refreshed=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:old.refresh_token}});
      if(sessionUsable(refreshed)){saveSession(refreshed);api={session:refreshed};return api;}
    }catch{}
  }
  const session=await request('/auth/v1/signup',{method:'POST',body:{}});
  if(!session?.access_token||!session?.user?.id)throw new Error('Anonymous session unavailable');
  saveSession(session);api={session};return api;
}

export async function syncRaceControlProfile({nick,continentCode,countryCode,regionCode}){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/upsert_my_profile',{method:'POST',token,body:{p_nick:nick,p_continent_code:continentCode,p_country_code:countryCode,p_region_code:regionCode}});
}

export function raceControlOnlineIsActive(){return Boolean(api?.session?.user?.id||readSession()?.user?.id);}


export async function submitRaceControlRecordWithGhost({trackId,bestTimeMs,carId,ghostBytes,ghostSampleCount}){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  const bytes=ghostBytes instanceof Uint8Array?ghostBytes:new Uint8Array(ghostBytes||[]);
  let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
  const payload='\\x'+Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  return request('/rest/v1/rpc/submit_track_record_with_ghost',{method:'POST',token,body:{p_track_id:String(trackId||''),p_best_time_ms:Math.round(Number(bestTimeMs)||0),p_car_id:String(carId||''),p_ghost_payload:payload,p_ghost_sample_count:Math.round(Number(ghostSampleCount)||0),p_ghost_format:1}});
}

export async function getRaceControlSnapshot(trackId){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_race_control_snapshot',{method:'POST',token,body:{p_track_id:String(trackId||'')}});
}

export async function getRaceControlGhost(recordRef){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_track_record_ghost',{method:'POST',token,body:{p_record_ref:String(recordRef||'')}});
}

export async function getMyShipatonJudgeAccess(){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/get_my_shipaton_judge_access',{method:'POST',token,body:{}});
}

export async function activateShipatonJudgeAccess(code){
  const online=await activateRaceControlOnline();
  const token=online?.session?.access_token;
  if(!token)throw new Error('Online session unavailable');
  return request('/rest/v1/rpc/activate_shipaton_judge_access',{method:'POST',token,body:{p_code:String(code||'').trim()}});
}
