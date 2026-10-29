// Isolated libwebp encoder for browsers without canvas WebP export (iOS Safari).
// Imported only when the owner presses Convert in the Admin Hub.
// WASM and codec assets are bundled locally by Vite; no photo leaves this PWA.
import encode from '@jsquash/webp/encode.js';

const isWebp=bytes=>{
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
  return b.length>=12&&b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&
    b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
};
self.onmessage=async ({data})=>{
  try{
    const {width,height,quality,rgba}=data||{};
    if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||
       width>16_383||height>16_383||width*height>64_000_000||!
       (rgba instanceof ArrayBuffer)||rgba.byteLength!==width*height*4)
      throw Error('Datos de imagen inválidos para el codificador');
    const imageData={data:new Uint8ClampedArray(rgba),width,height};
    const output=await encode(imageData,{quality:Number(quality),method:4,alpha_quality:100,thread_level:0});
    if(!isWebp(output))throw Error('La codificación no produjo un archivo WebP válido');
    const bytes=output instanceof ArrayBuffer?output:output.buffer;
    self.postMessage({buffer:bytes},[bytes]);
  }catch(err){self.postMessage({error:err?.message||'Error del codificador WebP local'});}
};
