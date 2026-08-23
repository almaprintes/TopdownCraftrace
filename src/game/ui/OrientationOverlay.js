// src/game/ui/OrientationOverlay.js
import Phaser from 'phaser';

function isPortraitLike(scene) {
  const { width, height } = scene.scale;
  return width < height * 1.02;
}

export class OrientationOverlay {
  constructor(scene, opts = {}) {
    this.scene = scene;
    this.imageKey = opts.imageKey || 'ui_rotate_landscape';

    this._root = scene.add.container(0, 0).setDepth(999999);
    this._dim = scene.add.rectangle(0, 0, 1, 1, 0x000000, 0.72).setOrigin(0);
    this._dim.setInteractive();
    this._img = scene.add.image(0, 0, this.imageKey).setOrigin(0.5);
    this._root.add([this._dim, this._img]);

    this._blocked = null;
    this._onResize = () => this._layout();
    scene.scale.on('resize', this._onResize);
    this._layout();
  }

  _layout() {
    const scene = this.scene;
    if (!scene) return;
    const { width, height } = scene.scale;

    this._dim.setSize(width, height);
    this._dim.setPosition(0, 0);
    this._img.setPosition(Math.floor(width / 2), Math.floor(height / 2));

    const iw = this._img.width || 1;
    const ih = this._img.height || 1;
    const targetW = width * 0.86;
    const targetH = height * 0.86;
    this._img.setScale(Math.min(targetW / iw, targetH / ih));

    const shouldBlock = isPortraitLike(scene);
    this._blocked = shouldBlock;
    this._root.setVisible(shouldBlock);

    // Always synchronise input/physics. The previous implementation only did this
    // when the boolean changed, so a newly-created landscape scene could inherit
    // disabled input and look normal while every button was dead.
    if (scene.input) scene.input.enabled = !shouldBlock;
    if (scene.physics?.world) scene.physics.world.isPaused = shouldBlock;
  }

  destroy() {
    const scene = this.scene;
    if (!scene) return;
    scene.scale.off('resize', this._onResize);
    // Never leave the scene/input plugin disabled after this overlay disappears.
    if (scene.input) scene.input.enabled = true;
    if (scene.physics?.world) scene.physics.world.isPaused = false;
    this._root?.destroy(true);
    this._root = null;
    this._dim = null;
    this._img = null;
    this.scene = null;
  }
}
