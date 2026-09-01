import { SettingsScene as CurrentSettingsScene } from './SettingsAudioMusicScene.js';
import { getLanguage } from '../i18n/index.js';
import { resetFirstVisitTutorials, showFirstVisitTutorial } from '../ui/FirstVisitTutorial.js';

const STORAGE_KEY='tdr2:settings';
const RESET_KEEP_EXACT=new Set([
  STORAGE_KEY,
  'tdr2:admin',
  'tdr2:devFullCarAccess:v1',
  'tdr2:devFullTrackAccess:v1',
  'tdr2:survivalAiMode',
  'tdr2:survivalAiDebug',
  'tdr2_dev_tuning_v1'
]);
const RESET_KEEP_PREFIX=['tdr2:dev','tdr2_dev_'];

const PRESETS=Object.freeze({
  performance:Object.freeze({quality:'low',targetFps:30,antialias:false,particles:false,surfaceResolution:'1k',lighting:false,es:'Prioriza estabilidad, temperatura y batería. Ideal para móviles modestos o sesiones largas.',en:'Prioritizes stability, thermals and battery life. Ideal for modest phones or long sessions.'}),
  medium:Object.freeze({quality:'medium',targetFps:45,antialias:true,particles:false,surfaceResolution:'1k',lighting:true,es:'Equilibrio entre fluidez y detalle. La opción segura para la mayoría de dispositivos.',en:'Balanced smoothness and detail. The safe choice for most devices.'}),
  high:Object.freeze({quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'2k',lighting:true,es:'Prioriza detalle visual manteniendo un objetivo de 60 FPS en dispositivos potentes.',en:'Prioritizes visual detail while targeting 60 FPS on powerful devices.'}),
  ultra:Object.freeze({quality:'high',targetFps:60,antialias:true,particles:true,surfaceResolution:'4k',lighting:true,ultra:true,es:'Máxima calidad disponible. El juego adapta automáticamente la resolución de materiales al dispositivo para evitar sobrecargar la memoria.',en:'Maximum available quality. Material resolution adapts automatically to the device to avoid excessive memory pressure.'})
});
function save(settings){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(settings));}catch{}}
function persistVideo(settings,video){try{const current=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');const next={...current,video:{...(current.video||{}),...(video||{})}};localStorage.setItem(STORAGE_KEY,JSON.stringify(next));if(settings)settings.video={...(settings.video||{}),...(video||{})};}catch{if(settings)settings.video={...(settings.video||{}),...(video||{})};save(settings);}}
function inferPreset(video){const explicit=String(video?.preset||'').toLowerCase();if(PRESETS[explicit])return explicit;const q=String(video?.quality||'high').toLowerCase();if(q==='low')return'performance';if(q==='medium')return'medium';return'high';}
function appliedVideoFor(preset,showFPS,showMasteryBadge){const cfg=PRESETS[preset]||PRESETS.high;return{...cfg,preset,showFPS:!!showFPS,showMasteryBadge:showMasteryBadge!==false};}
function shouldKeepOnProgressReset(key){return RESET_KEEP_EXACT.has(key)||RESET_KEEP_PREFIX.some(prefix=>key.startsWith(prefix));}
function resetProgressStorage(){
  try{
    const keys=[];for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key)keys.push(key);}
    for(const key of keys){if((key.startsWith('tdr2:')||key.startsWith('tdr2_'))&&!shouldKeepOnProgressReset(key))localStorage.removeItem(key);}
  }catch{}
  try{sessionStorage.clear();}catch{}
}
function deleteIndexedDb(name){return new Promise(resolve=>{try{if(typeof indexedDB==='undefined')return resolve();const req=indexedDB.deleteDatabase(name);req.onsuccess=req.onerror=req.onblocked=()=>resolve();}catch{resolve();}});}
async function deleteAccountStorage(){
  try{localStorage.clear();}catch{}
  try{sessionStorage.clear();}catch{}
  await deleteIndexedDb('tdr2_track_previews');
}

