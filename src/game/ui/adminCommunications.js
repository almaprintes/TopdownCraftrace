// DEV-only Paddock tool. Writes require a signed-in Supabase Auth user
// with server-managed app_metadata.tdr_staff=true. No admin secrets in the app.
import {playerBackendConfig} from '../online/backendConfig.js';
import {PLAY_STORE_URL,hasEnglishNoticeTranslation} from '../online/liveCommunications.js';
import {hasSavedRaceControlSession,refreshRaceControlOnlineSession} from '../online/raceControlOnline.js';
import {translateCommunicationDraft,TRANSLATOR_NAME} from '../online/communicationTranslation.js';
import './adminCommunications.css';

const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!=null)node.textContent=String(value);
  return node;
};
const btn=(label,action,cls='')=>{
  const node=make('button',cls,label);node.type='button';node.addEventListener('click',action);return node;
};
const field=(label,input)=>{
  const row=make('label','tdr-comms-admin-field');
  row.append(make('span','',label),input);return row;
};
const input=(type,placeholder='',value='')=>{
  const node=make('input','');node.type=type;node.placeholder=placeholder;node.value=String(value??'');
  return node;
};
const select=(entries,chosen)=>{
  const node=make('select');
  for(const [value,name] of entries){const opt=make('option','',name);opt.value=value;node.append(opt);}
  node.value=chosen;return node;
};
const PUBLIC_FIELDS='id,kind,target,title,body,action_label,action_url,version_code,priority,active,starts_at,ends_at,updated_at,created_at,translations';
const isoLocal=value=>{
  if(!value)return '';
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))return '';
  const pad=n=>String(n).padStart(2,'0');
  return [date.getFullYear(),pad(date.getMonth()+1),pad(date.getDate())].join('-')+'T'+
    pad(date.getHours())+':'+pad(date.getMinutes());
};
const toISO=value=>{
  if(!value)return null;
  const date=new Date(value);
  if(!Number.isFinite(date.getTime()))throw Error('Revisa las fechas del aviso');
  return date.toISOString();
};

