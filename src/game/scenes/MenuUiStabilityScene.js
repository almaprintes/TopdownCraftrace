import { MenuScene as CurrentMenuScene } from './MenuSpeedConsistencyScene.js';

// iOS can emit short bursts of viewport resize events even without an orientation
// change. The legacy menu rebuilt its whole display list on every event and also
// left an anonymous resize listener behind after leaving the scene. Both behaviours
// can produce flicker / ghost UI after several scene changes.
export class MenuScene extends CurrentMenuScene {
  renderUI() {
    super.renderUI();

    // The menu logo is also the long-press ADMIN portal. Keep the exact existing
    // asset and simply present it at 2× the previous visual size.
    const scaleLogoIn = (node) => {
      if (!node) return;
      if (node?.texture?.key === 'logo' && !node.__tdrAdminLogoDoubled) {
        node.setScale(Number(node.scaleX || 1) * 2, Number(node.scaleY || 1) * 2);
        node.__tdrAdminLogoDoubled = true;
      }
      const children = node?.list;
      if (Array.isArray(children)) {
        for (const child of children) scaleLogoIn(child);
      }
    };
    scaleLogoIn(this._ui);
  }

  create() {
    const scale = this.scale;
    const originalOn = scale.on;
    const capturedResize = [];

    // Capture resize listeners registered by the legacy scene instead of attaching
    // anonymous callbacks directly to the global ScaleManager.
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

    this._menuResizeCaptured = capturedResize;
    this._menuResizeW = Math.round(this.scale.width || 0);
    this._menuResizeH = Math.round(this.scale.height || 0);
    this._menuResizeTimer = null;

    this._onStableMenuResize = (gameSize, ...args) => {
      const w = Math.round(Number(gameSize?.width ?? this.scale.width) || 0);
      const h = Math.round(Number(gameSize?.height ?? this.scale.height) || 0);

      // Ignore the 1–2 px viewport jitter Safari/PWA can generate.
      if (Math.abs(w - this._menuResizeW) <= 2 && Math.abs(h - this._menuResizeH) <= 2) return;
      this._menuResizeW = w;
      this._menuResizeH = h;

      try { this._menuResizeTimer?.remove?.(false); } catch (_) {}
      this._menuResizeTimer = this.time.delayedCall(90, () => {
        if (!this.sys?.isActive?.()) return;
        for (const entry of this._menuResizeCaptured || []) {
          try { entry.fn.call(entry.context ?? this, gameSize, ...args); } catch (_) {}
        }
      });
    };

    this.scale.on('resize', this._onStableMenuResize, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this._onStableMenuResize, this);
      try { this._menuResizeTimer?.remove?.(false); } catch (_) {}
      this._menuResizeTimer = null;
      this._menuResizeCaptured = [];
    });
  }
}
