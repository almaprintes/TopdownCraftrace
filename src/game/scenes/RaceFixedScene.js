import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Corrección iOS/Safari:
// - una sola cámara visible evita el framebuffer negro de uiCam
// - mundo/coche conservan el zoom dinámico original
// - HUD/controles/minimapa se compensan contra ese zoom para quedar fijos en pantalla
export class RaceScene extends OriginalRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      main.setVisible(true);
      main.setAlpha(1);
      if (this.uiCam) this.uiCam.setVisible(false);

      this._fixedUiState = new WeakMap();

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

        // No recuperamos fondos/overlays de pantalla completa.
        return !(w >= sw * 0.82 && h >= sh * 0.82);
      };

      this._restoreHudToMain = () => {
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

        for (const obj of this.children?.list || []) {
          if (isSafeFixedUi(obj)) allowMain(obj);
        }
      };

      // Compensa la transformación de la cámara sobre UI con scrollFactor 0.
      // Guardamos la primera posición/escala real de cada elemento y su zoom de referencia.
      this._freezeHudAgainstZoom = () => {
        const cam = this.cameras?.main;
        if (!cam) return;

        const zoom = Number(cam.zoom || 1);
        const cx = Number(cam.width || this.scale?.width || 0) * 0.5;
        const cy = Number(cam.height || this.scale?.height || 0) * 0.5;

        for (const obj of this.children?.list || []) {
          if (!isSafeFixedUi(obj)) continue;
          if (!Number.isFinite(obj.x) || !Number.isFinite(obj.y)) continue;

          let state = this._fixedUiState.get(obj);
          if (!state) {
            state = {
              x: obj.x,
              y: obj.y,
              scaleX: Number.isFinite(obj.scaleX) ? obj.scaleX : 1,
              scaleY: Number.isFinite(obj.scaleY) ? obj.scaleY : 1,
              zoom: zoom || 1
            };
            this._fixedUiState.set(obj, state);
          }

          const k = state.zoom / Math.max(0.001, zoom);

          // Mantener el mismo punto de pantalla aunque la cámara haga zoom alrededor del centro.
          obj.x = cx + (state.x - cx) * k;
          obj.y = cy + (state.y - cy) * k;

          if (typeof obj.setScale === 'function') {
            obj.setScale(state.scaleX * k, state.scaleY * k);
          } else {
            if (Number.isFinite(obj.scaleX)) obj.scaleX = state.scaleX * k;
            if (Number.isFinite(obj.scaleY)) obj.scaleY = state.scaleY * k;
          }
        }
      };

      this._restoreHudToMain();
      this.time.delayedCall(0, this._restoreHudToMain);
      this.time.delayedCall(250, this._restoreHudToMain);
      this.time.delayedCall(1000, this._restoreHudToMain);
    } catch (err) {
      console.warn('[TDR2] Single-camera HUD setup failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);

    try {
      const body = this.carBody;
      const main = this.cameras?.main;
      if (!body?.scene || !main) return;

      // Solo el mundo sigue al coche. El zoom dinámico original permanece intacto.
      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }

      this._restoreHudToMain?.();
      this._freezeHudAgainstZoom?.();
    } catch (err) {
      console.warn('[TDR2] Race camera/HUD compensation failed', err);
    }
  }
}
