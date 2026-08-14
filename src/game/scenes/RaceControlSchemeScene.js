import Phaser from 'phaser';
import { RaceScene as CurrentRaceScene } from './RaceUiStabilityScene.js';

const SETTINGS_KEY = 'tdr2:settings';

function loadSteeringMode() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const mode = parsed?.controls?.steeringMode;
    return mode === 'buttons' ? 'buttons' : 'stick';
  } catch (_) {
    return 'stick';
  }
}

export class RaceScene extends CurrentRaceScene {
  create(data) {
    this._tdrSteeringMode = loadSteeringMode();
    const result = super.create(data);
    this._applySteeringModeVisuals?.();
    this.time?.delayedCall?.(0, () => this._applySteeringModeVisuals?.());
    this.time?.delayedCall?.(120, () => this._applySteeringModeVisuals?.());
    return result;
  }

  _purgeLegacyTouchVisuals() {
    if (this._tdrSteeringMode !== 'buttons') return;

    // In button mode we do not merely hide the old joystick. We remove every
    // display object created by the legacy touch renderer (joystick + obsolete
    // GAS/FRENO artwork). The commercial pedal artwork lives elsewhere and the
    // legacy pointer listeners still update throttle/brake state without needing
    // these display objects.
    const ui = this.touchUI;
    if (ui) {
      const list = Array.isArray(ui.list) ? [...ui.list] : [];
      for (const obj of list) {
        try { obj?.disableInteractive?.(); } catch (_) {}
        try { obj?.destroy?.(); } catch (_) {}
      }
      try { ui.removeAll?.(false); } catch (_) {}
      try { ui.setVisible?.(false); } catch (_) {}
    }

    // The original draw callback closes over the destroyed circles. Replacing it
    // prevents pointer events from trying to redraw a joystick that no longer exists.
    if (this.touch) this.touch._draw = () => {};
  }

  createTouchControls() {
    const state = super.createTouchControls();
    state.buttonSteer = 0;

    this._applySteeringModeVisuals = () => {
      const mode = this._tdrSteeringMode || 'stick';
      if (mode === 'buttons') this._purgeLegacyTouchVisuals();
      else {
        try { this.touchUI?.setVisible?.(true); } catch (_) {}
      }

      if (mode !== 'buttons' || this._tdrSteerButtons?.scene) return;

      const w = this.scale.width;
      const h = this.scale.height;
      const pad = Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.04)));
      const btnH = Math.max(76, Math.min(118, Math.floor(h * 0.22)));
      const btnW = Math.max(92, Math.min(150, Math.floor(w * 0.14)));
      const gap = 14;
      const startX = pad;
      const y = h - pad - btnH;

      const c = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
      this._tdrSteerButtons = c;
      try { this.cameras.main.ignore(c); } catch (_) {}

      const make = (x, dir, glyph, label) => {
        const bg = this.add.rectangle(x, y, btnW, btnH, 0x07131e, 0.72)
          .setOrigin(0)
          .setStrokeStyle(2, 0x67cfff, 0.55)
          .setInteractive({ useHandCursor: true });
        const arrow = this.add.text(x + btnW / 2, y + btnH * 0.42, glyph, {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
          fontSize: `${Math.floor(btnH * 0.42)}px`,
          fontStyle: '900',
          color: '#ffffff'
        }).setOrigin(0.5);
        const tx = this.add.text(x + btnW / 2, y + btnH - 13, label, {
          fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',
          fontSize: '10px', fontStyle: '800', color: '#9fdfff'
        }).setOrigin(0.5, 1);

        let activePointer = null;
        const setPressed = (pressed) => {
          bg.setFillStyle(pressed ? 0x103b53 : 0x07131e, pressed ? 0.92 : 0.72);
          bg.setStrokeStyle(2, pressed ? 0x2bff88 : 0x67cfff, pressed ? 0.9 : 0.55);
          if (pressed) state.buttonSteer = dir;
          else if (state.buttonSteer === dir) state.buttonSteer = 0;
        };

        bg.on('pointerdown', (p) => { activePointer = p.id; setPressed(true); });
        bg.on('pointerup', (p) => {
          if (activePointer === p.id) setPressed(false);
          activePointer = null;
        });
        bg.on('pointerout', (p) => {
          if (!p.isDown && activePointer === p.id) {
            setPressed(false);
            activePointer = null;
          }
        });

        c.add([bg, arrow, tx]);
      };

      make(startX, -1, '◀', 'IZQUIERDA');
      make(startX + btnW + gap, 1, '▶', 'DERECHA');
      this._purgeLegacyTouchVisuals();
    };

    this._applySteeringModeVisuals();
    return state;
  }

  update(time, delta) {
    const buttonMode = this._tdrSteeringMode === 'buttons';
    const steer = Number(this.touch?.buttonSteer || 0);

    let leftKey = null, rightKey = null;
    let prevLeft = false, prevRight = false;

    if (buttonMode && this.keys) {
      // Legacy resize code can rebuild touch visuals. Purge them again before the
      // frame is rendered, so there is no one-frame joystick flash.
      this._purgeLegacyTouchVisuals();

      leftKey = this.keys.left;
      rightKey = this.keys.right;
      prevLeft = !!leftKey?.isDown;
      prevRight = !!rightKey?.isDown;
      if (leftKey) leftKey.isDown = steer < -0.25;
      if (rightKey) rightKey.isDown = steer > 0.25;
      if (this.touch) {
        this.touch.stickX = 0;
        this.touch.stickY = 0;
        this.touch.steer = 0;
        this.touch._draw = () => {};
      }
    }

    try {
      super.update(time, delta);
    } finally {
      if (buttonMode) {
        this._purgeLegacyTouchVisuals();
        if (leftKey) leftKey.isDown = prevLeft;
        if (rightKey) rightKey.isDown = prevRight;
      }
    }
  }
}
