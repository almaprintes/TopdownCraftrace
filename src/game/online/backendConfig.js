// Only transport adapters should depend on this module. Game progression,
// UI and portable save files never reference Supabase-specific endpoints.
const DEFAULT_URL='https://juukbnkjboiazqggqcyv.supabase.co';
const DEFAULT_PUBLIC_KEY='sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB';

function trimUrl(value){return String(value||'').trim().replace(/\/+$/,'');}

export function playerBackendConfig(){
  const url=trimUrl(import.meta.env.VITE_TDR_ONLINE_URL||DEFAULT_URL);
  const key=String(import.meta.env.VITE_TDR_ONLINE_PUBLIC||DEFAULT_PUBLIC_KEY).trim();
  const storageProvider=String(import.meta.env.VITE_TDR_PROGRESS_PROVIDER||'supabase-postgrest').trim();
  const progressApiUrl=trimUrl(import.meta.env.VITE_TDR_PROGRESS_API_URL||'');
  if(storageProvider!=='supabase-postgrest'&&storageProvider!=='http-v1')
    throw new Error('Unknown player progress provider');
  if(storageProvider==='http-v1'&&!progressApiUrl)
    throw new Error('VITE_TDR_PROGRESS_API_URL is required for http-v1');
  return {url,key,storageProvider,progressApiUrl};
}
