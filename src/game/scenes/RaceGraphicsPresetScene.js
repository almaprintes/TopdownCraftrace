import { RaceScene as CurrentRaceScene } from './RaceLapBreakdownProfilerScene.js';

function readVideo(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    const v=s?.video||{};
    const preset=['performance','medium','high','ultra'].includes(String(v.preset))?String(v.preset):(
      String(v.quality)==='low'?'performance':String(v.quality)==='medium'?'medium':'high'
    );
    return {
      preset,
      quality:['low','medium','high'].includes(String(v.quality))?String(v.quality):'high',
      particles:typeof v.particles==='boolean'?v.particles:preset!=='performance'&&preset!=='medium'
    };
  }catch{return {preset:'high',quality:'high',particles:true};}
}

function beautyLayerOwnsGround(scene){
  return scene?._beautyLayerActive===true && scene?._beautyLayerFailed!==true;
}

// Shipping graphics-preset layer. Expensive global object/cell scans are applied
// only during scene setup (plus two short settling passes), never every frame.
// Gameplay/timing/ghost methods are never disabled by a graphics preset.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._gfxPrefs=readVideo();
    this._gfxPreset=this._gfxPrefs.preset;
    this._gfxQuality=this._gfxPrefs.quality;

    if(this.track){
      this.track.cullRadiusCells=beautyLayerOwnsGround(this)?0:(this._gfxPreset==='performance'?1:2);
    }

    if(this._gfxPreset==='performance'){
      this._disableDirectionalLookaheadForLow=true;
      this._forceNoOverlay=true;
      this._forceNoParticles=true;
    }else if(this._gfxPreset==='medium'){
      this._forceNoOverlay=true;
      this._forceNoParticles=true;
    }else{
      this._forceNoOverlay=false;
      this._forceNoParticles=!this._gfxPrefs.particles;
    }

    for(const key of ['_clockDiagText','_bufferDiagText','_rendererDiagText','_growthDiagText']){
      try{this[key]?.destroy?.(true);}catch{}
      this[key]=null;
    }
    this._clockDiag=null;
    this._growthDiagAccum=0;
    this._updateGrowthDiag=()=>{};

    this._enforceGraphicsPreset();
    this.time?.delayedCall?.(250,()=>this._enforceGraphicsPreset());
    this.time?.delayedCall?.(1000,()=>this._enforceGraphicsPreset());
    return result;
  }

  _applyDirectionalLookahead(){
    if(beautyLayerOwnsGround(this)){
      this._aheadVisible=new Set();
      return;
    }
    if(this._disableDirectionalLookaheadForLow){
      try{
        const map=this.track?.gfxByCell;
        const base=this.track?.activeCells instanceof Set?this.track.activeCells:new Set();
        if(map instanceof Map){
          for(const key of this._aheadVisible||[]){
            if(base.has(key))continue;
            const cell=map.get(key);if(!cell)continue;
            cell.tile?.setVisible?.(false);cell.overlay?.setVisible?.(false);cell.stroke?.setVisible?.(false);
            if(cell.tile)cell.tile.active=false;if(cell.overlay)cell.overlay.active=false;if(cell.stroke)cell.stroke.active=false;
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
      const beautyActive=beautyLayerOwnsGround(this);
      if(this.track)this.track.cullRadiusCells=beautyActive?0:(this._gfxPreset==='performance'?1:2);
      const map=this.track?.gfxByCell;
      if(!beautyActive&&map instanceof Map&&this._forceNoOverlay){
        for(const cell of map.values()){
          cell?.overlay?.setVisible?.(false);
          if(cell?.overlay)cell.overlay.active=false;
        }
      }
    }catch{}

    if(this._forceNoParticles){
      try{
        for(const child of this.children?.list||[]){
          const type=String(child?.type||'').toLowerCase();
          if(type.includes('particle')||type.includes('emitter')){
            child.active=false;child.visible=false;child.stop?.();
          }
        }
      }catch{}
    }
  }

  update(time,delta){
    return super.update(time,delta);
  }
}
