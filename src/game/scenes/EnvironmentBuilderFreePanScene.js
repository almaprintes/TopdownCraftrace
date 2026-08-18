import { EnvironmentBuilderScene as CurrentEnvironmentBuilderScene } from './EnvironmentBuilderInputFixScene.js';

export class EnvironmentBuilderScene extends CurrentEnvironmentBuilderScene {
  _setupInput() {
    super._setupInput();

    this._freePan = null;

    const isWorldAsset = (obj) => !!obj?._env;
    const pointerInsideEditor = (p) => {
      if (typeof this._inside === 'function') return this._inside(p);
      return p.x >= this._vx && p.x <= this._vx + this._vw && p.y >= this._vy && p.y <= this._vy + this._vh;
    };

    this.input.on('pointerdown', (pointer, currentlyOver = []) => {
      if (this._mode !== 'select') return;
      if (!pointerInsideEditor(pointer)) return;

      // If the gesture starts on a placed environment asset, its own drag wins.
      if (Array.isArray(currentlyOver) && currentlyOver.some(isWorldAsset)) return;

      this._freePan = {
        pointerId: pointer.id,
        x: pointer.x,
        y: pointer.y,
        scrollX: this._editCam.scrollX,
        scrollY: this._editCam.scrollY
      };
    });

    this.input.on('pointermove', (pointer) => {
      const pan = this._freePan;
      if (!pan || !pointer.isDown || pointer.id !== pan.pointerId) return;

      const zoom = Math.max(0.0001, this._editCam.zoom || 1);
      const dx = (pointer.x - pan.x) / zoom;
      const dy = (pointer.y - pan.y) / zoom;

      const visibleW = this._editCam.width / zoom;
      const visibleH = this._editCam.height / zoom;
      const maxX = Math.max(0, 8000 - visibleW);
      const maxY = Math.max(0, 5000 - visibleH);

      this._editCam.scrollX = Math.max(0, Math.min(maxX, pan.scrollX - dx));
      this._editCam.scrollY = Math.max(0, Math.min(maxY, pan.scrollY - dy));
    });

    const stop = (pointer) => {
      if (!this._freePan) return;
      if (pointer && pointer.id !== this._freePan.pointerId) return;
      this._freePan = null;
    };

    this.input.on('pointerup', stop);
    this.input.on('pointerupoutside', stop);
  }
}
