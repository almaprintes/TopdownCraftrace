import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageProgressionScene.js';
import { BaseScene } from './BaseScene.js';
import { createTrack, getTrackKeys } from '../tracks/trackRegistry.js';
import { isPublishedTrackId } from '../tracks/trackUnlocks.js';

function trackKey(track){return String(track?.key||track?.id||'');}
function playerVisible(track){
  const key=trackKey(track);
  return !!key && isPublishedTrackId(key) && track?.meta?.hiddenFromTrackSelect!==true;
}

export class TrackGarageScene extends CurrentTrackGarageScene {
  create(){
    if(this._mode==='admin'){
      super.create();
      return;
    }

    // Player selector is a DOM surface. Do not build the legacy Phaser selector
    // underneath it: that path creates preview canvases/textures, async preview jobs,
    // input listeners and rebuilds that the player never sees. On WebKit those hidden
    // jobs could stall the selector while the DOM overlay looked frozen.
    BaseScene.prototype.create.call(this);
    this.cameras.main.setBackgroundColor('#07111b');

    const tracks=[];
    for(const key of getTrackKeys()){
      // Library presence is not publication. Prototypes and authoring leftovers stay
      // available to Admin/Studio but can never leak into the normal player selector.
      if(!isPublishedTrackId(key))continue;
      try{
        const track=createTrack(key);
        if(playerVisible(track))tracks.push(track);
      }catch{}
    }
    this._tracks=tracks;

    let saved='';
    try{saved=String(localStorage.getItem('tdr2:trackKey')||'');}catch{}
    // Reject stale prototype/legacy selections before they can influence the UI or race.
    if(saved&&!isPublishedTrackId(saved)){
      try{localStorage.removeItem('tdr2:trackKey');}catch{}
      try{this.registry.remove?.('selectedTrackKey');this.registry.remove?.('selectedTrack');}catch{}
      saved='';
    }
    let index=this._tracks.findIndex(track=>trackKey(track)===saved);

    // Keep unlocked circuits first for the normal player collection while preserving
    // registry order inside each group.
    if(!this._fullTrackAccess()&&this._tracks.length){
      const order=new Map(this._tracks.map((track,i)=>[trackKey(track),i]));
      this._tracks=[...this._tracks].sort((a,b)=>{
        const al=this._lockedTrack(a)?1:0,bl=this._lockedTrack(b)?1:0;
        return al!==bl?al-bl:(order.get(trackKey(a))??0)-(order.get(trackKey(b))??0);
      });
      index=this._tracks.findIndex(track=>trackKey(track)===saved);
    }

    if(index<0||this._lockedTrack(this._tracks[index]))index=this._tracks.findIndex(track=>!this._lockedTrack(track));
    this._index=index>=0?index:0;

    // Never leave a hidden/obsolete track key armed behind the selector. If a stale
    // development/fallback key exists, clear it instead of letting the lobby/race
    // inherit a circuit that the player cannot select from this collection.
    if(saved&&!this._tracks.some(track=>trackKey(track)===saved&&!this._lockedTrack(track))){
      try{localStorage.removeItem('tdr2:trackKey');}catch{}
      try{this.registry.remove?.('selectedTrackKey');this.registry.remove?.('selectedTrack');}catch{}
    }

    this._launchingTrackSelection=false;
    this._installDomSelector();
  }

  _launchSelected(...args){
    if(this._mode==='admin')return super._launchSelected(...args);
    if(this._launchingTrackSelection)return;
    const track=this._tracks?.[this._index];
    const key=trackKey(track);
    if(!key||!isPublishedTrackId(key)||!playerVisible(track)||this._lockedTrack(track))return;

    this._launchingTrackSelection=true;
    try{localStorage.setItem('tdr2:trackKey',key);}catch{}
    try{this.registry.set('selectedTrackKey',key);this.registry.set('selectedTrack',key);}catch{}
    this.scene.start('menu');
  }
}
