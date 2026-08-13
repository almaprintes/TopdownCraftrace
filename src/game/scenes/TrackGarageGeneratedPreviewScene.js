import { TrackGarageScene as CurrentTrackGarageScene } from './TrackGarageFixedScene.js';
import { loadTrackPreview } from '../tracks/trackPreviewStore.js';

// Keeps the existing track-selection UI intact, but replaces its reconstructed
// centerline preview with the exact world-map thumbnail generated in RaceScene.
export class TrackGarageScene extends CurrentTrackGarageScene {
  constructor() {
    super();
    this._generatedPreviewKeys = new Map();
    this._generatedPreviewPending = new Set();
  }

  _preview(track, w = 760, h = 410) {
    const official = this._generatedPreviewKeys?.get(track?.key);
    if (official && this.textures.exists(official)) return official;

    const fallback = super._preview(track, w, h);
    this._queueGeneratedPreview(track);
    return fallback;
  }

  async _queueGeneratedPreview(track) {
    const trackKey = track?.key;
    if (!trackKey || this._generatedPreviewPending.has(trackKey) || this._generatedPreviewKeys.has(trackKey)) return;

    this._generatedPreviewPending.add(trackKey);
    try {
      const row = await loadTrackPreview(trackKey, track);
      if (!row?.blob || !this.sys?.isActive?.()) return;

      const textureKey = `generated_track_${trackKey}_${row.updatedAt || 0}`;
      if (!this.textures.exists(textureKey)) {
        const url = URL.createObjectURL(row.blob);
        try {
          const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('No se pudo cargar la preview oficial'));
            img.src = url;
          });
          if (!this.textures.exists(textureKey)) this.textures.addImage(textureKey, image);
        } finally {
          URL.revokeObjectURL(url);
        }
      }

      if (!this.textures.exists(textureKey)) return;
      this._generatedPreviewKeys.set(trackKey, textureKey);

      // Rebuild only when the loaded image belongs to the circuit currently shown.
      if (this._tracks?.[this._index]?.key === trackKey && this.sys?.isActive?.()) this._render();
    } catch (_) {
      // A circuit without a generated map simply keeps the legacy fallback preview.
    } finally {
      this._generatedPreviewPending.delete(trackKey);
    }
  }
}
