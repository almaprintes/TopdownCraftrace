import { RaceScene as CompetitionRaceScene } from './RaceCompetitionHudScene.js';

// Minimap premium reconstruido desde cero dentro de su propio panel.
// El trazado, meta y marcador comparten el mismo sistema local, evitando
// los desfases del minimapa heredado.
export class RaceScene extends CompetitionRaceScene {
  create() {
    super.create();

    // La caja _dbgText es una herramienta histórica de desarrollo. En carrera
    // normal no debe aparecer aunque alguna comprobación interna encuentre un
    // asset __MISSING. Dejamos la consola disponible pero retiramos el HUD.
    try {
      if (this._dbgText?.scene) this._dbgText.setVisible(false);
      this._dbgSet = () => {};
    } catch {}

    try {
      const main = this.cameras?.main;
      if (!main) return;

      // Ocultar todo el minimapa heredado y cualquier marco anterior.
      if (this.minimapSportFrame?.scene) this.minimapSportFrame.setVisible(false);
      if (this.minimapWideFrame?.scene) this.minimapWideFrame.setVisible(false);
      for (const obj of [
        this.minimap?.gfx,
        this.minimap?.flag,
        this.minimap?.shadow,
        this.minimap?.car
      ]) {
        if (obj?.scene) obj.setVisible(false);
      }

      const frameW = 184;
      const frameH = 112;
      const cut = 11;
      const inner = { x: 17, y: 19, w: frameW - 34, h: frameH - 34 };

      const panel = this.add.container(0, 0).setDepth(2050);
      this.minimapUnifiedPanel = panel;

      const shell = this.add.graphics();

      // Sombra exterior.
      shell.fillStyle(0x000000, 0.28);
      shell.beginPath();
      shell.moveTo(cut + 3, 4);
      shell.lineTo(frameW - cut + 3, 4);
      shell.lineTo(frameW + 3, cut + 4);
      shell.lineTo(frameW + 3, frameH - cut + 4);
      shell.lineTo(frameW - cut + 3, frameH + 4);
      shell.lineTo(cut + 3, frameH + 4);
      shell.lineTo(3, frameH - cut + 4);
      shell.lineTo(3, cut + 4);
      shell.closePath();
      shell.fillPath();

      // Cuerpo: misma familia visual que GAS/FRENO y HUD inferior.
      shell.fillStyle(0x061019, 0.80);
      shell.lineStyle(2, 0x5bdcff, 0.78);
      shell.beginPath();
      shell.moveTo(cut, 0);
      shell.lineTo(frameW - cut, 0);
      shell.lineTo(frameW, cut);
      shell.lineTo(frameW, frameH - cut);
      shell.lineTo(frameW - cut, frameH);
      shell.lineTo(cut, frameH);
      shell.lineTo(0, frameH - cut);
      shell.lineTo(0, cut);
      shell.closePath();
      shell.fillPath();
      shell.strokePath();

      // Borde interior y rail superior.
      shell.lineStyle(1, 0xa4edff, 0.24);
      shell.strokeRoundedRect(7, 7, frameW - 14, frameH - 14, 4);

      const topRail = this.add.rectangle(22, 8, frameW - 44, 1, 0x6ee6ff, 0.78)
        .setOrigin(0, 0);
      const topGlow = this.add.rectangle(frameW * 0.5 - 31, 7, 62, 2, 0xa7f1ff, 0.20)
        .setOrigin(0, 0);
      const leftAccent = this.add.rectangle(7, 34, 2, 24, 0x39ff9a, 0.48)
        .setOrigin(0, 0);

      const detail = this.add.graphics();
      detail.lineStyle(1, 0x70dfff, 0.32);
      detail.beginPath();
      detail.moveTo(17, 18); detail.lineTo(35, 18);
      detail.moveTo(17, 21); detail.lineTo(28, 21);
      detail.moveTo(frameW - 35, frameH - 15); detail.lineTo(frameW - 16, frameH - 15);
      detail.moveTo(frameW - 27, frameH - 12); detail.lineTo(frameW - 16, frameH - 12);
      detail.strokePath();

      // Fondo interior ligeramente diferenciado.
      const innerBg = this.add.rectangle(inner.x, inner.y, inner.w, inner.h, 0x02080d, 0.20)
        .setOrigin(0, 0);

      // Construimos transform world -> panel a partir del centerline REAL.
      const raw = Array.isArray(this.track?.meta?.centerline)
        ? this.track.meta.centerline
        : [];

      const worldPts = raw.map((p) => {
        if (Array.isArray(p)) return { x: Number(p[0]), y: Number(p[1]) };
        return { x: Number(p?.x), y: Number(p?.y) };
      }).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of worldPts) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }

      const worldW = Math.max(1, maxX - minX);
      const worldH = Math.max(1, maxY - minY);
      const fitScale = Math.min(inner.w / worldW, inner.h / worldH) * 0.91;
      const drawW = worldW * fitScale;
      const drawH = worldH * fitScale;
      const ox = inner.x + (inner.w - drawW) * 0.5 - minX * fitScale;
      const oy = inner.y + (inner.h - drawH) * 0.5 - minY * fitScale;

