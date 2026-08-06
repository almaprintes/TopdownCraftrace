import { TrackGarageScene as OriginalTrackGarageScene } from './TrackGarageScene.js';
import { createTrack } from '../tracks/trackRegistry.js';

export class TrackGarageScene extends OriginalTrackGarageScene {
  create() {
    super.create();

    try {
      const realTrack = createTrack('track01');
      this._tracks = [realTrack];

      const savedTrack = (() => {
        try { return localStorage.getItem('tdr2:trackKey'); } catch { return null; }
      })();

      const idx = this._tracks.findIndex((t) => t.key === savedTrack);
      this._selectedIndex = idx >= 0 ? idx : 0;

      const previewKey = 'track_preview_track01';
      if (this.textures.exists(previewKey)) {
        this.textures.remove(previewKey);
      }

      this._rebuild();
    } catch (err) {
      console.error('[TDR2] No se pudo cargar track01 real en TrackGarageScene', err);
    }
  }
}
