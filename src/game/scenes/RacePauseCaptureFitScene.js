import { RaceScene as PauseRaceScene } from './RacePauseMenuScene.js';

export class RaceScene extends PauseRaceScene {
  constructor() {
    super();
    this._captureCameraLock = null;
    this._capturePhotoCamera = null;
  }

  update(time, delta) {
    super.update(time, delta);
  }

  _captureBoundsFromTrack() {
    const fallbackW = Number(this.track?.meta?.trackWidth || 160);
    const raw = this.track?.geom?.center || this.track?.meta?.centerline || [];
    const pts = raw.map((p) => Array.isArray(p)
      ? { x:Number(p[0]), y:Number(p[1]), width:Number(p[2] || fallbackW) }
      : { x:Number(p?.x), y:Number(p?.y), width:Number(p?.width || fallbackW) }
    ).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

    if (!pts.length) {
      const b = this.physics?.world?.bounds;
      if (!b?.width || !b?.height) return null;
      return { x:Number(b.x || 0), y:Number(b.y || 0), width:Number(b.width), height:Number(b.height) };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let maxHalf = fallbackW * 0.5;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
      maxHalf = Math.max(maxHalf, Number(p.width || fallbackW) * 0.5);
    }

    const pad = Math.max(150, maxHalf + 110);
    return {
      x: minX - pad,
      y: minY - pad,
      width: Math.max(1, (maxX - minX) + pad * 2),
      height: Math.max(1, (maxY - minY) + pad * 2)
    };
  }

  _captureFromPause(kind) {
    if (this._captureInProgress) return;

    const capturePauseStartedAt = this._pauseStartedAt || performance.now();
    const body = this.carBody || this.car;
    this._captureFrozenState = body?.scene ? {
      x: Number(body.x || 0),
      y: Number(body.y || 0),
      rotation: Number(body.rotation || 0)
    } : null;

    const main = this.cameras?.main;
    const bounds = this._captureBoundsFromTrack();
    if (!main || !bounds?.width || !bounds?.height) return;

    const saved = {
      mainVisible: main.visible !== false,
      uiVisible: this.uiCam?.visible !== false,
      cullEnabled: this._cullEnabled,
      mapZoomOn: this._mapZoomOn
    };

    this._closePauseMenu(false);
    const hidden = this._hideHudForCapture();
    this._captureInProgress = true;

    try { this.physics?.world?.resume?.(); } catch (_) {}
    this._cullEnabled = false;
    this._mapZoomOn = true;

    if (kind === 'technical') this._makeTechnicalCaptureOverlay?.();

    const screenW = Math.max(1, Number(this.scale?.width || main.width || 1));
    const screenH = Math.max(1, Number(this.scale?.height || main.height || 1));
    const marginPx = 24;
    const usableW = Math.max(1, screenW - marginPx * 2);
    const usableH = Math.max(1, screenH - marginPx * 2);
    const zoom = Math.max(0.01, Math.min(usableW / bounds.width, usableH / bounds.height));
    const cx = bounds.x + bounds.width * 0.5;
    const cy = bounds.y + bounds.height * 0.5;

    let photoCam = null;
    try {
      photoCam = this.cameras.add(0, 0, screenW, screenH, false, 'pause-photo');
      this._capturePhotoCamera = photoCam;
      photoCam.setZoom(zoom);
      photoCam.centerOn(cx, cy);
      photoCam.roundPixels = false;
      photoCam.setVisible(true);

      // The gameplay camera and the disabled iOS UI camera must not contribute to the snapshot.
      main.setVisible(false);
      this.uiCam?.setVisible?.(false);
    } catch (err) {
      console.warn('[RacePauseCaptureFit] photo camera setup failed', err);
    }

    const finish = () => {
      try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
      this._captureTechnicalOverlay = null;

      try {
        if (photoCam) this.cameras.remove(photoCam);
      } catch (_) {}
      this._capturePhotoCamera = null;

      main.setVisible(saved.mainVisible);
      this.uiCam?.setVisible?.(saved.uiVisible);
      this._cullEnabled = saved.cullEnabled;
      this._mapZoomOn = saved.mapZoomOn;

      const excludedMs = Math.max(0, performance.now() - capturePauseStartedAt);
      if (excludedMs > 0 && Number.isFinite(this.timing?.lapStart)) this.timing.lapStart += excludedMs;

      this._captureInProgress = false;
      this._captureFrozenState = null;
      this._restoreHudAfterCapture(hidden);
      try { this.physics?.world?.pause?.(); } catch (_) {}
      this._openPauseMenu();
    };

    const takeSnapshot = () => {
      try {
        const renderer = this.game?.renderer;
        if (!renderer || typeof renderer.snapshot !== 'function' || !photoCam) {
          console.warn('[RacePauseCaptureFit] renderer.snapshot/photoCam unavailable');
          finish();
          return;
        }
        renderer.snapshot((image) => {
          try { this._exportSnapshotImage(image, kind); }
          finally { finish(); }
        }, 'image/png', 1);
      } catch (err) {
        console.warn('[RacePauseCaptureFit] snapshot failed', err);
        finish();
      }
    };

    // First frame rebuilds all road cells with culling disabled; the next frames
    // render only the dedicated photo camera. Nothing in the race update chain controls it.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(() =>
            requestAnimationFrame(takeSnapshot)
          )
        )
      )
    );
  }
}
