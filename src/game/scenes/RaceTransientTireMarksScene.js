import { RaceScene as CurrentRaceScene } from './RaceSafeModeRuntimeScene.js';

const MAX_MARKS = 56;
const SAMPLE_MS = 58;
const MIN_SPEED = 115;
const SLIP_START = 34;
const SLIP_STRONG = 72;
const DIRT_CARRY_MS = 1250;

function clamp01(v){ return Math.max(0, Math.min(1, v)); }
function currentTrackKey(scene){
  let stored='';
  try{stored=localStorage.getItem('tdr2:trackKey')||'';}catch{}
  return String(scene?.trackKey || scene?.track?.meta?.id || stored || '').trim().toLowerCase();
}

export class RaceScene extends CurrentRaceScene {
  create(data){
    const result = super.create(data);
    this._tireMarks = [];
    this._nextTireMarkAt = 0;
    this._lastMarkPoint = null;
    this._dirtCarryUntil = 0;
    this._lastMarkOnTrack = null;
    this.events.once('shutdown', () => {
      for (const mark of this._tireMarks || []) { try { mark?.destroy?.(); } catch {} }
      this._tireMarks = []; this._lastMarkPoint = null; this._dirtCarryUntil = 0; this._lastMarkOnTrack = null;
    });
    return result;
  }
  update(time, delta){
    const result = super.update?.(time, delta);
    if (window.__tdrIosSafeMode === true) return result;
    if (!this._raceStarted || !this.car?.body) return result;
    if (Number(time || 0) < Number(this._nextTireMarkAt || 0)) return result;
    this._nextTireMarkAt = Number(time || 0) + SAMPLE_MS;
    this._emitTransientTireMark(Number(time || 0)); return result;
  }
  _emitTransientTireMark(nowMs){
    const car = this.car, body = car?.body; if (!body) return;
    const vx = Number(body.velocity?.x || 0), vy = Number(body.velocity?.y || 0), speed = Math.hypot(vx, vy);
    if (!Number.isFinite(speed) || speed < MIN_SPEED) { this._lastMarkPoint = null; return; }
    const heading = Number(car.rotation || 0), fx = Math.cos(heading), fy = Math.sin(heading), lx = -fy, ly = fx;
    const lateral = vx * lx + vy * ly, forward = vx * fx + vy * fy, slip = Math.abs(lateral);
    const x = Number(car.x || 0), y = Number(car.y || 0);
    const onTrack = this._isOnTrack ? !!this._isOnTrack(x, y) : true;
    const grassBand = this.track?.geom?.grass;
    const onGrass = !onTrack && this._isInBand ? !!this._isInBand(grassBand, x, y) : false;
    const offRoad = !onTrack;
    const raven = currentTrackKey(this)==='offroad-raven-hollow';
    const prevOnTrack = this._lastMarkOnTrack;

    let carryingDirt=false;
    if(raven){
      // Raven Hollow: la pista ES tierra y el exterior inmediato ES asfalto.
      // Solo arrastramos tierra al SALIR de pista hacia ese asfalto.
      if(prevOnTrack===true && offRoad) this._dirtCarryUntil=nowMs+DIRT_CARRY_MS;
      if(onTrack){
        // Al volver desde asfalto a la pista de tierra no debe aparecer arrastre.
        this._dirtCarryUntil=0;
      }
      carryingDirt=offRoad && nowMs<Number(this._dirtCarryUntil||0);
    }else{
      if(offRoad) this._dirtCarryUntil = nowMs + DIRT_CARRY_MS;
      carryingDirt = onTrack && nowMs < Number(this._dirtCarryUntil || 0);
    }
    this._lastMarkOnTrack=onTrack;

    const strongSlide = slip >= SLIP_START && Math.abs(forward) > 70;
    if (!strongSlide && !offRoad && !carryingDirt) { this._lastMarkPoint = null; return; }
    const rearOffset = 27, wheelHalf = 13, rearX = x - fx * rearOffset, rearY = y - fy * rearOffset;
    const leftX = rearX + lx * wheelHalf, leftY = rearY + ly * wheelHalf, rightX = rearX - lx * wheelHalf, rightY = rearY - ly * wheelHalf;
    let color = 0x161616, alpha = 0.24 + clamp01((slip - SLIP_START) / (SLIP_STRONG - SLIP_START)) * 0.28;
    let width = 2.2 + clamp01(slip / 120) * 1.4, life = 1150, markKind = 'rubber';

    if(raven && onTrack){
      // Sobre la pista de tierra: surco marrón suave, no goma negra de asfalto.
      color = 0x624631;
      alpha = 0.14 + clamp01((slip - SLIP_START) / (SLIP_STRONG - SLIP_START)) * 0.16;
      width = 3.5 + clamp01(slip / 120) * 1.2;
      life = 900;
      markKind = 'raven-dirt-track';
    }

    if (offRoad) {
      if(raven && carryingDirt){
        const carry = clamp01((Number(this._dirtCarryUntil || 0) - nowMs) / DIRT_CARRY_MS);
        color = 0xb89562;
        alpha = 0.12 + carry * 0.18;
        width = 4.0;
        life = 1000;
        markKind = 'raven-dirt-to-asphalt';
      }else{
        color = onGrass ? 0x4a3422 : 0x3d2a1c;
        alpha = 0.42 + clamp01(speed / 360) * 0.24;
        width = 5.8 + clamp01(slip / 120) * 1.8;
        life = 1050;
        markKind = onGrass ? 'grass-dirt' : 'off-dirt';
      }
    } else if (!raven && carryingDirt) {
      const carry = clamp01((Number(this._dirtCarryUntil || 0) - nowMs) / DIRT_CARRY_MS);
      color = 0xb89562; alpha = 0.11 + carry * 0.18; width = 4.0; life = 1000; markKind = 'dirt-carry';
    }
    const prev = this._lastMarkPoint, gfx = this.add.graphics().setDepth(19).setScrollFactor(1); gfx.lineStyle(width, color, alpha);
    if (prev && prev.markKind === markKind) { gfx.beginPath(); gfx.moveTo(prev.leftX, prev.leftY); gfx.lineTo(leftX, leftY); gfx.moveTo(prev.rightX, prev.rightY); gfx.lineTo(rightX, rightY); gfx.strokePath(); }
    else { const seg = Math.max(5, Math.min(13, speed * 0.035)); gfx.beginPath(); gfx.moveTo(leftX - fx * seg, leftY - fy * seg); gfx.lineTo(leftX, leftY); gfx.moveTo(rightX - fx * seg, rightY - fy * seg); gfx.lineTo(rightX, rightY); gfx.strokePath(); }
    try { this.uiCam?.ignore?.(gfx); } catch {}
    this._tireMarks.push(gfx); while (this._tireMarks.length > MAX_MARKS) { const old = this._tireMarks.shift(); try { old?.destroy?.(); } catch {} }
    this.tweens.add({ targets: gfx, alpha: 0, duration: life, ease: 'Sine.easeOut', onComplete: () => { const idx = this._tireMarks.indexOf(gfx); if (idx >= 0) this._tireMarks.splice(idx, 1); try { gfx.destroy(); } catch {} } });
    this._lastMarkPoint = { leftX, leftY, rightX, rightY, offRoad, markKind };
  }
}
