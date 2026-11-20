// The authenticated server best is the source of truth for the publication
// indicator. Cached leaderboards and local ad receipts cannot prove a upload.
export function classifyRaceControlPublication(localMs,onlineMs){
 const local=Number(localMs);
 if(!Number.isSafeInteger(local)||local<=1000)return 'no-local';
 if(onlineMs==null)return 'publish';
 const online=Number(onlineMs);
 if(!Number.isSafeInteger(online)||online<=0)throw new Error('Invalid server personal-best response');
 if(online===local)return 'published';
 return online<local?'online-better':'publish';
}

// Bounded per-account / per-circuit read-only checks. Separate track editions
// and normal/inverse tracks are distinct exact IDs, never group by display name.
export function createRaceControlPublicationChecks(readBest,{ttlMs=45000,now=()=>Date.now()}={}){
 if(typeof readBest!=='function')throw new TypeError('readBest must be callable');
 const cache=new Map();
 const keyFor=(account,track)=>String(account||'')+'|'+String(track||'');
 const read=async(account,track,{force=false}={})=>{
  if(!account||!track)throw new Error('A verified account and circuit are required');
  const key=keyFor(account,track);
  const prev=cache.get(key);
  if(!force&&prev&&(prev.pending||now()-prev.at<ttlMs))return prev.promise;
  const entry={pending:true,at:now(),promise:null};
  entry.promise=Promise.resolve().then(()=>readBest(track)).then(record=>{
   const best=record==null?null:Number(record.best_time_ms);
   if(best!==null&&(!Number.isSafeInteger(best)||best<=0))
    throw new Error('Invalid own best from server');
   entry.pending=false;entry.at=now();
   return best;
  },error=>{if(cache.get(key)===entry)cache.delete(key);throw error;});
  cache.set(key,entry);
  if(cache.size>48){
   for(const [k,v] of cache){if(!v.pending){cache.delete(k);break;}}
  }
  return entry.promise;
 };
 const remember=(account,track,best)=>{
  if(!account||!track)return;
  if(!Number.isSafeInteger(best)||best<=0)return;
  const key=keyFor(account,track);
  cache.set(key,{pending:false,at:now(),promise:Promise.resolve(best)});
 };
 const invalidate=(account,track)=>{if(account&&track)cache.delete(keyFor(account,track));};
 return {read,remember,invalidate};
}
