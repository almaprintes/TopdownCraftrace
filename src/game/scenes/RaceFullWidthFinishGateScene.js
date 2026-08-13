import { RaceScene as CurrentRaceScene } from './RaceHDMapExportScene.js';

function expandedFinishGate(gate, trackWidth) {
  if (!gate?.a || !gate?.b) return gate;

  const ax = Number(gate.a.x);
  const ay = Number(gate.a.y);
  const bx = Number(gate.b.x);
  const by = Number(gate.b.y);
  if (![ax, ay, bx, by].every(Number.isFinite)) return gate;

  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return gate;

  const mx = (ax + bx) * 0.5;
  const my = (ay + by) * 0.5;
  const ux = dx / len;
  const uy = dy / len;

  // Logical gate only: cover the complete road width plus a modest safety margin.
  // This makes angled crossings count while the car is still legitimately on the track.
  const roadWidth = Math.max(1, Number(trackWidth) || len);
  const safety = Math.max(18, roadWidth * 0.12);
  const desiredHalf = Math.max(len * 0.5, roadWidth * 0.5 + safety);

  return {
    ...gate,
    a: { ...gate.a, x: mx - ux * desiredHalf, y: my - uy * desiredHalf },
    b: { ...gate.b, x: mx + ux * desiredHalf, y: my + uy * desiredHalf },
    normal: gate.normal ? { ...gate.normal } : gate.normal
  };
}

// Keeps the visible chequered stripe untouched.
// Only while update() runs do lap/timing systems see the wider invisible gate.
export class RaceScene extends CurrentRaceScene {
  update(time, delta) {
    const visualFinish = this.finishLine;
    const meta = this.track?.meta;
    const metaFinishLine = meta?.finishLine;
    const metaFinish = meta?.finish;
    const source = visualFinish || metaFinishLine || metaFinish;

    if (!source?.a || !source?.b) {
      super.update(time, delta);
      return;
    }

    const trackWidth = Number(this.track?.meta?.trackWidth || this.track?.trackWidth || this.trackWidth || 0);
    const logicalGate = expandedFinishGate(source, trackWidth);

    try {
      if (visualFinish) this.finishLine = logicalGate;
      if (meta && metaFinishLine) meta.finishLine = logicalGate;
      if (meta && metaFinish) meta.finish = logicalGate;
      super.update(time, delta);
    } finally {
      if (visualFinish) this.finishLine = visualFinish;
      if (meta && metaFinishLine) meta.finishLine = metaFinishLine;
      if (meta && metaFinish) meta.finish = metaFinish;
    }
  }
}
