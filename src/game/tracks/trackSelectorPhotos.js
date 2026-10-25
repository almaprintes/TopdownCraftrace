// UI-only assets: each thumbnail is cropped from that exact circuit's
// existing real photograph or its own authored beauty preview. No generated
// track layouts, no gameplay changes and no cross-circuit substitutions.
export const TRACK_SELECTOR_PHOTO_PATHS=Object.freeze({
  'circuito-atlantico':'assets/tracks/selector/circuito-atlantico.webp',
  'santa-cruz':'assets/tracks/selector/santa-cruz.webp',
  'karting-tenerife':'assets/tracks/selector/karting-tenerife.webp',
  'karting-canarias':'assets/tracks/selector/karting-canarias.webp',
  'karting-americas':'assets/tracks/selector/karting-americas.webp',
  'rally-arafo-los-loros':'assets/tracks/selector/rally-arafo-los-loros.webp',
  'siete-picos':'assets/tracks/selector/siete-picos.webp'
});

export function selectorPhotoPath(track,locked=false){
  if(locked)return null;
  const id=typeof track==='string'?track:String(track?.key||track?.id||'');
  if(id==='karting-canarias-4096')return 'assets/tracks/selector/karting-canarias-4096.webp';
  if(id==='karting-tenerife-horario')return TRACK_SELECTOR_PHOTO_PATHS['karting-tenerife'];
  if(id.endsWith('-inverso'))return selectorPhotoPath(id.slice(0,-'-inverso'.length),false);
  return Object.hasOwn(TRACK_SELECTOR_PHOTO_PATHS,id)?TRACK_SELECTOR_PHOTO_PATHS[id]:null;
}

export function selectorPhotoUrl(track,locked=false,base='/'){
  const path=selectorPhotoPath(track,locked);
  return path?String(base||'/').replace(/\/?$/,'/')+path:null;
}

export function selectorTrackKind(track,locked=false){
  if(locked)return 'LOCKED';
  const id=String(track?.key||track?.id||'');
  return id==='rally-arafo-los-loros'||track?.raceType==='stage'||track?.closed===false?'RALLY':'CIRCUIT';
}
