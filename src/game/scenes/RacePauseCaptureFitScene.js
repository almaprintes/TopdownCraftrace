import { RaceScene as PauseRaceScene } from './RacePauseMenuScene.js';

export class RaceScene extends PauseRaceScene {
  constructor() {
    super();
    this._captureCameraLock = null;
  }

  update(time, delta) {
    super.update(time, delta);

    const lock = this._captureCameraLock;
    const cam = this.cameras?.main;
    if (lock && cam) {
      // Ancestor camera wrappers may update zoom/centering every frame.
      // Re-assert the exact capture view after the full inherited update chain.
      cam.stopFollow?.();
      cam.setZoom(lock.zoom);
      cam.setScroll(lock.scrollX, lock.scrollY);
    }
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

    // Include shoulder, kerbs and nearby environment/sponsor boards.
    const pad = Math.max(130, maxHalf + 90);
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

    const cam = this.cameras?.main;
    const bounds = this._captureBoundsFromTrack();
    if (!cam || !bounds?.width || !bounds?.height) return;

    const saved = {
      zoom: Number(cam.zoom || 1),
      scrollX: Number(cam.scrollX || 0),
      scrollY: Number(cam.scrollY || 0),
      cullEnabled: this._cullEnabled,
      mapZoomOn: this._mapZoomOn
    };

    this._closePauseMenu(false);
    const hidden = this._hideHudForCapture();
    this._captureInProgress = true;

    try { this.physics?.world?.resume?.(); } catch (_) {}
    try { cam.stopFollow?.(); } catch (_) {}

    this._cullEnabled = false;
    this._mapZoomOn = true;

    const screenW = Math.max(1, Number(cam.width || this.scale?.width || 1));
    const screenH = Math.max(1, Number(cam.height || this.scale?.height || 1));
    const marginPx = 24;
    const usableW = Math.max(1, screenW - marginPx * 2);
    const usableH = Math.max(1, screenH - marginPx * 2);
    const zoom = Math.max(0.015, Math.min(usableW / bounds.width, usableH / bounds.height));

    const cx = bounds.x + bounds.width * 0.5;
    const cy = bounds.y + bounds.height * 0.5;
    const viewWorldW = screenW / zoom;
    const viewWorldH = screenH / zoom;
    const scrollX = cx - viewWorldW * 0.5;
    const scrollY = cy - viewWorldH * 0.5;

    this._captureCameraLock = { zoom, scrollX, scrollY };
    cam.setZoom(zoom);
    cam.setScroll(scrollX, scrollY);

    if (kind === 'technical') this._makeTechnicalCaptureOverlay?.();

    const finish = () => {
      try { this._captureTechnicalOverlay?.destroy?.(); } catch (_) {}
      this._captureTechnicalOverlay = null;
      this._captureCameraLock = null;

      this._cullEnabled = saved.cullEnabled;
      this._mapZoomOn = saved.mapZoomOn;
      cam.setZoom(saved.zoom);
      cam.setScroll(saved.scrollX, saved.scrollY);
      if (body?.scene) {
        try { cam.startFollow(body, true, 0.12, 0.12); } catch (_) {}
      }

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
        if (!renderer || typeof renderer.snapshot !== 'function') {
          console.warn('[RacePauseCaptureFit] renderer.snapshot unavailable');
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

    // Let culling rebuild all cells and camera lock win over all inherited updates.
    requestAnimationFrame(() =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          requestAnimationFrame(takeSnapshot)
        )
      )
    );
  }
}
