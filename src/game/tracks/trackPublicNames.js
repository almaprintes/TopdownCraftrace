import { TRACK_REGISTRY } from './trackRegistry.js';

// Public identity belongs to the track id, never to its position in a selector.
// This is the single source used by lobby/selector/statistics so a geometry can
// never inherit the display name of another circuit after sorting or filtering.
const PUBLIC_TRACK_NAMES = Object.freeze({
  track01: Object.freeze({ es:'CIRCUITO ATLÁNTICO', en:'ATLANTIC CIRCUIT' }),
  'karting-tenerife': Object.freeze({ es:'KARTING TENERIFE', en:'KARTING TENERIFE' })
});

export function getTrackPublicName(trackOrId, language='es') {
  const id=String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
  const lang=String(language||'es').toLowerCase().startsWith('en')?'en':'es';
  const forced=PUBLIC_TRACK_NAMES[id];
  if(forced)return forced[lang]||forced.es;
  const track=typeof trackOrId==='object'&&trackOrId?trackOrId:TRACK_REGISTRY[id];
  return String(track?.meta?.publicName||track?.name||id||'').trim();
}

// Keep legacy consumers sane as well. The registry stores the Spanish/default
// public name; bilingual UI should call getTrackPublicName explicitly.
for (const [key, names] of Object.entries(PUBLIC_TRACK_NAMES)) {
  const track=TRACK_REGISTRY[key];
  if(!track)continue;
  track.name=names.es;
  track.meta={...(track.meta||{}),publicName:names.es};
}

export { PUBLIC_TRACK_NAMES };
