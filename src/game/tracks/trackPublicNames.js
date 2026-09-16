import { TRACK_REGISTRY, CANONICAL_TRACK_IDS, canonicalTrackId } from './trackIdentity.js';
import '../ui/sessionEngineerTrendRuntime.js';
import '../social/pilotProfile.js';

if(typeof window!=='undefined'){
  window.addEventListener('tdr:bootready',()=>{
    import('../scenes/statsTesterExchangePatch.js').catch(err=>console.warn('[tester-exchange] patch load failed',err));
  },{once:true});
}

// Circuit names are proper names: their public identity belongs to the canonical
// circuit identity and never changes with UI language, selector position or
// legacy track metadata. Legacy ids remain accepted during storage migration.
const PUBLIC_TRACK_NAMES = Object.freeze({
  [CANONICAL_TRACK_IDS.ATLANTICO]: 'CIRCUITO ATLÁNTICO',
  track01: 'CIRCUITO ATLÁNTICO',
  'karting-tenerife': 'KARTING TENERIFE',
  'karting-canarias': 'KARTING CANARIAS'
});

export function getTrackPublicName(trackOrId, language='es') {
  const rawId=String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
  const id=canonicalTrackId(rawId);
  const forced=PUBLIC_TRACK_NAMES[id]||PUBLIC_TRACK_NAMES[rawId];
  if(forced)return forced;
  const track=typeof trackOrId==='object'&&trackOrId?trackOrId:TRACK_REGISTRY[id]||TRACK_REGISTRY[rawId];
  return String(track?.meta?.publicName||track?.name||id||'').trim();
}

// Keep every legacy consumer aligned with the same canonical public name.
for (const [key, name] of Object.entries(PUBLIC_TRACK_NAMES)) {
  const track=TRACK_REGISTRY[key];
  if(!track)continue;
  try {
    Object.defineProperty(track,'name',{configurable:true,enumerable:true,get:()=>name,set:()=>{}});
  } catch {
    track.name=name;
  }
  track.meta={...(track.meta||{}),publicName:name};
}

export { PUBLIC_TRACK_NAMES };
