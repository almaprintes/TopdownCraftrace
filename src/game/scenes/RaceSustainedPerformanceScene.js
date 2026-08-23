import { RaceScene as CurrentRaceScene } from './RaceCullAheadScene.js';

function videoQuality(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return String(s?.video?.quality||'high');
  }catch{return 'high';}
}

// Optimización de carga sostenida, especialmente para iOS y dispositivos antiguos.
// No modifica física, IA, cronometraje ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    try {
      const quality=videoQuality();

      this._installMapExportButtons = () => {};

      if (typeof this._discoverFixedHud === 'function') {
        const discover = this._discoverFixedHud.bind(this);
        let lastDiscover = -Infinity;
        discover();
        this._discoverFixedHud = () => {
          const now = performance.now();
          if (now - lastDiscover < 250) return;
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
        // Microdecoración estática de alto coste visual: en BAJA conservamos las
        // texturas base, pianos y entorno, pero retiramos estos Graphics densos.
        for(const key of ['_environmentEdgeWear','_semiSimBrakeMarks']){
          const obj=this[key];
          if(obj?.scene){try{obj.destroy?.();}catch{}}
          this[key]=null;
        }

        // Segunda capa semitransparente del asfalto: elimina blending/draw extra
        // por chunk manteniendo intacta la superficie principal y su máscara.
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
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }
}
