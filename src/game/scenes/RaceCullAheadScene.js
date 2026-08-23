import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

function videoQuality(){
  try{
    const s=JSON.parse(localStorage.getItem('tdr2:settings')||'{}');
    return String(s?.video?.quality||'high');
  }catch{return 'high';}
}

// Capa final de rendimiento para la pista.
// Mantiene asfalto preparado alrededor del coche evitando un radio excesivo
// en dispositivos que usan el preset BAJA.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (this.track) {
        // Radio 4 = 81 celdas potenciales. En BAJA usamos radio 3 = 49,
        // todavía con bastante margen frente al radio 2 original (25).
        this.track.cullRadiusCells = videoQuality()==='low' ? 3 : 4;
      }
    } catch (_) {}
  }
}
