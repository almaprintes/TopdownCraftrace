// The player garage never fetches unreleased artwork.
export function syncGarageHeroCardMedia(zone,img,locked,file){
  zone?.classList?.toggle?.('is-locked',!!locked);
  if(!img)return;
  if(locked||!file){
    // CSS alone would still decode/reveal the real car card.
    img.hidden=true;
    img.removeAttribute('src');
    img.alt='';
    return;
  }
  img.hidden=false;
  if(img.getAttribute('src')!==file)img.src=file;
  img.alt='';
}
