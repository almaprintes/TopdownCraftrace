const envModules=import.meta.glob('./library/*/environment.json',{eager:true});

function clone(v){return v==null?v:JSON.parse(JSON.stringify(v));}

const REGISTRY={};
for(const [path,mod] of Object.entries(envModules)){
  const m=path.match(/\/library\/([^/]+)\/environment\.json$/);if(!m)continue;
  const data=mod?.default??mod;if(!data||typeof data!=='object')continue;
  REGISTRY[m[1]]=data;
}

export function hasTrackEnvironment(trackId){return !!REGISTRY[trackId];}
export function createTrackEnvironment(trackId){return clone(REGISTRY[trackId]||null);}
export function getTrackEnvironmentKeys(){return Object.keys(REGISTRY);}
