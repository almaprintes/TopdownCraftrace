// CraftRace Studio · shared authentication for Top Down RACE and SlotRace.
// A permanent identity always belongs to auth.users. The database trigger
// creates craft_accounts automatically; no game progress is copied here.
const SUPABASE_URL="https://juukbnkjboiazqggqcyv.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_l5cHUHrGHoFzGqmUyfQKSA_d3VjWksB";
const STORAGE_KEY="craftstudio-web-auth-v1";
const LINK_PENDING_KEY="craftstudio-web-link-v1";
const REDIRECT="https://almaprintes.github.io/TopdownCraftrace/cuenta/";
const SDK_URL="https://esm.sh/@supabase/supabase-js@2.119.0?target=es2022";
const get=id=>document.getElementById(id);
const noticeEl=get("authNotice");
const loading=get("authLoading");
const guest=get("authGuest");
const profile=get("authProfile");
const claim=get("profileClaim");
const ready=get("profileReady");
const callbackCode=new URLSearchParams(location.search).has("code");
const callbackError=new URLSearchParams(location.search).get("error_description")||
 new URLSearchParams(location.search).get("error");
let api=null,user=null,studio=null,busy=false,view="login",lastRefresh=0;
let verifying=false;
let pendingAvatarId=null;
const AVATAR_PREFIX="https://almaprintes.github.io/TopdownCraftrace/studio-assets/avatars/";
function notice(value,kind="info"){
 noticeEl.textContent=value;
 noticeEl.className="auth-alert"+(kind==="error"?" error":kind==="info"?" info":"");
}
function explain(error){
 const value=String(error?.message||error||"");
 const code=String(error?.code||error?.error_code||"");
 if(/23505|unique_violation|already registered|duplicate key/i.test(code+" "+value))
  return "Ese nombre ya está reservado. Prueba otro.";
 if(/invalid login credentials|invalid_credentials/i.test(value+" "+code))
  return "Correo o contraseña incorrectos.";
 if(/email not confirmed|email_not_confirmed/i.test(value+" "+code))
  return "Tu correo aún no está verificado. Revisa el mensaje de confirmación.";
 if(/provider is not enabled|provider not enabled|unsupported provider|Provider not found/i.test(value))
  return "Este proveedor todavía no está configurado en Supabase Auth. Puedes usar correo o el otro proveedor.";
 if(/manual_linking_disabled|identity linking is disabled/i.test(value+" "+code))
  return "La vinculación de Google y Apple todavía no está habilitada en Supabase. Tu cuenta sigue intacta.";
 if(/not allowed|redirect|unauthorized|redirect_uri|disallowed/i.test(value+" "+code))
  return "La dirección de esta web aún debe autorizarse en Supabase Auth. No se ha cambiado tu cuenta.";
 if(/network|failed to fetch|load failed|fetch failed/i.test(value))
  return "No se pudo contactar con el servidor de cuentas. Puedes seguir jugando sin registrarte.";
 return "No se pudo completar esta operación. Inténtalo de nuevo o consulta la configuración de acceso.";
}
function show(which){
 loading.hidden=which!=="loading";
 guest.hidden=which!=="guest";
 profile.hidden=which!=="profile";
}
function setBusy(value){
 busy=value;
 get("studioAuthApp").querySelectorAll("button").forEach(btn=>btn.disabled=value);
}
async function run(task){
 if(busy)return;
 setBusy(true);
 try{await task();}
 catch(error){notice(explain(error),"error");}
 finally{setBusy(false);}
}
function tab(name){
 view=name;
 const isLogin=name==="login";
 get("formLogin").hidden=!isLogin;
 get("formRegister").hidden=isLogin;
 get("tabLogin").setAttribute("aria-selected",String(isLogin));
 get("tabRegister").setAttribute("aria-selected",String(!isLogin));
}
async function connectedClient(){
 if(api)return api;
 const sdk=await import(SDK_URL);
 api=sdk.createClient(SUPABASE_URL,PUBLISHABLE_KEY,{
  auth:{
   storageKey:STORAGE_KEY,
   flowType:"pkce",
   persistSession:true,
   autoRefreshToken:true,
   detectSessionInUrl:true
  }
 });
 api.auth.onAuthStateChange(event=>{
  if(["SIGNED_IN","SIGNED_OUT","USER_UPDATED"].includes(event)){
   // Supabase warns against awaiting Auth calls in a synchronous Auth callback.
   queueMicrotask(()=>{void refresh();});
  }
 });
 return api;
}
function providersFor(u){
 return new Set((u?.identities||[]).filter(x=>!x.user_id||x.user_id===u.id)
  .map(x=>x.provider));
}
function readPending(){
 try{
  const pending=JSON.parse(sessionStorage.getItem(LINK_PENDING_KEY)||"null");
  if(!pending||typeof pending!=="object")return null;
  if(Date.now()-Number(pending.createdAt)>10*60*1000)return null;
  return pending;
 }catch{return null;}
}
async function checkLinkedIdentity(client,current){
 if(!callbackCode)return;
 const expected=readPending();
 sessionStorage.removeItem(LINK_PENDING_KEY);
 if(!expected)return;
 const providers=providersFor(current);
 if(current?.id!==expected.userId||
   !providers.has(expected.provider)||
   current?.is_anonymous===true){
  await client.auth.signOut({scope:"local"});
  user=null;studio=null;
  throw new Error("La identidad no coincide con la cuenta anterior. Se ha cerrado esta sesión para proteger el perfil.");
 }
}
function scrubCallback(){
 try{
  const u=new URL(location.href);
  for(const name of ["code","error","error_description","error_code","state"])u.searchParams.delete(name);
  if(u.href!==location.href)history.replaceState(null,"",u.pathname+u.search+u.hash);
 }catch{}
}
async function profileAccount(client,u){
 let lookup=await client.from("craft_accounts")
  .select("user_id,nickname,avatar_id").eq("user_id",u.id).maybeSingle();
 if(lookup.error)throw lookup.error;
 if(!lookup.data){
  // Recovery for an account issued before the DB registration trigger.
  const inserted=await client.from("craft_accounts")
   .upsert({user_id:u.id,nickname:null},{onConflict:"user_id",ignoreDuplicates:true});
  if(inserted.error)throw inserted.error;
  lookup=await client.from("craft_accounts").select("user_id,nickname,avatar_id")
   .eq("user_id",u.id).maybeSingle();
  if(lookup.error||!lookup.data)throw lookup.error||Error("Falta el perfil global.");
 }
 if(lookup.data.user_id!==u.id)throw Error("La cuenta no coincide con la identidad.");
 return lookup.data;
}
async function listStudioAvatars(client){
 const {data,error}=await client.from("studio_avatar_catalog")
  .select("id,label,image_url").eq("active",true).eq("exclusive",false).order("sort_order");
 if(error)throw error;
 return (data||[]).filter(x=>typeof x.image_url==="string"&&
  x.image_url.startsWith(AVATAR_PREFIX)&&
  /^https:\/\/almaprintes\.github\.io\/TopdownCraftrace\/studio-assets\/avatars\/[a-z0-9_]+\.webp$/.test(x.image_url));
}
async function renderStudioAvatarSelection(client,mode,activeId=null){
 const grid=get(mode==="claim"?"studioAvatarClaim":"studioAvatarGallery");
 if(!grid)return;
 grid.replaceChildren();
 const avatars=await listStudioAvatars(client);
 if(mode==="claim"&&!pendingAvatarId&&avatars.length)pendingAvatarId=avatars[0].id;
 if(!avatars.length){grid.textContent="Próximamente: catálogo de avatares oficiales.";return;}
 for(const avatar of avatars){
  const button=document.createElement("button");button.type="button";button.className="studio-avatar-choice";
  button.setAttribute("aria-label","Seleccionar "+avatar.label);
  button.setAttribute("aria-pressed",String(avatar.id===(mode==="claim"?pendingAvatarId:activeId)));
  const img=document.createElement("img");img.src=avatar.image_url;img.alt="";img.loading="lazy";
  const label=document.createElement("small");label.textContent=avatar.label;
  button.append(img,label);
  button.addEventListener("click",()=>void run(async()=>{
   if(mode==="claim"){
    pendingAvatarId=avatar.id;
    for(const b of grid.querySelectorAll("button"))b.setAttribute("aria-pressed",String(b===button));
    return;
   }
   const current=await client.auth.getUser();
   if(current.error||current.data?.user?.id!==user?.id)throw Error("La sesión ha cambiado.");
   const {data:done,error}=await client.from("craft_accounts")
    .update({avatar_id:avatar.id,updated_at:new Date().toISOString()})
    .eq("user_id",user.id).select("avatar_id").maybeSingle();
   if(error||done?.avatar_id!==avatar.id)throw error||Error("No se confirmó el avatar.");
   grid.hidden=true;await refresh();notice("Avatar actualizado en los dos juegos.","success");
  }));
  grid.append(button);
 }
}
async function renderStudioCurrent(client,account){
 const img=get("studioAvatarCurrent");img.hidden=true;img.removeAttribute("src");
 if(!account.avatar_id)return;
 const {data,error}=await client.from("studio_avatar_catalog").select("image_url").eq("id",account.avatar_id).maybeSingle();
 if(!error&&typeof data?.image_url==="string"&&data.image_url.startsWith(AVATAR_PREFIX)){
   img.src=data.image_url;img.hidden=false;
 }
}
async function refresh(){
 const n=++lastRefresh;
 if(verifying)return;
 verifying=true;
 try{
  const client=await connectedClient();
  const session=await client.auth.getSession();
  if(session.error)throw session.error;
  if(n!==lastRefresh)return;
  if(!session.data.session){
   user=null;studio=null;show("guest");
   notice(callbackError?"El acceso externo no terminó correctamente. Comprueba el proveedor o prueba otro método.":
    "Bienvenido a CraftRace Studio. Puedes entrar o crear tu cuenta sin afectar tus partidas.","info");
   tab(view);
   return;
  }
  const identity=await client.auth.getUser();
  if(identity.error)throw identity.error;
  const u=identity.data?.user;
  if(!u||u.is_anonymous===true){
   show("guest");notice("Para crear una cuenta Studio debes verificar Google, Apple o correo.","info");return;
  }
  await checkLinkedIdentity(client,u);
  if(n!==lastRefresh)return;
  const account=await profileAccount(client,u);
  if(n!==lastRefresh)return;
  user=u;studio=account;
  show("profile");
  get("profileNick").textContent=account.nickname||"TU PERFIL";
  get("profileEmail").textContent=u.email||"Inicio de sesión mediante un proveedor";
  if(!account.nickname){
   claim.hidden=false;ready.hidden=true;
   void renderStudioAvatarSelection(client,"claim").catch(()=>{get("studioAvatarClaim").textContent="Catálogo temporalmente no disponible.";});
   notice("Tu identidad permanente ya está registrada en CraftRace Studio. Elige el apodo único que aparecerá en tus juegos.");
   const oldNick=get("claimNickname");
   if(!oldNick.value){
    const tdr=await client.from("profiles").select("nick").eq("user_id",u.id).maybeSingle();
    if(!tdr.error&&tdr.data?.nick&&/^[A-Za-z0-9_-]{3,24}$/.test(tdr.data.nick))
     oldNick.value=tdr.data.nick;
   }
  }else{
   claim.hidden=true;ready.hidden=false;
   void renderStudioCurrent(client,account);
   void renderStudioAvatarSelection(client,"account",account.avatar_id).catch(()=>{get("studioAvatarGallery").textContent="Catálogo temporalmente no disponible.";});
   const known=providersFor(u);
   get("profileProviders").textContent=[...known].map(p=>
    p==="google"?"Google":p==="apple"?"Apple":p==="email"?"Correo":p).join(" · ")||"Autenticado";
   get("linkGoogle").hidden=known.has("google");
   get("linkApple").hidden=known.has("apple");
   notice("Sesión verificada. Esta identidad sirve para todos los juegos de CraftRace Studio.","success");
  }
 }catch(error){
  notice(explain(error),"error");
  if(!user)show("guest");
 }finally{
  verifying=false;
  if(callbackCode||callbackError)scrubCallback();
 }
}
async function signIn(){
 const email=get("loginEmail").value.trim();
 const password=get("loginPassword").value;
 const client=await connectedClient();
 const res=await client.auth.signInWithPassword({email,password});
 if(res.error)throw res.error;
 get("loginPassword").value="";
 await refresh();
}
async function signUp(){
 const email=get("registerEmail").value.trim();
 const password=get("registerPassword").value;
 if(!get("registerEmail").checkValidity()||password.length<10||password.length>128)
  throw Error("Introduce un correo válido y una contraseña de al menos 10 caracteres.");
 if(password!==get("registerRepeat").value){
  notice("Las dos contraseñas deben coincidir.","error");return;
 }
 const client=await connectedClient();
 const res=await client.auth.signUp({email,password,options:{emailRedirectTo:REDIRECT}});
 if(res.error)throw res.error;
 get("registerPassword").value="";
 get("registerRepeat").value="";
 if(res.data.session){await refresh();return;}
 notice("Solicitud recibida. Si tu correo necesita confirmación, revisa el mensaje de Supabase y vuelve aquí para entrar.","success");
 tab("login");
}
async function social(provider){
 const client=await connectedClient();
 const res=await client.auth.signInWithOAuth({provider,options:{redirectTo:REDIRECT}});
 if(res.error)throw res.error;
 // Usually redirected immediately. Do not claim success until Auth returns.
 notice("Abriendo la verificación de "+(provider==="apple"?"Apple":"Google")+"…");
}
async function claimName(){
 if(!user||user.is_anonymous===true)throw Error("Inicia sesión antes de elegir el nombre.");
 const nickname=get("claimNickname").value.trim();
 if(!/^[A-Za-z0-9_-]{3,24}$/.test(nickname)){
  notice("Elige entre 3 y 24 caracteres: letras sin tildes, números, - o _.","error");return;
 }
 const client=await connectedClient();
 const identity=await client.auth.getUser();
 if(identity.error||identity.data.user?.id!==user.id)
  throw Error("La identidad ha cambiado. Vuelve a entrar.");
 const res=await client.from("craft_accounts")
  .update({nickname}).eq("user_id",user.id).is("nickname",null)
  .select("nickname").maybeSingle();
 if(res.error)throw res.error;
 if(!res.data)throw Error("No se pudo reclamar este nombre. Revisa tu perfil.");
 get("claimNickname").value="";
 if(pendingAvatarId){
  const {data:updated,error:avatarError}=await client.from("craft_accounts")
   .update({avatar_id:pendingAvatarId,updated_at:new Date().toISOString()})
   .eq("user_id",user.id).select("avatar_id").maybeSingle();
  if(avatarError||updated?.avatar_id!==pendingAvatarId){
   await refresh();notice("Nick guardado. Puedes escoger el avatar desde tu perfil.","info");return;
  }
 }
 await refresh();
}
async function linkIdentity(provider){
 if(!user)throw Error("Inicia sesión primero.");
 const client=await connectedClient();
 const result=await client.auth.getUser();
 const current=result.data?.user;
 if(result.error||!current||current.id!==user.id||current.is_anonymous===true)
  throw Error("La identidad ha cambiado. Vuelve a entrar.");
 if(providersFor(current).has(provider)){
  notice("Ese proveedor ya está vinculado a tu cuenta.");return;
 }
 const pending={provider,userId:current.id,createdAt:Date.now()};
 sessionStorage.setItem(LINK_PENDING_KEY,JSON.stringify(pending));
 const response=await client.auth.linkIdentity({provider,options:{redirectTo:REDIRECT}});
 if(response.error){
  sessionStorage.removeItem(LINK_PENDING_KEY);
  throw response.error;
 }
 notice("Continuando la vinculación verificada con "+provider+"…");
}
async function signOut(){
 const client=await connectedClient();
 const res=await client.auth.signOut({scope:"local"});
 if(res.error)throw res.error;
 sessionStorage.removeItem(LINK_PENDING_KEY);
 user=null;studio=null;show("guest");tab("login");
 notice("Sesión cerrada en esta web. Tus partidas no han cambiado.","success");
}
get("tabLogin").addEventListener("click",()=>tab("login"));
get("tabRegister").addEventListener("click",()=>tab("register"));
get("formLogin").addEventListener("submit",e=>{e.preventDefault();void run(signIn);});
get("formRegister").addEventListener("submit",e=>{e.preventDefault();void run(signUp);});
get("studioAvatarEdit").addEventListener("click",()=>{const grid=get("studioAvatarGallery");grid.hidden=!grid.hidden;});
get("formClaim").addEventListener("submit",e=>{e.preventDefault();void run(claimName);});
get("signOut").addEventListener("click",()=>{void run(signOut);});
get("refreshAuth").addEventListener("click",()=>{void run(refresh);});
get("linkGoogle").addEventListener("click",()=>{void run(()=>linkIdentity("google"));});
get("linkApple").addEventListener("click",()=>{void run(()=>linkIdentity("apple"));});
document.querySelectorAll("[data-provider]").forEach(btn=>btn.addEventListener("click",()=>{
 void run(()=>social(btn.dataset.provider));
}));
tab("login");
void refresh();