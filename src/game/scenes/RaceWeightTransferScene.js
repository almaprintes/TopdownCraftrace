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

// Progressive chassis / tyre dynamics layered over the established base controller.
// - throttle + steering at speed => mild understeer,
// - braking first loads the nose, then saturates progressively under heavy corner load,
// - sudden throttle lift while loaded => brief controlled rotation,
// - high-speed steering authority tapers slightly,
// - neutral tyres self-align when steering is released,
// - touch steering re-engages progressively,
// - tyre lateral grip saturates progressively instead of behaving like an on/off switch.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._wtThrottlePrev = false;
    this._wtLiftPulse = 0;
    this._wtBalance = 0; // -1 rearward, +1 forward
    this._wtBrakePressure = 0;
    this._steerFiltered = 0;
  }

  update(time, delta) {
    const bodyBefore = this.carBody;
    const rotBefore = Number(bodyBefore?.rotation || 0);
    const vxBefore = Number(bodyBefore?.body?.velocity?.x || 0);
    const vyBefore = Number(bodyBefore?.body?.velocity?.y || 0);

    const t = this.touch || {};
    const k = this.keys || {};
    const keyThrottle = !!k.up?.isDown || !!k.up2?.isDown;
    const keyBrake = !!k.down?.isDown || !!k.down2?.isDown;
    const throttleAmount = Math.max(clamp(Number(t.throttle || 0), 0, 1), keyThrottle ? 1 : 0);
    const brakeAmount = Math.max(clamp(Number(t.brake || 0), 0, 1), keyBrake ? 1 : 0);
    const throttle = throttleAmount > 0.5;
    const brake = brakeAmount > 0.5;
    const dt = clamp(Number(delta || 16.67) / 1000, 0.001, 0.05);

    // Brake command is digital on touch, but chassis load is not. Build a short physical
    // pressure ramp so turn-in assistance and tyre saturation arrive progressively.
    const brakePressureRate = brakeAmount > this._wtBrakePressure ? 7.0 : 11.5;
    const brakePressureFollow = 1 - Math.exp(-brakePressureRate * dt);
    this._wtBrakePressure += (brakeAmount - this._wtBrakePressure) * brakePressureFollow;
    if (brakeAmount === 0 && this._wtBrakePressure < 0.002) this._wtBrakePressure = 0;
    const brakePressure = clamp(this._wtBrakePressure, 0, 1);

    // ---------------------------------------------------------
    // Steering input response
    // ---------------------------------------------------------
    const rawSteer = clamp(Number(t.steer ?? t.stickX ?? 0), -1, 1);
    const steerCfg = this.carParams?.steering || {};
    const steerSpeedKmh = Math.hypot(vxBefore, vyBefore) * 0.185;
    const speedCalm = smoothstep01((steerSpeedKmh - 45) / 90);
    const riseRate = Math.max(0.1, Number(steerCfg.inputRiseRate ?? 9.5)) * (1 - 0.25 * speedCalm);
    const returnRate = Math.max(0.1, Number(steerCfg.inputReturnRate ?? 14.0));
    const reverseRate = Math.max(0.1, Number(steerCfg.inputReverseRate ?? 7.5)) * (1 - 0.18 * speedCalm);
    const steerTarget = Math.abs(rawSteer) < 0.025 ? 0 : rawSteer;

    let steerCurrent = Number.isFinite(this._steerFiltered) ? this._steerFiltered : 0;
    let responseRate = riseRate;
    if (steerTarget === 0) responseRate = returnRate;
    else if (Math.abs(steerCurrent) > 0.01 && Math.sign(steerTarget) !== Math.sign(steerCurrent)) responseRate = reverseRate;

    const steerFollow = 1 - Math.exp(-responseRate * dt);
    steerCurrent += (steerTarget - steerCurrent) * steerFollow;
    if (steerTarget === 0 && Math.abs(steerCurrent) < 0.002) steerCurrent = 0;
    this._steerFiltered = clamp(steerCurrent, -1, 1);
    const steer = this._steerFiltered;

    // Feed filtered steering into the existing controller for this frame only.
    const hasTouchSteer = !!this.touch && (t.steer != null || t.stickX != null);
    const hadSteer = Object.prototype.hasOwnProperty.call(t, 'steer');
    const hadStickX = Object.prototype.hasOwnProperty.call(t, 'stickX');
    const originalSteer = t.steer;
    const originalStickX = t.stickX;
    if (hasTouchSteer) {
      t.steer = steer;
      if (hadStickX) t.stickX = steer;
    }

    const speedKmhBefore = Math.hypot(vxBefore, vyBefore) * 0.10;
    const speedLoad = smoothstep01((speedKmhBefore - 18) / 72);
    const steerLoad = smoothstep01((Math.abs(steer) - 0.08) / 0.72);
    const cornerLoad = speedLoad * steerLoad;

    // A sudden lift while the chassis is loaded creates a short rear-rotation pulse.
    if (this._wtThrottlePrev && !throttle && !brake && cornerLoad > 0.18) {
      this._wtLiftPulse = Math.max(this._wtLiftPulse, cornerLoad);
    }
    this._wtThrottlePrev = throttle;

    // Smooth longitudinal weight transfer. Use physical brake pressure instead of the
    // digital button so load transfer follows the chassis rather than the input switch.
    let balanceTarget = 0;
    if (brakePressure > 0.01) balanceTarget = brakePressure;
    else if (throttle) balanceTarget = -0.72;
    const balanceRate = balanceTarget === 0 ? 7.5 : 5.5;
    const balanceFollow = 1 - Math.exp(-balanceRate * dt);
    this._wtBalance += (balanceTarget - this._wtBalance) * balanceFollow;

    // ---------------------------------------------------------
    // Progressive tyre saturation BEFORE the base controller consumes lateralGrip
    // ---------------------------------------------------------
    const steeringParams = this.carParams?.steering;
    const originalLateralGrip = Number(steeringParams?.lateralGrip);
    let lateralGripAdjusted = false;

    const surfaceBefore = String(this._surface || 'TRACK').toUpperCase();
    const stableSurfaceBefore = surfaceBefore !== 'DIRT' && surfaceBefore !== 'GRASS' && surfaceBefore !== 'OFF';
    const specialMultiSurface = String(this._tdrSurfaceProfile || '').toLowerCase() === 'dirt-asphalt-grass';

    if (
      bodyBefore?.body?.velocity && steeringParams && Number.isFinite(originalLateralGrip) && originalLateralGrip > 0 &&
      stableSurfaceBefore && !specialMultiSurface && steerSpeedKmh > 18
    ) {
      const tires = this.carParams?.tires || {};
      const fx0 = Math.cos(rotBefore);
      const fy0 = Math.sin(rotBefore);
      const rx0 = -fy0;
      const ry0 = fx0;
      const vF0 = vxBefore * fx0 + vyBefore * fy0;
      const vL0 = vxBefore * rx0 + vyBefore * ry0;
      const slipDeg = Math.abs(Math.atan2(vL0, Math.max(18, Math.abs(vF0)))) * 180 / Math.PI;

      const slipStart = Math.max(0.5, Number(tires.slipStartDeg ?? 5.0));
      const slipFull = Math.max(slipStart + 1, Number(tires.slipFullDeg ?? 14.0));
      const gripFloor = clamp(Number(tires.cornerGripFloor ?? 0.58), 0.25, 0.95);
      const throttleLoss = clamp(Number(tires.throttleGripLoss ?? 0.10), 0, 0.35);
      const brakeLoss = clamp(Number(tires.brakeGripLoss ?? 0.12), 0, 0.35);

      const speedDemand = smoothstep01((steerSpeedKmh - 28) / 82);
      const steeringDemand = smoothstep01((Math.abs(steer) - 0.10) / 0.80);
      const cornerDemand = speedDemand * steeringDemand;
      const slipDemand = smoothstep01((slipDeg - slipStart) / (slipFull - slipStart));

      const saturation = clamp(0.72 * cornerDemand + 0.28 * slipDemand, 0, 1);
      const combinedLongitudinalLoss =
        throttleLoss * throttleAmount * cornerDemand +
        brakeLoss * brakePressure * cornerDemand;

      const gripScale = clamp(
        1 - (1 - gripFloor) * saturation - combinedLongitudinalLoss,
        Math.max(0.22, gripFloor * 0.88),
        1
      );

      steeringParams.lateralGrip = originalLateralGrip * gripScale;
      lateralGripAdjusted = true;
      this._tyreSaturation01 = saturation;
      this._tyreSlipDeg = slipDeg;
    } else {
      this._tyreSaturation01 = 0;
      this._tyreSlipDeg = 0;
    }

    try {
      super.update(time, delta);
    } finally {
      if (lateralGripAdjusted && steeringParams) steeringParams.lateralGrip = originalLateralGrip;

      if (hasTouchSteer) {
        if (hadSteer) t.steer = originalSteer;
        else delete t.steer;
        if (hadStickX) t.stickX = originalStickX;
      }
    }

    const body = this.carBody;
    if (!body?.scene || !body.body?.velocity) return;
    if (this._sessionReportOpen) return;

    const rotAfterBase = Number(body.rotation || rotBefore);
    const baseYawDelta = wrapPi(rotAfterBase - rotBefore);

    // ---------------------------------------------------------
    // Neutral chassis stability / tyre self-alignment
    // ---------------------------------------------------------
    const trueKmh = Math.hypot(
      Number(body.body.velocity.x || 0),
      Number(body.body.velocity.y || 0)
    ) * 0.185;
    const surface = String(this._surface || 'TRACK').toUpperCase();
    const stableSurface = surface !== 'DIRT' && surface !== 'GRASS' && surface !== 'OFF';

    if (stableSurface && Math.abs(steer) < 0.055 && trueKmh > 5) {
      const rot = Number(body.rotation || rotAfterBase);
      const fx = Math.cos(rot);
      const fy = Math.sin(rot);
      const rx = -fy;
      const ry = fx;
      const vx = Number(body.body.velocity.x || 0);
      const vy = Number(body.body.velocity.y || 0);
      const vF = vx * fx + vy * fy;
      let vL = vx * rx + vy * ry;

      const alignLoad = smoothstep01((trueKmh - 5) / 75);
      const alignRate = 1.8 + 2.6 * alignLoad;
      vL *= Math.exp(-alignRate * dt);

      body.body.velocity.x = fx * vF + rx * vL;
      body.body.velocity.y = fy * vF + ry * vL;
    }

    if (cornerLoad < 0.01 || Math.abs(baseYawDelta) < 1e-7) {
      this._wtLiftPulse *= Math.exp(-7.5 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
      return;
    }

    // ---------------------------------------------------------
    // Progressive understeer on throttle
    // ---------------------------------------------------------
    const throttleUndersteer = throttle
      ? 0.15 * cornerLoad * smoothstep01((speedKmhBefore - 30) / 80)
      : 0;

    // ---------------------------------------------------------
    // Braking in a corner: useful initial turn-in, then front-tyre saturation
    // ---------------------------------------------------------
    // Moderate pressure loads the front axle and helps the nose rotate. Heavy pressure
    // plus substantial steering/speed consumes the same front grip, so extra brake no
    // longer gives free yaw and eventually trims steering authority.
    const brakeUsefulLoad = smoothstep01(brakePressure / 0.58);
    const brakeOverload =
      smoothstep01((brakePressure - 0.56) / 0.44) *
      smoothstep01((Math.abs(steer) - 0.28) / 0.62) *
      smoothstep01((trueKmh - 28) / 62);

    const brakeTurnIn = 0.085 * cornerLoad * clamp(this._wtBalance, 0, 1) * brakeUsefulLoad * (1 - 0.62 * brakeOverload);
    const brakeSteerLoss = 0.115 * cornerLoad * brakeOverload;

    const highSpeedAuthority = 1 - 0.10 * smoothstep01((trueKmh - 70) / 65);

    let yawScale = (1 - throttleUndersteer + brakeTurnIn - brakeSteerLoss) * highSpeedAuthority;
    yawScale = clamp(yawScale, 0.78, 1.10);
    let correctedYaw = baseYawDelta * yawScale;

    // ---------------------------------------------------------
    // Controlled lift-off oversteer
    // ---------------------------------------------------------
    if (!throttle && !brake && this._wtLiftPulse > 0) {
      const pulse = this._wtLiftPulse * cornerLoad;
      const sign = Math.sign(baseYawDelta || steer || 0);
      const extraYawRate = sign * (0.22 * pulse);
      correctedYaw += extraYawRate * dt;
      this._wtLiftPulse *= Math.exp(-4.8 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
    } else {
      this._wtLiftPulse *= Math.exp(-7.5 * dt);
      if (this._wtLiftPulse < 0.002) this._wtLiftPulse = 0;
    }

    body.rotation = rotBefore + correctedYaw;

    if (this.carRig?.scene) {
      this.carRig.rotation = body.rotation + (this._carVisualRotOffset || 0) + (this._visualChassisLag || 0);
    }
  }
}
