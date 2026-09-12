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

  _allowSteeringButtonsOnMainCamera() {
    const main = this.cameras?.main;
    if (!main) return;
    const allow = (obj) => {
      if (!obj) return;
      if (typeof obj.cameraFilter === 'number') obj.cameraFilter &= ~main.id;
      const children = obj.list || obj.getAll?.();
      if (Array.isArray(children)) for (const child of children) allow(child);
    };
    allow(this._tdrSteerButtons);
  }

  _pinButtonSteeringUi() {
    const c = this._tdrSteerButtons;
    const cam = this.cameras?.main;
    if (this._tdrSteeringMode !== 'buttons' || !c?.scene || !cam) return;
    this._allowSteeringButtonsOnMainCamera();
    const zoom = Math.max(0.001, Number(cam.zoom || 1));
    const world = cam.getWorldPoint(0, 0);
    c.setPosition(world.x, world.y);
    c.setScale(1 / zoom);
    c.setScrollFactor(1, 1);
  }

  _buildButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || this._tdrSteerButtons?.scene) return;
    const c = this.add.container(0, 0).setScrollFactor(1).setDepth(1100);
    this._tdrSteerButtons = c;

    const make = (dir, glyph, label) => {
      const bg = this.add.rectangle(0, 0, 10, 10, 0x07131e, 0.72).setOrigin(0).setStrokeStyle(2, 0x67cfff, 0.55).setInteractive({ useHandCursor: true });
      const arrow = this.add.text(0, 0, glyph, {fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',fontSize: '42px', fontStyle: '900', color: '#ffffff'}).setOrigin(0.5);
      const tx = this.add.text(0, 0, label, {fontFamily: 'system-ui, -apple-system, Segoe UI, Arial',fontSize: '10px', fontStyle: '800', color: '#9fdfff'}).setOrigin(0.5, 1);
      let activePointer = null;
      const setPressed = (pressed) => {
        bg.setFillStyle(pressed ? 0x103b53 : 0x07131e, pressed ? 0.92 : 0.72);
        bg.setStrokeStyle(2, pressed ? 0x2bff88 : 0x67cfff, pressed ? 0.9 : 0.55);
        if (!this.touch) return;
        if (pressed) this.touch.buttonSteer = dir; else if (this.touch.buttonSteer === dir) this.touch.buttonSteer = 0;
      };
      bg.on('pointerdown', (p) => { activePointer = p.id; setPressed(true); });
      bg.on('pointerup', (p) => { if (activePointer === p.id) setPressed(false); activePointer = null; });
      bg.on('pointerout', (p) => { if (!p.isDown && activePointer === p.id) { setPressed(false); activePointer = null; } });
      c.add([bg, arrow, tx]); return { bg, arrow, tx };
    };
    this._tdrLeftButton = make(-1, '◀', 'IZQUIERDA');
    this._tdrRightButton = make(1, '▶', 'DERECHA');
    this._layoutButtonSteeringUi();
    this._pinButtonSteeringUi();
  }

  _layoutButtonSteeringUi() {
    if (this._tdrSteeringMode !== 'buttons' || !this._tdrSteerButtons?.scene) return;
    const w = Math.max(1, Number(this.scale?.width || 0)), h = Math.max(1, Number(this.scale?.height || 0));
    const pad = Math.max(14, Math.min(28, Math.floor(Math.min(w, h) * 0.04)));
    const baseH = Math.max(76, Math.min(118, Math.floor(h * 0.22)));
    const baseW = Math.max(92, Math.min(150, Math.floor(w * 0.14)));
    const custom=readControlLayout().layout;
    const lp=sanitizeLayoutPoint(custom.left||{x:(pad+baseW/2)/w,y:(h-pad-baseH/2)/h,scale:1});
    const rp=sanitizeLayoutPoint(custom.right||{x:(pad+baseW*1.5+14)/w,y:(h-pad-baseH/2)/h,scale:1});

    const left={p:lp,bw:baseW*lp.scale,bh:baseH*lp.scale,cx:lp.x*w,cy:lp.y*h};
    const right={p:rp,bw:baseW*rp.scale,bh:baseH*rp.scale,cx:rp.x*w,cy:rp.y*h};
    const sign=right.cx>=left.cx?1:-1;
    const minGap=Math.max(12,Math.min(18,w*0.016));
    const required=(left.bw+right.bw)/2+minGap;
    if(Math.abs(right.cx-left.cx)<required){
      const mid=(left.cx+right.cx)/2;
      left.cx=mid-sign*required/2;
      right.cx=mid+sign*required/2;
    }

    const minX=Math.min(left.cx-left.bw/2,right.cx-right.bw/2);
    if(minX<pad){left.cx+=pad-minX;right.cx+=pad-minX;}
    const maxX=Math.max(left.cx+left.bw/2,right.cx+right.bw/2);
    if(maxX>w-pad){const shift=maxX-(w-pad);left.cx-=shift;right.cx-=shift;}

    const place=(parts,g)=>{
      if(!parts)return;
      const x=g.cx-g.bw/2,y=g.cy-g.bh/2;
      parts.bg.setPosition(x,y).setSize(g.bw,g.bh).setDisplaySize(g.bw,g.bh);
      parts.arrow.setPosition(g.cx,y+g.bh*.42).setFontSize(Math.floor(g.bh*.42));
      parts.tx.setPosition(g.cx,y+g.bh-13);
    };
    place(this._tdrLeftButton,left);
    place(this._tdrRightButton,right);
    this._pinButtonSteeringUi();
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
        this._pinButtonSteeringUi();
      }
    }
  }
}
