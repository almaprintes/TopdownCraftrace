const KEY='tdr2:pilotProfile:v1';

const cleanName=value=>String(value??'').replace(/\s+/g,' ').trim().slice(0,16);

function randomId(){
  try{return crypto.randomUUID();}catch{}
  return `pilot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
}

export function getPilotProfile(){
  let raw=null;
  try{raw=JSON.parse(localStorage.getItem(KEY)||'null');}catch{}
  const id=String(raw?.id||'').trim()||randomId();
  const name=cleanName(raw?.name||'');
  const profile={version:1,id,name,createdAt:Number(raw?.createdAt)||Date.now(),updatedAt:Number(raw?.updatedAt)||Date.now()};
  if(!raw?.id){try{localStorage.setItem(KEY,JSON.stringify(profile));}catch{}}
  return profile;
}

export function setPilotName(value){
  const name=cleanName(value);
  if(name.length<3)throw new Error('El nombre de piloto debe tener entre 3 y 16 caracteres.');
  const current=getPilotProfile();
  const next={...current,name,updatedAt:Date.now()};
  localStorage.setItem(KEY,JSON.stringify(next));
  try{window.dispatchEvent(new CustomEvent('tdr:pilotprofile',{detail:next}));}catch{}
  return next;
}

function mountPrompt(){
  if(typeof document==='undefined'||document.querySelector('[data-tdr-pilot-prompt]'))return;
  const profile=getPilotProfile();
  if(profile.name)return;
  const root=document.createElement('div');
  root.dataset.tdrPilotPrompt='1';
  root.style.cssText='position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;padding:max(14px,env(safe-area-inset-top)) max(18px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(18px,env(safe-area-inset-left));box-sizing:border-box;background:rgba(2,8,14,.94);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff';
  root.innerHTML=`<div style="width:min(520px,92vw);box-sizing:border-box;padding:24px;border:1px solid rgba(85,234,255,.42);background:linear-gradient(145deg,#081b27,#030b12);box-shadow:0 24px 70px rgba(0,0,0,.55)">
    <div style="font-size:9px;font-weight:1000;letter-spacing:.18em;color:#62eaff">PERFIL DE PILOTO</div>
    <div style="margin-top:7px;font-size:clamp(24px,5vw,38px);line-height:1;font-weight:1000">¿CÓMO TE LLAMAMOS EN PISTA?</div>
    <div style="margin-top:11px;color:#9ab3c0;font-size:12px;line-height:1.45">Tu nombre de piloto viajará con los tiempos y repeticiones que compartas con otros testers.</div>
    <input data-pilot-name maxlength="16" autocomplete="nickname" autocapitalize="characters" spellcheck="false" placeholder="NOMBRE DE PILOTO" style="display:block;width:100%;height:48px;margin-top:18px;box-sizing:border-box;border:1px solid #3e7184;background:#06131d;color:#fff;padding:0 14px;font-size:18px;font-weight:900;letter-spacing:.05em;outline:none" />
    <div data-pilot-error style="min-height:18px;margin-top:7px;color:#ff8a93;font-size:10px;font-weight:800"></div>
    <button data-pilot-save type="button" style="width:100%;height:46px;border:1px solid #59eaff;background:#0d5265;color:#fff;font-size:13px;font-weight:1000;letter-spacing:.08em;touch-action:manipulation">GUARDAR NOMBRE DE PILOTO</button>
    <div style="margin-top:9px;text-align:center;color:#607b89;font-size:9px">3–16 caracteres · podrás cambiarlo más adelante</div>
  </div>`;
  document.body.appendChild(root);
  const input=root.querySelector('[data-pilot-name]'),error=root.querySelector('[data-pilot-error]'),save=root.querySelector('[data-pilot-save]');
  const submit=()=>{try{setPilotName(input?.value||'');root.remove();}catch(err){if(error)error.textContent=String(err?.message||'Nombre no válido');input?.focus?.();}};
  save?.addEventListener('pointerup',e=>{e.preventDefault();submit();});
  save?.addEventListener('click',submit);
  input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();submit();}});
  setTimeout(()=>input?.focus?.(),180);
}

function ensureSettingsStyle(){
  if(typeof document==='undefined'||document.getElementById('tdr-pilot-account-style'))return;
  const style=document.createElement('style');style.id='tdr-pilot-account-style';style.textContent=`
#tdr-settings2 [data-tdr-pilot-profile-settings] .tdr-pilot-name{min-width:180px;flex:1;height:40px;box-sizing:border-box;border:1px solid #3e7184;border-radius:8px;background:#06131d;color:#fff;padding:0 12px;font:900 14px system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:.05em;outline:none}
#tdr-settings2 [data-tdr-pilot-profile-settings] .tdr-pilot-name:focus{border-color:#59eaff;box-shadow:0 0 0 2px rgba(89,234,255,.12)}
#tdr-settings2 [data-tdr-pilot-profile-settings] .tdr-pilot-save{min-height:40px;padding:0 18px;border:1px solid #45dfff;border-radius:8px;background:#123c4d;color:#fff;font-weight:1000;letter-spacing:.06em;cursor:pointer;touch-action:manipulation}
#tdr-settings2 [data-tdr-pilot-profile-settings] .tdr-pilot-status{min-height:14px;margin-top:8px;color:#6ff0b4;font-size:9px;font-weight:900;letter-spacing:.04em}
`;
  document.head.appendChild(style);
}

function mountSettingsProfile(){
  if(typeof document==='undefined')return;
  const root=document.getElementById('tdr-settings2');
  if(!root)return;
  const accountTab=root.querySelector('[data-tab="account"]');
  if(!accountTab?.classList?.contains('on'))return;
  const grid=root.querySelector('.s2body .s2grid');
  if(!grid||grid.querySelector('[data-tdr-pilot-profile-settings]'))return;
  ensureSettingsStyle();
  const en=String(document.documentElement?.lang||'').toLowerCase().startsWith('en');
  const profile=getPilotProfile();
  const card=document.createElement('section');card.className='s2card wide';card.dataset.tdrPilotProfileSettings='1';
  card.innerHTML=`<div class="s2label">${en?'DRIVER PROFILE':'PERFIL DE PILOTO'}</div><div class="s2desc">${en?'This is the name attached to laps and replays you share with other testers. Changing it keeps your internal driver identity.':'Este es el nombre que acompaña a las vueltas y repeticiones que compartes con otros testers. Cambiarlo conserva tu identidad interna de piloto.'}</div><div class="s2row"><input class="tdr-pilot-name" data-pilot-settings-name maxlength="16" autocomplete="nickname" autocapitalize="characters" spellcheck="false" aria-label="${en?'Driver name':'Nombre de piloto'}"><button type="button" class="tdr-pilot-save" data-pilot-settings-save>${en?'SAVE NAME':'GUARDAR NOMBRE'}</button></div><div class="tdr-pilot-status" data-pilot-settings-status>${profile.name?(en?`CURRENT: ${profile.name}`:`ACTUAL: ${profile.name}`):''}</div>`;
  const firstCard=grid.querySelector('.s2card');
  if(firstCard?.nextSibling)grid.insertBefore(card,firstCard.nextSibling);else grid.appendChild(card);
  const input=card.querySelector('[data-pilot-settings-name]'),button=card.querySelector('[data-pilot-settings-save]'),status=card.querySelector('[data-pilot-settings-status]');
  if(input)input.value=profile.name||'';
  let lastPointerAt=0;
  const saveName=()=>{
    try{
      const next=setPilotName(input?.value||'');
      if(input)input.value=next.name;
      if(status){status.style.color='#6ff0b4';status.textContent=en?`SAVED: ${next.name}`:`GUARDADO: ${next.name}`;}
    }catch(err){
      if(status){status.style.color='#ff8a93';status.textContent=en?'Driver name must contain 3–16 characters.':String(err?.message||'Nombre no válido');}
      input?.focus?.();
    }
  };
  button?.addEventListener('pointerup',e=>{e.preventDefault();lastPointerAt=Date.now();saveName();});
  button?.addEventListener('click',()=>{if(Date.now()-lastPointerAt<500)return;saveName();});
  input?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();saveName();}});
}

function installSettingsProfileBridge(){
  if(typeof window==='undefined'||typeof document==='undefined')return;
  const run=()=>{try{mountSettingsProfile();}catch{}};
  const start=()=>{
    run();
    const observer=new MutationObserver(()=>run());
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
}

export function installPilotProfilePrompt(){
  if(typeof window==='undefined')return;
  const run=()=>setTimeout(mountPrompt,180);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
  window.addEventListener('tdr:bootready',run,{once:true});
}

try{window.__tdrPilotProfile={get:getPilotProfile,setName:setPilotName};}catch{}
installPilotProfilePrompt();
installSettingsProfileBridge();
