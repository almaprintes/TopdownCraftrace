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
      particles:typeof v.particles==='boolean'?v.particles:preset!=='performance'&&preset!=='medium',
      showFPS:!!v.showFPS
    };
  }catch{return {preset:'high',quality:'high',particles:true,showFPS:false};}
}

function isIOSDevice(){
  try{
    const ua=String(navigator?.userAgent||'');
    const platform=String(navigator?.platform||'');
    return /iPhone|iPad|iPod/i.test(ua)||(platform==='MacIntel'&&Number(navigator?.maxTouchPoints||0)>1);
  }catch{return false;}
}

function beautyLayerOwnsGround(scene){
  return scene?._beautyLayerActive===true && scene?._beautyLayerFailed!==true;
}

function throttleValue(scene){
  const t=scene?.touch||{};
  const candidates=[t.throttle,t.gas,t.accel,t.accelerate];
  for(const v of candidates){
    const n=Number(v);
    if(Number.isFinite(n))return Math.max(0,Math.min(1,n));
  }
  const k=scene?.keys||{};
  return (k.up?.isDown||k.up2?.isDown)?1:0;
}

// Presets automáticos visibles al usuario:
// PERFORMANCE: mínimo trabajo de render, 3x3 chunks, sin lookahead/overlay/partículas.
// MEDIUM: rango normal, sin overlay ni partículas; mantiene iluminación/materiales ligeros.
// HIGH: escena completa y efectos normales.
// ULTRA: mismo rango seguro de HIGH, dejando activadas todas las capas y usando
//        las variantes de material de mayor resolución donde estén disponibles.
// IMPORTANTE: cuando una Beauty Layer horneada posee el terreno, NO se puede
// reactivar el renderer legacy de chunks. Los cuatro tiles ya sustituyen
// asfalto/hierba/offroad y volver a crear chunks los dibuja encima y duplica coste.
export class RaceScene extends CurrentRaceScene {
  create(data){
    const result=super.create(data);
    this._gfxPrefs=readVideo();
    this._gfxPreset=this._gfxPrefs.preset;
    this._gfxQuality=this._gfxPrefs.quality;

    // Controlled iOS A/B: disable only ghost/replay capture churn. Playback and
    // the rest of the race remain untouched. This prevents the ~45 ms sample
    // allocations plus per-lap array copy/localStorage serialization on iOS.
    if(isIOSDevice()){
      this._recordGhostSample=()=>{};
      this._completedLapCheck=()=>{};
      this._ghostSamples=[];
    }

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

    // CLOCK queda desactivado completamente en iOS durante este A/B. En otros
    // dispositivos conserva el comportamiento previo si Mostrar FPS está activo.
    if(this._gfxPrefs.showFPS&&!isIOSDevice()){
      const now=performance.now();
      this._clockDiag={lastWall:now,wallSum:0,simSum:0,frames:0,lastPaint:now};
      this._clockDiagText=this.add.text(10,18,'CLOCK --',{
        fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
        fontSize:'10px',fontStyle:'bold',color:'#8fffd0',
        backgroundColor:'rgba(0,0,0,.62)',padding:{x:6,y:3}
      }).setScrollFactor(0).setDepth(5003);
    }

    // Diagnóstico iOS ultraligero de crecimiento. No envuelve funciones y no usa
    // performance.now(): solo cuenta objetos/tweens/timers una vez por segundo.
    if(isIOSDevice()){
      this._growthDiagAccum=1000;
      this._growthDiagText=this.add.text(10,42,'OBJ -- · TWN -- · TMR --',{
        fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
        fontSize:'10px',fontStyle:'bold',color:'#ffe89a',
        backgroundColor:'rgba(0,0,0,.62)',padding:{x:6,y:3}
      }).setScrollFactor(0).setDepth(5004);
    }

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
      const beautyActive=beautyLayerOwnsGround(this);
      if(this.track)this.track.cullRadiusCells=beautyActive?0:(this._gfxPreset==='performance'?1:2);
      const map=this.track?.gfxByCell;
      if(!beautyActive && map instanceof Map && this._forceNoOverlay){
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
            child.active=false;
            child.visible=false;
            child.stop?.();
          }
        }
      }catch{}
    }
  }

  _updateGrowthDiag(delta){
    if(!this._growthDiagText)return;
    this._growthDiagAccum+=Math.max(0,Number(delta)||0);
    if(this._growthDiagAccum<1000)return;
    this._growthDiagAccum=0;

    let obj=0,twn=0,tmr=0;
    try{obj=Array.isArray(this.children?.list)?this.children.list.length:0;}catch{}
    try{
      const all=typeof this.tweens?.getTweens==='function'?this.tweens.getTweens():null;
      if(Array.isArray(all))twn=all.length;
      else if(Array.isArray(this.tweens?._active))twn=this.tweens._active.length;
      else if(Array.isArray(this.tweens?.list))twn=this.tweens.list.length;
    }catch{}
    try{
      const events=typeof this.time?.getAllEvents==='function'?this.time.getAllEvents():null;
      if(Array.isArray(events))tmr=events.length;
    }catch{}
    this._growthDiagText.setText(`OBJ ${obj} · TWN ${twn} · TMR ${tmr}`);
  }

  update(time,delta){
    const d=this._clockDiag;
    const wallNow=d?performance.now():0;
    if(d){
      const wall=Math.max(0,wallNow-d.lastWall);
      d.lastWall=wallNow;
      if(wall<250){
        d.wallSum+=wall;
        d.simSum+=Math.max(0,Number(delta)||0);
        d.frames++;
      }
    }

    const result=super.update(time,delta);
    this._enforceGraphicsPreset();
    this._updateGrowthDiag(delta);

    if(d && wallNow-d.lastPaint>=500){
      const wallAvg=d.frames?d.wallSum/d.frames:0;
      const simAvg=d.frames?d.simSum/d.frames:0;
      const ratio=d.wallSum>0?d.simSum/d.wallSum:0;
      const thr=throttleValue(this);
      const brake=Math.max(0,Math.min(1,Number(this.touch?.brake||0)||0));
      const worldScale=Number(this.physics?.world?.timeScale);
      const ts=Number.isFinite(worldScale)?worldScale.toFixed(2):'--';
      this._clockDiagText?.setText(
        `THR ${thr.toFixed(2)} BRK ${brake.toFixed(2)} · Δ ${simAvg.toFixed(1)}ms · WALL ${wallAvg.toFixed(1)}ms · SIM/WALL ${ratio.toFixed(2)} · PTS ${ts}`
      );
      d.wallSum=0; d.simSum=0; d.frames=0; d.lastPaint=wallNow;
    }
    return result;
  }
}
