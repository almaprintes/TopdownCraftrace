import { t } from '../i18n/index.js';
import { activateShipatonJudgeAccess, getMyShipatonJudgeAccess } from '../online/raceControlOnline.js';

const KEY='tdr2:shipatonJudgeMode:v2';
const EVENT='tdr2:shipaton-judge-mode';
let entitlementVerified=false;
let entitlementExpiresAt=null;
let refreshPromise=null;

const enabledPreference=()=>{try{return localStorage.getItem(KEY)==='1';}catch{return false;}};
const firstRow=value=>Array.isArray(value)?value[0]:value;

function publishState(){
  const enabled=shipatonJudgeModeEnabled();
  try{window.dispatchEvent(new CustomEvent(EVENT,{detail:{enabled,verified:entitlementVerified,expiresAt:entitlementExpiresAt}}));}catch{}
  syncJudgeBadge();
  return enabled;
}

export function shipatonJudgeModeEnabled(){return entitlementVerified&&enabledPreference();}
export function setShipatonJudgeMode(enabled){const value=!!enabled&&entitlementVerified;try{localStorage.setItem(KEY,value?'1':'0');}catch{}return publishState();}
export function toggleShipatonJudgeMode(){return setShipatonJudgeMode(!shipatonJudgeModeEnabled());}
// Read-only access authority: consumers may bypass access checks, never persist rewards/unlocks merely because it is active.
export function evaluationAccessEnabled(){return shipatonJudgeModeEnabled();}

export async function refreshShipatonJudgeAccess(){
  if(refreshPromise)return refreshPromise;
  refreshPromise=(async()=>{
    try{
      const row=firstRow(await getMyShipatonJudgeAccess());
      entitlementVerified=row?.enabled===true;
      entitlementExpiresAt=entitlementVerified?(row?.expires_at||null):null;
      if(!entitlementVerified)try{localStorage.setItem(KEY,'0');}catch{}
    }catch(err){
      entitlementVerified=false;entitlementExpiresAt=null;
      console.warn('[shipaton] judge entitlement verification unavailable',err?.message||err);
    }finally{refreshPromise=null;publishState();}
    return entitlementVerified;
  })();
  return refreshPromise;
}

export async function redeemShipatonJudgeCode(code){
  const row=firstRow(await activateShipatonJudgeAccess(code));
  entitlementVerified=row?.enabled===true;
  entitlementExpiresAt=entitlementVerified?(row?.expires_at||null):null;
  if(!entitlementVerified)throw new Error('judge_access_not_granted');
  try{localStorage.setItem(KEY,'1');}catch{}
  publishState();
  return {enabled:true,expiresAt:entitlementExpiresAt};
}

export function syncJudgeBadge(){
  const active=shipatonJudgeModeEnabled();let badge=document.getElementById('tdr-shipaton-judge-badge');
  if(!active){badge?.remove();return;}
  if(!badge){badge=document.createElement('div');badge.id='tdr-shipaton-judge-badge';badge.textContent=t('shipaton.badge');Object.assign(badge.style,{position:'fixed',right:'max(10px,env(safe-area-inset-right,0px))',bottom:'max(8px,env(safe-area-inset-bottom,0px))',zIndex:'8500',pointerEvents:'none',padding:'6px 9px',border:'1px solid rgba(255,102,37,.62)',borderRadius:'8px',background:'rgba(42,33,77,.88)',color:'#fff6e8',font:'800 9px ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',letterSpacing:'.08em'});document.body.appendChild(badge);}
}

