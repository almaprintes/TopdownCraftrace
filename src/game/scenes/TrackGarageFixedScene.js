import { TrackGarageScene as OriginalTrackGarageScene } from './TrackGarageScene.js';
import { createTrack, getTrackKeys } from '../tracks/trackRegistry.js';

export class TrackGarageScene extends OriginalTrackGarageScene {
  create() {
    super.create();

    try {
      // Build the selector from the real registry instead of maintaining a
      // second hard-coded allow-list. Any valid library/<slug>/track.json
      // discovered by trackRegistry now appears automatically here.
      const keys = getTrackKeys();
      this._tracks = keys.map((key) => createTrack(key));

      const savedTrack = (() => {
        try { return localStorage.getItem('tdr2:trackKey'); } catch { return null; }
      })();

      const idx = this._tracks.findIndex((t) => t.key === savedTrack);
      this._selectedIndex = idx >= 0 ? idx : 0;

      // Previews are generated from each real centerline. Remove stale preview
      // textures so newly changed tracks cannot reuse an older generated map.
      for (const track of this._tracks) {
        const previewKey = `track_preview_${String(track.key).replace(/[:/]/g, '_')}`;
        if (this.textures.exists(previewKey)) this.textures.remove(previewKey);
      }

      this._rebuild();
    } catch (err) {
      console.error('[TDR2] No se pudieron cargar los circuitos reales en TrackGarageScene', err);
    }
  }
}
