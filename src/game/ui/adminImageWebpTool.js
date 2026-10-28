// Admin-only local image converter. Lazy-loaded by Admin Hub; never in races.
// Browser Canvas processes PNG/JPG and resizing; libwebp/WASM backs up Safari WebP export.
// Browser resampling adds pixels, NOT missing photographic details.
export const MAX_EXPORT_PIXELS=32_000_000;
export const MAX_MOBILE_EXPORT_PIXELS=16_000_000;
export const MAX_EXPORT_EDGE=8192;
export const MAX_BATCH_COUNT=8;
export const MAX_INPUT_BYTES=60*1024*1024;
export const QUALITY_DEFAULT=86;
export const OUTPUT_FORMATS=Object.freeze(['webp','png','jpeg','original']);

export function detectSourceFormat(file){
  const mime=String(file?.type||'').toLowerCase();
  if(mime==='image/jpeg')return 'jpeg';
  if(mime==='image/png')return 'png';
  if(mime==='image/webp')return 'webp';
  if(mime==='image/avif')return 'avif';
  if(mime==='image/heic'||mime==='image/heif')return 'heic';
  const ext=String(file?.name||'').toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return ({jpg:'jpeg',jpeg:'jpeg',png:'png',webp:'webp',avif:'avif',heic:'heic',heif:'heic'})[ext]||null;
}
export function resolveOutputFormat(format,sourceFormat){
  if(!OUTPUT_FORMATS.includes(format))throw Error('Formato de salida no disponible');
  if(format==='original'){
    if(!sourceFormat)throw Error('No se reconoce el formato original de esta imagen');
    return sourceFormat;
  }
  return format;
}
const mimeForFormat=format=>({
  webp:'image/webp',png:'image/png',jpeg:'image/jpeg',avif:'image/avif',heic:'image/heic'
})[format]||'application/octet-stream';

