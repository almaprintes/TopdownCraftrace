import { RaceScene as SemiSimRaceScene } from './RaceSemiSimScene.js';

// Segunda pasada de superficies semi-sim.
// Ajusta únicamente texturas y marcas de frenada; toda la lógica de carrera
// sigue heredada de las escenas estables anteriores.
export class RaceScene extends SemiSimRaceScene {
  ensureBgTexture() {
    const key = 'grass';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Base oscura y contenida, más cercana a césped de circuito real.
    g.fillStyle(0x2f4931, 1);
    g.fillRect(0, 0, size, size);

    // Variación de tono a escala pequeña. No hay manchas grandes ni elipses legibles.
    // La idea es que el ojo perciba una superficie continua, no formas superpuestas.
    for (let i = 0; i < 9800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.74 ? 0x496344 : (r > 0.48 ? 0x38553a : (r > 0.22 ? 0x243e29 : 0x5a6242));
      g.fillStyle(col, 0.045 + Math.random() * 0.085);
      const w = 2 + Math.random() * 10;
      const h = 2 + Math.random() * 8;
      g.fillRect(x, y, w, h);
    }

    // Micrograno vegetal denso. Esta es la capa que debe sobrevivir al zoom de carrera.
    for (let i = 0; i < 36000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.72 ? 0x75826a : (r > 0.42 ? 0x1b3320 : 0x516248);
      g.fillStyle(col, 0.08 + Math.random() * 0.12);
      const s = r > 0.93 ? 2 : 1;
      g.fillRect(x, y, s, s);
    }

    // Briznas cortas y aleatorias. Longitud muy contenida para evitar aspecto de rayas.
    for (let i = 0; i < 7600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const ang = Math.random() * Math.PI;
      const len = 1.5 + Math.random() * 3.5;
      const col = Math.random() > 0.55 ? 0x7a896e : 0x203b25;
      g.lineStyle(1, col, 0.12 + Math.random() * 0.13);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.strokePath();
    }

    // Restos secos y pequeñas irregularidades del terreno, siempre a escala pequeña.
    for (let i = 0; i < 1800; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const col = Math.random() > 0.5 ? 0x817651 : 0x60704e;
      g.fillStyle(col, 0.08 + Math.random() * 0.10);
      const w = 1 + Math.random() * 3;
      const h = 1 + Math.random() * 3;
      g.fillRect(x, y, w, h);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  ensureOffTexture() {
    const key = 'off';
    const size = 1024;
    if (this.textures.exists(key)) return;

    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Tierra/grava compactada de circuito.
    g.fillStyle(0x625b49, 1);
    g.fillRect(0, 0, size, size);

    // Variación contenida: textura visible sin placas geométricas enormes.
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.68 ? 0x81755b : (r > 0.34 ? 0x4b473b : 0x706852);
      g.fillStyle(col, 0.05 + Math.random() * 0.08);
      const w = 2 + Math.random() * 12;
      const h = 2 + Math.random() * 9;
      g.fillRect(x, y, w, h);
    }

    // Grava visible: puntos de 1-3 px.
    for (let i = 0; i < 22000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.72 ? 0xb1a386 : (r > 0.38 ? 0x393830 : 0x756d58);
      g.fillStyle(col, 0.10 + Math.random() * 0.14);
      const s = r > 0.94 ? 3 : (r > 0.78 ? 2 : 1);
      g.fillRect(x, y, s, s);
    }

    // Piedras aisladas algo mayores.
    for (let i = 0; i < 760; i++) {
      const r = 1 + Math.random() * 2.4;
      const col = Math.random() > 0.55 ? 0xc0b292 : 0x35352f;
      g.fillStyle(col, 0.18 + Math.random() * 0.18);
      g.fillCircle(Math.random() * size, Math.random() * size, r);
    }

    g.generateTexture(key, size, size);
    g.destroy();
  }

  create() {
    super.create();

    try {
      // Sustituimos las huellas de la pasada anterior por unas con vía creíble.
      this._semiSimBrakeMarks?.destroy?.();
      this._semiSimBrakeMarks = null;

      const centerRaw = this.track?.geom?.center || [];
      const defaultTrackW = Number(this.track?.meta?.trackWidth || 160);
      const center = centerRaw
        .map((p) => Array.isArray(p)
          ? { x: Number(p[0]), y: Number(p[1]), width: defaultTrackW }
          : { x: Number(p?.x), y: Number(p?.y), width: Number(p?.width || defaultTrackW) })
        .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

      const n = center.length;
      if (n < 24) return;

      const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
      const angleAt = (i0, i1) => {
        const a = center[(i0 + n) % n];
        const b = center[(i1 + n) % n];
        return Math.atan2(b.y - a.y, b.x - a.x);
      };
      const turnAt = (i) => normAngle(angleAt(i, i + 6) - angleAt(i - 6, i));

      const g = this.add.graphics().setDepth(11.24).setScrollFactor(1);
      this.uiCam?.ignore?.(g);
      this._semiSimBrakeMarks = g;

      const used = [];
      const circularDistance = (a, b) => Math.min(Math.abs(a - b), n - Math.abs(a - b));

      for (let i = 12; i < n - 12; i += 3) {
        const upcoming = turnAt(i + 8);
        const absTurn = Math.abs(upcoming);
        if (absTurn < 0.22) continue;
        if (used.some((u) => circularDistance(u, i) < 28)) continue;

        const turnSign = Math.sign(upcoming) || 1;
        const trackW = Number(center[i]?.width || defaultTrackW);

        // Vía visual del coche: aprox. 30-42 px entre centros de neumático.
        const tireHalfGap = Math.max(15, Math.min(22, trackW * 0.105));

        // Trazada de frenada ligeramente hacia el exterior de la curva.
        const racingOffset = -turnSign * Math.min(30, trackW * 0.15);
        const startI = Math.max(3, i - 13);
        const endI = Math.min(n - 4, i + 2);

        const makeTrack = (tireOffset, wobblePhase) => {
          const pts = [];
          let prev = null;
          let sampleIndex = 0;

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
            const wobble = Math.sin((sampleIndex + wobblePhase) * 1.65) * 0.8;
            const offset = racingOffset + tireOffset + wobble;
            const q = { x: p.x + nx * offset, y: p.y + ny * offset };

            if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > 72) break;
            pts.push(q);
            prev = q;
            sampleIndex++;
          }
          return pts;
        };

        const tyreA = makeTrack(-tireHalfGap, 0.2);
        const tyreB = makeTrack(tireHalfGap, 1.1);
        if (tyreA.length < 4 || tyreB.length < 4) continue;

        const drawBrokenTrack = (pts, width, alpha, phase) => {
          g.lineStyle(width, 0x050606, alpha);
          for (let k = phase; k < pts.length - 1; k += 2) {
            const a = pts[k];
            const b = pts[k + 1];
            if (!a || !b) continue;
            g.beginPath();
            g.moveTo(a.x, a.y);
            g.lineTo(b.x, b.y);
            g.strokePath();
          }
        };

        drawBrokenTrack(tyreA, 4.5, 0.16, 0);
        drawBrokenTrack(tyreB, 4.5, 0.16, 0);
        drawBrokenTrack(tyreA, 2.0, 0.12, 1);
        drawBrokenTrack(tyreB, 2.0, 0.12, 1);

        used.push(i);
      }
    } catch (err) {
      console.warn('[TDR2] Surface refinement failed', err);
    }
  }
}
