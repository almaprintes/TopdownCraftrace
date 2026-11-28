// Explicit iPhone/Safari export: prepare the file asynchronously, then let
// the user make a FRESH tap to invoke Web Share or download. An automatic
// a.click() after IndexedDB awaits loses reliable user activation in iOS PWAs.
const el=(tag,text,style='')=>{
 const node=document.createElement(tag);
 if(text!=null)node.textContent=text;
 if(style)node.style.cssText=style;
 return node;
};
export function openTrackStudioExportDialog({prepare,fallback,onClose,aiOnly=false}={}){
 if(typeof document==='undefined'||typeof prepare!=='function')return null;
 const root=el('div',null,
  'position:fixed;inset:0;z-index:2147483600;display:grid;place-items:center;'+
  'padding:12px;background:#000c;box-sizing:border-box;'+
  'font:700 14px system-ui,-apple-system,sans-serif;color:#f5faff');
 root.setAttribute('role','presentation');
 const card=el('section',null,
  'width:min(540px,96vw);max-height:90dvh;overflow:auto;background:#091c2d;'+
  'border:2px solid #34d8b1;border-radius:14px;padding:clamp(12px,2vw,22px);'+
  'box-shadow:0 12px 55px #000b;box-sizing:border-box');
 card.setAttribute('role','dialog');
 card.setAttribute('aria-modal','true');
 card.setAttribute('aria-label','Exportar circuito TrackStudio');
 const title=el('h2',aiOnly?'EXPORTAR TRAZADA IA':'EXPORTAR CIRCUITO',
  'margin:0 0 9px;color:#8ff5d8;font:950 clamp(17px,2.5vw,24px) system-ui');
 const hint=el('p',aiOnly?'Preparando guías, Bézier, escala y sentido…':'Preparando una copia con tu pista, sus guías IA y la fotografía…',
  'margin:0 0 12px;color:#d3e5eb;font-size:clamp(11px,1.25vw,14px);line-height:1.4');
 const status=el('p','Leyendo el proyecto guardado…',
  'margin:0 0 13px;overflow-wrap:anywhere;color:#ffda94;font-size:12px;line-height:1.4');
 status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const actions=el('div',null,
  'display:flex;flex-wrap:wrap;gap:8px;align-items:center');
 const share=el('button','COMPARTIR / GUARDAR EN ARCHIVOS',
  'min-height:42px;padding:9px 14px;border:1px solid #9ff9dc;border-radius:8px;'+
  'background:#068568;color:#fff;font:900 12px system-ui;touch-action:manipulation');
 const download=el('a','DESCARGAR ARCHIVO',
  'display:inline-flex;min-height:42px;align-items:center;padding:9px 14px;'+
  'border:1px solid #789bb3;border-radius:8px;background:#183e53;color:#fff;'+
  'text-decoration:none;font:900 12px system-ui;touch-action:manipulation');
 const closeButton=el('button','CERRAR',
  'min-height:42px;padding:9px 14px;border:1px solid #7593aa;border-radius:8px;'+
  'background:#263649;color:#f6faff;font:900 12px system-ui;touch-action:manipulation');
 share.hidden=true;download.hidden=true;
 actions.append(share,download,closeButton);
 const note=el('small','En iPhone: Compartir → Guardar en Archivos. También puedes usar Descargar y abrir Archivos → Descargas.',
  'display:block;margin-top:12px;color:#afd0dc;line-height:1.5;font-size:11px');
 card.append(title,hint,status,actions,note);
 root.append(card);document.body.append(root);
 let closed=false,activeUrl=null,exportFile=null;
 const canShareFiles=file=>{
  if(!navigator.share||typeof File!=='function')return false;
  try{return !navigator.canShare||navigator.canShare({files:[file]});}
  catch{return false;}
 };
 const destroy=()=>{
  if(closed)return;
  closed=true;
  if(activeUrl)URL.revokeObjectURL(activeUrl);
  root.remove();
  document.removeEventListener('keydown',onKey);
  onClose?.();
 };
 function onKey(e){if(e.key==='Escape'){e.preventDefault();destroy();}}
 document.addEventListener('keydown',onKey);
 closeButton.addEventListener('click',destroy);
 const displayResult=(result,{rescue=false}={})=>{
  if(closed)return;
  if(!result?.blob||!result.filename)throw Error('No se ha generado un archivo de exportación');
  exportFile=null;
  if(activeUrl)URL.revokeObjectURL(activeUrl);
  activeUrl=URL.createObjectURL(result.blob);
  download.href=activeUrl;download.download=result.filename;
  download.hidden=false;
  const suffix=rescue?'Copia de rescate SIN fotografía. ':'';
  status.textContent=suffix+result.filename+' · '+(result.blob.size/1024/1024).toFixed(2)+
   ' MB · '+result.guideCount+' guías IA.';
  hint.textContent=rescue
   ?'La fotografía no está disponible en este dispositivo. Esta copia JSON conserva el trazado y las guías; no incorpora la imagen.'
   :'Archivo listo. Ahora elige cómo guardarlo: el sistema no lo descarga hasta que pulses un botón.';
  if(typeof File==='function'){
   try{exportFile=new File([result.blob],result.filename,{type:result.mime||result.blob.type||'application/octet-stream'});}
   catch{exportFile=null;}
  }
  share.hidden=!(exportFile&&canShareFiles(exportFile));
  if(share.hidden)note.textContent='En este navegador utiliza DESCARGAR ARCHIVO. Si Safari lo pregunta, selecciona Guardar en Archivos.';
 };
 download.addEventListener('click',()=>{
  if(closed)return;
  status.textContent='Descarga solicitada. Comprueba Archivos → Descargas; no cierres hasta que iOS confirme.';
 });
 share.addEventListener('click',()=>{
  // Must call navigator.share() directly inside the click handler, never after an await.
  if(!exportFile||!canShareFiles(exportFile))return;
  try{
   const promise=navigator.share({title:'Circuito TrackStudio',files:[exportFile]});
   Promise.resolve(promise).then(()=>{
    if(!closed)status.textContent='Operación de compartir finalizada. Comprueba el archivo en la ubicación elegida.';
   }).catch(error=>{
    if(!closed)status.textContent=error?.name==='AbortError'
     ?'Compartir cancelado. Puedes intentarlo de nuevo.'
     :'No se pudo compartir: '+(error?.message||'usa Descargar archivo');
   });
  }catch(error){
   status.textContent='No se pudo abrir Compartir: '+(error?.message||'usa Descargar archivo');
  }
 });
 Promise.resolve().then(prepare).then(result=>displayResult(result)).catch(error=>{
  if(closed)return;
  status.textContent='No se pudo preparar el archivo: '+(error?.message||'error desconocido');
  hint.textContent='No se ha cambiado ni borrado el circuito abierto.';
  if(typeof fallback==='function'){
   try{const rescue=fallback();displayResult(rescue,{rescue:true});}
   catch(e){status.textContent+='; tampoco se pudo preparar un JSON de rescate';}
  }
 });
 closeButton.focus();
 return{close:destroy,root};
}
