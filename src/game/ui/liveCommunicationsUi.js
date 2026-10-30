import {fetchLiveCommunications,installedAndroidVersion,playUpdateNotice,noticeForPlayer,acknowledgeCommunication,safeNoticeLink,openCommunicationLink,COMMUNICATION_REFRESH_MS} from '../online/liveCommunications.js';
import './liveCommunicationsUi.css';

const make=(tag,cls,value)=>{
  const node=document.createElement(tag);
  if(cls)node.className=cls;
  if(value!=null)node.textContent=String(value);
  return node;
};

// This small controller lives only while the lobby is visible, not during races.
// New releases take priority. Neither a network failure nor an offscreen button
// can block the player from pressing JUGAR.
export function installLiveCommunicationsUi(lobbyRoot){
  if(!lobbyRoot||typeof document==='undefined')return()=>{};
  let disposed=false,working=false,pendingNotice=null;
  let panel=null,queuedTimer=null;
  const tray=make('div','tdr-comms-tray');
  const trigger=make('button','tdr-comms-trigger','📣 AVISOS');
  trigger.type='button';trigger.hidden=true;
  trigger.setAttribute('aria-label','Abrir comunicaciones de Top Down Race');
  tray.append(trigger);lobbyRoot.append(tray);
  let known=[];
  let platform='web',versionCode=0;
  function close({acknowledge=false}={}){
    if(!panel)return;
    if(acknowledge&&pendingNotice)acknowledgeCommunication(pendingNotice,localStorage);
    panel.remove();panel=null;
    pendingNotice=null;
  }
  const build=(notice)=>{
    const shade=make('div','tdr-comms-shade');
    shade.setAttribute('role','dialog');shade.setAttribute('aria-modal','true');
    shade.setAttribute('aria-label',notice.kind==='update'?'Actualización disponible':'Aviso de Top Down Race');
    const card=make('section','tdr-comms-card');
    const bar=make('div','tdr-comms-overline',notice.kind==='update'?'ACTUALIZACIÓN DISPONIBLE':'TOP DOWN RACE · AVISO OFICIAL');
    const heading=make('h2','',notice.title);
    const body=make('p','',notice.body);
    const controls=make('div','tdr-comms-actions');
    const later=make('button','tdr-comms-later',notice.kind==='update'?'MÁS TARDE':'ENTENDIDO');
    later.type='button';later.addEventListener('click',()=>close({acknowledge:true}));
    controls.append(later);
    const url=safeNoticeLink(notice);
    if(url){
      const go=make('button','tdr-comms-go',
        notice.kind==='update'?'ACTUALIZAR EN GOOGLE PLAY':notice.action_label||'MÁS INFORMACIÓN');
      go.type='button';
      go.addEventListener('click',()=>{
        acknowledgeCommunication(notice,localStorage);
        void openCommunicationLink(notice);
        close();
      });
      controls.append(go);
    }
    const dismiss=make('button','tdr-comms-close','×');
    dismiss.type='button';dismiss.setAttribute('aria-label','Cerrar aviso');
    dismiss.addEventListener('click',()=>close({acknowledge:true}));
    card.append(dismiss,bar,heading,body,controls);
    shade.append(card);document.body.append(shade);
    return shade;
  };
  function show(notice,{manual=false}={}){
    if(disposed||!lobbyRoot.isConnected||!notice||panel)return;
    if(!manual&&(document.querySelector('.tdr-bf-shade')||
      document.querySelector('[aria-modal="true"]:not(.tdr-comms-shade)'))){
      clearTimeout(queuedTimer);
      queuedTimer=setTimeout(()=>show(notice),900);
      return;
    }
    pendingNotice=notice;
    panel=build(notice);
  }
  trigger.addEventListener('click',()=>{
    const candidate=noticeForPlayer(known,{platform,versionCode,storage:null})||
      known.find(n=>n.kind==='notice'&&(n.target==='all'||n.target===platform));
    if(candidate)show(candidate,{manual:true});
  });
  async function refresh({force=false}={}){
    if(disposed||working)return;
    working=true;
    try{
      const [rows,installed]=await Promise.all([
        fetchLiveCommunications({force}),installedAndroidVersion()
      ]);
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
      const notice=noticeForPlayer(known,{platform,versionCode,storage:localStorage});
      if(notice)show(notice);
    }finally{working=false;}
  }
  void refresh();
  const timer=setInterval(()=>{void refresh({force:true});},COMMUNICATION_REFRESH_MS);
  return ()=>{
    disposed=true;clearInterval(timer);clearTimeout(queuedTimer);
    close();tray.remove();
  };
}
