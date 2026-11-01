// Independent DEV emergency console. No management credentials are bundled in TDR.
// Project pause/resume is intentionally delegated to Supabase Dashboard (Free plan).
import {playerBackendConfig} from '../online/backendConfig.js';
import {hasSavedRaceControlSession,refreshRaceControlOnlineSession} from '../online/raceControlOnline.js';
import './adminEmergencyControls.css';

export const SUPABASE_PROJECT_DASHBOARD=
  'https://supabase.com/dashboard/project/juukbnkjboiazqggqcyv/settings/general';
const el=(tag,cls='',text)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(text!==undefined)node.textContent=String(text);
  return node;
};
const button=(label,cls,action)=>{
  const node=el('button',cls,label);
  node.type='button';node.addEventListener('click',action);
  return node;
};
const messageForError=e=>String(e?.message||'Error de conexión');

export function mountAdminEmergencyControls(){
  if(typeof document==='undefined')return ()=>{};
  document.querySelector('[data-tdr-emergency-root]')?.remove();
  const {url,key}=playerBackendConfig();
  let closed=false,token=null,authorizedUser=null;
  const root=el('div','tdr-emergency-overlay');
  root.dataset.tdrEmergencyRoot='1';
  root.setAttribute('role','dialog');
  root.setAttribute('aria-modal','true');
  root.setAttribute('aria-label','Controles de emergencia de Supabase');
  const panel=el('section','tdr-emergency-panel');
  const head=el('header','tdr-emergency-heading');
  head.append(el('div','tdr-emergency-brand','TDR · ADMIN HUB'),
    el('h2','','CONTROLES DE EMERGENCIA'));
  const closeButton=button('CERRAR','tdr-emergency-close',close);
  head.append(closeButton);panel.append(head);
  const info=el('p','tdr-emergency-summary',
    'Dos cortes distintos. El primero solo detiene informes. El segundo permite pausar TODO Supabase desde su panel oficial y restaurarlo más adelante.');
  panel.append(info);
  const banner=el('p','tdr-emergency-notice','');
  banner.setAttribute('role','status');banner.setAttribute('aria-live','polite');
  panel.append(banner);
  const cards=el('div','tdr-emergency-cards');panel.append(cards);
  const reports=el('section','tdr-emergency-card');
  reports.dataset.emergencySection='reports';
  reports.append(el('div','tdr-emergency-kicker','01 · INFORMES DE JUGADORES'),
    el('h3','','CORTE DE INFORMES'),
    el('p','','Solo impide guardar nuevos avisos y datos técnicos. Las cuentas, las partidas y los récords seguirán funcionando.'));
  const status=el('p','tdr-emergency-state','ESTADO: SIN VERIFICAR');
  const count=el('p','tdr-emergency-counter','');
  reports.append(status,count);
  const reportActions=el('div','tdr-emergency-actions');
  const stopReports=button('🛑 CORTAR INFORMES','tdr-emergency-danger',async()=>{
    if(!window.confirm('¿DETENER solo nuevos informes y telemetría de jugadores?'))return;
    await updateReports(false);
  });
  const resumeReports=button('REACTIVAR INFORMES','tdr-emergency-resume',async()=>{
    if(!window.confirm('¿REACTIVAR los informes (máximo 40/día y 2 por jugador)?'))return;
    await updateReports(true);
  });
  const refreshReports=button('ACTUALIZAR ESTADO','tdr-emergency-neutral',()=>void refresh());
  reportActions.append(stopReports,resumeReports,refreshReports);
  reports.append(reportActions);
  const auth=el('div','tdr-emergency-auth');
  const login=button('ENTRAR CON MI CUENTA TDR · GOOGLE','tdr-emergency-login',()=>void staffLogin());
  auth.append(el('p','','Para operar el corte de informes necesitas una sesión de piloto Google con permisos de administración.'),login);
  reports.append(auth);
  const inbox=el('div','tdr-emergency-inbox');
  const showReports=button('VER INFORMES RECIBIDOS','tdr-emergency-neutral',()=>void loadReports());
  const reportList=el('div','tdr-emergency-report-list');
  inbox.append(showReports,reportList);
  reports.append(inbox);cards.append(reports);

  const project=el('section','tdr-emergency-card tdr-emergency-card--project');
  project.dataset.emergencySection='project';
  project.append(el('div','tdr-emergency-kicker','02 · PROYECTO SUPABASE COMPLETO'),
    el('h3','','PARADA TOTAL DE SUPABASE'),
    el('p','','Detiene base de datos, autenticación y servicios online al PAUSAR el proyecto. El juego local podrá seguir funcionando donde no necesite conexión.'));
  const warning=el('p','tdr-emergency-warning',
    'PROTECCIÓN REAL: esta acción NO se ejecuta desde TDR. Abre Supabase Dashboard y pulsa “Pause Project” con tu cuenta propietaria. No se almacenan tokens de administración en el juego.');
  project.append(warning);
  const projectActions=el('div','tdr-emergency-actions');
  const pauseProject=button('🛑 ABRIR PAUSA TOTAL','tdr-emergency-danger',()=>{
    if(!window.confirm('Vas a abrir SUPABASE para pausar TODO el proyecto. No ocurrirá nada hasta que lo confirmes allí. ¿Continuar?'))return;
    openOfficialDashboard();
  });
  const resumeProject=button('REANUDAR PROYECTO','tdr-emergency-resume',()=>openOfficialDashboard());
  projectActions.append(pauseProject,resumeProject);project.append(projectActions);
  project.append(el('p','tdr-emergency-note',
    'Plan Free: Supabase documenta que la restauración normal se puede hacer durante los 90 días posteriores a la pausa. Una pausa no borra los datos; no borres el proyecto. En planes de pago la pausa no está disponible.'));
  const link=el('a','tdr-emergency-direct-link','Abrir configuración oficial de Supabase');
  link.href=SUPABASE_PROJECT_DASHBOARD;link.target='_blank';link.rel='noopener noreferrer';
  project.append(link);cards.append(project);
  const footer=el('p','tdr-emergency-footnote',
    'La parada total necesita el panel de Supabase: la web de TDR no puede garantizar el corte de costes o conexiones por sí sola. Si Supabase está pausado, podrás reanudarlo desde Supabase Dashboard, aunque no funcione el juego online.');
  panel.append(cards,footer);root.append(panel);document.body.append(root);

  function notify(value){if(!closed)banner.textContent=value||'';}
  function close(){
    if(closed)return;
    closed=true;token=null;authorizedUser=null;root.remove();
  }
  function openOfficialDashboard(){
    // Always opens directly from the user's gesture; no privileged token is exposed.
    try{const tab=window.open(SUPABASE_PROJECT_DASHBOARD,'_blank','noopener,noreferrer');
      // Some browsers return null for noopener even when navigation succeeded.
      void tab;
    }catch{notify('No se pudo abrir el navegador. Usa el enlace de Supabase del panel.');}
  }
  async function request(path,{method='POST',body={},accessToken=token}={}){
    if(!url||!key)throw Error('No hay configuración de Supabase.');
    const response=await fetch(url+path,{
      method,headers:{apikey:key,Authorization:'Bearer '+(accessToken||key),
        'Content-Type':'application/json',Accept:'application/json'},
      body:method==='GET'?undefined:JSON.stringify(body),
      cache:'no-store',signal:AbortSignal.timeout(10000)
    });
    const data=await response.json().catch(()=>null);
    if(!response.ok)throw Error(data?.message||data?.msg||'Supabase HTTP '+response.status);
    return data;
  }
  function paintUnknown(){
    status.textContent='ESTADO: NO VERIFICADO';status.dataset.active='unknown';
    count.textContent='';
    stopReports.disabled=true;resumeReports.disabled=true;refreshReports.disabled=true;
    inbox.hidden=true;
  }
  function paintState(s){
    if(typeof s?.enabled!=='boolean')throw Error('Supabase devolvió un estado inválido.');
    const on=s.enabled;
    status.textContent=on?'INFORMES ACTIVADOS':'INFORMES DETENIDOS';
    status.dataset.active=on?'true':'false';
    count.textContent='Recibidos hoy: '+Number(s.received_today||0)+' / '+Number(s.daily_limit||40);
    stopReports.disabled=!on;resumeReports.disabled=on;refreshReports.disabled=false;
    inbox.hidden=false;
  }
  async function staffLogin(){
    if(!hasSavedRaceControlSession()){
      notify('Inicia sesión desde Ajustes → Cuenta con tu perfil Google antes de entrar aquí.');
      return;
    }
    login.disabled=true;notify('Comprobando permisos de administración…');
    try{
      const authResult=(await refreshRaceControlOnlineSession()).session;
      if(!authResult?.access_token||!authResult?.user?.id)throw Error('Sesión no disponible');
      const user=await request('/auth/v1/user',{method:'GET',accessToken:authResult.access_token});
      if(user?.id!==authResult.user.id||
        user?.app_metadata?.tdr_staff!==true||
        !user?.app_metadata?.providers?.includes('google'))
        throw Error('Esta cuenta no tiene permisos de administración.');
      token=authResult.access_token;authorizedUser=user.id;
      auth.hidden=true;notify('Sesión de administración verificada.');
      await refresh();
    }catch(error){
      token=null;authorizedUser=null;auth.hidden=false;paintUnknown();
      notify('No se pudo acceder: '+messageForError(error));
    }finally{if(!closed)login.disabled=false;}
  }
  async function refresh(){
    if(closed||!token||!authorizedUser)return;
    stopReports.disabled=true;resumeReports.disabled=true;refreshReports.disabled=true;
    try{
      const s=await request('/rest/v1/rpc/tdr_feedback_admin_status');
      if(closed)return;
      paintState(s);notify('Estado confirmado por Supabase.');
    }catch(error){
      if(closed)return;
      paintUnknown();auth.hidden=false;notify('No se ha podido confirmar el estado: '+messageForError(error));
    }
  }
  async function updateReports(enabled){
    if(closed||!token||!authorizedUser)return;
    stopReports.disabled=true;resumeReports.disabled=true;
    notify(enabled?'Activando informes…':'Deteniendo informes…');
    try{
      const result=await request('/rest/v1/rpc/tdr_set_feedback_enabled',
        {body:{p_enabled:enabled}});
      if(result?.enabled!==enabled)throw Error('El servidor no ha confirmado el cambio.');
      await refresh();
      if(!closed)notify(enabled?'Informes ACTIVADOS por el servidor.':'Informes DETENIDOS por el servidor.');
    }catch(error){
      paintUnknown();notify('Cambio NO confirmado: '+messageForError(error)+'. Consulta el panel oficial.');
    }
  }
  async function loadReports(){
    if(closed||!token||!authorizedUser)return;
    showReports.disabled=true;reportList.replaceChildren(el('p','','Consultando informes…'));
    try{
      const values=await request('/rest/v1/tdr_feedback_reports?select=id,category,message,diagnostics,created_at&order=created_at.desc&limit=20',
        {method:'GET'});
      if(!Array.isArray(values))throw Error('Respuesta de informes inválida.');
      if(closed)return;
      reportList.replaceChildren();
      for(const record of values){
        const item=el('article','tdr-emergency-report');
        item.append(el('strong','',String(record.category||'').toUpperCase()+' · #'+record.id),
          el('small','',new Date(record.created_at).toLocaleString()),
          el('p','',record.message));
        const copy=button('COPIAR PARA GITHUB','tdr-emergency-neutral',async()=>{
          try{
            const body='TDR #'+record.id+'\nCategoría: '+record.category+'\nFecha: '+record.created_at+
              '\n\n'+record.message+'\n\nDatos técnicos autorizados:\n'+
              JSON.stringify(record.diagnostics||{},null,2);
            await navigator.clipboard.writeText(body);notify('Informe copiado.');
          }catch{notify('No se pudo copiar. Revisa los permisos del navegador.');}
        });
        item.append(copy);reportList.append(item);
      }
      if(!values.length)reportList.append(el('p','','No se han recibido informes.'));
    }catch(error){
      if(!closed)reportList.replaceChildren(el('p','','No se pudieron cargar: '+messageForError(error)));
    }finally{if(!closed)showReports.disabled=false;}
  }

  paintUnknown();
  auth.hidden=false;
  return close;
}
