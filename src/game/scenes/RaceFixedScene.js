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

      // La pieza inferior antigua era solo una maqueta visual con fondo negro.
      if (this.bottomBanner?.scene) this.bottomBanner.setVisible(false);

      this._fixedUiState = new WeakMap();
      this._fixedUiRoots = new Set();
      this._miniScreenPos = null;
      this._raceInfoHudState = null;

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

      const isRaceInfoHud = (obj) => obj && obj === this.raceInfoHud;

      const rememberFixedRoot = (obj, force = false) => {
        if (!obj || obj.visible === false) return;
        if (isMiniMarker(obj) || isRaceInfoHud(obj)) return;
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

      // =========================================================
      // HUD INFERIOR v1 — telemetría real, sin imágenes de fondo
      // =========================================================
      this._buildRaceInfoHud = () => {
        if (this.raceInfoHud?.scene) return;

        const panelW = 282;
        const panelH = 82;

        const c = this.add.container(0, 0).setDepth(2150);
        this.raceInfoHud = c;

        const bg = this.add.rectangle(0, 0, panelW, panelH, 0x07101b, 0.78)
          .setOrigin(0.5, 1)
          .setStrokeStyle(1, 0x63bfff, 0.50);

        const accent = this.add.rectangle(0, -panelH + 4, panelW - 10, 2, 0x38a9ff, 0.90)
          .setOrigin(0.5, 0);

        const speed = this.add.text(-25, -52, '000', {
          fontFamily: 'Orbitron, system-ui, sans-serif',
          fontSize: '36px',
          fontStyle: '900',
          color: '#F5FAFF'
        }).setOrigin(0.5, 0.5).setShadow(0, 2, '#000000', 3, false, true);

        const unit = this.add.text(38, -38, 'km/h', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
          fontSize: '11px',
          fontStyle: '700',
          color: '#7EC8FF'
        }).setOrigin(0, 0.5);

        const gearLabel = this.add.text(-120, -66, 'MARCHA', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
          fontSize: '9px',
          fontStyle: '700',
          color: '#7E8C99'
        }).setOrigin(0, 0.5);

        const gear = this.add.text(-92, -43, 'N', {
          fontFamily: 'Orbitron, system-ui, sans-serif',
          fontSize: '24px',
          fontStyle: '900',
          color: '#FFFFFF'
        }).setOrigin(0.5, 0.5);

        const surfaceLabel = this.add.text(66, -66, 'SUPERFICIE', {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
          fontSize: '9px',
          fontStyle: '700',
          color: '#7E8C99'
        }).setOrigin(0, 0.5);

        const surface = this.add.text(66, -43, 'PISTA', {
          fontFamily: 'Orbitron, system-ui, sans-serif',
          fontSize: '14px',
          fontStyle: '800',
          color: '#70FFB0'
        }).setOrigin(0, 0.5);

        const dividerL = this.add.rectangle(-61, -42, 1, 46, 0xffffff, 0.12);
        const dividerR = this.add.rectangle(59, -42, 1, 46, 0xffffff, 0.12);

        c.add([
          bg,
          accent,
          dividerL,
          dividerR,
          gearLabel,
          gear,
          speed,
          unit,
          surfaceLabel,
          surface
        ]);

        c._speedText = speed;
        c._gearText = gear;
        c._surfaceText = surface;
        c._panelW = panelW;
        c._panelH = panelH;

        allowMain(c);
        if (typeof c.setScrollFactor === 'function') c.setScrollFactor(1, 1);

        this._layoutRaceInfoHud?.();
      };

      this._layoutRaceInfoHud = () => {
        const c = this.raceInfoHud;
        if (!c?.scene) return;

        const vw = Math.max(1, Number(this.scale?.width || 1));
        const vh = Math.max(1, Number(this.scale?.height || 1));

        // Centro inferior con margen suficiente para el home indicator.
        this._raceInfoHudState = {
          screenX: vw * 0.5,
          screenY: vh - 14,
          scale: Math.min(1, Math.max(0.82, vw / 900))
        };
      };

      this._pinRaceInfoHud = () => {
        const cam = this.cameras?.main;
        const c = this.raceInfoHud;
        const state = this._raceInfoHudState;
        if (!cam || !c?.scene || !state) return;

        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(state.screenX, state.screenY);
        c.setPosition(world.x, world.y);
        c.setScale(state.scale / zoom);
      };

      this._updateRaceInfoHud = () => {
        const c = this.raceInfoHud;
        const body = this.carBody;
        if (!c?.scene || !body?.body?.velocity) return;

        const vx = Number(body.body.velocity.x || 0);
        const vy = Number(body.body.velocity.y || 0);
        const pxPerSec = Math.hypot(vx, vy);
        const kmh = Math.max(0, pxPerSec * 0.185);

        c._speedText?.setText(String(Math.round(kmh)).padStart(3, '0'));

        const rot = Number(body.rotation || 0);
        const forwardSpeed = vx * Math.cos(rot) + vy * Math.sin(rot);

        let gear = 'N';
        if (forwardSpeed < -3) gear = 'R';
        else if (kmh >= 3 && kmh < 35) gear = '1';
        else if (kmh < 65) gear = kmh >= 3 ? '2' : 'N';
        else if (kmh < 95) gear = '3';
        else if (kmh < 125) gear = '4';
        else gear = '5';
        c._gearText?.setText(gear);

        const surf = this._surface || 'TRACK';
        if (surf === 'GRASS') {
          c._surfaceText?.setText('CÉSPED').setColor('#FFD56A');
        } else if (surf === 'OFF') {
          c._surfaceText?.setText('FUERA').setColor('#FF7373');
        } else {
          c._surfaceText?.setText('PISTA').setColor('#70FFB0');
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

        const targetW = 27;
        const targetH = 10.8;
        const sw = car.width || 1;
        const sh = car.height || 1;
        const baseScale = Math.min(targetW / sw, targetH / sh);
        car.setScale(baseScale / zoom);

        if (shadow?.scene) {
          shadow.setPosition(world.x, world.y);
          shadow.setScale(1 / zoom);
        }
      };

      this._buildRaceInfoHud();
      this._discoverFixedHud();
      this._pinHudToScreen();
      this._pinMinimapMarker();
      this._pinRaceInfoHud();
      this._updateRaceInfoHud();

      this.scale.off('resize', this._onResizeRaceInfoHud);
      this._onResizeRaceInfoHud = () => {
        this._layoutRaceInfoHud?.();
        this._pinRaceInfoHud?.();
      };
      this.scale.on('resize', this._onResizeRaceInfoHud);

      this.time.delayedCall(0, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
        this._layoutRaceInfoHud?.();
        this._pinRaceInfoHud?.();
      });
      this.time.delayedCall(250, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
        this._layoutRaceInfoHud?.();
        this._pinRaceInfoHud?.();
      });
      this.time.delayedCall(1000, () => {
        this._discoverFixedHud?.();
        this._pinHudToScreen?.();
        this._pinMinimapMarker?.();
        this._layoutRaceInfoHud?.();
        this._pinRaceInfoHud?.();
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
      this._pinRaceInfoHud?.();
      this._updateRaceInfoHud?.();
    } catch (err) {
      console.warn('[TDR2] Race camera/HUD pinning failed', err);
    }
  }
}
