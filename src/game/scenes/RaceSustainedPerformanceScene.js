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

      // BaseScene programaba herramientas de exportación de mapas incluso en una
      // carrera normal. Son utilidades de desarrollo, no gameplay.
      this._installMapExportButtons = () => {};

      // RaceFixedScene conserva un descubridor histórico de HUD que recorre toda
      // la Display List. Como los chunks de pista quedan cacheados, hacerlo cada
      // frame se vuelve progresivamente más caro. Lo mantenemos para UI dinámica,
      // pero como máximo 4 veces por segundo.
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

      // El minimapa heredado queda oculto por RaceMinimapCenteredScene, que ya
      // tiene su propio marcador world->map. Evitamos seguir proyectando el
      // marcador antiguo contra toda la centerline en cada frame.
      if (this.minimapUnifiedPanel?.scene) {
        this._pinMinimapMarker = () => {};
      }

      // Mantener la posición del HUD a frecuencia de frame, pero refrescar los
      // Text de velocidad/marcha/superficie a 20 Hz.
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

      // BAJA debe ser un perfil GPU real. El asfalto base y su máscara se
      // conservan; eliminamos únicamente la segunda capa semitransparente de
      // desgaste, que duplica draw/blending por cada chunk visible.
      if(quality==='low' && this.track?.gfxByCell instanceof Map){
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
    } catch (err) {
      console.warn('[TDR2] sustained performance setup failed', err);
    }

    return result;
  }
}