export class SettingsScene extends CurrentSettingsScene {
  _mount(){
    super._mount();if(!this.root)return;
    this._installAccountStyles();
    const tabs=this.root.querySelector('.s2tabs');
    if(tabs&&!tabs.querySelector('[data-tab="account"]')){
      const b=document.createElement('button');b.className='s2tab';b.dataset.tab='account';b.textContent=getLanguage()==='en'?'ACCOUNT':'CUENTA';b.onclick=()=>this._renderTab('account');tabs.appendChild(b);
    }
    showFirstVisitTutorial('settings',{delay:260});
  }
  _unmount(){
    super._unmount();document.getElementById('tdr-account-settings-style')?.remove?.();document.querySelector('.tdr-account-confirm')?.remove?.();
  }
  _installAccountStyles(){
    if(document.getElementById('tdr-account-settings-style'))return;
    const style=document.createElement('style');style.id='tdr-account-settings-style';style.textContent=`
#tdr-settings2 .s2danger{border-color:rgba(255,92,92,.36)!important;background:linear-gradient(145deg,rgba(84,14,14,.34),rgba(22,8,8,.72))!important}
#tdr-settings2 .s2danger .s2label{color:#ff8a8a!important}
#tdr-settings2 .s2danger-btn{min-height:38px;padding:0 18px;border:1px solid #ff6767;border-radius:8px;background:#641c1c;color:#fff;font-weight:1000;letter-spacing:.06em;cursor:pointer}
#tdr-settings2 .s2danger-btn.soft{border-color:#e18d52;background:#512d18}
#tdr-settings2 .s2tutorial-btn{min-height:38px;padding:0 18px;border:1px solid #45dfff;border-radius:8px;background:#123c4d;color:#fff;font-weight:1000;letter-spacing:.06em;cursor:pointer}
#tdr-settings2 .s2tutorial-note{margin-left:10px;color:#6ff0b4;font-size:9px;font-weight:900;letter-spacing:.04em}
.tdr-account-confirm{position:fixed;inset:0;z-index:40000;display:grid;place-items:center;padding:max(16px,var(--tdr-safe-top,8px)) max(16px,var(--tdr-safe-right,10px)) max(16px,var(--tdr-safe-bottom,8px)) max(16px,var(--tdr-safe-left,10px));background:rgba(0,0,0,.78);backdrop-filter:blur(8px)}
.tdr-account-confirm .panel{width:min(560px,94vw);border:1px solid rgba(255,92,92,.7);border-radius:14px;background:linear-gradient(180deg,#211013,#0d0a0b);box-shadow:0 22px 70px rgba(0,0,0,.65);padding:20px;color:#fff;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.tdr-account-confirm .eyebrow{font-size:10px;font-weight:1000;letter-spacing:.14em;color:#ff7777}.tdr-account-confirm h2{margin:7px 0 8px;font-size:25px}.tdr-account-confirm p{margin:0;color:#d6c7c9;font-size:13px;line-height:1.45}.tdr-account-confirm .actions{display:flex;justify-content:flex-end;gap:9px;margin-top:18px;flex-wrap:wrap}.tdr-account-confirm button{min-height:40px;padding:0 16px;border-radius:8px;font-weight:1000;letter-spacing:.05em}.tdr-account-confirm .cancel{border:1px solid #65717a;background:#182029;color:#fff}.tdr-account-confirm .confirm{border:1px solid #ff6868;background:#811e24;color:#fff}
`;
    document.head.appendChild(style);
  }
  _showDestructiveConfirm(kind){
    document.querySelector('.tdr-account-confirm')?.remove?.();
    const en=getLanguage()==='en',isDelete=kind==='delete';
    const root=document.createElement('div');root.className='tdr-account-confirm';
    root.innerHTML=`<div class="panel" role="dialog" aria-modal="true"><div class="eyebrow">${en?'IRREVERSIBLE ACTION':'ACCIÓN IRREVERSIBLE'}</div><h2>${isDelete?(en?'DELETE ACCOUNT':'ELIMINAR CUENTA'):(en?'RESET PROGRESS':'RESETEAR PROGRESO')}</h2><p>${isDelete?(en?'This will permanently delete all local data associated with this game profile on this device. This action cannot be undone and the data cannot be recovered.':'Se eliminarán permanentemente todos los datos locales asociados a este perfil del juego en este dispositivo. Esta acción no se puede deshacer y los datos no se podrán recuperar.'):(en?'All game progress will be permanently deleted: cars, parts, inventory, coins, statistics, records, mastery, unlocks and season progress. Your settings will be kept. This action cannot be undone and the progress cannot be recovered.':'Se eliminará permanentemente todo el progreso del juego: coches, piezas, inventario, monedas, estadísticas, récords, maestría, desbloqueos y temporadas. Tus ajustes se conservarán. Esta acción no se puede deshacer y el progreso no se podrá recuperar.')}</p><div class="actions"><button class="cancel" type="button">${en?'CANCEL':'CANCELAR'}</button><button class="confirm" type="button">${isDelete?(en?'DELETE PERMANENTLY':'ELIMINAR DEFINITIVAMENTE'):(en?'RESET PERMANENTLY':'RESETEAR DEFINITIVAMENTE')}</button></div></div>`;
    document.body.appendChild(root);
    root.querySelector('.cancel')?.addEventListener('click',()=>root.remove());
    root.addEventListener('click',e=>{if(e.target===root)root.remove();});
    root.querySelector('.confirm')?.addEventListener('click',async()=>{
      const confirm=root.querySelector('.confirm');if(confirm){confirm.disabled=true;confirm.textContent=en?'DELETING…':'ELIMINANDO…';}
      if(isDelete)await deleteAccountStorage();else resetProgressStorage();
      root.remove();window.setTimeout(()=>window.location.reload(),120);
    });
  }
  _renderAccountTab(){
    if(!this.root)return;const en=getLanguage()==='en';
    this.root.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('on',b.dataset.tab==='account'));
    const body=this.root.querySelector('.s2body');if(!body)return;
    body.innerHTML=`<div class="s2grid">
      <section class="s2card wide"><div class="s2label">${en?'ACCOUNT & DATA':'CUENTA Y DATOS'}</div><div class="s2desc">${en?'Manage your saved progress on this device. Destructive actions always require confirmation.':'Gestiona el progreso guardado en este dispositivo. Las acciones destructivas siempre requieren confirmación.'}</div></section>
      <section class="s2card wide"><div class="s2label">${en?'MINI TUTORIALS':'MINI TUTORIALES'}</div><div class="s2desc">${en?'Each main section explains itself once on your first visit. Reset only those introductions without changing any game progress.':'Cada sección principal se explica una sola vez en tu primera visita. Puedes reiniciar únicamente esas introducciones sin alterar ningún progreso del juego.'}</div><div class="s2row"><button type="button" class="s2tutorial-btn" data-reset-tutorial>${en?'RESET TUTORIAL':'REINICIAR TUTORIAL'}</button><span class="s2tutorial-note" data-tutorial-note></span></div></section>
      <section class="s2card s2danger"><div class="s2label">${en?'RESET PROGRESS':'RESETEAR PROGRESO'}</div><div class="s2desc">${en?'Starts the game again from zero while keeping your controls, language, audio and graphics preferences.':'Empieza el juego de nuevo desde cero conservando tus controles, idioma, audio y preferencias gráficas.'}</div><div class="s2row"><button type="button" class="s2danger-btn soft" data-reset-progress>${en?'RESET PROGRESS':'RESETEAR PROGRESO'}</button></div></section>
      <section class="s2card s2danger"><div class="s2label">${en?'DELETE ACCOUNT':'ELIMINAR CUENTA'}</div><div class="s2desc">${en?'Deletes all local data associated with this game profile on this device, including settings. There is no recovery.':'Elimina todos los datos locales asociados a este perfil del juego en este dispositivo, incluidos los ajustes. No existe recuperación.'}</div><div class="s2row"><button type="button" class="s2danger-btn" data-delete-account>${en?'DELETE ACCOUNT':'ELIMINAR CUENTA'}</button></div></section>
    </div>`;
    body.querySelector('[data-reset-tutorial]')?.addEventListener('click',()=>{
      resetFirstVisitTutorials();
      const note=body.querySelector('[data-tutorial-note]');if(note)note.textContent=en?'READY · VISIT EACH SECTION AGAIN':'LISTO · VUELVE A VISITAR CADA SECCIÓN';
    });
    body.querySelector('[data-reset-progress]')?.addEventListener('click',()=>this._showDestructiveConfirm('reset'));
    body.querySelector('[data-delete-account]')?.addEventListener('click',()=>this._showDestructiveConfirm('delete'));
  }
  _renderTab(tab){
    if(tab==='account'){this._renderAccountTab();return;}
    super._renderTab(tab);if(tab!=='video'||!this.root)return;
    const body=this.root.querySelector('.s2body');if(!body)return;
    const v=this.settings.video||(this.settings.video={});const en=getLanguage()==='en';
    let selected=inferPreset(v),showFPS=!!v.showFPS,showMasteryBadge=typeof v.showMasteryBadge==='boolean'?v.showMasteryBadge:true;
    const labels={performance:en?'PERFORMANCE':'RENDIMIENTO',medium:en?'MEDIUM':'MEDIO',high:en?'HIGH QUALITY':'ALTA CALIDAD',ultra:'ULTRA'};
    const render=()=>{const cfg=PRESETS[selected];body.innerHTML=`<div class="s2grid">
      <section class="s2card wide"><div class="s2label">${en?'GRAPHICS QUALITY':'CALIDAD GRÁFICA'}</div><div class="s2desc">${en?'Choose one mode. The game handles all technical graphics settings automatically.':'Elige un modo. El juego se encarga automáticamente de todos los ajustes técnicos.'}</div><div class="s2row" data-preset-row>${Object.keys(PRESETS).map(key=>`<button type="button" class="s2choice ${selected===key?'on':''}" data-preset="${key}">${labels[key]}</button>`).join('')}</div></section>
      <section class="s2card wide"><div class="s2label">${labels[selected]}</div><div class="s2desc">${en?cfg.en:cfg.es}</div></section>
      <section class="s2card"><div class="s2label">${en?'PERFORMANCE HUD':'HUD DE RENDIMIENTO'}</div><div class="s2desc">${en?'Diagnostic FPS and timings. It does not change graphics quality.':'FPS y tiempos de diagnóstico. No cambia la calidad gráfica.'}</div><div class="s2row"><button type="button" class="s2choice ${showFPS?'on':''}" data-fps-hud>${showFPS?'ON':'OFF'}</button></div></section>
      <section class="s2card"><div class="s2label">${en?'CAR MASTERY BADGE':'INSIGNIA DE MAESTRÍA'}</div><div class="s2desc">${en?'Shows the mastery badge on the car roof. Hiding it never removes your progress.':'Muestra la insignia de maestría sobre el techo del coche. Ocultarla nunca borra tu progreso.'}</div><div class="s2row"><button type="button" class="s2choice ${showMasteryBadge?'on':''}" data-mastery-badge>${showMasteryBadge?'ON':'OFF'}</button></div></section>
      <section class="s2card wide"><div class="s2row" style="justify-content:flex-end"><button type="button" class="s2apply" data-apply-video>${en?'APPLY':'APLICAR'}</button></div><div class="s2desc">${en?'The game reloads once so these settings are applied everywhere.':'El juego se reinicia una sola vez para aplicar estos ajustes en todas las pantallas.'}</div></section>
    </div>`;
      body.querySelectorAll('button[data-preset]').forEach(btn=>btn.onclick=e=>{e.stopPropagation();selected=String(btn.dataset.preset);render();});
      body.querySelector('[data-fps-hud]')?.addEventListener('click',e=>{e.stopPropagation();showFPS=!showFPS;render();});
      body.querySelector('[data-mastery-badge]')?.addEventListener('click',e=>{e.stopPropagation();showMasteryBadge=!showMasteryBadge;render();});
      body.querySelector('[data-apply-video]')?.addEventListener('click',e=>{e.stopPropagation();persistVideo(this.settings,appliedVideoFor(selected,showFPS,showMasteryBadge));const apply=body.querySelector('[data-apply-video]');if(apply){apply.disabled=true;apply.textContent=en?'APPLYING…':'APLICANDO…';}window.setTimeout(()=>window.location.reload(),220);});
    };render();
  }
}
