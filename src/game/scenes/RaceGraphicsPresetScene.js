import { RaceScene as CurrentRaceScene } from './RaceTelemetryHudScene.js';

const PRESET_BUDGETS={
  performance:{cullRadius:1,lookahead:false,overlay:false,particles:false,driftEffects:false,brakeLights:false,environmentDensity:.45,studioMaterials:['asphalt'],beauty:false},
  medium:{cullRadius:1,lookahead:true,overlay:false,particles:false,driftEffects:false,brakeLights:true,environmentDensity:.70,studioMaterials:['asphalt','grass'],beauty:true},
  high:{cullRadius:2,lookahead:true,overlay:true,particles:true,driftEffects:true,brakeLights:true,environmentDensity:.88,studioMaterials:['asphalt','grass','offroad'],beauty:true},
  ultra:{cullRadius:3,lookahead:true,overlay:true,particles:true,driftEffects:true,brakeLights:true,environmentDensity:1,studioMaterials:['asphalt','grass','offroad'],beauty:true}
};

function readVideo(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    const v=s?.video||{};
    const preset=['performance','medium','high','ultra'].includes(String(v.preset))?String(v.preset):(
      String(v.quality)==='low'?'performance':String(v.quality)==='medium'?'medium':'high'
    );
    return {preset,quality:['low','medium','high'].includes(String(v.quality))?String(v.quality):'high',particles:typeof v.particles==='boolean'?v.particles:preset!=='performance'&&preset!=='medium'};
  }catch{return {preset:'high',quality:'high',particles:true};}
}

function beautyLayerOwnsGround(scene){return scene?._beautyLayerActive===true&&scene?._beautyLayerFailed!==true;}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._gfxPrefs=readVideo();
    this._gfxPreset=this._gfxPrefs.preset;
    this._gfxQuality=this._gfxPrefs.quality;
    this._gfxBudget={...PRESET_BUDGETS[this._gfxPreset]};
    this._gfxBudget.particles=this._gfxBudget.particles&&this._gfxPrefs.particles;
    this._disableDirectionalLookaheadForLow=!this._gfxBudget.lookahead;
    this._forceNoOverlay=!this._gfxBudget.overlay;
    this._forceNoParticles=!this._gfxBudget.particles;
    this._tdrEnvironmentDensity=this._gfxBudget.environmentDensity;
    this._tdrStudioMaterialTypes=new Set(this._gfxBudget.studioMaterials);
    this._tdrAllowBeautyLayer=this._gfxBudget.beauty;
    this._tdrAllowDriftEffects=this._gfxBudget.driftEffects;
    this._tdrAllowBrakeLights=this._gfxBudget.brakeLights;

    if(this.track)this.track.cullRadiusCells=this._gfxBudget.cullRadius;

    for(const key of ['_clockDiagText','_bufferDiagText','_rendererDiagText','_growthDiagText']){
      try{this[key]?.destroy?.(true);}catch{}
      this[key]=null;
    }
    this._clockDiag=null;this._growthDiagAccum=0;this._updateGrowthDiag=()=>{};
    this._enforceGraphicsPreset();
    this.time?.delayedCall?.(250,()=>this._enforceGraphicsPreset());
    this.time?.delayedCall?.(1000,()=>this._enforceGraphicsPreset());
    return result;
  }

  _applyDirectionalLookahead(){
    if(this._disableDirectionalLookaheadForLow){
      try{
        const map=this.track?.gfxByCell,base=this.track?.activeCells instanceof Set?this.track.activeCells:new Set();
        if(map instanceof Map)for(const key of this._aheadVisible||[]){if(base.has(key))continue;const cell=map.get(key);if(!cell)continue;cell.tile?.setVisible?.(false);cell.overlay?.setVisible?.(false);cell.stroke?.setVisible?.(false);if(cell.tile)cell.tile.active=false;if(cell.overlay)cell.overlay.active=false;if(cell.stroke)cell.stroke.active=false;}
        this._aheadVisible=new Set();
      }catch{}
      return;
    }
    if(beautyLayerOwnsGround(this)&&this._gfxPreset!=='ultra'){this._aheadVisible=new Set();return;}
    return super._applyDirectionalLookahead?.();
  }

  _enforceGraphicsPreset(){
    try{
      if(this.track)this.track.cullRadiusCells=this._gfxBudget?.cullRadius??2;
      const map=this.track?.gfxByCell;
      if(map instanceof Map&&this._forceNoOverlay)for(const cell of map.values()){cell?.overlay?.setVisible?.(false);if(cell?.overlay)cell.overlay.active=false;}
    }catch{}
    if(this._forceNoParticles)try{for(const child of this.children?.list||[]){const type=String(child?.type||'').toLowerCase();if(type.includes('particle')||type.includes('emitter')){child.active=false;child.visible=false;child.stop?.();}}}catch{}
  }

  update(time,delta){return super.update(time,delta);}
}
