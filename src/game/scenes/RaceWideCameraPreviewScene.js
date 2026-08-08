import { RaceScene as CurrentRaceScene } from './RaceSurfaceLongitudinalScene.js';
import { hasTrack } from '../tracks/trackRegistry.js';

// Temporary camera experiment: deliberately wider than the previous pass so
// environment density can be judged while driving. Physics/HUD/minimap/track
// geometry remain untouched.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();

    // Original stable values: 0.75 / 1.50 / 140 / 0.06.
    // Previous preview (0.70 / 1.24) was barely perceptible on iPhone.
    // This pass is intentionally obvious, but still keeps the car readable.
    this._zoomGameplayMin = 0.62;
    this._zoomGameplayMax = 1.06;
    this._zoomKmhRef = 105;
    this._zoomLerp = 0.042;

    this.zoom = 0.96;
    this._zoomCurrent = this.zoom;
  }

  init(data) {
    // Capture the real library selection BEFORE the legacy RaceScene init
    // applies its old track01/02/03 allow-list and overwrites localStorage.
    let requestedTrack = data?.trackKey || null;
    try {
      requestedTrack = requestedTrack || localStorage.getItem('tdr2:trackKey');
    } catch (_) {}

    super.init(data);

    if (!requestedTrack || !hasTrack(requestedTrack)) return;

    this.trackKey = requestedTrack;
    try { localStorage.setItem('tdr2:trackKey', requestedTrack); } catch (_) {}

    // Rebind time-trial persistence to the actual selected circuit because
    // the legacy init may have temporarily initialised it for track02.
    this.ttHistKey = `tdr2:ttHist:${requestedTrack}`;
    this.ttHistory = [];
    try {
      const raw = localStorage.getItem(this.ttHistKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (Array.isArray(parsed?.history)) {
        this.ttHistory = parsed.history
          .filter((r) => r && Number.isFinite(r.lapMs))
          .slice(-500);
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
}