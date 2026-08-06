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
      this._miniScreenPos = null;

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

      const isMiniMarker = (obj) => (
        obj && (obj === this.minimap?.car || obj === this.minimap?.shadow)
      );

      const rememberFixedRoot = (obj, force = false) => {
        if (!obj || obj.visible === false) return;
        if (isMiniMarker(obj)) return;
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

          if (typeof obj.setScrollFactor === 'function') obj.setScrollFactor(1, 1);
          else {
            obj.scrollFactorX = 1;
            obj.scrollFactorY = 1;
          }
        }
      };

      this._prepareMinimapMarker = () => {
        for (const obj of [this.minimap?.car, this.minimap?.shadow]) {
          if (!obj?.scene) continue;
          allowMain(obj);
          if (typeof obj.setScrollFactor === 'function') obj.setScrollFactor(1, 1);
          else {
            obj.scrollFactorX = 1;
            obj.scrollFactorY = 1;
          }
        }
      };

      this._discoverFixedHud = () => {
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

        for (const obj of this.children?.list || []) {
          rememberFixedRoot(obj, false);
        }

        this._prepareMinimapMarker?.();
      };

      this._pinHudToScreen = () => {
        const cam = this.cameras?.main;
        if (!cam) return;

        const zoom = Math.max(0.001, Number(cam.zoom || 1));

        for (const obj of this._fixedUiRoots || []) {
          if (!obj?.scene) continue;
          const state = this._fixedUiState.get(obj);
          if (!state) continue;

          const world = cam.getWorldPoint(state.screenX, state.screenY);
          obj.x = world.x;
          obj.y = world.y;

          if (typeof obj.setScale === 'function') {
            obj.setScale(state.scaleX / zoom, state.scaleY / zoom);
          } else {
            obj.scaleX = state.scaleX / zoom;
            obj.scaleY = state.scaleY / zoom;
          }
        }
      };

      this._pinMinimapMarker = () => {
        const cam = this.cameras?.main;
        const mini = this.minimap;
        const car = mini?.car;
        const shadow = mini?.shadow;
        const pts = mini?.points;
        const body = this.carBody;

        if (!cam || !car?.scene || !body?.scene || !Array.isArray(pts) || pts.length < 2) return;

        const proj = this._computeCenterlineProjection?.(body.x, body.y);
        if (!proj) return;

        const segIndex = Math.max(0, Math.min(pts.length - 2, Number(proj.segIndex || 0)));
        const segT = Math.max(0, Math.min(1, Number(proj.segT || 0)));
        const a = pts[segIndex];
        const b = pts[segIndex + 1] || a;
        if (!a || !b) return;

        const targetX = a.x + (b.x - a.x) * segT;
        const targetY = a.y + (b.y - a.y) * segT;

        if (!this._miniScreenPos) {
          this._miniScreenPos = { x: targetX, y: targetY };
        } else {
          this._miniScreenPos.x += (targetX - this._miniScreenPos.x) * 0.42;
          this._miniScreenPos.y += (targetY - this._miniScreenPos.y) * 0.42;
        }

        const world = cam.getWorldPoint(this._miniScreenPos.x, this._miniScreenPos.y);
        const zoom = Math.max(0.001, Number(cam.zoom || 1));

        car.setPosition(world.x, world.y);
        car.rotation = body.rotation + (this._carVisualRotOffset || 0);

        const targetW = 20;
        const targetH = 8;
        const sw = car.width || 1;
        const sh = car.height || 1;
        const baseScale = Math.min(targetW / sw, targetH / sh);
        car.setScale(baseScale / zoom);

        if (shadow?.scene) {
          shadow.setPosition(world.x, world.y);
          shadow.setScale(1 / zoom);
        }
      };

      this._discoverFixedHud();
      this._pinHudToScreen();
      this._pinMinimapMarker();

      this.time.delayedCall(0, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
      });
      this.time.delayedCall(250, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
      });
      this.time.delayedCall(1000, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
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

      if (!this._mapZoomOn) {
        main.centerOn(body.x, body.y);
      }

      this._discoverFixedHud?.();
      this._pinHudToScreen?.();
      this._pinMinimapMarker?.();
    } catch (err) {
      console.warn('[TDR2] Race camera/HUD pinning failed', err);
    }
  }
}
