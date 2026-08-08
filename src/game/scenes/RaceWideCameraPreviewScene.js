import { RaceScene as CurrentRaceScene } from './RaceSurfaceLongitudinalScene.js';

// Temporary camera experiment: keep more circuit environment visible while driving.
// No physics, HUD, minimap or track geometry changes.
export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();

    // Original values were 0.75 / 1.50 / 140 / 0.06.
    // This preview stays wider at low and medium speed and reaches the wide view sooner.
    this._zoomGameplayMin = 0.70;
    this._zoomGameplayMax = 1.24;
    this._zoomKmhRef = 120;
    this._zoomLerp = 0.045;

    // Start from a less aggressive close-up so the first seconds already expose scenery.
    this.zoom = 1.12;
    this._zoomCurrent = this.zoom;
  }
}
