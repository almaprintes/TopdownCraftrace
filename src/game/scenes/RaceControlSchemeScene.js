import Phaser from 'phaser';
import { RaceScene as CurrentRaceScene } from './RaceUiStabilityScene.js';
import { readControlLayout, sanitizeLayoutPoint } from '../controls/controlLayout.js';

const SETTINGS_KEY = 'tdr2:settings';

function loadSteeringMode() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.controls?.steeringMode === 'buttons' ? 'buttons' : 'stick';
  } catch (_) {
    return 'stick';
  }
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    this._tdrSteeringMode = loadSteeringMode();
    const result = super.create(data);

    try { if (this._diagText?.scene) this._diagText.destroy(); } catch (_) {}
    this._diagText = null;
    this._diagLines = [];
    this._diag = () => {};

    this._buildButtonSteeringUi?.();
    return result;
  }

  createTouchControls() {
    if (this._tdrSteeringMode === 'stick') return this._createCustomStickTouchControls();
    if (this._tdrSteeringMode !== 'buttons') return super.createTouchControls();

    const state = {
      steer: 0, throttle: 0, brake: 0, stickX: 0, stickY: 0, buttonSteer: 0,
      leftId: null, rightId: null, leftActive: false, rightThrottle: false,
      rightBrake: false, btnW: 0, btnH: 0, rightX: 0, throttleY: 0, brakeY: 0,
      _draw: () => {}
    };

    this.touchUI = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    this.touchUI.setVisible(false);

    const layout = () => {
      const w = Number(this.scale?.width || 0), h = Number(this.scale?.height || 0);
      const pad = Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.04)));
      state.btnW = Math.max(150, Math.min(260, Math.floor(w * 0.22)));
      state.btnH = Math.max(78, Math.min(140, Math.floor(h * 0.16)));
      state.rightX = w - pad - state.btnW;
      state.brakeY = h - pad - state.btnH;
      state.throttleY = state.brakeY - Math.floor(state.btnH * 1.08);
      this._layoutButtonSteeringUi?.();
    };

    const hitThrottle = (x, y) => x >= state.rightX && x <= state.rightX + state.btnW && y >= state.throttleY && y <= state.throttleY + state.btnH;
    const hitBrake = (x, y) => x >= state.rightX && x <= state.rightX + state.btnW && y >= state.brakeY && y <= state.brakeY + state.btnH;
    const onDown = (p) => {
      if (p.x < this.scale.width * 0.5) return;
      state.rightId = p.id;
      state.rightThrottle = hitThrottle(p.x, p.y); state.rightBrake = hitBrake(p.x, p.y);
      state.throttle = state.rightThrottle ? 1 : 0; state.brake = state.rightBrake ? 1 : 0;
    };
    const onMove = (p) => {
      if (!p.isDown || state.rightId !== p.id) return;
      state.rightThrottle = hitThrottle(p.x, p.y); state.rightBrake = hitBrake(p.x, p.y);
      state.throttle = state.rightThrottle ? 1 : 0; state.brake = state.rightBrake ? 1 : 0;
    };
    const onUp = (p) => {
      if (state.rightId !== p.id) return;
      state.rightId = null; state.rightThrottle = false; state.rightBrake = false; state.throttle = 0; state.brake = 0;
    };

    this.input.on('pointerdown', onDown); this.input.on('pointermove', onMove); this.input.on('pointerup', onUp);
    this._onResizeButtonTouchControls = layout; this.scale.on('resize', layout); layout();
    this.events.once('shutdown', () => {
      try { this.input.off('pointerdown', onDown); } catch (_) {}
      try { this.input.off('pointermove', onMove); } catch (_) {}
      try { this.input.off('pointerup', onUp); } catch (_) {}
      try { this.scale.off('resize', layout); } catch (_) {}
      this._onResizeButtonTouchControls = null;
      this._destroyButtonSteeringUi();
    });
    this.time?.delayedCall?.(0, () => this._buildButtonSteeringUi?.());
    return state;
  }

  _createCustomStickTouchControls() {
    const state = {
      steer: 0, throttle: 0, brake: 0, stickX: 0, stickY: 0, buttonSteer: 0,
      leftId: null, rightId: null, leftActive: false, rightThrottle: false,
      rightBrake: false, btnW: 0, btnH: 0, rightX: 0, throttleY: 0, brakeY: 0,
      _draw: () => {}
    };

    this.touchUI = this.add.container(0, 0).setScrollFactor(0).setDepth(1000);
    for (let i = 0; i < 6; i++) this.touchUI.add(this.add.rectangle(0, 0, 1, 1, 0x000000, 0).setVisible(false));
    try { this.cameras.main.ignore(this.touchUI); } catch (_) {}

    let cx = 0, cy = 0, radius = 64, activationRadius = 86;
    const layout = () => {
      const w = Number(this.scale?.width || 0), h = Number(this.scale?.height || 0);
      const p = sanitizeLayoutPoint(readControlLayout().layout.steer || {});
      const baseSize = Math.max(142, Math.min(190, w * 0.17));
      cx = p.x * w;
      cy = p.y * h;
      radius = Math.max(42, baseSize * 0.34 * p.scale);
      activationRadius = Math.max(radius * 1.35, baseSize * 0.56 * p.scale);
    };

    const setStick = (p) => {
      const dx = p.x - cx, dy = p.y - cy;
      const d = Math.hypot(dx, dy);
      const m = d > radius ? radius / Math.max(1e-6, d) : 1;
      state.stickX = (dx * m) / radius;
      state.stickY = (dy * m) / radius;
      state.steer = state.stickX;
      state.leftActive = true;
    };

    const onDown = (p) => {
      if (state.leftId !== null) return;
      if (Math.hypot(p.x - cx, p.y - cy) > activationRadius) return;
      state.leftId = p.id;
      setStick(p);
    };
    const onMove = (p) => {
      if (!p.isDown || state.leftId !== p.id) return;
      setStick(p);
    };
    const onUp = (p) => {
      if (state.leftId !== p.id) return;
      state.leftId = null;
      state.leftActive = false;
      state.stickX = 0;
      state.stickY = 0;
      state.steer = 0;
    };

    this.input.on('pointerdown', onDown);
    this.input.on('pointermove', onMove);
    this.input.on('pointerup', onUp);
    this.input.on('pointerupoutside', onUp);
    this.scale.on('resize', layout);
    layout();

    this.events.once('shutdown', () => {
      try { this.input.off('pointerdown', onDown); } catch (_) {}
      try { this.input.off('pointermove', onMove); } catch (_) {}
      try { this.input.off('pointerup', onUp); } catch (_) {}
      try { this.input.off('pointerupoutside', onUp); } catch (_) {}
      try { this.scale.off('resize', layout); } catch (_) {}
    });
    return state;
  }

  _createDomSteeringButton(dir, glyph, label) {
    if (typeof document === 'undefined') return null;
    const el = document.createElement('button');
    el.type = 'button';
    el.dataset.tdrSteeringButton = dir < 0 ? 'left' : 'right';
    el.setAttribute('aria-label', label);
    el.innerHTML = `<span class="tdr-steer-arrow" aria-hidden="true">${glyph}</span><span class="tdr-steer-label">${label}</span>`;
    Object.assign(el.style, {
      position: 'fixed',
      left: '0px', top: '0px', width: '100px', height: '80px',
      transform: 'translate(-50%,-50%)', zIndex: '8200',
      margin: '0', padding: '0', overflow: 'hidden',
      borderRadius: '2px', border: '2px solid rgba(103,207,255,.55)',
      background: 'rgba(7,19,30,.72)', color: '#fff',
      boxShadow: 'none', outline: 'none',
      fontFamily: 'system-ui,-apple-system,"Segoe UI",Arial,sans-serif',
      touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
      WebkitTapHighlightColor: 'transparent', appearance: 'none', WebkitAppearance: 'none'
    });
    const arrow = el.querySelector('.tdr-steer-arrow');
    const tx = el.querySelector('.tdr-steer-label');
    Object.assign(arrow.style, {
      position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%,-50%)',
      fontWeight: '900', lineHeight: '1', color: '#fff', pointerEvents: 'none'
    });
    Object.assign(tx.style, {
      position: 'absolute', left: '50%', bottom: '10px', transform: 'translateX(-50%)',
      fontSize: '10px', fontWeight: '800', lineHeight: '1', letterSpacing: '.02em',
      color: '#9fdfff', whiteSpace: 'nowrap', pointerEvents: 'none'
    });

    let activePointer = null;
    const setPressed = (pressed) => {
      el.style.background = pressed ? 'rgba(16,59,83,.92)' : 'rgba(7,19,30,.72)';
      el.style.borderColor = pressed ? 'rgba(43,255,136,.9)' : 'rgba(103,207,255,.55)';
      if (!this.touch) return;
      if (pressed) this.touch.buttonSteer = dir;
      else if (this.touch.buttonSteer === dir) this.touch.buttonSteer = 0;
    };
    const down = (ev) => {
      ev.preventDefault(); ev.stopPropagation();
      activePointer = ev.pointerId;
      try { el.setPointerCapture?.(ev.pointerId); } catch (_) {}
      setPressed(true);
    };
    const up = (ev) => {
      if (activePointer !== null && ev.pointerId !== activePointer) return;
      ev.preventDefault(); ev.stopPropagation();
      setPressed(false);
      activePointer = null;
    };
    el.addEventListener('pointerdown', down, { passive: false });
    el.addEventListener('pointerup', up, { passive: false });
    el.addEventListener('pointercancel', up, { passive: false });
    el.addEventListener('lostpointercapture', up, { passive: false });
    el.addEventListener('contextmenu', (ev) => ev.preventDefault());
    document.body.appendChild(el);
    return { el, arrow, tx, setPressed };
  }

  _buildButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || this._tdrDomSteerButtons) return;
    this._tdrDomSteerButtons = {
      left: this._createDomSteeringButton(-1, '◀', 'IZQUIERDA'),
      right: this._createDomSteeringButton(1, '▶', 'DERECHA')
    };
    this._layoutButtonSteeringUi();
    const destroy = () => this._destroyButtonSteeringUi();
    this.events?.once?.('destroy', destroy);
  }

  _layoutButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || !this._tdrDomSteerButtons || typeof document === 'undefined') return;
    const canvas = this.game?.canvas;
    const rect = canvas?.getBoundingClientRect?.();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    const w = Math.max(1, Number(this.scale?.width || 0));
    const h = Math.max(1, Number(this.scale?.height || 0));
    const pad = Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.04)));
    const baseH = Math.max(76, Math.min(118, Math.floor(h * 0.22)));
    const baseW = Math.max(92, Math.min(150, Math.floor(w * 0.14)));
    const custom = readControlLayout().layout;
    const lp = sanitizeLayoutPoint(custom.left || { x:(pad+baseW/2)/w, y:(h-pad-baseH/2)/h, scale:1 });
    const rp = sanitizeLayoutPoint(custom.right || { x:(pad+baseW*1.5+14)/w, y:(h-pad-baseH/2)/h, scale:1 });

    const left = { bw:baseW*lp.scale, bh:baseH*lp.scale, cx:lp.x*w, cy:lp.y*h };
    const right = { bw:baseW*rp.scale, bh:baseH*rp.scale, cx:rp.x*w, cy:rp.y*h };
    const sign = right.cx >= left.cx ? 1 : -1;
    const minGap = Math.max(12, Math.min(18, w * 0.016));
    const required = (left.bw + right.bw) / 2 + minGap;
    if (Math.abs(right.cx-left.cx) < required) {
      const mid = (left.cx + right.cx) / 2;
      left.cx = mid - sign * required / 2;
      right.cx = mid + sign * required / 2;
    }
    const minX = Math.min(left.cx-left.bw/2, right.cx-right.bw/2);
    if (minX < pad) { left.cx += pad-minX; right.cx += pad-minX; }
    const maxX = Math.max(left.cx+left.bw/2, right.cx+right.bw/2);
    if (maxX > w-pad) { const shift=maxX-(w-pad); left.cx-=shift; right.cx-=shift; }

    const place = (parts, g) => {
      if (!parts?.el) return;
      const cssX = rect.left + (g.cx / w) * rect.width;
      const cssY = rect.top + (g.cy / h) * rect.height;
      const cssW = (g.bw / w) * rect.width;
      const cssH = (g.bh / h) * rect.height;
      parts.el.style.left = `${cssX}px`;
      parts.el.style.top = `${cssY}px`;
      parts.el.style.width = `${cssW}px`;
      parts.el.style.height = `${cssH}px`;
      parts.arrow.style.fontSize = `${Math.max(24, Math.floor(cssH * .42))}px`;
    };
    place(this._tdrDomSteerButtons.left, left);
    place(this._tdrDomSteerButtons.right, right);
  }

  _destroyButtonSteeringUi() {
    const pair = this._tdrDomSteerButtons;
    if (!pair) return;
    for (const parts of [pair.left, pair.right]) {
      try { parts?.setPressed?.(false); } catch (_) {}
      try { parts?.el?.remove?.(); } catch (_) {}
    }
    this._tdrDomSteerButtons = null;
  }

  update(time, delta) {
    const buttonMode = this._tdrSteeringMode === 'buttons';
    const steer = Number(this.touch?.buttonSteer || 0);
    let leftKey = null, rightKey = null, prevLeft = false, prevRight = false;
    if (buttonMode && this.keys) {
      leftKey = this.keys.left; rightKey = this.keys.right; prevLeft = !!leftKey?.isDown; prevRight = !!rightKey?.isDown;
      if (leftKey) leftKey.isDown = steer < -0.25; if (rightKey) rightKey.isDown = steer > 0.25;
      if (this.touch) { this.touch.stickX = 0; this.touch.stickY = 0; this.touch.steer = 0; }
    }
    try { super.update(time, delta); }
    finally {
      if (buttonMode) {
        if (leftKey) leftKey.isDown = prevLeft;
        if (rightKey) rightKey.isDown = prevRight;
      }
    }
  }
}
