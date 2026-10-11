// TrackStudio: native-image projects, IndexedDB persistence and portable .tdrtrack.
// Header sniffing also recovers legacy files that accidentally embedded another bundle.
const DB='tdr-trackstudio-image-v1', STORE='images', MAGIC='TDR-IMAGE-PROJECT-V1\n';
const enc=new TextEncoder(), dec=new TextDecoder();
function openDb(){return new Promise((ok,no)=>{if(typeof indexedDB==='undefined')return no(new Error('IndexedDB no disponible'));const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error||new Error('Error abriendo IndexedDB'))})}
async function act(mode,id,value){const db=await openDb();return new Promise((ok,no)=>{const tx=db.transaction(STORE,mode),s=tx.objectStore(STORE),r=mode==='readonly'?s.get(id):s.put(value,id);let result;r.onsuccess=()=>result=r.result;tx.oncomplete=()=>{db.close();ok(result)};tx.onerror=()=>{db.close();no(tx.error||new Error('Error almacenando imagen'))};tx.onabort=()=>{db.close();no(tx.error||new Error('Transacción cancelada'))}})}
// WebKit can lose the file backing of a Blob stored directly in IndexedDB
// (NotFoundError / "The object can not be found here") after PWA navigation.
// Persist self-contained bytes instead of an opaque OS-backed Blob reference.
export async function encodeCanvasImageRecord(id,blob,meta){
  if(!id||!(blob instanceof Blob)||!blob.size)throw Error('Imagen inválida');
  let buffer;
  try{buffer=await blob.arrayBuffer();}
  catch(error){throw new Error('No se pueden leer los bytes de esta fotografía. Vuelve a seleccionarla desde Archivos.',{cause:error});}
  if(!buffer.byteLength||buffer.byteLength!==blob.size)
    throw Error('Lectura incompleta de la fotografía');
  return {bytes:new Uint8Array(buffer),mimeType:blob.type||meta?.type||'image/png',
    meta:{...meta,imageId:id}};
}
export async function decodeCanvasImageRecord(row){
  if(!row)return null;
  let bytes,legacy=false;
  if(row.bytes instanceof Uint8Array)bytes=row.bytes;
  else if(row.bytes instanceof ArrayBuffer)bytes=new Uint8Array(row.bytes);
  else if(row.blob instanceof Blob){
    legacy=true;
    try{bytes=new Uint8Array(await row.blob.arrayBuffer());}
    catch(error){
      throw new Error('La fotografía guardada en este iPhone ya no se puede leer. Recupera la imagen WebP/PNG o el .tdrtrack original.',{cause:error});
    }
  }else throw Error('La fotografía guardada no contiene datos de imagen');
  if(!bytes.byteLength)throw Error('La fotografía guardada está vacía');
  return {blob:new Blob([bytes],{type:row.mimeType||row.blob?.type||row.meta?.type||'image/png'}),
    bytes,meta:row.meta,legacy};
}
export async function saveCanvasImage(id,blob,meta){
  const row=await encodeCanvasImageRecord(id,blob,meta);
  await act('readwrite',id,row);
}
export async function readCanvasImage(id){
  if(!id)return null;
  const stored=await act('readonly',id);
  const value=await decodeCanvasImageRecord(stored);
  if(!value)return null;
  // Migrate old valid Blob rows when possible. No deletion or mutation of
  // user geometry; a quota error must not discard a readable image in memory.
  if(value.legacy){
    try{await act('readwrite',id,{bytes:value.bytes,mimeType:value.blob.type,meta:value.meta});}
    catch(error){console.warn('[TrackStudio] Legacy image migration deferred',error);}
  }
  return {blob:value.blob,meta:value.meta};
}
export function packImageProject(project,blob,meta){if(!(blob instanceof Blob)||!blob.size)throw Error('Falta la imagen maestra');const desc={...meta,size:blob.size,type:blob.type||meta?.type||'image/png'},json=enc.encode(JSON.stringify({...project,imageAsset:desc})),prefix=enc.encode(MAGIC+json.byteLength+'\n');return new Blob([prefix,json,blob],{type:'application/octet-stream'})}
export async function looksLikeImageProject(blob){
  if(!(blob instanceof Blob)||!blob.size)return false;
  const bytes=await blob.slice(0,enc.encode(MAGIC).length).arrayBuffer();
  return dec.decode(bytes)===MAGIC;
}
async function parseBundle(blob){
  if(!(blob instanceof Blob)||!blob.size)throw Error('Archivo vacío');
  const lead=dec.decode(await blob.slice(0,160).arrayBuffer());
  if(!lead.startsWith(MAGIC))throw Error('No es un paquete .tdrtrack');
  const match=lead.slice(MAGIC.length).match(/^(\d+)\n/);
  if(!match)throw Error('Cabecera .tdrtrack incorrecta');
  const len=Number(match[1]),offset=enc.encode(MAGIC+match[1]+'\n').byteLength;
  if(!Number.isSafeInteger(len)||len<2||len>20_000_000||offset+len>=blob.size)
    throw Error('Paquete .tdrtrack incompleto');
  let project;
  try {project=JSON.parse(dec.decode(await blob.slice(offset,offset+len).arrayBuffer()));}
  catch {throw Error('Datos JSON internos del proyecto dañados');}
  if(!project || typeof project!=='object')throw Error('Proyecto .tdrtrack sin datos');
  return {project,image:blob.slice(offset+len)};
}
function imageFormat(bytes) {
  const b=new Uint8Array(bytes);
  if(b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return 'image/png';
  if(b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
  if(b.length>=12&&[82,73,70,70].every((v,i)=>b[i]===v)&&[87,69,66,80].every((v,i)=>b[i+8]===v))return 'image/webp';
  return null;
}
async function extractImage(blob,expectedSize) {
  let image=blob,nested=0;
  while(await looksLikeImageProject(image)){
    if(++nested>5)throw Error('Demasiados paquetes .tdrtrack anidados');
    const inner=await parseBundle(image);
    if(!inner.project?.editor?.imageCanvas)throw Error('Paquete interno sin imagen');
    image=inner.image;
  }
  if(!image.size)throw Error('La imagen maestra está vacía');
  if(Number.isFinite(expectedSize)&&expectedSize>0&&image.size!==expectedSize)
    throw Error('La imagen maestra no coincide con el tamaño guardado');
  const format=imageFormat(await image.slice(0,16).arrayBuffer());
  if(!format)throw Error('El archivo no contiene una imagen PNG, JPEG o WebP válida');
  return {blob:image.slice(0,image.size,format),format,nested};
}
export async function normalizeCanvasImageBlob(blob,meta){
  const result=await extractImage(blob,Number(meta?.size));
  if(meta?.type && result.format!==meta.type && !(meta.type==='image/jpg'&&result.format==='image/jpeg'))
    throw Error('El formato de la imagen no coincide con el proyecto');
  return result;
}
export async function unpackImageProject(blob){
  const {project,image}=await parseBundle(blob);
  if(!project.editor?.imageCanvas)throw Error('El proyecto no contiene un lienzo de imagen');
  const {blob:decoded,format,nested}=await extractImage(image,Number(project.imageAsset?.size));
  if(project.imageAsset?.type&&project.imageAsset.type!==format &&
    !(project.imageAsset.type==='image/jpg'&&format==='image/jpeg'))throw Error('Formato de imagen distinto al esperado');
  return {project,image:decoded,repairedNested:nested>0};
}
