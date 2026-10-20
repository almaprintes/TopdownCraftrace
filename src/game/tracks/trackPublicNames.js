import { TRACK_REGISTRY, CANONICAL_TRACK_IDS, canonicalTrackId } from './trackIdentity.js';
import '../ui/sessionEngineerTrendRuntime.js';
import '../social/pilotProfile.js';
import '../scenes/statsTesterExchangePatch.js';

const PUBLIC_TRACK_NAMES=Object.freeze({
  [CANONICAL_TRACK_IDS.ATLANTICO]:'CIRCUITO ATLÁNTICO',
  'circuito-atlantico-inverso':'CIRCUITO ATLÁNTICO INVERSO',
  'santa-cruz':'SANTA CRUZ',
  'santa-cruz-inverso':'SANTA CRUZ INVERSO',
  'karting-tenerife':'KARTING TENERIFE INVERSO',
  'karting-tenerife-horario':'KARTING TENERIFE',
  'karting-canarias':'KARTING CANARIAS',
  'karting-canarias-inverso':'KARTING CANARIAS INVERSO',
  'karting-canarias-4096':'KARTING CANARIAS',
  'karting-canarias-4096-inverso':'KARTING CANARIAS INVERSO',
  'karting-americas':'KARTING AMÉRICAS',
  'karting-americas-inverso':'KARTING AMÉRICAS INVERSO',
  'rally-arafo-los-loros':'ARAFO → LOS LOROS'
});

export function getTrackPublicName(trackOrId,language='es'){
  const id=canonicalTrackId(trackOrId);
  const forced=PUBLIC_TRACK_NAMES[id];
  if(forced)return forced;
  const track=typeof trackOrId==='object'&&trackOrId?trackOrId:TRACK_REGISTRY[id];
  return String(track?.meta?.publicName||track?.name||id||'').trim();
}

for(const [key,name] of Object.entries(PUBLIC_TRACK_NAMES)){
  const track=TRACK_REGISTRY[key];if(!track)continue;
  try{Object.defineProperty(track,'name',{configurable:true,enumerable:true,get:()=>name,set:()=>{}});}catch{track.name=name;}
  track.meta={...(track.meta||{}),publicName:name};
}

export { PUBLIC_TRACK_NAMES };
