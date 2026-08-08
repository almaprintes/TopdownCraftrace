import { TrackGarageScene as OriginalTrackGarageScene } from './TrackGarageScene.js';
import { createTrack } from '../tracks/trackRegistry.js';

export class TrackGarageScene extends OriginalTrackGarageScene {
  create() {
    super.create();

    try {
      const realTrack = createTrack('track01');
      const enduranceTrack = createTrack('forest-endurance');
      this._tracks = [realTrack, enduranceTrack];

      const savedTrack = (() => {
        try { return localStorage.getItem('tdr2:trackKey'); } catch { return null; }
      })();

      const idx = this._tracks.findIndex((t) => t.key === savedTrack);
      this._selectedIndex = idx >= 0 ? idx : 0;

      for (const key of ['track_preview_track01', 'track_preview_forest-endurance']) {
        if (this.textures.exists(key)) this.textures.remove(key);
      }

      this._rebuild();
    } catch (err) {
      console.error('[TDR2] No se pudieron cargar los circuitos reales en TrackGarageScene', err);
    }
  }
}
