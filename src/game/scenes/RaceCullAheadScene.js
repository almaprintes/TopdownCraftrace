import { RaceScene as CurrentRaceScene } from './RaceDuelLapReplayScene.js';

// Capa final de rendimiento para la pista.
// Mantiene más asfalto preparado alrededor del coche para evitar pop-in.
// No modifica física, cronometraje, IA ni geometría de pista.
export class RaceScene extends CurrentRaceScene {
  create() {
    super.create();

    try {
      if (this.track) {
        // Antes eran 2 celdas. Cuatro deja un colchón amplio fuera de cámara,
        // especialmente útil en rectas largas y a alta velocidad.
        this.track.cullRadiusCells = 4;
      }
    } catch (_) {}
  }
}
