const envModules={
  ...import.meta.glob('./library/*/environment.json',{eager:true}),
  ...import.meta.glob('./library/*/*.environment.json',{eager:true})
};

// Canonical IDs let editors use stable public names while legacy runtime keys keep working.
// Add future migrations here once; callers never need circuit-specific branches.
const CANONICAL_SLUGS=Object.freeze({track01:'circuito-atlantico'});
function normalize(value){return String(value||'').trim().toLowerCase().replace(/_/g,'-');}
function canonical(value){const id=normalize(value);return CANONICAL_SLUGS[id]||id;}
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}

const REGISTRY={};
const ALIASES={};
for(const [path,mod] of Object.entries(envModules)){
  const m=path.match(/\/library\/([^/]+)\/(?:environment|[^/]+\.environment)\.json$/);if(!m)continue;
  const data=mod?.default??mod;if(!data||typeof data!=='object')continue;
  const folder=normalize(m[1]);
  const id=canonical(folder);
  const record={...data,trackId:id,baseTrack:data.baseTrack?{...data.baseTrack,id,name:id==='circuito-atlantico'?'CIRCUITO ATLÁNTICO':data.baseTrack.name}:data.baseTrack};
  REGISTRY[id]=record;
  ALIASES[folder]=id;
  ALIASES[id]=id;
  for(const candidate of [data.trackId,data?.baseTrack?.id,data?.baseTrack?.trackId]){
    const alias=normalize(candidate);if(alias)ALIASES[alias]=id;
  }
}

export function resolveTrackEnvironmentId(trackId){const id=normalize(trackId);return ALIASES[id]||canonical(id);}
export function hasTrackEnvironment(trackId){return !!REGISTRY[resolveTrackEnvironmentId(trackId)];}
export function createTrackEnvironment(trackId){return clone(REGISTRY[resolveTrackEnvironmentId(trackId)]||null);}
export function getTrackEnvironmentKeys(){return Object.keys(REGISTRY);}
