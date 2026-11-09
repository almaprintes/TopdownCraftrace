// DEV Admin Hub · CraftRace Studio avatar catalog.
// Binary artwork is committed to GitHub Pages once per batch. Supabase stores metadata only.
// A short-lived, user-supplied fine-grained GitHub token is used in memory, never persisted.
import {playerBackendConfig} from '../online/backendConfig.js';
import {hasSavedRaceControlSession,refreshRaceControlOnlineSession} from '../online/raceControlOnline.js';
import './adminStudioAvatars.css';
import {readStudioAvatarZip,studioAvatarImageType} from './studioAvatarZip.mjs';
import {commitStudioAvatarBatch} from './studioAvatarGitPublish.mjs';

const REPO='almaprintes/TopdownCraftrace';
const GITHUB='https://api.github.com/repos/'+REPO;
const IMAGE_DIR='studio/assets/avatars/';
const PAGE_DIR='https://almaprintes.github.io/TopdownCraftrace/studio-assets/avatars/';
const RAW_DIR='https://raw.githubusercontent.com/almaprintes/TopdownCraftrace/main/studio/assets/avatars/';
const validAvatarId=id=>typeof id==='string'&&/^(?:avatar_[0-9]{2,4}|founder_[a-z0-9_]+)$/.test(id);
const filenameLabel=file=>{
  const stem=String(file?.name||'').replace(/\.[^.]+$/,'');
  if(/^[0-9a-f]{8}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{4}[-_][0-9a-f]{12}$/i.test(stem)||
    /^[0-9a-f]{24,}$/i.test(stem))return '';
  return stem.replace(/[_-]+/g,' ').trim().slice(0,64);
};
const MAX_PIXELS=1024;
const make=(tag,cls='',value)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(value!=null)e.textContent=String(value);return e;};
const fmt=id=>'avatar_'+String(id).padStart(4,'0');
const nval=(field,fallback)=>Number.isFinite(Number(field.value))?Number(field.value):fallback;
const errorText=error=>String(error?.message||error||'Error desconocido');
const b64=bytes=>{let result='';for(let i=0;i<bytes.length;i+=8192)result+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(result);};

