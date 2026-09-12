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
      try { this._tdrSteerButtons?.destroy(true); } catch (_) {}
      this._tdrSteerButtons = null;
      this._tdrLeftButton = null;
      this._tdrRightButton = null;
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

  _buildButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || this._tdrSteerButtons?.scene) return;

    const root = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
    this._tdrSteerButtons = root;

    const make = (dir, glyph, label) => {
      // The complete visual button is ONE Phaser Text object. Its dark square,
      // arrow, caption and hit area therefore share exactly the same transform.
      // There are no independent labels left that can drift while the car moves.
      const control = this.add.text(0, 0, `${glyph}\n${label}`, {
        fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
        fontSize: '18px',
        fontStyle: '900',
        color: '#ffffff',
        align: 'center',
        backgroundColor: '#07131e',
        lineSpacing: 5,
        padding: { left: 6, right: 6, top: 10, bottom: 8 }
      })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(1100)
        .setInteractive({ useHandCursor: true });

      root.add(control);

      let activePointer = null;
      const setPressed = (pressed) => {
        control.setBackgroundColor(pressed ? '#103b53' : '#07131e');
        if (!this.touch) return;
        if (pressed) this.touch.buttonSteer = dir;
        else if (this.touch.buttonSteer === dir) this.touch.buttonSteer = 0;
      };
      const release = (p) => {
        if (activePointer !== null && (!p || activePointer === p.id)) setPressed(false);
        activePointer = null;
      };
      control.on('pointerdown', (p) => { activePointer = p.id; setPressed(true); });
      control.on('pointerup', release);
      control.on('pointerupoutside', release);
      control.on('pointerout', (p) => { if (!p.isDown) release(p); });

      return { control };
    };

    this._tdrLeftButton = make(-1, '◀', 'IZQUIERDA');
    this._tdrRightButton = make(1, '▶', 'DERECHA');
    this._layoutButtonSteeringUi();

    // The controls belong only to the HUD camera. Ignore both the parent and
    // the actual drawable children in the moving/zooming world camera.
    this._pinButtonSteeringCamera?.();
    this.time?.delayedCall?.(0, () => this._pinButtonSteeringCamera?.());
    this.time?.delayedCall?.(120, () => this._pinButtonSteeringCamera?.());
  }

  _pinButtonSteeringCamera() {
    if (this._tdrSteeringMode !== 'buttons') return;
    const controls = [
      this._tdrSteerButtons,
      this._tdrLeftButton?.control,
      this._tdrRightButton?.control
    ].filter(Boolean);
    try { this.cameras.main.ignore(controls); } catch (_) {}
    try {
      if (this.uiCam) {
        this.uiCam.setScroll(0, 0);
        this.uiCam.setZoom(1);
        this.uiCam.setRotation?.(0);
      }
    } catch (_) {}
  }

  _layoutButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || !this._tdrSteerButtons?.scene) return;

    const w = Math.max(1, Number(this.scale?.width || 0));
    const h = Math.max(1, Number(this.scale?.height || 0));
    const pad = Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.04)));
    const baseH = Math.max(76, Math.min(118, Math.floor(h * 0.22)));
    const baseW = Math.max(92, Math.min(150, Math.floor(w * 0.14)));
    const custom = readControlLayout().layout;
    const lp = sanitizeLayoutPoint(custom.left || { x: (pad + baseW / 2) / w, y: (h - pad - baseH / 2) / h, scale: 1 });
    const rp = sanitizeLayoutPoint(custom.right || { x: (pad + baseW * 1.5 + 14) / w, y: (h - pad - baseH / 2) / h, scale: 1 });

    const lw = baseW * lp.scale;
    const rw = baseW * rp.scale;
    let lx = lp.x * w;
    let rx = rp.x * w;
    const ly = lp.y * h;
    const ry = rp.y * h;

    const minGap = Math.max(10, Math.min(18, w * 0.014));
    const minDistance = (lw + rw) * 0.5 + minGap;
    if (rx - lx < minDistance) {
      const mid = (lx + rx) * 0.5;
      lx = mid - minDistance * 0.5;
      rx = mid + minDistance * 0.5;
    }

    const leftEdge = lx - lw * 0.5;
    if (leftEdge < pad) {
      const shift = pad - leftEdge;
      lx += shift;
      rx += shift;
    }
    const rightEdge = rx + rw * 0.5;
    if (rightEdge > w - pad) {
      const shift = rightEdge - (w - pad);
      lx -= shift;
      rx -= shift;
    }

    const place = (parts, x, y, p) => {
      const control = parts?.control;
      if (!control?.scene) return;
      control.setPosition(Math.round(x), Math.round(y));
      control.setScale(1);
      control.setFixedSize(Math.round(baseW * p.scale), Math.round(baseH * p.scale));
      control.setFontSize(Math.max(13, Math.floor(baseH * 0.18 * p.scale)));
      control.setLineSpacing(Math.max(2, Math.floor(baseH * 0.04 * p.scale)));
    };

    place(this._tdrLeftButton, lx, ly, lp);
    place(this._tdrRightButton, rx, ry, rp);
    this._pinButtonSteeringCamera?.();
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
        this._pinButtonSteeringCamera?.();
      }
    }
  }
}
