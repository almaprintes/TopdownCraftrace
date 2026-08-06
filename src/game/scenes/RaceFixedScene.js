import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Diagnóstico definitivo: desactivar por completo la cámara UI para comprobar
// si está limpiando/tapando el framebuffer después de renderizar la cámara mundo.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (main) {
        main.setVisible(true);
        main.setAlpha(1);
      }

      // PRUEBA DEFINITIVA: ocultar la cámara HUD entera.
      // Si reaparecen pista/coche, el negro procede de uiCam.
      if (this.uiCam) {
        this.uiCam.setVisible(false);
      }

      // Marcador de mundo inequívoco junto al coche.
      const cx = Number(this.carBody?.x ?? this.car?.x ?? 400);
      const cy = Number(this.carBody?.y ?? this.car?.y ?? 400);
      this.add.rectangle(cx, cy, 42, 42, 0xff00ff, 1)
        .setDepth(999999)
        .setScrollFactor(1);

      // Como uiCam queda oculta, el diagnóstico debe verlo main.
      const info = this.add.text(cx + 28, cy - 28, 'WORLD CAM TEST', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#ff00ff',
        backgroundColor: '#ffffff'
      }).setDepth(999999).setScrollFactor(1);

      if (main?.id) {
        for (const obj of [info, ...(this.children?.list || [])]) {
          if (obj && typeof obj.cameraFilter === 'number') {
            obj.cameraFilter &= ~main.id;
          }
        }
      }
    } catch (err) {
      console.warn('[TDR2] Full uiCam diagnostic failed', err);
    }
  }
}
