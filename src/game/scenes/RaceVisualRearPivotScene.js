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
// 2) a tiny angular lag so the chassis has visible weight without changing control.
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
    // 1) Pivote visual trasero (versión que ya mejoró el tacto)
    // ---------------------------------------------------------
    const turnStrength = clamp((yawRate - 0.08) / 2.5, 0, 1);
    const speedBlend = clamp(speed / 120, 0, 1);
    const maxOffset = clamp(this._visualCarLength() * 0.085, 7, 12);
    const targetOffset = maxOffset * turnStrength * speedBlend;

    const pivotFollow = 1 - Math.exp(-13 * dt);
    this._visualPivotOffset += (targetOffset - this._visualPivotOffset) * pivotFollow;
    if (Math.abs(this._visualPivotOffset) < 0.02) this._visualPivotOffset = 0;

    // ---------------------------------------------------------
    // 2) Micro-inercia visual del chasis
    // ---------------------------------------------------------
    // El sprite se queda una fracción de grado "por detrás" del giro físico.
    // Máximo aprox. 2 grados: suficiente para sugerir masa, demasiado pequeño
    // para que parezca que el coche deja de obedecer a la palanca.
    const lagSpeedBlend = clamp((speed - 45) / 180, 0, 1);
    const lagTurnBlend = clamp((yawRate - 0.18) / 2.8, 0, 1);
    const maxLag = 2.0 * Math.PI / 180;
    const targetLag = -Math.sign(signedYawRate || 0) * maxLag * lagSpeedBlend * lagTurnBlend;

    // Entra con suavidad, pero vuelve a cero más rápido al enderezar para que
    // nunca quede una sensación gomosa o de retraso en el control.
    const lagFollowRate = Math.abs(targetLag) > Math.abs(this._visualChassisLag) ? 11 : 18;
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
