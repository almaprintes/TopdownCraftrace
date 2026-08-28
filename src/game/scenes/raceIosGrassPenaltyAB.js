function isIOSDevice(){
  try{
    const ua=String(navigator?.userAgent||'');
    const platform=String(navigator?.platform||'');
    return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);
  }catch{return false;}
}

function trackId(scene){
  const direct=scene?.trackKey||scene?.track?.meta?.id;
  if(direct)return String(direct).trim().toLowerCase();
  try{return String(localStorage.getItem('tdr2:trackKey')||'').trim().toLowerCase();}catch{return '';}
}

export function installIosAtlanticoGrassPenaltyAB(RaceSceneClass){
  const proto=RaceSceneClass?.prototype;
  if(!proto||proto.__tdrIosAtlanticoGrassPenaltyABInstalled)return;
  const originalUpdate=proto.update;
  if(typeof originalUpdate!=='function')return;

  proto.update=function patchedIosAtlanticoGrassPenaltyAB(time,delta){
    if(!isIOSDevice()||trackId(this)!=='track01'){
      return originalUpdate.call(this,time,delta);
    }

    // Controlled diagnostic only: keep the grass visuals untouched, but make the
    // base surface detector see the car as TRACK for this update. This removes the
    // standard GRASS/OFF penalties without touching checkpoints, geometry or Raven Hollow.
    const originalIsOnTrack=this._isOnTrack;
    const originalIsInBand=this._isInBand;
    this._isOnTrack=()=>true;
    this._isInBand=()=>false;

    try{
      return originalUpdate.call(this,time,delta);
    }finally{
      this._isOnTrack=originalIsOnTrack;
      this._isInBand=originalIsInBand;
    }
  };

  proto.__tdrIosAtlanticoGrassPenaltyABInstalled=true;
}
