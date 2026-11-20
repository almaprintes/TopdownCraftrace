// DEV-only LIVE 4 livery sync. The player's published skin loads asynchronously.
// Never let AI or remote cars render Phaser's green __MISSING texture.
const INVALID_KEYS=new Set(['__MISSING','__DEFAULT','__BODY__']);
export function syncLive4CarVisual(scene,visual,tint){
  if(!visual)return false;
  const source=scene?.carRig?.list?.find(item=>item?.texture?.key);
  const key=source?.texture?.key;
  if(!key||INVALID_KEYS.has(key)||!scene?.textures?.exists?.(key)){
    visual.setVisible(false);
    return false;
  }
  // The player may switch from procedural to published art after LIVE 4 mounts.
  if(visual.texture?.key!==key)visual.setTexture(key);
  visual.setOrigin(source.originX,source.originY);
  visual.setPosition(source.x||0,source.y||0);
  visual.setScale(source.scaleX,source.scaleY);
  visual.setRotation(source.rotation||0);
  visual.setAlpha(source.alpha??1);
  visual.setTint(tint);
  visual.setVisible(true);
  return true;
}
