// RACE Control Online — no request is made until activateRaceControlOnline().
// Uses the public browser endpoint/key supplied by the deployment build.
let api=null;
const cfg=()=>({url:String(import.meta.env.VITE_TDR_ONLINE_URL||'').trim(),key:String(import.meta.env.VITE_TDR_ONLINE_PUBLIC||'').trim()});
const headers=(key,token)=>({'apikey':key,'Authorization':`Bearer ${token||key}`,'Content-Type':'application/json'});
const readSession=()=>{try{return JSON.parse(localStorage.getItem('tdr2:onlineSession:v1')||'null');}catch{return null;}};
const saveSession=s=>{try{localStorage.setItem('tdr2:onlineSession:v1',JSON.stringify(s));}catch{}};

async function request(path,{method='GET',body,token}={}){
  const {url,key}=cfg();if(!url||!key)throw new Error('Online backend not configured');
  const res=await fetch(`${url}${path}`,{method,headers:headers(key,token),body:body?JSON.stringify(body):undefined});
  const data=await res.json().catch(()=>null);
  if(!res.ok)throw new Error(data?.msg||data?.message||data?.error_description||`Online HTTP ${res.status}`);
  return data;
}

export async function activateRaceControlOnline(){
  if(api?.session?.access_token)return api;
  const old=readSession();
  if(old?.access_token&&old?.user?.id){api={session:old};return api;}
  const session=await request('/auth/v1/signup',{method:'POST',body:{}});
  if(!session?.access_token||!session?.user?.id)throw new Error('Anonymous session unavailable');
  saveSession(session);api={session};return api;
}

export function raceControlOnlineIsActive(){return Boolean(api?.session?.user?.id||readSession()?.user?.id);}
