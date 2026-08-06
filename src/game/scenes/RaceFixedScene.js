import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Diagnóstico/corrección aislada de RaceScene.
// Mantiene la lógica original de físicas y zoom dinámico, y protege el follow al coche.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (main) {
        main.setVisible(true);
        main.setAlpha(1);

        if (this.carBody) {
          main.startFollow(this.carBody, true, 0.12, 0.12);
          main.centerOn(this.carBody.x, this.carBody.y);

          // iOS/reentrada: reforzar el enganche cuando ya ha pasado al menos un tick.
          this.time.delayedCall(0, () => {
            if (!this.carBody?.scene) return;
            main.startFollow(this.carBody, true, 0.12, 0.12);
            main.centerOn(this.carBody.x, this.carBody.y);
          });
          this.time.delayedCall(250, () => {
            if (!this.carBody?.scene) return;
            main.startFollow(this.carBody, true, 0.12, 0.12);
          });
        }
      }

      // Seguimos con la UI camera apagada mientras aislamos el fallo de render de texturas.
      if (this.uiCam) this.uiCam.setVisible(false);

      const cx = Number(this.carBody?.x ?? this.car?.x ?? 400);
      const cy = Number(this.carBody?.y ?? this.car?.y ?? 400);

      this.add.rectangle(cx, cy, 42, 42, 0xff00ff, 1)
        .setDepth(999999)
        .setScrollFactor(1);

      const firstCell = this.track?.gfxByCell?.values?.().next?.().value;
      const tile = firstCell?.tile || null;
      const carSprite = this.carRig?.list?.[0] || null;

      const fmt = (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '-';
      const keyOf = (o) => o?.texture?.key || o?.frame?.texture?.key || '-';
      const sizeOf = (o) => `${fmt(o?.displayWidth ?? o?.width)}x${fmt(o?.displayHeight ?? o?.height)}`;
      const scaleOf = (o) => `${fmt(o?.scaleX)}x${fmt(o?.scaleY)}`;
      const filterOf = (o) => typeof o?.cameraFilter === 'number' ? String(o.cameraFilter) : '-';

      let savedCar = '-';
      try {
        savedCar = localStorage.getItem('tdr2:selectedCar') ||
          localStorage.getItem('tdr2:carId') ||
          localStorage.getItem('selectedCar') || '-';
      } catch {}

      const lines = [
        `carId:${this.carId ?? '-'} saved:${savedCar}`,
        `carSprite key:${keyOf(carSprite)} vis:${carSprite?.visible === false ? 'N' : 'Y'} a:${fmt(carSprite?.alpha)} size:${sizeOf(carSprite)} scale:${scaleOf(carSprite)} cf:${filterOf(carSprite)}`,
        `carRig vis:${this.carRig?.visible === false ? 'N' : 'Y'} a:${fmt(this.carRig?.alpha)} pos:${fmt(this.carRig?.x)},${fmt(this.carRig?.y)} cf:${filterOf(this.carRig)}`,
        `bgOff size:${sizeOf(this.bgOff)} scale:${scaleOf(this.bgOff)} pos:${fmt(this.bgOff?.x)},${fmt(this.bgOff?.y)} cf:${filterOf(this.bgOff)}`,
        `bgGrass size:${sizeOf(this.bgGrass)} scale:${scaleOf(this.bgGrass)} pos:${fmt(this.bgGrass?.x)},${fmt(this.bgGrass?.y)} cf:${filterOf(this.bgGrass)}`,
        `tile key:${keyOf(tile)} size:${sizeOf(tile)} scale:${scaleOf(tile)} pos:${fmt(tile?.x)},${fmt(tile?.y)} cf:${filterOf(tile)}`,
        `main id:${main?.id ?? '-'} scroll:${Math.round(main?.scrollX ?? 0)},${Math.round(main?.scrollY ?? 0)} zoom:${fmt(main?.zoom)}`
      ];

      const info = this.add.text(cx + 34, cy - 95, lines.join('\n'), {
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#ff00ff',
        backgroundColor: '#ffffff',
        padding: { x: 6, y: 4 }
      }).setDepth(999999).setScrollFactor(1);

      if (main?.id) {
        for (const obj of [info, ...(this.children?.list || [])]) {
          if (obj && typeof obj.cameraFilter === 'number') obj.cameraFilter &= ~main.id;
        }
      }
    } catch (err) {
      console.warn('[TDR2] Race diagnostic/follow patch failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    // Protección: si cualquier rutina corta el follow, reenganchar sin tocar el zoom dinámico.
    try {
      const main = this.cameras?.main;
      if (main && this.carBody?.scene && main._follow !== this.carBody) {
        main.startFollow(this.carBody, true, 0.12, 0.12);
      }
    } catch {}
  }
}
