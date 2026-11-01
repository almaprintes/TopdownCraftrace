// Explicitly conservative: DEV iPhone only. Other platforms and production
// use their previous code paths, unchanged.
//
// A baked/photo Beauty Layer makes RaceRealSurfaceAssetsScene's per-frame
// _applyAtlanticoSurfacePresentation() a no-op: the original function exits
// immediately when beautyLayerActive === true on the only matching track.
// Avoid its needless per-frame localStorage read on this DEV iPhone path.
export function skipIosDevPhotoMaterialSync({isProd=true,isIphone=false,beautyLayerActive=false}={}){
  return isProd===false && isIphone===true && beautyLayerActive===true;
}

// RaceEmbeddedReplaySceneV2 scans the Phaser display list twice per update
// in gamepad UI mode, both before and after super.update. The post-update scan
// still runs on all platforms, so only suppress the duplicate pre-update
// scan for a non-embedded iPhone DEV race. Never alter Android or replay.
export function skipIosDevPreUpdateSteeringScan({isProd=true,isIphone=false,embedded=false}={}){
  return isProd===false && isIphone===true && embedded===false;
}
