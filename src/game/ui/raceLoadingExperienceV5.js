import { installRaceLoadingExperience as installV4 } from './raceLoadingExperienceV4.js';
import { getLanguage } from '../i18n/index.js';
import { getTrackPublicName } from '../tracks/trackPublicNames.js';
import { TRACK_REGISTRY } from '../tracks/trackRegistry.js';

const ROOT_ID='tdr-race-loading-experience';

function ls(key,fallback=''){
  try{return localStorage.getItem(key)||fallback;}catch{return fallback;}
}

function selectedTrackKey(scene){
  const runtime=String(scene?.trackKey||'').trim();
  const persisted=String(ls('tdr2:trackKey','')).trim();
  // Track Studio can launch a temporary/custom circuit that must stay authoritative.
  // Normal player races are selected through tdr2:trackKey; prefer that fresh value
  // over fields left on Phaser's reused RaceScene instance from the previous race.
  if(scene?._tdrTrackStudioTest===true)return runtime||persisted||'track01';
  return persisted||runtime||'track01';
}

function matchingTrack(scene,key){
  const current=scene?.track;
  const currentKey=String(current?.key||current?.id||'').trim();
  if(current&&currentKey===String(key))return current;
  return TRACK_REGISTRY?.[key]||null;
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

function reconcileSelectedTrackPreview(scene){
  if(typeof document==='undefined')return;
  const root=document.getElementById(ROOT_ID);
  if(!root?.isConnected)return;
  const key=selectedTrackKey(scene);
  const track=matchingTrack(scene,key);
  if(!track)return;
  const l=getLanguage()==='en'?'en':'es';
  const title=root.querySelector('[data-track-name]');
  const surface=root.querySelector('[data-surface]');
  const map=root.querySelector('[data-map]');
  if(title)title.textContent=getTrackPublicName(track,l)||String(key).replace(/[-_]+/g,' ').toUpperCase();
  if(surface)surface.textContent=surfaceName(track,l);
  if(map)map.innerHTML=svg(points(track));
  root.dataset.trackKey=key;
}

export function installRaceLoadingExperience(RaceSceneClass){
  installV4(RaceSceneClass);
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrRaceLoadingExperienceV5Installed)return;
  const inheritedPreload=proto.preload;
  proto.preload=function(...args){
    const result=inheritedPreload?.apply(this,args);
    // V3 mounts the loading DOM during preload. Reconcile immediately afterwards
    // from the freshly selected circuit, never from a stale previous-race scene.track.
    try{reconcileSelectedTrackPreview(this);}catch(err){console.warn('[race-loading] track preview reconcile failed',err);}
    return result;
  };
  proto.__tdrRaceLoadingExperienceV5Installed=true;
}
