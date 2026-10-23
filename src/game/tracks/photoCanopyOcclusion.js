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
      const image=scene.add.image(photo.x,photo.y,photo.texture.key,photo.frame.name)
        .setOrigin(photo.originX,photo.originY)
        .setScale(photo.scaleX,photo.scaleY)
        .setRotation(photo.rotation||0)
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
