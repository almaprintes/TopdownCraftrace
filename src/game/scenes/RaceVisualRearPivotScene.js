import { RaceScene as CurrentRaceScene } from './RaceTimingCelebrationVisibleScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Visual-only handling pass.
// IMPORTANT: does not modify carBody position, rotation, velocity or steering input.
// The physical controller remains exactly the existing one; only carRig is offset
// during yaw so the apparent pivot moves rearward and the nose sweeps the corner.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._visualPivotOffset = 0;
  }

  _visualCarLength() {
    const sprite = this.carRig?.list?.find?.((o) => o?.texture) || this.carRig?.list?.[0];
    const w = Number(sprite?.displayWidth || sprite?.width || 0);
    return Number.isFinite(w) && w > 10 ? clamp(w, 70, 150) : 105;
  }

  update(time, delta) {
    const bodyBefore = this.carBody;
    const rotBefore = Number(bodyBefore?.rotation);

    super.update(time, delta);

    const body = this.carBody;
    const rig = this.carRig;
    if (!body?.scene || !rig?.scene || !body.body?.velocity || !Number.isFinite(rotBefore)) return;

    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);
    const rot = Number(body.rotation || 0);
    const yawRate = Math.abs(wrapPi(rot - rotBefore)) / dt;
    const speed = Math.hypot(Number(body.body.velocity.x || 0), Number(body.body.velocity.y || 0));

    // Only a visual displacement. It grows with actual chassis rotation, so the
    // stick response remains untouched and the effect disappears naturally in straights.
    const turnStrength = clamp((yawRate - 0.08) / 2.5, 0, 1);
    const speedBlend = clamp(speed / 120, 0, 1);
    const maxOffset = clamp(this._visualCarLength() * 0.085, 7, 12);
    const targetOffset = maxOffset * turnStrength * speedBlend;

    // Fast but smooth response; avoids the sprite visibly sliding when steering starts/stops.
    const follow = 1 - Math.exp(-13 * dt);
    this._visualPivotOffset += (targetOffset - this._visualPivotOffset) * follow;
    if (Math.abs(this._visualPivotOffset) < 0.02) this._visualPivotOffset = 0;

    // Move only the rendered rig forward relative to the physical centre.
    // The body then reads visually as a pivot behind the centre of the car.
    const fx = Math.cos(rot);
    const fy = Math.sin(rot);
    rig.x = body.x + fx * this._visualPivotOffset;
    rig.y = body.y + fy * this._visualPivotOffset;
    rig.rotation = rot + (this._carVisualRotOffset || 0);
  }
}
