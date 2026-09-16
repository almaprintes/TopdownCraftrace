const envModules={
  ...import.meta.glob('./library/*/environment.json',{eager:true}),
  ...import.meta.glob('./library/*/*.environment.json',{eager:true})
};

const CANONICAL_SLUGS=Object.freeze({track01:'circuito-atlantico'});
function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}

const REGISTRY={};
for(const [path,mod] of Object.entries(envModules)){
  const m=path.match(/\/library\/([^/]+)\/(?:environment|[^/]+\.environment)\.json$/);if(!m)continue;
  const data=mod?.default??mod;if(!data||typeof data!=='object')continue;
  const id=CANONICAL_SLUGS[m[1]]||m[1];
  REGISTRY[id]={...data,trackId:id,baseTrack:data.baseTrack?{...data.baseTrack,id,name:id==='circuito-atlantico'?'CIRCUITO ATLÁNTICO':data.baseTrack.name}:data.baseTrack};
}

export function hasTrackEnvironment(trackId){return !!REGISTRY[trackId];}
export function createTrackEnvironment(trackId){return clone(REGISTRY[trackId]||null);}
export function getTrackEnvironmentKeys(){return Object.keys(REGISTRY);}
