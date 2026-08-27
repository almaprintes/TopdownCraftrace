import { RaceScene as CurrentRaceScene } from './RaceRenderIsolationProfilerScene.js';

function readVideo(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    const v=s?.video||{};
    return {
      quality:['low','medium','high'].includes(String(v.quality))?String(v.quality):'high',
      particles:typeof v.particles==='boolean'?v.particles:true,
      showFPS:!!v.showFPS
    };
  }catch{return {quality:'high',particles:true,showFPS:false};}
}

// Runtime graphics presets that change real render work rather than cosmetic labels.
// LOW is intentionally aggressive for older / fill-rate-limited Android devices:
// - 3x3 track chunk neighborhood instead of 5x5
// - no directional lookahead chunks
// - no asphalt overlay layer
// - non-essential particles disabled
// MEDIUM keeps normal chunks but removes the overlay; HIGH keeps the full scene.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._gfxPrefs=readVideo();
    this._gfxQuality=this._gfxPrefs.quality;

    if(this.track){
      if(this._gfxQuality==='low')this.track.cullRadiusCells=1;
      else this.track.cullRadiusCells=2;
    }

    if(this._gfxQuality==='low'){
      this._disableDirectionalLookaheadForLow=true;
      this._forceNoOverlay=true;
      this._forceNoParticles=true;
    }else if(this._gfxQuality==='medium'){
      this._forceNoOverlay=true;
      this._forceNoParticles=!this._gfxPrefs.particles;
    }else{
      this._forceNoOverlay=false;
      this._forceNoParticles=!this._gfxPrefs.particles;
    }

    return result;
  }

  _applyDirectionalLookahead(){
    if(this._disableDirectionalLookaheadForLow){
      // Clean any lookahead chunks that may have been exposed before the preset
      // was applied, then leave the base culler in sole control.
      try{
        const map=this.track?.gfxByCell;
        const base=this.track?.activeCells instanceof Set?this.track.activeCells:new Set();
        if(map instanceof Map){
          for(const key of this._aheadVisible||[]){
            if(base.has(key))continue;
            const cell=map.get(key); if(!cell)continue;
            cell.tile?.setVisible?.(false); cell.overlay?.setVisible?.(false); cell.stroke?.setVisible?.(false);
            if(cell.tile)cell.tile.active=false; if(cell.overlay)cell.overlay.active=false; if(cell.stroke)cell.stroke.active=false;
          }
        }
        this._aheadVisible=new Set();
      }catch{}
      return;
    }
    return super._applyDirectionalLookahead?.();
  }

  _enforceGraphicsPreset(){
    try{
      if(this.track)this.track.cullRadiusCells=this._gfxQuality==='low'?1:2;
      const map=this.track?.gfxByCell;
      if(map instanceof Map && this._forceNoOverlay){
        for(const cell of map.values()){
          cell?.overlay?.setVisible?.(false);
          if(cell?.overlay)cell.overlay.active=false;
        }
      }
    }catch{}

    if(this._forceNoParticles){
      // We deliberately avoid destroying emitters at runtime; pausing them is
      // cheap and reversible, and avoids GC spikes on weak phones.
      try{
        for(const child of this.children?.list||[]){
          const type=String(child?.type||'').toLowerCase();
          if(type.includes('particle')||type.includes('emitter')){
            child.active=false;
            child.visible=false;
            child.stop?.();
          }
        }
      }catch{}
    }
  }

  update(time,delta){
    const result=super.update(time,delta);
    this._enforceGraphicsPreset();
    return result;
  }
}
