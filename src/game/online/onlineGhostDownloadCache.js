// Memory-only deduplicated ghost downloads; no storage, no prefetch, no polling.
// A record_ref changes when a pilot publishes a new best, so it is a safe cache key.
// Never call load() before the existing rewarded-ad / promotion authorization gate.
export function createBoundedOnlineGhostCache({maxEntries=4,maxSamples=20000}={}){
  if(!Number.isSafeInteger(maxEntries)||maxEntries<1||
     !Number.isSafeInteger(maxSamples)||maxSamples<1)
    throw new Error('Invalid ghost cache budget.');
  const ready=new Map(),pending=new Map();
  let samples=0;
  const peek=ref=>{
    const key=String(ref||''),hit=ready.get(key);
    if(!hit)return null;
    ready.delete(key);ready.set(key,hit); // LRU; only recently used records survive.
    return hit.value;
  };
  async function load(ref,loader){
    const key=String(ref||'').trim();
    if(!key||typeof loader!=='function')throw new Error('Invalid ghost download.');
    const hit=peek(key);
    if(hit)return hit;
    if(pending.has(key))return pending.get(key);
    const task=Promise.resolve().then(()=>loader(key)).then(value=>{
      const count=value?.ghost?.samples?.length;
      if(!Number.isSafeInteger(count)||count<2)
        throw new Error('No valid online ghost for this reference.');
      // A very large rally ghost remains playable without filling the cache.
      if(count>maxSamples)return value;
      ready.set(key,{value,count});samples+=count;
      while(ready.size>maxEntries||samples>maxSamples){
        const old=ready.keys().next().value,removed=ready.get(old);
        ready.delete(old);samples-=removed.count;
      }
      return value;
    });
    pending.set(key,task);
    try{return await task;}
    finally{if(pending.get(key)===task)pending.delete(key);}
  }
  return {peek,load,size:()=>ready.size,pendingCount:()=>pending.size,
    sampleCount:()=>samples,clear:()=>{ready.clear();samples=0;}};
}
