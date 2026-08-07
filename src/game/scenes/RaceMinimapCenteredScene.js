import { RaceScene as CompetitionRaceScene } from './RaceCompetitionHudScene.js';

// Minimap premium ancho: aproxima su módulo al ancho visual de los pedales
// y centra ópticamente el trazado dentro de la nueva caja sin tocar su lógica.
export class RaceScene extends CompetitionRaceScene {
  create() {
    super.create();

    try {
      const main = this.cameras?.main;
      if (!main) return;

      // Ocultamos el marco premium anterior, pero conservamos íntegro el
      // minimapa real (gfx, bandera, puntos y marcador móvil).
      if (this.minimapSportFrame?.scene) this.minimapSportFrame.setVisible(false);

      const frameW = 184;
      const frameH = 108;
      const cut = 11;

      const frame = this.add.container(0, 0).setDepth(1998);
      this.minimapWideFrame = frame;

      const shell = this.add.graphics();

      // Sombra exterior.
      shell.fillStyle(0x000000, 0.26);
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

      // Cuerpo técnico oscuro, misma familia que GAS/FRENO y HUD inferior.
      shell.fillStyle(0x061019, 0.76);
      shell.lineStyle(2, 0x5bdcff, 0.76);
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

      // Borde interior de profundidad.
      shell.lineStyle(1, 0xa4edff, 0.24);
      shell.beginPath();
      shell.moveTo(cut + 6, 7);
      shell.lineTo(frameW - cut - 6, 7);
      shell.lineTo(frameW - 7, cut + 6);
      shell.lineTo(frameW - 7, frameH - cut - 6);
      shell.lineTo(frameW - cut - 6, frameH - 7);
      shell.lineTo(cut + 6, frameH - 7);
      shell.lineTo(7, frameH - cut - 6);
      shell.lineTo(7, cut + 6);
      shell.closePath();
      shell.strokePath();

      const topRail = this.add.rectangle(22, 8, frameW - 44, 1, 0x6ee6ff, 0.76)
        .setOrigin(0, 0);
      const topGlow = this.add.rectangle(frameW * 0.5 - 30, 7, 60, 2, 0xa7f1ff, 0.22)
        .setOrigin(0, 0);
      const leftAccent = this.add.rectangle(7, 33, 2, 24, 0x39ff9a, 0.48)
        .setOrigin(0, 0);

      const detail = this.add.graphics();
      detail.lineStyle(1, 0x70dfff, 0.34);
      detail.beginPath();
      detail.moveTo(17, 18); detail.lineTo(34, 18);
      detail.moveTo(17, 21); detail.lineTo(27, 21);
      detail.moveTo(frameW - 34, frameH - 15); detail.lineTo(frameW - 16, frameH - 15);
      detail.moveTo(frameW - 27, frameH - 12); detail.lineTo(frameW - 16, frameH - 12);
      detail.strokePath();

      frame.add([shell, topRail, topGlow, leftAccent, detail]);
      if (typeof frame.cameraFilter === 'number') frame.cameraFilter &= ~main.id;
      for (const child of frame.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      frame.setScrollFactor(1, 1);

      this._layoutMinimapWideFrame = () => {
        const vw = Math.max(1, Number(this.scale?.width || 1));
        this._minimapWideState = {
          screenX: vw - frameW - 12,
          screenY: 26,
          scale: 1
        };
      };

      this._pinMinimapWideFrame = () => {
        const cam = this.cameras?.main;
        const s = this._minimapWideState;
        const f = this.minimapWideFrame;
        if (!cam || !s || !f?.scene) return;
        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(s.screenX, s.screenY);
        f.setPosition(world.x, world.y);
        f.setScale(s.scale / zoom);
      };

      // Después de los ajustes heredados, recentramos el contenido REAL usando
      // sus bounds actuales. No escalamos el trazado: la caja más ancha le da
      // respiración y conserva la legibilidad del coche y la meta.
      const centerContent = () => {
        if (this._minimapWideContentCentered) return;
        const mini = this.minimap;
        const s = this._minimapWideState;
        const pts = Array.isArray(mini?.points) ? mini.points : [];
        if (!mini || !s || pts.length < 2) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
          if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          minX = Math.min(minX, p.x);
          minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x);
          maxY = Math.max(maxY, p.y);
        }
        if (![minX, minY, maxX, maxY].every(Number.isFinite)) return;

        const contentCX = (minX + maxX) * 0.5;
        const contentCY = (minY + maxY) * 0.5;

        // Área útil: dejamos margen extra arriba para la rail decorativa.
        const targetCX = s.screenX + frameW * 0.5;
        const targetCY = s.screenY + 57;
        const dx = targetCX - contentCX;
        const dy = targetCY - contentCY;

        for (const p of pts) {
          if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          p.x += dx;
          p.y += dy;
        }

        for (const obj of [mini.gfx, mini.flag]) {
          if (!obj?.scene) continue;
          obj.x = Number(obj.x || 0) + dx;
          obj.y = Number(obj.y || 0) + dy;
        }

        this._miniScreenPos = null;
        this._minimapWideContentCentered = true;
      };

      this._layoutMinimapWideFrame();
      this._pinMinimapWideFrame();
      centerContent();

      this.scale.off('resize', this._onResizeMinimapWide);
      this._onResizeMinimapWide = () => {
        this._layoutMinimapWideFrame?.();
        this._pinMinimapWideFrame?.();
      };
      this.scale.on('resize', this._onResizeMinimapWide);

      this.time.delayedCall(0, centerContent);
      this.time.delayedCall(120, centerContent);
    } catch (err) {
      console.warn('[TDR2] Wide minimap frame failed', err);
    }
  }

  update(time, delta) {
    super.update(time, delta);
    try {
      this._pinMinimapWideFrame?.();
    } catch (err) {
      console.warn('[TDR2] Wide minimap pin failed', err);
    }
  }
}
