import { RaceScene as CurrentRaceScene } from './RaceKerbHapticsScene.js';

// The race timer itself remains based on performance.now() and keeps full precision.
// This layer only reduces how often Phaser regenerates dynamic text textures for the
// visible speed/time HUD. Some Android GPUs/Canvas paths make Text.setText unusually
// expensive; profiling on Redmi showed hudInfo spikes large enough to disturb frame pacing.
export class RaceScene extends CurrentRaceScene {
  create(data) {
    const result = super.create(data);

    this._hudPerfLastAt = -Infinity;
    this._hudPerfSpeed = '';
    this._hudPerfTime = '';

    this._updateRaceInfoHud = () => {
      const now = performance.now();
      // 10 Hz is visually smooth enough for a numeric HUD and avoids rebuilding
      // two text textures up to 20 times per second. Chronometry is NOT reduced.
      if (now - this._hudPerfLastAt < 100) return;
      this._hudPerfLastAt = now;

      const c = this.raceInfoHud;
      const body = this.carBody;
      if (!c?.scene || !body?.body?.velocity) return;

      const vx = Number(body.body.velocity.x || 0);
      const vy = Number(body.body.velocity.y || 0);
      const kmh = Math.max(0, Math.hypot(vx, vy) * 0.185);
      const speedTxt = String(Math.round(kmh)).padStart(3, '0');
      if (speedTxt !== this._hudPerfSpeed) {
        this._hudPerfSpeed = speedTxt;
        c._speedText?.setText(speedTxt);
      }

      const started = !!this.timing?.started && this.timing?.lapStart != null;
      const elapsed = started ? Math.max(0, now - Number(this.timing.lapStart)) : 0;
      const m = Math.floor(elapsed / 60000);
      const s = Math.floor((elapsed % 60000) / 1000);
      const cs = Math.floor((elapsed % 1000) / 10);
      const timeTxt = `${m}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
      if (timeTxt !== this._hudPerfTime) {
        this._hudPerfTime = timeTxt;
        c._timerText?.setText(timeTxt);
      }
    };

    return result;
  }
}
