import {canonicalRuntimeText,localizeDomTree} from '../i18n/canonicalRuntimeText.js';
import {getLanguage} from '../i18n/index.js';
import {
  currentRaceControlAccount,requestRaceControlEmailLink,
  verifyRaceControlEmailCode,setRaceControlPassword,
  switchRaceControlAccount,getMyRaceControlBadge,
  hasSavedRaceControlSession,continueRejectedAnonymousSessionLocally
} from '../online/raceControlOnline.js';
import {
  cloudBackupStatus,createFirstCloudBackup,updateCloudBackup,readCloudBackup,
  restoreCloudBackup,inspectLocalProgress,exportLocalProgressJson,
  exportCloudProgressJson,downloadPortableSave,shortPlayerId
} from './cloudProgress.js';

const ID='tdr-cloud-account-modal';
const html="<div class=\"tdr-cloud-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Mi cuenta\">\n<header class=\"tdr-cloud-head\"><div><small>TOP DOWN RACE</small><h2>MI CUENTA</h2></div><button type=\"button\" data-action=\"close\" aria-label=\"Cerrar\">✕</button></header>\n<div class=\"tdr-cloud-message\" data-cloud-message role=\"status\" aria-live=\"polite\"></div>\n<section data-stage=\"home\">\n  <div class=\"tdr-cloud-driver\"><span class=\"tdr-cloud-avatar\" aria-hidden=\"true\">🏁</span><div><strong data-cloud-pilot>MI PILOTO</strong><small>PERFIL DE JUGADOR</small></div><button data-action=\"edit-pilot\" type=\"button\" aria-label=\"Editar nombre de piloto\">✎</button></div>\n  <div class=\"tdr-cloud-state\" data-cloud-state><span data-cloud-icon aria-hidden=\"true\">☁</span><div><strong data-cloud-title>Comprobando tu partida…</strong><p data-cloud-description>Un momento, por favor.</p></div></div>\n  <div class=\"tdr-cloud-main-actions\">\n    <button type=\"button\" data-action=\"protect\" class=\"tdr-cloud-primary\" hidden>PROTEGER MI PARTIDA</button>\n    <button type=\"button\" data-action=\"backup\" class=\"tdr-cloud-primary\" hidden>GUARDAR MI PARTIDA</button>\n    <button type=\"button\" data-action=\"restore\" class=\"tdr-cloud-primary\" hidden>RECUPERAR MI PARTIDA</button>\n    <button type=\"button\" data-action=\"login-open\" hidden>YA TENÍA UNA PARTIDA</button><button type=\"button\" data-action=\"retry\" hidden>VOLVER A INTENTAR</button>\n  </div><p class=\"tdr-cloud-tip\" data-cloud-tip>Puedes jugar sin registrarte.</p>\n</section>\n<section data-stage=\"link\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Protege tu partida</h3><p>Solo necesitamos tu correo. Te enviaremos un código.</p><form data-form=\"link\"><label>TU CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required placeholder=\"tucorreo@ejemplo.com\"></label><button type=\"submit\">ENVIAR CÓDIGO</button></form><p class=\"tdr-cloud-tip\">Si eres menor, pide ayuda a una persona adulta.</p></section>\n<section data-stage=\"verify\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Revisa tu correo</h3><p>Introduce las seis cifras del mensaje. Revisa también spam.</p><form data-form=\"verify\"><label>CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required placeholder=\"tucorreo@ejemplo.com\"></label><label>CÓDIGO DE 6 CIFRAS<input type=\"text\" name=\"code\" required inputmode=\"numeric\" pattern=\"[0-9]{6}\" maxlength=\"6\" autocomplete=\"one-time-code\" placeholder=\"000000\"></label><button type=\"submit\">COMPROBAR CÓDIGO</button></form></section>\n<section data-stage=\"password\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Un último paso</h3><p>Por ahora necesitas una contraseña para recuperar tu partida en otro móvil.</p><form data-form=\"password\"><label>CONTRASEÑA (MÍNIMO 10 CARACTERES)<input type=\"password\" name=\"password\" required minlength=\"10\" maxlength=\"128\" autocomplete=\"new-password\"></label><button type=\"submit\">TERMINAR Y GUARDAR</button></form></section>\n<section data-stage=\"login\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Recuperar mi partida</h3><p>Usa el correo y la contraseña con los que protegiste tu partida.</p><form data-form=\"login\"><label>MI CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required></label><label>CONTRASEÑA<input type=\"password\" name=\"password\" autocomplete=\"current-password\" required></label><button type=\"submit\">ENTRAR CON MI CUENTA</button></form><p class=\"tdr-cloud-tip\">No se borrarán los datos del móvil sin pedirte permiso.</p></section>\n<details class=\"tdr-cloud-advanced\" data-advanced><summary>OPCIONES AVANZADAS</summary><p>Herramientas de pruebas y copias manuales. No las necesitas para jugar.</p>\n<div class=\"tdr-cloud-advanced-buttons\"><button type=\"button\" data-action=\"backup-manual\">GUARDAR COPIA MANUAL</button><button type=\"button\" data-action=\"restore-manual\">RECUPERAR PARTIDA DE LA NUBE</button><button type=\"button\" data-action=\"change-account\">CAMBIAR DE CUENTA</button><button type=\"button\" data-action=\"export-local\">EXPORTAR PARTIDA LOCAL (JSON)</button><button type=\"button\" data-action=\"export-cloud\">EXPORTAR COPIA DE LA NUBE (JSON)</button></div>\n<p class=\"tdr-cloud-tip\">Las grabaciones locales no se incluyen. No desinstales hasta comprobar tu recuperación.</p></details></div>";
const css="#tdr-cloud-account-modal{position:fixed;inset:0;z-index:2147483647;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box;background:#020710ed;display:flex;justify-content:center;align-items:center;color:#eef5ff;font:14px/1.4 system-ui,-apple-system,sans-serif}\n#tdr-cloud-account-modal *{box-sizing:border-box}#tdr-cloud-account-modal [hidden]{display:none!important}\n#tdr-cloud-account-modal .tdr-cloud-panel{width:min(620px,100%);max-height:100%;overflow:auto;border:1px solid #31506b;border-radius:14px;padding:clamp(12px,2vw,22px);background:linear-gradient(145deg,#14283e,#060f1e);box-shadow:0 20px 65px #000b}\n#tdr-cloud-account-modal .tdr-cloud-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}\n#tdr-cloud-account-modal .tdr-cloud-head small{font:850 9px system-ui;letter-spacing:.16em;color:#97b0c7}\n#tdr-cloud-account-modal h2{font:950 clamp(19px,3vw,27px) system-ui;margin:2px 0}\n#tdr-cloud-account-modal h3{font:950 clamp(19px,3vw,26px) system-ui;margin:10px 0}\n#tdr-cloud-account-modal button{min-height:44px;padding:9px 14px;border:1px solid #4e6983;border-radius:9px;background:#18314b;color:#e6f0ff;font:850 12px system-ui;cursor:pointer;touch-action:manipulation}\n#tdr-cloud-account-modal button:focus-visible,#tdr-cloud-account-modal summary:focus-visible,#tdr-cloud-account-modal input:focus-visible{outline:3px solid #ffc050;outline-offset:2px}\n#tdr-cloud-account-modal button:disabled{opacity:.45;cursor:wait}\n#tdr-cloud-account-modal .tdr-cloud-head button{font-size:21px;border:0;background:transparent;min-width:44px}\n#tdr-cloud-account-modal .tdr-cloud-driver{display:flex;align-items:center;gap:13px;margin-bottom:13px}\n#tdr-cloud-account-modal .tdr-cloud-avatar{display:grid;place-items:center;width:51px;height:51px;font-size:25px;background:#243e59;border-radius:11px}\n#tdr-cloud-account-modal .tdr-cloud-driver strong{display:block;font:950 clamp(16px,2.6vw,22px) system-ui;overflow-wrap:anywhere}\n#tdr-cloud-account-modal .tdr-cloud-driver small{color:#9cafc3;font-size:10px;letter-spacing:.1em}\n#tdr-cloud-account-modal .tdr-cloud-state{border:1px solid #37526b;border-radius:13px;padding:16px;background:#0c1c30;display:flex;align-items:flex-start;gap:13px}\n#tdr-cloud-account-modal .tdr-cloud-state[data-state=\"protected\"]{border-color:#298c68;background:#0e2a2b}\n#tdr-cloud-account-modal .tdr-cloud-state[data-state=\"pending\"]{border-color:#ab7a36}\n#tdr-cloud-account-modal [data-cloud-icon]{font-size:25px;line-height:1}\n#tdr-cloud-account-modal [data-cloud-title]{display:block;font-size:clamp(15px,2.4vw,19px);font-weight:900;line-height:1.2}\n#tdr-cloud-account-modal p{font-size:13px;line-height:1.45;color:#b4c5d5;margin:7px 0 11px}\n#tdr-cloud-account-modal .tdr-cloud-main-actions{display:grid;gap:10px;margin-top:14px}\n#tdr-cloud-account-modal button.tdr-cloud-primary{background:linear-gradient(#ffbd42,#f4a21a);border-color:#ffd071;color:#172235;min-height:48px;font-size:14px;box-shadow:0 3px 0 #74450b}\n#tdr-cloud-account-modal .tdr-cloud-tip{font-size:11px;color:#93a9bb;text-align:center;margin:10px 0 3px}\n#tdr-cloud-account-modal .tdr-cloud-message{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:#87e7b2;margin-bottom:8px}\n#tdr-cloud-account-modal .tdr-cloud-message:empty{display:none}\n#tdr-cloud-account-modal .tdr-cloud-back{background:transparent;border:0;color:#c0d6e5}\n#tdr-cloud-account-modal .tdr-cloud-step form{display:grid;gap:9px;margin:15px 0}\n#tdr-cloud-account-modal .tdr-cloud-step label{display:grid;gap:6px;font-size:11px;font-weight:850;color:#cfdeea}\n#tdr-cloud-account-modal .tdr-cloud-step input{width:100%;height:46px;font:16px system-ui;background:#071626;color:white;border:1px solid #52718c;border-radius:8px;padding:0 12px}\n#tdr-cloud-account-modal .tdr-cloud-advanced{border-top:1px solid #27455d;margin-top:18px;padding-top:10px}\n#tdr-cloud-account-modal .tdr-cloud-advanced summary{cursor:pointer;min-height:44px;padding:12px 4px;font-size:11px;font-weight:850;color:#aabfce;letter-spacing:.08em}\n#tdr-cloud-account-modal .tdr-cloud-advanced-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}\n#tdr-cloud-account-modal .tdr-cloud-advanced-buttons button{font-size:10px;overflow-wrap:anywhere}\n#tdr-cloud-account-modal[data-inline=\"1\"]{position:static;inset:auto;z-index:auto;display:block;padding:0;background:transparent;width:100%}\n#tdr-cloud-account-modal[data-inline=\"1\"] .tdr-cloud-panel{width:100%;max-height:none;overflow:visible;border:0;box-shadow:none;background:transparent;padding:0}\n#tdr-cloud-account-modal[data-inline=\"1\"] .tdr-cloud-head [data-action=\"close\"]{display:none}\n@media(max-height:480px){#tdr-cloud-account-modal .tdr-cloud-avatar{width:43px;height:43px}#tdr-cloud-account-modal .tdr-cloud-state{padding:11px}#tdr-cloud-account-modal .tdr-cloud-driver{margin-bottom:7px}#tdr-cloud-account-modal .tdr-cloud-advanced{margin-top:8px}}\n@media(max-width:450px){#tdr-cloud-account-modal .tdr-cloud-advanced-buttons{grid-template-columns:1fr}}\n#tdr-cloud-account-modal .tdr-cloud-driver>div{flex:1;min-width:0}#tdr-cloud-account-modal .tdr-cloud-driver [data-action=\"edit-pilot\"]{min-width:44px;font-size:21px;background:transparent;border:1px solid #3c5369;color:#f4b84b}";

