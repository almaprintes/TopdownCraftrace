import { TRACK_REGISTRY } from './trackRegistry.js';

// Circuit names are proper names: their public identity belongs to the track id
// and never changes with UI language or selector position. Only surrounding UI
// labels are translated.
const PUBLIC_TRACK_NAMES = Object.freeze({
  track01: 'CIRCUITO ATLÁNTICO',
  'karting-tenerife': 'KARTING TENERIFE'
});

export function getTrackPublicName(trackOrId, language='es') {
  const id=String(typeof trackOrId==='string'?trackOrId:(trackOrId?.key||trackOrId?.id||'')).trim();
  const forced=PUBLIC_TRACK_NAMES[id];
  if(forced)return forced;
  const track=typeof trackOrId==='object'&&trackOrId?trackOrId:TRACK_REGISTRY[id];
  return String(track?.meta?.publicName||track?.name||id||'').trim();
}

// Keep legacy consumers aligned with the same canonical public name.
for (const [key, name] of Object.entries(PUBLIC_TRACK_NAMES)) {
  const track=TRACK_REGISTRY[key];
  if(!track)continue;
  track.name=name;
  track.meta={...(track.meta||{}),publicName:name};
}

export { PUBLIC_TRACK_NAMES };
