import { RaceScene as PauseRaceScene } from './RacePauseMenuScene.js';
import { exportTrackMapHD } from '../export/TrackMapHDExporter.js';

export class RaceScene extends PauseRaceScene {
  constructor() {
    super();
    this._hdMapExportBusy = false;
  }

  _captureFromPause(kind) {
    if (this._hdMapExportBusy || this._captureInProgress) return;

    const startedAt = this._pauseStartedAt || performance.now();
    const body = this.carBody || this.car;
    const savedCull = this._cullEnabled;
    const savedMapZoom = this._mapZoomOn;

    this._captureFrozenState = body?.scene ? {
      x:Number(body.x || 0),
      y:Number(body.y || 0),
      rotation:Number(body.rotation || 0)
    } : null;

    this._closePauseMenu(false);
    const hidden = this._hideHudForCapture();
    this._captureInProgress = true;
    this._hdMapExportBusy = true;

    // Let any world-cell / decoration culling wrappers expose the complete scene before
    // the offscreen RenderTexture reads the Display List. update() keeps the car frozen.
    this._cullEnabled = false;
    this._mapZoomOn = false;
    try { this.physics?.world?.resume?.(); } catch (_) {}

    if (kind === 'technical') this._makeTechnicalCaptureOverlay?.();

    const finish = () => {
      try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
      this._captureTechnicalOverlay = null;
      this._cullEnabled = savedCull;
      this._mapZoomOn = savedMapZoom;

      const excludedMs = Math.max(0, performance.now() - startedAt);
      if (excludedMs > 0 && Number.isFinite(this.timing?.lapStart)) {
        this.timing.lapStart += excludedMs;
      }

      this._captureInProgress = false;
      this._hdMapExportBusy = false;
      this._captureFrozenState = null;
      this._restoreHudAfterCapture(hidden);
      try { this.physics?.world?.pause?.(); } catch (_) {}
      this._openPauseMenu();
    };

    const run = async () => {
      try {
        const result = await exportTrackMapHD(this, kind, {
          longSide:4096,
          paddingPx:128
        });
        console.info('[TDR2] HD map export complete', kind, result?.width, result?.height);
      } catch (err) {
        console.warn('[TDR2] HD map export failed', err);
      } finally {
        finish();
      }
    };

    // Some environment/road chunks are rebuilt lazily after culling is disabled,
    // especially on iOS. Give the full world six rendered frames to settle before
    // reading the Display List so late chunks cannot leave small holes in the export.
    const afterFrames = (remaining, fn) => {
      if (remaining <= 0) return fn();
      requestAnimationFrame(() => afterFrames(remaining - 1, fn));
    };
    afterFrames(6, run);
  }
}
