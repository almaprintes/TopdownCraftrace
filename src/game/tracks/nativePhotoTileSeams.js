// Small world-space overdraw on the INTERNAL joins of photo tiles.
// WebGL rounds moving/scaled quad edges independently. Two quads meeting at
// exactly the same subpixel edge can expose a black underlying line on iOS.
// Extend their sprites by 2 source-photo pixels, with NO new textures, draws,
// camera updates, geometry changes or changes to actual photo files.
export const PHOTO_TILE_JOIN_OVERDRAW=2;

export function photoTileSeamlessBounds({
  x,y,decodedWidth,decodedHeight,tileScaleX=1,tileScaleY=1,
  photoWidth,photoHeight,worldScale=1
}){
  const w=decodedWidth*tileScaleX,h=decodedHeight*tileScaleY;
  if(![x,y,w,h,photoWidth,photoHeight,worldScale].every(Number.isFinite)||
    w<=0||h<=0||worldScale<=0||x<0||y<0||
    x+w>photoWidth+1e-5||y+h>photoHeight+1e-5)
    throw Error('Invalid native photo tile bounds');

  // No overdraw outside the original source image. This also keeps a single
  // non-tiled photograph exactly at its old bounds.
  const left=x>0?Math.min(PHOTO_TILE_JOIN_OVERDRAW,w/4):0;
  const top=y>0?Math.min(PHOTO_TILE_JOIN_OVERDRAW,h/4):0;
  const right=x+w<photoWidth-1e-5?Math.min(PHOTO_TILE_JOIN_OVERDRAW,w/4):0;
  const bottom=y+h<photoHeight-1e-5?Math.min(PHOTO_TILE_JOIN_OVERDRAW,h/4):0;
  return {
    x:(x-left)*worldScale,
    y:(y-top)*worldScale,
    width:(w+left+right)*worldScale,
    height:(h+top+bottom)*worldScale
  };
}
