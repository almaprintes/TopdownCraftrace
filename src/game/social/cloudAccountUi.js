import {
  currentRaceControlAccount,requestRaceControlEmailLink,
  verifyRaceControlEmailCode,setRaceControlPassword,
  switchRaceControlAccount
} from '../online/raceControlOnline.js';
import {
  cloudBackupStatus,createFirstCloudBackup,updateCloudBackup,readCloudBackup,
  restoreCloudBackup,inspectLocalProgress,exportLocalProgressJson,
  exportCloudProgressJson,downloadPortableSave,shortPlayerId
} from './cloudProgress.js';

const ID='tdr-cloud-account-modal';
const html="<div class=\"tdr-cloud-panel\" role=\"dialog\" aria-modal=\"true\" aria-label=\"Mi cuenta\">\n<header class=\"tdr-cloud-head\"><div><small>TOP DOWN RACE</small><h2>MI CUENTA</h2></div><button type=\"button\" data-action=\"close\" aria-label=\"Cerrar\">✕</button></header>\n<div class=\"tdr-cloud-message\" data-cloud-message role=\"status\" aria-live=\"polite\"></div>\n<section data-stage=\"home\">\n  <div class=\"tdr-cloud-driver\"><span class=\"tdr-cloud-avatar\" aria-hidden=\"true\">🏁</span><div><strong data-cloud-pilot>MI PILOTO</strong><small>PERFIL DE JUGADOR</small></div></div>\n  <div class=\"tdr-cloud-state\" data-cloud-state><span data-cloud-icon aria-hidden=\"true\">☁</span><div><strong data-cloud-title>Comprobando tu partida…</strong><p data-cloud-description>Un momento, por favor.</p></div></div>\n  <div class=\"tdr-cloud-main-actions\">\n    <button type=\"button\" data-action=\"protect\" class=\"tdr-cloud-primary\" hidden>PROTEGER MI PARTIDA</button>\n    <button type=\"button\" data-action=\"backup\" class=\"tdr-cloud-primary\" hidden>GUARDAR MI PARTIDA</button>\n    <button type=\"button\" data-action=\"restore\" class=\"tdr-cloud-primary\" hidden>RECUPERAR MI PARTIDA</button>\n    <button type=\"button\" data-action=\"login-open\" hidden>YA TENÍA UNA PARTIDA</button>\n  </div><p class=\"tdr-cloud-tip\" data-cloud-tip>Puedes jugar sin registrarte.</p>\n</section>\n<section data-stage=\"link\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Protege tu partida</h3><p>Solo necesitamos tu correo. Te enviaremos un código.</p><form data-form=\"link\"><label>TU CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required placeholder=\"tucorreo@ejemplo.com\"></label><button type=\"submit\">ENVIAR CÓDIGO</button></form><p class=\"tdr-cloud-tip\">Si eres menor, pide ayuda a una persona adulta.</p></section>\n<section data-stage=\"verify\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Revisa tu correo</h3><p>Introduce las seis cifras del mensaje. Revisa también spam.</p><form data-form=\"verify\"><label>CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required placeholder=\"tucorreo@ejemplo.com\"></label><label>CÓDIGO DE 6 CIFRAS<input type=\"text\" name=\"code\" required inputmode=\"numeric\" pattern=\"[0-9]{6}\" maxlength=\"6\" autocomplete=\"one-time-code\" placeholder=\"000000\"></label><button type=\"submit\">COMPROBAR CÓDIGO</button></form></section>\n<section data-stage=\"password\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Un último paso</h3><p>Por ahora necesitas una contraseña para recuperar tu partida en otro móvil.</p><form data-form=\"password\"><label>CONTRASEÑA (MÍNIMO 10 CARACTERES)<input type=\"password\" name=\"password\" required minlength=\"10\" maxlength=\"128\" autocomplete=\"new-password\"></label><button type=\"submit\">TERMINAR Y GUARDAR</button></form></section>\n<section data-stage=\"login\" class=\"tdr-cloud-step\" hidden><button type=\"button\" data-action=\"back\" class=\"tdr-cloud-back\">← VOLVER</button><h3>Recuperar mi partida</h3><p>Usa el correo y la contraseña con los que protegiste tu partida.</p><form data-form=\"login\"><label>MI CORREO<input type=\"email\" name=\"email\" autocomplete=\"email\" required></label><label>CONTRASEÑA<input type=\"password\" name=\"password\" autocomplete=\"current-password\" required></label><button type=\"submit\">ENTRAR CON MI CUENTA</button></form><p class=\"tdr-cloud-tip\">No se borrarán los datos del móvil sin pedirte permiso.</p></section>\n<details class=\"tdr-cloud-advanced\" data-advanced><summary>OPCIONES AVANZADAS</summary><p>Herramientas de pruebas y copias manuales. No las necesitas para jugar.</p>\n<div class=\"tdr-cloud-advanced-buttons\"><button type=\"button\" data-action=\"backup-manual\">GUARDAR COPIA MANUAL</button><button type=\"button\" data-action=\"restore-manual\">RECUPERAR PARTIDA DE LA NUBE</button><button type=\"button\" data-action=\"change-account\">CAMBIAR DE CUENTA</button><button type=\"button\" data-action=\"export-local\">EXPORTAR PARTIDA LOCAL (JSON)</button><button type=\"button\" data-action=\"export-cloud\">EXPORTAR COPIA DE LA NUBE (JSON)</button></div>\n<p class=\"tdr-cloud-tip\">Las grabaciones locales no se incluyen. No desinstales hasta comprobar tu recuperación.</p></details></div>";
const css="#tdr-cloud-account-modal{position:fixed;inset:0;z-index:2147483647;padding:max(10px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));box-sizing:border-box;background:#020710ed;display:flex;justify-content:center;align-items:center;color:#eef5ff;font:14px/1.4 system-ui,-apple-system,sans-serif}\n#tdr-cloud-account-modal *{box-sizing:border-box}#tdr-cloud-account-modal [hidden]{display:none!important}\n#tdr-cloud-account-modal .tdr-cloud-panel{width:min(620px,100%);max-height:100%;overflow:auto;border:1px solid #31506b;border-radius:14px;padding:clamp(12px,2vw,22px);background:linear-gradient(145deg,#14283e,#060f1e);box-shadow:0 20px 65px #000b}\n#tdr-cloud-account-modal .tdr-cloud-head{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px}\n#tdr-cloud-account-modal .tdr-cloud-head small{font:850 9px system-ui;letter-spacing:.16em;color:#97b0c7}\n#tdr-cloud-account-modal h2{font:950 clamp(19px,3vw,27px) system-ui;margin:2px 0}\n#tdr-cloud-account-modal h3{font:950 clamp(19px,3vw,26px) system-ui;margin:10px 0}\n#tdr-cloud-account-modal button{min-height:44px;padding:9px 14px;border:1px solid #4e6983;border-radius:9px;background:#18314b;color:#e6f0ff;font:850 12px system-ui;cursor:pointer;touch-action:manipulation}\n#tdr-cloud-account-modal button:focus-visible,#tdr-cloud-account-modal summary:focus-visible,#tdr-cloud-account-modal input:focus-visible{outline:3px solid #ffc050;outline-offset:2px}\n#tdr-cloud-account-modal button:disabled{opacity:.45;cursor:wait}\n#tdr-cloud-account-modal .tdr-cloud-head button{font-size:21px;border:0;background:transparent;min-width:44px}\n#tdr-cloud-account-modal .tdr-cloud-driver{display:flex;align-items:center;gap:13px;margin-bottom:13px}\n#tdr-cloud-account-modal .tdr-cloud-avatar{display:grid;place-items:center;width:51px;height:51px;font-size:25px;background:#243e59;border-radius:11px}\n#tdr-cloud-account-modal .tdr-cloud-driver strong{display:block;font:950 clamp(16px,2.6vw,22px) system-ui;overflow-wrap:anywhere}\n#tdr-cloud-account-modal .tdr-cloud-driver small{color:#9cafc3;font-size:10px;letter-spacing:.1em}\n#tdr-cloud-account-modal .tdr-cloud-state{border:1px solid #37526b;border-radius:13px;padding:16px;background:#0c1c30;display:flex;align-items:flex-start;gap:13px}\n#tdr-cloud-account-modal .tdr-cloud-state[data-state=\"protected\"]{border-color:#298c68;background:#0e2a2b}\n#tdr-cloud-account-modal .tdr-cloud-state[data-state=\"pending\"]{border-color:#ab7a36}\n#tdr-cloud-account-modal [data-cloud-icon]{font-size:25px;line-height:1}\n#tdr-cloud-account-modal [data-cloud-title]{display:block;font-size:clamp(15px,2.4vw,19px);font-weight:900;line-height:1.2}\n#tdr-cloud-account-modal p{font-size:13px;line-height:1.45;color:#b4c5d5;margin:7px 0 11px}\n#tdr-cloud-account-modal .tdr-cloud-main-actions{display:grid;gap:10px;margin-top:14px}\n#tdr-cloud-account-modal button.tdr-cloud-primary{background:linear-gradient(#ffbd42,#f4a21a);border-color:#ffd071;color:#172235;min-height:48px;font-size:14px;box-shadow:0 3px 0 #74450b}\n#tdr-cloud-account-modal .tdr-cloud-tip{font-size:11px;color:#93a9bb;text-align:center;margin:10px 0 3px}\n#tdr-cloud-account-modal .tdr-cloud-message{font-size:12px;white-space:pre-wrap;overflow-wrap:anywhere;color:#87e7b2;margin-bottom:8px}\n#tdr-cloud-account-modal .tdr-cloud-message:empty{display:none}\n#tdr-cloud-account-modal .tdr-cloud-back{background:transparent;border:0;color:#c0d6e5}\n#tdr-cloud-account-modal .tdr-cloud-step form{display:grid;gap:9px;margin:15px 0}\n#tdr-cloud-account-modal .tdr-cloud-step label{display:grid;gap:6px;font-size:11px;font-weight:850;color:#cfdeea}\n#tdr-cloud-account-modal .tdr-cloud-step input{width:100%;height:46px;font:16px system-ui;background:#071626;color:white;border:1px solid #52718c;border-radius:8px;padding:0 12px}\n#tdr-cloud-account-modal .tdr-cloud-advanced{border-top:1px solid #27455d;margin-top:18px;padding-top:10px}\n#tdr-cloud-account-modal .tdr-cloud-advanced summary{cursor:pointer;min-height:44px;padding:12px 4px;font-size:11px;font-weight:850;color:#aabfce;letter-spacing:.08em}\n#tdr-cloud-account-modal .tdr-cloud-advanced-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin-top:10px}\n#tdr-cloud-account-modal .tdr-cloud-advanced-buttons button{font-size:10px;overflow-wrap:anywhere}\n#tdr-cloud-account-modal[data-inline=\"1\"]{position:static;inset:auto;z-index:auto;display:block;padding:0;background:transparent;width:100%}\n#tdr-cloud-account-modal[data-inline=\"1\"] .tdr-cloud-panel{width:100%;max-height:none;overflow:visible;border:0;box-shadow:none;background:transparent;padding:0}\n#tdr-cloud-account-modal[data-inline=\"1\"] .tdr-cloud-head [data-action=\"close\"]{display:none}\n@media(max-height:480px){#tdr-cloud-account-modal .tdr-cloud-avatar{width:43px;height:43px}#tdr-cloud-account-modal .tdr-cloud-state{padding:11px}#tdr-cloud-account-modal .tdr-cloud-driver{margin-bottom:7px}#tdr-cloud-account-modal .tdr-cloud-advanced{margin-top:8px}}\n@media(max-width:450px){#tdr-cloud-account-modal .tdr-cloud-advanced-buttons{grid-template-columns:1fr}}";

