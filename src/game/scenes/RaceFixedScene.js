import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Parche aislado para iOS/Phaser: la cámara HUD debe superponerse al mundo
// sin limpiar el framebuffer con negro.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      if (this.uiCam) {
        this.uiCam.setBackgroundColor('rgba(0,0,0,0)');
        this.uiCam.transparent = true;
      }
    } catch (err) {
      console.warn('[TDR2] No se pudo forzar transparencia de uiCam', err);
    }
  }
}
