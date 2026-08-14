import { GarageScene as CurrentGarageScene } from './GarageSpeedConsistencyScene.js';

export class GarageScene extends CurrentGarageScene {
  create() {
    const scale = this.scale;
    const originalOn = scale.on;
    const capturedResize = [];

    // Prevent the legacy scene from wiring a raw resize callback to the global
    // ScaleManager. We replay it through one debounced, scene-owned handler.
    scale.on = function(event, fn, context, ...rest) {
      if (event === 'resize' && typeof fn === 'function') {
        capturedResize.push({ fn, context });
        return this;
      }
      return originalOn.call(this, event, fn, context, ...rest);
    };

    try {
      super.create();
    } finally {
      scale.on = originalOn;
    }

    this._garageResizeCaptured = capturedResize;
    this._garageResizeW = Math.round(this.scale.width || 0);
    this._garageResizeH = Math.round(this.scale.height || 0);
    this._garageResizeTimer = null;

    this._onStableGarageResize = (gameSize, ...args) => {
      const w = Math.round(Number(gameSize?.width ?? this.scale.width) || 0);
      const h = Math.round(Number(gameSize?.height ?? this.scale.height) || 0);
      if (Math.abs(w - this._garageResizeW) <= 2 && Math.abs(h - this._garageResizeH) <= 2) return;
      this._garageResizeW = w;
      this._garageResizeH = h;

      try { this._garageResizeTimer?.remove?.(false); } catch (_) {}
      this._garageResizeTimer = this.time.delayedCall(90, () => {
        if (!this.sys?.isActive?.()) return;
        const previousScroll = Number(this._thumbScrollY || 0);
        for (const entry of this._garageResizeCaptured || []) {
          try { entry.fn.call(entry.context ?? this, gameSize, ...args); } catch (_) {}
        }
        // Legacy _rebuild() resets the list to the top. Preserve the user's position.
        if (Number.isFinite(previousScroll)) this._setThumbScroll?.(previousScroll);
      });
    };

    this.scale.on('resize', this._onStableGarageResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this._onStableGarageResize, this);
      try { this._garageResizeTimer?.remove?.(false); } catch (_) {}
      this._garageResizeTimer = null;
      this._garageResizeCaptured = [];

      // GarageScene had a shutdown() cleanup routine but it was never subscribed
      // to Phaser's SHUTDOWN event. Run it explicitly here.
      try { super.shutdown?.(); } catch (_) {}
    });
  }
}
