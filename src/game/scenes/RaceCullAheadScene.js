import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

function videoQuality(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return String(s?.video?.quality||'high');
  }catch{return 'high';}
}

// Capa final de rendimiento para la pista.
// BAJA usa temporalmente el radio original 2 (25 celdas potenciales) para
// medir cuánto del calor sostenido viene del coste GPU de los chunks activos.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (this.track) {
        this.track.cullRadiusCells = videoQuality()==='low' ? 2 : 4;
      }
    } catch (_) {}
  }
}
