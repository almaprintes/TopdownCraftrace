import { RaceScene as CurrentRaceScene } from './RaceCullAheadScene.js';

function videoPrefs(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return {
      quality:String(s?.video?.quality||'high'),
      showFPS:!!s?.video?.showFPS
    };
  }catch{return {quality:'high',showFPS:false};}
}

// Optimización de carga sostenida, especialmente para iOS y dispositivos antiguos.
// No modifica física, IA, cronometraje ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      const prefs=videoPrefs();
      const quality=prefs.quality;

      this._installMapExportButtons = () => {};

      if (typeof this._discoverFixedHud === 'function') {
        const discover = this._discoverFixedHud.bind(this);
        let lastDiscover = -Infinity;
        discover();
        this._discoverFixedHud = () => {
          const now = performance.now();
          if (now - lastDiscover < 1000) return;
          lastDiscover = now;
          discover();
        };
      }

      if (this.minimapUnifiedPanel?.scene) {
        this._pinMinimapMarker = () => {};
        this._pinMinimapSportFrame = () => {};
      }

      if(typeof this._hideRaceDebugOnly==='function'){
        this._hideRaceDebugOnly();
        this._hideRaceDebugOnly=()=>{};
      }

      if (typeof this._updateRaceInfoHud === 'function') {
        const updateInfo = this._updateRaceInfoHud.bind(this);
        let lastInfo = -Infinity;
        updateInfo();
        this._updateRaceInfoHud = () => {
          const now = performance.now();
          if (now - lastInfo < 50) return;
          lastInfo = now;
          updateInfo();
        };
      }

      if(typeof this._syncCompetitionHud==='function'){
        const syncCompetition=this._syncCompetitionHud.bind(this);
        let lastCompetition=-Infinity;
        syncCompetition();
        this._syncCompetitionHud=()=>{
          const now=performance.now();
          if(now-lastCompetition<100)return;
          lastCompetition=now;
          syncCompetition();
        };
      }

      if(quality==='low'){
        for(const key of ['_environmentEdgeWear','_semiSimBrakeMarks']){
          const obj=this[key];
          if(obj?.scene){try{obj.destroy?.();}catch{}}
          this[key]=null;
        }

        if(this.track?.gfxByCell instanceof Map){
          const map=this.track.gfxByCell;
          const stripOverlay=(cell)=>{
            if(!cell?.overlay)return cell;
            try{cell.overlay.destroy?.();}catch{}
            cell.overlay=null;
            return cell;
          };
          for(const cell of map.values())stripOverlay(cell);
          const nativeSet=map.set.bind(map);
          map.set=(key,cell)=>nativeSet(key,stripOverlay(cell));
        }
      }

      this._perfDiagEnabled=!!prefs.showFPS;
      this._perfUpdateAccum=0;
      this._perfUpdateMax=0;
      this._perfSamples=0;
      this._perfFrameMax=0;
      this._perfDiagAt=performance.now();
      this._perfHotName='--';
      this._perfHotMs=0;

      if(this._perfDiagEnabled){
        const wrapHot=(method,label)=>{
          const original=this[method];
          if(typeof original!=='function' || original.__tdrPerfWrapped)return;
          const bound=original.bind(this);
          const wrapped=(...args)=>{
            const t0=performance.now();
            const out=bound(...args);
            const ms=performance.now()-t0;
            if(ms>this._perfHotMs){
              this._perfHotMs=ms;
              this._perfHotName=label;
            }
            return out;
          };
          wrapped.__tdrPerfWrapped=true;
          this[method]=wrapped;
        };

        for(const [method,label] of [
          ['_computeLapProgress01','lapProg'],
          ['_computeCenterlineProjection','projection'],
          ['_getNearestTrackPoint','nearest'],
          ['_isOnTrack','onTrack'],
          ['_isInBand','band'],
          ['_updateProceduralAudio','audio'],
          ['_discoverFixedHud','hudDiscover'],
          ['_pinHudToScreen','hudPin'],
          ['_updateRaceInfoHud','hudInfo'],
          ['_syncCompetitionHud','hudComp']
        ]) wrapHot(method,label);

        this._perfDiagText=this.add.text(10,42,'PERF --',{
          fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',
          fontSize:'10px',fontStyle:'bold',color:'#d8e8ff',
          backgroundColor:'rgba(0,0,0,.58)',padding:{x:6,y:4},lineSpacing:2
        }).setScrollFactor(0).setDepth(5001);
        try{this.cameras.main.ignore(this._perfDiagText);}catch{}
      }

      // El debug amarillo legado puede crearse de forma diferida en algunas capas.
      // Lo ocultamos después del arranque sin mantener ningún trabajo por frame.
      this.time?.delayedCall?.(1200,()=>{
        try{if(this._dbgText?.scene)this._dbgText.setVisible(false);}catch{}
        try{this._dbgSet=()=>{};}catch{}
      });
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }

  update(time,delta){
    const t0=performance.now();
    const result=super.update(time,delta);
    const updateMs=performance.now()-t0;

    if(this._perfDiagEnabled){
      this._perfUpdateAccum+=updateMs;
      this._perfUpdateMax=Math.max(this._perfUpdateMax,updateMs);
      this._perfSamples++;
      this._perfFrameMax=Math.max(this._perfFrameMax,Number(delta||0));

      const now=performance.now();
      if(now-this._perfDiagAt>=500){
        const avg=this._perfSamples?this._perfUpdateAccum/this._perfSamples:0;
        const objs=Array.isArray(this.children?.list)?this.children.list.length:0;
        const made=this.track?.gfxByCell instanceof Map?this.track.gfxByCell.size:0;
        const active=this.track?.activeCells instanceof Set?this.track.activeCells.size:0;
        const lap=Number(this.lapCount||0)+1;
        this._perfDiagText?.setText(
          `L${lap} UP ${avg.toFixed(1)} ms  MAX ${this._perfUpdateMax.toFixed(1)}\n`+
          `FRAME MAX ${this._perfFrameMax.toFixed(1)} ms\n`+
          `HOT ${this._perfHotName} ${this._perfHotMs.toFixed(1)} ms\n`+
          `OBJ ${objs}  CHUNK ${active}/${made}`
        );
        this._perfUpdateAccum=0;
        this._perfUpdateMax=0;
        this._perfSamples=0;
        this._perfFrameMax=0;
        this._perfHotName='--';
        this._perfHotMs=0;
        this._perfDiagAt=now;
      }
    }

    return result;
  }
}
