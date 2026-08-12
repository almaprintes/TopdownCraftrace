import { RaceScene as CurrentRaceScene } from './RaceTimingCelebrationVisibleScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

// Visual-only handling pass.
// IMPORTANT: does not modify carBody position, rotation, velocity or steering input.
// The physical controller remains exactly the existing one. Only carRig receives:
// 1) a small forward offset during yaw so the apparent pivot moves rearward,
// 2) a tiny speed/load-dependent angular lag so the chassis has visible weight
//    without changing how the car responds to the steering stick.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._visualPivotOffset = 0;
    this._visualChassisLag = 0;
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
    const signedYawRate = wrapPi(rot - rotBefore) / dt;
    const yawRate = Math.abs(signedYawRate);
    const vx = Number(body.body.velocity.x || 0);
    const vy = Number(body.body.velocity.y || 0);
    const speed = Math.hypot(vx, vy);

    // ---------------------------------------------------------
    // 1) Pivote visual trasero
    // ---------------------------------------------------------
    const turnStrength = clamp((yawRate - 0.08) / 2.5, 0, 1);
    const speedBlend = clamp(speed / 120, 0, 1);

    // Un poco más de barrido solo a alta velocidad/carga. En curva lenta
    // conserva prácticamente el ajuste anterior para no perjudicar precisión.
    const highSpeedLoad = clamp((speed - 155) / 260, 0, 1) * clamp((yawRate - 0.45) / 2.4, 0, 1);
    const baseMaxOffset = clamp(this._visualCarLength() * 0.085, 7, 12);
    const maxOffset = baseMaxOffset * (1 + 0.16 * highSpeedLoad);
    const targetOffset = maxOffset * turnStrength * speedBlend;

    const pivotFollow = 1 - Math.exp(-13 * dt);
    this._visualPivotOffset += (targetOffset - this._visualPivotOffset) * pivotFollow;
    if (Math.abs(this._visualPivotOffset) < 0.02) this._visualPivotOffset = 0;

    // ---------------------------------------------------------
    // 2) Micro-inercia visual del chasis, dependiente de velocidad
    // ---------------------------------------------------------
    // En baja velocidad el tope se mantiene cerca de 1.5–2º. Solo cuando la
    // velocidad y el yaw real son altos sube progresivamente hasta ~3º.
    const lagSpeedBlend = clamp((speed - 55) / 235, 0, 1);
    const lagTurnBlend = clamp((yawRate - 0.16) / 2.75, 0, 1);
    const fastCornerBlend = clamp((speed - 180) / 260, 0, 1) * clamp((yawRate - 0.55) / 2.1, 0, 1);

    const baseLagDeg = 1.85;
    const extraLagDeg = 1.15 * fastCornerBlend;
    const maxLag = (baseLagDeg + extraLagDeg) * Math.PI / 180;
    const targetLag = -Math.sign(signedYawRate || 0) * maxLag * lagSpeedBlend * lagTurnBlend;

    // Algo más asentado en curva rápida, pero recupera muy deprisa al enderezar.
    const enteringFastCorner = fastCornerBlend > 0.15 && Math.abs(targetLag) > Math.abs(this._visualChassisLag);
    const lagFollowRate = enteringFastCorner ? 9.5 : (Math.abs(targetLag) > Math.abs(this._visualChassisLag) ? 11.5 : 20);
    const lagFollow = 1 - Math.exp(-lagFollowRate * dt);
    this._visualChassisLag += (targetLag - this._visualChassisLag) * lagFollow;
    if (Math.abs(this._visualChassisLag) < 0.00025) this._visualChassisLag = 0;

    // ---------------------------------------------------------
    // Aplicación SOLO al rig visual
    // ---------------------------------------------------------
    const fx = Math.cos(rot);
    const fy = Math.sin(rot);
    rig.x = body.x + fx * this._visualPivotOffset;
    rig.y = body.y + fy * this._visualPivotOffset;
    rig.rotation = rot + (this._carVisualRotOffset || 0) + this._visualChassisLag;
  }
}
