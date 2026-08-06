import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Parche aislado de diagnóstico/corrección.
// La lógica de físicas y el zoom dinámico siguen viviendo en RaceScene original.
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (main) {
        main.setVisible(true);
        main.setAlpha(1);
      }

      // Mientras aislamos el mundo dejamos la UI camera fuera de la ecuación.
      if (this.uiCam) this.uiCam.setVisible(false);

      const cx = Number(this.carBody?.x ?? this.car?.x ?? 400);
      const cy = Number(this.carBody?.y ?? this.car?.y ?? 400);

      // Proxy visual del coche: seguirá SIEMPRE la posición física real.
      this._worldProbe = this.add.rectangle(cx, cy, 42, 42, 0xff00ff, 1)
        .setDepth(999999)
        .setScrollFactor(1);

      const carSprite = this.carRig?.list?.[0] || null;
      const fmt = (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '-';
      const keyOf = (o) => o?.texture?.key || o?.frame?.texture?.key || '-';

      this._worldInfo = this.add.text(cx + 34, cy - 70,
        `carId:${this.carId ?? '-'}\n` +
        `sprite:${keyOf(carSprite)} vis:${carSprite?.visible === false ? 'N' : 'Y'} a:${fmt(carSprite?.alpha)}\n` +
        `CAM MANUAL FOLLOW TEST`, {
          fontFamily: 'monospace',
          fontSize: '13px',
          color: '#ff00ff',
          backgroundColor: '#ffffff',
          padding: { x: 6, y: 4 }
        })
        .setDepth(999999)
        .setScrollFactor(1);

      if (main?.id) {
        for (const obj of [this._worldProbe, this._worldInfo]) {
          if (obj && typeof obj.cameraFilter === 'number') obj.cameraFilter &= ~main.id;
        }
      }
    } catch (err) {
      console.warn('[TDR2] Manual camera diagnostic create failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      const body = this.carBody;
      const main = this.cameras?.main;
      if (!body?.scene || !main) return;

      // El proxy se mueve con el coche físico real.
      if (this._worldProbe?.scene) {
        this._worldProbe.setPosition(body.x, body.y);
      }
      if (this._worldInfo?.scene) {
        this._worldInfo.setPosition(body.x + 34, body.y - 70);
      }

      // Seguimiento determinista: no depende de Phaser startFollow().
      // El zoom dinámico ya ha sido calculado por super.update().
      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }
    } catch (err) {
      console.warn('[TDR2] Manual camera follow failed', err);
    }
  }
}
