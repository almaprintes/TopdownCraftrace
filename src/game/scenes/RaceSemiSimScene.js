import { RaceScene as CurrentRaceScene } from './RaceMinimapCenteredScene.js';

// Capa visual semi-sim: sustituye únicamente superficies y desgaste.
// Toda la lógica de carrera, física, cámaras, HUD, CP, meta y minimapa
// permanece heredada de la escena estable actual.
export class RaceScene extends CurrentRaceScene {
  ensureOffTexture() {
    const key = 'off';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Tierra compactada de circuito: apagada y poco saturada.
    g.fillStyle(0x655c45, 1);
    g.fillRect(0, 0, size, size);

    for (let i = 0; i < 34; i++) {
      const r = 90 + Math.random() * 250;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.5 ? 0x746b51 : 0x514b3b;
      g.fillStyle(col, 0.035 + Math.random() * 0.045);
      g.fillCircle(x, y, r);
    }

    // Pequeño agregado de tierra/piedra.
    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.62 ? 0x9a9072 : 0x3f3c32;
      g.fillStyle(col, 0.035 + Math.random() * 0.06);
      const s = Math.random() > 0.92 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }

    // Rodadas/zonas compactadas irregulares.
    for (let i = 0; i < 18; i++) {
      const w = 100 + Math.random() * 260;
      const h = 18 + Math.random() * 52;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      g.fillStyle(0x2f2d27, 0.025 + Math.random() * 0.03);
      g.fillRoundedRect(x, y, w, h, 14);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  ensureBgTexture() {
    const key = 'grass';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Verde natural de circuito, bastante menos saturado que el anterior.
    g.fillStyle(0x355536, 1);
    g.fillRect(0, 0, size, size);

    // Franjas muy sutiles de corte de césped.
    const stripeW = 86;
    for (let x = -stripeW; x < size + stripeW; x += stripeW) {
      const alt = Math.floor(x / stripeW) % 2 === 0;
      g.fillStyle(alt ? 0x496748 : 0x2c492f, 0.075);
      g.fillRect(x, 0, stripeW, size);
    }

    // Grandes variaciones orgánicas.
    for (let i = 0; i < 30; i++) {
      const r = 120 + Math.random() * 260;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const pick = Math.random();
      const col = pick > 0.67 ? 0x486646 : (pick > 0.34 ? 0x29462d : 0x625f3a);
      g.fillStyle(col, 0.025 + Math.random() * 0.04);
      g.fillCircle(x, y, r);
    }

    // Hojas / hebras vistas desde arriba, sin convertirlo en ruido.
    for (let i = 0; i < 32000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const light = Math.random() > 0.52;
      g.fillStyle(light ? 0x71806a : 0x192f20, 0.025 + Math.random() * 0.055);
      const h = Math.random() > 0.72 ? 2 : 1;
      g.fillRect(x, y, 1, h);
    }

    // Calvas / zonas secas discretas.
    for (let i = 0; i < 15; i++) {
      const r = 35 + Math.random() * 95;
      g.fillStyle(0x7a7045, 0.025 + Math.random() * 0.025);
      g.fillCircle(Math.random() * size, Math.random() * size, r);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  ensureAsphaltTexture() {
    const key = 'asphalt';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Base carbón fría, de pista real y menos gris-plástico.
    g.fillStyle(0x292b2d, 1);
    g.fillRect(0, 0, size, size);

    // Variación tonal amplia y suave.
    for (let i = 0; i < 42; i++) {
      const r = 70 + Math.random() * 210;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.52 ? 0x383a3c : 0x1f2123;
      g.fillStyle(col, 0.025 + Math.random() * 0.04);
      g.fillCircle(x, y, r);
    }

    // Agregado del asfalto: piedra clara/oscura muy fina.
    for (let i = 0; i < 36000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.70 ? 0x68696a : (r > 0.36 ? 0x3f4142 : 0x131516);
      g.fillStyle(col, 0.035 + Math.random() * 0.075);
      const s = Math.random() > 0.93 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }

    // Reparaciones/parches casi imperceptibles.
    for (let i = 0; i < 12; i++) {
      const w = 90 + Math.random() * 250;
      const h = 24 + Math.random() * 78;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      const col = Math.random() > 0.5 ? 0x17191a : 0x444648;
      g.fillStyle(col, 0.028 + Math.random() * 0.022);
      g.fillRoundedRect(x, y, w, h, 8);
    }

    // Fisuras finísimas y cortas.
    g.lineStyle(1, 0x0a0b0c, 0.12);
    for (let i = 0; i < 26; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;
      g.beginPath();
      g.moveTo(x, y);
      const steps = 2 + Math.floor(Math.random() * 4);
      for (let s = 0; s < steps; s++) {
        x += (Math.random() - 0.5) * 35;
        y += 10 + Math.random() * 32;
        g.lineTo(x, y);
      }
      g.strokePath();
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  ensureAsphaltOverlayTexture() {
    const key = 'asphaltOverlay';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.clear();

    // Nubes de desgaste/pulido.
    for (let i = 0; i < 24; i++) {
      const r = 100 + Math.random() * 230;
      const col = Math.random() > 0.5 ? 0xffffff : 0x000000;
      g.fillStyle(col, 0.018 + Math.random() * 0.028);
      g.fillCircle(Math.random() * size, Math.random() * size, r);
    }

    // Huellas de goma longitudinales, muy suaves para que no parezcan rayas.
    for (let i = 0; i < 22; i++) {
      const w = 180 + Math.random() * 360;
      const h = 6 + Math.random() * 18;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      g.fillStyle(0x050606, 0.045 + Math.random() * 0.045);
      g.fillRoundedRect(x, y, w, h, h * 0.5);
    }

    // Marcas de frenada cortas y rotas.
    for (let i = 0; i < 26; i++) {
      const w = 50 + Math.random() * 150;
      const h = 2 + Math.random() * 5;
      g.fillStyle(0x000000, 0.05 + Math.random() * 0.05);
      g.fillRoundedRect(Math.random() * (size - w), Math.random() * size, w, h, 2);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  create() {
    super.create();

    try {
      // =========================================================
      // DESGASTE DE COMPETICIÓN — sobre el asfalto, bajo meta/CP/coche
      // =========================================================
      const center = this.track?.geom?.center || [];
      const left = this.track?.geom?.left || [];
      const right = this.track?.geom?.right || [];

      const getXY = (p) => {
        if (Array.isArray(p)) return { x: Number(p[0]), y: Number(p[1]) };
        return { x: Number(p?.x), y: Number(p?.y) };
      };

      const drawOpenLine = (points, width, color, alpha, depth) => {
        if (!Array.isArray(points) || points.length < 2) return null;
        const g = this.add.graphics().setDepth(depth).setScrollFactor(1);
        g.lineStyle(width, color, alpha);
        const p0 = getXY(points[0]);
        if (!Number.isFinite(p0.x) || !Number.isFinite(p0.y)) return g;
        g.beginPath();
        g.moveTo(p0.x, p0.y);
        for (let i = 1; i < points.length; i++) {
          const p = getXY(points[i]);
          if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
          g.lineTo(p.x, p.y);
        }
        g.strokePath();
        this.uiCam?.ignore?.(g);
        return g;
      };

      // Franja de goma principal: ancha + núcleo suave. No afecta a la física.
      this._semiSimRubberWide = drawOpenLine(center, 24, 0x08090a, 0.10, 11.18);
      this._semiSimRubberCore = drawOpenLine(center, 9, 0x030404, 0.13, 11.19);

      // Borde de pista castigado: tierra/goma justo donde termina el asfalto.
      this._semiSimEdgeLeft = drawOpenLine(left, 9, 0x29251d, 0.20, 11.26);
      this._semiSimEdgeRight = drawOpenLine(right, 9, 0x29251d, 0.20, 11.26);
      this._semiSimEdgeDustLeft = drawOpenLine(left, 3, 0x95866a, 0.12, 11.27);
      this._semiSimEdgeDustRight = drawOpenLine(right, 3, 0x95866a, 0.12, 11.27);

      // Línea blanca fina tipo circuito, ligeramente envejecida.
      this._semiSimWhiteLeft = drawOpenLine(left, 2, 0xe6e4dc, 0.52, 11.36);
      this._semiSimWhiteRight = drawOpenLine(right, 2, 0xe6e4dc, 0.52, 11.36);
    } catch (err) {
      console.warn('[TDR2] Semi-sim surface overlay failed', err);
    }
  }
}
