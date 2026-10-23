// DEV 1.3.4: migrate ONLY four rewritten photo-circuit timing identities.
// Archive legacy device-local data in IndexedDB before retiring localStorage
// records. Never touch Supabase / online rankings / unrelated player saves.
export const RETIRED_TRACK_IDS=Object.freeze([
  'santa-cruz','santa-cruz-inverso',
  'circuito-atlantico','circuito-atlantico-inverso'
]);
const MIGRATION='tdr2:trackGeometryReset:2026-10-23:v1:';
const DB_NAME='tdr2:retiredTrackRecordsArchive';
const DB_STORE='snapshots';

export const migrationMarker=id=>MIGRATION+id;

export function retiredTrackKeys(storage,id){
  if(!RETIRED_TRACK_IDS.includes(id))return[];
  const fixed=new Set([
    'tdr2:ttHist:'+id,
    'tdr2:ttBest:'+id,
    'tdr2:ghostPb:'+id
  ]);
  const prefixes=[
    'tdr2:topReplay:'+encodeURIComponent(id)+':',
    'tdr2:ghost:'+id+':',
    'tdr2:ghostGeometry:'+id+':'
  ];
  const found=[];
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i);
    if(typeof key==='string'&&(fixed.has(key)||prefixes.some(p=>key.startsWith(p))))
      found.push(key);
  }
  return found;
}

function openArchiveDb(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB unavailable'));
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{
      if(!request.result.objectStoreNames.contains(DB_STORE))
        request.result.createObjectStore(DB_STORE,{keyPath:'id'});
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('Archive database could not open'));
    request.onblocked=()=>reject(new Error('Archive database blocked by another tab'));
  });
}

async function archiveRowsInDb(db,id,entries){
  // Merge any prior partial migration snapshot: retry must never overwrite
  // the ONLY retained copy after a tab closes halfway through a reset.
  return new Promise((resolve,reject)=>{
    let settled=false,existing=null;
    const tx=db.transaction(DB_STORE,'readwrite');
    const finishError=e=>{if(!settled){settled=true;reject(e||new Error('Archive transaction failed'));}};
    tx.oncomplete=()=>{if(!settled){settled=true;resolve();}};
    tx.onerror=()=>finishError(tx.error);
    tx.onabort=()=>finishError(tx.error);
    const store=tx.objectStore(DB_STORE);
    const get=store.get(id);
    get.onerror=()=>finishError(get.error);
    get.onsuccess=()=>{
      existing=get.result;
      const merged={...(existing?.entries||{}),...entries};
      store.put({
        id,version:1,archivedAt:existing?.archivedAt||Date.now(),
        migratedAt:Date.now(),entries:merged
      });
    };
  });
}

// Can be tested without a browser. No deletion if backup storage fails.
export async function archiveAndResetTracks({storage,archive}){
  const outcomes={reset:[],already:[],skipped:[],failed:[]};
  for(const id of RETIRED_TRACK_IDS){
    try{
      if(storage.getItem(migrationMarker(id))==='1'){
        outcomes.already.push(id);continue;
      }
      const keys=retiredTrackKeys(storage,id);
      if(keys.length){
        const entries={};
        for(const key of keys){
          const raw=storage.getItem(key);
          if(raw!==null)entries[key]=raw;
        }
        // The promise resolves only after the durable IDB transaction commits.
        await archive(id,entries);
        for(const key of keys)storage.removeItem(key);
        if(keys.some(key=>storage.getItem(key)!==null))
          throw new Error('Could not retire all archived entries');
        outcomes.reset.push(id);
      }else outcomes.skipped.push(id);
      storage.setItem(migrationMarker(id),'1');
    }catch(e){
      outcomes.failed.push({id,reason:String(e?.message||e)});
    }
  }
  return outcomes;
}

export async function archiveRetiredTrackRecords(){
  // Open first. If unavailable, NOT ONE legacy record is deleted.
  let db;
  try{db=await openArchiveDb();}
  catch(e){return{reset:[],skipped:[],already:[],
    failed:RETIRED_TRACK_IDS.map(id=>({id,reason:String(e?.message||e)}))};}
  try{
    const outcome=await archiveAndResetTracks({
      storage:localStorage,
      archive:(id,entries)=>archiveRowsInDb(db,id,entries)
    });
    if(outcome.reset.length){
      // The shared Race Control index is only a derived cache. Remove the
      // four retired entries without invoking unrelated legacy cleanup (such
      // as track01 purging) or touching any other track's cached results.
      try{
        const indexKey='tdr2:raceRecords:v1';
        const raw=localStorage.getItem(indexKey);
        if(raw){
          const index=JSON.parse(raw);
          if(index?.tracks&&typeof index.tracks==='object'){
            for(const id of outcome.reset)delete index.tracks[id];
            index.updatedAt=Date.now();
            localStorage.setItem(indexKey,JSON.stringify(index));
          }
        }
      }catch(e){console.warn('[TDR] Race Control cache will refresh on open',e);}
    }
    return outcome;
  }finally{
    try{db.close();}catch{}
  }
}