      this._minimapUnifiedTransform = { minX, minY, maxX, maxY, fitScale, ox, oy };

      const mapGfx = this.add.graphics();
      if (worldPts.length >= 2) {
        // Halo muy tenue y línea principal blanca, como en el mockup.
        mapGfx.lineStyle(4, 0x74dfff, 0.10);
        mapGfx.beginPath();
        worldPts.forEach((p, i) => {
          const x = ox + p.x * fitScale;
          const y = oy + p.y * fitScale;
          if (i === 0) mapGfx.moveTo(x, y); else mapGfx.lineTo(x, y);
        });
        mapGfx.strokePath();

        mapGfx.lineStyle(2, 0xf2f5f7, 0.82);
        mapGfx.beginPath();
        worldPts.forEach((p, i) => {
          const x = ox + p.x * fitScale;
          const y = oy + p.y * fitScale;
          if (i === 0) mapGfx.moveTo(x, y); else mapGfx.lineTo(x, y);
        });
        mapGfx.strokePath();
      }

      // Meta: pequeña bandera de damero sobre el punto real de finish.
      const finish = this.track?.meta?.finish || this.track?.meta?.finishLine;
      const finishMid = finish?.a && finish?.b
        ? { x: (finish.a.x + finish.b.x) * 0.5, y: (finish.a.y + finish.b.y) * 0.5 }
        : (worldPts[0] || { x: minX, y: minY });
      const fx = ox + finishMid.x * fitScale;
      const fy = oy + finishMid.y * fitScale;
      const flag = this.add.graphics();
      const sq = 3;
      for (let yy = 0; yy < 2; yy++) {
        for (let xx = 0; xx < 3; xx++) {
          flag.fillStyle(((xx + yy) % 2) ? 0x11151a : 0xf6f7f8, 0.95);
          flag.fillRect(fx - 4 + xx * sq, fy - 3 + yy * sq, sq, sq);
        }
      }

      // Marcador propio: independiente del minimapa viejo.
      const marker = this.add.graphics();
      marker.fillStyle(0x05131c, 0.95);
      marker.fillCircle(0, 0, 5);
      marker.lineStyle(2, 0xffffff, 0.95);
      marker.strokeCircle(0, 0, 4);
      marker.fillStyle(0x63ffd1, 1);
      marker.fillTriangle(0, -5, -2.4, 1.8, 2.4, 1.8);
      this.minimapUnifiedMarker = marker;

      panel.add([shell, innerBg, topRail, topGlow, leftAccent, detail, mapGfx, flag, marker]);

      if (typeof panel.cameraFilter === 'number') panel.cameraFilter &= ~main.id;
      for (const child of panel.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      panel.setScrollFactor(1, 1);

      this._layoutMinimapUnified = () => {
        const vw = Math.max(1, Number(this.scale?.width || 1));
        this._minimapUnifiedState = {
          screenX: vw - frameW - 12,
          screenY: 24,
          scale: 1
        };
      };

      this._pinMinimapUnified = () => {
        const cam = this.cameras?.main;
        const s = this._minimapUnifiedState;
        const p = this.minimapUnifiedPanel;
        if (!cam || !s || !p?.scene) return;
        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(s.screenX, s.screenY);
        p.setPosition(world.x, world.y);
        p.setScale(s.scale / zoom);
      };

      this._updateMinimapUnifiedMarker = () => {
        const m = this.minimapUnifiedMarker;
        const tr = this._minimapUnifiedTransform;
        const body = this.carBody || this.car;
        if (!m?.scene || !tr || !body) return;

        // El marcador comparte el mismo transform mundo -> minimapa, así que la
        // posición real del coche ya es suficiente. Antes proyectábamos contra
        // TODOS los segmentos de la centerline en cada frame, creando picos de
        // CPU/frame-time aunque el FPS medio pareciera razonable.
        const px = Number(body.x);
        const py = Number(body.y);
        if (!Number.isFinite(px) || !Number.isFinite(py)) return;

        const x = tr.ox + px * tr.fitScale;
        const y = tr.oy + py * tr.fitScale;
        m.setPosition(x, y);
        m.setRotation(Number(body.rotation || 0));
      };

      this._layoutMinimapUnified();
      this._pinMinimapUnified();
      this._updateMinimapUnifiedMarker();

      this.scale.off('resize', this._onResizeMinimapUnified);
      this._onResizeMinimapUnified = () => {
        this._layoutMinimapUnified?.();
        this._pinMinimapUnified?.();
      };
      this.scale.on('resize', this._onResizeMinimapUnified);
    } catch (err) {
      console.warn('[TDR2] Unified minimap rebuild failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);
    try {
      this._pinMinimapUnified?.();
      this._updateMinimapUnifiedMarker?.();
    } catch (err) {
      console.warn('[TDR2] Unified minimap update failed', err);
    }
  }
}
