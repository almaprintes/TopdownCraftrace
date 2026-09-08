import { installRaceLoadingExperience as installV5 } from './raceLoadingExperienceV5.js';
import { getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';

const ROOT_ID='tdr-race-loading-experience';

function persistedTrackKey(){
  try{return String(localStorage.getItem('tdr2:trackKey')||'').trim();}catch{return'';}
}

function selectedKey(scene){
  if(scene?._tdrTrackStudioTest===true)return String(scene?.trackKey||scene?.track?.key||scene?.track?.id||'track01').trim();
  return persistedTrackKey()||String(scene?.trackKey||scene?.selectedTrackKey||scene?.track?.key||scene?.track?.id||'track01').trim();
}

function surfaceName(track,l){
  const raw=String(track?.surface||track?.meta?.surface||track?.meta?.trackSurface||'asphalt');
  const dirt=/dirt|tierra|gravel|grava|offroad/i.test(raw);
  return dirt?(l==='en'?'DIRT':'TIERRA'):(l==='en'?'ASPHALT':'ASFALTO');
}

function points(track){
  const raw=track?.raceCenterline||track?.centerline||track?.meta?.centerline||[];
  return (Array.isArray(raw)?raw:[])
    .map(p=>Array.isArray(p)?{x:Number(p[0]),y:Number(p[1])}:{x:Number(p?.x),y:Number(p?.y)})
    .filter(p=>Number.isFinite(p.x)&&Number.isFinite(p.y));
}

function svg(list){
  if(list.length<2)return '<div class="tdr-rload-map-empty">TDR</div>';
  const xs=list.map(p=>p.x),ys=list.map(p=>p.y);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
  const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),sw=420,sh=250,pad=20;
  const s=Math.min((sw-pad*2)/bw,(sh-pad*2)/bh),ox=(sw-bw*s)/2-minX*s,oy=(sh-bh*s)/2-minY*s;
  const d=list.map((p,i)=>`${i?'L':'M'} ${(p.x*s+ox).toFixed(1)} ${(p.y*s+oy).toFixed(1)}`).join(' ')+' Z';
  return `<svg viewBox="0 0 ${sw} ${sh}" aria-hidden="true"><path class="tdr-rload-track-glow" d="${d}"/><path class="tdr-rload-track-road" d="${d}"/><path class="tdr-rload-track-line" d="${d}"/></svg>`;
}

function reconcile(scene,key){
  if(typeof document==='undefined')return;
  const root=document.getElementById(ROOT_ID);
  if(!root?.isConnected)return;
  const fresh=String(key||selectedKey(scene)||'track01').trim();
  const track=TRACK_REGISTRY?.[fresh];
  if(!track)return;
  const l=getLanguage()==='en'?'en':'es';
  const title=root.querySelector('[data-track-name]');
  const surface=root.querySelector('[data-surface]');
  const map=root.querySelector('[data-map]');
  if(title)title.textContent=getTrackPublicName(track,l)||fresh.replace(/[-_]+/g,' ').toUpperCase();
  if(surface)surface.textContent=surfaceName(track,l);
  if(map)map.innerHTML=svg(points(track));
  root.dataset.trackKey=fresh;
}

function armGuard(scene){
  if(typeof document==='undefined')return;
  const key=selectedKey(scene);
  scene._tdrLoadingPreviewKey=key;
  try{scene._tdrLoadingPreviewObserver?.disconnect?.();}catch{}
  const observer=new MutationObserver(()=>{
    const root=document.getElementById(ROOT_ID);
    if(root?.isConnected&&root.dataset.trackKey!==key)reconcile(scene,key);
  });
  observer.observe(document.body,{childList:true,subtree:true});
  scene._tdrLoadingPreviewObserver=observer;
  reconcile(scene,key);
  const cleanup=()=>{try{observer.disconnect();}catch{}if(scene._tdrLoadingPreviewObserver===observer)scene._tdrLoadingPreviewObserver=null;};
  scene.events?.once?.('shutdown',cleanup);
  scene.events?.once?.('destroy',cleanup);
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV5(RaceSceneClass);
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrRaceLoadingExperienceV6Installed)return;

  const inheritedInit=proto.init;
  proto.init=function(...args){
    const out=inheritedInit?.apply(this,args);
    this._tdrLoadingPreviewKey=selectedKey(this);
    return out;
  };

  const inheritedPreload=proto.preload;
  proto.preload=function(...args){
    const out=inheritedPreload?.apply(this,args);
    try{armGuard(this);}catch(err){console.warn('[race-loading] preview guard failed',err);}
    return out;
  };

  const inheritedCreate=proto.create;
  proto.create=function(...args){
    const out=inheritedCreate?.apply(this,args);
    try{reconcile(this,this._tdrLoadingPreviewKey||selectedKey(this));}catch{}
    return out;
  };

  proto.__tdrRaceLoadingExperienceV6Installed=true;
}