export function targetWebpDimensions(width,height,scale=1,{mobile=false}={}){
  if(![width,height,scale].every(Number.isFinite)||width<=0||height<=0||scale<1||scale>3)
    throw Error('Dimensiones o escala incorrectas');
  const w=Math.round(width*scale),h=Math.round(height*scale);
  if(w>MAX_EXPORT_EDGE||h>MAX_EXPORT_EDGE)
    throw Error('Se superan los 8192 px por lado. Reduce la escala.');
  const max=mobile?MAX_MOBILE_EXPORT_PIXELS:MAX_EXPORT_PIXELS;
  if(w*h>max)
    throw Error(mobile?'Imagen demasiado grande para convertir de forma segura en móvil (16 MP). Utiliza el Mac o reduce la escala.'
      :'La salida supera 32 megapíxeles. Reduce la escala.');
  return {width:w,height:h,pixels:w*h};
}
export function makeImageFilename(original,scale=1,format='webp'){
  if(!['webp','png','jpeg'].includes(format))throw Error('Formato de archivo no compatible');
  const safe=String(original||'imagen').replace(/[\\/\x00-\x1F<>:"|?*]/g,'_').replace(/\.[^.]+$/,'').trim().slice(0,120)||'imagen';
  const extension=format==='jpeg'?'jpg':format;
  return safe+(scale===1?'':('-x'+String(scale).replace('.','_')))+'.'+extension;
}
export function makeWebpFilename(original,scale=1){return makeImageFilename(original,scale,'webp');}
export function humanBytes(size){
  const v=Math.max(0,Number(size)||0);
  return v>=1024*1024?(v/1024/1024).toFixed(2)+' MB':(v/1024).toFixed(0)+' KB';
}
// Browsers like iOS Safari may decode WebP but encode PNG when asked for WebP.
// Verify the RIFF/WEBP signature, never trust a requested MIME alone.
export function isWebpHeader(bytes){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
  if(b.length<12)return false;
  return b[0]===82&&b[1]===73&&b[2]===70&&b[3]===70&&
    b[8]===87&&b[9]===69&&b[10]===66&&b[11]===80;
}
export function webpEncoderSupported(){
  try{const c=document.createElement('canvas');c.width=c.height=2;return c.toDataURL('image/webp').startsWith('data:image/webp');}
  catch{return false;}
}
async function encodeWithLocalWebpWorker(imageData,quality){
  if(typeof Worker!=='function'||typeof WebAssembly!=='object')
    throw Error('Este dispositivo no dispone de WebAssembly para convertir WebP');
  // Each job gets a disposable worker: no WebAssembly heap remains in memory.
  const worker=new Worker(new URL('./adminWebpEncoder.worker.js',import.meta.url),{type:'module'});
  try{
    return await new Promise((resolve,reject)=>{
      worker.onmessage=({data})=>{
        if(data?.error)return reject(Error(data.error));
        if(!data?.buffer||!isWebpHeader(data.buffer))
          return reject(Error('El codificador no devolvió un archivo WebP válido'));
        resolve(new Blob([data.buffer],{type:'image/webp'}));
      };
      worker.onerror=(error)=>{error?.preventDefault?.();reject(Error('El codificador WebP local no se pudo iniciar en este navegador'));};
      worker.onmessageerror=()=>reject(Error('No se pudo transferir la fotografía al conversor'));
      const rgba=imageData.data.buffer;
      worker.postMessage({width:imageData.width,height:imageData.height,quality,rgba},[rgba]);
    });
  }finally{worker.terminate();}
}

function hasImageSignature(bytes,format){
  const b=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes||[]);
  if(format==='webp')return isWebpHeader(b);
  if(format==='png')return b.length>=8&&[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
  if(format==='jpeg')return b.length>=3&&b[0]===255&&b[1]===216&&b[2]===255;
  return false;
}

export async function convertFileToImage(file,{format='webp',quality=QUALITY_DEFAULT,scale=1,mobile=false}={}){
  if(!(file instanceof Blob)||!file.size||file.size>MAX_INPUT_BYTES)
    throw Error('Imagen vacía o de más de 60 MB');
  if(!Number.isFinite(quality)||quality<50||quality>95)
    throw Error('Calidad fuera del intervalo 50–95');
  const sourceFormat=detectSourceFormat(file);
  const outputFormat=resolveOutputFormat(format,sourceFormat);
  if(format==='original'&&scale!==1&&!['webp','png','jpeg'].includes(outputFormat))
    throw Error('No es posible ampliar HEIC/AVIF conservando su formato desde este navegador. Elige PNG, JPG o WebP.');
  const url=URL.createObjectURL(file);
  const img=new Image();
  let canvas=null;
  try{
    img.src=url;
    if(typeof img.decode==='function')await img.decode();
    else await new Promise((resolve,reject)=>{if(img.complete&&img.naturalWidth)return resolve();img.onload=resolve;img.onerror=()=>reject(Error('No se pudo abrir la imagen'));});
    const srcWidth=img.naturalWidth,srcHeight=img.naturalHeight;
    if(!srcWidth||!srcHeight)throw Error('Formato de imagen no compatible');
    const dims=targetWebpDimensions(srcWidth,srcHeight,scale,{mobile});
    if(format==='original'&&scale===1){
      // Byte-for-byte copy: no generational loss when neither format nor size changes.
      return {blob:file,encoder:'ORIGINAL · SIN RECOMPRESIÓN',format:outputFormat,
        originalWidth:srcWidth,originalHeight:srcHeight,width:dims.width,height:dims.height,
        name:String(file.name||'imagen'),originalBytes:file.size};
    }
    canvas=document.createElement('canvas');canvas.width=dims.width;canvas.height=dims.height;
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)throw Error('No hay memoria disponible para el lienzo');
    // Browser-native high-quality interpolation. Enlarging cannot invent real detail.
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    // JPEG cannot preserve alpha: composite onto white instead of producing black edges.
    if(outputFormat==='jpeg'){ctx.fillStyle='#ffffff';ctx.fillRect(0,0,dims.width,dims.height);}
    ctx.drawImage(img,0,0,dims.width,dims.height);
    let blob=null,encoder='';
    if(outputFormat==='webp'){
      encoder='LIBWEBP · COMPATIBILIDAD';
      if(webpEncoderSupported()){
        // Safari may silently export PNG; verify both MIME and file signature.
        try{
          const native=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality/100));
          if(native?.type==='image/webp'&&isWebpHeader(await native.slice(0,12).arrayBuffer())){
            blob=native;encoder='WEBP NATIVO';
          }
        }catch{}
      }
      if(!blob){
        const rgba=ctx.getImageData(0,0,dims.width,dims.height);
        blob=await encodeWithLocalWebpWorker(rgba,quality);
      }
    }else{
      const mime=mimeForFormat(outputFormat);
      blob=await new Promise(resolve=>canvas.toBlob(resolve,mime,outputFormat==='jpeg'?quality/100:undefined));
      if(!blob||blob.type!==mime||!hasImageSignature(await blob.slice(0,12).arrayBuffer(),outputFormat))
        throw Error('Este navegador no ha podido exportar '+outputFormat.toUpperCase()+' correctamente');
      encoder=outputFormat==='png'?'PNG · SIN PÉRDIDA DE CODIFICACIÓN':'JPG NATIVO';
    }
    return {blob,encoder,format:outputFormat,originalWidth:srcWidth,originalHeight:srcHeight,
      width:dims.width,height:dims.height,name:makeImageFilename(file.name,scale,outputFormat),originalBytes:file.size};
  }finally{
    if(canvas){canvas.width=0;canvas.height=0;}
    img.removeAttribute('src');URL.revokeObjectURL(url);
  }
}
export function convertFileToWebp(file,options={}){return convertFileToImage(file,{...options,format:'webp'});}

