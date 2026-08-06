import { RaceScene as StableRaceScene } from './RaceFixedScene.js';

// Capa visual v2 del HUD inferior.
// Mantiene intacta toda la lógica estable de RaceFixedScene y solo sustituye
// presentación de HUD y marcadores visuales de pista.
export class RaceScene extends StableRaceScene {
  create() {
    super.create();

    try {
      // Ocultamos únicamente la presentación v1. Su lógica sigue actualizando
      // sus valores y la usamos como fuente de datos estable.
      if (this.raceInfoHud?.scene) this.raceInfoHud.setVisible(false);

      const main = this.cameras?.main;
      if (!main) return;

      // =========================================================
      // MARCAS DE PISTA v2 — solo visual, lógica intacta
      // =========================================================
      // Apagamos los gráficos provisionales originales. Las puertas lógicas
      // this.finishLine / this.checkpoints siguen siendo exactamente las mismas.
      for (const obj of [this.finishLineDebug, this.finishGfx, this.cpGfx]) {
        if (obj?.scene) obj.setVisible(false);
      }

      const centerline = (
        this.track?.geom?.center ||
        this.track?.meta?.centerline ||
        []
      );

      const ptXY = (p) => {
        if (!p) return null;
        if (Array.isArray(p) && p.length >= 2) {
          return { x: Number(p[0]), y: Number(p[1]), width: Number(p[2]) };
        }
        if (Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y))) {
          return { x: Number(p.x), y: Number(p.y), width: Number(p.width) };
        }
        return null;
      };

      const localTrackWidth = (x, y) => {
        let bestD2 = Infinity;
        let bestW = Number(this.track?.meta?.trackWidth || 160);
        for (const raw of centerline || []) {
          const p = ptXY(raw);
          if (!p) continue;
          const dx = p.x - x;
          const dy = p.y - y;
          const d2 = dx * dx + dy * dy;
          if (d2 < bestD2) {
            bestD2 = d2;
            if (Number.isFinite(p.width) && p.width > 20) bestW = p.width;
          }
        }
        return Math.max(50, bestW);
      };

      const gateFrame = (gate, insetRatio = 0.055) => {
        if (!gate?.a || !gate?.b) return null;
        const mx = (Number(gate.a.x) + Number(gate.b.x)) * 0.5;
        const my = (Number(gate.a.y) + Number(gate.b.y)) * 0.5;
        const gx = Number(gate.b.x) - Number(gate.a.x);
        const gy = Number(gate.b.y) - Number(gate.a.y);
        const gl = Math.hypot(gx, gy) || 1;
        const ux = gx / gl;
        const uy = gy / gl;
        const width = localTrackWidth(mx, my);
        const half = Math.max(22, width * (0.5 - insetRatio));
        return { mx, my, ux, uy, nx: -uy, ny: ux, width, half };
      };

      // Meta: damero de dos filas, fino y contenido dentro del asfalto.
      const drawFinish = () => {
        const f = gateFrame(this.finishLine, 0.055);
        if (!f) return null;

        const g = this.add.graphics().setDepth(17.6).setScrollFactor(1);
        const cols = Math.max(10, Math.round(f.width / 13));
        const rows = 2;
        const full = f.half * 2;
        const cellW = full / cols;
        const bandHalf = Math.max(5.5, Math.min(8.5, f.width * 0.045));
        const rowH = (bandHalf * 2) / rows;

        // Sombra/desgaste mínimo: parece pintura asentada sobre asfalto.
        g.lineStyle(1, 0x000000, 0.18);
        g.beginPath();
        g.moveTo(f.mx - f.ux * f.half, f.my - f.uy * f.half);
        g.lineTo(f.mx + f.ux * f.half, f.my + f.uy * f.half);
        g.strokePath();

        for (let c = 0; c < cols; c++) {
          const s0 = -f.half + c * cellW;
          const s1 = s0 + cellW;
          for (let r = 0; r < rows; r++) {
            const n0 = -bandHalf + r * rowH;
            const n1 = n0 + rowH;
            const col = ((c + r) % 2 === 0) ? 0xf1f1ed : 0x17191b;
            const alpha = ((c + r) % 2 === 0) ? 0.90 : 0.82;

            const p1 = { x: f.mx + f.ux * s0 + f.nx * n0, y: f.my + f.uy * s0 + f.ny * n0 };
            const p2 = { x: f.mx + f.ux * s1 + f.nx * n0, y: f.my + f.uy * s1 + f.ny * n0 };
            const p3 = { x: f.mx + f.ux * s1 + f.nx * n1, y: f.my + f.uy * s1 + f.ny * n1 };
            const p4 = { x: f.mx + f.ux * s0 + f.nx * n1, y: f.my + f.uy * s0 + f.ny * n1 };

            g.fillStyle(col, alpha);
            g.beginPath();
            g.moveTo(p1.x, p1.y);
            g.lineTo(p2.x, p2.y);
            g.lineTo(p3.x, p3.y);
            g.lineTo(p4.x, p4.y);
            g.closePath();
            g.fillPath();
          }
        }

        if (typeof g.cameraFilter === 'number') g.cameraFilter &= ~main.id;
        this.uiCam?.ignore?.(g);
        return g;
      };

