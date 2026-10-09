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
const html=`<div class="tdr-cloud-panel" role="dialog" aria-modal="true" aria-label="Cuenta de piloto">
  <header class="tdr-cloud-head"><div><small>TOP DOWN RACE · CLOUD GARAGE</small><h2>MI PILOTO · NUBE</h2></div><button type="button" data-action="close" aria-label="Cerrar">✕</button></header>
  <div class="tdr-cloud-summary" data-cloud-summary>Conectando con la nube…</div>
  <div class="tdr-cloud-message" data-cloud-message role="status" aria-live="polite"></div>
  <section class="tdr-cloud-section">
    <h3>1. COPIA DE SEGURIDAD</h3>
    <p>Guarda monedas, piezas, coches desbloqueados, kilómetros, progresión, récords y nombre de piloto. Los vídeos de vueltas almacenados en el móvil no se incluyen.</p>
    <div class="tdr-cloud-actions">
      <button data-action="backup" type="button" class="tdr-cloud-primary">GUARDAR PARTIDA EN LA NUBE</button>
      <button data-action="restore" type="button">RECUPERAR PARTIDA DE LA NUBE</button>
    </div>
    <p class="tdr-cloud-warning">⚠️ Recuperar sustituye tu progreso LOCAL, nunca la copia del servidor. Antes de desinstalar comprueba la copia y vincula una cuenta recuperable.</p>
  </section>
  <section class="tdr-cloud-section">
    <h3>2. PROTEGER MI CUENTA</h3>
    <p>Tu ID anónimo no basta para recuperar la partida al reinstalar. Asocia un correo verificado y contraseña conservando tu ID original.</p>
    <form data-form="link"><label>VINCULAR CORREO AL PILOTO ACTUAL<input type="email" name="email" autocomplete="email" required placeholder="tucorreo@ejemplo.com"></label><button type="submit">ENVIAR VERIFICACIÓN</button></form>
    <form data-form="verify"><label>CORREO DE VERIFICACIÓN<input type="email" name="email" autocomplete="email" required placeholder="tucorreo@ejemplo.com"></label><label>CÓDIGO DEL CORREO<input type="text" name="code" required inputmode="numeric" pattern="[0-9]{6}" maxlength="6" autocomplete="one-time-code" placeholder="000000"></label><button type="submit">VERIFICAR CORREO</button></form>
    <form data-form="password"><label>CREAR CONTRASEÑA (MÍNIMO 10 CARACTERES)<input type="password" name="password" required minlength="10" maxlength="128" autocomplete="new-password"></label><button type="submit">PROTEGER MI CUENTA</button></form>
  </section>
  <section class="tdr-cloud-section">
    <h3>3. RECUPERAR TRAS REINSTALAR</h3>
    <p>En una instalación nueva, usa el mismo correo y contraseña. La aplicación no sustituirá ningún archivo local hasta que pulses «Recuperar partida».</p>
    <form data-form="login"><label>MI CORREO<input type="email" name="email" autocomplete="email" required></label><label>CONTRASEÑA<input type="password" name="password" autocomplete="current-password" required></label><button type="submit">ENTRAR CON MI CUENTA</button></form>
  </section>
  <section class="tdr-cloud-section">
    <h3>4. COPIA PORTÁTIL · FUTURO SERVIDOR</h3>
    <p>El formato JSON de la partida es nuestro: independiente de Supabase y compatible con nuestro futuro servidor PostgreSQL.</p>
    <div class="tdr-cloud-actions"><button type="button" data-action="export-local">EXPORTAR PARTIDA LOCAL (JSON)</button><button type="button" data-action="export-cloud">EXPORTAR COPIA DE LA NUBE (JSON)</button></div>
  </section>
  <footer>La app pública no se modifica. Nunca compartas tu contraseña ni el código de verificación.</footer>
</div>`;
const css=`#${ID}{position:fixed;inset:0;z-index:2147483647;padding:max(12px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(12px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));box-sizing:border-box;background:#020811eb;display:flex;justify-content:center;align-items:center;color:#e7f8ff;font:12px/1.5 system-ui,-apple-system,sans-serif}
#${ID} .tdr-cloud-panel{width:min(900px,100%);max-height:100%;overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;border:1px solid #2d7794;background:linear-gradient(135deg,#112536,#050e16);box-shadow:0 25px 100px #000e;padding:clamp(14px,2.5vw,26px)}
#${ID} .tdr-cloud-head{display:flex;justify-content:space-between;gap:24px;align-items:flex-start;border-bottom:1px solid #284c62;padding-bottom:12px}#${ID} .tdr-cloud-head small{color:#59eaff;letter-spacing:.2em;font:900 9px system-ui}#${ID} h2{margin:4px 0;font:bold clamp(20px,2.8vw,30px) system-ui}#${ID} h3{font:bold 12px system-ui;letter-spacing:.1em;color:#68e7f8;margin:0 0 8px}
#${ID} .tdr-cloud-summary{font:700 11px system-ui;white-space:pre-wrap;padding:12px;background:#0a2030;margin:12px 0;border:1px solid #256079;overflow-wrap:anywhere}#${ID} .tdr-cloud-message{white-space:pre-wrap;min-height:17px;color:#a7ffcb;font-weight:700;margin-bottom:8px}
#${ID} .tdr-cloud-section{padding:16px 0;border-top:1px solid #203849}#${ID} p{color:#a8bcc8;margin:5px 0 12px}#${ID} .tdr-cloud-warning{color:#f9d890}
#${ID} .tdr-cloud-actions{display:flex;flex-wrap:wrap;gap:9px}#${ID} form{display:flex;flex-wrap:wrap;align-items:flex-end;gap:8px;padding:9px 0}
#${ID} label{font:bold 10px system-ui;color:#bcd5de;display:flex;flex:1 1 195px;flex-direction:column;gap:4px}
#${ID} input{min-width:0;width:100%;height:41px;box-sizing:border-box;background:#04131c;border:1px solid #3c6577;border-radius:6px;color:white;padding:0 10px;font:13px system-ui}
#${ID} button{min-height:41px;padding:8px 14px;border:1px solid #407a91;border-radius:6px;background:#122f3f;color:#f0fcff;cursor:pointer;font:800 10px system-ui;letter-spacing:.05em;touch-action:manipulation}
#${ID} button:hover{background:#1d4c62}#${ID} button:disabled{opacity:.45;cursor:wait}#${ID} button.tdr-cloud-primary{background:#086582;border-color:#50daf2}
#${ID} .tdr-cloud-head button{min-width:40px}#${ID} footer{padding-top:12px;color:#77929e;font-size:9px}`;

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
  root.innerHTML=html;
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
  const summary=root.querySelector('[data-cloud-summary]');
  const notice=root.querySelector('[data-cloud-message]');
  const setNotice=(message,good=true)=>{notice.textContent=String(message||'');notice.style.color=good?'#adffcc':'#ffaaa9';};
  let busy=false,account=null,backup=null;
  const refresh=async()=>{
    [account,backup]=await Promise.all([currentRaceControlAccount(),cloudBackupStatus()]);
    if(account.id!==backup.id)throw new Error('La cuenta y la copia tienen identidades distintas.');
    const local=inspectLocalProgress();
    let pending=null;try{pending=localStorage.getItem('tdr2:cloudLoginPendingRestore:v1');}catch{}
    const type=account.anonymous?'ANÓNIMA · NO RECUPERABLE':'CORREO '+(account.emailConfirmed?'VERIFICADO':'SIN VERIFICAR');
    summary.textContent='PILOTO '+shortPlayerId(account.id)+' · '+type+
      '\nID interno: '+account.id+
      (account.email?'\nCorreo: '+account.email:'')+
      (account.pendingEmail?'\nVerificación pendiente: '+account.pendingEmail:'')+
      '\nNube: '+(backup.existing?'REV '+backup.revision+' · '+dateText(backup.updatedAt):'SIN COPIA')+
      '\nLocal: '+local.keys+' bloques · '+(local.pilotName||'Sin nombre')+
      (pending?'\n⚠️ SESIÓN NUEVA: restaura antes de intentar subir datos':'');
    root.querySelector('[data-action="backup"]').disabled=!!pending;
    root.querySelector('[data-action="restore"]').disabled=!backup.existing;
    root.querySelector('[data-action="export-cloud"]').disabled=!backup.existing;
    root.querySelector('[data-form="password"]').style.display=account.emailConfirmed?'flex':'none';
    root.querySelector('[data-form="link"]').style.display=account.emailConfirmed?'none':'flex';
    root.querySelector('[data-form="verify"]').style.display=account.emailConfirmed?'none':'flex';
    const addr=account.pendingEmail||account.email;
    if(addr){
      for(const field of root.querySelectorAll('form[data-form="verify"] input[name="email"]'))
        if(!field.value)field.value=addr;
    }
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
      return '✅ Correo verificado. Ya puedes crear una contraseña para recuperar tu piloto.';
    });
  });
  root.querySelector('[data-form="password"]').addEventListener('submit',event=>{
    event.preventDefault();
    const password=String(new FormData(event.currentTarget).get('password')||'');
    run(async()=>{
      await setRaceControlPassword(password);
      event.currentTarget.reset();
      return '✅ Cuenta protegida. Conserva tu correo y contraseña en un lugar seguro.';
    });
  });
  root.querySelector('[data-form="login"]').addEventListener('submit',event=>{
    event.preventDefault();
    const email=extract(event.currentTarget,'email');
    const password=String(new FormData(event.currentTarget).get('password')||'');
    run(async()=>{
      if(!window.confirm('ENTRAR CON '+email+'\n\nSe cambiará la identidad online. La partida LOCAL NO se borrará ni fusionará. Después tendrás que pulsar RECUPERAR PARTIDA. ¿Continuar?'))
        return 'Inicio de sesión cancelado.';
      await switchRaceControlAccount(email,password);
      event.currentTarget.reset();
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
