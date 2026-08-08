import { RaceScene as CurrentRaceScene } from './RaceKerbSurfaceScene.js';
import { hasTrack } from '../tracks/trackRegistry.js';
import { grantRaceLoot } from '../garage/garageStore.js';
import { GARAGE_ITEMS } from '../garage/partsCatalog.js';

// Wider gameplay camera + current selected-library-track bridge.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();

    this._zoomGameplayMin = 0.62;
    this._zoomGameplayMax = 1.06;
    this._zoomKmhRef = 105;
    this._zoomLerp = 0.042;

    this.zoom = 0.96;
    this._zoomCurrent = this.zoom;
    this._garageRewardHistCount = 0;
  }

  init(data) {
    let requestedTrack = data?.trackKey || null;
    try { requestedTrack = requestedTrack || localStorage.getItem('tdr2:trackKey'); } catch (_) {}

    super.init(data);

    if (requestedTrack && hasTrack(requestedTrack)) {
      this.trackKey = requestedTrack;
      try { localStorage.setItem('tdr2:trackKey', requestedTrack); } catch (_) {}

      this.ttHistKey = `tdr2:ttHist:${requestedTrack}`;
      this.ttHistory = [];
      try {
        const raw = localStorage.getItem(this.ttHistKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (Array.isArray(parsed?.history)) {
          this.ttHistory = parsed.history.filter((r) => r && Number.isFinite(r.lapMs)).slice(-500);
        }
      } catch (_) {}

      this.ttKey = `tdr2:ttBest:${requestedTrack}`;
      this.ttBest = null;
      try {
        const raw = localStorage.getItem(this.ttKey);
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed && Number.isFinite(parsed.lapMs)) {
          this.ttBest = {
            lapMs: parsed.lapMs,
            lapTick: parsed.lapTick ?? null,
            s1: Number.isFinite(parsed.s1) ? parsed.s1 : null,
            s1Tick: parsed.s1Tick ?? null,
            s2: Number.isFinite(parsed.s2) ? parsed.s2 : null,
            s2Tick: parsed.s2Tick ?? null
          };
        }
      } catch (_) {}
    }

    this._garageRewardHistCount = Array.isArray(this.ttHistory) ? this.ttHistory.length : 0;
  }

  update(time, delta) {
    super.update(time, delta);

    const hist = Array.isArray(this.ttHistory) ? this.ttHistory : [];
    if (hist.length <= this._garageRewardHistCount) return;

    const newest = hist[hist.length - 1];
    this._garageRewardHistCount = hist.length;
    if (!newest || !Number.isFinite(newest.lapMs)) return;

    const reward = grantRaceLoot({ trackKey: this.trackKey, lapMs: newest.lapMs });
    this._showRaceLoot(reward);
  }

  _showRaceLoot(reward) {
    const bits = Object.entries(reward || {}).map(([id,n]) => {
      const item = GARAGE_ITEMS[id];
      return `${item?.icon || '•'} ${item?.name || id} ×${n}`;
    });
    if (!bits.length) return;

    const t = this.add.text(this.scale.width / 2, 92, `BOTÍN DE CARRERA  ·  ${bits.join('   ')}`, {
      fontFamily:'Orbitron, system-ui', fontSize:'12px', fontStyle:'900', color:'#eafff2',
      backgroundColor:'#07160fdd', padding:{x:14,y:9}, stroke:'#143823', strokeThickness:2
    }).setOrigin(.5,0).setScrollFactor(0).setDepth(99999);

    try { this.cameras.main.ignore(t); } catch (_) {}
    try { this.uiCam?.removeFromRenderList?.(t); } catch (_) {}

    this.tweens.add({targets:t,alpha:0,y:76,delay:1700,duration:420,onComplete:()=>t.destroy()});
  }
}
