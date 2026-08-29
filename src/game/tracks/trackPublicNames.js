import { TRACK_REGISTRY } from './trackRegistry.js';

// Circuit names are proper names: their public identity belongs to the registry key
// and never changes with UI language, selector position or legacy track metadata.
// Only surrounding UI labels are translated.
const PUBLIC_TRACK_NAMES = Object.freeze({
  track01: 'CIRCUITO ATLÁNTICO',
  'karting-tenerife': 'KARTING TENERIFE',
  'karting-canarias': 'KARTING CANARIAS'
});

export function getTrackPublicName(trackOrId, language='es') {
  const id=String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
  const forced=PUBLIC_TRACK_NAMES[id];
  if(forced)return forced;
  const track=typeof trackOrId==='object'&&trackOrId?trackOrId:TRACK_REGISTRY[id];
  return String(track?.meta?.publicName||track?.name||id||'').trim();
}

// Keep every legacy consumer aligned with the same canonical public name.
// Some older track objects carry stale/duplicated `name` metadata even though the
// registry key is correct. Lock the public name at the registry entry so lobby,
// selector and any other consumer can never disagree again.
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