function openJudgePanel(){
  document.querySelector('.tdr-judge-modal')?.remove();
  const active=shipatonJudgeModeEnabled(),authorized=entitlementVerified,m=document.createElement('div');m.className='tdr-judge-modal';Object.assign(m.style,{position:'fixed',inset:'0',zIndex:'31000',background:'#000c',display:'grid',placeItems:'center',padding:'5vh 6vw',fontFamily:'system-ui',color:'#c9d4dd'});
  const expiry=entitlementExpiresAt?new Date(entitlementExpiresAt).toLocaleDateString():'';
  m.innerHTML=`<article style="width:min(760px,90vw);max-height:82vh;overflow:auto;background:#0b141d;border:1px solid #58e8ff88;border-radius:12px;padding:22px;box-shadow:0 20px 70px #000"><h2 style="margin:0;color:#fff">${t('shipaton.title')}</h2><p>${t('shipaton.desc')}</p><div style="margin:14px 0;padding:11px;border:1px solid ${active?'#58e8ff':'#3b4b58'};border-radius:8px;color:${active?'#8eefff':'#c9d4dd'}">${active?t('shipaton.active'):t('shipaton.inactive')}${authorized&&expiry?` · ${t('shipaton.validUntil',{date:expiry})}`:''}</div>${!authorized?`<label style="display:grid;gap:7px;margin:14px 0;color:#fff;font-weight:800">${t('shipaton.codeLabel')}<input data-code type="password" autocomplete="one-time-code" autocapitalize="characters" spellcheck="false" maxlength="80" style="padding:12px;border:1px solid #45657a;border-radius:7px;background:#07111b;color:#fff;font:800 15px ui-monospace,monospace" placeholder="TDR-JUDGE-…"></label>`:''}<p><b style="color:#fff">${t('shipaton.guide')}</b><br>• ${t('shipaton.guideGarage')}<br>• ${t('shipaton.guideTracks')}<br>• ${t('shipaton.guideMonetization')}<br>• ${t('shipaton.guideNoProgress')}</p><div data-message style="min-height:20px;color:#ff9d9d;font-size:12px"></div><div style="display:flex;gap:10px;margin-top:10px"><button data-close style="flex:1;padding:11px">${t('shipaton.close')}</button><button data-action style="flex:1;padding:11px;border:1px solid #58e8ff;background:#103c4a;color:#9bf2ff;font-weight:900">${active?t('shipaton.disable'):(authorized?t('shipaton.enable'):t('shipaton.activateCode'))}</button></div></article>`;
  document.body.appendChild(m);m.querySelector('[data-close]').onclick=()=>m.remove();
  m.querySelector('[data-action]').onclick=async e=>{
    const button=e.currentTarget,message=m.querySelector('[data-message]');
    if(active){setShipatonJudgeMode(false);m.remove();openJudgePanel();return;}
    if(authorized){setShipatonJudgeMode(true);m.remove();openJudgePanel();return;}
    const code=String(m.querySelector('[data-code]')?.value||'').trim();if(!code){message.textContent=t('shipaton.codeRequired');return;}
    button.disabled=true;button.textContent=t('shipaton.verifying');message.textContent='';
    try{await redeemShipatonJudgeCode(code);m.remove();openJudgePanel();}
    catch(err){console.error('[shipaton] judge code activation failed',err?.message||err);message.textContent=t('shipaton.invalidCode');button.disabled=false;button.textContent=t('shipaton.activateCode');}
  };
}

function styleShipatonTab(b){if(!b||b.dataset.shipatonStyled==='1')return;b.dataset.shipatonStyled='1';b.setAttribute('aria-label',t('shipaton.ariaLabel'));b.innerHTML='<span class="shipaton-mark" aria-hidden="true">✦</span><span class="shipaton-word">Ship-a-ton</span><span class="shipaton-year">26</span>';Object.assign(b.style,{position:'relative',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',gap:'clamp(3px,.45vw,7px)',background:'linear-gradient(180deg,#332958 0%,#251f43 100%)',border:'1px solid rgba(255,102,37,.72)',boxShadow:'inset 0 0 0 1px rgba(255,255,255,.035),0 0 14px rgba(255,102,37,.08)',color:'#fff7e9',fontFamily:'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',fontWeight:'800',letterSpacing:'0',textTransform:'none'});const mark=b.querySelector('.shipaton-mark'),word=b.querySelector('.shipaton-word'),year=b.querySelector('.shipaton-year');Object.assign(mark.style,{color:'#ff6625',fontSize:'1.05em',lineHeight:'1'});Object.assign(word.style,{whiteSpace:'nowrap',fontSize:'clamp(7px,.9vw,11px)'});Object.assign(year.style,{display:'inline-grid',placeItems:'center',minWidth:'22px',height:'18px',padding:'0 3px',border:'1px solid #ff6625',borderRadius:'2px',color:'#ff6625',fontSize:'clamp(7px,.82vw,10px)',lineHeight:'1',boxShadow:'inset 0 0 0 1px rgba(255,102,37,.15)'});}
function wireSettings(){const tabs=document.querySelector('#tdr-settings2 .s2tabs');if(!tabs)return;let b=tabs.querySelector('[data-shipaton-judge]');if(!b){b=document.createElement('button');b.className='s2tab';b.dataset.shipatonJudge='1';b.onclick=async e=>{e.preventDefault();await refreshShipatonJudgeAccess();openJudgePanel();};tabs.appendChild(b);}styleShipatonTab(b);}

export const SHIPATON_JUDGE_MODE_KEY=KEY;
export const SHIPATON_JUDGE_MODE_EVENT=EVENT;
if(typeof window!=='undefined'){queueMicrotask(()=>{syncJudgeBadge();wireSettings();if(enabledPreference())refreshShipatonJudgeAccess();});window.addEventListener('pageshow',()=>{syncJudgeBadge();wireSettings();if(enabledPreference())refreshShipatonJudgeAccess();},{passive:true});window.addEventListener('online',()=>{if(enabledPreference())refreshShipatonJudgeAccess();},{passive:true});let scheduled=false;const observer=new MutationObserver(()=>{if(scheduled)return;scheduled=true;queueMicrotask(()=>{scheduled=false;wireSettings();});});observer.observe(document.documentElement,{subtree:true,childList:true});}
