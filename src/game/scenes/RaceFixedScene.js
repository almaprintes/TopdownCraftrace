import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Corrección estable de carrera para iOS/Pages:
// - una única cámara visible evita que la cámara UI tape el mundo en negro
// - la cámara principal dibuja también el HUD (los elementos UI ya usan scrollFactor 0)
// - seguimiento manual conserva el zoom dinámico original
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      main.setVisible(true);
      main.setAlpha(1);

      // La segunda cámara provocaba el framebuffer negro en iOS/Safari.
      // La dejamos fuera y usamos la principal para mundo + HUD.
      if (this.uiCam) this.uiCam.setVisible(false);

      // RaceScene original separaba mundo/UI mediante cameraFilter.
      // Al usar una sola cámara debemos permitir que main dibuje todo.
      const allowMain = (obj) => {
        if (!obj) return;
        if (typeof obj.cameraFilter === 'number') {
          obj.cameraFilter &= ~main.id;
        }

        const children = obj.list || obj.getAll?.();
        if (Array.isArray(children)) {
          for (const child of children) allowMain(child);
        }
      };

      for (const obj of this.children?.list || []) allowMain(obj);

      // Reaplicar una vez después de que callbacks diferidos creen HUD/semáforo.
      this.time.delayedCall(0, () => {
        for (const obj of this.children?.list || []) allowMain(obj);
      });
      this.time.delayedCall(300, () => {
        for (const obj of this.children?.list || []) allowMain(obj);
      });
    } catch (err) {
      console.warn('[TDR2] Single-camera race setup failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      const body = this.carBody;
      const main = this.cameras?.main;
      if (!body?.scene || !main) return;

      // Seguimiento determinista. El zoom dinámico se calcula en super.update().
      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }

      // Si algún bloque original vuelve a marcar UI para ignorar main,
      // lo corregimos solo para objetos fijos (HUD/controles/modal).
      const restoreFixedUi = (obj, parentFixed = false) => {
        if (!obj) return;
        const fixed = parentFixed ||
          (obj.scrollFactorX === 0 && obj.scrollFactorY === 0);

        if (fixed && typeof obj.cameraFilter === 'number') {
          obj.cameraFilter &= ~main.id;
        }

        const children = obj.list || obj.getAll?.();
        if (Array.isArray(children)) {
          for (const child of children) restoreFixedUi(child, fixed);
        }
      };

      for (const obj of this.children?.list || []) restoreFixedUi(obj, false);
    } catch (err) {
      console.warn('[TDR2] Single-camera race follow failed', err);
    }
  }
}
