const BASE=import.meta.env.BASE_URL||'/';
export const TAS_TYPES=Object.freeze(['BILLBOARD','FLAG','BARRIER','GANTRY','TRACKSIDE']);
export const TAS_DEFAULT_CAMPAIGN='default';
function clean(v){return String(v||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'-');}
export function campaignManifestUrl(id=TAS_DEFAULT_CAMPAIGN){return `${BASE}assets/advertising/campaigns/${clean(id)||TAS_DEFAULT_CAMPAIGN}/campaign.json`;}
export function campaignAssetUrl(campaign,type,file){const id=clean(campaign)||TAS_DEFAULT_CAMPAIGN;return `${BASE}assets/advertising/campaigns/${id}/${file}`;}
export function validateAdvertisingSlots(trackId,slots=[]){const seen=new Set(),errors=[];for(const s of slots||[]){if(!s?.id)errors.push('slot without id');else if(seen.has(s.id))errors.push(`duplicate slot: ${s.id}`);else seen.add(s.id);if(!TAS_TYPES.includes(String(s?.type||'').toUpperCase()))errors.push(`invalid type: ${s?.type||''}`);}return {trackId:String(trackId||''),valid:errors.length===0,errors};}
