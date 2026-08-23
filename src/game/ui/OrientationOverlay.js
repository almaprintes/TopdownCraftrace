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

    // The full-screen dimmer must only participate in input while the overlay is visible.
    // A hidden interactive rectangle can otherwise sit above the scene and swallow every tap.
    if (shouldBlock) {
      if (!this._dim.input) this._dim.setInteractive();
      else this._dim.input.enabled = true;
    } else if (this._dim.input) {
      this._dim.input.enabled = false;
    }

    if (scene.input) scene.input.enabled = !shouldBlock;
    if (scene.physics?.world) scene.physics.world.isPaused = shouldBlock;
  }

  destroy() {
    const scene = this.scene;
    if (!scene) return;
    scene.scale.off('resize', this._onResize);
    if (this._dim?.input) this._dim.input.enabled = false;
    if (scene.input) scene.input.enabled = true;
    if (scene.physics?.world) scene.physics.world.isPaused = false;
    this._root?.destroy(true);
    this._root = null;
    this._dim = null;
    this._img = null;
    this.scene = null;
  }
}
