import { RaceScene as CurrentRaceScene } from './RaceSurfaceLongitudinalScene.js';

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
}
