// CraftRace Studio: concurrency-safe, single-commit avatar publication.
// Image blobs are prepared/uploaded ONCE; only the lightweight tree/commit
// is recreated if another GitHub writer moves main before we update the ref.
const fmt=n=>'avatar_'+String(n).padStart(4,'0');
const maxAvatarNumber=paths=>{
  let max=0;
  for(const path of paths){
    const m=/(?:^|\/)avatar_(\d{2,4})(?:\.webp)?$/.exec(path);
    if(m)max=Math.max(max,Number(m[1]));
  }
  return max;
};
export const isNonFastForward=error=>/\bfast[ -]?forward\b|reference update failed|\bref update\b|conflict while updating/i.test(
  String(error?.message||error||'')
);
const getTree=async(github,ref)=>{
  const tree=await github('/git/trees/'+encodeURIComponent(ref)+'?recursive=1');
  if(tree?.truncated||!Array.isArray(tree?.tree))
    throw Error('GitHub no devolvió el árbol completo. No se publicará para evitar sobrescribir archivos.');
  return tree.tree;
};
const hasBlobs=(tree,entries)=>{
  const refs=new Map(tree.filter(x=>x.type==='blob').map(x=>[x.path,x.sha]));
  return entries.every(x=>refs.get(x.path)===x.sha);
};
async function branchContains(github,entries){
  const head=await github('/git/ref/heads/main');
  if(!head?.object?.sha)throw Error('GitHub no confirmó el estado de la rama main.');
  return hasBlobs(await getTree(github,head.object.sha),entries);
}
/**
 * @param {object} args
 * @param {function} args.github - a narrow GitHub REST client; bearer handled elsewhere
 * @param {Array} args.blobs - [{sha,label}] already created with git/blobs
 * @param {function} args.catalogIds - async fetch of current catalog IDs
 * @param {object} args.metadata - size, active, exclusive, owner
 * @param {string} args.exclusiveId - unique single-portrait ID, if exclusive
 * @param {function} args.report - user-facing progress text
 */
export async function commitStudioAvatarBatch({
  github,blobs,catalogIds,metadata,exclusiveId=null,report=()=>{},maxAttempts=7
}){
  if(!Array.isArray(blobs)||!blobs.length||blobs.length>100||
    blobs.some(x=>!(/^[0-9a-f]{40}$/.test(String(x.sha)))||typeof x.label!=='string'))
    throw Error('Archivos del lote incompletos; no se ha iniciado la publicación.');
  if(metadata?.exclusive && (blobs.length!==1||!/^founder_[a-z0-9_]+$/.test(exclusiveId||'')))
    throw Error('ID exclusivo no válido.');
  if(!Number.isInteger(maxAttempts)||maxAttempts<1||maxAttempts>10)
    throw Error('Límite de reintentos inválido.');
  const fileDir='studio/assets/avatars/';
  const urlDir='https://almaprintes.github.io/TopdownCraftrace/studio-assets/avatars/';
  for(let attempt=1;attempt<=maxAttempts;attempt++){
    report(attempt===1?'Preparando el commit de avatares…':
      'GitHub ha cambiado mientras publicabas. Actualizando el lote sobre la versión más reciente ('+attempt+'/'+maxAttempts+')…');
    const head=await github('/git/ref/heads/main');
    const baseSha=head?.object?.sha;
    if(!/^[0-9a-f]{40}$/.test(String(baseSha)))
      throw Error('GitHub no devolvió una referencia válida de main.');
    const base=await github('/git/commits/'+baseSha);
    if(!/^[0-9a-f]{40}$/.test(String(base?.tree?.sha)))
      throw Error('GitHub no devolvió el árbol base.');
    const treeFiles=await getTree(github,baseSha);
    const known=await catalogIds();
    if(!Array.isArray(known))throw Error('No se pudo comprobar el catálogo existente.');
    const start=maxAvatarNumber([...treeFiles.map(x=>x.path),...known])+1;
    if(!metadata.exclusive&&start+blobs.length-1>9999)
      throw Error('Se han agotado los números del catálogo público.');
    const entries=blobs.map((blob,i)=>{
      const id=metadata.exclusive?exclusiveId:fmt(start+i);
      return {path:fileDir+id+'.webp',mode:'100644',type:'blob',sha:blob.sha,id,label:blob.label};
    });
    const existingPaths=new Set(treeFiles.filter(x=>x.type==='blob').map(x=>x.path));
    if(entries.some(x=>existingPaths.has(x.path)))
      throw Error('El ID del avatar ya existe en GitHub; no se sobrescribirá.');
    const rows=entries.map((entry,i)=>({
      id:entry.id,label:entry.label||(metadata.exclusive?'Piloto fundador':'Piloto '+String(start+i).padStart(4,'0')),
      image_url:urlDir+entry.id+'.webp',active:metadata.active,sort_order:start+i,
      width_px:metadata.width,height_px:metadata.height,exclusive:metadata.exclusive,
      owner_user_id:metadata.exclusive?metadata.owner:null
    }));
    const newTree=await github('/git/trees',{method:'POST',body:{base_tree:base.tree.sha,tree:entries.map(({path,mode,type,sha})=>({path,mode,type,sha}))}});
    if(!/^[0-9a-f]{40}$/.test(String(newTree?.sha)))throw Error('GitHub no creó el árbol del lote.');
    const msg='feat(studio): publish '+entries.length+' avatars '+(metadata.exclusive?'exclusive':fmt(start)+' to '+fmt(start+blobs.length-1));
    const commit=await github('/git/commits',{method:'POST',body:{message:msg,tree:newTree.sha,parents:[baseSha]}});
    if(!/^[0-9a-f]{40}$/.test(String(commit?.sha)))throw Error('GitHub no creó el commit del lote.');
    const expected=entries.map(({path,sha})=>({path,sha}));
    try{
      await github('/git/refs/heads/main',{method:'PATCH',body:{sha:commit.sha,force:false}});
    }catch(error){
      // GitHub can return a lost-response error AFTER applying the update.
      // First check whether the desired files are actually on main.
      if(await branchContains(github,expected))return {rows,commitSha:commit.sha,attempts:attempt};
      if(!isNonFastForward(error))throw error;
      if(attempt===maxAttempts)
        throw Error('GitHub ha cambiado demasiadas veces mientras publicabas. No se ha registrado ningún avatar: vuelve a intentar la publicación cuando termine la actividad del repositorio.');
      continue;
    }
    // Do not require main === commit.sha; someone may already have pushed
    // another code commit *after* our successful commit.
    if(await branchContains(github,expected))
      return {rows,commitSha:commit.sha,attempts:attempt};
    if(attempt===maxAttempts)
      throw Error('GitHub no confirmó los archivos publicados en la rama main. Comprueba el repositorio antes de repetir.');
  }
  throw Error('No se pudo completar el lote.');
}
