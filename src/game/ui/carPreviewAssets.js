import {carCardUrl} from '../cars/carCardArt.js';

// Gallery assets are in /public and must be resolved with Vite's actual BASE_URL.
// The collection card is known-good in the Garage; keep it as a late fallback.
export function carPreviewCandidates(carId,spec={},base=import.meta.env.BASE_URL||'/'){
  const id=String(carId||'').trim();
  if(!id)return [];
  const paths=[
    spec?.skin ? base+'assets/skins/'+String(spec.skin).replace(/^\/+/, '') : null,
    base+'assets/cars/lobby/'+encodeURIComponent(id)+'.webp',
    base+'assets/cars/workshop/'+encodeURIComponent(id)+'.webp',
    carCardUrl(id,spec,base)
  ].filter(Boolean);
  return [...new Set(paths)];
}

// No invisible picture after a failed first request. Attach events BEFORE src,
// and remove the old load/error listeners if a caller replaces the image.
export function attachCarPreviewFallback(img,urls,{onLoad,onExhausted}={}){
  if(!img||!Array.isArray(urls))return ()=>{};
  let disposed=false,index=0;
  const next=()=>{
    if(disposed)return;
    if(index>=urls.length){
      img.removeAttribute('src');
      img.hidden=true;
      onExhausted?.();
      return;
    }
    img.hidden=false;
    img.src=urls[index++];
  };
  const loaded=()=>{
    if(disposed)return;
    img.hidden=false;
    onLoad?.(img.currentSrc||img.src);
  };
  img.addEventListener('error',next);
  img.addEventListener('load',loaded);
  // Ficha may have an initial SSR/HTML src: bind before using it again.
  // If the browser served a cached image synchronously, onload may have
  // occurred before this listener was installed.
  const existing=img.getAttribute?.('src')||'';
  if(existing===urls[0]){
    index=1;
    if(img.complete){
      if(img.naturalWidth>0)loaded();
      else next();
    }
  }else next();
  return ()=>{
    disposed=true;
    img.removeEventListener('error',next);
    img.removeEventListener('load',loaded);
  };
}
