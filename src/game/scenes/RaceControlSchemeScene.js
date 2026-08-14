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

  _hideAllJoystickVisuals() {
    if (this._tdrSteeringMode !== 'buttons') return;

    const w = Number(this.scale?.width || 0);
    const h = Number(this.scale?.height || 0);
    const maxX = w * 0.31;
    const minY = h * 0.48;

    // 1) Explicit references used by the legacy touch system, when present.
    const refs = [
      this.joystickBase, this.joystickKnob,
      this.joyBase, this.joyKnob,
      this.stickBase, this.stickKnob,
      this.touch?.joystickBase, this.touch?.joystickKnob,
      this.touch?.joyBase, this.touch?.joyKnob,
      this.touch?.base, this.touch?.knob
    ];
    for (const obj of refs) {
      try { obj?.setVisible?.(false); } catch (_) {}
      try { obj?.disableInteractive?.(); } catch (_) {}
    }

    // 2) touchUI children.
    const list = this.touchUI?.list || [];
    for (let i = 0; i <= 1; i++) {
      try { list[i]?.setVisible?.(false); } catch (_) {}
      try { list[i]?.disableInteractive?.(); } catch (_) {}
    }

    // 3) The visible joystick in the current commercial HUD is not always inside
    // touchUI. Remove circular HUD objects in the joystick zone at bottom-left.
    for (const obj of this.children?.list || []) {
      if (!obj || obj === this._tdrSteerButtons) continue;
      const x = Number(obj.x ?? -9999);
      const y = Number(obj.y ?? -9999);
      if (!(x <= maxX && y >= minY)) continue;

      const type = String(obj.type || obj.constructor?.name || '').toLowerCase();
      const circular = type.includes('arc') || type.includes('circle');
      const size = Math.max(
        Number(obj.displayWidth || 0), Number(obj.displayHeight || 0),
        Number(obj.radius || 0) * 2
      );

      // Avoid touching tiny decorative dots; the joystick base/knob are sizeable circles.
      if (circular && size >= 38) {
        try { obj.setVisible?.(false); } catch (_) {}
        try { obj.disableInteractive?.(); } catch (_) {}
      }
    }
  }

  createTouchControls() {
    const state = super.createTouchControls();
    state.buttonSteer = 0;

    this._applySteeringModeVisuals = () => {
      const mode = this._tdrSteeringMode || 'stick';
      if (mode === 'buttons') this._hideAllJoystickVisuals();

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
      this._hideAllJoystickVisuals();
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
      // Keep enforcing this because legacy resize/reflow code can recreate joystick objects.
      this._hideAllJoystickVisuals();

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
      }
    }

    try {
      super.update(time, delta);
    } finally {
      if (buttonMode) {
        if (leftKey) leftKey.isDown = prevLeft;
        if (rightKey) rightKey.isDown = prevRight;
      }
    }
  }
}