export function mountAdminCommunications(){
  if(typeof document==='undefined')return()=>{};
  const {url,key}=playerBackendConfig();
  let token=null,staffUserId=null,closed=false,rows=[],editing=null;
  const root=make('div','tdr-comms-admin');
  const panel=make('section','tdr-comms-admin-panel');
  root.append(panel);document.body.append(root);
  const renderError=make('div','tdr-comms-admin-error');
  renderError.setAttribute('role','status');renderError.setAttribute('aria-live','polite');
  const header=make('div','tdr-comms-admin-header');
  const heading=make('div');
  heading.append(make('strong','','COMUNICACIONES · TDR'),make('small','','Supabase · avisos y versiones publicadas'));
  header.append(heading,btn('CERRAR',close,'tdr-comms-admin-close'));
  panel.append(header,renderError);
  const work=make('div','tdr-comms-admin-work');panel.append(work);
  function close(){
    if(closed)return;closed=true;token=null;staffUserId=null;root.remove();
  }
  const notice=text=>{renderError.textContent=text||'';};
  async function request(path,{method='GET',body,adminToken=token,retry=true}={}){
    if(!url||!key)throw Error('Falta configuración de Supabase');
    const headers={apikey:key,Accept:'application/json'};
    if(adminToken)headers.Authorization='Bearer '+adminToken;
    if(body)headers['Content-Type']='application/json';
    if(method!=='GET')headers.Prefer='return=representation';
    const response=await fetch(url+path,{method,headers,body:body?JSON.stringify(body):undefined,
      signal:AbortSignal.timeout(12000),cache:'no-store'});
    const data=await response.json().catch(()=>null);
    if(response.status===401&&retry&&token&&adminToken===token){
      // Staff JWT may expire while editing. The renewed JWT must still belong
      // to the SAME player and retain staff privileges before any retry.
      const previousId=(await request('/auth/v1/user',{adminToken:token,retry:false}).catch(()=>null))?.id;
      const refreshed=(await refreshRaceControlOnlineSession()).session;
      const verified=await request('/auth/v1/user',{adminToken:refreshed.access_token,retry:false});
      if(verified?.id!==refreshed.user.id||verified?.app_metadata?.tdr_staff!==true||
        verified?.id!==staffUserId||(previousId&&previousId!==verified.id))throw Error('Sesión de administración caducada.');
      token=refreshed.access_token;
      return request(path,{method,body,adminToken:token,retry:false});
    }
    if(!response.ok)throw Error(data?.msg||data?.message||data?.error_description||'Error de Supabase '+response.status);
    return data;
  }
  async function loginWithCurrentPilot(){
    // Reuse the existing player's saved Google/GoTrue identity. Never attempt
    // password grant (disabled by project policy) and never sign in as a guest.
    if(!hasSavedRaceControlSession())
      throw Error('No hay una cuenta online en este dispositivo. Abre Ajustes → Cuenta y entra con Google primero.');
    const account=(await refreshRaceControlOnlineSession()).session;
    if(!account?.access_token||!account?.user?.id)
      throw Error('La sesión de Google no está disponible. Entra desde Ajustes → Cuenta.');
    const user=await request('/auth/v1/user',{adminToken:account.access_token});
    if(user?.id!==account.user.id||user?.app_metadata?.tdr_staff!==true||
      !user?.app_metadata?.providers?.includes('google'))
      throw Error('La cuenta actual no está autorizada o no está vinculada a Google. Revisa Ajustes → Cuenta y el permiso tdr_staff.');
    staffUserId=user.id;
    token=account.access_token;
    await refresh();
  }
  function loginView(){
    work.replaceChildren();
    work.append(make('p','','Acceso exclusivo con tu cuenta de TDR vinculada a Google. No necesitas contraseña adicional y tu partida no se modifica.'));
    const existing=hasSavedRaceControlSession();
    const access=btn('ENTRAR CON MI CUENTA DE TDR · GOOGLE',async()=>{
      access.disabled=true;notice('Verificando tu cuenta y renovando permisos…');
      try{await loginWithCurrentPilot();notice('Permiso de comunicaciones verificado');}
      catch(error){token=null;staffUserId=null;notice(error.message||'No se pudo autorizar tu cuenta');}
      finally{access.disabled=false;}
    },'tdr-comms-admin-google');
    work.append(access);
    if(!existing)work.append(make('p','',
      'No hay sesión vinculada en este navegador. Cierra el panel, abre Configuración → Cuenta, entra con Google y regresa a Comunicaciones.'));
  }
  async function refresh(){
    if(closed||!token)return;
    rows=await request('/rest/v1/tdr_public_notices?select='+PUBLIC_FIELDS+'&order=created_at.desc&limit=100');
    if(!Array.isArray(rows))throw Error('Respuesta de avisos no válida');
    renderList();
  }
  async function transact(path,options){
    try{
      notice('Guardando en Supabase…');
      // PostgREST is asked for return=representation. Zero returned rows can
      // mean RLS silently prevented an UPDATE: never report a false success.
      const affected=await request(path,options);
      if(!Array.isArray(affected)||affected.length!==1)
        throw Error('Supabase no confirmó ningún cambio. El aviso no se ha dado por guardado.');
      editing=null;
      await refresh();
      notice('Cambios guardados en Supabase');
    }
    catch(error){notice(error.message||'No se pudo guardar');}
  }
  const formToNotice=(parts,source={})=>{
    const kind=parts.kind.value;
    const actionUrl=kind==='update'?PLAY_STORE_URL:String(parts.url.value||'').trim()||null;
    const actionLabel=kind==='update'?'ACTUALIZAR EN GOOGLE PLAY':String(parts.label.value||'').trim()||null;
    const title=parts.title.value.trim(),body=parts.body.value.trim();
    const en={title:parts.titleEn.value.trim(),body:parts.bodyEn.value.trim(),
      action_label:kind==='update'?'UPDATE ON GOOGLE PLAY':parts.labelEn.value.trim()||null};
    if(title.length<1||title.length>90||body.length<1||body.length>600)throw Error('Título ES 1–90 caracteres; texto ES 1–600');
    if(en.title.length>90||en.body.length>600||String(en.action_label||'').length>28)
      throw Error('Inglés: título máximo 90; mensaje 600; botón 28 caracteres');
    if(actionUrl&&!/^https:\/\/[^\s]+$/.test(actionUrl))throw Error('El enlace debe comenzar por https://');
    const code=kind==='update'?Number(parts.versionCode.value):null;
    if(kind==='update'&&(!Number.isSafeInteger(code)||code<1))throw Error('La actualización necesita versionCode real de Google Play');
    const starts=toISO(parts.start.value)||new Date().toISOString(),ends=toISO(parts.end.value);
    if(ends&&ends<=starts)throw Error('La fecha de fin debe ser posterior a la de inicio');
    const payload={kind,target:kind==='update'?'android':parts.target.value,title,body,action_url:actionUrl,
      action_label:actionLabel,version_code:code,priority:Number(parts.priority.value)||0,
      active:parts.active.checked,starts_at:starts,ends_at:ends,translations:{en},
      updated_at:new Date().toISOString()};
    if(payload.active&&!hasEnglishNoticeTranslation(payload))
      throw Error('Antes de publicar, completa título y mensaje en inglés y traduce el botón si lo utilizas.');
    return payload;
  };
  function editorView(record=null){
    notice('');
    editing=record?.id||null;
    const box=make('form','tdr-comms-admin-editor');
    const title=make('h3','',record?'EDITAR AVISO':'CREAR AVISO');
    const parts={
      kind:select([['notice','AVISO'],['update','ACTUALIZACIÓN ANDROID']],record?.kind||'notice'),
      target:select([['all','TODOS'],['android','ANDROID'],['web','WEB'],['ios','IOS']],record?.target||'all'),
      title:input('text','Título',record?.title||''),
      body:make('textarea'),
      label:input('text','Ej.: VER NOVEDADES',record?.action_label||''),
      titleEn:input('text','English title',record?.translations?.en?.title||''),
      bodyEn:make('textarea'),
      labelEn:input('text','E.g. READ MORE',record?.translations?.en?.action_label||''),
      url:input('url','https://...',record?.action_url||''),
      versionCode:input('number','Versión publicada: 12, 13, 14…',record?.version_code||''),
      priority:input('number','0–100',record?.priority??50),
      start:input('datetime-local','',isoLocal(record?.starts_at)||isoLocal(new Date())),
      end:input('datetime-local','',isoLocal(record?.ends_at)),
      active:input('checkbox')
    };
    parts.body.value=record?.body||'';parts.bodyEn.value=record?.translations?.en?.body||'';parts.active.checked=record?.active===true;
    parts.title.maxLength=90;parts.body.maxLength=600;parts.label.maxLength=28;
    parts.titleEn.maxLength=90;parts.bodyEn.maxLength=600;parts.labelEn.maxLength=28;
    parts.priority.min='0';parts.priority.max='100';parts.versionCode.min='1';
    const updateKind=()=>{
      const isUpdate=parts.kind.value==='update';
      parts.target.disabled=isUpdate;if(isUpdate)parts.target.value='android';
      parts.versionCode.parentElement.hidden=!isUpdate;
      parts.url.parentElement.hidden=isUpdate;
      parts.label.parentElement.hidden=isUpdate;
      parts.labelEn.parentElement.hidden=isUpdate;
    };
    parts.kind.addEventListener('change',updateKind);
    const translateBar=make('div','tdr-comms-admin-translate');
    const translateButton=btn('🌐 TRADUCIR AL INGLÉS',async()=>{
      if(!parts.title.value.trim()||!parts.body.value.trim()){
        notice('Escribe primero el título y el mensaje en español.');
        return;
      }
      const existing=[parts.titleEn.value,parts.bodyEn.value,parts.labelEn.value].some(s=>s.trim());
      if(existing&&!window.confirm('¿Reemplazar la traducción inglesa actual? Revisa el resultado antes de publicar.'))
        return;
      const source={title:parts.title.value,body:parts.body.value,
        actionLabel:parts.kind.value==='update'?'':parts.label.value};
      translateButton.disabled=true;
      notice('Traduciendo al inglés…');
      try{
        const en=await translateCommunicationDraft(source);
        if(closed||!box.isConnected)return;
        if(source.title!==parts.title.value||source.body!==parts.body.value||
          source.actionLabel!==(parts.kind.value==='update'?'':parts.label.value)){
          notice('Has cambiado el español durante la traducción. Pulsa TRADUCIR otra vez.');
          return;
        }
        parts.titleEn.value=en.title;
        parts.bodyEn.value=en.body;
        parts.labelEn.value=parts.kind.value==='update'?'':en.action_label||'';
        const tooLong=en.title.length>90||en.body.length>600||String(en.action_label||'').length>28;
        notice(tooLong?'Traducción generada. Acorta los campos ingleses que superan el límite antes de guardar.':
          'Traducción generada. Revisa el inglés antes de guardar o publicar.');
      }catch(error){if(!closed&&box.isConnected)notice(error.message||'No se pudo traducir.');}
      finally{translateButton.disabled=false;}
    },'tdr-comms-admin-translate-button');
    translateBar.append(translateButton,make('small','',
      'Servicio externo '+TRANSLATOR_NAME+' · El texto español se envía solo al pulsar. Revisa la traducción antes de publicar.'));
    box.append(title,make('p','tdr-comms-admin-language-note',
      'ESPAÑOL + ENGLISH · Los borradores pueden estar incompletos, pero para publicar hay que completar ambos idiomas.'),
      translateBar,
      field('TIPO',parts.kind),field('DESTINATARIOS',parts.target),
      field('TÍTULO · ESPAÑOL',parts.title),field('MENSAJE · ESPAÑOL',parts.body),
      field('TÍTULO · ENGLISH',parts.titleEn),field('MENSAJE · ENGLISH',parts.bodyEn),
      field('TEXTO DEL BOTÓN · ESPAÑOL (OPCIONAL)',parts.label),
      field('BUTTON LABEL · ENGLISH (OPTIONAL)',parts.labelEn),
      field('ENLACE HTTPS (OPCIONAL)',parts.url),field('VERSIONCODE PUBLICADO EN PLAY',parts.versionCode),
      field('PRIORIDAD 0–100',parts.priority),field('DESDE',parts.start),
      field('HASTA (OPCIONAL)',parts.end));
    const activeLabel=field('PUBLICADO (solo se mostrará dentro de las fechas)',parts.active);
    box.append(activeLabel);updateKind();
    const bar=make('div','tdr-comms-admin-actions');
    const save=make('button','','GUARDAR EN SERVIDOR');save.type='submit';
    bar.append(save,btn('CANCELAR',()=>renderList()));box.append(bar);work.replaceChildren(box);
    box.addEventListener('submit',async event=>{
      event.preventDefault();save.disabled=true;
      try{
        const payload=formToNotice(parts,record||{});
        await transact('/rest/v1/tdr_public_notices'+(editing?'?id=eq.'+encodeURIComponent(editing):''),{
          method:editing?'PATCH':'POST',body:payload});
      }catch(error){notice(error.message||'Aviso inválido');}
      finally{save.disabled=false;}
    });
  }
  function renderList(){
    work.replaceChildren();
    const controls=make('div','tdr-comms-admin-actions');
    controls.append(btn('CREAR AVISO',()=>editorView()),btn('ACTUALIZAR LISTADO',()=>void refresh().catch(err=>notice(err.message))),
      btn('CERRAR SESIÓN',()=>{token=null;staffUserId=null;loginView();notice('Sesión cerrada');}));
    work.append(controls);
    const summary=make('p','',rows.length+' comunicaciones registradas. Una actualización se publica solo cuando Google Play ya ofrece ese versionCode.');
    work.append(summary);
    for(const row of rows){
      const item=make('article','tdr-comms-admin-row');
      item.append(make('strong','',row.title),make('small','',
        (row.kind==='update'?'ANDROID · V'+row.version_code:row.target.toUpperCase())+
          ' · '+(row.active?'PUBLICADO':'BORRADOR')));
      item.append(make('p','',row.body));
      const actions=make('div','tdr-comms-admin-actions');
      actions.append(btn('EDITAR',()=>editorView(row)));
      actions.append(btn(row.active?'DESPUBLICAR':'PUBLICAR',()=>{
        if(!row.active&&!hasEnglishNoticeTranslation(row)){
          notice('Completa el título y mensaje en inglés antes de publicar.');
          return;
        }
        void transact('/rest/v1/tdr_public_notices?id=eq.'+encodeURIComponent(row.id),
        {method:'PATCH',body:{active:!row.active,updated_at:new Date().toISOString()}});
      }));
      actions.append(btn('BORRAR',()=>{if(window.confirm('¿Borrar definitivamente este aviso?'))void transact(
        '/rest/v1/tdr_public_notices?id=eq.'+encodeURIComponent(row.id),{method:'DELETE'});}));
      item.append(actions);work.append(item);
    }
    if(!rows.length)work.append(make('p','','Todavía no hay comunicaciones. Crea un borrador y publícalo cuando quieras.'));
  }
  loginView();
  return close;
}