const extract=(form,key)=>String(new FormData(form).get(key)||'').trim();
const dateText=value=>{
  if(!value)return '—';
  const date=new Date(value);
  return Number.isFinite(date.valueOf())?date.toLocaleString(getLanguage()==='en'?'en-GB':'es-ES'):String(value);
};
// The existing Settings → Cuenta tab owns the normal account UI.
// First-run onboarding may still open the same UI as a temporary modal before
// the player has a nickname or access to the Settings menu.
export function unmountCloudAccountSettings(){
  const current=document.getElementById(ID);
  if(current?.dataset.inline==='1'){
    current.remove();
    document.getElementById(ID+'-styles')?.remove();
  }
}
export function openCloudAccountUi({host=null}={}){
  if(document.getElementById(ID))return;
  const root=document.createElement('div');
  root.id=ID;
  root.dataset.inline=host?'1':'0';
  // The Settings panel is a normal page region, not a second modal dialog.
  root.innerHTML=host?html.replace('role="dialog" aria-modal="true"','role="region"'):html;
  // Show the authenticated creator status separately from cloud backup status.
  const creatorBadge=document.createElement('span');
  creatorBadge.dataset.cloudCreatorBadge='1';
  creatorBadge.textContent='✓ CREADOR';creatorBadge.hidden=true;
  creatorBadge.title='Creador reconocido por Top Down Race';
  root.querySelector('[data-cloud-pilot]')?.after(creatorBadge);
  const idLine=document.createElement('small');
  idLine.dataset.cloudPlayerId='1';
  idLine.textContent='Comprobando ID…';
  creatorBadge.after(idLine);
  const quickExport=document.createElement('button');
  quickExport.type='button';quickExport.dataset.action='quick-export';
  quickExport.className='tdr-cloud-secondary';
  quickExport.textContent='DESCARGAR COPIA';
  root.querySelector('.tdr-cloud-main-actions')?.appendChild(quickExport);
  const localContinue=document.createElement('button');
  localContinue.type='button';localContinue.dataset.action='continue-local';
  localContinue.className='tdr-cloud-primary';
  localContinue.textContent='SEGUIR CON MI PARTIDA LOCAL';
  localContinue.hidden=true;
  root.querySelector('.tdr-cloud-main-actions')?.prepend(localContinue);
  const legacyAccess=document.createElement('button');
  legacyAccess.type='button';legacyAccess.dataset.action='legacy-access';
  legacyAccess.textContent='ACCESO ANTIGUO (CORREO)';
  root.querySelector('.tdr-cloud-advanced-buttons')?.appendChild(legacyAccess);
  root.querySelector('[data-action="backup-manual"]').hidden=true;
  const style=document.createElement('style');
  style.id=ID+'-styles';
  style.textContent=css+`
    /* Embedded in the existing Settings > Account card: no new screen. */
    #${ID}[data-inline="1"]{position:static;inset:auto;z-index:auto;display:block;width:100%;
      padding:0;background:transparent;color:inherit;box-sizing:border-box;}
    #${ID}[data-inline="1"] .tdr-cloud-panel{width:100%;max-height:none;overflow:visible;
      padding:0;border:0;background:transparent;box-shadow:none;}
    #${ID}[data-inline="1"] .tdr-cloud-head [data-action="close"]{display:none;}
    #${ID}[data-inline="1"] .tdr-cloud-head small{color:#6effbb;}
    #${ID}[data-inline="1"] .tdr-cloud-section{border-color:rgba(180,205,255,.15);}
    #${ID}[data-inline="1"] .tdr-cloud-summary{border-color:rgba(90,240,170,.25);}
    @media(max-width:760px){#${ID}[data-inline="1"] form{display:grid;gap:8px;}
      #${ID}[data-inline="1"] label{min-width:0;flex:auto;}
      #${ID}[data-inline="1"] .tdr-cloud-actions{display:grid;}
      #${ID}[data-inline="1"] button{width:100%;}}
  `;
  style.textContent+="\n  #tdr-cloud-account-modal .tdr-cloud-panel{max-width:760px;margin-inline:auto;}\n  #tdr-cloud-account-modal[data-inline=\"1\"] .tdr-cloud-panel{max-width:760px;margin-inline:auto;}\n  #tdr-cloud-account-modal .tdr-cloud-driver>div{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:baseline;}\n  #tdr-cloud-account-modal .tdr-cloud-driver strong{width:100%;}\n  #tdr-cloud-account-modal [data-cloud-creator-badge]{display:inline-flex;padding:3px 10px;\n    border:1px solid #ac843c;border-radius:14px;color:#ffd17b;background:rgba(100,56,5,.3);\n    font:900 11px system-ui;letter-spacing:.075em;}\n  #tdr-cloud-account-modal [data-cloud-creator-badge][hidden]{display:none;}\n  #tdr-cloud-account-modal [data-cloud-player-id]{color:#b0c9d8;font:700 10px system-ui;}\n  #tdr-cloud-account-modal .tdr-cloud-main-actions{display:flex;flex-wrap:wrap;gap:10px;}\n  #tdr-cloud-account-modal .tdr-cloud-main-actions button{min-width:200px;max-width:350px;flex:1 1 220px;}\n  #tdr-cloud-account-modal button.tdr-cloud-secondary{border:1px solid #50748d;color:#d6e9f4;background:#11283e;box-shadow:none;font-size:12px;}\n  #tdr-cloud-account-modal .tdr-cloud-state[data-state=\"saved\"]{border-color:#2f9577;background:#0e2a2b;}\n  #tdr-cloud-account-modal .tdr-cloud-tip{text-align:left;color:#dcc091;font-size:12px;line-height:1.5;}\n  @media(max-width:520px){#tdr-cloud-account-modal .tdr-cloud-main-actions button{max-width:none;min-width:100%;}}\n";
  document.head.appendChild(style);
  (host||document.body).appendChild(root);
  localizeDomTree(root);
  const state=root.querySelector('[data-cloud-state]');
  const notice=root.querySelector('[data-cloud-message]');
  const localText=value=>getLanguage()==='en'?canonicalRuntimeText(value):value;
  const accountConfirm=value=>window.confirm(localText(value));
  const setNotice=(message,good=true)=>{notice.textContent=localText(String(message||''));notice.style.color=good?'#adffcc':'#ffaaa9';};
  let busy=false,account=null,backup=null;
  const setView=stage=>{
    for(const section of root.querySelectorAll('[data-stage]'))section.hidden=section.dataset.stage!==stage;
    root.querySelector('[data-advanced]').hidden=stage!=='home';
    if(stage==='home')root.querySelector('[data-advanced]').open=false;
    setNotice('');
  };
  const showLocalAccount=()=>{
    account=null;backup=null;
    const local=inspectLocalProgress();
    root.querySelector('[data-cloud-pilot]').textContent=local.pilotName||'MI PILOTO';
    idLine.textContent='PARTIDA LOCAL';creatorBadge.hidden=true;
    localContinue.hidden=true;localContinue.dataset.userId='';
    for(const key of ['protect','backup','restore','login-open','retry'])
      root.querySelector('[data-action="'+key+'"]').hidden=true;
    quickExport.hidden=false;
    state.dataset.state='local';
    root.querySelector('[data-cloud-icon]').textContent='🏁';
    root.querySelector('[data-cloud-title]').textContent='Partida en este dispositivo';
    root.querySelector('[data-cloud-description]').textContent='Puedes jugar, mejorar tus coches y ganar recompensas sin registrarte.';
    root.querySelector('[data-cloud-tip]').textContent='Para recuperar la partida en otro móvil necesitarás vincular Google o Apple. Esa conexión todavía no está habilitada; conserva una copia local.';
    for(const key of ['backup-manual','restore-manual','export-cloud'])
      root.querySelector('[data-action="'+key+'"]').disabled=true;
    localizeDomTree(root);
  };
  const showConnectionError=(error)=>{
    creatorBadge.hidden=true;idLine.textContent='Identidad sin comprobar';
    // Keep local progress visible even when Auth or cloud storage is offline.
    let local=null;
    try{local=inspectLocalProgress();}catch{}
    root.querySelector('[data-cloud-pilot]').textContent=local?.pilotName||'MI PILOTO';
    for(const key of ['protect','backup','restore','login-open'])
      root.querySelector('[data-action="'+key+'"]').hidden=true;
    root.querySelector('[data-action="retry"]').hidden=false;
    const recoverableLocal=error?.code==='TDR_AUTH_REFRESH_REJECTED'&&!!error?.userId;
    localContinue.hidden=!recoverableLocal;
    localContinue.dataset.userId=recoverableLocal?String(error.userId):'';
    const sessionLost=recoverableLocal||/No se pudo recuperar tu sesión|No se pudo renovar tu cuenta|La sesión de tu cuenta caducó/.test(String(error?.message||''));
    state.dataset.state='local';
    root.querySelector('[data-cloud-icon]').textContent='☁';
    root.querySelector('[data-cloud-title]').textContent=sessionLost?'Tu sesión online requiere recuperación':'Tu partida sigue en este móvil';
    root.querySelector('[data-cloud-description]').textContent=
      recoverableLocal?'La sesión anterior ya no se puede renovar. Puedes seguir jugando con tus monedas, coches y progreso en este dispositivo.':sessionLost?'Supabase ha rechazado la renovación. Tu partida local sigue intacta y no se creará otra identidad automáticamente.':'Ahora no podemos conectar con la nube. Puedes seguir jugando y volver a intentarlo.';
    root.querySelector('[data-cloud-tip]').textContent=
      recoverableLocal?'No se borrará tu partida. Se quitará únicamente la sesión online antigua si lo confirmas.':'No se ha cambiado ni borrado tu progreso.';
    for(const key of ['backup-manual','restore-manual','export-cloud'])
      root.querySelector('[data-action="'+key+'"]').disabled=true;
    localizeDomTree(root);
  };
  const refresh=async()=>{
    if(!hasSavedRaceControlSession()){showLocalAccount();return;}
    // Auth first, then the cloud lookup: cold starts must never register two
    // competing anonymous users in parallel.
    account=await currentRaceControlAccount();
    backup=await cloudBackupStatus();
    if(account.id!==backup.id)throw new Error('La cuenta y la copia tienen identidades distintas.');
    const local=inspectLocalProgress();
    root.querySelector('[data-action="retry"]').hidden=true;
    localContinue.hidden=true;localContinue.dataset.userId='';
    let pending=null;try{pending=localStorage.getItem('tdr2:cloudLoginPendingRestore:v1');}catch{}
    let checked=false;try{checked=localStorage.getItem('tdr2:cloudRecoveryChecked:'+account.id)==='1';}catch{}
    const accountAccessChecked=!account.anonymous&&account.emailConfirmed&&checked;
    const title=root.querySelector('[data-cloud-title]');
    const desc=root.querySelector('[data-cloud-description]');
    const tip=root.querySelector('[data-cloud-tip]');
    const icon=root.querySelector('[data-cloud-icon]');
    root.querySelector('[data-cloud-pilot]').textContent=local.pilotName||'MI PILOTO';
    idLine.textContent='ID · '+shortPlayerId(account.id);
    creatorBadge.hidden=true;
    try{creatorBadge.hidden=(await getMyRaceControlBadge())!=='CREADOR';}catch{}
    for(const key of ['protect','backup','restore','login-open'])
      root.querySelector('[data-action="'+key+'"]').hidden=true;
    const show=(key,label)=>{
      const b=root.querySelector('[data-action="'+key+'"]');
      b.hidden=false;if(label)b.textContent=label;
    };
    quickExport.hidden=false;
    if(pending){
      state.dataset.state='pending';icon.textContent='↪';
      title.textContent=backup.existing?'Copia encontrada':'Cuenta conectada';
      desc.textContent=backup.existing?
        'Hay una partida anterior. Confirma su restauración antes de guardar otra copia.':
        'Esta identidad no tiene copia en la nube. Tu partida local no ha cambiado.';
      if(backup.existing)show('restore','RECUPERAR PARTIDA');
      tip.textContent='No sobrescribiremos tu partida sin confirmarlo.';
    }else{
      state.dataset.state=backup.existing?'saved':'local';
      icon.textContent=backup.existing?'✅':'☁';
      title.textContent=backup.existing?'Partida guardada en la nube':'Partida guardada en este dispositivo';
      desc.textContent=backup.existing?
        'Última copia: '+dateText(backup.updatedAt)+' · Revisión '+backup.revision+'. Actualízala después de jugar.':
        'Todavía no existe una copia online de este piloto.';
      if(local.meaningful)show('backup',backup.existing?'ACTUALIZAR COPIA':'GUARDAR COPIA');
      if(!local.pilotName||!local.meaningful)show('login-open','YA TENÍA UNA PARTIDA');
      tip.textContent=accountAccessChecked?
        'La recuperación antigua se comprobó en este dispositivo. Conserva sus credenciales.':
        'Una copia en la nube NO basta para entrar tras cambiar de dispositivo. Descarga también tu partida y no desinstales hasta contar con un acceso probado. El sistema sin correo TDR ID todavía no está listo.';
    }
    root.querySelector('[data-action="backup"]').disabled=!!pending||!local.meaningful;
    root.querySelector('[data-action="restore"]').disabled=!backup.existing;
    root.querySelector('[data-action="backup-manual"]').disabled=!!pending||!local.meaningful;
    root.querySelector('[data-action="restore-manual"]').disabled=!backup.existing;
    root.querySelector('[data-action="export-cloud"]').disabled=!backup.existing;
    const verifyEmail=root.querySelector('[data-form="verify"] input[name="email"]');
    if(verifyEmail&&!verifyEmail.value)verifyEmail.value=account.pendingEmail||account.email||'';
    localizeDomTree(root);
  };
  const run=async(task,{reload=false}={})=>{
    if(busy)return;
    busy=true;
    for(const b of root.querySelectorAll('button'))b.disabled=true;
    setNotice('Trabajando…');
    try{
      const message=await task();
      setNotice(message||(hasSavedRaceControlSession()?'Operación terminada.':''));
      if(reload){window.location.reload();return;}
    }catch(error){
      setNotice(String(error?.message||error),false);
    }finally{
      busy=false;
      if(root.isConnected){
        for(const b of root.querySelectorAll('button'))b.disabled=false;
        try{await refresh();}catch(error){
          // Never leave the account stuck on "Comprobando tu partida".
          showConnectionError(error);
          setNotice(error?.code==='TDR_AUTH_REFRESH_REJECTED'
            ?'Tu sesión antigua ya no funciona. Puedes continuar con tu partida local.'
            :/No se pudo recuperar tu sesión|No se pudo renovar tu cuenta|La sesión de tu cuenta caducó/.test(String(error?.message||''))
              ?'Sesión online no válida. No borres datos ni desinstales TDR; conserva tu partida para recuperarla.'
              :'No se pudo conectar con la nube. Tu partida local sigue intacta.',error?.code==='TDR_AUTH_REFRESH_REJECTED');
        }
      }
    }
  };
  root.querySelector('[data-action="close"]').addEventListener('click',()=>{if(busy)return;root.remove();style.remove();});
  const editPilot=root.querySelector('[data-action="edit-pilot"]');
  if(!host)editPilot.hidden=true;
  else editPilot.addEventListener('click',()=>{
    const details=host.closest('.s2grid')?.querySelector('.tdr-account-extra');
    if(!details)return;
    details.open=true;
    details.querySelector('[data-pilot-settings-name]')?.focus();
  });
  root.querySelectorAll('[data-action="back"]').forEach(b=>b.addEventListener('click',()=>setView('home')));
  root.querySelector('[data-action="protect"]').addEventListener('click',()=>setView(account.emailConfirmed?'password':account.pendingEmail?'verify':'link'));
  root.querySelector('[data-action="login-open"]').addEventListener('click',()=>setView('login'));
  localContinue.addEventListener('click',()=>{
    const oldId=localContinue.dataset.userId;
    if(!oldId)return;
    if(!accountConfirm('CONTINUAR SIN CUENTA\n\nSe quitará la sesión online anterior de este dispositivo. El nick, monedas, coches, tiempos y progreso local NO se borrarán.\n\nSi la cuenta anterior todavía existiera, ya no podrías acceder a ella desde esta sesión. La nueva vinculación con Google y Apple aún no está disponible.\n\n¿Quieres continuar con tu partida local?'))return;
    run(async()=>{
      continueRejectedAnonymousSessionLocally(oldId);
      return '✅ Partida local conservada. Tu acceso online anterior ya no está vinculado a este móvil.';
    });
  });
  root.querySelector('[data-action="retry"]').addEventListener('click',()=>run(async()=>{
    await refresh();
    return 'Conexión comprobada.';
  }));
  root.querySelector('[data-action="change-account"]').addEventListener('click',()=>setView('login'));
  root.querySelector('[data-action="legacy-access"]').addEventListener('click',()=>
    setView(account?.emailConfirmed?'password':account?.pendingEmail?'verify':'link'));
  const downloadNotice=(result,label)=>{
    if(result.status==='cancelled')return 'Descarga cancelada. Tu partida y la copia online siguen intactas.';
    if(result.status==='saved')return '✅ ARCHIVO GUARDADO EN ANDROID · '+result.filename+' · '+label;
    return 'Solicitud enviada al navegador: '+result.filename+'. Comprueba Descargas antes de borrar datos.';
  };
  // The primary button exports the ACTUAL cloud backup when it exists.
  // Advanced options still offer separate LOCAL and CLOUD exports.
  quickExport.addEventListener('click',()=>run(async()=>{
    const remote=backup?.existing===true;
    const json=remote?await exportCloudProgressJson():exportLocalProgressJson();
    const result=await downloadPortableSave(json,remote?'top-down-race-nube.json':'top-down-race-partida.json');
    return downloadNotice(result,remote?'copia de la nube':'partida local');
  }));
  root.querySelector('[data-action="backup-manual"]').addEventListener('click',()=>root.querySelector('[data-action="backup"]').click());
  root.querySelector('[data-action="restore-manual"]').addEventListener('click',()=>root.querySelector('[data-action="restore"]').click());
  root.querySelector('[data-action="backup"]').addEventListener('click',()=>run(async()=>{
    const status=await cloudBackupStatus();
    const local=inspectLocalProgress();
    if(!local.meaningful)throw new Error('No hay progreso local suficiente para guardar.');
    const action=status.existing?'ACTUALIZAR':'CREAR';
    if(!accountConfirm(action+' COPIA EN LA NUBE\n\n'+
      local.keys+' bloques · '+(local.pilotName||'Piloto sin nombre')+
      '\nJugador: '+status.id+
      (status.existing?'\nÚltima copia: '+dateText(status.updatedAt):'')+
      '\n\n¿Confirmas que estos son los datos que quieres guardar?'))return 'Copia cancelada.';
    const result=status.existing
      ?await updateCloudBackup(status.revision)
      :await createFirstCloudBackup();
    return '✅ COPIA GUARDADA · REV '+result.revision+' · '+result.keys+
      ' bloques. Descarga también tu partida: guardar la copia no garantiza recuperar el acceso.';
  }));
  root.querySelector('[data-action="restore"]').addEventListener('click',()=>run(async()=>{
    const cloud=await readCloudBackup();
    if(!cloud)throw new Error('No existe copia de esta cuenta.');
    const local=inspectLocalProgress();
    const warning='RECUPERAR COPIA DE LA NUBE\n\n'+
      'Servidor: '+dateText(cloud.updatedAt)+' · '+cloud.keys+' bloques'+
      '\nLocal actual: '+local.keys+' bloques · '+(local.pilotName||'Sin nombre')+
      '\n\nESTO SUSTITUIRÁ LA PARTIDA GUARDADA EN ESTE DISPOSITIVO. '+
      'No modifica la copia de la nube ni la cuenta. ¿Continuar?';
    if(!accountConfirm(warning))return 'Restauración cancelada. No se cambió nada.';
    const result=await restoreCloudBackup();
    if(!accountConfirm('✅ Recuperación completada: '+result.restoredKeys+
      ' bloques. Reiniciar el juego para cargar la partida recuperada.'))return
      'Copia restaurada. Reinicia manualmente la aplicación para cargarla.';
    window.location.reload();
    return 'Partida recuperada.';
  }));
  root.querySelector('[data-form="link"]').addEventListener('submit',event=>{
    event.preventDefault();
    const email=extract(event.currentTarget,'email');
    run(async()=>{
      const current=await currentRaceControlAccount();
      if(!current.anonymous&&!current.pendingEmail)
        throw new Error('Esta cuenta ya tiene un correo vinculado.');
      await requestRaceControlEmailLink(email);
      root.querySelector('[data-form="verify"] [name="email"]').value=email;
      setView('verify');
      return 'Correo de verificación solicitado para '+email+
        '. Comprueba el mensaje. Si contiene un código de seis cifras, introdúcelo abajo. Nunca cambies de cuenta antes de guardar tu progreso.';
    });
  });
  root.querySelector('[data-form="verify"]').addEventListener('submit',event=>{
    event.preventDefault();
    const email=extract(event.currentTarget,'email'),code=extract(event.currentTarget,'code');
    run(async()=>{
      const before=await currentRaceControlAccount();
      const after=await verifyRaceControlEmailCode(email,code);
      if(before.id!==after.id)throw new Error('La verificación no conservó tu ID.');
      if(!after.emailConfirmed)
        return 'La solicitud se recibió, pero Supabase aún no confirma el correo. Revisa el enlace/código.';
      setView('password');
      return '✅ Correo verificado. Queda un último paso.';
    });
  });
  root.querySelector('[data-form="password"]').addEventListener('submit',event=>{
    event.preventDefault();
    const password=String(new FormData(event.currentTarget).get('password')||'');
    run(async()=>{
      const checked=await setRaceControlPassword(password);
      if(!checked.recoveryVerified)throw new Error('La contraseña aún no se ha comprobado.');
      try{localStorage.setItem('tdr2:cloudRecoveryChecked:'+checked.id,'1');}catch{}
      event.currentTarget.reset();
      const remote=await cloudBackupStatus();
      const progress=inspectLocalProgress();
      let message='✅ Cuenta comprobada. Conserva tu contraseña.';
      if(progress.meaningful&&!remote.existing){
        const saved=await createFirstCloudBackup();
        message='✅ Cuenta protegida y copia verificada: '+saved.keys+' bloques.';
      }else if(remote.existing){
        message='✅ Cuenta protegida. Tu copia anterior sigue disponible.';
      }
      setView('home');
      return message;
    });
  });
  root.querySelector('[data-form="login"]').addEventListener('submit',event=>{
    event.preventDefault();
    const email=extract(event.currentTarget,'email');
    const password=String(new FormData(event.currentTarget).get('password')||'');
    run(async()=>{
      if(!accountConfirm('ENTRAR CON '+email+'\n\nSe cambiará la identidad online. La partida LOCAL NO se borrará ni fusionará. Después tendrás que pulsar RECUPERAR PARTIDA. ¿Continuar?'))
        return 'Inicio de sesión cancelado.';
      const session=await switchRaceControlAccount(email,password);
      try{localStorage.setItem('tdr2:cloudRecoveryChecked:'+session.user.id,'1');}catch{}
      event.currentTarget.reset();
      setView('home');
      return '✅ Cuenta recuperada. Ahora pulsa RECUPERAR PARTIDA DE LA NUBE; no guardes la partida local anterior.';
    });
  });
  root.querySelector('[data-action="export-local"]').addEventListener('click',()=>run(async()=>{
    const result=await downloadPortableSave(exportLocalProgressJson());
    return downloadNotice(result,'partida local');
  }));
  root.querySelector('[data-action="export-cloud"]').addEventListener('click',()=>run(async()=>{
    const result=await downloadPortableSave(await exportCloudProgressJson(),'top-down-race-nube.json');
    return downloadNotice(result,'copia de la nube');
  }));
  run(()=>refresh().then(()=>'')); 
}
