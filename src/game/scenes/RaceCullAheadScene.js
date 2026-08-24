import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

function videoQuality(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return String(s?.video?.quality||'high');
  }catch{return 'high';}
}

// Capa final de rendimiento para la pista.
// Si Beauty Layer ha sustituido el terreno viejo, NO reactivamos culling por chunks.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (!this.track) return;

      if (this._beautyLayerActive === true) {
        this.track.cullRadiusCells = 0;
        this.track.activeCells = new Set();
        this._applyDirectionalLookahead = () => {};
        this._centerlineLookaheadCells = () => new Set();
        this._aheadVisible = new Set();
        return;
      }

      this.track.cullRadiusCells = videoQuality()==='low' ? 2 : 4;
    } catch (_) {}
  }
}
