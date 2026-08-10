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

  create() {
    super.create();

    // Sponsor-board safety pass. The first pilot showed that checking only each board's
    // centre was insufficient on compact parallel sections: the long rectangle could still
    // clip the asphalt. Re-seat every sponsor after the environment is mounted so the entire
    // panel remains beyond the white edge line. Repeated delayed passes cover async texture load.
    const makeSafe = () => {
      try {
        const center = (this.track?.geom?.center || []).map((p) => Array.isArray(p)
          ? { x:Number(p[0]), y:Number(p[1]), width:Number(this.track?.meta?.trackWidth || 150) }
          : { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || this.track?.meta?.trackWidth || 150) }
        ).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
        if (center.length < 4) return;

        const sponsors = (this.children?.list || []).filter((o) => {
          const key = o?.texture?.key || o?.frame?.texture?.key || '';
          return typeof key === 'string' && key.startsWith('env-sponsor-');
        });

        const n = center.length;
        const idx = (i) => (i + n) % n;
        const nearestIndex = (x, y) => {
          let bestI = 0, bestD2 = Infinity;
          for (let i = 0; i < n; i++) {
            const dx = x - center[i].x, dy = y - center[i].y;
            const d2 = dx * dx + dy * dy;
            if (d2 < bestD2) { bestD2 = d2; bestI = i; }
          }
          return bestI;
        };

        const pointSafe = (x, y, clearance = 34) => {
          for (let i = 0; i < n; i++) {
            const p = center[i];
            const half = Number(p.width || this.track?.meta?.trackWidth || 150) * 0.5;
            if (Math.hypot(x - p.x, y - p.y) < half + clearance) return false;
          }
          return true;
        };

        for (const board of sponsors) {
          if (!board?.scene || board._tdrSponsorSafe) continue;
          const i = nearestIndex(board.x, board.y);
          const a = center[idx(i - 2)], b = center[idx(i + 2)], p = center[i];
          const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
          const nx = -dy / len, ny = dx / len;
          const side = ((board.x - p.x) * nx + (board.y - p.y) * ny) >= 0 ? 1 : -1;
          const half = Number(p.width || this.track?.meta?.trackWidth || 150) * 0.5;

          let chosen = null;
          for (const extra of [72, 88, 104, 124, 146, 170]) {
            const x = p.x + nx * side * (half + extra);
            const y = p.y + ny * side * (half + extra);
            if (pointSafe(x, y, 30)) { chosen = { x, y }; break; }
          }
          if (!chosen) {
            // Last resort: opposite side, only if the compact layout blocks the original side.
            for (const extra of [88, 108, 132, 158, 184]) {
              const x = p.x - nx * side * (half + extra);
              const y = p.y - ny * side * (half + extra);
              if (pointSafe(x, y, 30)) { chosen = { x, y }; break; }
            }
          }
          if (chosen) board.setPosition(chosen.x, chosen.y);
          board._tdrSponsorSafe = true;
        }
      } catch (e) {
        console.warn('[TDR2] sponsor safety pass failed', e);
      }
    };

    this.time.delayedCall(0, makeSafe);
    this.time.delayedCall(260, makeSafe);
    this.time.delayedCall(850, makeSafe);
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
