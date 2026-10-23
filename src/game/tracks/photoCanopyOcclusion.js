// 2.5D photograph occlusion. The photo already has the correct branch pixels.
// Re-use loaded tile textures at the EXACT same world transform, and stencil
// only the Studio-authored crowns above the vehicle layer (depth 30).
// No shadow meshes, new textures, frame polling, physics, or collision changes.
import {normalizedCanopyZones} from '../environment/canopyOcclusionGeometry.js';

export const CANOPY_DEPTH=31.5;

export function mountPhotoCanopyOcclusion(scene){
  scene._tdrCanopyOcclusion?.destroy?.();
  scene._tdrCanopyOcclusion=null;
  const zoneDefs=scene._tdrCanopyZones;
  const photos=scene._trackBeautyTiles;
  if(!Array.isArray(photos)||!photos.length||!Array.isArray(zoneDefs)||!zoneDefs.length)return null;
  const zones=normalizedCanopyZones(zoneDefs,scene.track?.worldW,scene.track?.worldH);
  if(!zones.length)return null;
  const spans=zones.map(z=>{
    const xs=z.points.map(p=>p.x),ys=z.points.map(p=>p.y);
    return {minX:Math.min(...xs),maxX:Math.max(...xs),
      minY:Math.min(...ys),maxY:Math.max(...ys)};
  });
  const alpha=Math.min(...zones.map(z=>z.opacity));
  let graphics=null,mask=null;
  const overlay=[];
  try{
    graphics=scene.make.graphics({x:0,y:0,add:false});
    graphics.fillStyle(0xffffff,1);
    for(const zone of zones){
      const pts=zone.points;
      graphics.beginPath();graphics.moveTo(pts[0].x,pts[0].y);
      for(let j=1;j<pts.length;j++)graphics.lineTo(pts[j].x,pts[j].y);
      graphics.closePath();graphics.fillPath();
    }
    mask=graphics.createGeometryMask();
    // Phaser photo tiles may be compact on iOS. The original object transform
    // handles photo source dimensions, scaling and photo coordinate system.
    for(const photo of photos){
      if(!photo?.scene||!photo.texture?.key)continue;
      // Only repeat tiles touched by a canopy; a four/six-tile panorama
      // shouldn't generate draws for empty regions of the world.
      const w=Number(photo.displayWidth),h=Number(photo.displayHeight);
      if(w>0&&h>0){
        const x0=photo.x-photo.originX*w,y0=photo.y-photo.originY*h;
        if(!spans.some(s=>s.maxX>x0&&s.minX<x0+w&&s.maxY>y0&&s.minY<y0+h))
          continue;
      }
      const image=scene.add.image(photo.x,photo.y,photo.texture.key,photo.frame.name)
        .setOrigin(photo.originX,photo.originY)
        .setScale(photo.scaleX,photo.scaleY)
        .setRotation(photo.rotation||0)
        .setAlpha(alpha)
        .setDepth(CANOPY_DEPTH).setScrollFactor(1).setMask(mask);
      scene.uiCam?.ignore?.(image);
      overlay.push(image);
    }
    const runtime={zones,overlay,destroy(){
      for(const image of overlay)try{image.destroy();}catch{}
      try{mask.destroy();}catch{}
      try{graphics.destroy();}catch{}
      if(scene._tdrCanopyOcclusion===runtime)scene._tdrCanopyOcclusion=null;
    }};
    scene._tdrCanopyOcclusion=runtime;
    scene.events.once('shutdown',()=>runtime.destroy());
    return runtime;
  }catch(error){
    for(const image of overlay)try{image.destroy();}catch{}
    try{mask?.destroy();}catch{}
    try{graphics?.destroy();}catch{}
    console.warn('[photo-canopy] overlay disabled, original photo preserved',error);
    return null;
  }
}