const css=(node,value)=>{node.style.cssText=value;return node;};
const elt=(tag,text,style)=>{const n=document.createElement(tag);if(text!=null)n.textContent=text;if(style)css(n,style);return n;};
const B='border:1px solid #355273;background:#111d2e;color:#edf4fa;font:800 12px system-ui;padding:10px 14px;cursor:pointer;border-radius:8px;touch-action:manipulation;';
function isMobileDevice(){return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent||'');}

export function mountAdminWebpTool(adminRoot){
  if(!adminRoot?.isConnected)throw Error('Admin Hub cerrado');
  const issuedUrls=new Set();
  let disposed=false,busy=false;
  // Outside the game's scaled parent: iPhone landscape must not crop the header.
  const overlay=css(document.createElement('section'),
    'position:fixed;top:0;left:0;width:100vw;height:100vh;height:100dvh;z-index:100050;background:#08111d;color:#f2f7fc;box-sizing:border-box;overflow-x:hidden;overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:calc(env(safe-area-inset-top,0px) + 12px) calc(env(safe-area-inset-right,0px) + 16px) calc(env(safe-area-inset-bottom,0px) + 18px) calc(env(safe-area-inset-left,0px) + 16px);font:13px system-ui;touch-action:pan-y;');
  overlay.setAttribute('role','dialog');overlay.setAttribute('aria-label','Convertir o ampliar imágenes');
  const panel=elt('div',null,'max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:12px;');
  const head=elt('div',null,'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;');
  const heading=elt('div',null,'');
  heading.append(elt('h2','CONVERSOR DE IMÁGENES','font:900 clamp(18px,3vw,26px) system-ui;color:#2bff88;margin:0 0 5px;'),
    elt('div','Conversión local. Las fotos no salen de tu dispositivo.','color:#96a9bd;font-size:11px;'));
  const close=elt('button','CERRAR',B);close.type='button';
  head.append(heading,close);panel.appendChild(head);
  const hint=elt('p','Convierte a WebP, PNG o JPG, o conserva el formato mientras amplías. El remuestreo es de alta calidad, pero ampliar no recupera detalle que no esté en la foto original ni sustituye el escalado del mundo del juego.',
    'color:#c7d5e3;margin:0;font-size:12px;line-height:1.45');
  panel.appendChild(hint);

  const fileWrap=elt('label',null,'display:flex;flex-direction:column;gap:6px;border:1px dashed #416c89;background:#0d2030;padding:12px;border-radius:10px;');
  fileWrap.append(elt('strong','1. SELECCIONA FOTOS (hasta 8)','color:#b8f7db;font-size:12px;'));
  const pick=elt('input',null,'font:12px system-ui;color:#eaf4ff;width:100%;min-width:0;');
  pick.type='file';pick.accept='image/png,image/jpeg,image/webp,image/avif,image/heic,image/heif';pick.multiple=true;
  fileWrap.appendChild(pick);panel.appendChild(fileWrap);

  const options=elt('div',null,'display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;');
  const formatWrap=elt('label',null,'display:flex;flex:1 1 190px;min-width:170px;gap:7px;flex-direction:column;color:#ccd9e9;');
  formatWrap.append(elt('strong','2. FORMATO DE SALIDA','color:#f2f7fc;font-size:11px;'));
  const formatInput=elt('select',null,'border:1px solid #416078;background:#122438;color:#fff;font:12px system-ui;padding:9px;border-radius:8px;');
  for(const [value,label] of [['webp','WebP · compacto'],['png','PNG · sin pérdida'],['jpeg','JPG · fotografía'],['original','Mantener formato original']]){
    const o=document.createElement('option');o.value=value;o.textContent=label;formatInput.appendChild(o);
  }
  formatWrap.append(formatInput);
  const qualityWrap=elt('label',null,'display:flex;flex:1 1 190px;min-width:170px;gap:7px;flex-direction:column;color:#ccd9e9;');
  const qualityValue=elt('strong','3. CALIDAD · 86 / 100','color:#f2f7fc;font-size:11px;');
  const qualityInput=elt('input',null,'width:100%;accent-color:#2bff88;');qualityInput.type='range';qualityInput.min='50';qualityInput.max='95';qualityInput.value=String(QUALITY_DEFAULT);qualityInput.step='1';
  qualityInput.addEventListener('input',()=>{qualityValue.textContent='2. CALIDAD · '+qualityInput.value+' / 100';});
  qualityWrap.append(qualityValue,qualityInput);
  const scaleWrap=elt('label',null,'display:flex;flex:1 1 200px;min-width:170px;gap:7px;flex-direction:column;color:#ccd9e9;');
  scaleWrap.append(elt('strong','4. RESOLUCIÓN DE SALIDA','color:#f2f7fc;font-size:11px;'));
  const scaleInput=elt('select',null,'border:1px solid #416078;background:#122438;color:#fff;font:12px system-ui;padding:9px;border-radius:8px;');
  for(const [value,label] of [['1','Original · sin ampliar'],['1.5','Ampliar ×1,5'],['2','Ampliar ×2'],['2.5','Ampliar ×2,5'],['3','Ampliar ×3']]){
    const o=document.createElement('option');o.value=value;o.textContent=label;scaleInput.appendChild(o);
  }
  scaleWrap.append(scaleInput);options.append(formatWrap,qualityWrap,scaleWrap);panel.appendChild(options);
  const updateExportControls=()=>{
    const original=formatInput.value==='original';
    const formats=Array.from(pick.files||[]).map(detectSourceFormat);
    const lossless=formatInput.value==='png'||(original&&formats.length>0&&formats.every(f=>f==='png'));
    qualityInput.disabled=busy||lossless;
    qualityValue.textContent=lossless?'3. CALIDAD · PNG SIN PÉRDIDA':'3. CALIDAD · '+qualityInput.value+' / 100';
    launch.textContent=original?'PROCESAR · MANTENER FORMATO':'CONVERTIR A '+(formatInput.value==='jpeg'?'JPG':formatInput.value.toUpperCase());
  };
  formatInput.addEventListener('change',updateExportControls);
  const note=elt('div','Remuestreo: suavizado de alta calidad del navegador, conservando proporciones. PNG no introduce compresión con pérdida; JPG no admite transparencia. HEIC/AVIF se pueden conservar sin cambios, pero para ampliarlos hay que exportar a PNG/JPG/WebP. Límite: 8192 px por lado, 16 MP en móvil o 32 MP en Mac/PC.',
    'font-size:11px;color:#a7b8ca;line-height:1.4');
  panel.appendChild(note);
  const launch=elt('button','CONVERTIR A WEBP',B+'border-color:#2bff88;background:#143b2b;color:#baffe1;align-self:flex-start;');
  launch.type='button';panel.appendChild(launch);
  const status=elt('div','Selecciona una o varias fotografías para empezar.','color:#b6cad9;font-size:12px;min-height:18px;');
  status.setAttribute('aria-live','polite');panel.appendChild(status);
  const results=elt('div',null,'display:flex;flex-direction:column;gap:8px;padding-bottom:18px;');panel.appendChild(results);
  overlay.appendChild(panel);document.body.appendChild(overlay);

  const clearOutput=()=>{
    for(const url of issuedUrls)URL.revokeObjectURL(url);
    issuedUrls.clear();results.replaceChildren();
  };
  const dispose=()=>{disposed=true;clearOutput();pick.value='';overlay.remove();};
  close.addEventListener('click',dispose);

  pick.addEventListener('change',()=>{
    if(busy)return;
    clearOutput();
    const count=pick.files?.length||0;
    status.textContent=count?count+' foto(s) preparada(s) · Pulsa PROCESAR.':'Selecciona fotografías.';
    updateExportControls();
  });
  const smallButton=(label,action)=>{
    const b=elt('button',label,B+'font-size:11px;padding:8px 10px;');
    b.type='button';b.addEventListener('click',action);return b;
  };
  const addResult=r=>{
    const href=URL.createObjectURL(r.blob);issuedUrls.add(href);
    const row=elt('div',null,'display:flex;gap:8px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:10px;border:1px solid #315167;border-radius:8px;background:#102135;');
    const left=elt('div',null,'min-width:130px;flex:1 1 250px;overflow-wrap:anywhere;');
    left.append(elt('strong',r.name,'font-size:12px;color:#dcffe9;display:block;'),
      elt('small',r.encoder+' · '+r.originalWidth+'×'+r.originalHeight+' → '+r.width+'×'+r.height+' · '+humanBytes(r.originalBytes)+' → '+humanBytes(r.blob.size),
        'display:block;color:#a7bed2;margin-top:4px;font-size:10px;'));
    const actions=elt('div',null,'display:flex;gap:7px;flex-wrap:wrap;');
    const dl=elt('a','DESCARGAR '+(r.format==='jpeg'?'JPG':String(r.format||'IMAGEN').toUpperCase()),B+'text-decoration:none;font-size:11px;display:inline-block;padding:8px 10px;');
    dl.href=href;dl.download=r.name;actions.appendChild(dl);
    if(typeof navigator.canShare==='function'&&typeof navigator.share==='function'){
      const f=new File([r.blob],r.name,{type:r.blob.type||mimeForFormat(r.format)});
      if(navigator.canShare({files:[f]})){
        actions.appendChild(smallButton('GUARDAR / COMPARTIR',async()=>{try{await navigator.share({files:[f],title:r.name});}catch(err){if(err?.name!=='AbortError')status.textContent='No se pudo compartir: utiliza DESCARGAR.';}}));
      }
    }
    row.append(left,actions);results.appendChild(row);
  };
  launch.addEventListener('click',async()=>{
    if(busy||disposed)return;
    const selected=Array.from(pick.files||[]);
    if(!selected.length){status.textContent='Selecciona al menos una foto.';return;}
    if(selected.length>MAX_BATCH_COUNT){status.textContent='Máximo 8 imágenes por lote para proteger la memoria.';return;}
    if(selected.some(f=>!(f.type||'').startsWith('image/'))){status.textContent='Solo se admiten imágenes.';return;}
    busy=true;launch.disabled=true;pick.disabled=true;scaleInput.disabled=true;formatInput.disabled=true;qualityInput.disabled=true;
    clearOutput();
    const scale=Number(scaleInput.value),quality=Number(qualityInput.value),format=formatInput.value,mobile=isMobileDevice();
    let succeeded=0,failed=0;
    for(let i=0;i<selected.length;i++){
      if(disposed)break;
      const file=selected[i];status.textContent='Convirtiendo '+(i+1)+' de '+selected.length+' · '+file.name;
      try{
        const result=await convertFileToImage(file,{format,quality,scale,mobile});
        if(disposed)break;
        addResult(result);succeeded++;
      }catch(err){
        if(disposed)break;
        failed++;const item=elt('div',file.name+' · '+(err?.message||'No se pudo convertir'),
          'color:#ffd095;background:#2b201c;border:1px solid #775338;border-radius:6px;padding:9px;font-size:11px;overflow-wrap:anywhere;');
        results.appendChild(item);
      }
    }
    if(!disposed){
      busy=false;launch.disabled=false;pick.disabled=false;scaleInput.disabled=false;formatInput.disabled=false;
      updateExportControls();
      status.textContent=succeeded+' imagen(es) lista(s) para descargar'+(failed?' · '+failed+' error(es)':'')+'.';
    }
  });
  return dispose;
}
