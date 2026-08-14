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
    return result;
  }

  createTouchControls() {
    const state = super.createTouchControls();
    state.buttonSteer = 0;

    this._applySteeringModeVisuals = () => {
      const mode = this._tdrSteeringMode || 'stick';
      const list = this.touchUI?.list || [];

      // In button mode the complete analogue joystick must disappear, not merely
      // become inactive. Hide every legacy object that belongs to the joystick.
      if (mode === 'buttons') {
        const joyX = Number(state.joyX ?? state.joystickX ?? list[0]?.x ?? 0);
        const joyY = Number(state.joyY ?? state.joystickY ?? list[0]?.y ?? 0);
        const radius = Math.max(70, Number(state.joyRadius || 110));

        for (const obj of list) {
          if (!obj) continue;
          const ox = Number(obj.x ?? 0);
          const oy = Number(obj.y ?? 0);
          const nearJoystick = Math.hypot(ox - joyX, oy - joyY) <= radius * 1.7;
          if (nearJoystick) {
            try { obj.setVisible?.(false); } catch (_) {}
            try { obj.disableInteractive?.(); } catch (_) {}
          }
        }
        // Known legacy order: base + knob. Keep this explicit as a fallback.
        for (let i = 0; i <= 1; i++) {
          try { list[i]?.setVisible?.(false); } catch (_) {}
          try { list[i]?.disableInteractive?.(); } catch (_) {}
        }
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
