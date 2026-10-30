import {fetchLiveCommunications,installedAndroidVersion,playUpdateNotice,noticeForPlayer,acknowledgeCommunication,communicationSeenStore,safeNoticeLink,openCommunicationLink} from '../online/liveCommunications.js';
import {getLanguage} from '../i18n/index.js';
import {localizePublicNotice} from '../online/liveCommunications.js';
import './liveCommunicationsUi.css';

const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!=null)node.textContent=String(value);
  return node;
};

// A published communication is eligible only after a FRESH app startup.
 // The first lobby instance shares a frozen snapshot with all later lobby visits.
 // Opening settings or completing races must never fetch newly published notices.
let launchRead=null;
let automaticNoticeShownThisLaunch=false;
function getOpeningCommunications(){
  if(!launchRead)launchRead=Promise.all([
    fetchLiveCommunications(),installedAndroidVersion()
  ]);
  return launchRead;
}
// This controller is mounted while the lobby is visible only.
// A failed fetch remains empty until the app is restarted; no mid-game retries.
export function installLiveCommunicationsUi(lobbyRoot){
  if(!lobbyRoot||typeof document==='undefined')return()=>{};
  let disposed=false,pendingNotice=null;
  const seen=communicationSeenStore();
  let panel=null,queuedTimer=null;
  const tray=make('div','tdr-comms-tray');
  const trigger=make('button','tdr-comms-trigger',getLanguage()==='en'?'📣 NOTICES':'📣 AVISOS');
  trigger.type='button';trigger.hidden=true;
  const updateTriggerLanguage=()=>{
    const english=getLanguage()==='en';
    trigger.textContent=english?'📣 NOTICES':'📣 AVISOS';
    trigger.setAttribute('aria-label',english?'Open Top Down RACE announcements':'Abrir comunicaciones de Top Down Race');
  };
  updateTriggerLanguage();
  window.addEventListener('tdr2:language-change',updateTriggerLanguage);
  tray.append(trigger);lobbyRoot.append(tray);
  let known=[];
  let platform='web',versionCode=0;
  function close({acknowledge=false}={}){
    if(!panel)return;
    if(acknowledge&&pendingNotice)acknowledgeCommunication(pendingNotice,seen);
    panel.remove();panel=null;
    pendingNotice=null;
  }
  const build=(notice)=>{
    const english=getLanguage()==='en';
    const display=localizePublicNotice(notice,english?'en':'es');
    const shade=make('div','tdr-comms-shade');
    shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
    shade.setAttribute('aria-label',notice.kind==='update'?(english?'Update available':'Actualización disponible'):(english?'Top Down RACE notice':'Aviso de Top Down Race'));
    const card=make('section','tdr-comms-card');
    const bar=make('div','tdr-comms-overline',notice.kind==='update'?(english?'UPDATE AVAILABLE':'ACTUALIZACIÓN DISPONIBLE'):(english?'TOP DOWN RACE · OFFICIAL NOTICE':'TOP DOWN RACE · AVISO OFICIAL'));
    const heading=make('h2','',display.title);
    const body=make('p','',display.body);
    const controls=make('div','tdr-comms-actions');
    const later=make('button','tdr-comms-later',notice.kind==='update'?(english?'LATER':'MÁS TARDE'):(english?'GOT IT':'ENTENDIDO'));
    later.type='button';later.addEventListener('click',()=>close({acknowledge:true}));
    controls.append(later);
    const url=safeNoticeLink(notice);
    if(url){
      const go=make('button','tdr-comms-go',
        notice.kind==='update'?(english?'UPDATE ON GOOGLE PLAY':'ACTUALIZAR EN GOOGLE PLAY'):display.action_label||(english?'MORE INFORMATION':'MÁS INFORMACIÓN'));
      go.type='button';
      go.addEventListener('click',()=>{
        acknowledgeCommunication(notice,seen);
        void openCommunicationLink(notice);
        close();
      });
      controls.append(go);
    }
    const dismiss=make('button','tdr-comms-close','×');
    dismiss.type='button';dismiss.setAttribute('aria-label',english?'Close notice':'Cerrar aviso');
    dismiss.addEventListener('click',()=>close({acknowledge:true}));
    card.append(dismiss,bar,heading,body,controls);
    shade.append(card);document.body.append(shade);
    return shade;
  };
  function show(notice,{manual=false}={}){
    if(disposed||!lobbyRoot.isConnected||!notice||panel||(!manual&&automaticNoticeShownThisLaunch))return;
    if(!manual&&(document.querySelector('.tdr-bf-shade')||
      document.querySelector('[aria-modal="true"]:not(.tdr-comms-shade)'))){
      clearTimeout(queuedTimer);
      queuedTimer=setTimeout(()=>show(notice),900);
      return;
    }
    pendingNotice=notice;
    panel=build(notice);
    if(!manual)automaticNoticeShownThisLaunch=true;
  }
  trigger.addEventListener('click',()=>{
    const candidate=noticeForPlayer(known,{platform,versionCode,storage:null})||
      known.find(n=>n.kind==='notice'&&(n.target==='all'||n.target===platform));
    if(candidate)show(candidate,{manual:true});
  });
  async function showOpeningCommunications(){
    try{
      const [rows,installed]=await getOpeningCommunications();
      if(disposed||!lobbyRoot.isConnected)return;
      platform=installed?'android':'web';
      versionCode=installed?.code||0;
      // When Play confirms no update for this user, do not prematurely
      // display a remote announcement for an unfinished/staged rollout.
      const eligible=(installed?.playChecked&&installed.playAvailable!==true)
        ?rows.filter(n=>n.kind!=='update'):rows;
      const automatic=playUpdateNotice(installed);
      known=automatic?[...eligible,automatic]:eligible;
      // If native version detection is temporarily unavailable, never claim
      // that a Play update exists based on the DEV label or a stored guess.
      const available=known.some(n=>n.kind==='notice'&&(n.target==='all'||n.target===platform))||
        (platform==='android'&&known.some(n=>n.kind==='update'&&n.version_code>versionCode));
      trigger.hidden=!available;
      const notice=noticeForPlayer(known,{platform,versionCode,storage:seen});
      if(notice)show(notice);
    }catch(error){
      console.warn('[TDR communications] launch check failed',error?.message||'unknown');
    }
  }
  void showOpeningCommunications();
  return ()=>{
    disposed=true;clearTimeout(queuedTimer);
    window.removeEventListener('tdr2:language-change',updateTriggerLanguage);
    close();tray.remove();
  };
}
