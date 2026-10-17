// iPhone/WebKit WebGL has limited sustained decoded-texture headroom.
// Keep 100% of the image-native road's world-space coordinates and sprites'
// actual on-screen world dimensions; only lower the sampled texture resolution.
export const IOS_PHOTO_TILE_SCALE=0.65;

export function useCompactIosPhotoTiles(ua=''){
  return /iPhone|iPod/i.test(String(ua));
}
export function compactIosPhotoTilePath(assetPath){
  const path=String(assetPath||'');
  return path.endsWith('.webp')?path.replace(/\.webp$/,'-ios.webp'):null;
}
export function expectedCompactTileSize(width,height){
  return [Math.max(1,Math.round(Number(width)*IOS_PHOTO_TILE_SCALE)),
    Math.max(1,Math.round(Number(height)*IOS_PHOTO_TILE_SCALE))];
}
export function photoTileWorldScale(originalWidth,decodedWidth,worldScale=1){
  if(!Number.isFinite(originalWidth)||!Number.isFinite(decodedWidth)||decodedWidth<=0)
    throw Error('Invalid iOS photo tile size');
  return (originalWidth/decodedWidth)*worldScale;
}
