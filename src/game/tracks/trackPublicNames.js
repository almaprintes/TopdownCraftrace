import { TRACK_REGISTRY, CANONICAL_TRACK_IDS, canonicalTrackId } from './trackIdentity.js';
import '../ui/sessionEngineerTrendRuntime.js';
import '../social/pilotProfile.js';

if(typeof window!=='undefined'){
  window.addEventListener('tdr:bootready',()=>{
    import('../scenes/statsTesterExchangePatch.js').catch(err=>console.warn('[tester-exchange] patch load failed',err));
  },{once:true});
}

const PUBLIC_TRACK_NAMES=Object.freeze({
  [CANONICAL_TRACK_IDS.ATLANTICO]:'CIRCUITO ATLÁNTICO',
  'santa-cruz':'SANTA CRUZ',
  'karting-tenerife':'KARTING TENERIFE',
  'karting-canarias':'KARTING CANARIAS'
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