      // CP: puerta lógica invisible; visualmente solo dos marcas laterales
      // y una referencia transversal casi imperceptible.
      const drawSector = (gate, color) => {
        const f = gateFrame(gate, 0.07);
        if (!f) return null;

        const g = this.add.graphics().setDepth(17.4).setScrollFactor(1);
        const edgeLen = Math.max(13, Math.min(24, f.width * 0.13));
        const innerHalf = Math.max(12, f.half - edgeLen);

        // guía central muy tenue
        g.lineStyle(1, color, 0.10);
        g.beginPath();
        g.moveTo(f.mx - f.ux * innerHalf, f.my - f.uy * innerHalf);
        g.lineTo(f.mx + f.ux * innerHalf, f.my + f.uy * innerHalf);
        g.strokePath();

        // marcas laterales con doble trazo corto tipo pintura de sector
        for (const side of [-1, 1]) {
          const outer = side * f.half;
          const inner = side * (f.half - edgeLen);
          const ox = f.mx + f.ux * outer;
          const oy = f.my + f.uy * outer;
          const ix = f.mx + f.ux * inner;
          const iy = f.my + f.uy * inner;

          g.lineStyle(4, color, 0.54);
          g.beginPath();
          g.moveTo(ox, oy);
          g.lineTo(ix, iy);
          g.strokePath();

          const offset = 5;
          g.lineStyle(1.5, 0xffffff, 0.30);
          g.beginPath();
          g.moveTo(ox + f.nx * offset, oy + f.ny * offset);
          g.lineTo(ix + f.nx * offset, iy + f.ny * offset);
          g.strokePath();
        }

        g.setAlpha(0.72);
        if (typeof g.cameraFilter === 'number') g.cameraFilter &= ~main.id;
        this.uiCam?.ignore?.(g);
        return g;
      };

      this.finishIntegratedGfx?.destroy?.();
      this.cp1IntegratedGfx?.destroy?.();
      this.cp2IntegratedGfx?.destroy?.();

      this.finishIntegratedGfx = drawFinish();
      this.cp1IntegratedGfx = drawSector(this.checkpoints?.cp1, 0xffd86a);
      this.cp2IntegratedGfx = drawSector(this.checkpoints?.cp2, 0x67e6ff);
      this._styledPrevCpState = Number(this._cpState || 0);

      this._flashSectorMarker = (idx) => {
        const target = idx === 1 ? this.cp1IntegratedGfx : this.cp2IntegratedGfx;
        if (!target?.scene) return;
        this.tweens.killTweensOf(target);
        target.setAlpha(1);
        this.tweens.add({
          targets: target,
          alpha: 0.72,
          duration: 420,
          ease: 'Sine.easeOut'
        });
      };

      // =========================================================
      // HUD INFERIOR v2
      // =========================================================
      const W = 356;
      const H = 62;
      const c = this.add.container(0, 0).setDepth(2190);
      this.raceInfoHudV2 = c;

      // Fondo muy ligero: evita el aspecto de "caja pegada".
      const bg = this.add.rectangle(0, 0, W, H, 0x07111a, 0.64)
        .setOrigin(0.5, 1)
        .setStrokeStyle(1, 0x5bbcff, 0.24);

      // Banda superior y pequeño brillo central.
      const topLine = this.add.rectangle(0, -H + 2, W - 20, 1, 0x5bc6ff, 0.72)
        .setOrigin(0.5, 0);
      const glow = this.add.rectangle(0, -H + 3, 116, 2, 0x9ee8ff, 0.34)
        .setOrigin(0.5, 0);

