import { RaceScene as OriginalRaceScene } from './RaceScene.js';

// Corrección iOS/Safari:
// - una sola cámara visible evita el framebuffer negro de uiCam
// - mundo/coche conservan el zoom dinámico original
// - HUD/controles/minimapa quedan anclados a píxeles de pantalla
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
      this._fixedUiRoots = new Set();

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

      const isFullscreenLike = (obj) => {
        const sw = Number(this.scale?.width || 1);
        const sh = Number(this.scale?.height || 1);
        const w = Number(obj?.displayWidth ?? obj?.width ?? 0);
        const h = Number(obj?.displayHeight ?? obj?.height ?? 0);
        return w >= sw * 0.82 && h >= sh * 0.82;
      };

      const rememberFixedRoot = (obj, force = false) => {
        if (!obj || obj.visible === false) return;
        if (!Number.isFinite(obj.x) || !Number.isFinite(obj.y)) return;

        const fixed = force || (obj.scrollFactorX === 0 && obj.scrollFactorY === 0);
        if (!fixed) return;
        if (!force && isFullscreenLike(obj)) return;

        allowMain(obj);
        this._fixedUiRoots.add(obj);

        if (!this._fixedUiState.has(obj)) {
          this._fixedUiState.set(obj, {
            screenX: Number(obj.x),
            screenY: Number(obj.y),
            scaleX: Number.isFinite(obj.scaleX) ? Number(obj.scaleX) : 1,
            scaleY: Number.isFinite(obj.scaleY) ? Number(obj.scaleY) : 1
          });

          // A partir de aquí lo tratamos como objeto de mundo colocado a partir
          // de una coordenada de pantalla. Así getWorldPoint() lo deja inmóvil.
          if (typeof obj.setScrollFactor === 'function') obj.setScrollFactor(1, 1);
          else {
            obj.scrollFactorX = 1;
            obj.scrollFactorY = 1;
          }
        }
      };

      this._discoverFixedHud = () => {
        // Raíces conocidas. Se fuerzan aunque sean containers sin scrollFactor explícito.
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
          rememberFixedRoot(ref, true);
        }

        // Elementos independientes de interfaz creados directamente en la Scene.
        for (const obj of this.children?.list || []) {
          rememberFixedRoot(obj, false);
        }
      };

      this._pinHudToScreen = () => {
        const cam = this.cameras?.main;
        if (!cam) return;

        const zoom = Math.max(0.001, Number(cam.zoom || 1));

        for (const obj of this._fixedUiRoots || []) {
          if (!obj?.scene) continue;
          const state = this._fixedUiState.get(obj);
          if (!state) continue;

          // Phaser calcula la coordenada de mundo que corresponde exactamente
          // al píxel de pantalla original del HUD para el scroll/zoom actuales.
          const world = cam.getWorldPoint(state.screenX, state.screenY);
          obj.x = world.x;
          obj.y = world.y;

          // Neutralizar solo el escalado de la cámara.
          if (typeof obj.setScale === 'function') {
            obj.setScale(state.scaleX / zoom, state.scaleY / zoom);
          } else {
            obj.scaleX = state.scaleX / zoom;
            obj.scaleY = state.scaleY / zoom;
          }
        }
      };

      this._discoverFixedHud();
      this._pinHudToScreen();

      // Algunos bloques (semáforo/controles) nacen de callbacks diferidos.
      this.time.delayedCall(0, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
      });
      this.time.delayedCall(250, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
      });
      this.time.delayedCall(1000, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
      });
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

      // Mundo/coche: seguimiento + zoom dinámico original intactos.
      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }

      // UI: detectar elementos tardíos y recolocarlos en sus píxeles fijos.
      this._discoverFixedHud?.();
      this._pinHudToScreen?.();
    } catch (err) {
      console.warn('[TDR2] Race camera/HUD pinning failed', err);
    }
  }
}