const extract=(form,key)=>String(new FormData(form).get(key)||'').trim();
const dateText=value=>{
  if(!value)return '—';
  const date=new Date(value);
  return Number.isFinite(date.valueOf())?date.toLocaleString('es-ES'):String(value);
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
  document.head.appendChild(style);
  (host||document.body).appendChild(root);
  const state=root.querySelector('[data-cloud-state]');
  const notice=root.querySelector('[data-cloud-message]');
  const setNotice=(message,good=true)=>{notice.textContent=String(message||'');notice.style.color=good?'#adffcc':'#ffaaa9';};
  let busy=false,account=null,backup=null;
  const setView=stage=>{
    for(const section of root.querySelectorAll('[data-stage]'))section.hidden=section.dataset.stage!==stage;
    root.querySelector('[data-advanced]').hidden=stage!=='home';
    if(stage==='home')root.querySelector('[data-advanced]').open=false;
    setNotice('');
  };
  const refresh=async()=>{
    [account,backup]=await Promise.all([currentRaceControlAccount(),cloudBackupStatus()]);
    if(account.id!==backup.id)throw new Error('La cuenta y la copia tienen identidades distintas.');
    const local=inspectLocalProgress();
    let pending=null;try{pending=localStorage.getItem('tdr2:cloudLoginPendingRestore:v1');}catch{}
    let checked=false;try{checked=localStorage.getItem('tdr2:cloudRecoveryChecked:'+account.id)==='1';}catch{}
    const linked=!account.anonymous&&account.emailConfirmed;
    const title=root.querySelector('[data-cloud-title]'),desc=root.querySelector('[data-cloud-description]'),tip=root.querySelector('[data-cloud-tip]'),icon=root.querySelector('[data-cloud-icon]');
    root.querySelector('[data-cloud-pilot]').textContent=local.pilotName||'MI PILOTO';
    for(const key of ['protect','backup','restore','login-open'])root.querySelector('[data-action="'+key+'"]').hidden=true;
    const show=(key,label)=>{const b=root.querySelector('[data-action="'+key+'"]');b.hidden=false;if(label)b.textContent=label;};
    if(pending){
      state.dataset.state='pending';icon.textContent='↪';
      title.textContent=backup.existing?'¡Encontramos tu partida!':'Cuenta conectada';
      desc.textContent=backup.existing?'Recupérala para tener tus coches y avances aquí.':'No encontramos una copia en esta cuenta. Tus datos locales siguen intactos.';
      if(backup.existing)show('restore','RECUPERAR MI PARTIDA');
      tip.textContent='No sobrescribiremos la nube sin tu permiso.';
    }else if(!linked){
      state.dataset.state='local';icon.textContent='☁';
      title.textContent='Tu partida está en este móvil';
      desc.textContent=backup.existing?'Hay una copia en la nube, pero debes proteger tu cuenta para recuperarla al cambiar de dispositivo.':'Puedes jugar sin registrarte. Protege la partida para poder recuperarla en otro móvil.';
      show('protect',account.pendingEmail?'TERMINAR VERIFICACIÓN':'PROTEGER MI PARTIDA');
      show('login-open','YA TENÍA UNA PARTIDA');
      tip.textContent='Puedes seguir jugando sin registrarte.';
    }else{
      state.dataset.state=checked&&backup.existing?'protected':'pending';
      icon.textContent=checked&&backup.existing?'✅':'☁';
      title.textContent=checked&&backup.existing?'Tu partida tiene una copia protegida':backup.existing?'Tu partida está en la nube':'Tu correo está verificado';
      desc.textContent=backup.existing?'Última copia: '+dateText(backup.updatedAt)+'. El guardado automático está en preparación.':'Todavía falta guardar tu partida en la nube.';
      show('backup',backup.existing?'ACTUALIZAR MI COPIA':'GUARDAR MI PARTIDA');
      if(backup.existing)show('restore','RECUPERAR UNA COPIA');
      if(!checked)show('protect','TERMINAR DE PROTEGER');
      tip.textContent='Antes de cambiar de móvil, comprueba la contraseña y tu copia.';
    }
    root.querySelector('[data-action="backup"]').disabled=!!pending||!local.meaningful;
    root.querySelector('[data-action="restore"]').disabled=!backup.existing;
    root.querySelector('[data-action="backup-manual"]').disabled=!!pending||!local.meaningful;
    root.querySelector('[data-action="restore-manual"]').disabled=!backup.existing;
    root.querySelector('[data-action="export-cloud"]').disabled=!backup.existing;
    const verifyEmail=root.querySelector('[data-form="verify"] input[name="email"]');
    if(verifyEmail&&!verifyEmail.value)verifyEmail.value=account.pendingEmail||account.email||'';
  };
  const run=async(task,{reload=false}={})=>{
    if(busy)return;
    busy=true;
    for(const b of root.querySelectorAll('button'))b.disabled=true;
    setNotice('Trabajando…');
    try{
      const message=await task();
      setNotice(message||'Operación terminada.');
      if(reload){window.location.reload();return;}
    }catch(error){
      setNotice(String(error?.message||error),false);
    }finally{
      busy=false;
      if(root.isConnected){
        for(const b of root.querySelectorAll('button'))b.disabled=false;
        try{await refresh();}catch(error){setNotice('No se pudo comprobar la cuenta: '+String(error?.message||error),false);}
      }
    }
  };
  root.querySelector('[data-action="close"]').addEventListener('click',()=>{if(busy)return;root.remove();style.remove();});
  root.querySelectorAll('[data-action="back"]').forEach(b=>b.addEventListener('click',()=>setView('home')));
  root.querySelector('[data-action="protect"]').addEventListener('click',()=>setView(account.emailConfirmed?'password':account.pendingEmail?'verify':'link'));
  root.querySelector('[data-action="login-open"]').addEventListener('click',()=>setView('login'));
  root.querySelector('[data-action="change-account"]').addEventListener('click',()=>setView('login'));
  root.querySelector('[data-action="backup-manual"]').addEventListener('click',()=>root.querySelector('[data-action="backup"]').click());
  root.querySelector('[data-action="restore-manual"]').addEventListener('click',()=>root.querySelector('[data-action="restore"]').click());
  root.querySelector('[data-action="backup"]').addEventListener('click',()=>run(async()=>{
    const status=await cloudBackupStatus();
    const local=inspectLocalProgress();
    if(!local.meaningful)throw new Error('No hay progreso local suficiente para guardar.');
    const action=status.existing?'ACTUALIZAR':'CREAR';
    if(!window.confirm(action+' COPIA EN LA NUBE\n\n'+
      local.keys+' bloques · '+(local.pilotName||'Piloto sin nombre')+
      '\nJugador: '+status.id+
      (status.existing?'\nÚltima copia: '+dateText(status.updatedAt):'')+
      '\n\n¿Confirmas que estos son los datos que quieres guardar?'))return 'Copia cancelada.';
    const result=status.existing
      ?await updateCloudBackup(status.revision)
      :await createFirstCloudBackup();
    return '✅ COPIA VERIFICADA · REV '+result.revision+' · '+result.keys+
      ' bloques. Vincula tu correo antes de desinstalar.';
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
    if(!window.confirm(warning))return 'Restauración cancelada. No se cambió nada.';
    const result=await restoreCloudBackup();
    if(!window.confirm('✅ Recuperación completada: '+result.restoredKeys+
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
      if(!window.confirm('ENTRAR CON '+email+'\n\nSe cambiará la identidad online. La partida LOCAL NO se borrará ni fusionará. Después tendrás que pulsar RECUPERAR PARTIDA. ¿Continuar?'))
        return 'Inicio de sesión cancelado.';
      const session=await switchRaceControlAccount(email,password);
      try{localStorage.setItem('tdr2:cloudRecoveryChecked:'+session.user.id,'1');}catch{}
      event.currentTarget.reset();
      setView('home');
      return '✅ Cuenta recuperada. Ahora pulsa RECUPERAR PARTIDA DE LA NUBE; no guardes la partida local anterior.';
    });
  });
  root.querySelector('[data-action="export-local"]').addEventListener('click',()=>run(async()=>{
    downloadPortableSave(exportLocalProgressJson());
    return 'Exportación JSON iniciada. Si Android no la descarga, usa un navegador compatible.';
  }));
  root.querySelector('[data-action="export-cloud"]').addEventListener('click',()=>run(async()=>{
    downloadPortableSave(await exportCloudProgressJson(),'top-down-race-nube.json');
    return 'Exportación portátil de Supabase iniciada.';
  }));
  run(()=>refresh().then(()=>'')); 
}