export function mountAdminStudioAvatars(){
 if(typeof document==='undefined')return()=>{};
 document.querySelector('[data-studio-avatar-admin]')?.remove();
 const {url,key}=playerBackendConfig();
 const root=make('section','saa-root');root.dataset.studioAvatarAdmin='1';
 root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','Catálogo de avatares CraftRace Studio');
 root.innerHTML=[
 '<div class="saa-panel"><header class="saa-head"><div><small>ADMIN HUB · CRAFTRACE STUDIO</small><h2>AVATARES</h2><p>Catálogo global de CraftRace y SlotRace · imágenes en GitHub Pages</p></div><button data-close type="button">✕ CERRAR</button></header>',
 '<div class="saa-notice" role="status" aria-live="polite" data-notice></div>',
 '<section class="saa-stats"><div><b data-total>—</b><span>REGISTRADOS</span></div><div><b data-active>—</b><span>PÚBLICOS ACTIVOS</span></div><div><b data-next>—</b><span>SIGUIENTE ID</span></div><button data-reload type="button">ACTUALIZAR</button></section>',
 '<p class="saa-hint">Los avatares exclusivos cuentan en registrados, pero no en públicos activos.</p>',
 '<section class="saa-section"><h3>01 · Seleccionar lote</h3><p>Arrastra imágenes o un ZIP de WebP, PNG o JPG. Nada se publica hasta que confirmes.</p>',
 '<div class="saa-drop" data-drop><label for="saa-file">AÑADIR IMÁGENES O ZIP</label><input id="saa-file" data-file type="file" multiple><span data-queued>0 imágenes pendientes</span></div><p class="saa-hint">Si iOS oculta los WebP, usa «Explorar» en Archivos. El selector acepta todos los archivos; el editor valida su formato.</p>',
 '<div class="saa-editor"><div class="saa-queue" data-queue aria-label="Imágenes del lote"></div><div class="saa-preview-wrap"><canvas data-preview width="256" height="256" aria-label="Vista previa del avatar"></canvas>',
 '<label>Ancho final (px)<input data-width type="number" min="128" max="1024" step="64" value="256"></label><label>Alto final (px)<input data-height type="number" min="128" max="1024" step="64" value="256"></label>',
 '<label>Encuadre · zoom <input data-zoom type="range" min="100" max="250" value="100"><output data-zoom-text>100 %</output></label>',
 '<label>Centro horizontal <input data-x type="range" min="0" max="100" value="50"></label><label>Centro vertical <input data-y type="range" min="0" max="100" value="50"></label>',
 '<label class="saa-full">Nombre del avatar seleccionado<input data-label type="text" maxlength="64" placeholder="Piloto deportivo"></label><p class="saa-hint">Recorte sin deformación. Cada imagen mantiene su proporción y se exporta en WebP. El tamaño habitual es 256 × 256.</p></div></div>',
 '<button data-clear type="button" class="saa-muted">VACIAR LOTE</button></section>',
 '<section class="saa-section"><h3>02 · Publicar lote</h3><p>Se crea un único commit en GitHub. Después se registran los metadatos en Supabase. El contador y los IDs salen de los datos reales.</p>',
 '<label class="saa-token">Token temporal de GitHub · acceso de escritura solo a este repositorio<input data-github type="password" autocomplete="off" spellcheck="false" placeholder="github_pat_…"><small>No se almacena ni se envía a Supabase. Para generar el token: permisos Contents: Read and write sobre TopdownCraftrace.</small></label>',
 '<label class="saa-toggle"><input data-activate type="checkbox" checked> Activar los avatares para los jugadores tras publicar</label><label class="saa-toggle"><input data-exclusive type="checkbox"> Avatar exclusivo para mi cuenta (solo una imagen por lote)</label>',
 '<div class="saa-buttons"><button data-publish type="button" class="saa-primary">PUBLICAR TODO EL LOTE</button><button data-retry type="button" hidden>REINTENTAR REGISTRO EN SUPABASE</button></div>',
 '<p class="saa-hint">Si GitHub se completa y Supabase falla, el registro se podrá reintentar sin volver a subir imágenes.</p></section>',
 '<section class="saa-section"><h3>03 · Catálogo existente</h3><div class="saa-gallery" data-gallery></div></section></div>'
 ].join('');
 document.body.append(root);
 const $=sel=>root.querySelector(sel);
 const ui={notice:$('[data-notice]'),queue:$('[data-queue]'),gallery:$('[data-gallery]'),preview:$('[data-preview]'),
   width:$('[data-width]'),height:$('[data-height]'),zoom:$('[data-zoom]'),x:$('[data-x]'),y:$('[data-y]'),
   queued:$('[data-queued]'),publish:$('[data-publish]'),retry:$('[data-retry]'),github:$('[data-github]'),label:$('[data-label]')};
 const ctx=ui.preview.getContext('2d');
 let closed=false,loading=false,token='',staffId='',catalog=[],items=[],selected=-1,pendingRows=null;
 const inform=(message,good=false)=>{if(!closed){ui.notice.textContent=message||'';ui.notice.dataset.state=good?'success':'info';}};
 const ensureAlive=()=>{if(closed)throw Error('El panel ya está cerrado.');};
 const request=async(path,options={})=>{
   const headers={apikey:key,Accept:'application/json'};
   if(token)headers.Authorization='Bearer '+token;
   if(options.body)headers['Content-Type']='application/json';
   if(options.method&&options.method!=='GET')headers.Prefer='return=representation';
   const response=await fetch(url+path,{...options,headers:{...headers,...(options.headers||{})},
     body:options.body?JSON.stringify(options.body):undefined,cache:'no-store'});
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data?.message||data?.error||'Supabase devolvió '+response.status);
   return data;
 };
 const github=async(path,{method='GET',body,notFoundOk=false}={})=>{
   const secret=ui.github.value.trim();
   if(!secret)throw Error('Introduce un token temporal de GitHub para publicar.');
   const response=await fetch(GITHUB+path,{method,headers:{Accept:'application/vnd.github+json',
     Authorization:'Bearer '+secret,'X-GitHub-Api-Version':'2022-11-28',
     ...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,cache:'no-store'});
   if(notFoundOk&&response.status===404)return null;
   const data=await response.json().catch(()=>null);
   if(!response.ok)throw Error(data?.message||'GitHub devolvió '+response.status);
   return data;
 };
 const authenticate=async()=>{
   if(!hasSavedRaceControlSession())throw Error('Entra primero con tu cuenta Google en Ajustes → Cuenta.');
   const auth=(await refreshRaceControlOnlineSession()).session;
   if(!auth?.access_token||!auth?.user?.id)throw Error('No se pudo recuperar la sesión.');
   token=auth.access_token;
   const member=await request('/auth/v1/user');
   if(member?.id!==auth.user.id||member.is_anonymous||member.app_metadata?.tdr_staff!==true)
     throw Error('Solo una cuenta de administración autorizada puede gestionar los avatares.');
   staffId=member.id;return member;
 };
 const loadCatalog=async()=>{
   await authenticate();
   const rows=[];
   for(let page=0;page<30;page++){
     const batch=await request('/rest/v1/studio_avatar_catalog?select=id,label,image_url,active,sort_order,width_px,height_px,created_at,exclusive,owner_user_id&order=sort_order.asc,id.asc&limit=500&offset='+(page*500));
     if(!Array.isArray(batch))throw Error('Supabase no devolvió un catálogo válido.');
     rows.push(...batch);if(batch.length<500)break;
     if(page===29)throw Error('Catálogo demasiado grande para esta versión del editor.');
   }
   catalog=rows;
   $('[data-total]').textContent=rows.length;
   $('[data-active]').textContent=rows.filter(x=>x.active&&!x.exclusive).length;
   $('[data-next]').textContent=fmt(nextNumber());
   renderGallery();
 };
 const nextNumber=(extra=[])=>Math.max(0,...catalog.map(x=>Number(/^avatar_(\d+)$/.exec(x.id)?.[1]||0)),...extra)+1;
 const filenameNumber=name=>Number(/^avatar_(\d+)\.webp$/.exec(name)?.[1]||0);
 const renderGallery=()=>{
   ui.gallery.replaceChildren();
   if(!catalog.length)ui.gallery.append(make('p','','Todavía no hay avatares publicados.'));
   for(const avatar of catalog){
     const card=make('div','saa-avatar-card');
     const img=make('img');img.alt=avatar.label;img.loading='lazy';
     if(validAvatarId(avatar.id)&&avatar.image_url===PAGE_DIR+avatar.id+'.webp'){
       // GitHub has the image immediately; Pages may still be rebuilding.
       img.src=RAW_DIR+avatar.id+'.webp';
       img.addEventListener('error',()=>{
         if(img.dataset.fallback!=='pages'){
           img.dataset.fallback='pages';img.src=avatar.image_url;return;
         }
         img.hidden=true;
         card.prepend(make('div','saa-image-unavailable','🏁 Imagen pendiente'));
       });
     }else img.hidden=true;
     const name=make('strong','',avatar.label||avatar.id);name.title=avatar.id;
     const desc=make('small','',avatar.width_px+' × '+avatar.height_px+(avatar.exclusive?' · EXCLUSIVO':' · PÚBLICO'));
     const idLine=make('small','',avatar.id);idLine.title='Identificador técnico';
     const editLabel=make('input');editLabel.type='text';editLabel.maxLength=64;editLabel.value=avatar.label;editLabel.setAttribute('aria-label','Nombre del avatar '+avatar.id);
     const editSort=make('input');editSort.type='number';editSort.min='0';editSort.max='99999';editSort.value=String(avatar.sort_order);editSort.setAttribute('aria-label','Orden del avatar '+avatar.id);
     const save=make('button','saa-muted','GUARDAR NOMBRE Y ORDEN');save.type='button';
     save.addEventListener('click',()=>void guard(async()=>{
       await authenticate();
       const label=editLabel.value.trim();const order=Number(editSort.value);
       if(!label||label.length>64||!Number.isInteger(order)||order<0||order>99999)throw Error('Revisa el nombre y el orden.');
       const changed=await request('/rest/v1/studio_avatar_catalog?id=eq.'+encodeURIComponent(avatar.id),
         {method:'PATCH',body:{label,sort_order:order,updated_at:new Date().toISOString()}});
       if(!Array.isArray(changed)||changed.length!==1)throw Error('Supabase no confirmó los cambios.');
       inform('Datos del avatar '+avatar.id+' guardados.',true);await loadCatalog();
     }));
     const toggle=make('button','saa-muted',avatar.active?'RETIRAR DE SELECCIÓN':'ACTIVAR');
     toggle.type='button';
     toggle.addEventListener('click',()=>void guard(async()=>{
       await authenticate();
       const changed=await request('/rest/v1/studio_avatar_catalog?id=eq.'+encodeURIComponent(avatar.id),
         {method:'PATCH',body:{active:!avatar.active,updated_at:new Date().toISOString()}});
       if(!Array.isArray(changed)||changed.length!==1)throw Error('No se confirmó el cambio en Supabase.');
       inform('Estado de '+avatar.id+' actualizado.',true);await loadCatalog();
     }));
     card.append(img,name,desc,idLine,editLabel,editSort,save,toggle);
     if(avatar.exclusive&&avatar.owner_user_id===staffId){
       const use=make('button','','USAR EN MI CUENTA');
       use.type='button';use.addEventListener('click',()=>void guard(async()=>{
         if(!avatar.active)throw Error('Activa primero este avatar.');
         await authenticate();
         const rows=await request('/rest/v1/craft_accounts?user_id=eq.'+encodeURIComponent(staffId),
           {method:'PATCH',body:{avatar_id:avatar.id,updated_at:new Date().toISOString()}});
         if(!Array.isArray(rows)||rows.length!==1)throw Error('No se pudo aplicar el avatar a tu cuenta.');
         inform('Avatar '+avatar.id+' aplicado a tu cuenta CraftRace Studio.',true);
       }));card.append(use);
     }
     ui.gallery.append(card);
   }
 };
 const disposeItems=()=>{for(const x of items){try{x.bitmap?.close?.();}catch{}}items=[];selected=-1;draw();renderQueue();};
 const pushFiles=async(files)=>{
   if(!files.length){inform('No se ha seleccionado ningún archivo.');return;}
   const queue=[];
   let zipCount=0;
   for(const file of files){
     if(/\.zip$/i.test(file.name)){
       zipCount++;
       inform('Abriendo el ZIP y comprobando sus imágenes…');
       const extracted=await readStudioAvatarZip(file);
       for(const item of extracted)
         queue.push(new File([item.bytes],item.name,{type:item.mime}));
     }else{
       const mime=studioAvatarImageType(file.name);
       if(mime){
         // iOS Files may report WebP as octet-stream/empty MIME.
         queue.push(file.type===mime?file:new File([file],file.name,{type:mime}));
       }
     }
   }
   if(!queue.length)throw Error('No hay imágenes compatibles. Selecciona un ZIP o archivos .webp, .png, .jpg.');
   if(items.length+queue.length>100)throw Error('Máximo 100 avatares por lote.');
   let added=0,skipped=0;
   for(const file of queue){
     if(file.size>12_000_000){skipped++;continue;}
     let bitmap;
     try{bitmap=await createImageBitmap(file);}
     catch{
       // The archive was correctly extracted, but the local image is invalid
       // or this Safari version cannot decode it. Keep an actionable error.
       skipped++;continue;
     }
     if(bitmap.width<64||bitmap.height<64){bitmap.close?.();skipped++;continue;}
     items.push({file,bitmap,zoom:100,x:50,y:50,label:filenameLabel(file)});added++;
   }
   selected=items.length?items.length-1:-1;
   renderQueue();draw();
   if(!added)throw Error('Los archivos se encontraron, pero el navegador no pudo abrir ninguna imagen. Revisa que sean WebP, PNG o JPG válidos.');
   inform(added+' imágenes preparadas'+(zipCount?' desde '+zipCount+' ZIP'+(zipCount>1?'s':''):'')+
     (skipped?' · '+skipped+' no compatibles':'')+'. Selecciona una para revisar el encuadre.',true);
 };
 const outputSize=()=>{
   const width=nval(ui.width,256),height=nval(ui.height,256);
   if(!Number.isInteger(width)||!Number.isInteger(height)||width<128||width>MAX_PIXELS||height<128||height>MAX_PIXELS)
     throw Error('Las dimensiones deben ser números enteros entre 128 y 1024 px.');
   if(width!==height)throw Error('Los avatares oficiales deben ser cuadrados: utiliza el mismo ancho y alto.');
   return {width,height};
 };
 const renderInto=(canvas,item,width,height)=>{
   const bitmap=item.bitmap,c=canvas.getContext('2d');
   const aspect=width/height,sourceAspect=bitmap.width/bitmap.height;
   let cropW=bitmap.width,cropH=bitmap.height;
   if(sourceAspect>aspect)cropW=bitmap.height*aspect;else cropH=bitmap.width/aspect;
   const zoom=Math.max(1,item.zoom/100);cropW/=zoom;cropH/=zoom;
   const sx=Math.max(0,(bitmap.width-cropW)*(item.x/100));
   const sy=Math.max(0,(bitmap.height-cropH)*(item.y/100));
   canvas.width=width;canvas.height=height;
   c.clearRect(0,0,width,height);
   c.drawImage(bitmap,sx,sy,cropW,cropH,0,0,width,height);
 };
 const draw=()=>{
   const item=items[selected];
   if(!ctx)return;
   if(!item){ui.preview.width=256;ui.preview.height=256;ctx.clearRect(0,0,256,256);ui.label.value='';return;}
   let size;try{size=outputSize();}catch{size={width:256,height:256};}
   renderInto(ui.preview,item,size.width,size.height);
   ui.zoom.value=String(item.zoom);ui.x.value=String(item.x);ui.y.value=String(item.y);
   $('[data-zoom-text]').textContent=item.zoom+' %';ui.label.value=item.label||'';
 };
 const renderQueue=()=>{
   ui.queue.replaceChildren();
   ui.queued.textContent=items.length+' imágenes pendientes';
   for(let i=0;i<items.length;i++){
     const button=make('button',i===selected?'saa-selected':'',String(i+1).padStart(2,'0')+' · '+items[i].file.name);
     button.type='button';button.addEventListener('click',()=>{selected=i;renderQueue();draw();});
     ui.queue.append(button);
   }
 };
 const webp=async(item,width,height)=>{
   const canvas=document.createElement('canvas');
   try{
     renderInto(canvas,item,width,height);
     // Safari/iOS may silently return PNG when WebP is requested. Reuse the
     // existing first-party Image Lab libwebp/WASM worker for a safe fallback.
     const {isWebpHeader,encodeWebpCanvas}=await import('./adminImageWebpTool.js');
     const blob=await encodeWebpCanvas(canvas,85);
     if(!blob||blob.type!=='image/webp'||!isWebpHeader(await blob.slice(0,12).arrayBuffer()))
       throw Error('No se generó un WebP válido. No se ha publicado este avatar.');
     if(blob.size>1024*1024)throw Error('Una imagen supera 1 MB después del recorte.');
     return blob;
   }finally{canvas.width=0;canvas.height=0;}
 };
 // Idempotent registration: if the network fails after INSERT, verify what
 // Supabase already accepted before retrying. Never duplicate/change an ID.
 const getPendingRows=async()=>{
   const ids=pendingRows.map(row=>row.id);
   if(ids.some(id=>!validAvatarId(id)))throw Error('El lote pendiente contiene IDs no válidos.');
   const encoded=ids.map(encodeURIComponent).join(',');
   const list=await request('/rest/v1/studio_avatar_catalog?select=id,image_url,exclusive,owner_user_id,width_px,height_px&id=in.('+encoded+')');
   if(!Array.isArray(list))throw Error('Supabase no confirmó los registros.');
   for(const row of list){
     const desired=pendingRows.find(x=>x.id===row.id);
     if(!desired||row.image_url!==desired.image_url||
       row.exclusive!==desired.exclusive||
       row.owner_user_id!==desired.owner_user_id||
       row.width_px!==desired.width_px||row.height_px!==desired.height_px)
       throw Error('Un ID del lote ya existe con otros datos: '+row.id+'. No se sobrescribirá.');
   }
   return list;
 };
 const registerPending=async()=>{
   if(!pendingRows?.length)throw Error('No hay registros pendientes.');
   await authenticate();
   const existing=await getPendingRows();
   const savedIds=new Set(existing.map(row=>row.id));
   const missing=pendingRows.filter(row=>!savedIds.has(row.id));
   if(missing.length){
     try{await request('/rest/v1/studio_avatar_catalog',{method:'POST',body:missing});}
     catch(error){
       // The request may have succeeded server-side but the response was lost.
       const retryCheck=await getPendingRows();
       if(retryCheck.length!==pendingRows.length)throw error;
     }
   }
   const verified=await getPendingRows();
   if(verified.length!==pendingRows.length)
     throw Error('Supabase no confirmó todos los avatares. Puedes reintentar el registro sin subirlos de nuevo.');
   const completed=pendingRows;
   pendingRows=null;sessionStorage.removeItem('tdr-studio-avatar-pending-v1');ui.retry.hidden=true;
   try{await loadCatalog();}
   catch(error){inform('Avatares registrados. No se pudo actualizar el contador: '+errorText(error)+'. Pulsa ACTUALIZAR.');}
   if(completed.length===1&&completed[0].exclusive&&completed[0].owner_user_id===staffId&&completed[0].active){
     try{
       const applied=await request('/rest/v1/craft_accounts?user_id=eq.'+encodeURIComponent(staffId),
         {method:'PATCH',body:{avatar_id:completed[0].id,updated_at:new Date().toISOString()}});
       if(!Array.isArray(applied)||applied.length!==1)throw Error('No se confirmó la asignación.');
       inform('Avatar exclusivo publicado y aplicado a tu cuenta.',true);
     }catch(error){inform('Publicado, pero no se pudo asignar a tu cuenta: '+errorText(error)+'. Usa USAR EN MI CUENTA.');}
   }else inform('¡Lote publicado! '+completed.length+' avatares registrados y numerados en CraftRace Studio.',true);
 };
 const publish=async()=>{
   if(!items.length)throw Error('Añade al menos una imagen.');
   const exclusive=$('[data-exclusive]').checked;
   if(exclusive&&items.length!==1)throw Error('El avatar exclusivo se publica individualmente, no en un lote público.');
   if(pendingRows)throw Error('Hay un lote con registro pendiente. Reinténtalo antes de publicar otro.');
   const size=outputSize();
   if(!window.confirm('Se van a publicar '+items.length+' avatares en GitHub y Supabase. ¿Continuar?'))return;
   await authenticate();
   inform('Preparando imágenes WebP. Si GitHub recibe nuevos cambios, se actualizará automáticamente la base del commit…');
   const blobs=[];
   for(let i=0;i<items.length;i++){
     ensureAlive();
     inform('Preparando imagen '+(i+1)+' de '+items.length+'…');
     const webpBlob=await webp(items[i],size.width,size.height);
     const bytes=new Uint8Array(await webpBlob.arrayBuffer());
     const saved=await github('/git/blobs',{method:'POST',body:{content:b64(bytes),encoding:'base64'}});
     if(!/^[0-9a-f]{40}$/.test(String(saved?.sha)))throw Error('GitHub no confirmó la imagen '+(i+1));
     blobs.push({sha:saved.sha,label:items[i].label});
   }
   const exclusiveId=exclusive?'founder_'+staffId.replace(/-/g,'').slice(0,12)+'_'+Date.now().toString(36):null;
   const committed=await commitStudioAvatarBatch({
     github,blobs,exclusiveId,
     catalogIds:async()=>{await loadCatalog();return catalog.map(x=>x.id);},
     metadata:{width:size.width,height:size.height,active:$('[data-activate]').checked,
       exclusive,owner:staffId},
     report:message=>inform(message)
   });
   pendingRows=committed.rows;
   sessionStorage.setItem('tdr-studio-avatar-pending-v1',JSON.stringify(committed.rows));
   ui.retry.hidden=false;
   try{await registerPending();disposeItems();}
   catch(error){
     inform('El lote está en GitHub, pero Supabase aún no confirmó los registros: '+errorText(error)+
       '. Pulsa REINTENTAR REGISTRO, no PUBLICAR TODO EL LOTE.');
     throw error;
   }
 };
 const guard=async(task)=>{
   if(loading)return;loading=true;
   ui.publish.disabled=true;ui.retry.disabled=true;
   try{await task();}catch(error){inform(errorText(error));}
   finally{loading=false;ui.publish.disabled=false;ui.retry.disabled=false;}
 };
 const close=()=>{if(closed)return;closed=true;token='';ui.github.value='';disposeItems();root.remove();};
 $('[data-close]').addEventListener('click',close);
 root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 $('[data-reload]').addEventListener('click',()=>void guard(loadCatalog));
 $('[data-file]').addEventListener('change',e=>{const input=e.target;void guard(()=>pushFiles(Array.from(input.files||[]))).finally(()=>{input.value='';});});
 $('[data-clear]').addEventListener('click',disposeItems);
 for(const prop of ['zoom','x','y']){
   ui[prop].addEventListener('input',()=>{
     const current=items[selected];if(!current)return;
     current[prop]=nval(ui[prop],prop==='zoom'?100:50);draw();
   });
 }
 ui.width.addEventListener('change',draw);ui.height.addEventListener('change',draw);
 ui.label.addEventListener('input',()=>{if(items[selected])items[selected].label=ui.label.value.trim().slice(0,64);});
 const drop=$('[data-drop]');
 drop.addEventListener('dragover',e=>{e.preventDefault();drop.classList.add('saa-dragging');});
 drop.addEventListener('dragleave',()=>drop.classList.remove('saa-dragging'));
 drop.addEventListener('drop',e=>{e.preventDefault();drop.classList.remove('saa-dragging');void guard(()=>pushFiles(Array.from(e.dataTransfer?.files||[])));});
 ui.publish.addEventListener('click',()=>void guard(publish));
 ui.retry.addEventListener('click',()=>void guard(registerPending));
 try{
   const raw=sessionStorage.getItem('tdr-studio-avatar-pending-v1');
   if(raw){const recovered=JSON.parse(raw);if(Array.isArray(recovered)&&recovered.length){
     pendingRows=recovered;ui.retry.hidden=false;inform('Hay un lote publicado en GitHub pendiente de registrar en Supabase.');}}
 }catch{}
 void guard(loadCatalog);
 return close;
}
