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

    // Base natural, sin franjas de siega artificiales.
    g.fillStyle(0x38533a, 1);
    g.fillRect(0, 0, size, size);

    // Masas orgánicas grandes: rompen cualquier lectura de patrón repetido.
    for (let i = 0; i < 72; i++) {
      const rx = 55 + Math.random() * 180;
      const ry = 40 + Math.random() * 150;
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.72 ? 0x536449 : (r > 0.42 ? 0x2a462f : 0x45543a);
      g.fillStyle(col, 0.035 + Math.random() * 0.065);
      g.fillEllipse(x, y, rx * 2, ry * 2);
    }

    // Calvas y césped estresado, discretos pero visibles al zoom de carrera.
    for (let i = 0; i < 34; i++) {
      const rx = 18 + Math.random() * 68;
      const ry = 12 + Math.random() * 48;
      const col = Math.random() > 0.5 ? 0x716747 : 0x263c2a;
      g.fillStyle(col, 0.05 + Math.random() * 0.055);
      g.fillEllipse(Math.random() * size, Math.random() * size, rx * 2, ry * 2);
    }

    // Grano vegetal visible: pequeños grupos, no ruido uniforme.
    for (let i = 0; i < 11500; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const light = Math.random() > 0.58;
      g.fillStyle(light ? 0x6c7b5f : 0x1b3422, 0.08 + Math.random() * 0.10);
      const w = Math.random() > 0.90 ? 2 : 1;
      const h = Math.random() > 0.55 ? 2 : 1;
      g.fillRect(x, y, w, h);
    }

    // Hebras cortas orientadas de forma aleatoria para una superficie orgánica.
    for (let i = 0; i < 2200; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const ang = Math.random() * Math.PI;
      const len = 2 + Math.random() * 4;
      g.lineStyle(1, Math.random() > 0.5 ? 0x78906d : 0x203d28, 0.10 + Math.random() * 0.08);
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
      g.strokePath();
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

    // Placas grandes de tierra con variación suficiente para leerse en móvil.
    for (let i = 0; i < 78; i++) {
      const rx = 35 + Math.random() * 145;
      const ry = 22 + Math.random() * 105;
      const r = Math.random();
      const col = r > 0.68 ? 0x81755b : (r > 0.34 ? 0x4b473b : 0x706852);
      g.fillStyle(col, 0.045 + Math.random() * 0.07);
      g.fillEllipse(Math.random() * size, Math.random() * size, rx * 2, ry * 2);
    }

    // Grava visible: puntos de 1-3 px, bastante más legibles que antes.
    for (let i = 0; i < 15000; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const r = Math.random();
      const col = r > 0.72 ? 0xb1a386 : (r > 0.38 ? 0x393830 : 0x756d58);
      g.fillStyle(col, 0.10 + Math.random() * 0.14);
      const s = r > 0.92 ? 3 : (r > 0.72 ? 2 : 1);
      g.fillRect(x, y, s, s);
    }

    // Piedras aisladas algo mayores.
    for (let i = 0; i < 520; i++) {
      const r = 1 + Math.random() * 2.4;
      const col = Math.random() > 0.55 ? 0xc0b292 : 0x35352f;
      g.fillStyle(col, 0.18 + Math.random() * 0.18);
      g.fillCircle(Math.random() * size, Math.random() * size, r);
    }

    // Huellas/compactaciones difusas de vehículos de servicio.
    for (let i = 0; i < 20; i++) {
      const w = 110 + Math.random() * 260;
      const h = 18 + Math.random() * 42;
      const x = Math.random() * (size - w);
      const y = Math.random() * (size - h);
      g.fillStyle(0x292923, 0.035 + Math.random() * 0.045);
      g.fillRoundedRect(x, y, w, h, 12);
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
        // Se escala suavemente con el ancho de pista pero con límites para no exagerar.
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
            // Irregularidad mínima para evitar dos líneas vectoriales perfectas.
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
          // Segmentos cortos con huecos aleatorios: desgaste real, no pincelada perfecta.
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
