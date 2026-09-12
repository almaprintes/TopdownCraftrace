import { RaceScene as CurrentRaceScene } from './RaceExperienceExportReadingScene.js';

const LABEL_Z = '55';

function makeDomLabel(glyph, label) {
  const root = document.createElement('div');
  root.dataset.tdrSteeringLabel = label;
  Object.assign(root.style, {
    position: 'fixed',
    left: '0px',
    top: '0px',
    width: '1px',
    height: '1px',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
    userSelect: 'none',
    WebkitUserSelect: 'none',
    WebkitTouchCallout: 'none',
    zIndex: LABEL_Z,
    display: 'none',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Arial, sans-serif'
  });

  const arrow = document.createElement('div');
  arrow.textContent = glyph;
  Object.assign(arrow.style, {
    position: 'absolute',
    left: '50%',
    top: '42%',
    transform: 'translate(-50%, -50%)',
    color: '#ffffff',
    fontWeight: '900',
    lineHeight: '1',
    whiteSpace: 'nowrap',
    textShadow: '0 2px 3px rgba(0,0,0,.55)'
  });

  const text = document.createElement('div');
  text.textContent = label;
  Object.assign(text.style, {
    position: 'absolute',
    left: '50%',
    bottom: '10%',
    transform: 'translateX(-50%)',
    color: '#9fdfff',
    fontSize: '10px',
    fontWeight: '800',
    lineHeight: '1',
    letterSpacing: '.02em',
    whiteSpace: 'nowrap',
    textShadow: '0 1px 2px rgba(0,0,0,.7)'
  });

  root.append(arrow, text);
  document.body.appendChild(root);
  return { root, arrow, text, key: '' };
}

export class RaceScene extends CurrentRaceScene {
  constructor() {
    super();
    this._tdrDomSteerLeft = null;
    this._tdrDomSteerRight = null;
  }

  create(data) {
    const result = super.create(data);
    if (this._tdrSteeringMode === 'buttons') {
      this._ensureDomSteeringLabels();
      this._syncDomSteeringLabels(true);
    }
    this.events?.once?.('shutdown', () => this._destroyDomSteeringLabels());
    this.events?.once?.('destroy', () => this._destroyDomSteeringLabels());
    return result;
  }

  _ensureDomSteeringLabels() {
    if (typeof document === 'undefined' || this._tdrSteeringMode !== 'buttons') return;
    if (!this._tdrDomSteerLeft) this._tdrDomSteerLeft = makeDomLabel('◀', 'IZQUIERDA');
    if (!this._tdrDomSteerRight) this._tdrDomSteerRight = makeDomLabel('▶', 'DERECHA');
    this._hidePhaserSteeringLabels();
  }

  _hidePhaserSteeringLabels() {
    // Keep the proven Phaser rectangles and their hit areas untouched. Only the
    // camera-sensitive Text objects are replaced by fixed DOM copies.
    for (const parts of [this._tdrLeftButton, this._tdrRightButton]) {
      try { parts?.arrow?.setVisible?.(false); } catch (_) {}
      try { parts?.tx?.setVisible?.(false); } catch (_) {}
    }
  }

  _syncOneDomSteeringLabel(dom, parts, force = false) {
    const bg = parts?.bg;
    const canvas = this.game?.canvas;
    if (!dom?.root || !bg?.scene || !canvas) return;

    const w = Math.max(1, Number(this.scale?.width || 0));
    const h = Math.max(1, Number(this.scale?.height || 0));
    const rect = canvas.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    // bg.x/bg.y/displayWidth/displayHeight are the already-validated screen-space
    // layout values used by the working Phaser rectangles. Map those exact values
    // onto the CSS viewport so the copy cannot inherit camera zoom or scroll.
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

    if (force || dom.key !== key) {
      dom.key = key;
      dom.root.style.left = `${cssX}px`;
      dom.root.style.top = `${cssY}px`;
      dom.root.style.width = `${cssW}px`;
      dom.root.style.height = `${cssH}px`;
      dom.arrow.style.fontSize = `${arrowPx}px`;
    }
    dom.root.style.display = 'block';
  }

  _syncDomSteeringLabels(force = false) {
    if (this._tdrSteeringMode !== 'buttons' || typeof document === 'undefined') return;
    this._ensureDomSteeringLabels();
    this._hidePhaserSteeringLabels();

    const landscape = window.innerWidth >= window.innerHeight;
    const active = !!this.sys?.isActive?.() && landscape && !this._sessionReportOpen;
    if (!active) {
      if (this._tdrDomSteerLeft?.root) this._tdrDomSteerLeft.root.style.display = 'none';
      if (this._tdrDomSteerRight?.root) this._tdrDomSteerRight.root.style.display = 'none';
      return;
    }

    this._syncOneDomSteeringLabel(this._tdrDomSteerLeft, this._tdrLeftButton, force);
    this._syncOneDomSteeringLabel(this._tdrDomSteerRight, this._tdrRightButton, force);
  }

  _destroyDomSteeringLabels() {
    for (const dom of [this._tdrDomSteerLeft, this._tdrDomSteerRight]) {
      try { dom?.root?.remove?.(); } catch (_) {}
    }
    this._tdrDomSteerLeft = null;
    this._tdrDomSteerRight = null;
  }

  update(time, delta) {
    super.update(time, delta);
    this._syncDomSteeringLabels(false);
  }
}
