// Official CraftRace Studio ZIP reader (no network calls, no auth dependencies).
// Supports nested ZIPs, PNG/JPEG/WebP and Safari without DecompressionStream.
// Bound decompressed memory and archive count before reading each entry.
import tinyInflate from './vendor/tiny-inflate.mjs';
const MAX_IMAGE_BYTES=12_000_000;
const MAX_ARCHIVE_BYTES=25_000_000;
const MAX_PLAIN_BYTES=100_000_000;
const MAX_IMAGES=100;
const MAX_DEPTH=3;
const imageExt=/\.(webp|png|jpe?g)$/i;
const zipExt=/\.zip$/i;
const textDecoder=new TextDecoder('utf-8');
const mimeOf=name=>/\.webp$/i.test(name)?'image/webp':/\.png$/i.test(name)?'image/png':'image/jpeg';
const u16=(v,o)=>v.getUint16(o,true);
const u32=(v,o)=>v.getUint32(o,true);
const bounds=(start,size,total)=>start>=0&&size>=0&&start<=total&&size<=total-start;
const baseName=name=>name.replace(/\\/g,'/').split('/').pop()||'';
const checksum=data=>{
  let c=0xffffffff;
  for(const byte of data){
    c^=byte;
    for(let b=0;b<8;b++)c=c&1?(c>>>1)^0xedb88320:c>>>1;
  }
  return (c^0xffffffff)>>>0;
};
const isImageBytes=(name,data)=>{
  if(/\.webp$/i.test(name))
    return data.length>=12&&String.fromCharCode(...data.slice(0,4))==='RIFF'&&
      String.fromCharCode(...data.slice(8,12))==='WEBP';
  if(/\.png$/i.test(name))
    return data.length>=8&&data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71&&
      data[4]===13&&data[5]===10&&data[6]===26&&data[7]===10;
  return data.length>=3&&data[0]===255&&data[1]===216&&data[2]===255;
};
const rawInflate=async(compressed,length)=>{
  if(typeof DecompressionStream==='function'){
    try{
      const stream=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      const data=new Uint8Array(await new Response(stream).arrayBuffer());
      if(data.length===length)return data;
    }catch{/* Safari may not implement deflate-raw even with DecompressionStream. */}
  }
  const data=tinyInflate(compressed,new Uint8Array(length));
  if(data.length!==length)throw Error('ZIP dañado: tamaño descomprimido incorrecto.');
  return data;
};
const readEntry=async({bytes,view,method,comp,plain,local,crc,name})=>{
  if(!bounds(local,30,bytes.length)||u32(view,local)!==0x04034b50)
    throw Error('ZIP dañado: cabecera de archivo incompleta.');
  const from=local+30+u16(view,local+26)+u16(view,local+28);
  if(!bounds(from,comp,bytes.length))throw Error('ZIP dañado: datos incompletos.');
  const compressed=bytes.slice(from,from+comp);
  let result;
  if(method===0)result=compressed;
  else if(method===8)result=await rawInflate(compressed,plain);
  else throw Error('El ZIP contiene una compresión no compatible.');
  if(result.length!==plain||checksum(result)!==crc)
    throw Error('ZIP dañado: imagen o archivo interno incorrecto ('+name+').');
  return result;
};
export async function readStudioAvatarZip(blob){
  if(blob.size>MAX_ARCHIVE_BYTES)throw Error('El ZIP supera el límite de 25 MB.');
  const result=[],budget={plain:0,entries:0};
  const visit=async(fileBytes,depth)=>{
    if(depth>=MAX_DEPTH)throw Error('Hay demasiados ZIP anidados. Máximo 3 niveles.');
    if(fileBytes.length>MAX_ARCHIVE_BYTES)throw Error('Un ZIP interno supera 25 MB.');
    const view=new DataView(fileBytes.buffer,fileBytes.byteOffset,fileBytes.byteLength);
    let eocd=-1;
    for(let i=fileBytes.length-22;i>=Math.max(0,fileBytes.length-65557);i--)
      if(u32(view,i)===0x06054b50){eocd=i;break;}
    if(eocd<0||!bounds(eocd,22,fileBytes.length))
      throw Error('El archivo no es un ZIP válido.');
    const count=u16(view,eocd+10);
    if(count===0)return;
    if(count===65535)throw Error('ZIP64 no compatible con este importador.');
    const cdSize=u32(view,eocd+12),cdStart=u32(view,eocd+16);
    if(!bounds(cdStart,cdSize,fileBytes.length))throw Error('ZIP dañado: índice central fuera de rango.');
    let at=cdStart;
    for(let i=0;i<count;i++){
      if(++budget.entries>350)throw Error('Demasiados archivos en los ZIP.');
      if(!bounds(at,46,fileBytes.length)||u32(view,at)!==0x02014b50)
        throw Error('ZIP dañado: índice incompleto.');
      const flags=u16(view,at+8),method=u16(view,at+10),crc=u32(view,at+16);
      const comp=u32(view,at+20),plain=u32(view,at+24);
      const nameLen=u16(view,at+28),extraLen=u16(view,at+30),commentLen=u16(view,at+32);
      const local=u32(view,at+42),nameOffset=at+46;
      if(!bounds(nameOffset,nameLen+extraLen+commentLen,fileBytes.length))
        throw Error('ZIP dañado: nombre de archivo incompleto.');
      const name=textDecoder.decode(fileBytes.subarray(nameOffset,nameOffset+nameLen));
      at=nameOffset+nameLen+extraLen+commentLen;
      if(name.endsWith('/')||name.startsWith('__MACOSX/')||baseName(name).startsWith('.'))continue;
      const basename=baseName(name);
      const inner=zipExt.test(basename),image=imageExt.test(basename);
      if(!inner&&!image)continue; // e.g. Python publisher script or documentation
      if(flags&1)throw Error('El ZIP contiene archivos cifrados.');
      if(plain>MAX_ARCHIVE_BYTES||comp>MAX_ARCHIVE_BYTES)
        throw Error('Un archivo del ZIP supera 25 MB.');
      if(image&&plain>MAX_IMAGE_BYTES)throw Error('Una imagen supera 12 MB.');
      budget.plain+=plain;
      if(budget.plain>MAX_PLAIN_BYTES)throw Error('El contenido ZIP supera 100 MB.');
      if(inner&&depth+1>=MAX_DEPTH)throw Error('ZIP anidado demasiado profundo.');
      const data=await readEntry({bytes:fileBytes,view,method,comp,plain,local,crc,name:basename});
      if(inner)await visit(data,depth+1);
      else{
        if(!isImageBytes(basename,data))throw Error('La imagen '+basename+' tiene un formato incorrecto.');
        result.push({name:basename,mime:mimeOf(basename),bytes:data});
        if(result.length>MAX_IMAGES)throw Error('Máximo 100 imágenes por lote.');
      }
    }
  };
  await visit(new Uint8Array(await blob.arrayBuffer()),0);
  if(!result.length)throw Error('No se han encontrado imágenes. El ZIP debe contener PNG, JPG o WebP, directamente o en un ZIP interior.');
  return result;
}
export const studioAvatarImageType=name=>imageExt.test(name)?mimeOf(name):null;