      // Velocidad protagonista.
      const speed = this.add.text(0, -32, '000', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '38px',
        fontStyle: '900',
        color: '#F7FBFF'
      }).setOrigin(0.5).setShadow(0, 2, '#000000', 3, false, true);

      const unit = this.add.text(53, -23, 'km/h', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '10px',
        fontStyle: '700',
        color: '#7FCBFF'
      }).setOrigin(0, 0.5);

      // Marcha: bloque izquierdo, muy compacto.
      const gearLabel = this.add.text(-151, -45, 'MARCHA', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px',
        fontStyle: '700',
        color: '#7E8D9A'
      }).setOrigin(0, 0.5);

      const gear = this.add.text(-126, -24, 'N', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '22px',
        fontStyle: '900',
        color: '#FFFFFF'
      }).setOrigin(0.5);

      // Superficie: bloque derecho.
      const surfaceLabel = this.add.text(103, -45, 'SUPERFICIE', {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '8px',
        fontStyle: '700',
        color: '#7E8D9A'
      }).setOrigin(0, 0.5);

      const surface = this.add.text(103, -24, 'PISTA', {
        fontFamily: 'Orbitron, system-ui, sans-serif',
        fontSize: '12px',
        fontStyle: '800',
        color: '#70FFB0'
      }).setOrigin(0, 0.5);

      // Separadores cortos, no recorren todo el panel.
      const leftSep = this.add.rectangle(-82, -28, 1, 30, 0xffffff, 0.10);
      const rightSep = this.add.rectangle(84, -28, 1, 30, 0xffffff, 0.10);

      c.add([
        bg, topLine, glow,
        leftSep, rightSep,
        gearLabel, gear,
        speed, unit,
        surfaceLabel, surface
      ]);

      c._speedText = speed;
      c._gearText = gear;
      c._surfaceText = surface;

      // Debe renderizarlo la main, porque uiCam sigue desactivada por el fix iOS.
      if (typeof c.cameraFilter === 'number') c.cameraFilter &= ~main.id;
      for (const child of c.list || []) {
        if (typeof child.cameraFilter === 'number') child.cameraFilter &= ~main.id;
      }
      c.setScrollFactor(1, 1);

      this._layoutRaceInfoHudV2 = () => {
        const vw = Number(this.scale?.width || 1);
        const vh = Number(this.scale?.height || 1);
        this._raceInfoHudV2State = {
          screenX: vw * 0.5,
          // Casi pegado abajo, dejando hueco al home indicator del iPhone.
          screenY: vh - 4,
          scale: Math.min(1, Math.max(0.86, vw / 980))
        };
      };

      this._pinRaceInfoHudV2 = () => {
        const cam = this.cameras?.main;
        const state = this._raceInfoHudV2State;
        const hud = this.raceInfoHudV2;
        if (!cam || !state || !hud?.scene) return;

        const zoom = Math.max(0.001, Number(cam.zoom || 1));
        const world = cam.getWorldPoint(state.screenX, state.screenY);
        hud.setPosition(world.x, world.y);
        hud.setScale(state.scale / zoom);
      };

      this._syncRaceInfoHudV2 = () => {
        const src = this.raceInfoHud;
        const dst = this.raceInfoHudV2;
        if (!src || !dst?.scene) return;

        dst._speedText?.setText(src._speedText?.text || '000');
        dst._gearText?.setText(src._gearText?.text || 'N');

        const surf = src._surfaceText?.text || 'PISTA';
        dst._surfaceText?.setText(surf);
        if (surf === 'CÉSPED') dst._surfaceText?.setColor('#FFD56A');
        else if (surf === 'FUERA') dst._surfaceText?.setColor('#FF7373');
        else dst._surfaceText?.setColor('#70FFB0');
      };

      this._layoutRaceInfoHudV2();
      this._pinRaceInfoHudV2();
      this._syncRaceInfoHudV2();

      this.scale.off('resize', this._onResizeRaceInfoHudV2);
      this._onResizeRaceInfoHudV2 = () => {
        this._layoutRaceInfoHudV2?.();
        this._pinRaceInfoHudV2?.();
      };
      this.scale.on('resize', this._onResizeRaceInfoHudV2);
    } catch (err) {
      console.warn('[TDR2] Styled race HUD setup failed', err);
    }
  }

  update(time, delta) {
    const cpBefore = Number(this._cpState || 0);
    super.update(time, delta);

    try {
      this._pinRaceInfoHudV2?.();
      this._syncRaceInfoHudV2?.();

      const cpAfter = Number(this._cpState || 0);
      if (cpAfter !== cpBefore) {
        if (cpAfter === 1) this._flashSectorMarker?.(1);
        if (cpAfter === 2) this._flashSectorMarker?.(2);
      }
      this._styledPrevCpState = cpAfter;
    } catch (err) {
      console.warn('[TDR2] Styled race HUD update failed', err);
    }
  }
}
