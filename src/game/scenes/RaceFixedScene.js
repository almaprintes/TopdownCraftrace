import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Corrección estable de carrera para iOS/Safari:
// - uiCam queda desactivada porque provoca el framebuffer negro
// - main dibuja el mundo
// - solo recuperamos HUD/controles seguros, nunca overlays fullscreen
// - el seguimiento manual conserva el zoom dinámico original
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      main.setVisible(true);
      main.setAlpha(1);
      if (this.uiCam) this.uiCam.setVisible(false);

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

      const isSafeFixedUi = (obj) => {
        if (!obj || obj.visible === false) return false;
        if (!(obj.scrollFactorX === 0 && obj.scrollFactorY === 0)) return false;

        const sw = Number(this.scale?.width || 1);
        const sh = Number(this.scale?.height || 1);
        const w = Number(obj.displayWidth ?? obj.width ?? 0);
        const h = Number(obj.displayHeight ?? obj.height ?? 0);

        // Nunca devolver a main un overlay/panel que cubra prácticamente toda la pantalla.
        // Éste era el origen del negro al desbloquear toda la UI indiscriminadamente.
        const fullscreenLike = w >= sw * 0.82 && h >= sh * 0.82;
        return !fullscreenLike;
      };

      const restoreHud = () => {
        // Grupos explícitos conocidos de la carrera.
        for (const ref of [
          this.hud,
          this.touchUI,
          this.ttHud,
          this.ttPanel,
          this.minimap,
          this._startModal,
          this._startModalPanel,
          this._startModalLights,
          this._startModalText,
          this._startModalTitle
        ]) {
          allowMain(ref);
        }

        // Textos, botones y bandas fijas pequeñas que no formen parte de esos contenedores.
        for (const obj of this.children?.list || []) {
          if (isSafeFixedUi(obj)) allowMain(obj);
        }
      };

      restoreHud();
      this.time.delayedCall(0, restoreHud);
      this.time.delayedCall(250, restoreHud);
      this.time.delayedCall(1000, restoreHud);
    } catch (err) {
      console.warn('[TDR2] Safe single-camera HUD setup failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      const body = this.carBody;
      const main = this.cameras?.main;
      if (!body?.scene || !main) return;

      // Seguimiento determinista. El zoom dinámico sigue calculándose en RaceScene original.
      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }
    } catch (err) {
      console.warn('[TDR2] Manual race camera follow failed', err);
    }
  }
}
