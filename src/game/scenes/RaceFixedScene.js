import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Parche aislado de diagnóstico/corrección de cámaras.
// No modifica RaceScene original ni la geometría del circuito.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (main) {
        main.setVisible(true);
        main.setAlpha(1);
      }

      if (this.uiCam) {
        this.uiCam.setBackgroundColor('rgba(0,0,0,0)');
        this.uiCam.transparent = true;
      }

      // Phaser implementa Camera.ignore() mediante cameraFilter en cada objeto.
      // Restauramos la cámara principal SOLO en objetos del mundo (scrollFactor != 0).
      if (main?.id) {
        for (const obj of (this.children?.list || [])) {
          if (!obj) continue;

          const sfx = Number(obj.scrollFactorX ?? 1);
          const sfy = Number(obj.scrollFactorY ?? 1);
          const isWorldObject = sfx !== 0 || sfy !== 0;
          if (!isWorldObject) continue;

          if (typeof obj.cameraFilter === 'number') {
            obj.cameraFilter &= ~main.id;
          }
        }
      }

      // Marcador inequívoco en coordenadas de mundo para separar cámara de máscaras.
      const cx = Number(this.carBody?.x ?? this.car?.x ?? 400);
      const cy = Number(this.carBody?.y ?? this.car?.y ?? 400);
      const probe = this.add.rectangle(cx, cy, 36, 36, 0xff00ff, 1)
        .setDepth(999)
        .setScrollFactor(1);

      if (this.uiCam) this.uiCam.ignore(probe);
      if (main && typeof probe.cameraFilter === 'number') {
        probe.cameraFilter &= ~main.id;
      }

      this.time.delayedCall(600, () => {
        try {
          const msg = `cam main vis:${main?.visible !== false ? 'Y' : 'N'} a:${Number(main?.alpha ?? 0).toFixed(1)} z:${Number(main?.zoom ?? 0).toFixed(2)} x:${Math.round(main?.scrollX ?? 0)} y:${Math.round(main?.scrollY ?? 0)}`;
          this._diag?.(msg);
        } catch {}
      });
    } catch (err) {
      console.warn('[TDR2] Camera diagnostic patch failed', err);
    }
  }
}
