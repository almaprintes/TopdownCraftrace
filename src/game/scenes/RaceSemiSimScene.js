import { RaceScene as CurrentRaceScene } from './RaceMinimapCenteredScene.js';

// Capa visual semi-sim. Solo sustituye superficies y decoración visual.
// Física, cámaras, HUD, CP, meta y minimapa permanecen heredados.
export class RaceScene extends CurrentRaceScene {
  ensureOffTexture() {
    const key = 'off';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });
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

    for (let i = 0; i < 26000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.62 ? 0x9a9072 : 0x3f3c32;
      g.fillStyle(col, 0.035 + Math.random() * 0.06);
      const s = Math.random() > 0.92 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }

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
    g.fillStyle(0x355536, 1);
    g.fillRect(0, 0, size, size);

    const stripeW = 86;
    for (let x = -stripeW; x < size + stripeW; x += stripeW) {
      const alt = Math.floor(x / stripeW) % 2 === 0;
      g.fillStyle(alt ? 0x496748 : 0x2c492f, 0.075);
      g.fillRect(x, 0, stripeW, size);
    }

    for (let i = 0; i < 30; i++) {
      const r = 120 + Math.random() * 260;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const pick = Math.random();
      const col = pick > 0.67 ? 0x486646 : (pick > 0.34 ? 0x29462d : 0x625f3a);
      g.fillStyle(col, 0.025 + Math.random() * 0.04);
      g.fillCircle(x, y, r);
    }

    for (let i = 0; i < 32000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const light = Math.random() > 0.52;
      g.fillStyle(light ? 0x71806a : 0x192f20, 0.025 + Math.random() * 0.055);
      const h = Math.random() > 0.72 ? 2 : 1;
      g.fillRect(x, y, 1, h);
    }

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
    g.fillStyle(0x292b2d, 1);
    g.fillRect(0, 0, size, size);

    for (let i = 0; i < 42; i++) {
      const r = 70 + Math.random() * 210;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.52 ? 0x383a3c : 0x1f2123;
      g.fillStyle(col, 0.025 + Math.random() * 0.04);
      g.fillCircle(x, y, r);
    }

    for (let i = 0; i < 36000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.70 ? 0x68696a : (r > 0.36 ? 0x3f4142 : 0x131516);
      g.fillStyle(col, 0.035 + Math.random() * 0.075);
      const s = Math.random() > 0.93 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }

    for (let i = 0; i < 12; i++) {
      const w = 90 + Math.random() * 250;
      const h = 24 + Math.random() * 78;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      const col = Math.random() > 0.5 ? 0x17191a : 0x444648;
      g.fillStyle(col, 0.028 + Math.random() * 0.022);
      g.fillRoundedRect(x, y, w, h, 8);
    }

    // Fisuras muy sutiles. No son marcas de frenado.
    g.lineStyle(1, 0x0a0b0c, 0.07);
    for (let i = 0; i < 18; i++) {
      let x = Math.random() * size;
      let y = Math.random() * size;
      g.beginPath();
      g.moveTo(x, y);
      const steps = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < steps; s++) {
        x += (Math.random() - 0.5) * 30;
        y += 10 + Math.random() * 26;
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

    // Solo desgaste isotrópico. Las huellas direccionales se dibujan en mundo,
    // orientadas según la geometría real del circuito.
    for (let i = 0; i < 34; i++) {
      const r = 75 + Math.random() * 220;
      const col = Math.random() > 0.52 ? 0xffffff : 0x000000;
      g.fillStyle(col, 0.012 + Math.random() * 0.024);
      g.fillCircle(Math.random() * size, Math.random() * size, r);
    }

    for (let i = 0; i < 12000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      g.fillStyle(Math.random() > 0.5 ? 0xffffff : 0x000000, 0.01 + Math.random() * 0.018);
      g.fillRect(x, y, 1, 1);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  create() {
    super.create();

    try {
      // =========================================================
      // MARCAS DE FRENADA SEMI-SIM
      // - NO hay línea continua por el centro.
      // - Solo aparecen antes de curvas relevantes.
      // - Son pares de neumático separados y tramos independientes.
      // - No usamos left/right para líneas continuas: evita pinchos y cruces.
      // =========================================================
      const centerRaw = this.track?.geom?.center || [];
      const center = centerRaw
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: Number(this.track?.meta?.trackWidth || 160) }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || this.track?.meta?.trackWidth || 160) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      const n = center.length;
      if (n >= 24) {
        const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
        const angleAt = (i0, i1) => {
          const a = center[(i0 + n) % n];
          const b = center[(i1 + n) % n];
          return Math.atan2(b.y - a.y, b.x - a.x);
        };

        const turnAt = (i) => {
          // Ventana suficientemente amplia para ignorar microquiebros del resample.
          const a0 = angleAt(i - 5, i);
          const a1 = angleAt(i, i + 5);
          return normAngle(a1 - a0);
        };

        const g = this.add.graphics().setDepth(11.24).setScrollFactor(1);
        this.uiCam?.ignore?.(g);
        this._semiSimBrakeMarks = g;

        const used = [];
        const circularDistance = (a, b) => {
          const d = Math.abs(a - b);
          return Math.min(d, n - d);
        };

        for (let i = 10; i < n - 10; i += 3) {
          const upcoming = turnAt(i + 7);
          const absTurn = Math.abs(upcoming);

          // Solo curvas suficientemente claras. Evita llenar toda la pista.
          if (absTurn < 0.20) continue;
          if (used.some((u) => circularDistance(u, i) < 24)) continue;

          // Las huellas empiezan antes del giro y terminan al llegar a él.
          const startI = Math.max(2, i - 10);
          const endI = Math.min(n - 3, i + 3);
          const turnSign = Math.sign(upcoming) || 1;

          // Entrada de curva: trazada hacia el exterior.
          // normal izquierda => curva izquierda usa exterior derecho y viceversa.
          const baseWidth = Number(center[i]?.width || this.track?.meta?.trackWidth || 160);
          const racingOffset = -turnSign * Math.min(28, baseWidth * 0.16);
          const tireHalfGap = Math.min(5.5, Math.max(3.2, baseWidth * 0.025));

          const makeTrack = (tireOffset) => {
            const pts = [];
            let prev = null;

            for (let k = startI; k <= endI; k += 2) {
              const p = center[k];
              const p0 = center[Math.max(0, k - 2)];
              const p1 = center[Math.min(n - 1, k + 2)];
              const dx = p1.x - p0.x;
              const dy = p1.y - p0.y;
              const len = Math.hypot(dx, dy);
              if (len < 8) continue;

              const nx = -dy / len;
              const ny = dx / len;
              const offset = racingOffset + tireOffset;
              const q = { x: p.x + nx * offset, y: p.y + ny * offset };

              // Protección contra saltos geométricos: corta el trazo en vez de unirlo.
              if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > 80) break;
              pts.push(q);
              prev = q;
            }
            return pts;
          };

          const leftTire = makeTrack(-tireHalfGap);
          const rightTire = makeTrack(tireHalfGap);
          if (leftTire.length < 3 || rightTire.length < 3) continue;

          const drawTrack = (pts, width, alpha) => {
            g.lineStyle(width, 0x080909, alpha);
            g.beginPath();
            g.moveTo(pts[0].x, pts[0].y);
            for (let k = 1; k < pts.length; k++) g.lineTo(pts[k].x, pts[k].y);
            g.strokePath();
          };

          // Dos pasadas dan cuerpo irregular sin convertirse en una franja negra.
          drawTrack(leftTire, 4.2, 0.14);
          drawTrack(rightTire, 4.2, 0.14);
          drawTrack(leftTire, 1.6, 0.12);
          drawTrack(rightTire, 1.6, 0.12);

          used.push(i);
        }
      }

      // Deliberadamente NO dibujamos líneas globales siguiendo geom.left/right.
      // En horquillas estrechas los offsets pueden auto-cruzarse. El borde de pista
      // queda definido por la propia máscara del asfalto y por los curbs exportados.
      this._semiSimEdgeLeft = null;
      this._semiSimEdgeRight = null;
      this._semiSimWhiteLeft = null;
      this._semiSimWhiteRight = null;
    } catch (err) {
      console.warn('[TDR2] Semi-sim surface overlay failed', err);
    }
  }
}
