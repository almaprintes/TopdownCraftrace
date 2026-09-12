import { RaceScene as CurrentRaceScene } from './RaceRuntimeSafetyScene.js';

function makeSteeringDomLabel(glyph, label) {
  if (typeof document === 'undefined') return null;
  const root = document.createElement('div');
  root.dataset.tdrSteeringLabel = label;
  Object.assign(root.style, {
    position: 'fixed', left: '0px', top: '0px', width: '1px', height: '1px',
    transform: 'translate(-50%, -50%)', pointerEvents: 'none', display: 'none',
    zIndex: '55', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Arial, sans-serif'
  });

  const arrow = document.createElement('div');
  arrow.textContent = glyph;
  Object.assign(arrow.style, {
    position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%)',
    color: '#fff', fontWeight: '900', lineHeight: '1', whiteSpace: 'nowrap',
    textShadow: '0 2px 3px rgba(0,0,0,.55)'
  });

  const text = document.createElement('div');
  text.textContent = label;
  Object.assign(text.style, {
    position: 'absolute', left: '50%', bottom: '10%', transform: 'translateX(-50%)',
    color: '#9fdfff', fontSize: '10px', fontWeight: '800', lineHeight: '1',
    letterSpacing: '.02em', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,.7)'
  });

  root.append(arrow, text);
  document.body.appendChild(root);
  return { root, arrow, key: '' };
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    const scale = this.scale;
    const originalOn = scale.on;
    const capturedResize = [];

    // RaceScene registers several independent resize callbacks. On iOS/PWA a burst
    // of resize events can make them rebuild UI repeatedly in the same moment.
    // Capture them and replay them once, after the viewport settles.
    scale.on = function(event, fn, context, ...rest) {
      if (event === 'resize' && typeof fn === 'function') {
        capturedResize.push({ fn, context });
        return this;
      }
      return originalOn.call(this, event, fn, context, ...rest);
    };

    let result;
    try {
      result = super.create(data);
    } finally {
      scale.on = originalOn;
    }

    this._raceResizeCaptured = capturedResize;
    this._raceResizeW = Math.round(this.scale.width || 0);
    this._raceResizeH = Math.round(this.scale.height || 0);
    this._raceResizeTimer = null;
    this._tdrDomSteerLeft = null;
    this._tdrDomSteerRight = null;

    this._ensureFixedSteeringLabels = () => {
      if (this._tdrSteeringMode !== 'buttons' || typeof document === 'undefined') return;
      if (!this._tdrDomSteerLeft) this._tdrDomSteerLeft = makeSteeringDomLabel('◀', 'IZQUIERDA');
      if (!this._tdrDomSteerRight) this._tdrDomSteerRight = makeSteeringDomLabel('▶', 'DERECHA');
      for (const parts of [this._tdrLeftButton, this._tdrRightButton]) {
        try { parts?.arrow?.setVisible?.(false); } catch (_) {}
        try { parts?.tx?.setVisible?.(false); } catch (_) {}
      }
    };

    const syncOne = (dom, parts) => {
      const bg = parts?.bg;
      const canvas = this.game?.canvas;
      if (!dom?.root || !bg?.scene || !canvas) return false;
      const w = Math.max(1, Number(this.scale?.width || 0));
      const h = Math.max(1, Number(this.scale?.height || 0));
      const rect = canvas.getBoundingClientRect?.();
      if (!rect || rect.width <= 0 || rect.height <= 0) return false;

      // Use the exact local geometry of the already-correct Phaser rectangle.
      // Mapping that geometry directly to CSS pixels makes arrow + caption fully
      // independent from camera scroll and dynamic zoom.
      const bw = Math.max(1, Number(bg.displayWidth || bg.width || 1));
      const bh = Math.max(1, Number(bg.displayHeight || bg.height || 1));
      const cx = Number(bg.x || 0) + bw * 0.5;
      const cy = Number(bg.y || 0) + bh * 0.5;
      const cssX = rect.left + (cx / w) * rect.width;
      const cssY = rect.top + (cy / h) * rect.height;
      const cssW = (bw / w) * rect.width;
      const cssH = (bh / h) * rect.height;
      const arrowPx = Math.max(22, Math.floor(cssH * 0.42));
      const key = [cssX, cssY, cssW, cssH, arrowPx].map(v => Math.round(v * 10) / 10).join('|');

      if (dom.key !== key) {
        dom.key = key;
        dom.root.style.left = `${cssX}px`;
        dom.root.style.top = `${cssY}px`;
        dom.root.style.width = `${cssW}px`;
        dom.root.style.height = `${cssH}px`;
        dom.arrow.style.fontSize = `${arrowPx}px`;
      }
      dom.root.style.display = 'block';
      return true;
    };

    this._syncFixedSteeringLabels = () => {
      if (this._tdrSteeringMode !== 'buttons') return;
      this._ensureFixedSteeringLabels();
      const landscape = typeof window !== 'undefined' && window.innerWidth >= window.innerHeight;
      const visible = !!this.sys?.isActive?.() && landscape && !this._sessionReportOpen;
      if (!visible) {
        if (this._tdrDomSteerLeft?.root) this._tdrDomSteerLeft.root.style.display = 'none';
        if (this._tdrDomSteerRight?.root) this._tdrDomSteerRight.root.style.display = 'none';
        return;
      }
      syncOne(this._tdrDomSteerLeft, this._tdrLeftButton);
      syncOne(this._tdrDomSteerRight, this._tdrRightButton);
    };

    this._onStableRaceResize = (gameSize, ...args) => {
      const w = Math.round(Number(gameSize?.width ?? this.scale.width) || 0);
      const h = Math.round(Number(gameSize?.height ?? this.scale.height) || 0);
      if (Math.abs(w - this._raceResizeW) <= 2 && Math.abs(h - this._raceResizeH) <= 2) return;
      this._raceResizeW = w;
      this._raceResizeH = h;

      try { this._raceResizeTimer?.remove?.(false); } catch (_) {}
      this._raceResizeTimer = this.time.delayedCall(90, () => {
        if (!this.sys?.isActive?.()) return;
        for (const entry of this._raceResizeCaptured || []) {
          try { entry.fn.call(entry.context ?? this, gameSize, ...args); } catch (_) {}
        }
        this._hideLegacyPedalVisuals?.();
        this._syncFixedSteeringLabels?.();
      });
    };

    this.scale.on('resize', this._onStableRaceResize, this);
    this._hideLegacyPedalVisuals?.();

    // Run after the complete scene update. RaceControlSchemeScene may pin its
    // Phaser button container during update; this final pass hides those Text
    // children again and paints the fixed CSS copy over the proven rectangles.
    this._onFixedSteeringPostUpdate = () => this._syncFixedSteeringLabels?.();
    this.events.on('postupdate', this._onFixedSteeringPostUpdate, this);

    this.events.once('shutdown', () => {
      this.scale.off('resize', this._onStableRaceResize, this);
      this.events.off('postupdate', this._onFixedSteeringPostUpdate, this);
      try { this._raceResizeTimer?.remove?.(false); } catch (_) {}
      this._raceResizeTimer = null;
      this._raceResizeCaptured = [];
      for (const dom of [this._tdrDomSteerLeft, this._tdrDomSteerRight]) {
        try { dom?.root?.remove?.(); } catch (_) {}
      }
      this._tdrDomSteerLeft = null;
      this._tdrDomSteerRight = null;
    });

    return result;
  }

  createTouchControls() {
    const state = super.createTouchControls();

    // The current game has its commercial GAS / FRENO artwork layered elsewhere.
    // The old touch system still recreated its obsolete rectangles/text on resize,
    // which is exactly the 'deleted action zones' that could flash on screen.
    this._hideLegacyPedalVisuals = () => {
      const list = this.touchUI?.list;
      if (!Array.isArray(list)) return;
      // Legacy order: joystick base, joystick knob, gas bg, gas text, brake bg, brake text.
      for (let i = 2; i <= 5; i++) {
        try { list[i]?.setVisible?.(false); } catch (_) {}
      }
    };

    this._hideLegacyPedalVisuals();
    return state;
  }
}
