import { RaceScene as CurrentRaceScene } from './RaceSessionReportScene.js';

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }
function wrapPi(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

// Progressive longitudinal weight-transfer layer.
// It deliberately stays small: the established steering/braking/coasting remain the base.
// Effects only become meaningful while the car is moving and cornering:
// - throttle + steering at speed => mild understeer (less yaw response),
// - braking + steering => mild front-load / turn-in assistance,
// - sudden throttle lift while loaded => brief, controlled lift-off rotation.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._wtThrottlePrev = false;
    this._wtLiftPulse = 0;
    this._wtBalance = 0; // -1 rearward, +1 forward
  }

  update(time, delta) {
    const bodyBefore = this.carBody;
    const rotBefore = Number(bodyBefore?.rotation || 0);
    const vxBefore = Number(bodyBefore?.body?.velocity?.x || 0);
    const vyBefore = Number(bodyBefore?.body?.velocity?.y || 0);

    const t = this.touch || {};
    const k = this.keys || {};
    const throttle = Number(t.throttle || 0) > 0.5 || !!k.up?.isDown || !!k.up2?.isDown;
    const brake = Number(t.brake || 0) > 0.5 || !!k.down?.isDown || !!k.down2?.isDown;
    const steer = clamp(Number(t.steer ?? t.stickX ?? 0), -1, 1);

    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);
    const speedKmhBefore = Math.hypot(vxBefore, vyBefore) * 0.10;
    const speedLoad = smoothstep01((speedKmhBefore - 18) / 72);
    const steerLoad = smoothstep01((Math.abs(steer) - 0.08) / 0.72);
    const cornerLoad = speedLoad * steerLoad;

    // A sudden lift while the chassis is loaded creates a short rear-rotation pulse.
    if (this._wtThrottlePrev && !throttle && !brake && cornerLoad > 0.18) {
      this._wtLiftPulse = Math.max(this._wtLiftPulse, cornerLoad);
    }
    this._wtThrottlePrev = throttle;

    // Smooth longitudinal balance target. Positive = more front load.
    // Braking transfers weight forward; throttle shifts it rearward.
    let balanceTarget = 0;
    if (brake) balanceTarget = 1;
    else if (throttle) balanceTarget = -0.72;
    const balanceRate = balanceTarget === 0 ? 7.5 : 5.5;
    const balanceFollow = 1 - Math.exp(-balanceRate * dt);
    this._wtBalance += (balanceTarget - this._wtBalance) * balanceFollow;

    super.update(time, delta);

    const body = this.carBody;
    if (!body?.scene || !body.body?.velocity) return;
    if (this._sessionReportOpen) return;

    const rotAfterBase = Number(body.rotation || rotBefore);
    const baseYawDelta = wrapPi(rotAfterBase - rotBefore);

    // Ignore straight-line/no-load cases completely.
    if (cornerLoad < 0.01 || Math.abs(baseYawDelta) < 1e-7) {
      this._wtLiftPulse *= Math.exp(-7.5 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
      return;
    }

    // ---------------------------------------------------------
    // 1) Progressive understeer on throttle
    // ---------------------------------------------------------
    // At high speed + meaningful steering, full throttle can remove up to ~15%
    // of the base yaw response. Low speed and small steering remain essentially direct.
    const throttleUndersteer = throttle
      ? 0.15 * cornerLoad * smoothstep01((speedKmhBefore - 30) / 80)
      : 0;

    // ---------------------------------------------------------
    // 2) Front-load turn-in while braking
    // ---------------------------------------------------------
    // Braking can add up to ~9% yaw response, helping the nose rotate into the corner.
    // Because the progressive brake is already gentle, this reads as weight transfer,
    // not as an artificial steering boost.
    const brakeTurnIn = brake
      ? 0.09 * cornerLoad * clamp(this._wtBalance, 0, 1)
      : 0;

    let yawScale = 1 - throttleUndersteer + brakeTurnIn;
    yawScale = clamp(yawScale, 0.84, 1.10);
    let correctedYaw = baseYawDelta * yawScale;

    // ---------------------------------------------------------
    // 3) Controlled lift-off oversteer
    // ---------------------------------------------------------
    // A throttle lift during a loaded corner adds a short extra yaw impulse in the
    // same direction as the current turn. It decays quickly and is capped so the car
    // hints at rear rotation without snapping into a spin.
    if (!throttle && !brake && this._wtLiftPulse > 0) {
      const pulse = this._wtLiftPulse * cornerLoad;
      const sign = Math.sign(baseYawDelta || steer || 0);
      const extraYawRate = sign * (0.22 * pulse); // rad/s, intentionally modest
      correctedYaw += extraYawRate * dt;
      this._wtLiftPulse *= Math.exp(-4.8 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
    } else {
      this._wtLiftPulse *= Math.exp(-7.5 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
    }

    body.rotation = rotBefore + correctedYaw;

    // Keep the visible rig aligned immediately; lower visual layers may add their
    // own tiny chassis lag on the next frame, but physics remains the authority.
    if (this.carRig?.scene) {
      this.carRig.rotation = body.rotation + (this._carVisualRotOffset || 0) + (this._visualChassisLag || 0);
    }
  }
}
