// Transient Track Studio data must NEVER evict the user's project, account
// settings, old previews or unrelated app keys when Safari's localStorage
// reaches its quota. The current race and editor return run in the same tab,
// where sessionStorage offers a separate, short-lived storage allocation.
const safeStore=name=>{
 try{return globalThis[name]||null;}catch{return null;}
};

export function writeTrackStudioWorkingCopy(key,value){
 const local=safeStore('localStorage'),session=safeStore('sessionStorage');
 let localError;
 try{
  if(!local)throw Error('Almacenamiento local no disponible');
  local.setItem(key,value);
  // A previous quota fallback must not shadow a newer persistent copy.
  try{session?.removeItem(key);}catch{}
  return 'local';
 }catch(err){localError=err;}
 try{
  if(!session)throw Error('Almacenamiento temporal no disponible');
  session.setItem(key,value);
  console.warn('[TrackStudio] Sin espacio local: copia temporal en esta pestaña',
    localError?.name||localError?.message||'límite local');
  return 'session';
 }catch(err){
  const failure=new Error('Sin espacio para la vista previa o recuperación. '+
    'Exporta tu circuito antes de cerrar Track Studio.');
  failure.cause=err;
  throw failure;
 }
}

export function readTrackStudioWorkingCopies(key){
 const found=[];
 // Prefer the current tab's fresh fallback over an older local copy.
 for(const name of ['sessionStorage','localStorage']){
  try{
   const value=safeStore(name)?.getItem(key);
   if(value)found.push(value);
  }catch{}
 }
 return found;
}

export function readTrackStudioWorkingCopy(key){
 return readTrackStudioWorkingCopies(key)[0]||null;
}
